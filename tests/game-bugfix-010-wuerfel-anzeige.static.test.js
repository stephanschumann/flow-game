/**
 * BUGFIX-010 – Würfelanzeige in Runde 4: kein echter grafischer Würfel,
 * Ergebnis vor neuem Versuch nicht sichtbar.
 * BDD-Tests (flow-game-bdd, 2026-08-10) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-010"), Akzeptanzkriterien 1–7, plus Stephans
 * Entscheidung vom 2026-08-10 12:26 (Option B – explizite Bestätigung statt
 * fester Haltezeit; Würfel-Augen/Pips statt Zahl-im-Rahmen; Zusatz-Scope
 * Reduced-Motion-Reparatur mit drin; aria-live-Ankündigung AUSDRÜCKLICH
 * NICHT in diesem Scope – dafür werden hier bewusst KEINE Tests
 * geschrieben).
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-016/FEATURE-011/FEATURE-018 – Ticket/Spec legen den
 * Wortlaut/die Akzeptanzkriterien fest, nicht die konkreten Funktions-/
 * Klassen-/Schlüsselnamen):
 *
 *   - Neue Bestätigungs-Render-Funktion `renderRundeVierWuerfelBestaetigung(
 *     db, code, element, wert, btn, anzeige)`: wird nach dem LETZTEN
 *     Animations-Tick aufgerufen, STATT dass der Klick-Handler wie heute
 *     direkt `schliesseRundeVierWurfAb(...)` (die Firestore-Schreibfunktion)
 *     aufruft. Sie hält das gewürfelte Ergebnis (Pips) sichtbar, zeigt bei
 *     einem Ergebnis ≤3 zusätzlich einen Hinweistext
 *     (`rundeVier.wurfNichtAusreichend`) und einen Bestätigungs-Button mit
 *     dem Text `rundeVier.nochmalWuerfeln`; bei einem Ergebnis >3 zeigt sie
 *     stattdessen einen Bestätigungs-Button mit dem Text `rundeVier.weiter`.
 *     ERST der Klick auf diesen Bestätigungs-Button ruft die bestehende,
 *     unveränderte `schliesseRundeVierWurfAb(db, code, element, wert, btn)`
 *     auf (die dann wie heute per `istWurfErfolgreich()` zwischen
 *     `gibElementWeiter()` und `schreibeWuerfelZwischenwurf()`
 *     unterscheidet). Das löst AK3/AK5/AK6 einheitlich für Erfolg UND
 *     Misserfolg, OHNE die bestehende Schreiblogik selbst anzufassen.
 *   - Neue Guard-Variable `wuerfelBestaetigungAusstehend` (analog zu
 *     `wuerfelAnimationLaeuft`): wird beim Eintritt in die
 *     Bestätigungs-Phase (letzter Animations-Tick) auf `true` gesetzt und
 *     erst nach dem Bestätigungs-Klick wieder auf `false`. Das ist die
 *     Umsetzung des in der Analyse-Spec ausdrücklich benannten "zentralen
 *     Umsetzungs-Stolpersteins" (Abschnitt "Zusammenspiel bestehender
 *     Bausteine", Pre-Mortem-Risiko 3): OHNE einen solchen Guard würde ein
 *     durch IRGENDEIN Firestore-Update ausgelöster Re-Render (z. B. durch
 *     den Zug einer anderen Person, nicht nur den eigenen) die gehaltene
 *     Bestätigungs-Ansicht weiterhin vorzeitig überschreiben können, auch
 *     wenn der EIGENE Schreibvorgang selbst erst nach der Bestätigung
 *     ausgelöst wird. `renderRundeVierFokusCard()` prüft diesen Guard direkt
 *     am Anfang und überspringt den Neuaufbau der Karte, solange er aktiv
 *     ist.
 *   - Bestehende CSS-Klasse `.rv-wuerfel-anzeige` bekommt zusätzlich eine
 *     erkennbare Würfel-Rahmen-Optik (Rahmen + quadratisches Format statt
 *     einer freistehenden Ziffer ohne jede Form).
 *   - Neue CSS-Klasse `.rv-wuerfel-auge` für die einzelnen Würfel-Augen
 *     (Pips) - runde Punkte statt einer Ziffer.
 *   - Neue i18n-Schlüssel (Node- UND Browser-Kopie): `rundeVier.weiter`,
 *     `rundeVier.nochmalWuerfeln`, `rundeVier.wurfNichtAusreichend`.
 *   - Reduced-Motion-Reparatur (Zusatz-Scope, Stephans Entscheidung): der
 *     Klick-Handler (bzw. `renderRundeVierFokusCard()`) prüft
 *     `window.matchMedia('(prefers-reduced-motion: reduce)')` und verkürzt/
 *     überspringt bei aktivierter Einstellung die Anzahl der sichtbar
 *     wechselnden Zwischenwerte, bevor trotzdem
 *     `renderRundeVierWuerfelBestaetigung(...)` mit dem Endergebnis
 *     aufgerufen wird - das Ergebnis bleibt also so oder so sichtbar, nur
 *     der Weg dorthin wird verkürzt.
 *
 * OFFENER PUNKT FÜR STEPHAN: diese Namensgebung ist eine BDD-Annahme, KEINE
 * von Stephan getroffene Entscheidung. Bei der Implementierung bitte
 * bestätigen oder anders benennen (Tests müssten dann entsprechend angepasst
 * werden) – Regel 3b des flow-game-bdd-Skills wurde dabei bereits beachtet:
 * die Textmuster-Prüfungen unten suchen möglichst nach dem NACHWEISBAREN
 * VERHALTEN (wird aus dem Klick-Handler heraus statt der direkten
 * Schreibfunktion aufgerufen, prüft den Guard, referenziert die neuen
 * i18n-Schlüssel), nicht nach starrer, exakter Code-Struktur, damit sowohl
 * Inline-Code als auch eine extrahierte Hilfsfunktion sie erfüllen können.
 *
 * WICHTIG – bewusst RED beim ersten Lauf: Keiner der oben benannten neuen
 * Bausteine (Bestätigungs-Funktion, Guard, CSS-Rahmen/-Augen, neue
 * i18n-Schlüssel, Reduced-Motion-Prüfung im Würfel-Klick-Handler) existiert
 * heute im Code (siehe Analyse-Spec, Ausgangslage: die Würfel-Anzeige ist
 * heute eine freistehende Ziffer ohne Rahmen, der letzte Animations-Tick
 * ruft `schliesseRundeVierWurfAb()` DIREKT auf, es gibt keine
 * `prefers-reduced-motion`-Prüfung im Würfel-Klick-Handler). Einige wenige,
 * ausdrücklich als Regressionsschutz gekennzeichnete Tests prüfen dagegen
 * bereits heute bestehendes, unverändert bleibendes Verhalten und sind
 * deshalb jetzt schon GRÜN (analog zu Szenario 5/6 in
 * tests/game-round4-bearbeitungszeit.static.test.js) - das ist einzeln je
 * Test-Kommentar vermerkt.
 *
 * Framework: Jest + Node "fs", Textmuster-Prüfung gegen den echten
 * Quelltext (kein DOM/jsdom im Projekt, siehe package.json), analog zu
 * tests/game-feature-016-eigene-identitaet.static.test.js und
 * tests/game-round4-bearbeitungszeit.static.test.js.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');

function lese(p) {
  return fs.readFileSync(p, 'utf8');
}

const spielHtmlInhalt = lese(SPIEL_HTML_PFAD);
const browserUebersetzungenInhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);

const NEUE_BESTAETIGUNGS_FUNKTION = 'renderRundeVierWuerfelBestaetigung';
const NEUER_GUARD = 'wuerfelBestaetigungAusstehend';
const SCHLUESSEL_WEITER = 'rundeVier.weiter';
const SCHLUESSEL_NOCHMAL_WUERFELN = 'rundeVier.nochmalWuerfeln';
const SCHLUESSEL_NICHT_AUSREICHEND = 'rundeVier.wurfNichtAusreichend';

/**
 * Extrahiert den Quelltext-Körper einer top-level function-Deklaration in
 * public/spiel.html (2-Leerzeichen-Einrückung, siehe restliche Datei) - von
 * ihrer eigenen Deklaration bis zur NÄCHSTEN top-level function-Deklaration
 * (oder Dateiende). Identisches Vorgehen wie in
 * tests/game-feature-016-eigene-identitaet.static.test.js, robust gegen
 * unterschiedlich lange Funktionskörper statt einer festen Zeichenzahl.
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

/**
 * Extrahiert den Würfel-Klick-Handler-Ausschnitt aus renderRundeVierFokusCard()
 * - vom Beginn des addEventListener('click', ...)-Aufrufs bis zur bekannten,
 * unmittelbar danach liegenden Zeile rvFokusCard.appendChild(btn); (Anker
 * bewusst textuell statt über feste Zeilenzahlen, analog zum Vorgehen in
 * tests/game-feature-016-eigene-identitaet.static.test.js, Szenario AK7).
 */
