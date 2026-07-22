#!/usr/bin/env python3
"""
gen_kanban.py — erzeugt das flow-game-kanban Artifact-HTML deterministisch aus Backlog.md.

Adaptiert vom FotoAlert-Pendant (Foto Location Guide/FotoAlert/tools/gen_kanban.py),
für Flow Game auf zwei Punkte angepasst:
  - Flow Game hat nur drei Lanes (ToDo / In Progress / Done, siehe book-of-work-Skill),
    keine FotoAlert-Gate-Pipeline (Inbox/Analysis/Test/Retro/Excluded).
  - Flow-Game-Tickets folgen dem book-of-work-Format "### <ID> <Titel>" (Leerzeichen
    als Trenner, kein "·"/":"/"-" zwischen ID und Titel wie bei FotoAlert).

Kanonische Lane-Quelle ist ausschließlich das `Status`-Feld des Tickets (ToDo / In
Progress / Done) — dieselbe Regel wie beim FotoAlert-Generator: Lane wird nie aus der
Backlog-Sektion (## ToDo / ## Done) abgeleitet, sondern immer aus dem Status-Feld selbst,
damit ein Ticket, das versehentlich in der falschen Sektion steht, trotzdem korrekt
einsortiert wird.

Workflow (analog FotoAlert, siehe Memory/SKILL book-of-work):
  1. In Backlog.md nur das Status-Feld des Tickets setzen
  2. python3 "Flow Game/tools/gen_kanban.py" <out>  -> schreibt <out>/flow-game-kanban.html
  3. mcp__remote-devices__update_artifact (id: flow-game-kanban, file = die erzeugte Datei)
"""
import sys, os, re, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
BACKLOG  = os.path.join(HERE, "..", "Backlog.md")
TEMPLATE = os.path.join(HERE, "kanban_template.html")

LANE_KEYS = ["todo", "inprogress", "done"]

def status_to_key(status):
    s = (status or "").lower()
    if "done" in s:         return "done"
    if "in progress" in s:  return "inprogress"
    # ToDo / offen / leer / unbekannt -> ToDo
    return "todo"

# Flow-Game/book-of-work-Format: "### TASK-003 Titel des Tickets" (nur Leerzeichen als
# Trenner, keine Interpunktion zwischen ID und Titel wie beim FotoAlert-Pendant).
ID_RE = re.compile(r'^###\s+([A-Z]+-\d+[a-z]?)\s+(.*)$')

def parse_backlog(text):
    lines = text.split("\n")
    tickets = []
    i = 0; n = len(lines)
    while i < n:
        m = ID_RE.match(lines[i])
        if not m:
            i += 1; continue
        tid = m.group(1); title = m.group(2).strip()
        j = i + 1; body_lines = []
        # Ticket-Body geht bis zur naechsten Ticket-Ueberschrift (### ID ...) oder
        # Abschnitts-Ueberschrift (## ...) - NICHT bis zur naechsten #### Unter-Ueberschrift
        # (Analyse-Spec/Testplan/Implementierung gehoeren zum selben Ticket).
        while j < n and not ID_RE.match(lines[j]) and not lines[j].startswith("## "):
            body_lines.append(lines[j]); j += 1
        body = "\n".join(body_lines).strip("\n")

        def field(label):
            mm = re.search(r'^\|\s*\*\*' + re.escape(label) + r'\*\*\s*\|\s*(.*?)\s*\|', body, re.M)
            return mm.group(1).strip() if mm else ""

        typ = field("Typ"); prio = field("Priorität"); status = field("Status")
        lane = status_to_key(status)

        tickets.append({"id": tid, "title": title, "type": typ,
                        "priority": prio, "lane": lane, "body": body})
        i = j
    return tickets

def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print(
            "⛔ Fehlendes Ausgabeverzeichnis-Argument.\n"
            "Aufruf:  python3 gen_kanban.py <outputs-dir>\n"
            "Ohne explizites Verzeichnis wuerde still ins aktuelle Arbeitsverzeichnis\n"
            "geschrieben werden (gleiches Risiko wie beim FotoAlert-Pendant, BUG-67 dort) -\n"
            "bitte immer einen expliziten Output-Pfad angeben.",
            file=sys.stderr,
        )
        sys.exit(2)
    out_dir = sys.argv[1]
    text = open(BACKLOG, encoding="utf-8").read()
    tickets = parse_backlog(text)
    template = open(TEMPLATE, encoding="utf-8").read()
    stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    tickets_json = json.dumps(tickets, ensure_ascii=False)
    # Sicherheitsnetz: Ticket-Text kann "</script>"-aehnliche Zeichenfolgen enthalten
    # (z.B. in Code-Beispielen). Ohne Escaping wuerde der HTML-Parser das umschliessende
    # <script>-Tag vorzeitig beenden.
    tickets_json = tickets_json.replace("</", "<\\/")
    html = template.replace("__TICKETS_JSON__", tickets_json).replace("__STAMP__", stamp)
    out_path = os.path.join(out_dir, "flow-game-kanban.html")
    open(out_path, "w", encoding="utf-8").write(html)
    from collections import Counter
    c = Counter(t["lane"] for t in tickets)
    print("Tickets gesamt:", len(tickets), file=sys.stderr)
    for k in LANE_KEYS:
        if c.get(k):
            ids = [t["id"] for t in tickets if t["lane"] == k]
            print(f"  {k:12s} {c[k]:3d}  {', '.join(ids)}", file=sys.stderr)
    print("HTML geschrieben:", out_path, file=sys.stderr)

if __name__ == "__main__":
    main()
