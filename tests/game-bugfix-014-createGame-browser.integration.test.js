/**
 * BUGFIX-014 – Browser-Produktivcode wendet den BUGFIX-001-Verbindungs-Retry
 * bei Spielerstellung nie an.
 * BDD-Tests (flow-game-bdd, 2026-08-08) für die Akzeptanzkriterien AK1-AK3
 * aus der freigegebenen Spec in Backlog.md ("### BUGFIX-014"), Testplan-
 * Grundgerüst Punkte 1-3.
 *
 * WARUM DIESE DATEI DIE EIGENTLICHE LÜCKE SCHLIESST: Die drei bestehenden
 * BUGFIX-001-Testdateien (game-connection-retry.logic/integration/static)
 * haben den hier vorliegenden Bug NICHT gefangen (siehe Backlog.md "Warum
 * die Test-Suite das nicht gefangen hat"): logic/integration.test.js rufen
 * ausschließlich die Node-Referenz `require('../src/game/createGame')` auf,
 * static.test.js zählte nur Roh-Text-Vorkommen von "client is offline"
 * (ein bloßer, faktisch falscher Kopfkommentar reichte dafür bereits aus).
 * Diese Datei lädt stattdessen die ECHTE Browser-Kopie
 * `public/js/game/createGame.js` über eine minimale vm-Sandbox, die
 * `window` als globales Objekt bereitstellt - exakt wie `public/spiel.html`
 * es per <script>-Tags tut (siehe Kopfkommentar der Datei: "kein Bundler im
 * Projekt"). Dadurch wird der tatsächliche Kontrollfluss der Browser-Kopie
 * ausgeführt, nicht nur ihr Text durchsucht.
 *
 * WICHTIG – bewusst ROT vor der Implementierung: `public/js/game/createGame.js`
 * ruft `mitVerbindungsRetry()` im Funktionskörper aktuell (Stand vor diesem
 * Ticket) nirgends auf, obwohl die Funktion importiert wird (siehe
 * Backlog.md, Zeile 19/44) - ein einmaliger transienter Verbindungsfehler
 * wird deshalb sofort ungeschützt nach oben durchgereicht statt automatisch
 * wiederholt zu werden. Die Assertions unten erwarten das künftige, noch
 * nicht vorhandene Verhalten und schlagen deshalb jetzt real fehl (kein
 * Modul-/Syntaxfehler - "Cannot find module" wäre der falsche
 * Fehlschlaggrund, siehe flow-game-bdd-Skill Schritt 5).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * Lädt die echte Browser-Kopie von verbindungsRetry.js + createGame.js in
 * einer minimalen vm-Sandbox, die `window` als globales Objekt bereitstellt
 * (beide Dateien sind IIFEs der Form `(function (global) { ... })(window)`
 * und hängen ihre API an `global.FlowGame`, siehe Kopfkommentare der
 * Quelldateien). Gibt das befüllte `window.FlowGame`-Objekt zurück.
 */
function ladeBrowserFlowGame() {
  const sandbox = {};
  sandbox.window = sandbox;
  // BUGFIX-014 (Implementierung, 2026-08-08): setTimeout/clearTimeout sind
  // keine ECMAScript-Standard-Globals (anders als z. B. Math/Date/JSON) und
  // deshalb in einem frischen vm.createContext()-Objekt NICHT automatisch
  // vorhanden - ein echter Browser stellt sie dagegen immer bereit
  // (window.setTimeout). verbindungsRetry.js ruft setTimeout() beim
  // tatsächlichen Warten zwischen Retry-Versuchen als bare Identifier auf;
  // ohne diese Ergänzung schlägt jeder Test, der einen echten Retry
  // durchläuft, mit "ReferenceError: setTimeout is not defined" fehl - ein
  // reiner Sandbox-Infrastruktur-Mangel, keine falsche Testerwartung (dieser
  // Mangel blieb bislang unentdeckt, weil die vorherige, fehlerhafte
  // createGame.js-Implementierung mitVerbindungsRetry() nie tatsächlich
  // aufrief und warte() deshalb nie erreicht wurde).
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  vm.createContext(sandbox);

  const retryCode = fs.readFileSync(
    path.join(__dirname, '..', 'public/js/game/verbindungsRetry.js'),
    'utf8'
  );
  vm.runInContext(retryCode, sandbox, { filename: 'public/js/game/verbindungsRetry.js' });

  const createGameCode = fs.readFileSync(
    path.join(__dirname, '..', 'public/js/game/createGame.js'),
    'utf8'
  );
  vm.runInContext(createGameCode, sandbox, { filename: 'public/js/game/createGame.js' });

  return sandbox.window.FlowGame;
}

