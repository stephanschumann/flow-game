/**
 * FEATURE-016 – Name und Rolle der eigenen Person durchgängig auf jeder
 * Spielseite sichtbar.
 * BDD-Tests (flow-game-bdd, 2026-08-09) für die freigegebene Analyse-Spec in
 * Backlog.md ("### FEATURE-016", Ampel 🟢 Grün, Option A – neues Text-Element
 * in der bestehenden, sitzenden `.hud`/`.hud-in`-Leiste), Akzeptanzkriterien
 * 1–7.
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-007/FEATURE-011/FEATURE-018 – Ticket/Spec legen den
 * Wortlaut/die Akzeptanzkriterien fest, nicht die konkreten Element-IDs/
 * Funktions-/Schlüsselnamen):
 *   - Neues, permanent in der HUD-Leiste liegendes Anzeige-Element:
 *     id="hud-eigene-identitaet", platziert INNERHALB von .hud-in, ZWISCHEN
 *     dem Marken-Logo (.brand) und dem Sprachumschalter (.sprach-umschalter)
 *     – exakt wie in der Analyse-Spec, Annahme 1, beschrieben. Trägt
 *     standardmäßig das native `hidden`-Attribut (AK4: kein Platzhaltertext
 *     vor dem Beitritt/vor dem ersten Snapshot).
 *   - Neue, kleine Render-Funktion, die aus
 *     teilnehmendeCache[eigeneUid].anzeigename + rollenLabel(eigeneRolle)
 *     den Anzeigetext baut und das Element ein-/ausblendet:
 *     aktualisiereEigeneIdentitaetAnzeige().
 *   - Neuer i18n-Schlüssel für das Anzeigeformat (Annahme 1: kompaktes
 *     Badge-Format "{name} · {rolle}"): 'hud.eigeneIdentitaet', Platzhalter
 *     {name} und {rolle}, in beiden Sprachen (Node- UND Browser-Kopie).
 *   - Neue CSS-Klasse für die Grenzwert-Absicherung aus AK6 (langer Name):
 *     .hud-eigene-identitaet, mit einer Breitenbegrenzung UND
 *     text-overflow:ellipsis (analog zum bestehenden Muster für
 *     .spalte-person, CSS-Zeile ~93).
 * OFFENER PUNKT FÜR STEPHAN: diese Namensgebung ist eine BDD-Annahme, KEINE
 * von Stephan getroffene Entscheidung. Bei der Implementierung bitte
 * bestätigen oder anders benennen (Tests müssten dann entsprechend angepasst
 * werden) – Regel 3b des flow-game-bdd-Skills wurde dabei bereits beachtet:
 * die Textmuster-Prüfungen unten suchen möglichst nach dem NACHWEISBAREN
 * VERHALTEN (liest teilnehmendeCache[eigeneUid]/rollenLabel(), wird aus
 * wendeSpracheAufSichtbareAnsichtenAn() heraus aufgerufen, wird vom
 * eigeneUid-onSnapshot-Handler aktualisiert), nicht nach starrer, exakter
 * Code-Struktur, damit sowohl Inline-Code als auch eine extrahierte
 * Hilfsfunktion sie erfüllen können.
 *
 * WICHTIG – bewusst RED beim ersten Lauf: Keiner der unten geprüften
 * Bausteine (neues HUD-Element, neue Render-Funktion, neuer i18n-Schlüssel,
 * neue CSS-Regel) existiert heute im Code (siehe Analyse-Spec,
 * Fundstellen-Sweep: "eigeneRolle hat 15 Fundstellen, ausnahmslos in
 * public/spiel.html … Keine weiteren Fundstellen einer Identitäts-Anzeige im
 * Projekt" – die einzige bestehende Anzeige ist #lobby-rolle-hinweis,
 * ausschließlich innerhalb von #lobby-panel, siehe Ausgangslage). Die
 * Regressions-/Negativ-Tests (AK3, AK4-Abgrenzung, AK6) prüfen zusätzlich
 * bereits bestehendes Verhalten, das NICHT kaputtgehen darf, sobald die
 * neuen Bausteine ergänzt werden – diese Prüfungen selbst hängen aber am
 * ERSTEN Assert (Existenz des neuen Elements/der neuen Funktion), sind also
 * ebenfalls jetzt rot, nicht vorzeitig grün.
 *
 * Framework: Jest + Node "fs", Textmuster-Prüfung gegen den echten
 * Quelltext (kein DOM/jsdom im Projekt, siehe package.json), analog zu
 * tests/game-feature-011-host-zurueckerlangen.static.test.js und
 * tests/game-feature-018-text-und-zaehler.static.test.js. Die Node-Kopie
 * src/i18n/uebersetzungen.js wird per require() strukturiert geprüft, die
 * Browser-Kopie public/js/i18n/uebersetzungen.js (schließt mit
 * `})(window);`, kein module.exports) nur als Text durchsucht.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const INDEX_HTML_PFAD = path.join(__dirname, '..', 'public', 'index.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');

function lese(p) {
  return fs.readFileSync(p, 'utf8');
}

const spielHtmlInhalt = lese(SPIEL_HTML_PFAD);
const indexHtmlInhalt = lese(INDEX_HTML_PFAD);
const browserUebersetzungenInhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);

const NEUES_ELEMENT_ID = 'hud-eigene-identitaet';
const NEUE_RENDER_FUNKTION = 'aktualisiereEigeneIdentitaetAnzeige';
const NEUER_I18N_SCHLUESSEL = 'hud.eigeneIdentitaet';

/**
 * Extrahiert den Quelltext-Körper einer top-level function-Deklaration in
 * public/spiel.html (2-Leerzeichen-Einrückung, siehe restliche Datei) - von
 * ihrer eigenen Deklaration bis zur NÄCHSTEN top-level function-Deklaration
 * (oder Dateiende). Analog zum Slice-Vorgehen in
 * tests/game-i18n.manual-checks.test.js, aber robust gegen unterschiedlich
 * lange Funktionskörper statt einer festen Zeichenzahl.
 */
