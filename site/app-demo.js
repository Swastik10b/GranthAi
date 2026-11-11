/* GranthAI interactive app demo.
   Runs entirely in the browser on fictional demo data. The maths mirrors the
   prototype backend (backend/granthai): Bayesian knowledge tracing, a
   misconception "bug library" for fraction addition, a hint ladder gated by an
   attempt, MMR-ranked interest feed, k-means interest clustering with a
   mixed-school constraint, and weighted mentor matching. */
(function () {
  'use strict';
  const body = document.getElementById('app-body');
  const explainEl = document.getElementById('explain');
  if (!body) return;

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = body) => root.querySelector(sel);
  const $$ = (sel, root = body) => Array.from(root.querySelectorAll(sel));
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const lcm = (a, b) => a / gcd(a, b) * b;
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = a => Math.sqrt(dot(a, a)) || 1;
  const cos = (a, b) => dot(a, b) / (norm(a) * norm(b));
  const pct = x => Math.round(x * 100) + '%';

  // ---------- domain data ----------
  const INTERESTS = [
    ['football', 'Football', '⚽'], ['space', 'Space', '🚀'], ['drawing', 'Drawing', '🎨'], ['music', 'Music', '🎵'],
    ['coding', 'Coding', '💻'], ['animals', 'Animals', '🦔'], ['science', 'Experiments', '🧪'], ['stories', 'Stories', '📚'],
    ['dance', 'Dance', '💃'], ['building', 'Building & robots', '🤖'], ['nature', 'Nature', '🌿'], ['cooking', 'Cooking', '🍳'],
  ];
  const IDX = Object.fromEntries(INTERESTS.map(([k], i) => [k, i]));
  const LABEL = Object.fromEntries(INTERESTS.map(([k, l]) => [k, l]));
  // RIASEC-style profile, in child-friendly words
  const DIMS = ['Maker', 'Explorer', 'Creator', 'Helper', 'Leader', 'Organiser'];
  const DIM_OF = {
    football: [0.4, 0, 0, 0.4, 0.2, 0], space: [0, 1, 0, 0, 0, 0], drawing: [0, 0, 1, 0, 0, 0], music: [0, 0, 0.8, 0.2, 0, 0],
    coding: [0.2, 0.5, 0, 0, 0, 0.3], animals: [0, 0.5, 0, 0.5, 0, 0], science: [0.2, 0.8, 0, 0, 0, 0], stories: [0, 0, 0.7, 0.3, 0, 0],
    dance: [0, 0, 0.6, 0.2, 0.2, 0], building: [1, 0, 0, 0, 0, 0], nature: [0.5, 0.5, 0, 0, 0, 0], cooking: [0.6, 0, 0.3, 0.1, 0, 0],
  };
  const BANDS = [
    { max: 9, name: 'Explorer', tone: 'Playful and silly, lots of encouragement, short sentences.', hi: 'Hiya {n}! Ready for a brain adventure? 🧠✨' },
    { max: 11, name: 'Adventurer', tone: 'Warm and curious, gentle jokes, one idea at a time.', hi: 'Hey {n}! Fancy a quick challenge?' },
    { max: 13, name: 'Challenger', tone: 'Coach-like, a bit of banter, more independence.', hi: 'Alright {n}, let’s crack one.' },
    { max: 15, name: 'Strategist', tone: 'Study partner, dry humour, explains the why.', hi: 'Hi {n}. Quick one before we move on.' },
    { max: 17, name: 'Pathfinder', tone: 'Respectful near-peer, exam-aware, links to goals.', hi: 'Hi {n}. Let’s sharpen this one.' },
  ];
  const band = age => BANDS.find(b => age <= b.max);
  const LANGS = ['English', 'Gaeilge', 'Polski', 'Українська', 'Português', 'Română'];

  // ---------- state ----------
  const S = {
    name: 'Aoife', age: 9, interests: new Set(['football', 'space', 'drawing']), lang: 'English', consent: true, saved: false,
    xp: 120, streak: 4, pL: 0.32, screen: 'profile',
    mode: 'granth', prob: { n1: 3, d1: 4, n2: 1, d2: 2 }, attempts: 0, hint: 0, solved: false,
    chat: null, generic: [], mood: null, clusters: null, mentorReq: false, lesson: false,
  };
  const vecOf = set => INTERESTS.map(([k]) => set.has(k) ? 1 : 0);
  function profileDims() {
    const v = [0, 0, 0, 0, 0, 0];
    S.interests.forEach(k => DIM_OF[k].forEach((x, i) => v[i] += x));
    const m = Math.max(1, ...v); return v.map(x => x / m);
  }

  // ---------- header ----------
  function header(teacher) {
    const av = document.getElementById('app-avatar'), nm = document.getElementById('app-name'), sub = document.getElementById('app-sub');
    if (teacher) {
      av.textContent = 'MB'; av.style.background = 'var(--forest)'; nm.textContent = 'Ms Byrne';
      sub.textContent = '4th Class · 24 pupils'; document.getElementById('app-streak').textContent = 'Teacher view';
      document.getElementById('app-xp').textContent = 'Week 6';
    } else {
      av.textContent = (S.name || '?')[0].toUpperCase(); av.style.background = 'var(--saffron)';
      nm.textContent = S.name || 'New learner'; sub.textContent = `Age ${S.age} · ${band(S.age).name}`;
      document.getElementById('app-streak').textContent = `${S.streak}-day streak`;
      document.getElementById('app-xp').textContent = `${S.xp} XP`;
    }
  }

  // ---------- small SVG builders ----------
  function radar(vals, size = 200) {
    const c = size / 2, r = size / 2 - 34, n = vals.length;
    const pt = (i, k) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k]; };
    let g = '';
    [0.33, 0.66, 1].forEach(k => { g += `<polygon points="${vals.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" stroke="#e1e7e3"/>`; });
    vals.forEach((_, i) => { const [x, y] = pt(i, 1); g += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#e1e7e3"/>`; });
    g += `<polygon points="${vals.map((v, i) => pt(i, Math.max(0.06, v)).join(',')).join(' ')}" fill="rgba(192,120,42,0.22)" stroke="#c0782a" stroke-width="2"/>`;
    vals.forEach((_, i) => { const [x, y] = pt(i, 1.24); g += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" fill="#4b5563" font-family="Inter, sans-serif">${DIMS[i]}</text>`; });
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Interest profile">${g}</svg>`;
  }
  function fracBars(rows, w = 190) {
    const h = 26, gap = 30; let g = '';
    rows.forEach((f, r) => {
      const y = r * gap + 4, seg = w / f.d;
      for (let i = 0; i < f.d; i++) g += `<rect x="${i * seg + 1}" y="${y}" width="${seg - 2}" height="${h - 6}" rx="3" fill="${i < f.n ? (f.c || '#6C8577') : '#eef1ee'}"/>`;
      g += `<text x="${w + 8}" y="${y + 15}" font-size="12.5" font-weight="700" fill="#1f2b24" font-family="Inter, sans-serif">${f.label || f.n + '/' + f.d}</text>`;
    });
    return `<svg viewBox="0 0 ${w + 100} ${rows.length * gap + 4}" width="${w + 100}" height="${rows.length * gap + 4}" role="img" aria-label="Fraction bars">${g}</svg>`;
  }

  // ---------- SCREEN: profile ----------
  function screenProfile() {
    const b = band(S.age);
    body.innerHTML = `
      <div class="panel">
        <h4>Create your profile</h4>
        <label class="label" for="p-name">First name</label>
        <input class="field" id="p-name" value="${esc(S.name)}" maxlength="20" autocomplete="off">
        <label class="label" for="p-age">Age: <b id="p-age-v">${S.age}</b></label>
        <input class="range" id="p-age" type="range" min="8" max="17" value="${S.age}">
        <div class="persona" id="p-persona"><b>${b.name} mode.</b> ${b.tone}</div>
        <span class="label">What do you love? Pick a few</span>
        <div class="chips" id="p-ints">${INTERESTS.map(([k, l, e]) => `<button class="chip" data-k="${k}" aria-pressed="${S.interests.has(k)}">${e} ${l}</button>`).join('')}</div>
        <label class="label" for="p-lang">Language</label>
        <select class="field" id="p-lang">${LANGS.map(l => `<option ${l === S.lang ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="row" style="margin-top:12px;font-size:13px;color:var(--muted)"><input type="checkbox" id="p-consent" ${S.consent ? 'checked' : ''}> Consent confirmed by teacher</label>
      </div>
      <div class="panel" style="text-align:center">
        <h4 style="text-align:left">Your interest profile</h4>
        <div id="p-radar">${radar(profileDims())}</div>
        <div class="meta" id="p-top"></div>
      </div>
      <button class="small-btn" id="p-save" style="width:100%">${S.saved ? 'Profile saved ✓' : 'Save profile'}</button>`;
    const refresh = () => {
      $('#p-radar').innerHTML = radar(profileDims());
      const d = profileDims(); const top = d.map((v, i) => [v, DIMS[i]]).sort((a, c) => c[0] - a[0]).slice(0, 2).map(x => x[1]);
      $('#p-top').textContent = S.interests.size ? `Strongest: ${top.join(' and ')}. This starts as a guess and is updated as you learn.` : 'Pick some interests to see your profile.';
      header(false);
    };
    refresh();
    $('#p-name').addEventListener('input', e => { S.name = e.target.value.trim() || 'Friend'; S.saved = false; S.chat = null; refresh(); });
    $('#p-age').addEventListener('input', e => {
      S.age = +e.target.value; const nb = band(S.age); S.chat = null;
      $('#p-age-v').textContent = S.age; $('#p-persona').innerHTML = `<b>${nb.name} mode.</b> ${nb.tone}`; refresh();
    });
    $$('#p-ints .chip').forEach(c => c.addEventListener('click', () => {
      const k = c.dataset.k; S.interests.has(k) ? S.interests.delete(k) : S.interests.add(k);
      c.setAttribute('aria-pressed', S.interests.has(k)); S.clusters = null; S.saved = false; refresh();
    }));
    $('#p-lang').addEventListener('change', e => { S.lang = e.target.value; });
    $('#p-consent').addEventListener('change', e => { S.consent = e.target.checked; });
    $('#p-save').addEventListener('click', () => {
      if (!S.consent) { $('#p-save').textContent = 'A teacher needs to confirm consent first'; return; }
      S.saved = true; $('#p-save').textContent = 'Profile saved ✓  Opening Learn…';
      setTimeout(() => go('learn'), 700);
    });
  }

  // ---------- SCREEN: learn (tutor) ----------
  const BKT = { G: 0.2, S: 0.1, T: 0.15 };
  function bkt(correct) {
    const p = S.pL;
    const post = correct ? p * (1 - BKT.S) / (p * (1 - BKT.S) + (1 - p) * BKT.G)
                         : p * BKT.S / (p * BKT.S + (1 - p) * (1 - BKT.G));
    S.pL = post + (1 - post) * BKT.T;
  }
  function parseAns(t) {
    t = t.trim().replace(/\s+/g, ' ');
    let m = t.match(/^(\d+) (\d+)\s*\/\s*(\d+)$/); if (m) return { v: +m[1] + m[2] / m[3], n: +m[1] * +m[3] + +m[2], d: +m[3] };
    m = t.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) return { v: m[1] / m[2], n: +m[1], d: +m[2] };
    m = t.match(/^\d+(\.\d+)?$/); if (m) return { v: parseFloat(t) };
    return null;
  }
  function diagnose(a) {
    const { n1, d1, n2, d2 } = S.prob, L = lcm(d1, d2), target = n1 / d1 + n2 / d2;
    if (Math.abs(a.v - target) < 1e-9) return 'correct';
    if (a.n === n1 + n2 && a.d === d1 + d2) return 'add_across';
    if (a.n === n1 * n2 && a.d === d1 * d2) return 'multiplied';
    if (a.n === n1 + n2 && a.d === L) return 'unscaled';
    if (a.n === n1 + n2 && (a.d === d1 || a.d === d2)) return 'kept_one';
    return 'other';
  }
  function newProblem() {
    const R = rng(Date.now()); const pairs = [[2, 3], [3, 4], [2, 5], [3, 6], [4, 6], [2, 6], [5, 10], [3, 5]];
    const [d1, d2] = pairs[Math.floor(R() * pairs.length)];
    S.prob = { n1: 1 + Math.floor(R() * (d1 - 1)), d1, n2: 1 + Math.floor(R() * (d2 - 1)), d2 };
    S.attempts = 0; S.hint = 0; S.solved = false;
  }
  const PIECES = { 2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 8: 'eighths', 10: 'tenths', 12: 'twelfths', 15: 'fifteenths', 30: 'thirtieths' };
  const pieces = d => PIECES[d] || d + 'ths';
  const pq = () => `${S.prob.n1}/${S.prob.d1} + ${S.prob.n2}/${S.prob.d2}`;
  function simplest(n, d) { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? `${n}` : (n > d ? `${n}/${d} (or ${Math.floor(n / d)} ${n % d}/${d})` : `${n}/${d}`); }
  function bot(html, tag) { S.chat.push({ who: 'bot', html, tag }); }
  function me(text) { S.chat.push({ who: 'me', html: esc(text) }); }
  function startChat() {
    S.chat = [];
    const b = band(S.age);
    bot(`${b.hi.replace('{n}', esc(S.name))} What is <b>${pq()}</b>? Have a go first, a guess is fine!`, 'GranthAI tutor');
  }
  function equivBars() {
    const { n1, d1, n2, d2 } = S.prob, L = lcm(d1, d2);
    const rows = [{ n: n1, d: d1 }, { n: n2, d: d2, c: '#c0782a' }];
    if (d1 !== L) rows.push({ n: n1 * L / d1, d: L, label: `${n1}/${d1} = ${n1 * L / d1}/${L}` });
    if (d2 !== L) rows.push({ n: n2 * L / d2, d: L, c: '#c0782a', label: `${n2}/${d2} = ${n2 * L / d2}/${L}` });
    return fracBars(rows);
  }
  function tutorReply(text) {
    const t = text.toLowerCase();
    const { n1, d1, n2, d2 } = S.prob, L = lcm(d1, d2);
    if (S.solved && /next|another|more/.test(t)) { newProblem(); bot(`New one: what is <b>${pq()}</b>?`); return; }
    if (/answer|tell me|don.?t know|idk|help|hint|stuck/.test(t)) {
      S.hint++;
      if (S.hint === 1) bot(`I won’t just give it to you, because then your brain misses the workout! 💪 <b>Hint 1:</b> can we add ${pieces(d1)} and ${pieces(d2)} straight away, or do the pieces need to be the same size first?`, 'Hint ladder');
      else if (S.hint === 2) bot(`<b>Hint 2:</b> make both fractions into ${pieces(L)}. Look at the pieces:${equivBars()}`, 'Hint ladder');
      else if (S.attempts === 0) bot(`<b>Hint 3:</b> here’s a different one worked out: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2. Now try yours. I’ll show the full answer once you’ve had a go.`, 'Hint ladder');
      else bot(`Here’s the full working: ${n1}/${d1} + ${n2}/${d2} = ${n1 * L / d1}/${L} + ${n2 * L / d2}/${L} = <b>${simplest(n1 * L / d1 + n2 * L / d2, L)}</b>. Let’s try a similar one to lock it in.`, 'Worked solution');
      return;
    }
    const a = parseAns(text);
    if (!a) { bot(`I’m here for fractions right now 😊 Type an answer like <b>5/4</b>, or ask for a hint.`); return; }
    S.attempts++;
    const dx = diagnose(a);
    if (dx === 'correct') {
      bkt(true); S.solved = true; S.xp += 20;
      bot(`Yes! 🎉 ${esc(text)} is right. You made the pieces the same size before adding, which is exactly the trick. <b>+20 XP.</b> Type <b>next</b> for another one.`, 'Correct');
      return;
    }
    bkt(false);
    const msgs = {
      add_across: `I can see what you did: you added the tops (${n1}+${n2}=${n1 + n2}) and the bottoms (${d1}+${d2}=${d1 + d2}). Loads of people do that! But the pieces are different sizes, so we can’t add them yet. Look:${equivBars()}How many ${pieces(L)} is that altogether?`,
      multiplied: `You multiplied the fractions. That’s what we do for <i>times</i>, but this is a <i>plus</i>. First make the pieces the same size:${equivBars()}`,
      unscaled: `Nice, you found a common bottom number (${L})! But the top numbers need to change too: ${n1}/${d1} = ${n1 * L / d1}/${L} and ${n2}/${d2} = ${n2 * L / d2}/${L}. Try again?`,
      kept_one: `You added the tops and kept one bottom number. Close, but ${d1} and ${d2} are different-sized pieces. What would both be as ${pieces(L)}?`,
      other: `Not quite, but good effort. Let’s check it with pieces:${equivBars()}`,
    };
    const tags = { add_across: 'Misconception: adds tops and bottoms', multiplied: 'Misconception: multiplies instead of adding', unscaled: 'Misconception: forgets to scale the tops', kept_one: 'Misconception: keeps one denominator', other: 'Diagnosis: slip or gap' };
    bot(msgs[dx], tags[dx]);
  }
  function genericReply() {
    const { n1, d1, n2, d2 } = S.prob, L = lcm(d1, d2), N = n1 * L / d1 + n2 * L / d2;
    return `To add ${n1}/${d1} + ${n2}/${d2}, find a common denominator of ${L}: ${n1}/${d1} = ${n1 * L / d1}/${L} and ${n2}/${d2} = ${n2 * L / d2}/${L}. Add the numerators: ${N}/${L}. <b>Answer: ${simplest(N, L)}</b>. Let me know if you have any other questions!`;
  }
  function screenLearn() {
    if (!S.chat) startChat();
    const isG = S.mode === 'granth';
    const thread = isG ? S.chat : S.generic;
    body.innerHTML = `
      <div class="seg" role="group" aria-label="Compare tutors">
        <button data-m="granth" aria-pressed="${isG}">GranthAI</button>
        <button data-m="generic" aria-pressed="${!isG}">General chatbot</button>
      </div>
      <div class="chat" id="chat">${thread.map(m => `<div class="msg ${m.who === 'me' ? 'me' : (isG ? 'bot' : 'bot generic')}">${m.tag ? `<span class="tag">${m.tag}</span>` : ''}${m.html}</div>`).join('') ||
        (!isG ? `<div class="msg bot generic"><span class="tag">General chatbot</span>Ask me anything!</div>` : '')}</div>
      <div class="quick" id="quick">${(isG ? ['Just tell me the answer', `${S.prob.n1 + S.prob.n2}/${S.prob.d1 + S.prob.d2}`, `${S.prob.n1 * lcm(S.prob.d1, S.prob.d2) / S.prob.d1 + S.prob.n2 * lcm(S.prob.d1, S.prob.d2) / S.prob.d2}/${lcm(S.prob.d1, S.prob.d2)}`, 'next']
                                          : [`What is ${pq()}? Just tell me the answer`]).map(q => `<button class="chip">${esc(q)}</button>`).join('')}</div>
      <form class="composer" id="composer"><input class="field" id="msg" placeholder="${isG ? 'Type your answer…' : 'Message the chatbot…'}" autocomplete="off" aria-label="Message"><button class="small-btn">Send</button></form>
      ${isG ? `<div class="panel mastery"><div class="kv"><span>Adding fractions with different denominators</span><b>${pct(S.pL)}</b></div><div class="bar saff"><i style="width:${pct(S.pL)}"></i></div><div class="meta" style="margin-top:6px">Mastery estimate from Bayesian knowledge tracing. Updates after every answer.</div></div>`
            : `<div class="panel mastery" style="background:#fff7ed"><b style="font-size:13.5px">Same question, different outcome.</b><div class="meta" style="margin-top:4px">The chatbot gives the full answer straight away. The child can copy it, and no one learns what they misunderstood. Switch back to GranthAI to compare.</div></div>`}`;
    const chat = $('#chat'); body.scrollTop = 0; chat.lastElementChild && chat.lastElementChild.scrollIntoView({ block: 'nearest' });
    $$('.seg button').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.m; screenLearn(); }));
    const send = text => {
      if (!text.trim()) return;
      if (isG) { me(text); tutorReply(text); } else { S.generic.push({ who: 'me', html: esc(text) }); S.generic.push({ who: 'bot', html: genericReply(), tag: 'General chatbot (illustrative)' }); }
      header(false); screenLearn(); const inp = document.getElementById('msg'); inp && inp.focus({ preventScroll: true });
    };
    $$('#quick .chip').forEach(c => c.addEventListener('click', () => send(c.textContent)));
    $('#composer').addEventListener('submit', e => { e.preventDefault(); send($('#msg').value); });
  }

  // ---------- SCREEN: feed ----------
  const FEED = [
    { t: 'Why does a football curve? The Magnus effect in 60 seconds', tags: ['football', 'science'], type: 'Explainer', e: '⚽' },
    { t: 'Build a straw rocket this weekend and measure how far it flies', tags: ['space', 'building'], type: 'Project', e: '🚀' },
    { t: 'Draw the Moon every night for a week and spot the pattern', tags: ['space', 'drawing'], type: 'Challenge', e: '🌙' },
    { t: 'This week in space: what telescopes spotted, explained for kids', tags: ['space', 'science'], type: 'News', e: '🔭' },
    { t: 'Newgrange: how a 5,000-year-old tomb catches the winter sunrise', tags: ['space', 'stories'], type: 'Discovery', e: '☀️' },
    { t: 'Book pick: The Wild Robot by Peter Brown', tags: ['building', 'nature', 'stories'], type: 'Book', e: '📗' },
    { t: 'Book pick: Hidden Figures (Young Readers’ Edition)', tags: ['space', 'stories'], type: 'Book', e: '📘' },
    { t: 'Kathleen Lonsdale: the Irish scientist who saw inside crystals', tags: ['science', 'stories'], type: 'Role model', e: '🔬' },
    { t: 'Make a beat with just your voice and a phone recorder', tags: ['music'], type: 'Project', e: '🎵' },
    { t: 'Code a quiz game in Scratch in 20 minutes', tags: ['coding'], type: 'Project', e: '💻' },
    { t: 'How do hedgehogs survive an Irish winter?', tags: ['animals', 'nature'], type: 'Explainer', e: '🦔' },
    { t: 'Design your own football kit with symmetry', tags: ['football', 'drawing'], type: 'Challenge', e: '👕' },
    { t: 'Bake a fraction pizza (and eat your working)', tags: ['cooking'], type: 'Project', e: '🍕' },
    { t: 'Robot dance: a 5-minute move break', tags: ['dance', 'building'], type: 'Move break', e: '🤖' },
  ];
  function rankFeed() {
    const like = S.interests;
    const rel = it => it.tags.reduce((s, k) => s + (like.has(k) ? 1 : 0), 0) / Math.sqrt(it.tags.length);
    const sim = (a, b) => a.tags.filter(k => b.tags.includes(k)).length / Math.sqrt(a.tags.length * b.tags.length);
    const pool = FEED.map(it => ({ ...it, r: rel(it) })), out = [];
    // maximal marginal relevance: relevant, but not all about the same thing
    while (out.length < 6 && pool.length) {
      let best = -1, bi = 0;
      pool.forEach((it, i) => { const s = 0.75 * it.r - 0.35 * Math.max(0, ...out.map(o => sim(it, o))); if (s > best) { best = s; bi = i; } });
      out.push(pool.splice(bi, 1)[0]);
    }
    // one exploration slot: something outside current interests (curiosity)
    const fresh = FEED.find(it => it.tags.every(k => !like.has(k)) && !out.includes(it));
    if (fresh) out.splice(4, 0, { ...fresh, explore: true });
    return out.slice(0, 7);
  }
  function whyText(it) {
    if (it.explore) return 'Something new to explore';
    const m = it.tags.filter(k => S.interests.has(k)).map(k => LABEL[k].toLowerCase());
    return m.length ? 'Because you like ' + m.join(' and ') : 'Popular with your class';
  }
  function screenFeed() {
    const items = rankFeed();
    body.innerHTML = `
      <div class="panel" style="background:var(--forest);color:#fff">
        <div class="kv" style="color:#d5e1d8"><span>Weekly quest: master 3 skills to unlock the <b style="color:#fff">Space Club badge</b></span><b style="color:#fff">2/3</b></div>
        <div class="bar"><i style="width:66%;background:var(--saffron-soft)"></i></div>
        <div class="meta" style="color:#c4d3c9;margin-top:6px">${S.streak}-day streak · effort earns XP, not just right answers</div>
      </div>
      ${items.map(it => `<div class="panel feed-item"><div class="thumb">${it.e}</div><div><span class="type">${it.type}</span><h4>${esc(it.t)}</h4>
        <span class="why">${whyText(it)}</span></div></div>`).join('')}`;
  }

  // ---------- SCREEN: check-in ----------
  const MOODS = [['😄', 'Great'], ['🙂', 'Good'], ['😐', 'Okay'], ['😕', 'Low'], ['😢', 'Upset']];
  const CONCERN = /(hurt|hit me|hits me|unsafe|scared of|abuse|kill|die|self.?harm|touch(ed)? me|secret)/i;
  function screenCheckin() {
    body.innerHTML = `
      <div class="panel"><h4>How are you feeling today, ${esc(S.name)}?</h4><div class="meta" style="margin-bottom:10px">Optional. GranthAI never guesses your feelings from your face or voice.</div>
      <div class="moods">${MOODS.map(([e, l], i) => `<button class="mood" data-i="${i}" aria-pressed="${S.mood === i}"><span>${e}</span>${l}</button>`).join('')}</div></div>
      <div id="mood-reply"></div>
      <div class="panel"><label class="label" for="ci-text" style="margin-top:0">Anything you want to tell me? (optional)</label>
      <form class="composer" id="ci-form" style="margin-top:0"><input class="field" id="ci-text" autocomplete="off" placeholder="Type here…"><button class="small-btn">Send</button></form>
      <div id="ci-reply"></div></div>`;
    const reply = i => {
      const low = i >= 3;
      $('#mood-reply').innerHTML = `<div class="panel"><div class="msg bot" style="max-width:100%"><span class="tag">GranthAI</span>${
        low ? `Thanks for telling me. It’s okay to feel ${MOODS[i][1].toLowerCase()} sometimes. Would you like to talk to a grown-up you trust at school? You’re not in trouble.`
            : i === 2 ? `Thanks for checking in. Want a 2-minute stretch break before we start?` : `Love that! Let’s use that energy on today’s quest. 🚀`}</div>
        ${low ? `<div class="row" style="margin-top:10px"><button class="small-btn" id="ask-adult">Yes, ask Ms Byrne for a chat</button><button class="small-btn ghost" id="breathe">Maybe later</button></div>` : ''}</div>`;
      const ask = document.getElementById('ask-adult');
      if (ask) ask.addEventListener('click', () => { ask.outerHTML = `<div class="meta">✓ Ms Byrne has been told you’d like a chat. She’ll find a quiet moment today.</div>`; });
      const br = document.getElementById('breathe');
      if (br) br.addEventListener('click', () => { br.outerHTML = `<div class="meta">That’s fine. You can ask any time from this screen.</div>`; });
    };
    if (S.mood != null) reply(S.mood);
    $$('.mood').forEach(m => m.addEventListener('click', () => { S.mood = +m.dataset.i; $$('.mood').forEach(x => x.setAttribute('aria-pressed', x === m)); reply(S.mood); }));
    $('#ci-form').addEventListener('submit', e => {
      e.preventDefault(); const t = $('#ci-text').value.trim(); if (!t) return;
      $('#ci-reply').innerHTML = CONCERN.test(t)
        ? `<div class="msg bot" style="max-width:100%;margin-top:10px;border-color:#f3c98b"><span class="tag">Safety protocol</span>Thank you for telling me. That was brave, and it matters. I can’t keep this a secret, because keeping you safe comes first. I’m letting Ms Byrne, your school’s designated liaison person, know so a trusted adult can help. If you are in danger right now, call <b>112</b> or <b>999</b>. You can talk to Childline any time, free, on <b>1800 66 66 66</b>.</div>`
        : `<div class="msg bot" style="max-width:100%;margin-top:10px"><span class="tag">GranthAI</span>Thanks for sharing that with me. If you ever want to talk to a grown-up about it, just ask and I’ll let your teacher know.</div>`;
      $('#ci-text').value = '';
    });
  }

  // ---------- SCREEN: clusters ----------
  const SCHOOLS = [['School A', '#c0782a'], ['School B', '#2f5e46'], ['School C', '#6d8fb3'], ['School D', '#9b6bb0']];
  const PEERS = ['Zofia', 'Tomás', 'Amara', 'Cian', 'Oisín', 'Lena', 'Darragh', 'Yusuf', 'Niamh', 'Mateus', 'Saoirse', 'Kacper', 'Ella', 'Ronan', 'Ifeoma', 'Liam', 'Ana', 'Fionn', 'Maya', 'Seán', 'Olena', 'Jack', 'Róisín'];
  const ARCH = [['space', 'science', 'football'], ['football', 'dance', 'music'], ['drawing', 'stories', 'music'], ['building', 'coding', 'science']];
  function buildKids() {
    const R = rng(7), kids = [{ name: S.name, school: 0, v: vecOf(S.interests), me: true }];
    PEERS.forEach((nm, i) => {
      const a = ARCH[i % 4], v = INTERESTS.map(() => R() < 0.05 ? 1 : 0);
      a.forEach(k => { if (R() < 0.85) v[IDX[k]] = 1; });
      kids.push({ name: nm, school: (i * 3 + 1 + Math.floor(R() * 2)) % 4, v });
    });
    kids.forEach((k, i) => { k.x0 = 30 + R() * 300; k.y0 = 30 + R() * 240; });
    return kids;
  }
  function kmeans(X, k) {
    // k-means++ seeding with a fixed seed, then Lloyd iterations on cosine-normalised vectors
    let best = null;
    for (let seed = 1; seed <= 12; seed++) {
      const r = kmeansOnce(X, k, seed);
      if (r.balanced && (!best || r.score > best.score)) best = r;
      if (!best && seed === 12) best = r;
    }
    return best;
  }
  function kmeansOnce(X, k, seed) {
    const R = rng(seed * 7919), Z = X.map(v => v.map(x => x / norm(v)));
    const C = [Z[Math.floor(R() * Z.length)]];
    while (C.length < k) {
      const d = Z.map(z => Math.min(...C.map(c => 1 - dot(z, c)))); const s = d.reduce((a, b) => a + b, 0);
      let r = R() * s, i = 0; while (r > d[i] && i < d.length - 1) { r -= d[i]; i++; } C.push(Z[i]);
    }
    let lab = [];
    for (let it = 0; it < 25; it++) {
      lab = Z.map(z => C.map(c => dot(z, c)).reduce((bi, v, i, a) => v > a[bi] ? i : bi, 0));
      for (let j = 0; j < k; j++) { const m = Z.filter((_, i) => lab[i] === j); if (m.length) C[j] = m[0].map((_, d) => m.reduce((s, z) => s + z[d], 0) / m.length); }
    }
    const sizes = C.map((_, j) => lab.filter(l => l === j).length);
    const score = Z.reduce((s, z, i) => s + dot(z, C[lab[i]]), 0);
    return { lab, C, score, balanced: Math.min(...sizes) >= 4 };
  }
  function cluster() {
    const kids = buildKids(), { lab, C } = kmeans(kids.map(k => k.v), 4);
    const centres = [[95, 85], [265, 85], [95, 215], [265, 215]];
    const groups = C.map((c, j) => {
      const members = kids.filter((_, i) => lab[i] === j);
      const top = c.map((v, d) => [v, INTERESTS[d][0]]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1]);
      return { j, members, top, name: `${LABEL[top[0]]} & ${LABEL[top[1]].toLowerCase()}` };
    });
    groups.forEach(g => g.members.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0)).forEach((k, i) => {
      const a = i * 2.39996, r = i === 0 ? 0 : 12 + 8 * Math.sqrt(i - 1);
      k.x1 = centres[g.j][0] + Math.cos(a) * r; k.y1 = centres[g.j][1] + Math.sin(a) * r; k.g = g.j;
    }));
    // a club is 4 children from at least 2 schools: take the child, then round-robin other schools by similarity
    const meK = kids[0], mine = groups[meK.g];
    const others = mine.members.filter(k => !k.me).sort((a, b) => cos(b.v, meK.v) - cos(a.v, meK.v));
    const club = [meK]; const used = new Set([meK.school]);
    others.forEach(k => { if (club.length < 4 && !used.has(k.school)) { club.push(k); used.add(k.school); } });
    others.forEach(k => { if (club.length < 4 && !club.includes(k)) club.push(k); });
    return { kids, groups, club, mine };
  }
  function screenClusters() {
    const done = !!S.clusters; const data = S.clusters || cluster();
    body.innerHTML = `
      <div class="panel"><h4>Find friends who love what you love</h4>
        <svg class="cluster-svg" viewBox="0 0 360 300" id="csvg" role="img" aria-label="Children from four schools grouped by interests">
          <g id="hulls"></g>
          ${data.kids.map((k, i) => `<g class="kid" data-i="${i}" style="transform:translate(${k.x0}px,${k.y0}px);transition:transform 1.1s cubic-bezier(.2,.8,.2,1) ${i * 18}ms">
              <circle r="${k.me ? 8 : 6}" fill="${SCHOOLS[k.school][1]}" stroke="${k.me ? '#0f1a14' : '#fff'}" stroke-width="2"></circle>
              ${k.me ? `<text y="-13" text-anchor="middle" font-size="11" font-weight="700" fill="#0f1a14" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="Inter,sans-serif">${esc(k.name)}</text>` : ''}</g>`).join('')}
        </svg>
        <div class="legend">${SCHOOLS.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
        <button class="small-btn" id="run" style="margin-top:12px;width:100%">${done ? 'Groups found ✓' : 'Find my groups'}</button>
      </div>
      <div id="club"></div>`;
    const place = () => {
      $$('.kid').forEach(g => { const k = data.kids[+g.dataset.i]; g.style.transform = `translate(${k.x1}px,${k.y1}px)`; });
      const centres = [[95, 85], [265, 85], [95, 215], [265, 215]];
      $('#hulls').innerHTML = data.groups.map(g => `<circle cx="${centres[g.j][0]}" cy="${centres[g.j][1]}" r="56" fill="${g.j === data.mine.j ? 'rgba(192,120,42,0.10)' : 'rgba(108,133,119,0.08)'}" stroke="${g.j === data.mine.j ? '#c0782a' : '#cfd8d2'}" stroke-dasharray="4 4"/>
        <text x="${centres[g.j][0]}" y="${centres[g.j][1] + (g.j < 2 ? -62 : 72)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#4b5563" font-family="Inter,sans-serif">${esc(g.name)}</text>`).join('');
      const c = data.club;
      $('#club').innerHTML = `<div class="group-card"><span class="type">Your club</span><h4>${esc(LABEL[data.mine.top[0]])} Club · ${new Set(c.map(k => k.school)).size} schools</h4>
        ${c.map(k => `<span class="member"><i style="background:${SCHOOLS[k.school][1]}"></i>${esc(k.name)} · ${SCHOOLS[k.school][0]}</span>`).join('')}
        <div class="meta" style="margin-top:10px">Shared interests: ${data.mine.top.map(k => LABEL[k].toLowerCase()).join(', ')}. First project: design a base on Mars. Supervised video call, Thursday 2pm.</div>
        <div class="meta" style="margin-top:6px">Children see first names only. Teachers approve and supervise all contact between schools.</div></div>`;
    };
    if (done) requestAnimationFrame(place);
    $('#run').addEventListener('click', () => { S.clusters = data; $('#run').textContent = 'Groups found ✓'; requestAnimationFrame(place); });
  }

  // ---------- SCREEN: mentors ----------
  const MENTORS = [
    { name: 'Mary O’Neill', init: 'MO', bio: 'Retired maths teacher · 31 years', v: { space: 0.5, science: 0.7, coding: 0.4 }, lang: ['English', 'Gaeilge'], slots: ['Tue', 'Thu'] },
    { name: 'Pádraig Kelly', init: 'PK', bio: 'Retired engineer and science teacher', v: { space: 1, building: 0.9, science: 0.8 }, lang: ['English', 'Gaeilge'], slots: ['Thu', 'Fri'] },
    { name: 'Ewa Nowak', init: 'EN', bio: 'Retired science teacher', v: { science: 1, nature: 0.7, animals: 0.6 }, lang: ['English', 'Polski'], slots: ['Mon', 'Thu'] },
    { name: 'Seán Murphy', init: 'SM', bio: 'Retired art teacher', v: { drawing: 1, stories: 0.6, music: 0.4 }, lang: ['English'], slots: ['Wed'] },
    { name: 'Gráinne Walsh', init: 'GW', bio: 'Retired PE teacher and coach', v: { football: 1, dance: 0.6 }, lang: ['English', 'Gaeilge'], slots: ['Tue', 'Thu'] },
  ];
  function screenMentors() {
    if (!S.clusters) S.clusters = cluster();
    const club = S.clusters.club, gv = INTERESTS.map((_, d) => club.reduce((s, k) => s + k.v[d], 0) / club.length);
    const want = ['Thu'];
    const scored = MENTORS.map(m => {
      const mv = INTERESTS.map(([k]) => m.v[k] || 0);
      const subj = cos(gv, mv), langOk = m.lang.includes(S.lang) ? 1 : 0, avail = m.slots.some(s => want.includes(s)) ? 1 : 0;
      return { ...m, subj, langOk, avail, score: 0.6 * subj + 0.25 * langOk + 0.15 * avail };
    }).sort((a, b) => b.score - a.score);
    body.innerHTML = `
      <div class="panel"><h4>Mentors for your ${esc(LABEL[S.clusters.mine.top[0]])} Club</h4><div class="meta">Matched on subject, language (${esc(S.lang)}) and the club’s free slot (Thursday). All mentors are Garda vetted.</div></div>
      ${scored.map((m, i) => `<div class="panel mentor ${i === 0 ? 'best' : ''}"><div class="avatar">${m.init}</div>
        <div><h4 style="margin:0">${esc(m.name)}</h4><div class="meta">${m.bio} · ${m.lang.join(', ')} · ${m.slots.join(', ')}</div>
        <div class="meta" style="margin-top:4px">Subject ${pct(m.subj)} · Language ${m.langOk ? '✓' : '✗'} · Time ${m.avail ? '✓' : '✗'}</div></div>
        <div class="score">${pct(m.score)}<small>${i === 0 ? 'Best match' : 'match'}</small></div></div>`).join('')}
      <button class="small-btn" id="req" style="width:100%">${S.mentorReq ? '✓ Request sent' : `Request a session with ${esc(scored[0].name.split(' ')[0])}`}</button>
      <div class="meta" id="req-note" style="margin-top:8px">${S.mentorReq ? 'Ms Byrne will approve it. Sessions are small-group, in school, with a teacher present.' : ''}</div>`;
    $('#req').addEventListener('click', () => { S.mentorReq = true; screenMentors(); });
  }

  // ---------- SCREEN: teacher ----------
  function screenTeacher() {
    header(true);
    const skills = [['Equivalent fractions', 15, 6, 3], ['Adding fractions', 7, 10, 7], ['Decimals', 11, 9, 4], ['Measuring length', 18, 5, 1]];
    const shade = (n, max) => `rgba(47,94,70,${0.1 + 0.75 * n / max})`;
    body.innerHTML = `
      <div class="panel"><h4>Class mastery this week</h4>
        <table class="heat"><thead><tr><th>Skill</th><th>Mastered</th><th>Practising</th><th>Stuck</th></tr></thead>
        <tbody>${skills.map(([s, a, b, c]) => `<tr><th>${s}</th><td style="background:${shade(a, 24)};color:${a > 12 ? '#fff' : 'inherit'}">${a}</td><td style="background:${shade(b, 24)}">${b}</td><td style="background:${c > 5 ? '#fbe3c6' : shade(c, 24)}">${c}</td></tr>`).join('')}</tbody></table></div>
      <div class="panel"><span class="type">Spreading misconception</span><h4>7 pupils add the tops and the bottoms (3/4 + 1/2 = 4/6)</h4>
        <button class="small-btn" id="lesson">${S.lesson ? 'Mini-lesson ready ✓' : 'Plan a 10-minute mini-lesson'}</button><div id="lesson-plan"></div></div>
      <div class="panel"><h4>Needs your attention</h4>
        <div class="flag"><span class="dot" style="background:var(--warn)"></span><div><b>3 pupils</b> haven’t logged in for 5 days. Suggested: a quick check at roll call.</div></div>
        <div class="flag"><span class="dot" style="background:var(--warn)"></span><div><b>1 pupil</b> asked for a chat during a check-in. Shared with you only.</div></div>
        <div class="flag"><span class="dot" style="background:var(--good)"></span><div><b>${esc(S.name)}</b> moved from 32% to ${pct(Math.max(S.pL, 0.58))} on adding fractions. A great moment for praise.</div></div></div>
      <div class="panel"><h4>Outdoor and real-world ideas for your class</h4>
        <div class="flag"><span class="dot" style="background:var(--sage-deep)"></span><div><b>Fraction hunt in the yard</b> · 20 min · fractions</div></div>
        <div class="flag"><span class="dot" style="background:var(--sage-deep)"></span><div><b>Measure and map the school garden</b> · 30 min · measurement</div></div>
        <div class="flag"><span class="dot" style="background:var(--sage-deep)"></span><div><b>Straw-rocket launch</b> with the Space Club (4 pupils, 3 schools)</div></div></div>`;
    const plan = () => { $('#lesson-plan').innerHTML = `<ol style="margin:10px 0 0;padding-left:18px;font-size:13.5px;color:var(--text)"><li><b>2 min:</b> fraction strips: is 1/2 bigger than 1/4?</li><li><b>4 min:</b> pairs show 3/4 + 1/2 with strips, then as quarters.</li><li><b>3 min:</b> “spot the mistake” on 4/6, in their own words.</li><li><b>1 min:</b> exit ticket, auto-marked in GranthAI.</li></ol>`; };
    if (S.lesson) plan();
    $('#lesson').addEventListener('click', () => { S.lesson = true; $('#lesson').textContent = 'Mini-lesson ready ✓'; plan(); });
  }

  // ---------- SCREEN: future me ----------
  const CAREERS = {
    Maker: [['Electrician', 'Apprenticeship, about 4 years, earning while you learn'], ['Mechanical engineer', 'Leaving Cert, then a CAO engineering degree']],
    Explorer: [['Astronomer or space scientist', 'CAO science degree, then research'], ['Lab technician', 'PLC course, then work or a degree']],
    Creator: [['Animator', 'PLC course in animation, then a degree or studio'], ['Graphic designer', 'Portfolio, then a CAO design course']],
    Helper: [['Primary teacher', 'CAO Bachelor of Education'], ['Physiotherapist', 'CAO physiotherapy degree']],
    Leader: [['Entrepreneur', 'Start small: school enterprise awards'], ['Sports coach', 'Coaching badges and a PLC or degree']],
    Organiser: [['Accountant', 'CAO degree or an accounting apprenticeship'], ['Software tester', 'PLC course or tech apprenticeship']],
  };
  function screenFuture() {
    const d = profileDims(); const top = d.map((v, i) => [v, DIMS[i]]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1]);
    const likes = [...S.interests].slice(0, 3).map(k => LABEL[k].toLowerCase()).join(', ');
    body.innerHTML = `
      <div class="panel"><h4>Future Me</h4><div class="meta">You like ${esc(likes || 'lots of things')}. That sounds like a <b>${top[0]}</b> and an <b>${top[1]}</b>. Here are some paths people like you take.</div></div>
      ${top.flatMap(t => CAREERS[t]).map(([job, route]) => `<div class="panel"><span class="type">${esc(job)}</span><div style="font-size:14px;margin-top:4px">${esc(route)}</div></div>`).join('')}
      <div class="panel" style="background:var(--leaf)"><h4>Good to know</h4><div class="meta" style="color:var(--ink-2)">HEAR and DARE are access routes that can lower the CAO points needed for students from disadvantaged backgrounds or with a disability. Your guidance counsellor can help you apply in 6th year.</div></div>`;
  }

  // ---------- explanations ----------
  const EXPLAIN = {
    profile: ['A profile in two minutes', 'Children pick what they love, their language and their age. GranthAI turns that into a starting interest profile and an age-appropriate personality, then keeps learning from what they do.',
      ['Interests map onto six career-interest dimensions (based on the RIASEC model) that drive the feed, clubs and Future Me.', 'Five age bands from 8 to 17 change tone, humour, vocabulary and difficulty. Move the age slider to see it.', 'A teacher confirms consent before anything is saved. No advertising, ever.']],
    learn: ['A tutor that teaches, not tells', 'Answer 4/6 to see the misconception diagnosis, ask for the answer to climb the hint ladder, then switch to “General chatbot” to compare.',
      ['A “bug library” of known misconceptions recognises the exact mistake, not just “wrong”.', 'The hint ladder never gives the final answer until the child has made an attempt.', 'Bayesian knowledge tracing updates the mastery estimate after every answer.']],
    feed: ['A feed that keeps them curious', 'News, discoveries, projects and books ranked around the child’s interests. Change the interests on the profile screen and the feed changes.',
      ['Items are ranked by relevance with maximal marginal relevance, so the feed stays varied.', 'One “something new” slot explores interests the child hasn’t tried yet, the way a bandit algorithm balances explore and exploit.', 'Quests and streaks reward effort, not only right answers.']],
    checkin: ['Wellbeing, safely', 'Children choose how they feel. If they’re struggling, GranthAI offers to connect them with a trusted adult. Try typing “someone hurt me” to see the safety protocol.',
      ['Self-reported only. No emotion detection from faces or voices, as the EU AI Act requires in schools.', 'GranthAI never promises secrecy. Disclosures of harm go to the school’s designated liaison person under Children First.', 'Irish helplines are built in: 112/999 and Childline 1800 66 66 66.']],
    clusters: ['Clubs across schools', 'Press “Find my groups” to watch 24 children from four schools cluster by shared interests. Then GranthAI forms a club for the child that mixes schools.',
      ['k-means clustering on interest vectors, seeded with k-means++.', 'A constraint step builds clubs of four from at least two schools, ranked by similarity.', 'Teachers approve and supervise every cross-school activity.']],
    mentors: ['The right mentor for each club', 'Each club is matched with a vetted retired teacher. The score weighs subject fit, a shared language and a shared free slot.',
      ['Subject fit is the cosine similarity between the club’s interests and the mentor’s expertise.', 'Across all clubs, a stable-matching step makes sure no mentor is overbooked.', 'Change the language on the profile screen to see the ranking change.']],
    teacher: ['Time back for teachers', 'The class dashboard turns thousands of answers into a few decisions: what to re-teach, who to check on and what to do outside.',
      ['Misconception maps across the class, with a ready-made ten-minute mini-lesson.', 'Gentle flags for attendance and check-in requests.', 'Outdoor and real-world activities matched to pupils’ interests, a request from the principals we surveyed.']],
    future: ['Future Me', 'Interests become real routes through the Irish system, explained for the child’s age.',
      ['Career suggestions come from the same interest dimensions as the feed.', 'Routes cover CAO degrees, PLC courses and apprenticeships.', 'Access programmes such as HEAR and DARE are explained early, so no child rules themselves out.']],
  };
  function explain(k) {
    const [h, p, li] = EXPLAIN[k];
    explainEl.innerHTML = `<h3>${h}</h3><p>${p}</p><div class="how"><h4>Under the hood</h4><ul>${li.map(x => `<li>${x}</li>`).join('')}</ul></div>
      <p class="demo-note">Demo data only. Names, schools and mentors are fictional.</p>`;
  }

  const SCREENS = { profile: screenProfile, learn: screenLearn, feed: screenFeed, checkin: screenCheckin, clusters: screenClusters, mentors: screenMentors, teacher: screenTeacher, future: screenFuture };
  function go(k) {
    S.screen = k;
    document.querySelectorAll('.app-tab').forEach(t => t.setAttribute('aria-selected', t.dataset.screen === k));
    if (k !== 'teacher') header(false);
    body.scrollTop = 0; SCREENS[k](); explain(k);
  }
  document.querySelectorAll('.app-tab').forEach(t => t.addEventListener('click', () => go(t.dataset.screen)));
  window.GranthDemo = { go, state: S };
  go('profile');
})();
