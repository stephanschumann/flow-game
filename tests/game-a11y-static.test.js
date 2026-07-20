/**
 * FEATURE-005 – Phase 5: Robustheit (Barrierefreiheit, statisch prüfbarer Teil)
 * BDD-Tests (flow-game-bdd, 2026-07-20) für die Akzeptanzkriterien 11, 14 und
 * 15 aus der freigegebenen Spec in Backlog.md ("### FEATURE-005").
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – sie
 * liest den echten, existierenden Quelltext von public/spiel.html und prüft
 * per Mustersuche, ob die geforderten Barrierefreiheits-Ergänzungen bereits
 * enthalten sind. Das ist bewusst grob (Textmuster, kein echtes CSS-/DOM-
 * Parsing), reicht aber aus, um "existiert überhaupt nicht" (heutiger Stand,
 * siehe Analyse-Spec, Abschnitt "Was heute für (b) bereits existiert") von
 * "wurde ergänzt" zu unterscheiden.
 *
 * WICHTIG – bewusst RED: Alle drei Prüfungen schlagen JETZT tatsächlich fehl
 * (echte Assertion-Fehlschläge, kein Modul-/Syntaxfehler), weil der
 * betroffene Code in public/spiel.html diese Ergänzungen laut Analyse-Spec
 * heute nachweislich noch nicht enthält:
 *   - Zeile ~723: `btn.textContent = '→'` ohne aria-label.
 *   - Zeile ~47: Fokus-Stil existiert nur für `.field input`/`.field select`,
 *     nicht für die dynamisch erzeugten Bewegen-Buttons im Spielbrett.
 *   - Keine `prefers-reduced-motion`-Media-Query im gesamten Dokument.
 *
 * Diese drei Punkte sind der von flow-game-impl umzusetzende Kern der
 * Barrierefreiheits-Ergänzung; Tastatur-Durchlauf und Kontrast-Messung bleiben
 * bewusst manuelle Prüfungen (siehe tests/game-feature-005-manual-checks.test.js).
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt vorhanden – siehe
 * package.json devDependencies –, deshalb bewusst Textmuster-Prüfung statt
 * echtem Rendering).
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

describe('Szenario: Bewegen-Button ist für Screenreader sinnvoll benannt (AK15)', () => {
  test('Gegeben der Bewegen-Button wird dynamisch erzeugt und zeigt nur das Zeichen "→", wenn der Quelltext darauf geprüft wird, dann setzt er zusätzlich ein sprechendes aria-label (nicht nur das Pfeil-Symbol als einzige Beschriftung)', () => {
    // Sucht gezielt im Umfeld der Stelle, die laut Analyse-Spec den
    // Bewegen-Button ohne aria-label erzeugt (btn.textContent = '→').
    const stelleIndex = spielHtmlInhalt.indexOf("btn.textContent = '→'");
    expect(stelleIndex).toBeGreaterThan(-1); // die bekannte Stelle muss weiterhin existieren

    const umfeld = spielHtmlInhalt.slice(Math.max(0, stelleIndex - 400), stelleIndex + 400);
    const hatAriaLabel = /setAttribute\(\s*['"]aria-label['"]/.test(umfeld) || /\.ariaLabel\s*=/.test(umfeld);
    expect(hatAriaLabel).toBe(true);
  });
});

describe('Szenario: Sichtbarer Tastaturfokus auch für dynamisch erzeugte Spielbrett-Buttons (AK11)', () => {
  test('Gegeben es gibt bereits einen Fokus-Stil für Formularfelder (.field input:focus), wenn der Quelltext auf einen ebenso sichtbaren Fokus-Stil für Buttons im Spielbrett geprüft wird, dann existiert eine eigene :focus/:focus-visible-Regel dafür (nicht nur für Formularfelder)', () => {
    // Die bestehende, bereits vorhandene Regel dient als Anker/Beleg dafür,
    // dass EIN Fokus-Stil im Projekt existiert – aber eben nur für Formulare.
    expect(spielHtmlInhalt).toMatch(/\.field input:focus/);

    // Gesucht wird eine ZUSÄTZLICHE Regel, die auf normale <button>-Elemente
    // zielt (die Bewegen-Buttons sind reine <button type="button">-Elemente
    // ohne eigene Klasse, siehe public/spiel.html ~Zeile 721) und dabei
    // sichtbar ist (outline, box-shadow o. Ä.), nicht "outline:none" ohne
    // Ersatz.
    const buttonFokusRegelGefunden = /button(?![\w-])[^{]*:focus(-visible)?\s*\{[^}]*(outline|box-shadow)/.test(
      spielHtmlInhalt
    );
    expect(buttonFokusRegelGefunden).toBe(true);
  });
});

describe('Szenario: "Ruhiger Modus" ausschliesslich automatisch über prefers-reduced-motion (AK14, geklärte Frage 3)', () => {
  test('Gegeben es existiert eine Rise-Animation beim Seitenwechsel (.stage{animation:rise...}), wenn der Quelltext auf eine prefers-reduced-motion-Media-Query geprüft wird, dann reduziert/deaktiviert eine solche Media-Query diese Animation automatisch', () => {
    expect(spielHtmlInhalt).toMatch(/\.stage\{[^}]*animation:\s*rise/);

    const hatReduceMotionQuery = /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/.test(spielHtmlInhalt);
    expect(hatReduceMotionQuery).toBe(true);
  });

  test('Gegeben AK14 verlangt AUSSCHLIESSLICH die automatische OS-Einstellung (kein manueller Schalter, keine Host-weite Erzwingung), wenn der Quelltext nach einem manuellen "Ruhiger Modus"-Schalter durchsucht wird, dann gibt es keinen zusätzlichen manuellen UI-Schalter dafür', () => {
    // Bewusst NICHT als "muss existieren", sondern als Leitplanke gegen eine
    // Überimplementierung (Stephan hat sich am 2026-07-20 ausdrücklich gegen
    // einen manuellen Schalter entschieden). Dieser Test bleibt grün, solange
    // kein manueller Schalter eingebaut wird, und ist damit kein RED-Fall –
    // er dient als Regressionsschutz gegen eine spätere versehentliche
    // Überimplementierung, nicht als Nachweis fehlender Funktionalität.
    const hatManuellenSchalter = /ruhiger[- ]modus/i.test(spielHtmlInhalt) && /<button[^>]*ruhig/i.test(spielHtmlInhalt);
    expect(hatManuellenSchalter).toBe(false);
  });
});

describe('Szenario: Primärer Button erreicht WCAG-AA-Textkontrast (AK13) – Nachtrag nach echter Browser-Messung am 2026-07-20', () => {
  // Ergänzt NACH der ursprünglichen BDD-Testplanung: Eine echte Kontrast-
  // Messung im Live-Browser (getComputedStyle, keine Mustersuche) hat am
  // 2026-07-20 ergeben, dass der Verlauf des primären Buttons (.btn.primary)
  // mit weißem Text nur ca. 2,9–3,8:1 erreichte statt der geforderten 4,5:1
  // (AK13). Das war ein vorbestehender Fehler (nicht durch dieses Ticket neu
  // eingeführt), lag aber in dessen Scope ("gesamte Oberfläche"). Gefixt und
  // ab jetzt hier automatisiert gegen Regression geschützt, weil eine reine
  // Mustersuche (wie in den drei Szenarien oben) eine Kontrast-Verletzung
  // nicht erkennen kann, ein Rechenwert schon.
  function relLum(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrastVsWhite(hex) {
    const lighter = 1.0; // relative Luminanz von #fff
    const darker = relLum(hex);
    return (lighter + 0.05) / (darker + 0.05);
  }

  test.each([
    ['public/spiel.html', SPIEL_HTML_PFAD],
    ['public/index.html', path.join(__dirname, '..', 'public', 'index.html')],
  ])(
    'Gegeben der primäre Button-Verlauf in %s, wenn beide Verlaufsfarben gegen weißen Text (#fff) berechnet werden, dann erreicht jede mindestens 4.5:1',
    (_label, dateiPfad) => {
      const inhalt = fs.readFileSync(dateiPfad, 'utf8');
      const match = inhalt.match(/\.btn\.primary\{background:linear-gradient\(180deg,(#[0-9a-fA-F]{6}),(#[0-9a-fA-F]{6})\)/);
      expect(match).not.toBeNull(); // Verlauf muss weiterhin in diesem Format existieren

      const [, farbeOben, farbeUnten] = match;
      expect(contrastVsWhite(farbeOben)).toBeGreaterThanOrEqual(4.5);
      expect(contrastVsWhite(farbeUnten)).toBeGreaterThanOrEqual(4.5);
    }
  );
});
