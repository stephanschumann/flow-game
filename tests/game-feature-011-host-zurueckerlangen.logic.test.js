/**
 * FEATURE-011 – Gastgeber-Rolle zurückerlangen können.
 * BDD-Tests (flow-game-bdd, 2026-08-08) für die freigegebene Spec in
 * Backlog.md ("### FEATURE-011", Analyse-Spec 2026-08-08, Option A
 * empfohlen/übernommen), Akzeptanzkriterien 1, 2, 3, 4, 8, 9, 10 sowie die
 * Pre-Mortem-Risiken 3 und 5.
 *
 * Prüft die ECHTEN Module src/game/hostSession.js und src/game/createGame.js
 * gegen tests/helpers/fakeFirestore.js (echter Firestore-Emulator in dieser
 * Sandbox durch die Organisations-Egress-Policy blockiert, siehe Präzedenzfall
 * BUGFIX-005/FEATURE-018).
 *
 * WICHTIGER HINWEIS ZUR DATEIZUORDNUNG (Abweichung vom Testplan-Grundgerüst,
 * Pflichtangabe laut flow-game-bdd-Skill Schritt 4a): Das Testplan-Grundgerüst
 * ordnet AK3 ("falscher Code ODER falsches Kennzeichen liefert denselben
 * Fehlercode") dieser Logik-Datei zu. tests/helpers/fakeFirestore.js hat aber
 * KEINE Regel-Engine – jeder .set()-Aufruf gelingt dort immer, unabhängig vom
 * Inhalt. Die eigentliche, serverautoritative Ablehnung eines falschen Codes/
 * Kennzeichens lässt sich deshalb NICHT hier, sondern ausschliesslich in
 * tests/game-feature-011-host-zurueckerlangen.security.rules.test.js sinnvoll
 * prüfen (siehe dort). Diese Datei testet stattdessen die vom echten Code
 * bereits übernommene Fehler-ÜBERSETZUNG (jede von Firestore abgelehnte
 * Schreib-Operation wird zu HOST_KENNUNG_UNGUELTIG) sowie alle Aspekte, die
 * tatsächlich auf Ebene der Anwendungslogik beobachtbar sind. OFFENER PUNKT
 * FÜR STEPHAN: bitte bestätigen, dass diese Umverteilung so gewollt ist.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-018 – die genaue Herkunft des "war vorher
 * mitspielend"-Signals ist laut Spec-Abschnitt "Reichweite von
 * Implementierungsdetail-Festlegungen (5a)" ausdrücklich NICHT vorentschieden.
 * Für diese BDD-Phase wird angenommen, dass restoreHostSession() sein
 * Rückgabeobjekt um zwei Felder erweitert:
 *   - warVorherMitspielenderHost: boolean – true, wenn im selben Spiel
 *     (spiele/{code}.belegteStationen) eine Station auf eine ANDERE
 *     (bereits existierende) uid verweist, deren teilnehmende/{uid}-Dokument
 *     rolle:'host' UND ein station-Feld trägt.
 *   - verwaisteStation: die Kennung dieser Station, sonst null.
 * OFFENER PUNKT FÜR STEPHAN: Diese exakte Rückgabeform ist eine BDD-Annahme,
 * KEINE von Stephan getroffene Entscheidung – bei der Implementierung bitte
 * bestätigen oder anders benennen (Testfälle müssten dann entsprechend
 * angepasst werden).
 *
 * WICHTIG – bewusst RED beim ersten Lauf: restoreHostSession() liefert diese
 * beiden neuen Felder heute noch nicht, entsprechend schlagen die mit "NEU"
 * markierten describe-Blöcke jetzt fehl. Die mit "BEREITS ERFÜLLT"/
 * "REGRESSION" markierten Blöcke nutzen ausschliesslich den bereits
 * bestehenden, unveränderten Mechanismus (Option A: "nutzt zu über 90%
 * bereits bestehende ... Bausteine") und sind deshalb bewusst schon GRÜN –
 * das ist kein Fehlalarm, sondern belegt genau die in der Spec getroffene
 * Einschätzung.
 *
 * Framework: Jest, reine Funktionslogik mit In-Memory-Fake-Firestore.
 */

const { erzeugeFakeDb } = require('./helpers/fakeFirestore');
const { createGame, STATIONEN } = require('../src/game/createGame');
const { restoreHostSession } = require('../src/game/hostSession');

let db;
let naechsteUid = 0;
function neueUid(praefix = 'uid') {
  naechsteUid += 1;
  return `${praefix}-${naechsteUid}`;
}

beforeEach(() => {
  db = erzeugeFakeDb();
});

