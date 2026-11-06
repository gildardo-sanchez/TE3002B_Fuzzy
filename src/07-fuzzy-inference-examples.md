<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 6</span>

# Fuzzy Inference Systems in Action

<p class="sub">Three worked examples: inverted pendulum, driving speed, container crane</p>

<div class="agenda"><span>1 · Anatomy of a fuzzy controller</span><span>2 · Inverted pendulum</span><span>3 · How fast will I drive?</span><span>4 · Container crane</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 6 (80 min). This is the session where everything clicks: show the full pipeline, use the step-by-step FIS widget generously.

---

## The control loop

<div class="pipeline">
<div class="blk">Read state<small>sensors</small></div><div class="arr">→</div>
<div class="blk a1">Fuzzify</div><div class="arr">→</div>
<div class="blk a2">Reason with rules</div><div class="arr">→</div>
<div class="blk a3">Compute action<small>defuzzify</small></div><div class="arr">→</div>
<div class="blk plant">Execute · repeat</div>
</div>

<br>

<svg viewBox="0 0 1100 250" width="100%">
<rect x="0" y="0" width="1100" height="125" fill="#eee9fb" rx="12"/><rect x="0" y="125" width="1100" height="125" fill="#f3f1ec" rx="12"/>
<text x="20" y="30" font-family="Inter" font-weight="700" font-size="16" fill="#7b5cd6">LINGUISTIC LEVEL</text>
<text x="20" y="150" font-family="Inter" font-weight="700" font-size="16" fill="#8a93a3">NUMERICAL LEVEL</text>
<text x="290" y="72" text-anchor="middle" font-family="Inter" font-size="17" font-weight="600">measured variables (linguistic)</text>
<text x="820" y="72" text-anchor="middle" font-family="Inter" font-size="17" font-weight="600">command variables (linguistic)</text>
<path d="M430 66 L670 66" stroke="#7b5cd6" stroke-width="5" marker-end="url(#ah)"/><text x="550" y="52" text-anchor="middle" font-family="Inter" font-weight="700" font-size="16" fill="#7b5cd6">2 · inference</text>
<path d="M290 200 L290 90" stroke="#0f8b8d" stroke-width="5" marker-end="url(#ah2)"/><text x="300" y="150" font-family="Inter" font-weight="700" font-size="16" fill="#0f8b8d">1 · fuzzification</text>
<path d="M820 90 L820 200" stroke="#e07a1f" stroke-width="5" marker-end="url(#ah3)"/><text x="830" y="150" font-family="Inter" font-weight="700" font-size="16" fill="#e07a1f">3 · defuzzification</text>
<rect x="480" y="190" width="140" height="44" rx="10" fill="#14181f"/><text x="550" y="218" text-anchor="middle" font-family="Inter" font-weight="700" font-size="16" fill="#fff">PLANT</text>
<path d="M800 212 L630 212" stroke="#8a93a3" stroke-width="2.5" marker-end="url(#ah4)"/><path d="M480 212 L310 212" stroke="#8a93a3" stroke-width="2.5" marker-end="url(#ah4)"/>
<text x="290" y="240" text-anchor="middle" font-family="Inter" font-size="14" fill="#4a5361">measured (numbers)</text><text x="820" y="240" text-anchor="middle" font-family="Inter" font-size="14" fill="#4a5361">command (numbers)</text>
<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#7b5cd6"/></marker><marker id="ah2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#0f8b8d"/></marker><marker id="ah3" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#e07a1f"/></marker><marker id="ah4" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#8a93a3"/></marker></defs>
</svg>

Note:
The two-level picture (numerical ↔ linguistic) is Von Altrock's classic diagram. Fuzzification goes UP to words, inference stays at the word level, defuzzification comes DOWN to numbers.

---

<!-- .slide: class="divider" -->

<div class="num">01</div>

# Example 1 · Inverted pendulum

Note:
Section divider. ≈ 15 min: inverted pendulum.

---

## The problem

<div class="cols c-60-40">
<div>

- Inputs: **angle** θ and **angular velocity** ω
- Output: cart **speed**
- Typically ≥ 2 inputs, 1 output
- The **ranges** you pick for each variable can drastically change how well it works

