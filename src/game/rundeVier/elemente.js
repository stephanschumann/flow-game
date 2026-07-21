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
 */

const { LAENDER_LISTE } = require('./laenderStaedte');

function zufaelligesLand() {
  const index = Math.floor(Math.random() * LAENDER_LISTE.length);
  return LAENDER_LISTE[index];
}

async function erzeugeElemente({ code } = {}) {
  if (!code) {
    throw new Error('code ist erforderlich.');
  }

  const elemente = [];
  let reihenfolge = 1;

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
      land: zufaelligesLand(),
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
