/**
 * BUGFIX-005 – Testhilfe: minimaler, rein clientseitiger In-Memory-Ersatz für
 * das schmale Firestore-API-Subset, das src/game/hostSession.js,
 * src/game/joinGame.js und src/game/createGame.js tatsächlich benutzen
 * (collection().doc(), .get(), .set(data, {merge}), db.runTransaction(tx =>
 * tx.get/tx.set/tx.update)).
 *
 * WARUM nicht wie in den übrigen *.logic.test.js-Dateien (siehe
 * tests/game-rooms.logic.test.js, tests/game-rejoin.logic.test.js) gegen den
 * echten Firestore-Emulator testen? In dieser Sandbox lädt
 * `firebase emulators:exec` den Firestore-Emulator-JAR aus dem Internet nach
 * (`cloud-firestore-emulator-v1.19.8.jar`) – dieser Download ist durch die
 * Organisations-Egress-Policy blockiert (`Error: download failed, status
 * 403: request rejected: host not permitted`, verifiziert 2026-07-28, siehe
 * Testplan-Grundgerüst in Backlog.md "### BUGFIX-005": "Ausführung in dieser
 * Sandbox bekannt eingeschränkt"). Diese Fake-Instanz deckt AUSSCHLIESSLICH
 * das enge Präzedenz-/Überschreib-Verhalten dieses Tickets auf Ebene der
 * echten src/game/*.js-Anwendungslogik ab – sie ersetzt NICHT die
 * transaktions-/sicherheitsregel-Testsuiten, die weiterhin gegen den echten
 * Emulator laufen müssen (siehe tests/game-host-claim-overwrite.security.rules.test.js,
 * von Stephan lokal auszuführen, analog zu allen bestehenden
 * *.security.rules.test.js-Dateien).
 *
 * Bewusst denkbar einfach gehalten (kein echtes Transaktions-Retry, keine
 * Nebenläufigkeitskontrolle) – für die hier geprüften, streng sequentiellen
 * Given/When/Then-Abläufe ausreichend.
 *
 * FIX (2026-08-04, FEATURE-018, live beim ersten Sequentiell-mehrere-
 * joinGame()-Aufrufe-Test dieser Fake-Instanz gefunden): `update()`/
 * `tx.update()` behandelten einen Schlüssel wie `belegteStationen.station1`
 * bislang als LITERALEN, flachen Property-Namen (reiner Object-Spread),
 * statt ihn – wie der echte Firestore-Client – als Punkt-Pfad in das
 * verschachtelte `belegteStationen`-Objekt zu schreiben. Dadurch blieb das
 * eigentliche `belegteStationen`-Feld nach einem `tx.update(spielRef, {
 * ['belegteStationen.' + station]: uid })` (siehe src/game/joinGame.js)
 * unverändert auf seinem Ausgangsstand stehen – jede weitere Person, die
 * danach in DERSELBEN Fake-Instanz beitrat, sah dieselbe (veraltete)
 * Stationsbelegung und bekam dadurch fälschlich immer wieder dieselbe erste
 * freie Station zugewiesen, statt der jeweils tatsächlich nächsten freien.
 * Bislang fiel das nie auf, weil vorherige Tests mit dieser Fake-Instanz
 * (BUGFIX-005) nie mehr als eine tatsächlich NEUE Person nacheinander
 * derselben Station-Sammlung zuwiesen. `wendeAktualisierungAn()` bildet jetzt
 * das reale Firestore-Verhalten nach: ein Punkt im Schlüssel adressiert ein
 * verschachteltes Feld, alle anderen Ebenen bleiben unverändert erhalten.
 */

function wendeAktualisierungAn(bestehend, daten) {
  const ergebnis = { ...bestehend };
  Object.keys(daten).forEach((schluessel) => {
    if (!schluessel.includes('.')) {
      ergebnis[schluessel] = daten[schluessel];
      return;
    }
    const segmente = schluessel.split('.');
    let ziel = ergebnis;
    for (let i = 0; i < segmente.length - 1; i += 1) {
      const teil = segmente[i];
      const bisherigerWert = ziel[teil];
      ziel[teil] = (bisherigerWert && typeof bisherigerWert === 'object') ? { ...bisherigerWert } : {};
      ziel = ziel[teil];
    }
    ziel[segmente[segmente.length - 1]] = daten[schluessel];
  });
  return ergebnis;
}

function erzeugeFakeDb() {
  const speicher = new Map();

  function macheDocRef(vollerPfad) {
    return {
      _pfad: vollerPfad,
      collection(name) {
        return macheCollectionRef(`${vollerPfad}/${name}`);
      },
      async get() {
        const daten = speicher.get(vollerPfad);
        return {
          exists: daten !== undefined,
          data: () => (daten === undefined ? undefined : { ...daten }),
        };
      },
      async set(daten, optionen = {}) {
        if (optionen && optionen.merge) {
          const bestehend = speicher.get(vollerPfad) || {};
          speicher.set(vollerPfad, { ...bestehend, ...daten });
        } else {
          speicher.set(vollerPfad, { ...daten });
        }
      },
      async update(daten) {
        const bestehend = speicher.get(vollerPfad) || {};
        speicher.set(vollerPfad, wendeAktualisierungAn(bestehend, daten));
      },
    };
  }

  function macheCollectionRef(vollerPfad) {
    return {
      doc(id) {
        return macheDocRef(`${vollerPfad}/${id}`);
      },
    };
  }

  return {
    collection(name) {
      return macheCollectionRef(name);
    },
    async runTransaction(fn) {
      // Bewusst ohne echtes Optimistic-Concurrency-Retry: für die in diesem
      // Ticket geprüften, streng sequentiellen Given/When/Then-Abläufe (ein
      // Schreibvorgang nach dem anderen, nie zwei tatsächlich nebenläufige)
      // reicht ein einfacher, direkter Durchlauf.
      const tx = {
        async get(ref) {
          return ref.get();
        },
        set(ref, daten) {
          speicher.set(ref._pfad, { ...daten });
        },
        update(ref, daten) {
          const bestehend = speicher.get(ref._pfad) || {};
          speicher.set(ref._pfad, wendeAktualisierungAn(bestehend, daten));
        },
      };
      return fn(tx);
    },
    _debugSpeicher: speicher,
  };
}

module.exports = { erzeugeFakeDb };
