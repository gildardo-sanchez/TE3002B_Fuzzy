<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 7 (part 1)</span>

# Defuzzification

<p class="sub">From a fuzzy “shape” back to one number the motor can use</p>

<div class="agenda"><span>1 · Why defuzzify?</span><span>2 · Maxima methods</span><span>3 · Weighted average</span><span>4 · Centroid (CoG)</span><span>5 · Center of sums</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 7 (120 min): this deck ≈ 55 min, then deck 09 (printer exercise) ≈ 65 min.

---

## What is defuzzification?

<div class="cols">
<div>

- Converting the **fuzzy output** of the inference into a **single crisp value**.
- In an FLC, that value is the **control action** (voltage, power, speed…).

</div>
<div class="callout violet fragment rise">The aggregated output of Mamdani inference is an irregular shape: union of clipped consequents. Many numbers could “represent” it — each method makes a different choice.</div>
</div>

<div class="fragment rise" style="margin-top:24px">
<span class="tag amber">Methods</span>

Max membership (height) · First / Last of maxima · Mean of maxima · **Centroid (CoG / CoA)** · Weighted average · Center of sums · Center of largest area · Bisector

</div>

Note:
The aggregated output is a shape; the actuator needs a number. That's the whole motivation.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Predict</span>

<div class="quiz" data-answer="b">
<p class="q">Two rules fire: “Slow” clipped at 0.2 and “Fast” clipped at 0.7. Without computing anything, where will a sensible crisp output be?</p>
<div class="opts">
<button class="opt" data-k="a">Exactly at the peak of “Slow”</button>
<button class="opt" data-k="b">Between both, closer to “Fast”</button>
<button class="opt" data-k="c">Exactly halfway between both peaks</button>
<button class="opt" data-k="d">Outside the universe</button>
</div>
<div class="explain">Most methods compute a <b>compromise</b> weighted by how strongly each rule fired. Let's see how each one does it.</div>
</div>

Note:
Prediction question: don't reveal; come back to it after the 'compare all methods' widget.

---

<!-- .slide: class="divider" -->

<div class="num">01</div>

# Maxima methods

Note:
Section divider. ≈ 10 min.

---

## Height, FoM, LoM, MoM

<div class="cols">
<div>

**Max membership (height)** — the $z^*$ where $\mu(z^*) \ge \mu(z)\ \forall z$. Only valid when the maximum is unique.

<div class="fragment rise">

When the maximum is a **plateau**:

- **First of maxima (FoM / SOM)** — smallest $z$ with maximal μ
- **Last of maxima (LoM)** — largest $z$ with maximal μ
- **Mean of maxima (MoM)** — the average of the plateau

</div>
</div>
<div class="card fragment rise">
<h4 style="color:var(--ok)">Advantages</h4><p>Simple, fast; fine for asymmetric sets.</p>
<h4 style="color:var(--bad);margin-top:12px">Disadvantages</h4><p>Ignores the shape of the set (only the top matters); ambiguous with several maxima; output “jumps” between rules → jerky control.</p>
</div>
</div>

Note:
Point out the trade-off: maxima methods are cheap but ignore most of the shape.

---

<!-- .slide: class="divider" -->

<div class="num">02</div>

# Weighted average

Note:
Section divider. ≈ 10 min.

---

## Weighted average method

<div class="m">$$ z^* = \frac{\sum_i \mu_i\,\bar z_i}{\sum_i \mu_i} $$</div>

$\bar z_i$ = centre (peak) of each **symmetric** output MF, $\mu_i$ = its firing degree. Results close to centroid, much cheaper.

<div class="cols">
<div class="card">
<h4>Example: gripper force</h4>
<p>A gripper's rule base outputs F = {(very soft, 0.6), (soft, 0.4), (medium, 0.2), (firm, 0.2), (very firm, 0)} with peaks 2, 5, 10, 15, 20 N</p>
</div>
<div class="quiz numeric fragment rise" data-answer="5.86" data-tol="0.02">
<p class="q">Compute z*:</p>
<div class="explain">(0.6·2 + 0.4·5 + 0.2·10 + 0.2·15 + 0)/(1.4) = 8.2/1.4 = <b>5.86 N</b> → between “soft” and “medium”: grip a fragile object gently.</div>
</div>
</div>

Note:
Robot version of the original "student grade" example (P, F, G, VG, E with degrees 0.6, 0.4, 0.2, 0.2, 0). Same degrees, now applied to a gripper force with peaks 2, 5, 10, 15, 20 N.
Center-of-Maximum (CoM) used in the crane example is this same formula.

---

<!-- .slide: class="divider" -->

<div class="num">03</div>

# Centroid (center of gravity)

Note:
Section divider. ≈ 15 min.

---

## Center of gravity (CoG / CoA)

<div class="m">$$ z^* = \frac{\int \mu(z)\, z\, dz}{\int \mu(z)\, dz} \qquad\text{(discrete: } z^*=\tfrac{\sum \mu(z_i)z_i}{\sum\mu(z_i)}\text{)} $$</div>

- Considers the **entire** output shape → the “balance point” of the area.
- If the area is symmetric, the centroid lies on the axis of symmetry.
- Triangle centroid: average of its 3 vertices. Trapezoid: on the axis of symmetry.

<div class="cols">
<div class="card"><h4 style="color:var(--ok)">Advantages</h4><p>Accurate; smooth output; works for most systems.</p></div>
<div class="card"><h4 style="color:var(--bad)">Disadvantages</h4><p>Computationally heavier (integrals) with many rules; never reaches the extremes of the universe.</p></div>
</div>

