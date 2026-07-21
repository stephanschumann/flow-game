/**
 * FEATURE-004 – Phase 4: Runde 4 (Kontextwechsel)
 * Reine ">3"-Regel für ein Würfel-Element (AK 10): Ein Wurf gilt erst als
 * erledigt, wenn eine Zahl größer als 3 fällt. Bewusst als eigenständig
 * testbare, reine Funktion ausgelagert – unabhängig von der eigentlichen,
 * rein CLIENTSEITIGEN Zufallserzeugung/Wurf-Animation selbst (siehe geklärte
 * Frage 5, Pre-Mortem-Risiko 9: kein serverseitiger Wurf, keine serverseitige
 * Prüfung des konkreten Werts – diese Funktion wird ausschliesslich CLIENTSEITIG
 * aufgerufen, um zu entscheiden, ob die Wurf-Animation stoppt und das Element
 * weitergegeben werden darf).
 */

function istWurfErfolgreich(wert) {
  return typeof wert === 'number' && wert > 3;
}

module.exports = { istWurfErfolgreich };
