/**
 * BUGFIX-011 – Bearbeitungszeit (Cycle Time) wird in Runde 4 nie berechnet
 * BDD-Tests (flow-game-bdd, 2026-07-30) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-011").
 *
 * Root Cause (bereits code-verifiziert in der Spec, hier erneut am frisch
 * geklonten Repo bestätigt, HEAD 2b4d45c): `public/js/game/rundeVier.js`
 * ruft nach einem Würfel-Erfolg (`gibElementWeiter()` in
 * `schliesseRundeVierWurfAb()`, public/spiel.html) oder einem Städte-Eintrag
 * (Submit-Handler des Städte-Formulars, ebenfalls public/spiel.html)
 * nirgends `window.FlowGame.starteBearbeitungszeitFallsNoetig()` auf – anders
 * als der Kartenzug-Erfolgspfad der Runden 1–3 (public/spiel.html, real
 * geprüft: derselbe Aufruf existiert dort direkt nach `bewegeKarte()`).
 * Freigegebene Lösung (Option A, einzige Option): denselben Guard + Aufruf
 * an beiden Runde-4-Erfolgsstellen ergänzen:
 *   if (!aktuelleRundenDaten.bearbeitungszeitStart) {
 *     window.FlowGame.starteBearbeitungszeitFallsNoetig({
 *       code, rundenNummer: aktuelleRundenNummer, bearbeitungszeitBereitsGesetzt: false,
 *     }, db).catch(...);
 *   }
 *
 * Gleiches Testmuster wie tests/game-drag-drop.static.test.js (FEATURE-008)
 * bzw. tests/game-join-precedence.static.test.js: kein neues Modul, kein
 * Firestore-Emulator, kein DOM/jsdom (nicht im Projekt vorhanden) – liest den
 * echten, bestehenden Quelltext von public/spiel.html und prüft per
 * Mustersuche, ob die geforderte Ergänzung bereits enthalten ist. Framework:
 * Jest + Node "fs".
 *
 * Die Muster sind bewusst allgemein genug formuliert (Guard-Bedingung +
 * Funktionsaufruf im jeweiligen Erfolgspfad-Umfeld, nicht eine exakte
 * Zeilenform), damit eine spätere, sinnvolle Extraktion in eine gemeinsame
 * Hilfsfunktion nicht automatisch einen Teil dieser Tests fälschlich rot
 * laufen lässt (siehe flow-game-bdd-Skill, Abschnitt 3b, BUGFIX-002-Retro).
 *
 * AK3 (echte Bearbeitungszeit > 0 in der Auswertung) wird NICHT erneut als
 * eigene Text-Musterprüfung gegen spiel.html geschrieben, weil die
 * Berechnung selbst (`berechneKennzahlen()`, src/game/kennzahlen.js) bereits
 * heute korrekt rechnet, sobald Start UND Ende numerisch vorliegen (Root
 * Cause der Spec, Punkt 5) – das ist kein Teil des Bugs. Stattdessen wird
 * hier ein Logik-Regressionsnachweis geführt: die bereits bestehende,
 * generische Funktion liefert für einen simulierten Runde-4-Fall (Start +
 * Ende gesetzt) tatsächlich `bearbeitungszeit > 0`. Das belegt, dass nach dem
 * Fix (sobald bearbeitungszeitStart in Runde 4 tatsächlich gesetzt wird)
 * keine zusätzliche Änderung an der Berechnung selbst nötig ist.
 *
 * WICHTIG – bewusst RED: Die Szenarien 1–4 schlagen jetzt tatsächlich fehl
 * (echte Assertion-Fehlschläge), weil BUGFIX-011 noch nicht implementiert
 * ist – `starteBearbeitungszeitFallsNoetig(` kommt in `public/spiel.html`
 * heute (Commit 2b4d45c) nur genau einmal vor (Kartenzug-Erfolgspfad Runden
 * 1–3), an keiner der beiden Runde-4-Erfolgsstellen. Szenario 5 (AK3,
 * Logik-Regressionsnachweis) und die Regressionstests (Szenario 6) sind
 * dagegen bewusst schon JETZT GRÜN.
 */

const fs = require('fs');
const path = require('path');

