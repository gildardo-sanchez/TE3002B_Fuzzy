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
<a href="../index.html" style="position:fixed;bottom:14px;left:18px;z-index:30;font:600 13px Inter,sans-serif;color:#8a93a3;text-decoration:none">← all sessions</a>
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

for md in sorted((ROOT / "src").glob("*.md")):
    body = md.read_text(encoding="utf-8").strip()
    m = re.search(r"^# (.+)$", body, re.M)
    title = m.group(1).strip() if m else md.stem
    assert "</textarea>" not in body
    body = body.replace('<!-- .slide: class="checkpoint" -->', '<!-- .slide: class="checkpoint" data-background-color="#f3effc" -->')
    out = ROOT / "decks" / (md.stem + ".html")
    out.write_text(TEMPLATE.format(title=title, body=body, R=REVEAL), encoding="utf-8")
    print("built", out.relative_to(ROOT))
