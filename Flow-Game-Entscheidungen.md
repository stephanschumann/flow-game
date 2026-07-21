# Flow Game – Entscheidungen (laufendes Protokoll)

Dieses Dokument hält verbindlich getroffene Entscheidungen fest, fortlaufend datiert. Formulierung bewusst in Alltagssprache.

---

## 2026-07-17 — Pädagogischer Kern: zwei Arten von Parallelität

Das Spiel macht zwei **gegensätzliche** Wahrheiten erlebbar und misst beide:

- **Gute Parallelität (Fluss):** Eine Aufgabe in kleine Schritte zerlegen, die von mehreren Personen fokussiert nebeneinander bearbeitet werden → frühere und schnellere Lieferung. Jede Person bleibt bei einem Aufgabentyp, kein Kontextwechsel.
- **Schlechte Parallelität (Multitasking):** Eine einzelne Person jongliert mehrere Themen gleichzeitig und wechselt ständig den Kontext → jede Aufgabe dauert länger, und die Qualität sinkt.

Diese Unterscheidung ist das Rückgrat des Spielaufbaus. Runden 1–3 zeigen die gute Parallelität, Runde 4 die schlechte.

---

## 2026-07-17 — Gemeinsamer Aufbau & Ablauf (bestätigt)

- **Spielfeld:** Sechs Karten starten links im „Auftragseingang" und müssen rechts im „Ziel" ankommen. Dazwischen liegen **fünf Arbeitsstationen**, also **fünf Spielende hintereinander wie an einem Fließband**; jede Person verantwortet einen Arbeitsschritt und reicht die Karte an die nächste weiter.
- **Bewegungsregeln:** Eine Karte wandert immer nur einen Schritt vorwärts und kann keine Station überspringen. Niemand darf die Karten einer anderen Person bewegen.
- **Ablauf je Runde:** Sobald dem Team die Aufgabe vorgestellt wird, läuft die Durchlaufzeit. Es folgt die Klärungsphase; erst wenn das Team „Definition of Ready abgeschlossen" erklärt, lässt sich eine Karte bewegen, und mit der ersten bewegten Karte startet die Bearbeitungszeit. Wenn die letzte Karte im Ziel ankommt, stoppen alle Zeiten automatisch und die Runde ist beendet.
- **Arbeit pro Station in Runden 1–3:** ein einfacher, schneller Schritt (kein Denk-/Kontextwechsel — der kommt erst in Runde 4).
- Einziger Unterschied zwischen Runden 1–3 ist die **Stapelgröße** (6 / 3 / 1).

---

## 2026-07-17 — Zeitmessung (festgelegt)

Pro Runde messen wir folgende Zeiten:

| # | Zeit | Startpunkt | Endpunkt | Bedeutung |
|---|---|---|---|---|
| 1 | **Durchlaufzeit** (Lead Time) | automatisch, sobald dem Team eine neue Aufgabe zur Erledigung vorgestellt wird | wenn der letzte Spieler seine letzte Teilaufgabe erledigt hat (= letztes Inkrement im Ziel) | Gesamtzeit aus **Kundensicht**: von „Auftrag da" bis „alles fertig" |
| 2 | **Bearbeitungszeit** (Cycle Time) | mit dem **ersten gültigen Spielzug** (siehe „Definition of Ready") | gleiches Ende wie Durchlaufzeit | reine Umsetzung ohne die Klärungsphase davor. Abstand zur Durchlaufzeit = Klärungs-/Vorbereitungsphase |
| 3 | **Pro-Spieler-Zeit** | erste Tätigkeit dieses Spielers | letzte Tätigkeit dieses Spielers | individuelle Beteiligungsspanne, **inklusive** Wartezeit dazwischen |
| 4 | **Zeit bis zur ersten Lieferung** | wie Durchlaufzeit (Vorstellung der Aufgabe) | wenn das erste Inkrement (erste Karte) das Ziel erreicht | wann kommt beim Kunden der **erste Wert** an |
| 5 | **Zeit bis zur letzten Lieferung** | wie Durchlaufzeit | wenn das letzte Inkrement das Ziel erreicht | ist identisch mit der **Durchlaufzeit** |

**Definition of Ready:** Die Klärungsphase endet damit, dass das Team „Definition of Ready abgeschlossen" erklärt (eigene Aktion – gutes Lernelement). Die Bearbeitungszeit startet danach automatisch mit dem ersten gültigen Spielzug. (Offenes Detail: wer die Bestätigung auslöst – Host oder Team. Kein Blocker.)

**Pausen:** Pausenzeit zählt in alle Zeiten mit (nichts wird herausgerechnet) — Warten ist Verschwendung (Lean Waste) und soll sichtbar bleiben.

**Kernauswertung je Run — das „Kundenerlebnis":** Wir weisen den **Abstand zwischen erster und letzter Lieferung** aus. Großer Stapel: beide fallen fast zusammen, aber spät. Kleine Stapel: erste Lieferung früh, letzte am selben Ende – der Kunde bekommt früher Wert.

---

## 2026-07-17 — Runden 1–3: Ablauf und Akzeptanzkriterien (bestätigt)

Einziger Unterschied ist die Stapelgröße; daran wird sichtbar, wie aus „einer nach dem anderen" echtes paralleles Arbeiten wird.

- **Runde 1 — ein Stapel von sechs:** Eine nachgelagerte Station darf erst loslegen, wenn **alle sechs** Karten bei ihr angekommen sind. Die Stationen arbeiten faktisch nacheinander, alle Karten erreichen das Ziel fast gleichzeitig und spät. Abstand erste↔letzte Lieferung winzig.
- **Runde 2 — zwei Stapel von je drei:** Eine nachgelagerte Station darf mit einem Dreierstapel beginnen, sobald dessen drei Karten da sind. Arbeit überlappt, erste Lieferung früher als in Runde 1, Gesamtzeit sinkt.
- **Runde 3 — Einzelstück (sechs Einzelkarten):** Eine nachgelagerte Station darf mit einer Karte starten, sobald diese eine angekommen ist. Mehrere Stationen sind gleichzeitig aktiv, erste Lieferung sehr früh, Gesamtzeit am kürzesten. Der Aha-Moment.

**Erwartete Lern-Tendenz** (hängt vom Spielverlauf ab, keine feste System-Zusicherung): Über die drei Runden sinkt die Gesamtzeit, und die erste Lieferung wandert immer weiter nach vorn. Diese drei Ergebnisse werden am Schluss nebeneinandergestellt.

### Akzeptanzkriterien (beobachtbares Verhalten)

Gemeinsam in jeder der drei Runden:

- Die Durchlaufzeit beginnt sichtbar zu laufen, sobald die Aufgabe vorgestellt wird.
- Vor „Definition of Ready abgeschlossen" lässt sich keine Karte bewegen.
- Mit der ersten bewegten Karte beginnt sichtbar die Bearbeitungszeit.
- Eine Karte lässt sich nur einen Schritt vorwärts bewegen und nicht über eine Station hinwegreichen.
- Niemand kann fremde Karten bewegen.
- Sobald die letzte Karte im Ziel ist, stoppen alle Zeiten von selbst und die Runde ist beendet.
- Danach sind alle Kennzahlen sichtbar (Durchlaufzeit, Bearbeitungszeit, Zeit bis erster/letzter Lieferung, Abstand dazwischen, Beteiligungsspanne je Person).

Pro Runde zusätzlich:

- **Runde 1:** Ein Weiterarbeiten der nächsten Station wird erst zugelassen, wenn alle sechs Karten dort angekommen sind; erste und letzte Lieferung fallen fast zusammen.
- **Runde 2:** Weiterarbeiten wird zugelassen, sobald drei Karten eines Stapels angekommen sind; die erste Lieferung kommt früher als in Runde 1.
- **Runde 3:** Eine einzelne angekommene Karte genügt zum Weiterarbeiten; an mehreren Stationen ist gleichzeitig Bewegung; die erste Lieferung kommt deutlich früher als in Runde 1.

**Tests:** Jedes Kriterium wird bei der Implementierung in einen konkreten, ausführbaren Test übersetzt; die Umsetzung wird gegen diese Tests laufen gelassen (wirklich ausführen und Ergebnis sehen), bevor etwas als fertig gilt.

---

## 2026-07-17 — Runde 4: Kontextwechsel (festgelegt) — **Grundmodell größtenteils überholt, korrigiert am 2026-07-20 nach Rücksprache mit Stephan. Siehe den nachfolgenden Abschnitt „2026-07-20 — Runde 4: Korrektur des Spielmodells" für die aktuell gültige Fassung. Dieser Abschnitt bleibt zur Nachvollziehbarkeit stehen, einzelne Aussagen sind unten markiert.**

Der Kern von Runde 4 ist der **Wechsel zwischen zwei sehr unterschiedlichen Aufgabentypen**. Das mehrdeutige Münz-/Dreieck-Matching aus der Spec wird dadurch **ersetzt**. *(weiterhin richtig.)*

**Die zwei Aufgabentypen:**

- **Aufgabe A (stumpf / Zufall):** einen Würfel so oft werfen, bis eine Zahl **größer als 3** fällt (also 4, 5 oder 6).
- **Aufgabe B (Denken / Wissen):** zu einem vorgegebenen **Land** eine **Stadt** nennen, die in diesem Land liegt und die **noch niemand** verwendet hat (keine Wiederholung über alle Spieler hinweg).

*(Diese beiden Aufgabentypen sind inhaltlich weiterhin richtig, heißen im korrigierten Modell „Würfel-Element" und „Länderkarte" und sind jetzt Teil einer festen Stückzahl von je sechs Elementen statt eines gemeinsamen Sechser-Pools — siehe unten.)*

**Struktur — überholt, korrigiert am 2026-07-20 nach Rücksprache mit Stephan:** ~~Runde 4 bricht bewusst das Fließband auf — genau das ist der Punkt, denn Multitasking zerstört den Fluss. Jede der fünf Personen hat beide Aufgabentypen gleichzeitig auf dem Tisch und muss abwechseln.~~ Das war die ursprüngliche Annahme, ist aber **falsch**. Richtig ist das Gegenteil: Runde 4 nutzt **dieselbe Fließband-/Stationslogik wie Runde 1–3** (kein Stapel-Tor, Einzelfluss wie Runde 3), nur mit zwölf statt sechs Elementen, zwei parallelen Element-Typen statt einem, und einer zusätzlichen personenbezogenen Wechselregel obendrauf. Es gibt **kein gemeinsames „beide Aufgabentypen liegen gleichzeitig bei jeder Person auf dem Tisch"** in dem Sinn, dass eine Person frei wählen könnte — jedes einzelne Element durchläuft die fünf Spielenden nacheinander in fester Reihenfolge, genau wie eine Karte in Runde 1–3 von Station zu Station wandert. Der **Wechselzwang selbst bleibt richtig** (siehe unten) und ist weiterhin der Kern der Runde.

**Menge — überholt, korrigiert am 2026-07-20 nach Rücksprache mit Stephan:** ~~Insgesamt sechs zu liefernde Ergebnisse, gemischt aus beiden Typen — gleiche Liefermenge wie Runde 3.~~ Richtig ist: **zwölf Arbeitselemente** insgesamt (sechs Würfel, sechs Länderkarten), nicht sechs. Jedes Element durchläuft alle fünf Spielenden nacheinander (5 Bearbeitungsschritte je Element), macht also 12 × 5 = 60 Einzelaktionen im Spiel, aber genau 12 tatsächliche Elemente. Der erzwungene Kontextwechsel bleibt der einzige inhaltliche Unterschied zu Runde 3 im Ablaufprinzip (Einzelfluss, kein Stapel-Tor); nur die Elementanzahl war falsch angenommen.

**Qualität & Nacharbeit — überholt, korrigiert am 2026-07-20 nach Rücksprache mit Stephan:** ~~Ein Fehler muss am Ende korrigiert werden (Nacharbeit), bevor die Runde als fertig gilt. Die Runde ist erst beendet, wenn alle sechs Ergebnisse korrekt sind.~~ Das ist **falsch** und wurde durch eine grundsätzliche Klärung ersetzt. Stephans Antwort im Original-Wortlaut (2026-07-20): „Wir korrigieren die Spec. Nach Abschluss des Spiels müssen die Städte angesehen und deren Richtigkeit bewertet werden. Dies gehört bei der Spielanalyse in die Kategorie Qualität. Viel Kontextsprung führt zu niedriger Qualität durch Fehler. Das gilt es neben der längeren Bearbeitungszeit zu lernen." Richtig ist also: **keine Live-Korrektur, keine Nacharbeitspflicht während der Runde.** Eine falsch eingegebene Stadt bleibt einfach stehen und blockiert nichts. Die Runde endet, sobald alle zwölf Elemente ihre komplette Kette durch alle fünf Spielenden durchlaufen haben — unabhängig davon, ob die eingetragenen Städte korrekt sind. Erst **danach** wertet das Spiel aus, wie viele Städte tatsächlich korrekt waren (richtiges Land, keine Dublette); das ergibt die neue Kennzahl-Kategorie „Qualität", zusätzlich zu den bestehenden Zeit-Kennzahlen.

**Erwartete Lern-Tendenz — im Kern weiterhin richtig, Formulierung „Fehler, die nachgearbeitet werden müssen" überholt (2026-07-20):** Verglichen mit dem fokussierten Fluss aus Runde 3 dauert bei erzwungenem Wechsel zwischen zwei Themen alles länger, und es entstehen mehr fehlerhafte Städte-Einträge. Runde 4 steht am Ende mit höherer Gesamtzeit **und** einer sichtbar niedrigeren Qualitäts-Kennzahl neben den sauberen Runden — die Fehler werden aber nicht mehr live nachgearbeitet, sondern erst in der Auswertung nach Rundenende sichtbar (siehe „Qualität & Nacharbeit" oben).

