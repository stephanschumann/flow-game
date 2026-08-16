/**
 * BUGFIX-016 – Beteiligungsspanne kann bei Reload/spätem Beitritt mitten in
 * der Runde fälschlich zu niedrig sein.
 *
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die von Stephan am 2026-08-14
 * 17:14 freigegebene Spec in Backlog.md ("### BUGFIX-016", Abschnitte
 * "Stephans Entscheidung zur Spec", "Akzeptanzkriterien", "Pre-Mortem",
 * "Regressionsrisiko" und "Testplan-Grundgerüst").
 *
 * FREIGEGEBENER UMFANG (nicht erneut zur Diskussion gestellt):
 *  - Alle VIER aus dem Bewegungs-Mitschnitt abgeleiteten Werte je Station
 *    werden gemeinsam richtiggestellt: anzahlBewegungen, beteiligungsspanne,
 *    wartezeitVorher, wartezeitNachher – einschliesslich Runde 4.
 *  - Lösungsweg: Option B (Ursache beseitigen). Jede Kartenbewegung legt
 *    zusätzlich einen unveränderlichen Historieneintrag mit servergesetztem
 *    Zeitstempel an, gemeinsam mit der Kartenänderung in EINEM einzigen
 *    Schreibvorgang; das Rundenende rechnet aus dieser für alle gleichen
 *    Historie statt aus dem flüchtigen lokalen `bewegungsLog`.
 *  - AK5 (niemand hat die vollständige Historie): ehrliche Kennzeichnung als
 *    unvollständig, KEIN stillschweigender Näherungswert.
 *  - Neuladen und späterer Beitritt sind voll unterstützte Normalfälle;
 *    Manipulationsschutz ist ausdrücklich KEIN Ziel dieses Tickets.
 *
 * NICHT TEIL DIESER DATEI (Stephans Entscheidung, Offene Frage 6 der Spec):
 * der tote Übergabeparameter `dorAbgeschlossenAm` an
 * pruefeUndSetzeRundenEnde() samt irreführendem Kommentar. Der wird hier
 * weder getestet noch mitgefixt.
 *
 * BERICHTIGUNG (2026-08-15, zweite Prüfrunde): Der zweite Nebenbefund – der
 * Würfel-Zwischenwurf in Runde 4 – stand hier ursprünglich ebenfalls als
 * "nicht Teil dieser Datei". Das ist überholt. Stephan hat in der
 * Zweitprüfung entschieden: "Alle Versuche müssen mitzählen." Ein
 * misslungener Würfelversuch ist eine echte Tätigkeit, legt einen eigenen
 * Historieneintrag (art: 'wuerfelversuch') an und geht in die
 * Tätigkeitszahl ein. Er wird in dieser Datei ausdrücklich getestet – siehe
 * die Szenarien ab "Ein misslungener Würfelversuch wird gemeinsam mit dem
 * Würfelzähler dauerhaft festgehalten" weiter unten.
 *
 * WARUM DIESE DATEI DIE ECHTE BROWSER-FASSUNG LÄDT (Pflicht aus der Spec,
 * Abschnitt "Node-Referenz/Browser-Sync-Check"): Der Fehler lebt
 * AUSSCHLIESSLICH in der Browser-Fassung. `src/game/kennzahlen.js` rechnet
 * aus bereits vor-aggregierten Bewegungen und kann diesen Fehler strukturell
 * gar nicht abbilden – ein Test gegen `src/game/**` könnte den Bug also
 * grundsätzlich nicht nachweisen. Diese Datei lädt deshalb die echten
 * Produktivdateien `public/js/game/kennzahlen.js`,
 * `public/js/game/kartenBewegung.js`, `public/js/game/rundenEnde.js` und
 * `public/js/game/rundeVier.js` über eine minimale vm-Sandbox, die `window`
 * als globales Objekt bereitstellt – exakt wie public/spiel.html es per
 * <script>-Tags tut (kein Bundler im Projekt), nach demselben bereits
 * etablierten Muster wie tests/game-task-004-kennzahlen-browser.integration.
 * test.js und tests/game-bugfix-014-createGame-browser.integration.test.js.
 *
 * ANGENOMMENES DATENMODELL / NAMENSGEBUNG (eigene, begründete Festlegung
 * dieser BDD-Phase – gleiches Vorgehen und dieselbe Offenheit wie in
 * tests/game-drag-drop.security.rules.test.js; die Spec legt Option B fest,
 * aber nicht die Feldnamen. Falls `flow-game-impl` eine andere Ablage wählt,
 * bitte MIT DIESEN TESTS ABGLEICHEN statt sie stillschweigend zu ändern):
 *
 *   Sammlung:  spiele/{code}/runden/{runde}/bewegungen/{bewegungId}
 *   Felder:    station       Zahl 1–5 (Zuordnung wie heute in spiel.html:
 *                            Math.max(nachPosition - 1, 1))
 *              kartenId      Karten-/Element-Id der bewegten Karte
 *              uid           wer die Bewegung ausgeführt hat
 *              wann          SERVERGESETZTER Zeitstempel (Product.md §9)
 *              nachPosition  neue Position der Karte (1–6)
 *              stapel        Stapelkennung oder null (Runde 2)
 *   Regeln:    nur Anlegen (create), niemals Ändern/Löschen; anlegen darf
 *              genau die Person, die die zugehörige Bewegung ausführen darf.
 *              -> siehe tests/game-bugfix-016-bewegungshistorie.security.rules.test.js
 *
 *   Vollständigkeits-Kennzeichnung (AK5/AK9): Das beim Rundenende
 *   geschriebene Rundendokument trägt zusätzlich ein Wahrheitswert-Feld
 *   `kennzahlenVollstaendig`. Der Sollwert der Historieneinträge ist aus dem
 *   Kartenbestand selbst ableitbar: ein Element, das jetzt auf Position p
 *   steht, ist von der Startposition der Runde aus genau die Schritte
 *   Startposition+1 .. p gegangen. Runden 1–3 starten auf Position 0 – sechs
 *   Karten im Ziel ergeben 36 Weitergaben.
 *
 *   BERICHTIGUNG (2026-08-15, zweite Prüfrunde): Für Runde 4 stand hier
 *   ursprünglich "12 Elemente x Position 6 = 72". Das war falsch.
 *   starteRundeVier() legt ALLE zwölf Elemente auf Position 1 an
 *   (public/js/game/rundeVier.js) – real sind es deshalb fünf Weitergaben je
 *   Element und damit 60 Weitergaben, je zwölf pro Station. Siehe
 *   baueVollstaendigeHistorieRundeVier() weiter unten, das seit der
 *   Zweitprüfung diesen real möglichen Verlauf abbildet.
 *
 *   Würfelversuche gehen in diesen Sollwert bewusst NICHT ein – ihre Zahl
 *   schwankt und ist aus dem Spielstand nicht ableitbar. In die
 *   Tätigkeitszahl gehen sie sehr wohl ein. Liegen weniger Weitergaben vor
 *   als der Sollwert – oder trägt irgendein Eintrag einer Station keinen
 *   auflösbaren Zeitpunkt –, ist die Historie nachweislich unvollständig;
 *   dann werden die betroffenen Pro-Station-Werte als `null` geschrieben
 *   (ehrliche Fehlanzeige, wird in der Anzeige zu "—") statt als
 *   stillschweigend zu niedrige Zahl.
 *
 * ERWARTETES ROT VOR DER IMPLEMENTIERUNG (Red im Red-Green-Refactor-Sinn):
 * Zum Zeitpunkt des Schreibens existiert weder die Sammlung `bewegungen`
 * noch das Feld `kennzahlenVollstaendig` (Repo-weite Suche in
 * public/, src/, firestore.rules: 0 Treffer). `pruefeUndSetzeRundenEnde()`
 * rechnet weiterhin aus dem übergebenen, flüchtigen lokalen `bewegungsLog`.
 * Alle Szenarien, die daraus etwas anderes verlangen, schlagen deshalb JETZT
 * bewusst fehl – das ist der gewünschte Zustand und keine Fehlermeldung.
 * Ausdrücklich als "soll schon heute grün sein" markiert sind nur die
 * Regressions-/Polaritäts-Gegenproben (AK6, AK10).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------------------
// Zeitachse der Fixtures (feste, von Hand nachrechenbare Werte)
// ---------------------------------------------------------------------------

const T = 1700000000000;                 // Basiszeitpunkt der Runde
const DURCHLAUFZEIT_START = T - 60000;
const BEARBEITUNGSZEIT_START = T - 30000;
const RUNDENENDE_ZEIT = T + 100000;      // fester Date.now() im Rundenende

/** Sentinel, den die Sandbox für firebase.firestore.FieldValue.serverTimestamp() liefert. */
const SERVER_ZEITSTEMPEL = { __serverTimestamp: true };

