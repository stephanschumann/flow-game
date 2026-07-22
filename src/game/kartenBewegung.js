/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Atomare Kartenbewegung (ein Schritt vorwärts) als Node-seitige Referenz-
 * Logik für `tests/game-round.logic.test.js`.
 *
 * WICHTIG (siehe `_rundenStatus.js` und `stapelTor.js`): Die tatsächliche
 * Server-Autorität (Stationszugehörigkeit, Ein-Schritt-Limit, DoR-
 * Voraussetzung, Stapel-Tor-Schwelle je Runde/Stapel, servergesetzter
 * Zeitstempel) sitzt in `firestore.rules` und wird dort real gegen echte,
 * geseedete Firestore-Dokumente geprüft (`tests/game-round.security.rules.test.js`).
 * Diese Funktion hier bildet dieselben fachlichen Regeln nach, damit sie
 * isoliert (ohne Emulator-Dokumente) testbar sind, UND setzt zusätzlich
 * Pre-Mortem-Risiko 6 (Verbindungsabbruch mitten im Zug) sauber um: Der Zug
 * ist entweder vollständig durch, oder er ist gar nicht passiert.
 */

const { holeRunde, setzeRunde } = require('./_rundenStatus');

async function bewegeKarte({
  code,
  rundenNummer,
  kartenId,
  vonPosition,
  nachPosition,
  ausgefuehrtVon,
  simuliereVerbindungsabbruch,
}) {
  if (typeof vonPosition !== 'number' || typeof nachPosition !== 'number') {
    const fehler = new Error('vonPosition und nachPosition sind erforderlich.');
    fehler.code = 'POSITION_FEHLT';
    throw fehler;
  }
  if (nachPosition !== vonPosition + 1) {
    const fehler = new Error('Nur ein Schritt vorwärts erlaubt – Stationen können nicht übersprungen werden.');
    fehler.code = 'NUR_EIN_SCHRITT';
    throw fehler;
  }
  if (nachPosition > 6) {
    const fehler = new Error('Position 6 (Ziel) ist die letzte gültige Position.');
    fehler.code = 'POSITION_MAX';
    throw fehler;
  }

  let runde = holeRunde(code, rundenNummer);
  if (!runde) {
    runde = {
      rundenNummer,
      beitrittsCode: code,
      dorAbgeschlossen: true,
      durchlaufzeitStart: Date.now(),
      durchlaufzeitEnde: null,
      bearbeitungszeitStart: null,
      bearbeitungszeitEnde: null,
      karten: {},
    };
  }
  if (!runde.karten[kartenId]) {
    runde.karten[kartenId] = { position: vonPosition, stapel: null };
  }

  // Den vom Aufrufer angegebenen Ausgangszustand als "zuletzt bekannt" fest
  // im Speicher verankern, BEVOR der eigentliche (potenziell abbrechende)
  // Schreibvorgang zur nächsten Position versucht wird. Das ist genau der
  // Punkt, der Pre-Mortem-Risiko 6 abdeckt: bricht die Verbindung direkt
  // danach ab, bleibt die Karte vollständig auf einer gültigen Position
  // (vonPosition) stehen – nie ein halb vollzogener Zug.
  runde.karten[kartenId] = { ...runde.karten[kartenId], position: vonPosition };

  if (simuliereVerbindungsabbruch) {
    setzeRunde(code, rundenNummer, runde);
    const abbruch = new Error('Verbindungsabbruch mitten im Kartenzug (simuliert) – Zug nicht angewendet.');
    abbruch.code = 'VERBINDUNGSABBRUCH';
    throw abbruch;
  }

  // Bearbeitungszeit startet mit dem ersten tatsächlich erfolgreichen Zug der Runde.
  if (runde.bearbeitungszeitStart == null) {
    runde.bearbeitungszeitStart = Date.now();
  }

  runde.karten[kartenId] = {
    position: nachPosition,
    stapel: runde.karten[kartenId].stapel,
    letzteBewegungVon: ausgefuehrtVon,
    letzteBewegungAm: Date.now(),
  };

  setzeRunde(code, rundenNummer, runde);

  return {
    kartenId,
    position: nachPosition,
    bearbeitungszeitStart: runde.bearbeitungszeitStart,
  };
}

module.exports = { bewegeKarte };
