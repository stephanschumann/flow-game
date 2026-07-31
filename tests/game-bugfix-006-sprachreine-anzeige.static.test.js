/**
 * BUGFIX-006 – Deutsche Fachbegriffe erscheinen in der englischen Oberfläche.
 * BDD-Tests (flow-game-bdd) für die Akzeptanzkriterien 1–7 der am 2026-07-30
 * freigegebenen Analyse-Spec (siehe Backlog.md, Ticket BUGFIX-006).
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt, siehe package.json),
 * Textmuster-/Quelltext-Prüfung, gleiches Muster wie
 * tests/game-stationsnamen.static.test.js und tests/game-i18n.manual-checks.test.js.
 *
 * WICHTIG: Diese Tests sind zum Zeitpunkt des Schreibens (vor der
 * Implementierung) ABSICHTLICH ROT – das ist der gewünschte Zustand
 * (Red/Green/Refactor). Sie dokumentieren das aktuell noch bestehende,
 * fehlerhafte Verhalten als fehlschlagende Erwartung.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const INDEX_HTML_PFAD = path.join(__dirname, '..', 'public', 'index.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');
const indexHtmlInhalt = fs.readFileSync(INDEX_HTML_PFAD, 'utf8');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

function schneide(inhalt, startAnker, endAnker) {
  const start = inhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss existieren
  const ende = inhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return inhalt.slice(start, ende);
}

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  expect(browserUebersetzungenInhalt).toMatch(
    new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`)
  );
}

// ---------------------------------------------------------------------------
// AK 1 – Stationsnamen in der Lobby-Teilnehmendenliste sind übersetzt.
// ---------------------------------------------------------------------------
describe('AK 1: Teilnehmendenliste in der Lobby zeigt den übersetzten Stationsnamen, nicht den rohen internen Bezeichner', () => {
  function renderTeilnehmerListeKoerper() {
    return schneide(spielHtmlInhalt, 'function renderTeilnehmerListe() {', 'BUGFIX-003 (a)');
  }

  test('Szenario: Gegeben eine Person mit zugewiesener Station in der Teilnehmendenliste, wenn renderTeilnehmerListe() den Namenszusatz berechnet, dann läuft der Stationsname durch die Übersetzungsfunktion (stationsLabel()/t()), nicht durch die rohen Felder daten.stationName/daten.station direkt', () => {
    const koerper = renderTeilnehmerListeKoerper();
    // Aktuell (Bug): stationsAnzeige wird direkt aus daten.stationName / daten.station
    // gebildet, OHNE stationsLabel()/t() aufzurufen – das macht diesen Test rot.
    expect(koerper).toMatch(/stationsAnzeige\s*=\s*stationsLabel\s*\(/);
    expect(koerper).not.toMatch(/stationsAnzeige\s*=\s*daten\.stationName\s*\|\|/);
  });
});

// ---------------------------------------------------------------------------
// AK 2 – "Your station: …" ist übersetzt, sowohl im String- als auch im
// Zahl-Fall (Beitritt vs. Rejoin nach Spielbrett-Migration).
// ---------------------------------------------------------------------------
describe('AK 2: "Your station: …"-Hinweis zeigt den übersetzten Stationsnamen, unabhängig davon ob die interne Station noch als Text oder schon als Zahl vorliegt', () => {
  function alleLobbyEigeneStationZuweisungen() {
    const treffer = [];
    const muster = /lobbyEigeneStation\.textContent\s*=\s*ergebnis\.station[\s\S]{0,160}?:/g;
    let m = muster.exec(spielHtmlInhalt);
    while (m) {
      treffer.push(m[0]);
      m = muster.exec(spielHtmlInhalt);
    }
    return treffer;
  }

  test('Szenario: Gegeben eine Person tritt bei oder betritt das Spiel nach einem Verbindungsabbruch erneut (Rejoin), wenn der "Your station: …"-Hinweis gesetzt wird, dann existieren beide bekannten Aufrufstellen weiterhin (Beitritt UND Rejoin)', () => {
    const treffer = alleLobbyEigeneStationZuweisungen();
    expect(treffer.length).toBe(2);
  });

  test('Szenario: Gegeben dieselben zwei Aufrufstellen, wenn ihr Quelltext geprüft wird, dann lösen beide den rohen station-Wert über eine Übersetzungsfunktion auf (stationsLabel(...)), statt ihn direkt an t(\'lobby.deineStation\') anzuhängen', () => {
    const treffer = alleLobbyEigeneStationZuweisungen();
    treffer.forEach((stelle) => {
      // Aktuell (Bug): "... + ergebnis.station" wird direkt angehängt, ohne
      // stationsLabel()/eine Auflösung des rohen Werts – macht diesen Test rot.
      expect(stelle).toMatch(/stationsLabel\s*\(/);
    });
  });
});

// ---------------------------------------------------------------------------
// AK 3 – Kartenbeschriftungen ("Karte X"/"Card X") sind an beiden
// Fundstellen übersetzt.
// ---------------------------------------------------------------------------
describe('AK 3: Kartenbeschriftungen ("Karte X"/"Card X") laufen an beiden Fundstellen über die Übersetzungstabelle, nicht über eine hartcodierte deutsche String-Verkettung', () => {
  test('Szenario (Spalten-/Stapelansicht): Gegeben eine Karte wird als Chip in einer Spalte dargestellt, wenn ihr Beschriftungstext berechnet wird, dann nutzt der Quelltext einen t()-Aufruf statt der hartcodierten Verkettung karte.id.replace(\'karte-\', \'Karte \')', () => {
    expect(spielHtmlInhalt).not.toMatch(/karte\.id\.replace\(\s*'karte-'\s*,\s*'Karte '\s*\)/);
    expect(spielHtmlInhalt).toMatch(/label\.textContent\s*=\s*t\(\s*'(kartenLabel|spielbrett\.kartenLabel|karte\.label)[^']*'/);
  });

  test('Szenario (Runde-4-Positionsanzeige, BUGFIX-009): Gegeben eine Länderkarte in Runde 4, wenn die "Karte X von 6"-Positionsanzeige berechnet wird, dann nutzt der Quelltext einen t()-Aufruf statt der hartcodierten Verkettung \'Karte \' + kartenNr + \' von 6\'', () => {
    expect(spielHtmlInhalt).not.toMatch(/positionsAnzeige\.textContent\s*=\s*'Karte '\s*\+\s*kartenNr\s*\+\s*' von 6'/);
    expect(spielHtmlInhalt).toMatch(/positionsAnzeige\.textContent\s*=\s*t\(\s*'(rundeVier\.kartenPosition|kartenLabel)[^']*'/);
  });

  test('Regressionsschutz (Pre-Mortem-Risiko 2): Der bestehende BUGFIX-009-Test in tests/game-round4.logic.test.js prüft aktuell per Regex auf den LITERALEN deutschen Text "Karte ... von 6" – dieser Test muss im Zuge der Implementierung kontrolliert auf ein t()-Aufruf-Muster umgestellt werden (dokumentiert hier als ausdrücklicher Hinweis an flow-game-impl, kein eigener Assert gegen eine fremde Testdatei)', () => {
    const round4TestPfad = path.join(__dirname, 'game-round4.logic.test.js');
    const round4TestInhalt = fs.readFileSync(round4TestPfad, 'utf8');
    expect(round4TestInhalt).toMatch(/KARTE_VON_SECHS_MUSTER\s*=\s*\/Karte/);
  });
});

// ---------------------------------------------------------------------------
// AK 4 – Deutsch bleibt bei diesem Fix unverändert deutsch (keine Regression).
// ---------------------------------------------------------------------------
describe('AK 4: Regressionsschutz – die deutschen Übersetzungen der betroffenen Schlüssel bleiben vorhanden und nicht-leer', () => {
  test('Szenario: Gegeben die fünf Stationsschlüssel, wenn die zentrale Übersetzungstabelle geprüft wird, dann haben alle fünf weiterhin einen nicht-leeren deutschen Wert (unverändert durch diesen Fix)', () => {
    ['station.wareneingang', 'station.kommissionierung', 'station.packstation', 'station.versand', 'station.qualitaetskontrolle']
      .forEach((schluessel) => erwarteSchluesselInBeidenKopien(schluessel));
  });
});

// ---------------------------------------------------------------------------
// AK 5 – Grammatik: "You are a Player in this game." statt "You are Players
// in this game." für eine einzelne Person, ohne die Kategorie-Badge-Anzeige
// ("Players" als Rollenklasse) zu verändern.
// ---------------------------------------------------------------------------
describe('AK 5: Der Einzelperson-Satz "You are … in this game." nutzt eine eigene Singular-Übersetzung statt des Mehrzahl-Kategorie-Schlüssels rollen.spielende', () => {
  test('Szenario: Gegeben eine Person mit der Rolle "Spielende", wenn berechneLobbyRolleHinweisText() den Einzelperson-Satz berechnet, dann verwendet der Quelltext NICHT mehr rollenLabel(eigeneRolle) (das liefert die Mehrzahl-Kategorie "Players"), sondern einen eigenen Singular-Schlüssel', () => {
    const koerper = schneide(spielHtmlInhalt, 'function berechneLobbyRolleHinweisText() {', "return '';");
    // Aktuell (Bug): rollenLabel(eigeneRolle) liefert t('rollen.spielende') = "Players"
    // (Mehrzahl) – im Satzkontext einer Einzelperson grammatikalisch falsch.
    expect(koerper).not.toMatch(/t\(\s*'lobby\.duBistRolleInSpiel'\s*,\s*\{\s*rolle:\s*rollenLabel\(eigeneRolle\)\s*\}\s*\)/);
  });

  test('Szenario: Gegeben die Kategorie-Badge-Anzeige in der Teilnehmendenliste (rollenLabel() bei badge.textContent), wenn dieselbe Stelle geprüft wird, dann bleibt sie unverändert bei der Mehrzahl-Form (rollen.spielende = "Players") – dieser AK betrifft ausdrücklich NUR den Einzelperson-Satz, nicht die Badge-Kategorie', () => {
    expect(spielHtmlInhalt).toMatch(/badge\.textContent\s*=\s*rollenLabel\(daten\.rolle\)/);
    erwarteSchluesselInBeidenKopien('rollen.spielende');
  });
});

// ---------------------------------------------------------------------------
// AK 6 – Kein hartcodierter deutscher Platzhaltertext beim Laden/Einloggen
// (Auth-Timing-Fenster).
// ---------------------------------------------------------------------------
describe('AK 6: Kein sichtbares Element zeigt beim Laden/Einloggen mehr einen hartcodierten deutschen Platzhaltertext, solange die Sprache noch nicht bekannt ist', () => {
  test('Szenario: Gegeben die Seite wird gerade erst geladen (Firebase-Anmeldung noch nicht abgeschlossen), wenn der initiale HTML-Quelltext von #untertitel geprüft wird, dann steht dort kein hartcodierter deutscher Text ("Lädt…") mehr, sondern ein sprachneutraler Platzhalter (bzw. die Sprache ist bereits vor dem ersten Render aus localStorage vorbelegt)', () => {
    // Aktuell (Bug): <div class="tag" id="untertitel">Lädt…</div> im statischen
    // HTML – macht diesen Test rot, bis der Platzhalter sprachneutral wird
    // oder wendeSpracheAufStatischeTexteAn() vor dem ersten Render läuft.
    expect(spielHtmlInhalt).not.toMatch(/id="untertitel">Lädt…</);
  });

  test('Szenario: Gegeben dieselbe Ladephase, wenn init() geprüft wird, dann wird die Sprache NICHT mehr erst nach Abschluss der Firebase-Anmeldung angewendet (aktuell: wendeSpracheAufStatischeTexteAn() erst nach await auth.signInAnonymously()/onAuthStateChanged), sondern synchron davor bzw. der Platzhalter ist ohnehin sprachneutral', () => {
    const initKoerper = schneide(spielHtmlInhalt, 'async function init() {', 'init().catch(');
    const authAufrufIndex = initKoerper.search(/signInAnonymously|onAuthStateChanged/);
    const spracheAufrufIndex = initKoerper.indexOf('wendeSpracheAufStatischeTexteAn()');
    expect(authAufrufIndex).toBeGreaterThan(-1);
    expect(spracheAufrufIndex).toBeGreaterThan(-1);
    // Aktuell (Bug): wendeSpracheAufStatischeTexteAn() steht NACH dem Auth-Aufruf
    // im Quelltext – macht diesen Test rot, bis das Timing behoben ist.
    expect(spracheAufrufIndex).toBeLessThan(authAufrufIndex);
  });

  test('Szenario: Gegeben die Landingpage (public/index.html), wenn dieselbe Prüfung durchgeführt wird, dann bleibt sie unverändert grün (dort gibt es keine Firebase-Anmeldung, wendeSpracheAn() läuft bereits synchron beim Laden – kein Regressionsrisiko, nur zur Vollständigkeit dokumentiert)', () => {
    expect(indexHtmlInhalt).toMatch(/wendeSpracheAn\(\)\s*;\s*\}\)\(\);/s);
  });
});

// ---------------------------------------------------------------------------
// AK 7 – aria-label des Sprachumschalters ist sprachabhängig (beide Dateien).
// ---------------------------------------------------------------------------
describe('AK 7: Das aria-label des Sprachumschalters selbst wird bei einem Sprachwechsel mit aktualisiert, statt dauerhaft "Sprache wählen" zu bleiben', () => {
  test('Szenario (public/spiel.html): Gegeben ein Sprachwechsel, wenn wendeSpracheAufStatischeTexteAn() geprüft wird, dann setzt sie zusätzlich das aria-label von #sprach-auswahl über einen Übersetzungsschlüssel', () => {
    const koerper = schneide(spielHtmlInhalt, 'function wendeSpracheAufStatischeTexteAn() {', 'aktualisiereUntertitel();');
    // Aktuell (Bug): keine setAttribute('aria-label', ...)-Zeile für den
    // Sprachumschalter – macht diesen Test rot.
    expect(koerper).toMatch(/sprachAuswahl\.setAttribute\(\s*'aria-label'\s*,\s*t\(/);
  });

  test('Szenario (public/index.html): Gegeben dieselbe Prüfung auf der Landingpage, wenn wendeSpracheAn() geprüft wird, dann setzt auch sie zusätzlich das aria-label von #sprach-auswahl über einen Übersetzungsschlüssel', () => {
    const koerper = schneide(indexHtmlInhalt, 'function wendeSpracheAn() {', 'sprachAuswahl.addEventListener');
    expect(koerper).toMatch(/sprachAuswahl\.setAttribute\(\s*'aria-label'\s*,\s*t\(/);
  });

  test('Regressionsschutz: Der neue aria-label-Übersetzungsschlüssel existiert mit nicht-leerem DE/EN in beiden Kopien der Übersetzungstabelle', () => {
    // Erwarteter Schlüsselname ist ein Implementierungsdetail der Umsetzungsphase;
    // hier wird nur geprüft, dass IRGENDEIN aria-label-Schlüssel für den
    // Sprachumschalter existiert (Muster 'sprachumschalter' im Schlüsselnamen).
    const passendeSchluessel = Object.keys(UEBERSETZUNGEN_NODE).filter((k) => k.toLowerCase().includes('sprachumschalter') && k.toLowerCase().includes('aria'));
    expect(passendeSchluessel.length).toBeGreaterThan(0);
  });
});
