/**
 * FEATURE-002/FEATURE-003 – Browser-Version von src/game/rundenEnde.js.
 *
 * Anders als das Node-Original (das rein den prozessinternen Speicher aus
 * _rundenStatus.js abfragt) SCHREIBT diese Version bei erkanntem
 * Rundenende tatsächlich das Rundendokument fort (phase:'beendet',
 * servergesetztes durchlaufzeitEnde) – siehe firestore.rules, Fall B der
 * runden-Update-Regel. Jeder verbundene Client, der die letzte Karte im Ziel
 * sieht, versucht das opportunistisch; der lokale phase-Check unten plus die
 * serverseitige Vorbedingung (dorAbgeschlossen bereits true) verhindern
 * unnötige Wiederholungen. Restrisiko (dokumentiert, siehe Abschlussbericht):
 * zwei Clients könnten im selben Sekundenbruchteil beide noch phase !==
 * 'beendet' sehen und je einen eigenen serverTimestamp() schreiben – der
 * zweite überschreibt dann durchlaufzeitEnde geringfügig später. Ohne Cloud
 * Functions/serverseitige Transaktion über mehrere Clients hinweg nicht
 * vollständig vermeidbar, praktisch aber vernachlässigbar (Millisekunden).
 *
 * FEATURE-003-ERWEITERUNG (2026-07-19, siehe Abschlussbericht an Stephan):
 * Berechnet und schreibt jetzt IM SELBEN update()-Aufruf zusätzlich alle
 * Kennzahlenfelder, die firestore.rules und tests/game-evaluation.*.test.js
 * auf spiele/{code}/runden/{n} erwarten (durchlaufzeit, bearbeitungszeit,
 * zeitBisErsterLieferung, zeitBisLetzterLieferung,
 * abstandErsteLetzteLieferung, proStation). Das MUSS im selben Schreibvorgang
 * passieren wie phase:'beendet', weil firestore.rules (Fall B, unverändert)
 * für JEDEN Update-Versuch, der die Kennzahlenfelder ergänzen will, erneut
 * verlangt, dass phase=='beendet' UND durchlaufzeitEnde==request.time in
 * genau diesem einen Schreibvorgang gesetzt werden – ein zweiter,
 * nachgelagerter Schreibvorgang (z. B. nachdem der aufgelöste
 * Server-Zeitstempel per Snapshot zurückkommt) würde von der Regel
 * abgelehnt, da durchlaufzeitEnde dann unverändert bliebe und nicht mehr
 * request.time entspräche.
 *
 * Daraus folgt eine bewusste, dokumentierte Einschränkung: `durchlaufzeit`
 * und `bearbeitungszeit` können zum Zeitpunkt dieses Schreibvorgangs noch
 * nicht exakt aus dem aufgelösten Server-Zeitstempel berechnet werden (der
 * ist erst NACH dem Commit bekannt) und werden deshalb mit dem lokalen
 * Date.now() als Näherung für das Rundenende gebildet - siehe
 * kennzahlen.js-Kopfkommentar für die vollständige Begründung. Alle übrigen
 * Kennzahlen (Lieferzeiten, Pro-Station-Beteiligung) beruhen dagegen
 * ausschließlich auf bereits echten, aufgelösten Server-Zeitstempeln
 * (Kartenbewegungen) und sind NICHT von dieser Näherung betroffen.
 */
