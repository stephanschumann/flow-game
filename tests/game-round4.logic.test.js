/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel) — Spiellogik
 *
 * Given/When/Then-Testfälle für die serverautoritative Referenzlogik: Erzeugen
 * der zwölf Elemente in fester alternierender Startreihenfolge, Zeitmessung,
 * Kettenfortschritt/Wechselzwang/FIFO als reine Referenzimplementierung
 * (die eigentliche Server-Autorität sitzt wie bei FEATURE-002/003 in
 * `firestore.rules`, siehe tests/game-round4.security.rules.test.js), die
 * nachträgliche Qualitätsauswertung (Land-/Stadt-Prüfung + Duplikat-Erkennung)
 * und die Erweiterung der Vergleichsansicht. Gleiches Testmuster wie
 * FEATURE-002/003 (tests/game-round.logic.test.js, tests/game-evaluation.logic.test.js).
 *
 * Diese Tests erwarten NEUE Module, die ERST in `flow-game-impl` entstehen
 * (Pfade sind eine NAMENSGEBUNG-Annahme dieser BDD-Phase, siehe Kopf von
 * tests/game-round4.security.rules.test.js für die begründete Festlegung
 * "eine gemeinsame Unterkollektion mit Typ-Feld" statt zwei getrennter —
 * bitte mit flow-game-impl abgleichen statt stillschweigend zu ignorieren):
 *
 *   - src/game/rundeVier/elemente.js       – erzeugeElemente(): 12 Elemente,
 *                                             feste alternierende Reihenfolge
 *                                             (geklärte Frage 7), Land-Zuordnung
 *                                             an Länderkarten (geklärte Frage 6).
 *   - src/game/rundeVier/elementBewegung.js – bewegeElement(): Kettenfortschritt
 *                                             + Wechselzwang + FIFO als
 *                                             Referenzlogik (Node-seitig,
 *                                             ohne Firestore-Instanz, analog
 *                                             src/game/kartenBewegung.js).
 *   - src/game/rundeVier/rundenEnde.js      – pruefeRundenEndeRundeVier():
 *                                             alle 12 Elemente "fertig bei
 *                                             Spieler 5" (AK 4, AK 15).
 *   - src/game/rundeVier/qualitaetsauswertung.js – berechneQualitaet():
 *                                             nachträgliche, deterministische
 *                                             Land-/Stadt-Prüfung + Duplikat-
 *                                             Erkennung über alle sechs Karten
 *                                             (Pre-Mortem-Risiko 1, AK 12/13/15/16).
 *   - src/game/rundeVier/wuerfelLogik.js    – istWurfErfolgreich(): reine
 *                                             ">3"-Regel als testbare Funktion,
 *                                             unabhängig von der rein
 *                                             clientseitigen Zufallserzeugung
 *                                             selbst (AK 10).
 *
 * Bereits BESTEHENDE, NICHT anzufassende Module (FEATURE-002/003 – werden hier
 * nur zum Regressions-/Wiederverwendungsnachweis importiert, siehe Abschnitt
 * ganz unten):
 *   - src/game/kennzahlen.js
 *   - src/game/vergleichsansicht.js
 *
 * WICHTIG: Die Tests, die die NEUEN Runde-4-Module aufrufen, sind zum
 * Zeitpunkt des Schreibens ERWARTUNGSGEMÄSS ROT (Module existieren noch
 * nicht — require() schlägt fehl, die betroffene Funktion bleibt undefined
 * und ihr Aufruf wirft "... is not a function"). Das ist der gewünschte
 * "Red"-Zustand vor `flow-game-impl`. Die Tests im letzten Abschnitt
 * ("Wiederverwendungsnachweis") importieren dagegen ausschließlich bereits
 * bestehende, fertige FEATURE-003-Module und sind deshalb bewusst schon JETZT
 * GRÜN — sie belegen, dass die in der Spec behauptete Erweiterbarkeit ohne
 * Strukturumbau real funktioniert, nicht nur behauptet wird.
 *
 * NACHTRAG (flow-game-bdd, BUGFIX-009, 2026-07-27, Spec von Stephan
 * freigegeben): Die Ziehungslogik in erzeugeElemente() (Node-Referenz) UND im
 * Browser-Produktivcode (public/js/game/rundeVier.js, starteRundeVier())
 * zieht bislang jedes der sechs Länder unabhängig UND MIT Zurücklegen aus der
 * 8-Länder-Liste (ca. 92 % Dubletten-Wahrscheinlichkeit pro Rundenstart).
 * Freigegebene Lösung: Ziehung OHNE Zurücklegen (Fisher-Yates-Shuffle der
 * 8-Länder-Liste, erste 6 Elemente verwenden), identisch in BEIDEN Dateien.
 * Zusätzlich (Freigabe-Entscheidung 2, AK5): eine "Karte X von 6"-Anzeige in
 * public/spiel.html, unabhängig vom Land. Die neuen Testfälle dazu stehen am
 * Ende dieser Datei (BUGFIX-009-Abschnitte) und sind zum Zeitpunkt des
 * Schreibens ERWARTUNGSGEMÄSS ROT (Ziehungslogik/Anzeige noch nicht
 * geändert) — mit Ausnahme des explizit als "bereits GRÜN" markierten
 * Regressionsschutz-Tests.
 *
 * NACHTRAG (flow-game-bdd, FEATURE-019, 2026-07-27, Spec von Stephan
 * freigegeben — Detaildarstellung ohne Namen, als Tabelle, mit ALLEN
 * Einträgen statt nur den fehlerhaften): Die Qualitätsauswertung
 * (berechneQualitaet(), oben) liefert bereits heute in `proKarte` alles
 * fachlich Nötige (Land, Stadt, Wertung je Eintrag), verwirft es aber im
 * bestehenden Rundenende-Schreibvorgang (public/js/game/rundeVier.js,
 * pruefeUndSetzeRundenEndeRundeVier()) vollständig, bevor irgendetwas
 * gespeichert wird — siehe "Zentraler Befund der Code-Verifikation" im
 * FEATURE-019-Abschnitt von Backlog.md. Dieses Ticket ist damit überwiegend
 * eine Anzeige-/Persistenz-Erweiterung, keine neue Berechnungslogik.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, da die Spec
 * bewusst nur beobachtbares Verhalten + grobe Architektur beschreibt, siehe
 * "Betroffene Architektur" im FEATURE-019-Abschnitt): Für die Aufbereitung
 * der rohen `proKarte`-Struktur zu anzeige-/persistenzfertigen Tabellenzeilen
 * (Land, Stadt, Wertung, Fehlergründe — OHNE das `von`-Feld der eintragenden
 * Person, siehe Frage 1/Pre-Mortem-Risiko 1) wird ein neues, eigenständig
 * testbares Node-Referenzmodul angenommen, analog zum bestehenden Muster
 * (qualitaetsauswertung.js, vergleichsansicht.js):
 *
 *   - src/game/rundeVier/detailliste.js – bereiteDetailzeilenVor({ proKarte }):
 *       liefert eine flache Liste von Zeilen { land, stadt, wertung, gruende }
 *       über ALLE Einträge aller Karten hinweg (AK 1, AK 8, AK 11), ohne
 *       `von`/`am` aus den Rohdaten zu übernehmen (Frage 1, ohne Namen).
 *       `gruende` ist ein Array ('falschesLand'/'dublette', beide bei
 *       gleichzeitigem Fehler, leer bei 'korrekt') — Grundlage für AK 2/3/4.
 *
 * Falls flow-game-impl einen anderen Modulnamen/eine andere Rückgabeform
 * wählt, bitte diese Tests entsprechend anpassen statt sie stillschweigend zu
 * ignorieren (gleiches Vorgehen wie beim NAMENSGEBUNG-Hinweis oben für die
 * FEATURE-004-Module). Die neuen FEATURE-019-Testfälle stehen als eigene
 * Abschnitte am Ende dieser Datei und sind zum Zeitpunkt des Schreibens
 * ERWARTUNGSGEMÄSS ROT — mit Ausnahme der explizit als "bereits GRÜN"
 * markierten Wiederverwendungsnachweise gegen die bestehende
 * berechneQualitaet().
 */