function wuerfelKlickHandlerAusschnitt(inhalt) {
  const start = inhalt.indexOf("btn.addEventListener('click'");
  if (start === -1) return null;
  const ende = inhalt.indexOf('rvFokusCard.appendChild(btn);', start);
  if (ende === -1) return null;
  return inhalt.slice(start, ende);
}

describe('AK1: Der Würfel wird sowohl während des Wurfs als auch danach als optisch erkennbares Würfel-Element dargestellt (Rahmen + Würfel-Augen/Pips, nicht nur eine nackte Ziffer)', () => {
  test('Gegeben die bestehende CSS-Klasse .rv-wuerfel-anzeige, wenn das <style>-Regelwerk durchsucht wird, dann bekommt sie eine erkennbare Würfel-Rahmen-Optik (Rahmen UND ein quadratisches Format), nicht nur Schriftgröße/-farbe wie heute', () => {
    const klassenMuster = /\.rv-wuerfel-anzeige\s*\{([^}]*)\}/;
    const treffer = klassenMuster.exec(spielHtmlInhalt);
    expect(treffer).not.toBeNull();
    const regelInhalt = treffer[1];
    expect(regelInhalt).toMatch(/border\s*:/);
    const hatQuadratischesFormat = /aspect-ratio\s*:\s*1/.test(regelInhalt)
      || (/width\s*:\s*(\d+)/.test(regelInhalt) && /height\s*:\s*(\d+)/.test(regelInhalt));
    expect(hatQuadratischesFormat).toBe(true);
  });

  test('Gegeben die Würfel-Augen (Pips)-Optik aus Stephans Entscheidung (nicht Zahl-im-Rahmen), wenn das <style>-Regelwerk nach einer eigenen Würfel-Augen-Klasse durchsucht wird, dann existiert sie mit runder Punkt-Optik (border-radius:50%)', () => {
    const klassenMuster = /\.rv-wuerfel-auge\s*\{([^}]*)\}/;
    const treffer = klassenMuster.exec(spielHtmlInhalt);
    expect(treffer).not.toBeNull();
    expect(treffer[1]).toMatch(/border-radius\s*:\s*50%/);
  });
});

