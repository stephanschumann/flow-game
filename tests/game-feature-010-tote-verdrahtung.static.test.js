/**
 * FEATURE-010 – Bereinigung der toten stationVerfuegbarkeit.js-Verdrahtung
 * (AK10) + Regressionsschutz für unveränderte Bestandslogik (AK5, AK7).
 * BDD-Tests (flow-game-bdd, 2026-08-14) für die von Stephan freigegebene Spec
 * in Backlog.md ("### FEATURE-010", "Update nach Stephans Entscheidung
 * (2026-08-14)": Annahme 1 bejaht – Option A).
 *
 * HINTERGRUND (real code-verifiziert in der Analyse-Spec, nicht vermutet):
 * `public/spiel.html` enthält seit Commit 0bce4ece (2026-07-31, lange vor
 * dieser BDD-Phase) eine erkennbar begonnene, aber abgebrochene frühere
 * FEATURE-010-Umsetzung ("Option B", Gate-basierte Zeiterfassung über eine
 * nie committete Datei js/game/stationVerfuegbarkeit.js). Die Datei liefert
 * live 404 (Analyse-Spec, WebFetch-Beleg); jeder Aufruf von
 * versucheStationVerfuegbarkeit() wirft deshalb bei jeder Kartenbewegung in
 * Runde 1-3 eine unhandled promise rejection (AK8). Stephans Entscheidung:
 * Diese vier Fundstellen werden im Rahmen von FEATURE-010 vollständig
 * entfernt (AK10), nicht nur teilweise:
 *   1. Script-Tag                         public/spiel.html Zeile ~521
 *   2. Aufrufstelle versucheStationVerfuegbarkeit(db, code)  Zeile ~1667
 *   3. Funktionsdefinition versucheStationVerfuegbarkeit()   Zeile ~2105-2114
 *   4. totes Übergabefeld stationVerfuegbarAb in der an
 *      pruefeUndSetzeRundenEnde() übergebenen Objektliteral  Zeile ~2088
 *
 * WICHTIG – bewusst RED beim ersten Lauf: Alle vier Fundstellen sind heute
 * (code-verifiziert, siehe Zeilenangaben oben) noch vollständig vorhanden.
 * Die AK10-Testfälle unten schlagen deshalb jetzt tatsächlich fehl. Die
 * AK5/AK7-Regressionsschutz-Testfälle sichern dagegen unverändertes, bereits
 * heute korrektes Bestandsverhalten ab und sind deshalb schon jetzt bewusst
 * GRÜN (siehe flow-game-bdd, Abschnitt 4a – kein Alarmsignal, da sie
 * bestehendes, ungeändertes Verhalten prüfen, nicht die neue Funktionalität
 * dieses Tickets).
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt), reine
 * Textmuster-Prüfung – gleiches, bereits etabliertes Muster wie
 * tests/game-bugfix-004-abstand-rundung.static.test.js.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const spielHtmlInhalt = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

const RUNDEN_ENDE_BROWSER_PFAD = path.join(__dirname, '..', 'public', 'js', 'game', 'rundenEnde.js');
const rundenEndeInhalt = fs.readFileSync(RUNDEN_ENDE_BROWSER_PFAD, 'utf8');

describe('FEATURE-010 AK10: Die tote stationVerfuegbarkeit.js-Verdrahtung wird vollständig entfernt', () => {
  test('Szenario: Gegeben public/spiel.html, wenn der Quelltext nach dem toten Script-Tag durchsucht wird, dann taucht js/game/stationVerfuegbarkeit.js nirgends mehr auf', () => {
    expect(spielHtmlInhalt).not.toMatch(/stationVerfuegbarkeit\.js/);
  });

  test('Szenario: Gegeben public/spiel.html, wenn der Quelltext nach der Aufrufstelle im Karten-Live-Listener durchsucht wird, dann wird versucheStationVerfuegbarkeit(...) nirgends mehr aufgerufen', () => {
    expect(spielHtmlInhalt).not.toMatch(/versucheStationVerfuegbarkeit\s*\(/);
  });

  test('Szenario: Gegeben public/spiel.html, wenn der Quelltext nach der Funktionsdefinition durchsucht wird, dann existiert keine Funktion namens versucheStationVerfuegbarkeit mehr', () => {
    expect(spielHtmlInhalt).not.toMatch(/function\s+versucheStationVerfuegbarkeit/);
  });

  test('Szenario: Gegeben public/spiel.html, wenn der Quelltext nach Aufrufen der nie existierenden window.FlowGame.pruefeUndSetzeStationVerfuegbarkeit-API durchsucht wird, dann gibt es keinen einzigen Aufruf mehr – genau das war die Quelle der realen unhandled promise rejection (AK8)', () => {
    expect(spielHtmlInhalt).not.toMatch(/pruefeUndSetzeStationVerfuegbarkeit/);
  });

  test('Szenario: Gegeben das Objektliteral, das public/spiel.html beim automatischen Rundenende an pruefeUndSetzeRundenEnde() übergibt, wenn es nach dem toten Übergabefeld durchsucht wird, dann wird stationVerfuegbarAb nicht mehr mitgeschickt', () => {
    expect(spielHtmlInhalt).not.toMatch(/stationVerfuegbarAb/);
  });

  test('Szenario: Gegeben public/js/game/rundenEnde.js (Browser-Fassung, empfängt das Objektliteral aus spiel.html), wenn der Quelltext durchsucht wird, dann liest die Funktion stationVerfuegbarAb an keiner Stelle (auch nicht defensiv/ungenutzt)', () => {
    expect(rundenEndeInhalt).not.toMatch(/stationVerfuegbarAb/);
  });
});

describe('FEATURE-010 AK7 (Regressionsschutz, bereits heute korrekt): Eine vor diesem Ticket gespielte, ältere Runde zeigt für die neuen Felder weiterhin "—" statt eines falschen/erfundenen Werts', () => {
  test('Szenario: Gegeben die Rundenvergleichstabelle (renderVergleichsTabelle), wenn der Quelltext nach der Anzeige-Zeile für "Wartezeit vorher" durchsucht wird, dann prüft sie defensiv per typeof, ob der Wert eine Zahl ist, und fällt sonst auf "—" zurück, statt "00:00" für ein fehlendes Feld zu erfinden', () => {
    expect(spielHtmlInhalt).toMatch(/typeof\s+eintrag\.wartezeitVorher\s*===\s*'number'\s*\?\s*formatiereZeit\(eintrag\.wartezeitVorher\)\s*:\s*'—'/);
  });

  test('Szenario: Gegeben dieselbe Tabelle, wenn der Quelltext nach der Anzeige-Zeile für "Wartezeit danach" durchsucht wird, dann gilt dieselbe defensive "—"-Regel wie für "Wartezeit vorher"', () => {
    expect(spielHtmlInhalt).toMatch(/typeof\s+eintrag\.wartezeitNachher\s*===\s*'number'\s*\?\s*formatiereZeit\(eintrag\.wartezeitNachher\)\s*:\s*'—'/);
  });

  test('Szenario: Gegeben die Labels für die neuen Kennzahlen, wenn i18n durchsucht wird, dann existieren kennzahlen.wartezeitVorher/kennzahlen.wartezeitNachher bereits (keine neue Übersetzungsarbeit nötig für dieses Ticket)', () => {
    expect(spielHtmlInhalt).toMatch(/t\('kennzahlen\.wartezeitVorher'\)/);
    expect(spielHtmlInhalt).toMatch(/t\('kennzahlen\.wartezeitNachher'\)/);
  });
});

describe('FEATURE-010 AK5 (Regressionsschutz, bereits heute korrekt): Die neuen Werte hängen sich an das bereits vollständig freigabe-gated proStation-Objekt an, ohne einen neuen, ungegateten Schreibvorgang zu erzeugen', () => {
  test('Szenario: Gegeben public/js/game/rundenEnde.js, wenn die Firestore-Schreibvorgänge im automatischen Rundenende-Pfad gezählt werden, dann gibt es genau EINEN update()-Aufruf, der phase:"beendet" und die Kennzahlen (inkl. der künftigen wartezeitVorher/-Nachher-Felder, weil sie Teil desselben kennzahlen-Objekts sind) atomar zusammen schreibt – kein separater, zweiter, ungegateter Schreibvorgang nur für die neuen Felder', () => {
    const updateAufrufe = rundenEndeInhalt.match(/rundenRef\.update\(/g) || [];
    expect(updateAufrufe).toHaveLength(1);
    // Die Kennzahlen (die künftig auch die Wartezeit-Felder enthalten, siehe
    // game-feature-010-wartezeit-kennzahlen.integration.test.js) werden
    // per Object.assign in genau diesen einen update()-Aufruf gemischt.
    expect(rundenEndeInhalt).toMatch(/rundenRef\.update\(Object\.assign\(\{[\s\S]*?phase:\s*'beendet'[\s\S]*?\},\s*kennzahlen\)\)/);
  });
});
