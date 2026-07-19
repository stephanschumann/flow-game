# Flow Game – Analyse der Spezifikation v0.1 für die Implementierung

**Datum:** 17.07.2026
**Grundlage:** `Flow_Game_Multiplayer_WebApp_Spec_v0.1_Brainstorming.md` (Status: BRAINSTORMING, Implementierung gesperrt) sowie das Original-Whiteboard „The Flow Game (virtual) #TheNextStep".
**Zweck:** Die Spec ist bewusst noch nicht zur Umsetzung freigegeben und verlangt selbst (Abschnitt 26) eine Analyse auf Widersprüche, fehlende Zustände, Sicherheitslücken und Plattformfrage vor dem Coden. Dieses Dokument leistet das plus konkrete Empfehlungen.

---

## 1. Kurzfazit

Die Spec ist ungewöhnlich gut (kennt ihre Lücken, markiert Annahmen, trennt gesperrt/offen), aber noch nicht umsetzungsreif – wegen drei großer Weichen:

1. **Plattform:** Google Apps Script + Google-Tabelle + Sekundentakt-Abfrage passt nicht zu „viele parallele Spiele + bis 25 Personen + nahezu Echtzeit". Stephans Richtung „so wie Agent Contract / als Web-App" (Firebase) löst das.
2. **Runde-4-Mechanik** (Münze + Dreieck, Kriterium wechselt pro Person) ist im Kern mehrdeutig – muss am Original geklärt werden.
3. **Zeitmessung** (aktive Zeit, Pausen, Start der Durchlaufzeit) ist offen; bis dahin keine endgültigen Kennzahlen.

Durchgängig getrennt: „das weiß ich sicher" (aus Spec/Original/bekanntem Plattformverhalten) vs. „beste Einschätzung" (zu prüfende Empfehlung).

## 2. Blockierende Entscheidungen

- **B1 Plattform:** Firebase-Web-App (Hosting wie Agent Contract) + mitlaufender Echtzeit-Speicher + kleine servergesteuerte Regelprüfung. Nicht Apps Script.
- **B2 Runde-4-Regel:** Am echten Spielverlauf klären (feste Paare vs. neu kombinieren pro Station), dann festschreiben. Braucht Stephans Wissen.
- **B3 Aktive Zeit:** Summe der Handlungs-Abschnitte, unterbrochen ab fester Untätigkeits-Schwelle (Vorschlag 5 Sek.).
- **B4 Pausen:** Aus Ausführungszeit herausrechnen, in Gesamt-Durchlaufzeit belassen, separat ausweisen.
- **B5 Start Durchlaufzeit:** Uhr startet, wenn die Moderation die Anleitung bewusst öffnet.
- **B6 Fehler in Runde 4:** Zuerst blocken + Regel einblenden; „Fehler zulassen" als spätere Ausbaustufe. Braucht Stephans Wissen.

## 3. Widersprüche

- **W1** Besitz einer Figur in Übergabespalte (3/5/7) ist doppeldeutig; Datenmodell kennt nur einen Besitzer. Lösung: Besitz an den einzelnen Zug knüpfen; ungerade Spalten = neutrale Warteschlangen, gerade = Arbeitsbereich genau einer Person.
- **W2** „Hilfe annehmen ohne Moderation" (6.2) vs. Ablauf nur über Moderation (13.2). Empfehlung: nur ein Modell – immer über Moderation.
- **W3** Spiel-Kennung „8 Zeichen" vs. Beispiel mit Bindestrich; verwechselbare Zeichen + „Groß/klein egal". **Geklärt (FEATURE-001, 2026-07-17):** 8 Zeichen, Zeichensatz ohne leicht verwechselbare Zeichen (z. B. ohne 0/O, 1/I/l), keine Bindestrich-Notation.
- **W4** Runde 1: erste = letzte Lieferung = Ausführungszeit (didaktisch gewollt, Anzeige sauber halten).
- **W5** „Zurücksetzen" vs. „Zeiten nicht verändern": nur vor Abschluss/Freigabe erlaubt; Zurücksetzen vs. Abbrechen trennen.
- **W6** Sonderzustände (pausiert/abgebrochen/Wiederherstellung) ohne definierte Übergänge – Übergangstabelle ergänzen.

## 4. Fehlende Regeln/Zustände

Konkreter Besitzwechsel-Moment in Übergabespalte; „bereit" + Verbindungsverlust; 21. Beobachter; Idempotenz-Speicher-Aufräumen; Ereignis-Reihenfolge über die hochzählende Zustandsnummer; fehlende Abnahmekriterien (Pause, Moderationsausfall, Kontroll-Rückgabe, aktive Zeit, Runde-4-Abschluss, Runden-Vergleich).

## 5. Runde 4 (Kernlücke)

Zwei Lesarten, beide brechen: **A festes Paar** → Dreieck müsste gleichzeitig Zahl und Farbe teilen → „Passen" trivial, kein Kontextwechsel. **B neu kombinieren pro Station** → echtes Umdenken/Lernziel, aber Dreiecke sind wandernder Vorrat, Datenmodell bildet das nicht ab. Einschätzung: B ist wahrscheinlich gemeint, aber am Original zu bestätigen (wandern Dreiecke mit oder Vorrat pro Station?). Entscheidet Datenmodell, Regelprüfung, Abschluss. Plus B6 (blocken vs. zulassen).

