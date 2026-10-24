(()=>{'use strict';
  // ---------------------------------------------------------------
  // Watercolor — layered deformed-polygon washes on cold-press paper
  // ---------------------------------------------------------------
  const PAPER = [251, 248, 240];

  // recursive midpoint displacement; each vertex carries its own "wobble" weight v
  function deform(pts, r, depth, amt) {
    let p = pts;
    for (let d = 0; d < depth; d++) {
      const out = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        out.push(a);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const v = (a.v + b.v) * 0.5;
        const s = len * amt * v;
        out.push({ x: (a.x + b.x) / 2 + r.gauss() * s, y: (a.y + b.y) / 2 + r.gauss() * s, v: v * (0.7 + r() * 0.6) });
      }
      p = out;
    }
    return p;
  }
  function poly(c, pts) {
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
  }
  const P = (x, y, v = 1) => ({ x, y, v });
  function circlePts(cx, cy, rx, ry, n, r, vv = 1, a0 = 0, a1 = Math.PI * 2) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, vv * (0.6 + r() * 0.8))); }
    return out;
  }

  // value-noise field (fast) in 0..1, sampled bilinearly from a random grid
  function grid(W, H_, cell, r) {
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H_ / cell) + 2, g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = r();
    return (x, y) => {
      const fx = x / cell, fy = y / cell, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  function makeMottle(W, H_, seed) {
    const c = H.layer(W, H_), x = c.getContext('2d'), r = H.rng(seed);
    const small = H.layer(48, 27), sx = small.getContext('2d');
    for (let j = 0; j < 27; j++) for (let i = 0; i < 48; i++) { sx.fillStyle = `rgba(0,0,0,${0.55 + r() * 0.45})`; sx.fillRect(i, j, 1, 1); }
    const mid = H.layer(160, 90), mx = mid.getContext('2d');
    for (let j = 0; j < 90; j++) for (let i = 0; i < 160; i++) { mx.fillStyle = `rgba(0,0,0,${0.75 + r() * 0.25})`; mx.fillRect(i, j, 1, 1); }
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(small, 0, 0, W, H_);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(mid, 0, 0, W, H_);
    return c;
  }


  // =================================================================
  // EXPLAINER — "How does AI learn?" painted along one long sketchbook sheet; the camera pans across it.
  // =================================================================
  const EXW = 1280;
  let EXC = null;
  const lerp = (a, b, u) => a + (b - a) * u;
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ez = (u) => H.ease.inOut(cl(u));
  const win = (t, a, b) => cl((t - a) / (b - a));

  // pigment pools at the drying edge: alpha += (alpha - blurred alpha) * pool
  function rimPool(cv, pool = 2.2, blur = 4) {
    const w = cv.width, h = cv.height, c = cv.getContext('2d');
    const B = H.layer(w, h), b = B.getContext('2d');
    b.filter = `blur(${blur}px)`; b.drawImage(cv, 0, 0); b.filter = 'none';
    const A = c.getImageData(0, 0, w, h), d = A.data, e = b.getImageData(0, 0, w, h).data;
    for (let i = 3; i < d.length; i += 4) { const rim = d[i] - e[i]; if (rim > 0) d[i] = Math.min(255, d[i] + rim * pool); }
    c.putImageData(A, 0, 0);
    return cv;
  }
  // layered deformed-polygon wash into a canvas context
  function exWash(c, base, col, { layers = 26, alpha = 0.06, amt = 0.14, depth = 3, seed = 1, comp = 'source-over' } = {}) {
    const r = H.rng(seed);
    c.save(); c.globalCompositeOperation = comp; c.fillStyle = Array.isArray(col) ? H.rgba(col, 1) : col;
    for (let i = 0; i < layers; i++) { c.globalAlpha = alpha * (0.6 + r() * 0.8); poly(c, deform(base, r, depth, amt)); c.fill(); }
    c.restore();
  }
  const blob = (x, y, rx, ry, seed, n = 10, v = 1) => deform(circlePts(x, y, rx, ry, n, H.rng(seed), v), H.rng(seed + 1), 2, 0.25);
  function exBloom(c, x, y, r0, seed, a = 0.5) { exWash(c, blob(x, y, r0, r0 * 0.85, seed, 9, 1.4), '#000', { layers: 10, alpha: a / 5, amt: 0.35, depth: 2, seed: seed + 3, comp: 'destination-out' }); }

  function cachedExplainer() {
    if (EXC) return EXC;
    const C = {};
    // --- world-long sheet of cold-press paper (tooth baked in once; the height map is kept for granulation) ---
    const pw = H.layer(EXW, 720), px = pw.getContext('2d');
    const gr = H.rng(99), fine = grid(EXW, 720, 2.2, gr), mid = grid(EXW, 720, 7, gr), big = grid(EXW, 720, 40, gr);
    const img = px.createImageData(EXW, 720), d = img.data, HM = new Float32Array(EXW * 720);
    let prev = new Float32Array(EXW), cur = new Float32Array(EXW);
    for (let y = 0; y < 720; y++) {
      for (let x = 0; x < EXW; x++) cur[x] = HM[y * EXW + x] = fine(x, y) * 0.3 + mid(x, y) * 0.5 + big(x, y) * 0.2;
      for (let x = 0; x < EXW; x++) {
        const sh = 1 + ((x > 0 ? prev[x - 1] : prev[x]) - cur[x]) * 0.1 + (big(x, y) - 0.5) * 0.03, o = (y * EXW + x) * 4;
        d[o] = PAPER[0] * sh; d[o + 1] = PAPER[1] * sh; d[o + 2] = PAPER[2] * sh; d[o + 3] = 255;
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    px.putImageData(img, 0, 0);
    // the sheet isn't bare white: a very faint warm tone that gathers toward the top and bottom edges, plus old ghost washes
    px.save(); px.globalCompositeOperation = 'multiply';
    const ev = px.createLinearGradient(0, 0, 0, 720); ev.addColorStop(0, 'rgba(232,214,182,0.55)'); ev.addColorStop(0.18, 'rgba(250,240,222,0.2)');
    ev.addColorStop(0.8, 'rgba(250,240,222,0.2)'); ev.addColorStop(1, 'rgba(228,208,172,0.6)'); px.fillStyle = ev; px.fillRect(0, 0, EXW, 720);
    const gw = H.rng(404);
    for (let k = 0; k < 14; k++) { const warm = gw() < 0.5, x0 = gw.range(0, EXW), y0 = gw.range(0, 720), rx = gw.range(140, 320), ry = gw.range(70, 170);
      px.save(); px.translate(x0, y0); px.scale(1, ry / rx); const g = px.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, warm ? 'rgba(236,214,170,0.2)' : 'rgba(214,214,226,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = g; px.fillRect(-rx, -rx, rx * 2, rx * 2); px.restore(); }
    px.restore();
    C.paper = pw;
    // mottle (same recipe as makeMottle, built from ImageData instead of thousands of fillRects)
    const mottle = H.layer(1400, 700); {
      const r = H.rng(77), cell = (w, h, lo) => { const c = H.layer(w, h), x = c.getContext('2d'), im = x.createImageData(w, h);
        for (let i = 0; i < w * h; i++) im.data[i * 4 + 3] = (lo + r() * (1 - lo)) * 255; x.putImageData(im, 0, 0); return c; };
      const sm = cell(48, 27, 0.55), md = cell(160, 90, 0.75), mx = mottle.getContext('2d');
      mx.imageSmoothingQuality = 'high'; mx.drawImage(sm, 0, 0, 1400, 700); mx.globalCompositeOperation = 'destination-in'; mx.drawImage(md, 0, 0, 1400, 700); }
    // pooled drying edge + granulation in one pixel pass (alpha += (alpha - blurred alpha) * pool, then the paper-pit boost)
    const poolGran = (cv, pool, blur, at) => {
      // the blurred alpha is smooth, so it is computed at half resolution
      const w = cv.width, h = cv.height, c = cv.getContext('2d'), w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2), B = H.layer(w2, h2), b = B.getContext('2d');
      b.filter = `blur(${blur / 2}px)`; b.drawImage(cv, 0, 0, w2, h2);
      const im = c.getImageData(0, 0, w, h), dd = im.data, e = b.getImageData(0, 0, w2, h2).data, wx = at[0], wy = at[1], k = at[2] || 1;
      let hs = 9173;
      for (let y = 0; y < h; y++) { const Y = y + wy, row = Y >= 0 && Y < 720 ? Y * EXW : -1; for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; let a = dd[i + 3]; hs = (hs * 1103515245 + 12345) & 0x7fffffff; if (!a) continue;
        const rim = a - e[((y >> 1) * w2 + (x >> 1)) * 4 + 3]; if (rim > 0) a = Math.min(255, a + rim * pool);
        const X = x + wx, hh = row >= 0 && X >= 0 && X < EXW ? HM[row + X] : 0.5;
        const blue = Math.max(0, (dd[i + 2] - dd[i]) / 120), sp = (hs & 1023) / 1023;
        dd[i + 3] = Math.min(255, a * (1 + k * ((0.5 - hh) * 2 * (0.18 + blue * 0.7) + (sp > 0.88 ? (sp - 0.88) * 4 * (0.2 + blue) : 0))));
      } }
      c.putImageData(im, 0, 0);
    };
    // softened mottle for the explainer washes: alpha 0.5 + 0.5 * mottle, so pigment load varies without camouflage blotches
    const soft = H.layer(1400, 700); { const sx = soft.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,0.5)'; sx.fillRect(0, 0, 1400, 700); sx.drawImage(mottle, 0, 0); }
    // wash canvas: paint (optionally at half resolution for the big loose washes) -> mottle -> pooled drying edge -> granulation
    const mk = (w, h, fn, pool = 2.2, blur = 6, at = null, post = null, half = false) => {
      const cv = H.layer(w, h), c = cv.getContext('2d');
      if (half) { const hv = H.layer(Math.ceil(w / 2), Math.ceil(h / 2)), hc = hv.getContext('2d'); hc.scale(0.5, 0.5); fn(hc, w, h);
        c.imageSmoothingQuality = 'high'; c.drawImage(hv, 0, 0, w, h);
        // feather the canvas border so a wash can never end in a straight cut
        c.globalCompositeOperation = 'destination-in'; const fx = c.createLinearGradient(0, 0, w, 0), fy = c.createLinearGradient(0, 0, 0, h);
        [[0, 0], [40 / w, 1], [1 - 40 / w, 1], [1, 0]].forEach(([o, a]) => fx.addColorStop(o, `rgba(0,0,0,${a})`));
        [[0, 0], [40 / h, 1], [1 - 40 / h, 1], [1, 0]].forEach(([o, a]) => fy.addColorStop(o, `rgba(0,0,0,${a})`));
        c.fillStyle = fx; c.fillRect(0, 0, w, h); c.fillStyle = fy; c.fillRect(0, 0, w, h); }
      else fn(c, w, h);
      c.globalCompositeOperation = 'destination-in'; c.drawImage(soft, 0, 0, w, h); c.globalCompositeOperation = 'source-over';
      if (at) poolGran(cv, pool, blur, at); else rimPool(cv, pool, blur);
      if (post) post(c, w, h);
      return cv;
    };

    C.sky=mk(1280,720,c=>{
      exWash(c,circlePts(640,325,480,135,24,H.rng(20),.35),'#8aacc4',{layers:30,alpha:.035,amt:.18,seed:21});
      exWash(c,circlePts(450,320,275,110,20,H.rng(30),.4),'#d3a4a0',{layers:20,alpha:.025,amt:.22,seed:31});
      exBloom(c,950,290,65,33,.25);
      c.save();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(820,267,53,0,Math.PI*2);c.fill();c.restore();
    },2.2,6,[0,0]);
    C.sun=mk(1280,720,c=>exWash(c,circlePts(820,267,47,47,36,H.rng(36),.3),'#e9bd66',{layers:24,alpha:.035,amt:.05,seed:37}),2.2,4,[0,0]);
    C.hills=mk(1280,720,c=>{
      exWash(c,[P(125,418),P(255,330),P(365,370),P(515,280),P(670,380),P(820,325),P(1110,420),P(660,462),P(250,450)],'#667d98',{layers:26,alpha:.045,amt:.06,seed:41});
      exWash(c,[P(155,430),P(340,375),P(480,418),P(650,365),P(830,414),P(1070,389),P(1140,450),P(880,473),P(350,475)],'#638b73',{layers:25,alpha:.05,amt:.07,seed:45});
    },2.2,5,[0,0]);
    C.water=mk(1280,720,c=>{
      exWash(c,circlePts(640,490,475,66,24,H.rng(50),.5),'#6aadb7',{layers:28,alpha:.035,amt:.16,seed:51});
      exWash(c,blob(780,477,140,50,54),'#d7bd8c',{layers:22,alpha:.025,amt:.18,seed:55});
      exBloom(c,430,493,55,56,.22);exBloom(c,910,495,45,58,.2);
    },2.2,6,[0,0]);
    C.text=new Map();EXC=C;return C;
  }
  function wcText(c, str, x, y, size, col, { align = 'left', reveal = 1, font = '700', alpha = 1 } = {}) {
    if (reveal <= 0 || !str) return;
    const C = cachedExplainer(), key = str + '|' + size + '|' + col + '|' + font;
    let cv = C.text.get(key);
    if (!cv) {
      const m = H.layer(4, 4).getContext('2d'); m.font = `${font} ${size}px "Kalam"`;
      const w = Math.ceil(m.measureText(str).width) + 30, h = Math.ceil(size * 1.5);
      cv = H.layer(w, h); const tc = cv.getContext('2d');
      tc.font = `${font} ${size}px "Kalam"`; tc.fillStyle = col; tc.textBaseline = 'alphabetic';
      tc.globalAlpha = 0.85; tc.fillText(str, 15, size * 1.08); tc.globalAlpha = 0.25; tc.fillText(str, 16.5, size * 1.08 + 1);
      rimPool(cv, 2.4, 2.5);
      cv.base = size * 1.08;
      if (C.text.size > 300) C.text.clear();
      C.text.set(key, cv);
    }
    const w = cv.width - 30, ox = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = alpha;
    const rw = Math.max(1, cv.width * cl(reveal));
    c.drawImage(cv, 0, 0, rw, cv.height, x + ox - 15, y - cv.base, rw, cv.height);
    c.restore();
  }
  // a loaded round brush pulled along a path: tapered ribbon + darker pooled edge, drawn on progressively
  function wcStroke(c, pts, w, col, prog = 1, { head = true, alpha = 0.75, taper = true } = {}) {
    if (prog <= 0) return;
    const L = [], R = [], n = pts.length;
    const N = Math.max(2, Math.ceil(n * cl(prog)));
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), ww = w * (taper ? 0.35 + 0.65 * Math.sin(Math.min(1, u * 1.15 + 0.1) * Math.PI * 0.95) : 0.8 + 0.2 * Math.sin(i * 0.7)) * 0.5;
      L.push([pts[i][0] - dy / l * ww, pts[i][1] + dx / l * ww]); R.push([pts[i][0] + dy / l * ww, pts[i][1] - dx / l * ww]);
    }
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = H.rgba(col, alpha); c.strokeStyle = H.rgba(col, 0.45); c.lineWidth = 1.2; c.lineJoin = 'round';
    c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath(); c.fill(); c.stroke();
    if (head && prog >= 1) {
      const a = pts[n - 3] || pts[0], b = pts[n - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      c.lineCap = 'round'; c.strokeStyle = H.rgba(col, alpha); c.lineWidth = w * 0.55;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] - Math.cos(ang + s * 0.5) * w * 2.6, b[1] - Math.sin(ang + s * 0.5) * w * 2.6); c.stroke(); }
    }
    c.restore();
  }
  const bez = (p0, p1, p2, p3, n = 40) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, a = 1 - u; o.push([a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]]); } return o; };
  // revealed wash: the cached painting appears as if flooding outward from its centre
  function bloomIn(c, cv, x, y, p, w = cv.width, h = cv.height) {
    if (p <= 0) return;
    c.save(); c.globalCompositeOperation = 'multiply';
    if (p >= 1) { c.drawImage(cv, x, y, w, h); c.restore(); return; }
    const T = H.layer(Math.ceil(w), Math.ceil(h)), tc = T.getContext('2d');
    tc.drawImage(cv, 0, 0, w, h);
    tc.globalCompositeOperation = 'destination-in';
    const r = Math.hypot(w, h) * 0.55 * H.ease.out(p), g = tc.createRadialGradient(w / 2, h / 2, r * 0.6, w / 2, h / 2, r + 1);
    g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); tc.fillStyle = g; tc.fillRect(0, 0, w, h);
    c.globalAlpha = Math.min(1, p * 1.5); c.drawImage(T, x, y); c.restore();
  }
  function pencil(c, pts, prog = 1, a = 0.4, w = 1.1) {
    if (prog <= 0) return;
    const n = Math.max(2, Math.ceil(pts.length * cl(prog)));
    c.save(); c.strokeStyle = `rgba(70,68,72,${a})`; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); for (let i = 0; i < n; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]); c.stroke(); c.restore();
  }
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const INDIGO = [44, 52, 112], ALIZ = [190, 40, 60], SAP = [70, 130, 60], CERU = [60, 120, 190], SIENNA = [170, 90, 50];


