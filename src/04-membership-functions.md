<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 3</span>

# Membership Functions

<p class="sub">Support, core, α-cuts — and how to choose a shape</p>

<div class="agenda"><span>1 · Terminology</span><span>2 · The five shapes, formally</span><span>3 · Notation</span><span>4 · Hedges</span><span>5 · Choosing an MF</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 3 (120 min). Theory ≈ 70 min with 4 checkpoints; practice ≈ 45 min.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Retrieval · from last session</span>

<div class="quiz" data-answer="a">
<p class="q">μ<sub>A</sub>(x) = 0.3 and μ<sub>B</sub>(x) = 0.6. What are A ∪ B, A ∩ B and ¬A at x?</p>
<div class="opts">
<button class="opt" data-k="a">0.6 · 0.3 · 0.7</button>
<button class="opt" data-k="b">0.9 · 0.18 · 0.7</button>
<button class="opt" data-k="c">0.3 · 0.6 · 0.3</button>
<button class="opt" data-k="d">0.6 · 0.3 · 0.3</button>
</div>
<div class="explain">max(0.3, 0.6) = 0.6 · min = 0.3 · 1 − 0.3 = 0.7.</div>
</div>

Note:
Spaced retrieval: 1 minute. Don't re-teach unless more than a third of the room gets it wrong.

---

<!-- .slide: class="divider" -->

<div class="num">01</div>

# Terminology

Note:
Section divider. Terminology block ≈ 20 min including the widget.

---

## Support, core, boundary

<div class="cols c3">
<div class="card fragment rise"><h4>Support</h4><p>Points with <b>non-zero</b> membership</p>
<div class="m">$$ \text{supp}(A)=\{x \mid \mu_A(x)>0\} $$</div></div>
<div class="card fragment rise"><h4>Core</h4><p>Points with <b>full</b> membership</p>
<div class="m">$$ \text{core}(A)=\{x \mid \mu_A(x)=1\} $$</div></div>
<div class="card fragment rise"><h4>Boundary</h4><p>Partial membership</p>
<div class="m">$$ \{x \mid 0<\mu_A(x)<1\} $$</div></div>
</div>

<div class="cols" style="margin-top:20px">
<div class="card fragment rise"><h4>Fuzzy singleton</h4><p>Support is a <b>single point</b> with μ = 1. Used to fuzzify crisp sensor readings!</p></div>
<div class="card fragment rise"><h4>α-cut</h4><p>Crisp set of points with membership ≥ α</p>
<div class="m">$$ A_\alpha=\{x \mid \mu_A(x)\ge\alpha\} $$</div></div>
</div>

Note:
Also mention: a fuzzy set is NORMAL if its core is non-empty (height = 1), and CONVEX if every α-cut is an interval.

---

## See support, core and α-cut

<div data-widget="mf-explorer" data-terms="true"></div>

Note:
Light teal band on the axis = support; violet band = core; amber bar at height α = α-cut.
Do these three in front of the class:
1. Triangular: make b equal to a — the core is a single point.
2. Gaussian: note that the support is the whole universe (it never reaches 0 exactly).
3. Move α from 0.05 to 1: the α-cut shrinks from the support to the core.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz" data-answer="b">
<p class="q">For A = trapmf [2, 4, 6, 9], what is the 0.5-cut?</p>
<div class="opts">
<button class="opt" data-k="a">[2, 9]</button>
<button class="opt" data-k="b">[3, 7.5]</button>
<button class="opt" data-k="c">[4, 6]</button>
<button class="opt" data-k="d">[3, 6]</button>
</div>
<div class="explain">Left side: (x − 2)/2 ≥ 0.5 → x ≥ 3. Right side: (9 − x)/3 ≥ 0.5 → x ≤ 7.5. Support = [2, 9] (open ends), core = [4, 6].</div>
</div>

Note:
Students can verify with the widget (choose trapezoidal, set a=2, b=4, c=6, d=9, α=0.5).

---

<!-- .slide: class="divider" -->

<div class="num">02</div>

# Types of membership functions

Note:
Section divider. Formal definitions of the shapes you already explored in Session 1.

---

## Piecewise-linear shapes