describe('BEREITS ERFÜLLT (AK1/AK2): manuelle Zurückeroberung auf einem komplett neuen Gerät liefert denselben Endzustand wie der automatische Wiederherstellungspfad', () => {
  test('Gegeben ein Host hat ein Spiel erstellt und sein lokaler Zustand geht verloren (simuliert: eine komplett neue uid kennt Code + Host-Kennzeichen), wenn diese neue uid restoreHostSession() mit Code und Kennzeichen aufruft, dann bekommt sie rolle="host" für genau dieses Spiel zurück – ununterscheidbar vom automatischen Pfad', async () => {
    const alteUid = neueUid('host-altes-geraet');
    const { code, hostSessionKennung } = await createGame(
      { hostAnzeigename: 'Host', uid: alteUid },
      db
    );

    const neueGeraetUid = neueUid('host-neues-geraet');
    const ergebnis = await restoreHostSession(
      { code, hostSessionKennung, uid: neueGeraetUid },
      db
    );

    expect(ergebnis.rolle).toBe('host');
    expect(ergebnis.spielCode).toBe(code);

    const neuesDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(neueGeraetUid).get();
    expect(neuesDoc.data().rolle).toBe('host');
  });
});

describe('NEU (Pre-Mortem-Risiko 5, AK8): eine vormals mitspielende gastgebende Person wird nach der Zurückeroberung auf einer neuen uid als "vorher mitspielend" erkannt', () => {
  test('Gegeben ein mitspielender Host hat eine Station belegt und verliert danach seinen lokalen Zustand, wenn eine neue uid mit korrektem Code + Kennzeichen die Rolle zurückerobert, dann signalisiert das Ergebnis, dass vorher eine Station belegt war, UND die alte Station bleibt unverändert der alten uid zugeordnet, UND die neue uid bekommt selbst KEINE Station', async () => {
    const alteUid = neueUid('mitspielender-host-altes-geraet');
    const { code, hostSessionKennung } = await createGame(
      { hostAnzeigename: 'Mitspielender Host', uid: alteUid, mitspielen: true },
      db
    );
    const alteDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(alteUid).get();
    const alteStation = alteDoc.data().station;
    expect(STATIONEN).toContain(alteStation);

    const neueGeraetUid = neueUid('host-neues-geraet');
    const ergebnis = await restoreHostSession(
      { code, hostSessionKennung, uid: neueGeraetUid },
      db
    );

    expect(ergebnis.warVorherMitspielenderHost).toBe(true);
    expect(ergebnis.verwaisteStation).toBe(alteStation);

    const spielDoc = await db.collection('spiele').doc(code).get();
    expect(spielDoc.data().belegteStationen[alteStation]).toBe(alteUid);

    const neuesDoc = await db.collection('spiele').doc(code).collection('teilnehmende').doc(neueGeraetUid).get();
    expect(neuesDoc.data().station).toBeUndefined();
  });
});

describe('REGRESSION (AK9): eine klassische, nie mitspielende gastgebende Person wird nach der Zurückeroberung NICHT als "vorher mitspielend" erkannt', () => {
  test('Gegeben ein klassischer, nicht mitspielender Host verliert seinen lokalen Zustand, wenn eine neue uid mit korrektem Code + Kennzeichen die Rolle zurückerobert, dann bleibt das "vorher mitspielend"-Signal false', async () => {
    const alteUid = neueUid('klassischer-host-altes-geraet');
    const { code, hostSessionKennung } = await createGame(
      { hostAnzeigename: 'Klassischer Host', uid: alteUid },
      db
    );

    const neueGeraetUid = neueUid('host-neues-geraet');
    const ergebnis = await restoreHostSession(
      { code, hostSessionKennung, uid: neueGeraetUid },
      db
    );

    expect(ergebnis.warVorherMitspielenderHost).toBe(false);
    expect(ergebnis.verwaisteStation).toBeNull();
  });
});

describe('REGRESSION (BUGFIX-005 über den neuen, manuellen Aufrufpfad): ein bereits bestehendes, andersrolliges Teilnehmenden-Dokument wird auch bei der manuellen Zurückeroberung nicht überschrieben', () => {
  test('Gegeben dieselbe uid ist in diesem Spiel bereits mit rolle="spielende" beigetreten, wenn dieselbe uid danach versucht, über restoreHostSession() (den auch vom neuen manuellen Formular genutzten Pfad) die Host-Rolle zu reklamieren, dann wird das mit HOST_ROLLE_BEREITS_ANDERWEITIG_VERGEBEN abgelehnt und die Rolle bleibt "spielende"', async () => {
    const hostUid = neueUid('host');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host', uid: hostUid }, db);

    const spielerUid = neueUid('spieler');
    await db.collection('spiele').doc(code).collection('teilnehmende').doc(spielerUid).set({
      rolle: 'spielende',
      station: 'wareneingang',
      anzeigename: 'Bereits beigetreten',
    });

    await expect(
      restoreHostSession({ code, hostSessionKennung, uid: spielerUid }, db)
    ).rejects.toMatchObject({ code: 'HOST_ROLLE_BEREITS_ANDERWEITIG_VERGEBEN' });

    const nachher = await db.collection('spiele').doc(code).collection('teilnehmende').doc(spielerUid).get();
    expect(nachher.data().rolle).toBe('spielende');
  });
});

