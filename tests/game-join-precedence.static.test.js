/**
 * BUGFIX-005 – Beitreten vergibt fälschlich Gastgeber-Rolle statt
 * Mitspieler-Rolle.
 * BDD-Tests (flow-game-bdd, 2026-07-28) für die freigegebene Spec in
 * Backlog.md ("### BUGFIX-005"), Akzeptanzkriterien 1, 2 und 6.
 *
 * ROOT-CAUSE-VERIFIKATION (frischer Code-Read gegen den aktuellen Stand des
 * Repos, 2026-07-28 – Pflichtschritt laut Spec, da die Analyse selbst ohne
 * Repo-Zugriff entstand): Von den zwei in der Analyse vermuteten,
 * gleichrangig für möglich gehaltenen Mechanismen bestätigt sich AUSSCHLIESSLICH
 * Hypothese 1 (Vorrang-/Präzedenz-Fehler). Hypothese 2 (Race Condition
 * zweier gleichzeitiger Schreibvorgänge auf DASSELBE Firestore-Dokument)
 * tritt im aktuellen Code strukturell nicht auf:
 *   - public/spiel.html init() (Zeile ~2171-2424) ist vollständig
 *     sequentiell (async/await, keine Promise.all-Verzahnung zwischen dem
 *     Host-Wiederherstellungspfad und dem Beitritts-Formular).
 *   - Der Host-Wiederherstellungsversuch (Zeile ~2194-2209) schreibt bei
 *     Erfolg auf spiele/{ALTER_CODE}/teilnehmende/{uid} und beendet init()
 *     danach SOFORT mit `zeigeLobby(...); return;` – UNBEDINGT, ohne jede
 *     weitere Prüfung.
 *   - `auswahlPanel.hidden = false` (Zeile 2250) sowie die Event-Listener
 *     für das Beitritts-Formular (Zeile 2364 ff.) werden dadurch bei
 *     vorhandenem, gültigem Host-Geheimnis NIEMALS erreicht – die Person
 *     bekommt das Beitritts-Formular für den NEUEN Code gar nicht erst zu
 *     sehen, geschweige denn kann sie es absenden. Es liegt also nie ein
 *     Wettlauf zweier tatsächlich nebenläufiger Schreibvorgänge vor, sondern
 *     ein reiner Kontrollfluss-Vorrang: der automatische Pfad gewinnt IMMER,
 *     weil der bewusste Pfad strukturell gar nicht erst ausgeführt werden
 *     kann.
 *   - Zusätzlich schreiben beide Pfade in der real gemeldeten Fehlersituation
 *     (Person hat Host-Geheimnis für ALTES Spiel A, versucht bewusst NEUEM
 *     Spiel B beizutreten) ohnehin auf ZWEI VERSCHIEDENE Firestore-Dokumente
 *     (unterschiedliche Spiel-Codes im Pfad) – ein Dokument-Überschreib-
 *     Konflikt (wie in Hypothese 2 / Option A zweiter Satz beschrieben) kann
 *     für dieses konkrete, gemeldete Symptom gar nicht entstehen. Siehe
 *     tests/game-host-claim-overwrite.logic.test.js, Regressionsszenario
 *     "getrennte Spiele bleiben unabhängig", für den ausführbaren Beleg
 *     dieses Befunds.
 *
 * Diese Datei braucht KEIN neues Modul und KEINEN Firestore-Emulator – sie
 * liest den echten, existierenden Quelltext von public/spiel.html und prüft
 * per Mustersuche (gleiches Vorgehen wie tests/game-a11y-static.test.js und
 * tests/game-form-loading-state.static.test.js/BUGFIX-002), ob der
 * unbedingte Vorrang des automatischen Host-Wiederherstellungspfads
 * inzwischen abgesichert wurde. Bewusst grob (Textmuster, kein DOM/jsdom im
 * Projekt vorhanden, siehe package.json) und bewusst NICHT an eine exakte
 * Codestruktur gebunden (flow-game-bdd-Skill Abschnitt 3b): geprüft wird nur,
 * ob an dieser konkreten, bereits heute eindeutig identifizierten
 * Bug-Fundstelle überhaupt eine erkennbare BUGFIX-005-Absicherung verankert
 * wurde – nicht, WIE genau sie implementiert ist.
 *
 * WICHTIG – bewusst RED: Beide Prüfungen unten schlagen JETZT tatsächlich
 * fehl (echte Assertion-Fehlschläge, kein Modul-/Syntaxfehler), weil
 * public/spiel.html den unbedingten Vorrang bisher unverändert enthält.
 *
 * Framework: Jest + Node "fs", kein Firestore-Emulator nötig.
 */