function draw(ctx,W,H_,t){const C=cachedExplainer();ctx.drawImage(C.paper,0,0);
wcText(ctx,'Let the color flow.',640,110,64,'#343f59',{align:'center',reveal:win(t,.15,1.5)});
pencil(ctx,bez([130,420],[330,390],[440,300],[515,280]),win(t,.5,1.5),.23,1);
pencil(ctx,bez([515,280],[620,345],[800,390],[1110,420]),win(t,1,2),.23,1);
pencil(ctx,bez([150,470],[440,455],[900,460],[1130,475]),win(t,1.5,2.3),.19,1);
bloomIn(ctx,C.sky,0,0,win(t,2,4.8));bloomIn(ctx,C.sun,0,0,win(t,3.5,5.2));
bloomIn(ctx,C.hills,0,0,win(t,5,7.8));bloomIn(ctx,C.water,0,0,win(t,7.5,10));
[0,1,2,3,4].forEach(i=>wcStroke(ctx,bez([410+i*42,476+i*13],[500+i*25,470+i*13],[690+i*15,482+i*13],[820-i*35,476+i*13]),2,[72,126,151],win(t,9.5+i*.17,10.2+i*.17),{head:false,alpha:.32}));
[0,1,2,3,4].forEach(i=>{const x=218+i*17;wcStroke(ctx,bez([x,558],[x-12,530],[x+8,502],[x-9,481-i*8]),3,[71,104,70],win(t,10.5+i*.14,11.3+i*.14),{head:false,alpha:.65});});
wcText(ctx,'A quiet moment, painted slowly.',640,653,43,'#3a5660',{align:'center',reveal:win(t,12,13.2)});
}
function scoreSound(k){k.bed('room',0,14.8,{gain:.04});
[.2,.7,1.3].forEach(t=>k.noise(t,{dur:.5,color:'pink',filter:'highpass',f:2200,gain:.035,a:.03}));
[2,3.5,5,7.5].forEach((t,i)=>{k.noise(t,{dur:i===1?1.2:2.1,color:'pink',filter:'bandpass',f:[[0,450],[1.2,1000]],gain:.055,a:.25});k.tone(t,{f:450+i*80,type:'sine',dur:.13,gain:.045,a:.01});});
[9.5,10.5,12].forEach(t=>k.noise(t,{dur:.8,color:'pink',filter:'bandpass',f:1100,gain:.04,a:.07}));
['F4','A4','C5'].forEach((f,i)=>k.tone(13.1+i*.12,{f,type:'sine',dur:1.3,gain:.075,a:.07}));}
window.WATERCOLOR_STUDIO={draw,scoreSound,duration:15,width:1280,height:720,assets:()=>cachedExplainer()};window.DURATION=15;window.scoreSound=scoreSound;})();