/** Feste "Serveruhr" der Fake-Datenbank – jeder aufgelöste Serverzeitstempel bekommt diesen Wert. */
const SERVER_UHR = T + 90000;

// ---------------------------------------------------------------------------
// Sandbox-Loader für die ECHTEN Browser-Produktivdateien
// ---------------------------------------------------------------------------

function ladeBrowserFlowGame() {
  const sandbox = {};
  sandbox.window = sandbox;

  // setTimeout/clearTimeout sind keine ECMAScript-Standard-Globals und in
  // einem frischen vm.createContext() nicht automatisch vorhanden (gleiche
  // Begründung wie in tests/game-bugfix-014-createGame-browser.integration.test.js).
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;

  // Date mit fest eingestellter Uhr: pruefeUndSetzeRundenEnde() bildet
  // `bearbeitungszeitEnde` aus Date.now() (bewusste, dokumentierte Näherung,
  // siehe Kopfkommentar von public/js/game/rundenEnde.js). Ohne feste Uhr
  // wären wartezeitNachher/durchlaufzeit nicht von Hand nachrechenbar.
  class TestDate extends Date {}
  TestDate.now = () => RUNDENENDE_ZEIT;
  sandbox.Date = TestDate;

  // rundeVier.js lädt beim Laden des Skripts einmalig public/data/staedte-
  // referenz.json per fetch() und fällt bei Nichterreichbarkeit bewusst auf
  // seine eingebettete Kernliste zurück (BUGFIX-012, AK7). Im Test gibt es
  // kein Netz -> abgelehntes Promise, der vorhandene .catch()-Zweig greift.
  sandbox.fetch = () => Promise.reject(new Error('kein Netzwerk im Test'));

  sandbox.konsolenWarnungen = [];
  sandbox.console = {
    log: () => {},
    info: () => {},
    error: (...args) => { sandbox.konsolenWarnungen.push(args.join(' ')); },
    warn: (...args) => { sandbox.konsolenWarnungen.push(args.join(' ')); },
  };

  // Firestore-Serverzeitstempel als Sentinel – die Fake-Datenbank löst ihn
  // beim Schreiben auf. Damit ist im Test unterscheidbar, ob ein Zeitwert
  // servergesetzt (Product.md §9) oder aus der Browser-Uhr stammt.
  sandbox.firebase = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => SERVER_ZEITSTEMPEL,
      },
    },
  };

  vm.createContext(sandbox);

  [
    'public/js/game/verbindungsRetry.js',
    'public/js/game/createGame.js',   // liefert FlowGame.STATIONEN für kartenBewegung.js
    'public/js/game/kennzahlen.js',
    'public/js/game/kartenBewegung.js',
    'public/js/game/rundenEnde.js',
    'public/js/game/rundeVier.js',
  ].forEach((datei) => {
    const quelltext = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    vm.runInContext(quelltext, sandbox, { filename: datei });
  });

  return { FlowGame: sandbox.window.FlowGame, sandbox };
}

// ---------------------------------------------------------------------------
// Fake-Firestore mit Unterstützung für Unter-Sammlungen, Sammlungs-Abfragen
// und atomare Batch-Schreibvorgänge
// ---------------------------------------------------------------------------

/**
 * Bewusst eigenständig (statt tests/helpers/fakeFirestore.js zu erweitern):
 * die dortige Fassung kennt weder Sammlungs-Abfragen (collection().get())
 * noch db.batch() und wird von BUGFIX-005/FEATURE-018-Tests unverändert
 * gebraucht – eine Erweiterung wäre unnötiges Regressionsrisiko an fremden
 * Tests.
 *
 * `historieSchreibenSchlaegtFehl`: simuliert eine vom Server abgelehnte
 * Historie-Schreiboperation (z. B. Regelverstoss oder Verbindungsabbruch).
 * Wichtig: die Ablehnung wird VOR dem Anwenden irgendeiner Teiloperation
 * ausgelöst – genau wie ein echter Firestore-Batch, bei dem die Ablehnung
 * einer einzelnen Operation den gesamten Commit verwirft.
 */
function erzeugeFakeDb({ historieSchreibenSchlaegtFehl = false } = {}) {
  const speicher = new Map();
  const protokoll = { schreibvorgaenge: [], serverZeitFelder: {} };

  function istHistorienPfad(pfad) {
    return pfad.includes('/bewegungen/');
  }

  function loeseServerzeitstempelAuf(pfad, daten) {
    const ergebnis = {};
    Object.keys(daten).forEach((schluessel) => {
      if (daten[schluessel] === SERVER_ZEITSTEMPEL) {
        ergebnis[schluessel] = SERVER_UHR;
        protokoll.serverZeitFelder[pfad] = (protokoll.serverZeitFelder[pfad] || []).concat(schluessel);
      } else {
        ergebnis[schluessel] = daten[schluessel];
      }
    });
    return ergebnis;
  }

  /** Alles-oder-nichts: erst prüfen, dann anwenden. */
  function wendeAtomarAn(operationen) {
    if (historieSchreibenSchlaegtFehl && operationen.some((op) => istHistorienPfad(op.pfad))) {
      const fehler = new Error('PERMISSION_DENIED (simuliert): Historieneintrag abgelehnt');
      fehler.code = 'permission-denied';
      throw fehler;
    }
    operationen.forEach((op) => {
      const daten = loeseServerzeitstempelAuf(op.pfad, op.daten);
      const bestehend = speicher.get(op.pfad) || {};
      speicher.set(op.pfad, op.typ === 'set' ? { ...daten } : { ...bestehend, ...daten });
    });
    protokoll.schreibvorgaenge.push(operationen.map((op) => ({ typ: op.typ, pfad: op.pfad })));
  }

  let laufendeNummer = 0;

  function docRef(pfad) {
    return {
      _pfad: pfad,
      id: pfad.split('/').pop(),
      collection(name) { return colRef(`${pfad}/${name}`); },
      async get() {
        const daten = speicher.get(pfad);
        return {
          id: pfad.split('/').pop(),
          exists: daten !== undefined,
          data: () => (daten === undefined ? undefined : { ...daten }),
        };
      },
      async set(daten) { wendeAtomarAn([{ typ: 'set', pfad, daten }]); },
      async update(daten) { wendeAtomarAn([{ typ: 'update', pfad, daten }]); },
    };
  }

  function colRef(pfad) {
    async function get() {
      const treffer = [];
      speicher.forEach((daten, p) => {
        if (p.startsWith(`${pfad}/`) && !p.slice(pfad.length + 1).includes('/')) {
          treffer.push({ id: p.split('/').pop(), data: () => ({ ...daten }) });
        }
      });
      return {
        docs: treffer,
        size: treffer.length,
        empty: treffer.length === 0,
        forEach: (fn) => treffer.forEach(fn),
      };
    }
    // orderBy()/where() geben eine Abfrage mit derselben get()-Semantik
    // zurück (Reihenfolge ist für alle hier geprüften Kennzahlen irrelevant,
    // sie werden über Math.min/Math.max gebildet) – damit ist der Test
    // tolerant gegenüber mehreren zulässigen Umsetzungen.
    const abfrage = { get, orderBy: () => abfrage, where: () => abfrage, limit: () => abfrage };
    return Object.assign({
      doc: (id) => docRef(`${pfad}/${id || `auto-${(laufendeNummer += 1)}`}`),
      async add(daten) {
        const ref = docRef(`${pfad}/auto-${(laufendeNummer += 1)}`);
        wendeAtomarAn([{ typ: 'set', pfad: ref._pfad, daten }]);
        return ref;
      },
    }, abfrage);
  }

  return {
    collection: (name) => colRef(name),
    batch() {
      const operationen = [];
      const stapel = {
        set(ref, daten) { operationen.push({ typ: 'set', pfad: ref._pfad, daten }); return stapel; },
        update(ref, daten) { operationen.push({ typ: 'update', pfad: ref._pfad, daten }); return stapel; },
        async commit() { wendeAtomarAn(operationen); },
      };
      return stapel;
    },
    async runTransaction(fn) {
      return fn({
        async get(ref) { return ref.get(); },
        set(ref, daten) { wendeAtomarAn([{ typ: 'set', pfad: ref._pfad, daten }]); },
        update(ref, daten) { wendeAtomarAn([{ typ: 'update', pfad: ref._pfad, daten }]); },
      });
    },
    _speicher: speicher,
    _protokoll: protokoll,
  };
}

