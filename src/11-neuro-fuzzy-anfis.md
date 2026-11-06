<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 9</span>

# Neuro-Fuzzy Systems: ANFIS

<p class="sub">When the expert is missing, let the data tune the fuzzy system</p>

<div class="agenda"><span>1 · Why neuro-fuzzy?</span><span>2 · Takagi–Sugeno–Kang models</span><span>3 · ANFIS architecture</span><span>4 · Hybrid learning</span><span>5 · Robotics applications</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 9 (120 min). New deck (syllabus 3.4 "Neuro-fuzzy technologies in control systems"). Main references: J.-S. R. Jang, "ANFIS: Adaptive-Network-based Fuzzy Inference System", IEEE Trans. SMC 23(3), 1993; Jang, Sun & Mizutani, Neuro-Fuzzy and Soft Computing, 1997; Von Altrock (course reference), chapters on NeuroFuzzy.
Suggested timing: motivation 10 · TSK 20 · architecture 25 · learning + demo 30 · applications & lab intro 25 · exit 10.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Retrieval · last session</span>

<div class="quiz" data-answer="d">
<p class="q">When tuning the printer FLC, what did we change by hand?</p>
<div class="opts">
<button class="opt" data-k="a">Only the plant constants k, a, b</button>
<button class="opt" data-k="b">Only the rule base</button>
<button class="opt" data-k="c">Nothing — fuzzy controllers don't need tuning</button>
<button class="opt" data-k="d">MF shapes/widths, number of terms and the defuzzifier — by trial and error</button>
</div>
<div class="explain">Manual tuning is slow and needs expertise. Today: automate it with <b>learning</b>.</div>
</div>

Note:
Retrieval (1 min).

---

## Two worlds, complementary strengths

<div class="cols">
<div class="card">
<h4>Fuzzy systems</h4>

- ✓ Interpretable (IF–THEN rules)
- ✓ Use expert knowledge
- ✗ No learning: MFs/rules tuned by hand

</div>
<div class="card">
<h4 style="color:var(--accent-3)">Neural networks</h4>

- ✓ Learn from data (gradient descent)
- ✓ Universal approximators
- ✗ Black box — hard to interpret or seed with knowledge

</div>
</div>

<div class="fragment rise callout teal" style="margin-top:24px"><b>Neuro-fuzzy</b> = a fuzzy inference system written as an adaptive network, so its parameters can be trained with neural-network techniques <i>while staying readable as rules</i>.</div>

Note:
Ask the class: 'which would you trust in a car's braking system — a black box or readable rules?' Good debate starter.

---

<!-- .slide: class="divider" -->

<div class="num">01</div>

# Takagi–Sugeno–Kang (TSK) fuzzy models

Note:
Section divider. ≈ 20 min.

---

## Mamdani vs Sugeno

<div class="cols">
<div class="card">
<h4>Mamdani (so far)</h4>
<p>IF x is A AND y is B THEN z is <b>C</b> (a fuzzy set)</p>
<p>Needs aggregation + defuzzification of a shape.</p>
</div>
<div class="card" style="border-color:var(--accent-3)">
<h4 style="color:var(--accent-3)">Sugeno (TSK, first order)</h4>
<p>IF x is A AND y is B THEN <b>z = p·x + q·y + r</b> (a function)</p>
<p>Output = weighted average of the rule outputs — no defuzzification of shapes.</p>
</div>
</div>

<div class="m">$$ z = \frac{\sum_i w_i\, z_i}{\sum_i w_i} = \sum_i \bar w_i\,(p_i x + q_i y + r_i), \qquad \bar w_i = \frac{w_i}{\sum_j w_j} $$</div>

<p class="small">Zero-order Sugeno: $z_i = r_i$ (a constant) — equivalent to Mamdani with singleton outputs and weighted-average defuzzification.</p>

