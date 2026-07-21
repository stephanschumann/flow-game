/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Rundenende-Bedingung (AK 4, AK 15): Die Runde endet, sobald alle zwölf
 * Elemente Position 6 ("fertig bei Spieler 5") erreicht haben – unabhängig
 * davon, ob die eingetragenen Städte inhaltlich korrekt sind (die
 * Qualitätsauswertung läuft vollständig NACH diesem Ereignis, siehe
 * `qualitaetsauswertung.js`, und kann das Rundenende nicht beeinflussen,
 * Pre-Mortem-Risiko 5).
 *
 * Analog zu `src/game/rundenEnde.js` aus FEATURE-002 (dort: sechs Karten auf
 * Position 6), hier: zwölf Elemente auf Position 6.
 */

const ZIEL_POSITION = 6;
const ANZAHL_ELEMENTE = 12;

async function pruefeRundenEndeRundeVier({ elementePositionen } = {}) {
  const beendet = Array.isArray(elementePositionen)
    && elementePositionen.length === ANZAHL_ELEMENTE
    && elementePositionen.every((position) => position === ZIEL_POSITION);

  const durchlaufzeitEnde = beendet ? Date.now() : null;

  return { beendet, durchlaufzeitEnde };
}

module.exports = { pruefeRundenEndeRundeVier };
