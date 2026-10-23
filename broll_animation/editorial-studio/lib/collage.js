/* Collage materials adapted from the user-supplied document. */
(()=>{
  const TAU = Math.PI * 2;
  const KRAFT = '#c9a878';
  const PAPER = '#f0e9d9', INK = '#1a1816', RED = '#b8483a', CARD = '#f5f1e7', NEWS = '#e9e1cb';
  const C = {}; // caches (static textures and sprites; output still depends only on t)
  const NZ = () => C.nz || (C.nz = H.makeNoise(4242));
  const q12 = (t) => Math.floor(t * 12 + 1e-6) / 12;
  const gs = (v, a = 1) => { const k = Math.round(H.clamp(v) * 255); return a >= 1 ? `rgb(${k},${k},${k})` : `rgba(${k},${k},${k},${a})`; };
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); };
  const pathPoly = (c, p) => { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); };
  const measure = (font, s) => { const m = C.m || (C.m = H.layer(8, 8).getContext('2d')); m.font = font; return m.measureText(s); };

  // rectangle centred on 0 -> polygon; torn sides get a ragged fibre edge, cut sides stay straight (scissor cut)
  const edgePoly = (w, h, torn, seed, amp = 5) => {
    const nz = NZ(), r = H.rng(seed);
    const cs = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [x + (r() - 0.5) * 4, y + (r() - 0.5) * 4]);
    const out = [];
    for (let e = 0; e < 4; e++) {
      const [ax, ay] = cs[e], [bx, by] = cs[(e + 1) % 4], len = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / len, dy = (by - ay) / len;
      if (!torn[e]) { out.push([ax, ay]); continue; }
      const o = seed * 0.37 + e * 11.3;
      for (let d = 0; d < len; d += 2.5) {
        const fade = Math.min(1, d / 10, (len - d) / 10);
        const off = (nz.fbm2(o + d * 0.021, o * 0.5, 4) * amp * 1.7 + (r() - 0.5) * amp * 0.3 - amp * 0.25) * fade;
        out.push([ax + dx * d + dy * off, ay + dy * d - dx * off]);
      }
    }
    return out;
  };

  const sprite = (w, h, pad, paint) => {
    const cv = H.layer(Math.ceil(w + pad * 2), Math.ceil(h + pad * 2)), c = cv.getContext('2d');
    c.translate(cv.width / 2, cv.height / 2); paint(c);
    return { cv, ox: cv.width / 2, oy: cv.height / 2, w, h };
  };
  const drawSpr = (c, s) => c.drawImage(s.cv, -s.ox, -s.oy);
  const shadowFill = (c, poly, col, sh = 1) => {
    c.save(); c.shadowColor = `rgba(40,28,15,${0.4 * sh})`; c.shadowBlur = 15 * sh; c.shadowOffsetX = 4 * sh; c.shadowOffsetY = 8 * sh;
    pathPoly(c, poly); c.fillStyle = col; c.fill(); c.restore();
    c.save(); c.shadowColor = 'rgba(40,28,15,0.25)'; c.shadowBlur = 2; c.shadowOffsetY = 1; pathPoly(c, poly); c.fillStyle = col; c.fill(); c.restore();
  };

  // ---------- paper fibre texture (white based; multiplied over paper colour and cutouts) ----------
  const fibre = () => {
    if (C.fib) return C.fib;
    const W = 2000, Hh = 1100, cv = H.layer(W, Hh), c = cv.getContext('2d'), nz = NZ(), r = H.rng(31);
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, Hh);
    const lo = H.layer(250, 138), lc = lo.getContext('2d'), im = lc.createImageData(250, 138);
    for (let y = 0; y < 138; y++) for (let x = 0; x < 250; x++) {
      const v = nz.fbm2(x * 0.05, y * 0.05, 4) * 0.6 + nz.n2(x * 0.3, y * 0.3) * 0.4, k = (y * 250 + x) * 4;
      const g = 244 + v * 22; im.data[k] = g; im.data[k + 1] = g - 2; im.data[k + 2] = g - 6; im.data[k + 3] = 255;
    }
    lc.putImageData(im, 0, 0); c.imageSmoothingQuality = 'high'; c.drawImage(lo, 0, 0, W, Hh);
    c.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = r() * Hh, a = r() * TAU, l = 4 + r() * 16, dark = r() < 0.55;
      c.strokeStyle = dark ? `rgba(120,100,70,${0.05 + r() * 0.08})` : `rgba(255,255,255,${0.2 + r() * 0.3})`; c.lineWidth = 0.6 + r() * 0.7;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(80,60,40,${0.08 + r() * 0.2})`; c.fillRect(r() * W, r() * Hh, 0.8 + r() * 1.4, 0.8 + r() * 1.2); }
    return (C.fib = cv);
  };
  const texture = (c, poly, alpha, ox = 0, oy = 0) => {
    c.save(); pathPoly(c, poly); c.clip(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = alpha; c.drawImage(fibre(), -1000 + ox, -550 + oy); c.restore();
  };
  const grainTiles = () => {
    if (C.gr) return C.gr;
    C.gr = [0, 1, 2, 3].map((s) => {
      const cv = H.layer(256, 256), c = cv.getContext('2d'), im = c.createImageData(256, 256), r = H.rng(900 + s);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 150; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      c.putImageData(im, 0, 0); return c.createPattern(cv, 'repeat');
    });
    return C.gr;
  };

  // ---------- photographs: grey scene -> soft blur, grain, contrast, coarse halftone duotone ----------
  const treat = (w, h, seed, paint, o = {}) => {
    const cell = o.cell || 4, mix = o.mix == null ? 0.38 : o.mix, con = o.con || 1.25;
    const a = H.layer(w, h), ac = a.getContext('2d'); paint(ac, w, h);
    const b = H.layer(w, h), bc = b.getContext('2d'); bc.filter = `blur(${o.blur || 1}px)`; bc.drawImage(a, 0, 0); bc.filter = 'none';
    const img = bc.getImageData(0, 0, w, h), d = img.data, r = H.rng(seed);
    const ink = [30, 27, 25], pap = [238, 231, 214], ca = Math.cos(0.785), sa = Math.sin(0.785);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const k = (py * w + px) * 4, u = px / w - 0.5, v = py / h - 0.5;
      let L = d[k] / 255;
      L *= 1 - (u * u + v * v) * 1.1;
      L += (r() + r() + r() - 1.5) * 0.11;
      L = H.clamp((L - 0.5) * con + 0.5 + (o.lift || 0));
      const D = 1 - L, rx = px * ca + py * sa, ry = -px * sa + py * ca;
      const gx = (Math.floor(rx / cell) + 0.5) * cell, gy = (Math.floor(ry / cell) + 0.5) * cell;
      const dot = H.clamp(cell * 0.74 * Math.sqrt(D) - Math.hypot(rx - gx, ry - gy) + 0.6);
      const cov = dot * (1 - mix) + D * mix;
      d[k] = pap[0] + (ink[0] - pap[0]) * cov; d[k + 1] = pap[1] + (ink[1] - pap[1]) * cov; d[k + 2] = pap[2] + (ink[2] - pap[2]) * cov;
    }
    bc.putImageData(img, 0, 0);
    // dust and a hairline scratch, like an old print
    for (let i = 0; i < w * h / 2500; i++) { bc.fillStyle = r() < 0.6 ? 'rgba(245,240,228,0.8)' : 'rgba(20,18,16,0.5)'; ell(bc, r() * w, r() * h, 0.5 + r() * 1.2, 0.5 + r() * 1.0); bc.fill(); }
    bc.strokeStyle = 'rgba(245,240,228,0.45)'; bc.lineWidth = 0.8; bc.beginPath(); const sx = r() * w; bc.moveTo(sx, 0); bc.bezierCurveTo(sx + 20, h * 0.3, sx - 15, h * 0.6, sx + 10 + r() * 20, h); bc.stroke();
    return b;
  };

  const furStrokes = (c, cx, cy, rx, ry, base, n, seed) => {
    const r = H.rng(seed); c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, rr = Math.sqrt(r()), x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr, l = 3 + r() * 6, ang = a + (r() - 0.5) * 0.8;
      c.strokeStyle = gs(base + (r() - 0.5) * 0.5, 0.18); c.lineWidth = 0.8 + r();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); c.stroke();
    }
  };
  const room = (c, w, h, bg, seed) => {
    const r = H.rng(seed);
    let g = c.createLinearGradient(0, 0, w * 0.4, h); g.addColorStop(0, gs(bg + 0.15)); g.addColorStop(1, gs(bg - 0.22));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    g = c.createRadialGradient(w * (0.1 + r() * 0.2), h * 0.05, 0, w * 0.2, h * 0.1, w * 0.7); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = gs(bg - 0.28); c.fillRect(0, h * (0.8 + r() * 0.06), w, h);
  };
  const catGray = (c, w, h, v) => {
    room(c, w, h, v.bg, v.seed);
    if (v.flip) { c.translate(w, 0); c.scale(-1, 1); }
    const s = Math.min(w, h) * (v.sc || 1), cx = w * (0.5 + (v.dx || 0)), cy = h * (0.46 + (v.dy || 0)), f = v.fur;
    let g = c.createRadialGradient(cx - 0.1 * s, cy + 0.3 * s, 0, cx, cy + 0.5 * s, 0.45 * s); g.addColorStop(0, gs(f + 0.18)); g.addColorStop(1, gs(f - 0.22));
    ell(c, cx + 0.04 * s, cy + 0.52 * s, 0.36 * s, 0.36 * s); c.fillStyle = g; c.fill();
    ell(c, cx, cy + 0.36 * s, 0.13 * s, 0.12 * s); c.fillStyle = gs(f + 0.3, 0.6); c.fill();
    for (const sd of [-1, 1]) {
      c.beginPath(); c.moveTo(cx + sd * 0.06 * s, cy - 0.16 * s); c.lineTo(cx + sd * 0.25 * s, cy - 0.4 * s); c.lineTo(cx + sd * 0.27 * s, cy - 0.02 * s); c.closePath(); c.fillStyle = gs(f - 0.08); c.fill();
      c.beginPath(); c.moveTo(cx + sd * 0.11 * s, cy - 0.15 * s); c.lineTo(cx + sd * 0.23 * s, cy - 0.32 * s); c.lineTo(cx + sd * 0.23 * s, cy - 0.08 * s); c.closePath(); c.fillStyle = gs(f + 0.28); c.fill();
    }
    g = c.createRadialGradient(cx - 0.08 * s, cy - 0.1 * s, 0, cx, cy, 0.3 * s); g.addColorStop(0, gs(f + 0.2)); g.addColorStop(1, gs(f - 0.15));
    ell(c, cx, cy, 0.28 * s, 0.23 * s); c.fillStyle = g; c.fill();
    if (v.tabby) { c.strokeStyle = gs(f - 0.3, 0.75); c.lineWidth = 0.022 * s; c.lineCap = 'round'; for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(cx + k * 0.05 * s, cy - 0.21 * s); c.quadraticCurveTo(cx + k * 0.06 * s, cy - 0.14 * s, cx + k * 0.035 * s, cy - 0.08 * s); c.stroke(); } for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx + sd * (0.2 + i * 0.03) * s, cy + (0.04 + i * 0.06) * s); c.lineTo(cx + sd * (0.28) * s, cy + (0.02 + i * 0.07) * s); c.stroke(); } }
    furStrokes(c, cx, cy, 0.27 * s, 0.22 * s, f, 160, v.seed + 3);
    furStrokes(c, cx, cy + 0.5 * s, 0.34 * s, 0.32 * s, f, 160, v.seed + 4);
    for (const sd of [-1, 1]) { ell(c, cx + sd * 0.045 * s, cy + 0.1 * s, 0.065 * s, 0.05 * s); c.fillStyle = gs(f + 0.32); c.fill(); }
    c.beginPath(); c.moveTo(cx - 0.03 * s, cy + 0.045 * s); c.lineTo(cx + 0.03 * s, cy + 0.045 * s); c.lineTo(cx, cy + 0.08 * s); c.closePath(); c.fillStyle = gs(0.15); c.fill();
    for (const sd of [-1, 1]) {
      ell(c, cx + sd * 0.1 * s, cy - 0.02 * s, 0.058 * s, 0.042 * s, sd * 0.15); c.fillStyle = gs(0.86); c.fill();
      ell(c, cx + sd * 0.1 * s, cy - 0.02 * s, 0.018 * s, 0.038 * s); c.fillStyle = gs(0.03); c.fill();
      ell(c, cx + sd * 0.1 * s - 0.01 * s, cy - 0.035 * s, 0.009 * s, 0.009 * s); c.fillStyle = gs(1); c.fill();
    }
    c.strokeStyle = gs(0.97, 0.7); c.lineWidth = 1;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx + sd * 0.08 * s, cy + 0.1 * s + i * 4); c.quadraticCurveTo(cx + sd * 0.25 * s, cy + 0.06 * s + i * 7, cx + sd * 0.4 * s, cy + 0.08 * s + i * 12); c.stroke(); }
  };
  const dogGray = (c, w, h, v) => {
    room(c, w, h, v.bg, v.seed);
    if (v.flip) { c.translate(w, 0); c.scale(-1, 1); }
    const s = Math.min(w, h) * (v.sc || 1), cx = w * (0.5 + (v.dx || 0)), cy = h * (0.44 + (v.dy || 0)), f = v.fur;
    let g = c.createRadialGradient(cx - 0.1 * s, cy + 0.4 * s, 0, cx, cy + 0.55 * s, 0.5 * s); g.addColorStop(0, gs(f + 0.15)); g.addColorStop(1, gs(f - 0.2));
    ell(c, cx, cy + 0.6 * s, 0.4 * s, 0.36 * s); c.fillStyle = g; c.fill();
    g = c.createRadialGradient(cx - 0.08 * s, cy - 0.12 * s, 0, cx, cy, 0.32 * s); g.addColorStop(0, gs(f + 0.2)); g.addColorStop(1, gs(f - 0.12));
    ell(c, cx, cy - 0.02 * s, 0.22 * s, 0.25 * s); c.fillStyle = g; c.fill();
    for (const sd of [-1, 1]) { ell(c, cx + sd * 0.22 * s, cy + 0.06 * s, 0.085 * s, 0.22 * s, -sd * 0.32); c.fillStyle = gs(f - 0.3); c.fill(); }
    furStrokes(c, cx, cy, 0.22 * s, 0.25 * s, f, 160, v.seed + 3);
    furStrokes(c, cx, cy + 0.6 * s, 0.38 * s, 0.32 * s, f, 160, v.seed + 4);
    ell(c, cx, cy + 0.14 * s, 0.13 * s, 0.11 * s); c.fillStyle = gs(f + 0.3); c.fill();
    ell(c, cx, cy + 0.255 * s, 0.045 * s, 0.05 * s); c.fillStyle = gs(0.5); c.fill();
    c.strokeStyle = gs(0.1); c.lineWidth = 0.012 * s; c.beginPath(); c.moveTo(cx, cy + 0.1 * s); c.lineTo(cx, cy + 0.18 * s); c.moveTo(cx - 0.08 * s, cy + 0.19 * s); c.quadraticCurveTo(cx, cy + 0.24 * s, cx + 0.08 * s, cy + 0.19 * s); c.stroke();
    ell(c, cx, cy + 0.075 * s, 0.062 * s, 0.042 * s); c.fillStyle = gs(0.05); c.fill();
    ell(c, cx - 0.018 * s, cy + 0.062 * s, 0.018 * s, 0.01 * s); c.fillStyle = gs(0.6); c.fill();
    for (const sd of [-1, 1]) {
      ell(c, cx + sd * 0.09 * s, cy - 0.12 * s, 0.03 * s, 0.018 * s); c.fillStyle = gs(f + 0.3); c.fill();
      ell(c, cx + sd * 0.09 * s, cy - 0.06 * s, 0.034 * s, 0.034 * s); c.fillStyle = gs(0.04); c.fill();
      ell(c, cx + sd * 0.09 * s - 0.01 * s, cy - 0.07 * s, 0.01 * s, 0.01 * s); c.fillStyle = gs(1); c.fill();
    }
  };
  // the archival "electronic brain" room: cabinets of tape drives receding, an operator at the console
  const OPX = 0.71, OPY = 0.52; // operator position in the photo (fraction of w,h)
  const mainframeGray = (c, w, h) => {
    const vx = w * 0.58, vy = h * 0.4;
    let g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, gs(0.3)); g.addColorStop(0.45, gs(0.55)); g.addColorStop(1, gs(0.7)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // ceiling light panels in perspective
    for (let i = 0; i < 6; i++) { const z = 1 / (1 + i * 0.55), y = vy - (vy - 10) * z, hw = w * 0.32 * z, hh = 14 * z; c.fillStyle = gs(0.95, 0.85); c.fillRect(vx - hw, y - hh, hw * 2, hh); }
    // back wall
    c.fillStyle = gs(0.62); c.fillRect(vx - w * 0.09, vy - h * 0.18, w * 0.2, h * 0.3);
    // floor with tiles and sheen
    g = c.createLinearGradient(0, vy, 0, h); g.addColorStop(0, gs(0.62)); g.addColorStop(1, gs(0.82)); c.fillStyle = g;
    c.beginPath(); c.moveTo(0, h); c.lineTo(vx - w * 0.09, vy + h * 0.12); c.lineTo(vx + w * 0.11, vy + h * 0.12); c.lineTo(w, h); c.fill();
    c.strokeStyle = gs(0.5, 0.5); c.lineWidth = 1;
    for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(vx + i * 6, vy + h * 0.12); c.lineTo(vx + i * w * 0.12, h); c.stroke(); }
    for (let i = 1; i < 7; i++) { const z = 1 / (i * 0.6), y = vy + h * 0.12 + (h - vy - h * 0.12) * (1 - z * 0.25) * (i / 7); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // left wall of cabinets (tape drives)
    const N = 7;
    for (let i = N - 1; i >= 0; i--) {
      const z0 = 1 / (1 + i * 0.42), z1 = 1 / (1 + (i + 1) * 0.42);
      const x0 = vx - (vx + 40) * z0, x1 = vx - (vx + 40) * z1;
      const t0 = vy - (vy - h * 0.02) * z0, b0 = vy + (h * 0.98 - vy) * z0 * 0.86, t1 = vy - (vy - h * 0.02) * z1, b1 = vy + (h * 0.98 - vy) * z1 * 0.86;
      c.beginPath(); c.moveTo(x0, t0); c.lineTo(x1, t1); c.lineTo(x1, b1); c.lineTo(x0, b0); c.closePath();
      c.fillStyle = gs(0.5 + (i % 2) * 0.06); c.fill(); c.strokeStyle = gs(0.18); c.lineWidth = 2 * z0; c.stroke();
      const mx = (x0 + x1) / 2, cw = (x0 - x1);
      for (const [fy, rr] of [[0.25, 0.22], [0.45, 0.22]]) {
        const yy = H.lerp(t0, b0, fy) * 0.5 + H.lerp(t1, b1, fy) * 0.5;
        for (const fx of [-0.22, 0.22]) {
          ell(c, mx + fx * cw, yy, cw * rr * 0.7, (b0 - t0) * 0.085); c.fillStyle = gs(0.12); c.fill();
          ell(c, mx + fx * cw, yy, cw * rr * 0.62, (b0 - t0) * 0.075); c.fillStyle = gs(0.78); c.fill();
          ell(c, mx + fx * cw, yy, cw * rr * 0.2, (b0 - t0) * 0.024); c.fillStyle = gs(0.2); c.fill();
        }
      }
      for (let k = 0; k < 6; k++) { ell(c, mx - cw * 0.3 + k * cw * 0.12, H.lerp(t0, b0, 0.7), 1.6 * z0 + 0.5, 1.6 * z0 + 0.5); c.fillStyle = gs(k % 2 ? 0.95 : 0.3); c.fill(); }
    }
    // right: console desk with blinking panel, foreground
    c.fillStyle = gs(0.22); c.beginPath(); c.moveTo(w * 0.55, h * 0.66); c.lineTo(w, h * 0.6); c.lineTo(w, h); c.lineTo(w * 0.6, h); c.closePath(); c.fill();
    c.fillStyle = gs(0.42); c.beginPath(); c.moveTo(w * 0.55, h * 0.66); c.lineTo(w, h * 0.6); c.lineTo(w, h * 0.66); c.lineTo(w * 0.56, h * 0.72); c.closePath(); c.fill();
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) { ell(c, w * 0.6 + i * w * 0.042, h * 0.75 + j * h * 0.04 - i * 2, 2.6, 2.6); c.fillStyle = gs((i * 7 + j * 3) % 4 ? 0.85 : 0.2); c.fill(); }
    // operator, standing at the console
    const ox = w * OPX, oy = h * OPY, s = h * 0.5;
    c.fillStyle = gs(0.12); // skirt
    c.beginPath(); c.moveTo(ox - 0.13 * s, oy + 0.15 * s); c.lineTo(ox + 0.13 * s, oy + 0.15 * s); c.lineTo(ox + 0.18 * s, oy + 0.62 * s); c.lineTo(ox - 0.17 * s, oy + 0.62 * s); c.fill();
    g = c.createLinearGradient(ox - 0.14 * s, 0, ox + 0.14 * s, 0); g.addColorStop(0, gs(0.95)); g.addColorStop(1, gs(0.62)); c.fillStyle = g; // blouse
    c.beginPath(); c.moveTo(ox - 0.12 * s, oy - 0.2 * s); c.quadraticCurveTo(ox, oy - 0.26 * s, ox + 0.12 * s, oy - 0.2 * s); c.lineTo(ox + 0.13 * s, oy + 0.17 * s); c.lineTo(ox - 0.13 * s, oy + 0.17 * s); c.fill();
    c.strokeStyle = gs(0.85); c.lineWidth = 0.06 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(ox - 0.11 * s, oy - 0.15 * s); c.lineTo(ox - 0.2 * s, oy + 0.08 * s); c.lineTo(ox - 0.3 * s, oy + 0.18 * s); c.stroke();
    ell(c, ox, oy - 0.33 * s, 0.075 * s, 0.09 * s); c.fillStyle = gs(0.72); c.fill();
    ell(c, ox + 0.015 * s, oy - 0.38 * s, 0.09 * s, 0.07 * s); c.fillStyle = gs(0.1); c.fill(); // hair
    ell(c, ox + 0.06 * s, oy - 0.3 * s, 0.04 * s, 0.07 * s); c.fill();
    for (let i = 0; i < 2; i++) { c.fillStyle = gs(0.15); c.fillRect(ox - 0.08 * s + i * 0.1 * s, oy + 0.62 * s, 0.035 * s, 0.2 * s); }
    // ceiling light falloff + floor sheen
    g = c.createRadialGradient(vx, vy - h * 0.2, 0, vx, vy, w * 0.6); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  };

  const pets = () => {
    if (C.pets) return C.pets;
    const specs = [
      ['cat', { bg: 0.72, fur: 0.42, tabby: true, seed: 11 }], ['dog', { bg: 0.58, fur: 0.7, seed: 12 }], ['dog', { bg: 0.8, fur: 0.35, seed: 13, flip: true, dx: 0.04 }],
      ['cat', { bg: 0.5, fur: 0.75, seed: 14, flip: true }], ['cat', { bg: 0.82, fur: 0.25, seed: 15, dx: -0.05, sc: 1.1 }], ['dog', { bg: 0.66, fur: 0.52, seed: 16, sc: 0.95 }],
    ];
    C.pets = specs.map(([k, v], i) => {
      const img = treat(132, 112, 100 + i, (c, w, h) => (k === 'cat' ? catGray : dogGray)(c, w, h, v), { cell: 3.4, blur: 0.8 });
      return { kind: k, spr: makePrint(img, 300 + i, [i % 2, (i + 1) % 2, 1, 0], 9, 6) };
    });
    return C.pets;
  };

  // ---------- cutout sprites ----------
  const makePrint = (img, seed, torn = [0, 1, 1, 0], border = 12, amp = 7) => {
    const w = img.width + border * 2, h = img.height + border * 2;
    return sprite(w, h, 34, (c) => {
      const outer = edgePoly(w, h, torn, seed, amp);
      shadowFill(c, outer, '#f8f5ee');
      texture(c, outer, 0.35, seed * 13 % 400, seed * 7 % 200);
      const inner = edgePoly(w - 7, h - 7, torn, seed, amp);
      c.save(); pathPoly(c, inner); c.clip(); c.beginPath(); c.rect(-img.width / 2, -img.height / 2, img.width, img.height); c.clip();
      c.drawImage(img, -img.width / 2, -img.height / 2); c.restore();
      c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1; c.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);
    });
  };
  const makeStrip = (text, font, o = {}) => {
    const m = measure(font, text), tw = m.width, asc = m.actualBoundingBoxAscent, desc = Math.max(1, m.actualBoundingBoxDescent);
    const px = asc / 0.72, padX = o.padX == null ? px * 0.2 : o.padX, padY = o.padY == null ? px * 0.15 : o.padY, w = tw + padX * 2, h = asc + desc + padY * 2;
    const base = -h / 2 + padY + asc;
    const spr = sprite(w, h, 30, (c) => {
      const poly = edgePoly(w, h, o.torn || [0, 0, 0, 0], o.seed || 1, o.amp || 4);
      shadowFill(c, poly, o.bg || CARD, o.sh || 1);
      texture(c, poly, o.bg === INK ? 0.12 : 0.45, (o.seed || 1) * 31 % 600, 0);
      c.fillStyle = o.fg || INK; c.font = font; c.fillText(text, -tw / 2, base);
    });
    spr.base = base; spr.tw = tw; spr.asc = asc;
    if (o.hl) {
      const i = text.indexOf(o.hl), x0 = -tw / 2 + measure(font, text.slice(0, i)).width, ww = measure(font, o.hl).width;
      spr.hl = [x0 - px * 0.07, base - asc * 0.9, ww + px * 0.14, asc * 1.0];
    }
    return spr;
  };
  const greek = (c, x, y, w, lines, lh, seed, font = '400 10px "Libre Baskerville"') => {
    const r = H.rng(seed); c.font = font; c.fillStyle = 'rgba(52,47,41,0.85)';
    for (let l = 0; l < lines; l++) {
      let cx = x + (l === 0 ? 10 : 0); const end = l === lines - 1 ? x + w * (0.3 + r() * 0.5) : x + w;
      while (cx < end - 12) {
        let s = ''; const n = 1 + Math.floor(r() * 8); for (let i = 0; i < n; i++) s += 'etaoinshrdlucmfwypvbg'[Math.floor(Math.pow(r(), 1.6) * 21)];
        const ww = c.measureText(s).width; if (cx + ww > end) break;
        c.fillText(s, cx, y + l * lh); cx += ww + 3.4;
      }
    }
  };
  // newspaper clipping: kicker, serif headline, italic deck with the key phrase (highlight rect returned), greeked columns
  const makeClipping = (o) => {
    const w = o.w, h = o.h; let hlRect = null;
    const spr = sprite(w, h, 34, (c) => {
      const poly = edgePoly(w, h, o.torn || [0, 1, 1, 1], o.seed, 5);
      shadowFill(c, poly, NEWS); texture(c, poly, 0.8, o.seed % 500, 100);
      c.save(); pathPoly(c, poly); c.clip();
      const g = c.createRadialGradient(0, 0, w * 0.3, 0, 0, w * 0.8); g.addColorStop(0, 'rgba(180,150,90,0)'); g.addColorStop(1, 'rgba(180,150,90,0.18)'); c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
      const L = -w / 2 + 22, R = w / 2 - 22; let y = -h / 2 + 30;
      c.fillStyle = INK; c.font = '400 13px "Oswald"'; c.fillText(o.kicker, L, y);
      c.fillRect(L, y + 7, R - L, 2); c.fillRect(L, y + 11, R - L, 0.8); y += 14;
      c.font = `700 ${o.headPx}px "Libre Baskerville"`;
      for (const line of o.head) { y += o.headPx * 1.18; c.fillText(line, L, y); }
      y += 14; c.font = `italic 400 ${o.deckPx}px "Libre Baskerville"`; c.fillStyle = '#2a2622';
      for (const line of o.deck) {
        y += o.deckPx * 1.4;
        const parts = line.split('|');
        let x = L; parts.forEach((p, i) => { const ww = c.measureText(p).width; if (i === 1) hlRect = [x - 4, y - o.deckPx * 0.86, ww + 8, o.deckPx * 1.12]; c.fillText(p, x, y); x += ww; });
      }
      y += 14; c.fillStyle = INK; c.fillRect(L, y, R - L, 0.8);
      const cols = o.cols || 2, gap = 14, cw = (R - L - gap * (cols - 1)) / cols;
      for (let k = 0; k < cols; k++) greek(c, L + k * (cw + gap), y + 18, cw, Math.floor((h / 2 - y - 18) / 13) + 1, 13, o.seed + k);
      c.restore();
    });
    spr.hl = hlRect; return spr;
  };
  // flat map card: land mass, thin dashed route, pin
  const makeMap = () => sprite(270, 180, 30, (c) => {
    const w = 270, h = 180, poly = edgePoly(w, h, [0, 0, 0, 0], 61, 3), nz = NZ();
    shadowFill(c, poly, '#dfe0d6'); texture(c, poly, 0.5, 300, 300);
    c.save(); pathPoly(c, poly); c.clip();
    c.beginPath();
    for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU, rr = 150 + nz.fbm2(Math.cos(a) * 1.5 + 9, Math.sin(a) * 1.5, 4) * 90; const x = -30 + Math.cos(a) * rr * 1.2, y = 40 + Math.sin(a) * rr * 0.7; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.fillStyle = '#c9c3b2'; c.fill(); c.strokeStyle = 'rgba(30,28,25,0.6)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(30,28,25,0.25)'; c.lineWidth = 0.7; for (let i = -6; i < 7; i++) { c.beginPath(); c.moveTo(i * 40, -h); c.lineTo(i * 40 + 30, h); c.stroke(); }
    c.setLineDash([5, 4]); c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-120, 70); c.bezierCurveTo(-60, 0, -10, 40, 30, -20); c.stroke(); c.setLineDash([]);
    c.restore();
    c.fillStyle = INK; c.font = '700 17px "Oswald"'; c.fillText('ITHACA, N.Y.', 46, -18); c.font = '400 12px "Oswald"'; c.fillText('1958', 46, -2);
  });
  // map pin, drawn live (so it can drop on steps)
  const pin = (c, x, y, s = 1, col = RED) => {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(30,20,10,0.25)'; ell(c, 5, 2, 7, 3); c.fill();
    c.strokeStyle = '#555'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke();
    ell(c, 0, -22, 8, 8); c.fillStyle = col; c.fill(); ell(c, -2.5, -24.5, 2.5, 2.5); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    c.restore();
  };
  const blurred = (spr, px) => { const cv = H.layer(spr.cv.width, spr.cv.height), c = cv.getContext('2d'); c.filter = `blur(${px}px)`; c.drawImage(spr.cv, 0, 0); return { ...spr, cv }; };

  // ---------- live marks: highlighter, tape, marker, ink arrows ----------
  // highlighter: translucent, slightly uneven band sweeping left -> right, multiplied into the paper
  const hilite = (c, rect, prog, seed) => {
    if (!rect || prog <= 0) return;
    const [x, y, w, h] = rect, nz = NZ(), L = w * H.clamp(prog), o = seed * 1.7, tilt = (H.rng(seed)() - 0.5) * h * 0.12;
    const top = [], bot = [];
    for (let d = 0; d <= L; d += 6) { top.push([x + d, y + nz.n2(o + d * 0.02, 1) * h * 0.07 + tilt * d / w]); bot.push([x + d, y + h + nz.n2(o + d * 0.02, 5) * h * 0.08 + tilt * d / w]); }
    top.push([x + L + h * 0.08, y + tilt * L / w]); bot.push([x + L - h * 0.08, y + h + tilt * L / w]);
    c.save(); c.globalCompositeOperation = 'multiply';
    c.beginPath(); c.moveTo(x - h * 0.06, y + h * 0.05); top.forEach((p) => c.lineTo(p[0], p[1])); for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]); c.closePath();
    c.fillStyle = 'rgba(255,226,38,0.84)'; c.fill(); c.clip();
    for (let k = 0; k < 4; k++) { // felt streaks along the stroke
      c.fillStyle = k % 2 ? 'rgba(235,190,20,0.22)' : 'rgba(255,240,150,0.3)';
      c.fillRect(x - 10, y + h * (0.12 + k * 0.22) + nz.n2(o + k, 3) * 3, L + 20, h * (0.05 + (k % 3) * 0.03));
    }
    c.fillStyle = 'rgba(230,180,10,0.3)'; ell(c, x + h * 0.08, y + h * 0.5, h * 0.18, h * 0.55); c.fill(); // pooled ink where the tip landed
    if (prog >= 1) { ell(c, x + L - h * 0.05, y + h * 0.5, h * 0.14, h * 0.55); c.fill(); }
    c.restore();
  };
  const tape = (c, x, y, w, h, rot, seed) => {
    const r = H.rng(seed);
    c.save(); c.translate(x, y); c.rotate(rot);
    const p = []; const n = 7;
    p.push([-w / 2, -h / 2]); p.push([w / 2, -h / 2]);
    for (let i = 1; i < n; i++) p.push([w / 2 + (i % 2 ? 3 : -2) + (r() - 0.5) * 3, -h / 2 + h * i / n]);
    p.push([w / 2, h / 2]); p.push([-w / 2, h / 2]);
    for (let i = n - 1; i > 0; i--) p.push([-w / 2 + (i % 2 ? -3 : 2) + (r() - 0.5) * 3, -h / 2 + h * i / n]);
    c.shadowColor = 'rgba(40,28,15,0.22)'; c.shadowBlur = 3; c.shadowOffsetY = 1.5;
    pathPoly(c, p); c.fillStyle = 'rgba(228,216,186,0.8)'; c.fill(); c.shadowColor = 'transparent';
    c.clip(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const yy = -h / 2 + r() * h; c.beginPath(); c.moveTo(-w / 2, yy); c.lineTo(w / 2, yy + (r() - 0.5) * 2); c.stroke(); }
    c.fillStyle = 'rgba(150,130,90,0.12)'; c.fillRect(-w / 2, -h / 2, w, 2); c.fillRect(-w / 2, h / 2 - 2, w, 2);
    c.restore();
  };
  // polyline drawn on by fraction (partial last segment)
  const partial = (c, pts, prog) => {
    const n = pts.length - 1, f = H.clamp(prog) * n, k = Math.floor(f);
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= Math.min(k, n); i++) c.lineTo(pts[i][0], pts[i][1]);
    if (k < n) { const a = pts[k], b = pts[k + 1], u = f - k; c.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); }
  };
  const marker = (c, pts, prog, col = RED, lw = 7) => {
    if (prog <= 0) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = col; c.globalAlpha = 0.9; c.lineWidth = lw; partial(c, pts, prog); c.stroke();
    c.globalAlpha = 0.35; c.lineWidth = lw * 0.4; c.translate(lw * 0.18, -lw * 0.15); partial(c, pts, prog); c.stroke();
    c.restore();
  };
  const loopPts = (cx, cy, rx, ry, seed) => {
    const nz = NZ(), pts = [], a0 = -2.3 + seed % 1;
    for (let i = 0; i <= 70; i++) { const u = i / 70, a = a0 + u * TAU * 1.12, k = 1 + nz.n2(seed + u * 3, 2) * 0.06 + u * 0.07; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return pts;
  };
  const linePts = (ax, ay, bx, by, seed, n = 10, wob = 2) => { const r = H.rng(seed), p = []; for (let i = 0; i <= n; i++) { const u = i / n; p.push([ax + (bx - ax) * u + (r() - 0.5) * wob, ay + (by - ay) * u + (r() - 0.5) * wob]); } return p; };
  const quadPts = (ax, ay, cx, cy, bx, by, n = 32) => { const p = []; for (let i = 0; i <= n; i++) { const u = i / n; p.push([(1 - u) * (1 - u) * ax + 2 * u * (1 - u) * cx + u * u * bx, (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * cy + u * u * by]); } return p; };
  const inkArrow = (c, pts, prog, lw = 2.6, col = INK, dash = null) => {
    if (prog <= 0) return;
    c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; if (dash) c.setLineDash(dash);
    partial(c, pts, prog); c.stroke(); c.setLineDash([]);
    if (prog >= 1) {
      const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3], a = Math.atan2(y1 - y0, x1 - x0), L = 9 + lw * 3;
      c.fillStyle = col; c.beginPath(); c.moveTo(x1 + Math.cos(a) * 3, y1 + Math.sin(a) * 3); c.lineTo(x1 + Math.cos(a + 2.7) * L, y1 + Math.sin(a + 2.7) * L); c.lineTo(x1 + Math.cos(a - 2.7) * L, y1 + Math.sin(a - 2.7) * L); c.closePath(); c.fill();
    }
    c.restore();
  };

  // ---------- camera + stepped cutout animation ----------
  // place(): 2.5D parallax. p = depth factor (1 = main plane, <1 behind, >1 in front).
  const place = (c, cam, p, x, y, rot, s, fn) => {
    c.save(); c.translate(640, 360); const k = Math.pow(cam.z, p); c.scale(k, k); c.translate(-cam.x * p, -cam.y * p);
    c.translate(x, y); if (rot) c.rotate(rot); if (s !== 1) c.scale(s, s); fn(c); c.restore();
  };
  // cutout arrival on 12 fps steps: returns null before it lands
  const POP = {
    drop: { s: [1.16, 1.05, 0.985, 1], r: [0.05, 0.015, -0.006, 0] },
    slideL: { dx: [-300, -110, -26, 0], r: [-0.04, -0.015, 0.004, 0] }, slideR: { dx: [300, 110, 26, 0], r: [0.04, 0.015, -0.004, 0] },
    slideU: { dy: [320, 120, 28, 0], r: [0.03, 0.01, -0.003, 0] }, slideD: { dy: [-320, -120, -28, 0], r: [-0.03, -0.01, 0.003, 0] },
  };
  const arrive = (tq, a, kind = 'drop') => {
    if (tq < a - 1e-6) return null;
    const f = Math.min(3, Math.round((tq - a) * 12)), P = POP[kind];
    return { s: P.s ? P.s[f] : 1, r: P.r[f], dx: P.dx ? P.dx[f] : 0, dy: P.dy ? P.dy[f] : 0 };
  };
  const putSpr = (c, cam, p, spr, x, y, rot, s, tq, a, kind, extra) => {
    const A = arrive(tq, a, kind); if (!A) return false;
    place(c, cam, p, x + A.dx, y + A.dy, rot + A.r, s * A.s, (cc) => { drawSpr(cc, spr); if (extra) extra(cc); });
    return true;
  };
  const bgPaper = (c, cam, tint) => {
    c.save(); c.fillStyle = tint || PAPER; c.fillRect(0, 0, 1280, 720); c.restore();
    place(c, cam, 0.2, 0, 0, 0, 1, (cc) => { cc.globalCompositeOperation = 'multiply'; cc.drawImage(fibre(), -1000, -550); });
  };
  const block = (c, cam, p, x, y, w, h, rot, col, seed, torn = [0, 0, 0, 0], amp = 6) => {
    place(c, cam, p, x, y, rot, 1, (cc) => {
      const poly = edgePoly(w, h, torn, seed, amp);
      cc.save(); cc.shadowColor = 'rgba(40,28,15,0.25)'; cc.shadowBlur = 10; cc.shadowOffsetY = 4; pathPoly(cc, poly); cc.fillStyle = col; cc.fill(); cc.restore();
      texture(cc, poly, 0.55, seed * 40 % 300, 0);
    });
  };
  const finish = (c, t, vig = 0.32) => {
    const pats = grainTiles(), f = Math.floor(t * 12), r = H.rng(5000 + f);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.26; c.fillStyle = pats[f % 4];
    c.translate(-r() * 256, -r() * 256); c.fillRect(0, 0, 1280 + 256, 720 + 256); c.restore();
    c.save(); c.globalCompositeOperation = 'multiply';
    const g = c.createRadialGradient(640, 360, 260, 640, 360, 820); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, `rgba(${255 - 90 * vig},${255 - 100 * vig},${255 - 120 * vig},1)`);
    c.fillStyle = g; c.fillRect(0, 0, 1280, 720); c.restore();
  };


window.COLLAGE={PAPER,INK,RED,CARD,NEWS,sprite,treat,makePrint,makeStrip,makeClipping,drawSpr,hilite,tape,marker,loopPts,linePts,quadPts,inkArrow,place,putSpr,bgPaper,block,finish,q12};
})();
