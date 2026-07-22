/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Beitritt zu einem bestehenden Spiel per Code: automatische Stationszuweisung
 * in Beitrittsreihenfolge (Spielende) bzw. bewusste Rollenwahl (Beobachtende,
 * oder Spielende ab der sechsten Person bei voll belegten Stationen).
 *
 * BUGFIX-001 (2026-07-21): Der Vorab-Check-Lesevorgang (Promise.all mit
 * spielRef.get()/teilnehmerRef.get()) sowie die Transaktions-Lesevorgänge
 * (tx.get(...)) laufen auf einem frischen Gerät unmittelbar nach
 * signInAnonymously(), ohne bestehende Serververbindung – dort kann Firestore
 * mit "Failed to get document because the client is offline." fehlschlagen
 * (siehe Backlog.md "### BUGFIX-001"). Beide Stellen sind deshalb jetzt mit
 * mitVerbindungsRetry() abgesichert; alle anderen Fehler (ungültiger Code,
 * Rolle, Stationen belegt, Spiel inaktiv) werden davon unverändert und ohne
 * Verzögerung durchgereicht (istTransienterVerbindungsFehler() erkennt genau
 * diesen einen Fehlerfall, nicht mehr).
 *
 * FEATURE-006 (2026-07-21, AK 7, Pre-Mortem-Risiko 2): Alle hier geworfenen
 * fachlichen Fehler tragen jetzt zusätzlich ein sprachneutrales `code`-Feld
 * (siehe src/i18n/uebersetzungen.js, FEHLERCODE_ZU_SCHLUESSEL) – die deutsche
 * Nachricht bleibt als `message` erhalten (z. B. für Logs), die eigentliche
 * Übersetzung für die Anzeige passiert ausschliesslich an der Anzeigestelle
 * über `err.code`, nie hier in der Logik.
 */

const { STATIONEN } = require('./createGame');
const { mitVerbindungsRetry } = require('./verbindungsRetry');

const INAKTIV_GRENZE_MS = 24 * 60 * 60 * 1000;

function wirfFehler(nachricht, code) {
  const fehler = new Error(nachricht);
  fehler.code = code;
  throw fehler;
}

function pruefeSpielExistiertUndAktiv(snap, code) {
  if (!snap.exists) {
    wirfFehler(`Kein Spiel mit dem Code "${code}" gefunden.`, 'UNGUELTIGER_CODE');
  }
  const spiel = snap.data();
  if (Date.now() - spiel.letzteAktivitaet > INAKTIV_GRENZE_MS) {
    wirfFehler(
      `Das Spiel mit dem Code "${code}" ist seit über 24 Stunden inaktiv und der Code nicht mehr gültig.`,
      'SPIEL_INAKTIV'
    );
  }
  return spiel;
}

