/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Regressionstest TASK-001: Hosting/Deploy-Pipeline darf durch neue Seitenbereiche/
 * Dateien aus FEATURE-001 nicht brechen.
 *
 * Dieser Test läuft NICHT gegen den Emulator, sondern gegen die echte Live-URL
 * nach einem tatsächlichen Deploy (also erst sinnvoll auszuführen, nachdem
 * Stephan den FEATURE-001-Code gepusht hat und die GitHub Action durchgelaufen ist).
 *
 * Framework: Jest (nutzt globales fetch, Node 18+).
 */

const LIVE_URL = 'https://flow-game-19f01.web.app';

describe('Regressionstest TASK-001: Live-URL bleibt nach FEATURE-001-Deploy erreichbar', () => {
  test('Gegeben ein erfolgter Deploy von FEATURE-001, wenn die Live-URL aufgerufen wird, dann antwortet sie mit Status 200', async () => {
    const antwort = await fetch(LIVE_URL);
    expect(antwort.status).toBe(200);
  });
});

/**
 * Regressionstest TASK-001 (GitHub-Actions-Teil): kein automatisierter Jest-Test,
 * sondern wie bei TASK-002 ein manueller Prüfschritt nach dem Push auf `main`:
 *
 * Szenario: GitHub-Actions-Deploy bleibt nach FEATURE-001-Änderung erfolgreich
 *   Gegeben FEATURE-001-Code (neue Seitenbereiche, ggf. firestore.indexes.json) ist auf `main` gepusht,
 *   wenn der Workflow "Deploy to Firebase Hosting on merge" automatisch startet,
 *   dann zeigt der GitHub-Actions-Lauf zum Commit Status "Success" (wie bei TASK-002, Commit dbac723).
 *
 * Manuell zu prüfen von Stephan im GitHub-Actions-Tab nach dem Push, analog zu TASK-001/TASK-002.
 */
