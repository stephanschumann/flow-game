/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Kettenfortschritt (AK 7) + Wechselzwang (AK 9) als Node-seitige Referenz-
 * Logik, analog zu `src/game/kartenBewegung.js` aus FEATURE-002.
 *
 * WICHTIG: Die primäre, sicherheitsrelevante Durchsetzung – inklusive der
 * FIFO-Reihenfolge (AK 8), die dieses reine Referenzmodul bewusst NICHT
 * nachbildet (siehe Testplan: "primäre Durchsetzung siehe Sicherheitsregeln")
 * – sitzt in `firestore.rules` und wird dort real gegen echte, geseedete
 * Firestore-Dokumente geprüft (`tests/game-round4.security.rules.test.js`).
 * FIFO hängt vom tatsächlichen Ankunftszeitpunkt mehrerer GLEICHZEITIG
 * wartender Geschwister-Elemente ab – ein Zustand, den dieses zustandsarme
 * Referenzmodul (ein Aufruf = eine Bewegung eines einzelnen Elements) nicht
 * sinnvoll isoliert abbilden kann, ohne den vollständigen Firestore-Zustand
 * nachzubauen.
 */

const { holeRundeVier, setzeRundeVier } = require('./_rundeVierStatus');

async function bewegeElement({
  code,
  rundenNummer,
  elementId,
  typ,
  vonPosition,
  nachPosition,
  ausgefuehrtVon,
  stadt,
  letzterAbgeschlossenerTypDerPerson,
}) {
  if (typeof vonPosition !== 'number' || typeof nachPosition !== 'number') {
    const fehler = new Error('vonPosition und nachPosition sind erforderlich.');
    fehler.code = 'POSITION_FEHLT';
    throw fehler;
  }
  if (nachPosition !== vonPosition + 1) {
    const fehler = new Error('Nur ein Schritt vorwärts erlaubt – eine Person kann nicht übersprungen werden.');
    fehler.code = 'NUR_EIN_SCHRITT';
    throw fehler;
  }
  if (nachPosition > 6) {
    const fehler = new Error('Position 6 ("fertig bei Spieler 5") ist die letzte gültige Position.');
    fehler.code = 'POSITION_MAX';
    throw fehler;
  }
  if (letzterAbgeschlossenerTypDerPerson != null && letzterAbgeschlossenerTypDerPerson === typ) {
    const fehler = new Error(
      `Wechselzwang: ${ausgefuehrtVon} hat zuletzt bereits ein Element vom Typ "${typ}" abgeschlossen `
      + 'und muss jetzt zwischen den Typen wechseln.'
    );
    fehler.code = 'WECHSELZWANG';
    throw fehler;
  }

  let runde = holeRundeVier(code, rundenNummer);
  if (!runde) {
    runde = {
      rundenNummer,
      beitrittsCode: code,
      bearbeitungszeitStart: null,
    };
  }

  // Bearbeitungszeit startet mit dem ersten tatsächlich erfolgreichen
  // Element-Schritt der Runde – unabhängig davon, ob es ein Würfel-Erfolg
  // oder ein Stadt-Eintrag war (AK 3, Wiederverwendung des Grundmusters aus
  // FEATURE-002).
  if (runde.bearbeitungszeitStart == null) {
    runde.bearbeitungszeitStart = Date.now();
  }

  setzeRundeVier(code, rundenNummer, runde);

  return {
    elementId,
    typ,
    position: nachPosition,
    stadt,
    ausgefuehrtVon,
    bearbeitungszeitStart: runde.bearbeitungszeitStart,
  };
}

module.exports = { bewegeElement };
