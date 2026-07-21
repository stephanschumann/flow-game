/**
 * BUGFIX-001 – Beitritt schlägt auf frischem Gerät fehl ("client is offline")
 *
 * Reine Funktionslogik, kein eigener Firestore-Zugriff (analog zum Muster in
 * src/game/verbindungsStatus.js): kapselt die Erkennung des bekannten,
 * transienten Firestore-Verbindungsfehlers ("Failed to get document because
 * the client is offline.", u. a. dokumentiert in firebase/firebase-js-sdk#5836)
 * sowie einen generischen Wiederholungs-Wrapper dafür.
 *
 * Ursache/Hintergrund (siehe Backlog.md "### BUGFIX-001", Analyse-Spec
 * 2026-07-21): Auf einem frischen Gerät ohne bestehenden Firestore-Cache kann
 * das erste `.get()`/`tx.get()` unmittelbar nach `signInAnonymously()`
 * fehlschlagen, weil die Serververbindung noch nicht steht. Weder ein reiner
 * Cache-Ansatz (`enablePersistence()`) noch eine pauschale Wartezeit vor dem
 * ersten Lesevorgang lösen das zuverlässig (siehe Implementierungsoptionen in
 * der Spec) – die gezielte Wiederholung genau bei diesem Fehlerbild ist der
 * gewählte Ansatz (Option A).
 *
 * istTransienterVerbindungsFehler(err) – Pre-Mortem-Risiko 6: Erkennung NICHT
 * nur über den Fehlertext, sondern zusätzlich über den vom Firestore-SDK ggf.
 * mitgelieferten Fehlercode ('unavailable'/'deadline-exceeded'), damit eine
 * künftig leicht geänderte SDK-Formulierung die Erkennung nicht ins Leere
 * laufen lässt. Jeder andere (fachliche) Fehler – ungültiger Code, ungültige
 * Rolle, Stationen belegt, Spiel inaktiv – gilt ausdrücklich NICHT als
 * transienter Verbindungsfehler und wird von mitVerbindungsRetry() sofort,
 * ohne jede Verzögerung, durchgereicht (Pre-Mortem-Risiko 7).
 *
 * mitVerbindungsRetry(aufgabe, optionen) – Pre-Mortem-Risiko 1: feste
 * Obergrenze an Versuchen (Default 4) mit wachsender Wartezeit dazwischen
 * (Default-Basis 400ms, linear wachsend: 400ms, 800ms, 1200ms), danach wird
 * der zuletzt aufgetretene Fehler unverändert erneut geworfen – kein
 * endloses Warten, kein stilles Hängenbleiben bei einem wirklich offline
 * befindlichen Gerät. `optionen.onRetry(naechsterVersuchNummer)` wird vor
 * jedem weiteren Versuch aufgerufen (Pre-Mortem-Risiko 3: Grundlage für eine
 * sichtbare Zwischenmeldung am Formular, siehe public/spiel.html).
 *
 * Sicherheitsaspekt (Pre-Mortem-Risiko 2, Idempotenz-Bugfix vom 2026-07-20 in
 * joinGame.js): Es wird ausschließlich ein tatsächlich fehlgeschlagenes
 * (rejected) Promise erneut versucht, nie "zur Sicherheit" bei unklarem
 * Ausgang. Ein Firestore-`runTransaction()`-Aufruf committet seine
 * Schreibvorgänge grundsätzlich erst ganz am Ende, atomar – schlägt ein
 * `tx.get()` darin fehl, wurde noch NICHTS geschrieben, ein erneuter voller
 * Transaktionsversuch ist deshalb unbedenklich und wird zusätzlich durch die
 * bestehende Idempotenz-Prüfung in joinGame() abgesichert (gleiche uid bekommt
 * ihre bereits vergebene Station zurück, keine doppelte Vergabe).
 *
 * WICHTIG: Diese Datei muss inhaltlich synchron gehalten werden mit der
 * Browser-Kopie public/js/game/verbindungsRetry.js (Projekt-Konvention, kein
 * Bundler – siehe joinGame.js/verbindungsStatus.js).
 */

const TRANSIENTE_FEHLERCODES = ['unavailable', 'deadline-exceeded'];
const TRANSIENTER_FEHLERTEXT_MUSTER = /client is offline/i;

const STANDARD_MAX_VERSUCHE = 4;
const STANDARD_BASIS_WARTEZEIT_MS = 400;

function istTransienterVerbindungsFehler(err) {
  if (!err) return false;
  if (err.code && TRANSIENTE_FEHLERCODES.includes(err.code)) {
    return true;
  }
  return typeof err.message === 'string' && TRANSIENTER_FEHLERTEXT_MUSTER.test(err.message);
}

function warte(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function mitVerbindungsRetry(aufgabe, optionen = {}) {
  const maxVersuche = optionen.maxVersuche || STANDARD_MAX_VERSUCHE;
  const basisWartezeitMs = optionen.basisWartezeitMs != null
    ? optionen.basisWartezeitMs
    : STANDARD_BASIS_WARTEZEIT_MS;
  const onRetry = typeof optionen.onRetry === 'function' ? optionen.onRetry : null;

  let versuch = 0;
  for (;;) {
    versuch += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      return await aufgabe();
    } catch (err) {
      if (!istTransienterVerbindungsFehler(err) || versuch >= maxVersuche) {
        throw err;
      }
      if (onRetry) {
        onRetry(versuch + 1);
      }
      // eslint-disable-next-line no-await-in-loop
      await warte(basisWartezeitMs * versuch);
    }
  }
}

module.exports = { mitVerbindungsRetry, istTransienterVerbindungsFehler };
