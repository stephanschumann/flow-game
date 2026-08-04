/**
 * FEATURE-018 – Spiel auch ohne separaten Gastgeber spielbar (Host kann mitspielen).
 * Statische Text-/Quelltext-Tests (kein DOM/jsdom im Projekt, siehe
 * package.json) für die Ergänzung "Text-/Kommunikationsauswirkungen"
 * (Backlog.md, 2026-08-04): AK10-AK16, Fundstellen A.1-A.6/B.7-B.8, sowie
 * AK1 (neues Formularelement "ich spiele mit").
 *
 * NAMENSGEBUNG (eigene, begründete Festlegung für die BDD-Phase, analog zum
 * Vorgehen bei FEATURE-007 – Ticket/Ergänzung legen den Wortlaut/die
 * Akzeptanzkriterien fest, nicht die konkreten Element-IDs/Schlüsselnamen):
 *  - Neues Formularelement in #form-erstellen: Checkbox mit
 *    id="checkbox-host-spielt-mit" (Label-Schlüssel
 *    'lobby.hostSpieltMitLabel').
 *  - Neuer i18n-Schlüssel für die kurze automatische Freigabe-Rückmeldung
 *    (AK13, UI/UX-Entscheidung Gate 1: Variante 2, kurzer, dezenter Hinweis):
 *    'kennzahlen.automatischFreigegebenHinweis'.
 *
 * WICHTIG – bewusst gemischt rot/grün beim ersten Lauf: Die mit "NEU"
 * markierten Blöcke prüfen Text-/Zähler-Verhalten, das laut Ergänzung erst
 * noch umgesetzt werden muss und schlagen deshalb jetzt erwartungsgemäß
 * fehl. Die mit "BEREITS ERFÜLLT" markierten Blöcke bestätigen bereits
 * heute vorhandene, für dieses Ticket wiederverwendbare Struktur
 * (Fundstellen-Sweep Punkt (c) der Analyse-Spec: eigeneStationsNummer-Check
 * ist bereits rollenunabhängig) und sind bewusst bereits GRÜN.
 *
 * Framework: Jest + Node "fs", Textmuster-Prüfung gegen den echten
 * Quelltext, analog zu tests/game-startseite-erklaerung.static.test.js und
 * tests/game-i18n-quelltext-scan.static.test.js. Die Node-Kopie
 * src/i18n/uebersetzungen.js wird per require() strukturiert geprüft, die
 * Browser-Kopie public/js/i18n/uebersetzungen.js (schließt mit
 * `})(window);`, kein module.exports) nur als Text durchsucht.
 */

const fs = require('fs');
const path = require('path');

const { UEBERSETZUNGEN: UEBERSETZUNGEN_NODE } = require('../src/i18n/uebersetzungen');

const SPIEL_HTML_PFAD = path.join(__dirname, '..', 'public', 'spiel.html');
const INDEX_HTML_PFAD = path.join(__dirname, '..', 'public', 'index.html');
const PRODUCT_MD_PFAD = path.join(__dirname, '..', 'Product.md');
const BROWSER_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'public', 'js', 'i18n', 'uebersetzungen.js');
const SRC_UEBERSETZUNGEN_PFAD = path.join(__dirname, '..', 'src', 'i18n', 'uebersetzungen.js');

function lese(p) {
  return fs.readFileSync(p, 'utf8');
}

describe('NEU (AK10, Fundstelle A.1): Startseiten-Text zur Personenanzahl nennt beide möglichen Gesamtzahlen statt einer festen Zahl', () => {
  test('Gegeben startseite.spieleranzahlText (Node-Kopie), wenn der deutsche und der englische Text geprüft werden, dann nennen beide erkennbar "fünf ODER sechs" bzw. "five or six" statt ausschliesslich einer festen Gesamtzahl', () => {
    const text = UEBERSETZUNGEN_NODE['startseite.spieleranzahlText'];
    expect(text.de).toMatch(/fünf oder sechs/i);
    expect(text.en).toMatch(/five or six/i);
  });

  test('Gegeben startseite.spieleranzahlText (Browser-Kopie public/js/i18n/uebersetzungen.js), wenn der Text als Quelltext durchsucht wird, dann taucht dieselbe "fünf oder sechs"/"five or six"-Formulierung auch dort auf (Doppelpflege-Risiko 10)', () => {
    const inhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);
    const start = inhalt.indexOf("'startseite.spieleranzahlText'");
    expect(start).toBeGreaterThan(-1);
    const ausschnitt = inhalt.slice(start, start + 500);
    expect(ausschnitt).toMatch(/fünf oder sechs/i);
    expect(ausschnitt).toMatch(/five or six/i);
  });
});

