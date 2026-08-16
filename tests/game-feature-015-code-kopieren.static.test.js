/**
 * FEATURE-015 – Kopier-Knopf für den Beitritts-Code in der Warteansicht.
 * BDD-Tests (flow-game-bdd) für die von Stephan am 2026-08-14 freigegebene
 * Spec in Backlog.md ("### FEATURE-015"), Umfang: **nur** der Kopier-Knopf
 * (Option A). Ein fertiger Beitritts-Link ist ausdrücklich NICHT Teil dieses
 * Tickets und wird hier deshalb bewusst weder geprüft noch vorbereitet.
 *
 * Framework: Jest + Node "fs", reine Quelltext-/Textmuster-Prüfung gegen die
 * echte, ausgelieferte Browser-Fassung (public/**), analog zu
 * tests/game-feature-011-host-zurueckerlangen.static.test.js. Es gibt in
 * diesem Projekt KEIN DOM/jsdom (siehe package.json) – was sich deshalb nur
 * im echten Browser zeigen kann, steht als dokumentierter, bewusst nicht
 * automatisierter Testfall in
 * tests/game-feature-015-manual-checks.test.js.
 *
 * NAMENSGEBUNG (eigene, begründete BDD-Festlegung, KEINE Entscheidung
 * Stephans – analog zum Vorgehen bei FEATURE-011/FEATURE-014; Ticket und Spec
 * legen das Verhalten fest, nicht die Element-IDs/Schlüsselnamen):
 *   - Kopier-Knopf beim Beitritts-Code: id="knopf-lobby-code-kopieren"
 *   - Bestätigung nach dem Kopieren:    id="lobby-code-kopiert-hinweis"
 *   - Neue i18n-Schlüssel: 'lobby.codeKopierenKnopf', 'lobby.codeKopiertHinweis'
 *     (eigene Schlüssel statt Mitbenutzung der Host-Kennzeichen-Schlüssel –
 *     Empfehlung aus Schritt 5a der Spec).
 * Bei der Implementierung darf anders benannt werden; die Prüfungen unten sind
 * nach Regel 3b des flow-game-bdd-Skills bewusst auf allgemeine Marken
 * (Kopier-Bezug, Bezug zur Code-Anzeige, Übersetzungsschlüssel) formuliert
 * statt auf eine starre Element-Struktur, damit sowohl Inline-Code als auch
 * eine extrahierte Hilfsfunktion sie erfüllen können.
 *
 * WICHTIG – bewusst RED beim ersten Lauf: Am echten Repo-Stand verifiziert
 * (nicht behauptet): der einzige Kopier-Pfad im gesamten Projekt gehört heute
 * dem Host-Kennzeichen (FEATURE-011); #lobby-code hat weder einen Knopf noch
 * eine Bestätigung noch user-select. Alle NEU-Szenarien unten müssen deshalb
 * jetzt fehlschlagen; die REGRESSION-Szenarien müssen bereits jetzt grün sein.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');

const spielHtml = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const NEUE_I18N_SCHLUESSEL = ['lobby.codeKopierenKnopf', 'lobby.codeKopiertHinweis'];

// --- Hilfsfunktionen (bewusst tolerant gegenüber Umbenennungen) ------------

/** Markup-Fenster rund um die Anzeige des Beitritts-Codes (#lobby-code). */
function fensterUmCodeAnzeige(vorher = 900, nachher = 900) {
  const i = spielHtml.indexOf('id="lobby-code"');
  if (i < 0) return '';
  return spielHtml.slice(Math.max(0, i - vorher), i + nachher);
}

/** Markup des gesamten Wartebereichs (#lobby-panel bis zum nächsten Panel). */
function lobbyPanelMarkup() {
  const start = spielHtml.indexOf('id="lobby-panel"');
  const ende = spielHtml.indexOf('id="runde-panel"');
  if (start < 0 || ende < 0) return '';
  return spielHtml.slice(start, ende);
}

