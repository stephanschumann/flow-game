/**
 * BUGFIX-001 – Beitritt schlägt auf frischem Gerät fehl ("client is offline")
 * BDD-Tests (flow-game-bdd, 2026-07-21) für Pre-Mortem-Risiko 4 (Inkonsistenz
 * zwischen den zwei manuell synchron gehaltenen Dateikopien) und den vierten
 * Scope-Punkt aus der freigegebenen Spec ("### BUGFIX-001", geklärte Frage 2):
 * pruefeStationsVerfuegbarkeit() in public/spiel.html.
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – sie
 * liest die echten, existierenden Quelltexte und prüft per Mustersuche
 * (gleiches Vorgehen wie tests/game-a11y-static.test.js), ob die geforderte
 * Verbindungsfehler-Erkennung bereits vorhanden ist. Bewusst grob
 * (Textmuster, kein AST-Parsing), reicht aber aus, um "noch nicht ergänzt"
 * (heutiger Stand) von "wurde ergänzt" zu unterscheiden.
 *
 * WICHTIG – bewusst RED: Alle Prüfungen schlagen JETZT tatsächlich fehl
 * (echte Assertion-Fehlschläge, kein Modul-/Syntaxfehler), weil keine der
 * vier Fundstellen aus dem Scope heute bereits eine erkennbare Behandlung
 * des bekannten Verbindungsfehlers ("client is offline") enthält.
 *
 * Erkennungsmuster (siehe tests/game-connection-retry.logic.test.js für die
 * vorgeschlagene API): Es wird nach dem Text "client is offline" (case-
 * insensitive) gesucht, den sowohl die Fehlererkennung (istTransienterVerbindungsFehler)
 * als auch – naheliegenderweise – ein Kommentar an der jeweiligen Einsatzstelle
 * enthalten dürfte. Das ist bewusst kein Test auf eine exakte Funktions-
 * signatur, sondern auf das Vorhandensein derselben, wiedererkennbaren
 * Fehlerbehandlung an allen vier Fundstellen (Pre-Mortem-Risiko 4).
 */

const fs = require('fs');
const path = require('path');

const VERBINDUNGSFEHLER_MUSTER = /client is offline/i;

function leseDatei(relativerPfad) {
  return fs.readFileSync(path.join(__dirname, '..', relativerPfad), 'utf8');
}

function zaehleTreffer(inhalt) {
  const treffer = inhalt.match(/client is offline/gi);
  return treffer ? treffer.length : 0;
}

describe('Szenario: joinGame.js – beide Dateikopien behandeln den Verbindungsfehler gleichermaßen (Pre-Mortem-Risiko 4)', () => {
  test('Gegeben src/game/joinGame.js und public/js/game/joinGame.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien auf die Verbindungsfehler-Erkennung geprüft werden, dann referenzieren beide sie mindestens einmal und in gleicher Häufigkeit', () => {
    const nodeKopie = leseDatei('src/game/joinGame.js');
    const browserKopie = leseDatei('public/js/game/joinGame.js');

    const treffNode = zaehleTreffer(nodeKopie);
    const trefferBrowser = zaehleTreffer(browserKopie);

    expect(treffNode).toBeGreaterThan(0);
    expect(trefferBrowser).toBe(treffNode);
  });
});

describe('Szenario: teilnehmerSession.js – beide Dateikopien behandeln den Verbindungsfehler gleichermaßen (Pre-Mortem-Risiko 4, AK4)', () => {
  test('Gegeben src/game/teilnehmerSession.js und public/js/game/teilnehmerSession.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien auf die Verbindungsfehler-Erkennung geprüft werden, dann referenzieren beide sie mindestens einmal und in gleicher Häufigkeit', () => {
    const nodeKopie = leseDatei('src/game/teilnehmerSession.js');
    const browserKopie = leseDatei('public/js/game/teilnehmerSession.js');

    const treffNode = zaehleTreffer(nodeKopie);
    const trefferBrowser = zaehleTreffer(browserKopie);

    expect(treffNode).toBeGreaterThan(0);
    expect(trefferBrowser).toBe(treffNode);
  });
});

describe('Szenario: createGame.js – beide Dateikopien behandeln den Verbindungsfehler gleichermaßen (Pre-Mortem-Risiko 4, AK7)', () => {
  test('Gegeben src/game/createGame.js und public/js/game/createGame.js müssen inhaltlich synchron gehalten werden, wenn beide Kopien auf die Verbindungsfehler-Erkennung geprüft werden, dann referenzieren beide sie mindestens einmal und in gleicher Häufigkeit', () => {
    const nodeKopie = leseDatei('src/game/createGame.js');
    const browserKopie = leseDatei('public/js/game/createGame.js');

    const treffNode = zaehleTreffer(nodeKopie);
    const trefferBrowser = zaehleTreffer(browserKopie);

    expect(treffNode).toBeGreaterThan(0);
    expect(trefferBrowser).toBe(treffNode);
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
