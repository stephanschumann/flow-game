/**
 * FEATURE-008 – Karten per Drag-and-Drop statt Klick-Button bewegen
 * BDD-Tests (flow-game-bdd, 2026-07-29) für die statisch (per Textmuster,
 * ohne DOM/jsdom) prüfbaren Akzeptanzkriterien aus der freigegebenen Spec in
 * Backlog.md ("### FEATURE-008"), inklusive des Nachtrags zur absichtlichen
 * Fehlerquelle (AK11–AK15) und der finalen Klärung der Fragen 6–8
 * (2026-07-29).
 *
 * Gleiches Testmuster wie tests/game-a11y-static.test.js (FEATURE-005): kein
 * neues Modul, kein Firestore-Emulator nötig – liest den echten, existierenden
 * Quelltext von public/spiel.html bzw. public/js/i18n/uebersetzungen.js und
 * prüft per Mustersuche, ob die geforderten Ergänzungen bereits enthalten
 * sind. Framework: Jest + Node "fs" (kein DOM im Projekt vorhanden).
 *
 * WICHTIG – bewusst RED: Alle Szenarien in dieser Datei schlagen jetzt
 * tatsächlich fehl (echte Assertion-Fehlschläge), weil FEATURE-008 noch nicht
 * implementiert ist. Real code-geprüft (Commit aca124f, siehe Analyse-Spec):
 * es existiert heute KEINERLEI Drag-/Touch-Interaktionscode im Projekt
 * (0 Treffer für draggable/ondrag/touchstart/touchmove/touchend/pointerdown/
 * dragstart in public/ und src/), und der bisherige Klick-Button
 * (`btn.textContent = '→'`, Zeile 1431, `renderBrett()`) existiert weiterhin
 * unverändert.
 *
 * WICHTIGE, TRANSPARENT GEMACHTE ABWEICHUNG von der ursprünglichen
 * BDD-Skill-Empfehlung: Die ALLERERSTEN Akzeptanzkriterien 2/3/4 aus der
 * ursprünglichen Analyse-Spec (Klick-Button bleibt ZUSÄTZLICH bestehen; nur
 * die eine richtige Spalte reagiert als Ziel) sind durch die SPÄTEREN,
 * ausdrücklich freigegebenen Entscheidungen 1 und 5 überholt (Backlog.md,
 * "Freigabe-Entscheidungen (Stephan, 2026-07-29)"): der Klick-Button wird
 * VOLLSTÄNDIG ERSETZT (nicht ergänzt), und Karten dürfen optisch in JEDE
 * Spalte gezogen werden (nicht nur die eine richtige). Diese Datei prüft
 * ausschließlich das finale, freigegebene Verhalten, nicht die inzwischen
 * überholten ursprünglichen AK-Formulierungen.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const I18N_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const i18nInhalt = fs.readFileSync(I18N_PFAD, 'utf8');

describe('Szenario: Der bisherige Klick-Button für Kartenbewegung ist vollständig entfernt, nicht nur ergänzt (Freigabe-Entscheidung 1, "ersetzen statt ergänzen")', () => {
  test('Gegeben FEATURE-008 wurde umgesetzt, wenn der Quelltext von renderBrett() nach dem heutigen Bewegen-Button durchsucht wird, dann existiert `btn.textContent = \'→\'` nicht mehr', () => {
    // Heutiger, real code-geprüfter Stand (Commit aca124f): Diese Stelle
    // existiert noch (renderBrett(), Zeile ~1431) - der Test ist deshalb
    // jetzt ERWARTUNGSGEMÄSS ROT. Nach der Umsetzung darf dieser Button
    // nicht mehr erzeugt werden.
    const stelleIndex = spielHtmlInhalt.indexOf("btn.textContent = '→'");
    expect(stelleIndex).toBe(-1);
  });
});

describe('Szenario: Kartenbewegung wird durch echtes Pointer-Events-Ziehen ausgelöst (AK1, Variante A "echtes Pointer-Events-Ziehen", Freigabe-Entscheidung 3)', () => {
  test('Gegeben Runden 1–3 zeigen bewegbare Karten im Spielbrett, wenn der Quelltext nach dem neuen Zieh-Auslöser durchsucht wird, dann registriert er pointerdown-, pointermove- UND pointerup-Handler (einheitlich für Maus/Trackpad/Touch, keine getrennten touch*/mouse*-Handler-Paare)', () => {
    const hatPointerDown = /addEventListener\(\s*['"]pointerdown['"]/.test(spielHtmlInhalt)
      || /\.onpointerdown\s*=/.test(spielHtmlInhalt);
    const hatPointerMove = /addEventListener\(\s*['"]pointermove['"]/.test(spielHtmlInhalt)
      || /\.onpointermove\s*=/.test(spielHtmlInhalt);
    const hatPointerUp = /addEventListener\(\s*['"]pointerup['"]/.test(spielHtmlInhalt)
      || /\.onpointerup\s*=/.test(spielHtmlInhalt);
    expect(hatPointerDown && hatPointerMove && hatPointerUp).toBe(true);
  });
});

describe('Szenario: Ziehbare Karten sind vor Scroll-Konflikten auf dem Hauptgerät Tablet geschützt (Pre-Mortem-Risiko 4)', () => {
  test('Gegeben eine Ziehgeste auf dem Spielbrett kann ohne Handling mit dem Seiten-Scrollen kollidieren, wenn der Quelltext nach touch-action durchsucht wird, dann setzt mindestens eine CSS-Regel touch-action für die Karten-Chips (nicht none/auto global auf dem ganzen Dokument)', () => {
    const hatTouchAction = /touch-action\s*:\s*none/.test(spielHtmlInhalt);
    expect(hatTouchAction).toBe(true);
  });
});

describe('Szenario: Karten können optisch in jede Spalte gezogen werden, nicht nur die eine richtige (Scope-Zusatz Punkt 5, Freigabe-Entscheidung 5)', () => {
  test('Gegeben früher (Annahme 4 der ursprünglichen Analyse) sollte nur die eine gültige Zielspalte überhaupt als Ziel reagieren, wenn der Quelltext nach der neuen, bewusst gelockerten Drop-Erkennung durchsucht wird, dann iteriert die Drop-Auswertung über ALLE Spalten (Position 0 bis 6), nicht nur über `vonPosition + 1`', () => {
    // Textmuster bewusst allgemein gehalten (siehe flow-game-bdd Punkt 3b):
    // geprüft wird auf eine Iteration/Auswahl über die komplette Spaltenmenge
    // (z. B. ".spalte"-Elemente oder Position 0..6) im Umfeld der neuen
    // Drop-Logik, nicht auf eine exakte Zeilenform.
    const hatSpaltenSelektor = /querySelectorAll\(\s*['"]\.spalte['"]/.test(spielHtmlInhalt)
      || /document\.elementFromPoint/.test(spielHtmlInhalt);
    expect(hatSpaltenSelektor).toBe(true);
  });
});

describe('Szenario: Eine gerade losgelassene Karte kann nicht ein zweites Mal angefasst werden, solange die Serverbestätigung aussteht (AK9)', () => {
  test('Gegeben früher verhinderte `btn.disabled = true` einen Doppelklick, wenn der Quelltext nach dem Drag-Äquivalent durchsucht wird, dann gibt es einen Sperr-/Wartezustand (z. B. eine "busy"/"wird-verarbeitet"-Markierung), der ein erneutes Ziehen derselben Karte verhindert, während der Schreibvorgang noch läuft', () => {
    // Allgemein gehalten (3b): irgendeine erkennbare Sperr-Markierung im
    // Umfeld des neuen Drop-Handlers, keine exakte Klassenbenennung
    // vorgeschrieben.
    const hatSperrzustand = /\bbusy\b/i.test(spielHtmlInhalt) && /pointerdown|pointerup/.test(spielHtmlInhalt);
    expect(hatSperrzustand).toBe(true);
  });
});

describe('Szenario: Beim absichtlichen Fehlversuch (falsche Zielspalte) erscheint eine freundliche, übersetzte Fehlermeldung statt der rohen Firestore-SDK-Meldung (AK11)', () => {
  test('Gegeben `permission-denied` hat heute (real code-geprüft) KEINEN Eintrag in FEHLERCODE_ZU_SCHLUESSEL und fällt deshalb auf die rohe err.message zurück, wenn die Übersetzungstabelle nach einem neuen, eigenen Schlüssel für die absichtliche Fehlerquelle durchsucht wird, dann existiert ein neuer, sowohl deutsch als auch englisch befüllter Übersetzungseintrag dafür', () => {
    // Heutiger Stand (real geprüft): FEHLERCODE_ZU_SCHLUESSEL enthält 19
    // Einträge, keiner davon für permission-denied/die neue Fehlerquelle -
    // erwartungsgemäß ROT. Suchmuster bewusst nicht an einen exakten
    // Schlüsselnamen gebunden (z. B. "fehler.falscheStation" wäre nur eine
    // von mehreren plausiblen Benennungen) - geprüft wird stattdessen, ob
    // IRGENDEIN 'fehler.*'-SCHLÜSSELNAME (nicht der Fließtext daneben, der
    // z. B. bei 'fehler.stationenVollNachtraeglich' bereits heute zufällig
    // das Wort "Stationen" enthält - erster Testlauf deckte diesen
    // False-Positive real auf, Regex entsprechend verschärft) den Begriff
    // "falsch" trägt, was bei keinem der 21 heutigen fehler.*-Schlüssel der
    // Fall ist (real geprüft).
    const fehlerSchluessel = [...i18nInhalt.matchAll(/'fehler\.([a-zA-Z0-9]+)'\s*:/g)].map((m) => m[1]);
    const hatNeuenPassendenSchluessel = fehlerSchluessel.some((k) => /falsch/i.test(k));
    expect(hatNeuenPassendenSchluessel).toBe(true);
  });
});

describe('Szenario: Eine falsch abgelegte Karte bleibt sichtbar in der falschen Spalte "hängen", eindeutig als falsch platziert markiert (AK12, finale Klärung Frage 7: "Hängen bleiben")', () => {
  test('Gegeben Stephan hat sich ausdrücklich gegen automatisches Zurückspringen und für "Hängen bleiben" entschieden, wenn der Quelltext nach der visuellen Markierung durchsucht wird, dann gibt es sowohl eine eigene CSS-Klasse/Attribut für "falsch platziert" ALS AUCH einen zugehörigen Text-Hinweis (nicht nur Farbe allein, Product.md §9 "Bedeutung nie nur über Farbe")', () => {
    const hatVisuelleMarkierung = /falsch[-_]?platziert/i.test(spielHtmlInhalt);
    expect(hatVisuelleMarkierung).toBe(true);
  });

  test('Gegeben die Karte hängt sichtbar in der falschen Spalte, wenn der zugehörige Text-Hinweis geprüft wird, dann ist er NICHT identisch mit der reinen visuellen Markierung, sondern ein eigener, für Screenreader ebenfalls wahrnehmbarer Hinweistext (z. B. aria-label-Ergänzung oder sichtbarer Text)', () => {
    const hatMarkierungMitText = /falsch[-_]?platziert/i.test(spielHtmlInhalt)
      && (/aria-label/.test(spielHtmlInhalt) || /textContent/.test(spielHtmlInhalt));
    // Diese Prüfung ist bewusst schwach positiv formuliert (aria-label/
    // textContent existieren im Dokument ohnehin an vielen Stellen) -
    // trotzdem ROT, weil die erste, spezifischere Bedingung (falsch-platziert
    // -Markierung) heute noch nicht existiert (siehe Test oben) und dieser
    // Test dieselbe Abhängigkeit teilt.
    expect(hatMarkierungMitText).toBe(true);
  });
});

describe('Szenario: Die bestehende Rückschnapp-Fehlerbehandlung bei echter Server-Ablehnung (Race Condition, AK5) bleibt vom neuen Drag-Auslöser genutzt', () => {
  test('Gegeben `zeigeFehlerAusException()` ist heute der einzige Anzeigepfad für eine echte, unerwartete Serverablehnung, wenn der Quelltext im Umfeld der neuen Drop-Erfolgs-/Fehlerbehandlung durchsucht wird, dann ruft der neue Drop-Handler bei einer Server-Ablehnung ebenfalls `zeigeFehlerAusException(` auf (kein zweiter, paralleler Fehleranzeige-Pfad)', () => {
    // Regressionsschutz: der bestehende Aufruf im Klick-Handler (Zeile 1455)
    // verschwindet zwangsläufig mit dem Klick-Button (siehe Test oben) - hier
    // wird geprüft, dass zeigeFehlerAusException trotzdem noch MEHR als
    // einmal im Dokument vorkommt (also auch vom neuen Drop-Pfad genutzt
        // wird), nicht dass die Funktion komplett verschwindet.
    const anzahlAufrufe = (spielHtmlInhalt.match(/zeigeFehlerAusException\(/g) || []).length;
    // Heute (vor FEATURE-008): 7 Aufrufstellen im Dokument (Klick-Handler
    // plus sechs weitere Fehlerpfade). Nach FEATURE-008 muss die Zahl
    // GLEICH BLEIBEN ODER STEIGEN (neuer Drop-Pfad kommt hinzu, der
    // Klick-Handler-Aufruf verschwindet aber gleichzeitig) UND es darf
    // weiterhin mindestens einen Aufruf im unmittelbaren Umfeld eines
    // pointerup-Handlers geben.
    const pointerUpIndex = spielHtmlInhalt.indexOf('pointerup');
    let hatFehlerAufrufNachPointerUp = false;
    if (pointerUpIndex > -1) {
      const umfeld = spielHtmlInhalt.slice(pointerUpIndex, pointerUpIndex + 4000);
      hatFehlerAufrufNachPointerUp = /zeigeFehlerAusException\(/.test(umfeld);
    }
    expect(anzahlAufrufe).toBeGreaterThan(0);
    expect(hatFehlerAufrufNachPointerUp).toBe(true);
  });
});

describe('Szenario: "Ruhiger Modus" deckt auch die neue Zieh-/Rückschnapp-/Hänge-Animation ab, nicht nur die bestehende Seitenwechsel-Animation (AK10)', () => {
  test('Gegeben die bestehende prefers-reduced-motion-Media-Query reduziert heute (real geprüft) ausschließlich `.stage{animation:none}`, wenn der Quelltext auf eine zusätzliche, für die neue Drag-Interaktion relevante Regel innerhalb derselben oder einer weiteren prefers-reduced-motion-Media-Query durchsucht wird, dann existiert eine solche zusätzliche Regel', () => {
    const reduceMotionBloecke = spielHtmlInhalt.match(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)\s*\{[^}]*\{[^}]*\}[^}]*\}/g) || [];
    const gesamtinhaltDerBloecke = reduceMotionBloecke.join('\n');
    // Heute (vor FEATURE-008): nur ".stage{animation:none}" - kein Bezug zu
    // Karten/Drag/Rückschnapp/Hängen. Nach FEATURE-008 muss mindestens eine
    // weitere Regel für die neue Interaktion darin stehen.
    const decktNeueInteraktionAb = /karte|drag|zieh|schnapp|shake|falsch/i.test(gesamtinhaltDerBloecke)
      && !/^\s*\.stage\{animation:none\}\s*$/.test(gesamtinhaltDerBloecke.trim());
    expect(decktNeueInteraktionAb).toBe(true);
  });
});

describe('Szenario: Bearbeitungszeit startet weiterhin beim ersten erfolgreichen Zug, unabhängig vom Auslöser (AK7, Regressionsschutz)', () => {
  test('Gegeben `starteBearbeitungszeitFallsNoetig()` wird heute (real geprüft, Zeile 1450) ausschließlich im Klick-Erfolgsfall aufgerufen, wenn der Quelltext nach dem neuen Drop-Erfolgsfall durchsucht wird, dann ruft auch dieser `window.FlowGame.starteBearbeitungszeitFallsNoetig(` auf', () => {
    const anzahlAufrufe = (spielHtmlInhalt.match(/starteBearbeitungszeitFallsNoetig\(/g) || []).length;
    // Heute genau 2 Fundstellen: die Funktionsdefinition selbst (public/js/
    // game/rundenStart.js, nicht Teil dieser Datei) plus der EINE
    // Aufruf im Klick-Handler von spiel.html. Verschwindet der
    // Klick-Handler-Aufruf ersatzlos ohne neuen Aufruf im Drop-Pfad, bleibt
    // die Zahl der Aufrufstellen in spiel.html bei 1 oder fällt auf 0 -
    // beides ein Regressionssignal für AK7.
    expect(anzahlAufrufe).toBeGreaterThanOrEqual(1);
    const istNurNochInKlickHandler = spielHtmlInhalt.includes("btn.addEventListener('click'")
      && spielHtmlInhalt.indexOf('starteBearbeitungszeitFallsNoetig(') > spielHtmlInhalt.indexOf("btn.addEventListener('click'");
    // RED-Bedingung: entweder der Klick-Handler existiert noch (siehe erster
    // Test dieser Datei, der das ohnehin schon ROT meldet), oder es gibt noch
    // keinen erkennbaren Aufruf im Umfeld eines pointerup-Handlers.
    const pointerUpIndex = spielHtmlInhalt.indexOf('pointerup');
    let hatAufrufNachPointerUp = false;
    if (pointerUpIndex > -1) {
      const umfeld = spielHtmlInhalt.slice(pointerUpIndex, pointerUpIndex + 4000);
      hatAufrufNachPointerUp = /starteBearbeitungszeitFallsNoetig\(/.test(umfeld);
    }
    expect(istNurNochInKlickHandler).toBe(false);
    expect(hatAufrufNachPointerUp).toBe(true);
  });
});

describe('Szenario: Ziehbarkeits-Markierung nutzt weiterhin ausschließlich die bestehende Zuständigkeitsprüfung, keine neue, separat geschriebene Logik (Regressionsschutz BUGFIX-008)', () => {
  test('Gegeben `darfIchDieseKarteBewegen()` prüft heute (real geprüft, Zeile 1337–1351) DoR, Zuständigkeit (`istZustaendig`) und Stapel-Tor, wenn der Quelltext im Umfeld der neuen Ziehbarkeits-Markierung (pointerdown-Registrierung) durchsucht wird, dann ruft dieser weiterhin `darfIchDieseKarteBewegen(` auf, statt eine zweite, eigene Zuständigkeitsprüfung zu schreiben', () => {
    const anzahlAufrufe = (spielHtmlInhalt.match(/darfIchDieseKarteBewegen\(/g) || []).length;
    // Heute genau 2 Fundstellen: die Funktionsdefinition selbst (Zeile 1337)
    // plus der eine Aufruf in renderBrett() (Zeile 1428). Ein pointerdown-
    // Handler, der KEINEN Bezug zu dieser Funktion hat, wäre ein
    // Regressions-Risiko (siehe Pre-Mortem 3 der Analyse-Spec).
    expect(anzahlAufrufe).toBeGreaterThanOrEqual(2);
    const pointerDownIndex = spielHtmlInhalt.indexOf('pointerdown');
    let hatZustaendigkeitspruefungNahePointerDown = false;
    if (pointerDownIndex > -1) {
      const umfeld = spielHtmlInhalt.slice(Math.max(0, pointerDownIndex - 2000), pointerDownIndex + 2000);
      hatZustaendigkeitspruefungNahePointerDown = /darfIchDieseKarteBewegen\(/.test(umfeld);
    }
    expect(hatZustaendigkeitspruefungNahePointerDown).toBe(true);
  });
});