Note:
Write the discrete formula next to scikit-fuzzy's defuzz(x, mu, 'centroid'). It's literally that sum.

---

## Worked example — decompose the area

<div class="cols c-40-60">
<div style="font-size:.75em">

| Piece | Area | x̄ | Moment |
|---|---|---|---|
| A1 triangle 0–1 | ½·1·0.5 = 0.25 | 2/3 | 0.1667 |
| A2 rectangle 1–3.5 | 2.5·0.5 = 1.25 | 2.25 | 2.8125 |
| A3 triangle 3.5–4 | ½·0.5·0.5 = 0.125 | 3.667 | 0.4583 |
| **Total** | **1.625** | | **3.4375** |

<div class="m">$$ z^* = \frac{3.4375}{1.625} = 2.115 $$</div>

</div>
<div>
<div data-widget="defuzz" data-preset="CoG worked example"></div>
</div>
</div>

Note:
Correction vs the original slide: moment 3 is 0.125 × 3.667 = 0.4583 (the slide showed a typo "1.125 × (3.5 + 173 × 0.5)"; the intended value is (3.5 + 1/3 × 0.5) = 3.667).
The widget confirms: centroid = 2.115.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz" data-answer="c">
<p class="q">The A1 triangle rises from x = 0 to x = 1. Why is its centroid at x̄ = 2/3 and not at 1/2?</p>
<div class="opts">
<button class="opt" data-k="a">Because the area is 0.25</button>
<button class="opt" data-k="b">It's a rounding error</button>
<button class="opt" data-k="c">The centroid is the mean of the vertices (0 + 1 + 1)/3 — more area sits near the tall side</button>
<button class="opt" data-k="d">Because μ = 0.5 at x = 1</button>
</div>
<div class="explain">Vertices (0,0), (1,0), (1,0.5) → x̄ = (0 + 1 + 1)/3 = 2/3.</div>
</div>

Note:
Answer C. Students often guess 1/2 because they think of the base midpoint.

---

<!-- .slide: class="divider" -->

<div class="num">04</div>

# Center of sums

Note:
Section divider. ≈ 10 min.

---

## Center of sums (CoS)

<div class="m">$$ z^* = \frac{\sum_i A_i\,\bar z_i}{\sum_i A_i} $$</div>

- Uses the **area $A_i$ and centroid $\bar z_i$ of each clipped consequent** separately.
- Overlapping areas are counted **twice** → faster than CoG (no union needed), slightly different result.

<div class="cols">
<div class="card">
<h4>Example</h4>
<p>“Medium” = tri(1, 4, 7) clipped at 0.5 → trapezoid, A₁ = (6 + 3)/2 · 0.5 = <b>2.25</b>, z̄₁ = 4</p>
<p>“High” = tri(4, 7, 10) clipped at 0.3 → A₂ = (6 + 4.2)/2 · 0.3 = <b>1.53</b>, z̄₂ = 7</p>
</div>
<div class="quiz numeric" data-answer="5.21" data-tol="0.02">
<p class="q">z* (center of sums) = ?</p>
<div class="explain">(2.25·4 + 1.53·7)/(2.25 + 1.53) = 19.71/3.78 = <b>5.21</b>. Compare: true centroid of the union = 5.16.</div>
</div>
</div>

Note:
I replaced the original two-trapezoid example: its numbers were inconsistent (A2 was computed as 1.65 and later used as 1.5, and the centroid x2 = 8 doesn't match a trapezoid on [3, 9]). This version is self-consistent and is the default preset of the widget on the next slide.

---

## Compare all methods — live

<div data-widget="defuzz" data-preset="two rules"></div>

Note:
Toggle each marker. Then change the clip heights: (1) watch MOM/SOM/LOM jump when the dominant rule changes — that's why maxima methods give jerky control. (2) Centroid moves smoothly. (3) Choose preset "plateau" to see SOM, MOM and LOM separate.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2 · controller design</span>

<div class="quiz" data-answer="d">
<p class="q">You are controlling a robot joint and want a <b>smooth</b> torque as the error changes. Which defuzzifier?</p>
<div class="opts">
<button class="opt" data-k="a">Last of maxima</button>
<button class="opt" data-k="b">First of maxima</button>
<button class="opt" data-k="c">Max membership (height)</button>
<button class="opt" data-k="d">Centroid (or weighted average / CoM)</button>
</div>
<div class="explain">Area-based methods vary <b>continuously</b> with the rule strengths. Maxima-based methods jump when a different rule becomes dominant.</div>
</div>

Note:
Answer D. Connect to robot joints: jerky torque excites vibrations and wears gears.

---

## Summary

| Method | Uses | Smooth? | Cost |
|---|---|---|---|
| Height / FoM / LoM / MoM | only the maximum | ✗ (jumps) | very low |
| Weighted average / CoM | peaks + strengths | ✓ | low |
| Center of sums | each clipped area | ✓ | medium |
| Centroid (CoG) | whole union | ✓ | high |
| Bisector | splits area in half | ✓ | high |

```python
import skfuzzy as fuzz
for m in ['centroid', 'bisector', 'mom', 'som', 'lom']:
    print(m, fuzz.defuzz(z, mu_agg, m))
```

Note:
Summary table to photograph. Run the snippet with the aggregated output of the printer example to compare methods numerically.