// ---------------------------------------------------------------------------
// Fixture: eine vollständig gespielte Runde 1 (6 Karten, je 6 Bewegungen)
// ---------------------------------------------------------------------------

const CODE = 'ABCD1234';
const RUNDE = 1;

/**
 * Deterministischer Sollverlauf einer Runde 1–3 (real code-verifiziert in der
 * Analyse-Spec): Jede der sechs Karten wandert 0->1->2->3->4->5->6, die
 * Station einer Bewegung ist Math.max(nachPosition - 1, 1). Daraus folgen
 * genau 36 Bewegungen: Station 1 = 12, Stationen 2–5 = je 6.
 *
 * Zwei Zeitstempel sind BEWUSST auf denselben Millisekunden-Wert gesetzt
 * (Gruppierungs-Pflichtfall aus Schritt 4c der Spec, AK8):
 *   - Karte 1 / Bewegung nachPosition 1  und  Karte 0 / Bewegung nachPosition 2
 *     -> zwei ECHTE, verschiedene Bewegungen DERSELBEN Station 1 im selben
 *        Sekundenbruchteil (in Runden 1–3 real möglich, weil Station 1 je
 *        Karte zweimal tätig wird).
 *   - Karte 0 / Bewegung nachPosition 3 (Station 2) liegt exakt auf dem
 *     letzten Zeitstempel der Station 1 -> zwei verschiedene Stationen im
 *     selben Sekundenbruchteil, die nicht vermischt werden dürfen.
 */
function baueVollstaendigeHistorie() {
  const eintraege = [];
  for (let karte = 0; karte < 6; karte += 1) {
    for (let schritt = 0; schritt < 6; schritt += 1) {
      const nachPosition = schritt + 1;
      let wann = T + 1000 * (karte + 1) + 10000 * schritt;
      if (karte === 0 && schritt === 1) wann = T + 2000;   // Duplikat-Millisekunde, Station 1
      if (karte === 0 && schritt === 2) wann = T + 16000;  // Station 2 exakt auf Station-1-Maximum
      eintraege.push({
        id: `bew-${karte}-${schritt}`,
        station: Math.max(nachPosition - 1, 1),
        kartenId: `karte-${karte}`,
        uid: `spieler-station-${Math.max(nachPosition - 1, 1)}`,
        wann,
        nachPosition,
        stapel: null,
      });
    }
  }
  return eintraege;
}

/** Die sechs Karten am Rundenende: alle im Ziel (Position 6). */
function baueKartenImZiel() {
  const karten = [];
  for (let karte = 0; karte < 6; karte += 1) {
    karten.push({
      id: `karte-${karte}`,
      position: 6,
      letzteBewegungVon: 'spieler-station-5',
      letzteBewegungAm: T + 1000 * (karte + 1) + 10000 * 5,
      stapel: null,
    });
  }
  return karten;
}

/**
 * Von Hand vorausberechnete Sollwerte aus der VOLLSTÄNDIGEN Historie oben.
 * Station 1: 12 Bewegungen, min T+1000, max T+16000
 * Station 2:  6 Bewegungen, min T+16000, max T+26000
 * Station 3:  6 Bewegungen, min T+31000, max T+36000
 * Station 4:  6 Bewegungen, min T+41000, max T+46000
 * Station 5:  6 Bewegungen, min T+51000, max T+56000
 */
const SOLL_PRO_STATION = {
  1: { anzahlBewegungen: 12, beteiligungsspanne: 15000, wartezeitVorher: 31000, wartezeitNachher: 84000 },
  2: { anzahlBewegungen: 6, beteiligungsspanne: 10000, wartezeitVorher: 46000, wartezeitNachher: 74000 },
  3: { anzahlBewegungen: 6, beteiligungsspanne: 5000, wartezeitVorher: 61000, wartezeitNachher: 64000 },
  4: { anzahlBewegungen: 6, beteiligungsspanne: 5000, wartezeitVorher: 71000, wartezeitNachher: 54000 },
  5: { anzahlBewegungen: 6, beteiligungsspanne: 5000, wartezeitVorher: 81000, wartezeitNachher: 44000 },
};

/**
 * Der lokale Mitschnitt eines Clients, der MITTEN IN DER RUNDE neu geladen
 * hat: er hat nur die Bewegungen ab Position 4 (Stationen 3, 4, 5) gesehen;
 * für die Stationen 1 und 2 fehlt ihm die gesamte Historie. Genau dieser
 * Client schreibt in den Szenarien unten das Rundenende.
 */
function baueLueckenhaftesLokalesLog(historie) {
  return historie
    .filter((e) => e.nachPosition >= 4)
    .map((e) => ({ uid: e.uid, kartenId: e.kartenId, wann: e.wann, station: e.station, stapel: null }));
}

/** Der lokale Mitschnitt eines durchgehend verbundenen Clients (alle 36 Bewegungen). */
function baueVollstaendigesLokalesLog(historie) {
  return historie.map((e) => ({ uid: e.uid, kartenId: e.kartenId, wann: e.wann, station: e.station, stapel: null }));
}

/** Legt Rundendokument, Karten und (optional) die Bewegungshistorie in der Fake-DB an. */
function seedeRunde(db, { historie = [], karten = baueKartenImZiel(), runde = RUNDE } = {}) {
  db._speicher.set(`spiele/${CODE}/runden/${runde}`, {
    phase: 'dor_abgeschlossen',
    dorAbgeschlossen: true,
    durchlaufzeitStart: DURCHLAUFZEIT_START,
    bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
    durchlaufzeitEnde: null,
  });
  karten.forEach((k) => {
    db._speicher.set(`spiele/${CODE}/runden/${runde}/karten/${k.id}`, k);
  });
  historie.forEach((e) => {
    const { id, ...felder } = e;
    db._speicher.set(`spiele/${CODE}/runden/${runde}/bewegungen/${id}`, felder);
  });
}

function gespeicherteRunde(db, runde = RUNDE) {
  return db._speicher.get(`spiele/${CODE}/runden/${runde}`);
}

async function schreibeRundenEnde(FlowGame, db, { bewegungsLog, karten = baueKartenImZiel(), runde = RUNDE }) {
  return FlowGame.pruefeUndSetzeRundenEnde({
    code: CODE,
    rundenNummer: runde,
    karten,
    rundenPhase: 'dor_abgeschlossen',
    durchlaufzeitStart: DURCHLAUFZEIT_START,
    bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
    bewegungsLog,
  }, db);
}

// ===========================================================================
// AK1 – Bewegungsanzahl
// ===========================================================================

describe('Szenario: Bewegungsanzahl je Station stimmt, obwohl ausgerechnet ein mitten in der Runde neu geladener Client das Rundenende schreibt (AK1)', () => {
  test('Gegeben eine Runde, in der alle fünf Stationen mehrfach und zeitlich verteilt tätig waren und die vollständige Bewegungshistorie serverseitig vorliegt, und gegeben der Client, bei dem zuerst alle sechs Karten im Ziel ankommen, hat mitten in der Runde neu geladen und kennt deshalb die Bewegungen der Stationen 1 und 2 gar nicht, wenn dieser Client das Rundenende schreibt, dann steht für jede Station dieselbe Bewegungsanzahl im Rundenergebnis wie bei einem durchgehend verbundenen Client', async () => {
    // Given
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie();
    seedeRunde(db, { historie });

    // When
    const geschrieben = await schreibeRundenEnde(FlowGame, db, {
      bewegungsLog: baueLueckenhaftesLokalesLog(historie),
    });

    // Then
    expect(geschrieben).toBe(true);
    const runde = gespeicherteRunde(db);
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(runde.proStation[station].anzahlBewegungen)
        .toBe(SOLL_PRO_STATION[station].anzahlBewegungen);
    });
  });
});

// ===========================================================================
// AK2 – Beteiligungsspanne
// ===========================================================================

