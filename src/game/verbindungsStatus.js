/**
 * FEATURE-005 – Phase 5: Robustheit (Verbindungsstatus-Anzeige)
 *
 * Reine Funktionslogik, kein eigener Firestore-Zugriff (siehe "Betroffene
 * Architektur" in der freigegebenen Spec, Backlog.md "### FEATURE-005"): das
 * Firestore-SDK liefert bei jedem onSnapshot-Callback bereits
 * `snapshot.metadata.fromCache`/`hasPendingWrites` mit – diese Funktionen
 * werten nur diese bereits vorhandenen Metadaten aus, kein neuer
 * Server-Baustein, kein Cloud-Function-Bedarf.
 *
 * ermittleVerbindungsStatus() deckt AK4 ab: sowohl ein Snapshot aus dem
 * lokalen Zwischenspeicher (fromCache) als auch eine noch nicht bestätigte
 * eigene Aktion (hasPendingWrites, Pre-Mortem-Risiko 3: eine noch nicht
 * angekommene Aktion darf nicht als abgeschlossen erscheinen) ergeben
 * "wird_wiederhergestellt". Sobald beides nicht mehr zutrifft, "verbunden" –
 * automatisch, ohne dass die Person manuell neu laden muss.
 *
 * verbindungsStatusText() deckt AK5 ab: ein einfacher, genereller Hinweis
 * (mit Stephan am 2026-07-20 geklärt, "geklärte Frage 5") – bewusst KEINE
 * Detailanzeige, welche konkrete Aktion noch nicht angekommen ist.
 *
 * WICHTIG: Diese Datei muss inhaltlich synchron gehalten werden mit der
 * Browser-Kopie public/js/game/verbindungsStatus.js (Projekt-Konvention,
 * kein Bundler).
 */

function ermittleVerbindungsStatus({ fromCache, hasPendingWrites }) {
  if (fromCache || hasPendingWrites) {
    return 'wird_wiederhergestellt';
  }
  return 'verbunden';
}

function verbindungsStatusText(status) {
  if (status === 'wird_wiederhergestellt') {
    return 'Verbindung wird wiederhergestellt …';
  }
  return '';
}

module.exports = { ermittleVerbindungsStatus, verbindungsStatusText };
