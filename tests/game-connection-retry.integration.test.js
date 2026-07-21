/**
 * BUGFIX-001 – Beitritt schlägt auf frischem Gerät fehl ("client is offline")
 * BDD-Tests (flow-game-bdd, 2026-07-21) für die Akzeptanzkriterien 1, 2, 4, 5,
 * 6, 7 aus der freigegebenen Spec in Backlog.md ("### BUGFIX-001"), sowie
 * Pre-Mortem-Risiko 2 (Kein-Doppel-Vergabe-Test unter Retry).
 *
 * Läuft bewusst OHNE Firestore-Emulator: Ein echter "client is offline"-
 * Fehler lässt sich gegen den Emulator nicht auslösen (der antwortet lokal
 * immer sofort) UND die Arbeitsumgebung kann laut mehreren vorherigen
 * Tickets (FEATURE-002/003/004) den Emulator ohnehin nicht immer erreichen
 * (Netzwerk-Allowlist). Stattdessen wird hier eine minimale, selbstgebaute
 * In-Memory-Firestore-Attrappe (unten in dieser Datei) verwendet, die exakt
 * die Teilmenge der Firestore-API implementiert, die
 * src/game/joinGame.js, src/game/createGame.js und
 * src/game/teilnehmerSession.js tatsächlich benutzen (.collection().doc(),
 * .get(), .set(), .update(), .runTransaction()) – und die gezielt für
 * einzelne Dokumentpfade einen konfigurierbaren Fehlerplan hinterlegen kann:
 * "die nächsten N Lesevorgänge auf diesem Pfad schlagen mit dem bekannten
 * Verbindungsfehler fehl, danach gelingen sie normal".
 *
 * Diese Tests rufen die ECHTEN, bereits existierenden Module auf (kein
 * "Cannot find module"-Fehlschlag zu erwarten) – sie sind trotzdem
 * erwartungsgemäß ROT, weil joinGame.js/createGame.js/teilnehmerSession.js
 * heute (Stand BUGFIX-001, vor der Implementierung) noch KEINEN Retry-
 * Mechanismus besitzen: Ein einmaliger, transienter Verbindungsfehler beim
 * Vorab-Check oder in der Transaktion führt heute zu einem sofortigen
 * Reject statt zu einem automatischen zweiten Versuch. Die Assertions unten
 * erwarten das künftige, noch nicht vorhandene Verhalten (Erfolg trotz
 * Fehlversuch) und schlagen deshalb jetzt real fehl – nicht strukturell
 * (kein Modul-/Setup-Fehler), sondern inhaltlich, was hier ausdrücklich
 * gewünscht ist (flow-game-bdd-Skill Schritt 5).
 *
 * Der Abschnitt "Regressionsfundament reguläre Fehlerfälle" ganz unten ist
 * bewusst bereits jetzt GRÜN (analog zum Muster in FEATURE-004s
 * game-round4.logic.test.js) – er dokumentiert, dass die vier regulären
 * Fehlerpfade (ungültiger Code, ungültige Rolle, Stationen belegt, Spiel
 * inaktiv) schon heute ohne jede Verzögerung funktionieren und nach der
 * Implementierung unverändert grün bleiben müssen (AK6, Pre-Mortem-Risiko 7).
 */

const { joinGame } = require('../src/game/joinGame');
const { createGame } = require('../src/game/createGame');
const { restoreTeilnehmerSession } = require('../src/game/teilnehmerSession');

const STATIONEN = ['wareneingang', 'kommissionierung', 'packstation', 'versand', 'qualitaetskontrolle'];

function verbindungsFehler() {
  const err = new Error('Failed to get document because the client is offline.');
  err.code = 'unavailable';
  return err;
}

/**
 * Minimale In-Memory-Firestore-Attrappe, siehe Datei-Kommentar oben.
 * anfangsDaten: { 'spiele/CODE': {...}, 'spiele/CODE/teilnehmende/uid': {...} }
 */