**Conventional solution:** a nonlinear 2nd-order ODE

<div class="m">$$ \frac{d}{dt}\!\left[m\frac{d}{dt}(x+l\sin\theta)\right]l\cos\theta-\left[m\frac{d}{dt}(l\cos\theta)\right]l\sin\theta=mgl\sin\theta $$</div>

</div>
<div>
<svg viewBox="0 0 300 300" width="100%">
<line x1="10" y1="260" x2="290" y2="260" stroke="#8a93a3" stroke-width="3"/>
<rect x="100" y="215" width="100" height="40" rx="8" fill="#14181f"/><circle cx="120" cy="262" r="10" fill="#4a5361"/><circle cx="180" cy="262" r="10" fill="#4a5361"/>
<g><line x1="150" y1="215" x2="205" y2="50" stroke="#0f8b8d" stroke-width="8" stroke-linecap="round"/><circle cx="205" cy="50" r="18" fill="#0f8b8d"/>
<animateTransform attributeName="transform" type="rotate" values="-6 150 215; 6 150 215; -6 150 215" dur="3s" repeatCount="indefinite"/></g>
<line x1="150" y1="215" x2="150" y2="40" stroke="#e07a1f" stroke-dasharray="6 5" stroke-width="2"/>
<text x="168" y="150" font-family="Inter" font-size="22" font-weight="700" fill="#e07a1f">θ</text>
<path d="M70 236 L30 236" stroke="#7b5cd6" stroke-width="4"/><path d="M230 236 L270 236" stroke="#7b5cd6" stroke-width="4"/><text x="250" y="226" font-family="Inter" font-size="16" fill="#7b5cd6">speed</text>
</svg>
</div>
</div>

Note:
The ODE is shown to impress, not to solve. Contrast: the fuzzy solution uses 11 short rules.

---

## Linguistic terms and rules

Terms for every variable: **NH** negative high · **NL** negative low · **Z** zero · **PL** positive low · **PH** positive high

<div class="cols c-40-60">
<div style="font-size:.6em">

- IF θ is Z AND ω is Z THEN speed is Z
- IF θ is Z AND ω is NH THEN speed is NH
- IF θ is Z AND ω is NL THEN speed is NL
- IF θ is Z AND ω is PL THEN speed is PL
- IF θ is Z AND ω is PH THEN speed is PH
- IF θ is NH AND ω is Z THEN speed is NH
- IF θ is NL AND ω is Z THEN speed is NL
- IF θ is PL AND ω is Z THEN speed is PL
- IF θ is PH AND ω is Z THEN speed is PH
- IF θ is NL AND ω is PL THEN speed is Z
- IF θ is PL AND ω is NL THEN speed is Z

</div>
<div>
<div data-widget="rule-table"></div>
</div>
</div>

Note:
The 11 rules fill a cross + two diagonal cells of the 5×5 table. Ask the class to propose values for the "?" cells (click to cycle). Then reveal the consistent completion: output ≈ clamp(θ + ω) — a fuzzy version of a PD controller!

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz" data-answer="b">
<p class="q">The pendulum leans slightly right (θ = PL) but is already falling back left (ω = NL). The rule base says speed = Z. Why does that make sense?</p>
<div class="opts">
<button class="opt" data-k="a">It's an error in the rule base</button>
<button class="opt" data-k="b">The pole is already recovering by itself — pushing would overshoot</button>
<button class="opt" data-k="c">Z means maximum speed</button>
<button class="opt" data-k="d">ω is ignored when θ ≠ Z</button>
</div>
<div class="explain">This is the <b>derivative</b> (damping) action of a PD controller, encoded linguistically.</div>
</div>

Note:
Answer B. Connect to PD control students already know.

---

<!-- .slide: class="divider" -->

<div class="num">02</div>

# Example 2 · How fast will I drive today?

Note:
Section divider. ≈ 20 min: driving speed example.

---

## Variables and rules

<div class="cols">
<div>

- **Temp** (°F): {Freezing, Cool, Warm, Hot} on 10–110
- **Cloud cover** (%): {Sunny, Partly cloudy, Overcast} on 0–100
- **Speed** (mph): {Slow, Fast} on 0–100