/** Alle Klick-Handler-Blöcke, die die Zwischenablage benutzen. */
function kopierHandlerBloecke() {
  const treffer = [];
  const re = /addEventListener\(\s*'click'/g;
  let m;
  while ((m = re.exec(spielHtml)) !== null) {
    const block = spielHtml.slice(m.index, m.index + 1600);
    if (/navigator\.clipboard/.test(block)) treffer.push({ index: m.index, block });
  }
  return treffer;
}

/** Der Klick-Handler, der zum Beitritts-Code gehört (nicht der des
 *  Host-Kennzeichens) – erkannt am Bezug zur Code-Anzeige. */
function codeKopierHandler() {
  return kopierHandlerBloecke().find((h) => /lobbyCode|lobby-code/i.test(h.block)) || null;
}

/** Funktionskörper zwischen zwei bekannten Ankern. */
function koerperZwischen(startAnker, endAnker) {
  const a = spielHtml.indexOf(startAnker);
  const b = spielHtml.indexOf(endAnker);
  if (a < 0 || b < 0 || b <= a) return '';
  return spielHtml.slice(a, b);
}

// --- AK1: Knopf vorhanden --------------------------------------------------

describe('AK1 – Knopf vorhanden: unmittelbar bei der Anzeige des Beitritts-Codes gibt es einen Knopf zum Kopieren', () => {
  test('Szenario "Knopf steht beim Code": Gegeben eine Person wartet in der Warteansicht und sieht dort den groß angezeigten Beitritts-Code, wenn das Markup unmittelbar rund um diese Code-Anzeige geprüft wird, dann findet sich dort ein Knopf mit erkennbarem Kopier-Bezug', () => {
    const fenster = fensterUmCodeAnzeige();
    expect(fenster.length).toBeGreaterThan(0); // #lobby-code existiert überhaupt
    const knoepfe = fenster.match(/<button[\s\S]{0,300}?<\/button>/gi) || [];
    const kopierKnoepfe = knoepfe.filter((k) => /kopier|copy/i.test(k));
    expect(kopierKnoepfe.length).toBeGreaterThanOrEqual(1);
  });

  test('Szenario (Polarität zu AK1) "Kein Doppelgriff auf den fremden Knopf": Gegeben es gibt bereits einen Kopier-Knopf für das Host-Kennzeichen, wenn alle Kopier-Knöpfe im Markup gezählt werden, dann existieren mindestens zwei eigenständige Kopier-Knöpfe – der neue Knopf ersetzt oder verschiebt den bestehenden also nicht', () => {
    const knoepfe = spielHtml.match(/<button[\s\S]{0,300}?<\/button>/gi) || [];
    const kopierKnoepfe = knoepfe.filter((k) => /kopier|copy/i.test(k));
    expect(kopierKnoepfe.length).toBeGreaterThanOrEqual(2);
  });
});

// --- AK2: Was in der Zwischenablage landet ---------------------------------

describe('AK2 – Was in der Zwischenablage landet: genau der angezeigte Code, ohne Begleittext und ohne Zusatzzeichen', () => {
  test('Szenario "Nur der reine Code": Gegeben der Beitritts-Code steht in der Warteansicht, wenn der zugehörige Klick-Handler geprüft wird, dann übergibt er der Zwischenablage einen Wert, der aus der Code-Anzeige selbst stammt (kein erneutes Holen vom Server, keine eigene Zeichenkette)', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    expect(handler.block).toMatch(/(lobbyCode|getElementById\(\s*'lobby-code'\s*\))[\s\S]{0,80}\.textContent/);
    expect(handler.block).toMatch(/navigator\.clipboard\.writeText\s*\(/);
  });

  test('Szenario (Polarität zu AK2) "Kein Begleitsatz, keine Verkettung": Gegeben eine Person fügt den kopierten Wert in das Beitritts-Feld ein, das genau acht Zeichen annimmt, wenn der an die Zwischenablage übergebene Ausdruck geprüft wird, dann ist er ein einzelner, unveränderter Wert – ohne Zeichenketten-Literal, ohne Vorlagen-Zeichenkette und ohne Verkettung mit weiterem Text', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    const m = handler.block.match(/writeText\s*\(([^)]*)\)/);
    expect(m).not.toBeNull();
    const argument = m[1].trim();
    // Ein schlichter Bezeichner (ggf. mit Punktzugriff) – nichts anderes.
    expect(argument).toMatch(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/);
    expect(argument).not.toMatch(/['"`+]/);
  });
});

// --- AK3 / AK4: Bestätigung nur im Erfolgsfall -----------------------------

describe('AK3 – Rückmeldung im Erfolgsfall: nach erfolgreichem Kopieren erscheint eine sichtbare Bestätigung', () => {
  test('Szenario "Kopiert!": Gegeben eine Person klickt den Knopf und das Kopieren gelingt, wenn der Klick-Handler geprüft wird, dann blendet er eine eigene Bestätigung ein, deren Text über einen echten Übersetzungsschlüssel kommt (nicht fest einprogrammiert)', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    expect(handler.block).toMatch(/t\(\s*'lobby\.codeKopiertHinweis'\s*\)/);
    expect(handler.block).toMatch(/hidden\s*=\s*false/);
  });

  test('Szenario "Eigene Bestätigung, nicht die des Host-Kennzeichens": Gegeben es existiert bereits eine Bestätigung für das Host-Kennzeichen, wenn das Markup des Wartebereichs geprüft wird, dann gibt es eine zusätzliche, eigene Bestätigungs-Stelle für das Kopieren des Beitritts-Codes', () => {
    const markup = lobbyPanelMarkup();
    expect(markup.length).toBeGreaterThan(0);
    expect(markup).toMatch(/id="lobby-code-kopiert-hinweis"/);
    expect(markup).toMatch(/id="host-kennzeichen-kopiert-hinweis"/);
  });
});

