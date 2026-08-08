/**
 * BUGFIX-001 – Beitritt schlägt auf frischem Gerät fehl ("client is offline")
 * BDD-Tests (flow-game-bdd, 2026-07-21) für Pre-Mortem-Risiko 4 (Inkonsistenz
 * zwischen den zwei manuell synchron gehaltenen Dateikopien) und den vierten
 * Scope-Punkt aus der freigegebenen Spec ("### BUGFIX-001", geklärte Frage 2):
 * pruefeStationsVerfuegbarkeit() in public/spiel.html.
 *
 * GESCHÄRFT (BUGFIX-014, flow-game-bdd, 2026-08-08, Implementierungsoption
 * Teil 2 / Option A): Die drei describe-Blöcke für joinGame.js/
 * teilnehmerSession.js/createGame.js prüften bislang NUR einen reinen
 * Rohtext-Zähler (Vorkommen von "client is offline" im gesamten
 * Dateiinhalt inkl. Kopfkommentar). BUGFIX-014 hat gezeigt, dass ein
 * faktisch falscher Kopfkommentar, der einen Fix nur BEHAUPTET, für dieses
 * Test-Design bereits ausreichte, um grün zu bleiben, obwohl
 * `mitVerbindungsRetry()` im Funktionskörper der Browser-Kopie von
 * createGame.js nirgends tatsächlich aufgerufen wurde (0 echte Aufrufe vs.
 * 1 in der Node-Referenz). Die drei Blöcke prüfen deshalb jetzt stattdessen:
 * Kommentare (Block- `/* *\/` und Zeilenkommentare `//`) werden aus dem
 * Dateiinhalt zuerst entfernt, danach wird gezählt, wie oft
 * `mitVerbindungsRetry(` als ECHTER Funktionsaufruf im verbleibenden Code
 * vorkommt. Dieser Zähler muss zwischen Node- und Browser-Kopie
 * übereinstimmen UND größer als 0 sein - ein bloßer Kommentar reicht dafür
 * nicht mehr aus, und ein künftiges versehentliches Entfernen eines echten
 * Aufrufs (z. B. Copy-Paste-Fehler, siehe Backlog.md Brainstorming-Beispiel
 * 3) würde diesen Test jetzt sofort rot werden lassen.
 *
 * Die Kommentar-Entfernung ist bewusst einfach gehalten (kein vollständiger
 * JS-Parser/Tokenizer) - für dieses Projekt ausreichend, da keine der
 * geprüften Dateien String-Literale mit "//" oder "/*" enthält, die
 * fälschlich als Kommentarstart erkannt würden (verifiziert per grep gegen
 * alle sechs betroffenen Dateien, keine Treffer für "http://"/"https://").
 * Dieselbe Grundtechnik (Funktionskörper-/Code-Extraktion statt reinem
 * Volltext-Scan) ist im Projekt bereits an anderer Stelle bewährt (siehe
 * tests/game-round4-bearbeitungszeit.static.test.js, dort Ausschluss reiner
 * Kommentar-Erwähnungen durch Verlangen eines unmittelbar vorangehenden
 * Punkts).
 */

const fs = require('fs');
const path = require('path');

const VERBINDUNGSFEHLER_MUSTER = /client is offline/i;

function leseDatei(relativerPfad) {
  return fs.readFileSync(path.join(__dirname, '..', relativerPfad), 'utf8');
}

/**
 * Entfernt Block- (/* ... *\/) und Zeilenkommentare (// ...) aus JS-Quelltext,
 * damit eine reine Kommentar-Erwähnung von "mitVerbindungsRetry(" (z. B. in
 * einem Kopfkommentar, der einen Fix nur behauptet) nicht als echter Aufruf
 * mitgezählt wird.
 */
