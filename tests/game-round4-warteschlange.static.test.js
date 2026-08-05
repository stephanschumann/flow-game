/**
 * FEATURE-017 – Warteschlangen-Anzeige in Runde 4 auf tatsächlich bei mir
 * wartende Elemente begrenzen
 * BDD-Tests (flow-game-bdd, 2026-08-05) für die freigegebene Spec in
 * Backlog.md ("### FEATURE-017").
 *
 * Root Cause (laut Analyse, real im Quelltext bestätigt, Commit-Stand beim
 * Schreiben dieser Datei): `renderRundeVierWarteschlange()` in
 * `public/spiel.html` (Zeile ~2070–2089) filtert `aktuelleElementeListe`
 * ausschließlich danach, ob ein Element NICHT das Fokus-Element ist
 * (`!fokusElement || e.id !== fokusElement.id`) — die zusätzliche, in
 * `bestimmeRundeVierFokus()` (Zeile ~1888–1906) bereits korrekt vorhandene
 * Positionsprüfung (`e.position === eigeneRundeVierPosition`) fehlt hier
 * komplett. Dadurch erscheinen aktuell auch Elemente, die noch bei einer
 * ANDEREN Person unterwegs sind, fälschlich als Chip in der eigenen
 * Warteschlange.
 *
 * Freigegebene Lösung (einzige zu ändernde Stelle laut Analyse):
 * `renderRundeVierWarteschlange()` ergänzt dieselbe Positionsprüfung wie
 * `bestimmeRundeVierFokus()`. `aktuelleElementeListe`, der Firestore-Listener
 * und `versucheRundenEndeRundeVier()` dürfen dabei NICHT verändert werden
 * (brauchen weiterhin die volle 12-Elemente-Liste).
 *
 * Gleiches Testmuster wie tests/game-round4-bearbeitungszeit.static.test.js
 * bzw. tests/game-drag-drop.static.test.js: kein neues Modul, kein
 * Firestore-Emulator, kein DOM/jsdom (nicht im Projekt vorhanden) – liest den
 * echten, bestehenden Quelltext von public/spiel.html. Framework: Jest +
 * Node "fs".
 *
 * ABWEICHUNG vom reinen Textmuster-Ansatz (bewusst, siehe unten "Warum ein
 * echtes Filter-Prädikat statt nur Textmuster"): Ein Teil der Szenarien
 * extrahiert das rohe Filter-Prädikat aus `.filter(...)` innerhalb von
 * `renderRundeVierWarteschlange()` per Regex und macht daraus über
 * `new Function(...)` eine tatsächlich AUSFÜHRBARE Funktion (keine DOM-
 * Berührung nötig, das Prädikat selbst ist reine Datenlogik). Das erlaubt
 * echte Given/When/Then-Prüfungen gegen konkrete Beispiel-Elemente statt nur
 * struktureller Textmuster-Übereinstimmung — und bleibt trotzdem
 * refactoring-verträglich (flow-game-bdd, Abschnitt 3b): Der Test bindet sich
 * nicht an Whitespace/Formatierung, sondern nur an das, was zwischen
 * `.filter(` und `.forEach(` als Argument steht — egal ob als
 * `function (e) {...}` oder Arrow Function geschrieben, solange die Kette
 * weiterhin `aktuelleElementeListe.filter(...).forEach(...)` lautet (bleibt
 * bewusst UNVERÄNDERT als Regressionsziel dieser Datei, siehe letzter
 * Testblock).
 *
 * WICHTIG – bewusst RED: Die Kernfix-Szenarien (erster und zweiter
 * describe-Block) schlagen jetzt tatsächlich fehl (echte Assertion-
 * Fehlschläge gegen das reale, unveränderte Filter-Prädikat), weil
 * FEATURE-017 noch nicht implementiert ist. Die Regressionsschutz-Blöcke
 * (Host/Beobachtende, Rundenende-Erkennung, Live-Update-Listener) sind
 * dagegen bewusst schon JETZT GRÜN — sie belegen, dass diese Teile vom
 * Kernfix unberührt bleiben müssen und heute bereits korrekt sind.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const WARTESCHLANGE_START_MARKER = 'function renderRundeVierWarteschlange(fokusElement) {';
const RENDER_RUNDE_VIER_START_MARKER = 'function renderRundeVier(db, code) {';
const RUNDENENDE_START_MARKER = 'async function versucheRundenEndeRundeVier(db, code) {';

function holeFunktionskoerper(startMarker, endMarker) {
  const start = spielHtmlInhalt.indexOf(startMarker);
  if (start === -1) return null;
  const ende = spielHtmlInhalt.indexOf(endMarker, start);
  if (ende === -1) return null;
  return spielHtmlInhalt.slice(start, ende);
}

function holeWarteschlangenFunktionskoerper() {
  return holeFunktionskoerper(WARTESCHLANGE_START_MARKER, RENDER_RUNDE_VIER_START_MARKER);
}

// Extrahiert das rohe Filter-Prädikat aus
// `aktuelleElementeListe.filter(<PRAEDIKAT>).forEach(...)` innerhalb von
// renderRundeVierWarteschlange() und macht daraus eine echte, aufrufbare
// Funktion — geschlossen über die beiden übergebenen Werte, genauso wie das
// echte Prädikat im Produktivcode über die Closure-Variablen
// `fokusElement` (Funktionsparameter) und `eigeneRundeVierPosition`
// (Modul-Scope-Variable) geschlossen ist.
function baueFilterPraedikat(eigeneRundeVierPositionWert, fokusElementWert) {
  const koerper = holeWarteschlangenFunktionskoerper();
  if (!koerper) {
    throw new Error('renderRundeVierWarteschlange() nicht in public/spiel.html gefunden');
  }
  const treffer = koerper.match(/\.filter\(([\s\S]*?)\)\s*\.forEach\(/);
  if (!treffer) {
    throw new Error('Kein .filter(...).forEach(...)-Aufruf innerhalb von renderRundeVierWarteschlange() gefunden — Regressionsziel dieser Datei (siehe letzter Testblock)');
  }
  const praedikatQuelltext = treffer[1];
  // eslint-disable-next-line no-new-func
  const fabrik = new Function('fokusElement', 'eigeneRundeVierPosition', `return (${praedikatQuelltext});`);
  return fabrik(fokusElementWert, eigeneRundeVierPositionWert);
}

describe('FEATURE-017 Kernfix: Das Filter-Prädikat der Warteschlange berücksichtigt zusätzlich die eigene Position, analog zu bestimmeRundeVierFokus() (AK1, AK2, AK3)', () => {
  test('Szenario: Gegeben eine Person mit eigener Position 3 und Fokus-Element "wuerfel-1", wenn das Filter-Prädikat direkt auf ein Element geprüft wird, das noch an einer fremden Position (1) unterwegs ist, dann liefert es false — das Element darf nicht als Chip erscheinen (AK2, direkter Test gegen den ursprünglichen Bug)', () => {
    const praedikat = baueFilterPraedikat(3, { id: 'wuerfel-1' });
    const fremdesElement = { id: 'karte-9', typ: 'laenderkarte', position: 1 };
    expect(praedikat(fremdesElement)).toBe(false);
  });

  test('Szenario: Gegeben eine Person mit eigener Position 3 und Fokus-Element "wuerfel-1", wenn das Filter-Prädikat auf ein Element geprüft wird, das tatsächlich bereits an ihrer eigenen Position (3) liegt und nicht das Fokus-Element ist, dann liefert es true — das Element erscheint als Chip (Regressionsschutz AK4, "gewollte Friktion" bleibt erhalten)', () => {
    const praedikat = baueFilterPraedikat(3, { id: 'wuerfel-1' });
    const wartendesElementAnEigenerPosition = { id: 'karte-7', typ: 'laenderkarte', position: 3 };
    expect(praedikat(wartendesElementAnEigenerPosition)).toBe(true);
  });

  test('Szenario: Gegeben bei einer Person liegt aktuell nur das eine Fokus-Element und sonst nichts an ihrer Position, wenn die komplette Elemente-Liste (inkl. Elementen an fremden Positionen) mit dem Prädikat gefiltert wird, dann bleibt die gefilterte Liste leer statt fälschlich Elemente von anderen Stationen zu zeigen (AK1–AK3, Kernfix)', () => {
    const praedikat = baueFilterPraedikat(3, { id: 'wuerfel-1' });
    const alleElementeImSpiel = [
      { id: 'wuerfel-1', typ: 'wuerfel', position: 3 }, // das Fokus-Element selbst
      { id: 'karte-5', typ: 'laenderkarte', position: 1 }, // unterwegs bei einer anderen Person
      { id: 'wuerfel-4', typ: 'wuerfel', position: 5 }, // unterwegs bei einer anderen Person
      { id: 'karte-2', typ: 'laenderkarte', position: 2 }, // unterwegs bei einer anderen Person
    ];
    const ergebnis = alleElementeImSpiel.filter(praedikat);
    expect(ergebnis).toEqual([]);
  });

  test('Szenario: Gegeben bei einer Person liegen gleichzeitig das Fokus-Element UND ein weiteres, tatsächlich an ihrer Position liegendes Element, wenn die komplette Elemente-Liste (inkl. Elementen an fremden Positionen) gefiltert wird, dann enthält das Ergebnis GENAU das eine wartende Element — weder das Fokus-Element (Doppelanzeige) noch ein fremdes Element (AK2 + AK4 kombiniert)', () => {
    const praedikat = baueFilterPraedikat(3, { id: 'wuerfel-1' });
    const alleElementeImSpiel = [
      { id: 'wuerfel-1', typ: 'wuerfel', position: 3 }, // Fokus-Element
      { id: 'karte-7', typ: 'laenderkarte', position: 3 }, // wartet ebenfalls bei mir (Wechselzwang)
      { id: 'karte-2', typ: 'laenderkarte', position: 1 }, // fremd, darf nicht erscheinen
      { id: 'wuerfel-4', typ: 'wuerfel', position: 5 }, // fremd, darf nicht erscheinen
    ];
    const ergebnis = alleElementeImSpiel.filter(praedikat);
    expect(ergebnis.map((e) => e.id)).toEqual(['karte-7']);
  });
});

describe('FEATURE-017 Kernfix, Grenzfall: Kein Fokus-Element (fokusElement === null) darf die Positionsprüfung nicht umgehen (Pre-Mortem-verwandter Grenzfall)', () => {
  test('Szenario: Gegeben eine Person hat aktuell kein Fokus-Element (z. B. bestimmeRundeVierFokus() liefert null), wenn das Filter-Prädikat auf ein Element an einer fremden Position geprüft wird, dann liefert es weiterhin false — das Fehlen eines Fokus darf keine Ausnahme für fremde Positionen erzeugen', () => {
    const praedikat = baueFilterPraedikat(3, null);
    const fremdesElement = { id: 'karte-2', typ: 'laenderkarte', position: 5 };
    expect(praedikat(fremdesElement)).toBe(false);
  });
});

describe('FEATURE-017 Regressionsschutz AK6: Host/Beobachtende bleiben von dieser Änderung unberührt (erwartungsgemäß bereits GRÜN)', () => {
  test('Gegeben eigeneRundeVierPosition ist null (Host oder Beobachtende), wenn der Quelltext von renderRundeVier() durchsucht wird, dann liegt der frühe Rückgabepunkt für diese Rollen weiterhin VOR dem Aufruf von renderRundeVierWarteschlange() — die neue Positionsprüfung in der Warteschlange betrifft nur Zeilen, die für Host/Beobachtende ohnehin nie erreicht werden', () => {
    const koerper = holeFunktionskoerper(RENDER_RUNDE_VIER_START_MARKER, 'async function versucheRundenEndeRundeVier(db, code) {');
    expect(koerper).not.toBeNull();

    const fruehesReturnIndex = koerper.indexOf('if (eigeneRundeVierPosition === null) {');
    const warteschlangenAufrufIndex = koerper.indexOf('renderRundeVierWarteschlange(fokusElement)');
    expect(fruehesReturnIndex).toBeGreaterThan(-1);
    expect(warteschlangenAufrufIndex).toBeGreaterThan(-1);
    expect(fruehesReturnIndex).toBeLessThan(warteschlangenAufrufIndex);

    // Der frühe Block selbst enthält tatsächlich ein "return;", nicht nur die
    // Bedingung ohne Wirkung.
    const fruehesReturnBlock = koerper.slice(fruehesReturnIndex, warteschlangenAufrufIndex);
    expect(/\breturn\s*;/.test(fruehesReturnBlock)).toBe(true);
  });
});

describe('FEATURE-017 Regressionsschutz: versucheRundenEndeRundeVier() verwendet weiterhin die volle, ungefilterte aktuelleElementeListe (AK-übergreifende Nebenbedingung aus der Analyse — darf NICHT verändert werden)', () => {
  test('Gegeben die Rundenende-Erkennung braucht alle zwölf Elemente, wenn der Quelltext von versucheRundenEndeRundeVier() durchsucht wird, dann prüft er weiterhin aktuelleElementeListe.length !== 12 und übergibt weiterhin die vollständige, ungefilterte aktuelleElementeListe an pruefeUndSetzeRundenEndeRundeVier()', () => {
    const koerper = holeFunktionskoerper(RUNDENENDE_START_MARKER, '\n  // FEATURE-003:');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/aktuelleElementeListe\.length\s*!==\s*12/);
    expect(koerper).toMatch(/elemente:\s*aktuelleElementeListe\s*,/);
  });

  test('Regressionsschutz: renderRundeVierWarteschlange() wird innerhalb von versucheRundenEndeRundeVier() nicht aufgerufen — der Kernfix bleibt auf die reine Anzeige beschränkt, ohne die Rundenende-Erkennung zu beeinflussen', () => {
    const koerper = holeFunktionskoerper(RUNDENENDE_START_MARKER, '\n  // FEATURE-003:');
    expect(koerper).not.toBeNull();
    expect(koerper).not.toMatch(/renderRundeVierWarteschlange/);
  });
});

describe('FEATURE-017 Regressionsschutz AK5: Neu ankommende Elemente erscheinen automatisch, ohne manuelles Neuladen — über den bestehenden Firestore-Listener (erwartungsgemäß bereits GRÜN, unverändert von diesem Fix)', () => {
  test('Gegeben der elemente-Collection-Listener aktualisiert aktuelleElementeListe bei jeder Änderung, wenn der Quelltext des Listeners durchsucht wird, dann ruft er im selben Snapshot-Handler unmittelbar danach weiterhin renderRundeVier(db, code) auf — jede neu ankommende Karte löst dadurch automatisch ein Neuzeichnen (inkl. Warteschlange) aus', () => {
    const listenerStart = spielHtmlInhalt.indexOf("rundenRef.collection('elemente').onSnapshot(function (snapshot) {");
    expect(listenerStart).toBeGreaterThan(-1);

    const zuweisungIndex = spielHtmlInhalt.indexOf('aktuelleElementeListe = snapshot.docs.map(', listenerStart);
    expect(zuweisungIndex).toBeGreaterThan(-1);

    const umfeld = spielHtmlInhalt.slice(zuweisungIndex, zuweisungIndex + 400);
    expect(umfeld).toMatch(/renderRundeVier\(db,\s*code\)/);
  });
});

describe('FEATURE-017 Regressionsziel (Scope-Grenze): Die Änderungskette aktuelleElementeListe.filter(...).forEach(...) bleibt als Struktur von renderRundeVierWarteschlange() bestehen (kein Strukturumbau nötig)', () => {
  test('Gegeben die Analyse verlangt ausschließlich eine zusätzliche Filterbedingung, keinen Strukturumbau, wenn der Funktionskörper von renderRundeVierWarteschlange() durchsucht wird, dann iteriert er weiterhin über aktuelleElementeListe per .filter(...).forEach(...) (nicht z. B. über eine komplett neue, separate Datenquelle)', () => {
    const koerper = holeWarteschlangenFunktionskoerper();
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/aktuelleElementeListe\s*\n?\s*\.filter\(/);
    expect(koerper).toMatch(/\.forEach\(/);
  });
});