describe('AK4 – Keine falsche Erfolgsmeldung (Polarität zu AK3)', () => {
  test('Szenario "Kopieren scheitert": Gegeben der Browser lässt das Kopieren nicht zu, wenn der Klick-Handler geprüft wird, dann steht das Einblenden der Bestätigung ausschließlich in einem Erfolgs-Zweig – im Fehler-Abfangblock selbst wird keine Bestätigung eingeblendet', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    // Erfolgs-Zweig existiert (Verfügbarkeitsprüfung + try/catch wie beim
    // bestehenden Muster) und die Bestätigung hängt daran.
    expect(handler.block).toMatch(/navigator\.clipboard\s*&&/);
    expect(handler.block).toMatch(/catch\s*\(/);
    const catchBlock = handler.block.slice(handler.block.indexOf('catch ('));
    const catchKoerper = catchBlock.slice(0, catchBlock.indexOf('}') + 1);
    expect(catchKoerper).not.toMatch(/codeKopiertHinweis/);
    expect(catchKoerper).not.toMatch(/hidden\s*=\s*false/);
  });

  test('Szenario "Fehlschlag ist überhaupt nachvollziehbar" (Pre-Mortem-Punkt 9, Beobachtbarkeit): Gegeben das Kopieren schlägt bei einer gastgebenden Person im echten Workshop fehl, wenn der Fehler-Abfangblock geprüft wird, dann hinterlässt er wenigstens einen Eintrag in der Browser-Konsole statt den Fehler ersatzlos zu verschlucken', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    const catchBlock = handler.block.slice(handler.block.indexOf('catch ('));
    const catchKoerper = catchBlock.slice(0, catchBlock.indexOf('}') + 1);
    expect(catchKoerper).toMatch(/console\.(warn|error|log)\s*\(/);
  });
});

// --- AK5: Rückfallweg ------------------------------------------------------

describe('AK5 – Rückfallweg im Fehlerfall: der Code bleibt sichtbar und mit einem Doppelklick als Ganzes markierbar', () => {
  test('Szenario "Von Hand kopieren": Gegeben das Kopieren über den Knopf ist nicht möglich, wenn die Anzeige des Beitritts-Codes geprüft wird, dann trägt sie – anders als heute – die Eigenschaft, mit einem einzigen Doppelklick vollständig markiert zu werden', () => {
    const i = spielHtml.indexOf('id="lobby-code"');
    expect(i).toBeGreaterThan(-1);
    // Entweder direkt am Element (style/Attribut) oder über eine CSS-Regel,
    // die #lobby-code adressiert – beides zulässig.
    const elementZeile = spielHtml.slice(spielHtml.lastIndexOf('<', i), spielHtml.indexOf('>', i) + 1);
    const amElement = /user-select\s*:\s*all/i.test(elementZeile);
    const perCssRegel = /#lobby-code[^{}]*\{[^{}]*user-select\s*:\s*all/i.test(spielHtml);
    expect(amElement || perCssRegel).toBe(true);
  });

  test('Szenario (Polarität zu AK5) "Markierbarkeit wird nicht anderswo wieder abgeschaltet": Gegeben BUGFIX-013 hat für das Spielbrett bewusst eine Markierungssperre eingeführt, wenn alle Sperr-Regeln geprüft werden, dann zielt keine davon auf den Wartebereich, die Code-Anzeige oder global auf die ganze Seite', () => {
    const regeln = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(spielHtml)) !== null) {
      if (/user-select\s*:\s*none/i.test(m[2])) regeln.push(m[1].trim());
    }
    regeln.forEach((selektor) => {
      expect(selektor).not.toMatch(/(^|[\s,>])(\*|html|body)([\s,>{]|$)/i);
      expect(selektor).not.toMatch(/#lobby-code|#lobby-panel|\.code-display/i);
    });
  });
});

