/**
 * FEATURE-004 – Browser-Version der Runde-4-Logik (Kontextwechsel).
 *
 * Portiert/adaptiert die bereits abgenommenen Node-Referenzmodule aus
 * `src/game/rundeVier/*.js` (60/60 Tests grün, siehe Backlog.md) für den
 * Browser (kein Bundler im Projekt – manuelle Synchronhaltung, gleiches
 * Muster wie bei allen anderen `public/js/game/*.js`-Dateien). Ergänzt sie um
 * die tatsächlichen Firestore-Schreibvorgänge (Rundenstart, Kettenfortschritt,
 * Würfel-Zwischenwurf, Rundenende), die in der Node-Referenz bewusst nicht
 * enthalten waren ("das tatsächliche Anbinden an public/js/game/spiel.html
 * ist als Folgeschritt offen", siehe Backlog.md Umsetzungsstand-Vermerk).
 *
 * WICHTIG: Bei Änderungen an einem der Module unter src/game/rundeVier/
 * muss diese Datei inhaltlich synchron gehalten werden.
 *
 * ARCHITEKTUR-ENTSCHEIDUNGEN, die beim Anbinden getroffen wurden (nicht schon
 * durch die bestehende Spec/den bestehenden Code vorgegeben):
 *
 * 1. Zuständigkeits-Nummer (1-5): firestore.rules erwartet ein Feld
 *    `rundeVierPosition` auf teilnehmende/{uid} (bewusst getrennt vom Feld
 *    `station` aus Runde 1-3, siehe Pre-Mortem-Risiko 10). Da die Stationen-
 *    Reihenfolge (STATIONEN-Array, createGame.js) bereits dieselbe feste
 *    1-5-Nummerierung der fünf Spielenden liefert wie Runde 4 braucht, wird
 *    dieselbe Zahl wiederverwendet (kein neues Zuteilungsverfahren) - jede
 *    Person migriert beim Betreten des Runde-4-Spielfelds EINMALIG ihr
 *    eigenes Dokument, exakt nach demselben Muster wie
 *    kartenBewegung.js/stelleEigeneStationsnummerSicher() für Runde 1-3.
 *
 * 2. Deterministischer `angekommenAm`-Startzeitstempel: Die firestore.rules-
 *    FIFO-Prüfung (rundeVierElementAngekommenVor) vergleicht ausschließlich
 *    `angekommenAm`-Zeitstempel. Würden alle zwölf Elemente beim Rundenstart
 *    mit firebase.firestore.FieldValue.serverTimestamp() in EINER Transaktion
 *    angelegt, bekämen sie alle denselben Commit-Zeitstempel (keine
 *    Unterscheidung möglich) - das würde die in der Spec geforderte feste,
 *    alternierende Startreihenfolge (geklärte Frage 7) nicht abbilden. Die
 *    "elemente"-Create-Regel prüft `angekommenAm` bewusst NICHT (nur
 *    typ/position), erlaubt also einen selbstgewählten Zeitwert beim Anlegen.
 *    Deshalb: `firebase.firestore.Timestamp.fromMillis(basis + reihenfolge)`
 *    - ein Millisekunden-Versatz pro Element, exakt in der festen
 *    alternierenden Reihenfolge (wuerfel-1, karte-1, wuerfel-2, ...). Nach dem
 *    allerersten Zug wird `angekommenAm` für Würfel bei jedem
 *    Kettenfortschritt neu servergesetzt (von der Regel verlangt); für
 *    Länderkarten bleibt es unverändert (von der Regel so vorgesehen, siehe
 *    Kommentar bei rundeVierKettenfortschrittErlaubt() in firestore.rules -
 *    der Ankunftsnachweis läuft dort über den neu angehängten Städte-Eintrag).
 *
 * 3. Zusätzliche, von firestore.rules nicht geprüfte, aber auch nicht
 *    verbotene Felder `letzteBewegungVon`/`letzteBewegungAm` auf jedem
 *    elemente-Dokument bei jedem Kettenfortschritt (analog zu
 *    kartenBewegung.js) - ermöglicht die Wiederverwendung von
 *    window.FlowGame.berechneKennzahlen() UNVERÄNDERT für die Zeit-Kennzahlen
 *    von Runde 4 (kein Duplikat einer eigenen Kennzahlen-Berechnung nötig).
 */
