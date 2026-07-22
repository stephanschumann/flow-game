/**
 * FEATURE-001 – Browser-Version von src/game/joinGame.js. Siehe Hinweis in
 * public/js/game/createGame.js zur manuellen Synchronhaltung mit dem
 * Node-Modul (kein Bundler im Projekt).
 *
 * BUGFIX-001 (2026-07-21): Der Vorab-Check-Lesevorgang (Promise.all mit
 * spielRef.get()/teilnehmerRef.get()) sowie die Transaktions-Lesevorgänge
 * (tx.get(...)) laufen auf einem frischen Gerät unmittelbar nach
 * signInAnonymously(), ohne bestehende Serververbindung – dort kann Firestore
 * mit "Failed to get document because the client is offline." fehlschlagen
 * (siehe Backlog.md "### BUGFIX-001"). Beide Stellen sind deshalb jetzt mit
 * mitVerbindungsRetry() (aus verbindungsRetry.js, muss vorher als <script>
 * eingebunden sein) abgesichert; alle anderen Fehler (ungültiger Code,
 * Rolle, Stationen belegt, Spiel inaktiv) werden davon unverändert und ohne
 * Verzögerung durchgereicht.
 */
(function (global) {
  'use strict';

  const STATIONEN = global.FlowGame.STATIONEN;
  const { mitVerbindungsRetry } = global.FlowGame;
  const INAKTIV_GRENZE_MS = 24 * 60 * 60 * 1000;

  // FEATURE-006 (2026-07-21, AK 7, Pre-Mortem-Risiko 2): siehe
  // src/game/joinGame.js für die ausführliche Begründung – muss synchron
  // gehalten werden.
  function wirfFehler(nachricht, code) {
    const fehler = new Error(nachricht);
    fehler.code = code;
    throw fehler;
  }

  function pruefeSpielExistiertUndAktiv(snap, code) {
    if (!snap.exists) {
      wirfFehler(`Kein Spiel mit dem Code "${code}" gefunden.`, 'UNGUELTIGER_CODE');
    }
    const spiel = snap.data();
    if (Date.now() - spiel.letzteAktivitaet > INAKTIV_GRENZE_MS) {
      wirfFehler(
        `Das Spiel mit dem Code "${code}" ist seit über 24 Stunden inaktiv und der Code nicht mehr gültig.`,
        'SPIEL_INAKTIV'
      );
    }
    return spiel;
  }

  async function joinGame({ code, anzeigename, rolle, uid }, db, retryOptionen = {}) {
    if (!anzeigename || !anzeigename.trim()) {
      wirfFehler('Anzeigename ist erforderlich.', 'ANZEIGENAME_ERFORDERLICH');
    }
    if (!uid) {
      wirfFehler('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.', 'FEHLENDE_AUTH_SITZUNG');
    }
    if (!['spielende', 'beobachtende'].includes(rolle)) {
      wirfFehler('Ungültige Rolle – bitte "spielende" oder "beobachtende" wählen.', 'UNGUELTIGE_ROLLE');
    }
    if (!code || typeof code !== 'string') {
      wirfFehler('Ungültiger oder unbekannter Code.', 'UNGUELTIGER_CODE');
    }

    const spielRef = db.collection('spiele').doc(code);
    const teilnehmerRef = spielRef.collection('teilnehmende').doc(uid);

    // Bugfix (live gefunden, 2026-07-20, siehe Backlog.md): Vorab-Check darf
    // nicht greifen, wenn diese uid bereits ein Teilnehmer-Dokument in diesem
    // Spiel hat (Doppel-Tap/Retry desselben Beitritts) – sonst würde eine
    // Person mit bereits vorhandener Station fälschlich mit "alle Stationen
    // belegt" abgewiesen. Siehe src/game/joinGame.js für den ausführlichen
    // Kommentar (beide Dateien synchron halten).
    if (rolle === 'spielende') {
      // BUGFIX-001: Retry NUR bei genau diesem transienten Verbindungsfehler
      // (client is offline) – ein regulärer fachlicher Fehler wird von
      // mitVerbindungsRetry() sofort und ohne Verzögerung durchgereicht.
      const [vorabSnap, teilnehmerVorabSnap] = await mitVerbindungsRetry(
        () => Promise.all([spielRef.get(), teilnehmerRef.get()]),
        retryOptionen
      );
      pruefeSpielExistiertUndAktiv(vorabSnap, code);
      if (!teilnehmerVorabSnap.exists) {
        const belegtVorab = vorabSnap.data().belegteStationen || {};
        const freiVorab = STATIONEN.filter((s) => !belegtVorab[s]);
        if (freiVorab.length === 0) {
          wirfFehler(
            'Alle Stationen sind bereits belegt. Bitte bewusst eine andere Rolle wählen (z. B. Beobachtende).',
            'SPIEL_VOLL'
          );
        }
      }
    }

    // BUGFIX-001: Die gesamte Transaktion (nicht nur der Lesevorgang) wird bei
    // genau diesem transienten Verbindungsfehler erneut versucht – unbedenklich,
    // da Firestore-Transaktionen erst ganz am Ende, atomar committen. Schlägt
    // tx.get() fehl, wurde noch NICHTS geschrieben. Ein wiederholter
    // Transaktionsversuch bleibt zusätzlich durch die bestehende Idempotenz
    // unten (teilnehmerSnap.exists, Bugfix vom 2026-07-20) abgesichert.
    return mitVerbindungsRetry(() => db.runTransaction(async (tx) => {
      const [spielSnap, teilnehmerSnap] = await Promise.all([tx.get(spielRef), tx.get(teilnehmerRef)]);
      const spiel = pruefeSpielExistiertUndAktiv(spielSnap, code);

      // Bugfix (live gefunden, 2026-07-20, siehe Backlog.md): bereits
      // vorhandenes Teilnehmer-Dokument dieser uid unverändert zurückgeben,
      // keine neue Station vergeben, kein Überschreiben. Idempotent für beide
      // Rollen, auch race-safe bei fast gleichzeitigen Doppelaufrufen (siehe
      // src/game/joinGame.js für den ausführlichen Kommentar).
      if (teilnehmerSnap.exists) {
        const vorhandeneDaten = teilnehmerSnap.data();
        return {
          id: uid,
          rolle: vorhandeneDaten.rolle,
          anzeigename: vorhandeneDaten.anzeigename,
          station: vorhandeneDaten.station,
        };
      }

      const belegt = spiel.belegteStationen || {};
      const frei = STATIONEN.filter((s) => !belegt[s]);

      let station;
      let effektiveRolle = rolle;

      if (rolle === 'spielende') {
        if (frei.length === 0) {
          effektiveRolle = 'stationenVoll';
        } else {
          station = frei[0];
        }
      }

      const daten = { rolle: effektiveRolle, anzeigename: anzeigename.trim() };
      if (station) {
        daten.station = station;
      }
      tx.set(teilnehmerRef, daten);

      const aktualisierung = { letzteAktivitaet: Date.now() };
      if (station) {
        aktualisierung[`belegteStationen.${station}`] = uid;
      }
      tx.update(spielRef, aktualisierung);

      return { id: uid, rolle: effektiveRolle, anzeigename: anzeigename.trim(), station };
    }), retryOptionen);
  }

  global.FlowGame.joinGame = joinGame;
})(window);