function verbindungsFehler() {
  const err = new Error('Failed to get document because the client is offline.');
  err.code = 'unavailable';
  return err;
}

/**
 * Minimale In-Memory-Firestore-Attrappe, dieselbe Grundtechnik wie in
 * tests/game-connection-retry.integration.test.js (dort für die Node-
 * Referenz), hier bewusst eigenständig gehalten, damit dieser Testfall
 * unabhängig lesbar bleibt und ausschließlich das Firestore-API-Subset
 * abbildet, das createGame() tatsächlich benutzt (.collection().doc(),
 * .get(), .set(), .runTransaction()).
 */
function erzeugeFakeFirestore() {
  const speicher = new Map();
  const fehlerplan = new Map();
  const leseZaehler = new Map();

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
    };
  }

  function docRef(pfadSegs) {
    const pfadStr = pfadSegs.join('/');
    return {
      get: async () => ladeMitFehlerplan(pfadStr),
      set: async (daten) => {
        speicher.set(pfadStr, { ...daten });
      },
      collection: (name) => collectionRef([...pfadSegs, name]),
    };
  }

  function collectionRef(pfadSegs) {
    return { doc: (id) => docRef([...pfadSegs, id]) };
  }

  const db = {
    collection: (name) => collectionRef([name]),
    runTransaction: async (updateFn) => {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, daten) => ref.set(daten),
      };
      return updateFn(tx);
    },
  };

  /**
   * Der von createGame() beim ersten Versuch gewürfelte Zufallscode ist
   * unbekannt (Zufall) - dieser Helfer markiert deshalb testweise jeden
   * neu angefragten spiele/*-Pfad mit dem übergebenen Fehlerplan (analog
   * zum bestehenden Muster in game-connection-retry.integration.test.js,
   * Szenario "Host-Erstellungspfad auf frischem Gerät").
   */
  db._setzeFehlerplanFuerJedenNeuenSpielPfad = (anzahl) => {
    const bereitsMarkiert = new Set();
    const originalCollection = db.collection;
    db.collection = (name) => {
      const ref = originalCollection(name);
      const originalDoc = ref.doc;
      ref.doc = (id) => {
        const pfadStr = `${name}/${id}`;
        if (name === 'spiele' && !bereitsMarkiert.has(pfadStr)) {
          bereitsMarkiert.add(pfadStr);
          fehlerplan.set(pfadStr, anzahl);
        }
        return originalDoc(id);
      };
      return ref;
    };
  };

  /**
   * Markiert den erstmals angefragten spiele/*-Pfad als bereits existierend
   * (erzwingt CODE_KOLLISION beim allerersten Versuch), OHNE einen
   * Verbindungsfehler auszulösen - für den CODE_KOLLISION-Regressionstest.
   */
  db._belegeErstenNeuenSpielPfad = () => {
    let belegt = false;
    const originalCollection = db.collection;
    db.collection = (name) => {
      const ref = originalCollection(name);
      const originalDoc = ref.doc;
      ref.doc = (id) => {
        const pfadStr = `${name}/${id}`;
        if (name === 'spiele' && !belegt) {
          belegt = true;
          speicher.set(pfadStr, { code: id });
        }
        return originalDoc(id);
      };
      return ref;
    };
  };

  db._leseVersucheFuerErstenSpielPfad = () => {
    const werte = [...leseZaehler.values()];
    return werte.length > 0 ? werte[0] : 0;
  };

  return db;
}

