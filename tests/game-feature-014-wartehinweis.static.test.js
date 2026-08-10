/**
 * FEATURE-014 – Wartehinweis für beigetretene Mitspielende.
 * BDD-Tests (flow-game-bdd) für den von Stephan am 2026-08-09 23:35
 * bestätigten Rest-Scope, Option B: (1) eine persönliche "du bist fertig"-
 * Bestätigung direkt nach dem Beitreten, (2) eine explizite "Wir warten noch
 * auf N weitere Person(en)"-Formulierung mit korrektem Singular/Plural,
 * jeweils als ERGÄNZUNG zur bereits bestehenden, aus BUGFIX-003 stammenden
 * Erläuterung (lobby.startHinweis) und dem Live-Zähler (lobby.liveZaehler) -
 * beide bleiben unverändert bestehen, siehe Analyse-Spec, Option B.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt, siehe
 * package.json), Textmuster-/Funktionskörper-Prüfung gegen den echten
 * Quelltext von public/spiel.html sowie beide i18n-Kopien, analog zu
 * tests/game-lobby-und-rundenkontext.static.test.js (BUGFIX-003) und
 * tests/game-feature-018-text-und-zaehler.static.test.js (FEATURE-018).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-018 – die Analyse-Spec (Schritt 5, Zeile 2319) schlägt
 * bereits zwei der drei Schlüsselnamen vor, hier vollständig übernommen und
 * um den dritten, in der Spec nicht benannten Grenzfall-Schlüssel ergänzt):
 *  - i18n-Schlüssel AK1 (persönliche Bestätigung): 'lobby.duBistFertig'.
 *  - i18n-Schlüssel AK2 (Plural, "wir warten noch auf N weitere"):
 *    'lobby.wartetNochAuf', Platzhalter {anzahl} (analog zur bestehenden
 *    Platzhalter-Namenskonvention {aktuell}/{minimum} in lobby.liveZaehler).
 *  - i18n-Schlüssel AK2 (Singular, "wir warten noch auf 1 weitere Person"):
 *    'lobby.wartetNochAufEinzeln', ebenfalls mit Platzhalter {anzahl}.
 *  - i18n-Schlüssel AK4 (Grenzfall N=0, "alle da"), in der Spec nicht
 *    konkret benannt: 'lobby.wartetAlleDa', bewusst mit demselben
 *    'lobby.wartet…'-Präfix wie die beiden anderen neuen Schlüssel, damit
 *    alle drei zusammengehörigen Varianten im gleichen Bildschirmbereich
 *    leicht als Einheit auffindbar sind.
 *  - Neues DOM-Element AK1: id="lobby-du-bist-fertig-hinweis" (Absatz,
 *    unterscheidbar vom bestehenden #lobby-start-hinweis).
 *  - Neues DOM-Element AK2/AK4: id="lobby-wartet-hinweis" (ein einzelnes
 *    Element, dessen Text zwischen den drei Schlüsseln oben wechselt -
 *    zusätzlich zum bestehenden #lobby-live-zaehler, nicht dessen Ersatz).
 *
 * WICHTIG – erwartungsgemäß (noch) ROT: Die Implementierung existiert noch
 * nicht (Ticket-Status "In Progress", direkt nach `flow-game-analyze`).
 * Jeder Testfall unten prüft mindestens eine positive Existenz-Aussage
 * (neues Element/neuer Schlüssel/neue Codepfad-Evidenz), die heute im
 * Quelltext noch fehlt - kombiniert mit ggf. zusätzlichen negativen/
 * Regressions-Aussagen in DERSELBEN Testfunktion, damit kein Testfall allein
 * durch die negative Teilaussage bereits grün wäre, obwohl die eigentliche
 * Funktionalität fehlt (siehe flow-game-bdd Skill-Abschnitt 3 zur
 * Polaritäts-Pflicht sowie Abschnitt 4a zur Rot-Beobachtungspflicht).
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss existieren
  const ende = spielHtmlInhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  expect(browserUebersetzungenInhalt).toMatch(
    new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`)
  );
}

// Deckt berechneLobbyRolleHinweisText() UND den Hauptkörper von zeigeLobby()
// (bis zur verschachtelten renderTeilnehmerListe()) ab - laut Architektur-
// Hinweis der Analyse-Spec (Zeile 2318) die vorgesehene Stelle für die neue
// persönliche AK1-Bestätigung.
function lobbyPersoenlicheBestaetigungBereich() {
  return schneide('function berechneLobbyRolleHinweisText() {', 'function renderTeilnehmerListe() {');
}

// Laut Architektur-Pflichthinweis der Analyse-Spec (Zeile 2310) MUSS der neue
// "wir warten noch auf …"-Text zentral hier verankert werden, nicht an den
// vier zeigeLobby()-Aufrufstellen dupliziert - deckt sich mit AK2/AK3/AK4/AK7.
function renderTeilnehmerListeKoerper() {
  return schneide('function renderTeilnehmerListe() {', "db.collection('spiele').doc(code).collection('teilnehmende').doc(eigeneUid)");
}

function wendeSpracheAufSichtbareAnsichtenAnKoerper() {
  return schneide('function wendeSpracheAufSichtbareAnsichtenAn() {', 'function zeigeFehler(nachricht) {');
}

describe('AK1: persönliche „du bist fertig"-Bestätigung, unterscheidbar vom bestehenden allgemeinen Erläuterungstext', () => {
  test('Gegeben eine beigetretene Person in der Lobby, wenn public/spiel.html nach einem neuen Bestätigungs-Element gesucht wird, dann existiert #lobby-du-bist-fertig-hinweis im Lobby-Panel-Markup', () => {
    expect(spielHtmlInhalt).toMatch(/id="lobby-du-bist-fertig-hinweis"/);
  });

  test('Gegeben dieses neue Element, wenn der zuständige Codebereich (berechneLobbyRolleHinweisText()/zeigeLobby()) geprüft wird, dann wird sein Text tatsächlich über einen echten Übersetzungsschlüssel lobby.duBistFertig gesetzt (nicht hartcodiert Deutsch, nicht nur im Markup vorhanden ohne zugehörige Zuweisung)', () => {
    const bereich = lobbyPersoenlicheBestaetigungBereich();
    expect(bereich).toMatch(/lobby-du-bist-fertig-hinweis/);
    expect(bereich).toMatch(/t\(\s*'lobby\.duBistFertig'\s*\)/);
  });

  test('Gegeben der neue Schlüssel lobby.duBistFertig, wenn er inhaltlich mit dem bestehenden lobby.startHinweis verglichen wird, dann ist sein deutscher Text NICHT identisch mit lobby.startHinweis (klar unterscheidbare, eigene Aussage statt einer Wiederholung der allgemeinen Regel-Erläuterung), UND er existiert mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle', () => {
    erwarteSchluesselInBeidenKopien('lobby.duBistFertig');
    expect(UEBERSETZUNGEN_NODE['lobby.duBistFertig'].de).not.toEqual(UEBERSETZUNGEN_NODE['lobby.startHinweis'].de);
  });
});

describe('AK5 (Polarität zu AK1): auch eine als Beobachtende beigetretene Person sieht die persönliche Bestätigung', () => {
  test('Gegeben der Codebereich, der die neue AK1-Bestätigung setzt, wenn er auf eine Rollen-Bedingung geprüft wird, dann ist die Zuweisung an #lobby-du-bist-fertig-hinweis NICHT durch eine Bedingung eingeschränkt, die die Rolle "beobachtende" ausschließt (z. B. kein "eigeneRolle !== \'beobachtende\'"/"rolle === \'spielende\' || rolle === \'host\'" direkt um die neue Zuweisung herum) - sie muss für alle drei Rollen gleichermaßen gesetzt werden', () => {
    const bereich = lobbyPersoenlicheBestaetigungBereich();
    // Positive Teilaussage (rot, solange die Funktionalität fehlt): die
    // Zuweisung muss überhaupt existieren, sonst wäre diese negative Prüfung
    // trivial und ungeprüft grün (siehe flow-game-bdd Skill-Abschnitt 3/4a).
    expect(bereich).toMatch(/t\(\s*'lobby\.duBistFertig'\s*\)/);
    const zuweisungsStelle = bereich.indexOf("t('lobby.duBistFertig')") !== -1
      ? bereich.indexOf("t('lobby.duBistFertig')")
      : bereich.search(/t\(\s*'lobby\.duBistFertig'\s*\)/);
    const naheUmgebung = bereich.slice(Math.max(0, zuweisungsStelle - 150), zuweisungsStelle);
    expect(naheUmgebung).not.toMatch(/!==\s*'beobachtende'/);
    expect(naheUmgebung).not.toMatch(/===\s*'spielende'\s*\|\|\s*eigeneRolle\s*===\s*'host'/);
  });
});

describe('AK2/AK4: „Wir warten noch auf N weitere Person(en)"-Text mit korrektem Singular/Plural und Grenzfall N=0, zentral in renderTeilnehmerListe() berechnet', () => {
  test('Gegeben renderTeilnehmerListe() wird bei jeder Änderung der Teilnehmendenliste erneut aufgerufen, wenn ihr Funktionskörper geprüft wird, dann berechnet sie dort selbst (nicht an einer zeigeLobby()-Aufrufstelle dupliziert) die noch fehlende Anzahl aus MINDESTBESETZUNG_SPIELENDE und der bereits vorhandenen anzahlSpielendeBeigetreten-Variable (Regressionsschutz/Wiederverwendung der FEATURE-018-Zählbasis, AK5/Pre-Mortem-Risiko 5) und setzt darauf basierend #lobby-wartet-hinweis', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/lobby-wartet-hinweis/);
    expect(koerper).toMatch(/MINDESTBESETZUNG_SPIELENDE\s*-\s*anzahlSpielendeBeigetreten|anzahlSpielendeBeigetreten[\s\S]{0,40}MINDESTBESETZUNG_SPIELENDE/);
  });

  test('Gegeben genau 1 weitere Person fehlt (Singular), wenn der Funktionskörper von renderTeilnehmerListe() geprüft wird, dann existiert ein eigener Bedingungszweig, der in diesem Fall den Singular-Schlüssel lobby.wartetNochAufEinzeln statt des Plural-Schlüssels verwendet', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/wartetNochAufEinzeln/);
    expect(koerper).toMatch(/===\s*1/);
  });

  test('Gegeben mehr als 1 weitere Person fehlt (Plural, z. B. 2 oder mehr), wenn der Funktionskörper von renderTeilnehmerListe() geprüft wird, dann verwendet er in diesem Fall den Plural-Schlüssel lobby.wartetNochAuf (unterscheidbar vom Singular-Schlüssel lobby.wartetNochAufEinzeln oben)', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/t\(\s*'lobby\.wartetNochAuf'\s*,/);
  });

  test('Gegeben die Mindestbesetzung ist bereits erreicht (Grenzwert N=0), wenn der Funktionskörper von renderTeilnehmerListe() geprüft wird, dann existiert ein eigener dritter Bedingungszweig, der den Schlüssel lobby.wartetAlleDa verwendet statt weiterhin "0 weitere" oder eine sonst unpassende Restformulierung zu zeigen', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/wartetAlleDa/);
    expect(koerper).toMatch(/<=\s*0|===\s*0/);
  });

  test('Gegeben das Ticket verlangt sinngemäß "kein hartcodiertes Zahlenbeispiel im Quelltext" (analog zum bereits etablierten BUGFIX-003-Muster), wenn der gesamte Quelltext von public/spiel.html nach dem wörtlichen Beispieltext aus der Spec durchsucht wird, dann kommt dieser NICHT als hartcodierter String vor', () => {
    expect(spielHtmlInhalt).not.toMatch(/noch auf 1 weitere Person/);
    expect(spielHtmlInhalt).not.toMatch(/noch auf 3 weitere Personen/);
  });

  test('Gegeben die drei neuen Schlüssel lobby.wartetNochAuf/lobby.wartetNochAufEinzeln/lobby.wartetAlleDa, wenn sie inhaltlich geprüft werden, dann verwenden die beiden zahlenabhängigen Schlüssel tatsächlich einen {anzahl}-Platzhalter statt eines fest einprogrammierten Zahlenbeispiels, der Singular-Text enthält im Deutschen erkennbar "Person" (nicht "Personen"), der Plural-Text erkennbar "Personen", und alle drei existieren mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle', () => {
    erwarteSchluesselInBeidenKopien('lobby.wartetNochAuf');
    erwarteSchluesselInBeidenKopien('lobby.wartetNochAufEinzeln');
    erwarteSchluesselInBeidenKopien('lobby.wartetAlleDa');

    expect(UEBERSETZUNGEN_NODE['lobby.wartetNochAuf'].de).toMatch(/\{anzahl\}/);
    expect(UEBERSETZUNGEN_NODE['lobby.wartetNochAufEinzeln'].de).toMatch(/\{anzahl\}/);

    expect(UEBERSETZUNGEN_NODE['lobby.wartetNochAufEinzeln'].de).toMatch(/Person\b/);
    expect(UEBERSETZUNGEN_NODE['lobby.wartetNochAufEinzeln'].de).not.toMatch(/Personen/);
    expect(UEBERSETZUNGEN_NODE['lobby.wartetNochAuf'].de).toMatch(/Personen/);
  });
});

describe('AK3: identischer „Wir warten noch auf …"-Text für Host UND Mitspielende (keine rollenabhängig unterschiedliche Formulierung)', () => {
  test('Gegeben renderTeilnehmerListe() läuft unverändert für ALLE Rollen (Host, Spielende, Beobachtende) gleichermaßen ab, wenn ihr Funktionskörper geprüft wird, dann ist die neue #lobby-wartet-hinweis-Zuweisung NICHT durch eine Rollen-Bedingung (z. B. "eigeneRolle === \'host\'"/"eigeneRolle !== \'host\'") umschlossen - dieselbe zentrale Berechnung gilt automatisch für Host und Mitspielende, exakt wie bereits heute bei #lobby-live-zaehler', () => {
    const koerper = renderTeilnehmerListeKoerper();
    // Positive Teilaussage (rot, solange fehlend): siehe Kommentar oben bei AK5.
    expect(koerper).toMatch(/lobby-wartet-hinweis/);
    expect(koerper).not.toMatch(/eigeneRolle\s*[!=]==\s*'host'/);
  });
});

describe('AK6: Sprachwechsel während des Wartens aktualisiert AK1- und AK2/AK4-Texte sofort, ohne Neuladen der Seite', () => {
  test('Gegeben ein Sprachwechsel während des Wartens in der Lobby, wenn der Funktionskörper von wendeSpracheAufSichtbareAnsichtenAn() geprüft wird, dann löst er weiterhin renderTeilnehmerListeAktuell() aus (deckt die neue AK2/AK4-Formulierung automatisch mit ab, da sie zentral in renderTeilnehmerListe() verankert ist - Regressionsschutz des bestehenden FEATURE-006-Mechanismus)', () => {
    const koerper = wendeSpracheAufSichtbareAnsichtenAnKoerper();
    expect(koerper).toMatch(/renderTeilnehmerListeAktuell\(\)/);
  });

  test('Gegeben dieselbe Sprachwechsel-Stelle, wenn ihr Funktionskörper geprüft wird, dann wird dort AUCH die neue AK1-Bestätigung (#lobby-du-bist-fertig-hinweis bzw. der zugehörige Text) erneut über t(\'lobby.duBistFertig\') neu berechnet - analog zum bestehenden Muster für #lobby-rolle-hinweis (lobbyRolleHinweisArt), das im selben Funktionskörper direkt darunter bereits demonstriert, wie ein datengetriebener Lobby-Text bei Sprachwechsel aktualisiert wird', () => {
    const koerper = wendeSpracheAufSichtbareAnsichtenAnKoerper();
    expect(koerper).toMatch(/lobbyRolleHinweisArt/); // Regressionsschutz: bestehender Mechanismus bleibt
    expect(koerper).toMatch(/duBistFertig/);
  });
});

describe('AK7 (Echtzeit-Aktualisierung) und Pre-Mortem-Risiko 5 (Rollback-/Wiederanlauffähigkeit): der neue Text baut sich ausschließlich aus dem bereits vorhandenen teilnehmendeCache-Mechanismus neu auf, kein eigenständiges neues Datenfeld', () => {
  test('Gegeben ein dritter, simulierter Beitritt während zwei Personen bereits warten, wenn die onSnapshot-Listener-Registrierung in zeigeLobby() geprüft wird, dann rufen sie weiterhin bei jedem Snapshot renderTeilnehmerListe() auf (dieselbe Funktion, die jetzt zusätzlich #lobby-wartet-hinweis berechnet) - kein separater, eigener Listener nötig, kein neues Firestore-Feld', () => {
    // Regressionsschutz: der bestehende Aufruf-Mechanismus bleibt unverändert
    // bestehen und deckt automatisch auch den neuen Text mit ab.
    const treffer = (spielHtmlInhalt.match(/renderTeilnehmerListe\(\);/g) || []).length;
    expect(treffer).toBeGreaterThanOrEqual(3); // ein Aufruf je onSnapshot-Listener (heute: 3)
    // Positive Teilaussage (rot, solange fehlend): dieselbe Funktion muss den
    // neuen Text tatsächlich berechnen.
    expect(renderTeilnehmerListeKoerper()).toMatch(/lobby-wartet-hinweis/);
  });
});

describe('AK8: die neue Formulierung erscheint an allen vier bestehenden Einstiegspfaden in die Lobby, zentral verankert statt dupliziert', () => {
  test('Gegeben die vier bekannten Einstiegspfade (Host nach Erstellen, Host nach Wiederbetreten, Beitritt, automatisches Wiederbetreten), wenn public/spiel.html nach zeigeLobby()-Aufrufen durchsucht wird, dann existieren weiterhin genau vier Aufrufstellen (Regressionsschutz, unverändert seit BUGFIX-003), UND die neue Bestätigung/der neue Wartehinweis sind zentral verankert statt an jeder Aufrufstelle einzeln dupliziert (kein zusätzliches setText(\'lobby-du-bist-fertig-hinweis\', …)/kein zusätzliches lobbyWartetHinweis.textContent = … außerhalb der jeweils einen zentralen Stelle)', () => {
    const aufrufstellen = spielHtmlInhalt.match(/(?<!function )\bzeigeLobby\(\s*(?:\n\s*)?db\b/g) || [];
    expect(aufrufstellen.length).toBe(5); // 4 echte Aufrufstellen + die Funktionsdefinition selbst (siehe BUGFIX-003-Test)

    const vorkommenDuBistFertig = (spielHtmlInhalt.match(/lobby-du-bist-fertig-hinweis/g) || []).length;
    // Positive Teilaussage (rot, solange fehlend): mindestens Markup + eine
    // Zuweisungsstelle müssen existieren (>= 2 Fundstellen insgesamt).
    expect(vorkommenDuBistFertig).toBeGreaterThanOrEqual(2);
    const zuweisungenAusserhalbMarkup = vorkommenDuBistFertig - 1; // 1 Fundstelle ist das <p>-Markup selbst
    expect(zuweisungenAusserhalbMarkup).toBe(1); // genau eine zentrale Zuweisungsstelle, keine Duplikate
  });
});

describe('Regressionsschutz: bereits bestehende BUGFIX-003/FEATURE-018-Texte bleiben unverändert bestehen (Ergänzung, kein Ersatz, siehe Option B)', () => {
  test('Gegeben der bestehende Erläuterungstext lobby.startHinweis, wenn er inhaltlich geprüft wird, dann erwähnt er weiterhin sowohl die Host-Auslösung als auch "5 oder 6" Personen (FEATURE-018-Wortlaut) - unverändert durch dieses Ticket', () => {
    const text = UEBERSETZUNGEN_NODE['lobby.startHinweis'].de;
    expect(text).toMatch(/host/i);
    expect(text).toMatch(/5 oder 6/);
  });

  test('Gegeben der bestehende Live-Zähler lobby.liveZaehler, wenn er inhaltlich geprüft wird, dann verwendet er weiterhin die {aktuell}/{minimum}-Platzhalter unverändert (bleibt als positiv gerahmte Zählung neben dem neuen Wartehinweis bestehen, wird nicht ersetzt)', () => {
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].de).toMatch(/\{aktuell\}/);
    expect(UEBERSETZUNGEN_NODE['lobby.liveZaehler'].de).toMatch(/\{minimum\}/);
    expect(spielHtmlInhalt).toMatch(/id="lobby-live-zaehler"/);
  });

  test('Gegeben die Zählbasis aus FEATURE-018 (ein mitspielender Host zählt mit, ein rein moderierender Host nicht), wenn der Funktionskörper von renderTeilnehmerListe() geprüft wird, dann bleibt die Filterbedingung für anzahlSpielendeBeigetreten unverändert bestehen (Regressionsschutz, da der neue Wartehinweis exakt dieselbe Variable wiederverwendet, siehe AK2/AK5-Test oben)', () => {
    const koerper = renderTeilnehmerListeKoerper();
    expect(koerper).toMatch(/daten\.rolle === 'spielende' \|\| \(daten\.rolle === 'host' && daten\.station != null\)/);
  });
});