function ladeOderUndefined(pfad, exportName) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const modul = require(pfad);
    return modul[exportName];
  } catch (fehler) {
    return undefined;
  }
}

const erzeugeElemente = ladeOderUndefined('../src/game/rundeVier/elemente', 'erzeugeElemente');
const bewegeElement = ladeOderUndefined('../src/game/rundeVier/elementBewegung', 'bewegeElement');
const pruefeRundenEndeRundeVier = ladeOderUndefined('../src/game/rundeVier/rundenEnde', 'pruefeRundenEndeRundeVier');
const berechneQualitaet = ladeOderUndefined('../src/game/rundeVier/qualitaetsauswertung', 'berechneQualitaet');
const istWurfErfolgreich = ladeOderUndefined('../src/game/rundeVier/wuerfelLogik', 'istWurfErfolgreich');

// FEATURE-019 (flow-game-bdd, 2026-07-27): neues Modul, siehe NACHTRAG/
// NAMENSGEBUNG oben — existiert erst nach flow-game-impl.
const bereiteDetailzeilenVor = ladeOderUndefined('../src/game/rundeVier/detailliste', 'bereiteDetailzeilenVor');

// Bereits bestehende, fertige FEATURE-003-Module — bewusst NICHT über
// ladeOderUndefined() geladen, weil ihr Fehlen ein echter Regressions-Fehler
// wäre (anders als die neuen Runde-4-Module oben), kein erwartetes Rot.
const { berechneKennzahlen } = require('../src/game/kennzahlen');
const { erstelleVergleichsansicht } = require('../src/game/vergleichsansicht');

// BUGFIX-009 (flow-game-bdd, 2026-07-27): kein neues Modul/kein Firestore-
// Emulator nötig für die AK5-Anzeige — reine Textmuster-Prüfung gegen den
// echten Quelltext, gleiches Vorgehen wie tests/game-form-loading-state.static.test.js
// und tests/game-a11y-static.test.js (kein DOM/jsdom im Projekt, siehe package.json).
const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const RUNDE_VIER_JS_PFAD = path.join(__dirname, '..', 'public', 'js', 'game', 'rundeVier.js');
const rundeVierJsInhalt = fs.readFileSync(RUNDE_VIER_JS_PFAD, 'utf8');

const LAENDER_LISTE = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France', 'Italy', 'Canada'];

describe('FEATURE-004 Spiellogik: Rundenstart — 12 Elemente in fester alternierender Reihenfolge (AK 6, geklärte Frage 7)', () => {
  test('Szenario: erzeugeElemente() liefert genau sechs Würfel- und sechs Länderkarten-Elemente', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4444' });
    expect(elemente).toHaveLength(12);
    expect(elemente.filter((e) => e.typ === 'wuerfel')).toHaveLength(6);
    expect(elemente.filter((e) => e.typ === 'laenderkarte')).toHaveLength(6);
  });

  test('Szenario: Alle zwölf Elemente starten bei Spieler-Position 1', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4444' });
    expect(elemente.every((e) => e.position === 1)).toBe(true);
  });

  test('Szenario: Die Startreihenfolge ist fest und strikt alternierend (Würfel, Karte, Würfel, Karte, ...)', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4444' });
    const sortiert = [...elemente].sort((a, b) => a.reihenfolge - b.reihenfolge);
    const typFolge = sortiert.map((e) => e.typ);
    for (let i = 0; i < typFolge.length; i += 1) {
      const erwartet = i % 2 === 0 ? 'wuerfel' : 'laenderkarte';
      expect(typFolge[i]).toBe(erwartet);
    }
  });

  test('Szenario: Jede Länderkarte bekommt eines der acht festgelegten Länder fest zugeordnet', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4444' });
    const karten = elemente.filter((e) => e.typ === 'laenderkarte');
    expect(karten).toHaveLength(6);
    karten.forEach((karte) => {
      expect(LAENDER_LISTE).toContain(karte.land);
    });
  });

  test('Szenario: Jede Länderkarte startet ohne Städte-Einträge (append-only Liste beginnt leer)', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4444' });
    const karten = elemente.filter((e) => e.typ === 'laenderkarte');
    karten.forEach((karte) => {
      expect(karte.staedte).toEqual([]);
    });
  });
});

