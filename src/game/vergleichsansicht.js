/**
 * FEATURE-003 – Phase 3: Auswertung
 * Vergleichsansicht über die gespielten Runden.
 *
 * Iteriert bewusst als sortierte LISTE über die runden-Unterkollektion,
 * nicht über drei fest benannte Einzelfelder (Entscheidung 4 / Pre-Mortem-
 * Risiko 4 der FEATURE-003-Spec) – dadurch lässt sich eine vierte,
 * spätere Runde (FEATURE-004, inklusive eines zusätzlichen fehlerzahl-
 * Feldes) ergänzen, ohne die bestehende Struktur für Runde 1–3 umzubauen.
 *
 * Übernimmt die übergebenen, bereits serverseitig berechneten Kennzahlen
 * unverändert (keine clientseitige Neuberechnung, siehe
 * tests/game-evaluation.logic.test.js).
 */

async function erstelleVergleichsansicht({ runden } = {}) {
  const liste = Array.isArray(runden) ? runden.slice() : [];
  liste.sort((a, b) => a.rundenNummer - b.rundenNummer);
  return liste;
}

module.exports = { erstelleVergleichsansicht };
