/**
 * FEATURE-006 – Mehrsprachigkeit (Deutsch/Englisch)
 * Anwendungslogik-Tests (Default-Sprache, Host-gesteuertes Sprachfeld,
 * sprachneutrale Fehlercodes, zweisprachige Stadt-Erkennung in Runde 4,
 * zentrale Übersetzungstabelle).
 *
 * Grundlage: Analyse-Spec in Backlog.md, Abschnitt "FEATURE-006", freigegeben
 * am 2026-07-21. Gleiches Testmuster wie tests/game-rooms.logic.test.js /
 * tests/game-rejoin.logic.test.js (Jest + @firebase/rules-unit-testing mit
 * OFFENEM Testregelwerk, da hier ausschliesslich Anwendungslogik geprüft
 * wird, nicht firestore.rules – dafür ist
 * tests/game-i18n.security.rules.test.js zuständig).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, siehe auch
 * Hinweis am Kopf von tests/game-i18n.security.rules.test.js – bitte mit
 * flow-game-impl abgleichen statt stillschweigend zu ignorieren):
 *
 *   - src/game/sprache.js
 *       SPRACHEN            = ['de', 'en']
 *       STANDARD_SPRACHE     = 'en' (AK 1)
 *       setzeSpielSprache({ code, sprache }, db) -> validiert den Wert gegen
 *         SPRACHEN (wirft bei ungültigem Wert einen Fehler) und schreibt
 *         AUSSCHLIESSLICH das Feld `sprache` auf spiele/{code}. Prüft bewusst
 *         NICHT die Host-Berechtigung selbst (gleiches Architekturmuster wie
 *         die bestehenden Referenzlogik-Module src/game/rundenwechsel.js und
 *         src/game/kartenBewegung.js: die Autorisierung ist Aufgabe von
 *         firestore.rules, nicht der Referenzlogik).
 *   - src/game/createGame.js erweitert um einen optionalen `sprache`-Parameter
 *       (Default STANDARD_SPRACHE), der beim Erstellen in das Spiel-Dokument
 *       geschrieben wird (AK 1, AK 9).
 *   - src/i18n/uebersetzungen.js
 *       UEBERSETZUNGEN = { [textSchluessel]: { de: '...', en: '...' } }
 *       uebersetze(schluessel, sprache = STANDARD_SPRACHE) -> String
 *
 * Fehlercodes (AK 7, Pre-Mortem-Risiko 2): src/game/joinGame.js (und analog
 * kartenBewegung.js/stapelTor.js/hostSession.js/teilnehmerSession.js/
 * rundenwechsel.js/rundeVier/elementBewegung.js) sollen geworfene Errors um
 * ein sprachneutrales `code`-Feld ergänzen (z. B. `err.code === 'UNGUELTIGER_CODE'`),
 * damit die Anzeige unabhängig von der eingestellten Sprache übersetzt werden
 * kann, STATT nur die deutsche Nachricht durch eine zweite Sprache zu
 * ersetzen oder zu verwerfen.
 *
 * WICHTIG – bewusst RED: `src/game/sprache.js` und `src/i18n/uebersetzungen.js`
 * existieren noch NICHT (erwarteter Fehlschlag: "Cannot find module ..."),
 * `joinGame.js` wirft aktuell noch keine Fehler mit `.code`-Feld, und
 * `src/game/rundeVier/laenderStaedte.js` kennt "Munich" (nur "München") noch
 * nicht. Das ist der gewünschte "Red"-Zustand vor `flow-game-impl`.
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'flow-game-feature-006-test-logic';

const OFFENES_TESTREGELWERK = `
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
`;

const { createGame } = require('../src/game/createGame');
const { joinGame } = require('../src/game/joinGame');
const { berechneQualitaet } = require('../src/game/rundeVier/qualitaetsauswertung');

function ladeOderUndefined(pfad, exportName) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const modul = require(pfad);
    return modul[exportName];
  } catch (fehler) {
    return undefined;
  }
}

// Bewusst RED: dieses Modul existiert noch nicht (siehe Kommentar oben).
const setzeSpielSprache = ladeOderUndefined('../src/game/sprache', 'setzeSpielSprache');
const SPRACHEN = ladeOderUndefined('../src/game/sprache', 'SPRACHEN');
const STANDARD_SPRACHE = ladeOderUndefined('../src/game/sprache', 'STANDARD_SPRACHE');

// Bewusst RED: dieses Modul existiert noch nicht (siehe Kommentar oben).
const UEBERSETZUNGEN = ladeOderUndefined('../src/i18n/uebersetzungen', 'UEBERSETZUNGEN');
const uebersetze = ladeOderUndefined('../src/i18n/uebersetzungen', 'uebersetze');

let testEnv;
let db;

let naechsteUid = 0;
function neueUid(praefix = 'uid') {
  naechsteUid += 1;
  return `${praefix}-${naechsteUid}`;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: OFFENES_TESTREGELWERK,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  db = testEnv.unauthenticatedContext().firestore();
});

describe('Szenario: Grundeinstellung Englisch bei Spielerstellung ohne eigene Sprachwahl (AK 1)', () => {
  test('Gegeben ein Host erstellt ein Spiel ohne eigenen sprache-Parameter, wenn das Spiel-Dokument gelesen wird, dann ist die Sprache "en"', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    const spielSnap = await db.doc(`spiele/${code}`).get();
    expect(spielSnap.data().sprache).toBe('en');
  });
});

describe('Szenario: Der Host legt die Spielsprache beim Erstellen fest (AK 9)', () => {
  test('Gegeben ein Host erstellt ein Spiel mit sprache: "de", wenn das Spiel-Dokument gelesen wird, dann ist die Sprache "de" für alle Rollen gültig', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host'), sprache: 'de' }, db);
    const spielSnap = await db.doc(`spiele/${code}`).get();
    expect(spielSnap.data().sprache).toBe('de');
  });
});

describe('Szenario: Der Host ändert die Sprache, während eine Runde bereits läuft, ohne Spielfortschritt/Zeitmessung zu beeinflussen (AK 2, AK 5, AK 9)', () => {
  test('Gegeben eine laufende Runde mit bereits gestarteter Durchlaufzeit und einer bewegten Karte, wenn setzeSpielSprache aufgerufen wird, dann wechselt nur das Sprachfeld – Rundendaten und Kartenposition bleiben unverändert', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host'), sprache: 'en' }, db);
    const durchlaufzeitStart = Date.now() - 5000;
    await db.doc(`spiele/${code}/runden/1`).set({
      phase: 'dor_abgeschlossen', dorAbgeschlossen: true, durchlaufzeitStart, durchlaufzeitEnde: null,
    });
    await db.doc(`spiele/${code}/runden/1/karten/karte-1`).set({ position: 2 });

    await setzeSpielSprache({ code, sprache: 'de' }, db);

    const spielSnap = await db.doc(`spiele/${code}`).get();
    const rundeSnap = await db.doc(`spiele/${code}/runden/1`).get();
    const karteSnap = await db.doc(`spiele/${code}/runden/1/karten/karte-1`).get();

    expect(spielSnap.data().sprache).toBe('de');
    expect(rundeSnap.data().durchlaufzeitStart).toBe(durchlaufzeitStart);
    expect(karteSnap.data().position).toBe(2);
  });

  test('Gegeben ein ungültiger, nicht unterstützter Sprachwert (z. B. "fr"), wenn setzeSpielSprache aufgerufen wird, dann wird der Aufruf abgelehnt und das gespeicherte Sprachfeld bleibt unverändert', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host'), sprache: 'en' }, db);

    await expect(setzeSpielSprache({ code, sprache: 'fr' }, db)).rejects.toThrow();

    const spielSnap = await db.doc(`spiele/${code}`).get();
    expect(spielSnap.data().sprache).toBe('en');
  });
});

describe('Szenario: Zentrale Liste unterstützter Sprachen (Grundlage für AK 1/8/9)', () => {
  test('Gegeben das Sprachmodul, dann enthält SPRACHEN genau "de" und "en", und STANDARD_SPRACHE ist "en"', () => {
    expect(SPRACHEN).toEqual(expect.arrayContaining(['de', 'en']));
    expect(SPRACHEN).toHaveLength(2);
    expect(STANDARD_SPRACHE).toBe('en');
  });
});

describe('Szenario: Sprachwahl bleibt bei Wiederbeitritt/Rejoin erhalten (AK 10, Bezug FEATURE-005)', () => {
  test('Gegeben ein Spiel mit sprache: "de" und eine bereits beigetretene Person, wenn dieselbe uid erneut über joinGame beitritt (Doppel-Tap/Reconnect, bestehende FEATURE-001-Idempotenz), dann bleibt das Sprachfeld des Spiel-Dokuments unverändert "de"', async () => {
    const { code } = await createGame({ hostAnzeigename: 'Host A', uid: neueUid('host') }, db);
    // Sprache wird hier bewusst direkt gesetzt (unabhängig von createGame()s
    // eigenem Default-Verhalten aus AK 1), um ausschliesslich zu prüfen, dass
    // der BEITRITTS-Schreibvorgang selbst das Feld nicht anfasst.
    await db.doc(`spiele/${code}`).update({ sprache: 'de' });
    const spielerUid = neueUid();

    await joinGame({ code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid }, db);
    await joinGame({ code, anzeigename: 'Rejoin-Spielerin', rolle: 'spielende', uid: spielerUid }, db);

    const spielSnap = await db.doc(`spiele/${code}`).get();
    expect(spielSnap.data().sprache).toBe('de');
  });
});

describe('Szenario: Sprachneutrale Fehlercodes statt reiner Text-Fehlermeldungen (AK 7, Pre-Mortem-Risiko 2)', () => {
  // WICHTIG für flow-game-impl: Der bestehende Test in
  // tests/game-rooms.logic.test.js ("Ablehnung bei falschem/unbekanntem
  // Code") prüft aktuell per `.rejects.toThrow(/code/i)` einen Ausschnitt der
  // DEUTSCHEN Fehlermeldung ("Ungültiger oder unbekannter Code."). Sobald
  // joinGame.js auf sprachneutrale Fehlercodes umgestellt ist, MUSS diese
  // bestehende Assertion kontrolliert auf das neue `err.code`-Feld umgestellt
  // werden (z. B. `.catch((err) => expect(err.code).toBe('UNGUELTIGER_CODE'))`)
  // statt weiterhin auf einen (dann ggf. übersetzten oder gar nicht mehr
  // vorhandenen) Text-Ausschnitt zu prüfen – NICHT stillschweigend
  // entschärfen oder löschen, siehe Testplan-Regressionshinweis in
  // Backlog.md FEATURE-006.
  test('Gegeben kein Spiel mit dem angegebenen Code existiert, wenn joinGame aufgerufen wird, dann trägt der geworfene Fehler ein sprachneutrales code-Feld, das unabhängig von der Anzeigesprache ausgewertet werden kann', async () => {
    expect.assertions(1);
    try {
      await joinGame({ code: 'ZZZZZZZZ', anzeigename: 'Wer auch immer', rolle: 'spielende', uid: neueUid() }, db);
    } catch (fehler) {
      expect(fehler.code).toBeTruthy();
    }
  });
});

describe('Szenario: Runde 4 – "München" und "Munich" gelten sprachunabhängig als dieselbe Stadt (AK 6, Pre-Mortem-Risiko 4)', () => {
  test('Gegeben eine Länderkarte für "Germany" mit der englischen Schreibweise "Munich", wenn die Qualitätsauswertung berechnet wird, dann gilt der Eintrag als korrekt (richtiges Land) – genauso wie "München"', async () => {
    const karten = [{ land: 'Germany', staedte: [{ stadt: 'Munich', am: 1000 }] }];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt).toBe(1);
    expect(ergebnis.gesamt.falschesLand).toBe(0);
  });

  test('Gegeben zwei Karten für "Germany": zuerst "München" (früher), dann "Munich" (später) auf einer anderen Karte, wenn die Qualitätsauswertung berechnet wird, dann gilt "Munich" als Dublette derselben, bereits erfassten Stadt', async () => {
    const karten = [
      { land: 'Germany', staedte: [{ stadt: 'München', am: 1000 }] },
      { land: 'Germany', staedte: [{ stadt: 'Munich', am: 5000 }] },
    ];
    const ergebnis = await berechneQualitaet({ karten });
    expect(ergebnis.gesamt.korrekt).toBe(1);
    expect(ergebnis.gesamt.dublette).toBe(1);
    expect(ergebnis.proKarte[0].staedte[0].wertung).toBe('korrekt');
    expect(ergebnis.proKarte[1].staedte[0].wertung).toBe('dublette');
  });
});

describe('Szenario: Zentrale Übersetzungstabelle – Vollständigkeit DE/EN für alle Rollen/Bereiche (AK 3, 4, Pre-Mortem-Risiko 1 und 6)', () => {
  // Repräsentative Auswahl zentraler Text-Schlüssel über alle laut AK 3
  // betroffenen Bereiche hinweg (Startseite, Beitritt/Erstellung, Lobby,
  // Spielbrett, Kennzahlen/Auswertung, Fehlermeldungen) sowie zwei
  // aria-label-Schlüssel (Pre-Mortem-Risiko 6: aria-labels aus FEATURE-005
  // sollen über dieselbe Tabelle laufen, nicht separat gepflegt werden).
  // NAMENSGEBUNG dieser konkreten Schlüssel ist eine Annahme dieser BDD-Phase
  // – flow-game-impl kann andere Schlüsselnamen wählen, muss dann aber diese
  // Liste hier entsprechend anpassen statt sie zu ignorieren.
  const ERWARTETE_SCHLUESSEL = [
    'startseite.titel',
    'lobby.beitreten',
    'lobby.erstellen',
    'spielbrett.durchlaufzeit',
    'spielbrett.bearbeitungszeit',
    'fehler.ungueltigerCode',
    'fehler.spielVoll',
    'aria.kartePosition',
  ];

  test('Gegeben die zentrale Übersetzungstabelle, wenn jeder erwartete Text-Schlüssel geprüft wird, dann existiert für jeden Schlüssel sowohl ein nicht-leerer deutscher als auch ein nicht-leerer englischer Text', () => {
    ERWARTETE_SCHLUESSEL.forEach((schluessel) => {
      const eintrag = UEBERSETZUNGEN[schluessel];
      expect(eintrag).toBeDefined();
      expect(typeof eintrag.de).toBe('string');
      expect(eintrag.de.trim().length).toBeGreaterThan(0);
      expect(typeof eintrag.en).toBe('string');
      expect(eintrag.en.trim().length).toBeGreaterThan(0);
    });
  });

  test('Gegeben JEDER in der Tabelle tatsächlich vorhandene Schlüssel (nicht nur die oben exemplarisch geprüften), dann hat auch er beide Sprachvarianten befüllt (generischer Vollständigkeits-Test, verhindert künftig vergessene Einträge)', () => {
    const alleSchluessel = Object.keys(UEBERSETZUNGEN);
    expect(alleSchluessel.length).toBeGreaterThan(0);
    alleSchluessel.forEach((schluessel) => {
      const eintrag = UEBERSETZUNGEN[schluessel];
      expect(eintrag.de && eintrag.de.trim().length > 0).toBe(true);
      expect(eintrag.en && eintrag.en.trim().length > 0).toBe(true);
    });
  });

  test('Gegeben der Schlüssel "fehler.ungueltigerCode", wenn uebersetze() mit Sprache "de" bzw. "en" aufgerufen wird, dann liefert es jeweils den passenden, unterschiedlichen Text; ohne Sprachangabe gilt die Grundeinstellung Englisch (AK 1)', () => {
    const deutsch = uebersetze('fehler.ungueltigerCode', 'de');
    const englisch = uebersetze('fehler.ungueltigerCode', 'en');
    const ohneAngabe = uebersetze('fehler.ungueltigerCode');

    expect(deutsch).not.toBe(englisch);
    expect(ohneAngabe).toBe(englisch);
  });
});
