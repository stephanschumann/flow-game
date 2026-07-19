/**
 * FEATURE-001 – Browser-Version von src/game/joinGame.js. Siehe Hinweis in
 * public/js/game/createGame.js zur manuellen Synchronhaltung mit dem
 * Node-Modul (kein Bundler im Projekt).
 */
(function (global) {
  'use strict';

  const STATIONEN = global.FlowGame.STATIONEN;
  const INAKTIV_GRENZE_MS = 24 * 60 * 60 * 1000;

  function pruefeSpielExistiertUndAktiv(snap, code) {
    if (!snap.exists) {
      throw new Error(`Kein Spiel mit dem Code "${code}" gefunden.`);
    }
    const spiel = snap.data();
    if (Date.now() - spiel.letzteAktivitaet > INAKTIV_GRENZE_MS) {
      throw new Error(
        `Das Spiel mit dem Code "${code}" ist seit über 24 Stunden inaktiv und der Code nicht mehr gültig.`
      );
    }
    return spiel;
  }

  async function joinGame({ code, anzeigename, rolle, uid }, db) {
    if (!anzeigename || !anzeigename.trim()) {
      throw new Error('Anzeigename ist erforderlich.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }
    if (!['spielende', 'beobachtende'].includes(rolle)) {
      throw new Error('Ungültige Rolle – bitte "spielende" oder "beobachtende" wählen.');
    }
    if (!code || typeof code !== 'string') {
      throw new Error('Ungültiger oder unbekannter Code.');
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
      const [vorabSnap, teilnehmerVorabSnap] = await Promise.all([spielRef.get(), teilnehmerRef.get()]);
      pruefeSpielExistiertUndAktiv(vorabSnap, code);
      if (!teilnehmerVorabSnap.exists) {
        const belegtVorab = vorabSnap.data().belegteStationen || {};
        const freiVorab = STATIONEN.filter((s) => !belegtVorab[s]);
        if (freiVorab.length === 0) {
          throw new Error(
            'Alle Stationen sind bereits belegt. Bitte bewusst eine andere Rolle wählen (z. B. Beobachtende).'
          );
        }
      }
    }

    return db.runTransaction(async (tx) => {
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
    });
  }

  global.FlowGame.joinGame = joinGame;
})(window);