Note:
Write the weighted-average formula; students already used it as CoM in the crane example. Sugeno just replaces constant peaks with linear functions.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz numeric" data-answer="3.75" data-tol="0.01">
<p class="q">Two Sugeno rules fire for input (x, y) = (2, 1): w₁ = 0.6 with z₁ = x + y + 1, and w₂ = 0.2 with z₂ = 2x − y. What is z?</p>
<div class="explain">z₁ = 4, z₂ = 3 → z = (0.6·4 + 0.2·3)/(0.6 + 0.2) = 3.0/0.8 = <b>3.75</b>.</div>
</div>

Note:
Common mistake: forgetting to divide by Σw (answer 3.0). Stress that the normalisation is what makes it a weighted average.

---

## ANFIS: the architecture (2 inputs, 2 rules)

<svg viewBox="0 0 1100 430" width="100%" style="font-family:Inter">
<defs><marker id="ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7z" fill="#8a93a3"/></marker></defs>
<g stroke="#c9c5bc" stroke-width="2" fill="none">
<path d="M70 120 L230 70"/><path d="M70 120 L230 170"/><path d="M70 320 L230 270"/><path d="M70 320 L230 370"/>
<path d="M270 70 L430 120"/><path d="M270 270 L430 120"/><path d="M270 170 L430 320"/><path d="M270 370 L430 320"/>
<path d="M470 120 L630 120"/><path d="M470 320 L630 320"/><path d="M470 120 L630 320"/><path d="M470 320 L630 120"/>
<path d="M670 120 L830 120"/><path d="M670 320 L830 320"/><path d="M870 120 L1020 220"/><path d="M870 320 L1020 220"/>
<path d="M70 120 C 400 20, 700 20, 830 110" stroke-dasharray="5 5"/><path d="M70 320 C 400 420, 700 420, 830 330" stroke-dasharray="5 5"/>
</g>
<g><circle cx="50" cy="120" r="22" fill="#14181f"/><text x="50" y="127" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">x</text><circle cx="50" cy="320" r="22" fill="#14181f"/><text x="50" y="327" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">y</text></g>
<g class="fragment highlight-blue" data-fragment-index="1"><rect x="225" y="48" width="50" height="44" rx="8" fill="#e3f3f3" stroke="#0f8b8d" stroke-width="2.5"/><text x="250" y="76" text-anchor="middle" font-size="16" font-weight="700" fill="#0f8b8d">A₁</text><rect x="225" y="148" width="50" height="44" rx="8" fill="#e3f3f3" stroke="#0f8b8d" stroke-width="2.5"/><text x="250" y="176" text-anchor="middle" font-size="16" font-weight="700" fill="#0f8b8d">A₂</text><rect x="225" y="248" width="50" height="44" rx="8" fill="#e3f3f3" stroke="#0f8b8d" stroke-width="2.5"/><text x="250" y="276" text-anchor="middle" font-size="16" font-weight="700" fill="#0f8b8d">B₁</text><rect x="225" y="348" width="50" height="44" rx="8" fill="#e3f3f3" stroke="#0f8b8d" stroke-width="2.5"/><text x="250" y="376" text-anchor="middle" font-size="16" font-weight="700" fill="#0f8b8d">B₂</text><text x="250" y="425" text-anchor="middle" font-size="14" font-weight="700" fill="#0f8b8d">L1 · fuzzify (adaptive)</text></g>
<g class="fragment" data-fragment-index="2"><circle cx="450" cy="120" r="24" fill="#fff" stroke="#14181f" stroke-width="2.5"/><text x="450" y="127" text-anchor="middle" font-size="18" font-weight="700">Π</text><circle cx="450" cy="320" r="24" fill="#fff" stroke="#14181f" stroke-width="2.5"/><text x="450" y="327" text-anchor="middle" font-size="18" font-weight="700">Π</text><text x="450" y="425" text-anchor="middle" font-size="14" font-weight="700">L2 · firing wᵢ</text></g>
<g class="fragment" data-fragment-index="3"><circle cx="650" cy="120" r="24" fill="#fff" stroke="#14181f" stroke-width="2.5"/><text x="650" y="127" text-anchor="middle" font-size="18" font-weight="700">N</text><circle cx="650" cy="320" r="24" fill="#fff" stroke="#14181f" stroke-width="2.5"/><text x="650" y="327" text-anchor="middle" font-size="18" font-weight="700">N</text><text x="650" y="425" text-anchor="middle" font-size="14" font-weight="700">L3 · normalise w̄ᵢ</text></g>
<g class="fragment" data-fragment-index="4"><rect x="825" y="98" width="50" height="44" rx="8" fill="#eee9fb" stroke="#7b5cd6" stroke-width="2.5"/><text x="850" y="126" text-anchor="middle" font-size="15" font-weight="700" fill="#7b5cd6">w̄₁f₁</text><rect x="825" y="298" width="50" height="44" rx="8" fill="#eee9fb" stroke="#7b5cd6" stroke-width="2.5"/><text x="850" y="326" text-anchor="middle" font-size="15" font-weight="700" fill="#7b5cd6">w̄₂f₂</text><text x="850" y="425" text-anchor="middle" font-size="14" font-weight="700" fill="#7b5cd6">L4 · consequents (adaptive)</text></g>
<g class="fragment" data-fragment-index="5"><circle cx="1040" cy="220" r="26" fill="#e07a1f"/><text x="1040" y="228" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">Σ</text><text x="1040" y="425" text-anchor="middle" font-size="14" font-weight="700" fill="#e07a1f">L5 · output</text></g>
</svg>

