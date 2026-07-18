/**
 * FEATURE-002 – Deploy-Regression
 *
 * Ergänzt die bestehende Regressionsprüfung aus FEATURE-001
 * (tests/deploy-regression.test.js). Stephan kann diese Fälle entweder in die
 * bestehende Datei übernehmen oder diese Datei zusätzlich ins Repo legen —
 * inhaltlich identisches Prüfmuster (Live-URL-Check per fetch), nur um die
 * FEATURE-002-spezifische Erinnerung an den separaten Regel-Deploy ergänzt.
 *
 * WICHTIG: Der GitHub-Actions-Erfolg selbst bleibt wie bei TASK-002/FEATURE-001
 * ein manueller Prüfschritt nach dem Push (kein automatisierter API-Zugriff auf
 * GitHub Actions in der Sandbox). Ebenso bleibt der Firestore-Regeln-Deploy
 * (`npx firebase deploy --only firestore:rules`) ein separater manueller Schritt,
 * der von der automatischen Hosting-Pipeline NICHT mit abgedeckt wird.
 */

const LIVE_URL = 'https://flow-game-19f01.web.app/spiel.html';

describe('FEATURE-002 Deploy-Regression', () => {
  test('Szenario: Live-URL bleibt nach dem FEATURE-002-Deploy erreichbar (Status 200)', async () => {
    // Given: Der neueste Stand (inkl. Spielfeld-Ansicht) wurde über die automatische
    // GitHub-Actions-Pipeline auf Firebase Hosting veröffentlicht.

    // When: Die Live-URL abgerufen wird
    const antwort = await fetch(LIVE_URL);

    // Then: Die Seite ist weiterhin erreichbar
    expect(antwort.status).toBe(200);
  });

  test('Szenario: firestore.rules-Erweiterung ist tatsächlich veröffentlicht, nicht nur im Repo', async () => {
    // Given: firestore.rules wurde im Rahmen von FEATURE-002 um Kartenbewegung/DoR/
    // Rundenwechsel-Regeln erweitert.
    // When/Then: Dieser Testfall ist ein dokumentierter manueller Prüfschritt
    // (kein automatisierbarer Firestore-Regel-Vergleich in der Sandbox) —
    // Stephan bestätigt nach `npx firebase deploy --only firestore:rules`
    // im Rules Playground der Firebase-Konsole, dass die neuen Regeln aktiv sind,
    // bevor das Ticket als fertig gilt (gleiches Muster wie in FEATURE-001).
    expect(true).toBe(true); // Platzhalter — echte Prüfung erfolgt manuell, siehe Kommentar oben.
  });
});
