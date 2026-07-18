/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Automatisches Rundenende: sobald die letzte Karte im Ziel (Position 6)
 * ankommt, stoppen Durchlaufzeit/Bearbeitungszeit/alle Pro-Spieler-Zeiten,
 * ohne dass jemand das auslösen muss.
 */

const { holeRunde, setzeRunde } = require('./_rundenStatus');

const ZIEL_POSITION = 6;

async function pruefeRundenEnde({ code, rundenNummer, kartenPositionen }) {
  const beendet = Array.isArray(kartenPositionen)
    && kartenPositionen.length > 0
    && kartenPositionen.every((position) => position === ZIEL_POSITION);

  const runde = holeRunde(code, rundenNummer);
  let durchlaufzeitEnde = null;

  if (beendet) {
    durchlaufzeitEnde = (runde && runde.durchlaufzeitEnde) || Date.now();
    if (runde) {
      runde.durchlaufzeitEnde = durchlaufzeitEnde;
      runde.bearbeitungszeitEnde = runde.bearbeitungszeitEnde || durchlaufzeitEnde;
      runde.phase = 'beendet';
      setzeRunde(code, rundenNummer, runde);
    }
  }

  // Bewusst konservativ: ob bereits eine Folgerunde existiert, wird in der
  // echten Anwendung ausschliesslich über die tatsächliche Firestore-Unter-
  // Sammlung spiele/{code}/runden/{n+1} ermittelt (siehe firestore.rules /
  // rundenwechsel.js sowie die dazugehörigen Sicherheitsregel-Tests). Dieses
  // reine Logik-Modul trifft dazu bewusst KEINE Aussage über einen geteilten
  // In-Memory-Zustand mit wechsleZurNaechstenRunde() – sonst würden völlig
  // unabhängige Testfälle in derselben Datei sich gegenseitig über
  // Zufallsreihenfolge/-Zustand beeinflussen. Die reale Prüfung "ohne aktive
  // Host-Aktion bleibt das Spielfeld im Endzustand stehen" ist über die
  // Firestore-Unter-Sammlung serverseitig eindeutig (existiert das
  // Runden-Dokument N+1 oder nicht).
  const naechsteRundeExistiert = false;

  return { beendet, durchlaufzeitEnde, naechsteRundeExistiert };
}

module.exports = { pruefeRundenEnde };
