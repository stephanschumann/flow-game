/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Referenzdaten Land -> gültige Städte.
 *
 * BUGFIX-012 (2026-08-01, Spec von Stephan freigegeben): Die ursprüngliche,
 * von Hand kuratierte 48-Einträge-Liste (5-7 Großstädte je Land) erkannte
 * viele reale, korrekte Städte fälschlich als "falsches Land" (u. a. Bozen,
 * Turin, Leeds, Aberdeen, Dover, Leipzig, Nantes, Calais - alle Ticket-
 * Beispiele). Ersetzt durch eine einzelne, kanonische Referenzdatendatei
 * (`public/data/staedte-referenz.json`), die sowohl von Node (hier, per
 * `fs.readFileSync()`) als auch vom Browser (`public/js/game/rundeVier.js`,
 * per `fetch()`) geladen wird - kein manuell synchron zu haltendes Duplikat
 * mehr (vermeidet strukturell das BUGFIX-011-Muster, siehe Pre-Mortem-
 * Risiko 3 der Analyse-Spec).
 *
 * Datenquelle/Lizenz (siehe auch `_meta` in der Referenzdatei selbst):
 * GeoNames.org, Datensatz "cities15000" (>= 15.000 Einwohner, deckt sich mit
 * der von Stephan bestätigten Populationsschwelle, Entscheidung 2), bezogen
 * über das Python-Paket `geonamescache` 3.0.2 (MIT-lizenzierter Wrapper).
 * GeoNames-Rohdaten stehen unter CC BY 4.0 - Namensnennung "GeoNames.org".
 * Gefiltert auf die acht Spiel-Länder. `aliase` in der Referenzdatei enthält
 * nur EINDEUTIGE Alt-Name-Zuordnungen (ein Alt-Name, der zu mehreren
 * verschiedenen Städten gehören könnte, z. B. "Waterloo", wird bewusst NICHT
 * aufgenommen - Pre-Mortem-Risiko 6).
 *
 * "Landessprache" bei mehrsprachigen Ländern (Kanada, Indien, UK) = laut
 * Stephans Entscheidung 3 pragmatisch nur die im Spiel dominante
 * Hauptsprache (z. B. Indien nur Englisch) - die Referenzdatei selbst
 * unterscheidet ohnehin nicht nach Sprache, sondern listet die von GeoNames
 * gepflegten gängigen Namensvarianten je Stadt.
 *
 * FEHLERFALL (AK7, Stephans Entscheidung 4): Kann die Referenzdatei nicht
 * gelesen/geparst werden, fällt dieses Modul automatisch auf eine kleine,
 * weiterhin im Quelltext eingebettete Kern-Liste zurück (KERN_LAENDER_STAEDTE
 * / KERN_STADT_ALIAS, inhaltlich die bisherige FEATURE-004/FEATURE-006-Liste)
 * - Runde 4 bleibt dadurch in jedem Fall spielbar, nur mit reduzierter
 * Reichweite.
 *
 * SIGNATUREN UNVERÄNDERT (Ziel der Spec: `qualitaetsauswertung.js` nicht
 * anfassen zu müssen): `istStadtInLand(land, stadt)` und
 * `normalisiereStadt(stadt)` (ein String-Parameter) bleiben wie bisher.
 * `normalisiereStadt()` ist weiterhin bewusst LAND-UNABHÄNGIG - die in
 * Pre-Mortem-Risiko 6 geforderte, länderbezogene statt globale
 * Dublettenprüfung wird deshalb im AUFRUFER (`qualitaetsauswertung.js`)
 * gelöst, nicht hier (siehe Kommentar dort).
 *
 * PERFORMANCE (AK5): Die Referenzdatei wird EINMALIG beim ersten `require()`
 * dieses Moduls gelesen und in Sets (O(1)-Zugriff pro Land+normalisierter
 * Stadt) vorbereitet - `istStadtInLand()` selbst bleibt synchron und schnell,
 * unabhängig von der Gesamtgröße der Referenzdatei (Pre-Mortem-Risiko 1 der
 * Analyse-Spec).
 */