function funktionsKoerper(inhalt, name) {
  const startMuster = new RegExp('\\n\\s*(async\\s+)?function\\s+' + name + '\\s*\\(');
  const startMatch = startMuster.exec(inhalt);
  if (!startMatch) return null;
  const koerperStart = startMatch.index + startMatch[0].length;
  const rest = inhalt.slice(koerperStart);
  const naechsteFunktion = /\n\s*(async\s+)?function\s+\w+\s*\(/.exec(rest);
  const koerperEnde = naechsteFunktion ? koerperStart + naechsteFunktion.index : inhalt.length;
  return inhalt.slice(startMatch.index, koerperEnde);
}

const PANEL_WECHSEL_FUNKTIONEN = [
  'zeigeLobby',
  'renderBrett',
  'renderRundeVier',
  'zeigeAuswertung',
  'zeigeKennzahlen',
  'zeigeErgebnisseGesperrt',
];

describe('NEU (AK1/AK2): eigene Identität (Name + Rolle) wird als neues Element in der bestehenden HUD-Leiste angezeigt', () => {
  test('Gegeben die sitzende HUD-Leiste .hud-in, wenn der Quelltext von spiel.html durchsucht wird, dann existiert dort ein neues Element für die eigene Identitäts-Anzeige zwischen dem Marken-Logo und dem Sprachumschalter', () => {
    const hudStart = spielHtmlInhalt.indexOf('<div class="hud">');
    const brandEnde = spielHtmlInhalt.indexOf('</div>', spielHtmlInhalt.indexOf('class="brand"'));
    const sprachUmschalterStart = spielHtmlInhalt.indexOf('class="sprach-umschalter"');
    expect(hudStart).toBeGreaterThan(-1);
    expect(brandEnde).toBeGreaterThan(hudStart);
    expect(sprachUmschalterStart).toBeGreaterThan(brandEnde);

    const zwischenBrandUndSprache = spielHtmlInhalt.slice(brandEnde, sprachUmschalterStart);
    expect(zwischenBrandUndSprache).toMatch(new RegExp('id="' + NEUES_ELEMENT_ID + '"'));
  });

  test('Gegeben die neue Render-Funktion, wenn ihr Quelltext-Körper geprüft wird, dann liest sie sowohl den eigenen Anzeigenamen aus teilnehmendeCache[eigeneUid].anzeigename als auch die eigene Rolle über rollenLabel(eigeneRolle)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_RENDER_FUNKTION);
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/teilnehmendeCache\[\s*eigeneUid\s*\]/);
    expect(koerper).toMatch(/anzeigename/);
    expect(koerper).toMatch(/rollenLabel\(\s*eigeneRolle\s*\)/);
  });
});

