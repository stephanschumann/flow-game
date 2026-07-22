/**
 * FEATURE-005 – Phase 5: Robustheit (Wiederbetreten für Spielende/Beobachtende)
 *
 * Analog zum bestehenden Host-Wiederherstellungs-Mechanismus in
 * src/game/hostSession.js (restoreHostSession), aber für Spielende und
 * Beobachtende: baut vollständig auf der bereits bestehenden Idempotenz von
 * joinGame() auf (siehe dortiger Bugfix-Kommentar, FEATURE-002/2026-07-20) –
 * kein neuer Serverbaustein, kein neues Firestore-Regel-Erfordernis (Option A
 * aus der freigegebenen Spec in Backlog.md, "### FEATURE-005").
 *
 * restoreTeilnehmerSession() ruft joinGame() mit den lokal gespeicherten
 * Werten (Code, Rolle, Anzeigename, uid) erneut auf. Weil joinGame() bereits
 * ein bestehendes Teilnehmenden-Dokument dieser uid unverändert zurückgibt
 * (keine neue Station, kein Überschreiben), ist ein Rejoin ohne erneute
 * Formulareingabe möglich. Zusätzlich wird VOR dem joinGame()-Aufruf geprüft,
 * ob für diese uid bereits ein Dokument existiert – daraus ergibt sich das
 * Flag `warRejoin` (AK1/AK2/AK3), mit dem der Client zwischen Erstbeitritt und
 * echtem Wiederbetreten unterscheiden kann.
 *
 * registriereAktivenTab()/istAktiverTab() decken AK16 ab ("neuester Tab
 * gewinnt", mit Stephan am 2026-07-20 geklärt): jeder Aufruf von
 * registriereAktivenTab() überschreibt den zuvor hinterlegten aktiven Tab für
 * diese uid in diesem Spiel. istAktiverTab() prüft, ob der übergebene tabId
 * noch der zuletzt registrierte ist – ein älterer Tab erkennt sich damit
 * selbst als nicht mehr aktiv. Bewusst KEINE aktive Blockade eines einzelnen
 * Tabs (geklärte Frage 2): ein Tab, der sich nie mit einem zweiten Tab
 * überschneidet, gilt weiterhin als aktiv.
 *
 * WICHTIG: Diese Datei muss inhaltlich synchron gehalten werden mit der
 * Browser-Kopie public/js/game/teilnehmerSession.js (Projekt-Konvention,
 * kein Bundler – siehe joinGame.js/hostSession.js).
 *
 * BUGFIX-001 (2026-07-21): Der eigene Vorab-Lesevorgang (teilnehmerRef.get())
 * unten läuft auf einem frischen Gerät ebenfalls unmittelbar nach
 * signInAnonymously() (automatischer Rejoin beim Laden, siehe
 * public/spiel.html) und trägt dasselbe Zeitfenster-Risiko wie in
 * joinGame.js beschrieben – deshalb ebenfalls mit mitVerbindungsRetry()
 * abgesichert.
 */

const { joinGame } = require('./joinGame');
const { mitVerbindungsRetry } = require('./verbindungsRetry');

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

  // Reiner Lesevorgang VOR joinGame(): entscheidet nur über das warRejoin-
  // Flag, nicht über die eigentliche Vergabe/Idempotenz selbst (die bleibt
  // vollständig in joinGame()/dessen Transaktion). Bei zwei echten,
  // gleichzeitigen Personen ist das unkritisch, weil jede Person ihre eigene
  // uid/ihr eigenes Dokument prüft (siehe Testfall "Gleichzeitiges
  // Wiederbetreten zweier unterschiedlicher Personen").
  // BUGFIX-001: client is offline auf frischem Gerät möglich – daher mit
  // Retry abgesichert, nicht nur der anschließende joinGame()-Aufruf.
  const vorherSnap = await mitVerbindungsRetry(() => teilnehmerRef.get(), retryOptionen);
  const warRejoin = vorherSnap.exists;

  const ergebnis = await joinGame({ code, anzeigename, rolle, uid }, db, retryOptionen);

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
  // Kein je registrierter Tab -> nichts zu vergleichen, gilt als aktiv
  // (keine aktive Blockade, geklärte Frage 2).
  if (!daten.aktiverTab) return true;
  return daten.aktiverTab === tabId;
}

module.exports = { restoreTeilnehmerSession, registriereAktivenTab, istAktiverTab };