describe('AK2 (Regressionsschutz-AK, bereits GRÜN): Nach einem Klick auf „Würfeln" läuft weiterhin kurz eine sichtbare Wurf-Animation mit mehreren schnell wechselnden Zufallszahlen, bevor sie sich auf das Ergebnis beruhigt', () => {
  // Bewusst bereits heute GRÜN (unstrittiges, bestehendes Verhalten aus
  // FEATURE-004 AK10) - als Regressionsschutz aufgenommen, weil der Fix
  // genau an der Stelle direkt danach ansetzt (siehe AK3/AK5 unten). Muster
  // bewusst allgemein (Regel 3b): irgendein Intervall-/Zeitschritt-
  // Mechanismus, der vor der endgültigen Beruhigung mehrfach einen neuen
  // Zufallswert 1-6 setzt.
  test('Gegeben der Würfel-Klick-Handler, wenn sein Quelltext geprüft wird, dann erzeugt er wiederholt neue Zufallswerte (1-6) über einen Zeitschritt-Mechanismus, bevor er sich auf den Endwert beruhigt', () => {
    const handler = wuerfelKlickHandlerAusschnitt(spielHtmlInhalt);
    expect(handler).not.toBeNull();
    expect(handler).toMatch(/set(Interval|Timeout)\(/);
    expect(handler).toMatch(/Math\.floor\(\s*Math\.random\(\)\s*\*\s*6\s*\)/);
  });
});

describe('AK3/AK5 (Kern der Ticket-Beschwerde + zentraler Umsetzungs-Stolperstein aus der Analyse-Spec): Nach der Animation bleibt das Ergebnis bis zu einer bewussten Bestätigung stehen - kein automatischer Rücksprung auf "?", kein sofortiger zweiter Wurf möglich', () => {
  test('Gegeben der Würfel-Klick-Handler, wenn der Moment des letzten Animations-Tick geprüft wird, dann ruft er NICHT mehr direkt die Firestore-Schreibfunktion schliesseRundeVierWurfAb() auf, sondern die neue Bestätigungs-Render-Funktion, die das Ergebnis zunächst nur anzeigt', () => {
    const handler = wuerfelKlickHandlerAusschnitt(spielHtmlInhalt);
    expect(handler).not.toBeNull();
    expect(handler).toMatch(new RegExp(NEUE_BESTAETIGUNGS_FUNKTION + '\\s*\\('));
    // Direkter Aufruf der Schreibfunktion darf an dieser Stelle (im
    // Klick-Handler selbst, also unmittelbar nach der Animation) NICHT mehr
    // vorkommen - sie darf ausschliesslich noch innerhalb der neuen
    // Bestätigungs-Funktion referenziert werden (siehe eigener Test unten).
    expect(handler).not.toMatch(/schliesseRundeVierWurfAb\(\s*db\s*,\s*code\s*,\s*element\s*,\s*letzterWert\s*,\s*btn\s*\)/);
  });

  test('Gegeben die neue Bestätigungs-Render-Funktion, wenn ihr Quelltext-Körper geprüft wird, dann existiert sie tatsächlich UND ruft ERST bei einem Klick auf einen eigenen Bestätigungs-Button die bestehende Schreibfunktion schliesseRundeVierWurfAb() auf (nicht sofort beim Aufbau der Anzeige selbst)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_BESTAETIGUNGS_FUNKTION);
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/addEventListener\(\s*['"]click['"]/);
    expect(koerper).toMatch(/schliesseRundeVierWurfAb\s*\(/);
  });

  test('Gegeben der in der Analyse-Spec benannte "zentrale Umsetzungs-Stolperstein" (ein durch irgendein Firestore-Update ausgelöster Re-Render darf die gehaltene Bestätigungs-Ansicht nicht überschreiben), wenn renderRundeVierFokusCard() geprüft wird, dann prüft sie den neuen Guard direkt am Anfang und überspringt den Neuaufbau der Karte, solange eine Bestätigung noch aussteht', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'renderRundeVierFokusCard');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(new RegExp(NEUER_GUARD));
    // Es muss eine erkennbare Abbruch-/Skip-Bedingung geben (early return),
    // nicht nur ein blosses Lesen der Variable irgendwo im Funktionskörper.
    const guardPruefungMuster = new RegExp('if\\s*\\(\\s*' + NEUER_GUARD + '[^)]*\\)\\s*(\\{[^}]*return|return)');
    expect(koerper).toMatch(guardPruefungMuster);
  });
});

describe('AK4: Bei einem nicht ausreichenden Ergebnis (1, 2 oder 3) erkennt die spielende Person eindeutig, dass ein weiterer Wurf nötig ist, bevor sie erneut würfeln kann', () => {
  test('Gegeben der neue i18n-Schlüssel für den Hinweistext bei ≤3 (Node-Kopie), wenn er nachgeschlagen wird, dann existiert er mit nicht-leerem deutschem UND englischem Text', () => {
    const eintrag = UEBERSETZUNGEN_NODE[SCHLUESSEL_NICHT_AUSREICHEND];
    expect(eintrag).toBeDefined();
    expect(typeof eintrag.de).toBe('string');
    expect(eintrag.de.trim().length).toBeGreaterThan(0);
    expect(typeof eintrag.en).toBe('string');
    expect(eintrag.en.trim().length).toBeGreaterThan(0);
  });

  test('Gegeben die neue Bestätigungs-Render-Funktion, wenn ihr Quelltext-Körper geprüft wird, dann setzt sie bei einem Ergebnis ≤3 zusätzlich zur Zahl den Hinweistext (nicht nur die nackte Ziffer/Pips-Darstellung allein)', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_BESTAETIGUNGS_FUNKTION);
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(new RegExp(SCHLUESSEL_NICHT_AUSREICHEND.replace('.', '\\.')));
    // Die Fallunterscheidung muss erkennbar am Wurfwert bzw. an der
    // bestehenden Erfolgsfunktion hängen, nicht pauschal/unbedingt gesetzt
    // werden (sonst würde der Hinweis auch bei einem Erfolg erscheinen).
    const hatBedingteUnterscheidung = /istWurfErfolgreich\s*\(/.test(koerper) || /wert\s*[<>]=?\s*3/.test(koerper);
    expect(hatBedingteUnterscheidung).toBe(true);
  });

  test('Gegeben derselbe i18n-Schlüssel (Browser-Kopie public/js/i18n/uebersetzungen.js), wenn der Quelltext danach durchsucht wird, dann taucht derselbe Schlüssel auch dort auf (Doppelpflege-Risiko)', () => {
    expect(browserUebersetzungenInhalt).toMatch(new RegExp("'" + SCHLUESSEL_NICHT_AUSREICHEND.replace('.', '\\.') + "'"));
  });
});

