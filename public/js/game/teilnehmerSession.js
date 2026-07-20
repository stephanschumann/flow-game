/**
 * FEATURE-005 – Browser-Version von src/game/teilnehmerSession.js. Siehe
 * Hinweis in public/js/game/createGame.js zur manuellen Synchronhaltung mit
 * dem Node-Modul (kein Bundler im Projekt). Nutzt window.FlowGame.joinGame
 * (aus joinGame.js, muss vorher als <script> eingebunden sein).
 */
(function (global) {
  'use strict';

  async function restoreTeilnehmerSession({ code, rolle, anzeigename, uid }, db) {
    if (!code || typeof code !== 'string') {
      throw new Error('Ungültiger oder unbekannter Code.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }

    const teilnehmerRef = db.collection('spiele').doc(code).collection('teilnehmende').doc(uid);
    const vorherSnap = await teilnehmerRef.get();
    const warRejoin = vorherSnap.exists;

    const ergebnis = await global.FlowGame.joinGame({ code, anzeigename, rolle, uid }, db);

    return Object.assign({}, ergebnis, { warRejoin });
  }

  async function registriereAktivenTab({ code, uid, tabId }, db) {
    if (!code || typeof code !== 'string') {
      throw new Error('Ungültiger oder unbekannter Code.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }
    if (!tabId) {
      throw new Error('tabId ist erforderlich.');
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
      throw new Error('Ungültiger oder unbekannter Code.');
    }
    if (!uid) {
      throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
    }
    if (!tabId) {
      throw new Error('tabId ist erforderlich.');
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
