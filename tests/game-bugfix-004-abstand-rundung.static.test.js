/**
 * BUGFIX-004 – Darstellungs-Rundungsfehler bei „Abstand erste↔letzte
 * Lieferung“
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die fünf Akzeptanzkriterien der
 * von Stephan freigegebenen Analyse-Spec (Backlog.md, "### BUGFIX-004",
 * Abschnitt "Akzeptanzkriterien", Option A / 🟢 Grün).
 *
 * Option A (empfohlen, freigegeben): "Bis 1. Lieferung" und "Bis letzter
 * Lieferung" bleiben unverändert bei formatiereZeit(ms) (unabhängiges
 * Math.floor(ms/1000)). NUR die Anzeige von "Abstand 1.↔letzte Lieferung"
 * wird geändert: statt die ROHE Millisekunden-Differenz
 * (runde.abstandErsteLetzteLieferung) separat zu runden, wird der Abstand
 * aus der Differenz der beiden BEREITS gerundeten Sekundenwerte gebildet.
 * Der exakte, servergesetzte Millisekunden-Wert in Firestore bleibt
 * unverändert (AK5) – ausschließlich die Anzeige in public/spiel.html ändert
 * sich.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, analog zum
 * Vorgehen bei BUGFIX-007 – der exakte Name ist ein Implementierungsdetail,
 * sollte aber mit flow-game-impl abgeglichen werden): Die Analyse-Spec
 * selbst schlägt bereits als Beispiel `formatiereAbstand(ersteMs, letzteMs)`
 * vor (Option A, Ticket-Text). Diese Tests extrahieren die Funktion daher
 * unter genau diesem Namen. Referenziert flow-game-impl stattdessen einen
 * anderen Funktionsnamen, muss ausschließlich der Anker-String unten
 * (EXTRAKTIONS-KONSTANTEN) mechanisch angepasst werden – keine Erwartung/
 * kein Testwert darf sich dadurch ändern (siehe flow-game-bdd, Abschnitt 4a).
 *
 * TESTANSATZ: Zwei Ebenen, wie in diesem Projekt etabliert (kein DOM/jsdom,
 * siehe package.json devDependencies):
 *   1. Echte AUSFÜHRBARE Logik-Prüfung der neuen, reinen Hilfsfunktion
 *      formatiereAbstand() – Klammer-balanciert aus dem echten Quelltext von
 *      public/spiel.html extrahiert und per new Function(...) tatsächlich
 *      ausgeführt (analog zu formatiereZeit() in game-bugfix-007...).
 *   2. Strukturelle Textmuster-Prüfung der beiden betroffenen Aufrufstellen
 *      (zeigeKennzahlen(), Zeile ~2745–2747; renderVergleichsTabelle(),
 *      Zeile ~2608–2610), dass dort tatsächlich die neue Hilfsfunktion mit
 *      den beiden Lieferzeitpunkten aufgerufen wird statt weiterhin
 *      formatiereZeit(runde.abstandErsteLetzteLieferung) bzw.
 *      formatiereZeit(r.abstandErsteLetzteLieferung).
 *
 * WICHTIG – bewusst RED beim ersten Lauf: formatiereAbstand() existiert
 * heute (code-verifiziert, Analyse-Spec) nicht im Quelltext; beide
 * Aufrufstellen lesen weiterhin runde.abstandErsteLetzteLieferung bzw.
 * r.abstandErsteLetzteLieferung direkt über formatiereZeit(). Entsprechend
 * schlagen ALLE Szenarien zu AK1/AK2 (inkl. Grenzfall Minutenwechsel) sowie
 * die beiden strukturellen Aufrufstellen-Tests jetzt tatsächlich fehl. Die
 * Regressionsschutz-Szenarien (AK3/AK4 bereits heute "00:00", AK5 exakter
 * Millisekundenwert/Formel unverändert) sind dagegen bewusst schon JETZT
 * GRÜN, weil sie unverändertes Bestandsverhalten absichern.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden).
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const NODE_KENNZAHLEN_PFAD = path.join(__dirname, '..', 'src', 'game', 'kennzahlen.js');
const nodeKennzahlenInhalt = fs.readFileSync(NODE_KENNZAHLEN_PFAD, 'utf8');
const BROWSER_KENNZAHLEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'game', 'kennzahlen.js');
const browserKennzahlenInhalt = fs.readFileSync(BROWSER_KENNZAHLEN_PFAD, 'utf8');

// ---------------------------------------------------------------------------
// EXTRAKTIONS-KONSTANTEN – hier mechanisch anpassen, falls flow-game-impl
// einen anderen Funktionsnamen wählt als den in der Analyse-Spec
// vorgeschlagenen (siehe Kopfkommentar, Namensgebung).
// ---------------------------------------------------------------------------
const NEUE_HILFSFUNKTION_ANKER = 'function formatiereAbstand(ersteMs, letzteMs) {';

// ---------------------------------------------------------------------------
// Extraktions-Helfer (analog zu game-bugfix-007-durchlaufzeit-anzeige.static.test.js)
// ---------------------------------------------------------------------------

function extrahiereFunktion(anker) {
  const start = spielHtmlInhalt.indexOf(anker);
  expect(start).toBeGreaterThan(-1); // Anker muss im echten Quelltext existieren
  const ersteKlammer = spielHtmlInhalt.indexOf('{', start);
  expect(ersteKlammer).toBeGreaterThan(-1);
  let tiefe = 0;
  let i = ersteKlammer;
  for (; i < spielHtmlInhalt.length; i++) {
    if (spielHtmlInhalt[i] === '{') tiefe++;
    else if (spielHtmlInhalt[i] === '}') {
      tiefe--;
      if (tiefe === 0) { i++; break; }
    }
  }
  expect(tiefe).toBe(0); // Klammern müssen sich schließen, sonst kaputter Ausschnitt
  return spielHtmlInhalt.slice(start, i);
}

function baueFormatiereZeitAusfuehrbar() {
  const quelltext = extrahiereFunktion('function formatiereZeit(ms) {');
  return new Function('ms', `${quelltext}\nreturn formatiereZeit(ms);`);
}
const formatiereZeit = baueFormatiereZeitAusfuehrbar();

function baueFormatiereAbstandAusfuehrbar() {
  const quelltext = extrahiereFunktion(NEUE_HILFSFUNKTION_ANKER);
  return new Function('ersteMs', 'letzteMs', `${quelltext}\nreturn formatiereAbstand(ersteMs, letzteMs);`);
}

function zeigeKennzahlenKoerper() {
  return extrahiereFunktion('function zeigeKennzahlen(runde) {');
}

function renderVergleichsTabelleKoerper() {
  return extrahiereFunktion('function renderVergleichsTabelle(container, vergleich) {');
}

// ---------------------------------------------------------------------------
// AK1/AK2 (Kernlogik): formatiereAbstand() bildet die Differenz der bereits
// gerundeten Sekundenwerte, nicht die separat gerundete rohe ms-Differenz.
// ---------------------------------------------------------------------------
describe('Szenario: Neue Hilfsfunktion formatiereAbstand() liefert die Differenz der bereits gerundeten Anzeigewerte (AK1, Kernlogik)', () => {
  test.each([
    // [ersteMs, letzteMs, erwarteterAbstandsText, beschreibung]
    [371900, 374200, '00:03', 'Original-Beispiel aus dem Ticket (06:11 → 06:14, heute fälschlich 00:02)'],
    [59800, 60300, '00:01', 'Grenzfall Minutenwechsel (00:59 → 01:00, heute fälschlich 00:00, Pre-Mortem Risiko 3)'],
    [100000, 163000, '01:03', 'Fall, in dem alte und neue Rechnung ohnehin übereinstimmen (Regressionsschutz für den Normalfall)'],
  ])('Gegeben erste Lieferung bei %i ms und letzte Lieferung bei %i ms (%s), wenn der Abstand formatiert wird, dann lautet er "%s"', (ersteMs, letzteMs, erwartet) => {
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();
    expect(formatiereAbstand(ersteMs, letzteMs)).toBe(erwartet);
  });

  test('Gegeben dieselben Ausgangswerte wie das Original-Beispiel, wenn "Bis 1. Lieferung" und "Bis letzter Lieferung" unabhängig mit formatiereZeit() gerundet und danach in Sekunden voneinander abgezogen werden, dann ergibt das exakt denselben Text wie formatiereAbstand() – die zentrale optische Konsistenzbedingung aus AK1', () => {
    const ersteMs = 371900;
    const letzteMs = 374200;
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();

    const parseSekunden = (mmss) => {
      const [minuten, sekunden] = mmss.split(':').map(Number);
      return minuten * 60 + sekunden;
    };
    const differenzDerAnzeigewerte = parseSekunden(formatiereZeit(letzteMs)) - parseSekunden(formatiereZeit(ersteMs));
    const angezeigterAbstand = parseSekunden(formatiereAbstand(ersteMs, letzteMs));

    expect(angezeigterAbstand).toBe(differenzDerAnzeigewerte);
  });

  test('Gegeben denselben Minutenwechsel-Grenzfall, wenn dieselbe Konsistenzbedingung geprüft wird, dann gilt sie auch über die Minutengrenze hinweg (Pre-Mortem Risiko 3)', () => {
    const ersteMs = 59800;
    const letzteMs = 60300;
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();

    const parseSekunden = (mmss) => {
      const [minuten, sekunden] = mmss.split(':').map(Number);
      return minuten * 60 + sekunden;
    };
    const differenzDerAnzeigewerte = parseSekunden(formatiereZeit(letzteMs)) - parseSekunden(formatiereZeit(ersteMs));
    const angezeigterAbstand = parseSekunden(formatiereAbstand(ersteMs, letzteMs));

    expect(angezeigterAbstand).toBe(differenzDerAnzeigewerte);
  });

  test('Polaritäts-Test (Abschnitt 3 des Skills): Gegeben das Original-Beispiel, wenn NICHT die neue Ableitung, sondern weiterhin die heutige, unabhängig gerundete rohe ms-Differenz verwendet würde, dann wäre das Ergebnis "00:02" – also NICHT das, was formatiereAbstand() liefern muss. Grenzt den Fix positiv von der reinen Bestandslogik ab.', () => {
    const ersteMs = 371900;
    const letzteMs = 374200;
    const heutigeFehlerhafteAnzeige = formatiereZeit(letzteMs - ersteMs); // = formatiereZeit(2300) = '00:02'
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();

    expect(heutigeFehlerhafteAnzeige).toBe('00:02');
    expect(formatiereAbstand(ersteMs, letzteMs)).not.toBe(heutigeFehlerhafteAnzeige);
    expect(formatiereAbstand(ersteMs, letzteMs)).toBe('00:03');
  });
});

// ---------------------------------------------------------------------------
// AK3: Grenzfall genau eine Lieferung (bzw. mehrere im exakt selben Moment)
// – weiterhin "00:00", unverändert zum heutigen Verhalten.
// ---------------------------------------------------------------------------
describe('Szenario: Genau eine Lieferung bzw. mehrere Lieferungen im selben Moment (AK3, Regressionsschutz)', () => {
  test('Gegeben erste === letzte (z. B. genau eine Lieferung in der Runde), wenn der Abstand formatiert wird, dann zeigt er weiterhin "00:00"', () => {
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();
    expect(formatiereAbstand(123456, 123456)).toBe('00:00');
  });

  test('Gegeben erste === letzte === 0 (Randfall Rundenstart), wenn der Abstand formatiert wird, dann zeigt er ebenfalls "00:00", kein negativer oder NaN-Wert', () => {
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();
    expect(formatiereAbstand(0, 0)).toBe('00:00');
  });
});

// ---------------------------------------------------------------------------
// AK4: Leerzustand – keine einzige Lieferung in der Runde, alle drei Werte
// zeigen weiterhin "00:00", kein "NaN:NaN".
// ---------------------------------------------------------------------------
describe('Szenario: Keine einzige Lieferung in der Runde (AK4, Leerzustand, Pre-Mortem Risiko 4)', () => {
  test('Gegeben runde.zeitBisErsterLieferung und runde.zeitBisLetzterLieferung sind beide undefined (kein Feld gesetzt, da lieferungen.length === 0 laut src/game/kennzahlen.js), wenn der Abstand formatiert wird, dann zeigt er "00:00", nicht "NaN:NaN"', () => {
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();
    expect(formatiereAbstand(undefined, undefined)).toBe('00:00');
    expect(formatiereAbstand(undefined, undefined)).not.toMatch(/NaN/);
  });

  test('Gegeben runde.zeitBisErsterLieferung und runde.zeitBisLetzterLieferung sind beide null, wenn der Abstand formatiert wird, dann zeigt er ebenfalls "00:00"', () => {
    const formatiereAbstand = baueFormatiereAbstandAusfuehrbar();
    expect(formatiereAbstand(null, null)).toBe('00:00');
  });
});

// ---------------------------------------------------------------------------
// AK1/AK2 an den beiden echten Aufrufstellen (Einzelrunden-Auswertung und
// Rundenvergleichs-Tabelle) – strukturelle Prüfung, da beide Funktionen
// DOM-lastig sind (kein jsdom im Projekt, siehe Testansatz Punkt 2).
// ---------------------------------------------------------------------------
describe('Szenario: Einzelrunden-Auswertung zeigeKennzahlen() nutzt die neue Ableitung für "Abstand" (AK1, Aufrufstelle)', () => {
  test('Gegeben der echte Quelltext von zeigeKennzahlen(), wenn die "Abstand 1.↔letzte Lieferung"-Zeile geprüft wird, dann wird sie NICHT mehr aus runde.abstandErsteLetzteLieferung über formatiereZeit() gerendert, sondern aus formatiereAbstand(runde.zeitBisErsterLieferung, runde.zeitBisLetzterLieferung) abgeleitet', () => {
    const koerper = zeigeKennzahlenKoerper();
    // Bug-Zustand heute: [t('kennzahlen.abstandLieferung'), runde.abstandErsteLetzteLieferung]
    // läuft durch denselben generischen formatiereZeit(eintrag[1])-Aufruf wie
    // die anderen beiden Zeilen. Der Fix darf runde.abstandErsteLetzteLieferung
    // an dieser Stelle nicht mehr für die ANZEIGE heranziehen.
    expect(koerper).toMatch(/formatiereAbstand\(\s*runde\.zeitBisErsterLieferung\s*,\s*runde\.zeitBisLetzterLieferung\s*\)/);
  });

  test('Gegeben denselben Quelltext, wenn geprüft wird, dass die beiden Ausgangswerte "Bis 1. Lieferung"/"Bis letzter Lieferung" NICHT verändert werden, dann stehen sie weiterhin unverändert bei formatiereZeit(runde.zeitBisErsterLieferung) bzw. formatiereZeit(runde.zeitBisLetzterLieferung) (Regressionsschutz, Pre-Mortem Risiko 5 – nur die dritte Zeile ändert sich)', () => {
    const koerper = zeigeKennzahlenKoerper();
    expect(koerper).toMatch(/runde\.zeitBisErsterLieferung/);
    expect(koerper).toMatch(/runde\.zeitBisLetzterLieferung/);
  });
});

describe('Szenario: Rundenvergleichs-Tabelle renderVergleichsTabelle() nutzt dieselbe neue Ableitung für "Abstand" (AK2, Aufrufstelle)', () => {
  test('Gegeben der echte Quelltext von renderVergleichsTabelle(), wenn die "Abstand"-Zeile (vergleich.abstandKundenerlebnis) geprüft wird, dann wird sie ebenfalls NICHT mehr aus r.abstandErsteLetzteLieferung über formatiereZeit() gerendert, sondern aus formatiereAbstand(r.zeitBisErsterLieferung, r.zeitBisLetzterLieferung) abgeleitet', () => {
    const koerper = renderVergleichsTabelleKoerper();
    const anker = "zeile(t('vergleich.abstandKundenerlebnis')";
    const start = koerper.indexOf(anker);
    expect(start).toBeGreaterThan(-1);
    const umfeld = koerper.slice(start, start + 160);
    expect(umfeld).toMatch(/formatiereAbstand\(\s*r\.zeitBisErsterLieferung\s*,\s*r\.zeitBisLetzterLieferung\s*\)/);
  });

  test('Gegeben denselben Quelltext, wenn die beiden Zeilen "Zeit bis 1. Lieferung"/"Zeit bis letzte Lieferung" geprüft werden, dann bleiben sie unverändert bei formatiereZeit(r.zeitBisErsterLieferung) bzw. formatiereZeit(r.zeitBisLetzterLieferung) (Regressionsschutz, wie in zeigeKennzahlen())', () => {
    const koerper = renderVergleichsTabelleKoerper();
    expect(koerper).toMatch(/zeile\(t\('vergleich\.zeitBisErsteLieferung'\),\s*function \(r\) \{\s*return formatiereZeit\(r\.zeitBisErsterLieferung\);\s*\}\)/);
    expect(koerper).toMatch(/zeile\(t\('vergleich\.zeitBisLetzteLieferung'\),\s*function \(r\) \{\s*return formatiereZeit\(r\.zeitBisLetzterLieferung\);\s*\}\)/);
  });

  test('Gegeben denselben Quelltext, wenn NUR die betroffene Zeile geprüft wird (nicht das gesamte restliche Tabellen-Markup), dann darf dort kein direktes formatiereZeit(r.abstandErsteLetzteLieferung) mehr im unmittelbaren Umfeld der Abstand-Zeile stehen (Polaritäts-Test, Abschnitt 3 des Skills – schließt die alte Fehlerquelle explizit aus statt nur den neuen Erfolgsfall isoliert zu prüfen)', () => {
    const koerper = renderVergleichsTabelleKoerper();
    const anker = "zeile(t('vergleich.abstandKundenerlebnis')";
    const start = koerper.indexOf(anker);
    expect(start).toBeGreaterThan(-1);
    const umfeld = koerper.slice(start, start + 160);
    expect(umfeld).not.toMatch(/formatiereZeit\(\s*r\.abstandErsteLetzteLieferung\s*\)/);
  });
});

// ---------------------------------------------------------------------------
// AK5: Der exakte, servergesetzte Millisekunden-Wert bleibt unverändert –
// nur die Anzeige ändert sich, nicht die Berechnung/Speicherung.
// ---------------------------------------------------------------------------
describe('Szenario: Der exakte, servergesetzte Millisekunden-Abstand bleibt unverändert (AK5, Scope-Abgrenzung/Regressionsschutz)', () => {
  test('Gegeben die Node-Referenz-Berechnung in src/game/kennzahlen.js, wenn ihr Quelltext geprüft wird, dann berechnet sie abstandErsteLetzteLieferung weiterhin exakt als "letzte - erste" (unveränderte rohe ms-Differenz), unberührt von diesem reinen Anzeige-Fix', () => {
    expect(nodeKennzahlenInhalt).toMatch(/abstandErsteLetzteLieferung\s*=\s*letzte\s*-\s*erste/);
  });

  test('Gegeben die Browser-Kopie derselben Berechnung, wenn ihr Quelltext geprüft wird, dann ist sie weiterhin identisch zur Node-Referenz (Node/Browser-Sync-Pflicht, unverändert durch dieses Ticket)', () => {
    expect(browserKennzahlenInhalt).toMatch(/abstandErsteLetzteLieferung\s*=\s*letzte\s*-\s*erste/);
  });

  test('Gegeben der neue Hilfsfunktions-Quelltext, wenn geprüft wird, ob er irgendeine Schreiboperation (Firestore/setDoc/updateDoc) enthält, dann enthält er keine – die neue Funktion ist rein lesend/darstellend und verändert nie den gespeicherten Wert', () => {
    const formatiereAbstandQuelltext = extrahiereFunktion(NEUE_HILFSFUNKTION_ANKER);
    expect(formatiereAbstandQuelltext).not.toMatch(/setDoc|updateDoc|\.set\(|\.update\(/);
  });
});

// ---------------------------------------------------------------------------
// Pre-Mortem Risiko 5: formatiereZeit() selbst bleibt global unverändert –
// der Fix darf NICHT die bestehende, an 11 Stellen genutzte Basisfunktion
// verändern (u. a. die live tickenden Timer aus BUGFIX-007), sondern nur an
// den zwei betroffenen Abstand-Aufrufstellen eine zusätzliche, neue
// Hilfsfunktion einführen.
// ---------------------------------------------------------------------------
describe('Szenario: formatiereZeit() selbst bleibt unverändert (Pre-Mortem Risiko 5, Regressionsschutz gegen BUGFIX-007)', () => {
  test('Gegeben der bestehende Quelltext von formatiereZeit(ms), wenn er geprüft wird, dann rundet er weiterhin unabhängig per Math.floor(ms / 1000) auf ganze Sekunden – keine neue "Differenz aus zwei Werten"-Logik ist in formatiereZeit() selbst eingebaut worden', () => {
    const koerper = extrahiereFunktion('function formatiereZeit(ms) {');
    expect(koerper).toMatch(/Math\.floor\(ms \/ 1000\)/);
    expect(koerper).not.toMatch(/formatiereAbstand/);
  });

  test('Gegeben dieselbe Funktion, wenn ihre Signatur geprüft wird, dann nimmt sie weiterhin genau einen Parameter (ms) entgegen, nicht zwei (erste/letzte) – ein globaler Umbau der Basisfunktion hätte die Signatur zwangsläufig verändert', () => {
    expect(spielHtmlInhalt).toMatch(/function formatiereZeit\(ms\) \{/);
  });
});
