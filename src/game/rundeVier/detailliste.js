/**
 * FEATURE-019 – Qualitätsauswertung zeigt Details (welche Stadt, welches
 * Land, warum falsch)
 *
 * Bereitet das bereits von `berechneQualitaet()` (qualitaetsauswertung.js)
 * gelieferte, aber bislang verworfene `proKarte`-Ergebnis zu einer flachen
 * Liste anzeige-/persistenzfertiger Tabellenzeilen auf: eine Zeile je
 * Städte-Eintrag über ALLE sechs Länderkarten hinweg (AK 1, AK 8, AK 11 –
 * ausdrücklich ALLE Einträge, nicht nur die fehlerhaften).
 *
 * Bewusst OHNE das `von`-Feld der eintragenden Person (Frage 1, 2026-07-27,
 * "ohne Namen" – siehe Pre-Mortem-Risiko 1 "Blame-Risiko statt Lerneffekt"
 * im FEATURE-019-Abschnitt von Backlog.md): jede Zeile trägt ausschließlich
 * `{ land, stadt, wertung, gruende }`. Das Verbergen ist bewusst Aufgabe
 * DIESER Funktion, nicht von `berechneQualitaet()` (die reicht `von`
 * unverändert durch, siehe deren Tests/Kopfkommentar).
 *
 * `gruende` ist ein Array der tatsächlichen Fehlergründe ('falschesLand'
 * und/oder 'dublette') – leer bei 'korrekt', beide Einträge gleichzeitig bei
 * 'falschesLandUndDublette' (AK 4, Grenzfall AK 12/13 aus FEATURE-004: ein
 * doppelt fehlerhafter Eintrag bleibt EINE Zeile mit beiden erkennbaren
 * Gründen, nicht zwei separate Zeilen).
 *
 * WICHTIG: Diese Datei ist die Node-Referenz. Der inhaltlich identische
 * Browser-Port der Anzeige liegt direkt in `public/spiel.html`
 * (zeigeKennzahlen()/renderVergleichsTabelle()) – dort wird die Aufbereitung
 * inline auf das bereits serverseitig gespeicherte `qualitaet.proKarte`
 * angewendet, ohne diese Node-Datei zu importieren (kein Bundler im
 * Projekt, siehe Kopfkommentare joinGame.js/hostSession.js).
 */

function gruendeFuerWertung(wertung) {
  const gruende = [];
  if (wertung === 'falschesLand' || wertung === 'falschesLandUndDublette') {
    gruende.push('falschesLand');
  }
  if (wertung === 'dublette' || wertung === 'falschesLandUndDublette') {
    gruende.push('dublette');
  }
  return gruende;
}

function bereiteDetailzeilenVor({ proKarte } = {}) {
  const liste = Array.isArray(proKarte) ? proKarte : [];
  const zeilen = [];

  liste.forEach((karte) => {
    const staedte = Array.isArray(karte.staedte) ? karte.staedte : [];
    staedte.forEach((eintrag) => {
      zeilen.push({
        land: karte.land,
        stadt: eintrag.stadt,
        wertung: eintrag.wertung,
        gruende: gruendeFuerWertung(eintrag.wertung),
      });
    });
  });

  return zeilen;
}

module.exports = { bereiteDetailzeilenVor };