(function (global) {
  'use strict';

  const ZIEL_POSITION = 6;

  function stationenAnzahl() {
    return (global.FlowGame && Array.isArray(global.FlowGame.STATIONEN))
      ? global.FlowGame.STATIONEN.length : 5;
  }

  /**
   * BUGFIX-016 - Sollzahl der Bewegungen je Station, ausschliesslich aus dem
   * tatsaechlichen Spielstand abgeleitet (kein fest verdrahteter Zahlenwert):
   * Ein Element, das jetzt auf Position p steht, ist von `startPosition` aus
   * genau die Schritte startPosition+1 .. p gegangen. Zustaendig fuer einen
   * Schritt auf `nachPosition` ist Station max(nachPosition - 1, 1) - dieselbe
   * Zuordnungsregel wie in kartenBewegung.js, im Karten-Listener von
   * spiel.html und in bewegungErlaubt() in firestore.rules.
   *
   * Runden 1-3 starten bei Position 0 (Auftragseingang) -> sechs Karten im
   * Ziel ergeben 36 Bewegungen, davon 12 an Station 1 und je 6 an den
   * Stationen 2-5. Runde 4 startet bei Position 1 -> zwoelf Elemente im Ziel
   * ergeben 60 Bewegungen, je 12 pro Station. Genau deshalb wird
   * `startPosition` uebergeben statt angenommen.
   */
  function erwarteteBewegungenProStation(positionen, startPosition) {
    const soll = {};
    const anzahl = stationenAnzahl();
    for (let station = 1; station <= anzahl; station += 1) soll[station] = 0;
    (positionen || []).forEach(function (position) {
      if (typeof position !== 'number') return;
      for (let nachPosition = startPosition + 1; nachPosition <= position; nachPosition += 1) {
        const station = Math.max(nachPosition - 1, 1);
        if (soll[station] !== undefined) soll[station] += 1;
      }
    });
    return soll;
  }

  /**
   * BUGFIX-016 - liest die fuer ALLE gleiche, serverseitig fortgeschriebene
   * Bewegungshistorie der Runde. Ersetzt den fluechtigen, nur lokal
   * mitgeschnittenen `bewegungsLog`: Wer wann beigetreten ist oder ob jemand
   * mitten in der Runde neu geladen hat, spielt fuer das Ergebnis keine Rolle
   * mehr. Die Eintraege haben bereits die Form, die berechneKennzahlen()
   * erwartet (station + servergesetztes `wann`).
   */
  async function ladeBewegungsHistorie(rundenRef) {
    const schnappschuss = await rundenRef.collection('bewegungen').get();
    const eintraege = [];
    schnappschuss.forEach(function (docSnap) {
      const daten = docSnap.data();
      eintraege.push({
        uid: daten.uid,
        kartenId: daten.kartenId,
        wann: daten.wann,
        station: daten.station,
        nachPosition: daten.nachPosition,
        stapel: daten.stapel || null,
        // BUGFIX-016 (Nacharbeit Zweitprüfung): 'weitergabe' oder
        // 'wuerfelversuch'. Einträge aus der ersten Umsetzung tragen das Feld
        // noch nicht - sie sind ausnahmslos Weitergaben, deshalb dieser
        // Standardwert.
        art: daten.art || 'weitergabe',
      });
    });
    return eintraege;
  }

  /**
   * BUGFIX-016, AK5/AK9 - ehrliche Kennzeichnung statt stillschweigend zu
   * niedriger Zahl. Fehlen einer Station nachweislich Eintraege (weniger als
   * der oben abgeleitete Sollwert), werden GENAU DEREN Werte auf null gesetzt
   * (Anzeige: "—") statt eine zu niedrige Zahl zu behaupten, die von einer
   * tatsaechlich untaetigen Station nicht zu unterscheiden waere. Stationen
   * mit vollstaendiger Historie behalten ihre echten Werte - es wird also
   * nicht pauschal alles verworfen.
   *
   * Rueckgabe: true, wenn KEINE Station eine Luecke hat (-> Feld
   * `kennzahlenVollstaendig` auf dem Rundendokument).
   *
   * NACHARBEIT ZUR ZWEITPRUEFUNG (2026-08-14), zwei Praezisierungen am
   * Zaehler - beide bewusst hier und nicht in der Berechnung:
   *
   * (a) Gezaehlt werden ausschliesslich WEITERGABEN. Seit Stephans
   *     Entscheidung "Alle Versuche muessen mitzaehlen" legt auch jeder
   *     misslungene Wuerfelversuch in Runde 4 einen Historieneintrag an
   *     (art: 'wuerfelversuch'). Deren Anzahl schwankt naturgemaess und ist
   *     aus dem Spielstand NICHT ableitbar - eine Sollzahl, die sie
   *     mitzaehlt, waere reine Willkuer. In die angezeigte Taetigkeitszahl
   *     (anzahlBewegungen) gehen sie dagegen sehr wohl ein, das erledigt
   *     berechneKennzahlen() ueber dieselbe Historie.
   *
   * (b) Gezaehlt werden nur Eintraege mit einem AUFLOESBAREN Zeitpunkt -
   *     exakt derselbe Massstab, den berechneKennzahlen() anlegt
   *     (`.filter((ms) => ms != null)`, kennzahlen.js). Vorher zaehlte diese
   *     Pruefung ALLE Dokumente: ein Eintrag, dessen servergesetzter
   *     Zeitstempel beim Lesen noch nicht bestaetigt war, senkte damit die
   *     Taetigkeitszahl, OHNE die Unvollstaendigkeits-Kennzeichnung
   *     auszuloesen - also genau die stille Untertreibung, die AK5/AK9
   *     verhindern sollen. Betroffen ist typischerweise die Person, die die
   *     letzte Karte ins Ziel legt und damit selbst das Rundenende ausloest.
   *
   * (c) NACHTRAG ZUR ZWEITEN PRUEFRUNDE (2026-08-15): (a) und (b) zusammen
   *     hatten noch eine Luecke, weil (a) VOR (b) greift. Ein
   *     WUERFELVERSUCH ohne aufgeloesten Zeitpunkt fiel durch die
   *     Art-Ausnahme in (a) heraus und wurde damit auch von der
   *     Zeitpunkt-Pruefung in (b) nie erfasst - berechneKennzahlen()
   *     verwirft ihn aber sehr wohl. Eine Station mit zwoelf Weitergaben
   *     und zwei Wuerfelversuchen, von denen einer noch unbestaetigt ist,
   *     zeigte so die Taetigkeitszahl 13 statt 14 und galt trotzdem als
   *     vollstaendig - wieder die stille Untertreibung aus AK5/AK9.
   *     Deshalb gilt jetzt ZUSAETZLICH: Sobald IRGENDEIN Eintrag dieser
   *     Station keinen aufloesbaren Zeitpunkt hat - unabhaengig von der
   *     Eintragsart -, ist die Station unvollstaendig. Diese Bedingung
   *     braucht keinen Sollwert (der fuer Wuerfelversuche gar nicht
   *     ableitbar ist) und laesst die Weitergabe-Logik aus (a)/(b)
   *     unangetastet.
   */
  function kennzeichneUnvollstaendigeStationen(kennzahlen, historie, positionen, startPosition) {
    const soll = erwarteteBewegungenProStation(positionen, startPosition);
    const alsMillis = (global.FlowGame && global.FlowGame.alsMillis)
      ? global.FlowGame.alsMillis
      : function (wert) { return wert == null ? null : wert; };
    let vollstaendig = true;
    Object.keys(soll).forEach(function (station) {
      const eintraegeDerStation = (historie || []).filter(function (eintrag) {
        return String(eintrag.station) === String(station);
      });
      const ist = eintraegeDerStation.filter(function (eintrag) {
        if ((eintrag.art || 'weitergabe') === 'wuerfelversuch') return false;
        return alsMillis(eintrag.wann) != null;
      }).length;
      // Siehe (c) im Kopfkommentar: gilt fuer JEDE Eintragsart, auch fuer
      // Wuerfelversuche, die aus der Sollzahl bewusst herausfallen.
      const zeitpunktFehlt = eintraegeDerStation.some(function (eintrag) {
        return alsMillis(eintrag.wann) == null;
      });
      // Bewusst "mindestens" und nicht "genau" (geprueft in der Nacharbeit zur
      // Zweitpruefung, 2026-08-14): Der Zweck dieser Kennzeichnung ist
      // ausschliesslich, eine stillschweigend ZU NIEDRIGE Zahl zu verhindern.
      // Ein Ueberhang ist dafuer kein Beleg - er kann aus einem kuenftigen,
      // hier noch nicht bekannten Eintragstyp entstehen (die Wuerfelversuche
      // waren gerade so ein Fall) und wuerde mit "genau" eine vollstaendige
      // Runde faelschlich als unvollstaendig brandmarken. Die Untergrenze
      // selbst ist deterministisch und deckt den echten Fehlerfall ab.
      if (ist >= soll[station] && !zeitpunktFehlt) return;
      vollstaendig = false;
      const eintrag = kennzahlen.proStation && kennzahlen.proStation[station];
      if (!eintrag) return;
      eintrag.anzahlBewegungen = null;
      eintrag.beteiligungsspanne = null;
      if (Object.prototype.hasOwnProperty.call(eintrag, 'wartezeitVorher')) {
        eintrag.wartezeitVorher = null;
      }
      if (Object.prototype.hasOwnProperty.call(eintrag, 'wartezeitNachher')) {
        eintrag.wartezeitNachher = null;
      }
    });
    return vollstaendig;
  }

  async function pruefeUndSetzeRundenEnde({
    code, rundenNummer, karten, rundenPhase,
    durchlaufzeitStart, bearbeitungszeitStart,
  }, db) {
    const alleImZiel = Array.isArray(karten) && karten.length === 6
      && karten.every((k) => k.position === ZIEL_POSITION);

    if (!alleImZiel || rundenPhase === 'beendet') {
      return false;
    }

    const rundenRef = db.collection('spiele').doc(code).collection('runden').doc(String(rundenNummer));

    // BUGFIX-016: Die Pro-Station-Werte entstehen jetzt aus der gemeinsamen,
    // serverseitigen Historie - nicht mehr aus dem eigenen Mitschnitt. Der
    // Lesevorgang steht bewusst VOR dem Schreibvorgang und in einem eigenen
    // try/catch: schlaegt er fehl, endet die Runde trotzdem (AK7, kein
    // Spielstopp), die Werte werden dann aber ehrlich als unvollstaendig
    // gekennzeichnet statt stillschweigend geraten.
    let historie = [];
    try {
      historie = await ladeBewegungsHistorie(rundenRef);
    } catch (leseFehler) {
      console.warn('BUGFIX-016: Bewegungshistorie nicht lesbar, Kennzahlen werden als unvollstaendig gekennzeichnet.', leseFehler);
    }

    const jetzt = Date.now();
    const kennzahlen = window.FlowGame.berechneKennzahlen({
      durchlaufzeitStart,
      durchlaufzeitEnde: jetzt,
      bearbeitungszeitStart,
      bearbeitungszeitEnde: jetzt,
      karten,
      bewegungsLog: historie,
    });

    // Runden 1-3 starten im Auftragseingang (Position 0), siehe rundenStart.js.
    kennzahlen.kennzahlenVollstaendig = kennzeichneUnvollstaendigeStationen(
      kennzahlen,
      historie,
      karten.map(function (k) { return k.position; }),
      0,
    );

    try {
      await rundenRef.update(Object.assign({
        phase: 'beendet',
        durchlaufzeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
        bearbeitungszeitEnde: firebase.firestore.FieldValue.serverTimestamp(),
      }, kennzahlen));
      return true;
    } catch (err) {
      // Ein anderer Client war schneller (oder dorAbgeschlossen war doch noch
      // nicht gesetzt) - kein Fehlerfall aus Nutzersicht, einfach ignorieren.
      return false;
    }
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, {
    pruefeUndSetzeRundenEnde,
    // BUGFIX-016: von rundeVier.js wiederverwendet (Runde 4 hat denselben
    // Fehler, siehe Spec) - bewusst EINE gemeinsame Umsetzung statt zweier
    // getrennter Kopien.
    ladeBewegungsHistorie,
    erwarteteBewegungenProStation,
    kennzeichneUnvollstaendigeStationen,
  });
})(window);
