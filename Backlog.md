# Backlog – Flow Game

## 📋 ToDo

### FEATURE-003 Phase 3 – Auswertung

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | ToDo |
| **Erstellt** | 2026-07-17 |

**Beschreibung:** Alle Kennzahlen je Runde anzeigen, das Kundenerlebnis (Abstand erste↔letzte Lieferung) ausweisen, Runden-Vergleich nebeneinanderstellen, Ergebnisse erst nach Freigabe durch den Host sichtbar machen.

**User Story:** Als Gruppe, möchte ich nach jeder Runde die Kennzahlen und den Vergleich zu vorherigen Runden sehen, sodass die Lernbotschaft (kleinere Stapel liefern früher und schneller) sichtbar wird.

**Kontext/Verweise:** `Product.md` Abschnitt 7; `Flow-Game-Entscheidungen.md` (Akzeptanzkriterien Auswertung).

---

### FEATURE-004 Phase 4 – Runde 4 (Kontextwechsel)

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Mittel |
| **Status** | ToDo |
| **Erstellt** | 2026-07-17 |

**Beschreibung:** Zwei Aufgabentypen (Würfel-Aufgabe, Stadt-Aufgabe), erzwungener Wechsel zwischen beiden pro Person, sechs gemischte Ergebnisse wie in Runde 3, Fehler zulassen und zählen, Pflicht-Nacharbeit bis alles korrekt ist.

**User Story:** Als Spielender, möchte ich in Runde 4 zwischen zwei Aufgaben hin- und herwechseln müssen, sodass ich den Preis von Kontextwechsel (mehr Zeit, mehr Fehler) am eigenen Leib erlebe.

**Kontext/Verweise:** `Product.md` Abschnitt 5 (Runde 4); `Flow-Game-Entscheidungen.md` (vollständige Akzeptanzkriterien Runde 4).

---

### FEATURE-005 Phase 5 – Robustheit

| Feld | Wert |
|------|------|
| **Typ** | Feature |
| **Priorität** | Niedrig |
| **Status** | ToDo |
| **Erstellt** | 2026-07-17 |

**Beschreibung:** Wiederbetreten nach Neuladen oder Verbindungsverlust (zurück ins selbe Spiel und dieselbe Station, keine Doppel-Anmeldung), vollständige Tastatur-Bedienung, weitere Barrierefreiheits-Punkte (Kontrast, ruhiger Modus, Bedeutung nie nur über Farbe).

**User Story:** Als Spielender, möchte ich nach einem Verbindungsabbruch nahtlos weiterspielen können und das Spiel unabhängig von Maus/Trackpad bedienen können, sodass ein Workshop nicht an technischen Aussetzern scheitert.

**Kontext/Verweise:** `Product.md` Abschnitt 9 (nicht-fachliche Anforderungen: Wiederbetreten, Barrierefreiheit). Hinweis: Host-Moderationsrechte bei eigenem Neuladen sind bereits Teil von FEATURE-001; dieses Ticket deckt das Wiederbetreten aller übrigen Teilnehmenden ab.

## ✅ Done

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