</div>
<div class="card">
<h4>Rules — a disjunction of conjunctions</h4>
<p>R1: IF it's <b>Sunny</b> AND <b>Warm</b> → drive <b>Fast</b></p>
<p>R2: IF it's <b>(partly) Cloudy</b> AND <b>Cool</b> → drive <b>Slow</b></p>
</div>
</div>

<div class="fragment rise callout" style="margin-top:20px"><b>Question:</b> How fast will I go if it is <b>65 °F</b> with <b>25 %</b> cloud cover?</div>

Note:
'Disjunction of conjunctions': each rule is an AND of conditions; the rule base is the OR of the rules.

---

## By hand (values read from the slide charts)

<div class="cols">
<div>

**1 · Fuzzify**

- 65 °F → Cool = 0.4, Warm = 0.7
- 25 % → Sunny = 0.8, Cloudy = 0.2

<div class="fragment rise">

**2 · Rule strengths (AND → min)**

- R1: min(0.8, 0.7) = **0.7** → Fast
- R2: min(0.2, 0.4) = **0.2** → Slow

</div>
</div>
<div class="fragment rise">

**3 · Defuzzify (weighted mean of the term peaks 25 and 75)**

<div class="m">$$ \text{Speed}=\frac{0.2\cdot 25+0.7\cdot 75}{0.2+0.7} = 63.8\ \text{mph} $$</div>

<div class="quiz numeric" data-answer="63.9" data-tol="0.15">
<p class="q">Check it yourself:</p>
<div class="explain">(5 + 52.5)/0.9 = 63.9 mph (the original slide rounds to 63.8).</div>
</div>

</div>
</div>

Note:
Hand calculation with the values read from the original charts. The numeric check accepts 63.8–64.0.

---

## Now watch the whole engine — step by step

<div data-widget="fis" data-system="speed" data-stage="0" data-defuzz="com"></div>

Note:
Start at stage 0 and press Step: 1 fuzzify (amber lines), 2 rule strength (min), 3 clip, 4 aggregate (max), 5 defuzzify.
The widget uses idealized triangles/trapezoids (Cool peak 50, Warm peak 70 …), so its numbers (≈ 65.9 mph with CoM) differ slightly from the hand calculation that read values from the original charts — a good discussion point: MF shapes matter!
Then switch defuzzification to centroid and see how the answer moves. Finally drag the sliders: a freezing overcast day → no rule fires! (Incomplete rule base.)

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2 · explore & explain</span>

<div class="quiz" data-answer="c">
<p class="q">Set Temp = 100 °F and Cloud = 90 %. The output disappears. Why?</p>
<div class="opts">
<button class="opt" data-k="a">The defuzzifier is broken</button>
<button class="opt" data-k="b">Hot and Overcast contradict each other</button>
<button class="opt" data-k="c">No rule covers (Hot, Overcast): both rule strengths are 0 — the rule base is incomplete</button>
<button class="opt" data-k="d">Speed would be negative</button>
</div>
<div class="explain">A practical controller needs <b>completeness</b>: for every input, at least one rule must fire. Fix it by adding rules (or a default rule).</div>
</div>

Note:
Answer C. Ask: 'which rule would you add?' e.g. IF Overcast AND Hot THEN Slow.

---

<!-- .slide: class="divider" -->

<div class="num">03</div>

# Example 3 · Container crane

Note:
Section divider. ≈ 25 min: Von Altrock's container crane.

---

## The system

<div class="cols">
<div>

Move a container from the ship to the trailer **fast** without letting it **sway**.

- Inputs: **Distance** to target, **Angle** of the load
- Output: motor **Power**

Expert operators do this every day — with *no equations*.