function erzeugeFakeFirestore(anfangsDaten = {}) {
  const speicher = new Map(Object.entries(anfangsDaten));
  const fehlerplan = new Map(); // Pfad -> verbleibende Fehlversuche vor Erfolg
  const leseZaehler = new Map(); // Pfad -> Anzahl tatsächlicher .get()-Aufrufe

  function ladeMitFehlerplan(pfadStr) {
    leseZaehler.set(pfadStr, (leseZaehler.get(pfadStr) || 0) + 1);
    const rest = fehlerplan.get(pfadStr);
    if (rest && rest > 0) {
      fehlerplan.set(pfadStr, rest - 1);
      throw verbindungsFehler();
    }
    const daten = speicher.get(pfadStr);
    return {
      exists: daten !== undefined,
      data: () => (daten ? { ...daten } : undefined),
      id: pfadStr.split('/').pop(),
    };
  }

  function docRef(pfadSegs) {
    const pfadStr = pfadSegs.join('/');
    return {
      id: pfadSegs[pfadSegs.length - 1],
      get: async () => ladeMitFehlerplan(pfadStr),
      set: async (daten) => {
        speicher.set(pfadStr, { ...daten });
      },
      update: async (teilDaten) => {
        const bestehend = { ...(speicher.get(pfadStr) || {}) };
        Object.entries(teilDaten).forEach(([key, value]) => {
          if (key.includes('.')) {
            const [ober, unter] = key.split('.');
            bestehend[ober] = { ...(bestehend[ober] || {}), [unter]: value };
          } else {
            bestehend[key] = value;
          }
        });
        speicher.set(pfadStr, bestehend);
      },
      collection: (name) => collectionRef([...pfadSegs, name]),
    };
  }

  function collectionRef(pfadSegs) {
    return { doc: (id) => docRef([...pfadSegs, id]) };
  }

  return {
    collection: (name) => collectionRef([name]),
    runTransaction: async (updateFn) => {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, daten) => ref.set(daten),
        update: (ref, teilDaten) => ref.update(teilDaten),
      };
      return updateFn(tx);
    },
    _setzeFehlerplan: (pfadStr, anzahl) => fehlerplan.set(pfadStr, anzahl),
    _leseVersucheFuer: (pfadStr) => leseZaehler.get(pfadStr) || 0,
    _dokument: (pfadStr) => speicher.get(pfadStr),
  };
}

function neuesSpiel(code, ueberschreibungen = {}) {
  return {
    [`spiele/${code}`]: {
      code,
      letzteAktivitaet: Date.now(),
      belegteStationen: {},
      ...ueberschreibungen,
    },
  };
}

describe('Szenario: Beitritt auf frischem Gerät trotz einmaligem Verbindungsfehler im Vorab-Check (AK1)', () => {
  test('Gegeben der Vorab-Check-Lesevorgang schlägt beim ersten Versuch mit dem bekannten Verbindungsfehler fehl und beim zweiten Versuch erfolgreich, wenn eine Person sofort nach dem Laden mit Code und Anzeigename beitritt, dann gelingt der Beitritt trotzdem, statt mit einer Fehlermeldung zu scheitern', async () => {
    const code = 'ABCD2345';
    const db = erzeugeFakeFirestore(neuesSpiel(code));
    db._setzeFehlerplan(`spiele/${code}`, 1);

    const ergebnis = await joinGame(
      { code, anzeigename: 'Frisches Gerät', rolle: 'spielende', uid: 'uid-frisch-1' },
      db
    );

    expect(ergebnis.rolle).toBe('spielende');
    expect(STATIONEN).toContain(ergebnis.station);
  });
});

describe('Szenario: Beitritt trotz einmaligem Verbindungsfehler in der eigentlichen Transaktion (AK1)', () => {
  test('Gegeben nur der Transaktions-Lesevorgang (nicht der Vorab-Check) schlägt beim ersten Versuch mit dem Verbindungsfehler fehl, wenn eine Person als Beobachtende beitritt (Vorab-Check-Zweig wird für diese Rolle nicht durchlaufen), dann gelingt der Beitritt trotzdem', async () => {
    const code = 'ABCD2346';
    const db = erzeugeFakeFirestore(neuesSpiel(code));
    // Erster get()-Aufruf auf spiele/{code} passiert bereits in der
    // Transaktion selbst (Rolle "beobachtende" überspringt den Vorab-Check
    // in joinGame.js, siehe "if (rolle === 'spielende')").
    db._setzeFehlerplan(`spiele/${code}`, 1);

    const ergebnis = await joinGame(
      { code, anzeigename: 'Beobachtende frisch', rolle: 'beobachtende', uid: 'uid-frisch-2' },
      db
    );

    expect(ergebnis.rolle).toBe('beobachtende');
  });
});

describe('Szenario: Echt-offline-Fall erreicht die Obergrenze und liefert eine klare Fehlermeldung (AK2)', () => {
  test('Gegeben JEDER Versuch auf diesem Spiel-Dokument schlägt mit dem Verbindungsfehler fehl (echtes Offline-Gerät), wenn eine Person beitreten will, dann bekommt sie nach einer begrenzten, kleinen Anzahl automatischer Versuche weiterhin eine Fehlermeldung – kein endloses Warten, kein stilles Hängenbleiben', async () => {
    const code = 'ABCD2347';
    const db = erzeugeFakeFirestore(neuesSpiel(code));
    db._setzeFehlerplan(`spiele/${code}`, 999); // schlägt praktisch immer fehl

    await expect(
      joinGame({ code, anzeigename: 'Wirklich offline', rolle: 'beobachtende', uid: 'uid-offline-1' }, db)
    ).rejects.toThrow();

    // Es müssen MEHRERE, aber eine begrenzte Anzahl an Versuchen erfolgt
    // sein (mehr als 1 -> es gab überhaupt einen Retry; deutlich weniger als
    // die künstlich hohe Fehlerplan-Zahl 999 -> keine Endlosschleife).
    const versuche = db._leseVersucheFuer(`spiele/${code}`);
    expect(versuche).toBeGreaterThan(1);
    expect(versuche).toBeLessThanOrEqual(6);
  });
});

