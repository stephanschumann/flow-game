/**
 * FEATURE-002 – Browser-Version von src/game/kennzahlen.js.
 *
 * Berechnet die Kennzahlen NACH Rundenende aus bereits im Browser
 * vorliegenden Daten:
 *   - Durchlaufzeit / Bearbeitungszeit: direkt aus den Zeitstempeln des
 *     Rundendokuments (Firestore-Timestamp -> .toMillis()).
 *   - Zeit bis erster/letzter Lieferung: aus `letzteBewegungAm` der Karten,
 *     die aktuell auf Position 6 (Ziel) stehen - das ist exakt der Zeitpunkt
 *     ihrer letzten (=abschliessenden) Bewegung.
 *   - Beteiligung je Person: KEINE serverseitige Historie verfügbar - jede
 *     Karte speichert per firestore.rules/Datenmodell nur ihre LETZTE
 *     Bewegung, nicht alle Zwischenschritte. Cloud Functions sind laut
 *     Vorgabe ausgeschlossen, ein zusätzliches Bewegungsprotokoll-
 *     Unterdokument wäre von den bestehenden, unveränderlichen Regeln nicht
 *     gedeckt (kein offener Pfad dafür). Diese Funktion bekommt deshalb ein
 *     clientseitig live mitgeschnittenes Bewegungsprotokoll (`bewegungsLog`,
 *     siehe spiel.html: wird über die docChanges() der karten-Live-Abfrage
 *     gefüllt) als Parameter - vollständig für jede Person, die während der
 *     ganzen Runde verbunden blieb, kann aber für jemanden, der erst mitten
 *     in der Runde beitritt/die Seite neu lädt, unvollständig sein. Bewusste,
 *     dokumentierte Einschränkung ohne Cloud Functions - siehe
 *     Abschlussbericht an Stephan.
 */
(function (global) {
  'use strict';

  function alsMillis(zeitwert) {
    if (!zeitwert) return null;
    if (typeof zeitwert.toMillis === 'function') return zeitwert.toMillis();
    return zeitwert;
  }

  function berechneKennzahlen({
    runde, karten, bewegungsLog, teilnehmendeNamen,
  }) {
    const durchlaufzeitStart = alsMillis(runde.durchlaufzeitStart);
    const durchlaufzeitEnde = alsMillis(runde.durchlaufzeitEnde);
    const bearbeitungszeitStart = alsMillis(runde.bearbeitungszeitStart);
    const bearbeitungszeitEnde = alsMillis(runde.bearbeitungszeitEnde);

    const ergebnis = {
      durchlaufzeitMs: (durchlaufzeitStart != null && durchlaufzeitEnde != null)
        ? durchlaufzeitEnde - durchlaufzeitStart : null,
      bearbeitungszeitMs: (bearbeitungszeitStart != null && bearbeitungszeitEnde != null)
        ? bearbeitungszeitEnde - bearbeitungszeitStart : null,
      ersteLieferungMs: null,
      letzteLieferungMs: null,
      abstandLieferungenMs: null,
      proPerson: [],
    };

    const lieferzeiten = (karten || [])
      .filter((k) => k.position === 6 && alsMillis(k.letzteBewegungAm) != null)
      .map((k) => alsMillis(k.letzteBewegungAm));
    if (lieferzeiten.length > 0 && durchlaufzeitStart != null) {
      const erste = Math.min(...lieferzeiten);
      const letzte = Math.max(...lieferzeiten);
      ergebnis.ersteLieferungMs = erste - durchlaufzeitStart;
      ergebnis.letzteLieferungMs = letzte - durchlaufzeitStart;
      ergebnis.abstandLieferungenMs = letzte - erste;
    }

    const proPersonZaehler = new Map();
    (bewegungsLog || []).forEach((eintrag) => {
      proPersonZaehler.set(eintrag.uid, (proPersonZaehler.get(eintrag.uid) || 0) + 1);
    });
    ergebnis.proPerson = Array.from(proPersonZaehler.entries()).map(([uid, anzahl]) => ({
      uid,
      anzeigename: (teilnehmendeNamen && teilnehmendeNamen[uid]) || uid,
      anzahlBewegungen: anzahl,
    }));
    ergebnis.proPerson.sort((a, b) => b.anzahlBewegungen - a.anzahlBewegungen);

    return ergebnis;
  }

  global.FlowGame = global.FlowGame || {};
  Object.assign(global.FlowGame, { berechneKennzahlen });
})(window);
