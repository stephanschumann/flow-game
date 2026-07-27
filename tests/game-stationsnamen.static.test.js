/**
 * BUGFIX-003 – Spielbrett zeigt während Lobby und laufender Runde fehlenden
 * oder falschen Kontext für Spielende.
 * BDD-Tests (flow-game-bdd) für die Teilprobleme (c) Personenname in den
 * Spaltenköpfen des Spielbretts und (d) Scope-Erweiterung Vergleichsansicht,
 * freigegeben von Stephan am 2026-07-22 (Gate 1).
 *
 * WICHTIG (neu umgesetzt gegen HEAD fc14c4c, MIT FEATURE-006-Mehrsprachigkeit
 * - siehe Backlog.md): Ein früherer Testentwurf für dieses Ticket existierte
 * nur in einer separaten Sandbox gegen den ALTEN Code-Stand (1c4c4af, ohne
 * i18n, mit einer statischen POSITION_LABELS-Konstante statt der jetzigen
 * positionLabels()-Funktion) und wurde nie committet - er ist damit NICHT
 * Teil dieses Repos und wurde bewusst nicht wiederverwendet. Diese Datei
 * prüft dieselbe fachliche Test-Absicht, aber gegen den jetzt tatsächlich
 * existierenden Code UND mit der jetzt einzig zutreffenden Prüfmethode für
 * neue Texte ("verwendet t()/den richtigen Übersetzungsschlüssel" statt
 * "enthält ein wörtliches deutsches Textmuster").
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden - siehe
 * package.json), Textmuster-Prüfung gegen den echten Quelltext, analog zu
 * tests/game-a11y-static.test.js.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

function erwarteSchluesselInBeidenKopien(schluessel) {
  expect(UEBERSETZUNGEN_NODE[schluessel]).toBeDefined();
  expect(UEBERSETZUNGEN_NODE[schluessel].de.trim().length).toBeGreaterThan(0);
  expect(UEBERSETZUNGEN_NODE[schluessel].en.trim().length).toBeGreaterThan(0);
  expect(browserUebersetzungenInhalt).toMatch(
    new RegExp(`'${schluessel.replace(/\./g, '\\.')}':\\s*\\{`)
  );
}

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss existieren
  const ende = spielHtmlInhalt.indexOf(endAnker, start);
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function renderBrettKoerper() {
  return schneide('function renderBrett(db, code) {', 'async function versucheRundenEnde(db, code) {');
}

function verarbeiteTeilnehmerDocKoerper() {
  return schneide('function verarbeiteTeilnehmerDoc(uid, daten) {', 'function renderTeilnehmerListe() {');
}

function renderVergleichsTabelleKoerper() {
  return schneide('function renderVergleichsTabelle(container, vergleich) {', '// FEATURE-003: Host-Vorschau');
}

describe('Szenario (c): Spaltenkopf zeigt zusätzlich zur Stationsbezeichnung den Namen der zuständigen Person, als eigene Zeile', () => {
  test('Gegeben renderBrett() erzeugt für jede Station 1-5 ein zusätzliches Element, wenn ihr Funktionskörper geprüft wird, dann steht dieses Element (.spalte-person) NACH dem bestehenden Stationstitel (eigene Zeile, keine String-Verkettung mit positionLabelsAktuell[position]) und wird über spalte.appendChild() angehängt', () => {
    const koerper = renderBrettKoerper();
    const indexTitelAppend = koerper.indexOf('spalte.appendChild(titel);');
    const indexPersonElement = koerper.indexOf("person.className = 'spalte-person'");
    const indexPersonAppend = koerper.indexOf('spalte.appendChild(person);');

    expect(indexTitelAppend).toBeGreaterThan(-1);
    expect(indexPersonElement).toBeGreaterThan(indexTitelAppend);
    expect(indexPersonAppend).toBeGreaterThan(indexPersonElement);

    // Keine String-Verkettung mit dem Stationstitel selbst.
    expect(koerper).not.toMatch(/titel\.textContent\s*=\s*positionLabelsAktuell\[position\]\s*\+/);
  });

  test('Gegeben der neue Namenszusatz soll NUR für die fünf Stationen (Position 1-5) erscheinen, wenn der Funktionskörper geprüft wird, dann steht die Erzeugung des .spalte-person-Elements innerhalb eines eigenen "position >= 1 && position <= 5"-Zweigs (Position 0 "Auftragseingang" und 6 "Ziel" bleiben unverändert ohne Namenszusatz)', () => {
    const koerper = renderBrettKoerper();
    const indexBedingung = koerper.indexOf('if (position >= 1 && position <= 5) {');
    const indexPersonElement = koerper.indexOf("person.className = 'spalte-person'");
    expect(indexBedingung).toBeGreaterThan(-1);
    expect(indexPersonElement).toBeGreaterThan(indexBedingung);

    // Der Name kommt aus derselben Stationsnummer wie "position" - keine
    // eigene Nummerierungsverschiebung, die Position 0/6 versehentlich
    // einschließen könnte.
    expect(koerper).toMatch(/teilnehmendeNamenMap\[\s*'station:'\s*\+\s*position\s*\]/);
  });

  test('Gegeben eine Station ist am Render-Zeitpunkt noch niemandem zugeordnet (z. B. Beitritt erst nach Rundenstart), wenn renderBrett() geprüft wird, dann zeigt sie dafür einen verständlichen Platzhalter über t(\'spielbrett.stationUnbesetzt\') statt eines leeren oder "undefined" wirkenden Felds', () => {
    const koerper = renderBrettKoerper();
    expect(koerper).toMatch(/zustaendigePerson\s*\|\|\s*t\(\s*'spielbrett\.stationUnbesetzt'\s*\)/);
  });

  test('Gegeben der Schlüssel spielbrett.stationUnbesetzt, wenn er geprüft wird, dann existiert er mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle (kein hartcodierter deutscher Platzhaltertext im Funktionskörper von renderBrett())', () => {
    erwarteSchluesselInBeidenKopien('spielbrett.stationUnbesetzt');
    expect(spielHtmlInhalt).not.toMatch(/person\.textContent\s*=\s*zustaendigePerson\s*\|\|\s*'[^']*besetzt/);
  });
});

describe('Regressionsschutz (c): POSITION_LABELS/positionLabels() und das aria-label des Bewegen-Buttons bleiben unverändert (FEATURE-005 AK15, game-a11y-static.test.js)', () => {
  test('Gegeben renderBrett() setzt den Spaltentitel weiterhin unverändert aus positionLabelsAktuell[position], wenn der Funktionskörper geprüft wird, dann bleibt "titel.textContent = positionLabelsAktuell[position];" exakt in dieser Form bestehen (keine Namensanhängung am Titel selbst)', () => {
    expect(spielHtmlInhalt).toContain('titel.textContent = positionLabelsAktuell[position];');
  });

  test('Gegeben der aria-label-Text des Bewegen-Buttons (FEATURE-005 AK15), wenn der Funktionskörper von renderBrett() geprüft wird, dann nutzt er weiterhin unverändert positionLabelsAktuell[position]/[position + 1] über den bestehenden Schlüssel aria.kartePosition - keine Erweiterung um den neuen Personennamen (der bliebe sonst unhandlich lang und der bestehende a11y-Test bräche)', () => {
    const koerper = renderBrettKoerper();
    const ariaAufrufMuster = /t\(\s*'aria\.kartePosition'\s*,\s*\{\s*karte:[^}]*von:\s*positionLabelsAktuell\[position\][^}]*nach:\s*positionLabelsAktuell\[position \+ 1\][^}]*\}\s*\)/;
    expect(koerper).toMatch(ariaAufrufMuster);

    const ariaAufrufText = koerper.match(ariaAufrufMuster)[0];
    expect(ariaAufrufText).not.toMatch(/zustaendigePerson/);
  });
});

describe('Szenario (c): Rejoin mitten in einer laufenden Runde zeigt sofort den korrekten Namen (Pre-Mortem-Risiko 3)', () => {
  test('Gegeben die Stationsnummer->Name-Zuordnung wird zentral in verarbeiteTeilnehmerDoc() aktualisiert, wenn ihr Funktionskörper geprüft wird, dann schreibt sie dort (für JEDE verarbeitete Person, nicht nur die eigene) einen Eintrag teilnehmendeNamenMap[\'station:\' + N] - dieselbe Funktion wird von BEIDEN Teilnehmenden-Listenern aufgerufen (eigenes Dokument UND die gefilterte Collection-Query), bleibt dadurch auch nach einem Rejoin mitten in einer laufenden Runde aktuell', () => {
    const koerper = verarbeiteTeilnehmerDocKoerper();
    expect(koerper).toMatch(/teilnehmendeNamenMap\[\s*'station:'\s*\+\s*\w+\s*\]\s*=\s*daten\.anzeigename/);

    // Beide bestehenden Listener rufen verarbeiteTeilnehmerDoc() auf (nicht
    // nur der Listener für das eigene Dokument) - sonst bliebe die Zuordnung
    // für alle ANDEREN Stationen dauerhaft leer.
    const vorkommen = (spielHtmlInhalt.match(/verarbeiteTeilnehmerDoc\(/g) || []).length;
    expect(vorkommen).toBeGreaterThanOrEqual(3); // Definition + mind. 2 Aufrufstellen (eigenes Dokument, Collection-Query)
  });

  test('Gegeben stationsNummerVon() konvertiert sowohl den alten String-Stationsnamen als auch die bereits migrierte Zahl, wenn der Funktionskörper von verarbeiteTeilnehmerDoc() geprüft wird, dann nutzt er für die neue Stationsnummer->Name-Zuordnung dieselbe Konvertierungsfunktion (window.FlowGame.stationsNummerVon) statt einer eigenen, abweichenden Logik', () => {
    const koerper = verarbeiteTeilnehmerDocKoerper();
    expect(koerper).toMatch(/window\.FlowGame\.stationsNummerVon\(\s*daten\.station\s*\)/);
  });
});

describe('Szenario (d): Scope-Erweiterung Vergleichsansicht - derselbe Namens-Fix additiv in renderVergleichsTabelle()', () => {
  test('Gegeben renderVergleichsTabelle() zeigt bereits zwei bestehende Zeilen pro Station (Bewegungen, Beteiligungsspanne), wenn ihr Funktionskörper geprüft wird, dann ergänzt sie eine DRITTE Zeile mit demselben teilnehmendeNamenMap[\'station:\' + N]-Wert wie renderBrett(), OHNE die beiden bestehenden Zeilen zu ersetzen', () => {
    const koerper = renderVergleichsTabelleKoerper();
    expect(koerper).toMatch(/t\(\s*'kennzahlen\.bewegungen'\s*\)/);
    expect(koerper).toMatch(/t\(\s*'kennzahlen\.beteiligungsspanne'\s*\)/);
    expect(koerper).toMatch(/t\(\s*'kennzahlen\.zustaendigePerson'\s*\)/);
    expect(koerper).toMatch(/teilnehmendeNamenMap\[\s*'station:'\s*\+\s*station\s*\]/);

    // Additiv: alle drei zeile(...)-Aufrufe pro Station bleiben erhalten,
    // insbesondere die Reihenfolge Bewegungen -> Beteiligungsspanne -> Person.
    const indexBewegungen = koerper.indexOf("t('kennzahlen.bewegungen')");
    const indexSpanne = koerper.indexOf("t('kennzahlen.beteiligungsspanne')");
    const indexPerson = koerper.indexOf("t('kennzahlen.zustaendigePerson')");
    expect(indexSpanne).toBeGreaterThan(indexBewegungen);
    expect(indexPerson).toBeGreaterThan(indexSpanne);
  });

  test('Gegeben eine Station ist am Render-Zeitpunkt unbesetzt, wenn die neue dritte Zeile in renderVergleichsTabelle() geprüft wird, dann zeigt sie denselben Platzhaltertext (t(\'spielbrett.stationUnbesetzt\')) wie der Spaltenkopf im Spielbrett - konsistente Anzeige zwischen beiden Ansichten', () => {
    const koerper = renderVergleichsTabelleKoerper();
    expect(koerper).toMatch(/teilnehmendeNamenMap\[\s*'station:'\s*\+\s*station\s*\]\s*\|\|\s*t\(\s*'spielbrett\.stationUnbesetzt'\s*\)/);
  });

  test('Gegeben der Schlüssel kennzahlen.zustaendigePerson, wenn er geprüft wird, dann existiert er mit nicht-leerem Text in BEIDEN Kopien der Übersetzungstabelle (kein hartcodierter deutscher Zeilentitel im Funktionskörper von renderVergleichsTabelle())', () => {
    erwarteSchluesselInBeidenKopien('kennzahlen.zustaendigePerson');
  });
});