describe('NEU (Pre-Mortem-Risiko 3): doppeltes, gleichzeitiges Absenden des manuellen Formulars bleibt idempotent', () => {
  test('Gegeben eine neue uid ruft restoreHostSession() zweimal gleichzeitig mit demselben, korrekten Code + Kennzeichen auf (z. B. Doppelklick ohne Knopf-Deaktivierung), wenn beide Aufrufe verarbeitet werden, dann schlägt keiner der beiden fehl und der Endzustand ist in beiden Fällen konsistent rolle="host" für dieselbe uid', async () => {
    const alteUid = neueUid('host-altes-geraet');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host', uid: alteUid }, db);
    const neueGeraetUid = neueUid('host-neues-geraet');

    const [ergebnisA, ergebnisB] = await Promise.all([
      restoreHostSession({ code, hostSessionKennung, uid: neueGeraetUid }, db),
      restoreHostSession({ code, hostSessionKennung, uid: neueGeraetUid }, db),
    ]);

    expect(ergebnisA.rolle).toBe('host');
    expect(ergebnisB.rolle).toBe('host');

    const nachher = await db.collection('spiele').doc(code).collection('teilnehmende').doc(neueGeraetUid).get();
    expect(nachher.data().rolle).toBe('host');
  });
});

describe('REGRESSION (Fehler-Übersetzung, verwandt mit AK3): jede von Firestore abgelehnte Schreib-Operation beim Zurückerobern wird weiterhin einheitlich als HOST_KENNUNG_UNGUELTIG übersetzt, unabhängig von der eigentlichen Ursache', () => {
  test('Gegeben der zugrundeliegende Schreibversuch schlägt fehl (z. B. weil die echte firestore.rules-Regel serverseitig ablehnt – hier durch einen fehlschlagenden .set()-Aufruf simuliert), wenn restoreHostSession() aufgerufen wird, dann wird der Fehler als HOST_KENNUNG_UNGUELTIG geworfen, nicht als roher Firestore-Fehler', async () => {
    const alteUid = neueUid('host-altes-geraet');
    const { code, hostSessionKennung } = await createGame({ hostAnzeigename: 'Host', uid: alteUid }, db);
    const neueGeraetUid = neueUid('host-neues-geraet');

    // db.collection() erzeugt bei jedem Aufruf eine frische Objektkette (kein
    // Caching, siehe tests/helpers/fakeFirestore.js) – deshalb wird hier die
    // TOP-LEVEL collection()-Methode selbst umgebaut, damit der von
    // restoreHostSession() intern geführte Aufruf denselben präparierten
    // teilnehmende-Ref bekommt, statt eine lokal isolierte Kopie zu patchen.
    const echteCollection = db.collection.bind(db);
    db.collection = (name) => {
      const collectionRef = echteCollection(name);
      if (name !== 'spiele') return collectionRef;
      const echtesDocAufSpiele = collectionRef.doc.bind(collectionRef);
      return {
        ...collectionRef,
        doc: (spielCode) => {
          const spielDocRef = echtesDocAufSpiele(spielCode);
          const echteSubCollection = spielDocRef.collection.bind(spielDocRef);
          return {
            ...spielDocRef,
            collection: (subName) => {
              const subCollectionRef = echteSubCollection(subName);
              if (subName !== 'teilnehmende') return subCollectionRef;
              const echtesDocAufTeilnehmende = subCollectionRef.doc.bind(subCollectionRef);
              return {
                ...subCollectionRef,
                doc: (uidArg) => {
                  const docRef = echtesDocAufTeilnehmende(uidArg);
                  if (uidArg !== neueGeraetUid) return docRef;
                  const echtesSet = docRef.set.bind(docRef);
                  let aufgerufen = false;
                  return {
                    ...docRef,
                    set: async (...args) => {
                      if (!aufgerufen) {
                        aufgerufen = true;
                        throw new Error('PERMISSION_DENIED (simuliert: falsches Kennzeichen)');
                      }
                      return echtesSet(...args);
                    },
                  };
                },
              };
            },
          };
        },
      };
    };

    await expect(
      restoreHostSession({ code, hostSessionKennung: `${hostSessionKennung}-falsch`, uid: neueGeraetUid }, db)
    ).rejects.toMatchObject({ code: 'HOST_KENNUNG_UNGUELTIG' });
  });
});