function entferneKommentare(quelltext) {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function zaehleEchteMitVerbindungsRetryAufrufe(inhalt) {
  const kommentarbereinigt = entferneKommentare(inhalt);
  const treffer = kommentarbereinigt.match(/mitVerbindungsRetry\(/g);
  return treffer ? treffer.length : 0;
}

function pruefeEchtenAufrufAbgleich(nodePfad, browserPfad) {
  const nodeKopie = leseDatei(nodePfad);
  const browserKopie = leseDatei(browserPfad);

  const treffNode = zaehleEchteMitVerbindungsRetryAufrufe(nodeKopie);
  const trefferBrowser = zaehleEchteMitVerbindungsRetryAufrufe(browserKopie);

  expect(treffNode).toBeGreaterThan(0);
  expect(trefferBrowser).toBeGreaterThan(0);
  expect(trefferBrowser).toBe(treffNode);
}

describe('Szenario: joinGame.js – beide Dateikopien rufen mitVerbindungsRetry() tatsächlich im Code auf, nicht nur im Kommentar (AK5, geschärfter Duplikat-Check)', () => {
  test('Gegeben src/game/joinGame.js und public/js/game/joinGame.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien nach Entfernen aller Kommentare auf echte mitVerbindungsRetry(-Aufrufe geprüft werden, dann rufen beide ihn mindestens einmal und in gleicher Häufigkeit tatsächlich auf', () => {
    pruefeEchtenAufrufAbgleich('src/game/joinGame.js', 'public/js/game/joinGame.js');
  });
});

describe('Szenario: teilnehmerSession.js – beide Dateikopien rufen mitVerbindungsRetry() tatsächlich im Code auf, nicht nur im Kommentar (AK4, AK5, geschärfter Duplikat-Check)', () => {
  test('Gegeben src/game/teilnehmerSession.js und public/js/game/teilnehmerSession.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien nach Entfernen aller Kommentare auf echte mitVerbindungsRetry(-Aufrufe geprüft werden, dann rufen beide ihn mindestens einmal und in gleicher Häufigkeit tatsächlich auf', () => {
    pruefeEchtenAufrufAbgleich('src/game/teilnehmerSession.js', 'public/js/game/teilnehmerSession.js');
  });
});

describe('Szenario: createGame.js – beide Dateikopien rufen mitVerbindungsRetry() tatsächlich im Code auf, nicht nur im Kommentar (AK5, schließt den BUGFIX-014-Bug)', () => {
  test('Gegeben src/game/createGame.js und public/js/game/createGame.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien nach Entfernen aller Kommentare auf echte mitVerbindungsRetry(-Aufrufe geprüft werden, dann rufen beide ihn mindestens einmal und in gleicher Häufigkeit tatsächlich auf - ein Kopfkommentar, der den Fix nur behauptet (wie im BUGFIX-014-Ausgangszustand), reicht dafür nicht mehr aus', () => {
    pruefeEchtenAufrufAbgleich('src/game/createGame.js', 'public/js/game/createGame.js');
  });
});

describe('Szenario: pruefeStationsVerfuegbarkeit() behandelt den Verbindungsfehler nicht mehr still (AK3, AK6, geklärte Frage 2)', () => {
  test('Gegeben pruefeStationsVerfuegbarkeit() existiert bereits in public/spiel.html mit einem stillen Fallback für JEDEN Lesefehler, wenn der Quelltext dieser Funktion geprüft wird, dann referenziert er die Verbindungsfehler-Erkennung, statt jeden Fehler (auch einen bloßen Verbindungsaufbau) unterschiedslos still mit "rollenFeld.hidden = true" zu behandeln', () => {
    const spielHtml = leseDatei('public/spiel.html');

    const funktionsStart = spielHtml.indexOf('async function pruefeStationsVerfuegbarkeit()');
    expect(funktionsStart).toBeGreaterThan(-1); // die bekannte Funktion muss weiterhin existieren

    // Funktionskörper grob abgrenzen: bis zum nächsten "beitrittCodeInput.addEventListener"
    // danach (dem bekannten Aufrufer direkt im Anschluss an die Funktion).
    const naechsterAnker = spielHtml.indexOf('beitrittCodeInput.addEventListener', funktionsStart);
    const funktionsKoerper = spielHtml.slice(funktionsStart, naechsterAnker > -1 ? naechsterAnker : funktionsStart + 1500);

    expect(VERBINDUNGSFEHLER_MUSTER.test(funktionsKoerper)).toBe(true);
  });
});
