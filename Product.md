# Flow Game – Product.md

**Projekt:** Flow Game (digitales Multiplayer-Lernspiel zu Flow, Batchsizing und Kontextwechsel)
**Stand:** 2026-07-19
**Zweck dieses Dokuments:** Fortlaufende, strukturierte Zusammenfassung aller fachlichen und nicht-fachlichen Anforderungen. Die granularen, verbindlich getroffenen Entscheidungen stehen in `Flow-Game-Entscheidungen.md`; die technische Analyse in `Analyse-Spec-v0.1.md`. Dieses Dokument ist die gemeinsame Klammer.

---

## 1. Zweck und Lernziele

Das Spiel lässt eine Gruppe am eigenen Erleben verstehen, wie Arbeitsweise die Liefergeschwindigkeit und die Qualität verändert. Es macht zwei gegensätzliche Wahrheiten sicht- und messbar:

- **Gute Parallelität (Fluss):** Eine Aufgabe in kleine Schritte zerlegen, die von mehreren Personen fokussiert nebeneinander bearbeitet werden → der Kunde bekommt früher Wert, und insgesamt geht es schneller.
- **Schlechte Parallelität (Multitasking):** Eine einzelne Person jongliert mehrere Themen gleichzeitig und wechselt ständig den Kontext → jede Aufgabe dauert länger, und die Qualität sinkt.

Konkret sollen die Teilnehmenden erleben und danach besprechen können: wie große Stapel spätere Lieferung erzwingen, wie kleine Stapel überlappendes Arbeiten und frühere Lieferung ermöglichen, den Zusammenhang von Durchlaufzeit, Bearbeitungszeit und Liefermomenten, und wie Kontextwechsel Zeit kostet und Fehler erzeugt.

## 2. Zielgruppe und Einsatz

Moderationsgeleitetes Workshop-Format. Ein Spiel besteht aus **einem Host** (Moderation) und **mindestens fünf Spielenden**, die gemeinsam an einem Brett arbeiten. **Mehrere Spiele laufen gleichzeitig** — Zielgröße: bis zu rund **20 parallele Spiele** (Entscheidung 2026-07-17). Jedes Spiel hat einen **Host** und einen **Beitritts-Code**, damit sich die Spielenden im richtigen Spiel beim richtigen Host anmelden. Haupt-Geräte sind Rechner und Tablet.

## 3. Rollen

- **Host / Moderation:** erstellt ein Spiel, erhält Code und Beitritts-Link, lässt Spielende zu, weist die Stationen zu, steuert den Rundenablauf, öffnet und gibt die Ergebnisse frei.
- **Spielende (mindestens fünf):** bedienen ihre eigene Station, bewegen nur ihre eigenen Karten, sehen ihre Anleitung und ihre Kennzahlen.
- **Beobachtende:** können das Spiel live mitverfolgen, ohne einzugreifen. **Entscheidung 2026-07-17: von Anfang an Teil des ersten Bausteins**, nicht erst später nachgerüstet — die Rolle wird bereits in Phase 1–3 mitgebaut.

## 4. Spielfeld und Grundmechanik

Sechs Karten starten links im „Auftragseingang" und müssen rechts im „Ziel" ankommen. Dazwischen liegen **fünf Arbeitsstationen** (fünf Spielende hintereinander wie an einem Fließband). Eine Karte wandert immer nur einen Schritt vorwärts und kann keine Station überspringen; niemand darf fremde Karten bewegen.

Ablauf jeder Runde: Sobald dem Team die Aufgabe vorgestellt wird, läuft die Durchlaufzeit. Es folgt die Klärungsphase; erst wenn „Definition of Ready abgeschlossen" erklärt wird, lässt sich eine Karte bewegen, und mit dem ersten Zug startet die Bearbeitungszeit. **Entscheidung 2026-07-17: sowohl der Host als auch das Team selbst können „Definition of Ready abgeschlossen" auslösen** — der Host kann jederzeit übersteuern, das Team kann es aber auch eigenständig bestätigen. Wenn die letzte Karte im Ziel ankommt, stoppen alle Zeiten automatisch und die Runde ist beendet.

Es gibt **keine Pausen-Funktion** für laufende Runden (Entscheidung 2026-07-17: bewusst weggelassen für den ersten Baustein; kann bei Bedarf später als Erweiterung nachgerüstet werden).

## 5. Die vier Runden

