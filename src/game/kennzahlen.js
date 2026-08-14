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
 *
 * FEATURE-008 – neue Kennzahl "Fehlversuche" (finale Klärung Frage 8,
 * Backlog.md FEATURE-008): proStation[station].fehlversuche, analog zu
 * anzahlBewegungen aus einem eigenen, gleich aufgebauten Eingabe-Array
 * (fehlversuche: [{station, anzahl}]) berechnet ("0 Fehlversuche" ohne
 * Sonderbehandlung, dieselbe Konvention). WICHTIG - bewusste Asymmetrie zur
 * Browser-Produktivfassung (public/js/game/kennzahlen.js), dokumentiert nach
 * demselben, bereits etablierten Muster wie bei bewegungen/bewegungsLog
 * weiter oben bzw. bei kartenBewegung.js (siehe dortiger Kopfkommentar):
 * Die Browser-Fassung schreibt/liest `fehlversuche` als FLACHEN, globalen
 * Zähler direkt auf dem Runden-Dokument (siehe
 * public/js/game/fehlversuch.js, firestore.rules "Fall C") - sie berechnet
 * diese Kennzahl NICHT über diese Funktion, weil ein abgelehnter
 * Bewegungsversuch (anders als eine echte Kartenbewegung) nie eine
 * Firestore-Änderung erzeugt, die sich wie bewegungsLog live aus
 * docChanges() mitschneiden ließe (AK14, real code-geprüft in der Analyse-
 * Spec). Diese Node-Referenz bildet die reine Rechenregel isoliert nach
 * (siehe tests/game-drag-drop.logic.test.js), genau wie bewegeKarte() in
 * src/game/kartenBewegung.js die fachliche Regel isoliert nachbildet, ohne
 * dass der Browser denselben Code tatsächlich aufruft.
 */

const { holeRunde } = require('./_rundenStatus');

async function berechneKennzahlen(eingabe = {}) {
  const {
    bewegungen, stationen, lieferungen, rundenStart, code, rundenNummer, nurKartenZustand,
    durchlaufzeitStart, durchlaufzeitEnde, bearbeitungszeitStart, bearbeitungszeitEnde,
    fehlversuche,
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
      const fehlversuchEintrag = Array.isArray(fehlversuche)
        ? fehlversuche.find((f) => f.station === station)
        : undefined;
      proStation[station] = {
        anzahlBewegungen: eintrag ? eintrag.anzahl : 0,
        beteiligungsspanne: eintrag ? (eintrag.letzteBewegungAm - eintrag.ersteBewegungAm) : 0,
        fehlversuche: fehlversuchEintrag ? fehlversuchEintrag.anzahl : 0,
        // FEATURE-010: Wartezeit vor/nach der eigenen aktiven Bearbeitung,
        // additiv aus den bereits vorhandenen ersteBewegungAm/letzteBewegungAm
        // relativ zu bearbeitungszeitStart/-Ende gebildet - kein neu
        // gemessener Wert. Station ohne jede Bewegung in der Runde (kein
        // eintrag) oder ohne bekannten Bearbeitungszeit-Rahmen: beide Felder
        // explizit 0 (Stephans Entscheidung, Variante c, AK9) statt "—"
        // oder der vollen Rundenzeit.
        wartezeitVorher: (eintrag && typeof bearbeitungszeitStart === 'number')
          ? (eintrag.ersteBewegungAm - bearbeitungszeitStart) : 0,
        wartezeitNachher: (eintrag && typeof bearbeitungszeitEnde === 'number')
          ? (bearbeitungszeitEnde - eintrag.letzteBewegungAm) : 0,
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
