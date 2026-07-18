/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Kennzahlenberechnung: Bewegungen je Station ("0 Bewegungen" ohne
 * Sonderbehandlung, wenn eine Station nichts bewegt hat), Zeit bis
 * erster/letzter Lieferung und deren Abstand.
 */

const { holeRunde } = require('./_rundenStatus');

async function berechneKennzahlen(eingabe = {}) {
  const {
    bewegungen, stationen, lieferungen, rundenStart, code, rundenNummer, nurKartenZustand,
  } = eingabe;

  if (nurKartenZustand) {
    const runde = holeRunde(code, rundenNummer) || { karten: {} };
    const karten = {};
    Object.entries(runde.karten || {}).forEach(([kartenId, karte]) => {
      karten[kartenId] = { position: karte.position };
    });
    return { karten };
  }

  const ergebnis = {};

  if (Array.isArray(stationen)) {
    const proStation = {};
    stationen.forEach((station) => {
      const eintrag = Array.isArray(bewegungen)
        ? bewegungen.find((b) => b.station === station)
        : undefined;
      proStation[station] = { anzahlBewegungen: eintrag ? eintrag.anzahl : 0 };
    });
    ergebnis.proStation = proStation;
  }

  if (Array.isArray(lieferungen) && lieferungen.length > 0) {
    const zeiten = lieferungen.map((l) => l.angekommenAm);
    const start = typeof rundenStart === 'number' ? rundenStart : 0;
    const erste = Math.min(...zeiten);
    const letzte = Math.max(...zeiten);
    ergebnis.zeitBisErsterLieferung = erste - start;
    ergebnis.zeitBisLetzterLieferung = letzte - start;
    ergebnis.abstandErsteLetzteLieferung = letzte - erste;
  }

  return ergebnis;
}

module.exports = { berechneKennzahlen };