<div class="cols">
<div class="card">
<h4>Triangular (a, b, c)</h4>
<div class="m">$$ \mu(x)=\max\!\left(\min\!\left(\tfrac{x-a}{b-a},\ \tfrac{c-x}{c-b}\right),0\right) $$</div>
<p>a lower boundary · b centre · c upper boundary</p>
</div>
<div class="card">
<h4>Trapezoidal (a, b, c, d)</h4>
<div class="m">$$ \mu(x)=\max\!\left(\min\!\left(\tfrac{x-a}{b-a},\ 1,\ \tfrac{d-x}{d-c}\right),0\right) $$</div>
<p>Rule: a ≤ b ≤ c ≤ d. Shoulders at the edges of the universe use a = b or c = d.</p>
</div>
</div>

<p class="fragment rise callout teal" style="margin-top:20px">Cheap to compute and easy to explain → the default in embedded fuzzy controllers.</p>

Note:
Write the max-min form on the board: it's the trick to implement a triangle in one line of NumPy without if-statements.

---

## Smooth shapes

<div class="cols c3">
<div class="card">
<h4>Gaussian</h4>
<div class="m">$$ e^{-\frac12\left|\frac{x-c}{s}\right|^{m}} $$</div>
<p>c mean, s std. dev., m fuzzification factor (m = 2 classic)</p>
</div>
<div class="card">
<h4>Generalized bell</h4>
<div class="m">$$ \frac{1}{1+\left|\frac{x-c}{a}\right|^{2b}} $$</div>
<p>a width, b slope, c centre</p>
</div>
<div class="card">
<h4>Sigmoidal</h4>
<div class="m">$$ \frac{1}{1+e^{-a(x-c)}} $$</div>
<p>a slope (sign = direction), c crossover (μ = 0.5)</p>
</div>
</div>

<p class="fragment rise small" style="margin-top:20px">Smooth and differentiable everywhere → essential for <b>neuro-fuzzy</b> training by gradient descent (Session 9).</p>

Note:
Gaussian 'm' is the fuzzification factor mentioned in the original slides; m = 2 gives the standard Gaussian. Sigmoid sign of a = direction (open left / open right).

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2 · match it</span>

<div class="quiz" data-answer="c">
<p class="q">You want “<b>far</b>” for an ultrasonic sensor (0–4 m): ~0 below 1.5 m, ~1 above 3 m, smooth transition. Best choice?</p>
<div class="opts">
<button class="opt" data-k="a">Gaussian with c = 4</button>
<button class="opt" data-k="b">Triangular [1.5, 2.25, 3]</button>
<button class="opt" data-k="c">Sigmoid with a &gt; 0 and c ≈ 2.25</button>
<button class="opt" data-k="d">Sigmoid with a &lt; 0 and c ≈ 2.25</button>
</div>
<div class="explain">An open-ended “large” concept is naturally a sigmoid (or right-shoulder trapezoid). a &gt; 0 makes it increase; a &lt; 0 would model “near”.</div>
</div>

Note:
Answer C. Ask a follow-up: how would you model 'near'? (sigmoid with a < 0, or left-shoulder trapezoid).

---

## Examples of fuzzy sets

<div class="cols">
<div>

- **Seasons of the year** — overlapping trapezoids over time
- **Positive numbers** — sigmoid on [−100, 100]
- **Around 4** — triangle or Gaussian centred at 4
- **Tank level: low / high** — complementary ramps on [0, 100] %
- **Age** — young, very young, old, more or less old…

</div>
<div class="fragment rise">

<div class="callout violet">Notice “very young” and “more or less old”: they are built <b>from</b> “young” and “old”. These modifiers are called <b>hedges</b>.</div>

</div>
</div>

Note:
These examples come from the original deck (seasons, positive numbers, around 4, tank level, age). Sketch one or two quickly; the age example leads into hedges.

---

## Hedges: modifying a linguistic term

<div data-widget="hedges"></div>

<p class="small">very A → μ² (concentration) · more or less A → √μ (dilation) · not A → 1 − μ</p>

Note:
Ask before each click: "will 'very young' be wider or narrower than 'young'?" Concentration narrows, dilation widens. "Not very young" is a nice combo.

---

## Notation for fuzzy sets

<div class="cols">
<div>

**Discrete universe** — e.g. Strong Fever (°C):

$\mu_{SF}(38)=0.1,\ \mu_{SF}(39)=0.35,\ \mu_{SF}(40)=0.65,\ \mu_{SF}(41)=0.9,\ \mu_{SF}(42)=1$

<div class="m">$$ A = \sum_{x_i\in U} \mu_A(x_i)/x_i $$</div>

</div>
<div>

