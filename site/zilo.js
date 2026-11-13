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

  // the GranthAI mark (neuron over a hand and books), traced from assets/logo-mark.png in its 177 x 300 box
  const LOGO = 'M19.3 281.0 19.7 282.3 21.7 283.5 151.2 283.5 152.3 283.2 153.5 281.8 153.3 280.7 151.7 279.5 21.2 279.5 20.0 280.0ZM19.3 272.5 20.5 273.5 151.3 273.7 152.7 273.2 153.5 271.5 152.0 269.8 21.0 269.8 19.5 271.0ZM153.3 245.0 152.7 243.8 151.3 243.3 21.2 243.5 19.8 244.5 19.7 245.7 20.5 246.8 21.7 247.3 151.5 247.3 153.0 246.3ZM19.7 235.5 19.8 236.5 21.7 237.7 151.5 237.7 153.3 236.2 153.2 234.8 151.5 233.7 21.5 233.7 20.7 234.0ZM106.5 210.8 107.2 211.5 153.2 211.5 154.7 210.5 154.8 209.3 154.0 208.2 153.0 207.8 107.8 207.8 107.0 208.3ZM59.2 210.8 59.0 208.8 58.2 207.8 21.5 208.0 20.7 209.3 21.0 210.7 22.3 211.5 58.5 211.5ZM107.7 199.5 107.8 201.3 108.8 202.0 152.2 202.0 153.7 201.7 154.8 200.3 154.7 199.2 153.2 198.2 108.7 198.2ZM20.5 199.7 21.0 201.3 22.5 202.0 43.3 202.0 44.8 201.3 44.7 198.7 44.2 198.2 22.5 198.2 21.3 198.5ZM95.3 71.7 91.0 73.2 87.0 76.8 85.2 80.7 84.8 85.3 85.2 87.7 86.2 90.0 89.3 93.8 92.3 95.7 97.0 96.7 101.8 95.5 104.5 93.8 106.7 91.7 108.7 88.0 109.2 81.8 107.7 77.7 104.5 74.2 101.0 72.2ZM108.8 1.0 105.7 0.8 103.2 3.0 102.7 6.2 103.2 7.5 106.0 10.8 106.8 15.2 104.8 19.7 100.3 24.7 96.7 30.3 96.2 30.3 91.3 25.5 85.3 21.8 82.0 18.5 80.8 15.7 80.8 13.5 83.8 7.8 83.7 5.3 82.2 3.3 79.5 2.2 77.5 2.5 74.8 4.7 73.0 7.8 72.0 11.3 72.0 16.3 73.3 20.5 75.3 23.8 78.5 27.2 84.7 31.2 88.7 35.0 91.0 39.0 92.2 43.2 92.2 51.7 91.0 56.5 87.2 62.5 82.8 65.8 77.5 67.7 72.8 67.7 67.5 66.0 65.5 64.8 62.7 62.3 60.2 59.0 58.2 53.3 57.8 50.3 56.7 46.7 54.3 42.7 49.7 38.3 45.2 36.2 42.2 35.5 39.5 35.3 36.7 36.3 35.0 38.7 35.2 41.5 36.5 43.2 37.8 44.0 42.7 44.3 45.5 45.7 47.7 47.7 49.7 51.8 50.2 55.5 51.3 59.0 50.8 60.2 44.0 60.5 36.5 60.2 31.7 58.0 27.2 53.3 25.2 52.7 22.5 53.3 21.2 54.5 20.5 57.5 21.3 60.0 24.7 63.5 30.3 66.8 36.2 68.2 36.7 68.7 36.5 69.5 33.7 72.0 30.2 73.8 27.0 74.2 23.0 73.5 21.0 74.3 20.0 75.7 19.7 78.2 20.3 80.0 22.2 81.7 24.3 82.5 28.3 82.7 33.2 81.5 38.7 78.5 45.7 71.8 48.2 70.2 51.0 69.3 54.0 69.3 59.2 70.8 63.7 73.5 67.2 74.8 71.7 78.7 73.8 82.5 74.2 89.0 72.5 93.3 69.2 96.8 65.0 98.8 59.7 98.8 50.8 94.2 45.8 93.0 41.7 93.2 38.5 94.0 34.8 96.0 33.3 97.5 32.7 99.3 33.0 101.3 34.3 103.0 35.5 103.7 37.8 103.7 41.0 101.8 44.7 100.8 48.0 101.5 51.0 103.3 45.0 109.3 42.0 113.7 41.2 116.7 42.2 118.8 43.2 119.8 45.8 120.5 48.2 119.5 52.0 113.7 56.0 109.8 57.7 108.8 61.7 107.3 68.3 106.3 72.2 104.7 74.7 103.0 78.7 101.7 83.2 102.2 87.2 104.7 89.8 108.2 91.7 113.3 92.2 118.3 92.0 127.8 90.8 133.5 88.0 139.5 85.0 143.3 80.3 147.7 62.3 159.3 57.3 164.3 53.2 170.7 51.2 175.2 49.2 182.5 48.3 192.3 49.2 200.7 50.2 202.8 51.5 204.2 53.0 204.8 54.3 205.0 55.8 204.5 57.8 202.8 58.8 200.3 58.5 189.7 58.8 185.3 60.0 181.0 61.8 176.5 64.0 173.3 67.2 170.0 68.7 170.0 69.0 171.5 67.2 173.8 65.2 178.0 63.3 184.5 62.8 192.3 63.0 204.3 64.0 210.2 65.0 212.2 68.0 213.8 69.8 213.8 71.2 213.2 72.7 211.5 73.7 209.3 73.5 191.7 74.0 186.2 75.0 181.7 79.0 173.5 80.5 171.7 81.8 171.3 82.8 172.2 82.8 172.8 80.0 177.8 77.8 186.0 77.2 193.0 77.8 210.3 79.2 214.5 80.7 215.8 84.0 216.5 86.0 215.7 87.8 213.2 88.2 211.2 88.0 191.8 89.0 185.0 89.8 182.2 93.0 175.5 96.3 171.5 97.3 171.5 98.0 172.0 98.2 173.0 96.2 176.0 94.2 180.5 92.5 187.8 92.2 190.8 92.3 204.3 93.0 208.2 94.0 210.3 95.3 211.7 97.7 212.7 100.5 211.8 102.5 209.7 103.3 207.2 103.2 193.8 104.0 187.3 105.8 181.3 108.8 175.8 112.3 171.7 115.7 168.8 118.7 167.3 120.0 167.2 126.2 173.7 132.7 177.8 140.7 180.2 145.0 180.3 150.2 179.5 150.8 180.0 151.2 181.5 149.7 183.0 145.8 183.8 141.8 183.8 133.8 182.0 129.0 179.8 125.8 177.8 122.5 175.2 119.0 171.2 118.3 171.2 113.3 175.5 110.3 179.8 108.0 185.5 107.0 189.0 107.2 189.8 160.3 190.0 164.5 190.8 165.2 191.7 162.2 196.8 161.0 201.0 160.5 205.5 161.2 211.5 162.5 215.2 164.2 217.8 164.2 218.7 163.7 219.0 21.2 219.0 18.2 218.0 14.8 215.8 12.3 213.0 11.0 210.3 10.3 204.3 11.0 200.7 12.8 197.0 16.5 193.2 21.7 190.7 25.3 190.0 44.8 190.0 45.5 189.2 46.2 182.2 45.7 181.7 24.0 181.7 19.3 182.5 13.5 185.0 10.0 187.5 5.3 192.8 3.2 197.2 1.8 202.5 1.8 208.2 3.2 213.7 5.2 217.5 6.7 219.5 10.3 222.8 10.5 223.5 5.8 227.7 4.0 230.3 2.3 233.8 1.2 238.7 1.2 244.0 2.3 249.3 4.2 253.0 6.2 255.7 9.3 258.5 9.3 259.5 5.0 263.3 2.2 267.7 0.8 272.0 0.0 273.0 0.0 281.3 0.8 282.3 1.2 284.5 2.3 287.3 5.7 292.2 11.3 296.7 16.2 298.7 19.0 299.0 20.2 299.8 170.2 299.8 173.8 297.5 175.5 294.8 175.7 293.3 174.7 290.5 170.0 286.3 167.8 282.5 167.2 279.7 167.2 275.3 168.8 269.8 172.0 265.3 174.8 262.7 175.8 260.3 175.8 257.8 174.8 255.3 169.8 250.5 168.0 247.2 167.2 244.0 167.2 239.5 168.8 234.0 170.7 231.2 175.2 227.0 176.2 224.3 176.8 223.8 176.8 222.2 175.5 219.5 172.0 216.0 170.0 212.7 168.7 207.3 168.8 203.0 169.8 199.3 171.2 196.8 174.8 192.7 175.2 191.3 174.8 188.7 171.8 185.0 167.3 182.3 155.2 180.8 154.2 179.8 153.8 177.5 152.3 175.3 150.2 174.2 146.5 173.3 143.2 171.8 140.3 169.2 136.7 163.7 133.5 160.2 127.2 155.5 115.8 149.0 110.7 144.8 107.0 140.5 104.2 135.3 102.8 131.3 102.0 124.7 102.2 114.3 102.8 110.8 104.8 106.5 108.0 103.2 110.0 102.0 113.0 101.2 115.0 101.2 118.0 102.0 121.8 104.3 125.7 105.8 135.0 107.8 140.0 111.3 142.0 113.5 144.2 117.5 146.0 119.7 147.8 120.5 149.0 120.5 151.0 119.5 152.7 116.7 151.8 113.5 148.2 108.2 143.0 103.2 144.2 102.2 147.5 100.8 150.2 100.8 153.2 102.0 155.7 103.7 158.2 103.8 161.0 101.3 161.3 99.5 160.2 96.8 157.7 95.0 153.5 93.3 146.5 93.0 143.2 94.0 137.3 97.2 134.5 98.2 129.7 98.3 126.7 97.5 123.7 95.7 120.8 92.2 119.8 89.3 119.5 86.0 120.3 81.3 122.0 78.2 125.3 75.0 135.5 69.8 137.5 69.2 141.3 68.8 143.8 69.3 146.8 70.8 153.2 77.0 158.5 80.7 164.5 82.5 168.2 82.7 171.3 81.8 173.5 80.0 174.2 78.3 173.8 75.7 172.5 74.2 170.8 73.5 166.7 74.2 163.3 73.8 159.7 71.8 157.2 69.7 156.8 68.8 157.3 68.2 160.8 67.7 163.8 66.5 168.7 63.7 172.7 59.5 173.0 55.5 171.0 53.2 168.2 52.7 166.5 53.3 162.2 57.8 157.8 60.0 155.2 60.5 142.7 60.0 142.2 58.7 142.8 57.3 143.8 52.0 146.0 47.7 150.2 45.0 156.2 44.7 158.5 42.0 158.5 39.5 156.5 37.2 154.7 36.7 149.3 36.8 143.7 39.2 139.2 43.2 137.2 46.5 134.0 58.0 131.8 61.2 129.0 63.8 123.3 66.7 117.5 67.2 112.7 66.0 108.5 63.5 104.8 59.3 103.0 55.7 102.0 52.0 101.7 43.3 102.2 39.3 104.0 34.3 107.5 29.2 111.7 24.5 113.7 21.0 115.0 17.0 115.3 12.3 114.5 8.2 112.8 4.5ZM8.7 275.5 9.8 271.5 11.8 268.3 15.5 265.2 20.2 263.7 162.0 263.5 162.7 264.5 160.8 267.5 159.2 272.5 158.8 279.2 160.0 285.0 162.7 290.5 162.3 290.8 20.8 290.8 15.0 288.8 12.0 286.3 10.3 284.0 9.0 280.8ZM9.7 239.2 11.0 235.0 12.5 232.7 16.8 229.2 21.0 227.8 162.3 227.7 163.0 228.5 160.2 233.5 159.2 237.2 158.8 243.3 160.0 249.2 162.7 254.5 162.3 254.8 21.0 254.8 15.8 253.0 11.8 249.2 10.0 245.5 9.5 242.2ZM93.5 69.0 99.7 68.8 103.2 69.8 105.3 71.0 109.8 75.3 111.8 79.3 112.5 83.5 112.3 86.3 110.7 91.3 107.0 95.8 104.3 97.7 101.0 99.0 94.5 99.3 89.7 97.7 85.0 93.8 83.2 91.0 82.0 87.8 81.8 81.2 84.0 75.8 87.7 71.8 90.7 70.0Z';
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
      <g class="z-armR" transform="rotate(0 222 404)"><g transform="translate(320 0) scale(-1 1)">${arm}</g></g>
      <path d="M92 392 C 72 424, 68 482, 74 530 L 246 530 C 252 482, 248 424, 228 392 Z" fill="${C.coat}" ${S}/>
      <rect x="74" y="506" width="172" height="26" rx="10" fill="${C.cream}" ${S5}/>
      <path d="M160 414 L 160 506" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>
      <path class="z-logo" transform="translate(174 422) scale(0.245)" fill="${C.line}" fill-rule="evenodd" d="${LOGO}"/>
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