describe('Szenario: Browser-Kopie createGame.js gelingt trotz einmaligem Verbindungsfehler beim ersten Versuch (AK1, Testplan-Grundgerüst Punkt 1)', () => {
  test('Gegeben der Transaktions-Lesevorgang beim Spielerstellen schlägt beim ersten Versuch mit dem bekannten Verbindungsfehler fehl und beim zweiten Versuch erfolgreich, wenn ein Host auf einem frischen Gerät über die tatsächliche Browser-Kopie public/js/game/createGame.js ein Spiel erstellt, dann gelingt die Erstellung trotzdem, ohne dass die Person eine Fehlermeldung sieht', async () => {
    const FlowGame = ladeBrowserFlowGame();
    const db = erzeugeFakeFirestore();
    db._setzeFehlerplanFuerJedenNeuenSpielPfad(1);

    const ergebnis = await FlowGame.createGame(
      { hostAnzeigename: 'Host frisch (Browser-Kopie)', uid: 'uid-host-browser-1' },
      db
    );

    expect(ergebnis.code).toHaveLength(8);
    // Mehr als 1 Lesevorgang auf dem Pfad belegt, dass tatsächlich ein
    // zweiter Versuch stattgefunden hat - nicht nur ein einziger Erfolg.
    expect(db._leseVersucheFuerErstenSpielPfad()).toBeGreaterThan(1);
  });
});

describe('Szenario: Browser-Kopie createGame.js erreicht bei dauerhaftem Verbindungsfehler eine begrenzte Obergrenze (AK2, Testplan-Grundgerüst Punkt 2)', () => {
  test('Gegeben JEDER Versuch schlägt mit demselben Verbindungsfehler fehl (echtes Offline-Gerät), wenn ein Host über die Browser-Kopie public/js/game/createGame.js ein Spiel erstellen will, dann bekommt die Person nach einer kurzen, begrenzten Anzahl automatischer Versuche weiterhin dieselbe verständliche Fehlermeldung - kein endloses Warten, kein stilles Hängenbleiben', async () => {
    const FlowGame = ladeBrowserFlowGame();
    const db = erzeugeFakeFirestore();
    db._setzeFehlerplanFuerJedenNeuenSpielPfad(999); // schlägt praktisch immer fehl

    await expect(
      FlowGame.createGame({ hostAnzeigename: 'Wirklich offline (Browser-Kopie)', uid: 'uid-host-browser-2' }, db)
    ).rejects.toThrow(/client is offline/i);

    // Es müssen MEHRERE, aber eine begrenzte Anzahl an Versuchen erfolgt
    // sein (mehr als 1 -> es gab überhaupt einen Retry; deutlich weniger als
    // die künstlich hohe Fehlerplan-Zahl 999 -> keine Endlosschleife).
    const versuche = db._leseVersucheFuerErstenSpielPfad();
    expect(versuche).toBeGreaterThan(1);
    expect(versuche).toBeLessThanOrEqual(6);
  }, 10000);
});

describe('Szenario: CODE_KOLLISION bleibt in der Browser-Kopie ohne Retry-Verzögerung (AK3, Pre-Mortem-Risiko 2, Regression)', () => {
  test('Gegeben der beim ersten Versuch gewürfelte Zufallscode kollidiert bereits mit einem bestehenden Spiel, wenn die Transaktion in der Browser-Kopie public/js/game/createGame.js diesen CODE_KOLLISION-Fehler wirft, dann wird sofort und ohne Retry-Verzögerung ein neuer Code versucht, statt den Fehler wie einen transienten Verbindungsfehler zu behandeln', async () => {
    const FlowGame = ladeBrowserFlowGame();
    const db = erzeugeFakeFirestore();
    db._belegeErstenNeuenSpielPfad();

    const start = Date.now();
    const ergebnis = await FlowGame.createGame(
      { hostAnzeigename: 'Kollisions-Host (Browser-Kopie)', uid: 'uid-host-browser-3' },
      db
    );
    const dauerMs = Date.now() - start;

    expect(ergebnis.code).toHaveLength(8);
    // Keine Retry-Wartezeit (kleinste Stufe 400ms) darf für den
    // CODE_KOLLISION-Versuch angefallen sein.
    expect(dauerMs).toBeLessThan(200);
  });
});
