/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Erstellt ein neues Spiel mit eindeutigem Beitritts-Code und legt den Host
 * als ersten Teilnehmenden an.
 *
 * Datenmodell (Option B, von Stephan freigegeben):
 *  - spiele/{code}                       Spiel-Metadaten (keine Geheimnisse)
 *  - spiele/{code}/geheim/kennung        NUR { hostKennung }, nie client-lesbar
 *  - spiele/{code}/teilnehmende/{uid}    ein Dokument pro Teilnehmendem
 *
 * uid kommt von firebase.auth().currentUser.uid nach anonymer Anmeldung.
 *
 * BUGFIX-001 (2026-07-21): Der Transaktions-Lesevorgang (tx.get(spielRef))
 * unten läuft auf einem frischen Gerät unmittelbar nach signInAnonymously()
 * und trägt strukturell dasselbe "client is offline"-Risiko wie in
 * joinGame.js beschrieben (siehe Backlog.md "### BUGFIX-001") – deshalb
 * ebenfalls mit mitVerbindungsRetry() abgesichert. Die CODE_KOLLISION-Retry-
 * Schleife bleibt davon unberührt: mitVerbindungsRetry() erkennt
 * CODE_KOLLISION nicht als transienten Verbindungsfehler und wirft ihn sofort
 * unverändert weiter, sodass der äußere try/catch wie bisher greift.
 *
 * FEATURE-006 (2026-07-21): Optionaler `sprache`-Parameter (AK 1, AK 9) –
 * Default STANDARD_SPRACHE ("en"), von src/game/sprache.js übernommen statt
 * hier dupliziert. Der Host kann die Sprache dadurch bereits beim Erstellen
 * festlegen; ändern kann er sie später über setzeSpielSprache() (siehe dort),
 * dessen serverseitige Durchsetzung (nur Host darf schreiben) in
 * firestore.rules sitzt, nicht hier.
 *
 * FEATURE-018 (2026-08-04, Option A der freigegebenen Spec, Frage 1/3 Gate
 * 1): Optionaler `mitspielen`-Parameter (boolean, Default false). Ist er
 * true, weist dieselbe, bereits bestehende Transaktion der gastgebenden
 * Person zusätzlich eine der fünf Stationen zu (analog zur
 * ersten-freien-Station-Logik aus joinGame.js) – zu diesem Zeitpunkt ist
 * garantiert JEDE Station frei, da die gastgebende Person die allererste
 * Person in diesem neuen Spiel ist, deshalb genügt STATIONEN[0] ohne
 * weitere Verfügbarkeitsprüfung. belegteStationen wird im selben Commit
 * entsprechend vorbelegt (Pre-Mortem-Risiko 1: keine spätere, getrennte
 * Schreiboperation, keine Race Condition mit einem später über joinGame()
 * beitretenden Spielenden möglich).
 *
 * Befund 3/4 der Analyse-Spec (Frage 4 zugestimmt): das Host-Dokument
 * bekommt dabei KEIN `hostKennung`-Feld mehr – bleibt exklusiv in
 * geheim/kennung. Grund: firestore.rules kann pro Dokument nur
 * ALLES-oder-NICHTS für die Leseregel entscheiden (kein Feld-Filtering);
 * ein mitspielender Host (mit station-Feld) muss für andere Teilnehmende
 * lesbar werden (AK3), würde dabei aber sonst versehentlich auch die
 * hostKennung offenlegen. Siehe firestore.rules ("allow create"/"allow
 * read" für teilnehmende/{uid}) für die dazu passende Regeländerung.
 */

const { mitVerbindungsRetry } = require('./verbindungsRetry');
const { SPRACHEN, STANDARD_SPRACHE } = require('./sprache');

const STATIONEN = [
  'wareneingang',
  'kommissionierung',
  'packstation',
  'versand',
  'qualitaetskontrolle',
];

// 8 Zeichen, ohne leicht verwechselbare Zeichen (0/O, 1/I/l) – geklärte Frage 4.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LAENGE = 8;

function zufallsCode() {
  let ergebnis = '';
  for (let i = 0; i < CODE_LAENGE; i += 1) {
    ergebnis += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return ergebnis;
}

function zufallsGeheimnis() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  }
  let ergebnis = '';
  for (let i = 0; i < 48; i += 1) {
    ergebnis += Math.floor(Math.random() * 16).toString(16);
  }
  return ergebnis;
}

async function createGame({
  hostAnzeigename, uid, sprache, mitspielen,
}, db, retryOptionen = {}) {
  if (!hostAnzeigename || !hostAnzeigename.trim()) {
    throw new Error('Anzeigename ist erforderlich.');
  }
  if (!uid) {
    throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
  }
  // FEATURE-006 (AK 1, AK 9): Default STANDARD_SPRACHE ("en"), wenn keine
  // eigene, gültige Sprache übergeben wurde – ein ungültiger Wert fällt
  // bewusst still auf den Default zurück statt die Spielerstellung selbst
  // scheitern zu lassen (Erstellung ist keine sicherheitskritische Aktion,
  // die eigentliche Durchsetzung gültiger Werte sitzt in firestore.rules).
  const spielSprache = SPRACHEN.includes(sprache) ? sprache : STANDARD_SPRACHE;

  const hostKennung = zufallsGeheimnis();
  const maxVersuche = 10;

  for (let versuch = 0; versuch < maxVersuche; versuch += 1) {
    const code = zufallsCode();
    const spielRef = db.collection('spiele').doc(code);

    try {
      // eslint-disable-next-line no-await-in-loop
      await mitVerbindungsRetry(() => db.runTransaction(async (tx) => {
        const bestehend = await tx.get(spielRef);
        if (bestehend.exists) {
          throw new Error('CODE_KOLLISION');
        }
        const jetzt = Date.now();
        // FEATURE-018: der Host ist die allererste Person in diesem neuen
        // Spiel – STATIONEN[0] ist deshalb garantiert frei, ohne dass eine
        // belegteStationen-Prüfung nötig wäre (anders als bei joinGame()).
        const hostStation = mitspielen ? STATIONEN[0] : undefined;
        const belegteStationen = hostStation ? { [hostStation]: uid } : {};
        tx.set(spielRef, {
          code,
          erstelltAm: jetzt,
          letzteAktivitaet: jetzt,
          belegteStationen,
          sprache: spielSprache,
        });
        tx.set(spielRef.collection('geheim').doc('kennung'), { hostKennung });
        const teilnehmerDaten = {
          rolle: 'host',
          anzeigename: hostAnzeigename.trim(),
        };
        if (hostStation) {
          teilnehmerDaten.station = hostStation;
        }
        // FEATURE-018 (Befund 3/4, Option A): hostKennung bewusst NICHT mehr
        // auf dieses Dokument geschrieben – siehe Kopfkommentar.
        tx.set(spielRef.collection('teilnehmende').doc(uid), teilnehmerDaten);
      }), retryOptionen);
      return { code, hostSessionKennung: hostKennung };
    } catch (err) {
      if (err.message === 'CODE_KOLLISION') {
        // eslint-disable-next-line no-continue
        continue;
      }
      throw err;
    }
  }
  throw new Error('Konnte keinen eindeutigen Beitritts-Code erzeugen. Bitte erneut versuchen.');
}

module.exports = { createGame, STATIONEN, CODE_ALPHABET };