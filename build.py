#!/usr/bin/env python3
"""Build self-contained reveal.js decks from src/*.md.

Each Markdown file holds one deck; slides are separated by a line with '---'
and speaker notes start with 'Note:'.  Usage:  python3 build.py
The generated HTML files in decks/ are what GitHub Pages serves; you can also
edit them directly (the Markdown lives inside the <textarea>).
"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
REVEAL = "https://cdn.jsdelivr.net/npm/reveal.js@5.1.0"

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · TE3002B</title>
<link rel="stylesheet" href="{R}/dist/reset.css">
<link rel="stylesheet" href="{R}/dist/reveal.css">
<link rel="stylesheet" href="{R}/dist/theme/white.css">
<link rel="stylesheet" href="{R}/plugin/highlight/monokai.css">
<link rel="stylesheet" href="../assets/css/theme.css">
</head>
<body>
<a href="../index.html" class="home-pill" title="Back to all sessions (M)">⌂ All sessions</a>
<div class="reveal"><div class="slides">
<section data-markdown data-separator="^---$" data-separator-notes="^Note:">
<textarea data-template>
{body}
</textarea>
</section>
</div></div>
<script src="{R}/dist/reveal.js"></script>
<script src="{R}/plugin/markdown/markdown.js"></script>
<script src="{R}/plugin/highlight/highlight.js"></script>
<script src="{R}/plugin/notes/notes.js"></script>
<script src="{R}/plugin/math/math.js"></script>
<script src="{R}/plugin/zoom/zoom.js"></script>
<script src="../assets/js/fuzzy.js"></script>
<script src="../assets/js/deck.js"></script>
</body>
</html>
"""

END_SLIDE = """

---

<!-- .slide: class="end-slide" data-background-color="#eef7f7" -->

<span class="tag">End of session</span>

<div class="huge">Thank you!</div>

<p class="sub">You completed: <b>{title}</b></p>

<div class="end-nav">
<a class="btn end-btn" href="../index.html">⌂ Back to all sessions</a>
{next_link}
</div>

<p class="small muted">Tip: press <b>M</b> at any time to return to the session menu.</p>

Note:
Closing slide. Use the buttons to return to the menu or jump to the next deck (useful when two decks share a session).
"""

decks = sorted((ROOT / "src").glob("*.md"))
titles = {}
for md in decks:
    m = re.search(r"^# (.+)$", md.read_text(encoding="utf-8"), re.M)
    titles[md.stem] = m.group(1).strip() if m else md.stem

for k, md in enumerate(decks):
    body = md.read_text(encoding="utf-8").strip()
    title = titles[md.stem]
    nxt = decks[k + 1].stem if k + 1 < len(decks) else None
    next_link = f'<a class="btn ghost end-btn" href="{nxt}.html">Next: {titles[nxt]} →</a>' if nxt else ""
    body += END_SLIDE.format(title=title, next_link=next_link)
    assert "</textarea>" not in body
    body = body.replace('<!-- .slide: class="checkpoint" -->', '<!-- .slide: class="checkpoint" data-background-color="#f3effc" -->')
    out = ROOT / "decks" / (md.stem + ".html")
    out.write_text(TEMPLATE.format(title=title, body=body, R=REVEAL), encoding="utf-8")
    print("built", out.relative_to(ROOT))