describe('AK6: Bei einem ausreichenden Ergebnis (4, 5 oder 6) bleibt das Erfolgsergebnis für dieselbe Bestätigungslogik wie in AK3/AK5 sichtbar stehen, bevor die Fokus-Karte zum nächsten Element wechselt (Erfolgsfall-Symmetrie, kein abrupterer Übergang als im reparierten Fehlschlag-Fall)', () => {
  test('Gegeben die neue Bestätigungs-Render-Funktion, wenn ihr Quelltext-Körper geprüft wird, dann behandelt sie BEIDE Fälle (Erfolg UND Misserfolg) über dieselbe Bestätigungs-Mechanik - der Erfolgsfall bekommt einen eigenen Bestätigungs-Button-Text ("weiter"), keinen automatisch sofortigen Kartenwechsel', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_BESTAETIGUNGS_FUNKTION);
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(new RegExp(SCHLUESSEL_WEITER.replace('.', '\\.')));
    expect(koerper).toMatch(new RegExp(SCHLUESSEL_NOCHMAL_WUERFELN.replace('.', '\\.')));
  });

  test('Gegeben die neuen Bestätigungs-Button-Texte (Node-Kopie), wenn sie nachgeschlagen werden, dann existieren beide mit nicht-leerem deutschem UND englischem Text', () => {
    [SCHLUESSEL_WEITER, SCHLUESSEL_NOCHMAL_WUERFELN].forEach((schluessel) => {
      const eintrag = UEBERSETZUNGEN_NODE[schluessel];
      expect(eintrag).toBeDefined();
      expect(typeof eintrag.de).toBe('string');
      expect(eintrag.de.trim().length).toBeGreaterThan(0);
      expect(typeof eintrag.en).toBe('string');
      expect(eintrag.en.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('AK7 + Pre-Mortem-Risiko 5: Während die Wurf-Animation läuft oder das Ergebnis noch sichtbar gehalten wird, führt ein zusätzlicher Klick zu keiner Wirkung - kein zweiter, sich überlappender Wurf, keine doppelte Datenspeicherung', () => {
  test('Gegeben der bestehende Doppel-Klick-Schutz wuerfelAnimationLaeuft (Regressionsschutz, bereits GRÜN), wenn schliesseRundeVierWurfAb() geprüft wird, dann setzt weiterhin GENAU dieser finally-Block ihn zurück auf false - die neue, jetzt längere Bestätigungsphase verlängert den Guard-Zeitraum automatisch mit, statt einen zweiten, separaten Reset-Pfad einzuführen', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'schliesseRundeVierWurfAb');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/finally\s*\{[^}]*wuerfelAnimationLaeuft\s*=\s*false/);
  });

  test('Gegeben der neue Bestätigungs-Button selbst, wenn sein Klick-Handler in der neuen Bestätigungs-Render-Funktion geprüft wird, dann schützt er sich unmittelbar bei Klick gegen einen zweiten, überlappenden Klick (z. B. durch sofortiges Deaktivieren), bevor die Schreibfunktion aufgerufen wird', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, NEUE_BESTAETIGUNGS_FUNKTION);
    expect(koerper).not.toBeNull();
    const klickHandlerStart = koerper.search(/addEventListener\(\s*['"]click['"]/);
    expect(klickHandlerStart).toBeGreaterThan(-1);
    const klickHandlerAusschnitt = koerper.slice(klickHandlerStart);
    expect(klickHandlerAusschnitt).toMatch(/\.disabled\s*=\s*true/);
  });
});

describe('Zusatz-Scope (Stephans Entscheidung 2026-08-10): Reduced-Motion-Reparatur - die Würfel-Animation wird bei aktiviertem "Bewegung reduzieren" verkürzt/übersprungen, das Ergebnis bleibt trotzdem sichtbar', () => {
  test('Gegeben renderRundeVierFokusCard() (enthält den Würfel-Klick-Handler), wenn ihr Quelltext-Körper geprüft wird, dann prüft sie window.matchMedia mit der bestehenden prefers-reduced-motion-Query - heute existiert diese Prüfung dort nicht (Analyse-Spec: "kann diesen JS-Text-Zyklus grundsätzlich nicht stoppen")', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'renderRundeVierFokusCard');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/matchMedia\(\s*['"]\(prefers-reduced-motion:\s*reduce\)['"]\s*\)/);
  });

  test('Gegeben eine aktivierte prefers-reduced-motion-Einstellung, wenn der Würfel-Klick-Handler geprüft wird, dann führt der reduzierte Pfad trotzdem zur neuen Bestätigungs-Render-Funktion (Ergebnis bleibt sichtbar, nur der Weg dorthin - Anzahl/Dauer der Zwischenschritte - wird verkürzt, kein stillschweigendes Weglassen der Bestätigung selbst)', () => {
    const handler = wuerfelKlickHandlerAusschnitt(spielHtmlInhalt);
    expect(handler).not.toBeNull();
    // Es muss eine erkennbare Verzweigung geben, die auf die
    // reduced-motion-Prüfung reagiert (weniger Durchläufe, keine
    // Zwischenschritte, o. Ä.) - UND in jedem Zweig weiterhin zur
    // Bestätigungs-Funktion führen.
    const referenziertReducedMotion = /matchMedia|bewegungReduziert|reducedMotion/i.test(handler)
      || funktionsKoerper(spielHtmlInhalt, 'renderRundeVierFokusCard').match(/matchMedia\(\s*['"]\(prefers-reduced-motion/) !== null;
    expect(referenziertReducedMotion).toBe(true);
    expect(handler).toMatch(new RegExp(NEUE_BESTAETIGUNGS_FUNKTION + '\\s*\\('));
  });
});

describe('Regressionsschutz gegen bereits abgenommene Tickets (Schritt 6 der Analyse-Spec) - bereits heute GRÜN, unverändert bleibende Nachbar-Logik derselben Funktion(en)', () => {
  test('Gegeben BUGFIX-011 (Bearbeitungszeit-Start im Würfel-Erfolgspfad), wenn schliesseRundeVierWurfAb() geprüft wird, dann ruft ihr Erfolgszweig weiterhin starteBearbeitungszeitFallsNoetig() auf - dieser Fix darf den Erfolgspfad NICHT verzögern oder überspringen', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'schliesseRundeVierWurfAb');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/starteBearbeitungszeitFallsNoetig\s*\(/);
  });

  test('Gegeben BUGFIX-009 (Karten-Positionsanzeige im Länderkarten-Zweig derselben renderRundeVierFokusCard()-Funktion), wenn der else-Zweig (element.typ !== "wuerfel") geprüft wird, dann bleibt die Positionsanzeige rv-karten-position samt rundeVier.kartenPosition-Aufruf unverändert erhalten - dieser Fix darf ausschliesslich den Würfel-Zweig ändern', () => {
    const koerper = funktionsKoerper(spielHtmlInhalt, 'renderRundeVierFokusCard');
    expect(koerper).not.toBeNull();
    expect(koerper).toMatch(/rv-karten-position/);
    expect(koerper).toMatch(/t\(\s*['"]rundeVier\.kartenPosition['"]/);
  });
});