<p class="small">Squares = <b>adaptive</b> nodes (have parameters) · circles = fixed nodes. Rule i: IF x is Aᵢ AND y is Bᵢ THEN fᵢ = pᵢx + qᵢy + rᵢ.</p>

Note:
Press → to build the network layer by layer.
L1: μAi(x), μBi(y) — premise parameters (e.g. bell a, b, c).
L2: wi = μAi(x)·μBi(y) (product T-norm).
L3: w̄i = wi / Σw.
L4: w̄i·fi with consequent parameters (pi, qi, ri) — inputs also enter here (dashed).
L5: Σ w̄i fi.
It is exactly the Sugeno inference, drawn as a feed-forward network.

---

## Hybrid learning (Jang, 1993)

<div class="cols">
<div class="card">
<h4>Forward pass</h4>
<p>Premise params fixed → the output is <b>linear</b> in the consequent params (pᵢ, qᵢ, rᵢ).</p>
<p>→ Solve them in one shot with <b>least squares</b>.</p>
</div>
<div class="card" style="border-color:var(--accent-3)">
<h4 style="color:var(--accent-3)">Backward pass</h4>
<p>Consequents fixed → propagate the error back.</p>
<p>→ Update premise params (MF centres, widths) by <b>gradient descent</b>.</p>
</div>
</div>

<div class="m">$$ E = \sum_k \big(y_k - \hat y(x_k)\big)^2, \qquad \theta_{\text{premise}} \leftarrow \theta_{\text{premise}} - \eta\,\frac{\partial E}{\partial \theta_{\text{premise}}} $$</div>

<p class="fragment rise callout teal">Why smooth MFs (Gaussian, bell) matter: gradient descent needs <b>differentiable</b> membership functions.</p>

Note:
Explain why the hybrid split works: with premise parameters fixed the model is linear in the consequents → least squares solves them in one shot.

---

## Watch ANFIS learn

<div data-widget="anfis"></div>

Note:
Press Train. Top: data (grey), ANFIS output (violet), each rule's linear consequent (dashed). Bottom: Gaussian MFs moving and changing width as they learn.
After training, read a rule: "IF x is (MF centred ≈ 1.6) THEN y ≈ 0.9x − 0.4" — still interpretable!
Try 2 rules (underfits) vs 6 rules (fits well, risk of overfitting with noisy data). Reset and retrain to show different local minima.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2</span>