## 6. Apps Script ungeeignet

- Schreibsperre wirkt **fürs ganze Skript**, nicht pro Spiel → bremst „viele parallele Spiele" von innen aus (keine spielgenaue Sperre in der Plattform).
- Sekundentakt × bis 25 Personen × mehrere Spiele → viele gleichzeitige Aufrufe, Warteschlangen/Aussetzer.
- Google-Tabelle als Live-Speicher ist langsam (hunderte ms) – falsche Werkzeugklasse für sekündlich geänderten geteilten Zustand.
- Fazit: für ein Einzelspiel mit entspanntem Takt evtl. okay; für die geforderte Skala nein.

## 7. Empfohlene Architektur (Firebase)

Agent Contract = Einzelspieler, statische Seite via Firebase Hosting + GitHub-Automatik. Flow Game braucht zusätzlich geteilten Live-Zustand + Server-Hoheit. Empfehlung, bleibt in Firebase-Welt:
1. Oberfläche wie Agent Contract über Firebase Hosting (gleiche vertraute Deploy-Automatik).
2. Mitlaufender Echtzeit-Speicher von Firebase hält den Spielstand, benachrichtigt Browser von selbst (kein Nachfragen mehr), pro Spiel getrennt/gleichzeitig schreibbar → Sperren-Problem weg.
3. Kleine servergesteuerte Regelprüfung genehmigt Züge, vergibt Zeitstempel, rechnet Kennzahlen → Server bleibt die Wahrheit.

Kleinste Lösung, erfüllt alle gesperrten Anforderungen, bleibt „Google-gehostet", nah an Stephans bekanntem Setup.

**Vorher prüfen (nicht behaupten):** Echtzeit-Speicher + Server-Regelprüfung könnten den kostenpflichtigen Firebase-Tarif (Zahlungsart nötig) voraussetzen. Kosten real vermutlich gering, aber vor „einfach/kostenlos" nachsehen. Kleinere Variante: ohne Server-Regelprüfung, mehr über Zugriffsregeln – billiger, aber schwächere Server-Hoheit.

## 8. Sicherheit

Moderations-Schlüssel = Einzelrisiko (nur im Browser) → Wiederherstellungs-Code + optionale Mit-Moderation. Tempo-Begrenzung einplanen (mit Echtzeit-Speicher entspannt). Anzeigenamen entschärfen (Spec ok). Rest gut abgedeckt.

## 9. Zeitmessung

Start Durchlaufzeit = Anleitung-Öffnen durch Moderation (B5). Aktive Zeit = Summe der Handlungs-Abschnitte, Schwelle 5 Sek., nach Test justieren (B3). Pausen raus aus Ausführungszeit, drin in Durchlaufzeit, separat (B4). Bis dahin: aufzeichnen ja, endgültig rechnen nein.

## 10. Bedienung

OQ-14 teils auflösbar: Barrierefreiheit fordert Tastatur-Bedienung → Ziehen per Maus kann nie einzige Bedienart sein. Empfehlung: Klick/Tastatur Pflicht, Ziehen optional.

## 11. Empfehlungen zu OQ-01…OQ-20 (Kurz)

OQ-01 Firebase (B1). OQ-02 ohne Konto, nur Kennung+Merkmal. OQ-03 Wiederherstellungs-Code + Mit-Moderation. OQ-04 nur Moderation. OQ-05 aktive Zeit m. Schwelle (B3). OQ-06 Pausen (B4). OQ-07 Anleitung-Öffnen (B5). OQ-08 verständliche Beschriftung + Fachbegriff in Klammern. OQ-09 zuerst blocken (B6). OQ-10 rein passiv. OQ-11 alle im Spiel. OQ-12 feste Aufbewahrung (z.B. 30 Tage). OQ-13 ja, ohne Verlaufszuordnung zu ändern. OQ-14 Klick/Tastatur Pflicht. OQ-15 Handy nur beitreten/zuschauen. OQ-16 realistische Obergrenze festlegen. OQ-17 bei Firebase neu beantworten, Aufbewahrung kurz. OQ-18 feste Reihenfolge aller vier Runden. OQ-19 nur per Übernahme durch Moderation. OQ-20 nice-to-have.

## 12. Annahmen umgestoßen

A-01 (Apps Script) und A-02 (Google-Tabelle) ersetzen; A-07 (Nachfragen) entfällt dank Echtzeit-Speicher. Rest tragfähig.

## 13. Restrisiken

Runde-4-Mechanik (größtes inhaltliches Risiko bis geklärt); Firebase-Kosten/Abrechnung; automatische aktive Zeit ≠ Selbst-Stopp-Uhr; Moderationsausfall; Barrierefreiheit vs. haptisches Zieh-Gefühl.

## 14. Nächste Schritte

1. Sechs blockierende Entscheidungen treffen (B2/B6 am Original). 2. Firebase-Kosten verifizieren, dann OQ-01 fixieren. 3. Entscheidungs-Log aktualisieren, Status auf „Freigegeben zur Umsetzung". 4. Optional: Product.md anlegen / Analyse als PDF.