describe('FEATURE-004 Spiellogik: Zeitmessung (AK 1, AK 3)', () => {
  test('Szenario: Die Durchlaufzeit läuft bereits, sobald der Host Runde 4 vorstellt, ohne dass ein Element bearbeitet wurde (Wiederverwendungsnachweis, erwartungsgemäß bereits GRÜN)', async () => {
    // HINWEIS: Anders als die übrigen Tests in dieser Datei ruft dieser Testfall
    // bewusst das bereits BESTEHENDE, fertige FEATURE-002-Modul starteRunde()
    // unverändert mit rundenNummer=4 auf — kein neues Runde-4-Modul nötig, weil
    // starteRunde() nicht nach Rundennummer unterscheidet. Deshalb ist dieser
    // Test schon jetzt grün, nicht erst nach flow-game-impl (belegt die in der
    // Spec behauptete Wiederverwendbarkeit des Positions-/Zeitmess-Grundmusters).
    const { starteRunde } = require('../src/game/rundenStart');
    const runde = await starteRunde({ code: 'ABCD4444', rundenNummer: 4 });
    expect(runde.durchlaufzeitStart).not.toBeNull();
    expect(runde.bearbeitungszeitStart).toBeNull();
  });

  test('Szenario: Die Bearbeitungszeit startet mit dem ersten erfolgreichen Würfel-Abschluss (>3)', async () => {
    const ergebnis = await bewegeElement({
      code: 'ABCD4444',
      rundenNummer: 4,
      elementId: 'wuerfel-1',
      typ: 'wuerfel',
      vonPosition: 1,
      nachPosition: 2,
      ausgefuehrtVon: 'spieler-p1',
      letzterAbgeschlossenerTypDerPerson: null,
    });
    expect(ergebnis.bearbeitungszeitStart).not.toBeNull();
  });

  test('Szenario: Die Bearbeitungszeit startet ebenso mit dem ersten Stadt-Eintrag auf einer Länderkarte', async () => {
    const ergebnis = await bewegeElement({
      code: 'ABCD4445',
      rundenNummer: 4,
      elementId: 'karte-1',
      typ: 'laenderkarte',
      vonPosition: 1,
      nachPosition: 2,
      ausgefuehrtVon: 'spieler-p1',
      stadt: 'Paris',
      letzterAbgeschlossenerTypDerPerson: null,
    });
    expect(ergebnis.bearbeitungszeitStart).not.toBeNull();
  });
});

describe('FEATURE-004 Spiellogik: Kettenfortschritt (AK 7 — Referenzlogik, primäre Durchsetzung siehe Sicherheitsregeln)', () => {
  test('Szenario: Ein Element bei Spieler 2 fertig bearbeitet wechselt zu Zuständigkeit "Spieler 3"', async () => {
    const ergebnis = await bewegeElement({
      code: 'ABCD4446',
      rundenNummer: 4,
      elementId: 'wuerfel-1',
      typ: 'wuerfel',
      vonPosition: 2,
      nachPosition: 3,
      ausgefuehrtVon: 'spieler-p2',
      letzterAbgeschlossenerTypDerPerson: 'laenderkarte',
    });
    expect(ergebnis.position).toBe(3);
  });

  test('Szenario: Mehr als ein Schritt auf einmal wird von der Referenzlogik abgelehnt (Person überspringen)', async () => {
    await expect(bewegeElement({
      code: 'ABCD4447',
      rundenNummer: 4,
      elementId: 'wuerfel-1',
      typ: 'wuerfel',
      vonPosition: 1,
      nachPosition: 3,
      ausgefuehrtVon: 'spieler-p1',
      letzterAbgeschlossenerTypDerPerson: 'laenderkarte',
    })).rejects.toBeDefined();
  });

  test('Szenario: Position 6 ("fertig bei Spieler 5") ist die letzte gültige Position', async () => {
    await expect(bewegeElement({
      code: 'ABCD4448',
      rundenNummer: 4,
      elementId: 'wuerfel-1',
      typ: 'wuerfel',
      vonPosition: 6,
      nachPosition: 7,
      ausgefuehrtVon: 'spieler-p5',
      letzterAbgeschlossenerTypDerPerson: 'laenderkarte',
    })).rejects.toBeDefined();
  });
});

describe('FEATURE-004 Spiellogik: Wechselzwang (AK 9 — Referenzlogik)', () => {
  test('Szenario: Nach Abschluss eines Würfel-Elements verweigert die Referenzlogik ein weiteres Würfel-Element derselben Person', async () => {
    await expect(bewegeElement({
      code: 'ABCD4449',
      rundenNummer: 4,
      elementId: 'wuerfel-2',
      typ: 'wuerfel',
      vonPosition: 1,
      nachPosition: 2,
      ausgefuehrtVon: 'spieler-p1',
      letzterAbgeschlossenerTypDerPerson: 'wuerfel',
    })).rejects.toBeDefined();
  });

  test('Szenario: Nach Abschluss eines Würfel-Elements lässt die Referenzlogik ein Länderkarten-Element derselben Person zu', async () => {
    const ergebnis = await bewegeElement({
      code: 'ABCD4450',
      rundenNummer: 4,
      elementId: 'karte-1',
      typ: 'laenderkarte',
      vonPosition: 1,
      nachPosition: 2,
      ausgefuehrtVon: 'spieler-p1',
      stadt: 'Madrid',
      letzterAbgeschlossenerTypDerPerson: 'wuerfel',
    });
    expect(ergebnis.position).toBe(2);
  });
});

describe('FEATURE-004 Spiellogik: Alternierende Ankunft strukturell garantiert (Pre-Mortem-Risiko 3, präzisiert nach Prototyp-Test 2026-07-20)', () => {
  test('Szenario: Die von erzeugeElemente() erzeugte Startreihenfolge enthält niemals zwei Elemente desselben Typs unmittelbar hintereinander', async () => {
    const elemente = await erzeugeElemente({ code: 'ABCD4451' });
    const sortiert = [...elemente].sort((a, b) => a.reihenfolge - b.reihenfolge);
    for (let i = 1; i < sortiert.length; i += 1) {
      expect(sortiert[i].typ).not.toBe(sortiert[i - 1].typ);
    }
  });

  test('Szenario: Simulierte Weitergabe durch Spieler 1 (der ebenfalls dem Wechselzwang unterliegt) erzeugt bei Spieler 2 weiterhin eine alternierende Ankunftsfolge', async () => {
    // Given: Spieler 1 gibt seine ersten vier Elemente (2 Würfel + 2 Karten) in der
    // einzig zulässigen, durch den Wechselzwang erzwungenen Reihenfolge weiter.
    const abgabereihenfolge = [
      { elementId: 'wuerfel-1', typ: 'wuerfel' },
      { elementId: 'karte-1', typ: 'laenderkarte' },
      { elementId: 'wuerfel-2', typ: 'wuerfel' },
      { elementId: 'karte-2', typ: 'laenderkarte' },
    ];
    let letzterTyp = null;
    const tatsaechlicheReihenfolge = [];
    for (const element of abgabereihenfolge) {
      // eslint-disable-next-line no-await-in-loop
      const ergebnis = await bewegeElement({
        code: 'ABCD4452',
        rundenNummer: 4,
        elementId: element.elementId,
        typ: element.typ,
        vonPosition: 1,
        nachPosition: 2,
        ausgefuehrtVon: 'spieler-p1',
        stadt: element.typ === 'laenderkarte' ? 'Rom' : undefined,
        letzterAbgeschlossenerTypDerPerson: letzterTyp,
      });
      tatsaechlicheReihenfolge.push(element.typ);
      letzterTyp = element.typ;
      expect(ergebnis.position).toBe(2);
    }

    // Then: Die tatsächliche Abgabereihenfolge bei Spieler 2 ist strikt alternierend
    for (let i = 1; i < tatsaechlicheReihenfolge.length; i += 1) {
      expect(tatsaechlicheReihenfolge[i]).not.toBe(tatsaechlicheReihenfolge[i - 1]);
    }
  });
});