describe('NEU (AK3): Anzeige bleibt beim Wechsel zwischen Lobby, jeder Runde und der Auswertung unverändert an derselben Stelle sichtbar', () => {
  test('Gegeben das neue Element, wenn seine Position im Quelltext geprüft wird, dann liegt es strukturell innerhalb von .hud/.hud-in und VOR dem Beginn von .wrap (also außerhalb jedes einzelnen Panels)', () => {
    const elementPosition = spielHtmlInhalt.indexOf('id="' + NEUES_ELEMENT_ID + '"');
    const wrapStart = spielHtmlInhalt.indexOf('<div class="wrap">');
    expect(elementPosition).toBeGreaterThan(-1);
    expect(wrapStart).toBeGreaterThan(-1);
    expect(elementPosition).toBeLessThan(wrapStart);
  });

  test('Gegeben jede der bestehenden Panel-Wechsel-Funktionen (Regressions-/Negativ-Test), wenn ihr jeweiliger Quelltext-Körper durchsucht wird, dann verändert KEINE von ihnen das hidden-Attribut des neuen Elements oder von .hud/.hud-in selbst', () => {
    // Erst muss das Element überhaupt existieren, sonst ist diese
    // Regressionsprüfung nur scheinbar (vakuos) erfüllt.
    expect(spielHtmlInhalt).toMatch(new RegExp('id="' + NEUES_ELEMENT_ID + '"'));

    PANEL_WECHSEL_FUNKTIONEN.forEach((funktionsName) => {
      const koerper = funktionsKoerper(spielHtmlInhalt, funktionsName);
      expect(koerper).not.toBeNull();
      expect(koerper).not.toMatch(new RegExp(NEUES_ELEMENT_ID));
      expect(koerper).not.toMatch(/['"]\.?hud-in['"]/);
      expect(koerper).not.toMatch(/\bhud\.hidden\b/);
    });
  });
});

describe('NEU (AK4): Anzeige bleibt verborgen, bis Name und Rolle tatsächlich vorliegen – kein Platzhaltertext vor dem Beitritt', () => {
  test('Gegeben das statische Markup, wenn das neue Element gesucht wird, dann trägt es von Anfang an das native hidden-Attribut (kein sofort sichtbarer Platzhaltertext)', () => {
    const elementStart = spielHtmlInhalt.indexOf('id="' + NEUES_ELEMENT_ID + '"');
    expect(elementStart).toBeGreaterThan(-1);
    const tagAusschnitt = spielHtmlInhalt.slice(Math.max(0, elementStart - 120), elementStart + 120);
    expect(tagAusschnitt).toMatch(/\bhidden\b/);
  });

  test('Gegeben die neue Render-Funktion, wenn ihr Quelltext-Körper geprüft wird, dann schaltet sie das Element nur dann sichtbar, wenn SOWOHL der Anzeigename ALS AUCH die Rolle tatsächlich vorliegen (kein blindes hidden=false)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_RENDER_FUNKTION);
    expect(koerper).not.toBeNull();
    // Es muss eine erkennbare Wächter-Bedingung geben, die beide Werte prüft,
    // bevor das Element eingeblendet wird - keine starre Syntax vorgegeben,
    // nur der Nachweis, dass beide Bedingungen (Name UND Rolle) vor dem
    // Sichtbar-Schalten tatsächlich geprüft werden (Regel 3b: verhaltens-,
    // nicht struktur-genau).
    expect(koerper).toMatch(/eigeneRolle/);
    expect(koerper).toMatch(/anzeigename/);
    expect(koerper).toMatch(/hidden\s*=/);
  });

  test('Gegeben public/index.html (Startseite VOR jedem Beitritt/Erstellen), wenn der Quelltext durchsucht wird, dann existiert das neue Identitäts-Element dort NICHT (Negativ-/Polaritäts-Test: keine Identität vor dem Beitritt bekannt)', () => {
    expect(indexHtmlInhalt).not.toMatch(new RegExp('id="' + NEUES_ELEMENT_ID + '"'));
  });
});

describe('NEU (AK5): Anzeige nimmt am bestehenden Sprachwechsel-Mechanismus teil (analog FEATURE-006)', () => {
  test('Gegeben wendeSpracheAufSichtbareAnsichtenAn(), wenn ihr Quelltext-Körper geprüft wird, dann ruft sie die neue Render-Funktion für die eigene Identität mit auf', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'wendeSpracheAufSichtbareAnsichtenAn');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(new RegExp(NEUE_RENDER_FUNKTION + '\\s*\\('));
  });

  test('Gegeben der neue i18n-Schlüssel für das Anzeigeformat (Node-Kopie), wenn er nachgeschlagen wird, dann existiert er mit nicht-leerem deutschem UND englischem Text', () => {
    const eintrag = UEBERSETZUNGEN_NODE[NEUER_I18N_SCHLUESSEL];
    expect(eintrag).toBeDefined();
    expect(typeof eintrag.de).toBe('string');
    expect(eintrag.de.trim().length).toBeGreaterThan(0);
    expect(typeof eintrag.en).toBe('string');
    expect(eintrag.en.trim().length).toBeGreaterThan(0);
  });

  test('Gegeben derselbe i18n-Schlüssel (Browser-Kopie public/js/i18n/uebersetzungen.js), wenn der Quelltext danach durchsucht wird, dann taucht derselbe Schlüssel auch dort auf (Doppelpflege-Risiko)', () => {
    expect(browserUebersetzungenInhalt).toMatch(new RegExp("'" + NEUER_I18N_SCHLUESSEL.replace('.', '\\.') + "'"));
  });
});

