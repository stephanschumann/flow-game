/**
 * BUGFIX-006 – AK 8: Automatisierter Quelltext-Scan-Test ("sprachreine
 * Anzeige"), Freigabe-Entscheidung 2 vom 2026-07-30: Option B1 (Node/`fs`,
 * KEIN jsdom/Playwright) + Option B3 (dokumentierter, nicht automatisierter
 * Chrome-Live-Check, siehe tests/game-bugfix-006-manual-checks.test.js).
 *
 * Zweck (siehe Analyse-Spec, Pre-Mortem-Risiko 5): Ein Test, der NUR die
 * konkret gemeldeten Einzelfälle ("wareneingang", "Karte", "Lädt") als
 * Literale sucht, würde beim nächsten neuen, versehentlich hartcodierten
 * deutschen Text wieder nichts melden. Dieser Test scannt deshalb
 * STRUKTURELL (nicht nur die bekannten Einzelfälle):
 *
 *   (A) Rohe Objekt-Feld-Werte (z. B. daten.stationName, ergebnis.station),
 *       die ohne erkennbaren t()/stationsLabel()/uebersetze()-Aufruf direkt
 *       einer .textContent-Zuweisung zugeführt werden – das ist GENAU das
 *       strukturelle Muster, an dem die Stationsnamen/"Your station: …" an
 *       der zentralen Übersetzungstabelle vorbeilaufen (siehe Root-Cause-
 *       Analyse). Diese Prüfung ist rein strukturell und braucht keine
 *       Wortliste – sie erfasst auch KÜNFTIGE, heute unbekannte Fälle
 *       desselben Musters automatisch.
 *
 *   (B) Literale String-Zuweisungen an .textContent, die ein bekanntes
 *       deutsches Wort enthalten, außerhalb von t()/uebersetze()-Aufrufen
 *       und außerhalb der Übersetzungstabellen-Dateien selbst.
 *
 * EHRLICHE EINSCHRÄNKUNG (bereits in der Analyse-Spec, Option B1, benannt):
 * Prüfung (B) ist eine wortlisten-basierte Heuristik – sie erkennt nur
 * Wörter, die in WORTLISTE unten stehen. Ein komplett neues deutsches Wort
 * ohne Umlaute/ß, das nicht in der Liste steht, würde sie NICHT automatisch
 * finden. Prüfung (A) hat diese Einschränkung nicht (sie ist strukturell),
 * deckt aber nur den "roher Feldwert statt Übersetzung"-Fehlerfall ab, nicht
 * jede Art von hartcodiertem Text. Die Kombination beider Prüfungen plus der
 * dokumentierte Chrome-Live-Check (Option B3) ist die in der Spec
 * empfohlene, von Stephan freigegebene Absicherung – kein Anspruch auf
 * hundertprozentige Vollständigkeit einer rein statischen Quelltext-Prüfung.
 *
 * Framework: Jest + Node "fs" (kein DOM/jsdom im Projekt, siehe package.json).
 */

const fs = require('fs');
const path = require('path');

const DATEIEN = [
  path.join(__dirname, '..', 'public', 'spiel.html'),
  path.join(__dirname, '..', 'public', 'index.html'),
];

function leseDatei(p) {
  return fs.readFileSync(p, 'utf8');
}