describe('NEU (Testplan-Eintrag, Fundstelle A.2): Lobby-Starthinweis hängt vom tatsächlichen Mitspielen der gastgebenden Person ab', () => {
  test('Gegeben lobby.startHinweis (Node-Kopie), wenn der Text geprüft wird, dann nennt er ebenfalls beide möglichen Gesamtzahlen statt ausschliesslich der additiven "5 Spielende und 1 Host"-Formulierung', () => {
    const text = UEBERSETZUNGEN_NODE['lobby.startHinweis'];
    expect(text.de).toMatch(/fünf oder sechs|5 oder 6/i);
    expect(text.en).toMatch(/five or six|5 or 6/i);
  });
});

describe('NEU (AK11, Fundstelle A.3, Pre-Mortem-Risiko 8): Live-Zähler in der Lobby zählt einen mitspielenden Host mit', () => {
  test('Gegeben die Live-Zähler-Berechnung in public/spiel.html (renderTeilnehmerListe), wenn der Berechnungs-Ausschnitt rund um "anzahlSpielendeBeigetreten" gelesen wird, dann berücksichtigt er auch ein Teilnehmenden-Dokument mit rolle="host" UND einer eigenen Station (nicht mehr ausschliesslich rolle==="spielende")', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.indexOf('anzahlSpielendeBeigetreten');
    expect(start).toBeGreaterThan(-1);
    const ausschnitt = inhalt.slice(start, start + 400);
    // Heutiger Bug (Befund A.3 der Ergänzung): die Zähl-Logik prüft
    // AUSSCHLIESSLICH rolle === 'spielende' und berücksichtigt nie ein
    // mitspielendes Host-Dokument (das zusätzlich ein eigenes station-Feld
    // trägt) - dieser Test erwartet, dass die Berechnung nach der
    // Umsetzung zusätzlich auf ein station-Feld bzw. eine entsprechende
    // Host-Bedingung eingeht.
    const enthaeltHostBeruecksichtigung = /rolle\s*===?\s*['"]host['"]/.test(ausschnitt)
      || /\.station\b/.test(ausschnitt)
      || /mitspiel/i.test(ausschnitt);
    expect(enthaeltHostBeruecksichtigung).toBe(true);
  });
});

describe('BEREITS ERFÜLLT (AK12, Fundstellen-Sweep Punkt c der Analyse-Spec): der Host-Hinweistext hängt bereits heute ausschliesslich vom Vorhandensein einer Station ab, nicht von der Rolle', () => {
  test('Gegeben die Spielbrett-Anzeige für Runde 1-3 (renderBrett), wenn der Ausschnitt rund um "spielbrett.hostHinweis" gelesen wird, dann ist die Textzuweisung an die Bedingung "eigeneStationsNummer === null" geknüpft (nicht an eine feste Rollen-Prüfung ausserhalb dieser Bedingung) - das bedeutet: sobald ein mitspielender Host über createGame() eine Station bekommt, verschwindet dieser Hinweis automatisch, ohne dass dieser Anzeige-Code selbst geändert werden muss', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.indexOf("t('spielbrett.hostHinweis')");
    expect(start).toBeGreaterThan(-1);
    const davor = inhalt.slice(Math.max(0, start - 250), start);
    expect(davor).toMatch(/eigeneStationsNummer\s*===\s*null/);
  });

  test('Gegeben die Spielbrett-Anzeige für Runde 4 (renderRundeVier), wenn der Ausschnitt rund um "rundeVier.hostHinweis" gelesen wird, dann gilt dieselbe stationsbasierte Bedingung wie in Runde 1-3 (eigeneRundeVierPosition === null)', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.indexOf("t('rundeVier.hostHinweis')");
    expect(start).toBeGreaterThan(-1);
    const davor = inhalt.slice(Math.max(0, start - 250), start);
    expect(davor).toMatch(/eigeneRundeVierPosition\s*===\s*null/);
  });
});

describe('NEU (AK1): neues Formularelement, mit dem die gastgebende Person beim Erstellen "ich spiele mit" wählen kann', () => {
  test('Gegeben #form-erstellen in public/spiel.html, wenn das Formular-Markup gelesen wird, dann enthält es eine Checkbox, mit der die gastgebende Person beim Erstellen auswählen kann, ob sie selbst mitspielt', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const formStart = inhalt.indexOf('<form id="form-erstellen">');
    expect(formStart).toBeGreaterThan(-1);
    const formEnde = inhalt.indexOf('</form>', formStart);
    const formAusschnitt = inhalt.slice(formStart, formEnde);
    expect(formAusschnitt).toMatch(/type="checkbox"/);
  });

  test('Gegeben das Erstellen-Formular sendet ab, wenn der createGame()-Aufruf in public/spiel.html gelesen wird, dann übergibt er einen "mitspielen"-Wert an createGame() (nicht nur hostAnzeigename/uid/sprache wie bisher)', () => {
    const inhalt = lese(SPIEL_HTML_PFAD);
    const start = inhalt.indexOf('window.FlowGame.createGame(');
    expect(start).toBeGreaterThan(-1);
    const ausschnitt = inhalt.slice(start, start + 300);
    expect(ausschnitt).toMatch(/mitspielen/);
  });
});