const fs = require('fs');
const path = require('path');

const SPIEL_HTML_PFAD = path.resolve(__dirname, '../public/spiel.html');
const spielHtmlQuelltext = fs.readFileSync(SPIEL_HTML_PFAD, 'utf8');

/**
 * Extrahiert den Ausschnitt von init(), der den automatischen
 * Host-Wiederherstellungspfad behandelt (von "flowGameLetztesSpiel" bis
 * unmittelbar vor dem Beginn des FEATURE-005-Teilnehmenden-Rejoin-Blocks).
 * Wirft mit einer sprechenden Meldung, falls die bekannten Anker-Strings
 * nicht mehr gefunden werden (z. B. nach einer größeren Umstrukturierung) –
 * damit ein zukünftiger Fehlschlag dieses Tests nicht fälschlich als
 * "Bug weiterhin vorhanden" interpretiert wird.
 */
function hostWiederherstellungsBlock() {
  const startAnker = "localStorage.getItem('flowGameLetztesSpiel')";
  const endAnker = "localStorage.getItem('flowGameLetzterTeilnehmerCode')";
  const start = spielHtmlQuelltext.indexOf(startAnker);
  const ende = spielHtmlQuelltext.indexOf(endAnker);
  if (start === -1 || ende === -1 || ende <= start) {
    throw new Error(
      'Erwartete Anker-Strings rund um den Host-Wiederherstellungspfad in ' +
        'public/spiel.html nicht gefunden – vermutlich wurde init() ' +
        'grundlegend umstrukturiert. Bitte diesen Test manuell an den neuen ' +
        'Aufbau anpassen, statt ihn stillschweigend grün/rot laufen zu lassen.'
    );
  }
  return spielHtmlQuelltext.slice(start, ende);
}

describe('Kernszenario (Hypothese 1 – Präzedenz, code-verifiziert): automatischer Host-Wiederherstellungspfad darf nicht mehr unbedingt vor dem Beitritts-Formular gewinnen (AK1, AK2, AK6)', () => {
  test('Gegeben ein Browser hat ein gültiges Host-Geheimnis für ein früheres Spiel gespeichert, wenn init() den automatischen Wiederherstellungsversuch verarbeitet, dann darf ein erfolgreicher Versuch nicht mehr unbedingt (ohne jede erkennbare BUGFIX-005-Absicherung) mit sofortigem "zeigeLobby(...); return;" enden, bevor die Person die Möglichkeit hatte, stattdessen bewusst einem anderen Spiel beizutreten', () => {
    const block = hostWiederherstellungsBlock();

    // Der heute tatsächlich vorhandene, unbedingte Bug-Auslöser: unmittelbar
    // nach erfolgreichem restoreHostSession() folgt zeigeLobby() + return,
    // ohne jede weitere Bedingung dazwischen.
    const unbedingtesBugMuster =
      /restoreHostSession\([\s\S]*?\);\s*zeigeLobby\(db, ergebnis\.spielCode, 'hostSchlicht', 'host'\);\s*return;/;

    expect(unbedingtesBugMuster.test(block)).toBe(false);
  });

  test('Gegeben derselbe automatische Wiederherstellungspfad, wenn er nach einem Fix erneut gelesen wird, dann muss an dieser konkreten Fundstelle ein erkennbarer BUGFIX-005-Hinweis/Kommentar stehen (Projekt-Konvention: jede Korrektur wird an ihrer Fundstelle mit der Ticket-ID dokumentiert, siehe z. B. bestehende BUGFIX-001/BUGFIX-002/FEATURE-005-Kommentare in derselben Datei)', () => {
    const block = hostWiederherstellungsBlock();
    expect(block).toMatch(/BUGFIX-005/);
  });
});
