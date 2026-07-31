/**
 * BUGFIX-013 – Kartenverschieben zwischen Spalten löst Textmarkierung aus
 * statt sauberem Ziehen.
 * BDD-Tests (flow-game-bdd, 2026-07-31) für die statisch (per Textmuster,
 * ohne DOM/jsdom) prüfbaren Akzeptanzkriterien aus der freigegebenen Spec in
 * Backlog.md ("### BUGFIX-013").
 *
 * WICHTIGER HINWEIS ZUR AUSSAGEKRAFT DIESER DATEI (siehe Pre-Mortem der Spec):
 * "Das Verhalten lässt sich nicht sinnvoll automatisiert testen
 * (Textmarkierung ist ein Browser-natives Verhalten, kein Anwendungszustand)
 * – Verifikation muss echt am Rechner (Maus) und am Tablet (Finger)
 * erfolgen." Diese Datei prüft deshalb ausdrücklich NICHT, ob im Browser
 * tatsächlich keine Textmarkierung mehr auftritt (AK1/AK2) – das kann eine
 * reine Quelltext-Prüfung strukturell nicht leisten. Sie prüft nur, ob die in
 * der Spec empfohlenen, sich ergänzenden Absicherungen (CSS `user-select:none`
 * auf dem gesamten Spielbrett-Bereich UND aktives Unterbinden der
 * Standardauswahl im Zieh-Handler) im Quelltext überhaupt vorhanden sind –
 * als Vorbedingung dafür, dass die echte, manuelle Prüfung (siehe
 * tests/game-bugfix-013-manual-checks.test.js) überhaupt eine Chance hat,
 * grün zu werden. Gleiches Muster wie tests/game-a11y-static.test.js
 * (FEATURE-005) und tests/game-drag-drop.static.test.js (FEATURE-008).
 *
 * WICHTIG – bewusst RED: Alle Szenarien in dieser Datei schlagen jetzt
 * tatsächlich fehl (echte Assertion-Fehlschläge), weil BUGFIX-013 noch nicht
 * implementiert ist. Real code-geprüft (Ist-Zustand vor der Implementierung):
 * `user-select` kommt heute KEIN einziges Mal in public/spiel.html vor (0
 * Treffer), und der `pointerdown`-Handler (Zeile ~1571) ruft weder
 * `preventDefault()` noch `getSelection()` noch eine `style.userSelect`-
 * Zuweisung auf.
 *
 * Framework: Jest + Node "fs" (kein DOM im Projekt vorhanden).
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

/** Extrahiert alle CSS-Regelblöcke (Selektor + Deklarationen) aus dem
 * Inline-<style>-Bereich, die "user-select" enthalten. Bewusst einfaches
 * Regex-Parsing (kein echter CSS-Parser im Projekt vorhanden, siehe
 * bestehende Static-Tests) – reicht aus, um Selektor-Text neben der
 * Deklaration zu sehen. */
function findeUserSelectRegelBloecke(quelltext) {
  const regelRegex = /([^{}]+)\{([^{}]*)\}/g;
  const treffer = [];
  let match;
  while ((match = regelRegex.exec(quelltext)) !== null) {
    const [, selektor, deklarationen] = match;
    if (/user-select\s*:\s*none/i.test(deklarationen)) {
      treffer.push({ selektor: selektor.trim(), deklarationen: deklarationen.trim() });
    }
  }
  return treffer;
}

describe('Szenario: CSS-Absicherung gegen Textmarkierung existiert überhaupt (AK1, Implementierungsoption 2 – CSS-Teil)', () => {
  test('Gegeben heute (real geprüft) enthält public/spiel.html keine einzige user-select-Regel, wenn der komplette Quelltext nach "user-select:none" durchsucht wird, dann existiert mindestens eine solche Regel', () => {
    const hatUserSelectNone = /user-select\s*:\s*none/i.test(spielHtmlInhalt);
    expect(hatUserSelectNone).toBe(true);
  });
});