- **Runde 1 – ein Stapel von sechs:** Die nächste Station darf erst starten, wenn alle sechs Karten bei ihr sind. Faktisch nacheinander, alles kommt spät und fast gleichzeitig.
- **Runde 2 – zwei Stapel von je drei:** Die nächste Station darf mit drei Karten beginnen. Arbeit überlappt, erste Lieferung früher, Gesamtzeit sinkt.
- **Runde 3 – Einzelstück:** Eine angekommene Karte genügt. Mehrere Stationen arbeiten gleichzeitig, erste Lieferung sehr früh, Gesamtzeit am kürzesten. Der Aha-Moment für die gute Parallelität.
- **Runde 4 – Kontextwechsel:** Bewusst kein Fließband mehr. Jede Person jongliert **zwei sehr unterschiedliche Aufgaben** und muss erzwungen zwischen ihnen wechseln — eine stumpfe Zufallsaufgabe (würfeln, bis eine Zahl größer als 3 fällt) und eine Denkaufgabe (zu einem Land eine passende, noch nicht vergebene Stadt nennen). Sechs zu liefernde Ergebnisse wie in Runde 3, damit der Zeitvergleich sauber ist. Falsche Eingaben werden zugelassen, sichtbar als Fehler gezählt und **müssen am Ende korrigiert werden** (Nacharbeit), bevor die Runde fertig ist. So zeigt sich der Preis des Kontextwechsels doppelt: mehr Zeit und mehr Fehler.

Die vollständigen Runden-Details und Akzeptanzkriterien stehen in `Flow-Game-Entscheidungen.md`.

## 6. Zeit- und Qualitätsmessung