describe('NEU (AK13, Fundstelle B.8): eigene, kurze Rückmeldung bei automatischer Freigabe statt des bisherigen Bestätigungsdialogs (Gate 1: Variante 2 – kurzer, dezenter Hinweis)', () => {
  test('Gegeben die zentrale Übersetzungstabelle (Node-Kopie), wenn nach einem neuen Schlüssel für die automatische Freigabe-Rückmeldung gesucht wird, dann existiert "kennzahlen.automatischFreigegebenHinweis" mit einem von "kennzahlen.freigabeBestaetigung" unterscheidbaren Wortlaut, in beiden Sprachen', () => {
    const neuerSchluessel = UEBERSETZUNGEN_NODE['kennzahlen.automatischFreigegebenHinweis'];
    expect(neuerSchluessel).toBeDefined();
    expect(neuerSchluessel.de).toEqual(expect.any(String));
    expect(neuerSchluessel.en).toEqual(expect.any(String));
    expect(neuerSchluessel.de.length).toBeGreaterThan(0);
    expect(neuerSchluessel.en.length).toBeGreaterThan(0);
    expect(neuerSchluessel.de).not.toEqual(UEBERSETZUNGEN_NODE['kennzahlen.freigabeBestaetigung'].de);
  });

  test('Gegeben derselbe neue Schlüssel, wenn die Browser-Kopie public/js/i18n/uebersetzungen.js als Text durchsucht wird, dann existiert er dort ebenfalls (Doppelpflege-Risiko 10, AK14)', () => {
    const inhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);
    expect(inhalt).toMatch(/'kennzahlen\.automatischFreigegebenHinweis'/);
  });
});

describe('REGRESSION (AK8, AK16): der bisherige, klassische Freigabe-Bestätigungsdialog bleibt unverändert bestehen', () => {
  test('Gegeben kennzahlen.freigabeBestaetigung (Node-Kopie), wenn der Text geprüft wird, dann lautet er weiterhin unverändert wie vor dieser Ergänzung', () => {
    const text = UEBERSETZUNGEN_NODE['kennzahlen.freigabeBestaetigung'];
    expect(text.de).toBe(
      'Ergebnisse jetzt für alle freigeben? Danach sehen alle Spielenden und Beobachtenden sofort alle Kennzahlen aller Runden - das lässt sich nicht zurücknehmen.'
    );
    expect(text.en).toBe(
      'Release results to everyone now? All players and observers will immediately see every metric of every round - this cannot be undone.'
    );
  });
});

describe('NEU (AK15, Fundstelle A.6): Product.md beschreibt nach Umsetzung beide Host-Konstellationen', () => {
  test('Gegeben Product.md Abschnitt "Rollen"/"Zielgruppe und Einsatz", wenn der Text gelesen wird, dann erwähnt er neben der klassischen, rein moderierenden Host-Rolle auch die neue, mitspielende Host-Konstellation', () => {
    const inhalt = lese(PRODUCT_MD_PFAD);
    expect(inhalt).toMatch(/mitspiel(en|end)/i);
  });
});

describe('BEREITS ERFÜLLT / Doppelpflege-Check: Node- und Browser-Übersetzungstabelle bleiben für ALLE bereits bestehenden, hier geprüften Schlüssel synchron', () => {
  const GEPRUEFTE_SCHLUESSEL = [
    'startseite.spieleranzahlText',
    'lobby.startHinweis',
    'lobby.liveZaehler',
    'spielbrett.hostHinweis',
    'rundeVier.hostHinweis',
    'kennzahlen.hostVorschauHinweis',
    'kennzahlen.freigabeBestaetigung',
    'kennzahlen.spielFertigHinweis',
  ];

  test.each(GEPRUEFTE_SCHLUESSEL)('Gegeben der Schlüssel "%s", wenn Node- und Browser-Kopie verglichen werden, dann sind beide deutschen Texte inhaltlich identisch (kein Auseinanderlaufen, Pre-Mortem-Risiko 10)', (schluessel) => {
    const nodeText = UEBERSETZUNGEN_NODE[schluessel];
    expect(nodeText).toBeDefined();
    const browserInhalt = lese(BROWSER_UEBERSETZUNGEN_PFAD);
    expect(browserInhalt).toContain(nodeText.de);
  });
});