// --- AK6: Sprache ----------------------------------------------------------

describe('AK6 – Sprache: Knopfbeschriftung und Bestätigung folgen dem bestehenden Sprachwechsel, auch wenn die Bestätigung bereits sichtbar ist', () => {
  test('Szenario "Beschriftung in der Oberflächensprache": Gegeben die Oberfläche steht auf Englisch, wenn die Stelle geprüft wird, an der die statischen Beschriftungen gesetzt werden, dann wird auch die Beschriftung des neuen Kopier-Knopfes dort über einen echten Übersetzungsschlüssel gesetzt', () => {
    const koerper = koerperZwischen('function wendeSpracheAufStatischeTexteAn()', 'function setText(');
    expect(koerper.length).toBeGreaterThan(0);
    expect(koerper).toMatch(/knopf-lobby-code-kopieren[\s\S]{0,120}t\(\s*'lobby\.codeKopierenKnopf'\s*\)/);
  });

  test('Szenario "Sichtbare Bestätigung wechselt mit" (schließt die im Bestand nachgewiesene Lücke): Gegeben die Bestätigung "Kopiert!" ist gerade sichtbar, wenn während des Wartens die Sprache umgestellt wird, dann wird ihr Text in der Sprachwechsel-Funktion für sichtbare Ansichten erneut berechnet statt in der alten Sprache stehen zu bleiben – ohne die Seite neu zu laden', () => {
    const koerper = koerperZwischen('function wendeSpracheAufSichtbareAnsichtenAn()', 'function zeigeFehler(');
    expect(koerper.length).toBeGreaterThan(0);
    expect(koerper).toMatch(/t\(\s*'lobby\.codeKopiertHinweis'\s*\)/);
  });

  test('Szenario (Polarität zu AK6) "Der Sprachwechsel blendet die Bestätigung nicht ungefragt ein": Gegeben niemand hat den Kopier-Knopf gedrückt, wenn die Sprache umgestellt wird, dann wird die Bestätigung durch den Sprachwechsel nicht sichtbar gemacht (kein hidden = false in der Sprachwechsel-Funktion)', () => {
    const koerper = koerperZwischen('function wendeSpracheAufSichtbareAnsichtenAn()', 'function zeigeFehler(');
    expect(koerper.length).toBeGreaterThan(0);
    const zeilenMitBestaetigung = koerper
      .split('\n')
      .filter((z) => /codeKopiertHinweis|lobby-code-kopiert-hinweis/i.test(z));
    expect(zeilenMitBestaetigung.length).toBeGreaterThan(0);
    zeilenMitBestaetigung.forEach((z) => expect(z).not.toMatch(/hidden\s*=\s*false/));
  });

  NEUE_I18N_SCHLUESSEL.forEach((schluessel) => {
    test(`Szenario "Schlüssel ${schluessel} in der Node-Referenz": Gegeben die Übersetzungstabelle wird doppelt gepflegt, wenn der Schlüssel in src/i18n/uebersetzungen.js nachgeschlagen wird, dann existiert er mit nicht-leerem deutschem UND englischem Text`, () => {
      const eintrag = UEBERSETZUNGEN_NODE[schluessel];
      expect(eintrag).toBeDefined();
      expect(typeof eintrag.de).toBe('string');
      expect(eintrag.de.trim().length).toBeGreaterThan(0);
      expect(typeof eintrag.en).toBe('string');
      expect(eintrag.en.trim().length).toBeGreaterThan(0);
    });

    test(`Szenario "Schlüssel ${schluessel} auch in der ausgelieferten Browser-Fassung" (Pre-Mortem-Punkt 10): Gegeben nur die Browser-Fassung wird tatsächlich an die Spielenden ausgeliefert, wenn public/js/i18n/uebersetzungen.js geprüft wird, dann steht derselbe Schlüssel auch dort – mit deutschem und englischem Text`, () => {
      const inhalt = fs.readFileSync(BROWSER_UEBERSETZUNGEN_PFAD, 'utf8');
      expect(inhalt).toContain(`'${schluessel}'`);
      const i = inhalt.indexOf(`'${schluessel}'`);
      const eintrag = inhalt.slice(i, i + 400);
      expect(eintrag).toMatch(/de\s*:\s*['"][^'"]+['"]/);
      expect(eintrag).toMatch(/en\s*:\s*['"][^'"]+['"]/);
    });
  });
});

