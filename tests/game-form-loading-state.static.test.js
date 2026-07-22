/**
 * BUGFIX-002 – Keine Rückmeldung/Ladeanzeige beim Beitreten
 * BDD-Tests (flow-game-bdd, 2026-07-21) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-002"), Akzeptanzkriterien 1-6, das Pre-Mortem und
 * die drei Freigabe-Entscheidungen von Stephan (2026-07-21):
 *   1. Scope umfasst BEIDE Formulare: "Beitreten" (formBeitreten) UND
 *      "Spiel erstellen" (formErstellen).
 *   2. Die Ladeanzeige soll AUCH beim automatischen Hintergrund-
 *      Verfügbarkeitscheck (pruefeStationsVerfuegbarkeit()) erscheinen,
 *      nicht nur beim bewussten Klick.
 *   3. Option A: ein eigener, neuer Wartezustand am Button, komplett
 *      getrennt vom bestehenden verbindungsHinweis-Element aus BUGFIX-001.
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – sie
 * liest den echten, existierenden Quelltext von public/spiel.html und prüft
 * per Mustersuche (gleiches Vorgehen wie tests/game-a11y-static.test.js und
 * tests/game-connection-retry.static.test.js), ob die geforderte allgemeine
 * Wartezustands-Rückmeldung bereits vorhanden ist. Bewusst grob (Textmuster,
 * kein DOM/jsdom im Projekt vorhanden, siehe package.json), reicht aber aus,
 * um "existiert heute nicht" von "wurde ergänzt" zu unterscheiden.
 *
 * WICHTIG – bewusst RED: Alle Prüfungen unten schlagen JETZT tatsächlich
 * fehl (echte Assertion-Fehlschläge, kein Modul-/Syntaxfehler), weil
 * public/spiel.html laut Analyse-Spec heute in formErstellen (Zeile
 * ~1679-1699), formBeitreten (Zeile ~1755-1792) und
 * pruefeStationsVerfuegbarkeit() (Zeile ~1710-1745) noch KEINE sichtbare
 * Wartezustands-Rückmeldung enthält.
 *
 * Vorgeschlagene, aber noch nicht endgültige Umsetzung (Vorschlag, analog
 * zum Vorgehen in tests/game-connection-retry.logic.test.js – finale
 * Formulierung entscheidet flow-game-impl, sollte dann aber diese Tests grün
 * machen bzw. bei einer bewusst besseren Lösung diese Testdatei anpassen):
 *   - Der jeweilige Submit-Button wird unmittelbar nach dem Klick über
 *     `<button>.disabled = true` deaktiviert (nicht nur kosmetisch, siehe
 *     Pre-Mortem-Risiko 2) UND zeigt einen neuen, neutralen Text, der den
 *     String "wird bearbeitet" enthält (z. B. "Wird bearbeitet …", direkt
 *     aus Option A der Spec übernommen) – bewusst NICHT der bestehende Text
 *     "Verbindung wird aufgebaut – bitte einen Moment warten …" aus
 *     BUGFIX-001 (Pre-Mortem-Risiko 1: Begriffliche Kollision vermeiden).
 *   - Ein `aria-busy`-Attribut (oder eine gleichwertige ARIA-Kennzeichnung)
 *     macht den Zustand auch für Screenreader wahrnehmbar (AK6).
 *   - Nach Abschluss (Erfolg oder Fehler) wird der Button wieder aktiviert
 *     (`disabled = false`) – im Erfolgsfall VOR dem Wechsel in die Lobby,
 *     im Fehlerfall im catch-Block (Pre-Mortem-Risiko 3: garantierter
 *     Reset, kein "Hängenbleiben").
 *   - Derselbe Mechanismus wird auch aus pruefeStationsVerfuegbarkeit()
 *     heraus ausgelöst (Freigabe-Entscheidung 2), aber weiterhin NUR nach
 *     der bestehenden Prüfung auf einen vollständigen 8-stelligen Code
 *     (Pre-Mortem-Risiko 5: keine Ausweitung auf jeden einzelnen
 *     Tastendruck).
 *
 * Skill-Schritt 3a (Fixtures/Seed-Helfer gegen firestore.rules abgleichen):
 * NICHT ANWENDBAR für dieses Ticket – laut freigegebener Spec ("Betroffene
 * Architektur") gibt es keine Änderung an firestore.rules, keine neuen
 * Firestore-Felder und keine Fixtures/Seed-Helfer; reine clientseitige
 * UI-Rückmeldung ohne Firestore-Bezug.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden – siehe
 * package.json devDependencies –, deshalb bewusst Textmuster-Prüfung statt
 * echtem Rendering, analog zu tests/game-a11y-static.test.js).
 *
 * NACHTRAG (flow-game-impl, FEATURE-006, 2026-07-21, mit Stephan
 * abgestimmt): Die in Backlog.md (Ticket FEATURE-006, "Bekannte, bewusste
 * Lücke") dokumentierte Ausnahme – der Wartezustandstext blieb hartcodiert
 * Deutsch, weil genau DIESE Datei ihn per Regex `/wird bearbeitet/i` gegen
 * den rohen Quelltext prüfte – ist jetzt geschlossen. public/spiel.html
 * ruft an allen drei Stellen `t('lobby.wirdBearbeitet')` auf; die Prüfung
 * unten wurde entsprechend auf den neuen Übersetzungsschlüssel-Aufruf
 * umgestellt (siehe NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER weiter unten),
 * exakt derselbe Präzedenzfall wie die Umstellung von
 * `.rejects.toThrow(/code/i)` auf das sprachneutrale `err.code`-Feld in
 * tests/game-rooms.logic.test.js.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

// ÄNDERUNG (flow-game-impl, FEATURE-006, 2026-07-21, mit Stephan
// abgestimmt – exakt derselbe Präzedenzfall wie die Umstellung von
// `.rejects.toThrow(/code/i)` auf das sprachneutrale `err.code`-Feld in
// tests/game-rooms.logic.test.js): Der Wartezustandstext war die zuletzt
// verbliebene, bewusst dokumentierte Lücke aus FEATURE-006 (siehe
// Backlog.md, Ticket FEATURE-006, "Bekannte, bewusste Lücke") – er stand
// bislang hartcodiert Deutsch direkt im Button-Code, weil DIESER Test hier
// per Regex `/wird bearbeitet/i` genau danach gesucht hat. Die Lücke ist
// jetzt geschlossen: public/spiel.html ruft an allen drei Stellen
// `t('lobby.wirdBearbeitet')` auf, der literale deutsche Text steht nur noch
// in der zentralen Übersetzungstabelle (src/i18n/uebersetzungen.js bzw.
// public/js/i18n/uebersetzungen.js). Die alte Regex würde daher nicht mehr
// im Quelltext treffen. Statt sie abzuschwächen oder zu löschen, prüft
// dieser Test jetzt gezielt den neuen, korrekten Aufruf des
// Übersetzungsschlüssels im Quelltext.
const NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER = /t\(\s*'lobby\.wirdBearbeitet'\s*\)/;

// Bestehender, spezifischerer BUGFIX-001-Text – muss unverändert bestehen
// bleiben (Regressionsschutz, Pre-Mortem-Risiko 4).
const BESTEHENDER_VERBINDUNGSTEXT = 'Verbindung wird aufgebaut – bitte einen Moment warten …';

const DISABLED_TRUE_MUSTER = /\.disabled\s*=\s*true\b/;
const DISABLED_FALSE_MUSTER = /\.disabled\s*=\s*false\b/;
const ARIA_BUSY_MUSTER = /aria-busy/i;

function schneide(startAnker, endAnker) {
  const start = spielHtmlInhalt.indexOf(startAnker);
  expect(start).toBeGreaterThan(-1); // die bekannte Anker-Stelle muss weiterhin existieren
  const ende = endAnker ? spielHtmlInhalt.indexOf(endAnker, start) : start + 2000;
  expect(ende).toBeGreaterThan(start); // End-Anker muss nach Start-Anker gefunden werden
  return spielHtmlInhalt.slice(start, ende);
}

function formErstellenKoerper() {
  return schneide(
    "formErstellen.addEventListener('submit', async function (ev) {",
    'async function pruefeStationsVerfuegbarkeit()'
  );
}

function pruefeStationsVerfuegbarkeitKoerper() {
  return schneide(
    'async function pruefeStationsVerfuegbarkeit()',
    "beitrittCodeInput.addEventListener('blur'"
  );
}

function formBeitretenKoerper() {
  return schneide(
    "formBeitreten.addEventListener('submit', async function (ev) {",
    'init().catch(function (err) {'
  );
}

describe('Szenario: Sofortige, wirksame Wartezustands-Rückmeldung beim Beitreten (AK1, AK2, AK5, Pre-Mortem-Risiko 2)', () => {
  test('Gegeben der formBeitreten-Submit-Handler in public/spiel.html, wenn der Quelltext direkt nach dem Klick (vor dem eigentlichen await joinGame-Aufruf) geprüft wird, dann wird der Button dort bereits wirksam deaktiviert (nicht nur kosmetisch) UND zeigt sichtbar den neuen, neutralen Wartetext', () => {
    const koerper = formBeitretenKoerper();
    const indexAwaitJoin = koerper.indexOf('await window.FlowGame.joinGame(');
    expect(indexAwaitJoin).toBeGreaterThan(-1);

    const vorDemAufruf = koerper.slice(0, indexAwaitJoin);

    expect(DISABLED_TRUE_MUSTER.test(vorDemAufruf)).toBe(true);
    expect(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER.test(vorDemAufruf)).toBe(true);
  });
});

describe('Szenario: Sofortige, wirksame Wartezustands-Rückmeldung beim Erstellen (AK1, Freigabe-Entscheidung 1 – Scope erweitert auf "Spiel erstellen")', () => {
  test('Gegeben der formErstellen-Submit-Handler in public/spiel.html, wenn der Quelltext direkt nach dem Klick (vor dem eigentlichen await createGame-Aufruf) geprüft wird, dann wird der Button dort ebenso wirksam deaktiviert UND zeigt denselben neuen, neutralen Wartetext wie beim Beitreten', () => {
    const koerper = formErstellenKoerper();
    const indexAwaitCreate = koerper.indexOf('await window.FlowGame.createGame(');
    expect(indexAwaitCreate).toBeGreaterThan(-1);

    const vorDemAufruf = koerper.slice(0, indexAwaitCreate);

    expect(DISABLED_TRUE_MUSTER.test(vorDemAufruf)).toBe(true);
    expect(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER.test(vorDemAufruf)).toBe(true);
  });
});

describe('Szenario: Wartezustand wird nach Abschluss vollständig zurückgesetzt (AK3, Pre-Mortem-Risiko 3 – garantierter Reset)', () => {
  test('Gegeben ein erfolgreicher Beitritt, wenn der Quelltext zwischen dem await joinGame-Aufruf und dem catch-Block geprüft wird, dann wird der Wartezustand dort bereits vor dem Wechsel in die Lobby zurückgesetzt (Button wieder aktiviert)', () => {
    const koerper = formBeitretenKoerper();
    const indexAwaitJoin = koerper.indexOf('await window.FlowGame.joinGame(');
    const indexCatch = koerper.indexOf('} catch (err) {', indexAwaitJoin);
    expect(indexCatch).toBeGreaterThan(indexAwaitJoin);

    const erfolgspfad = koerper.slice(indexAwaitJoin, indexCatch);
    expect(DISABLED_FALSE_MUSTER.test(erfolgspfad)).toBe(true);
  });

  test('Gegeben ein Beitrittsversuch endet mit einem regulären Fehler (z. B. ungültiger Code), wenn der catch-Block des formBeitreten-Handlers geprüft wird, dann wird der Wartezustand dort zuverlässig zurückgesetzt (Button wieder bedienbar), unabhängig vom bereits bestehenden zeigeFehler()-Aufruf', () => {
    const koerper = formBeitretenKoerper();
    const indexCatch = koerper.indexOf('} catch (err) {');
    expect(indexCatch).toBeGreaterThan(-1);
    const catchBlock = koerper.slice(indexCatch);

    expect(DISABLED_FALSE_MUSTER.test(catchBlock)).toBe(true);
    // Der bestehende Fehlermechanismus darf nicht verdrängt werden.
    expect(catchBlock).toMatch(/zeigeFehler\(/);
  });

  test('Gegeben ein erfolgreicher Beitritt zum Spiel des Hosts, wenn der Quelltext zwischen dem await createGame-Aufruf und dem catch-Block geprüft wird, dann wird der Wartezustand dort bereits vor dem Wechsel in die Lobby zurückgesetzt', () => {
    const koerper = formErstellenKoerper();
    const indexAwaitCreate = koerper.indexOf('await window.FlowGame.createGame(');
    const indexCatch = koerper.indexOf('} catch (err) {', indexAwaitCreate);
    expect(indexCatch).toBeGreaterThan(indexAwaitCreate);

    const erfolgspfad = koerper.slice(indexAwaitCreate, indexCatch);
    expect(DISABLED_FALSE_MUSTER.test(erfolgspfad)).toBe(true);
  });

  test('Gegeben das Erstellen eines Spiels endet mit einem regulären Fehler, wenn der catch-Block des formErstellen-Handlers geprüft wird, dann wird der Wartezustand dort zuverlässig zurückgesetzt', () => {
    const koerper = formErstellenKoerper();
    const indexCatch = koerper.indexOf('} catch (err) {');
    expect(indexCatch).toBeGreaterThan(-1);
    const catchBlock = koerper.slice(indexCatch);

    expect(DISABLED_FALSE_MUSTER.test(catchBlock)).toBe(true);
    expect(catchBlock).toMatch(/zeigeFehler\(/);
  });
});

describe('Szenario: Koexistenz mit dem bestehenden BUGFIX-001-Verbindungshinweis (AK4)', () => {
  test.each([
    ['formBeitreten', formBeitretenKoerper, 'await window.FlowGame.joinGame('],
    ['formErstellen', formErstellenKoerper, 'await window.FlowGame.createGame('],
  ])(
    'Gegeben %s löst zusätzlich einen echten Verbindungsfehler-Retry aus, wenn der Quelltext geprüft wird, dann bleibt der bestehende onRetry-Callback (zeigeVerbindungsRetryHinweis) unverändert erhalten UND die neue allgemeine Wartezustands-Anzeige ist zusätzlich (nicht ersetzend) vorhanden',
    (_name, koerperFn, awaitAnker) => {
      const koerper = koerperFn();
      expect(koerper).toMatch(/onRetry:\s*zeigeVerbindungsRetryHinweis/);

      const indexAwait = koerper.indexOf(awaitAnker);
      expect(indexAwait).toBeGreaterThan(-1);
      const vorDemAufruf = koerper.slice(0, indexAwait);
      expect(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER.test(vorDemAufruf)).toBe(true);
    }
  );
});

describe('Szenario: Auch für Screenreader wahrnehmbar, nicht nur optisch (AK6)', () => {
  test.each([
    ['formBeitreten', formBeitretenKoerper],
    ['formErstellen', formErstellenKoerper],
  ])(
    'Gegeben der %s-Submit-Handler, wenn der Quelltext auf eine für Screenreader wahrnehmbare Kennzeichnung des Wartezustands geprüft wird, dann findet sich dort ein aria-busy-Attribut (oder eine gleichwertige ARIA-Kennzeichnung), nicht nur eine rein visuelle Änderung',
    (_name, koerperFn) => {
      const koerper = koerperFn();
      expect(ARIA_BUSY_MUSTER.test(koerper)).toBe(true);
    }
  );
});

describe('Szenario: Ladeanzeige gilt auch für den automatischen Hintergrund-Verfügbarkeitscheck (Freigabe-Entscheidung 2, abweichend von der ursprünglichen Analyse-Empfehlung)', () => {
  test('Gegeben pruefeStationsVerfuegbarkeit() liest bei jedem vollständig eingegebenen Code per Netzwerk-Aufruf, wenn der Funktionskörper geprüft wird, dann löst auch dieser Hintergrund-Check dieselbe allgemeine Wartezustands-Anzeige aus wie ein bewusster Klick', () => {
    const koerper = pruefeStationsVerfuegbarkeitKoerper();
    expect(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER.test(koerper)).toBe(true);
  });

  test('Gegeben Pre-Mortem-Risiko 5 (visuelle Unruhe bei jedem Tastendruck), wenn der Funktionskörper von pruefeStationsVerfuegbarkeit() geprüft wird, dann steht die bestehende Prüfung auf einen vollständigen 8-stelligen Code weiterhin VOR dem neuen Wartezustands-Marker – die Anzeige bleibt an einen vollständigen Code gekoppelt, nicht an jeden einzelnen Tastendruck', () => {
    const koerper = pruefeStationsVerfuegbarkeitKoerper();
    const indexLaengenPruefung = koerper.indexOf('code.length !== 8');
    const indexWartetext = koerper.search(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER);

    expect(indexLaengenPruefung).toBeGreaterThan(-1);
    expect(indexWartetext).toBeGreaterThan(-1);
    expect(indexWartetext).toBeGreaterThan(indexLaengenPruefung);
  });
});

describe('Szenario: Eigener, neuer Wartezustand getrennt vom bestehenden verbindungsHinweis-Element (Freigabe-Entscheidung 3, Option A, Pre-Mortem-Risiko 1)', () => {
  // ÄNDERUNG (flow-game-impl, FEATURE-006, 2026-07-21): Der literale deutsche
  // Wartetext steht nach Schliessen der Lücke nicht mehr direkt im
  // Button-Code, sondern nur noch in der zentralen Übersetzungstabelle.
  // Diese Prüfung geht deshalb jetzt direkt gegen die "Quelle der Wahrheit"
  // (UEBERSETZUNGEN['lobby.wirdBearbeitet'].de) statt gegen einen
  // Quelltext-Ausschnitt aus spiel.html – analog dazu, dass die
  // FEHLERCODE-Umstellung in game-rooms.logic.test.js ebenfalls das reale
  // `err.code`-Feld statt eines Text-Ausschnitts prüft.
  test('Gegeben der neue allgemeine Wartetext aus der Übersetzungstabelle (Schlüssel lobby.wirdBearbeitet, Sprache de), wenn er mit dem bestehenden, spezifischeren BUGFIX-001-Verbindungshinweis-Text verglichen wird, dann unterscheidet er sich davon (keine begriffliche Kollision zwischen "alles normal, dauert nur kurz" und "es gibt ein Verbindungsproblem")', () => {
    const wartetextDe = UEBERSETZUNGEN['lobby.wirdBearbeitet'].de;
    expect(wartetextDe).not.toBe(BESTEHENDER_VERBINDUNGSTEXT);
  });

  test('Gegeben die drei neuen Einsatzstellen (formErstellen, formBeitreten, pruefeStationsVerfuegbarkeit), wenn ihr Quelltext auf den neuen Übersetzungsschlüssel-Aufruf geprüft wird, dann taucht dieser Aufruf NICHT auch als Teil der bestehenden Funktionsdefinitionen zeigeVerbindungsRetryHinweis()/versteckeVerbindungsRetryHinweis() auf (kein Vermischen zweier Bedeutungen in einem Element)', () => {
    const start = spielHtmlInhalt.indexOf('function zeigeVerbindungsRetryHinweis()');
    const ende = spielHtmlInhalt.indexOf('function versteckeVerbindungsRetryHinweis()');
    expect(start).toBeGreaterThan(-1);
    expect(ende).toBeGreaterThan(start);

    // versteckeVerbindungsRetryHinweis() selbst mit einschliessen (kurzer Funktionskörper).
    const bereich = spielHtmlInhalt.slice(start, ende + 200);
    expect(NEUER_WARTETEXT_SCHLUESSEL_AUFRUF_MUSTER.test(bereich)).toBe(false);
  });
});

describe('Regressionsschutz gegen BUGFIX-001 (Pre-Mortem-Risiko 4) – die bestehenden Funktionen bleiben unangetastet', () => {
  test('Gegeben zeigeVerbindungsRetryHinweis() und versteckeVerbindungsRetryHinweis() sind bereits durch 24 BUGFIX-001-Testfälle abgesichert, wenn ihr Quelltext geprüft wird, dann setzen sie weiterhin unverändert genau den bestehenden, spezifischen Verbindungsfehler-Text bzw. verstecken das bestehende verbindungsHinweis-Element – keine Umbenennung, keine inhaltliche Änderung durch dieses Ticket', () => {
    expect(spielHtmlInhalt).toContain(
      "function zeigeVerbindungsRetryHinweis() {\n    verbindungsHinweis.textContent = 'Verbindung wird aufgebaut – bitte einen Moment warten …';\n    verbindungsHinweis.hidden = false;\n  }"
    );
    expect(spielHtmlInhalt).toContain(
      "function versteckeVerbindungsRetryHinweis() {\n    verbindungsHinweis.hidden = true;\n    verbindungsHinweis.textContent = '';\n  }"
    );
  });

  test('Gegeben das bestehende verbindungs-hinweis-Element aus FEATURE-005/BUGFIX-001, wenn der Quelltext geprüft wird, dann existiert es weiterhin unter genau derselben id (keine Umwidmung für den neuen allgemeinen Wartezustand)', () => {
    expect(spielHtmlInhalt).toMatch(/id="verbindungs-hinweis"/);
  });
});
