/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Interner Zwischenspeicher, ausschliesslich für die Node-seitigen
 * Referenz-Logik-Module dieses Ordners (elementBewegung.js), NICHT für die
 * eigentliche Server-Autorität zuständig.
 *
 * Bewusst ein EIGENER, von `src/game/_rundenStatus.js` (Runde 1–3) getrennter
 * Speicher – kein gemeinsamer Zustand, damit Runde-4-Tests niemals versehentlich
 * mit Runde-1–3-Tests interferieren und umgekehrt (siehe Regressionsrisiko in
 * der FEATURE-004-Spec, Abschnitt "Betroffene Architektur").
 *
 * WICHTIG (gleicher Hinweis wie im Runde-1–3-Pendant): Die tatsächliche,
 * sicherheitsrelevante Durchsetzung aller Zugregeln (Kettenfortschritt,
 * Wechselzwang, FIFO, DoR-Voraussetzung, servergesetzte Zeitstempel) passiert
 * AUSSCHLIESSLICH in `firestore.rules` gegen echte Firestore-Dokumente – siehe
 * `tests/game-round4.security.rules.test.js`.
 */

const speicher = new Map();

function schluessel(code, rundenNummer) {
  return `${code}:${rundenNummer}`;
}

function setzeRundeVier(code, rundenNummer, daten) {
  speicher.set(schluessel(code, rundenNummer), daten);
  return speicher.get(schluessel(code, rundenNummer));
}

function holeRundeVier(code, rundenNummer) {
  return speicher.get(schluessel(code, rundenNummer)) || null;
}

module.exports = { setzeRundeVier, holeRundeVier };
