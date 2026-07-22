/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Rundenwechsel: ausschliesslich vom Host aktiv ausgelöst (Entscheidung
 * 2026-07-18). Setzt alle Kartenpositionen zurück und startet die nächste
 * Runde; derselbe Beitritts-Code bleibt für alle Runden gültig.
 *
 * Bewusst als reine, zustandslose Funktion umgesetzt (kein Schreiben in den
 * gemeinsamen In-Memory-Speicher aus `_rundenStatus.js`): die tatsächliche
 * Persistenz des Rundenwechsels ist Aufgabe der echten Firestore-Schreibung
 * (spiele/{code}/runden/{n+1} anlegen + sechs Karten auf Position 0 setzen),
 * die serverautoritativ NUR dem Host erlaubt ist – siehe firestore.rules
 * und `tests/game-round.security.rules.test.js` ("Rundenwechsel-Auslösung
 * durch den Host wird angenommen" / "... durch eine Nicht-Host-Person wird
 * abgelehnt").
 */

function leereKarten() {
  const karten = [];
  for (let i = 1; i <= 6; i += 1) {
    karten.push({ kartenId: `karte-${i}`, position: 0 });
  }
  return karten;
}

async function wechsleZurNaechstenRunde({ code, vonRunde, ausgeloestVon }) {
  if (typeof vonRunde !== 'number') {
    const fehler = new Error('vonRunde ist erforderlich.');
    fehler.code = 'VON_RUNDE_ERFORDERLICH';
    throw fehler;
  }
  return {
    rundenNummer: vonRunde + 1,
    beitrittsCode: code,
    phase: 'aufgabe_vorgestellt',
    dorAbgeschlossen: false,
    durchlaufzeitStart: Date.now(),
    durchlaufzeitEnde: null,
    bearbeitungszeitStart: null,
    karten: leereKarten(),
    ausgeloestVon,
  };
}

module.exports = { wechsleZurNaechstenRunde };
