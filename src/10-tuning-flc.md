<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 8 · Lab</span>

# Tuning a Fuzzy Controller

<p class="sub">Printer head, part 2 — control curves, P vs fuzzy, and the knobs you can turn</p>

<div class="agenda"><span>1 · Spot the bug</span><span>2 · Control curves</span><span>3 · P controller baseline</span><span>4 · Fuzzy vs P</span><span>5 · Tuning tasks</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 8 (80 min). 20 min guided, 60 min lab with the Adjust_FLC_Printer notebook.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Spot the bug · 2 min</span>

A colleague sends you this rule base for the printer:

<div class="cols">
<div class="card" style="font-family:'JetBrains Mono';font-size:.8em">
IF Error is NB THEN Voltage is NB<br>
IF Error is NS THEN Voltage is NS<br>
IF Error is Z &nbsp;THEN Voltage is PS<br>
IF Error is PB THEN Voltage is PB
</div>
<div>
<div class="quiz" data-answer="c">
<p class="q">What will happen?</p>
<div class="opts one">
<button class="opt" data-k="a">Nothing — it's equivalent to the 5-rule version</button>
<button class="opt" data-k="b">The head moves faster but reaches the target</button>
<button class="opt" data-k="c">At zero error it still pushes (+3 V) → offset; and positive small errors are uncovered by any PS rule</button>
<button class="opt" data-k="d">The controller becomes linear</button>
</div>
<div class="explain">Every rule matters. Check it on the next slide with the “buggy rule base” button.</div>
</div>
</div>
</div>

<div class="timer" data-seconds="120"></div>

Note:
The second printer deck lists exactly these four rules (Z → PS, no PS rule). Use it as a debugging exercise: whether it was intentional or a typo, it's a great discussion.

---

## See the effect of the bug

<div data-widget="printer" data-buggy="true"></div>

Note:
Toggle the buggy rule base ON/OFF. ON: the curve no longer passes through (0, 0) — it outputs about +3 V at zero error — and it has a flat step/jump for small positive errors (no PS rule). Here the bias happens to reduce the error for r = +10 cm; ask what would happen for r = 0 or a negative reference (the head would be pushed away). A controller that only "works" for one reference is a bug, not a feature.

---

## Using the short method: control curves

For a 1-input FLC with singleton fuzzification, sweep the input over its universe and record the defuzzified output:

<div class="m">$$ V = f(e), \qquad e \in [-20, 20] $$</div>

<div class="cols">
<div class="card"><h4>Why it's useful</h4><p>The control curve <b>is</b> the controller: a nonlinear static map. You can store it as a look-up table and run it on a microcontroller.</p></div>
<div class="card"><h4>How to modify the behaviour</h4><p>Change MF shapes/widths · number of terms · rules · defuzzification method · output universe.</p></div>
</div>

Note:
Students should already have the control curve from Session 7. Here we use it as the main tuning tool.

---

## The plant model

<div class="m">$$ \frac{P(s)}{V(s)} = \frac{k}{(s+a)(s+b)} $$</div>

- $p$: head position (output), $v$: voltage (input), $k, a, b$: system constants.
- In Python, the function receives a **list with previous positions** (2 values → 2nd-order system); `new_pos` is the discretised version of the transfer function.
- In a real system, the position would be read from a **sensor**.

<div class="callout fragment rise">Remember: a proportional controller on this (type-0) plant leaves a <b>steady-state error</b> $e_{ss} = \frac{ab}{ab + k K_p}\,r$.</div>

Note:
The widget uses k = 30, a = 2, b = 6 (ab = 12). With kp = 0.8: ess = 12/(12+24)·r = r/3 → 3.33 cm for r = +10 cm. Note: the plant's equilibrium for v = 0 is p = 0, so the error depends on the reference value r, not on the size of the move. Adjust to the constants of your notebook.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz numeric" data-answer="3.33" data-tol="0.05">
<p class="q">With k = 30, a = 2, b = 6 and K<sub>p</sub> = 0.8, the head starts at −10 cm and the reference is r = +10 cm. Steady-state error in cm?</p>
<div class="explain">e<sub>ss</sub> = ab/(ab + kK<sub>p</sub>) · r = 12/(12 + 24) · 10 = <b>3.33 cm</b>. The starting point doesn't matter: the plant rests at p = 0 when v = 0. Check the simulator readout on the next slide.</div>
</div>

Note:
Answer 3.33 cm. Emphasise: type-0 plant + P control → steady-state error. Ask: how would you remove it? (integral action — or a fuzzy PI with Δe as a second input).

---

## P vs fuzzy — your simulator

<div data-widget="printer"></div>

Note:
Guided exploration (do it live):
1. Increase kp: e_ss decreases but overshoot appears.
2. Fuzzy: note the initial phase where the FLC is saturated near its maximum → fast approach, then gentle near zero.
3. Make the Zero half-width large (8–10 cm): the curve near zero gets flatter → bigger steady-state error, slower.
4. Make it narrow (1–2 cm): steeper near zero → smaller error, risk of oscillation.
5. Switch to 3 terms. Switch defuzzification to MOM: staircase curve → jerky response.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2 · predict, then test</span>

<div class="quiz" data-answer="b">
<p class="q">You make the “Zero” error term much <b>narrower</b>. What happens to the control curve near e = 0?</p>
<div class="opts">
<button class="opt" data-k="a">It becomes flatter (lower local gain)</button>
<button class="opt" data-k="b">It becomes steeper (higher local gain) → less steady-state error, more risk of oscillation</button>
<button class="opt" data-k="c">It doesn't change; only the rules matter</button>
<button class="opt" data-k="d">The curve becomes discontinuous</button>
</div>
<div class="explain">The slope of the control curve near 0 ≈ (voltage spread)/(error spread). Narrow input term → larger local gain. That's how you “tune” a fuzzy controller.</div>
</div>

Note:
Answer B. Then demonstrate with the slider in the simulator.

---

## Lab tasks — Adjust_FLC_Printer

Reference: proportional controller with $K_p = 0.8$, position change from **−10 cm to 10 cm**.

1. Define only **three** linguistic values for the position error and motor voltage.
2. Change the parameters and the shape of the MFs: first make the **zero-error zone wider**, then **narrower**. Observe the effect on the control curve and on the response.
3. Test different **defuzzification methods**: effect on the computation time *and* on the response.
4. Based on your observations, adjust the MFs to achieve the **best possible response**.

<div class="timer" data-seconds="3000"></div>

Note:
Deliverable: plots of control curves and step responses for each change + a paragraph per task.

---

## In summary

<div class="cols">
<div class="card" style="border-color:var(--ok)">
<h4 style="color:var(--ok)">With fuzzy control we do NOT need…</h4>

- to identify the system,
- to approximate the model,
- to linearise it.

<p>It facilitates the design of the controller.</p>
</div>
<div class="card" style="border-color:var(--accent-2)">
<h4 style="color:var(--accent-2)">…but we DO need</h4>

- linguistic control rules from an **expert**,
- careful **tuning** of MFs and rules,
- a way to check stability/performance (simulation!).

<p class="small fragment rise">Next session: what if the expert isn't available — can the controller <b>learn</b> its MFs from data? → Neuro-fuzzy.</p>
</div>
</div>

Note:
Summary from the original deck. Use the last bullet to motivate neuro-fuzzy (next session).

