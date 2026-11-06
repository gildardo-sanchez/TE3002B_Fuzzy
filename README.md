# TE3002B · Module 3 · Intelligent Control — interactive decks

Interactive lecture decks (reveal.js 5) on **fuzzy and neuro-fuzzy control**: 12 decks for 10 sessions (5 weeks · 120 min + 80 min).
Every deck has speaker notes, checkpoints (quizzes) every few slides, timers for think–pair–share, collapsible "predict, then reveal" answers and live widgets for the concepts students usually find confusing.

## Publish on GitHub Pages

1. Create a repository and upload the contents of this folder (keep the structure).
2. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.
3. Open `https://<user>.github.io/<repo>/` — `index.html` lists all sessions.

The `.nojekyll` file prevents GitHub from processing the files with Jekyll. reveal.js, KaTeX and the fonts load from CDNs (jsDelivr / Google Fonts); no build step is needed to publish.

## Structure

```
index.html                 landing page (week-by-week session map)
decks/NN-*.html            self-contained decks (generated from src/)
src/NN-*.md                Markdown source of each deck — edit these
assets/css/theme.css       minimal theme (colours, quizzes, widgets)
assets/js/fuzzy.js         fuzzy engine + interactive widgets (no dependencies)
assets/js/deck.js          reveal.js setup, quizzes, timers, score chip
build.py                   src/*.md  →  decks/*.html
```

## Editing slides

- Slides are separated by a line containing only `---`; speaker notes start with `Note:`.
- After editing `src/*.md`, run `python3 build.py`. (You can also edit the Markdown directly inside the `<textarea>` of a deck.)
- Slide classes: `<!-- .slide: class="checkpoint" -->` (quiz slide), `class="divider"`, `class="title"`.
- Math: inline `$...$`; for display math use `<div class="m">$$ ... $$</div>` so Markdown does not alter backslashes.

### Interactive components

```html
<!-- multiple choice -->
<div class="quiz" data-answer="b">
  <p class="q">Question?</p>
  <div class="opts"><button class="opt" data-k="a">…</button><button class="opt" data-k="b">…</button></div>
  <div class="explain">Why b is right.</div>
</div>

<!-- numeric answer (tolerance optional) -->
<div class="quiz numeric" data-answer="6.4" data-tol="0.05"><p class="q">…</p><div class="explain">…</div></div>

<!-- countdown timer -->
<div class="timer" data-seconds="120"></div>

<!-- predict-then-reveal -->
<details><summary>Answer</summary>…</details>
```

| Widget (`data-widget=`) | Used in | What it animates |
|---|---|---|
| `crisp-fuzzy` | 02 | crisp threshold vs graded membership |
| `mf-explorer` (`data-terms="true"`) | 02, 04 | 5 MF shapes, live scikit-fuzzy call, support/core/α-cut |
| `set-ops` | 03 | morphing union/intersection/complement/product with probe |
| `hedges` | 04 | very / more-or-less / not |
| `relation-ops` | 05 | cell-by-cell R ∪ S, R ∩ S |
| `gmp` (`data-a`, `data-b`, `data-ap`, `data-x`, `data-y`) | 05, 06 | generalized modus ponens B′ = A′ ∘ (A × B) |
| `cartesian` | 06 | Cartesian product heat-map (min / product) |
| `composition` | 06 | max-min / max-product composition stepper |
| `rule-table` | 07 | inverted-pendulum 5×5 rule table to complete |
| `fis` (`data-system="speed"` or `"crane"`) | 07, 09 | full Mamdani pipeline, stage by stage |
| `defuzz` (`data-preset`) | 08 | centroid, bisector, MOM, SOM, LOM, weighted avg, center of sums |
| `printer` (`data-buggy`, `data-terms`) | 09, 10 | control curve + closed-loop P vs fuzzy, tuning knobs |
| `anfis` | 11 | live hybrid-learning (LSE + gradient descent) of a Sugeno model |
| `conveyor` | 12 | ball-on-belt fuzzy PD controller simulation |

## Presenter tips

`S` speaker view (notes + timer + next slide) · `F` full screen · `Esc` overview · `B` blank screen · `Alt`+click zoom · add `?print-pdf` to the URL and print to PDF for handouts.
The chip in the top-right corner counts checkpoint answers clicked during the session (in-memory, resets on reload).

## Corrections made to the original material

- 03 Product: μA·B(x) = μA(x)·μB(x) (original showed μA·μA).
- 05 R ∩ S: entry (x1, y4) = min(0.7, 0.6) = 0.6 (original showed 0.7).
- 08 CoG example: moment 3 = 0.125 × 3.667 = 0.4583 (typo in the original expression; the result 2.115 was correct).
- 08 Center of sums: replaced the example (inconsistent areas 1.65 / 1.5 and centroid x₂ = 8) with a self-consistent one.
- 10 Rule base “Z → PS” with no PS rule is presented as a *spot-the-bug* exercise.
- 11 Neuro-fuzzy (ANFIS) is a new deck covering syllabus topic 3.4.
- The original “11. ConveyorBelt” is now deck 12 and includes the industrial case studies (topic 3.5) and the module wrap-up.

Widget plant constants (printer: k = 30, a = 2, b = 6; conveyor lags) are illustrative — align them with your notebooks if you want identical numbers.
