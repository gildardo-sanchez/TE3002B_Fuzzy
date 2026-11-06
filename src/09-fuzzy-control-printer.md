<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 7 (part 2) · Lab</span>

# Fuzzy Control Exercise: the Printer Head

<p class="sub">Your first complete fuzzy controller — from linguistic terms to volts</p>

<div class="agenda"><span>1 · Problem</span><span>2 · Fuzzy terms</span><span>3 · Rules</span><span>4 · Inference with singletons</span><span>5 · Python task</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
≈ 65 min. Theory 25 min, then students start the FLCPrinter notebook; deliverable: short individual report in Canvas.

---

## The problem

<div class="cols">
<div>

A motor moves the **print head** along a 20 cm rail. The motor accepts **±12 V**.

<div class="pipeline" style="margin-top:20px">
<div class="blk">desired position</div><div class="arr">→ ⊕ →</div>
<div class="blk a2">FLC<small>error → V</small></div><div class="arr">→</div>
<div class="blk plant">Printer</div>
</div>
<p class="small" style="margin-top:8px">↖ feedback from a position <b>sensor</b></p>

</div>
<div>
<svg viewBox="0 0 420 200" width="100%">
<rect x="20" y="90" width="380" height="14" rx="7" fill="#e6e3dc"/>
<g><rect x="60" y="56" width="70" height="44" rx="8" fill="#0f8b8d"/><text x="95" y="84" text-anchor="middle" font-family="Inter" font-size="14" fill="#fff" font-weight="700">head</text>
<animateTransform attributeName="transform" type="translate" values="0 0; 230 0; 230 0; 0 0; 0 0" keyTimes="0;0.4;0.5;0.9;1" dur="5s" repeatCount="indefinite"/></g>
<text x="20" y="140" font-family="Inter" font-size="14" fill="#8a93a3">0 cm</text><text x="360" y="140" font-family="Inter" font-size="14" fill="#8a93a3">20 cm</text>
<rect x="160" y="150" width="100" height="36" rx="8" fill="#14181f"/><text x="210" y="173" text-anchor="middle" font-family="Inter" font-size="14" fill="#fff">motor 12 V</text>
</svg>
</div>
</div>

Note:
Draw the block diagram on the board: reference, error, FLC, motor, sensor feedback.

---

## Linguistic variables

<div class="cols">
<div class="card">
<h4>Input: Error (position)</h4>
<p>U = [−20, 20] cm</p>
<p>Terms: NegBig, NegSmall, Zero, PosSmall, PosBig</p>
</div>
<div class="card">
<h4>Output: Voltage</h4>
<p>U = [−12, 12] V</p>
<p>Terms: NegBig, NegSmall, Zero, PosSmall, PosBig</p>
</div>
</div>

```python
# Error                                   # Voltage
NBE = fuzz.trapmf(e, [-20, -20, -10, -5]);  NBV = fuzz.trapmf(v, [-12, -12, -6, -3])
NSE = fuzz.trimf (e, [-10,  -5,   0]);      NSV = fuzz.trimf (v, [ -6,  -3,  0])
ZE  = fuzz.trimf (e, [ -5,   0,   5]);      ZV  = fuzz.trimf (v, [ -3,   0,  3])
PSE = fuzz.trimf (e, [  0,   5,  10]);      PSV = fuzz.trimf (v, [  0,   3,  6])
PBE = fuzz.trapmf(e, [  5,  10,  20, 20]);  PBV = fuzz.trapmf(v, [  3,   6, 12, 12])
```

Note:
The MFs are exactly the ones from the original exercise. Note the shoulders at the ends of each universe.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1 · fuzzify</span>

<div class="quiz" data-answer="b">
<p class="q">The error is e = 7 cm. Which terms are active and with what degree?</p>
<div class="opts">
<button class="opt" data-k="a">PSE = 1</button>
<button class="opt" data-k="b">PSE = 0.6 and PBE = 0.4</button>
<button class="opt" data-k="c">PSE = 0.4 and PBE = 0.6</button>
<button class="opt" data-k="d">ZE = 0.6 and PSE = 0.4</button>
</div>
<div class="explain">PSE = trimf[0,5,10] → (10 − 7)/5 = 0.6 · PBE = trapmf[5,10,…] → (7 − 5)/5 = 0.4. Neighbouring terms sum to 1: good design.</div>
</div>

Note:
Answer B. Neighbouring terms summing to 1 is a property of this 50 %-overlap design (a 'fuzzy partition').

---

## The rules

<div class="cols">
<div>

- IF Error is **NBE** THEN Voltage is **NBV**
- IF Error is **NSE** THEN Voltage is **NSV**
- IF Error is **ZE** THEN Voltage is **ZV**
- IF Error is **PSE** THEN Voltage is **PSV**
- IF Error is **PBE** THEN Voltage is **PBV**

</div>
<div class="callout teal">One input, one output, five rules. Intuition: the further away, the harder you push — in the right direction.</div>
</div>

Note:
Five rules, monotonic mapping. Ask what would happen with only three rules — preview of the next session.

---

## Inference — the general form

