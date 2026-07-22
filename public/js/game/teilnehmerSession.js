/**
 * FEATURE-005 – Browser-Version von src/game/teilnehmerSession.js. Siehe
 * Hinweis in public/js/game/createGame.js zur manuellen Synchronhaltung mit
 * dem Node-Modul (kein Bundler im Projekt). Nutzt window.FlowGame.joinGame
 * (aus joinGame.js, muss vorher als <script> eingebunden sein).
 *
 * BUGFIX-001 (2026-07-21): Der eigene Vorab-Lesevorgang (teilnehmerRef.get())
 * unten läuft auf einem frischen Gerät ebenfalls unmittelbar nach
 * signInAnonymously() (automatischer Rejoin beim Laden) und trägt dasselbe
 * Verbindungsfehler-Risiko wie in joinGame.js beschrieben – deshalb ebenfalls
 * mit mitVerbindungsRetry() (aus verbindungsRetry.js) abgesichert.
 */
(function (global) {
  'use strict';

  const { mitVerbindungsRetry } = global.FlowGame;

  async function restoreTeilnehmerSession({ code, rolle, anzeigename, uid }, db, retryOptionen = {}) {
    if (!code || typeof code !== 'string') {
      const fehler = new Error('Ungültiger oder unbekannter Code.');
      fehler.code = 'UNGUELTIGER_CODE';
      throw fehler;
    }
    if (!uid) {
      const fehler = new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
      fehler.code = 'FEHLENDE_AUTH_SITZUNG';
      throw fehler;
    }

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    // BUGFIX-001: client is offline auf frischem Gerät möglich – daher mit
    // Retry abgesichert, nicht nur der anschließende joinGame()-Aufruf.
    const vorherSnap = await mitVerbindungsRetry(() => teilnehmerRef.get(), retryOptionen);
    const warRejoin = vorherSnap.exists;

    const ergebnis = await global.FlowGame.joinGame({ code, anzeigename, rolle, uid }, db, retryOptionen);

    return Object.assign({}, ergebnis, { warRejoin });
  }

  async function registriereAktivenTab({ code, uid, tabId }, db) {
    if (!code || typeof code !== 'string') {
      const fehler = new Error('Ungültiger oder unbekannter Code.');
      fehler.code = 'UNGUELTIGER_CODE';
      throw fehler;
    }
    if (!uid) {
      const fehler = new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
      fehler.code = 'FEHLENDE_AUTH_SITZUNG';
      throw fehler;
    }
    if (!tabId) {
      const fehler = new Error('tabId ist erforderlich.');
      fehler.code = 'TAB_ID_ERFORDERLICH';
      throw fehler;
    }

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    await teilnehmerRef.set(
      { aktiverTab: tabId, aktiverTabSeit: Date.now() },
      { merge: true }
    );
    return { tabId };
  }

  async function istAktiverTab({ code, uid, tabId }, db) {
    if (!code || typeof code !== 'string') {
      const fehler = new Error('Ungültiger oder unbekannter Code.');
      fehler.code = 'UNGUELTIGER_CODE';
      throw fehler;
    }
    if (!uid) {
      const fehler = new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
      fehler.code = 'FEHLENDE_AUTH_SITZUNG';
      throw fehler;
    }
    if (!tabId) {
      const fehler = new Error('tabId ist erforderlich.');
      fehler.code = 'TAB_ID_ERFORDERLICH';
      throw fehler;
    }

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    const snap = await teilnehmerRef.get();
    if (!snap.exists) return false;
    const daten = snap.data();
    if (!daten.aktiverTab) return true;
    return daten.aktiverTab === tabId;
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { restoreTeilnehmerSession, registriereAktivenTab, istAktiverTab });
})(window);
