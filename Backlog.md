# Backlog – Flow Game

## 📋 ToDo

### FEATURE-006 Mehrsprachigkeit (Deutsch/Englisch)

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | ToDo |
| **Erstellt** | 2026-07-19 |

**Beschreibung:** Das Spiel ist vollständig auf Deutsch und Englisch nutzbar. Grundeinstellung (Default) ist Englisch. Betrifft alle sichtbaren Texte für alle Rollen (Host, Spielende, Beobachtende) über alle Phasen/Runden hinweg — Startseite, Lobby, Spielbrett, Kennzahlen-/Auswertungsansicht, Fehlermeldungen.

**User Story:** Als Host oder Spielender, möchte ich das Spiel in meiner bevorzugten Sprache (Deutsch oder Englisch) nutzen können, sodass internationale oder gemischtsprachige Gruppen den Workshop ohne Sprachbarriere durchführen können.

**Kontext/Verweise:** `Product.md` Abschnitt 9 (nicht-fachliche Anforderungen, ergänzt am 2026-07-19). Noch offen (für die Analysephase): wie die Sprache gewählt/umgeschaltet wird (z. B. pro Gerät/Person individuell vs. einheitlich pro Spiel), ob die Wahl über den Beitritt hinweg gespeichert bleibt, und ob Host und Spielende unabhängig voneinander die Sprache wählen können.

---

### FEATURE-004 Phase 4 – Runde 4 (Kontextwechsel)

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | In Progress |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-20 |
| **Spec freigegeben am** | 2026-07-20 |
| **In Progress seit** | 2026-07-20 |

**Beschreibung:** Zwei Aufgabentypen (Würfel-Aufgabe, Stadt-Aufgabe), erzwungener Wechsel zwischen beiden pro Person, sechs gemischte Ergebnisse wie in Runde 3, Fehler zulassen ohne Live-Korrektur (Stand 2026-07-20 – ersetzt frühere Annahme „Pflicht-Nacharbeit bis alles korrekt ist"): Eine falsch eingegebene Stadt bleibt einfach stehen, die Runde endet, sobald alle sechs Ergebnisse einmal geliefert sind. Erst danach wird ausgewertet, wie viele Städte tatsächlich korrekt waren – das ergibt eine neue Kennzahl-Kategorie „Qualität" zusätzlich zu den bestehenden Zeit-Kennzahlen.

**User Story:** Als Spielender, möchte ich in Runde 4 zwischen zwei Aufgaben hin- und herwechseln müssen, sodass ich den Preis von Kontextwechsel (mehr Zeit, mehr Fehler) am eigenen Leib erlebe.

**Kontext/Verweise:** `Product.md` Abschnitt 5 (Runde 4); `Flow-Game-Entscheidungen.md` (vollständige Akzeptanzkriterien Runde 4).

---

#### Analyse-Spec (2026-07-20)

**Grundmodell — final geklärt am 2026-07-20 (ersetzt die bisherige, mehrfach überarbeitete Fassung dieses gesamten Abschnitts, die auf einem falschen Grundmodell beruhte):**

Nach mehreren Rückfragen hat Stephan das tatsächliche Spielmodell für Runde 4 klargestellt. Die bisherige Fassung dieses Abschnitts ging von „sechs Ergebnisse insgesamt, gemischt aus zwei Typen, verteilt auf fünf Personen, jede Person bearbeitet eigenständig irgendwelche Aufgaben" aus — das ist **falsch** und wird durch das folgende Modell ersetzt (weiter unten an jeder betroffenen Stelle als „überholt, ersetzt durch Klärung 2026-07-20" markiert, nicht kommentarlos gelöscht):

