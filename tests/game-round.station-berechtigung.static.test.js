/**
 * BUGFIX-008 – Station kann Karten anderer Stationen bewegen
 * BDD-Tests (flow-game-bdd, 2026-07-23) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-008"), Akzeptanzkriterien 1, 2, 3 und 4 –
 * konkret der Client-seitige "Fundstelle 2"-Teil der Ursache
 * (`darfIchDieseKarteBewegen()` in `public/spiel.html`, Zeile ~1212-1221).
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – sie
 * liest den echten, existierenden Quelltext von public/spiel.html und prüft
 * per Mustersuche (gleiches Vorgehen wie tests/game-a11y-static.test.js und
 * tests/game-form-loading-state.static.test.js), ob die Zuständigkeitsprüfung
 * in darfIchDieseKarteBewegen() bereits korrekt auf die abgebende Station
 * begrenzt ist (mit dem einzigen, ausdrücklich gewollten Sonderfall
 * Auftragseingang → Station 1). Bewusst grob (Textmuster, kein DOM/jsdom im
 * Projekt vorhanden, siehe package.json), reicht aber aus, um "heute noch
 * fehlerhaft" von "korrigiert" zu unterscheiden – exakt dasselbe Vorgehen wie
 * bei der Server-Regel in tests/game-round.security.rules.test.js, nur ohne
 * Emulator-Abhängigkeit.
 *
 * WICHTIG – bewusst RED: Die Prüfungen unten schlagen JETZT tatsächlich fehl
 * (echte Assertion-Fehlschläge, kein Modul-/Syntaxfehler), weil
 * public/spiel.html laut Analyse-Spec heute in darfIchDieseKarteBewegen()
 * (Zeile 1216) nachweislich noch die ungebundene Formel
 * `eigeneStationsNummer === vonPosition || eigeneStationsNummer === nachPosition`
 * verwendet – das erlaubt fälschlich auch der EMPFANGENDEN Station jeden
 * Übergang, nicht nur den Auftragseingang-Sonderfall (vonPosition == 0).
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden – deshalb
 * bewusst Textmuster-Prüfung statt echtem Aufruf der Funktion).
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

// Die heute bestehende, fehlerhafte Formel (Zeile 1216 zum Zeitpunkt des
// Schreibens dieses Tests) – erlaubt jede Station, deren Nummer entweder der
// abgebenden ODER der empfangenden Position entspricht, ohne Rücksicht
// darauf, ob es sich um den Auftragseingang-Sonderfall handelt.
const UNGEBUNDENE_FORMEL_MUSTER = /eigeneStationsNummer\s*===\s*vonPosition\s*\|\|\s*eigeneStationsNummer\s*===\s*nachPosition/;

// Die künftig geforderte Begrenzung: die empfangende Station darf nur dann
// als zuständig gelten, wenn der Übergang vom Auftragseingang (Position 0)
// kommt – in beiden möglichen Reihenfolgen der Bedingung toleriert, weil
// dieser Test das beobachtbare "was", nicht das exakte "wie" prüfen soll.
const AUFTRAGSEINGANG_GATE_MUSTER = new RegExp(
  '(vonPosition\\s*===\\s*0\\s*&&\\s*eigeneStationsNummer\\s*===\\s*nachPosition)'
  + '|(eigeneStationsNummer\\s*===\\s*nachPosition\\s*&&\\s*vonPosition\\s*===\\s*0)'
);

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss weiterhin existieren
  const ende = spielHtmlInhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function darfIchDieseKarteBewegenKoerper() {
  return schneide(
    'function darfIchDieseKarteBewegen(rundenNummer, vonPosition, karte) {',
    'function renderBrett(db, code) {'
  );
}

describe('Szenario: Karte einer vorgelagerten Station ist für die nachfolgende (empfangende) Station nicht bewegbar/anklickbar (AK2, AK3 – direkter Regressionstest gegen den real gemeldeten Bug)', () => {
  test('Gegeben die Zuständigkeitsprüfung in darfIchDieseKarteBewegen(), wenn der Funktionskörper auf die heute bestehende, ungebundene "abgebend ODER empfangend"-Formel geprüft wird, dann taucht diese Formel NICHT mehr unverändert auf', () => {
    const koerper = darfIchDieseKarteBewegenKoerper();
    expect(UNGEBUNDENE_FORMEL_MUSTER.test(koerper)).toBe(false);
  });
});

describe('Szenario: Der Auftragseingang-Sonderfall bleibt ausdrücklich erhalten (AK4)', () => {
  test('Gegeben derselbe Funktionskörper, wenn er auf eine gezielte Begrenzung der "empfangende Station ist auch zuständig"-Ausnahme auf den Übergang vom Auftragseingang (vonPosition === 0) geprüft wird, dann findet sich dort ein Ausdruck, der die nachPosition-Zuständigkeit ausdrücklich an vonPosition === 0 koppelt', () => {
    const koerper = darfIchDieseKarteBewegenKoerper();
    expect(AUFTRAGSEINGANG_GATE_MUSTER.test(koerper)).toBe(true);
  });
});

describe('Szenario: Eigene, abgebende Station bleibt für jeden Übergang uneingeschränkt zuständig (AK1, AK5 – Regressionsschutz, muss unverändert grün bleiben)', () => {
  test('Gegeben derselbe Funktionskörper, wenn er auf die Zuständigkeit der abgebenden Station geprüft wird, dann bleibt "eigeneStationsNummer === vonPosition" weiterhin ungebunden (ohne zusätzliche Bedingung) Teil der Prüfung – die abgebende Station darf immer, für jeden Übergang und unabhängig von der Rundennummer, ihre eigene Karte weiterreichen', () => {
    const koerper = darfIchDieseKarteBewegenKoerper();
    expect(koerper).toMatch(/eigeneStationsNummer\s*===\s*vonPosition/);
  });

  test('Gegeben darfIchDieseKarteBewegen() wird für alle Runden mit Fließband-Prinzip (1-3) über denselben renderBrett()-Pfad aufgerufen, wenn der Funktionskörper auf eine rundenspezifische Sonderbehandlung der Zuständigkeitsprüfung geprüft wird, dann verzweigt die istZustaendig-Berechnung nicht nach rundenNummer (die Korrektur gilt gleichermaßen für jeden Übergang in jeder der drei Runden, nicht nur für einen einzelnen Testfall)', () => {
    const koerper = darfIchDieseKarteBewegenKoerper();
    const indexIstZustaendig = koerper.indexOf('istZustaendig');
    expect(indexIstZustaendig).toBeGreaterThan(-1);
    const vorIstZustaendig = koerper.slice(0, indexIstZustaendig);
    expect(vorIstZustaendig).not.toMatch(/rundenNummer\s*===\s*\d/);
  });
});
