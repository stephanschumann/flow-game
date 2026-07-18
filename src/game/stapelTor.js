/**
 * FEATURE-002 – Phase 2: Spielfeld + Runden 1–3
 * Stapel-Tor-Schwellen je Runde (Runde 1 = 6, Runde 2 = 3 je Stapel getrennt,
 * Runde 3 = 1) sowie die Ausnahme für den allerersten Übergang
 * (Auftragseingang -> Station 1), der immer offen ist (Entscheidungen
 * 2026-07-18, siehe Backlog.md FEATURE-002).
 *
 * WICHTIG zur Testabdeckung (siehe Backlog.md, "Bekannte Lücke zwischen
 * Akzeptanzkriterien und geschriebenen Tests"): `pruefeStapelTor()` selbst
 * bekommt die Anzahl bereits angekommener Karten als Parameter (so testet es
 * `tests/game-round.logic.test.js`) – das ist die reine Schwellen-Arithmetik.
 * Die tatsächliche, sicherheitsrelevante ZÄHLUNG "wie viele Karten sind
 * WIRKLICH an dieser Station/diesem Stapel angekommen" passiert NICHT hier,
 * sondern:
 *   1. serverautoritativ in `firestore.rules` (dort per get() über die sechs
 *      bekannten Karten-Dokument-IDs gezählt, weil Sicherheitsregeln keine
 *      Sammlungs-Query ausführen können) – real geprüft in
 *      `tests/game-round.security.rules.test.js` gegen echte, geseedete
 *      Firestore-Dokumente.
 *   2. hier zusätzlich als eigenständig testbare, echte Zähl-Funktion
 *      `zaehleAngekommeneKartenAusListe()`, die eine Liste echter
 *      Karten-Dokumente (wie sie aus Firestore gelesen würden) entgegennimmt
 *      und NICHT einfach eine vorgegebene Zahl vertraut – siehe
 *      `tests/game-round.stapel-zaehlung.test.js`, die diese Funktion gegen
 *      echte, im Firestore-Emulator geseedete Karten-Dokumente prüft und
 *      damit die im Pre-Mortem benannte Testlücke (Risiko 3) schliesst.
 */

const SCHWELLEN = { 1: 6, 2: 3, 3: 1 };

function stapelTorSchwelle(rundenNummer) {
  const schwelle = SCHWELLEN[rundenNummer];
  if (schwelle === undefined) {
    throw new Error(`Unbekannte Rundennummer: ${rundenNummer}`);
  }
  return schwelle;
}

async function pruefeStapelTor({ runde, station, angekommeneKarten, stapel, istErsterUebergang }) {
  // Der Übergang vom Auftragseingang zu Station 1 ist immer offen (Entscheidung
  // 2026-07-18), unabhängig von der Rundenschwelle. `istErsterUebergang` ODER
  // `station === 1` decken beide gängigen Aufrufvarianten ab.
  if (istErsterUebergang || station === 1) {
    return true;
  }
  const schwelle = stapelTorSchwelle(runde);
  return angekommeneKarten >= schwelle;
}

/**
 * Echte Zähl-Funktion: nimmt eine Liste tatsächlicher Karten-Dokumente
 * (z. B. `[{ kartenId: 'karte-1', position: 1, stapel: 'A' }, ...]`, wie sie
 * aus einer echten Firestore-Abfrage der Unter-Sammlung
 * `spiele/{code}/runden/{n}/karten` kämen) und zählt, wie viele davon an
 * `position` (optional zusätzlich nach `stapel` gefiltert) angekommen sind –
 * KEIN vorgegebener Zählwert.
 */
function zaehleAngekommeneKartenAusListe({ karten, position, stapel }) {
  if (!Array.isArray(karten)) {
    throw new Error('karten muss eine Liste von Karten-Dokumenten sein.');
  }
  return karten.filter((karte) => {
    if (karte.position !== position) return false;
    if (stapel && karte.stapel !== stapel) return false;
    return true;
  }).length;
}

/**
 * Komfort-Funktion für den Browser/die Anwendungslogik: liest die Karten der
 * angegebenen Runde wirklich aus Firestore (compat-API, `db.collection().doc()`
 * -Stil wie die übrigen src/game-Module) und zählt sie über
 * `zaehleAngekommeneKartenAusListe()`. Wird NICHT von den Sicherheitsregeln
 * benötigt (die zählen serverseitig selbst, siehe firestore.rules), ist aber
 * nützlich, damit die Oberfläche einen "Weiterbewegen"-Button optimistisch
 * aktivieren/deaktivieren kann, bevor ein Zug überhaupt versucht wird.
 */
async function zaehleAngekommeneKarten({ db, code, rundenNummer, position, stapel }) {
  const snapshot = await db
    .collection('spiele').doc(code)
    .collection('runden').doc(String(rundenNummer))
    .collection('karten')
    .get();
  const karten = snapshot.docs.map((docSnap) => ({ kartenId: docSnap.id, ...docSnap.data() }));
  return zaehleAngekommeneKartenAusListe({ karten, position, stapel });
}

module.exports = {
  pruefeStapelTor,
  stapelTorSchwelle,
  zaehleAngekommeneKartenAusListe,
  zaehleAngekommeneKarten,
};
