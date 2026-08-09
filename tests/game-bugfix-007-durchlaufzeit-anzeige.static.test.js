/**
 * BUGFIX-007 – Zeitmessung startet zu früh, schon während der Erklärungsphase
 * BDD-Tests (flow-game-bdd, 2026-08-09) für die sieben Akzeptanzkriterien der
 * von Stephan am 2026-08-09 13:47 freigegebenen Option B (Backlog.md,
 * "### BUGFIX-007", Abschnitt "Akzeptanzkriterien").
 *
 * Option B (bestätigt): Die SERVER-seitige Zeitmessung (durchlaufzeitStart,
 * alle Kennzahlen-Berechnungen) bleibt exakt unverändert. Nur die CLIENT-
 * seitige Live-Anzeige der Durchlaufzeit-Box (#zeit-durchlauf im gemeinsamen
 * #runde-panel, public/spiel.html) wird geändert: vor "Definition of Ready
 * abgeschlossen" kein sekündlich hochzählender Zahlenwert mehr, sondern ein
 * neutraler Hinweis; ab DoR beginnt die sichtbare Hochzählung bei der
 * tatsächlich bereits vergangenen Zeit (nicht bei 00:00).
 *
 * Pflicht-Architekturvorgabe aus dem Pre-Mortem (Risiko 7, Rollback-/
 * Wiederanlauffähigkeit) und "Zusammenspiel bestehender Bausteine" (Schritt
 * 4a) der Analyse-Spec: Die Anzeige-Logik wird AUSSCHLIESSLICH aus dem
 * bereits vorhandenen, servergesetzten Feld `dorAbgeschlossen` abgeleitet -
 * KEIN neuer lokaler Client-Zustand (analog zum bestehenden
 * `zeitBearbeitungBox.hidden = !bearbeitungGesetzt`-Muster). Mehrere
 * Testfälle unten prüfen genau diesen Fall: ein frischer Aufruf, bei dem
 * `dorAbgeschlossen` von Anfang an `true` ist (Seite lädt/rendert erstmals
 * NACH bereits erfolgtem DoR, z. B. nach einem Reload während der
 * Klärungsphase, nachdem eine andere Person DoR inzwischen abgeschlossen
 * hat) - ohne einen vorherigen "false"-Aufruf, ohne Sonderbehandlung.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung dieser BDD-Phase, siehe
 * Analyse-Spec Schritt 5a - der genaue Wortlaut/die genaue visuelle Form ist
 * ausdrücklich ein Implementierungsdetail, das vor der Umsetzung kurz mit
 * Stephan abgestimmt werden soll; bitte mit flow-game-impl abgleichen statt
 * stillschweigend zu ignorieren):
 *   - i18n-Schlüssel (NEU, beide Kopien): spielbrett.durchlaufzeitNeutralerHinweis
 *     Vorschlag Wortlaut: de "läuft …", en "running …" (angelehnt an das
 *     Beispiel aus der Spec, AK1: "z. B. „läuft" oder ein Wartesymbol").
 * Die Tests unten prüfen NICHT den exakten Wortlaut (bewusst offen gelassen,
 * siehe Spec 5a), sondern nur: (a) dass ein solcher Schlüssel mit
 * nicht-leerem DE/EN in beiden i18n-Kopien existiert, und (b) dass sich die
 * Anzeige beobachtbar NICHT wie ein sekündlich hochzählender Zahlenwert
 * verhält, solange dorAbgeschlossen falsch ist.
 *
 * TESTANSATZ: Zwei Ebenen, wie in diesem Projekt etabliert (kein DOM/jsdom,
 * siehe package.json devDependencies):
 *   1. Strukturelle Textmuster-Prüfung direkt gegen den echten Quelltext von
 *      public/spiel.html (Regressionsschutz AK3-AK5, AK7) - dasselbe
 *      Vorgehen wie game-bugfix-006-sprachreine-anzeige.static.test.js bzw.
 *      game-feature-012-erklaerungstexte.static.test.js.
 *   2. Echte AUSFÜHRBARE Logik-Prüfung (AK1, AK2, AK6, AK7, Pre-Mortem-
 *      Risiko 7): analog zu tests/game-round4-warteschlange.static.test.js
 *      wird `renderRundenStatus(db, code)` (zusammen mit den zwei reinen
 *      Helferfunktionen, die es nutzt: alsMillisLokal(), formatiereZeit())
 *      direkt aus dem echten Quelltext extrahiert (Klammer-balanciert) und
 *      per `new Function(...)` tatsächlich ausgeführt, mit einem gestellten
 *      "runde"-Objekt und gestellten DOM-Element-/Funktions-Attrappen.
 *      `setInterval`/`clearInterval` werden dabei LOKAL abgefangen (kein
 *      echter Timer), damit ein Tick gezielt simuliert werden kann, statt
 *      auf einen echten 1-Sekunden-Timer zu warten.
 *      Referenziert eine künftige Implementierung eine bislang unbekannte,
 *      NEUE freie Variable (z. B. eine neu eingeführte, zusätzliche
 *      Hilfsfunktion oder ein neuer Client-Zustand, den die
 *      Architekturvorgabe oben ausschließt), schlägt die Ausführung mit
 *      einem ReferenceError fehl statt einer normalen Assertion - das ist
 *      ein gewollter Nebeneffekt dieses Testaufbaus (siehe flow-game-bdd,
 *      Abschnitt 4a: nur mechanische Anpassungen an der Test-Infrastruktur
 *      sind dann erlaubt, keine Änderung der eigentlichen Erwartung).
 *
 * WICHTIG - bewusst RED beim ersten Lauf: aktualisiereZeitanzeigen() prüft
 * heute (code-verifiziert, Analyse-Spec Pflicht-Code-Verifikation) an keiner
 * Stelle `dorAbgeschlossen` - die Durchlaufzeit-Box tickt unbedingt, sobald
 * durchlaufzeitStart gesetzt ist. Entsprechend schlagen die AK1/AK2/AK6-
 * Szenarien, das Pre-Mortem-Risiko-7-Szenario sowie das neue
 * i18n-Schlüssel-Szenario jetzt tatsächlich fehl. Die Regressionsschutz-
 * Szenarien (AK3, AK4, AK5, Teile von AK7) sind dagegen bewusst schon JETZT
 * GRÜN, weil sie unverändertes Bestandsverhalten absichern.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden).
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const browserUebersetzungenInhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');

// ---------------------------------------------------------------------------
// Extraktions-Helfer
// ---------------------------------------------------------------------------

// Extrahiert eine komplette Funktionsdefinition (Signatur + Klammer-
// balancierter Körper) ab einem eindeutigen Anker-Text - robuster als eine
// feste Start/End-Distanz, weil die tatsächliche Länge der (noch nicht
// existierenden) Implementierung nicht bekannt ist.
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

function renderRundenStatusKoerper() {
  const start = spielHtmlInhalt.indexOf('function renderRundenStatus(db, code) {');
  expect(start).toBeGreaterThan(-1);
  const ende = spielHtmlInhalt.indexOf('function darfIchDieseKarteBewegen(rundenNummer, vonPosition, karte) {', start);
  expect(ende).toBeGreaterThan(start);
  return spielHtmlInhalt.slice(start, ende);
}

function zeigeKennzahlenKoerper() {
  return extrahiereFunktion('function zeigeKennzahlen(runde) {');
}

function baueFormatiereZeitAusfuehrbar() {
  const quelltext = extrahiereFunktion('function formatiereZeit(ms) {');
  return new Function('ms', `${quelltext}\nreturn formatiereZeit(ms);`);
}
const formatiereZeit = baueFormatiereZeitAusfuehrbar();

// ---------------------------------------------------------------------------
// Ausführbare Logik-Prüfung: renderRundenStatus() real aus dem Quelltext
// extrahiert und mit Attrappen ausgeführt (siehe Kopfkommentar, Testansatz 2).
// ---------------------------------------------------------------------------

function baueRenderRundenStatusAusfuehrbar() {
  const alsMillisLokalQuelltext = extrahiereFunktion('function alsMillisLokal(zeitwert) {');
  const formatiereZeitQuelltext = extrahiereFunktion('function formatiereZeit(ms) {');
  const renderRundenStatusQuelltext = renderRundenStatusKoerper();
  const koerper = `
    ${alsMillisLokalQuelltext}
    ${formatiereZeitQuelltext}
    let __letzterIntervalCallback = null;
    function setInterval(fn) { __letzterIntervalCallback = fn; return 1; }
    function clearInterval() { __letzterIntervalCallback = null; }
    // renderRundenStatus() liest/schreibt dieses modul-weite Feld heute
    // (timerIntervalId, siehe echter Quelltext) - hier als lokale Variable
    // im selben Gültigkeitsbereich bereitgestellt, damit der klammer-
    // balanciert extrahierte Funktionskörper unverändert ausgeführt werden
    // kann, ohne dass wir seine interne Struktur vorschreiben müssen.
    let timerIntervalId = null;
    ${renderRundenStatusQuelltext}
    renderRundenStatus(__db, __code);
    return __letzterIntervalCallback;
  `;
  return new Function(
    '__db', '__code',
    'aktuelleRundenDaten', 'aktuelleRundenNummer',
    'rundePhaseBadge', 'phaseLabel',
    'untertitelModus', 'untertitelRundenNummer', 'untertitelPhaseRoh', 'aktualisiereUntertitel',
    'dorBereich', 'brett', 'rvBrett', 'zeitBearbeitungBox',
    'zeitDurchlaufEl', 'zeitBearbeitungEl',
    't', 'zeigeKennzahlen', 'kennzahlenPanel', 'renderRundeVier',
    koerper,
  );
}

// Führt einen simulierten Render-/Snapshot-Zyklus aus und gibt die
// beobachtbaren DOM-Attrappen plus eine Funktion zum Simulieren des
// nächsten 1-Sekunden-Ticks zurück (statt auf einen echten Timer zu warten).
function fuehreRenderRundenStatusAus({ runde, aktuelleRundenNummer = 1, jetztMs, neutralerHinweisText = 'läuft …' }) {
  const zeitDurchlaufEl = { textContent: '' };
  const zeitBearbeitungEl = { textContent: '' };
  const rundePhaseBadge = { className: '', textContent: '' };
  const dorBereich = { hidden: false };
  const brett = { hidden: false };
  const rvBrett = { hidden: false };
  const zeitBearbeitungBox = { hidden: false };
  const kennzahlenPanel = { hidden: false };
  const phaseLabel = () => '';
  const aktualisiereUntertitel = () => {};
  const t = () => neutralerHinweisText;
  const zeigeKennzahlen = () => {};
  const renderRundeVier = () => {};

  const ausfuehrbar = baueRenderRundenStatusAusfuehrbar();
  const echtesDateNow = Date.now;
  Date.now = () => jetztMs;
  let intervalCallback;
  try {
    intervalCallback = ausfuehrbar(
      'DB_STUB', 'CODE_STUB',
      runde, aktuelleRundenNummer,
      rundePhaseBadge, phaseLabel,
      null, null, null, aktualisiereUntertitel,
      dorBereich, brett, rvBrett, zeitBearbeitungBox,
      zeitDurchlaufEl, zeitBearbeitungEl,
      t, zeigeKennzahlen, kennzahlenPanel, renderRundeVier,
    );
  } finally {
    Date.now = echtesDateNow;
  }

  return {
    zeitDurchlaufEl,
    zeitBearbeitungEl,
    zeitBearbeitungBox,
    // Simuliert den nächsten setInterval-Tick zu einem späteren Zeitpunkt,
    // ohne einen echten Timer abzuwarten. No-op, falls die Implementierung
    // (z.B. weil dorAbgeschlossen falsch ist) gar keinen Interval gestartet
    // hat - das ist selbst ein gültiges Ergebnis (siehe AK1-Szenario unten).
    simuliereNaechstenTick(neueJetztMs) {
      if (!intervalCallback) return;
      const echtesDateNow2 = Date.now;
      Date.now = () => neueJetztMs;
      try {
        intervalCallback();
      } finally {
        Date.now = echtesDateNow2;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// AK1: Vor DoR keine sekündlich hochzählende Zahl, sondern neutraler Hinweis.
// ---------------------------------------------------------------------------
describe('Szenario: Durchlaufzeit-Box vor Definition of Ready (AK1)', () => {
  test('Gegeben eine Runde ist gestartet und DoR ist noch NICHT abgeschlossen (5 Sekunden bereits vergangen), wenn die Durchlaufzeit-Box erstmals gerendert wird, dann zeigt sie NICHT den naiven verstrichenen Zahlenwert ("00:05")', () => {
    const jetztMs = 1_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 5000,
      dorAbgeschlossen: false,
    };
    const { zeitDurchlaufEl } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitDurchlaufEl.textContent).not.toBe(formatiereZeit(5000));
  });

  test('Gegeben DoR ist weiterhin nicht abgeschlossen, wenn eine weitere Sekunde vergeht und die Anzeige erneut aktualisiert wird, dann bleibt der angezeigte Text zwischen beiden Aufrufen UNVERÄNDERT (kein sekündliches Hochzählen, AK1 Polarität)', () => {
    const jetztMs = 1_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 5000,
      dorAbgeschlossen: false,
    };
    const { zeitDurchlaufEl, simuliereNaechstenTick } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    const ausgangswert = zeitDurchlaufEl.textContent;
    simuliereNaechstenTick(jetztMs + 1000);
    expect(zeitDurchlaufEl.textContent).toBe(ausgangswert);
  });
});

// ---------------------------------------------------------------------------
// AK2: Ab DoR sichtbare Hochzählung, beginnend bei der bereits vergangenen
// Zeit (nicht bei 00:00) - inkl. Regressionsschutz für die Arithmetik selbst.
// ---------------------------------------------------------------------------
describe('Szenario: Durchlaufzeit-Box ab Definition of Ready (AK2)', () => {
  test('Gegeben DoR wird abgeschlossen, nachdem bereits 47 Sekunden Klärungsphase vergangen sind, wenn die Anzeige direkt danach neu gerendert wird, dann zeigt sie sofort "00:47" - nicht "00:00" und nicht den neutralen Hinweis', () => {
    const jetztMs = 2_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 47000,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs,
    };
    const { zeitDurchlaufEl } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitDurchlaufEl.textContent).toBe(formatiereZeit(47000));
    expect(zeitDurchlaufEl.textContent).not.toBe(formatiereZeit(0));
  });

  test('Gegeben die Anzeige zeigt bereits "00:47" nach DoR, wenn eine weitere Sekunde vergeht, dann zählt sie auf "00:48" weiter (Regressionsschutz: die bestehende Zeit-Arithmetik bleibt unverändert)', () => {
    const jetztMs = 2_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 47000,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs,
    };
    const { zeitDurchlaufEl, simuliereNaechstenTick } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    simuliereNaechstenTick(jetztMs + 1000);
    expect(zeitDurchlaufEl.textContent).toBe(formatiereZeit(48000));
  });
});

// ---------------------------------------------------------------------------
// AK3: Regressionsschutz - die endgültige Durchlaufzeit in den Kennzahlen
// bleibt exakt unverändert (liest weiterhin das servergesetzte Feld,
// berechnet nichts neu client-seitig).
// ---------------------------------------------------------------------------
describe('Szenario: Endgültige Durchlaufzeit am Rundenende bleibt unverändert (AK3, Regressionsschutz)', () => {
  test('Gegeben eine beendete Runde mit servergesetztem runde.durchlaufzeit, wenn zeigeKennzahlen() den Quelltext geprüft wird, dann liest die Kennzahlen-Box weiterhin direkt runde.durchlaufzeit (kein neu berechneter/abgeleiteter Wert)', () => {
    expect(zeigeKennzahlenKoerper()).toMatch(/\[\s*t\(\s*'spielbrett\.durchlaufzeit'\s*\)\s*,\s*runde\.durchlaufzeit\s*\]/);
  });

  test('Gegeben die Rundenvergleichs-Tabelle (mehrere Runden nebeneinander), wenn ihr Quelltext geprüft wird, dann liest auch sie weiterhin r.durchlaufzeit unverändert', () => {
    const anker = "zeile(t('spielbrett.durchlaufzeit')";
    const start = spielHtmlInhalt.indexOf(anker);
    expect(start).toBeGreaterThan(-1);
    const umfeld = spielHtmlInhalt.slice(start, start + 120);
    expect(umfeld).toMatch(/formatiereZeit\(r\.durchlaufzeit\)/);
  });
});

// ---------------------------------------------------------------------------
// AK4: Bestehender Erklärungstext (FEATURE-012 AK9) bleibt unverändert
// sichtbar.
// ---------------------------------------------------------------------------
describe('Szenario: FEATURE-012-Erklärungstext bleibt unverändert sichtbar (AK4, Regressionsschutz)', () => {
  test('Gegeben das bestehende #zeit-erklaerung-Element, wenn das Markup geprüft wird, dann ist es weiterhin vorhanden (nicht entfernt oder umbenannt)', () => {
    expect(spielHtmlInhalt).toMatch(/id="zeit-erklaerung"/);
  });

  test('Gegeben der bestehende Übersetzungsschlüssel spielbrett.zeitErklaerung, wenn sein Inhalt in beiden i18n-Kopien geprüft wird, dann enthält er weiterhin den freigegebenen Wortlaut ("verschiedene Zeiten") in DE und EN, unverändert durch dieses Ticket', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.zeitErklaerung']).toBeDefined();
    expect(UEBERSETZUNGEN_NODE['spielbrett.zeitErklaerung'].de).toMatch(/verschiedene Zeiten/);
    expect(UEBERSETZUNGEN_NODE['spielbrett.zeitErklaerung'].en).toMatch(/different times/i);
    expect(browserUebersetzungenInhalt).toMatch(/'spielbrett\.zeitErklaerung':\s*\{/);
  });
});

// ---------------------------------------------------------------------------
// AK5: Bearbeitungszeit-Box (Cycle Time) verhält sich unverändert - bleibt
// ausschließlich von bearbeitungGesetzt abhängig, nicht von dorAbgeschlossen.
// ---------------------------------------------------------------------------
describe('Szenario: Bearbeitungszeit-Box bleibt von diesem Ticket unberührt (AK5, Regressionsschutz)', () => {
  test('Gegeben der bestehende Quelltext, wenn das Sichtbarkeits-Statement der Bearbeitungszeit-Box geprüft wird, dann hängt es weiterhin nur an bearbeitungGesetzt, nicht zusätzlich an dorAbgeschlossen', () => {
    const koerper = renderRundenStatusKoerper();
    const idx = koerper.indexOf('zeitBearbeitungBox.hidden = !bearbeitungGesetzt;');
    expect(idx).toBeGreaterThan(-1);
    // Bewusst ein kurzes Umfeld (nicht 200 Zeichen): weiter oben im selben
    // Funktionskörper kommt "dorAbgeschlossen" bereits legitim in einem
    // GANZ ANDEREN, unveränderten Zusammenhang vor (brett.hidden/rvBrett.hidden
    // für Runde 1-3 vs. Runde 4) - ein zu weites Fenster würde diese
    // unveränderte, harmlose Fundstelle fälschlich als Verletzung werten.
    // Das kurze Fenster erfasst nur eine tatsächlich UNMITTELBAR umschließende
    // neue Bedingung um genau dieses Statement.
    const davor = koerper.slice(Math.max(0, idx - 90), idx);
    expect(davor).not.toMatch(/dorAbgeschlossen/);
  });

  test('Gegeben die Bearbeitungszeit noch nicht gestartet ist (bearbeitungszeitStart fehlt), wenn DoR bereits abgeschlossen ist, dann bleibt die Bearbeitungszeit-Box weiterhin verborgen (hidden), unabhängig von der neuen Durchlaufzeit-Anzeige-Logik', () => {
    const jetztMs = 3_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 10000,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs - 10000,
      // bearbeitungszeitStart bewusst nicht gesetzt
    };
    const { zeitBearbeitungBox } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitBearbeitungBox.hidden).toBe(true);
  });

  test('Gegeben die Bearbeitungszeit bereits läuft (bearbeitungszeitStart gesetzt), wenn DoR NOCH NICHT abgeschlossen ist (Grenzfall, sollte im echten Spiel nicht vorkommen, prüft aber die Code-Trennung), dann bleibt die Bearbeitungszeit-Box weiterhin sichtbar (hidden=false) - die neue Durchlaufzeit-Logik darf diese Entscheidung nicht mit beeinflussen', () => {
    const jetztMs = 3_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 10000,
      dorAbgeschlossen: false,
      bearbeitungszeitStart: jetztMs - 5000,
    };
    const { zeitBearbeitungBox } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitBearbeitungBox.hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AK6: Grenzfall Sofort-DoR (0 Sekunden Klärungsphase) - kein falscher
// Zwischenwert oder Sprung.
// ---------------------------------------------------------------------------
describe('Szenario: Grenzfall Sofort-DoR, praktisch 0 Sekunden Klärungsphase (AK6, Pre-Mortem-Risiko 5)', () => {
  test('Gegeben DoR wird im selben Moment wie der Rundenstart abgeschlossen (durchlaufzeitStart === dorAbgeschlossenAm === jetzt), wenn die Anzeige gerendert wird, dann zeigt sie sofort "00:00" - kein NaN, kein undefined, kein hängen gebliebener neutraler Hinweis', () => {
    const jetztMs = 4_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs,
    };
    const { zeitDurchlaufEl } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitDurchlaufEl.textContent).toBe(formatiereZeit(0));
    expect(zeitDurchlaufEl.textContent).toBe('00:00');
  });

  test('Gegeben der Sofort-DoR-Grenzfall, wenn direkt danach eine Sekunde vergeht, dann zählt die Anzeige sauber auf "00:01" weiter (kein Sprung, keine Wiederholung von "00:00")', () => {
    const jetztMs = 4_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs,
    };
    const { zeitDurchlaufEl, simuliereNaechstenTick } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    simuliereNaechstenTick(jetztMs + 1000);
    expect(zeitDurchlaufEl.textContent).toBe(formatiereZeit(1000));
  });
});

// ---------------------------------------------------------------------------
// Pre-Mortem-Risiko 7: Rollback-/Wiederanlauffähigkeit - Seite lädt/rendert
// erstmals, NACHDEM DoR (durch eine andere Person) bereits abgeschlossen
// wurde. Die Anzeige darf NICHT im neutralen Zustand hängen bleiben, nur weil
// kein vorheriger "false"-Aufruf lokal stattgefunden hat - die Logik muss
// ausschließlich aus dem servergesetzten Feld dorAbgeschlossen abgeleitet
// werden (kein neuer Client-Zustand, siehe Kopfkommentar).
// ---------------------------------------------------------------------------
describe('Szenario: Reload/Erstanzeige während der Klärungsphase, DoR ist bereits abgeschlossen (Pre-Mortem-Risiko 7)', () => {
  test('Gegeben eine Person lädt die Seite neu, während DoR (durch eine andere Person) bereits vor 90 Sekunden abgeschlossen wurde, wenn die Runde zum ALLERERSTEN Mal für diese Person gerendert wird (kein vorheriger "false"-Zustand), dann zeigt die Durchlaufzeit-Box sofort korrekt "01:30" tickend - nicht den neutralen Hinweis', () => {
    const jetztMs = 5_000_000;
    const runde = {
      durchlaufzeitStart: jetztMs - 90000,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs - 90000,
    };
    // Bewusst EIN einzelner, isolierter fuehreRenderRundenStatusAus()-Aufruf -
    // simuliert exakt einen frischen Erst-Render ohne vorherige Interaktion,
    // um sicherzustellen, dass kein client-seitig gespeicherter
    // Vorher-Zustand nötig ist.
    const { zeitDurchlaufEl } = fuehreRenderRundenStatusAus({ runde, jetztMs });
    expect(zeitDurchlaufEl.textContent).toBe(formatiereZeit(90000));
  });

  test('Gegeben zwei völlig unabhängige, frische Render-Aufrufe (verschiedene "runde"-Objekte, keine gemeinsame Instanz) - einmal mit dorAbgeschlossen:false, einmal mit dorAbgeschlossen:true bei identischem durchlaufzeitStart -, wenn beide isoliert geprüft werden, dann unterscheidet sich NUR das übergebene dorAbgeschlossen-Feld im Ergebnis, nicht irgendein gemeinsamer/vorheriger Zustand', () => {
    const jetztMs = 5_500_000;
    const gemeinsamerStart = jetztMs - 30000;

    const nichtAbgeschlossen = fuehreRenderRundenStatusAus({
      runde: { durchlaufzeitStart: gemeinsamerStart, dorAbgeschlossen: false },
      jetztMs,
    });
    const bereitsAbgeschlossen = fuehreRenderRundenStatusAus({
      runde: { durchlaufzeitStart: gemeinsamerStart, dorAbgeschlossen: true, dorAbgeschlossenAm: gemeinsamerStart },
      jetztMs,
    });

    expect(bereitsAbgeschlossen.zeitDurchlaufEl.textContent).toBe(formatiereZeit(30000));
    expect(nichtAbgeschlossen.zeitDurchlaufEl.textContent).not.toBe(bereitsAbgeschlossen.zeitDurchlaufEl.textContent);
  });
});

// ---------------------------------------------------------------------------
// AK7: Verhalten identisch für alle vier Runden (gemeinsames runde-panel).
// ---------------------------------------------------------------------------
describe('Szenario: Identisches Anzeige-Verhalten für alle vier Runden (AK7)', () => {
  test('Gegeben identische Zeit-Daten, wenn dieselbe Anzeige-Logik einmal für Runde 1 und einmal für Runde 4 ausgeführt wird, dann liefert sie exakt denselben angezeigten Text (kein rundenspezifischer Sonderfall)', () => {
    const jetztMs = 6_000_000;
    const rundeVorlage = () => ({
      durchlaufzeitStart: jetztMs - 12000,
      dorAbgeschlossen: false,
    });
    const ergebnisRunde1 = fuehreRenderRundenStatusAus({ runde: rundeVorlage(), aktuelleRundenNummer: 1, jetztMs });
    const ergebnisRunde4 = fuehreRenderRundenStatusAus({ runde: rundeVorlage(), aktuelleRundenNummer: 4, jetztMs });
    expect(ergebnisRunde4.zeitDurchlaufEl.textContent).toBe(ergebnisRunde1.zeitDurchlaufEl.textContent);
  });

  test('Gegeben derselbe Vergleich nach DoR-Abschluss, wenn Runde 1 und Runde 4 erneut verglichen werden, dann zeigen beide identisch die tatsächlich vergangene Zeit', () => {
    const jetztMs = 6_500_000;
    const rundeVorlage = () => ({
      durchlaufzeitStart: jetztMs - 12000,
      dorAbgeschlossen: true,
      dorAbgeschlossenAm: jetztMs - 12000,
    });
    const ergebnisRunde1 = fuehreRenderRundenStatusAus({ runde: rundeVorlage(), aktuelleRundenNummer: 1, jetztMs });
    const ergebnisRunde4 = fuehreRenderRundenStatusAus({ runde: rundeVorlage(), aktuelleRundenNummer: 4, jetztMs });
    expect(ergebnisRunde4.zeitDurchlaufEl.textContent).toBe(formatiereZeit(12000));
    expect(ergebnisRunde4.zeitDurchlaufEl.textContent).toBe(ergebnisRunde1.zeitDurchlaufEl.textContent);
  });

  test('Gegeben der bestehende Quelltext, wenn renderRundenStatus() strukturell geprüft wird, dann steht der Aufruf von aktualisiereZeitanzeigen() weiterhin VOR dem abschließenden renderRundeVier()-Aufruf (der runden-4-spezifischen Sonderverzweigung am Ende der Funktion), wird also nicht selbst in einen rundenspezifischen Zweig verschoben', () => {
    const koerper = renderRundenStatusKoerper();
    const aufrufIndex = koerper.indexOf('aktualisiereZeitanzeigen();');
    // Es gibt zwei Vorkommen von "if (aktuelleRundenNummer === 4)" in dieser
    // Funktion (brett/rvBrett-Sichtbarkeit weiter oben, renderRundeVier()-
    // Aufruf ganz am Ende) - hier ist bewusst NUR die zweite, abschließende
    // Verzweigung relevant, deshalb Anker direkt am renderRundeVier()-Aufruf.
    const renderRundeVierAufrufIndex = koerper.indexOf('renderRundeVier(db, code);');
    expect(aufrufIndex).toBeGreaterThan(-1);
    expect(renderRundeVierAufrufIndex).toBeGreaterThan(-1);
    expect(aufrufIndex).toBeLessThan(renderRundeVierAufrufIndex);
  });

  test('Gegeben der bestehende Quelltext, wenn der Körper von aktualisiereZeitanzeigen() geprüft wird, dann referenziert er NICHT aktuelleRundenNummer (bleibt rundenunabhängig, keine Runde-4-Sonderbehandlung dieser einen Anzeige)', () => {
    const koerper = extrahiereFunktion('function aktualisiereZeitanzeigen() {');
    expect(koerper).not.toMatch(/aktuelleRundenNummer/);
  });
});

// ---------------------------------------------------------------------------
// Neuer Übersetzungsschlüssel für den neutralen Hinweis (siehe Namensgebung
// im Kopfkommentar). Prüft NUR Existenz/Nicht-Leerheit in beiden i18n-Kopien,
// nicht den exakten Wortlaut (bewusst offen gelassen, Spec Schritt 5a).
// ---------------------------------------------------------------------------
describe('Szenario: Neuer i18n-Schlüssel für den neutralen Durchlaufzeit-Hinweis vor DoR', () => {
  test('Gegeben der vorgeschlagene Schlüssel spielbrett.durchlaufzeitNeutralerHinweis, wenn die Node-Referenz-Übersetzungstabelle geprüft wird, dann existiert er mit nicht-leerem DE- und EN-Text', () => {
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis']).toBeDefined();
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis'].de.trim().length).toBeGreaterThan(0);
    expect(UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis'].en.trim().length).toBeGreaterThan(0);
  });

  test('Gegeben derselbe Schlüssel, wenn die Browser-Kopie der Übersetzungstabelle als Text durchsucht wird, dann ist er dort ebenfalls (synchron, Node/Browser-Sync-Pflicht) vorhanden', () => {
    expect(browserUebersetzungenInhalt).toMatch(/'spielbrett\.durchlaufzeitNeutralerHinweis':\s*\{/);
  });

  test('Gegeben der DE-Text dieses Schlüssels, wenn er inhaltlich geprüft wird, dann sieht er NICHT wie ein mm:ss-Zahlenformat aus (er ist ein Wort-/Symbol-Hinweis, kein getarnter Zeitwert)', () => {
    const de = UEBERSETZUNGEN_NODE['spielbrett.durchlaufzeitNeutralerHinweis'].de;
    expect(de).not.toMatch(/^\d{2}:\d{2}$/);
  });
});