describe('FEATURE-004 Spiellogik: Würfel-Element — reine ">3"-Regel (AK 10)', () => {
  test.each([
    [1, false], [2, false], [3, false], [4, true], [5, true], [6, true],
  ])('Szenario: Wurf %i gilt als erledigt=%s', (wert, erwartet) => {
    expect(istWurfErfolgreich(wert)).toBe(erwartet);
  });
});

describe('FEATURE-004 Spiellogik: Rundenende-Bedingung (AK 4, AK 15, Testplan-Szenario)', () => {
  test('Szenario: Elf von zwölf Elementen sind fertig, ein Element ist noch bei Spieler 3 → Runde ist noch nicht beendet', async () => {
    const positionen = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 3];
    const zustand = await pruefeRundenEndeRundeVier({ code: 'ABCD4453', rundenNummer: 4, elementePositionen: positionen });
    expect(zustand.beendet).toBe(false);
  });

  test('Szenario: Sobald auch das letzte, zwölfte Element Position 6 erreicht, endet die Runde sofort', async () => {
    const positionen = new Array(12).fill(6);
    const zustand = await pruefeRundenEndeRundeVier({ code: 'ABCD4454', rundenNummer: 4, elementePositionen: positionen });
    expect(zustand.beendet).toBe(true);
    expect(zustand.durchlaufzeitEnde).not.toBeNull();
  });

  test('Szenario: Die Runde endet unabhängig davon, ob die eingetragenen Städte inhaltlich korrekt sind', async () => {
    // Given: Alle Elemente sind fertig, aber die Karten enthalten (laut Zusatzinfo,
    // hier nicht Teil der Positionsprüfung) fehlerhafte Städte
    const positionen = new Array(12).fill(6);
    const zustand = await pruefeRundenEndeRundeVier({
      code: 'ABCD4455', rundenNummer: 4, elementePositionen: positionen, ignoriertQualitaet: true,
    });
    expect(zustand.beendet).toBe(true);
  });
});

describe('FEATURE-004 Spiellogik: Qualitätsauswertung nach Rundenende (AK 12, 13, 15, 16, Pre-Mortem-Risiko 1)', () => {
  function karteMit(land, staedte) {
    return { land, staedte };
  }

  test('Szenario: Eine Karte mit fünf korrekten, im richtigen Land liegenden, nirgendwo doppelten Städten zählt als fünf korrekte Einträge', async () => {
    const karten = [
      karteMit('France', [
        { stadt: 'Paris', am: 1000 }, { stadt: 'Lyon', am: 2000 }, { stadt: 'Marseille', am: 3000 },
        { stadt: 'Nice', am: 4000 }, { stadt: 'Toulouse', am: 5000 },
      ]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt).toBe(5);
    expect(ergebnis.gesamt.fehlerhaft).toBe(0);
  });

  test('Szenario: Eine Stadt außerhalb des zugeordneten Landes wird als "falsches Land" gezählt', async () => {
    const karten = [
      karteMit('France', [{ stadt: 'Rom', am: 1000 }]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.fehlerhaft).toBe(1);
    expect(ergebnis.gesamt.falschesLand).toBe(1);
    expect(ergebnis.gesamt.dublette).toBe(0);
  });

  test('Szenario: Zwei identische, im richtigen Land liegende Städte auf verschiedenen Karten — die SPÄTER (nach Server-Zeitstempel) eingetragene zählt als Dublette (Pre-Mortem-Risiko 1)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Berlin', am: 1000 }]),
      karteMit('Germany', [{ stadt: 'Berlin', am: 5000 }]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt).toBe(1);
    expect(ergebnis.gesamt.dublette).toBe(1);
    // Die früher (am: 1000) eingetragene gilt als korrekt, nicht als Dublette
    expect(ergebnis.proKarte[0].staedte[0].wertung).toBe('korrekt');
    expect(ergebnis.proKarte[1].staedte[0].wertung).toBe('dublette');
  });

  test('Szenario: Deterministisches Ergebnis bei wiederholter Auswertung derselben Daten (kein Rennen zwischen zwei Auswertungsläufen)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Berlin', am: 1000 }]),
      karteMit('Germany', [{ stadt: 'Berlin', am: 5000 }]),
    ];
    const ersterLauf = await berechneQualitaet({ karten });
    const zweiterLauf = await berechneQualitaet({ karten });
    expect(ersterLauf).toEqual(zweiterLauf);
  });

  test('Szenario: Eine Stadt, die gleichzeitig falsches Land UND Dublette ist, wird nur einmal als fehlerhaft gezählt, aber in beiden Kategorien sichtbar (Grenzfall, siehe Rückmeldung an Stephan)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Rom', am: 1000 }]), // falsches Land, zuerst
      karteMit('Germany', [{ stadt: 'Rom', am: 5000 }]), // falsches Land UND Dublette der ersten
    ];
    const ergebnis = await berechneQualitaet({ karten });
    // Gesamt-Fehleranzahl bleibt 2 (nicht 3) — jeder Eintrag zählt genau einmal
    // als fehlerhaft, auch wenn er potenziell in mehr als eine Fehlerart fiele.
    expect(ergebnis.gesamt.fehlerhaft).toBe(2);
  });

  test('Szenario: Über sechs Karten mit je fünf Einträgen ergeben sich insgesamt 30 gewertete Städte-Einträge (AK 16)', async () => {
    const karten = Array.from({ length: 6 }, (_, kartenIndex) => karteMit(
      LAENDER_LISTE[kartenIndex],
      Array.from({ length: 5 }, (_, i) => ({ stadt: `Stadt-${kartenIndex}-${i}`, am: 1000 * (i + 1) })),
    ));
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt + ergebnis.gesamt.fehlerhaft).toBe(30);
  });
});