describe('NEU (AK6): auch ein sehr langer, selbst gewählter Anzeigename (bis 40 Zeichen) bleibt lesbar und bringt das umgebende HUD-Layout nicht durcheinander', () => {
  test('Gegeben die neue CSS-Klasse für das Identitäts-Element, wenn das <style>-Regelwerk durchsucht wird, dann begrenzt sie die Breite UND schneidet überlangen Text sichtbar per text-overflow:ellipsis ab (analog zum bestehenden Muster für .spalte-person)', () => {
    const klassenMuster = /\.hud-eigene-identitaet\s*\{([^}]*)\}/;
    const treffer = klassenMuster.exec(spielHtmlInhalt);
    expect(treffer).not.toBeNull();
    const regelInhalt = treffer[1];
    expect(regelInhalt).toMatch(/max-width\s*:/);
    expect(regelInhalt).toMatch(/text-overflow\s*:\s*ellipsis/);
    expect(regelInhalt).toMatch(/overflow\s*:\s*hidden/);
  });

  test('Gegeben die bestehende .hud-in-Regel (Regressionsschutz), wenn das CSS erneut geprüft wird, dann behält sie weiterhin flex-wrap:wrap (bestehende Abfederung gegen Platzmangel darf durch das neue Element nicht verloren gehen)', () => {
    const hudInMuster = /\.hud-in\s*\{([^}]*)\}/;
    const treffer = hudInMuster.exec(spielHtmlInhalt);
    expect(treffer).not.toBeNull();
    expect(treffer[1]).toMatch(/flex-wrap\s*:\s*wrap/);
  });
});

describe('NEU (AK7): nach einem Reload mitten im Spiel oder nach einer kurzen Verbindungsunterbrechung zeigt die Anzeige unmittelbar wieder Name und Rolle korrekt', () => {
  test('Gegeben den bestehenden onSnapshot-Listener auf teilnehmende/{eigeneUid} (docSnap.exists-Zweig), wenn sein Quelltext-Körper geprüft wird, dann ruft er die neue Render-Funktion mit auf – derselbe Listener, der sowohl beim Neu-Beitritt als auch bei JEDEM Rejoin-Pfad über zeigeLobby() abonniert wird (kein separater, leicht zu vergessender zweiter Einstiegspfad nötig)', () => {
    const listenerStart = spielHtmlInhalt.indexOf("collection('teilnehmende').doc(eigeneUid)");
    expect(listenerStart).toBeGreaterThan(-1);
    const listenerEnde = spielHtmlInhalt.indexOf('zeigeFehler(t(', listenerStart);
    expect(listenerEnde).toBeGreaterThan(listenerStart);
    const listenerKoerper = spielHtmlInhalt.slice(listenerStart, listenerEnde);
    expect(listenerKoerper).toMatch(new RegExp(NEUE_RENDER_FUNKTION + '\\s*\\('));
  });

  test('Gegeben die beiden bestehenden automatischen Rejoin-Codepfade (Host- UND Teilnehmenden-/Beobachtenden-Rejoin), wenn ihr jeweiliger Erfolgs-Zweig geprüft wird, dann rufen BEIDE weiterhin zeigeLobby() auf (Regressionsschutz: kein Rejoin-Pfad darf die Anzeige-Aktualisierung durch einen abweichenden Codepfad umgehen)', () => {
    const hostRejoinStart = spielHtmlInhalt.indexOf('restoreHostSession(');
    const teilnehmerRejoinStart = spielHtmlInhalt.indexOf('restoreTeilnehmerSession(');
    expect(hostRejoinStart).toBeGreaterThan(-1);
    expect(teilnehmerRejoinStart).toBeGreaterThan(hostRejoinStart);

    const hostRejoinAusschnitt = spielHtmlInhalt.slice(hostRejoinStart, teilnehmerRejoinStart);
    expect(hostRejoinAusschnitt).toMatch(/zeigeLobby\(/);

    const teilnehmerRejoinEnde = spielHtmlInhalt.indexOf('auswahlPanel.hidden = false;', teilnehmerRejoinStart);
    expect(teilnehmerRejoinEnde).toBeGreaterThan(teilnehmerRejoinStart);
    const teilnehmerRejoinAusschnitt = spielHtmlInhalt.slice(teilnehmerRejoinStart, teilnehmerRejoinEnde);
    expect(teilnehmerRejoinAusschnitt).toMatch(/zeigeLobby\(/);
  });
});
