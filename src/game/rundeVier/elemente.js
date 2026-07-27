/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Rundenstart: Erzeugt die zwölf Arbeitselemente (sechs Würfel, sechs
 * Länderkarten) in fester, strikt alternierender Startreihenfolge (geklärte
 * Frage 7): Würfel 1, Karte 1, Würfel 2, Karte 2, ..., Würfel 6, Karte 6.
 * Alle Elemente starten bei Spieler-Position 1 (AK 6) – kein Stapel-Tor, alle
 * zwölf stehen von Anfang an vollständig bereit (Unterschied zu Runde 1/2).
 *
 * Node-seitige Referenzlogik für `tests/game-round4.logic.test.js`; die
 * tatsächliche Erzeugung der zugehörigen Firestore-Dokumente (und deren
 * Absicherung) passiert über den Host-Client + `firestore.rules`
 * (`allow create` unter `spiele/{spielId}/runden/{runde}/elemente/{elementId}`).
 *
 * BUGFIX-009 (2026-07-27, Spec von Stephan freigegeben): Die Länderziehung
 * für die sechs Länderkarten erfolgt seit diesem Ticket OHNE Zurücklegen
 * (Fisher-Yates-Shuffle der 8-Länder-Liste, erste sechs Elemente verwenden) –
 * vorher zog jede der sechs Karten unabhängig UND MIT Zurücklegen aus der
 * 8-Länder-Liste (ca. 92 % Dubletten-Wahrscheinlichkeit pro Rundenstart).
 * WICHTIG: `public/js/game/rundeVier.js` (Browser-Produktivcode) muss laut
 * Datei-Kopfkommentar dort inhaltlich synchron gehalten werden – dieselbe
 * Shuffle-Implementierung ist dort in `starteRundeVier()` identisch
 * eingebaut.
 */

const { LAENDER_LISTE } = require('./laenderStaedte');

// Fisher-Yates-Shuffle: liefert eine zufällige Permutation der übergebenen
// Liste, OHNE die Originalliste zu verändern. Ziehung ohne Zurücklegen für
// die sechs Länderkarten entsteht dadurch, dass die ersten sechs Elemente
// der geshuffelten Liste verwendet werden (garantiert paarweise verschieden,
// da eine Permutation nie ein Element mehrfach enthält).
function fisherYatesShuffle(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = kopie[i];
    kopie[i] = kopie[j];
    kopie[j] = temp;
  }
  return kopie;
}

async function erzeugeElemente({ code } = {}) {
  if (!code) {
    throw new Error('code ist erforderlich.');
  }

  const elemente = [];
  let reihenfolge = 1;

  // Einmal pro Rundenstart: die acht Länder mischen und die ersten sechs
  // den sechs Länderkarten zuweisen (Ziehung ohne Zurücklegen, BUGFIX-009).
  const gezogeneLaender = fisherYatesShuffle(LAENDER_LISTE).slice(0, 6);

  for (let i = 1; i <= 6; i += 1) {
    elemente.push({
      elementId: `wuerfel-${i}`,
      typ: 'wuerfel',
      reihenfolge,
      position: 1,
      wurfAnzahl: 0,
      letzterWurf: null,
    });
    reihenfolge += 1;

    elemente.push({
      elementId: `karte-${i}`,
      typ: 'laenderkarte',
      reihenfolge,
      position: 1,
      land: gezogeneLaender[i - 1],
      // staedte startet hier als LEERES ARRAY – bewusst nur diese Node-seitige
      // Referenzform (siehe tests/game-round4.logic.test.js, "startet ohne
      // Städte-Einträge"). Das tatsächliche Firestore-Dokument speichert
      // staedte dagegen als MAP ({} statt []), siehe firestore.rules-Kommentar
      // bei rundeVierStaedteAngehaengt(): Firestore lehnt serverTimestamp()
      // innerhalb von Arrays ab, weshalb der spätere Host-Client (noch nicht
      // Teil dieser Codebasis) beim Anlegen der echten Dokumente hier auf
      // `{}` statt `[]` umstellen muss – reine Formkonvertierung, inhaltlich
      // "leer" in beiden Fällen.
      staedte: [],
    });
    reihenfolge += 1;
  }

  return elemente;
}

module.exports = { erzeugeElemente };