async function joinGame({ code, anzeigename, rolle, uid }, db, retryOptionen = {}) {
  if (!anzeigename || !anzeigename.trim()) {
    wirfFehler('Anzeigename ist erforderlich.', 'ANZEIGENAME_ERFORDERLICH');
  }
  if (!uid) {
    wirfFehler('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.', 'FEHLENDE_AUTH_SITZUNG');
  }
  if (!['spielende', 'beobachtende'].includes(rolle)) {
    wirfFehler('Ungültige Rolle – bitte "spielende" oder "beobachtende" wählen.', 'UNGUELTIGE_ROLLE');
  }
  if (!code || typeof code !== 'string') {
    wirfFehler('Ungültiger oder unbekannter Code.', 'UNGUELTIGER_CODE');
  }

  const spielRef = db.collection('spiele').doc(code);
  const teilnehmerRef = spielRef.collection('teilnehmende').doc(uid);

  // Nicht-transaktionaler Vorab-Check: zeigt einer Person VOR dem eigentlichen
  // Beitritt, wenn zu diesem Zeitpunkt bereits alle Stationen belegt sind, damit
  // sie bewusst eine andere Rolle wählen kann (geklärte Frage 2), statt einfach
  // automatisch abgewiesen zu werden. Die eigentliche, unteilbare Vergabe passiert
  // unten in der Transaktion – dieser Vorab-Check ist reine Komfort-/Anzeigelogik.
  //
  // Bugfix (live gefunden, 2026-07-20, siehe Backlog.md): Dieser Vorab-Check
  // darf NICHT greifen, wenn diese uid bereits ein Teilnehmer-Dokument in
  // diesem Spiel hat (Doppel-Tap/Retry desselben Beitritts). Sonst würde eine
  // Person, die durch einen wiederholten Aufruf bereits eine Station hat,
  // fälschlich mit "alle Stationen belegt" abgewiesen, sobald inzwischen (auch
  // durch sie selbst) alle fünf Stationen vergeben sind.
  if (rolle === 'spielende') {
    // BUGFIX-001: Retry NUR bei genau diesem transienten Verbindungsfehler
    // (client is offline) – ein regulärer fachlicher Fehler (z. B. Spiel
    // inaktiv, unten in pruefeSpielExistiertUndAktiv) wird von
    // mitVerbindungsRetry() sofort und ohne Verzögerung durchgereicht.
    const [vorabSnap, teilnehmerVorabSnap] = await mitVerbindungsRetry(
      () => Promise.all([spielRef.get(), teilnehmerRef.get()]),
      retryOptionen
    );
    pruefeSpielExistiertUndAktiv(vorabSnap, code);
    if (!teilnehmerVorabSnap.exists) {
      const belegtVorab = vorabSnap.data().belegteStationen || {};
      const freiVorab = STATIONEN.filter((s) => !belegtVorab[s]);
      if (freiVorab.length === 0) {
        wirfFehler(
          'Alle Stationen sind bereits belegt. Bitte bewusst eine andere Rolle wählen (z. B. Beobachtende).',
          'SPIEL_VOLL'
        );
      }
    }
  }

  // BUGFIX-001: Die gesamte Transaktion (nicht nur der Lesevorgang) wird bei
  // genau diesem transienten Verbindungsfehler erneut versucht. Das ist
  // unbedenklich: Firestore-Transaktionen committen ihre Schreibvorgänge
  // grundsätzlich erst ganz am Ende, atomar – schlägt tx.get() fehl, wurde
  // noch NICHTS geschrieben. Ein wiederholter Transaktionsversuch bleibt
  // zusätzlich durch die bestehende Idempotenz unten (teilnehmerSnap.exists,
  // Bugfix vom 2026-07-20) abgesichert: dieselbe uid bekommt bei einem
  // erneuten Versuch garantiert ihre bereits vergebene Station zurück statt
  // einer zweiten.
  return mitVerbindungsRetry(() => db.runTransaction(async (tx) => {
    const [spielSnap, teilnehmerSnap] = await Promise.all([tx.get(spielRef), tx.get(teilnehmerRef)]);
    const spiel = pruefeSpielExistiertUndAktiv(spielSnap, code);

    // Bugfix (live gefunden, 2026-07-20, siehe Backlog.md): Diese uid hat für
    // dieses Spiel bereits ein Teilnehmer-Dokument – z. B. weil dieselbe
    // authentifizierte Sitzung joinGame mehrfach aufgerufen hat (Doppel-Tap,
    // Netzwerk-Retry bei langsamer Verbindung). In diesem Fall wird KEINE neue
    // Station vergeben und KEIN Dokument überschrieben, sondern unverändert
    // die bereits vorhandene Zuweisung zurückgegeben – idempotent, für beide
    // Rollen (spielende UND beobachtende). Das gilt auch bei zwei fast
    // gleichzeitigen Aufrufen derselben uid: Firestore-Transaktionen lesen
    // teilnehmerRef als Teil ihres Lese-Sets, deshalb wird die zweite
    // Transaktion automatisch neu ausgeführt, sobald die erste committet hat,
    // und sieht dann teilnehmerSnap.exists === true.
    if (teilnehmerSnap.exists) {
      const vorhandeneDaten = teilnehmerSnap.data();
      return {
        id: uid,
        rolle: vorhandeneDaten.rolle,
        anzeigename: vorhandeneDaten.anzeigename,
        station: vorhandeneDaten.station,
      };
    }

    const belegt = spiel.belegteStationen || {};
    const frei = STATIONEN.filter((s) => !belegt[s]);

    let station;
    let effektiveRolle = rolle;

    if (rolle === 'spielende') {
      if (frei.length === 0) {
        // Pre-Mortem Punkt 1 (Race Condition): zwei verschiedene Personen
        // haben den Vorab-Check fast gleichzeitig mit noch freier Station
        // bestanden, aber nur eine kann die Station in dieser Transaktion
        // tatsächlich bekommen. Die andere fällt automatisch auf "Stationen
        // voll" zurück statt eine bereits vergebene Station doppelt zu
        // bekommen oder mit einem Fehler abgewiesen zu werden.
        effektiveRolle = 'stationenVoll';
      } else {
        [station] = frei;
      }
    }

    const daten = { rolle: effektiveRolle, anzeigename: anzeigename.trim() };
    if (station) {
      daten.station = station;
    }
    tx.set(teilnehmerRef, daten);

    const aktualisierung = { letzteAktivitaet: Date.now() };
    if (station) {
      aktualisierung[`belegteStationen.${station}`] = uid;
    }
    tx.update(spielRef, aktualisierung);

    return { id: uid, rolle: effektiveRolle, anzeigename: anzeigename.trim(), station };
  }), retryOptionen);
}

module.exports = { joinGame };