describe('Szenario: Beteiligungsspanne je Station entspricht weiterhin dem tatsächlichen Abstand zwischen erster und letzter Tätigkeit (AK2)', () => {
  test('Gegeben dieselbe Runde und derselbe neu geladene Client, wenn er das Rundenende schreibt, dann entspricht die gespeicherte Beteiligungsspanne jeder Station dem tatsächlichen Abstand ihrer ersten zu ihrer letzten Tätigkeit in dieser Runde und nicht nur dem Ausschnitt, den dieser eine Client zufällig mitbekommen hat', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie();
    seedeRunde(db, { historie });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: baueLueckenhaftesLokalesLog(historie) });

    const runde = gespeicherteRunde(db);
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(runde.proStation[station].beteiligungsspanne)
        .toBe(SOLL_PRO_STATION[station].beteiligungsspanne);
    });
  });
});

// ===========================================================================
// AK3 – Wartezeit vorher/nachher
// ===========================================================================

describe('Szenario: Beide Wartezeit-Werte je Station stimmen im selben Fall mit dem tatsächlichen Spielverlauf überein (AK3)', () => {
  test('Gegeben dieselbe Runde und derselbe neu geladene Client, wenn er das Rundenende schreibt, dann stimmen für jede Station sowohl die Wartezeit vor ihrer aktiven Bearbeitung als auch die Wartezeit danach mit dem tatsächlichen Verlauf überein – die für die Stationen 1 und 2 fehlenden frühen Bewegungen dürfen die Wartezeit vorher nicht zu kurz und die Wartezeit nachher nicht zu lang erscheinen lassen', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie();
    seedeRunde(db, { historie });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: baueLueckenhaftesLokalesLog(historie) });

    const runde = gespeicherteRunde(db);
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(runde.proStation[station].wartezeitVorher)
        .toBe(SOLL_PRO_STATION[station].wartezeitVorher);
      expect(runde.proStation[station].wartezeitNachher)
        .toBe(SOLL_PRO_STATION[station].wartezeitNachher);
    });
  });
});

// ===========================================================================
// AK4 – Ergebnisgleichheit unabhängig davon, wer schreibt
// ===========================================================================

describe('Szenario: Zwei Personen, die dieselbe beendete Runde ansehen, sehen für dieselbe Station dieselben Werte – unabhängig davon, wer das Rundenende erkannt hat (AK4)', () => {
  test('Gegeben zwei Clients mit unterschiedlich vollständigem lokalen Mitschnitt – einer war durchgehend verbunden, einer ist erst kurz vor Rundenende beigetreten und hat gar nichts mitgeschnitten –, wenn jeder von ihnen in einer je eigenen, aber inhaltlich identischen Runde das Rundenende schreibt, dann ist das gespeicherte Pro-Station-Ergebnis in beiden Fällen Zeichen für Zeichen dasselbe', async () => {
    const historie = baueVollstaendigeHistorie();

    // Given/When: Client A – durchgehend verbunden, vollständiger Mitschnitt
    const geladenA = ladeBrowserFlowGame();
    const dbA = erzeugeFakeDb();
    seedeRunde(dbA, { historie });
    await schreibeRundenEnde(geladenA.FlowGame, dbA, { bewegungsLog: baueVollstaendigesLokalesLog(historie) });

    // Given/When: Client B – erst kurz vor Rundenende beigetreten, LEERER Mitschnitt
    const geladenB = ladeBrowserFlowGame();
    const dbB = erzeugeFakeDb();
    seedeRunde(dbB, { historie });
    await schreibeRundenEnde(geladenB.FlowGame, dbB, { bewegungsLog: [] });

    // Then
    expect(gespeicherteRunde(dbB).proStation).toEqual(gespeicherteRunde(dbA).proStation);
    expect(gespeicherteRunde(dbB).proStation[1].anzahlBewegungen)
      .toBe(SOLL_PRO_STATION[1].anzahlBewegungen);
  });
});

// ===========================================================================
// AK8 – Gruppierungs-Pflichtfall aus Schritt 4c
// ===========================================================================

describe('Szenario: Zwei echte, im selben Sekundenbruchteil erfolgte Bewegungen derselben Station werden BEIDE gezählt und nicht als Duplikat verschmolzen (AK8, Pflichtfall aus Schritt 4c)', () => {
  test('Gegeben eine Runde, in der Station 1 zwei verschiedene Karten nachweislich im selben Millisekunden-Zeitstempel weitergegeben hat und in der zusätzlich Station 2 exakt im selben Augenblick wie Station 1 tätig war, wenn das Rundenende die Kennzahlen bildet, dann zählen beide Bewegungen der Station 1 einzeln und keine Station übernimmt einen Wert der anderen', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie();

    // Given (Belegung der bewusst konstruierten Ausgangslage – schlägt fehl,
    // falls die Fixture je verändert wird, statt still zu einem harmlosen
    // Test zu verkommen):
    const station1Duplikate = historie.filter((e) => e.station === 1 && e.wann === T + 2000);
    expect(station1Duplikate).toHaveLength(2);
    expect(station1Duplikate[0].kartenId).not.toBe(station1Duplikate[1].kartenId);
    const gleichzeitigAndereStation = historie.filter((e) => e.wann === T + 16000);
    expect(gleichzeitigAndereStation.map((e) => e.station).sort()).toEqual([1, 2]);

    seedeRunde(db, { historie });

    // When
    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: baueLueckenhaftesLokalesLog(historie) });

    // Then: beide gleich-millisekündlichen Bewegungen der Station 1 sind
    // enthalten (12, nicht 11) – eine Zusammenführung "gleiche Station +
    // gleicher Zeitpunkt = dieselbe Bewegung" würde hier auffallen.
    const runde = gespeicherteRunde(db);
    expect(runde.proStation[1].anzahlBewegungen).toBe(12);
    // Und Station 2 hat trotz zeitgleicher Tätigkeit ihre eigenen, klar
    // anderen Werte behalten – kein Übernehmen fremder Stationswerte.
    expect(runde.proStation[2].anzahlBewegungen).toBe(6);
    expect(runde.proStation[2].beteiligungsspanne).toBe(10000);
    expect(runde.proStation[2].beteiligungsspanne).not.toBe(runde.proStation[1].beteiligungsspanne);
  });
});

// ===========================================================================
// AK5 – ehrliche Kennzeichnung statt stillschweigend zu niedriger Zahl
// ===========================================================================

describe('Szenario: Kann niemand die vollständige Tätigkeitshistorie beisteuern, wird kein stillschweigend zu niedriger Zahlenwert gespeichert (AK5)', () => {
  test('Gegeben eine Runde, deren gespeicherte Bewegungshistorie nachweislich unvollständig ist – es liegen nur 18 der aus dem Kartenbestand ableitbaren 36 Bewegungen vor, für die Stationen 1 und 2 gar keine –, wenn das Rundenende geschrieben wird, dann steht für diese Stationen ausdrücklich kein Zahlenwert im Ergebnis, insbesondere nicht die irreführende Null, die von einer tatsächlich untätigen Station nicht zu unterscheiden wäre', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie().filter((e) => e.nachPosition >= 4);
    expect(historie).toHaveLength(18); // Belegung der Ausgangslage
    seedeRunde(db, { historie });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: [] });

    const runde = gespeicherteRunde(db);
    [1, 2].forEach((station) => {
      expect(runde.proStation[station].anzahlBewegungen).toBeNull();
      expect(runde.proStation[station].beteiligungsspanne).toBeNull();
    });
  });
});

// ===========================================================================
// AK9 – Beobachtbarkeit des Fehlerfalls (plus Polaritäts-Gegenprobe)
// ===========================================================================

describe('Szenario: Der Fall "unvollständige Historie" ist nachträglich am gespeicherten Rundenergebnis erkennbar (AK9)', () => {
  test('Gegeben dieselbe Runde mit nachweislich unvollständiger Bewegungshistorie, wenn das Rundenende geschrieben wird, dann trägt das gespeicherte Rundenergebnis eine ausdrückliche Kennzeichnung, dass die Kennzahlen nicht vollständig sind – der Fall ist damit nachträglich erkennbar und nicht nur an einer unauffällig zu niedrigen Zahl zu erahnen', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRunde(db, { historie: baueVollstaendigeHistorie().filter((e) => e.nachPosition >= 4) });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: [] });

    expect(gespeicherteRunde(db).kennzahlenVollstaendig).toBe(false);
  });

  test('Polaritäts-Gegenprobe: Gegeben eine Runde mit vollständiger Bewegungshistorie, wenn das Rundenende geschrieben wird, dann wird das Ergebnis ausdrücklich NICHT als unvollständig gekennzeichnet – eine pauschale Dauer-Warnung wäre genauso wertlos wie gar keine', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRunde(db, { historie: baueVollstaendigeHistorie() });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: [] });

    expect(gespeicherteRunde(db).kennzahlenVollstaendig).toBe(true);
    expect(gespeicherteRunde(db).proStation[1].anzahlBewegungen).toBe(12);
  });
});

