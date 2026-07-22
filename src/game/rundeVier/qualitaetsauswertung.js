/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Nachträgliche Qualitätsauswertung (AK 12, 13, 15, 16) – läuft vollständig
 * NACH Rundenende über alle sechs Länderkarten (bis zu 5 Städte-Einträge je
 * Karte = bis zu 30 Einträge insgesamt), analog zum bestehenden Muster in
 * `kennzahlen.js`/`vergleichsansicht.js` für die Zeit-Kennzahlen (FEATURE-003).
 *
 * Pre-Mortem-Risiko 1 (Duplikat-Race): Zwei fast zeitgleiche, identische
 * Städte-Einträge werden deterministisch nach ihrem Server-Zeitstempel (`am`)
 * sortiert aufgelöst – der FRÜHESTE Eintrag einer Stadt gilt (sofern im
 * richtigen Land) als korrekt, jeder SPÄTERE gleichlautende Eintrag zählt als
 * Dublette. Das macht wiederholte Auswertungsläufe über dieselben Daten
 * bit-identisch (kein Rennen zwischen zwei Auswertungsläufen).
 *
 * Klärungsvermerk AK 12/13 (2026-07-20, Backlog.md): Eine Stadt, die
 * GLEICHZEITIG im falschen Land liegt UND eine Dublette ist, zählt insgesamt
 * als EIN Fehler (nicht doppelt), erscheint aber in BEIDEN Fehlerkategorien
 * (`falschesLand` UND `dublette`) der Gesamtstatistik.
 *
 * FEATURE-006-ERGÄNZUNG (2026-07-21, AK 6): Die Dublettenprüfung vergleicht
 * jetzt über normalisiereStadt() statt über den rohen Eingabetext – "München"
 * (früher erfasst) und "Munich" (später erfasst) gelten dadurch als dieselbe,
 * bereits erfasste Stadt, unabhängig von der UI-Sprache der eintragenden
 * Person (siehe laenderStaedte.js).
 */

const { istStadtInLand, normalisiereStadt } = require('./laenderStaedte');

function wertungFuerEintrag(richtigesLand, istDublette) {
  if (richtigesLand && !istDublette) return 'korrekt';
  if (!richtigesLand && !istDublette) return 'falschesLand';
  if (richtigesLand && istDublette) return 'dublette';
  return 'falschesLandUndDublette';
}

async function berechneQualitaet({ karten } = {}) {
  const liste = Array.isArray(karten) ? karten : [];

  // Alle Städte-Einträge über alle Karten hinweg einsammeln, mit Rückverweis
  // auf ihre Position (Karte/Eintrag), damit proKarte am Ende wieder in der
  // ursprünglichen Eingabe-Reihenfolge zusammengesetzt werden kann.
  const alleEintraege = [];
  liste.forEach((karte, kartenIndex) => {
    const staedte = Array.isArray(karte.staedte) ? karte.staedte : [];
    staedte.forEach((eintrag, eintragIndex) => {
      alleEintraege.push({
        kartenIndex,
        eintragIndex,
        land: karte.land,
        stadt: eintrag.stadt,
        am: eintrag.am,
      });
    });
  });

  // Deterministische Reihenfolge nach Server-Zeitstempel (Pre-Mortem-Risiko 1).
  const sortiertNachZeit = [...alleEintraege].sort((a, b) => a.am - b.am);

  const bewertungProSchluessel = new Map();
  const bereitsGeseheneStaedte = new Set();

  sortiertNachZeit.forEach((eintrag) => {
    const schluessel = `${eintrag.kartenIndex}-${eintrag.eintragIndex}`;
    const richtigesLand = istStadtInLand(eintrag.land, eintrag.stadt);
    const stadtSchluessel = normalisiereStadt(eintrag.stadt);
    const istDublette = bereitsGeseheneStaedte.has(stadtSchluessel);
    if (!istDublette) {
      bereitsGeseheneStaedte.add(stadtSchluessel);
    }
    bewertungProSchluessel.set(schluessel, { richtigesLand, istDublette });
  });

  let korrekt = 0;
  let fehlerhaft = 0;
  let falschesLand = 0;
  let dublette = 0;

  const proKarte = liste.map((karte, kartenIndex) => {
    const staedte = Array.isArray(karte.staedte) ? karte.staedte : [];
    const bewerteteStaedte = staedte.map((eintrag, eintragIndex) => {
      const { richtigesLand, istDublette } = bewertungProSchluessel.get(`${kartenIndex}-${eintragIndex}`);
      const wertung = wertungFuerEintrag(richtigesLand, istDublette);

      if (richtigesLand && !istDublette) {
        korrekt += 1;
      } else {
        fehlerhaft += 1;
      }
      if (!richtigesLand) {
        falschesLand += 1;
      }
      if (istDublette) {
        dublette += 1;
      }

      return { ...eintrag, wertung };
    });

    return { land: karte.land, staedte: bewerteteStaedte };
  });

  return {
    gesamt: {
      korrekt, fehlerhaft, falschesLand, dublette,
    },
    proKarte,
  };
}

module.exports = { berechneQualitaet };