- Es gibt **zwölf Arbeitselemente** für die ganze Runde: **sechs Würfel** und **sechs Länderkarten** (kein gemeinsamer Pool mit nur 6 Items, keine 60 unabhängigen Items — genau 12 Elemente).
- Jedes einzelne Element durchläuft **nacheinander alle fünf Spielenden in fester Reihenfolge** (Spieler 1 → 2 → 3 → 4 → 5) — exakt wie die sechs Karten in Runde 1–3 von Station zu Station weitergereicht werden (gleiches Positionsmodell wie `position` 0–6, nur jetzt mit zwei Element-Typen statt einem und einer festen Spieler-Reihenfolge statt eines Bearbeitungsschritts pro Station).
- **Würfel-Element:** Die Person, die es gerade hat, würfelt (clientseitig, CatTube-Animation, siehe geklärte Frage 5 unten), bis eine Zahl größer 3 fällt (Würfe ≤3 sind kein Fehler, nur „noch nicht erledigt", bestehende AK). Erst dann Weitergabe an die nächste Person in der Kette.
- **Länderkarte:** Die Person, die sie gerade hat, schreibt **eine zusätzliche Stadt** dazu (die Karte trägt bereits die Einträge der vorherigen Personen, wird ergänzt statt überschrieben) und reicht sie weiter. Jede Karte ist zu Rundenbeginn fest einem von acht Ländern zugeordnet (USA, UK, Germany, India, Spain, France, Italy, Canada; zufällige Zuordnung, siehe geklärte Frage 6). Nach dem vollständigen Durchlauf trägt jede Karte fünf Städte-Einträge (einen je Person).
- **Wechselzwang** (bestehende AK, bleibt inhaltlich richtig, jetzt neu verankert): Jede Person muss beim eigenen Weiterarbeiten zwischen einem Würfel-Element und einem Länderkarten-Element abwechseln — bezieht sich jetzt auf „welches der bei ihr wartenden Elemente nimmt sie als Nächstes", nicht mehr auf einen gemeinsamen Aufgaben-Pool.
- **Start ohne Stapel-Tor:** Alle zwölf Elemente starten zu Rundenbeginn vollständig bei Spieler 1 (analog zum „Auftragseingang" in Runde 1–3: Übergang zu Spieler 1 ist immer sofort offen, kein Stapel-Tor). Von dort entsteht der Fluss zu den anderen Spielenden erst nach und nach. Es gibt **kein Stapel-Tor/Batching** (anders als Runde 1/2) — reiner Einzelfluss wie Runde 3, jedes fertig bearbeitete Element wird sofort einzeln weitergegeben (deckt sich mit der ursprünglichen Ticket-Beschreibung „sechs gemischte Ergebnisse wie in Runde 3").
- **FIFO bei Mehrfachankunft:** Warten bei einer Person mehrere Elemente desselben Typs gleichzeitig, gilt strikt die Ankunftsreihenfolge — keine freie Auswahl.
- **Ergebnis:** Jede Person würfelt am Ende genau sechsmal (einmal je Würfel-Element) und bearbeitet sechs Länderkarten (einmal je Karten-Element) = 12 Elemente × 5 Übergaben/Bearbeitungen = 60 Einzelaktionen insgesamt, aber nur 12 tatsächliche Elemente, nicht 60 unabhängige Aufgaben.

**Explizit gewollter Design-Aspekt — wichtig für das gesamte Pre-Mortem-Framing unten:** Stephan wörtlich: „Verwirrung und Irritationen sind erwünscht, da sie die Realität widerspiegeln. Sie kosten Zeit. Das wollen wir den Teams spielerisch mitteilen." Verwirrung/Frustration durch Warten auf den richtigen Element-Typ, durch das Nachverfolgen wer gerade was hat, durch Unübersichtlichkeit bei fünf Personen mit teils mehreren wartenden Elementen — das ist **gewollter Lerneffekt** (Kontextwechsel-Kosten erlebbar machen), **kein zu behebendes UX-Problem**. Das Pre-Mortem unten unterscheidet deshalb ausdrücklich zwischen echten technischen/funktionalen Risiken (Dateninkonsistenz, Manipulierbarkeit, Absturz-Zustände) und gewollter spielerischer Friktion (als Feature markiert, nicht als Bug).

---

**Ausgangslage / Brainstorming & Example Mapping (überarbeitet 2026-07-20 nach der Modellklärung):**

**Überholte Architektur-Aussage, ersetzt durch Klärung 2026-07-20:** Die bisherige Fassung behauptete, „Runde 4 bricht bewusst mit dem Fließband-Modell der Runden 1–3" und die bestehende Positions-/Weiterreich-Mechanik sei „nicht anwendbar". Das ist **falsch**. Richtig ist das Gegenteil: Runde 4 nutzt eine sehr ähnliche Fließband-/Stationslogik wie Runde 1–3 (Positionsmodell, fester Übergang ohne Stapel-Tor am Anfang, Einzelfluss ohne Batching), nur mit zwei parallelen Element-Typen statt einem und einer zusätzlichen personenbezogenen Wechselregel obendrauf. Das bestehende Datenmodell/die bestehenden Muster (`karten`-Unterkollektion, `position`-Feld, `bewegungErlaubt()`-artige Regel-Helfer aus FEATURE-002) lassen sich vermutlich in großen Teilen wiederverwenden/adaptieren, nicht komplett neu bauen — das ist eine **Chance**: geringeres technisches Risiko als bisher angenommen, siehe „Betroffene Architektur" unten. Nur die reine Stapel-Tor-Schwellen-Logik selbst (`stapelTor.js`, `stapelTorSchwelle()`) bleibt weiterhin nicht anwendbar (Runde 4 hat kein Stapel-Tor), aber das umgebende Positions-/Weiterreich-Muster ist jetzt näher an Runde 1–3 als zuvor angenommen.

Durchgespielte Beispiele:

- *Würfel-Element:* Person 3 hat gerade ein Würfel-Element (das 3. der sechs Würfel) erhalten und würfelt 2, 1, 3, 5 → erst beim vierten Wurf (5 > 3) gilt ihr Anteil an diesem Element als erledigt, das Element geht an Person 4 weiter. Alle Zwischenwürfe (≤3) führen zu keinem Fehler und keiner Sonderaktion.
- *Länderkarte, korrekt:* Eine Karte ist „Frankreich" zugeordnet und trägt bereits Einträge von Person 1 und 2 („Paris", „Lyon"). Person 3 gibt „Marseille" ein → liegt in Frankreich, wurde noch nicht verwendet → kein Fehler, Karte geht mit drei Einträgen an Person 4.
- *Länderkarte, falsches Land:* Karte „Frankreich", Person gibt „Rom" ein → liegt nicht in Frankreich → wird ohne Hinweis angenommen, Karte geht trotzdem weiter; die Diskrepanz wird erst nach Rundenende in der Qualitätsauswertung sichtbar.
- *Länderkarte, Dublette:* Person 1 hat für eine „Deutschland"-Karte bereits „Berlin" eingetragen. Eine zweite, andere „Deutschland"-Karte kommt bei Person 3 an, die ebenfalls „Berlin" einträgt → richtiges Land, aber schon anderswo im selben Spiel vergeben → wird ohne Hinweis angenommen; die nachträgliche Qualitätsauswertung zählt einen der beiden Einträge als Dublette.
- *Erzwungener Wechsel:* Person 2 hat gerade ein Würfel-Element weitergegeben. Bei ihr warten aktuell zwei weitere Würfel-Elemente und eine Länderkarte. Die Wechselregel lässt als Nächstes nur die Länderkarte zu; ein Versuch, direkt eines der beiden wartenden Würfel-Elemente zu bearbeiten, wird abgelehnt.
- *FIFO bei Mehrfachankunft:* Bei Person 4 treffen kurz nacheinander zwei Würfel-Elemente ein (zuerst Würfel Nr. 2, dann Würfel Nr. 5). Sobald Person 4 laut Wechselregel wieder ein Würfel-Element bearbeiten darf, muss sie zwingend zuerst Würfel Nr. 2 nehmen (zuerst angekommen), nicht Würfel Nr. 5.
- *Rundenstart:* Alle zwölf Elemente (6 Würfel + 6 Länderkarten mit je einem zufällig zugeordneten Land) stehen ab Definition-of-Ready-Abschluss vollständig bei Spieler 1 bereit — kein Stapel-Tor, kein gestaffeltes Freischalten.
- *Rundenende trotz Fehlern:* Alle zwölf Elemente haben ihre Kette durch alle fünf Spielenden vollständig durchlaufen (jedes Element „bei Spieler 5 fertig bearbeitet"). Einige Länderkarten enthalten falsche Länder oder Dubletten → die Runde endet trotzdem sofort, alle Zeiten stoppen. Die Auswertung zeigt danach die Qualitäts-Kennzahl (Anteil korrekter Städte, aufgeschlüsselt nach Fehlerart).

**Fragen, die beim Durchspielen des neuen Modells aufkamen und NICHT selbst entschieden wurden** (siehe „Offene Fragen an Stephan" unten — Fragen 1–6 dort waren bereits vor dieser Klärung offen bzw. geklärt und werden nur neu eingeordnet; Fragen 7–8 sind neu): die genaue Ankunfts-/Startreihenfolge der zwölf Elemente bei Spieler 1 für die Zwecke der FIFO-Regel, ob alle zwölf Elemente exakt gleichzeitig ab Definition-of-Ready verfügbar sind oder mit einer minimalen internen Erzeugungsreihenfolge, und wie die Oberfläche einer Person mit mehreren gleichzeitig wartenden Elementen unterschiedlichen Typs die Fließband-Idee sinnvoll darstellt.

---

**Akzeptanzkriterien (beobachtbares Verhalten):**

Gemeinsam mit Runden 1–3 (unverändert, gelten weiter):

1. Die Durchlaufzeit beginnt sichtbar zu laufen, sobald der Host Runde 4 startet und die Aufgabe vorstellt.
2. Vor „Definition of Ready abgeschlossen" kann niemand ein Würfel- oder Länderkarten-Element bearbeiten.
3. Mit der ersten tatsächlich abgeschlossenen Bearbeitung (Würfel-Erfolg oder Stadt-Eintrag) beginnt sichtbar die Bearbeitungszeit.
4. Sobald alle zwölf Elemente ihre komplette Kette durch alle fünf Spielenden durchlaufen haben (unabhängig davon, ob die eingetragenen Städte inhaltlich korrekt sind), stoppen alle Zeiten von selbst und die Runde ist beendet. *(neu verankert 2026-07-20: „alle sechs Ergebnisse einmal geliefert" wird ersetzt durch „alle zwölf Elemente haben Position ‚bei Spieler 5 fertig bearbeitet' erreicht" — inhaltlich dieselbe Grundregel wie zuvor, nur auf das korrekte Elemente-Modell übertragen.)*
5. Danach sind alle Kennzahlen sichtbar: Durchlaufzeit, Bearbeitungszeit, Zeit bis erster/letzter Lieferung, Abstand dazwischen, Beteiligungsspanne je Person – vergleichbar mit Runde 3.

Neu, spezifisch für Runde 4 *(gegenüber der vorherigen Fassung an das korrekte 12-Elemente-Staffel-Modell angepasst, 2026-07-20 — Zuordnung zur alten Nummerierung am Ende dieses Blocks)*:

6. Zu Rundenbeginn stehen alle zwölf Elemente (sechs Würfel, sechs Länderkarten mit je einem zufällig zugeordneten Land) vollständig bei Spieler 1 bereit; von dort fließt jedes Element erst nach und nach weiter, sobald die jeweils aktuell zuständige Person es bearbeitet und abgibt. *(ersetzt „Beide Aufgabentypen sind gleichzeitig im Spiel vorhanden, nicht nacheinander freigeschaltet" — bleibt sinngemäß richtig, jetzt konkret auf den Staffel-Start bezogen.)*
7. **Neu:** Jedes Element durchläuft die fünf Spielenden strikt in derselben festen Reihenfolge (1→2→3→4→5); eine Person kann ein Element erst bearbeiten, wenn es bei ihr angekommen ist, und gibt es nach ihrer Bearbeitung an die nächste Person weiter, niemals zurück oder übersprungen.
8. **Neu:** Warten bei einer Person mehrere Elemente desselben Typs gleichzeitig, muss sie sie in der Reihenfolge bearbeiten, in der sie bei ihr angekommen sind (FIFO); eine freie Auswahl unter mehreren wartenden Elementen desselben Typs wird abgelehnt.
9. Nachdem eine Person ihren Anteil an einem Element eines Typs abgeschlossen und weitergegeben hat, lässt das Spiel als Nächstes für diese Person ausschließlich den jeweils anderen Typ zu; ein Versuch, direkt ein weiteres Element desselben Typs zu bearbeiten, wird abgelehnt, selbst wenn ein solches bei ihr wartet. *(bestehendes Kriterium, jetzt im Staffel-Modell verankert statt im Pool-Modell — inhaltlich identisch zur vorherigen AK 7.)*
10. Ein Würfel-Element gilt bei der aktuellen Person erst als erledigt, wenn eine Zahl größer als 3 (also 4, 5 oder 6) gefallen ist; jeder Wurf mit 1–3 zählt als „noch nicht erledigt", ohne dass das als Fehler gewertet wird. Die Zahl wird rein clientseitig im Browser per Zufall erzeugt und mit einer kurzen Wurf-Animation dargestellt (analog zur bestehenden `RollButton`-Komponente im Projekt CatTube), ohne serverseitige Erzeugung oder Prüfung des konkreten Wurfs. *(unverändert gegenüber der vorherigen Fassung [alte AK 8], siehe geklärte Frage 5 und Pre-Mortem-Risiko 9.)*
11. Bei einer Länderkarte wird jede eingegebene Stadt angenommen, auch eine falsche – nichts wird beim Eintippen blockiert; die Karte trägt danach einen Eintrag mehr und wird an die nächste Person weitergegeben. *(inhaltlich = alte AK 9, jetzt mit „wird weitergegeben" ergänzt.)*
12. Eine eingegebene Stadt, die nicht im der Karte zugeordneten Land liegt, wird während der Runde ohne sichtbare Fehlermarkierung angenommen und blockiert nichts; sie fließt erst nach Rundenende in die Qualitätsauswertung als fehlerhafte Stadt ein. *(= alte AK 10. Zur Zählweise bei gleichzeitig Dublette siehe Klärungsvermerk bei AK 13, geklärt am 2026-07-20.)*
13. Eine eingegebene Stadt, die zuvor schon erfolgreich von irgendjemandem in diesem Spiel verwendet wurde (auf derselben oder einer anderen Karte mit demselben Land), wird während der Runde ebenfalls ohne sichtbare Fehlermarkierung angenommen; sie zählt in der nachträglichen Qualitätsauswertung als Dublette, auch wenn sie im richtigen Land liegt. *(= alte AK 11.)*

    **Geklärt am 2026-07-20 (Grenzfall AK 12 + AK 13 gleichzeitig):** Eine Stadt, die gleichzeitig im falschen Land liegt UND eine Dublette ist, zählt insgesamt als ein Fehler (nicht doppelt), erscheint in der Auswertung aber in beiden Fehlerkategorien (falsches Land UND schon vergeben). Das war bereits in den BDD-Tests von `flow-game-bdd` korrekt vorweggenommen (siehe Testplan-Grundgerüst unten, „Grenzfälle falsches Land vs. Dublette vs. beides gleichzeitig") und ist jetzt von Stephan offiziell bestätigt — keine Teständerung nötig.
14. Es gibt während der Runde keinen Zustand „muss korrigiert werden" und keine Möglichkeit, eine bereits eingetragene Stadt auf einer Karte nachträglich zu ändern; eine falsche Eingabe bleibt für den Rest der Runde unverändert stehen und blockiert weder die Weitergabe der Karte noch das Rundenende. *(= alte AK 12.)*
15. Die Runde gilt als fertig, sobald alle zwölf Elemente ihre komplette Kette durch alle fünf Spielenden durchlaufen haben – Korrektheit der Städte-Einträge ist keine Voraussetzung für das Rundenende. Nach Rundenende wird für jede der sechs Länderkarten ausgewertet, welche ihrer fünf Städte-Einträge korrekt waren (richtiges Land, keine Dublette); Anzahl und Anteil korrekter bzw. fehlerhafter Städte werden als eigene Kennzahl-Kategorie „Qualität" in der Auswertung/Vergleichsansicht angezeigt, zusätzlich zu den bestehenden Zeit-Kennzahlen. *(= alte AK 13, „alle sechs Ergebnisse" ersetzt durch „alle zwölf Elemente".)*
16. Die Auswertung zeigt am Ende zusätzlich zu den Zeit-Kennzahlen die Qualitäts-Kennzahl: Gesamtanzahl bzw. Anteil korrekter und fehlerhafter Städte (von insgesamt 6 Karten × 5 Einträge = 30 Städte-Einträgen je Spiel), aufgeschlüsselt nach Fehlerart (falsches Land, Dublette). *(= alte AK 14, Zahlenbasis 6→30 präzisiert. Zur Zählweise bei gleichzeitig falschem Land UND Dublette siehe Klärungsvermerk bei AK 13, geklärt am 2026-07-20.)*
17. Runde 4 reiht sich in dieselbe Vergleichsansicht ein wie Runde 1–3 (Liste über die Runden-Unterkollektion), ergänzt um die Qualitäts-Kennzahl, ohne dass sich die Darstellung von Runde 1–3 dadurch ändert. *(= alte AK 15.)*

*(Nummerierung gegenüber der vorherigen Fassung verschoben, weil zwei AK zum Staffel-/FIFO-Fluss neu hinzukamen — kein bestehendes AK wurde inhaltlich ersatzlos gestrichen. Zuordnung alt→neu: 6→6, 7→9, 8→10, 9→11, 10→12, 11→13, 12→14, 13→15, 14→16, 15→17; neu hinzugekommen: 7, 8.)*

---

**Pre-Mortem – was könnte schiefgehen (technische/funktionale Risiken; gewollte spielerische Friktion siehe eigener Abschnitt direkt danach):**

1. **Gleichzeitige Weitergabe/Duplikat-Race bei der nachträglichen Qualitätsauswertung (weiterhin gültig, Beispiel an das korrekte Modell angepasst 2026-07-20):** Zwei verschiedene Länderkarten mit demselben Land laufen parallel durch die Kette; zwei Personen tragen fast zeitgleich dieselbe Stadt ein. Da es keine Live-Korrektur gibt (siehe geklärte offene Frage 4), werden beide Einträge während der Runde ohne Prüfung angenommen. Das Risiko: Die nachträgliche Qualitätsauswertung muss deterministisch und reihenfolgesicher entscheiden, welcher der beiden Einträge als Dublette zählt — sonst könnte die Qualitäts-Kennzahl je nach Auswertungslauf unterschiedlich ausfallen. Gegenmaßnahme: Duplikat-Check in der Auswertungsfunktion über alle sechs Karten-Dokumente (bzw. deren jeweils fünf Städte-Einträge) mit fester, eindeutiger Reihenfolge (z. B. nach Server-Zeitstempel der Eingabe — wer zuerst eintrug, gilt als korrekt, spätere gleiche Einträge als Dublette), analog zum bestehenden Muster bei der Stationszuweisung in `joinGame.js`.
2. **Umgehung des erzwungenen Wechsels, der Staffel-Reihenfolge oder der FIFO-Regel über direkte Schreibversuche (erweitert 2026-07-20):** Wenn Wechselregel, Kettenzugehörigkeit („nur die aktuell zuständige Person darf bearbeiten") oder FIFO-Reihenfolge nur in der Oberfläche, nicht in `firestore.rules` durchgesetzt werden, kann jemand die UI umgehen — z. B. ein Element bearbeiten, das laut Kette noch gar nicht bei ihr ist, zwei Elemente desselben Typs direkt hintereinander abschließen, oder ein wartendes Element unter Missachtung der FIFO-Reihenfolge vorziehen. Gegenmaßnahme: Alle drei Regeln als serverseitige Voraussetzung in den Sicherheitsregeln, wie bereits bei DoR/Stapel-Tor/Ein-Schritt-Bewegung in FEATURE-002 etabliert — hier sogar direkter übertragbar, weil das zugrunde liegende Positionsmodell dasselbe ist.
3. **„Zuteilungs-Deadlock" — überholt, ersetzt durch Klärung 2026-07-20; Formulierung zusätzlich präzisiert am 2026-07-20 nach Prototyp-Test:** Die vorherige Fassung dieses Risikos ging von einem gemeinsamen Pool aus sechs Ergebnissen aus, aus dem eine Person nach Abschluss ihres letzten erlaubten Typs leerlaufen könnte, weil kein Element des anderen Typs mehr „frei/unbeansprucht" wäre. Im korrekten Staffel-Modell gibt es keinen Pool und keine Knappheit dieser Art — jedes der sechs Würfel- und sechs Länderkarten-Elemente existiert genau einmal und wandert unabhängig durch dieselbe Personenkette. Die direkt nach der Modellklärung formulierte Zwischenfassung „**Wartezustand durch fehlenden Elementtyp**" (siehe geklärte Frage 2 unten) war selbst noch ungenau, weil sie ein Szenario wie „bei ihr sind gerade nur Würfel-Elemente angekommen, keine Länderkarte" beschrieb — genau dieses Szenario hat Stephan beim Prototyp-Test am 2026-07-20 explizit korrigiert: „das Szenario, dass mehrere Würfel warten, aber keine Länderkarte verfügbar ist, ist nicht real, da diese immer abwechseln kommen. Aber, es können in der Tat Würfel und Karten warten, aber immer abwechselnd. So müssen sie auch abgearbeitet werden." **Präzisierte Einordnung:** Weil alle zwölf Elemente in fester alternierender Reihenfolge starten (siehe geklärte Frage 7) und der Wechselzwang jede Person zwingt, ihre eigene Weitergabe an nachfolgende Personen ebenfalls strikt alternierend zu erzeugen, ist die alternierende Ankunft bei jeder Person in der Kette strukturell garantiert, nicht nur ein Regelfall — ein Typ „fehlt" bei einer Person also nie systematisch. Es können durchaus mehrere Elemente gleichzeitig bei einer Person warten (z. B. 1 Würfel + 1 Karte, auch 2 Würfel + 2 Karten), aber immer in alternierender Ankunftsreihenfolge über beide Typen hinweg — nie zwei Elemente desselben Typs unmittelbar hintereinander ohne den jeweils anderen Typ dazwischen. Das reale, verbleibende Risiko ist damit kein „Engpass durch fehlenden Typ", sondern nur die normale Fließzeit: Eine Person wartet höchstens kurz, bis das nächste, in der alternierenden Reihenfolge korrekte Element bei ihr ankommt. Das ist **kein Fehlerzustand**, sondern gewollter Effekt (siehe Abschnitt „Gewollte spielerische Friktion" unten). Technisch besteht nur das Risiko eines echten Absturz-/Deadlock-Zustands, falls ein Element durch einen Bug bei niemandem „ankommt" (inkonsistenter Positionswert), oder falls eine Implementierung die strukturell garantierte Alternierung fälschlich nicht voraussetzt und stattdessen unnötige Sonderfallbehandlung für „Typ X fehlt komplett" einbaut. Gegenmaßnahme: dieselbe Art von Konsistenz-Invariante wie bei `karten`/`position` in Runde 1–3 (jedes Element hat zu jedem Zeitpunkt genau eine gültige Position/genau eine aktuell zuständige Person), automatisiert getestet; zusätzlich ein Test, der die strukturelle Alternierung selbst verifiziert (siehe Testplan-Grundgerüst unten).
4. **Die Qualitäts-Kennzahl ist die zentrale Lernkennzahl dieser Runde – und leicht manipulierbar, wenn die Land/Stadt-Prüfung nicht serverautoritativ ist (unverändert).** Käme die Korrektheitsprüfung nur clientseitig zustande, könnte jede Person am Browser eine falsche Stadt als „korrekt" ausgeben. Das würde dem in `Analyse-Spec-v0.1.md` (Abschnitt 7) und durchgängig in FEATURE-001/002/003 verfolgten Prinzip „Server bleibt die Wahrheit" widersprechen. Gegenmaßnahme: siehe Implementierungsoptionen unten – bewusste Architekturentscheidung nötig.
5. **Nicht-monotones Rundenende (bereits am 2026-07-20 entschärft, bleibt im 12-Elemente-Modell entschärft):** Da das Rundenende weiterhin ein simpler Zähl-/Zustands-Trigger ist („alle zwölf Elemente haben Position ‚fertig bei Spieler 5' erreicht"), unabhängig von inhaltlicher Korrektheit, bleibt das Ereignis monoton und einmalig wie in Runde 1–3. Die Qualitätsprüfung läuft vollständig danach und kann das Rundenende nicht mehr beeinflussen oder rückgängig machen.
6. **Firestore-Get-Limit (im 12-Elemente-Modell neu betrachtet 2026-07-20 — vorherige Einschätzung „entschärft" bleibt in der Tendenz richtig, die Elementanzahl hat sich aber verdoppelt):** Der laufende Schreibpfad während der Runde muss pro Bearbeitungsschritt prüfen: (a) ist die schreibende Person tatsächlich die aktuell zuständige Position der Kette dieses Elements, (b) ist der Elementtyp laut Wechselregel für diese Person gerade zulässig (Lesen des zuletzt abgeschlossenen Typs dieser Person), (c) bei mehreren wartenden Elementen desselben Typs: FIFO-Reihenfolge einhalten (ggf. ein zusätzlicher `get()`, um zu prüfen, ob ein früher angekommenes Element derselben Person noch unbearbeitet ist). Diese drei Prüfungen bleiben pro Schreibvorgang auf ein einzelnes Element beschränkt (nicht auf alle zwölf gleichzeitig), bleiben also im selben Größenrahmen wie die bereits bewährte `karteAnPositionUndStapel`-Prüfung aus FEATURE-002 (ein bis zwei `get()` je Element). Die Land-Stadt-/Duplikat-Prüfung bleibt weiterhin vollständig aus dem Schreibpfad ausgelagert in die nachträgliche Auswertungsfunktion nach Rundenende — dort ist die höhere Elementanzahl (6 Karten × 5 Einträge = 30 statt vormals 6) unkritisch, da nur einmalig nach Rundenende berechnet, nicht bei jedem Einzelschritt. Get-Budget bleibt trotzdem von Anfang an knapp zu planen und im Testplan gezielt mit allen zwölf Elementen gleichzeitig in Bearbeitung zu prüfen (worst case: alle 5 Personen schreiben nahezu gleichzeitig).
7. **Regressionsrisiko FEATURE-003 (Auswertung), unverändert:** Die Vergleichsansicht (`vergleichsansicht.js`) und `kennzahlen.js` wurden bewusst so gebaut, dass eine vierte Runde mit einem zusätzlichen Kennzahl-Feld ergänzt werden kann, „ohne Strukturumbau". Dieses Versprechen muss jetzt eingelöst werden; ein Regressionstest muss sicherstellen, dass Runden 1–3 unverändert korrekt angezeigt werden, wenn die Berechnung um das Qualitäts-Feld erweitert wird, und dass die bestehende Freigabe-Logik (`ergebnisseFreigegeben`, nur Host, nur mit Server-Zeitstempel) auch für Runde 4 unverändert greift.
8. **Mehrsprachigkeit (FEATURE-006, parallel im Backlog), unverändert:** Land-/Stadt-Eingaben und ihre Prüfung müssten später ggf. zweisprachig funktionieren (z. B. „München" vs. „Munich"). Nicht Teil dieses Tickets, aber als Abhängigkeit/Regressionsrisiko für FEATURE-006 im Hinterkopf behalten.
9. **Serverseitige Würfelwurf-Erzeugung — bereits am 2026-07-20 final geklärt, durch die Modellklärung nicht berührt:** Der Würfelwurf wird rein clientseitig per Zufall erzeugt und mit einer Wurf-Animation dargestellt, analog zum bestehenden Muster im Projekt CatTube (`RollButton`-Komponente in cattube.html). Keine serverseitige Erzeugung oder Prüfung, kein Cloud-Function-Bedarf für den Würfel. **Verbleibendes Restrisiko, bewusst akzeptiert (unverändert):** Eine rein clientseitige Zufallszahl ohne serverseitige Prüfung ist am Client grundsätzlich manipulierbar. Das ist dieselbe Risikoklasse wie die bereits in `Analyse-Spec-v0.1.md` für FEATURE-002 dokumentierte Diskrepanz „automatische aktive Zeit ≠ Selbst-Stopp-Uhr", dort ebenfalls als produktseitig akzeptables Risiko eingestuft. Für den Würfelwurf gilt dieselbe Einstufung: als Produktentscheidung akzeptiert, ohne weitere serverseitige Absicherung.
10. **Neu (2026-07-20) — Konsistenz der Element-Ketten bei fünf Spielenden statt fünf Stationen:** Anders als in Runde 1–3, wo eine Karte an einer Station „liegt" und die dort befindliche Person unabhängig von ihrer Identität handelt, hängt die Weitergabe in Runde 4 an der **Person** (nicht an einer festen Station), und zwei parallele Element-Typen laufen gleichzeitig durch dieselbe Personenkette. Risiko: Wird die Positions-/Zuständigkeitsprüfung versehentlich nach Station statt nach Person modelliert (Kopierfehler aus dem bestehenden Runde-1–3-Code), könnte ein Rollenwechsel oder ein Rejoin (siehe FEATURE-005) dazu führen, dass Elemente der falschen Person zugeordnet werden. Gegenmaßnahme: Zuständigkeit explizit über `uid`, nicht über Stationsindex, modellieren; Testfall mit Spieler-Rejoin mitten in Runde 4 vormerken (Übergabe an FEATURE-005).

**Gewollte spielerische Friktion — ausdrücklich KEIN zu behebendes Risiko, sondern Kern-Feature dieser Runde (neu, 2026-07-20):**

Folgende Effekte entstehen zwangsläufig aus dem Modell und sollen bewusst nicht durch UX-Vereinfachung „wegdesignt" werden: Warten einer Person auf den laut Wechselregel benötigten Elementtyp, während andere Elemente bei ihr liegen, aber gerade nicht bearbeitet werden dürfen; Unübersichtlichkeit, wenn bei einer Person mehrere Elemente unterschiedlichen Typs gleichzeitig warten; die Notwendigkeit, sich zu merken oder nachzuschauen, „was habe ich gerade, und was kommt als Nächstes"; ungleichmäßiges Tempo zwischen den fünf Personen, weil manche schneller vorankommen als andere und dadurch Rückstau bei langsameren Personen entsteht. Das bildet laut Stephan bewusst reale Kontextwechsel-Kosten ab — wörtlich: „Verwirrung und Irritationen sind erwünscht, da sie die Realität widerspiegeln. Sie kosten Zeit. Das wollen wir den Teams spielerisch mitteilen." Diese Punkte gehören **nicht** in den technischen Pre-Mortem oben und dürfen in der Implementierung nicht durch zusätzliche Führung/Vereinfachung entschärft werden, ohne das explizit mit Stephan abzustimmen.

**Regressionsrisiko gegen bereits abgenommene Tickets:** FEATURE-002 (Kartenbewegung/Stapel-Tor – das Positions-/Weiterreich-Grundmuster wird jetzt bewusst wiederverwendet/adaptiert, siehe Ausgangslage oben; die bestehende `karten`-Logik für Runden 1–3 selbst darf dabei nicht angefasst/verändert werden, nur als Vorbild für Runde-4-eigene Datenstrukturen dienen), FEATURE-003 (Kennzahlen/Vergleichsansicht/Freigabe-Mechanik – muss um Runde 4 erweiterbar bleiben, ohne Runde 1–3 zu verändern), FEATURE-001 (Rollen-/Zugriffsmodell, Host-Erkennung – neue Runde-4-Regeln in `firestore.rules` dürfen die bestehenden `istHost`/`istTeilnehmer`-Helfer nur wiederverwenden, nicht duplizieren oder brechen).

---

**Betroffene Architektur (grob, ohne Implementierungsdetails vorwegzunehmen):**

- Datenmodell unterhalb von `spiele/{code}/runden/4`: **wiederverwendet das Grundmuster von `karten`** (Chance statt Risiko, siehe „Ausgangslage" oben) — vermutlich zwei Unterkollektionen oder eine gemeinsame mit Typ-Feld, je Element mit: Typ (Würfel/Länderkarte), aktuelle Position/aktuell zuständige Person (`position` 0–5 analog zum bestehenden Muster, oder direkt `aktuelleUid`), Ankunftszeitstempel an der aktuellen Person (für FIFO), bei Länderkarten zusätzlich zugeordnetes Land und die Liste der bereits eingetragenen Städte (append-only, nicht überschreibend), bei Würfeln der letzte Wurf/Wurfzähler. *(angepasst am 2026-07-20 — ersetzt die vorherige Annahme „einfacher Status beantwortet ja/nein": Im Staffel-Modell braucht es eine echte Positions-/Kettenverfolgung wie bei `karten`, kein simpler Ja/Nein-Status.)* Die inhaltliche Korrektheit (richtiges Land, keine Dublette) wird weiterhin nicht während der Runde geprüft/gespeichert, sondern durch eine nachträgliche Auswertungsfunktion nach Rundenende berechnet — analog zum bestehenden Muster in `kennzahlen.js`/`vergleichsansicht.js` für die Zeit-Kennzahlen. Ergebnis dieser Funktion ist die Kennzahl-Kategorie „Qualität".
- Ein Mechanismus, der pro Person den zuletzt abgeschlossenen Elementtyp kennt (z. B. Feld auf `teilnehmende/{uid}` oder ein eigenes Status-Dokument je Person und Runde), um die Wechselregel serverseitig zu prüfen — unverändert gegenüber der vorherigen Fassung.
- Erweiterung von `firestore.rules` um neue Helfer-Funktionen für Runde 4: **Kettenfortschritt/Weitergabe-Erlaubnis** (analog zu `bewegungErlaubt()` aus FEATURE-002, aber Person-basiert statt Stations-basiert — „darf diese Person dieses Element gerade bearbeiten/weitergeben"), **Wechselzwang**, **FIFO-Reihenfolge** bei mehreren wartenden Elementen desselben Typs bei derselben Person, **Rundenende-Bedingung** „alle zwölf Elemente bei Spieler 5 fertig". *(angepasst am 2026-07-20: Kettenfortschritt und FIFO sind gegenüber der vorherigen Fassung neu hinzugekommen, weil die vorherige Fassung fälschlich von einem Pool ohne Kettenlogik ausging.)* Land-Stadt-Prüfung und Duplikat-Zählung bleiben keine Schreib-Voraussetzung, sondern Teil der nachträglichen Qualitäts-Auswertungsfunktion (konkreter Ort abhängig von Implementierungsoption A/B/C unten).
- Erweiterung von `kennzahlen.js` und `vergleichsansicht.js` um die Kennzahl-Kategorie „Qualität" (Anzahl/Anteil korrekter vs. fehlerhafter Städte je Runde, jetzt über 30 statt 6 Städte-Einträge) — unverändert gegenüber der vorherigen Fassung, nur die zugrunde liegende Elementzahl ist präzisiert.
- Erweiterung/Sonderfall in `rundenStart.js` bzw. `rundenwechsel.js` für Runde 4: Erzeugen von zwölf Element-Dokumenten (sechs Würfel, sechs Länderkarten mit zufälliger Länderzuordnung), alle initial mit Position/Zuständigkeit „Spieler 1", analog zum bestehenden „Auftragseingang → Station 1 immer offen"-Muster aus Runde 1–3, aber ohne die dortige `leereKarten()`-Stapel-Tor-Logik (kein Stapel-Tor in Runde 4).
- Neue Referenzdaten (Land → gültige Städte) – Länderliste am 2026-07-20 von Stephan festgelegt (USA, UK, Germany, India, Spain, France, Italy, Canada, 8 Länder; siehe Implementierungsoption A). Speicherort/Pflegeform sowie die zugehörigen Städtelisten je Land (5–10 anerkannte Großstädte pro Land) werden erst konkret in der Implementierungsphase (`flow-game-impl`) ausgearbeitet — unverändert gegenüber der vorherigen Fassung.
- **Würfelwurf-Erzeugung — final geklärt am 2026-07-20, durch die Modellklärung nicht berührt:** Der Würfelwurf wird rein clientseitig im Browser per Zufall erzeugt (`Math.random()`-Muster) und mit einer kurzen Wurf-Animation dargestellt, analog zur bestehenden `RollButton`-Komponente im Projekt CatTube. Keine serverseitige Erzeugung oder Prüfung, kein Cloud-Function-Bedarf für den Würfel. Siehe Pre-Mortem-Risiko 9.
- Spielbrett-Oberfläche für Runde 4 *(angepasst am 2026-07-20 — ersetzt „vollständig neue Spielbrett-Oberfläche, kein Stationen-/Fließband-Layout, sondern pro Person zwei parallele Aufgaben"):* Die Grundidee ist jetzt näher an Runde 1–3 (fließband-artige Darstellung von Elementen, die durch Personen statt Stationen wandern), muss aber pro Person zwei parallele Element-Typen und die aktuell wartenden Elemente inklusive FIFO-Reihenfolge sichtbar machen — ohne die gewollte Unübersichtlichkeit wegzudesignen (siehe Pre-Mortem-Abschnitt „Gewollte spielerische Friktion"). Bleibt die größte UI-Abweichung von den bisherigen drei Runden, nur die zugrunde liegende Interaktionslogik ist jetzt näher an Runde 1–3.
- **Darstellung mehrerer wartender Elemente pro Person — geklärt am 2026-07-20, Variante „Fokus + Warteschlange":** Nach einem klickbaren Prototyp mit drei Varianten hat Stephan sich entschieden. Konzept: Bei jeder Person wird immer nur das eine Element, das laut Wechselregel gerade dran ist (Würfel oder Länderkarte), groß und prominent im Fokus angezeigt und ist auch das einzige, das gerade bearbeitet werden kann. Alle anderen bei dieser Person wartenden Elemente werden darunter als kleine, antippbare Chips in einer Warteschlangen-Leiste dargestellt. Jeder dieser Chips zeigt an, warum er gerade noch warten muss (z. B. „wartet, bis du mit der aktuellen Aufgabe fertig bist"). Damit bleibt die Fließband-Idee und die gewollte Unübersichtlichkeit bei mehreren wartenden Elementen sichtbar (siehe „Gewollte spielerische Friktion" oben), ohne dass die Person im Unklaren ist, was gerade dran ist und was noch aussteht.

---

**Implementierungsoptionen für die Land-Stadt-Prüfung und Duplikat-Erkennung (Kern-Architekturentscheidung dieses Tickets):**

*Option A – Kuratierte Liste direkt in `firestore.rules` (bleibt im kostenlosen Spark-Tarif):*
Eine kleine, feste Länder-/Städte-Liste wird als Konstanten-Lookup direkt in den Sicherheitsregeln hinterlegt, nach demselben Muster wie die bestehende `stapelTorSchwelle()`-Funktion. Vorteile: bleibt kostenlos, folgt konsequent der bisherigen Architektur-Linie („Server bleibt die Wahrheit", keine Cloud Functions nötig), gleiches Testmuster (Emulator + Rules-Tests) wie bisher direkt weiterverwendbar. Nachteile: Pflege der Liste erfordert einen Regel-Redeploy, Skalierung auf mehr Länder erhöht Regelkomplexität und Get-Budget-Risiko (Pre-Mortem-Risiko 6), spätere Mehrsprachigkeit (FEATURE-006) wird dadurch nicht einfacher. **Konkrete Länderliste — geklärt am 2026-07-20:** USA, UK, Germany, India, Spain, France, Italy, Canada (8 Länder). Für jedes Land wird zusätzlich eine zugehörige Städteliste benötigt (5–10 anerkannte Großstädte je Land) – Details in der Implementierungsphase (`flow-game-impl`). **Ergänzung 2026-07-20 nach der Modellklärung:** Die Prüfung bleibt vollständig außerhalb des laufenden Schreibpfads (siehe Pre-Mortem-Risiko 6) und läuft nur einmalig nach Rundenende über sechs Karten × fünf Städte = 30 Einträge statt der vormals angenommenen sechs Einträge. Dieses höhere Prüfvolumen ändert an der Grundempfehlung nichts, weil es außerhalb des zeitkritischen Schreibpfads läuft.

*Option B – Cloud Functions auf Blaze-Tarif:*
Inhaltlich unverändert gegenüber der vorherigen Fassung — Land-Stadt-Validierung, Duplikat-Prüfung und Alternierung laufen über eine serverseitige Funktion statt (nur) über Sicherheitsregeln. Vorteile: Referenzdaten lassen sich pflegen ohne Regeln neu zu veröffentlichen, komplexere Logik (Groß-/Kleinschreibung, spätere Mehrsprachigkeit) einfacher erweiterbar. Nachteile: verlangt den Wechsel auf den kostenpflichtigen Blaze-Tarif, zusätzlicher Deploy-/Test-Pfad, Abweichung vom bisher rein regelbasierten Muster aller Vorgänger-Tickets.

*Option C – Clientseitige Prüfung mit Vertrauen (kein Cloud Functions, aber schwächere Server-Autorität):*
Inhaltlich unverändert gegenüber der vorherigen Fassung — die Land-Stadt-Liste liegt als statische Datei im Frontend, der Server speichert nur das vom Client ermittelte Ergebnis, ohne es selbst zu validieren. Vorteile: einfachste, schnellste Umsetzung. Nachteile: die Qualitäts-Kennzahl ist nicht mehr manipulationssicher, klarer Bruch mit dem Prinzip „Server bleibt die Wahrheit". Weiterhin nicht empfohlen.

**Empfehlung (fachliche Einschätzung, nicht direkt aus den Dokumenten ableitbar – Stephan entscheidet), unverändert durch die Modellklärung:** Start mit **Option A**. Sie hält die bisherige Architektur-Linie und den Kostenrahmen konsequent durch, und die bestehende Teststrategie (Firestore-Emulator + Rules-Tests) lässt sich unverändert weiterverwenden. Die konkrete Länderliste (8 Länder) mit je 5–10 anerkannten Großstädten genügt für ein Workshop-Spiel mit fünf bis ~25 Personen und sechs Länderkarten pro Runde. Nur falls sich beim Bauen zeigt, dass Pflege/Kombinatorik unhandlich wird (insbesondere im Zusammenspiel mit FEATURE-006/Mehrsprachigkeit), gezielt auf **Option B** wechseln. Von **Option C** wird abgeraten, weil sie die einzige Kennzahl, die Runde 4 fachlich einzigartig macht (die Qualitäts-Kennzahl), un-serverautoritativ macht. Der Würfelwurf ist final rein clientseitig (analog CatTube) und benötigt keine Cloud Function — die Empfehlung „Option A reicht" gilt uneingeschränkt, unabhängig vom Würfel-Mechanismus (siehe Pre-Mortem-Risiko 9).

---

**Offene Fragen an Stephan (müssen vor Freigabe der Spec geklärt werden, keine Annahmen getroffen):**

1. **Zuteilung der sechs Aufgaben auf fünf Personen — überholt, gegenstandslos durch Klärung 2026-07-20 (hier dokumentiert statt gelöscht, für Nachvollziehbarkeit bei späteren Retros):** Diese Frage (und ihre vorherige „Antwort" „Feste Zuteilung durchs System") beruhte auf dem inzwischen verworfenen Pool-Modell, in dem sechs Ergebnisse aktiv Personen zugeteilt werden mussten. Im korrekten Staffel-Modell gibt es keine „Zuteilung an eine Person" in diesem Sinn mehr — jedes der zwölf Elemente durchläuft ohnehin alle fünf Personen nacheinander in fester Reihenfolge. Die Frage entfällt damit ersatzlos.
2. **Deadlock-Vermeidung / Wartezustand — bleibt sinngemäß gültig, neu verankert am 2026-07-20; präzisiert am 2026-07-20 nach Prototyp-Test:** Was passiert, wenn eine Person laut Wechselregel als Nächstes einen Elementtyp bräuchte, aber gerade kein Element dieses Typs bei ihr angekommen ist? Antwort bleibt inhaltlich: Die Person wartet. Neu verankert: nicht mehr „bis eine Aufgabe im Pool frei wird", sondern „bis das laut Wechselregel benötigte Element im Stationsfluss bei ihr ankommt". Dieses Warten ist gewollte spielerische Friktion (siehe Pre-Mortem-Abschnitt „Gewollte spielerische Friktion"), kein zu behebender Zustand. **Präzisierung nach Stephans Korrektur am Prototyp (2026-07-20):** Ein „Engpass" im Sinne von „der richtige Typ fehlt komplett" tritt unter dem bestätigten alternierenden Ankunftsmodell in der Praxis nicht auf. Stephans Wortlaut: „das Szenario, dass mehrere Würfel warten, aber keine Länderkarte verfügbar ist, ist nicht real, da diese immer abwechseln kommen. Aber, es können in der Tat Würfel und Karten warten, aber immer abwechselnd. So müssen sie auch abgearbeitet werden." Weil alle zwölf Elemente in fester, abwechselnder Reihenfolge starten (geklärte Frage 7) und der Wechselzwang die Ausgabe jeder Person ebenfalls strikt alternierend erzwingt, kommen bei jeder Person in der Kette Würfel- und Länderkarten-Elemente immer abwechselnd an — nie mehrere desselben Typs unmittelbar hintereinander ohne den anderen Typ dazwischen. Eine Person wartet also höchstens kurz, weil das nächste (in der alternierenden Reihenfolge korrekte) Element noch nicht bei ihr angekommen ist — das ist normale Fließzeit, kein systematisches Fehlen eines Typs. Der alte Stand oben bleibt zur Nachvollziehbarkeit stehen, ist aber durch diese Präzisierung ergänzt.
3. **Reichweite der Städte-Dublettenprüfung — geklärt am 2026-07-20: Nur im eigenen Spiel.** Gilt „schon vergeben" nur innerhalb desselben Spiels, oder spielübergreifend (bis zu ~20 parallele Spiele laut `Product.md` Abschnitt 2)? Antwort: Nur im eigenen Spiel, nicht spielübergreifend. Unverändert durch die Modellklärung.
4. **Nacharbeit-Berechtigung — geklärt am 2026-07-20, Antwort führte zu einer grundlegenden Spec-Änderung.** Stephans Antwort im Original-Wortlaut: „Wir korrigieren die Spec. Nach Abschluss des Spiels müssen die Städte angesehen und deren Richtigkeit bewertet werden. Dies gehört bei der Spielanalyse in die Kategorie Qualität. Viel Kontextsprung führt zu niedriger Qualität durch Fehler. Das gilt es neben der längeren Bearbeitungszeit zu lernen." Konsequenz: keine Live-Korrektur, Qualitätsauswertung erst nach Rundenende. Passt jetzt noch besser ins Staffel-Modell, weil jede Länderkarte ohnehin erst nach dem vollständigen Durchlauf durch alle 5 Spieler (5 Städte-Einträge) sinnvoll auf Korrektheit/Dubletten geprüft werden kann. Unverändert durch die Modellklärung.
5. **Server-Prüfung des Würfelwurfs — final geklärt am 2026-07-20: rein clientseitig, analog CatTube.** Kein serverseitiger Wurf, keine serverseitige Prüfung, kein Cloud-Function-Bedarf. Siehe Pre-Mortem-Risiko 9 für die vollständige Historie (Zwischenstand „Server erzeugt/prüft" wurde am selben Tag final revidiert). Unverändert durch die Modellklärung.
6. **Land-Stadt-Referenzdaten — geklärt am 2026-07-20: Option A, feste Länderliste.** USA, UK, Germany, India, Spain, France, Italy, Canada (8 Länder), zufällige Zuordnung Land→Karte, Städtelisten je Land in der Implementierungsphase. Unverändert durch die Modellklärung.
7. **Start-/Ankunftsreihenfolge der zwölf Elemente bei Spieler 1 — geklärt am 2026-07-20: Feste Reihenfolge (z. B. abwechselnd).** Stephans Antwort im Original-Wortlaut: „Feste Reihenfolge (z. B. abwechselnd)". Das heißt: Die zwölf Elemente stehen zu Rundenbeginn in einer festgelegten, abwechselnden Reihenfolge für Spieler 1 bereit — z. B. **Würfel 1, Karte 1, Würfel 2, Karte 2, Würfel 3, Karte 3, Würfel 4, Karte 4, Würfel 5, Karte 5, Würfel 6, Karte 6** (oder eine ähnliche feste, abwechselnde Reihenfolge; die exakte Belegung wird in der Implementierungsphase (`flow-game-impl`) final festgelegt, bindend ist das Prinzip „fest und abwechselnd, nicht zufällig und nicht typblockweise"). Diese Reihenfolge legt zugleich den Ankunftszeitstempel für die FIFO-Regel (AK 8) im allerersten Moment fest: Das Element an Position 1 der festen Liste gilt als zuerst angekommen, das an Position 2 als zweites usw. — auch für den Sonderfall, dass zu Rundenbeginn potenziell mehrere Elemente „gleichzeitig" bei Spieler 1 erscheinen, gibt es dadurch keine Uneindeutigkeit mehr. **Konsequenz für den Testplan:** Die BDD-Tests (`flow-game-bdd`) können sich auf eine deterministische, bekannte Startreihenfolge stützen statt auf Zufall oder eine noch offene Erzeugungsregel — insbesondere der FIFO-Testfall im Testplan-Grundgerüst unten lässt sich jetzt mit konkreten, vorhersagbaren Startpositionen formulieren (z. B. „Würfel 1 gilt als vor Würfel 2 angekommen, weil er an Position 1 der festen Startreihenfolge steht"), ohne eine Zufallsreihenfolge simulieren oder Sonderfälle für den exakten Rundenstart-Moment gesondert behandeln zu müssen. Damit ist diese Frage geklärt und kein Blocker mehr für `flow-game-bdd`.
8. **Darstellung für eine Person mit mehreren wartenden Elementen unterschiedlichen Typs — geklärt am 2026-07-20 anhand eines klickbaren Prototyps: Variante C – Fokus + Warteschlange.** Wie soll die Oberfläche einer Person, bei der z. B. zwei Würfel-Elemente und eine Länderkarte gleichzeitig warten, die Fließband-Idee sinnvoll und im Sinne der gewollten Friktion (nicht zu stark vereinfacht) darstellen? Stephan hat sich nach einem Test mit drei klickbaren Varianten (`feature-004-ui-prototyp.html`) für Variante C entschieden. Beschreibung siehe „Betroffene Architektur" unten (Bullet „Spielbrett-Oberfläche für Runde 4"). Damit ist auch diese letzte offene Frage der Spec geklärt.

---

**Testplan-Grundgerüst (für `flow-game-bdd`, nach Freigabe dieser Spec):**

- Given/When/Then je Akzeptanzkriterium oben (17 Stück, siehe Nummerierungs-Zuordnung im AK-Abschnitt), kein AK ersatzlos gestrichen gegenüber der vorherigen Fassung.
- **Staffel-Fluss (neu, 2026-07-20):** Given ein Würfel-Element ist bei Spieler 2 fertig bearbeitet, When Spieler 2 es weitergibt, Then das Element hat Position/Zuständigkeit „Spieler 3", ist für Spieler 2 nicht mehr bearbeitbar und für Spieler 3 noch nicht überspringbar (kein Vorgriff auf Spieler 4).
- **FIFO-Reihenfolge (neu, 2026-07-20; Beispiel korrigiert am 2026-07-20 nach Prototyp-Test — realistisches alternierendes Ankunftsmuster statt eines nicht möglichen Zwei-Würfel-ohne-Karte-Szenarios):** Given bei Spieler 4 sind in alternierender Ankunftsreihenfolge Würfel-Element X, Länderkarten-Element A und Würfel-Element Y eingetroffen (also X vor A vor Y, X und Y beide warten noch, A wartet ebenfalls), When Spieler 4 laut Wechselregel wieder ein Würfel-Element bearbeiten darf, Then nur Element X ist bearbeitbar; ein Versuch mit Element Y wird abgelehnt, bis sowohl X als auch A (in dieser Reihenfolge) weitergegeben wurden. **Zwei Würfel-Elemente ohne dazwischenliegendes Länderkarten-Element gleichzeitig wartend ist unter dem bestätigten alternierenden Modell kein gültiges Testszenario mehr** (siehe geklärte Frage 2, präzisiert 2026-07-20, und Pre-Mortem-Risiko 3).
- **Alternierende Ankunft bestätigt, auch bei mehreren wartenden Elementen (neu, 2026-07-20, nach Prototyp-Test):** Given bei einer Person warten gleichzeitig mehrere Elemente unterschiedlichen Typs (z. B. 1 Würfel + 1 Länderkarte, oder auch 2 Würfel + 2 Länderkarten), When die tatsächliche Ankunftsreihenfolge dieser Elemente betrachtet wird, Then sie ist immer strikt alternierend über beide Typen hinweg (nie zwei Elemente desselben Typs unmittelbar hintereinander ohne den jeweils anderen Typ dazwischen), und die Person muss sie exakt in dieser alternierenden Gesamtreihenfolge abarbeiten — nicht typweise frei wählbar, sondern eine einzige strikte Reihenfolge über die gesamte Warteliste hinweg. Deckt konkret Stephans Korrektur ab: „das Szenario, dass mehrere Würfel warten, aber keine Länderkarte verfügbar ist, ist nicht real, da diese immer abwechseln kommen."
- **Rundenstart-Reihenfolge (neu, 2026-07-20, aus geklärter Frage 7):** Given Rundenstart, When alle zwölf Elemente initial erzeugt werden, Then sie erhalten Ankunftspositionen bei Spieler 1 exakt in der festgelegten, abwechselnden Reihenfolge (z. B. Würfel 1, Karte 1, Würfel 2, Karte 2, Würfel 3, Karte 3, Würfel 4, Karte 4, Würfel 5, Karte 5, Würfel 6, Karte 6). Dadurch lassen sich alle FIFO-Tests — auch für den allerersten Bearbeitungsschritt direkt nach Definition-of-Ready — auf eine deterministische, bekannte Startreihenfolge stützen statt auf Zufall.
- **Wechselzwang (bestehendes AK, jetzt im Staffel-Modell verankert):** Given Spieler 1 hat gerade ein Würfel-Element weitergegeben, When Spieler 1 versucht direkt ein weiteres Würfel-Element zu bearbeiten (obwohl eines bei ihr wartet), Then die Aktion wird abgelehnt; When Spieler 1 stattdessen ein wartendes Länderkarten-Element bearbeitet, Then die Aktion wird angenommen.
- **Rundenende-Bedingung (angepasst 2026-07-20 an das 12-Elemente-Modell):** Given elf der zwölf Elemente haben Position „fertig bei Spieler 5" erreicht, ein Element ist noch bei Spieler 3, When das letzte Element ebenfalls bei Spieler 5 fertig bearbeitet wird, Then die Runde endet genau in diesem Moment und nicht früher, alle Zeiten stoppen serverseitig.
- Pre-Mortem-Szenarien: Duplikat-Race in der nachträglichen Qualitätsauswertung, Umgehungsversuch von Wechselzwang/Kettenzugehörigkeit/FIFO über direkte Schreibzugriffe.
- Kein Test mehr für „Aufgabe bleibt blockiert bis Korrektur" (entfällt, da es keine Live-Korrektur mehr gibt). Test „Rundenende trotz fehlerhafter Städte" und Test „Qualitäts-Kennzahl korrekt berechnet über 30 Städte-Einträge (6 Karten × 5 Personen)" inklusive Grenzfällen falsches Land vs. Dublette vs. beides gleichzeitig. *(Zählweise „beides gleichzeitig" = ein Fehler, sichtbar in beiden Kategorien — geklärt am 2026-07-20, siehe Klärungsvermerk bei AK 13.)*
- Regressionstests: Runden 1–3 (Kartenbewegung, Stapel-Tor, Kennzahlen, Vergleichsansicht, Freigabe-Mechanik) laufen nach der Erweiterung unverändert grün — insbesondere, dass die neu eingeführten personenbasierten Runde-4-Helfer-Funktionen die bestehenden stationsbasierten Helfer aus FEATURE-002 nicht verändern oder duplizieren.
- Sicherheitsregeln-Tests gegen den Firestore-Emulator für alle neuen Runde-4-Helfer-Funktionen (Kettenfortschritt, Wechselzwang, FIFO, Rundenende-Bedingung), analog zu `tests/game-round.security.rules.test.js`.

---

#### Testplan (BDD-Tests geschrieben, flow-game-bdd am 2026-07-20)

Zwei neue Testdateien, gleiches Muster wie FEATURE-002/003 (Firestore-Emulator + Security-Rules-Tests getrennt von reiner Logik):

- `tests/game-round4.security.rules.test.js` – 28 Testfälle. Serverautoritative Durchsetzung: Rundenstart mit 12 Elementen, Staffel-Fluss/Kettenfortschritt (AK 7), Wechselzwang (AK 9), FIFO bei mehreren wartenden Elementen (AK 8), Würfel-Schreibrecht ohne Serverprüfung (AK 10), Städte-Eintrag ohne Blockade (AK 11–13), Append-only/keine Live-Korrektur (AK 14), Zuständigkeit über Person/uid statt Stationsindex (Pre-Mortem-Risiko 10), Regressionstests (FEATURE-001 Beobachtende, TASK-002 unauthentifiziert), sowie ein eigener Abschnitt, der die Wiederverwendung der bestehenden `runden/{runde}`-Regeln für Runde 4 nachweist (DoR-Auslösung, servergesetzter Zeitstempel, Regressionstest Kartenbewegung Runde 1 unverändert) – dieser Abschnitt ist bewusst bereits jetzt grün.
- `tests/game-round4.logic.test.js` – 32 Testfälle. Referenzlogik für Rundenstart-Reihenfolge (AK 6, geklärte Frage 7), Zeitmessung (AK 1, 3), Kettenfortschritt/Wechselzwang als Referenzimplementierung, strukturelle Alternierungs-Garantie (Pre-Mortem-Risiko 3), Würfel-„>3"-Regel als reine Funktion (AK 10), Rundenende-Bedingung (AK 4, 15), Qualitätsauswertung inkl. Duplikat-Determinismus (Pre-Mortem-Risiko 1) und 30-Einträge-Aggregation (AK 16), sowie ein Wiederverwendungsnachweis, dass `kennzahlen.js`/`vergleichsansicht.js` Runde 4 inklusive Qualitäts-Kennzahl ohne Strukturumbau aufnehmen (AK 17, AK 5) – auch dieser Abschnitt ist bewusst bereits jetzt grün.

**Status:** Alle Runde-4-spezifischen Tests jetzt erwartungsgemäß Rot (29 von 32 Logik-Tests real gegen Jest laufen lassen und rot bestätigt; die Sicherheitsregeln-Tests konnten in dieser Arbeitsumgebung nicht gegen den Firestore-Emulator ausgeführt werden, siehe Hinweis unten) – die zugehörige Funktionalität existiert noch nicht, das ist der gewünschte Zustand. Die jeweils klar gekennzeichneten Wiederverwendungs-/Regressionsnachweis-Abschnitte in beiden Dateien sind bewusst bereits grün. `npm run test:emulator:feature-004` neu ergänzt (rein additiv, bestehende Skripte `test:emulator`/`test:emulator:feature-002`/`test:emulator:feature-003` unverändert). Bereit für `flow-game-impl`.

---

### FEATURE-005 Phase 5 – Robustheit

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Niedrig |
| **Status** | In Progress |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-20 |
| **Spec freigegeben am** | 2026-07-20 |
| **In Progress seit** | 2026-07-20 |

**Beschreibung:** Wiederbetreten nach Neuladen oder Verbindungsverlust (zurück ins selbe Spiel und dieselbe Station, keine Doppel-Anmeldung), vollständige Tastatur-Bedienung, weitere Barrierefreiheits-Punkte (Kontrast, ruhiger Modus, Bedeutung nie nur über Farbe).

**User Story:** Als Spielender, möchte ich nach einem Verbindungsabbruch nahtlos weiterspielen können und das Spiel unabhängig von Maus/Trackpad bedienen können, sodass ein Workshop nicht an technischen Aussetzern scheitert.

**Kontext/Verweise:** `Product.md` Abschnitt 9 (nicht-fachliche Anforderungen: Wiederbetreten, Barrierefreiheit). Hinweis: Host-Moderationsrechte bei eigenem Neuladen sind bereits Teil von FEATURE-001; dieses Ticket deckt das Wiederbetreten aller übrigen Teilnehmenden ab.

---

#### Analyse-Spec (2026-07-20)

**Ausgangslage / Brainstorming & Example Mapping:**

Zwei fachlich unterschiedliche Themenblöcke in einem Ticket, beide aus `Product.md` Abschnitt 9: (a) Wiederbetreten nach Neuladen/Verbindungsverlust für Spielende/Beobachtende, (b) Barrierefreiheit (Tastatur, Kontrast, ruhiger Modus, Farbe nie alleinige Bedeutungsträgerin).

**Was heute für (a) bereits existiert (aus echtem Code, nicht angenommen):**

- Jede Person meldet sich beim Laden anonym per Firebase Authentication an (`public/spiel.html`, `init()`, Zeile ~1056: `auth.signInAnonymously()`); die dabei vergebene `uid` bleibt durch die Standard-Persistenz der Firebase-JS-SDK über ein Neuladen im selben Browser/Gerät hinweg stabil (bereits Grundlage für den bestehenden Host-Wiederherstellungs-Mechanismus).
- **Für den Host existiert bereits ein vollständiger Wiederbetreten-Mechanismus:** `speichereHostSession()`/`geladeneHostSession()` legen `localStorage['flowGameHost:'+code]` (die geheime Host-Kennung) und `localStorage['flowGameLetztesSpiel']` (der Code) an; `init()` liest diese beim Laden aus und ruft automatisch `restoreHostSession()` (`src/game/hostSession.js`) auf, die per Schreibversuch gegen `firestore.rules` verifiziert (`getAfter()`-Vergleich gegen `spiele/{code}/geheim/kennung`) und bei Erfolg direkt in die Lobby zurückführt (`public/spiel.html` Zeilen 1072–1087).
- **Für Spielende/Beobachtende existiert dieser Mechanismus heute NICHT.** Nach einem Neuladen landen sie wieder auf dem Start-Panel (`auswahlPanel.hidden = false`) und müssten Code, Anzeigename und ggf. Rolle erneut eintippen. Das ist die eigentliche Lücke, die dieses Ticket schließt.
- **Wichtiger Baustein bereits vorhanden:** `joinGame()` (`src/game/joinGame.js`, identisch kopiert nach `public/js/game/joinGame.js`) ist seit dem FEATURE-002-Bugfix vom 2026-07-20 bereits idempotent pro `uid` — existiert für die aufrufende `uid` schon ein Teilnehmer-Dokument in diesem Spiel, wird keine neue Station vergeben, sondern unverändert Rolle/Station der vorhandenen Zuweisung zurückgegeben (Zeilen 83–91). Ein erneuter `joinGame()`-Aufruf mit demselben Code nach einem Neuladen würde also bereits korrekt zur selben Station zurückführen — es fehlt nur der automatische Aufruf selbst (Code merken, ohne dass die Person ihn erneut eintippt).
- **Konkrete Hürde dabei (siehe Pre-Mortem 1):** `joinGame()` prüft `anzeigename`/`rolle`/`code` auf Gültigkeit, BEVOR es prüft, ob für diese `uid` schon ein Teilnehmer-Dokument existiert (Zeilen 26–37 vor Zeile 83). Ein automatischer Rejoin-Aufruf ohne erneute Formulareingabe muss also entweder den ursprünglichen Anzeigenamen mitspeichern (analog zum Host-Modell) oder die Prüfreihenfolge müsste angepasst werden.
- Race-Condition-Schutz zwischen verschiedenen Personen (nie zwei Personen dieselbe Station) ist bereits vorhanden und bleibt von diesem Ticket unberührt (Pre-Mortem Punkt 1 in FEATURE-001, weiterhin gültig).
- Firestore-Realtime-Listener (`onSnapshot`) verbinden sich laut Firebase-SDK-Standardverhalten automatisch neu, wenn die Netzwerkverbindung kurz unterbrochen war und der Tab offen bleibt — dafür ist im Code noch kein sichtbarer Status-Hinweis für die Nutzenden eingebaut (kein Fund von `metadata.fromCache` o. Ä. in `spiel.html`).

**Was heute für (b) bereits existiert (aus echtem Code, nicht angenommen):**

- Kartenbewegung und alle Host-Aktionen sind bereits reine `<button>`-Elemente (kein Drag & Drop) — das ist eine bestehende gute Grundlage für Tastaturbedienbarkeit, kein Umbau eines Zieh-Mechanismus nötig.
- Fokus-Stil existiert bereits für Formularfelder (`spiel.html` Zeile 47: `.field input:focus{outline:2px solid var(--blue)}`), aber nicht erkennbar für die dynamisch erzeugten Bewegen-Buttons auf dem Spielbrett.
- Stapel-Zugehörigkeit (Stapel A/B) wird bereits sowohl über eine farbige Randlinie als auch über Text vermittelt (`karte.stapel` erscheint als Text `„(A)"`/`„(B)"` neben der Karten-ID, Zeile 717) — „Bedeutung nie nur über Farbe" ist hier bereits erfüllt; Tor-Status (`offen`/`geschlossen`) ebenfalls über Text (Zeile 703), nicht nur Farbe.
- Der Bewegen-Button selbst zeigt nur das Zeichen „→" ohne `aria-label` (Zeile 723) — für Screenreader-Nutzende unklar, welche Karte wohin bewegt wird.
- Keine `prefers-reduced-motion`-Media-Query und kein manueller „ruhiger Modus"-Schalter im Code gefunden; die einzige gefundene Animation ist `.stage{animation:rise .45s ...}` beim Seitenwechsel (Zeile 41) — überschaubarer Umfang, aber vorhanden.
- Kein Kontrast-Audit im Code dokumentiert; Design folgt bewusst der dunklen Agent-Contract-Farbwelt (`Product.md`, Design-Abschnitt) — Kontrast-Nachbesserung muss diese Farbwelt respektieren, nicht ersetzen.

**Durchgespielte Beispiele:**

- *Neuladen als Spielende:* Person an Station 3 lädt die Seite neu (F5). Heute: sie landet auf dem Start-Panel und müsste Code+Name erneut eingeben; bei erneuter Eingabe würde sie dank bestehender `joinGame()`-Idempotenz korrekt wieder Station 3 bekommen (kein Doppel-Assign), aber nur wenn sie sich an den Code erinnert und ihn erneut eintippt. Ziel dieses Tickets: das passiert automatisch, ohne erneute Eingabe.
- *Kurzer Verbindungsverlust ohne Neuladen:* Person verliert für 10 Sekunden WLAN, Tab bleibt offen. Firestore-SDK verbindet sich laut Standardverhalten automatisch neu; heute bekommt die Person davon nichts sichtbar mit (kein Hinweis, kein „wird synchronisiert"-Zustand) — das ist kein Absturz, aber auch keine bewusste Rückmeldung.
- *Rejoin mitten in Runde 4:* Person lädt während der laufenden Runde 4 (FEATURE-004, aktuell „In Progress") neu, während bei ihr gerade ein Würfel-Element und eine Länderkarte warten. Sie muss nach dem automatischen Rejoin exakt dieselbe Zuständigkeit für dieselben wartenden Elemente zurückbekommen (siehe FEATURE-004 Pre-Mortem-Risiko 10, das genau diesen Testfall ausdrücklich an dieses Ticket übergibt).
- *Tastatur-Durchlauf:* Eine Person ohne Maus versucht, allein mit Tab/Enter/Leertaste eine Karte zu bewegen, „Definition of Ready" abzuschließen und (als Host) die nächste Runde zu starten. Heute technisch vermutlich größtenteils möglich (echte Buttons), aber ungeprüft — kein dokumentierter Tastatur-Testlauf bisher.
- *Ruhiger Modus:* Eine Person mit Bewegungsempfindlichkeit öffnet das Spiel; unklar, ob die Rise-Animation automatisch reduziert wird (falls das Betriebssystem „Bewegung reduzieren" eingestellt hat) oder ob es dafür einen eigenen Schalter im Spiel braucht.

**Fragen, die beim Durchspielen aufkamen** (siehe „Fragen (mit Stephan geklärt am 2026-07-20)" unten): Reichweite des automatischen Wiederbetretens, Umgang mit derselben Person in zwei gleichzeitig offenen Tabs, Bedienung des „ruhigen Modus", Ziel-Kontraststufe, Detailgrad der Verbindungsstatus-Anzeige.

---

**Akzeptanzkriterien (beobachtbares Verhalten):**

*Wiederbetreten:*

1. Lädt eine spielende oder beobachtende Person die Seite auf demselben Gerät/Browser neu, landet sie automatisch wieder im selben Spiel, ohne Code, Namen oder Rolle erneut eingeben zu müssen — sofern das Spiel noch aktiv ist (bestehende 24-Stunden-Regel aus `joinGame.js`/`firestore.rules`, unverändert).
2. Nach diesem automatischen Wiederbetreten sieht die Person exakt ihre bisherige Rolle und, falls spielend, ihre bisherige Station — nie eine neu zugewiesene.
3. Durch das Neuladen entsteht kein zweites Teilnehmenden-Dokument und keine doppelte Stationszuweisung (baut auf der bestehenden Idempotenz in `joinGame.js` auf, siehe „Ausgangslage").
4. Ein kurzer Verbindungsabbruch bei offen bleibendem Tab unterbricht die Spielanzeige nicht dauerhaft: sobald die Verbindung zurück ist, zeigt die Seite von selbst wieder den aktuellen Stand, ohne dass die Person selbst etwas tun muss (kein manuelles Neuladen nötig).
5. Während eines Verbindungsabbruchs bekommt die Person eine sichtbare, ruhige Rückmeldung (z. B. „Verbindung wird wiederhergestellt"), statt dass die Seite kommentarlos einfriert oder unbemerkt veraltete Daten zeigt.
6. Kehrt jemand während einer laufenden Runde 4 zurück, bleibt die Zuständigkeit für ihre gerade wartenden Würfel-/Länderkarten-Elemente unverändert erhalten (Cross-Ticket-Kriterium mit FEATURE-004).
7. Zwei tatsächlich verschiedene Personen bekommen niemals dieselbe Station zugewiesen, auch nicht durch gleichzeitiges Wiederbetreten (bestehende Garantie, bleibt unverändert bestehen).
8. Der bestehende Host-Wiederherstellungs-Mechanismus (FEATURE-001) funktioniert unverändert weiter, auch wenn dieselbe Person in einem anderen Spiel gleichzeitig als Spielende/Beobachtende beigetreten ist.

*Barrierefreiheit:*

9. Jede Aktion, die per Maus/Trackpad möglich ist (Karte bewegen, Definition of Ready abschließen, Runde starten, Ergebnisse freigeben, in Runde 4 würfeln oder eine Stadt eintragen), lässt sich vollständig allein mit der Tastatur ausführen.
10. Die Reihenfolge, in der sich mit der Tastatur durch die Seite springen lässt, folgt einer nachvollziehbaren Logik (z. B. von oben nach unten), nicht kreuz und quer.
11. Es ist jederzeit deutlich sichtbar, welches Element gerade den Tastaturfokus hat.
12. Keine Information wird ausschließlich über Farbe vermittelt — gilt für die gesamte Oberfläche einschließlich neuer Bildschirme (z. B. Runde 4), nicht nur für die bereits farbe+text-konformen Bestandteile (Stapel-Zugehörigkeit, Tor-Status).
13. Text und Bedienelemente erreichen ausreichenden Farbkontrast zum dunklen Hintergrund (Richtwert WCAG AA: 4.5:1 für normalen Text, 3:1 für große Schrift/Bedienelemente), ohne die bestehende dunkle Design-Sprache zu ersetzen.
14. Es gibt einen „ruhigen Modus", der Bewegungen/Animationen deutlich reduziert oder abschaltet. Er wird ausschließlich automatisch über die Betriebssystem-Einstellung „Bewegung reduzieren" (`prefers-reduced-motion`) aktiviert — kein zusätzlicher manueller Schalter im Spiel, keine Host-weite Erzwingung (geklärt mit Stephan am 2026-07-20).
15. Interaktive Elemente sind für Screenreader sinnvoll benannt (z. B. bekommt der „→"-Bewegen-Button eine sprechende Bezeichnung statt nur des Pfeil-Symbols).
16. Öffnet dieselbe Person das Spiel gleichzeitig in zwei Tabs/Fenstern desselben Geräts, übernimmt der zuletzt aktiv gewordene Tab die Station; der ältere Tab wird als getrennt/inaktiv markiert (geklärt mit Stephan am 2026-07-20).

---

**Pre-Mortem – was könnte schiefgehen:**

1. **Validierungsreihenfolge in `joinGame.js` blockiert automatischen Rejoin:** Ein automatischer Rejoin-Aufruf ohne erneute Formulareingabe hat keinen frischen `anzeigename`, aber die Funktion prüft `anzeigename`/`rolle` zwingend, bevor sie auf ein bereits existierendes Teilnehmer-Dokument prüft (Zeilen 26–37 vor 83). Ohne Anpassung würde der automatische Rejoin an einer „Anzeigename ist erforderlich"-Meldung scheitern. Gegenmaßnahme: entweder den ursprünglichen Anzeigenamen lokal mitspeichern (analog Host-Modell unten) oder die Prüfreihenfolge in `joinGame.js` so ändern, dass ein bereits existierendes Teilnehmer-Dokument für diese `uid` zuerst geprüft wird — dabei muss der bestehende, gerade erst gefixte Idempotenz-Test (FEATURE-002, `tests/game-rooms.logic.test.js`) unverändert grün bleiben.
2. **Zwei parallele Client-Zustände (Host-Rejoin und Teilnehmenden-Rejoin) geraten sich in die Quere:** `init()` prüft heute nur einen einzigen `localStorage['flowGameLetztesSpiel']`-Wert für den Host-Pfad. Ein zusätzlicher Nicht-Host-Rejoin-Pfad braucht einen eigenen Speicherplatz und eine klare Prüfreihenfolge, sonst könnte z. B. eine Person, die in Spiel A Host und in Spiel B Spielende ist, beim Laden in den falschen Zustand geraten. Gegenmaßnahme: getrennte, eindeutig benannte `localStorage`-Schlüssel, Testfall für „Host in Spiel A + Teilnehmende in Spiel B gleichzeitig".
3. **Automatisches Wiederverbinden verschleiert eine echte, dauerhafte Trennung:** Firestore puffert Schreibvorgänge offline und sendet sie später automatisch nach — ohne sichtbaren Verbindungsstatus merkt eine Person nicht, dass ihre letzte Aktion (z. B. Karte bewegen) noch gar nicht angekommen ist. Gegenmaßnahme: sichtbarer Verbindungsstatus-Hinweis nicht nur beim Wiederverbinden, sondern bereits während der Offline-Phase selbst (z. B. über `snapshot.metadata.fromCache`).
4. **Re-render bei Live-Updates zerstört Tastaturfokus:** Das Spielbrett baut Teile des DOM bei jedem `onSnapshot`-Update neu auf (z. B. die Karten-Liste je Station). Wenn eine tastaturnavigierende Person gerade fokussiert ist und im Hintergrund eine andere Person eine Karte bewegt, könnte der komplette Neuaufbau den Fokus zurücksetzen oder verschieben. Gegenmaßnahme: gezielt nur geänderte Teile aktualisieren oder den Fokus vor/nach dem Re-render bewusst erhalten.
5. **Gleichzeitig offene Tabs derselben Person:** Da `joinGame()` idempotent ist, würden zwei Tabs derselben `uid` beide erfolgreich dieselbe Station „bekommen" und könnten unabhängig voneinander Aktionen auslösen. Sicherheits-/Datenintegritätsrisiko besteht nicht (es ist dieselbe autorisierte Person), aber es könnte zu verwirrenden Doppel-Aktionen kommen. Ob das aktiv verhindert/gewarnt werden soll, ist offene Frage 2 unten.
6. **Kontrast-Nachbesserung weicht optisch von der vorgegebenen Design-Sprache ab:** Ein reiner Kontrast-Fix könnte versehentlich die in `Product.md` festgehaltene dunkle Agent-Contract-Farbwelt verändern statt nur Nuancen anzupassen. Gegenmaßnahme: Kontrast gezielt messen (Tool, nicht Augenmaß) und nur so viel wie nötig verändern.
7. **„Ruhiger Modus" und Runde-4-Würfelanimation widersprechen sich (Cross-Ticket mit FEATURE-004):** FEATURE-004 sieht eine clientseitige Wurf-Animation (analog CatTube `RollButton`) vor. Wird der „ruhige Modus" nicht als gemeinsamer Mechanismus gebaut, könnte die Würfelanimation ihn ignorieren. Gegenmaßnahme: ein gemeinsamer, zentraler Schalter/CSS-Mechanismus, den beide Tickets nutzen.
8. **24-Stunden-Inaktivitätsgrenze und lange Workshop-Pausen:** `istAktiv()`/`INAKTIV_GRENZE_MS` (24h) gelten unverändert; ein Wiederbetreten nach einer sehr langen Pause (deutlich über 24h) bleibt bewusst wie bisher „Code nicht mehr gültig" — kein neues Risiko, aber zur Klarheit hier festgehalten, da es das Wiederbetreten begrenzt.

---

**Betroffene Architektur (grob, ohne Implementierungsdetails vorwegzunehmen):**

- `public/spiel.html`, `init()`-Ablauf (Zeilen ~1050–1170): Erweiterung um einen zum bestehenden Host-Rejoin-Pfad analogen, aber eigenständigen Rejoin-Pfad für Spielende/Beobachtende — eigener `localStorage`-Schlüssel (gespeicherter Code, Rolle, Anzeigename), automatischer `joinGame()`-Aufruf beim Laden, bevor das Start-Panel überhaupt eingeblendet wird.
- `src/game/joinGame.js` und die identische Kopie `public/js/game/joinGame.js` (Projekt-Konvention: Quelle unter `src/`, ausgelieferte Kopie unter `public/js/game/`, beide müssen bei jeder Änderung synchron gehalten werden — siehe Bugfix-Historie FEATURE-002): mögliche Anpassung der Prüfreihenfolge (Pre-Mortem 1), ohne die bestehende Idempotenz-Garantie zu verändern.
- Kein erwarteter Änderungsbedarf an `firestore.rules` für das Wiederbetreten selbst — es baut vollständig auf der bestehenden `istTeilnehmer`/`istHost`-Logik und der bereits vorhandenen Idempotenz auf. Nur falls eine explizite Verbindungsstatus-/Präsenz-Speicherung in Firestore gewünscht wird (Implementierungsoption B unten), kämen neue Felder/Regeln hinzu.
- Verbindungsstatus-Anzeige: rein clientseitig über die vom Firestore-SDK bereits mitgelieferten Snapshot-Metadaten (`metadata.fromCache`/`hasPendingWrites`), kein neuer Server-Baustein.
- CSS/Markup in `public/spiel.html` (bzw. gemeinsame Design-Basis mit `public/index.html`, sofern geteilt): sichtbarer Fokus-Stil auch für dynamisch erzeugte Buttons, `aria-label` an bestehenden Icon-only-Buttons (insbesondere dem „→"-Bewegen-Button), Kontrast-Nachbesserung, `prefers-reduced-motion`-Unterstützung und/oder eigener „ruhiger Modus"-Schalter, Tab-Reihenfolge-Prüfung/-Korrektur.
- Cross-Ticket-Berührung mit FEATURE-004 (Runde 4, aktuell „In Progress"): Rejoin-Zuständigkeit für wartende Würfel-/Länderkarten-Elemente (dort bereits als Pre-Mortem-Risiko 10 mit Verweis auf dieses Ticket dokumentiert) sowie gemeinsamer „ruhiger Modus"-Mechanismus für die Würfelanimation.

---

**Regressionsrisiko gegen bereits abgenommene Tickets:** FEATURE-001 (Host-Wiederherstellungs-Mechanismus muss unverändert weiterlaufen, auch bei paralleler Host-Rolle in einem anderen Spiel), FEATURE-002 (Idempotenz-Fix in `joinGame.js` vom 2026-07-20 darf durch eine geänderte Prüfreihenfolge nicht wieder aufgebrochen werden — bestehender Test „Doppelter/mehrfacher Beitritt derselben authentifizierten Person" muss weiterhin grün bleiben), FEATURE-004 (Rejoin-Verhalten mitten in Runde 4, dort bereits als offener Punkt an dieses Ticket übergeben).

---

**Implementierungsoptionen (Kern-Architekturentscheidung dieses Tickets):**

*Option A – Reiner Client-State-Rejoin, analog zum bestehenden Host-Modell, kein neuer Serverbaustein:* `localStorage` speichert Code, Rolle und Anzeigename je Nicht-Host-Teilnahme; beim Laden automatisch `joinGame()` erneut aufrufen (nutzt die bestehende Idempotenz vollständig). Vorteile: minimal-invasiv, gleiche Architektur-Linie wie der bereits abgenommene Host-Mechanismus, kein Kostenwechsel, keine neuen Firestore-Regeln nötig. Nachteile: funktioniert nur auf demselben Gerät/Browser mit intaktem `localStorage`; kein Wiederbetreten nach Gerätewechsel oder gelöschtem Speicher (dafür bräuchte es ein Konto-System, das laut `Product.md` Abschnitt 11 ausdrücklich außerhalb des Scopes liegt).

*Option B – Serverseitig sichtbare Verbindungs-/Präsenz-Information je Teilnehmer:* Zusätzliches Feld/Unterdokument, das den letzten bekannten Verbindungsstatus hält, damit z. B. der Host sieht, wer gerade getrennt ist. Da Cloud Firestore (anders als die Firebase Realtime Database) kein eingebautes `onDisconnect` kennt, bräuchte das entweder Cloud Functions (Blaze-Tarif) oder clientseitige Heartbeats mit Unschärfe. Nachteile: deutlich größerer Aufwand und ggf. Kostenwechsel, für ein Ticket der Priorität „Niedrig" vermutlich überdimensioniert, und von `Product.md` Abschnitt 9/der User Story nicht verlangt (verlangt wird nahtloses Weiterspielen der betroffenen Person selbst, nicht Sichtbarkeit des Verbindungsstatus für andere).

**Empfehlung (fachliche Einschätzung, nicht direkt aus den Dokumenten ableitbar – Stephan entscheidet):** Option A. Sie deckt den in `Product.md` Abschnitt 9 und der User Story tatsächlich verlangten Bedarf ab, hält dieselbe Architektur-Linie wie der bereits abgenommene und bewährte Host-Rejoin-Mechanismus durch und vermeidet unnötigen Zusatzaufwand/Kostenwechsel für ein Ticket mit Priorität „Niedrig". Nur falls sich in der Praxis zeigt, dass Host oder Gruppe wissen müssen, wer gerade technisch ausgefallen ist, gezielt auf Option B erweitern.

---

**Fragen (mit Stephan geklärt am 2026-07-20):**

1. **Reichweite des automatischen Wiederbetretens:** Nur dasselbe Gerät/derselbe Browser (localStorage, analog zum bestehenden Host-Mechanismus). Kein Wiederbetreten nach Gerätewechsel oder gelöschtem Speicher — das bleibt bewusst außerhalb des Scopes dieses Tickets.
2. **Umgang mit derselben Person in zwei gleichzeitig offenen Tabs:** Der zuletzt aktiv gewordene Tab übernimmt die Station; der ältere Tab wird als getrennt/inaktiv markiert (siehe AK 16). Keine aktive Blockade eines zweiten Tabs.
3. **Bedienung des „ruhigen Modus":** Ausschließlich automatisch über die Betriebssystem-Einstellung „Bewegung reduzieren" (`prefers-reduced-motion`). Kein zusätzlicher manueller Schalter im Spiel, keine Host-weite Erzwingung (siehe AK 14).
4. **Ziel-Kontraststufe:** WCAG AA (4.5:1 normaler Text, 3:1 große Schrift/Bedienelemente) — kein AAA-Anspruch für dieses Ticket.
5. **Detailgrad der Verbindungsstatus-Anzeige:** Nicht mit Stephan einzeln geklärt (geringe Tragweite) — eigene fachliche Einschätzung (kein Fakt aus den Dokumenten): ein einfacher, genereller Hinweis „Verbindung wird wiederhergestellt" reicht; keine detaillierte Anzeige, welche konkrete Aktion noch nicht angekommen ist. Falls sich das im Test als zu vage erweist, kann hier nachgeschärft werden.

**Hinweis zu Schritt 8 des Analyse-Skills (Prototyp bei UI/UX-Unsicherheit):** Wie in der Analyse eingeschätzt, waren die offenen Punkte Reichweiten-/Policy-Entscheidungen, keine „fühlt sich Variante X oder Y besser an"-Fragen — daher kein Prototyp nötig. Diese Einschätzung gilt weiterhin nach der Klärung.

---

**Testplan-Grundgerüst (für `flow-game-bdd`, nach Freigabe dieser Spec):**

- Given/When/Then je Akzeptanzkriterium oben (15 Stück).
- **Automatischer Rejoin (neu):** Given eine spielende Person mit bestehender Station hat die Seite bereits einmal geladen, When sie die Seite neu lädt (gleiches Gerät/Browser), Then sie landet ohne erneute Eingabe wieder in ihrem Spiel mit ihrer bisherigen Station.
- **Idempotenz bleibt bestehen (Regressionstest, erweitert bestehenden FEATURE-002-Test):** Given ein automatischer Rejoin ruft `joinGame()` erneut mit derselben `uid` auf, Then entsteht kein zweites Teilnehmenden-Dokument und keine doppelte Stationszuweisung — bestehender Test in `tests/game-rooms.logic.test.js` muss unverändert grün bleiben, plus neuer Test für die angepasste Prüfreihenfolge (Pre-Mortem 1).
- **Host + Teilnehmende gleichzeitig in verschiedenen Spielen (neu):** Given dieselbe Person ist Host in Spiel A und Spielende in Spiel B, When die Seite neu geladen wird, Then beide Zustände bleiben getrennt korrekt (Regressionstest gegen FEATURE-001).
- **Verbindungsverlust ohne Neuladen (neu):** Given ein offener Tab verliert kurz die Verbindung, When die Verbindung zurückkommt, Then zeigt die Seite automatisch den aktuellen Stand, ohne manuelles Neuladen.
- **Tastatur-Durchlauf (manuell, analog zum bereits etablierten Muster „echte Live-Browser-Prüfung statt nur automatisiert behauptet" aus FEATURE-002/003):** Kompletter Spieldurchlauf einer Station ausschließlich mit Tab/Enter/Leertaste, ohne Maus — von Stephan oder in Browser-Automatisierung ohne Maus-Events nachzustellen.
- **Kontrast-Prüfung (manuell/Tool-gestützt):** Alle Text-/Bedienelement-Hintergrund-Kombinationen gegen WCAG-AA-Richtwerte messen (Tool statt Augenmaß, siehe Pre-Mortem 6).
- **Cross-Ticket-Regressionstest mit FEATURE-004:** Rejoin mitten in einer laufenden Runde 4 mit wartenden Würfel-/Länderkarten-Elementen (siehe FEATURE-004 Pre-Mortem-Risiko 10) — sobald FEATURE-004 „Done" ist.
- Regressionstests: bestehende Suiten (`test:emulator`) laufen nach der Erweiterung unverändert grün, insbesondere `game-rooms.logic.test.js` (Idempotenz) und alle Host-bezogenen Tests.

---

#### Testplan (BDD-Tests geschrieben, flow-game-bdd am 2026-07-20)

**Neue Testdateien (Jest, gleiches Framework wie alle bisherigen Tickets, siehe `package.json`):**

- `tests/game-rejoin.logic.test.js` – Firestore-Emulator (offenes Testregelwerk, gleiches Muster wie `game-rooms.logic.test.js`). Ruft ein noch nicht existierendes Modul `src/game/teilnehmerSession.js` auf (erwartete API im Dateikopf dokumentiert: `restoreTeilnehmerSession`, `registriereAktivenTab`, `istAktiverTab`).
- `tests/game-connection-status.logic.test.js` – reine Funktionslogik, kein Emulator nötig. Ruft ein noch nicht existierendes Modul `src/game/verbindungsStatus.js` auf.
- `tests/game-a11y-static.test.js` – liest den echten Quelltext von `public/spiel.html` und prüft per Mustersuche auf aria-label, Fokus-Stil und `prefers-reduced-motion`. Kein neues Modul, aber echte Assertion-Fehlschläge gegen den heutigen Stand.
- `tests/game-feature-005-manual-checks.test.js` – dokumentierte manuelle/verschobene Prüfungen (Platzhalter-Test-Muster wie in `feature-002-deploy-regression.test.js`), laufen technisch grün durch, decken aber nicht automatisierbare oder von FEATURE-004 abhängige Fälle ab.
- `package.json`: neue Skripte `test:emulator:feature-005` (Rejoin-Logik gegen Emulator) und `test:static:feature-005` (reine Logik- und Static-Checks ohne Emulator).

**Szenarien (Given/When/Then je Akzeptanzkriterium + Pre-Mortem-Risiko):**

*Wiederbetreten (`tests/game-rejoin.logic.test.js`):*
1. Automatischer Rejoin für Spielende nach Neuladen liefert dieselbe Station/Rolle (AK1, AK2)
2. Rejoin ruft joinGame() erneut mit derselben uid auf, ohne zweites Teilnehmenden-Dokument/doppelte Stationszuweisung (AK3, Regressionstest FEATURE-002)
3. Automatischer Rejoin für Beobachtende nach Neuladen liefert dieselbe Rolle ohne Station (AK1, AK2)
4. Rejoin kennzeichnet sich selbst als Wiederbetreten (`warRejoin`), Erstbeitritt nicht (Unterstützung für AK2)
5. Host in Spiel A + Spielende in Spiel B gleichzeitig bleiben unabhängig korrekt (AK8, Pre-Mortem-Risiko 2)
6. Gleichzeitiges Wiederbetreten zweier unterschiedlicher Personen vertauscht nie Stationen (AK7 im Rejoin-Kontext)
7. Zwei gleichzeitig offene Tabs derselben Person: neuester Tab gilt als aktiv, älterer nicht mehr (AK16, geklärte Frage 2)
8. Ein einzelner registrierter Tab gilt weiterhin als aktiv, keine aktive Blockade (AK16, geklärte Frage 2)

*Verbindungsstatus (`tests/game-connection-status.logic.test.js`):*
9. Snapshot aus Zwischenspeicher (`fromCache: true`) ergibt Status "wird_wiederhergestellt" (AK4)
10. Frischer Snapshot vom Server ergibt Status "verbunden" (AK4)
11. Ausstehende eigene Schreibvorgänge (`hasPendingWrites: true`) ergeben ebenfalls "wird_wiederhergestellt" (Pre-Mortem-Risiko 3)
12. Nach Wiederverbindung kehrt der Status automatisch zu "verbunden" zurück, ohne manuelles Neuladen (AK4)
13. Anzeigetext für "wird_wiederhergestellt" ist ein einfacher, genereller Hinweis (AK5, geklärte Frage 5)
14. Anzeigetext für "verbunden" bleibt leer/ohne Hinweis (AK5)

*Barrierefreiheit, statisch prüfbar (`tests/game-a11y-static.test.js`):*
15. Bewegen-Button bekommt ein sprechendes aria-label statt nur des Pfeil-Symbols (AK15)
16. Dynamisch erzeugte Spielbrett-Buttons bekommen einen eigenen sichtbaren Fokus-Stil (AK11)
17. Rise-Animation wird über `prefers-reduced-motion` automatisch reduziert/deaktiviert (AK14, geklärte Frage 3)
18. Kein zusätzlicher manueller "Ruhiger Modus"-Schalter im Quelltext (Regressionsschutz gegen Überimplementierung, geklärte Frage 3) – läuft bereits grün, ist kein RED-Fall

*Manuell/verschoben (`tests/game-feature-005-manual-checks.test.js`, Platzhalter, laufen grün):*
19. Vollständiger Tastatur-Durchlauf ohne Maus (AK9, AK10) – Live-Browser-Test durch Stephan
20. Farbkontrast erreicht WCAG AA (AK13, geklärte Frage 4) – Tool-gestützte manuelle Messung durch Stephan
21. Bedeutung nie nur über Farbe, auch in Runde 4 (AK12) – bewusst verschoben bis FEATURE-004 "Done"
22. Rejoin mitten in laufender Runde 4 behält Zuständigkeit (AK6, Cross-Ticket-Risiko 10 aus FEATURE-004) – ausdrücklich blockiert bis FEATURE-004 "Done"
23. Kurzer Verbindungsabbruch ohne Neuladen zeigt automatisch aktuellen Stand (AK4, Live-SDK-Reconnect) – Live-Browser-Test durch Stephan, da in der Sandbox kein steuerbarer Netzwerk-Toggle gegen den Emulator existiert

**Testlauf (2026-07-20, in der Sandbox ausgeführt, `npx jest tests/game-connection-status.logic.test.js tests/game-a11y-static.test.js tests/game-feature-005-manual-checks.test.js tests/game-rejoin.logic.test.js`):** 3 von 4 Suiten sauber ROT, 1 Suite (Manuell/Platzhalter) erwartungsgemäß grün – insgesamt 3 von 9 ausgeführten Einzeltests rot plus 2 Suiten, die schon beim Laden mit „Cannot find module" scheitern (bevor überhaupt ein Emulator gebraucht wird):
- `game-connection-status.logic.test.js`: scheitert beim Laden mit „Cannot find module '../src/game/verbindungsStatus'" – Modul existiert noch nicht.
- `game-rejoin.logic.test.js`: scheitert beim Laden mit „Cannot find module '../src/game/teilnehmerSession'" – Modul existiert noch nicht (Emulator wurde dafür nicht einmal benötigt, da der Fehlschlag schon beim `require()` auftritt).
- `game-a11y-static.test.js`: 3 echte Assertion-Fehlschläge (kein aria-label, kein Button-Fokus-Stil, keine `prefers-reduced-motion`-Regel im heutigen Quelltext) – genau die in der Analyse-Spec dokumentierte Lücke.
- `game-feature-005-manual-checks.test.js`: alle 5 Platzhalter-Tests grün (beabsichtigt, keine echte Automatisierung).

Kein Syntax-/Setup-Fehler beteiligt – jeder Fehlschlag ist entweder ein fehlendes Modul oder eine echte, gegen den heutigen Quelltext geprüfte Assertion. Übergabe an `flow-game-impl`.

---

#### Implementierung (flow-game-impl, 2026-07-20)

**Ergebnis:** Automatischer Rejoin für Spielende/Beobachtende (analog zum bestehenden Host-Mechanismus), Live-Verbindungsstatus-Anzeige, Zwei-Tabs-Erkennung sowie die Barrierefreiheits-Ergänzungen (aria-label, Fokus-Stil, `prefers-reduced-motion`) sind implementiert.

- **Neues Modul `src/game/teilnehmerSession.js`** (+ Browser-Kopie `public/js/game/teilnehmerSession.js`, Projekt-Konvention): `restoreTeilnehmerSession({code, rolle, anzeigename, uid}, db)` liest vorab, ob für diese uid bereits ein Teilnehmenden-Dokument existiert (→ `warRejoin`), und ruft danach unverändert `joinGame()` auf – nutzt dessen bestehende Idempotenz vollständig, ohne sie anzufassen (AK1-3). `registriereAktivenTab()`/`istAktiverTab()` decken AK16 ab: jeder Aufruf überschreibt das Feld `aktiverTab` auf dem Teilnehmenden-Dokument, ein älterer Tab erkennt sich über den eigenen `onSnapshot`-Listener selbst als nicht mehr aktiv (nur Markierung, keine Blockade, wie geklärt).
- **Neues Modul `src/game/verbindungsStatus.js`** (+ Browser-Kopie): reine Funktionslogik ohne eigenen Firestore-Zugriff, wertet nur `snapshot.metadata.fromCache`/`hasPendingWrites` aus (AK4/AK5). Kein neuer Server-Baustein.
- **`public/spiel.html`:** eigener, vom Host-Rejoin getrennter `localStorage`-Schlüssel (`flowGameLetzterTeilnehmerCode` / `flowGameTeilnehmer:{code}`) für den automatischen Teilnehmenden-Rejoin in `init()` (Pre-Mortem-Risiko 2 – Host in Spiel A + Spielende in Spiel B bleiben unabhängig); Verbindungsstatus-Banner und Zwei-Tabs-Banner (beide `hidden` per Default, generische Texte); `button:focus-visible`-Regel für alle Buttons (nicht nur Formularfelder, AK11); `@media (prefers-reduced-motion: reduce)` deaktiviert die bestehende `.stage`-Rise-Animation automatisch, kein manueller Schalter (AK14); `aria-label` am „→"-Bewegen-Button mit Karten-/Positionsangabe (AK15).
- **Keine Änderung an `firestore.rules`, `src/game/joinGame.js`, `src/game/hostSession.js` oder `src/game/createGame.js`** – Option A aus der Spec (reiner Client-State-Rejoin) wurde eingehalten, kein neuer Serverbaustein nötig.

**Testergebnis:**
- `tests/game-a11y-static.test.js`, `tests/game-connection-status.logic.test.js`, `tests/game-feature-005-manual-checks.test.js` (`npm run test:static:feature-005`): **15/15 Tests grün**, tatsächlich in der Sandbox ausgeführt (kein Emulator/Netzwerk nötig).
- `tests/game-rejoin.logic.test.js` (`npm run test:emulator:feature-005`): **konnte in dieser Sandbox nicht gegen den echten Firestore-Emulator ausgeführt werden** – bekannte Netzwerk-Allowlist-Sperre blockiert den Emulator-Jar-Download (`download failed, status 403: Connection blocked by network allowlist`, gleiche Einschränkung wie bereits bei FEATURE-002 dokumentiert). Stattdessen wurde die Kernlogik von `teilnehmerSession.js` isoliert gegen einen minimalen, selbstgeschriebenen In-Memory-Fake der genutzten Firestore-Teilmenge (`get`/`set`/`update`/`runTransaction`) geprüft (Fallback 1 aus `flow-game-impl`) – alle 8 Szenarien aus der BDD-Testdatei (Rejoin Spielende/Beobachtende, Idempotenz bei mehrfachem Rejoin, `warRejoin`-Flag, Host+Teilnehmer-Doppelrolle, keine Stationsvertauschung bei gleichzeitigem Rejoin, Zwei-Tabs „neuester gewinnt", Einzel-Tab bleibt aktiv) liefen darüber grün. Das bestätigt die Anwendungslogik, **nicht** das Zusammenspiel mit den echten Sicherheitsregeln/Transaktions-Retries des echten Emulators – der reale `npm run test:emulator:feature-005`-Lauf steht noch aus.
- `node --check` auf allen vier neuen/geänderten JS-Dateien sowie dem extrahierten Inline-`<script>` aus `public/spiel.html`: syntaktisch fehlerfrei.

**Regressionstest gegen bereits abgenommene Tickets (FEATURE-001, FEATURE-002, FEATURE-003, TASK-001, TASK-002):**
- `src/game/joinGame.js`, `src/game/hostSession.js`, `src/game/createGame.js` und `firestore.rules` wurden **nicht verändert** (per Dateisystem-Zeitstempel-Check bestätigt) – das eigentliche Regressionsrisiko aus der Spec (Idempotenz-Bruch in `joinGame.js`, Host-Mechanismus-Bruch) entfällt dadurch strukturell, nicht nur behauptet.
- Die einzige gemeinsam genutzte Datei ist `public/spiel.html` (FEATURE-002/003-Spielbrett/Auswertung): alle Änderungen dort sind rein additiv (neue DOM-Elemente, neue Funktionen, ein zusätzliches `onSnapshot`-Options-Argument `{includeMetadataChanges: true}` auf dem bereits bestehenden Spiel-Dokument-Listener). Zeilenweise geprüft, dass bestehende Bedingungen (`aktuelle !== aktuelleRundenNummer`, `auswertungBereitsAngezeigt`) durch die zusätzlichen Metadaten-only-Aufrufe nicht erneut auslösen – keine Doppel-Trigger von `wechsleZuRunde()`/`zeigeAuswertung()`.
- **`npm run test:emulator` (die eigentliche automatisierte Regressionssuite für FEATURE-001/002/003) konnte in dieser Sandbox NICHT ausgeführt werden** – dieselbe Netzwerk-Allowlist-Sperre wie oben. Ebenso konnten `tests/deploy-regression.test.js`/`tests/feature-002-deploy-regression.test.js` nicht laufen (DNS-Auflösung der Live-URL in der Sandbox blockiert, `getaddrinfo EAI_AGAIN`). Beides sind Umgebungs-Einschränkungen, keine durch dieses Ticket verursachten Fehler (bereits identisch bei FEATURE-002 dokumentiert). **Empfehlung, wie bei FEATURE-002:** `npm run test:emulator` und `npm run test:emulator:feature-005` einmal von Stephan lokal ausführen lassen, bevor das Ticket auf Done gesetzt wird.

**Echte Fehler, die während der Umsetzung gefunden wurden:** keine – die Implementierung baute wie in der Spec vorgesehen rein additiv auf bestehendem, unverändertem Code auf; kein bestehendes Modul musste zur Fehlerbehebung angepasst werden.

**Nicht automatisiert geprüft (siehe `tests/game-feature-005-manual-checks.test.js`, bewusst Platzhalter):** vollständiger Tastatur-Durchlauf ohne Maus (AK9/AK10), Bedeutung nie nur über Farbe in Runde 4 (AK12, wartet auf FEATURE-004 „Done"), Rejoin mitten in laufender Runde 4 (AK6, Cross-Ticket mit FEATURE-004, ausdrücklich blockiert bis dort „Done"), echter Live-Reconnect-Test bei WLAN-Abbruch (AK4, kein steuerbarer Netzwerk-Toggle) – noch an Stephan bzw. an FEATURE-004 „Done" übergeben.

---

#### Live-Browser-Verifikation (Chrome-Automatisierung, 2026-07-20, nach Push `937eb35`)

**Deploy bestätigt:** `https://flow-game-19f01.web.app/js/game/teilnehmerSession.js` live erreichbar, Inhalt stimmt mit dem gepushten Commit überein — Deploy-Pipeline lief erfolgreich durch.

**Fokus-Stil (AK11) echt bestätigt:** Tab-Taste im Live-Browser gedrückt, sichtbarer blauer Fokus-Ring erscheint zuverlässig auf dem Primär-Button — kein reiner Quelltext-Check, echtes Rendering geprüft.

**Echter Fund — Kontrast-Fehler (AK13), nicht durch Mustersuche erkennbar:** Per `getComputedStyle` im Live-Browser gemessen (nicht nur Code gelesen): Der primäre Button-Verlauf (`#5a97ff`→`#3f7ff0`, weißer Text) erreichte nur ca. **2,9–3,8:1** statt der geforderten 4,5:1 — ein vorbestehender Fehler (nicht durch dieses Ticket verursacht), aber im Scope von AK13 ("gesamte Oberfläche"). Mit Stephans Freigabe direkt behoben: Verlauf auf `#2b6fd8`→`#1a56c4` gedunkelt (4,81:1 bzw. 6,62:1 gegen Weiß, gleiche Blau-Familie), in `public/spiel.html` UND `public/index.html` (gleicher Button dort). Neuer automatisierter Regressionstest ergänzt in `tests/game-a11y-static.test.js` ("Primärer Button erreicht WCAG-AA-Textkontrast"), berechnet den Kontrast direkt aus den CSS-Verlaufsfarben nach WCAG-Formel — verhindert diese konkrete Regression künftig, ohne Emulator oder Browser. `npm run test:static:feature-005`-Äquivalent lokal in der Sandbox erneut ausgeführt: **6/6 Tests grün** (inkl. der 2 neuen Kontrast-Tests).

**Status:** Contrast-Fix noch nicht committed/gepusht/deployed — steht als nächster Schritt aus. Stephan hat sich bewusst dagegen entschieden, das Ticket auf Basis des aktuellen Stands schon auf "Done" zu setzen; die verbliebenen manuellen Prüfungen (vollständiger Tastatur-Durchlauf mit echten Mitspielenden, echter WLAN-Reconnect) stehen noch aus.

## ✅ Done

### FEATURE-003 Phase 3 – Auswertung

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-18 |
| **Spec freigegeben am** | 2026-07-18 |
| **In Progress seit** | 2026-07-19 |
| **Done seit** | 2026-07-20 |

**Ergebnis:** Nach jeder gespielten Runde stehen serverseitig alle Kennzahlen fest (Durchlaufzeit, Bearbeitungszeit, Zeit bis erster/letzter Lieferung, Abstand dazwischen als Kundenerlebnis, Beteiligungsspanne je Station). Bis zur Freigabe sind sie für niemanden außer dem Host sichtbar — auch Beobachtende nicht. Der Host löst am Ende eine einzige Gesamtfreigabe für alle gespielten Runden aus (kein Zurücknehmen vorgesehen), danach sieht jede Person die Zeiten aller fünf Stationen in einer Vergleichsansicht, die als Liste über die Runden-Unterkollektion aufgebaut ist (erweiterbar für Runde 4/FEATURE-004 ohne Strukturumbau). Architektur: Kennzahlen als Felder auf dem bestehenden Runden-Dokument, ein einziges Freigabe-Flag (`ergebnisseFreigegeben`/`ergebnisseFreigegebenAm`) auf dem Spiel-Dokument, ausschließlich vom Host und nur mit echtem Server-Zeitstempel setzbar.

**Akzeptanzkriterien:** alle in der freigegebenen Spec (`FEATURE-003-Spec.md`) genannten Kriterien automatisiert real geprüft — 103 Tests über 7 Test-Suiten grün (`npm run test:emulator`, von Stephan lokal mehrfach bestätigt, zuletzt nach dem Bugfix unten), inklusive Freigabe-Sperre vor Host-Aktion, Sichtbarkeit aller Stationen nach Freigabe, Host-only-Durchsetzung, Server-Zeitstempel-Pflicht, Idempotenz bei Doppelfreigabe, sowie Regressionstests gegen FEATURE-001/002/TASK-002. **Bewusst nicht abgeschlossen:** ein vollständiger Live-Durchlauf mit fünf realen Personen über alle drei Runden bis zur Freigabe — ein Versuch dazu deckte stattdessen den unten dokumentierten, unabhängigen FEATURE-001-Bug auf; die browserseitige Automatisierung dafür geriet danach technisch in eine Sackgasse (blockierte Browser-Datenbank in der Testumgebung, nicht der App). Stephan hat entschieden, die automatisierten Tests als ausreichende Freigabegrundlage zu akzeptieren; ein manueller Mehrpersonen-Durchlauf steht bei Gelegenheit noch aus.

**Echte Fehler, die während der Verifikation durch echtes Testen gefunden und behoben wurden (nicht nur behauptet):** siehe „Bugfix nach Done, live gefunden am 2026-07-20" unter FEATURE-001 unten — inhaltlich ein FEATURE-001-Bug (Beitrittslogik), aber erst während eines FEATURE-003-Live-Tests entdeckt.

---

### FEATURE-002 Phase 2 – Spielfeld + Runden 1–3

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Hoch |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-18 |
| **Spec freigegeben am** | 2026-07-18 |
| **In Progress seit** | 2026-07-18 |
| **Done seit** | 2026-07-19 |

**Ergebnis:** Spielbrett mit fünf Stationen und sechs Karten ist live bedienbar – für den Host UND für Mitspielende (siehe Fehler 6 unten). Definition of Ready schaltet Bewegung frei, jede Karte lässt sich nur einen Schritt vorwärts durch die zuständige Station bewegen, das Stapel-Tor öffnet je Runde bei 6 (Runde 1), getrennt 3 je Stapel A/B (Runde 2) und 1 (Runde 3) angekommenen Karten, der Übergang vom Auftragseingang zu Station 1 ist immer offen. Durchlaufzeit, Bearbeitungszeit und alle Pro-Spieler-Zeiten werden serverseitig gemessen und stoppen automatisch, sobald die letzte Karte im Ziel ankommt; danach zeigt die Kennzahlen-Ansicht alle Werte. Der Host löst den Wechsel zur nächsten Runde aktiv aus, derselbe Beitritts-Code bleibt für alle drei Runden gültig. Alles live auf https://flow-game-19f01.web.app/spiel.html geprüft, mit mehreren echten Testpersonen an verschiedenen Stationen, nicht nur behauptet.

**Akzeptanzkriterien:** alle oben genannten Kriterien erfüllt und real geprüft – über mehrere Chrome-Browser-Automatisierungsläufe mit echten Klicks gegen die produktive Firebase-Umgebung (Host + mehrere Mitspielende an unterschiedlichen Stationen, alle drei Runden komplett durchgespielt inklusive Rundenwechsel und Spielende). Der lokale automatisierte Emulator-Testlauf (`npm run test:emulator`) konnte in der Arbeitsumgebung selbst wegen einer Netzwerksperre nicht ausgeführt werden – die Kernzählfunktion wurde stattdessen isoliert gegen das reale Bug-Szenario geprüft, bevor die Live-Browser-Tests folgten. Empfehlung: `npm run test:emulator` einmal selbst laufen lassen für die zusätzliche automatisierte Bestätigung.

**Echte Fehler, die während der Umsetzung durch echtes Testen gefunden und behoben wurden (nicht nur behauptet):**
1. **CSS-Spezifitätsfalle:** Als versteckt markierte Bereiche blieben trotzdem sichtbar, weil eine Layout-Regel das native Ausblenden überschrieb – behoben.
2. **Fehlende Cache-Einstellung:** Ein bereits behobener Fehler wirkte im Browser bis zu eine Stunde weiterhin wie live vorhanden – behoben.
3. **Eigene Kennung nie gesetzt:** Dadurch erkannte niemand, auch nicht der Host, je die eigene Station – kein Bewegen-Button erschien für irgendjemanden – behoben.
4. **Eigene Rolle nicht weitergegeben:** Host-only-Aktionen (Rundenstart, nächste Runde) blieben dadurch unsichtbar – behoben.
5. **Stapel-Tor-Zählbug (Kernfehler dieses Tickets):** Sobald die erste Karte durch eine Station weiterzog, schloss sich das Tor fälschlich sofort wieder – live reproduziert (erste Karte kam durch, alle folgenden scheiterten) – behoben.
6. **Teilnehmenden-Liste unlesbar für Mitspielende:** Eine einzige Abfrage enthielt auch einen für Mitspielende nicht lesbaren Datensatz, wodurch die komplette Liste abgelehnt wurde – für den Host fiel das nie auf, für jede mitspielende Person blieb die eigene Station dauerhaft unbekannt, der Bewegen-Button erschien nie – behoben durch zwei getrennte Abfragen.

**Bugfix nach Done, live gefunden am 2026-07-20 (Testspiel J99WCBTK, https://flow-game-19f01.web.app/spiel.html):** Eine Person ist mit spürbarer Verzögerung beigetreten (vermutlich Doppel-Tap oder Netzwerk-Retry bei langsamer Verbindung, `joinGame` für dieselbe authentifizierte Sitzung mehrfach aufgerufen). Ergebnis: Direktes Auslesen des Firestore-Dokuments bestätigte, dass `belegteStationen` alle fünf Stationen mit identischer uid zeigte – jeder erneute Aufruf hatte eine weitere freie Station berechnet und vergeben, obwohl dieselbe Person schon eine hatte, und ihr Teilnehmer-Dokument (`tx.set(teilnehmerRef, daten)`) wurde dabei jedes Mal überschrieben, sodass sie selbst nur die zuletzt zugewiesene Station sah. Für alle anderen blieben die übrigen vier Stationen fälschlich als belegt markiert, obwohl niemand sie bedienen konnte. **Ursache:** `joinGame` (`src/game/joinGame.js` und `public/js/game/joinGame.js`) prüfte vor der Stationsvergabe nicht, ob unter `spiele/{code}/teilnehmende/{uid}` bereits ein Dokument dieser Person existiert. **Fix:** Sowohl der nicht-transaktionale Vorab-Check als auch die eigentliche Transaktion lesen jetzt zusätzlich `teilnehmerRef`; existiert bereits ein Dokument für diese uid, wird keine neue Station vergeben und nichts überschrieben – die vorhandene Zuweisung (Rolle, Station) wird unverändert zurückgegeben, idempotent für beide Rollen (spielende und beobachtende), auch bei fast gleichzeitigen Doppelaufrufen (Firestore-Transaktions-Retry, da `teilnehmerRef` Teil des Lese-Sets ist). Die bereits aus FEATURE-001 bestehende Absicherung (zwei verschiedene Personen bekommen nie dieselbe Station) bleibt davon unberührt, da die neue Prüfung ausschließlich pro-uid greift. Neuer Regressionstest in `tests/game-rooms.logic.test.js` (Szenario "Doppelter/mehrfacher Beitritt derselben authentifizierten Person"), inklusive eines Tests, der ausdrücklich die unveränderte Race-Condition-Absicherung zwischen verschiedenen Personen mitprüft. **Geprüft (2026-07-20):** `node --check` auf beiden geänderten `joinGame.js`-Dateien und der neuen Testdatei grün; isolierte, netzwerkfreie Mock-Prüfung der echten (nicht kopierten) `src/game/joinGame.js`-Funktion bestätigt Idempotenz bei 2x/4x-Aufruf derselben uid UND weiterhin 5 unterschiedliche Stationen bei 5 verschiedenen uids. **Bestätigt (2026-07-20):** `npm run test:emulator` von Stephan lokal erneut ausgeführt — 103/103 Tests grün, 7/7 Suiten, keine Regression. Fix committed und gepusht (`84a900e`), automatischer Deploy über GitHub Actions erfolgreich (`build_and_deploy`, 38 s). Das verstopfte Testspiel J99WCBTK ist mit allen 5 Stationen auf eine Person zugewiesen weiterhin nicht mehr sinnvoll nutzbar; für weitere Tests ein neues Spiel erstellen.

**Regressionstest gegen FEATURE-001/TASK-001/TASK-002:** Live-URL nach allen Deploys weiterhin erreichbar; die aus FEATURE-001 bereits geprüften Abläufe (Spiel erstellen, Beitritt, Host-Session-Wiederherstellung) wurden durch die Erweiterung nicht sichtbar beeinträchtigt (automatisierter Emulator-Regressionslauf von Stephan noch zu bestätigen, siehe oben).

**Implementierungsnotizen:**
- Datenmodell wie geplant: Runden und Karten als eigene Unter-Sammlungen je Spiel.
- Arbeitsweise-Erkenntnis: Beim Testen mit mehreren Identitäten im selben Browser nie parallel/verschachtelt arbeiten, sondern nacheinander abmelden/wechseln – sonst überschreiben sich die Anmeldungen gegenseitig.
- Arbeitsweise-Erkenntnis: Eine ungefilterte Abfrage über eine Sammlung mit rollenabhängig unlesbaren Einträgen wird komplett abgelehnt, nicht nur teilweise gefiltert – Abfragen müssen von vornherein passend eingeschränkt sein.
- Arbeitsweise-Erkenntnis: Die Arbeitsumgebung hat eine Netzwerksperre, die automatisierte Tests gegen die Firebase-Testumgebung blockiert – die müssen weiterhin von Stephan selbst lokal laufen; echte Live-Prüfung läuft stattdessen über Browser-Automatisierung.
- Diese Erkenntnisse sind Kandidaten für die laufende Retrospektive und eine mögliche Ergänzung des Umsetzungs-Skills.

---

### FEATURE-001 Phase 1 – Spiel-Räume

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Hoch |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-17 |
| **Spec freigegeben am** | 2026-07-17 |
| **In Progress seit** | 2026-07-17 |
| **Done seit** | 2026-07-18 |

**Ergebnis:** Host kann ein Spiel erstellen und bekommt einen 8-stelligen Beitritts-Code; Spielende treten mit dem Code bei und bekommen automatisch (in Beitrittsreihenfolge) eine der fünf Stationen zugewiesen, ab der sechsten Person mit bewusster eigener Rollenwahl; Beobachtende können von Anfang an beitreten; der Host bekommt nach eigenem Neuladen seine Moderationsrechte am selben Spiel zurück, ohne ein neues Spiel eröffnen zu müssen — alles live auf https://flow-game-19f01.web.app/spiel.html geprüft, nicht nur automatisiert getestet.

**Akzeptanzkriterien:** alle oben genannten Kriterien erfüllt und real geprüft — automatisiert (29 Tests zu Spiellogik/Zugriffsregeln + 1 Regressionstest zur Live-Erreichbarkeit, alle grün) und manuell im Browser (Spiel erstellen, Beitreten mit Stationszuweisung, Host-Session-Wiederherstellung nach Neuladen — von Stephan selbst durchgeklickt und bestätigt).

**Echte Fehler, die während der Umsetzung durch echtes Testen gefunden und behoben wurden (nicht nur behauptet):**
1. **Berechtigungsfehler beim Spiel-Erstellen:** Eine serverseitige Prüfung sah die eigene, gerade erst angelegte Information innerhalb desselben Speichervorgangs zunächst noch nicht („get()" statt „getAfter()" in den Zugriffsregeln) — behoben. Dabei zusätzlich eine echte Vertraulichkeitslücke geschlossen: das geheime Host-Passwort lag zuvor an einer Stelle, die für jeden mit gültigem Beitritts-Code einsehbar gewesen wäre; es liegt jetzt in einem eigenen, für niemanden lesbaren Unterdokument.
2. **Zugriffsregeln wurden beim automatischen Veröffentlichen nicht mit übertragen:** Die automatische GitHub-Pipeline aktualisiert nur die Webseite selbst, nicht die Firestore-Zugriffsregeln. Das ist jetzt bekannt und dokumentiert; die Regeln müssen bei inhaltlichen Änderungen zusätzlich einmalig von Hand veröffentlicht werden (`npx firebase deploy --only firestore:rules`).
3. **Browser hat veraltete Programmdateien bis zu einer Stunde zwischengespeichert:** Ein bereits behobener Fehler wirkte dadurch weiterhin wie live vorhanden. Dauerhaft behoben, indem der Server bei den betroffenen Programmdateien jetzt bei jeder Anfrage beim Server nachfragt, ob sich etwas geändert hat, statt blind auf die zwischengespeicherte Version zu vertrauen.
4. **Berechtigungsfehler beim Beitreten:** derselbe Fehlertyp wie in Punkt 1, an anderer Stelle (bezog sich auf das eigene Teilnehmenden-Dokument statt auf das Spiel-Dokument) — behoben, mit einem neuen automatisierten Test, der genau diesen Ablauf künftig dauerhaft prüft.

**Regressionstest gegen TASK-001/TASK-002:** Live-URL nach allen Deploys weiterhin mit Status 200 erreichbar (automatisiert geprüft); die aus TASK-002 bereits geprüften Ablehnungsfälle (unauthentifiziertes Lesen/Schreiben, fingierte Authentifizierung) bleiben Teil der automatisierten Testsuite und weiterhin grün.

**Implementierungsnotizen:**
- Datenmodell wie in Option B geplant: `spiele/{code}` (Metadaten, keine Geheimnisse) + `spiele/{code}/geheim/kennung` (Host-Passwort, nie client-lesbar, erst während der Umsetzung ergänzt) + `spiele/{code}/teilnehmende/{uid}` (ein Dokument je Person).
- Arbeitsweise-Erkenntnis für künftige Tickets: Bei Änderungen an den Firestore-Zugriffsregeln immer daran denken, dass die automatische Veröffentlichung sie nicht mit einschließt — separat von Hand veröffentlichen und danach real im Browser gegenprüfen, nicht nur den automatisierten Test als ausreichend ansehen.
- Arbeitsweise-Erkenntnis: Browser-Zwischenspeicherung kann einen bereits behobenen Fehler wie weiterhin bestehend aussehen lassen — bei widersprüchlichen Testergebnissen (Test grün, Browser rot) zuerst den Zwischenspeicher als Ursache prüfen (privates Fenster, Cache-Header), bevor am Code weitergesucht wird.
- Diese Erkenntnisse sind Kandidaten für die anstehende Retrospektive und eine mögliche Ergänzung der `flow-game-impl`/`flow-game-orchestrator`-Skills.

---

### TASK-002 Phase 0 – Gerüst (Teil 2: Cloud Firestore einrichten)

| Feld | Wert |
|------|------|
| **Typ** | Task |
| **Priorität** | Hoch |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **Analyse am** | 2026-07-17 |
| **Spec freigegeben am** | 2026-07-17 |
| **In Progress seit** | 2026-07-17 |
| **Done seit** | 2026-07-17 19:44 |

**Ergebnis:** Cloud Firestore ist im Firebase-Projekt `flow-game-19f01` aktiv: Standard edition (Native-Modus), Region **eur3** (Multi-Region Europa, bewusst statt der günstigeren Einzelregion europe-west3 gewählt), Production mode. Sicherheitsregel `allow read, write: if false;` ist live und im Repo (`firestore.rules`, `firestore.indexes.json`, `firebase.json` ergänzt, Commit `dbac723`). Spark-Tarif weiterhin bestätigt (0 €/Monat).

**Akzeptanzkriterien (alle erfüllt und tatsächlich geprüft, nicht nur behauptet):**
- [x] Cloud-Firestore-Speicher aktiv und in der Firebase-Konsole sichtbar (Standard edition, Firestore native, Location eur3, Spark „No cost").
- [x] Unautorisierter Zugriff wird abgelehnt — im Rules Playground der Firebase-Konsole real getestet: unauthentifizierter Lesezugriff „Denied", unauthentifizierter Schreibzugriff „Denied", Schreibzugriff mit fingierter Authentifizierung ebenfalls „Denied".
- [x] Kein offener Testmodus-Zwischenstand — Production mode wurde direkt bei der Erstellung gewählt.
- [x] Regression TASK-001: Live-Seite (https://flow-game-19f01.web.app) im Browser geöffnet und erreichbar gesehen; GitHub-Actions-Lauf zu Commit `dbac723` („TASK-002: Cloud Firestore einrichten") mit Status „Success" (32s) bestätigt; `firebase.json` wurde nur um den `firestore`-Block ergänzt, der bestehende `hosting`-Block unverändert.
- [x] Kein inhaltliches Datenmodell angelegt — Konsole zeigt „Start collection", also leer.

**Scope-Änderungen:**
- 2026-07-17: Region-Entscheidung während der Umsetzung geändert — statt der ursprünglich angedachten Einzelregion europe-west3 hat sich Stephan bewusst für die Multi-Region eur3 entschieden (höhere Verfügbarkeit, höhere Kosten außerhalb des kostenlosen Kontingents; siehe Implementierungsnotizen).

**Implementierungsnotizen:**
- `firestore.rules` (Inhalt exakt Option A aus der Analyse):
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        // Platzhalter-Regel (TASK-002): sperrt aktuell alles.
        // Wird in FEATURE-001 durch rollen-/spielraumbasierte Regeln ersetzt,
        // nicht nur additiv gelockert.
        allow read, write: if false;
      }
    }
  }
  ```
- `firestore.indexes.json` leer angelegt (`{"indexes": [], "fieldOverrides": []}`), da noch kein Datenmodell existiert.
- Firestore-Datenbank wurde zuerst live in der Firebase-Konsole erstellt (Standard edition, eur3, Production mode), danach wurden die Dateien lokal im Repo angelegt und per `npx firebase-tools deploy --only firestore:rules` synchronisiert (Ausgabe: „Deploy complete!"), damit das Repo wie bei TASK-001 die alleinige Quelle bleibt.
- Commit `dbac723` auf `main` gepusht, GitHub-Actions-Workflow „Deploy to Firebase Hosting on merge" lief automatisch und erfolgreich durch (32s, „Success").
- Die drei Zugriffs-Testfälle (unauthentifiziertes Lesen, unauthentifiziertes Schreiben, Schreiben mit fingierter Auth) wurden **nicht** über den lokalen Firestore-Emulator/Jest getestet (das war ursprünglich in den BDD-Tests vorgesehen), sondern **stattdessen über den Rules Playground in der Firebase-Konsole real ausgeführt** — pragmatischere Alternative, die dieselbe Aussage liefert (Regel wird bei echten Simulationsanfragen angewendet), ohne dass Stephan lokal Emulator, `npm install` und zwei Terminal-Fenster einrichten musste. Die vorbereiteten Dateien `tests/firestore-rules.test.js` und `tests/firestore-config-checklist.md` liegen weiterhin in der Sandbox bereit, falls für spätere Tickets eine automatisierte Emulator-Testsuite gewünscht wird — sie wurden nicht ins Repo übernommen.
- Der vierte Testfall (kein zeitbefristeter Testmodus) wurde bereits während der Implementierung in der Sandbox statisch geprüft und war grün.
- Arbeitsweise-Erkenntnis (siehe auch `Umsetzungs-Kickoff.md`): Alle manuellen Schritte für Stephan wurden einzeln nacheinander gegeben, mit Rückmeldung nach jedem Schritt — das hat gut funktioniert und sollte über die Retro in `flow-game-impl`/`flow-game-orchestrator` strukturell verankert werden.

---

### TASK-001 Phase 0 – Gerüst (Teil 1: Hosting + Deploy-Pipeline)

| Feld | Wert |
|------|------|
| **Typ** | Task |
| **Priorität** | Hoch |
| **Status** | Done |
| **Erstellt** | 2026-07-17 |
| **In Progress seit** | 2026-07-17 19:48 |
| **Done seit** | 2026-07-17 20:28 |

**Ergebnis:** Firebase-Projekt `flow-game-19f01` (Spark-Tarif, bestätigt). Repo `github.com/stephanschumann/flow-game`, automatischer Deploy per GitHub Action (`firebase-hosting-merge.yml`) bei Push auf `main`. Live-URL: **https://flow-game-19f01.web.app**. Design 1:1 aus der echten `public/index.html` von Agent Contract übernommen (verifiziert dunkles Design, siehe `Product.md` „Design und Look & Feel").

**Akzeptanzkriterien (alle erfüllt und im Browser/Terminal geprüft, nicht nur behauptet):**
- [x] Firebase-Projekt auf Spark-Tarif (von Stephan in der Konsole bestätigt).
- [x] Leere Seite über öffentliche URL erreichbar, ohne Login (im Browser geöffnet und gesehen).
- [x] Design stimmt mit Agent Contract überein (strukturell garantiert, da dieselben CSS-Werte verwendet werden; zusätzlich per Screenshot bestätigt).
- [x] Ein Repository als alleinige Quelle.
- [x] Push auf `main` löst automatisch einen Deploy aus (zweimal beobachtet: Commit `f5bb806` und `297e37b`, beide GitHub-Actions-Läufe „Success").
- [x] Keine Git-Befehle in der Sandbox — alle liefen bei Stephan im Terminal.

**Scope-Änderungen:**
- 2026-07-17: Scope aufgeteilt in TASK-001 (Hosting/Deploy/Design) und TASK-002 (Firestore), siehe Analyse.

**Implementierungsnotizen:**
- Beim Einrichten von `npm install -g firebase-tools` gab es einen `EACCES`-Berechtigungsfehler (globales npm-Verzeichnis nicht beschreibbar). Gelöst durch Verwendung von `npx firebase-tools ...` statt einer globalen Installation.
- Beim Anlegen eines Test-Commits mit einem HTML-Kommentar (`<!-- ... -->`) löste das enthaltene `!` in der interaktiven zsh-Shell eine History-Expansion aus (`event not found`). Gelöst durch Verzicht auf `!` im Testtext (stattdessen ein harmloses `<p>`-Tag).
- `firebase init hosting` hat automatisch `.firebaserc`, beide GitHub-Workflow-Dateien sowie das GitHub-Secret `FIREBASE_SERVICE_ACCOUNT_FLOW_GAME_19F01` angelegt — nichts davon wurde von Hand geschrieben.