| Fact / rule | Result |
|---|---|
| x is A′ | A′ |
| IF x is A₁ THEN y is B₁ | B′₁ = A′ ∘ (A₁ × B₁) |
| IF x is A₂ THEN y is B₂ | B′₂ = A′ ∘ (A₂ × B₂) |
| … | … |
| **y is B′** | **B′ = B′₁ ∪ B′₂ ∪ ⋯** &nbsp; (μ<sub>B′</sub> = μ<sub>B′₁</sub> ∨ μ<sub>B′₂</sub> ∨ ⋯) |

<div class="fragment rise callout violet">

**Shortcut — singleton input.** A crisp sensor reading $x_0$ is a singleton A′. Then

<div class="m">$$ \max_x \min\big(\mu_{A'}(x),\mu_{A_i}(x)\big) = \mu_{A_i}(x_0) \quad\Rightarrow\quad \mu_{B'_i}(y)=\min\big(\mu_{A_i}(x_0),\ \mu_{B_i}(y)\big) $$</div>

No Cartesian products or compositions needed: just **cut** and **join**.

</div>

Note:
This is the key computational insight: in practice all FLCs with crisp sensors use this short method.

---

## Cut → join → defuzzify

<div data-widget="fis" data-system="speed" data-stage="0"></div>

<p class="small">Same mechanics as the printer — here with two inputs. Step through: fuzzify → <b>cut</b> each consequent → <b>join</b> (aggregate) → defuzzify.</p>

Note:
Re-use the FIS widget to visualise the singleton method; with one antecedent there's no min between inputs — the cut height is just μAi(x0). Point out where the 'cut' and 'join' happen.

---

## The resulting control curve

<div data-widget="printer"></div>

Note:
Left: the control curve V = f(e) produced by the 5-rule FLC (teal) vs a proportional controller (dashed). Right: closed-loop response for a move from −10 cm to +10 cm on a 2nd-order plant.
First observation: the fuzzy curve is NONLINEAR — gentle near zero, saturating for large errors. That's how a fuzzy controller can be both precise and fast.
Leave the knobs for next session (tuning). Only show the defuzzification dropdown: centroid vs MOM vs LOM — the step-like curves of MOM/LOM.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2</span>

<div class="quiz" data-answer="a">
<p class="q">With centroid defuzzification, why does the curve never reach ±12 V even for e = ±20 cm?</p>
<div class="opts">
<button class="opt" data-k="a">The centroid of the PBV trapezoid [3, 6, 12, 12] lies inside it (≈ 8.2 V), never at its edge</button>
<button class="opt" data-k="b">Because of a bug in scikit-fuzzy</button>
<button class="opt" data-k="c">Because the input is saturated</button>
<button class="opt" data-k="d">Because the rules are wrong</button>
</div>
<div class="explain">A centroid always lies strictly inside the support. To use the full actuator range, extend the output universe beyond ±12 V (and saturate) or use LOM/SOM at the extremes.</div>
</div>

Note:
Answer A (≈ 8.2 V). Ask how to reach ±12 V: extend the output universe or use a different defuzzifier.

---

## Lab task — FLCPrinter notebook

Use the **FLCPrinter** Jupyter notebook (or any library seen in class):

1. Define the **input** fuzzy sets and the **output** fuzzy sets.
2. Test the fuzzifier with $e \in \lbrace -15, -7, 3, 6, 7 \rbrace$: list active sets and membership values.
3. Define the 5 rules.
4. Implement the mechanism that **composes** (aggregates) the outputs of the rules.
5. Compute the voltage for those inputs with at least **three defuzzifiers** (centroid, MOM, LOM).

<div class="callout">What do you observe regarding the answers given by different defuzzification methods? → Upload a <b>short individual report</b> to Canvas.</div>

<div class="timer" data-seconds="2400"></div>

Note:
Leave this slide on while students work. The report asks for observations about defuzzifiers: MOM/LOM give plateaus and jumps.

---

## Starter code

```python [1-4|6-11|13-18]
import numpy as np, skfuzzy as fuzz
e = np.arange(-20, 20.01, 0.01); v = np.arange(-12, 12.01, 0.01)
E = {'NB': fuzz.trapmf(e, [-20,-20,-10,-5]), 'NS': fuzz.trimf(e, [-10,-5,0]), 'Z': fuzz.trimf(e, [-5,0,5]),
     'PS': fuzz.trimf(e, [0,5,10]), 'PB': fuzz.trapmf(e, [5,10,20,20])}
V = {'NB': fuzz.trapmf(v, [-12,-12,-6,-3]), 'NS': fuzz.trimf(v, [-6,-3,0]), 'Z': fuzz.trimf(v, [-3,0,3]),
     'PS': fuzz.trimf(v, [0,3,6]), 'PB': fuzz.trapmf(v, [3,6,12,12])}
rules = [(t, t) for t in E]                     # IF Error is t THEN Voltage is t

def flc(e0, method='centroid'):
    agg = np.zeros_like(v)
    for a, b in rules:
        w = fuzz.interp_membership(e, E[a], e0)  # fuzzify (singleton)
        agg = np.fmax(agg, np.fmin(w, V[b]))     # cut & join
    return fuzz.defuzz(v, agg, method)

for e0 in [-15, -7, 3, 6, 7]:
    print(e0, [round(flc(e0, m), 2) for m in ('centroid', 'mom', 'lom')])
```

Note:
Starter code if students are stuck. It implements exactly the short (singleton) method.

