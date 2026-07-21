/**
 * BUGFIX-001 – Beitritt schlägt auf frischem Gerät fehl ("client is offline")
 * BDD-Tests (flow-game-bdd, 2026-07-21) für den Kern-Mechanismus aus der
 * freigegebenen Spec in Backlog.md ("### BUGFIX-001"): Akzeptanzkriterien
 * 1-3 und 6 sowie Pre-Mortem-Risiken 1, 3, 6 und 7.
 *
 * WICHTIG – bewusst RED, keine Implementierung vorhanden: Diese Datei ruft
 * `src/game/verbindungsRetry.js` auf. Dieses Modul existiert noch NICHT –
 * das ist beabsichtigt (Red im Red-Green-Refactor-Sinn, siehe
 * flow-game-bdd-Skill Schritt 5). Der erwartete Fehlschlag ist
 * "Cannot find module '../src/game/verbindungsRetry'", NICHT ein Syntax-
 * oder Emulator-Setup-Fehler.
 *
 * Erwartete API (Vorschlag, reine Funktionslogik ohne eigenen Firestore-
 * Zugriff – analog zum bestehenden Vorschlags-Muster in
 * src/game/verbindungsStatus.js, finale Signatur entscheidet flow-game-impl):
 *
 *   istTransienterVerbindungsFehler(err)
 *     -> true, wenn err das bekannte, in Backlog.md Zeile 16/23 dokumentierte
 *        Fehlerbild ist ("Failed to get document because the client is
 *        offline."), erkannt sowohl über den Fehlertext ALS AUCH über einen
 *        vom SDK ggf. mitgelieferten Fehlercode (z. B. err.code === 'unavailable'
 *        oder 'deadline-exceeded') – Pre-Mortem-Risiko 6: kein reines
 *        Text-Matching, damit eine künftig leicht geänderte SDK-Formulierung
 *        die Erkennung nicht ins Leere laufen lässt.
 *
 *   mitVerbindungsRetry(aufgabe, optionen)
 *     -> führt die übergebene async-Funktion `aufgabe` aus. Schlägt sie mit
 *        genau diesem transienten Verbindungsfehler fehl, wird nach kurzer,
 *        wachsender Wartezeit automatisch erneut versucht, bis zu
 *        `optionen.maxVersuche` (Default eine kleine, feste Zahl > 1) –
 *        Pre-Mortem-Risiko 1: danach wird der letzte Fehler unverändert
 *        durchgereicht, KEIN endloses Warten. Jeder ANDERE (nicht-transiente)
 *        Fehler wird sofort, ohne jede Wartezeit, durchgereicht (Pre-Mortem-
 *        Risiko 7: reguläre Fehlerfälle dürfen nicht verzögert werden).
 *        `optionen.onRetry(naechsterVersuchNummer)` wird vor jedem weiteren
 *        Versuch aufgerufen (Pre-Mortem-Risiko 3: Grundlage für eine
 *        sichtbare Zwischenmeldung am Formular, siehe Testplan-Grundgerüst
 *        "Retry-Erfolgstest"/AK3).
 *
 * Framework: Jest, reine Funktionslogik – kein Firestore-Emulator nötig,
 * läuft daher unabhängig von der Netzwerksperre der Arbeitsumgebung (siehe
 * Arbeitsweise-Erkenntnis in FEATURE-002/FEATURE-004).
 */

// Bewusst RED: dieses Modul existiert noch nicht (siehe Kommentar oben).
const { mitVerbindungsRetry, istTransienterVerbindungsFehler } = require('../src/game/verbindungsRetry');

function verbindungsFehler() {
  const err = new Error('Failed to get document because the client is offline.');
  err.code = 'unavailable';
  return err;
}

function regulaererFehler() {
  return new Error('Ungültiger oder unbekannter Code.');
}

