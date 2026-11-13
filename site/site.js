// Site behaviour: mobile menu, reveal-on-scroll and the survey charts.
(function () {
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add('in'));
  }

  // Survey responses (2 principals: one DEIS, one DEIS Plus). Counts out of 2.
  const SURVEY = {
    challenges: [
      ['Wellbeing, anxiety or emotional needs', 2],
      ['Attendance and frequent absence', 1],
      ['Low engagement or motivation', 1],
      ['Limited access to extracurricular activities', 1],
      ['Low aspirations or few role models', 1],
      ['Literacy, reading or oral language', 0],
      ['Numeracy and maths', 0],
      ['Special educational needs', 0],
      ['Parent and family involvement', 0],
    ],
    devices: [
      ['Shared school tablets or Chromebooks', 2],
      ['Few pupils have a suitable device at home', 1],
      ['A school computer room', 0],
      ['Most pupils have a suitable device at home', 0],
      ['Mobile phones', 0],
    ],
  };
  function bars(el, rows, max) {
    if (!el) return;
    const top = Math.max(...rows.map(r => r[1]));
    rows.forEach(([label, n]) => {
      const row = document.createElement('div');
      row.className = 'hbar' + (n === top && n > 0 ? ' top' : '');
      row.title = `${label}: ${n} of ${max} schools`;
      row.innerHTML = `<span>${label}</span><span class="track"><span class="fill" style="width:${(n / max) * 100}%"></span></span><span class="n">${n}</span>`;
      el.appendChild(row);
    });
  }
  bars(document.getElementById('chart-challenges'), SURVEY.challenges, 2);
  bars(document.getElementById('chart-devices'), SURVEY.devices, 2);
  // Plans and pricing by region (indicative, to be tested in pilots).
  const PLANS = {
    ie: {
      plans: [
        { who: 'Schools', name: 'School licence', price: '€2,000–3,500', per: 'per school / year', items: ['Every pupil, unlimited sessions', 'Teacher Insight Studio and curriculum upload', 'Pricing scales with school size'], featured: true },
        { who: 'Sponsors and NGOs', name: 'Sponsored school', price: '€2,000–3,500', per: 'per school / year', items: ['Funds a school that cannot pay', 'The school pays nothing', 'Impact report for the sponsor'] },
        { who: 'Care providers', name: 'Care and youth services', price: '€200', per: 'per child / year', items: ['Learning that follows the child', 'Continuity across placements', 'Supervised mentor sessions'] },
        { who: 'Families', name: 'Family plan', price: '€8', per: 'per month', items: ['Home access and Voice Tutor', 'Free for children in sponsored schools', 'Cancel any time'] },
      ],
      funding: 'In Ireland, schools can fund GranthAI from their own budgets, such as DEIS and ICT funding, or a partner can sponsor the whole school.',
    },
    uk: {
      plans: [
        { who: 'Schools', name: 'School licence', price: '£1,800–3,000', per: 'per school / year', items: ['Every pupil, unlimited sessions', 'Curriculum packs for each UK nation', 'Pricing scales with school size'], featured: true },
        { who: 'Trusts', name: 'Multi-academy trust', price: 'Custom', per: 'per trust / year', items: ['Clubs across the trust’s schools', 'Trust-wide insight dashboard', 'Volume pricing'] },
        { who: 'Care providers', name: 'Care and youth services', price: '£175', per: 'per child / year', items: ['For looked-after children', 'Continuity across placements', 'Supervised mentor sessions'] },
        { who: 'Families', name: 'Family plan', price: '£7', per: 'per month', items: ['Home access and Voice Tutor', 'Free for children in sponsored schools', 'Cancel any time'] },
      ],
      funding: 'In England, Pupil Premium pays schools £1,550 for each eligible primary pupil and £2,690 for each looked-after child in 2026–27, so one licence costs a fraction of one school’s allocation.',
    },
    eu: {
      plans: [
        { who: 'Schools', name: 'School licence', price: '€1,500–3,000', per: 'per school / year', items: ['Every pupil, in their home language', 'National curriculum mapping', 'Priced to each country’s budgets'], featured: true },
        { who: 'Regions and ministries', name: 'Regional licence', price: 'Custom', per: 'per region / year', items: ['All schools in a region or programme', 'GDPR and EU AI Act documentation', 'EU data hosting'] },
        { who: 'NGOs', name: 'NGO and care partners', price: '€150–200', per: 'per child / year', items: ['Refugee and newly arrived pupils', 'Cross-border clubs', 'Supervised mentor sessions'] },
        { who: 'Families', name: 'Family plan', price: '€5–8', per: 'per month', items: ['Home access and Voice Tutor', 'Priced to local purchasing power', 'Cancel any time'] },
      ],
      funding: 'Across the EU, we will work with regional and national digital-education programmes. In Germany, for example, the state of Hessen already provides a maths platform to schools in its programme for disadvantaged schools.',
    },
  };
  const plansEl = document.getElementById('plans');
  const fundEl = document.getElementById('funding-line');
  function renderPlans(r) {
    if (!plansEl) return;
    const d = PLANS[r];
    plansEl.innerHTML = d.plans.map(p => `<div class="plan${p.featured ? ' featured' : ''}"><span class="who">${p.who}</span><h4>${p.name}</h4><div class="price">${p.price} <small>${p.per}</small></div><ul>${p.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('');
    if (fundEl) fundEl.textContent = d.funding;
  }
  document.querySelectorAll('.region-tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.region-tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    renderPlans(b.dataset.region);
  }));
  renderPlans('ie');

  // ---------- Zilo: animated tutor in the Voice Tutor card ----------
  const zStage = document.getElementById('zilo-stage');
  if (zStage && window.Zilo) {
    zStage.innerHTML = Zilo.svg('zilo-live');
    const z = Zilo.live(zStage.querySelector('svg'), { expr: 'happy' });
    const bubbles = document.querySelectorAll('#vchat .b, #vchat .signal');
    const show = n => bubbles.forEach((b, i) => b.classList.toggle('hide', i >= n));
    // a short loop: Zilo waves, listens to the child, thinks about the reasoning, then answers
    const steps = [
      [0, () => { show(0); z.set('happy'); z.wave(1900); }],
      [2200, () => { show(1); z.set('listen'); }],
      [4400, () => { show(2); z.set('thinking'); }],
      [6200, () => { show(3); z.talk(2600); }],
      [8900, () => { z.set('grin'); }],
      [10600, () => { z.set('surprised'); }],
      [11200, () => { z.set('happy'); }],
    ];
    let timers = [], running = false;
    const run = () => { timers.forEach(clearTimeout); timers = steps.map(([t, f]) => setTimeout(f, t)); timers.push(setTimeout(run, 13500)); };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) show(3);
    else new IntersectionObserver((es, ob) => es.forEach(e => { if (e.isIntersecting && !running) { running = true; run(); ob.disconnect(); } }), { threshold: 0.35 }).observe(zStage);
    const input = document.getElementById('tutor-name');
    if (input) input.addEventListener('input', () => {
      const n = input.value.trim() || 'Zilo';
      document.querySelectorAll('.tutor-name').forEach(el => { el.textContent = n; });
      zStage.setAttribute('aria-label', `${n}, GranthAI's animated AI tutor`);
      z.wave(1200); z.set('grin'); setTimeout(() => z.set('happy'), 1300);
      try { localStorage.setItem('granthai-tutor-name', n); } catch (e) { /* storage unavailable */ }
    });
  }
})();

