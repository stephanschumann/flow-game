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

## 2026-07-17 — Runde 4: Kontextwechsel (festgelegt)

Der Kern von Runde 4 ist der **Wechsel zwischen zwei sehr unterschiedlichen Aufgabentypen**. Das mehrdeutige Münz-/Dreieck-Matching aus der Spec wird dadurch **ersetzt**.

**Die zwei Aufgabentypen:**

- **Aufgabe A (stumpf / Zufall):** einen Würfel so oft werfen, bis eine Zahl **größer als 3** fällt (also 4, 5 oder 6).
- **Aufgabe B (Denken / Wissen):** zu einem vorgegebenen **Land** eine **Stadt** nennen, die in diesem Land liegt und die **noch niemand** verwendet hat (keine Wiederholung über alle Spieler hinweg).

**Struktur (bestätigt):** Runde 4 bricht bewusst das Fließband auf — genau das ist der Punkt, denn Multitasking zerstört den Fluss. Jede der fünf Personen hat **beide Aufgabentypen gleichzeitig** auf dem Tisch und muss abwechseln. Das Spiel **erzwingt den Wechsel**: Nach einer erledigten Aufgabe des einen Typs verlangt es als Nächstes den anderen Typ — niemand darf alle gleichartigen am Stück abarbeiten. Dieses ständige Umschalten zwischen „Gehirn aus" und „Gehirn an" ist der simulierte Kontextwechsel.

**Menge (bestätigt):** Insgesamt **sechs zu liefernde Ergebnisse**, gemischt aus beiden Typen — gleiche Liefermenge wie Runde 3, damit der Zeitvergleich sauber ist. Der einzige Unterschied zu Runde 3 ist der erzwungene Kontextwechsel; so lässt sich sein Preis (mehr Zeit, mehr Fehler) sauber ablesen.

**Qualität & Nacharbeit (bestätigt):** Falsche Eingaben werden **nicht geblockt**, sondern angenommen und sichtbar als Fehler markiert und gezählt (falsches Land oder schon vergebene Stadt). Aber: Ein Fehler **muss am Ende korrigiert werden (Nacharbeit)**, bevor die Runde als fertig gilt. Die Runde ist erst beendet, wenn alle sechs Ergebnisse **korrekt** sind. So wirkt schlechte Qualität doppelt sichtbar — als Fehlerzahl **und** als zusätzliche Zeit durch die Nacharbeit.

**Erwartete Lern-Tendenz:** Verglichen mit dem fokussierten Fluss aus Runde 3 dauert bei erzwungenem Wechsel zwischen zwei Themen alles länger, und es entstehen Fehler, die nachgearbeitet werden müssen. Runde 4 steht am Ende mit höherer Gesamtzeit **und** einer Fehlerzahl neben den sauberen Runden.

**Realismus (Stephans Facilitation):** Teilnehmende geben im Vorfeld meist an, an **5–8 unterschiedlichen Themen** pro Tag zu arbeiten – jedes mit Kontextwechsel. Das Spiel bildet davon bewusst nur **zwei** Kontextwechsel nach: ein verkleinerter, aber ehrlicher Ausschnitt der echten Situation.

### Akzeptanzkriterien Runde 4 (beobachtbares Verhalten)

Die gemeinsamen Kriterien aus den Runden 1–3 gelten weiter (Zeiten starten/stoppen automatisch, alle Kennzahlen am Ende sichtbar, Zeiten wie in den anderen Runden gemessen und mit Runde 3 vergleichbar). Zusätzlich:

- Beide Aufgabentypen sind gleichzeitig im Spiel.
- Nach einer erledigten Aufgabe des einen Typs verlangt das Spiel als Nächstes den anderen Typ — man kann nicht alle gleichartigen am Stück erledigen.
- Eine Würfelaufgabe gilt erst als erledigt, wenn eine Zahl größer als 3 gefallen ist.
- Bei einer Stadt-Eingabe wird jede Antwort angenommen, auch eine falsche; eine falsche (nicht im Land) oder schon vergebene Stadt wird sichtbar als Fehler markiert und gezählt.
- Die Runde gilt erst als fertig, wenn alle sechs Ergebnisse korrekt sind — jeder markierte Fehler muss vorher korrigiert werden.
- Die Auswertung zeigt zusätzlich zur Zeit die Anzahl der aufgetretenen Fehler.