describe('Szenario: Erkennung des transienten Verbindungsfehlers (Pre-Mortem-Risiko 6)', () => {
  test('Gegeben ein Fehler mit dem bekannten Text "client is offline" und Fehlercode "unavailable", wenn er geprüft wird, dann gilt er als transienter Verbindungsfehler', () => {
    expect(istTransienterVerbindungsFehler(verbindungsFehler())).toBe(true);
  });

  test('Gegeben ein Fehler ohne den bekannten Text, aber mit Fehlercode "deadline-exceeded", wenn er geprüft wird, dann gilt er ebenfalls als transienter Verbindungsfehler (Erkennung nicht nur über Text)', () => {
    const err = new Error('Etwas anderes ist schiefgelaufen.');
    err.code = 'deadline-exceeded';
    expect(istTransienterVerbindungsFehler(err)).toBe(true);
  });

  test('Gegeben ein Fehler mit dem bekannten Text, aber ohne mitgeliefertem Fehlercode, wenn er geprüft wird, dann gilt er trotzdem als transienter Verbindungsfehler (Text-Erkennung bleibt als Fallback bestehen)', () => {
    const err = new Error('Failed to get document because the client is offline.');
    expect(istTransienterVerbindungsFehler(err)).toBe(true);
  });

  test('Gegeben ein regulärer, fachlicher Fehler (z. B. ungültiger Code), wenn er geprüft wird, dann gilt er NICHT als transienter Verbindungsfehler', () => {
    expect(istTransienterVerbindungsFehler(regulaererFehler())).toBe(false);
  });

  test('Gegeben kein Fehlerobjekt (undefined/null), wenn geprüft wird, dann gilt das nicht als transienter Verbindungsfehler (keine Ausnahme, sauberes false)', () => {
    expect(istTransienterVerbindungsFehler(undefined)).toBe(false);
    expect(istTransienterVerbindungsFehler(null)).toBe(false);
  });
});

describe('Szenario: Retry-Erfolgstest (AK1, Testplan-Grundgerüst)', () => {
  test('Gegeben ein Aufruf schlägt beim ersten Versuch mit dem bekannten Verbindungsfehler fehl und beim zweiten Versuch ist er erfolgreich, wenn mitVerbindungsRetry ausgeführt wird, dann gelingt der Aufruf ohne sichtbaren Fehler und die Aufgabe wurde genau zweimal aufgerufen', async () => {
    let versuche = 0;
    const aufgabe = jest.fn(async () => {
      versuche += 1;
      if (versuche === 1) throw verbindungsFehler();
      return { ok: true };
    });

    const ergebnis = await mitVerbindungsRetry(aufgabe, { maxVersuche: 3, basisWartezeitMs: 5 });

    expect(ergebnis).toEqual({ ok: true });
    expect(aufgabe).toHaveBeenCalledTimes(2);
  });
});

describe('Szenario: Sichtbare Zwischenmeldung während der Wiederholungsversuche (AK3, Pre-Mortem-Risiko 3)', () => {
  test('Gegeben ein Aufruf schlägt zweimal mit dem Verbindungsfehler fehl und gelingt erst beim dritten Versuch, wenn mitVerbindungsRetry mit einem onRetry-Callback ausgeführt wird, dann wird onRetry vor jedem weiteren Versuch aufgerufen, statt dass die Wartezeit still verstreicht', async () => {
    let versuche = 0;
    const aufgabe = jest.fn(async () => {
      versuche += 1;
      if (versuche < 3) throw verbindungsFehler();
      return 'erfolgreich';
    });
    const onRetry = jest.fn();

    const ergebnis = await mitVerbindungsRetry(aufgabe, { maxVersuche: 4, basisWartezeitMs: 5, onRetry });

    expect(ergebnis).toBe('erfolgreich');
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

describe('Szenario: Echte Offline-Situation erreicht die Obergrenze (AK2, Pre-Mortem-Risiko 1)', () => {
  test('Gegeben jeder Versuch schlägt mit demselben Verbindungsfehler fehl, wenn mitVerbindungsRetry mit einer kleinen Obergrenze ausgeführt wird, dann wird nach genau dieser Obergrenze an Versuchen die reguläre, verständliche Fehlermeldung erneut geworfen – kein endloses Warten, kein Hängenbleiben', async () => {
    const aufgabe = jest.fn(async () => {
      throw verbindungsFehler();
    });

    await expect(
      mitVerbindungsRetry(aufgabe, { maxVersuche: 3, basisWartezeitMs: 5 })
    ).rejects.toThrow(/client is offline/i);

    // Genau die konfigurierte Obergrenze an Versuchen, nicht mehr und nicht
    // unbegrenzt (Pre-Mortem-Risiko 1).
    expect(aufgabe).toHaveBeenCalledTimes(3);
  });
});

describe('Szenario: Regulärer, nicht-verbindungsbedingter Fehler wird sofort durchgereicht (AK6, Pre-Mortem-Risiko 7)', () => {
  test('Gegeben der erste Versuch schlägt mit einem regulären fachlichen Fehler fehl (z. B. ungültiger Code), wenn mitVerbindungsRetry ausgeführt wird, dann wird sofort dieser Fehler durchgereicht, ohne jeden weiteren Versuch und ohne Wartezeit', async () => {
    const aufgabe = jest.fn(async () => {
      throw regulaererFehler();
    });
    const onRetry = jest.fn();

    await expect(
      mitVerbindungsRetry(aufgabe, { maxVersuche: 5, basisWartezeitMs: 50, onRetry })
    ).rejects.toThrow('Ungültiger oder unbekannter Code.');

    expect(aufgabe).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