describe('Szenario: Die CSS-Absicherung deckt den gesamten Spielbrett-Bereich ab, nicht nur die einzelne Karte (Pre-Mortem-Risiko 1: "Fix muss gesamten Spielbrett-Bereich abdecken, nicht nur die einzelne Karte")', () => {
  test('Gegeben die Meldung nennt ausdrücklich Nachbarelemente (Spaltenüberschriften, Kürzel, Gate-Anzeigen, andere Karten) als betroffen, wenn die gefundene(n) user-select:none-Regel(n) auf ihren Selektor-Umfang geprüft werden, dann deckt mindestens eine Regel entweder den Spielbrett-Container (.brett, der als Vorfahre auf alle Nachbarelemente vererbt) ab ODER die Selektoren decken gemeinsam .spalte-titel, .spalte-tor UND .karte-chip explizit ab (nicht nur .karte-chip allein)', () => {
    const treffer = findeUserSelectRegelBloecke(spielHtmlInhalt);
    const alleSelektoren = treffer.map((t) => t.selektor).join(' , ');

    const decktBrettAlsVorfahreAb = /(^|[\s,])\.brett([\s{.:,]|$)/.test(alleSelektoren)
      || /(^|[\s,])#brett([\s{.:,]|$)/.test(alleSelektoren)
      || /(^|[\s,])\.runde-panel([\s{.:,]|$)/.test(alleSelektoren);

    const deckenAlleNachbarnEinzelnAb = /\.spalte-titel/.test(alleSelektoren)
      && /\.spalte-tor/.test(alleSelektoren)
      && /\.karte-chip/.test(alleSelektoren);

    expect(treffer.length).toBeGreaterThan(0);
    expect(decktBrettAlsVorfahreAb || deckenAlleNachbarnEinzelnAb).toBe(true);
  });
});

describe('Szenario: Der Zieh-Handler unterbindet die Standard-Textauswahl zusätzlich aktiv (AK1, Pre-Mortem-Risiko 2: "CSS allein reicht erfahrungsgemäß in manchen Browsern nicht zuverlässig")', () => {
  test('Gegeben `chip.addEventListener(\'pointerdown\', ...)` ist heute (real geprüft) der Auslöser für einen Zieh-Versuch und ruft dort weder preventDefault() noch getSelection() noch eine style.userSelect-Zuweisung auf, wenn der Quelltext im unmittelbaren Umfeld der pointerdown-/pointermove-Registrierung durchsucht wird, dann unterbindet er die Standardauswahl aktiv (preventDefault() ODER window.getSelection()-Aufruf mit removeAllRanges()/empty() ODER eine explizite style.userSelect-Zuweisung)', () => {
    const pointerDownIndex = spielHtmlInhalt.indexOf("chip.addEventListener('pointerdown'");
    expect(pointerDownIndex).toBeGreaterThan(-1);

    // Umfeld bewusst großzügig gewählt (pointerdown bis kurz nach pointermove/
    // pointerup-Registrierung derselben Karte), damit sowohl eine Lösung im
    // pointerdown- als auch im pointermove-Handler erkannt wird (3b: Muster
    // allgemein halten, keine Implementierungsdetails vorschreiben).
    const umfeld = spielHtmlInhalt.slice(pointerDownIndex, pointerDownIndex + 2500);

    const hatPreventDefault = /\.preventDefault\(\s*\)/.test(umfeld);
    const hatGetSelectionUnterbindung = /getSelection\(\s*\)\s*\.\s*(removeAllRanges|empty)\(/.test(umfeld);
    const hatStyleUserSelectZuweisung = /\.style\.(userSelect|webkitUserSelect)\s*=/.test(umfeld);

    expect(hatPreventDefault || hatGetSelectionUnterbindung || hatStyleUserSelectZuweisung).toBe(true);
  });
});

describe('Szenario: Die neue Absicherung bleibt auf den Spielbrett-Bereich beschränkt – Text außerhalb (z. B. Beitritts-Code) bleibt normal markierbar (AK5, ausdrücklich im Scope ausgeschlossen laut Ticket)', () => {
  test('Gegeben `#beitritt-code` liegt heute (real geprüft) außerhalb von `.brett`, im Formular `#form-beitreten` der Startseite, wenn die gefundene(n) user-select:none-Regel(n) auf globale bzw. zu weit gefasste Selektoren geprüft werden, dann gibt es KEINE Regel, deren Selektor global (`html`, `body`, `*`) oder explizit auf `#beitritt-code`, `#form-beitreten` bzw. `#lobby-panel` zielt', () => {
    const beitrittCodeIndex = spielHtmlInhalt.indexOf('id="beitritt-code"');
    const brettIndex = spielHtmlInhalt.indexOf('id="brett"');
    // Struktureller Beleg, dass die beiden Bereiche im Dokument tatsächlich
    // getrennt sind (Beitritts-Formular kommt vor dem Spielbrett-Container) -
    // stützt die Testannahme, ist aber selbst kein RED/GREEN-Kriterium.
    expect(beitrittCodeIndex).toBeGreaterThan(-1);
    expect(brettIndex).toBeGreaterThan(-1);
    expect(beitrittCodeIndex).toBeLessThan(brettIndex);

    const treffer = findeUserSelectRegelBloecke(spielHtmlInhalt);
    const gibtEsZuWeitGefassteRegel = treffer.some((t) => {
      const selektor = t.selektor;
      const istGlobalerSelektor = /(^|[\s,])(html|body|\*)([\s,.:{]|$)/.test(selektor);
      const zieltAufBeitrittsBereich = /#beitritt-code|#form-beitreten|#lobby-panel/.test(selektor);
      return istGlobalerSelektor || zieltAufBeitrittsBereich;
    });

    // RED-Bedingung heute: treffer.length ist 0 (siehe erstes Szenario dieser
    // Datei), also ist auch "keine zu weit gefasste Regel" trivial erfüllt -
    // dieser Test allein wäre deshalb schon jetzt grün. Deshalb zusätzlich
    // fordern, dass überhaupt mindestens eine (korrekt eng gefasste) Regel
    // existiert - sonst würde dieses Szenario den fehlenden Fix nicht
    // erkennen.
    expect(treffer.length).toBeGreaterThan(0);
    expect(gibtEsZuWeitGefassteRegel).toBe(false);
  });
});
