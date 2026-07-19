/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Kennzahlenberechnung: Bewegungen je Station ("0 Bewegungen" ohne
 * Sonderbehandlung, wenn eine Station nichts bewegt hat), Zeit bis
 * erster/letzter Lieferung und deren Abstand.
 *
 * FEATURE-003 – Phase 3: Auswertung. Erweitert um:
 *   - durchlaufzeit / bearbeitungszeit: reine Differenz aus den bereits
 *     servergesetzten *Start/*Ende-Zeitstempeln (FEATURE-002) – hier wird
 *     NICHTS neu gemessen, nur die Differenz gebildet (Akzeptanzkriterium
 *     "beruht ausschliesslich auf bereits serverseitig gemessenen Werten").
 *   - proStation[station].beteiligungsspanne: Differenz aus erster und
 *     letzter Bewegung je Station, 0 wenn die Station keine Bewegung hatte
 *     (gleiche "0 Bewegungen ohne Sonderbehandlung"-Regel wie anzahlBewegungen).
 *   Siehe tests/game-evaluation.logic.test.js für die exakten Erwartungen an
 *   Feldnamen und Werte.
 */

const { holeRunde } = require('./_rundenStatus');

async function berechneKennzahlen(eingabe = {}) {
  const {
    bewegungen, stationen, lieferungen, rundenStart, code, rundenNummer, nurKartenZustand,
    durchlaufzeitStart, durchlaufzeitEnde, bearbeitungszeitStart, bearbeitungszeitEnde,
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

  if (typeof durchlaufzeitStart === 'number' && typeof durchlaufzeitEnde === 'number') {
    ergebnis.durchlaufzeit = durchlaufzeitEnde - durchlaufzeitStart;
  }

  if (typeof bearbeitungszeitStart === 'number' && typeof bearbeitungszeitEnde === 'number') {
    ergebnis.bearbeitungszeit = bearbeitungszeitEnde - bearbeitungszeitStart;
  }

  if (Array.isArray(stationen)) {
    const proStation = {};
    stationen.forEach((station) => {
      const eintrag = Array.isArray(bewegungen)
        ? bewegungen.find((b) => b.station === station)
        : undefined;
      proStation[station] = {
        anzahlBewegungen: eintrag ? eintrag.anzahl : 0,
        beteiligungsspanne: eintrag ? (eintrag.letzteBewegungAm - eintrag.ersteBewegungAm) : 0,
      };
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