describe('FEATURE-004 Wiederverwendungsnachweis: Vergleichsansicht/Kennzahlen lassen sich um Runde 4 (inkl. Qualität) erweitern, ohne Runde 1–3 umzubauen (Regression FEATURE-003, erwartungsgemäß bereits GRÜN)', () => {
  // WICHTIG: Diese Tests importieren AUSSCHLIESSLICH bereits fertige,
  // abgenommene FEATURE-003-Module (kennzahlen.js, vergleichsansicht.js) und
  // sind deshalb schon JETZT grün — sie dürfen durch flow-game-impl NICHT
  // rot werden. Sie beweisen, dass die Architektur-Aussage aus der Spec
  // ("die bestehende Vergleichsansicht kann Runde 4 ohne Strukturumbau
  // ergänzen") bereits heute technisch zutrifft.

  test('Szenario: Runde 4 reiht sich als vierter Eintrag in die bestehende Vergleichsansicht ein, inklusive Qualitäts-Kennzahl (AK 17)', async () => {
    const dreiRunden = [
      { rundenNummer: 1, durchlaufzeit: 9000 },
      { rundenNummer: 2, durchlaufzeit: 6000 },
      { rundenNummer: 3, durchlaufzeit: 3000 },
    ];
    const mitRundeVier = [
      ...dreiRunden,
      {
        rundenNummer: 4,
        durchlaufzeit: 12000,
        qualitaet: {
          korrekteStaedte: 21, fehlerhafteStaedte: 9, anteilKorrekt: 0.7, falschesLand: 5, dublette: 4,
        },
      },
    ];

    const vergleich = await erstelleVergleichsansicht({ runden: mitRundeVier });

    expect(vergleich).toHaveLength(4);
    expect(vergleich.slice(0, 3).map((r) => r.rundenNummer)).toEqual([1, 2, 3]);
    expect(vergleich[3].rundenNummer).toBe(4);
    expect(vergleich[3].qualitaet.korrekteStaedte).toBe(21);
    expect(vergleich[3].qualitaet.fehlerhafteStaedte).toBe(9);
  });

  test('Szenario: berechneKennzahlen() liefert für Runde 4 dieselben Zeit-Kennzahlenfelder wie für Runde 1–3 (Durchlaufzeit, Bearbeitungszeit, Lieferzeiten)', async () => {
    const kennzahlen = await berechneKennzahlen({
      durchlaufzeitStart: 0,
      durchlaufzeitEnde: 15000,
      bearbeitungszeitStart: 500,
      bearbeitungszeitEnde: 14000,
      lieferungen: [
        { kartenId: 'wuerfel-1', angekommenAm: 3000 },
        { kartenId: 'karte-1', angekommenAm: 15000 },
      ],
      rundenStart: 0,
    });
    expect(kennzahlen.durchlaufzeit).toBe(15000);
    expect(kennzahlen.bearbeitungszeit).toBe(13500);
    expect(kennzahlen.zeitBisErsterLieferung).toBe(3000);
    expect(kennzahlen.zeitBisLetzterLieferung).toBe(15000);
  });
});

describe('BUGFIX-009 Spiellogik: Länderziehung OHNE Zurücklegen (AK1, AK2, Freigabe-Entscheidung 1 – Fisher-Yates statt Ziehung mit Zurücklegen)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Szenario: Zu Rundenbeginn tragen alle sechs Länderkarten paarweise unterschiedliche Länder — auch wenn der Zufallsgenerator wiederholt denselben Wert liefert (AK1)', async () => {
    // Given: Math.random() liefert deterministisch immer denselben Wert (0).
    // Eine Ziehung MIT Zurücklegen (bisheriges, fehlerhaftes Verhalten) würde
    // dadurch garantiert sechsmal dasselbe Land ('USA', erstes Element von
    // LAENDER_LISTE) liefern. Eine korrekte Ziehung OHNE Zurücklegen
    // (Fisher-Yates-Shuffle) bleibt dagegen auch bei einem konstanten
    // Zufallswert eine Permutation mit paarweise verschiedenen Elementen —
    // dieser Test gilt deshalb unabhängig von der konkreten
    // Shuffle-Implementierung, solange sie tatsächlich ohne Zurücklegen zieht.
    jest.spyOn(Math, 'random').mockReturnValue(0);

    // When
    const elemente = await erzeugeElemente({ code: 'BUGFIX009-1' });
    const laender = elemente.filter((e) => e.typ === 'laenderkarte').map((k) => k.land);

    // Then
    expect(laender).toHaveLength(6);
    expect(new Set(laender).size).toBe(6);
  });

  test('Szenario: Über 500 simulierte Rundenstarts hinweg tritt niemals ein doppelt vergebenes Land auf einer der sechs Karten auf (AK1, echter Zufallsgenerator, kein Test-Glück)', async () => {
    const ANZAHL_DURCHLAEUFE = 500;
    for (let i = 0; i < ANZAHL_DURCHLAEUFE; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const elemente = await erzeugeElemente({ code: `BUGFIX009-2-${i}` });
      const laender = elemente.filter((e) => e.typ === 'laenderkarte').map((k) => k.land);
      expect(new Set(laender).size).toBe(6);
    }
  });

  test('Szenario: Über viele Rundenstarts hinweg bleibt die Länderauswahl weiterhin zufällig verteilt — jedes der acht Länder kommt vor, kein systematischer Bias auf eine feste Teilmenge (AK2)', async () => {
    const ANZAHL_DURCHLAEUFE = 800;
    const haeufigkeit = {};
    LAENDER_LISTE.forEach((land) => { haeufigkeit[land] = 0; });

    for (let i = 0; i < ANZAHL_DURCHLAEUFE; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const elemente = await erzeugeElemente({ code: `BUGFIX009-3-${i}` });
      elemente.filter((e) => e.typ === 'laenderkarte').forEach((karte) => { haeufigkeit[karte.land] += 1; });
    }

    // Then: Jedes der acht Länder kommt vor — kein Land wird systematisch
    // ausgeschlossen (z. B. weil eine falsche Shuffle-Implementierung immer
    // dieselben sechs von acht Ländern bevorzugt). Erwartungswert pro Land bei
    // Gleichverteilung: 800 * 6 / 8 = 600 — großzügige untere Schranke (200),
    // um Flakiness durch reinen Zufall auszuschließen, aber einen groben
    // systematischen Bias trotzdem zuverlässig aufzudecken.
    LAENDER_LISTE.forEach((land) => {
      expect(haeufigkeit[land]).toBeGreaterThan(200);
    });
  });

  test('Szenario: Der bestehende Regressionstest "LAENDER_LISTE enthält karte.land" (siehe oben, unverändert) bleibt die einzige Prüfung auf Zugehörigkeit — hier zusätzlich mit ohne-Zurücklegen-Ziehung erneut gegen viele Durchläufe abgesichert', async () => {
    for (let i = 0; i < 50; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const elemente = await erzeugeElemente({ code: `BUGFIX009-4-${i}` });
      const karten = elemente.filter((e) => e.typ === 'laenderkarte');
      karten.forEach((karte) => {
        expect(LAENDER_LISTE).toContain(karte.land);
      });
    }
  });
});