**Realismus (Stephans Facilitation, weiterhin gültig):** Teilnehmende geben im Vorfeld meist an, an **5–8 unterschiedlichen Themen** pro Tag zu arbeiten – jedes mit Kontextwechsel. Das Spiel bildet davon bewusst nur **zwei** Kontextwechsel nach: ein verkleinerter, aber ehrlicher Ausschnitt der echten Situation.

### Akzeptanzkriterien Runde 4 (beobachtbares Verhalten) — überholt, siehe Korrektur-Abschnitt unten für die aktuell gültige, vollständige Liste

Die gemeinsamen Kriterien aus den Runden 1–3 gelten weiter (Zeiten starten/stoppen automatisch, alle Kennzahlen am Ende sichtbar, Zeiten wie in den anderen Runden gemessen und mit Runde 3 vergleichbar). Zusätzlich, **Stand 2026-07-17, überholte Einzelpunkte markiert:**

- ~~Beide Aufgabentypen sind gleichzeitig im Spiel.~~ *(überholt 2026-07-20 — richtig ist: alle zwölf Elemente stehen zu Rundenbeginn vollständig bei Spieler 1 bereit und fließen von dort nach und nach weiter, siehe Korrektur-Abschnitt.)*
- Nach einer erledigten Aufgabe des einen Typs verlangt das Spiel als Nächstes den anderen Typ — man kann nicht alle gleichartigen am Stück erledigen. *(weiterhin richtig, jetzt zusätzlich mit FIFO-Regel bei mehreren wartenden Elementen desselben Typs, siehe unten.)*
- Eine Würfelaufgabe gilt erst als erledigt, wenn eine Zahl größer als 3 gefallen ist. *(weiterhin richtig.)*
- Bei einer Stadt-Eingabe wird jede Antwort angenommen, auch eine falsche; eine falsche (nicht im Land) oder schon vergebene Stadt wird sichtbar als Fehler markiert und gezählt. *(Teil „wird angenommen" bleibt richtig; Teil „sichtbar als Fehler markiert" ist überholt — siehe „Qualität & Nacharbeit" oben: keine sichtbare Markierung während der Runde, Auswertung erst nach Rundenende.)*
- ~~Die Runde gilt erst als fertig, wenn alle sechs Ergebnisse korrekt sind — jeder markierte Fehler muss vorher korrigiert werden.~~ *(überholt 2026-07-20 — siehe „Qualität & Nacharbeit" oben.)*
- Die Auswertung zeigt zusätzlich zur Zeit die Anzahl der aufgetretenen Fehler. *(weiterhin richtig, jetzt konkret als Qualitäts-Kennzahl über 6 Karten × 5 Städte-Einträge = 30 Einträge je Spiel.)*

---

## 2026-07-20 — Runde 4: Korrektur des Spielmodells (Staffel-/Fließband-Modell mit 12 Elementen)

Nach mehreren Rückfragen hat Stephan das tatsächliche Spielmodell für Runde 4 klargestellt. Die vollständige, verbindliche Analyse-Spec mit allen Akzeptanzkriterien, dem Pre-Mortem und den Implementierungsoptionen steht in `Backlog.md` unter dem FEATURE-004-Ticket, Abschnitt „Analyse-Spec (2026-07-20)". Dieser Eintrag hält die Entscheidung selbst fest, damit dieses Protokoll mit `Backlog.md` widerspruchsfrei bleibt.

**Das korrigierte Grundmodell:**

- **Zwölf Arbeitselemente** für die ganze Runde: **sechs Würfel** und **sechs Länderkarten** — kein gemeinsamer Sechser-Pool, keine 60 unabhängigen Aufgaben.
- Jedes einzelne Element durchläuft **nacheinander alle fünf Spielenden in fester Reihenfolge** (Spieler 1 → 2 → 3 → 4 → 5) — genau wie die sechs Karten in Runde 1–3 von Station zu Station weitergereicht werden. Runde 4 bricht also **nicht** mit dem Fließband-Modell, sondern nutzt dieselbe Positions-/Weiterreich-Logik, nur mit zwei parallelen Element-Typen statt einem.
- **Kein Stapel-Tor, reiner Einzelfluss wie Runde 3:** Alle zwölf Elemente starten zu Rundenbeginn vollständig bei Spieler 1 (Übergang zu Spieler 1 ist immer sofort offen, kein Stapel-Tor). Jedes fertig bearbeitete Element wird sofort einzeln weitergegeben.
- **Feste, abwechselnde Startreihenfolge (geklärt am 2026-07-20):** Die zwölf Elemente stehen zu Rundenbeginn in einer festgelegten, abwechselnden Reihenfolge für Spieler 1 bereit, z. B. Würfel 1, Karte 1, Würfel 2, Karte 2, Würfel 3, Karte 3, Würfel 4, Karte 4, Würfel 5, Karte 5, Würfel 6, Karte 6. Das legt zugleich die Ankunftsreihenfolge für die FIFO-Regel im allerersten Moment fest.
- **FIFO bei Mehrfachankunft:** Warten bei einer Person mehrere Elemente desselben Typs gleichzeitig, gilt strikt die Ankunftsreihenfolge — keine freie Auswahl.
- **Erzwungener Wechsel (bleibt Kern der Runde):** Jede Person muss beim eigenen Weiterarbeiten zwischen einem Würfel-Element und einem Länderkarten-Element abwechseln — bezogen auf „welches der bei ihr wartenden Elemente nimmt sie als Nächstes", nicht auf einen gemeinsamen Aufgaben-Pool.
- **Würfel-Element:** Wird geworfen, bis eine Zahl größer 3 fällt (Würfe ≤3 sind kein Fehler, nur „noch nicht erledigt"); dann Weitergabe. Der Würfelwurf wird **rein clientseitig im Browser** per Zufall erzeugt und mit einer Wurf-Animation dargestellt, analog zur bestehenden `RollButton`-Komponente im Projekt CatTube — keine serverseitige Erzeugung oder Prüfung, kein Cloud-Function-Bedarf. Bewusst akzeptiertes Restrisiko: eine rein clientseitige Zufallszahl ist am Client grundsätzlich manipulierbar, dieselbe Risikoklasse wie die bereits akzeptierte Diskrepanz „automatische aktive Zeit ≠ Selbst-Stopp-Uhr" bei FEATURE-002.
- **Länderkarte:** Trägt eine zusätzliche Stadt je Person (wird ergänzt, nicht überschrieben) und wird weitergereicht; nach vollständigem Durchlauf trägt jede Karte fünf Städte-Einträge. Jede Karte ist zu Rundenbeginn zufällig einem von acht Ländern zugeordnet: **USA, UK, Germany, India, Spain, France, Italy, Canada.**
- **Keine Live-Korrektur:** Eine falsch eingegebene Stadt (falsches Land oder Dublette) bleibt ohne sichtbare Fehlermarkierung stehen und blockiert weder Weitergabe noch Rundenende. Die Runde endet, sobald alle zwölf Elemente ihre komplette Kette durch alle fünf Spielenden durchlaufen haben — Korrektheit ist keine Voraussetzung für das Rundenende. Erst danach wird für jede der sechs Länderkarten ausgewertet, welche ihrer fünf Städte-Einträge korrekt waren (richtiges Land, keine Dublette innerhalb desselben Spiels). Das ergibt die neue Kennzahl-Kategorie „Qualität" (Anzahl/Anteil korrekter bzw. fehlerhafter Städte, von insgesamt 6 Karten × 5 Einträge = 30 Städte-Einträgen je Spiel), zusätzlich zu den bestehenden Zeit-Kennzahlen.

**Land-Stadt-Prüfung — Architekturentscheidung:** Empfohlen und von Stephan mitgetragen ist Option A: eine kuratierte Länder-/Städte-Liste direkt in den Firestore-Sicherheitsregeln (kostenloser Spark-Tarif, kein Cloud-Function-Bedarf), analog zum bestehenden Muster der Stapel-Tor-Schwelle. Details siehe Backlog.md-Spec.

**Damit widerspruchsfrei zu `Backlog.md` (FEATURE-004-Ticket, Abschnitt „Analyse-Spec (2026-07-20)"), das die vollständigen Akzeptanzkriterien, das Pre-Mortem und den Testplan enthält.**