**Continuous universe**

<div class="m">$$ A = \int_U \mu_A(x)/x $$</div>

<div class="callout fragment rise">⚠️ Here ∑ and ∫ mean <b>union</b> of membership grades, and “/” is just a <b>separator</b> — not a sum or a division!</div>

</div>
</div>

Note:
The '+' and '/' notation confuses students every year. Say explicitly: this is NOT arithmetic.

---

## Example: discrete universe

$U = \lbrace 1,\dots,8 \rbrace$ = number of courses a student may take per semester. $A$ = “appropriate number of courses”:

<div class="m">$$ A = 0.1/1 + 0.3/2 + 0.8/3 + 1.0/4 + 0.9/5 + 0.5/6 + 0.2/7 + 0.1/8 $$</div>

```python
import numpy as np
U   = np.arange(1, 9)
muA = np.array([0.1, 0.3, 0.8, 1.0, 0.9, 0.5, 0.2, 0.1])
print("core:", U[muA == 1])          # [4]
print("0.5-cut:", U[muA >= 0.5])     # [3 4 5 6]
```

Note:
Run the snippet live if time allows. Core = {4}: the set is normal. The 0.5-cut is a crisp set — the bridge back to classical sets.

---

## Example: continuous universe

$B$ = “about 50 years old”, $U = \mathbb{R}^+$:

<div class="m">$$ \mu_B(x) = \frac{1}{1+\left(\frac{x-50}{5}\right)^{4}} $$</div>

<div class="fragment rise">
<div class="quiz" data-answer="b">
<p class="q">Which MF family is this, and what are its parameters?</p>
<div class="opts">
<button class="opt" data-k="a">Gaussian, c = 50, s = 5</button>
<button class="opt" data-k="b">Generalized bell, a = 5, b = 2, c = 50</button>
<button class="opt" data-k="c">Generalized bell, a = 5, b = 4, c = 50</button>
<button class="opt" data-k="d">Sigmoid, a = 5, c = 50</button>
</div>
<div class="explain">The bell has exponent 2b; here 2b = 4 → b = 2. Width a = 5 → μ = 0.5 at x = 45 and 55.</div>
</div>
</div>

Note:
Answer B. Common error: reading the exponent 4 as b. The generalized bell uses 2b in the exponent.

---

## Choosing a membership function

<div class="cols c3">
<div class="card fragment rise"><h4>1 · Look at the data</h4><p>Histogram first. No clear pattern → start with triangular or trapezoidal; otherwise match the distribution shape.</p></div>
<div class="card fragment rise"><h4>2 · Start simple</h4><p>Triangles / trapezoids first. If results are not good, try others — very often Gaussian works best.</p></div>
<div class="card fragment rise"><h4>3 · Compare empirically</h4><p>Train/evaluate models with different MFs and compare an error metric (e.g. MAPE). Lowest error wins.</p></div>
</div>

<div class="fragment rise callout teal" style="margin-top:24px">Rule of thumb for control: <b>3–7 terms</b> per variable, <b>overlap</b> neighbours so that μ's sum ≈ 1, and make the term around <i>zero error</i> narrower for precision.</div>

Note:
Three strategies from the original slides. Add the rule of thumb in the callout from your own controller experience.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 3 · design</span>

## Design “Distance to obstacle” for a mobile robot

Universe 0–3 m, terms **near**, **medium**, **far**. Sketch, then compare with your neighbour.

<div class="timer" data-seconds="180"></div>

<details><summary>One reasonable design</summary>
near = trapmf [0, 0, 0.3, 0.8] · medium = trimf [0.3, 0.9, 1.5] · far = trapmf [0.9, 1.6, 3, 3]. Shoulders at the ends, 50 % overlap, more resolution close to the robot.</details>

Note:
3-minute design exercise. Ask one pair to draw theirs on the board and critique it together: overlap, shoulders, resolution near zero.

---

## Practice (≈ 45 min)

1. Implement `support(x, mu)`, `core(x, mu)`, `alpha_cut(x, mu, alpha)` with NumPy.
2. Test them on the five MF types. What happens to the support of a Gaussian? Why?
3. Plot the **age** example: young, very young (μ²), old, more-or-less old (√μ), not very young.
4. Encode Strong Fever as a discrete set and compute its 0.5-cut.

Note:
Point 2: numerically the Gaussian's support is the whole universe; students should use a small tolerance (μ > 1e-3) and explain why.
