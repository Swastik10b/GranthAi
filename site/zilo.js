/* Zilo: GranthAI's animated AI tutor, drawn as SVG so it can blink, wave, talk and change expression.
   Expressions react to what a child says and does in the lesson (an answer, a question, a pause),
   never to emotions inferred from their face or voice.

   Zilo.svg(id)            -> SVG markup
   Zilo.pose(name)         -> numeric pose: happy | talk | thinking | surprised | grin | listen
   Zilo.mix(a, b, k)       -> blend two poses
   Zilo.apply(root, p)     -> draw a pose onto a mounted SVG
   Zilo.live(root, opts)   -> self-running animation for web pages (blink, idle sway, wave, talk)
*/
(function () {
  const C = { line: '#1F2347', fur: '#AEB0E8', furDark: '#9799D8', cream: '#F7E4C6', ear: '#F4D3BC', cap: '#D9747F', brim: '#C25E6C', pom: '#E0848E', hair: '#3D429C', coat: '#8E9CCB', coatDark: '#7C8BBE', cuff: '#D9747F', mouth: '#6B2737', tongue: '#E58A93' };

  // Mouth = M x1 y1 Q cx cy x2 y2 Q cx cy x1 y1 Z  (10 numbers, so every expression blends smoothly)
  const M = {
    happy:     [128, 352, 158, 372, 190, 352, 158, 380, 128, 352],
    grin:      [122, 346, 158, 358, 196, 346, 158, 398, 122, 346],
    talk0:     [136, 351, 158, 360, 182, 351, 158, 363, 136, 351],
    talk1:     [134, 346, 158, 352, 184, 346, 158, 404, 134, 346],
    thinking:  [142, 360, 160, 352, 180, 355, 160, 362, 142, 360],
    surprised: [146, 356, 158, 336, 170, 356, 158, 382, 146, 356],
    listen:    [136, 354, 158, 366, 182, 354, 158, 371, 136, 354],
  };
  // brows: [left dy, right dy, left tilt, right tilt]; eyes: [scaleY, lookX, lookY]; head tilt (deg)
  const P = {
    happy:     { m: M.happy,     b: [0, 0, 0, 0],     e: [1, 0, 0],    tilt: 0 },
    talk:      { m: M.talk0,     b: [-2, -2, 0, 0],   e: [1, 0, 0],    tilt: 0 },
    listen:    { m: M.listen,    b: [-3, -3, 4, -4],  e: [1, -3, 1],   tilt: -4 },
    thinking:  { m: M.thinking,  b: [-9, 2, -6, 8],   e: [1, 5, -7],   tilt: 5 },
    surprised: { m: M.surprised, b: [-12, -12, 0, 0], e: [1.18, 0, 0], tilt: 0 },
    grin:      { m: M.grin,      b: [-5, -5, 0, 0],   e: [0.86, 0, 0], tilt: -3 },
  };
  const clone = p => ({ m: p.m.slice(), b: p.b.slice(), e: p.e.slice(), tilt: p.tilt, arm: p.arm || 0, open: p.open || 0, blink: p.blink || 0, bob: p.bob || 0 });
  const pose = name => clone(P[name] || P.happy);
  const L = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => ({ m: a.m.map((v, i) => L(v, b.m[i], k)), b: a.b.map((v, i) => L(v, b.b[i], k)), e: a.e.map((v, i) => L(v, b.e[i], k)), tilt: L(a.tilt, b.tilt, k), arm: L(a.arm || 0, b.arm || 0, k), open: L(a.open || 0, b.open || 0, k), blink: L(a.blink || 0, b.blink || 0, k), bob: L(a.bob || 0, b.bob || 0, k) });

  const S = `stroke="${C.line}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"`;
  const S5 = `stroke="${C.line}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"`;
  const arm = `<path d="M98 402 C 70 418, 48 444, 38 468 L 66 486 C 76 466, 90 452, 104 442 Z" fill="${C.coat}" ${S}/>
      <ellipse cx="50" cy="478" rx="19" ry="13" transform="rotate(32 50 478)" fill="${C.cuff}" ${S5}/>
      <path d="M22 486 C 10 500, 14 524, 34 528 C 54 532, 66 516, 60 500 C 70 494, 66 482, 56 486 C 50 478, 32 476, 22 486 Z" fill="${C.fur}" ${S5}/>`;
  const ear = `<path d="M78 214 C 36 192, 16 140, 26 100 C 62 106, 96 138, 104 182 Z" fill="${C.fur}" ${S}/>
      <path d="M70 194 C 46 176, 36 146, 40 122 C 62 130, 80 150, 86 176 Z" fill="${C.ear}"/>`;

  function svg(id = 'zilo') {
    return `<svg id="${id}" class="zilo-svg" viewBox="0 0 320 600" role="img" aria-label="Zilo, GranthAI's animated AI tutor" xmlns="http://www.w3.org/2000/svg">
  <g class="z-all">
    <ellipse cx="160" cy="586" rx="96" ry="10" fill="${C.line}" opacity=".12"/>
    <g class="z-body">
      <rect x="98" y="520" width="52" height="60" rx="18" fill="${C.fur}" ${S}/>
      <rect x="170" y="520" width="52" height="60" rx="18" fill="${C.fur}" ${S}/>
      <g class="z-armL">${arm}</g>
      <path d="M92 392 C 72 424, 68 482, 74 530 L 246 530 C 252 482, 248 424, 228 392 Z" fill="${C.coat}" ${S}/>
      <rect x="74" y="506" width="172" height="26" rx="10" fill="${C.cream}" ${S5}/>
      <path d="M160 414 L 160 506" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>
      <g transform="translate(196 452)" fill="none" stroke="${C.line}" stroke-width="3.2" stroke-linecap="round">
        <circle cx="0" cy="-10" r="6" fill="${C.line}" stroke="none"/>
        <path d="M0 -10 L0 -24 M0 -10 L-12 -18 M0 -10 L12 -18 M0 -10 L-13 -4 M0 -10 L13 -4 M0 -4 L0 6"/>
        <rect x="-14" y="6" width="28" height="7" rx="2"/><rect x="-12" y="13" width="26" height="7" rx="2"/><rect x="-14" y="20" width="28" height="7" rx="2"/>
      </g>
      <path d="M104 390 Q160 420 216 390 L 212 410 Q160 442 108 410 Z" fill="${C.cream}" ${S5}/>
    </g>
    <g class="z-head" transform="rotate(0 160 300)">
      <g class="z-earL">${ear}</g>
      <g class="z-earR" transform="translate(320 0) scale(-1 1)">${ear}</g>
      <ellipse cx="160" cy="278" rx="128" ry="114" fill="${C.fur}" ${S}/>
      <path d="M98 200 C 110 244, 146 246, 160 222 C 174 246, 210 244, 222 200 Z" fill="${C.hair}" ${S5}/>
      <ellipse class="z-cheek" cx="74" cy="312" rx="16" ry="10" fill="${C.cap}" opacity=".28"/>
      <ellipse class="z-cheek" cx="246" cy="312" rx="16" ry="10" fill="${C.cap}" opacity=".28"/>
      <ellipse cx="160" cy="342" rx="82" ry="50" fill="${C.cream}" ${S5}/>
      <ellipse cx="138" cy="326" rx="6.5" ry="4.5" fill="${C.line}"/><ellipse cx="182" cy="326" rx="6.5" ry="4.5" fill="${C.line}"/>
      <path class="z-mouth" d="" fill="${C.mouth}" ${S5}/>
      <g class="z-eyeL"><ellipse cx="118" cy="278" rx="19" ry="23" fill="${C.line}"/><circle class="z-hl" cx="125" cy="268" r="7" fill="#fff"/><circle class="z-hl" cx="112" cy="289" r="3.2" fill="#fff"/></g>
      <g class="z-eyeR"><ellipse cx="202" cy="278" rx="19" ry="23" fill="${C.line}"/><circle class="z-hl" cx="209" cy="268" r="7" fill="#fff"/><circle class="z-hl" cx="196" cy="289" r="3.2" fill="#fff"/></g>
      <path class="z-browL" d="M102 250 Q118 243 134 248" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>
      <path class="z-browR" d="M186 248 Q202 243 218 250" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>
      <path d="M142 58 C 156 70, 162 84, 158 106" fill="none" stroke="${C.line}" stroke-width="6" stroke-linecap="round"/>
      <circle class="z-pom" cx="138" cy="46" r="19" fill="${C.pom}" ${S5}/>
      <path d="M52 188 C 50 128, 104 102, 162 102 C 222 102, 274 126, 270 184 Z" fill="${C.cap}" ${S}/>
      <path d="M90 148 C 104 128, 126 116, 150 113" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".45"/>
      <path d="M38 182 C 86 202, 236 202, 284 178 C 290 190, 286 202, 276 206 C 218 224, 104 226, 46 208 C 36 202, 32 192, 38 182 Z" fill="${C.brim}" ${S}/>
    </g>
    <g class="z-armR" transform="rotate(0 222 404)"><g transform="translate(320 0) scale(-1 1)">${arm}</g></g>
  </g>
</svg>`;
  }

  function apply(root, p) {
    const q = s => root.querySelector(s);
    const m = p.m.slice();
    if (p.open) { // talking: blend the closed talk mouth toward an open one by the audio level
      const t1 = M.talk1; for (let i = 0; i < 10; i++) m[i] = L(m[i], t1[i], Math.min(1, p.open));
    }
    q('.z-mouth').setAttribute('d', `M${m[0]} ${m[1]} Q${m[2]} ${m[3]} ${m[4]} ${m[5]} Q${m[6]} ${m[7]} ${m[8]} ${m[9]} Z`);
    const sy = p.e[0] * (1 - 0.92 * Math.min(1, p.blink)), lx = p.e[1], ly = p.e[2];
    [['.z-eyeL', 118], ['.z-eyeR', 202]].forEach(([s, cx]) => q(s).setAttribute('transform', `translate(${lx} ${ly}) translate(${cx} 278) scale(1 ${sy.toFixed(3)}) translate(${-cx} -278)`));
    root.querySelectorAll('.z-hl').forEach(h => h.setAttribute('opacity', p.blink > 0.5 ? 0 : 1));
    q('.z-browL').setAttribute('transform', `translate(0 ${p.b[0]}) rotate(${p.b[2]} 118 247)`);
    q('.z-browR').setAttribute('transform', `translate(0 ${p.b[1]}) rotate(${p.b[3]} 202 247)`);
    q('.z-head').setAttribute('transform', `rotate(${p.tilt.toFixed(2)} 160 330)`);
    q('.z-armR').setAttribute('transform', `rotate(${(p.arm || 0).toFixed(2)} 222 404)`);
    q('.z-all').setAttribute('transform', `translate(0 ${(p.bob || 0).toFixed(2)})`);
  }

  // wave: arm raised to -100deg and swinging +-18deg; k is 0..1 how far the arm is up, ph the swing phase
  const waveAngle = (k, ph) => k * (-100 + 18 * Math.sin(ph));

  function live(root, opts = {}) {
    let target = pose(opts.expr || 'happy'), cur = pose(opts.expr || 'happy');
    let waving = 0, waveUntil = 0, talkUntil = 0, nextBlink = 1200, blinkT = -1;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      cur = mix(cur, target, 0.16);
      const p = clone(cur);
      if (!reduce) {
        p.bob = Math.sin(t / 520) * 3; p.tilt += Math.sin(t / 900) * 1.5;
        if (t > nextBlink) { blinkT = t; nextBlink = t + 2600 + Math.random() * 2600; }
        if (blinkT >= 0) { const d = (t - blinkT) / 160; p.blink = d < 1 ? Math.sin(d * Math.PI) : 0; }
        waving += ((t < waveUntil ? 1 : 0) - waving) * 0.12;
        p.arm = waveAngle(waving, t / 130);
        if (t < talkUntil) p.open = 0.25 + 0.75 * Math.abs(Math.sin(t / 95) * Math.sin(t / 233 + 1));
      }
      apply(root, p);
      requestAnimationFrame(frame);
    }
    apply(root, cur); requestAnimationFrame(frame);
    return {
      set(name) { target = pose(name); },
      wave(ms = 1800) { waveUntil = performance.now() - t0 + ms; },
      talk(ms = 2000) { target = pose('talk'); talkUntil = performance.now() - t0 + ms; },
    };
  }

  window.Zilo = { svg, pose, mix, apply, live, waveAngle, colors: C };
})();