(function (global) {
  'use strict';

  // ---- Referenzdaten (Browser-Port von src/game/rundeVier/laenderStaedte.js) ----

  const LAENDER_LISTE = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France', 'Italy', 'Canada'];

  const LAENDER_STAEDTE = {
    USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston', 'Miami'],
    UK: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Edinburgh', 'Glasgow'],
    Germany: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart'],
    India: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
    Spain: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'],
    France: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Bordeaux'],
    Italy: ['Rom', 'Mailand', 'Neapel', 'Turin', 'Florenz', 'Venedig'],
    Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Quebec'],
  };

  // FEATURE-006 (AK 6, Pre-Mortem-Risiko 4/8, Browser-Port von
  // src/game/rundeVier/laenderStaedte.js) - identische Alias-Tabelle, muss
  // synchron gehalten werden.
  const STADT_ALIAS = {
    munich: 'münchen',
    cologne: 'köln',
    rome: 'rom',
    milan: 'mailand',
    naples: 'neapel',
    florence: 'florenz',
    venice: 'venedig',
  };

  function normalisiereStadt(stadt) {
    if (typeof stadt !== 'string') return '';
    const bereinigt = stadt.trim().toLowerCase();
    return STADT_ALIAS[bereinigt] || bereinigt;
  }

  function istStadtInLand(land, stadt) {
    const liste = LAENDER_STAEDTE[land] || [];
    const eingabeSchluessel = normalisiereStadt(stadt);
    return liste.some(function (kandidat) { return normalisiereStadt(kandidat) === eingabeSchluessel; });
  }

  function zufaelligesLand() {
    return LAENDER_LISTE[Math.floor(Math.random() * LAENDER_LISTE.length)];
  }

  // ---- Würfel-Regel (Browser-Port von src/game/rundeVier/wuerfelLogik.js) ----

  function istWurfErfolgreich(wert) {
    return typeof wert === 'number' && wert > 3;
  }

  // ---- Hilfsfunktionen für das Datenmodell ----

  function alsMillisRV(zeitwert) {
    if (zeitwert == null) return null;
    if (typeof zeitwert.toMillis === 'function') return zeitwert.toMillis();
    return zeitwert;
  }

  // Firestore speichert `staedte` als MAP mit String-Schlüsseln "0".."4"
  // (Einfüge-Reihenfolge = Schlüssel-Reihenfolge), siehe Kommentar bei
  // rundeVierStaedteAngehaengt() in firestore.rules. Für die Anzeige und für
  // berechneQualitaet() (unten, Array-Form wie im Node-Original) hier zurück
  // in ein nach Schlüssel sortiertes Array gewandelt.
  function staedteMapZuArray(map) {
    if (!map || typeof map !== 'object') return [];
    return Object.keys(map)
      .sort(function (a, b) { return Number(a) - Number(b); })
      .map(function (schluessel) { return map[schluessel]; });
  }

  // ---- Qualitätsauswertung (Browser-Port von
  //      src/game/rundeVier/qualitaetsauswertung.js) ----
  //
  // Inhaltlich identisch zum Node-Original (Pre-Mortem-Risiko 1: deterministische
  // Duplikat-Auflösung über den Server-Zeitstempel jedes Eintrags), nur die
  // Eingabeform ist an das echte Firestore-Datenmodell angepasst: `karten[].staedte`
  // wird hier als Map erwartet und zuerst in dieselbe Array-Form wie im
  // Node-Original gewandelt (siehe staedteMapZuArray oben).

  function wertungFuerEintrag(richtigesLand, istDublette) {
    if (richtigesLand && !istDublette) return 'korrekt';
    if (!richtigesLand && !istDublette) return 'falschesLand';
    if (richtigesLand && istDublette) return 'dublette';
    return 'falschesLandUndDublette';
  }

  function berechneQualitaet({ karten } = {}) {
    const liste = (Array.isArray(karten) ? karten : []).map(function (karte) {
      return {
        land: karte.land,
        staedte: staedteMapZuArray(karte.staedte),
      };
    });

    const alleEintraege = [];
    liste.forEach(function (karte, kartenIndex) {
      karte.staedte.forEach(function (eintrag, eintragIndex) {
        alleEintraege.push({
          kartenIndex: kartenIndex,
          eintragIndex: eintragIndex,
          land: karte.land,
          stadt: eintrag.stadt,
          am: alsMillisRV(eintrag.am),
        });
      });
    });

    const sortiertNachZeit = alleEintraege.slice().sort(function (a, b) { return (a.am || 0) - (b.am || 0); });

    const bewertungProSchluessel = {};
    const bereitsGeseheneStaedte = {};

    sortiertNachZeit.forEach(function (eintrag) {
      const schluessel = eintrag.kartenIndex + '-' + eintrag.eintragIndex;
      const richtigesLand = istStadtInLand(eintrag.land, eintrag.stadt);
      const stadtSchluessel = normalisiereStadt(eintrag.stadt);
      const istDublette = Boolean(bereitsGeseheneStaedte[stadtSchluessel]);
      if (!istDublette) {
        bereitsGeseheneStaedte[stadtSchluessel] = true;
      }
      bewertungProSchluessel[schluessel] = { richtigesLand: richtigesLand, istDublette: istDublette };
    });

    let korrekt = 0;
    let fehlerhaft = 0;
    let falschesLand = 0;
    let dublette = 0;

    const proKarte = liste.map(function (karte, kartenIndex) {
      const bewerteteStaedte = karte.staedte.map(function (eintrag, eintragIndex) {
        const bewertung = bewertungProSchluessel[kartenIndex + '-' + eintragIndex];
        const wertung = wertungFuerEintrag(bewertung.richtigesLand, bewertung.istDublette);

        if (bewertung.richtigesLand && !bewertung.istDublette) {
          korrekt += 1;
        } else {
          fehlerhaft += 1;
        }
        if (!bewertung.richtigesLand) falschesLand += 1;
        if (bewertung.istDublette) dublette += 1;

        return Object.assign({}, eintrag, { wertung: wertung });
      });
      return { land: karte.land, staedte: bewerteteStaedte };
    });

    return {
      gesamt: { korrekt: korrekt, fehlerhaft: fehlerhaft, falschesLand: falschesLand, dublette: dublette },
      proKarte: proKarte,
    };
  }

  // ---- Eigene Zuständigkeits-Nummer (1-5) sicherstellen ----

  async function stelleEigeneRundeVierPositionSicher({ code, uid, teilnehmerDaten }, db) {
    if (teilnehmerDaten.rundeVierPosition != null) return teilnehmerDaten.rundeVierPosition;
    const nummer = window.FlowGame.stationsNummerVon(teilnehmerDaten.station);
    if (nummer === null) return null; // Host/Beobachtende: keine Zuständigkeit in Runde 4.
    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    await teilnehmerRef.update({ rundeVierPosition: nummer });
    return nummer;
  }

  // ---- Rundenstart (Host-Aktion) ----

  async function starteRundeVier({ code }, db) {
    const spielRef = db.collection('spiele').doc(code);
    const rundenRef = spielRef.collection('runden').doc('4');

    // Wer genau die fünf "fortschritt"-Dokumente bekommt (Grundlage der
    // Wechselzwang-Regel): alle aktuell als "spielende" eingetragenen
    // Personen. Lesbar für jede/n Teilnehmenden (siehe firestore.rules,
    // "rolle != 'host'"), hier vom Host zum Rundenstart einmalig abgefragt.
    const spielendeSnap = await spielRef.collection('teilnehmende')
      .where('rolle', '==', 'spielende')
      .get();
    const spielendeUids = spielendeSnap.docs.map(function (docSnap) { return docSnap.id; });

    const basisMillis = Date.now();

    await db.runTransaction(async function (tx) {
      tx.set(rundenRef, {
        phase: 'aufgabe_vorgestellt',
        dorAbgeschlossen: false,
        dorAbgeschlossenAm: null,
        durchlaufzeitStart: firebase.firestore.FieldValue.serverTimestamp(),
        durchlaufzeitEnde: null,
        bearbeitungszeitStart: null,
        bearbeitungszeitEnde: null,
      });

      let reihenfolge = 1;
      for (let i = 1; i <= 6; i += 1) {
        tx.set(rundenRef.collection('elemente').doc('wuerfel-' + i), {
          typ: 'wuerfel',
          reihenfolge: reihenfolge,
          position: 1,
          angekommenAm: firebase.firestore.Timestamp.fromMillis(basisMillis + reihenfolge),
          wurfAnzahl: 0,
          letzterWurf: null,
        });
        reihenfolge += 1;

        tx.set(rundenRef.collection('elemente').doc('karte-' + i), {
          typ: 'laenderkarte',
          reihenfolge: reihenfolge,
          position: 1,
          angekommenAm: firebase.firestore.Timestamp.fromMillis(basisMillis + reihenfolge),
          land: zufaelligesLand(),
          staedte: {},
        });
        reihenfolge += 1;
      }

      spielendeUids.forEach(function (uid) {
        tx.set(rundenRef.collection('fortschritt').doc(uid), {
          letzterAbgeschlossenerTyp: null,
        });
      });

      tx.update(spielRef, {
        aktuelleRunde: 4,
        letzteAktivitaet: Date.now(),
      });
    });

    return { rundenNummer: 4 };
  }

  // ---- Kettenfortschritt (Würfel-Erfolg oder Stadt-Eintrag) ----

  async function gibElementWeiter({
    code, rundenNummer, elementId, typ, vonPosition, ausgefuehrtVon, staedteAlt, neueStadt,
  }, db) {
    if (typeof vonPosition !== 'number') {
      const fehler = new Error('vonPosition ist erforderlich.');
      fehler.code = 'POSITION_FEHLT';
      throw fehler;
    }
    const nachPosition = vonPosition + 1;
    if (nachPosition > 6) {
      const fehler = new Error('Position 6 ("fertig bei Spieler 5") ist die letzte gültige Position.');
      fehler.code = 'POSITION_MAX';
      throw fehler;
    }

    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    const elementRef = rundenRef.collection('elemente').doc(elementId);
    const fortschrittRef = rundenRef.collection('fortschritt').doc(ausgefuehrtVon);

    const update = {
      position: nachPosition,
      letzteBewegungVon: ausgefuehrtVon,
      letzteBewegungAm: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (typ === 'wuerfel') {
      // Würfel: angekommenAm MUSS bei jedem Kettenfortschritt frisch
      // servergesetzt werden (siehe firestore.rules,
      // rundeVierKettenfortschrittErlaubt()).
      update.angekommenAm = firebase.firestore.FieldValue.serverTimestamp();
    } else if (typ === 'laenderkarte') {
      if (!neueStadt || !neueStadt.trim()) {
        const fehler = new Error('Stadt ist erforderlich.');
        fehler.code = 'STADT_ERFORDERLICH';
        throw fehler;
      }
      const alt = staedteAlt || {};
      const neuerSchluessel = String(Object.keys(alt).length);
      const neu = Object.assign({}, alt);
      neu[neuerSchluessel] = {
        stadt: neueStadt.trim(),
        von: ausgefuehrtVon,
        am: firebase.firestore.FieldValue.serverTimestamp(),
      };
      update.staedte = neu;
      // angekommenAm bewusst NICHT gesetzt/verändert (siehe Kopfkommentar
      // dieser Datei, Punkt 2, und firestore.rules-Kommentar bei
      // rundeVierKettenfortschrittErlaubt()).
    } else {
      const fehler = new Error('Unbekannter Elementtyp: ' + typ);
      fehler.code = 'UNBEKANNTER_ELEMENTTYP';
      throw fehler;
    }

    const batch = db.batch();
    batch.update(elementRef, update);
    batch.update(fortschrittRef, { letzterAbgeschlossenerTyp: typ });
    await batch.commit();
  }

  // ---- Würfel-Zwischenwurf (Wurf ≤3, bleibt bei derselben Person stehen) ----

  async function schreibeWuerfelZwischenwurf({
    code, rundenNummer, elementId, wurfAnzahl, letzterWurf,
  }, db) {
    const elementRef = db.collection('spiele').doc(code)
      .collection('runden').doc(String(rundenNummer))
      .collection('elemente').doc(elementId);
    // `position` bewusst NICHT im Update enthalten (bleibt dadurch automatisch
    // unverändert) - erfüllt rundeVierWuerfelZwischenwurfErlaubt() in
    // firestore.rules ("request.resource.data.position == resource.data.position").
    await elementRef.update({ wurfAnzahl: wurfAnzahl, letzterWurf: letzterWurf });
  }

  // ---- Rundenende (alle zwölf Elemente auf Position 6) + Kennzahlen/Qualität ----

  async function pruefeUndSetzeRundenEndeRundeVier({
    code, rundenNummer, elemente, rundenPhase,
    durchlaufzeitStart, bearbeitungszeitStart, bewegungsLog,
  }, db) {
    const ZIEL_POSITION = 6;
    const alleFertig = Array.isArray(elemente) && elemente.length === 12
      && elemente.every(function (e) { return e.position === ZIEL_POSITION; });

    if (!alleFertig || rundenPhase === 'beendet') {
      return false;
    }

    const jetzt = Date.now();

    // Zeit-Kennzahlen: window.FlowGame.berechneKennzahlen() unverändert
    // wiederverwendet (siehe Kopfkommentar, Punkt 3) - "karten" bekommt hier
    // die zwölf Elemente in derselben Form (position + letzteBewegungAm), das
    // bewegungsLog verwendet die eigene Zuständigkeits-Nummer (1-5) als
    // "station".
    const kartenForm = elemente.map(function (e) {
      return { position: e.position, letzteBewegungAm: e.letzteBewegungAm };
    });
    const kennzahlen = window.FlowGame.berechneKennzahlen({
      durchlaufzeitStart: durchlaufzeitStart,
      durchlaufzeitEnde: jetzt,
      bearbeitungszeitStart: bearbeitungszeitStart,
      bearbeitungszeitEnde: jetzt,
      karten: kartenForm,
      bewegungsLog: bewegungsLog,
    });

    // Qualitäts-Kennzahl (AK 15/16): ausschliesslich über die sechs
    // Länderkarten, nachträglich, wie in der Spec vorgesehen.
    const laenderkarten = elemente.filter(function (e) { return e.typ === 'laenderkarte'; });
    const qualitaetRoh = berechneQualitaet({ karten: laenderkarten });
    const qualitaet = {
      korrekt: qualitaetRoh.gesamt.korrekt,
      fehlerhaft: qualitaetRoh.gesamt.fehlerhaft,
      falschesLand: qualitaetRoh.gesamt.falschesLand,
      dublette: qualitaetRoh.gesamt.dublette,
      gesamtStaedte: qualitaetRoh.gesamt.korrekt + qualitaetRoh.gesamt.fehlerhaft,
    };

    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));
    try {
      await rundenRef.update(Object.assign({
        phase: 'beendet',
        durchlaufzeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
        bearbeitungszeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
        qualitaet: qualitaet,
      }, kennzahlen));
      return true;
    } catch (err) {
      // Ein anderer Client war schneller - kein Fehlerfall aus Nutzersicht.
      return false;
    }
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    LAENDER_LISTE_RUNDE_VIER: LAENDER_LISTE,
    LAENDER_STAEDTE_RUNDE_VIER: LAENDER_STAEDTE,
    istStadtInLand: istStadtInLand,
    istWurfErfolgreich: istWurfErfolgreich,
    staedteMapZuArray: staedteMapZuArray,
    berechneQualitaetRundeVier: berechneQualitaet,
    stelleEigeneRundeVierPositionSicher: stelleEigeneRundeVierPositionSicher,
    starteRundeVier: starteRundeVier,
    gibElementWeiter: gibElementWeiter,
    schreibeWuerfelZwischenwurf: schreibeWuerfelZwischenwurf,
    pruefeUndSetzeRundenEndeRundeVier: pruefeUndSetzeRundenEndeRundeVier,
  });
})(window);