describe('Szenario: Automatisches Wiederbetreten auf frischem Gerät trifft dasselbe Zeitfenster (AK4)', () => {
  test('Gegeben der eigene Vorab-Lesevorgang in restoreTeilnehmerSession() schlägt beim ersten Versuch mit dem Verbindungsfehler fehl, wenn jemand mit gespeicherter Sitzung auf einem frischen Gerät neu lädt, dann gelingt das automatische Wiederbetreten trotzdem', async () => {
    const code = 'ABCD2348';
    const uid = 'uid-rejoin-1';
    const db = erzeugeFakeFirestore({
      ...neuesSpiel(code),
      [`spiele/${code}/teilnehmende/${uid}`]: { rolle: 'spielende', anzeigename: 'Rejoin-Person', station: 'versand' },
    });
    db._setzeFehlerplan(`spiele/${code}/teilnehmende/${uid}`, 1);

    const ergebnis = await restoreTeilnehmerSession(
      { code, rolle: 'spielende', anzeigename: 'Rejoin-Person', uid },
      db
    );

    expect(ergebnis.warRejoin).toBe(true);
    expect(ergebnis.station).toBe('versand');
  });

  test('Gegeben nicht der eigene Vorab-Lesevorgang, sondern der anschließende joinGame()-Aufruf schlägt beim ersten Versuch mit dem Verbindungsfehler fehl, wenn jemand mit gespeicherter Sitzung auf einem frischen Gerät neu lädt, dann gelingt das automatische Wiederbetreten ebenfalls trotzdem', async () => {
    const code = 'ABCD2349';
    const uid = 'uid-rejoin-2';
    const db = erzeugeFakeFirestore({
      ...neuesSpiel(code),
      [`spiele/${code}/teilnehmende/${uid}`]: { rolle: 'beobachtende', anzeigename: 'Rejoin-Person 2' },
    });
    // Fehlerplan erst NACH dem ersten, erfolgreichen eigenen Vorab-Read
    // wirksam machen, indem wir ihn erst nach 1 Erfolg greifen lassen wäre
    // mit dieser einfachen Attrappe nicht direkt steuerbar – stattdessen
    // zielt dieser Test auf spiele/{code} selbst, das ausschliesslich
    // innerhalb von joinGame() gelesen wird, NICHT im eigenen Vorab-Read von
    // restoreTeilnehmerSession() (der liest nur den Teilnehmer-Pfad).
    db._setzeFehlerplan(`spiele/${code}`, 1);

    const ergebnis = await restoreTeilnehmerSession(
      { code, rolle: 'beobachtende', anzeigename: 'Rejoin-Person 2', uid },
      db
    );

    expect(ergebnis.warRejoin).toBe(true);
    expect(ergebnis.rolle).toBe('beobachtende');
  });
});

describe('Szenario: Host-Erstellungspfad auf frischem Gerät trotz einmaligem Verbindungsfehler (AK7)', () => {
  test('Gegeben der Lesevorgang innerhalb der Code-Erzeugungs-Transaktion schlägt beim ersten Versuch mit dem Verbindungsfehler fehl, wenn ein Host auf einem frischen Gerät ein neues Spiel erstellt, dann gelingt die Erstellung trotzdem, statt mit einer Fehlermeldung zu scheitern', async () => {
    const db = erzeugeFakeFirestore();
    // Der erste von createGame() versuchte Zufallscode ist unbekannt (Zufall)
    // - wir markieren daher testweise ALLE möglichen Erstversuche, indem wir
    // den Fehlerplan erst setzen, nachdem createGame() den ersten Code
    // gewählt hat, ist mit dieser einfachen Attrappe nicht vorab möglich.
    // Stattdessen wird deterministisch geprüft: mindestens EIN Lesevorgang
    // (der erste von createGame() versuchte Code) schlägt konsequent mit dem
    // Verbindungsfehler fehl, indem der Fehlerplan pauschal auf jeden neuen,
    // bislang unbekannten Pfad angewendet wird (siehe Attrappen-Variante
    // unten: erster Zugriff auf einen beliebigen spiele/*-Pfad schlägt an,
    // Erfolg erst danach).
    const urspruenglicherSetzeFehlerplan = db._setzeFehlerplan;
    const bereitsFehlgeschlagenePfade = new Set();
    const originalCollection = db.collection;
    db.collection = function (name) {
      const ref = originalCollection(name);
      const originalDoc = ref.doc;
      ref.doc = function (id) {
        const pfadStr = `${name}/${id}`;
        if (name === 'spiele' && !bereitsFehlgeschlagenePfade.has(pfadStr)) {
          bereitsFehlgeschlagenePfade.add(pfadStr);
          urspruenglicherSetzeFehlerplan(pfadStr, 1);
        }
        return originalDoc(id);
      };
      return ref;
    };

    const ergebnis = await createGame({ hostAnzeigename: 'Host frisch', uid: 'uid-host-frisch' }, db);

    expect(ergebnis.code).toHaveLength(8);
  });
});