const { berechneKennzahlen } = require('../src/game/kennzahlen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

// Guard+Aufruf-Muster, wie es der Kartenzug-Erfolgspfad der Runden 1-3
// bereits nutzt - bewusst allgemein (kein Whitespace-/Zeilenumbruch-exaktes
// Muster), damit eine spätere Extraktion in eine gemeinsame Hilfsfunktion
// diesen Test nicht faelschlich rot laufen laesst (siehe Kopfkommentar).
//
// WICHTIG: verlangt einen Punkt direkt vor dem Funktionsnamen (echter Aufruf
// als Methode, z.B. `window.FlowGame.starteBearbeitungszeitFallsNoetig(`),
// damit die bereits bestehende KOMMENTAR-Erwähnung dieses Funktionsnamens
// (public/spiel.html, Zeile ~1603: "// starteBearbeitungszeitFallsNoetig()
// weiter unten" im Umfeld von meldeFehlversuch()) nicht fälschlich als
// echter Aufruf gezählt wird (real code-verifiziert: genau 1 Kommentar-Fund
// + 1 echter Aufruf im heutigen, unveränderten Kartenzug-Pfad).
const AUFRUF_MUSTER = /\.starteBearbeitungszeitFallsNoetig\(/;
const GUARD_UND_AUFRUF_MUSTER = /if\s*\(\s*!aktuelleRundenDaten\.bearbeitungszeitStart\s*\)\s*\{[^}]*\.starteBearbeitungszeitFallsNoetig\(/;

function alleEchtenAufrufIndices() {
  const indices = [];
  let suchStart = 0;
  for (;;) {
    const idx = spielHtmlInhalt.indexOf('starteBearbeitungszeitFallsNoetig(', suchStart);
    if (idx === -1) break;
    // Nur echte Aufrufe zählen (Punkt unmittelbar davor), nicht die
    // bestehende Kommentar-Erwähnung.
    if (spielHtmlInhalt[idx - 1] === '.') indices.push(idx);
    suchStart = idx + 1;
  }
  return indices;
}

function ausschnittAbIndex(startIndex, laenge) {
  if (startIndex === -1) return '';
  return spielHtmlInhalt.slice(startIndex, startIndex + laenge);
}

describe('Szenario: Bearbeitungszeit startet beim allerersten Würfel-Erfolg in Runde 4 (AK1, Würfel-Pfad)', () => {
  test('Gegeben Runde 4 läuft und DoR ist abgeschlossen, wenn der Quelltext von schliesseRundeVierWurfAb() im Würfel-Erfolgspfad (nach dem erfolgreichen gibElementWeiter()-Aufruf) durchsucht wird, dann folgt derselbe Guard + Aufruf wie beim Kartenzug-Button der Runden 1-3', () => {
    const funktionsStart = spielHtmlInhalt.indexOf('async function schliesseRundeVierWurfAb(');
    expect(funktionsStart).toBeGreaterThan(-1);

    const erfolgspfadStart = spielHtmlInhalt.indexOf('istWurfErfolgreich(wert)', funktionsStart);
    expect(erfolgspfadStart).toBeGreaterThan(-1);

    // Umfeld ab dem Erfolgsfall bis zum Ende der Funktion (grosszügig
    // bemessen, damit der tatsächliche Ort der Implementierung - direkt nach
    // gibElementWeiter() oder am Ende des try-Blocks - nicht vorweggenommen
    // wird).
    const umfeld = ausschnittAbIndex(erfolgspfadStart, 1200);
    expect(GUARD_UND_AUFRUF_MUSTER.test(umfeld)).toBe(true);
  });
});

describe('Szenario: Bearbeitungszeit startet auch beim allerersten Städte-Eintrag in Runde 4, unabhängig vom Würfel-Pfad (AK1, Städte-Pfad, Pre-Mortem-Risiko 3)', () => {
  test('Gegeben Runde 4 läuft und DoR ist abgeschlossen, wenn der Quelltext des Submit-Handlers des Städte-Formulars (rv-stadt-form, nach dem erfolgreichen gibElementWeiter()-Aufruf) durchsucht wird, dann folgt ebenfalls derselbe Guard + Aufruf', () => {
    const formularStart = spielHtmlInhalt.indexOf("form.className = 'rv-stadt-form'");
    expect(formularStart).toBeGreaterThan(-1);

    const submitHandlerStart = spielHtmlInhalt.indexOf("form.addEventListener('submit'", formularStart);
    expect(submitHandlerStart).toBeGreaterThan(-1);

    const gibElementWeiterAufruf = spielHtmlInhalt.indexOf('gibElementWeiter(', submitHandlerStart);
    expect(gibElementWeiterAufruf).toBeGreaterThan(-1);

    const umfeld = ausschnittAbIndex(submitHandlerStart, 1200);
    expect(GUARD_UND_AUFRUF_MUSTER.test(umfeld)).toBe(true);
  });
});

describe('Szenario: Beide Runde-4-Erfolgspfade sind unabhängig voneinander abgesichert, nicht nur einer (Pre-Mortem-Risiko 3, Vollständigkeits-Regressionsschutz)', () => {
  test('Gegeben beide Aufrufstellen sollen im selben Commit ergänzt werden, wenn gezählt wird, wie oft `starteBearbeitungszeitFallsNoetig(` als ECHTER Aufruf (nicht die bestehende Kommentar-Erwähnung) insgesamt in public/spiel.html vorkommt, dann sind es mindestens 3 (die bestehende Runde-1-3-Stelle PLUS mindestens je eine neue Stelle für Würfel- und Städte-Pfad in Runde 4)', () => {
    const anzahlEchterAufrufe = alleEchtenAufrufIndices().length;
    expect(anzahlEchterAufrufe).toBeGreaterThanOrEqual(3);
  });
});

describe('Szenario: Der einmal gesetzte Startzeitpunkt der Bearbeitungszeit wird nie überschrieben (AK2, Guard-Bedingung an beiden Runde-4-Stellen statt eines unbedingten Aufrufs)', () => {
  test('Gegeben bearbeitungszeitStart ist in Runde 4 bereits gesetzt, wenn beide neuen Aufrufstellen im Quelltext geprüft werden, dann steht vor jedem der beiden Aufrufe die Bedingung `if (!aktuelleRundenDaten.bearbeitungszeitStart)` statt eines unbedingten Aufrufs', () => {
    // Regressionsschutz gegen eine "einfachere", aber falsche Umsetzung, die
    // den Aufruf ohne Guard direkt nach jedem Erfolg absetzen würde (würde
    // AK2 verletzen: jeder weitere Fortschritt würde versuchen, einen neuen
    // Zeitstempel zu schreiben statt den ersten stehen zu lassen).
    const alleAufrufIndices = alleEchtenAufrufIndices();
    // Erwartet: bestehende Runde-1-3-Stelle (bereits vorhanden, geguarded)
    // PLUS mindestens zwei neue Runde-4-Stellen, ALLE geguarded.
    expect(alleAufrufIndices.length).toBeGreaterThanOrEqual(3);

    alleAufrufIndices.forEach((idx) => {
      const davor = spielHtmlInhalt.slice(Math.max(0, idx - 250), idx);
      const hatGuardDavor = /if\s*\(\s*!aktuelleRundenDaten\.bearbeitungszeitStart\s*\)\s*\{[^{}]*$/.test(davor);
      expect(hatGuardDavor).toBe(true);
    });
  });
});

describe('Szenario: Auswertung zeigt eine echte Bearbeitungszeit größer 0, sobald Start und Ende der Bearbeitungszeit vorliegen (AK3, Logik-Regressionsnachweis - bereits GRÜN)', () => {
  test('Gegeben eine simulierte Runde 4, in der mindestens ein Fortschritt gelang und dadurch bearbeitungszeitStart gesetzt wurde, wenn berechneKennzahlen() mit einem numerischen bearbeitungszeitStart und einem späteren bearbeitungszeitEnde aufgerufen wird, dann ist das Ergebnisfeld bearbeitungszeit eine Zahl größer 0', async () => {
    const bearbeitungszeitStart = 1_000_000;
    const bearbeitungszeitEnde = 1_460_000; // 7:40 min später, wie im real beobachteten Testlauf

    const ergebnis = await berechneKennzahlen({
      bewegungen: [], stationen: [], lieferungen: [], rundenStart: 0,
      durchlaufzeitStart: bearbeitungszeitStart, durchlaufzeitEnde: bearbeitungszeitEnde,
      bearbeitungszeitStart, bearbeitungszeitEnde,
    });

    expect(typeof ergebnis.bearbeitungszeit).toBe('number');
    expect(Number.isNaN(ergebnis.bearbeitungszeit)).toBe(false);
    expect(ergebnis.bearbeitungszeit).toBeGreaterThan(0);
    expect(ergebnis.bearbeitungszeit).toBe(bearbeitungszeitEnde - bearbeitungszeitStart);
  });

  test('Gegeben bearbeitungszeitStart ist (Leerzustand, Runde-4-Instanz ohne jeden Fortschritt) weiterhin null, wenn berechneKennzahlen() aufgerufen wird, dann bleibt das Ergebnisfeld bearbeitungszeit unberechnet (kein Fehler, kein falscher Wert) - identisch zum bereits akzeptierten Verhalten der Runden 1-3', async () => {
    const ergebnis = await berechneKennzahlen({
      bewegungen: [], stationen: [], lieferungen: [], rundenStart: 0,
      durchlaufzeitStart: 0, durchlaufzeitEnde: 460_000,
      bearbeitungszeitStart: null, bearbeitungszeitEnde: null,
    });

    expect(ergebnis.bearbeitungszeit).toBeUndefined();
  });
});

describe('Szenario: Runde-1-3-Kartenzug-Erfolgspfad bleibt durch diesen Fix vollständig unverändert (AK4, Regressionsschutz)', () => {
  test('Gegeben der bestehende Kartenzug-Erfolgspfad der Runden 1-3 (bewegeKarte() gefolgt vom bestehenden Guard + Aufruf), wenn der Quelltext geprüft wird, dann existiert diese Stelle weiterhin unverändert', () => {
    const bewegeKarteAufruf = spielHtmlInhalt.indexOf('await window.FlowGame.bewegeKarte(');
    expect(bewegeKarteAufruf).toBeGreaterThan(-1);

    const umfeld = ausschnittAbIndex(bewegeKarteAufruf, 600);
    expect(GUARD_UND_AUFRUF_MUSTER.test(umfeld)).toBe(true);
  });
});
