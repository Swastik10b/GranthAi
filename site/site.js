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
})();
