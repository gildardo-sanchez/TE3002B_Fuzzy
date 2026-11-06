/* ==================================================================
   deck.js — reveal.js bootstrap + quizzes + timers for every deck
   ================================================================== */
(function () {
  'use strict';
  const score = { ok: 0, tried: 0 };
  let chip;

  function updateChip() {
    if (!chip) { chip = document.createElement('div'); chip.id = 'score-chip'; document.body.append(chip); }
    chip.textContent = `✓ ${score.ok} / ${score.tried} checkpoints`;
  }

  /* Multiple choice:
     <div class="quiz" data-answer="b">
       <p class="q">Question</p>
       <div class="opts"><button class="opt" data-k="a">…</button> …</div>
       <div class="explain">Why…</div>
     </div>                                                          */
  function initQuiz(q) {
    if (q.dataset.ready) return; q.dataset.ready = '1';
    const opts = q.querySelectorAll('button.opt');
    opts.forEach(b => {
      if (!b.querySelector('.k')) b.insertAdjacentHTML('afterbegin', `<span class="k">${b.dataset.k.toUpperCase()}</span>`);
      b.addEventListener('click', () => {
        if (q.dataset.done) return;
        const right = b.dataset.k === q.dataset.answer;
        b.classList.add(right ? 'correct' : 'wrong');
        if (!q.dataset.counted) { score.tried++; if (right) score.ok++; q.dataset.counted = '1'; updateChip(); }
        if (right) {
          q.dataset.done = '1';
          opts.forEach(o => { if (o !== b) o.classList.add('dim'); });
          const ex = q.querySelector('.explain'); if (ex) ex.classList.add('show');
        }
      });
    });
    const bar = document.createElement('div'); bar.className = 'bar';
    const rv = document.createElement('button'); rv.className = 'btn ghost'; rv.textContent = 'Reveal answer';
    rv.addEventListener('click', () => { q.dataset.done = '1'; opts.forEach(o => o.classList.add(o.dataset.k === q.dataset.answer ? 'correct' : 'dim')); const ex = q.querySelector('.explain'); if (ex) ex.classList.add('show'); });
    const rs = document.createElement('button'); rs.className = 'btn ghost'; rs.textContent = 'Reset';
    rs.addEventListener('click', () => { delete q.dataset.done; opts.forEach(o => o.classList.remove('correct', 'wrong', 'dim')); const ex = q.querySelector('.explain'); if (ex) ex.classList.remove('show'); });
    bar.append(rv, rs); q.append(bar);
  }

  /* Numeric:  <div class="quiz numeric" data-answer="6.4" data-tol="0.1"> <p class="q">…</p> <div class="explain">…</div></div> */
  function initNumeric(q) {
    if (q.dataset.ready) return; q.dataset.ready = '1';
    const bar = document.createElement('div'); bar.className = 'bar';
    const inp = document.createElement('input'); inp.placeholder = 'your answer';
    const go = document.createElement('button'); go.className = 'btn'; go.textContent = 'Check';
    const rv = document.createElement('button'); rv.className = 'btn ghost'; rv.textContent = 'Reveal';
    const ex = q.querySelector('.explain');
    const check = () => {
      const v = parseFloat(inp.value.replace(',', '.')), a = parseFloat(q.dataset.answer), tol = parseFloat(q.dataset.tol || '0.01');
      const ok = Math.abs(v - a) <= tol; inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok);
      if (!q.dataset.counted) { score.tried++; if (ok) score.ok++; q.dataset.counted = '1'; updateChip(); }
      if (ok && ex) ex.classList.add('show');
    };
    go.addEventListener('click', check); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') check(); });
    rv.addEventListener('click', () => { inp.value = q.dataset.answer; inp.classList.add('ok'); if (ex) ex.classList.add('show'); });
    bar.append(inp, go, rv); q.insertBefore(bar, ex);
  }

  /* Timer: <div class="timer" data-seconds="120"></div> */
  function initTimer(t) {
    if (t.dataset.ready) return; t.dataset.ready = '1';
    let left = +t.dataset.seconds, id = null;
    const lab = document.createElement('span');
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    lab.textContent = fmt(left);
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = '▶ start';
    b.addEventListener('click', () => {
      if (id) { clearInterval(id); id = null; b.textContent = '▶ resume'; return; }
      b.textContent = '❚❚ pause';
      id = setInterval(() => { left--; lab.textContent = fmt(Math.max(0, left)); if (left <= 0) { clearInterval(id); id = null; t.classList.add('done'); b.textContent = 'time!'; } }, 1000);
    });
    const r = document.createElement('button'); r.className = 'btn ghost'; r.textContent = '↺';
    r.addEventListener('click', () => { clearInterval(id); id = null; left = +t.dataset.seconds; lab.textContent = fmt(left); t.classList.remove('done'); b.textContent = '▶ start'; });
    t.append(lab, b, r);
  }

  function activate(slide) {
    if (!slide) return;
    slide.querySelectorAll('.quiz:not(.numeric)').forEach(initQuiz);
    slide.querySelectorAll('.quiz.numeric').forEach(initNumeric);
    slide.querySelectorAll('.timer').forEach(initTimer);
    if (window.Fuzzy) Fuzzy.init(slide);
  }

  // keep keyboard events inside widgets from moving slides
  document.addEventListener('keydown', e => { if (e.target.matches && e.target.matches('input, select')) e.stopPropagation(); }, true);

  Reveal.initialize({
    hash: true, slideNumber: 'c/t', controls: true, progress: true, center: false,
    width: 1280, height: 720, margin: 0.06, transition: 'fade', transitionSpeed: 'fast',
    pdfSeparateFragments: false,
    keyboard: { 77: () => { window.location.href = '../index.html'; } },   // M → session menu
    katex: { version: '0.16.11', local: null },
    plugins: [RevealMarkdown, RevealHighlight, RevealNotes, RevealMath.KaTeX, RevealZoom]
  }).then(() => { updateChip(); activate(Reveal.getCurrentSlide()); });
  Reveal.on('slidechanged', e => activate(e.currentSlide));
})();