describe('BUGFIX-009 UI: "Karte X von 6"-Anzeige (AK5, public/spiel.html)', () => {
  // Bewusst ein allgemeines Muster (siehe flow-game-bdd, Schritt 3b): geprüft
  // wird NUR, dass der Quelltext irgendwo eine Positionsanzeige "Karte ... von 6"
  // berechnet (Textliteral "Karte", gefolgt von einer Kartennummer, gefolgt von
  // "von 6") — nicht, WIE (Template-Literal, String-Konkatenation, eigene
  // Hilfsfunktion) das geschieht. Das lässt eine spätere Extraktion in eine
  // gemeinsame Hilfsfunktion zu, ohne diesen Test unnötig rot laufen zu lassen.
  const KARTE_VON_SECHS_MUSTER = /Karte[^\n]{0,20}von\s*6/;

  test('Szenario: Der Quelltext zeigt für Länderkarten sichtbar eine Positionsanzeige "Karte X von 6" an, unabhängig vom Land (AK5)', () => {
    expect(KARTE_VON_SECHS_MUSTER.test(spielHtmlInhalt)).toBe(true);
  });

  test('Regressionsschutz: Die neue "Karte X von 6"-Anzeige ist nicht in der Bewegungs-/Datenlogik (window.FlowGame.gibElementWeiter in rundeVier.js) verankert, sondern bleibt reine Anzeige (erwartungsgemäß bereits GRÜN)', () => {
    const start = rundeVierJsInhalt.indexOf('async function gibElementWeiter(');
    const ende = rundeVierJsInhalt.indexOf('async function schreibeWuerfelZwischenwurf(');
    expect(start).toBeGreaterThan(-1);
    expect(ende).toBeGreaterThan(start);
    const funktionsKoerper = rundeVierJsInhalt.slice(start, ende);
    expect(KARTE_VON_SECHS_MUSTER.test(funktionsKoerper)).toBe(false);
  });

  test('Regressionsschutz: berechneQualitaet() bleibt von der neuen Anzeige unberührt — bestehende Qualitätsauswertungs-Tests (siehe oben, unverändert) sind weiterhin die alleinige Prüfung dieser Funktion (erwartungsgemäß bereits GRÜN)', async () => {
    const karten = [{ land: 'France', staedte: [{ stadt: 'Paris', am: 1000 }] }];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt).toBe(1);
  });
});

describe('FEATURE-019 Wiederverwendungsnachweis: berechneQualitaet() liefert bereits alle für die Detailliste nötigen Rohdaten (AK 1, AK 8, AK 11, Pre-Mortem-Risiko 1 — erwartungsgemäß bereits GRÜN)', () => {
  // WICHTIG: Diese Tests ändern/erweitern berechneQualitaet() NICHT und
  // importieren ausschließlich die bereits bestehende, fertige Funktion von
  // oben. Sie belegen den "Zentraler Befund"-Satz der FEATURE-019-Spec ("die
  // pro-Eintrag-Detailinformation ... wird bereits vollständig ermittelt, nur
  // nicht weiterverwendet") — und ziehen zugleich die Scope-Grenze zur neuen
  // Aufbereitungsfunktion unten: das Verbergen des `von`-Feldes ist NICHT
  // Aufgabe von berechneQualitaet() (das bleibt unverändert), sondern von
  // bereiteDetailzeilenVor().

  function karteMit(land, staedte) {
    return { land, staedte };
  }

  test('Szenario: proKarte enthält für eine Karte mit gemischten Ergebnissen ALLE fünf Einträge, nicht nur die fehlerhaften (AK 1, AK 11)', async () => {
    const karten = [
      karteMit('France', [
        { stadt: 'Paris', am: 1000 }, // korrekt
        { stadt: 'Rom', am: 2000 }, // falschesLand
        { stadt: 'Lyon', am: 3000 }, // korrekt
        { stadt: 'Paris', am: 4000 }, // dublette (Paris schon vergeben)
        { stadt: 'Berlin', am: 5000 }, // falschesLand
      ]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.proKarte[0].staedte).toHaveLength(5);
    expect(ergebnis.proKarte[0].staedte.map((e) => e.wertung)).toEqual([
      'korrekt', 'falschesLand', 'korrekt', 'dublette', 'falschesLand',
    ]);
  });

  test('Szenario: Eine Länderkarte ganz ohne Fehler erscheint in proKarte trotzdem vollständig mit allen Einträgen, jeweils als "korrekt" markiert — kein Leerzustand auf Berechnungsebene (AK 8)', async () => {
    const karten = [
      karteMit('Spain', [
        { stadt: 'Madrid', am: 1000 }, { stadt: 'Barcelona', am: 2000 }, { stadt: 'Valencia', am: 3000 },
      ]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.proKarte[0].land).toBe('Spain');
    expect(ergebnis.proKarte[0].staedte).toHaveLength(3);
    expect(ergebnis.proKarte[0].staedte.every((e) => e.wertung === 'korrekt')).toBe(true);
  });

  test('Szenario: berechneQualitaet() reicht ein in den Rohdaten vorhandenes "von"-Feld (eintragende Person) unverändert durch — das Verbergen ist NICHT Aufgabe dieser Funktion, sondern von bereiteDetailzeilenVor() unten', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Berlin', am: 1000, von: 'spieler-p1' }]),
    ];
    const ergebnis = await berechneQualitaet({ karten });
    // Dokumentiert bewusst den Ist-Zustand (GRÜN): das Rohergebnis trägt "von"
    // noch mit sich, weil berechneQualitaet() jeden Eintrag unverändert
    // spreadet (siehe Kopfkommentar/Quelltext). Genau deshalb braucht es eine
    // separate Aufbereitung vor Anzeige/Persistenz (siehe Testblock unten).
    expect(ergebnis.proKarte[0].staedte[0].von).toBe('spieler-p1');
  });
});

