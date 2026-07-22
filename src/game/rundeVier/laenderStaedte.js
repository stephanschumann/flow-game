/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Referenzdaten Land -> gültige Großstädte (geklärte Frage 6 / Implementierungs-
 * option A, Backlog.md FEATURE-004): acht Länder, von Stephan am 2026-07-20
 * festgelegt (USA, UK, Germany, India, Spain, France, Italy, Canada), je 5-10
 * anerkannte Großstädte. Konkrete Städteliste ist eine Implementierungsdetail-
 * Festlegung dieser Phase (`flow-game-impl`), wie in der Spec vorgesehen.
 *
 * Städtenamen bewusst in der im Spiel verwendeten (teils deutschen) Schreibweise
 * (z. B. "Rom", "Mailand", "Neapel").
 *
 * FEATURE-006-ERGÄNZUNG (2026-07-21, AK 6, Pre-Mortem-Risiko 4/8): Die zum
 * Zeitpunkt von FEATURE-004 noch offene Abhängigkeit ("München" vs. "Munich")
 * ist jetzt geschlossen – unabhängig von der eingestellten UI-Sprache gelten
 * beide Schreibweisen einer Stadt als dieselbe Stadt, sowohl für die
 * Korrektheitsprüfung (istStadtInLand) als auch für die Dublettenprüfung
 * (qualitaetsauswertung.js, dort über normalisiereStadt()). STADT_ALIAS deckt
 * die im Spiel tatsächlich vorkommenden Länder/Städte ab (Germany, Italy) –
 * bei Bedarf um weitere Länder erweiterbar, ohne bestehende Einträge
 * anzufassen.
 *
 * ARCHITEKTUR-HINWEIS (Abweichung von der wörtlichen Spec-Formulierung, siehe
 * Umsetzungsstand-Vermerk in Backlog.md): Diese Liste liegt NICHT zusätzlich
 * dupliziert in `firestore.rules` (Option A schlug "Konstanten-Lookup direkt in
 * den Sicherheitsregeln" vor). Grund: Die Land-/Stadt-Prüfung UND die
 * geordnete, deterministische Duplikat-Erkennung über bis zu 30 Städte-
 * Einträge hinweg (Pre-Mortem-Risiko 1) sind mit der ausdruckskraft der
 * Firestore-Regelsprache (keine Schleifen, keine Sammlungs-Queries, striktes
 * Get()/Exists()-Kontingent) nicht praktikabel nachbildbar. Wie bereits bei den
 * Zeit-Kennzahlen aus FEATURE-003 (auch dort nicht durch firestore.rules
 * inhaltlich geprüft, siehe `kennzahlen.js`) bleibt die Qualitätsauswertung
 * eine vertrauenswürdige, aber NICHT durch Sicherheitsregeln inhaltlich
 * verifizierte Berechnung. Kein einziger der 28 Sicherheitsregel-Testfälle in
 * `tests/game-round4.security.rules.test.js` verlangt eine Rules-seitige
 * Land-/Stadt-Prüfung – die Append-only-/Kettenfortschritts-/Wechselzwang-/
 * FIFO-Regeln (die tatsächlich sicherheitskritischen Stellen) sitzen wie
 * gefordert in `firestore.rules`.
 */

const LAENDER_LISTE = ['USA', 'UK', 'Germany', 'India', 'Spain', 'France', 'Italy', 'Canada'];

const LAENDER_STAEDTE = {
  USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston', 'Miami'],
  UK: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Edinburgh', 'Glasgow'],
  Germany: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart'],
  India: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Bordeaux'],
  Italy: ['Rom', 'Mailand', 'Neapel', 'Turin', 'Florenz', 'Venedig'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Quebec'],
};

// Englische <-> deutsche Alternativ-Schreibweisen derselben Stadt (AK 6).
// Schlüssel ist die kleingeschriebene englische/alternative Schreibweise,
// Wert die kanonische, in LAENDER_STAEDTE verwendete Schreibweise.
const STADT_ALIAS = {
  munich: 'münchen',
  cologne: 'köln',
  rome: 'rom',
  milan: 'mailand',
  naples: 'neapel',
  florence: 'florenz',
  venice: 'venedig',
};

// Normalisiert eine Stadt-Eingabe (trim + kleingeschrieben + Alias-Auflösung)
// auf einen sprachunabhängigen Vergleichsschlüssel – z. B. liefern "München",
// "Munich" und "  munich " denselben Schlüssel "münchen".
function normalisiereStadt(stadt) {
  if (typeof stadt !== 'string') return '';
  const bereinigt = stadt.trim().toLowerCase();
  return STADT_ALIAS[bereinigt] || bereinigt;
}

function istStadtInLand(land, stadt) {
  const liste = LAENDER_STAEDTE[land] || [];
  const eingabeSchluessel = normalisiereStadt(stadt);
  return liste.some((kandidat) => normalisiereStadt(kandidat) === eingabeSchluessel);
}

module.exports = {
  LAENDER_LISTE, LAENDER_STAEDTE, istStadtInLand, normalisiereStadt,
};