// ===========================================================================
// AK5 (sichtbare Seite) – Anzeige kennzeichnet fehlende Werte
// ===========================================================================

describe('Szenario: Die Auswertungsanzeige stellt einen als unvollständig gekennzeichneten Wert erkennbar dar statt als Zahl (AK5, sichtbare Seite)', () => {
  test('Gegeben die Auswertungsansicht in public/spiel.html, wenn für eine Station kein belastbarer Zahlenwert vorliegt, dann geben die Zeilen für Bewegungsanzahl und Beteiligungsspanne einen erkennbaren Platzhalter aus statt eines Zahlenwerts – heute wird stattdessen bedingungslos in Text gewandelt bzw. auf 00:00 zurückgefallen, wodurch eine fehlende Angabe wie eine echte Null aussähe', () => {
    const quelltext = fs.readFileSync(path.join(__dirname, '..', 'public/spiel.html'), 'utf8');

    // Ausschnitt der Vergleichs-/Einzelrundenauswertung, in dem die beiden
    // Zeilen erzeugt werden. Bewusst über die vorhandenen Feldnamen gesucht
    // und nicht über eine exakte Zeilenform, damit eine spätere Extraktion in
    // eine gemeinsame Hilfsfunktion diesen Test nicht fälschlich rot macht
    // (flow-game-bdd, Abschnitt 3b).
    const bewegungsZeilen = quelltext.match(/eintrag[^\n]*anzahlBewegungen[^\n]*/g) || [];
    const spannenZeilen = quelltext.match(/eintrag[^\n]*beteiligungsspanne[^\n]*/g) || [];
    expect(bewegungsZeilen.length).toBeGreaterThan(0);
    expect(spannenZeilen.length).toBeGreaterThan(0);

    // Dasselbe, bereits etablierte Muster wie bei den FEATURE-010-Zeilen
    // (wartezeitVorher/-Nachher): erst wenn ein echter Zahlenwert vorliegt,
    // wird formatiert – sonst der Platzhalter.
    bewegungsZeilen.forEach((zeile) => expect(zeile).toMatch(/typeof|== null|!= null|Number\.isFinite/));
    spannenZeilen.forEach((zeile) => expect(zeile).toMatch(/typeof|== null|!= null|Number\.isFinite/));
  });
});

// ===========================================================================
// AK6 – Polaritäts-Gegenprobe: untätige Station bleibt bei 0
// ===========================================================================

describe('Szenario: Eine Station, die tatsächlich nichts getan hat, zeigt weiterhin null Bewegungen und eine Beteiligungsspanne von null (AK6, Polaritäts-Gegenprobe)', () => {
  test('SOLL SCHON HEUTE GRÜN SEIN (Regressionsschutz aus FEATURE-002): Gegeben eine vollständig bekannte Bewegungsfolge, in der Station 4 nachweislich keine einzige Tätigkeit hatte, während ihre Nachbarstationen 3 und 5 aktiv waren, wenn die echte Browser-Fassung die Kennzahlen bildet, dann bleibt Station 4 bei null Bewegungen und Spanne null – die Behebung füllt untätige Stationen nicht pauschal auf', () => {
    const { FlowGame } = ladeBrowserFlowGame();

    const bewegungsLog = [
      { station: 3, wann: T + 1000 },
      { station: 3, wann: T + 4000 },
      { station: 5, wann: T + 2000 },
      { station: 5, wann: T + 9000 },
    ];

    const kennzahlen = FlowGame.berechneKennzahlen({ bewegungsLog });

    expect(kennzahlen.proStation[4]).toEqual({ anzahlBewegungen: 0, beteiligungsspanne: 0 });
    expect(kennzahlen.proStation[4].anzahlBewegungen).not.toBeNull();
    expect(kennzahlen.proStation[3].anzahlBewegungen).toBe(2);
    expect(kennzahlen.proStation[5].anzahlBewegungen).toBe(2);
  });
});

// ===========================================================================
// AK10 – Regressionsschutz: Spiel ohne Reload verändert sich nicht
// ===========================================================================

describe('Szenario: In einem Spiel, in dem alle vor Rundenbeginn da sind und niemand neu lädt, verändern sich die angezeigten Werte gegenüber heute nicht (AK10, Regressionsschutz)', () => {
  test('Gegeben ein Client mit lückenlosem eigenen Mitschnitt und eine dazu passende, ebenso lückenlose serverseitige Historie, wenn dieser Client das Rundenende schreibt, dann stehen dieselben Werte im Ergebnis, die die heutige Berechnung aus seinem eigenen Mitschnitt ergibt – die Behebung verschiebt in diesem Normalfall keine einzige Zahl', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie();
    const vollstaendigesLog = baueVollstaendigesLokalesLog(historie);
    seedeRunde(db, { historie });

    // Vergleichsmaßstab: das, was die heutige Berechnung aus dem vollständigen
    // lokalen Mitschnitt liefert.
    const heutigeWerte = FlowGame.berechneKennzahlen({
      durchlaufzeitStart: DURCHLAUFZEIT_START,
      durchlaufzeitEnde: RUNDENENDE_ZEIT,
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bearbeitungszeitEnde: RUNDENENDE_ZEIT,
      karten: baueKartenImZiel(),
      bewegungsLog: vollstaendigesLog,
    });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: vollstaendigesLog });

    const runde = gespeicherteRunde(db);
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(runde.proStation[station].anzahlBewegungen).toBe(heutigeWerte.proStation[station].anzahlBewegungen);
      expect(runde.proStation[station].beteiligungsspanne).toBe(heutigeWerte.proStation[station].beteiligungsspanne);
      expect(runde.proStation[station].wartezeitVorher).toBe(heutigeWerte.proStation[station].wartezeitVorher);
      expect(runde.proStation[station].wartezeitNachher).toBe(heutigeWerte.proStation[station].wartezeitNachher);
    });
    // Und die übrigen, nicht aus dem Mitschnitt gebildeten Kennzahlen bleiben
    // ebenfalls unverändert (Regressionsschutz FEATURE-003).
    expect(runde.durchlaufzeit).toBe(heutigeWerte.durchlaufzeit);
    expect(runde.zeitBisErsterLieferung).toBe(heutigeWerte.zeitBisErsterLieferung);
    expect(runde.zeitBisLetzterLieferung).toBe(heutigeWerte.zeitBisLetzterLieferung);
    expect(runde.abstandErsteLetzteLieferung).toBe(heutigeWerte.abstandErsteLetzteLieferung);
  });
});

// ===========================================================================
// AK7 – kein neuer Wartezustand
// ===========================================================================

describe('Szenario: Das Rundenende tritt weiterhin ohne spürbare Verzögerung ein (AK7)', () => {
  test('Gegeben eine Runde, in der die letzte Karte gerade im Ziel angekommen ist, wenn das Rundenende geschrieben wird, dann geschieht das ohne absichtliches Zuwarten – die Behebung darf sich keine Frist nehmen, in der ein besser informierter Client zuvorkommen könnte', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRunde(db, { historie: baueVollstaendigeHistorie() });

    const start = Date.now();
    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: [] });
    const dauer = Date.now() - start;

    expect(dauer).toBeLessThan(250);
  });

  test('Gegeben der Quelltext des Rundenende-Pfads, wenn er auf absichtliche Verzögerungen geprüft wird, dann enthält er weder eine Zeitschaltung noch ein künstliches Warten – weder für Runden 1–3 noch für Runde 4', () => {
    ['public/js/game/rundenEnde.js', 'public/js/game/rundeVier.js'].forEach((datei) => {
      const quelltext = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8')
        .split('\n')
        .filter((zeile) => !zeile.trim().startsWith('//') && !zeile.trim().startsWith('*'))
        .join('\n');
      expect(quelltext).not.toMatch(/setTimeout\s*\(/);
      expect(quelltext).not.toMatch(/new Promise\s*\([^)]*resolve[^)]*=>\s*setTimeout/);
    });
  });
});