describe('FEATURE-019 Spiellogik: Detailzeilen für Anzeige/Persistenz aufbereiten — bereiteDetailzeilenVor() (AK 1–4, 8, 11; Frage 1 "ohne Namen"; Pre-Mortem-Risiko 1/2) — neues Modul, erwartungsgemäß ROT', () => {
  function karteMit(land, staedte) {
    return { land, staedte };
  }

  test('Szenario: Für eine Karte mit fünf Einträgen liefert die Aufbereitung fünf Zeilen, je mit Land und Stadt (AK 1)', async () => {
    const karten = [
      karteMit('France', [
        { stadt: 'Paris', am: 1000 }, { stadt: 'Lyon', am: 2000 }, { stadt: 'Marseille', am: 3000 },
        { stadt: 'Nice', am: 4000 }, { stadt: 'Toulouse', am: 5000 },
      ]),
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    expect(zeilen).toHaveLength(5);
    zeilen.forEach((zeile) => {
      expect(zeile.land).toBe('France');
      expect(typeof zeile.stadt).toBe('string');
    });
  });

  test('Szenario: Über sechs Karten mit je fünf Einträgen liefert die Aufbereitung alle 30 Zeilen — korrekte UND fehlerhafte, nicht nur die fehlerhaften (AK 1, AK 11)', async () => {
    const laender = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France'];
    const karten = laender.map((land, kartenIndex) => karteMit(
      land,
      Array.from({ length: 5 }, (_, i) => ({ stadt: `Stadt-${kartenIndex}-${i}`, am: 1000 * (i + 1) })),
    ));
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    expect(zeilen).toHaveLength(30);
    // Alle Städte hier sind erfunden ("Stadt-x-y") und liegen daher in keinem
    // der Länder -> ausschließlich "falschesLand". Trotzdem müssen alle 30
    // Zeilen erscheinen, nicht nur eine gefilterte Teilmenge.
    expect(zeilen.every((z) => z.wertung === 'falschesLand')).toBe(true);
  });

  test('Szenario: Eine korrekte Stadt ist in der aufbereiteten Zeile als "korrekt" erkennbar und trägt keinen Fehlergrund (AK 2)', async () => {
    const karten = [karteMit('Germany', [{ stadt: 'Berlin', am: 1000 }])];
    const { proKarte } = await berechneQualitaet({ karten });
    const [zeile] = bereiteDetailzeilenVor({ proKarte });
    expect(zeile.wertung).toBe('korrekt');
    expect(zeile.gruende).toEqual([]);
  });

  test('Szenario: Eine Stadt außerhalb des zugeordneten Landes zeigt in der aufbereiteten Zeile den Fehlergrund "falschesLand" (AK 3)', async () => {
    const karten = [karteMit('Germany', [{ stadt: 'Rom', am: 1000 }])];
    const { proKarte } = await berechneQualitaet({ karten });
    const [zeile] = bereiteDetailzeilenVor({ proKarte });
    expect(zeile.wertung).toBe('falschesLand');
    expect(zeile.gruende).toEqual(['falschesLand']);
  });

  test('Szenario: Eine bereits im Spiel verwendete Stadt zeigt in der aufbereiteten Zeile den Fehlergrund "dublette" (AK 3)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Berlin', am: 1000 }]),
      karteMit('Germany', [{ stadt: 'Berlin', am: 5000 }]),
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    expect(zeilen[0].gruende).toEqual([]);
    expect(zeilen[1].wertung).toBe('dublette');
    expect(zeilen[1].gruende).toEqual(['dublette']);
  });

  test('Szenario: Ein gleichzeitig falsches-Land-UND-Dublette-Eintrag erscheint als EINE Zeile mit BEIDEN erkennbaren Gründen (AK 4, Grenzfall AK 12/13 aus FEATURE-004)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Rom', am: 1000 }]), // falsches Land, zuerst
      karteMit('Germany', [{ stadt: 'Rom', am: 5000 }]), // falsches Land UND Dublette
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    // Genau eine Zeile für den zweiten Eintrag, nicht zwei separate Zeilen
    // für "falschesLand" und "dublette".
    const zweiteZeile = zeilen[1];
    expect(zweiteZeile.wertung).toBe('falschesLandUndDublette');
    expect(zweiteZeile.gruende).toEqual(expect.arrayContaining(['falschesLand', 'dublette']));
    expect(zweiteZeile.gruende).toHaveLength(2);
  });

  test('Szenario: Das "von"-Feld der eintragenden Person ist in der aufbereiteten Zeile NICHT enthalten, obwohl es in den Rohdaten vorhanden war (Frage 1, geklärt: ohne Namen; Pre-Mortem-Risiko 1 Blame-Risiko)', async () => {
    const karten = [
      karteMit('Germany', [{ stadt: 'Berlin', am: 1000, von: 'spieler-p1' }]),
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const [zeile] = bereiteDetailzeilenVor({ proKarte });
    expect(zeile.von).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(zeile, 'von')).toBe(false);
    expect(Object.keys(zeile).some((schluessel) => schluessel.toLowerCase().includes('von'))).toBe(false);
  });

  test('Szenario: Eine Länderkarte ganz ohne Fehler erscheint auch nach der Aufbereitung vollständig mit allen ihren Einträgen, jeweils erkennbar korrekt — kein separater Leerzustand pro Karte (AK 8)', async () => {
    const karten = [
      karteMit('Spain', [
        { stadt: 'Madrid', am: 1000 }, { stadt: 'Barcelona', am: 2000 }, { stadt: 'Valencia', am: 3000 },
      ]),
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    expect(zeilen).toHaveLength(3);
    expect(zeilen.every((z) => z.land === 'Spain' && z.wertung === 'korrekt' && z.gruende.length === 0)).toBe(true);
  });

  test('Szenario: Über mehrere Karten hinweg bleibt jede Zeile ihrer eigenen Karte zugeordnet — keine Vermischung von Land/Stadt zwischen Karten', async () => {
    const karten = [
      karteMit('France', [{ stadt: 'Paris', am: 1000 }]),
      karteMit('Italy', [{ stadt: 'Rom', am: 2000 }]),
      karteMit('Canada', [{ stadt: 'Toronto', am: 3000 }]),
    ];
    const { proKarte } = await berechneQualitaet({ karten });
    const zeilen = bereiteDetailzeilenVor({ proKarte });
    expect(zeilen).toEqual([
      expect.objectContaining({ land: 'France', stadt: 'Paris', wertung: 'korrekt' }),
      expect.objectContaining({ land: 'Italy', stadt: 'Rom', wertung: 'korrekt' }),
      expect.objectContaining({ land: 'Canada', stadt: 'Toronto', wertung: 'korrekt' }),
    ]);
  });
});

