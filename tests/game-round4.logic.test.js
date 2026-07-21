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

// Bereits bestehende, fertige FEATURE-003-Module — bewusst NICHT über
// ladeOderUndefined() geladen, weil ihr Fehlen ein echter Regressions-Fehler
// wäre (anders als die neuen Runde-4-Module oben), kein erwartetes Rot.
const { berechneKennzahlen } = require('../src/game/kennzahlen');
const { erstelleVergleichsansicht } = require('../src/game/vergleichsansicht');

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