<div class="quiz" data-answer="b">
<p class="q">In ANFIS hybrid learning, which parameters are found by least squares?</p>
<div class="opts">
<button class="opt" data-k="a">The membership-function centres and widths</button>
<button class="opt" data-k="b">The linear consequent parameters pᵢ, qᵢ, rᵢ</button>
<button class="opt" data-k="c">The number of rules</button>
<button class="opt" data-k="d">The T-norm</button>
</div>
<div class="explain">With premises fixed, ŷ = Σ w̄ᵢ(pᵢx + qᵢy + rᵢ) is linear in (p, q, r) → closed-form least squares. MFs are nonlinear → gradient descent.</div>
</div>

Note:
Answer B.

---

## Designing an ANFIS — practical choices

<div class="cols c3">
<div class="card"><h4>Structure</h4><p>Grid partition: m MFs per input, n inputs → mⁿ rules (curse of dimensionality!). Alternative: subtractive clustering to place rules where data is.</p></div>
<div class="card"><h4>Data</h4><p>Train / validation / test split. Stop when validation error rises (over-fitting).</p></div>
<div class="card"><h4>Initialisation</h4><p>Seed with expert MFs/rules if available — that's the neuro-fuzzy advantage over a plain neural net.</p></div>
</div>

<br>

<div class="callout"><b>Neuro-fuzzy in control:</b> learn an inverse model of the plant, imitate a human operator from logged data, or adapt an FLC online. Classic examples: mobile-robot navigation & obstacle avoidance, manipulator trajectory tracking, quadrotor attitude control, auto-tuning of PID gains.</div>

Note:
Grid partition explosion: 5 MFs × 4 inputs = 625 rules. Mention subtractive clustering as the common alternative.

---

## In Python

```python [1-6|8-17]
# Option A: build it yourself with PyTorch (MFs and consequents are nn.Parameters)
import torch, torch.nn as nn
class ANFIS1D(nn.Module):
    def __init__(s, n=3):
        super().__init__(); s.c = nn.Parameter(torch.linspace(1, 9, n)); s.sig = nn.Parameter(torch.ones(n))
        s.p = nn.Parameter(torch.zeros(n)); s.r = nn.Parameter(torch.zeros(n))

    def forward(s, x):                                   # x: (batch,)
        w  = torch.exp(-0.5 * ((x[:, None] - s.c) / s.sig) ** 2)   # L1-L2
        wn = w / w.sum(1, keepdim=True)                             # L3
        f  = s.p * x[:, None] + s.r                                 # L4 (Sugeno, 1st order)
        return (wn * f).sum(1)                                      # L5

model = ANFIS1D(3); opt = torch.optim.Adam(model.parameters(), lr=0.05)
for epoch in range(500):
    loss = ((model(X) - Y) ** 2).mean(); opt.zero_grad(); loss.backward(); opt.step()
```

<p class="small">Option B: MATLAB's <code>anfis</code> / Fuzzy Logic Designer. Option C: community Python packages (e.g. <code>anfis</code>, <code>xanfis</code>) — check maintenance status first.</p>

Note:
Pure-gradient version (no LSE step) — simpler to explain and good enough for the lab. Mention that the in-slide demo uses the true hybrid rule.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Exit ticket</span>

<div class="quiz" data-answer="a">
<p class="q">Main advantage of ANFIS over a plain multilayer perceptron for a robotics controller?</p>
<div class="opts one">
<button class="opt" data-k="a">After training, its knowledge can still be read (and initialised) as IF–THEN rules</button>
<button class="opt" data-k="b">It never over-fits</button>
<button class="opt" data-k="c">It does not need data</button>
<button class="opt" data-k="d">It scales better to 50 inputs with a grid partition</button>
</div>
<div class="explain">Interpretability + knowledge seeding. (d) is the opposite: grid partitions explode as mⁿ.</div>
</div>

Note:
Answer A. Link forward to the deep-learning module.