describe('FEATURE-019 Persistenz: Das proKarte-Detail landet im selben Rundenende-Schreibvorgang wie die Zusammenfassung (Browser-Port, public/js/game/rundeVier.js, AK 5/6/9, Pre-Mortem-Risiko 3/4) — Textmuster-Test, erwartungsgemäß ROT', () => {
  // Bewusst ein allgemeines Textmuster (siehe flow-game-bdd, Schritt 3b): der
  // Rundenende-Schreibvorgang (pruefeUndSetzeRundenEndeRundeVier) muss das aus
  // berechneQualitaet() gelieferte proKarte-Ergebnis irgendwie referenzieren,
  // statt es wie bisher ausschließlich über qualitaetRoh.gesamt zu verwerfen —
  // WIE genau (eigenes Feld, eingebettet in "qualitaet", eigene Hilfsfunktion)
  // bleibt bewusst offen.
  function funktionsKoerper(quelltext, startMarker, endMarker) {
    const start = quelltext.indexOf(startMarker);
    const ende = quelltext.indexOf(endMarker, start);
    expect(start).toBeGreaterThan(-1);
    expect(ende).toBeGreaterThan(start);
    return quelltext.slice(start, ende);
  }

  test('Szenario: Der Rundenende-Schreibvorgang für Runde 4 referenziert proKarte (bislang wird nur "gesamt" verwendet, proKarte wird verworfen)', () => {
    const koerper = funktionsKoerper(
      rundeVierJsInhalt,
      'async function pruefeUndSetzeRundenEndeRundeVier(',
      'global.FlowGame = global.FlowGame || {};',
    );
    expect(koerper).toMatch(/proKarte/);
  });

  // Bereits JETZT grün (Ausnahme in diesem Testblock, wie im Kopfkommentar
  // dieser Datei bei BUGFIX-009 vorgemacht): es gibt schon heute genau einen
  // Update-Aufruf, der bereits "qualitaet" referenziert — das darf durch die
  // Ergänzung um proKarte nicht zu einem zweiten, separaten Schreibvorgang
  // werden (reiner Regressionsschutz, keine neue Funktionalität).
  test('Szenario: Innerhalb genau EINES Update-Aufrufs auf das Runden-Dokument werden Zusammenfassung UND Detail zusammen geschrieben — kein zweiter, separater Schreibvorgang (Pre-Mortem-Risiko 4)', () => {
    const koerper = funktionsKoerper(
      rundeVierJsInhalt,
      'async function pruefeUndSetzeRundenEndeRundeVier(',
      'global.FlowGame = global.FlowGame || {};',
    );
    const updateAufrufe = koerper.match(/rundenRef\.update\(/g) || [];
    expect(updateAufrufe).toHaveLength(1);
    // Der eine Update-Aufruf muss sowohl die bestehende Zusammenfassung
    // (qualitaet) als auch das neue Detail referenzieren.
    const updateStart = koerper.indexOf('rundenRef.update(');
    const updateBereich = koerper.slice(updateStart, updateStart + 400);
    expect(updateBereich).toMatch(/qualitaet/);
  });
});

describe('FEATURE-019 Anzeige: Detailtabelle (Land, Stadt, Fehlergrund je Zeile) an beiden bestehenden Anzeigeorten, öffentlich in public/spiel.html (AK 1–7; Tabellendarstellung, Stephan nach Prototyp-Test 2026-07-27) — Textmuster-Tests, erwartungsgemäß ROT', () => {
  function funktionsKoerper(quelltext, startMarker, endMarker) {
    const start = quelltext.indexOf(startMarker);
    const ende = quelltext.indexOf(endMarker, start);
    expect(start).toBeGreaterThan(-1);
    expect(ende).toBeGreaterThan(start);
    return quelltext.slice(start, ende);
  }

  test('Szenario: Die eigene Rundenansicht (zeigeKennzahlen()) enthält Code, der die proKarte-Detailliste in einer Tabelle darstellt (AK 5, eigene Rundenansicht)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'function zeigeKennzahlen(runde)', '\n  btnRundeStarten.addEventListener(');
    expect(koerper).toMatch(/proKarte/);
    expect(koerper).toMatch(/createElement\(['"]table['"]\)/);
  });

  test('Szenario: Die Vergleichsansicht (renderVergleichsTabelle(), gemeinsam für Host-Vorschau und finale Auswertung) enthält Code, der die proKarte-Detailliste zusätzlich zu den bestehenden Kennzahlen-Zeilen in einer Tabelle darstellt (AK 5)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'function renderVergleichsTabelle(container, vergleich)', 'async function ladeUndRenderHostVorschau');
    expect(koerper).toMatch(/proKarte/);
  });

  test('Regression (AK 7): Die neue Detaildarstellung in renderVergleichsTabelle() bleibt innerhalb der bestehenden Bedingung "mindestens eine Runde bringt qualitaet mit" — für Runde 1–3 erscheint dadurch weiterhin keine Detailzeile', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'function renderVergleichsTabelle(container, vergleich)', 'async function ladeUndRenderHostVorschau');
    const wächterStart = koerper.indexOf("vergleich.some(function (r) { return r.qualitaet != null; })");
    expect(wächterStart).toBeGreaterThan(-1);
    // Das schließende "}" dieses bestehenden if-Blocks steht vor dem
    // "tabelle.appendChild(tbody);" am Ende der Funktion (siehe bestehender
    // Quelltext) — die neue proKarte-Darstellung muss VOR dieser Stelle,
    // also innerhalb des Wächter-Blocks liegen.
    const wächterBereich = koerper.slice(wächterStart);
    const abschlussIndex = wächterBereich.indexOf('tabelle.appendChild(tbody);');
    const proKarteIndex = wächterBereich.indexOf('proKarte');
    expect(proKarteIndex).toBeGreaterThan(-1);
    expect(proKarteIndex).toBeLessThan(abschlussIndex);
  });

  test('Szenario: Fehlerhafte Zeilen der Detailtabelle sind über eine bedingte Kennzeichnung (z. B. CSS-Klasse) optisch von korrekten Zeilen unterscheidbar (Pre-Mortem-Risiko 2 Gegenmaßnahme)', () => {
    // Bewusst allgemein (Schritt 3b): geprüft wird nur, dass IRGENDWO eine
    // Fallunterscheidung nach Wertung ungleich "korrekt" zu einer sichtbaren
    // Kennzeichnung (className/classList/aria-Attribut) führt — nicht WELCHE
    // konkrete Klasse/Farbe gewählt wird.
    const MUSTER = /wertung\s*[!=]==?\s*['"]korrekt['"][\s\S]{0,200}(className|classList|setAttribute)/;
    expect(MUSTER.test(spielHtmlInhalt)).toBe(true);
  });

  test('Szenario: Das "von"-Feld der eintragenden Person taucht im Anzeige-Code der Detailtabelle nicht auf (Frage 1, geklärt: ohne Namen)', () => {
    const zeigeKennzahlenKoerper = funktionsKoerper(spielHtmlInhalt, 'function zeigeKennzahlen(runde)', '\n  btnRundeStarten.addEventListener(');
    const vergleichsTabelleKoerper = funktionsKoerper(spielHtmlInhalt, 'function renderVergleichsTabelle(container, vergleich)', 'async function ladeUndRenderHostVorschau');
    expect(zeigeKennzahlenKoerper).not.toMatch(/\.von\b/);
    expect(vergleichsTabelleKoerper).not.toMatch(/\.von\b/);
  });
});