// ---------------------------------------------------------------------------
// Prüfung (A): rohe Objekt-Feld-Konkatenation ohne Übersetzungsaufruf.
// ---------------------------------------------------------------------------
const ROHDATEN_BEZEICHNER = ['daten', 'ergebnis', 'teilnehmerDaten', 'vorhandeneDaten'];
const UEBERSETZUNGS_AUFRUF_MUSTER = /\b(t|stationsLabel|uebersetze|rollenLabel)\s*\(/;

function findeRoheFeldKonkatenationen(inhalt) {
  const treffer = [];
  const zuweisungsMuster = /[a-zA-Z0-9_.]+\.textContent\s*=\s*[\s\S]{0,220}?;/g;
  let m = zuweisungsMuster.exec(inhalt);
  while (m) {
    const zeile = m[0];
    const enthaeltRohesFeld = ROHDATEN_BEZEICHNER.some((bez) => new RegExp(`\\b${bez}\\.[a-zA-Z]+\\b`).test(zeile));
    const enthaeltUebersetzung = UEBERSETZUNGS_AUFRUF_MUSTER.test(zeile);
    if (enthaeltRohesFeld && !enthaeltUebersetzung) {
      treffer.push(zeile.trim());
    }
    m = zuweisungsMuster.exec(inhalt);
  }
  return treffer;
}

describe('AK 8 / Prüfung (A) – Strukturell: kein roher Objekt-Feld-Wert wird ohne Übersetzungsaufruf direkt einer .textContent-Zuweisung zugeführt', () => {
  DATEIEN.forEach((dateiPfad) => {
    const dateiName = path.basename(dateiPfad);
    test(`Szenario: Gegeben ${dateiName}, wenn alle .textContent-Zuweisungen gescannt werden, dann taucht KEINE rohe daten.*/ergebnis.*-Feldkonkatenation ohne t()/stationsLabel()/uebersetze()-Aufruf mehr auf`, () => {
      const inhalt = leseDatei(dateiPfad);
      const treffer = findeRoheFeldKonkatenationen(inhalt);
      // Aktuell (Bug, vor der Implementierung): mindestens die bekannten
      // Stationsnamen-Stellen (renderTeilnehmerListe, lobbyEigeneStation)
      // tauchen hier auf – macht diesen Test in spiel.html erwartungsgemäß rot.
      expect(treffer).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Prüfung (B): wortlisten-basierte Suche nach hartcodierten deutschen
// String-Literalen in .textContent-Zuweisungen.
// ---------------------------------------------------------------------------
const DEUTSCHE_WORTLISTE = [
  'Karte', 'Lädt', 'Sprache', 'wählen', 'Spiel-Räume', 'Fehlversuche',
  'Wareneingang', 'Kommissionierung', 'Packstation', 'Versand', 'Qualitätskontrolle',
];

function findeHartcodierteDeutscheLiterale(inhalt) {
  const treffer = [];
  const literalMuster = /\.textContent\s*=\s*'([^']*)'/g;
  let m = literalMuster.exec(inhalt);
  while (m) {
    const text = m[1];
    const enthaeltDeutschesWort = DEUTSCHE_WORTLISTE.some((wort) => text.includes(wort));
    if (enthaeltDeutschesWort) {
      treffer.push(m[0]);
    }
    m = literalMuster.exec(inhalt);
  }
  return treffer;
}

describe('AK 8 / Prüfung (B) – Wortlisten-Heuristik: kein bekanntes deutsches Wort steckt mehr in einem literalen .textContent-String (außerhalb von t()-Aufrufen)', () => {
  DATEIEN.forEach((dateiPfad) => {
    const dateiName = path.basename(dateiPfad);
    test(`Szenario: Gegeben ${dateiName}, wenn alle literalen .textContent = '...'-Zuweisungen gescannt werden, dann enthält keine davon mehr ein Wort aus der deutschen Wortliste`, () => {
      const inhalt = leseDatei(dateiPfad);
      const treffer = findeHartcodierteDeutscheLiterale(inhalt);
      // Aktuell (Bug): z. B. "Karte " + kartenNr + " von 6" bzw. verwandte
      // Stellen tauchen hier auf – macht diesen Test erwartungsgemäß rot.
      expect(treffer).toEqual([]);
    });
  });

  test('Szenario: Gegeben der HTML-Anfangsinhalt (vor jeder JS-Ausführung), wenn spiel.html nach den bekannten hartcodierten deutschen Anfangstexten durchsucht wird, dann sind sie nicht mehr vorhanden ("Lädt…", "Spiel-Räume" als Element-Startinhalt)', () => {
    const inhalt = leseDatei(path.join(__dirname, '..', 'public', 'spiel.html'));
    expect(inhalt).not.toMatch(/>Lädt…</);
    expect(inhalt).not.toMatch(/id="spiel-kicker">Spiel-Räume</);
  });
});

// ---------------------------------------------------------------------------
// Selbsttest des Scanners: die Erkennungslogik selbst muss nachweislich
// funktionieren (nicht nur zufällig grün sein, weil die Muster nie greifen).
// ---------------------------------------------------------------------------
describe('Selbsttest: die Scan-Funktionen selbst erkennen ein konstruiertes Beispiel zuverlässig', () => {
  test('findeRoheFeldKonkatenationen erkennt ein konstruiertes Negativbeispiel und ignoriert ein konstruiertes Positivbeispiel', () => {
    const schlecht = "name.textContent = daten.anzeigename + (x ? ' - ' + daten.stationName : '');";
    const gut = "name.textContent = daten.anzeigename + (x ? ' - ' + stationsLabel(daten.station) : '');";
    expect(findeRoheFeldKonkatenationen(schlecht).length).toBeGreaterThan(0);
    expect(findeRoheFeldKonkatenationen(gut).length).toBe(0);
  });

  test('findeHartcodierteDeutscheLiterale erkennt ein konstruiertes Negativbeispiel und ignoriert ein konstruiertes Positivbeispiel', () => {
    const schlecht = "label.textContent = 'Karte ' + n;";
    const gut = "label.textContent = t('rundeVier.kartenPosition', { n });";
    expect(findeHartcodierteDeutscheLiterale(schlecht).length).toBeGreaterThan(0);
    expect(findeHartcodierteDeutscheLiterale(gut).length).toBe(0);
  });
});