</div>
<div>
<svg viewBox="0 0 440 280" width="100%">
<line x1="20" y1="40" x2="420" y2="40" stroke="#14181f" stroke-width="6"/><line x1="20" y1="40" x2="20" y2="270" stroke="#14181f" stroke-width="5"/><line x1="420" y1="40" x2="420" y2="270" stroke="#14181f" stroke-width="5"/>
<g><rect x="170" y="28" width="50" height="22" fill="#d64545" rx="3"/>
<g><line x1="195" y1="50" x2="195" y2="150" stroke="#14181f" stroke-width="2"/><rect x="170" y="150" width="50" height="40" fill="#e0b31f" rx="3"/><animateTransform attributeName="transform" type="rotate" values="12 195 50; -12 195 50; 12 195 50" dur="2.4s" repeatCount="indefinite"/></g>
<animateTransform attributeName="transform" type="translate" values="-120 0; 120 0; -120 0" dur="8s" repeatCount="indefinite"/></g>
<path d="M30 230 L130 230 L150 270 L30 270z" fill="#14181f"/><text x="60" y="222" font-family="Inter" font-size="14" fill="#3a7bd5" font-weight="700">ship</text>
<rect x="330" y="230" width="70" height="10" fill="#14181f"/><text x="335" y="222" font-family="Inter" font-size="14" fill="#1f9d55" font-weight="700">trailer</text>
</svg>
</div>
</div>

Note:
The animated crane shows the sway problem. Ask how a human operator avoids sway (moves fast first, slows down and 'catches' the load near the target).

---

## Linguistic variables

- **Distance** := {far, medium, close, zero, neg_close} (yards, −10…30)
- **Angle** := {pos_big, pos_small, zero, neg_small, neg_big} (degrees, −90…90)
- **Power** := {pos_high, pos_medium, zero, neg_medium, neg_high} (kW, −30…30)

**Rules (excerpt)**

| | IF Distance | AND Angle | THEN Power |
|---|---|---|---|
| R1 | medium | pos_small | pos_medium |
| R2 | medium | zero | zero |
| R3 | far | zero | pos_medium |

<p class="small"><b>Aggregation</b> computes the IF part (AND/OR) · <b>Composition</b> computes the THEN part (OR across rules).</p>

Note:
Aggregation (IF part) and composition (THEN part) is Von Altrock's terminology; map it to 'rule strength' and 'aggregation' used in the FIS widget.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 3 · compute before you see it</span>

Distance = **12 yd** → medium = 0.9, far = 0.1. Angle = **4°** → pos_small = 0.8, zero = 0.2.

<div class="cols">
<div>

<div class="quiz" data-answer="a">
<p class="q">Rule strengths (min) for R1, R2, R3?</p>
<div class="opts one">
<button class="opt" data-k="a">0.8 · 0.2 · 0.1</button>
<button class="opt" data-k="b">0.9 · 0.9 · 0.2</button>
<button class="opt" data-k="c">0.8 · 0.9 · 0.1</button>
</div>
<div class="explain">min(0.9, 0.8) = 0.8 · min(0.9, 0.2) = 0.2 · min(0.1, 0.2) = 0.1. Then pos_medium = max(0.8, 0.1) = 0.8, zero = 0.2.</div>
</div>

</div>
<div>

<div class="quiz numeric" data-answer="6.4" data-tol="0.05">
<p class="q">Center-of-Maximum with peaks zero = 0 kW and pos_medium = 8 kW. Power = ?</p>
<div class="explain">(0.2·0 + 0.8·8)/(0.2 + 0.8) = <b>6.4 kW</b>.</div>
</div>

</div>
</div>

Note:
Students commit to answers before the next slide reveals the live computation.

---

## The crane controller, live

<div data-widget="fis" data-system="crane" data-stage="0" data-defuzz="com"></div>

Note:
Step through stages. With CoM the result is exactly 6.4 kW as in Von Altrock's example. Switch to centroid: a different answer, because the shape of the clipped sets matters.
Drag Angle negative while Distance is medium: what happens? Only R2 fires… The rule base here is just an excerpt — real crane controllers use ~20–35 rules.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Exit ticket</span>

## Write down the 5 stages of Mamdani inference — in order — and one sentence each.

<details><summary>Answer</summary>
1 Fuzzify crisp inputs · 2 Rule strength: combine antecedents with a T-norm (min) · 3 Implication: clip (or scale) each consequent by its strength · 4 Aggregation: union (max) of all clipped consequents · 5 Defuzzify: extract one crisp command (centroid, CoM, MOM…).</details>

<div class="timer" data-seconds="120"></div>

Note:
Exit ticket. If time is short, assign it as a Canvas quiz.