// ===========================================================================
// Pre-Mortem Risiko 5 – Kartenbewegung und Historieneintrag gemeinsam gültig
// ===========================================================================

describe('Szenario: Eine Kartenbewegung und ihr Historieneintrag entstehen gemeinsam oder gar nicht (Pre-Mortem Risiko 5)', () => {
  test('Gegeben eine Person darf eine Karte weitergeben, wenn sie die Karte bewegt, dann entsteht zusätzlich zur Kartenänderung ein Historieneintrag für dieselbe Bewegung mit Station, Karte und ausführender Person', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    db._speicher.set(`spiele/${CODE}/runden/${RUNDE}/karten/karte-0`, { position: 2, stapel: null });

    await FlowGame.bewegeKarte({
      code: CODE, rundenNummer: RUNDE, kartenId: 'karte-0', vonPosition: 2, uid: 'spieler-station-2',
    }, db);

    const historienEintraege = [...db._speicher.entries()]
      .filter(([pfad]) => pfad.includes(`/runden/${RUNDE}/bewegungen/`))
      .map(([, daten]) => daten);

    expect(historienEintraege).toHaveLength(1);
    expect(historienEintraege[0].kartenId).toBe('karte-0');
    expect(historienEintraege[0].uid).toBe('spieler-station-2');
    expect(historienEintraege[0].station).toBe(2);
  });

  test('Gegeben der Historieneintrag wird vom Server abgelehnt, wenn eine Person eine Karte bewegt, dann bleibt auch die Karte selbst unbewegt – es entsteht kein Halbzustand, in dem die Karte weitergegeben, die Tätigkeit aber nirgends festgehalten ist', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb({ historieSchreibenSchlaegtFehl: true });
    db._speicher.set(`spiele/${CODE}/runden/${RUNDE}/karten/karte-0`, { position: 2, stapel: null });

    await expect(FlowGame.bewegeKarte({
      code: CODE, rundenNummer: RUNDE, kartenId: 'karte-0', vonPosition: 2, uid: 'spieler-station-2',
    }, db)).rejects.toThrow();

    expect(db._speicher.get(`spiele/${CODE}/runden/${RUNDE}/karten/karte-0`).position).toBe(2);
    const historienEintraege = [...db._speicher.keys()].filter((pfad) => pfad.includes('/bewegungen/'));
    expect(historienEintraege).toHaveLength(0);
  });
});

// ===========================================================================
// Pre-Mortem Risiko 10 / Product.md §9 – servergesetzte Zeitstempel
// ===========================================================================

describe('Szenario: Der Zeitpunkt einer Bewegung stammt vom Server, nicht aus der Uhr des Browsers (Pre-Mortem Risiko 10, Product.md §9)', () => {
  test('Gegeben eine Person bewegt eine Karte, wenn der Historieneintrag entsteht, dann trägt sein Zeitpunkt einen vom Server gesetzten Wert – ein aus der Browser-Uhr abgeleiteter Zeitpunkt wäre manipulierbar und geräteabhängig', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    db._speicher.set(`spiele/${CODE}/runden/${RUNDE}/karten/karte-0`, { position: 0, stapel: null });

    await FlowGame.bewegeKarte({
      code: CODE, rundenNummer: RUNDE, kartenId: 'karte-0', vonPosition: 0, uid: 'spieler-station-1',
    }, db);

    const treffer = [...db._speicher.entries()].find(([p]) => p.includes('/bewegungen/'));
    expect(treffer).toBeDefined(); // es muss überhaupt ein Historieneintrag entstanden sein
    const [pfad, eintrag] = treffer;
    expect(db._protokoll.serverZeitFelder[pfad]).toContain('wann');
    expect(eintrag.wann).toBe(SERVER_UHR);
    expect(eintrag.wann).not.toBe(RUNDENENDE_ZEIT); // nicht aus Date.now()
  });
});

// ===========================================================================
// Runde 4 – dieselbe Fehlerklasse, zweites Vorkommen
// ===========================================================================

/**
 * Runde 4: zwölf Elemente. KORREKTUR der Zweitprüfung vom 2026-08-14 (von
 * Stephan ausdrücklich als einzige Teständerung freigegeben): Die frühere
 * Fassung dieser Hilfsfunktion ließ die Elemente von Position 0 nach 6 laufen
 * und kam so auf 72 Weitergaben (Station 1 = 24). Das ist kein real möglicher
 * Verlauf – starteRundeVier() legt ALLE zwölf Elemente mit `position: 1` an
 * (public/js/game/rundeVier.js, Zeilen 341/351). Real gibt es deshalb genau
 * fünf Weitergaben je Element (Position 2,3,4,5,6) und damit 60 Weitergaben,
 * je zwölf pro Station. Der frühere Test bestand nur, weil die
 * Vollständigkeitsprüfung mit "mindestens so viele wie erwartet" arbeitet.
 *
 * Zeitachse: Schritt-Index 0 = Weitergabe auf Position 2 (Station 1),
 * Schritt-Index 4 = Weitergabe auf Position 6 (Station 5).
 */
function baueVollstaendigeHistorieRundeVier() {
  const eintraege = [];
  for (let element = 0; element < 12; element += 1) {
    for (let schritt = 0; schritt < 5; schritt += 1) {
      const nachPosition = schritt + 2;
      eintraege.push({
        id: `bew4-${element}-${schritt}`,
        art: 'weitergabe',
        station: Math.max(nachPosition - 1, 1),
        kartenId: `element-${element}`,
        uid: `spieler-station-${Math.max(nachPosition - 1, 1)}`,
        wann: T + 500 * (element + 1) + 20000 * schritt,
        nachPosition,
        stapel: null,
      });
    }
  }
  return eintraege;
}

function baueElementeImZiel() {
  const elemente = [];
  for (let element = 0; element < 12; element += 1) {
    elemente.push({
      id: `element-${element}`,
      position: 6,
      typ: element < 6 ? 'laenderkarte' : 'wuerfel',
      land: 'Germany',
      staedte: {},
      letzteBewegungVon: 'spieler-station-5',
      letzteBewegungAm: T + 500 * (element + 1) + 20000 * 5,
    });
  }
  return elemente;
}