const fs = require('fs');
const path = require('path');

const LAENDER_LISTE = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France', 'Italy', 'Canada'];

// Kern-Liste (bisherige FEATURE-004/FEATURE-006-Liste, unverändert) - dient
// AUSSCHLIESSLICH als Fallback, falls die Referenzdatei nicht geladen werden
// kann (AK7).
const KERN_LAENDER_STAEDTE = {
  USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston', 'Miami'],
  UK: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Edinburgh', 'Glasgow'],
  Germany: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart'],
  India: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Bordeaux'],
  Italy: ['Rom', 'Mailand', 'Neapel', 'Turin', 'Florenz', 'Venedig'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Quebec'],
};

const KERN_STADT_ALIAS = {
  munich: 'münchen',
  cologne: 'köln',
  rome: 'rom',
  milan: 'mailand',
  naples: 'neapel',
  florence: 'florenz',
  venice: 'venedig',
};

const REFERENZDATEI_PFAD = path.join(__dirname, '..', '..', '..', 'public', 'data', 'staedte-referenz.json');

function normalisiereMitAliasTabelle(stadt, aliasTabelle) {
  if (typeof stadt !== 'string') return '';
  const bereinigt = stadt.trim().toLowerCase();
  return aliasTabelle[bereinigt] || bereinigt;
}

function baueIndexAusKernliste() {
  const staedteJeLand = {};
  LAENDER_LISTE.forEach((land) => {
    const menge = new Set(
      (KERN_LAENDER_STAEDTE[land] || []).map((stadt) => normalisiereMitAliasTabelle(stadt, KERN_STADT_ALIAS)),
    );
    staedteJeLand[land] = menge;
  });
  return { staedteJeLand, aliasTabelle: KERN_STADT_ALIAS };
}

function baueIndexAusReferenzdatei() {
  // Absichtlich SYNCHRON (fs.readFileSync) statt asynchron, damit
  // istStadtInLand()/normalisiereStadt() weiterhin synchron aufrufbar
  // bleiben (unverändert gegenüber der bisherigen Signatur, AK5). Wirft bei
  // Lese-/Parse-Fehler - wird vom Aufrufer unten abgefangen (AK7).
  const inhalt = fs.readFileSync(REFERENZDATEI_PFAD, 'utf8');
  const daten = JSON.parse(inhalt);
  const aliasTabelle = (daten && daten.aliase) || {};
  const staedteJeLand = {};
  LAENDER_LISTE.forEach((land) => {
    const staedte = (daten && daten.laender && daten.laender[land]) || [];
    const menge = new Set();
    staedte.forEach((eintrag) => {
      menge.add(normalisiereMitAliasTabelle(eintrag.name, aliasTabelle));
      (eintrag.alt || []).forEach((alt) => menge.add(normalisiereMitAliasTabelle(alt, aliasTabelle)));
    });
    staedteJeLand[land] = menge;
  });
  return { staedteJeLand, aliasTabelle };
}

let INDEX;
try {
  INDEX = baueIndexAusReferenzdatei();
} catch (fehler) {
  // Referenzdatei fehlt/beschädigt/nicht lesbar - Runde 4 bleibt dank
  // Kern-Liste trotzdem spielbar (AK7, Stephans Entscheidung 4).
  INDEX = baueIndexAusKernliste();
}

function normalisiereStadt(stadt) {
  return normalisiereMitAliasTabelle(stadt, INDEX.aliasTabelle);
}

function istStadtInLand(land, stadt) {
  const menge = INDEX.staedteJeLand[land];
  if (!menge) return false;
  return menge.has(normalisiereStadt(stadt));
}

module.exports = {
  LAENDER_LISTE,
  LAENDER_STAEDTE: KERN_LAENDER_STAEDTE,
  istStadtInLand,
  normalisiereStadt,
};
