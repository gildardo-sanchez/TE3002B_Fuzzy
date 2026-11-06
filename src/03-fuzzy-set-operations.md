<!-- .slide: class="title" -->

<span class="tag">TE3002B · Module 3 · Session 2</span>

# Fuzzy Set Operations

<p class="sub">AND, OR and NOT — when truth comes in degrees</p>

<div class="agenda"><span>1 · Union (max)</span><span>2 · Intersection (min)</span><span>3 · Complement</span><span>4 · Product & other T-norms</span><span>5 · Laws that break</span></div>

<p class="meta">Dr. Gildardo Sánchez Ante · Tecnológico de Monterrey</p>

Note:
Session 2 (80 min). ≈ 40 min theory with this deck, ≈ 40 min Python practice.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Warm-up · predict</span>

<div class="quiz" data-answer="b">
<p class="q">It is 28 °C. μ<sub>Hot</sub> = 0.6 and μ<sub>Humid</sub> = 0.3. To what degree is it “hot <b>AND</b> humid”?</p>
<div class="opts">
<button class="opt" data-k="a">0.9</button>
<button class="opt" data-k="b">0.3</button>
<button class="opt" data-k="c">0.6</button>
<button class="opt" data-k="d">1 — both are non-zero</button>
</div>
<div class="explain">The standard fuzzy AND is the <b>minimum</b>: a chain is as strong as its weakest link. (The product, 0.18, is another valid choice — we'll see it today.)</div>
</div>

Note:
Ask for intuition before teaching the formula. Most students guess 0.3 or 0.18 — both good.

---

## Setting

Two fuzzy sets $A$ and $B$ on the same universe of discourse $X$, with membership functions $\mu_A(x)$ and $\mu_B(x)$.

<div class="cols c3" style="margin-top:30px">
<div class="card"><h4>OR → Union</h4><p>max</p></div>
<div class="card"><h4>AND → Intersection</h4><p>min</p></div>
<div class="card"><h4>NOT → Complement</h4><p>1 − μ</p></div>
</div>

<p class="fragment rise callout teal" style="margin-top:30px">These are Zadeh's original operators. They reduce <b>exactly</b> to Boolean logic when μ ∈ {0, 1}.</p>

Note:
Set the scene: same universe X for both sets. The three Zadeh operators reduce exactly to Boolean logic when μ is 0 or 1 — check that with a truth table on the board if needed.

---

## Union — the maximum operator

<div class="m">$$ \mu_{A\cup B}(x) = \max\big(\mu_A(x),\ \mu_B(x)\big) = \mu_A(x) \vee \mu_B(x) $$</div>

<div class="cols">
<div>

- $\vee$ is called the **maximum operator**.
- Result: the *upper envelope* of both curves.
- Linguistically: “x is A **or** x is B”.

</div>
<div>

```python
import numpy as np, skfuzzy as fuzz
x  = np.arange(0, 10.01, 0.01)
mA = fuzz.trimf(x, [1, 4, 7])
mB = fuzz.trapmf(x, [4, 6, 8, 10])

mU = np.fmax(mA, mB)
# or: fuzz.fuzzy_or(x, mA, x, mB)
```

</div>
</div>

Note:
Draw two overlapping triangles on the board and trace the upper envelope with a colour. np.fmax is element-wise (unlike max).

---

## Intersection — the minimum operator

<div class="m">$$ \mu_{A\cap B}(x) = \min\big(\mu_A(x),\ \mu_B(x)\big) = \mu_A(x) \wedge \mu_B(x) $$</div>

<div class="cols">
<div>

- $\wedge$ is called the **minimum operator**.
- Result: the *lower envelope* — only where both overlap.
- Linguistically: “x is A **and** x is B”.

</div>
<div>

```python
mI = np.fmin(mA, mB)
# or: fuzz.fuzzy_and(x, mA, x, mB)
```

</div>
</div>

Note:
Lower envelope. Ask: 'where is A ∩ B zero?' — everywhere one of them is zero. Intersection is never larger than either set.

---

## Complement and product

<div class="cols">
<div class="card">
<h4>Complement (NOT)</h4>
<div class="m">$$ \mu_{\overline{A}}(x) = 1 - \mu_A(x) $$</div>

```python
mNotA = 1 - mA      # fuzz.fuzzy_not(mA)
```

</div>
<div class="card">
<h4>Product</h4>
<div class="m">$$ \mu_{A\cdot B}(x) = \mu_A(x)\,\mu_B(x) $$</div>

```python
mP = mA * mB
```

</div>
</div>

<p class="fragment rise callout" style="margin-top:20px">The product is an alternative AND (a <b>T-norm</b>). Its OR partner (<b>S-norm</b>) is the <i>algebraic sum</i> $\mu_A + \mu_B - \mu_A\mu_B$.</p>

Note:
Correction vs the original slide: the product is μA(x)·μB(x) (the original had μA·μA by typo).

---

## See it — animated

<div data-widget="set-ops"></div>

Note:
Click each operation; the purple curve morphs from the previous result. Then move the probe x and read the values. Ask: "where is the union equal to A and where to B?"
Special question: click ¬A — then mentally compute A ∩ ¬A. It is NOT empty! Leads to the next slide.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 1</span>

<div class="quiz numeric" data-answer="0.5" data-tol="0.01">
<p class="q">μ<sub>A</sub>(x₀) = 0.5. What is the value of $\mu_{A\cap\overline{A}}(x_0)$ using min and 1 − μ?</p>
<div class="explain">min(0.5, 1 − 0.5) = <b>0.5</b>. In crisp logic, “A and not-A” is always 0 (law of contradiction). In fuzzy logic it can be as large as 0.5!</div>
</div>

Note:
Answer 0.5. This is the moment to show that the law of contradiction fails — pause and let it sink in.

---

## Laws that break

<div class="cols">
<div class="card">
<h4>Still valid with max / min / 1−μ</h4>

- Commutativity, associativity, distributivity
- Idempotence: $A\cup A = A$
- Involution: $\overline{\overline{A}} = A$
- De Morgan: $\overline{A\cup B}=\overline{A}\cap\overline{B}$

</div>
<div class="card" style="border-color:var(--bad)">
<h4 style="color:var(--bad)">Fail in general</h4>

- Excluded middle: $A\cup\overline{A} \neq X$
- Contradiction: $A\cap\overline{A} \neq \emptyset$

<p class="small fragment rise">Not a bug — a feature: a 25 °C day really is somewhat hot <i>and</i> somewhat not-hot.</p>

</div>
</div>

Note:
Close the loop with the homework from deck 02. Ask which laws they guessed would fail.

---

## Other T-norms and S-norms (for reference)

| Name | AND (T-norm) | OR (S-norm) |
|---|---|---|
| Zadeh (standard) | $\min(a,b)$ | $\max(a,b)$ |
| Algebraic | $a \cdot b$ | $a+b-ab$ |
| Bounded (Łukasiewicz) | $\max(0,\ a+b-1)$ | $\min(1,\ a+b)$ |
| Drastic | $b$ if $a=1$; $a$ if $b=1$; else 0 | $b$ if $a=0$; $a$ if $b=0$; else 1 |

<p class="small">Any T-norm satisfies: commutative, associative, monotone, and $T(a,1)=a$. For every $a,b$: drastic ≤ bounded ≤ product ≤ min.</p>

Note:
Optional depth. For control, min and product cover 95 % of practice. Product gives smoother control surfaces.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Checkpoint 2</span>

<div class="quiz" data-answer="c">
<p class="q">μ<sub>A</sub> = 0.8, μ<sub>B</sub> = 0.5. Order the AND results: min, product, bounded difference.</p>
<div class="opts">
<button class="opt" data-k="a">min 0.5 &lt; product 0.4 &lt; bounded 0.3</button>
<button class="opt" data-k="b">product 0.4 &lt; min 0.5 &lt; bounded 0.3</button>
<button class="opt" data-k="c">bounded 0.3 &lt; product 0.4 &lt; min 0.5</button>
<button class="opt" data-k="d">they are all equal to 0.5</button>
</div>
<div class="explain">max(0, 0.8 + 0.5 − 1) = 0.3 ≤ 0.8·0.5 = 0.4 ≤ min = 0.5. The min is the <b>largest</b> T-norm.</div>
</div>

Note:
Answer C. Emphasise that min is the LARGEST possible T-norm — this is why it's called the 'optimistic' AND.

---

## Practice (≈ 35 min)

Using `numpy` + `scikit-fuzzy`, on $x \in [0,10]$:

1. Define $A$ = `trimf [1, 4, 7]`, $B$ = `trapmf [4, 6, 8, 10]`.
2. Plot, in one figure with 4 subplots: $A\cup B$, $A\cap B$, $\overline{A}$, $A\cdot B$.
3. Numerically check De Morgan's law: `np.allclose(1 - np.fmax(mA, mB), np.fmin(1 - mA, 1 - mB))`.
4. Plot $A\cup\overline{A}$ and $A\cap\overline{A}$. Where is each furthest from the crisp result?

<div class="timer" data-seconds="2100"></div>

Note:
Answer for 4: at the crossover points where μA = 0.5 (x = 2.5 and x = 5.5): union drops to 0.5 and intersection rises to 0.5.

---

<!-- .slide: class="checkpoint" -->

<span class="tag violet">Exit ticket</span>

## Fill the table (in your notebook)

| μ<sub>A</sub> | μ<sub>B</sub> | A ∪ B | A ∩ B | ¬A | A·B |
|---|---|---|---|---|---|
| 0.2 | 0.9 | ? | ? | ? | ? |
| 0.7 | 0.7 | ? | ? | ? | ? |

<details><summary>Answers</summary>
Row 1: 0.9 · 0.2 · 0.8 · 0.18 &nbsp;&nbsp;|&nbsp;&nbsp; Row 2: 0.7 · 0.7 · 0.3 · 0.49</details>

Note:
Exit ticket: 2 minutes. Collect a few answers orally. Product row 1 = 0.18 surprises some students — good.

