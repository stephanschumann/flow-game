/**
 * FEATURE-006 – Mehrsprachigkeit (Deutsch/Englisch)
 * Spielweites Sprachfeld `sprache` auf spiele/{code} (Option A, rein
 * clientseitiges Übersetzungssystem, siehe Backlog.md FEATURE-006). Default
 * ist Englisch (AK 1). Die Sprache gilt für ALLE Rollen gemeinsam und wird
 * ausschliesslich vom Host gesetzt/geändert (AK 8/9) – auch während das
 * Spiel bereits läuft, ohne Spielfortschritt/Zeitmessung zu beeinflussen.
 *
 * Analog zu src/game/rundenwechsel.js/kartenBewegung.js: prüft NICHT die
 * Host-Berechtigung selbst (das ist Aufgabe von firestore.rules, siehe dort
 * "spracheAenderungErlaubt()"), sondern ausschliesslich die fachliche
 * Gültigkeit des Sprachwerts, bevor überhaupt geschrieben wird.
 *
 * WICHTIG: Diese Datei muss inhaltlich synchron gehalten werden mit der
 * Browser-Kopie public/js/game/sprache.js (Projekt-Konvention, kein Bundler
 * – siehe joinGame.js/hostSession.js-Kopfkommentare).
 */

const SPRACHEN = ['de', 'en'];
const STANDARD_SPRACHE = 'en';

async function setzeSpielSprache({ code, sprache }, db) {
  if (!code || typeof code !== 'string') {
    const fehler = new Error('Ungültiger oder unbekannter Code.');
    fehler.code = 'UNGUELTIGER_CODE';
    throw fehler;
  }
  if (!SPRACHEN.includes(sprache)) {
    const fehler = new Error(
      `Ungültiger Sprachwert: "${sprache}". Erlaubt sind ausschliesslich ${SPRACHEN.join('/')}.`
    );
    fehler.code = 'UNGUELTIGE_SPRACHE';
    throw fehler;
  }

  await db.collection('spiele').doc(code).update({ sprache });
  return { code, sprache };
}

module.exports = { SPRACHEN, STANDARD_SPRACHE, setzeSpielSprache };