describe('Szenario: Kein-Doppel-Vergabe-Test unter Retry (Pre-Mortem-Risiko 2)', () => {
  test('Gegeben der Transaktions-Lesevorgang schlägt beim ersten Beitrittsversuch derselben Person mit dem Verbindungsfehler fehl (Retry greift), wenn dieselbe Person aufgrund einer äußeren Wiederholung (z. B. UI-seitiger Doppel-Tap während der Wartezeit) danach nochmal denselben Beitritt auslöst, dann bekommt sie in Summe nur eine einzige Station und es entsteht kein zweiter belegteStationen-Eintrag – die bestehende Idempotenz aus dem Bugfix vom 2026-07-20 bleibt auch unter Retry-Bedingungen wirksam', async () => {
    const code = 'ABCD2350';
    const uid = 'uid-doppel-retry';
    const db = erzeugeFakeFirestore(neuesSpiel(code));
    db._setzeFehlerplan(`spiele/${code}`, 1);

    const ersterVersuch = await joinGame({ code, anzeigename: 'Doppel Retry', rolle: 'spielende', uid }, db);
    const zweiterVersuch = await joinGame({ code, anzeigename: 'Doppel Retry', rolle: 'spielende', uid }, db);

    expect(zweiterVersuch.station).toBe(ersterVersuch.station);
    const spielDaten = db._dokument(`spiele/${code}`);
    const eintraegeFuerDiesePerson = Object.entries(spielDaten.belegteStationen || {}).filter(
      ([, wert]) => wert === uid
    );
    expect(eintraegeFuerDiesePerson).toHaveLength(1);
  });
});

describe('Szenario: Regressionsfundament reguläre Fehlerfälle bleiben unverändert und unverzögert (AK6, Pre-Mortem-Risiko 7) – bewusst bereits jetzt grün', () => {
  test('Gegeben kein Spiel mit diesem Code existiert, wenn jemand beitreten will, dann kommt sofort (ohne jeden Retry-Versuch) dieselbe Fehlermeldung wie bisher', async () => {
    const db = erzeugeFakeFirestore();
    await expect(
      joinGame({ code: 'ZZZZZZZZ', anzeigename: 'Wer auch immer', rolle: 'spielende', uid: 'uid-x' }, db)
    ).rejects.toThrow(/code/i);
  });

  test('Gegeben eine ungültige Rolle wird übergeben, wenn jemand beitreten will, dann kommt sofort dieselbe Fehlermeldung wie bisher', async () => {
    const code = 'ABCD2351';
    const db = erzeugeFakeFirestore(neuesSpiel(code));
    await expect(
      joinGame({ code, anzeigename: 'Falsche Rolle', rolle: 'kapitaen', uid: 'uid-y' }, db)
    ).rejects.toThrow(/rolle/i);
  });

  test('Gegeben bereits alle fünf Stationen sind belegt, wenn eine sechste Person automatisch als Spielende beitreten will, dann kommt sofort dieselbe Fehlermeldung wie bisher', async () => {
    const code = 'ABCD2352';
    const belegteStationen = STATIONEN.reduce((acc, s, i) => ({ ...acc, [s]: `uid-vorab-${i}` }), {});
    const db = erzeugeFakeFirestore(neuesSpiel(code, { belegteStationen }));
    await expect(
      joinGame({ code, anzeigename: 'Sechste Person', rolle: 'spielende', uid: 'uid-sechste' }, db)
    ).rejects.toThrow(/belegt/i);
  });

  test('Gegeben ein Spiel ist seit über 24 Stunden inaktiv, wenn jemand mit dessen Code beitreten will, dann kommt sofort dieselbe Fehlermeldung wie bisher', async () => {
    const code = 'ABCD2353';
    const db = erzeugeFakeFirestore(
      neuesSpiel(code, { letzteAktivitaet: Date.now() - 25 * 60 * 60 * 1000 })
    );
    await expect(
      joinGame({ code, anzeigename: 'Zu spät', rolle: 'spielende', uid: 'uid-z' }, db)
    ).rejects.toThrow(/inaktiv/i);
  });
});