// --- AK7: Wiederholbarkeit -------------------------------------------------

describe('AK7 – Wiederholbarkeit: mehrfaches Klicken liefert jedes Mal dasselbe Ergebnis', () => {
  test('Szenario "Zweimal klicken": Gegeben eine Person hat den Knopf bereits einmal gedrückt, wenn sie ihn erneut drückt, dann gibt es im Quelltext keine Sperre, die das zweite Klicken verhindert (kein Deaktivieren des Knopfes, kein einmaliges Abhören, kein Abmelden des Handlers)', () => {
    const handler = codeKopierHandler();
    expect(handler).not.toBeNull();
    expect(handler.block).not.toMatch(/\.disabled\s*=\s*true/);
    expect(handler.block).not.toMatch(/once\s*:\s*true/);
    expect(handler.block).not.toMatch(/removeEventListener/);
  });
});

// --- AK8: Regression FEATURE-011 ------------------------------------------

describe('AK8 (REGRESSION) – der bestehende Kopier-Knopf für das Host-Kennzeichen bleibt unverändert vorhanden und funktionsfähig', () => {
  test('Szenario "Host-Kennzeichen weiterhin kopierbar": Gegeben eine gastgebende Person öffnet ihren Host-Kennzeichen-Bereich, wenn Markup und Klick-Handler geprüft werden, dann existieren beide unverändert – Knopf, Bestätigung und beide zugehörigen Übersetzungsschlüssel', () => {
    expect(spielHtml).toMatch(/id="knopf-host-kennzeichen-kopieren"/);
    expect(spielHtml).toMatch(/id="host-kennzeichen-kopiert-hinweis"/);
    expect(spielHtml).toMatch(/t\(\s*'lobby\.hostKennzeichenKopiertHinweis'\s*\)/);
    expect(UEBERSETZUNGEN_NODE['lobby.hostKennzeichenKopierenKnopf']).toBeDefined();
    expect(UEBERSETZUNGEN_NODE['lobby.hostKennzeichenKopiertHinweis']).toBeDefined();
    const hostHandler = kopierHandlerBloecke().find((h) => /anzeigeHostKennzeichen/.test(h.block));
    expect(hostHandler).toBeDefined();
    expect(hostHandler.block).toMatch(/navigator\.clipboard\.writeText\s*\(/);
  });

  test('Szenario "Reihenfolge im Wartebereich bleibt": Gegeben die Platzierung der Wartebereich-Elemente wurde bereits durch FEATURE-011/FEATURE-014 festgelegt, wenn das Markup des Wartebereichs geprüft wird, dann steht der neue Kopier-Knopf für den Beitritts-Code oberhalb des Host-Kennzeichen-Bereichs und nicht zwischen dessen Anzeige und dessen Knopf', () => {
    const markup = lobbyPanelMarkup();
    expect(markup.length).toBeGreaterThan(0);
    const neuerKnopf = markup.indexOf('knopf-lobby-code-kopieren');
    const hostBereich = markup.indexOf('id="host-kennzeichen-bereich"');
    expect(neuerKnopf).toBeGreaterThan(-1);
    expect(hostBereich).toBeGreaterThan(-1);
    expect(neuerKnopf).toBeLessThan(hostBereich);
  });
});

// --- AK9: Sichtbarkeitsgrenze ---------------------------------------------

describe('AK9 – Sichtbarkeitsgrenze: der Knopf ist genau dort und nur dort, wo auch der Code steht', () => {
  test('Szenario "Nach Rundenstart weg": Gegeben die erste Runde ist gestartet und die Warteansicht ist ausgeblendet, wenn geprüft wird, wo Knopf und Bestätigung im Markup liegen, dann liegen beide innerhalb des Warteansicht-Bereichs – sie verschwinden dadurch zusammen mit ihm', () => {
    const markup = lobbyPanelMarkup();
    expect(markup.length).toBeGreaterThan(0);
    expect(markup).toMatch(/knopf-lobby-code-kopieren/);
    expect(markup).toMatch(/lobby-code-kopiert-hinweis/);
  });

  test('Szenario (Polarität zu AK9) "Kein Knopf ohne Code": Gegeben der Knopf soll nirgends sonst auftauchen, wenn die übrigen Ansichten geprüft werden, dann kommen Knopf und Bestätigung außerhalb des Warteansicht-Bereichs im Markup nicht noch einmal vor', () => {
    const markup = lobbyPanelMarkup();
    const ausserhalb = spielHtml.split(markup).join('');
    const markupTreffer = (ausserhalb.match(/<[^>]*knopf-lobby-code-kopieren[^>]*>/g) || []).length;
    expect(markupTreffer).toBe(0);
  });

  test('Szenario "Beitritt einer weiteren Person wischt die Bestätigung nicht weg" (Pre-Mortem-Punkt 4): Gegeben im Moment des Kopierens tritt eine weitere Person bei und die Teilnehmendenliste wird neu gezeichnet, wenn der Neuzeichnungs-Vorgang geprüft wird, dann fasst er Knopf und Bestätigung nicht an – beide liegen außerhalb des neu gezeichneten Listenbereichs', () => {
    const koerper = koerperZwischen('function renderTeilnehmerListe()', 'renderTeilnehmerListeAktuell = renderTeilnehmerListe;');
    expect(koerper.length).toBeGreaterThan(0);
    expect(koerper).not.toMatch(/knopf-lobby-code-kopieren|lobby-code-kopiert-hinweis|codeKopiertHinweis/);
    // Und im Markup: der Knopf steht nicht innerhalb der Teilnehmendenliste.
    const markup = lobbyPanelMarkup();
    const listeStart = markup.indexOf('id="teilnehmer-liste"');
    const listeEnde = markup.indexOf('</ul>', listeStart);
    const knopf = markup.indexOf('knopf-lobby-code-kopieren');
    expect(knopf).toBeGreaterThan(-1);
    expect(knopf > listeStart && knopf < listeEnde).toBe(false);
  });
});

// --- Regression Gesamtbestand ---------------------------------------------

describe('REGRESSION (Spec, Regressionsrisiko Schritt 6) – die eng vermessenen Bestandsprüfungen des Wartebereichs bleiben gültig', () => {
  test('Szenario "Kein neuer Einstiegsaufruf": Gegeben eine bestehende Prüfung erwartet exakt fünf Fundstellen von zeigeLobby( db (vier Einstiegspfade plus die Funktionsdefinition), wenn der Quelltext erneut gezählt wird, dann sind es weiterhin genau fünf – der neue Knopf bringt keinen zusätzlichen Einstieg in die Warteansicht mit', () => {
    const aufrufstellen = spielHtml.match(/(?<!function )\bzeigeLobby\(\s*(?:\n\s*)?db\b/g) || [];
    expect(aufrufstellen.length).toBe(5);
  });

  test('Szenario "Beitritts-Link bleibt außen vor" (Stephans Scope-Entscheidung, Option A): Gegeben der fertige Beitritts-Link ist ausdrücklich NICHT Teil dieses Tickets, wenn der ausgelieferte Quelltext geprüft wird, dann wird weiterhin kein Code aus der Adresszeile ausgewertet und es wird keine vollständige Beitritts-Adresse in die Zwischenablage gelegt', () => {
    expect(spielHtml).not.toMatch(/URLSearchParams|location\.search|searchParams/);
    const handler = codeKopierHandler();
    if (handler) {
      expect(handler.block).not.toMatch(/location\.(origin|href)|https?:\/\//);
    }
  });
});
