/**
 * FEATURE-001 – Phase 1: Spiel-Räume
 * Beitritt zu einem bestehenden Spiel per Code: automatische Stationszuweisung
 * in Beitrittsreihenfolge (Spielende) bzw. bewusste Rollenwahl (Beobachtende,
 * oder Spielende ab der sechsten Person bei voll belegten Stationen).
 */

const { STATIONEN } = require('./createGame');

const INAKTIV_GRENZE_MS = 24 * 60 * 60 * 1000;

function pruefeSpielExistiertUndAktiv(snap, code) {
  if (!snap.exists) {
    throw new Error(`Kein Spiel mit dem Code "${code}" gefunden.`);
  }
  const spiel = snap.data();
  if (Date.now() - spiel.letzteAktivitaet > INAKTIV_GRENZE_MS) {
    throw new Error(
      `Das Spiel mit dem Code "${code}" ist seit über 24 Stunden inaktiv und der Code nicht mehr gültig.`
    );
  }
  return spiel;
}

async function joinGame({ code, anzeigename, rolle, uid }, db) {
  if (!anzeigename || !anzeigename.trim()) {
    throw new Error('Anzeigename ist erforderlich.');
  }
  if (!uid) {
    throw new Error('Fehlende Auth-Sitzung (uid) – anonyme Anmeldung ist Voraussetzung.');
  }
  if (!['spielende', 'beobachtende'].includes(rolle)) {
    throw new Error('Ungültige Rolle – bitte "spielende" oder "beobachtende" wählen.');
  }
  if (!code || typeof code !== 'string') {
    throw new Error('Ungültiger oder unbekannter Code.');
  }

  const spielRef = db.collection('spiele').doc(code);

  // Nicht-transaktionaler Vorab-Check: zeigt einer Person VOR dem eigentlichen
  // Beitritt, wenn zu diesem Zeitpunkt bereits alle Stationen belegt sind, damit
  // sie bewusst eine andere Rolle wählen kann (geklärte Frage 2), statt einfach
  // automatisch abgewiesen zu werden. Die eigentliche, unteilbare Vergabe passiert
  // unten in der Transaktion – dieser Vorab-Check ist reine Komfort-/Anzeigelogik.
  if (rolle === 'spielende') {
    const vorabSnap = await spielRef.get();
    const spielVorab = pruefeSpielExistiertUndAktiv(vorabSnap, code);
    const belegtVorab = spielVorab.belegteStationen || {};
    const freiVorab = STATIONEN.filter((s) => !belegtVorab[s]);
    if (freiVorab.length === 0) {
      throw new Error(
        'Alle Stationen sind bereits belegt. Bitte bewusst eine andere Rolle wählen (z. B. Beobachtende).'
      );
    }
  }

  return db.runTransaction(async (tx) => {
    const spielSnap = await tx.get(spielRef);
    const spiel = pruefeSpielExistiertUndAktiv(spielSnap, code);

    const belegt = spiel.belegteStationen || {};
    const frei = STATIONEN.filter((s) => !belegt[s]);

    let station;
    let effektiveRolle = rolle;

    if (rolle === 'spielende') {
      if (frei.length === 0) {
        // Pre-Mortem Punkt 1 (Race Condition): zwei Personen haben den
        // Vorab-Check fast gleichzeitig mit noch freier Station bestanden,
        // aber nur eine kann die Station in dieser Transaktion tatsächlich
        // bekommen. Die andere fällt automatisch auf "Stationen voll" zurück
        // statt eine bereits vergebene Station doppelt zu bekommen oder mit
        // einem Fehler abgewiesen zu werden.
        effektiveRolle = 'stationenVoll';
      } else {
        [station] = frei;
      }
    }

    const teilnehmerRef = spielRef.collection('teilnehmende').doc(uid);
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
  });
}

module.exports = { joinGame };
