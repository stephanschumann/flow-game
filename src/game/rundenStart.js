/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Rundenstart (Durchlaufzeit beginnt automatisch, sobald die Aufgabe
 * vorgestellt wird) und Auslösung von "Definition of Ready abgeschlossen"
 * (durch Host ODER Team, idempotent bei Gleichzeitigkeit – Entscheidung
 * 2026-07-17, Pre-Mortem-Risiko 1).
 *
 * Siehe Hinweis in `_rundenStatus.js`: die eigentliche, sicherheitsrelevante
 * Durchsetzung (wer darf das auslösen, Idempotenz bei echter Gleichzeitigkeit
 * mehrerer Clients) sitzt in `firestore.rules` und wird dort real gegen den
 * Emulator geprüft (`tests/game-round.security.rules.test.js`). Dieses Modul
 * bildet dieselbe fachliche Regel als eigenständig testbare Logik nach
 * (`tests/game-round.logic.test.js`).
 */

const { setzeRunde, holeRunde } = require('./_rundenStatus');

function leereKarten() {
  const karten = {};
  for (let i = 1; i <= 6; i += 1) {
    karten[`karte-${i}`] = { position: 0, stapel: null };
  }
  return karten;
}

async function starteRunde({ code, rundenNummer }) {
  const jetzt = Date.now();
  const runde = setzeRunde(code, rundenNummer, {
    rundenNummer,
    beitrittsCode: code,
    phase: 'aufgabe_vorgestellt',
    dorAbgeschlossen: false,
    dorAbgeschlossenAm: null,
    durchlaufzeitStart: jetzt,
    durchlaufzeitEnde: null,
    bearbeitungszeitStart: null,
    bearbeitungszeitEnde: null,
    karten: leereKarten(),
  });
  return { ...runde };
}

async function loeseDefinitionOfReadyAus({ code, rundenNummer, ausgeloestVon }) {
  let runde = holeRunde(code, rundenNummer);
  if (!runde) {
    // Falls DoR ausgelöst wird, ohne dass zuvor starteRunde() aufgerufen wurde
    // (isolierter Aufruf): eine minimale Runde nachziehen, statt hart zu scheitern.
    runde = await starteRunde({ code, rundenNummer });
  }
  if (!runde.dorAbgeschlossen) {
    // Erstmaliges Auslösen. Da JavaScript diesen synchronen Block ohne
    // zwischenzeitliches await vollständig durchläuft, bevor eine zweite,
    // "gleichzeitige" Anfrage an die Reihe kommt, ist dieser Pfad idempotent:
    // ein zweiter Aufruf (egal ob von Host oder Team) sieht danach bereits
    // dorAbgeschlossen === true und ändert nichts mehr (siehe unten).
    runde.dorAbgeschlossen = true;
    runde.dorAbgeschlossenAm = Date.now();
    runde.phase = 'dor_abgeschlossen';
    setzeRunde(code, rundenNummer, runde);
  }
  return {
    dorAbgeschlossen: runde.dorAbgeschlossen,
    dorAbgeschlossenAm: runde.dorAbgeschlossenAm,
    ausgeloestVon,
  };
}

module.exports = { starteRunde, loeseDefinitionOfReadyAus };
