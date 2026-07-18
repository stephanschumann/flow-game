/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Interner Zwischenspeicher für die Node-seitigen Spiellogik-Module
 * (rundenStart.js / kartenBewegung.js), NICHT für die eigentliche
 * Server-Autorität zuständig.
 *
 * WICHTIG (Architekturhinweis, damit das nicht mit der echten Server-Autorität
 * verwechselt wird): Die tatsächliche, sicherheitsrelevante Durchsetzung aller
 * Zugregeln (Ein-Schritt-Limit, Stapel-Tor, DoR-Voraussetzung, Stationszugehörigkeit,
 * servergesetzte Zeitstempel) passiert AUSSCHLIESSLICH in `firestore.rules` gegen
 * echte Firestore-Dokumente – siehe `tests/game-round.security.rules.test.js`
 * (läuft mit echten, seedbaren Dokumenten gegen den Firestore-Emulator).
 *
 * `tests/game-round.logic.test.js` (die Datei, die diese Module hier aufruft)
 * übergibt den Funktionen bewusst KEINE Firestore-Instanz (anders als die
 * FEATURE-001-Module in diesem Ordner, die `db` als zweiten Parameter
 * bekommen) – dieses Modul bildet deshalb einen leichten, rein
 * prozessinternen Speicher nach, der die in den Given/When/Then-Testfällen
 * beschriebene Reihenfolge (starteRunde -> loeseDefinitionOfReadyAus ->
 * bewegeKarte) korrekt abbildet. Es ist bewusst NICHT die Quelle der
 * Wahrheit für die eigentliche Spielsicherheit.
 */

const speicher = new Map();

function schluessel(code, rundenNummer) {
  return `${code}:${rundenNummer}`;
}

function setzeRunde(code, rundenNummer, daten) {
  speicher.set(schluessel(code, rundenNummer), daten);
  return speicher.get(schluessel(code, rundenNummer));
}

function holeRunde(code, rundenNummer) {
  return speicher.get(schluessel(code, rundenNummer)) || null;
}

module.exports = { setzeRunde, holeRunde };