Pro Runde werden gemessen: **Durchlaufzeit** (von Vorstellung der Aufgabe bis letzte Lieferung, Kundensicht), **Bearbeitungszeit** (ab erstem Zug nach „Definition of Ready" bis letzte Lieferung), **Pro-Spieler-Zeit** (erste bis letzte Tätigkeit jeder Person, inklusive Wartezeit), **Zeit bis zur ersten Lieferung** und **Zeit bis zur letzten Lieferung** (= Durchlaufzeit). Pausenzeit zählt überall mit (sichtbare Verschwendung). In Runde 4 zusätzlich die **Fehlerzahl**.

**Kundenerlebnis je Run:** der Abstand zwischen erster und letzter Lieferung wird ausgewiesen — er zeigt, ob der Kunde früh Wert bekam oder alles spät auf einmal.

## 7. Auswertung und Vergleich

Nach jeder Runde zeigt die App die Kennzahlen. Über die Runden hinweg werden die Ergebnisse nebeneinandergestellt, sodass die Gruppe sieht, wie kleinere Stapel früher und schneller liefern und wie der Kontextwechsel in Runde 4 Zeit und Qualität kostet. Ergebnisse sind für die Spielenden erst sichtbar, wenn der Host sie freigibt.

## 8. Mehrfach-Spiele, Host und Code

Mehrere Spiele laufen gleichzeitig und völlig getrennt voneinander. Jedes Spiel hat einen eindeutigen Beitritts-Code und einen Host. Ein Spielstand eines Spiels ist für Teilnehmende anderer Spiele nie sichtbar. Nach einem Neuladen oder kurzem Verbindungsverlust kehren Teilnehmende ins selbe Spiel und ihre Station zurück.

## 9. Nicht-fachliche Anforderungen

- **Gleichzeitigkeit:** mehrere parallele Spiele (Zielgröße bis ~20 gleichzeitig, siehe Abschnitt 2) mit je mindestens fünf Spielenden, ohne dass sich die Spiele gegenseitig ausbremsen.
- **Nahezu Echtzeit:** Bewegungen werden den anderen Beteiligten zügig angezeigt, ohne dauerndes manuelles Nachladen.
- **Verlässliche Messung:** die Zeiten bestimmt der Server, nicht die Uhr im Browser.
- **Wiederbetreten:** Neuladen und kurzer Verbindungsverlust führen zurück ins Spiel, ohne Doppel-Anmeldung.
- **Barrierefreiheit:** alles auch per Tastatur bedienbar; Bedeutung nie nur über Farbe; ausreichender Kontrast; ruhiger Modus mit weniger Bewegung.
- **Geräte:** Rechner und Tablet als Hauptgeräte; Handy zum Beitreten/Zuschauen genügt.
- **Datensparsamkeit:** nur das Nötige speichern, kurze Aufbewahrung.
- **Mehrsprachigkeit (ergänzt 2026-07-19):** Das Spiel ist auf Deutsch und Englisch verfügbar. Grundeinstellung (Default) ist Englisch. Details zur Sprachwahl/-umschaltung werden in FEATURE-006 (siehe `Backlog.md`) analysiert.

## 10. Technische Richtung (Plattform-Kosten geprüft am 2026-07-17)

Web-App wie beim bestehenden Spiel „Agent Contract" (Firebase Hosting, automatischer Deploy aus einem Repo), erweitert um einen mitlaufenden Echtzeit-Speicher von Firebase. **Entscheidung 2026-07-17: Cloud Firestore** (dokumentenbasiert, passend zur verschachtelten Struktur mehrerer Spiele mit je mehreren Stationen/Karten). Damit fällt das dauernde Nachfragen weg, jedes Spiel ist ein sauber getrennter Raum, und mit servergesetzten Zeitstempeln bleiben die gemessenen Zeiten verlässlich.

**Kosten (geprüft):** Echtzeit-Speicher und Hosting laufen im **kostenlosen Spark-Tarif** mit großzügigen Tagesfreikontingenten (z. B. rund 20.000 Schreib- und 50.000 Lesevorgänge pro Tag gratis) — für Workshops mehr als genug. **Nur** eine zusätzliche servergesteuerte Regelprüfung über „Cloud Functions" würde den kostenpflichtigen **Blaze-Tarif** verlangen (mit hinterlegter Zahlungsart/Kreditkarte; im Workshop-Umfang praktisch kostenlos innerhalb der Freikontingente).

**Empfehlung und Entscheidung (2026-07-17):** Start **komplett im kostenlosen Tarif** — Regeln über die eingebauten Firestore-Sicherheitsregeln, Zeiten über servergesetzte Zeitstempel. Das deckt die meisten Regeln ab (Rollen, Ein-Schritt-Bewegung, Stapel-Tor). Nur falls sich einzelne knifflige Prüfungen (Städte-Dubletten und Pflicht-Nacharbeit in Runde 4) rein über Sicherheitsregeln als zu umständlich erweisen, später gezielt „Cloud Functions" ergänzen und dafür auf Blaze wechseln. (Hintergrund in `Analyse-Spec-v0.1.md`, Abschnitt 7.) Damit ist dieser Punkt formal freigegeben.

Umsetzung: Phase 0 wird zweigeteilt umgesetzt (TASK-001: Hosting + Deploy-Pipeline + Design; TASK-002: Firestore-Grundeinrichtung mit restriktiven Basis-Regeln), siehe `Backlog.md`.

## Design und Look & Feel

Der Look folgt dem bestehenden Spiel „Agent Contract", damit beide Spiele einen einheitlichen Auftritt haben. Die Umsetzung übernimmt das Design **direkt aus der echten Datei** des Agent-Contract-Spiels (dessen `public/index.html`, öffentlich im Repo `stephanschumann/agent-contract-game`) — Farbwelt, Schriftart, Abstände, Button- und Karten-Stile werden wiederverwendet, nicht aus einer Beschreibung nachgebaut.

**Verifiziert am 2026-07-17** (echte Datei gelesen, nicht nur die Live-Seite betrachtet): Es ist ein **dunkles** Design, kein helles. Kernwerte aus der Datei: Hintergrund nahezu schwarz (`#0e1116`) mit einem dezenten radialen Verlauf, Textfarbe helles Grau-Weiß (`#e6edf3`), Akzentfarbe Amber/Orange (`#f0a531`) für Kicker/Logo-Schriftzüge, dazu Blau (`#4c8dff`), Grün (`#3fb950`) und Rot (`#f85149`) für Status/Buttons. Schrift: System-Sans-Serif-Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). Karten/Panels: abgerundete Ecken (16px), dünne helle Rahmenlinie auf dunklem Panel-Hintergrund (`#161b22`), weicher Schatten. Buttons: kräftige Farbverläufe (z. B. Blau-Verlauf für Primär-Buttons), abgerundet, leichte Hover-Anhebung.

Hinweis zur vorherigen Einschätzung: Eine frühere Ferndurchsicht der Live-Seite hatte fälschlich „hell, aufgeräumt, viel Weißraum" vermutet — das war eine Vermutung ohne Einsicht in die echte Datei und ist durch den obigen, aus der Datei verifizierten Befund ersetzt. Die Umsetzung folgt ab jetzt ausschließlich dem verifizierten dunklen Design.

## 11. Bewusst außerhalb des Scopes

Kein App Store und keine native Handy-App (ausdrücklich gewünscht: reine Web-App). Keine dauerhaften Nutzerkonten, keine künstliche Intelligenz im Spiel, kein Wettbewerb zwischen verschiedenen Spielen, kein frei konfigurierbarer Spiel-Designer.

## 12. Offene Punkte

Alle Punkte, die zu Beginn der Umsetzung offen waren, wurden am 2026-07-17 mit Stephan geklärt (siehe Abschnitte 2, 3, 4 und 10). Aktuell keine offenen Punkte.

## 13. Akzeptanzkriterien

Die vollständigen, als beobachtbares Verhalten formulierten Akzeptanzkriterien für alle Runden stehen in `Flow-Game-Entscheidungen.md`.
