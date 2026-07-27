# Gate-Status — Schritt-Validierung pro Ticket (Flow Game)

**Zweck:** verhindern, dass kritische Workflow-Schritte stillschweigend übersprungen werden.
Nicht das Modell „erinnert sich", sondern ein deterministisches Skript (`tools/gate_check.py`)
prüft am Ticket nach, ob die Vorstufen ihre Nachweise hinterlassen haben.

Vorbild ist FotoAlerts `docs/gate-status-konvention.md` (SPEC-W4 Baustein D, WS-014) — hier auf
die schlankere Flow-Game-Pipeline zugeschnitten: nur die drei Freigabe-Gates aus
`flow-game-orchestrator` (Analyse, BDD-Tests, Implementierung inkl. Regression) plus Release und
Retro. Kein eigenes Refactor-, Verifikations- oder Product-Gate — die gibt es in Flow Games
Prozess nicht.

## Die sechs Gates

| Gate | Bedeutung | Wird gesetzt von |
|------|-----------|-------------------|
| Spec (Analyse) | Freigegebene Spec inkl. Akzeptanzkriterien, Pre-Mortem | `flow-game-analyze` |
| BDD-Tests (rot) | Given/When/Then-Tests geschrieben, erwartungsgemäß rot | `flow-game-bdd` |
| Implementierung | Code geschrieben, Tests grün | `flow-game-impl` |
| Test bestanden (inkl. Regression) | Pflicht-Regressionslauf gegen alle Done-Tickets durchgeführt | `flow-game-impl` |
| Release/Deploy | Deployt (Git-Push löst Firebase-Hosting-Deploy aus) — oder bewusst „kein Deploy nötig" | Stephan-Gate |
| Retro / Lernen | `retrospective`-Skill gelaufen | `retrospective` |

## Zwei Wege, ein Gate zu setzen

**1. Tabelle** (wie bei FotoAlert, aus Kompatibilitätsgründen von `gate_check.py` erkannt, in der
Praxis aber eher unüblich):

```markdown
**Gate-Status:** <!-- maschinell geprüft · nur via Skills oder durch Stephan ändern -->
| Gate | Status | Nachweis / Begründung |
|------|--------|-----------------------|
| Spec | ⬜ | — |
| BDD-Tests | ⬜ | — |
| Implementierung | ⬜ | — |
| Test bestanden | ⬜ | — |
| Release | ⬜ | — |
```

**2. Freistehende Marker-Zeile** (der Weg, wie Tickets bei Flow Game tatsächlich geschrieben
werden — nur für Retro und Release, siehe unten):

```markdown
**Retro:** ✅ 2026-07-22 — Regel X ergänzt, Memory aktualisiert
**Release:** ✅ 2026-07-22 — v1.4.0 deployt, Health-Check grün
```

Für Spec/BDD-Tests/Implementierung/Test bestanden gibt es aktuell keinen Freitext-Marker in
`gate_check.py` — dafür die Tabellenform nutzen, oder bei Bedarf später per Ticket an
`gate_check.py` ergänzen lassen, sobald sich in der Praxis ein wiederkehrendes Prosa-Muster zeigt
(genau das ist bei FotoAlert mit Retro/Refactor-Check/Verifikation passiert).

## Drei Zustände je Gate

- **✅ erledigt** — Nachweis liegt vor.
- **⬜ offen** — kein Nachweis. Blockiert jeden nachgelagerten Schritt.
- **⤼ übersprungen** — von Stephan bewusst freigegeben. **Nur gültig**, wenn die
  Nachweis-/Begründungsspalte dem Format `Stephan JJJJ-MM-TT: <Grund>` entspricht. Ohne diese
  Zuschreibung gilt ein ⤼ als **ungültig (= rot)** — das Modell kann sich nicht selbst freigeben.

## Reihenfolge / welche Vorstufen ein Schritt verlangt

| Bevor dieser Schritt startet | müssen erledigt/übersprungen sein |
|-------------------------------|-----------------------------------|
| Implementierung | Spec · BDD-Tests |
| Test ausführen | Spec · BDD-Tests · Implementierung |
| Release | Spec · BDD-Tests · Implementierung · Test bestanden |
| Done | alle oben + Release |
| Retro | alle oben + Release |

## Aufruf

```
python3 tools/gate_check.py <TICKET-ID> --phase <impl|test|release|done|retro>
python3 tools/gate_check.py <TICKET-ID> --all      # nur Status zeigen, kein Gating
```

Exit 0 = grün (Schritt darf starten). Exit 1 = rot (blockieren, fehlenden Schritt anstoßen).

## Bekannter Stand (2026-07-22)

Bislang enthält noch kein reales Flow-Game-Ticket einen Gate-Status-Block — das Skript ist neu
(WS-014 Phase 2). Für neue Tickets ab jetzt gilt: die Freigabe-Gates aus
`flow-game-orchestrator` als Retro-/Release-Marker im Ticket festhalten, sobald sie durchlaufen
sind, damit `gate_check.py` sie erkennt.