describe('Szenario: Auch in Runde 4 stimmen die Werte je Station, wenn der schreibende Client mitten in der Runde neu geladen hat (AK1/AK2, Runde 4)', () => {
  test('Gegeben eine vollständig gespielte Runde 4, deren Bewegungshistorie serverseitig vorliegt, und gegeben der Client, bei dem zuerst alle zwölf Elemente fertig sind, hat mitten in der Runde neu geladen, wenn er das Rundenende schreibt, dann stehen für jede Station die Werte aus dem tatsächlichen Verlauf im Ergebnis und nicht die aus seinem lückenhaften eigenen Mitschnitt', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const runde = 4;
    const historie = baueVollstaendigeHistorieRundeVier();
    const elemente = baueElementeImZiel();

    db._speicher.set(`spiele/${CODE}/runden/${runde}`, {
      phase: 'dor_abgeschlossen',
      dorAbgeschlossen: true,
      durchlaufzeitStart: DURCHLAUFZEIT_START,
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
    });
    elemente.forEach((e) => db._speicher.set(`spiele/${CODE}/runden/${runde}/elemente/${e.id}`, e));
    historie.forEach(({ id, ...felder }) => {
      db._speicher.set(`spiele/${CODE}/runden/${runde}/bewegungen/${id}`, felder);
    });

    const lueckenhaftesLog = historie
      .filter((e) => e.nachPosition >= 4)
      .map((e) => ({ uid: e.uid, elementId: e.kartenId, wann: e.wann, station: e.station }));

    const geschrieben = await FlowGame.pruefeUndSetzeRundenEndeRundeVier({
      code: CODE,
      rundenNummer: runde,
      elemente,
      rundenPhase: 'dor_abgeschlossen',
      durchlaufzeitStart: DURCHLAUFZEIT_START,
      bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
      bewegungsLog: lueckenhaftesLog,
    }, db);

    expect(geschrieben).toBe(true);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${runde}`);
    // Zwölf Elemente x je eine Weitergabe pro Station (Start auf Position 1,
    // Ziel Position 6) = 12 Weitergaben je Station, 60 insgesamt.
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(gespeichert.proStation[station].anzahlBewegungen).toBe(12);
    });
    // Beteiligungsspanne Station 1: erster Zeitstempel T+500, letzter
    // T+6000 -> 5500.
    expect(gespeichert.proStation[1].beteiligungsspanne).toBe(5500);
    // Runde 4 zeigt weiterhin KEINE Wartezeit-Werte (FEATURE-010, AK6) –
    // Regressionsschutz, den die Behebung nicht aufheben darf.
    expect(gespeichert.proStation[1].wartezeitVorher).toBeUndefined();
    expect(gespeichert.proStation[1].wartezeitNachher).toBeUndefined();
  });
});

// ===========================================================================
// NACHARBEIT ZUR ZWEITPRÜFUNG (2026-08-14)
//
// Stephans Entscheidungen aus der unabhängigen Zweitprüfung, hier verbindlich
// abgetestet:
//  (1) "Alle Versuche müssen mitzählen" – ein misslungener Würfelversuch in
//      Runde 4 ist weiterhin eine Tätigkeit und wird jetzt zusätzlich dauerhaft
//      festgehalten (der frühere, rein lokale Mitschnitt zählte ihn mit, weil
//      jeder Zwischenwurf das Element-Dokument veränderte). Der Nebenbefund
//      "Würfel-Zwischenwurf zählt als Bewegung" ist damit NICHT mehr
//      ausgeklammert, sondern ausdrücklich Teil dieses Tickets – der
//      gegenteilige Satz im Kopfkommentar dieser Datei ist überholt.
//  (2) Die Testfixture für Runde 4 wurde auf den real möglichen Verlauf
//      korrigiert (Start auf Position 1, 60 statt 72 Weitergaben) – siehe
//      baueVollstaendigeHistorieRundeVier() oben.
//  (3) Die stille Lücke bei einem noch nicht aufgelösten Server-Zeitstempel
//      wird mitbehoben: Vollständigkeitsprüfung und Kennzahlenberechnung legen
//      denselben Maßstab an.
//
// Folge für die Vollständigkeitsprüfung: Sie darf für Runde 4 nicht mehr an
// einer festen Gesamtzahl hängen (die Zahl der Würfelversuche schwankt
// naturgemäß), sondern zählt ausschließlich die deterministischen
// WEITERGABEN. In die angezeigte Tätigkeitszahl gehen dagegen beide ein.
// ===========================================================================

const RUNDE_VIER = 4;

/** Legt Rundendokument, Elemente und Historie einer Runde 4 in der Fake-DB an. */
function seedeRundeVier(db, { historie = [], elemente = baueElementeImZiel() } = {}) {
  db._speicher.set(`spiele/${CODE}/runden/${RUNDE_VIER}`, {
    phase: 'dor_abgeschlossen',
    dorAbgeschlossen: true,
    durchlaufzeitStart: DURCHLAUFZEIT_START,
    bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
  });
  elemente.forEach((e) => db._speicher.set(`spiele/${CODE}/runden/${RUNDE_VIER}/elemente/${e.id}`, e));
  historie.forEach(({ id, ...felder }) => {
    db._speicher.set(`spiele/${CODE}/runden/${RUNDE_VIER}/bewegungen/${id}`, felder);
  });
}

async function schreibeRundenEndeRundeVier(FlowGame, db, elemente = baueElementeImZiel()) {
  return FlowGame.pruefeUndSetzeRundenEndeRundeVier({
    code: CODE,
    rundenNummer: RUNDE_VIER,
    elemente,
    rundenPhase: 'dor_abgeschlossen',
    durchlaufzeitStart: DURCHLAUFZEIT_START,
    bearbeitungszeitStart: BEARBEITUNGSZEIT_START,
  }, db);
}

function historienEintraegeVon(db, runde) {
  return [...db._speicher.entries()]
    .filter(([pfad]) => pfad.includes(`/runden/${runde}/bewegungen/`))
    .map(([pfad, daten]) => ({ pfad, ...daten }));
}

describe('Szenario: Ein misslungener Würfelversuch wird gemeinsam mit dem Würfelzähler dauerhaft festgehalten (Zweitprüfung Befund 1)', () => {
  test('Gegeben eine Person würfelt in Runde 4 eine Zahl ≤3 und behält das Element, wenn der Zwischenwurf festgehalten wird, dann entsteht im selben, einzigen Schreibvorgang zusätzlich ein Historieneintrag, der als Würfelversuch von einer Weitergabe unterscheidbar ist und einen vom Server gesetzten Zeitpunkt trägt', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRundeVier(db);

    await FlowGame.schreibeWuerfelZwischenwurf({
      code: CODE,
      rundenNummer: RUNDE_VIER,
      elementId: 'element-6',
      wurfAnzahl: 1,
      letzterWurf: 2,
      position: 3,
      ausgefuehrtVon: 'spieler-station-3',
    }, db);

    const eintraege = historienEintraegeVon(db, RUNDE_VIER);
    expect(eintraege).toHaveLength(1);
    expect(eintraege[0].art).toBe('wuerfelversuch');
    expect(eintraege[0].uid).toBe('spieler-station-3');
    expect(eintraege[0].station).toBe(3);
    expect(eintraege[0].kartenId).toBe('element-6');
    expect(eintraege[0].wann).toBe(SERVER_UHR);
    expect(db._protokoll.serverZeitFelder[eintraege[0].pfad]).toContain('wann');

    // Zustandsänderung am Element und Historieneintrag im SELBEN, einzigen
    // Schreibvorgang – kein "erst A, dann B".
    const letzterVorgang = db._protokoll.schreibvorgaenge[db._protokoll.schreibvorgaenge.length - 1];
    expect(letzterVorgang).toHaveLength(2);
    expect(letzterVorgang.some((op) => op.pfad.includes('/elemente/element-6'))).toBe(true);
    expect(letzterVorgang.some((op) => op.pfad.includes('/bewegungen/'))).toBe(true);
    expect(db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}/elemente/element-6`).wurfAnzahl).toBe(1);
  });

  test('Gegeben der Historieneintrag des Würfelversuchs wird vom Server abgelehnt, wenn die Person würfelt, dann bleibt auch der Würfelzähler am Element unverändert – es entsteht kein Halbzustand, in dem der Versuch sichtbar, aber nirgends festgehalten ist', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb({ historieSchreibenSchlaegtFehl: true });
    seedeRundeVier(db);
    db._speicher.set(`spiele/${CODE}/runden/${RUNDE_VIER}/elemente/element-6`, {
      id: 'element-6', typ: 'wuerfel', position: 3, wurfAnzahl: 0, letzterWurf: null,
    });

    await expect(FlowGame.schreibeWuerfelZwischenwurf({
      code: CODE,
      rundenNummer: RUNDE_VIER,
      elementId: 'element-6',
      wurfAnzahl: 1,
      letzterWurf: 2,
      position: 3,
      ausgefuehrtVon: 'spieler-station-3',
    }, db)).rejects.toThrow();

    expect(db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}/elemente/element-6`).wurfAnzahl).toBe(0);
    expect(historienEintraegeVon(db, RUNDE_VIER)).toHaveLength(0);
  });
});

describe('Szenario: Ein misslungener Würfelversuch zählt in der Tätigkeitszahl der Runde 4 mit (Zweitprüfung Befund 1, Stephans Entscheidung "Alle Versuche müssen mitzählen")', () => {
  test('Gegeben eine vollständig gespielte Runde 4, in der Station 3 zusätzlich zu ihren zwölf Weitergaben zwei misslungene Würfelversuche hatte, wenn das Rundenende geschrieben wird, dann steht für Station 3 die Summe aus Weitergaben und Würfelversuchen im Ergebnis', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRundeVier(db, { historie: baueVollstaendigeHistorieRundeVier() });

    for (let versuch = 1; versuch <= 2; versuch += 1) {
      // eslint-disable-next-line no-await-in-loop
      await FlowGame.schreibeWuerfelZwischenwurf({
        code: CODE,
        rundenNummer: RUNDE_VIER,
        elementId: 'element-6',
        wurfAnzahl: versuch,
        letzterWurf: 2,
        position: 3,
        ausgefuehrtVon: 'spieler-station-3',
      }, db);
    }

    expect(await schreibeRundenEndeRundeVier(FlowGame, db)).toBe(true);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}`);
    expect(gespeichert.proStation[3].anzahlBewegungen).toBe(14);
    // Nachbarstationen bleiben bei ihren zwölf Weitergaben.
    [1, 2, 4, 5].forEach((station) => {
      expect(gespeichert.proStation[station].anzahlBewegungen).toBe(12);
    });
  });

  test('Gegeben dieselbe Runde 4, wenn das Rundenende geschrieben wird, dann schließt auch die Zeitspanne der Beteiligung von Station 3 die Würfelversuche ein – genau wie es der frühere lokale Mitschnitt tat', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRundeVier(db, { historie: baueVollstaendigeHistorieRundeVier() });

    await FlowGame.schreibeWuerfelZwischenwurf({
      code: CODE,
      rundenNummer: RUNDE_VIER,
      elementId: 'element-6',
      wurfAnzahl: 1,
      letzterWurf: 2,
      position: 3,
      ausgefuehrtVon: 'spieler-station-3',
    }, db);

    await schreibeRundenEndeRundeVier(FlowGame, db);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}`);
    // Weitergaben der Station 3: T+40500 (frühestens) bis T+46000. Der
    // Würfelversuch trägt die Serveruhr T+90000 -> Spanne 49500.
    expect(gespeichert.proStation[3].beteiligungsspanne).toBe(SERVER_UHR - (T + 40500));
  });

  test('Gegeben eine Runde 4 mit vollständigen Weitergaben und zusätzlichen Würfelversuchen, wenn das Rundenende geschrieben wird, dann wird das Ergebnis NICHT fälschlich als unvollständig gekennzeichnet – die Vollständigkeitsprüfung zählt ausschliesslich die deterministischen Weitergaben', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    seedeRundeVier(db, { historie: baueVollstaendigeHistorieRundeVier() });

    await FlowGame.schreibeWuerfelZwischenwurf({
      code: CODE,
      rundenNummer: RUNDE_VIER,
      elementId: 'element-6',
      wurfAnzahl: 1,
      letzterWurf: 2,
      position: 3,
      ausgefuehrtVon: 'spieler-station-3',
    }, db);

    await schreibeRundenEndeRundeVier(FlowGame, db);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}`);
    expect(gespeichert.kennzahlenVollstaendig).toBe(true);
    [1, 2, 3, 4, 5].forEach((station) => {
      expect(gespeichert.proStation[station].anzahlBewegungen).not.toBeNull();
    });
  });

  test('Polaritäts-Gegenprobe: Gegeben eine Runde 4, in der Station 2 zwar viele Würfelversuche, aber nachweislich zu wenige Weitergaben festgehalten hat, wenn das Rundenende geschrieben wird, dann gilt das Ergebnis trotzdem als unvollständig – Würfelversuche dürfen eine echte Lücke bei den Weitergaben nicht auffüllen', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();

    const vollstaendig = baueVollstaendigeHistorieRundeVier();
    const station2Eintraege = vollstaendig.filter((e) => e.station === 2);
    const luecke = vollstaendig.filter((e) => e.station !== 2)
      .concat(station2Eintraege.slice(0, 6)); // sechs der zwölf Weitergaben fehlen
    for (let i = 0; i < 10; i += 1) {
      luecke.push({
        id: `wv4-2-${i}`,
        art: 'wuerfelversuch',
        station: 2,
        kartenId: 'element-7',
        uid: 'spieler-station-2',
        wann: T + 1000 + i,
        nachPosition: 2,
        stapel: null,
      });
    }
    seedeRundeVier(db, { historie: luecke });

    await schreibeRundenEndeRundeVier(FlowGame, db);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}`);
    expect(gespeichert.kennzahlenVollstaendig).toBe(false);
    expect(gespeichert.proStation[2].anzahlBewegungen).toBeNull();
    expect(gespeichert.proStation[2].beteiligungsspanne).toBeNull();
    // Stationen mit lückenloser Historie behalten ihre echten Werte.
    expect(gespeichert.proStation[1].anzahlBewegungen).toBe(12);
  });
});

describe('Szenario: Ein Eintrag mit noch nicht bestätigter Uhrzeit senkt die Tätigkeitszahl nicht stillschweigend (Zweitprüfung Befund 3, AK5/AK9)', () => {
  test('Gegeben eine Runde, deren Historie zwar vollzählig ist, bei der aber zwei Einträge der Station 3 noch keinen vom Server bestätigten Zeitpunkt tragen, wenn das Rundenende geschrieben wird, dann bekommt Station 3 eine ehrliche Fehlanzeige statt einer stillschweigend zu niedrigen Zahl – und das Ergebnis ist ausdrücklich als unvollständig gekennzeichnet', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorie().map((eintrag) => {
      // Station 3 = Bewegung auf Position 4. Bei zwei Karten ist der
      // servergesetzte Zeitstempel beim Lesen noch nicht aufgelöst (genau der
      // Fall der Person, die die letzte Karte ins Ziel legt und damit selbst
      // das Rundenende auslöst) – Firestore liefert dann null.
      if (eintrag.station === 3 && ['karte-0', 'karte-1'].includes(eintrag.kartenId)) {
        return { ...eintrag, wann: null };
      }
      return eintrag;
    });
    seedeRunde(db, { historie });

    await schreibeRundenEnde(FlowGame, db, { bewegungsLog: [] });
    const gespeichert = gespeicherteRunde(db);

    expect(gespeichert.proStation[3].anzahlBewegungen).toBeNull();
    expect(gespeichert.proStation[3].beteiligungsspanne).toBeNull();
    expect(gespeichert.proStation[3].wartezeitVorher).toBeNull();
    expect(gespeichert.proStation[3].wartezeitNachher).toBeNull();
    expect(gespeichert.kennzahlenVollstaendig).toBe(false);
    // Stationen mit vollständig aufgelösten Zeitpunkten bleiben unberührt.
    expect(gespeichert.proStation[1].anzahlBewegungen).toBe(SOLL_PRO_STATION[1].anzahlBewegungen);
  });
});

describe('Szenario: Auch ein WÜRFELVERSUCH mit noch nicht bestätigter Uhrzeit senkt die Tätigkeitszahl nicht stillschweigend (Zweitprüfung Befund 3, Würfelversuch-Variante, AK5/AK9)', () => {
  test('Gegeben eine vollständig gespielte Runde 4, in der Station 3 zusätzlich zu ihren zwölf Weitergaben zwei Würfelversuche hatte und einer davon noch keinen vom Server bestätigten Zeitpunkt trägt, wenn das Rundenende geschrieben wird, dann bekommt Station 3 eine ehrliche Fehlanzeige statt der stillschweigend zu niedrigen Tätigkeitszahl 13 – und das Ergebnis ist ausdrücklich als unvollständig gekennzeichnet', async () => {
    const { FlowGame } = ladeBrowserFlowGame();
    const db = erzeugeFakeDb();
    const historie = baueVollstaendigeHistorieRundeVier();
    // Zwei Würfelversuche der Station 3. Beim ersten ist der servergesetzte
    // Zeitstempel bereits aufgelöst, beim zweiten noch nicht (Firestore
    // liefert dann null) – genau der Fall der Person, die die letzte Karte
    // ins Ziel legt und damit das Rundenende selbst auslöst.
    historie.push({
      id: 'wv4-3-bestaetigt',
      art: 'wuerfelversuch',
      station: 3,
      kartenId: 'element-6',
      uid: 'spieler-station-3',
      wann: T + 80000,
      nachPosition: 3,
      stapel: null,
    });
    historie.push({
      id: 'wv4-3-unbestaetigt',
      art: 'wuerfelversuch',
      station: 3,
      kartenId: 'element-6',
      uid: 'spieler-station-3',
      wann: null,
      nachPosition: 3,
      stapel: null,
    });
    seedeRundeVier(db, { historie });

    await schreibeRundenEndeRundeVier(FlowGame, db);
    const gespeichert = db._speicher.get(`spiele/${CODE}/runden/${RUNDE_VIER}`);

    // Ohne die Behebung stünde hier 13 (zwölf Weitergaben + nur der eine
    // aufgelöste Würfelversuch) bei gleichzeitig kennzahlenVollstaendig=true –
    // also exakt die stille Untertreibung, die AK5/AK9 verhindern sollen.
    expect(gespeichert.proStation[3].anzahlBewegungen).toBeNull();
    expect(gespeichert.proStation[3].beteiligungsspanne).toBeNull();
    expect(gespeichert.kennzahlenVollstaendig).toBe(false);
    // Stationen mit durchgehend aufgelösten Zeitpunkten behalten ihre Werte.
    [1, 2, 4, 5].forEach((station) => {
      expect(gespeichert.proStation[station].anzahlBewegungen).toBe(12);
    });
  });
});
