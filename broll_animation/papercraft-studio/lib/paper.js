/* Papercraft geometry and materials adapted from the supplied reference document. */
(()=>{
  const PI = Math.PI, HP = PI / 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const win = (t, a, b) => clamp((t - a) / (b - a));
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eout = (x) => 1 - Math.pow(1 - x, 3);
  const eback = (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const TQ = (t) => Math.floor(t * 12 + 1e-6) / 12; // stop-motion: models are re-posed on twos (12 fps)

  // ---------- vectors ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const LIGHT = nrm([-0.55, 1.0, -0.5]); // warm key light: upper left, slightly in front

  const PAL = {
    card: '#f5f0e4', back: '#e8e0cf', tab: '#ece5d4', blue: '#2f6db3', blueD: '#1f4f8a', orange: '#ee6b2d', yellow: '#f4b630',
    red: '#d83a2e', green: '#2e9a57', ink: '#22252d', ginger: '#ea8a39', gingerD: '#b9581a', tan: '#d9aa74', brown: '#7a4a2a',
    cream: '#f7e6c8', pink: '#e9798d', teal: '#279c8e', steel: '#c3c8cd', wood: '#d6b585',
  };

  // ---------- camera (no roll, no yaw: the camera slides across the mat) ----------
  const makeCam = (tx, tz, D, pitch, W, Hh, ty = 0, F = 1000) => {
    const sp = Math.sin(pitch), cp = Math.cos(pitch), C = [tx, ty + D * sp, tz - D * cp];
    const proj = (P) => {
      const dx = P[0] - C[0], dy = P[1] - C[1], dz = P[2] - C[2], zc = -dy * sp + dz * cp, yc = dy * cp + dz * sp;
      return [W / 2 + (F * dx) / zc, Hh / 2 - (F * yc) / zc, zc];
    };
    // where the screen row sy meets the mat plane
    const ground = (sy) => { const k = (Hh / 2 - sy) / F, dy = -sp + k * cp, dz = cp + k * sp; if (dy >= -1e-4) return null; const s = -C[1] / dy; return { z: C[2] + s * dz, s }; };
    return { C, sp, cp, F, W, H: Hh, proj, ground };
  };
  const camAt = (keys, t) => {
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t <= b[0]) { const u = eio((t - a[0]) / Math.max(1e-6, b[0] - a[0])); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u); }
    }
    return keys[keys.length - 1].slice(1);
  };

  // ---------- faces: flat printed pieces of card in their own 2D frame ----------
  let GID = 1;
  const mkF = (O, ex, ey, poly, o) => {
    let pw = 0, ph = 0;
    for (const p of poly) { pw = Math.max(pw, p[0]); ph = Math.max(ph, p[1]); }
    return Object.assign({ O, ex, ey, n: nrm(cross(ex, ey)), poly, pw, ph }, o);
  };
  const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const P3 = (f, p) => [f.O[0] + f.ex[0] * p[0] + f.ey[0] * p[1], f.O[1] + f.ex[1] * p[0] + f.ey[1] * p[1], f.O[2] + f.ex[2] * p[0] + f.ey[2] * p[1]];
  // child face hinged on the parent's edge A->B (parent CCW). th > 0 folds toward the printed side, < 0 away.
  const attach = (par, A2, B2, th, poly, o) => {
    const A = P3(par, A2), B = P3(par, B2), ex = nrm(sub(A, B)), ey0 = cross(par.n, ex);
    const ey = add(mul(ey0, Math.cos(th)), mul(par.n, Math.sin(th)));
    return mkF(B, ex, ey, poly, Object.assign({ hinge: true }, o));
  };
  const fromPts = (pts, hint, o) => {
    let P = pts, n = nrm(cross(sub(P[1], P[0]), sub(P[2], P[0])));
    if (dot(n, hint) < 0) { P = P.slice().reverse(); n = mul(n, -1); }
    const O = P[0], ex = nrm(sub(P[1], P[0])), ey = cross(n, ex);
    let poly = P.map((p) => [dot(sub(p, O), ex), dot(sub(p, O), ey)]);
    const mx = Math.min(...poly.map((p) => p[0])), my = Math.min(...poly.map((p) => p[1]));
    poly = poly.map((p) => [p[0] - mx, p[1] - my]);
    return mkF(add(O, add(mul(ex, mx), mul(ey, my))), ex, ey, poly, o);
  };
  const xf = (faces, p = [0, 0, 0], yaw = 0, s = 1) => {
    const c = Math.cos(yaw), sn = Math.sin(yaw), R = (v) => [v[0] * c + v[2] * sn, v[1], -v[0] * sn + v[2] * c];
    return faces.map((f) => Object.assign({}, f, { O: add(mul(R(f.O), s), p), ex: mul(R(f.ex), s), ey: mul(R(f.ey), s), n: R(f.n) }));
  };

  // ---------- builders ----------
  // A box folded from a cross-shaped net. The top is the root; the four walls hang off it and fold down (printed
  // side out) while the root rises, the bottom folds under last. f = 0 flat template, 1 assembled.
  const tabPrint = (c, w, h) => {
    c.fillStyle = '#e3dac6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,100,70,0.35)'; c.lineWidth = 0.8;
    for (let x = -h; x < w; x += 3.2) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }
  };
  const box = (o) => {
    const { w, d, h } = o, f = o.f == null ? 1 : o.f, grp = GID++, st = 0.09;
    const C = (k) => (typeof o.col === 'string' ? o.col : o.col[k] || o.col.side);
    const PR = o.pr || {};
    const A = (i) => HP * eio(clamp((f - i * st) / 0.62));
    const ang = { front: A(0), right: A(1), back: A(2), left: A(3) };
    if (o.gap && f > 0.85) ang[o.gap] = lerp(ang[o.gap], HP * (1 - (o.gapAmt || 0.05)), win(f, 0.85, 1));
    const lift = f > 0 && f < 1 ? 1.4 * Math.sin(PI * f) : 0;
    const ytop = h * Math.max(Math.sin(ang.front), Math.sin(ang.right), Math.sin(ang.back), Math.sin(ang.left)) + 0.04 + lift;
    const closed = f >= 1 && !o.gap;
    const top = mkF([-w / 2, ytop, d / 2], [1, 0, 0], [0, 0, -1], rect(w, d), { grp, col: C('top'), print: PR.top, closed });
    const out = [top];
    const tf = -HP * eio(win(f, 0.12, 0.7));
    const side = (k, A2, B2, L) => {
      const p = attach(top, A2, B2, -ang[k], rect(L, h), { grp, col: C(k), print: PR[k], closed, fl: o.fl });
      out.push(p);
      if (o.tabs !== false && (k === 'front' || k === 'back') && !(closed)) {
        const tw = Math.min(1.2, L * 0.2);
        const trap = [[0, 0], [h, 0], [h - tw * 0.7, tw], [tw * 0.7, tw]];
        out.push(attach(p, [L, 0], [L, h], tf, trap, { grp, col: PAL.tab, print: tabPrint, bias: 1.5, fl: false }));
        out.push(attach(p, [0, h], [0, 0], tf, trap, { grp, col: PAL.tab, print: tabPrint, bias: 1.5, fl: false }));
      }
      return p;
    };
    side('back', [0, 0], [w, 0], w);
    side('right', [w, 0], [w, d], d);
    const fr = side('front', [w, d], [0, d], w);
    side('left', [0, d], [0, 0], d);
    if (f < 0.999) out.push(attach(fr, [w, h], [0, h], -HP * eio(win(f, 0.72, 1)), rect(w, d), { grp, col: C('bottom') || PAL.card, print: PR.bottom, fl: o.fl }));
    return out;
  };
  // tent card: two panels meeting at a printed fold line, with little glue feet. a: 0 flat .. 1 standing
  const tent = (o) => {
    const grp = GID++, al = (o.ang || 1.12) * eio(clamp(o.a == null ? 1 : o.a)), s = Math.sin(al), c = Math.cos(al), yr = o.h * s + 0.03;
    const fr = mkF([-o.w / 2, yr, 0], [1, 0, 0], [0, -s, -c], rect(o.w, o.h), { grp, col: o.col || PAL.card, print: o.pf });
    const bk = mkF([o.w / 2, yr, 0], [-1, 0, 0], [0, -s, c], rect(o.w, o.h), { grp, col: o.col2 || o.col || PAL.card, print: o.pb, hinge: true });
    const feet = [attach(fr, [o.w, o.h], [0, o.h], al, rect(o.w, 1.1), { grp, col: PAL.tab, print: tabPrint, fl: false }),
      attach(bk, [o.w, o.h], [0, o.h], al, rect(o.w, 1.1), { grp, col: PAL.tab, print: tabPrint, fl: false })];
    return [fr, bk, ...feet];
  };
  // flat piece of card lying on the mat (print "up" points away from camera before yaw)
  const flat = (w, d, col, print, y = 0.06) => [mkF([-w / 2, y, d / 2], [1, 0, 0], [0, 0, -1], rect(w, d), { grp: GID++, col, print, flat: true })];
  // prism along an axis frame {o, ax, u, v}; sec is a CCW 2D section in (u, v)
  const prism = (sec, len, fr, col, print, capCol) => {
    const grp = GID++, out = [], n = sec.length, cx = sec.reduce((s, p) => s + p[0], 0) / n, cy = sec.reduce((s, p) => s + p[1], 0) / n;
    const at = (p, l) => add(fr.o, add(mul(fr.ax, l), add(mul(fr.u, p[0]), mul(fr.v, p[1]))));
    for (let i = 0; i < n; i++) {
      const a = sec[i], b = sec[(i + 1) % n], mid = [(a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy];
      const hint = add(mul(fr.u, mid[0]), mul(fr.v, mid[1]));
      out.push(fromPts([at(a, 0), at(a, len), at(b, len), at(b, 0)], hint, { grp, col: typeof col === 'function' ? col(i) : col, print, idx: i, closed: true }));
    }
    out.push(fromPts(sec.map((p) => at(p, len)), fr.ax, { grp, col: capCol || col, closed: true }));
    out.push(fromPts(sec.map((p) => at(p, 0)).reverse(), mul(fr.ax, -1), { grp, col: capCol || col, closed: true }));
    return out;
  };
  const ngon = (r, n, rot = 0) => Array.from({ length: n }, (_, i) => [Math.cos(rot + (i / n) * PI * 2) * r, Math.sin(rot + (i / n) * PI * 2) * r]);
  // folded strip arrow lying on the mat: accordion creases, pointed head; prog grows it along the path
  const resample = (pts, step = 0.5) => {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
      for (let j = 1; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
    }
    return out;
  };
  const bez = (p0, p1, p2, p3, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, m = 1 - t; return [0, 1].map((k) => m * m * m * p0[k] + 3 * m * m * t * p1[k] + 3 * m * t * t * p2[k] + t * t * t * p3[k]); });
  const pathAt = (P, L) => { // point + tangent at arc length L on a polyline
    let acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dz);
      if (acc + l >= L || i === P.length - 2) { const u = clamp((L - acc) / (l || 1)); return [P[i][0] + dx * u, P[i][1] + dz * u, dx / (l || 1), dz / (l || 1)]; }
      acc += l;
    }
    return [P[0][0], P[0][1], 1, 0];
  };
  const pathLen = (P) => { let L = 0; for (let i = 0; i < P.length - 1; i++) L += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); return L; };
  const strip = (path, prog, o) => {
    if (prog <= 0) return [];
    const P = resample(path), L = pathLen(P), vis = L * clamp(prog), wd = o.w || 2.2, hl = Math.min(vis, o.head || 3.4), grp = GID++;
    const out = [], seg = o.seg || 3.0, body = Math.max(0, vis - hl);
    const pt = (l, side, y) => { const [x, z, tx, tz] = pathAt(P, l); return [x - tz * side, y, z + tx * side]; };
    const yAt = (i) => (i % 2 ? 0.55 : 0.07);
    let l0 = 0, i = 0;
    while (l0 < body - 0.01) {
      const l1 = Math.min(body, l0 + seg), y0 = yAt(i), y1 = l1 >= body ? 0.07 : yAt(i + 1);
      out.push(fromPts([pt(l0, -wd / 2, y0), pt(l1, -wd / 2, y1), pt(l1, wd / 2, y1), pt(l0, wd / 2, y0)], [0, 1, 0], { grp, col: o.col, print: o.print, fl: false, strip: true }));
      l0 = l1; i++;
    }
    if (hl > 0.3) {
      const hw = wd * (o.hw || 1.15);
      out.push(fromPts([pt(body, -hw, 0.07), pt(vis, 0, 0.07), pt(body, hw, 0.07)], [0, 1, 0], { grp, col: o.col, fl: false, strip: true }));
    }
    return out;
  };
  // a folded paper star rosette (ten facets around a raised centre)
  const star = (R, r, dep, cA, cB) => {
    const grp = GID++, out = [], pts = [];
    for (let k = 0; k < 10; k++) { const a = -HP + (k * PI) / 5, rr = k % 2 ? r : R; pts.push([Math.cos(a) * rr, -Math.sin(a) * rr, 0]); }
    const cen = [0, 0, -dep];
    for (let k = 0; k < 10; k++) out.push(fromPts([cen, pts[k], pts[(k + 1) % 10]], [0, 0, -1], { grp, col: k % 2 ? cA : cB, fl: false }));
    return out;
  };

  // ---------- print helpers (all prints are drawn in mm on the face) ----------
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  const txt = (c, s, x, y, size, col, align = 'center', font = '"Fredoka"', wt = 700) => {
    c.font = `${wt} ${size}px ${font}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y);
  };
  const fitTxt = (c, s, x, y, size, maxW, col, font = '"Fredoka"', wt = 700) => {
    c.font = `${wt} ${size}px ${font}`; const m = c.measureText(s).width; if (m > maxW) size *= maxW / m;
    txt(c, s, x, y, size, col, 'center', font, wt);
  };
  const dots = (c, x0, y0, x1, y1, col = 'rgba(40,40,40,0.4)', lw = 0.8, dash = [3, 3]) => {
    c.save(); c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.restore();
  };
  const partNo = (c, s, x, y, col = 'rgba(40,40,40,0.55)') => txt(c, s, x, y, 4.2, col, 'left', '"Space Mono"', 700);
  const ruler = (len) => {
    const pr = (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#dfe3e6'); g.addColorStop(0.5, '#b8bec4'); g.addColorStop(1, '#d4d8db');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 0.4; for (let y = 2; y < h; y += 1.6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(25,25,30,0.85)'; c.lineWidth = 0.5;
      for (let x = 10, i = 0; x < w - 8; x += 1, i++) { const L = i % 10 === 0 ? 9 : i % 5 === 0 ? 6 : 3.5; c.beginPath(); c.moveTo(x, h); c.lineTo(x, h - L); c.stroke(); if (i % 10 === 0 && i) txt(c, String(i / 10), x, h - 14, 5.5, 'rgba(25,25,30,0.85)', 'center', '"Space Grotesk"', 700); }
    };
    return box({ w: len, d: 3.6, h: 0.22, col: { top: '#c9ced3', side: '#5a4a3a' }, pr: { top: pr }, tabs: false });
  };
  const knife = () => {
    const out = [], fr = { o: [0, 0.62, 0], ax: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
    const knurl = (c, w, h) => { c.fillStyle = '#9aa1a8'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(40,45,50,0.55)'; c.lineWidth = 0.5; for (let x = 0; x < w; x += 1.4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); } c.fillStyle = PAL.blue; c.fillRect(w * 0.1, 0, w * 0.45, h); };
    out.push(...prism(ngon(0.62, 8, 0.39), 11, fr, '#a9b0b6', knurl, '#8d949a'));
    out.push(...prism(ngon(0.7, 8, 0.39), 1.6, { ...fr, o: [11, 0.62, 0] }, '#c7ccd1', null, '#9aa1a8'));
    out.push(fromPts([[12.6, 0.75, -0.05], [15.6, 0.7, 0], [12.6, 0.45, 0.05]], [0, 0.2, -1], { grp: GID++, col: '#e3e7ea', fl: false }));
    return out;
  };
  const glueStick = () => {
    const band = (c, w, h) => { c.fillStyle = '#f2efe8'; c.fillRect(0, 0, w, h); c.fillStyle = '#7b4fb0'; c.fillRect(w * 0.18, 0, w * 0.1, h); c.fillStyle = PAL.yellow; c.fillRect(w * 0.32, 0, w * 0.3, h); c.fillStyle = '#7b4fb0'; c.fillRect(w * 0.66, 0, w * 0.05, h); };
    const out = prism(ngon(1.5, 12), 8.5, { o: [0, 0, 0], ax: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, '#f2efe8', band, '#f2efe8');
    out.push(...prism(ngon(1.62, 12), 3.2, { o: [0, 8.5, 0], ax: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, '#7b4fb0', null, '#8e62c4'));
    return out;
  };

  const MX0 = -58, MX1 = 232, MZ0 = -34, MZ1 = 66;
  const TX0 = -170, TZ0 = -70, TS = 5, TW = 500, TD = 300;
  let MATC = null, FIB = null, SL = null, CL = null, DL = null;
  const matTex = () => {
    if (MATC) return MATC;
    const c = H.layer(TW * TS, TD * TS), g = c.getContext('2d'), X = (x) => (x - TX0) * TS, Z = (z) => (z - TZ0) * TS;
    const nz = H.makeNoise(31), r = H.rng(77);
    // walnut-ish desk: rows of grain running along x
    for (let y = 0; y < TD * TS; y += 2) {
      const z = y / TS, v = nz.n2(z * 0.35, 3.1) * 0.5 + nz.n2(z * 1.7, 9.2) * 0.25 + Math.sin(z * 0.9 + nz.n2(z * 0.05, 1) * 4) * 0.12;
      const k = 1 + v * 0.22, plank = Math.floor((z + 4) / 19);
      g.fillStyle = `rgb(${(168 + plank % 2 * 8) * k | 0},${(117 + plank % 2 * 5) * k | 0},${76 * k | 0})`; g.fillRect(0, y, c.width, 2);
    }
    for (let i = 0; i < 260; i++) { const y = r.range(0, c.height), x = r.range(0, c.width); g.strokeStyle = `rgba(${r.chance(0.5) ? '70,40,20' : '230,190,140'},${r.range(0.05, 0.14)})`; g.lineWidth = r.range(0.6, 2); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 200, y + r.range(-4, 4), x + 400, y + r.range(-4, 4), x + r.range(500, 900), y + r.range(-6, 6)); g.stroke(); }
    for (let z = -4; z < TD; z += 19) { g.fillStyle = 'rgba(40,22,10,0.45)'; g.fillRect(0, Z(z), c.width, 2); }
    // mat drop shadow + body
    g.save(); g.filter = 'blur(10px)'; g.fillStyle = 'rgba(20,10,0,0.55)'; g.beginPath(); g.roundRect(X(MX0) + 6, Z(MZ0) + 8, (MX1 - MX0) * TS, (MZ1 - MZ0) * TS, 12); g.fill(); g.restore();
    g.fillStyle = '#23573f'; g.beginPath(); g.roundRect(X(MX0), Z(MZ0), (MX1 - MX0) * TS, (MZ1 - MZ0) * TS + 3, 12); g.fill();
    g.fillStyle = '#2d6c4e'; g.beginPath(); g.roundRect(X(MX0), Z(MZ0), (MX1 - MX0) * TS, (MZ1 - MZ0) * TS, 12); g.fill();
    g.save(); g.beginPath(); g.roundRect(X(MX0), Z(MZ0), (MX1 - MX0) * TS, (MZ1 - MZ0) * TS, 12); g.clip();
    for (let i = 0; i < 520; i++) { // mottling of the vinyl
      const x = r.range(X(MX0), X(MX1)), y = r.range(Z(MZ0), Z(MZ1)), rad = r.range(20, 120), lt = r.chance(0.5);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, lt ? `rgba(120,190,150,${r.range(0.03, 0.07)})` : `rgba(10,40,25,${r.range(0.04, 0.09)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = r.chance(0.5) ? 'rgba(150,210,170,0.18)' : 'rgba(5,25,15,0.2)'; g.fillRect(r.range(X(MX0), X(MX1)), r.range(Z(MZ0), Z(MZ1)), 1, 1); }
    // healed knife cuts: mostly straight along the grid, some free
    for (let i = 0; i < 420; i++) {
      const x = r.range(X(MX0), X(MX1)), y = r.range(Z(MZ0), Z(MZ1)), L = r.range(30, 380), a = r.chance(0.6) ? r.pick([0, HP, PI / 4, -PI / 4]) + r.range(-0.03, 0.03) : r.range(0, PI);
      g.strokeStyle = `rgba(${r.chance(0.7) ? '170,220,180' : '15,45,30'},${r.range(0.08, 0.2)})`; g.lineWidth = r.range(0.5, 1.2);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    // paper offcuts and crumbs left from cutting
    const cols = [PAL.orange, PAL.yellow, PAL.blue, '#e9e2d0', PAL.red, PAL.ginger];
    for (let i = 0; i < 46; i++) {
      const x = r.range(MX0 + 4, MX1 - 4), z = r.range(MZ0 + 10, MZ1 - 4), s = r.range(0.35, 1.0), a = r.range(0, PI * 2);
      g.save(); g.translate(X(x), Z(z)); g.rotate(a);
      const pts = r.chance(0.5) ? [[0, 0], [s * 3, 0], [s * 1.2, s * 1.4]] : [[0, 0], [s * 4.5, 0.2], [s * 4.4, s * 0.6], [0.1, s * 0.5]];
      g.fillStyle = 'rgba(0,20,10,0.35)'; g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px * TS + 2, py * TS + 2) : g.moveTo(px * TS + 2, py * TS + 2))); g.fill();
      g.fillStyle = r.pick(cols); g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px * TS, py * TS) : g.moveTo(px * TS, py * TS))); g.fill();
      g.restore();
    }
    // border printing: numbers along the far and left edges
    g.fillStyle = 'rgba(214,232,180,0.75)'; g.font = `700 ${1.7 * TS}px "Space Grotesk"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let x = MX0 + 5, i = 1; x < MX1 - 2; x += 5, i++) g.fillText(String(i * 5 - 5), X(x), Z(MZ1 - 1.6));
    for (let z = MZ0 + 5, i = 1; z < MZ1 - 2; z += 5, i++) g.fillText(String(i), X(MX0 + 1.6), Z(z));
    g.restore();
    MATC = c; return c;
  };
  const fibre = () => {
    if (FIB) return FIB;
    const c = H.layer(256, 256), g = c.getContext('2d'), r = H.rng(5);
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) { const x = r.range(0, 256), y = r.range(0, 256), a = r.range(0, PI), L = r.range(2, 9); g.strokeStyle = `rgba(${r.chance(0.3) ? '150,120,90' : '120,115,105'},${r.range(0.05, 0.16)})`; g.lineWidth = r.range(0.3, 0.8); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + r.range(-1, 1), y + Math.sin(a) * L * 0.5 + r.range(-1, 1), x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(110,100,90,${r.range(0.04, 0.12)})`; g.fillRect(r.range(0, 256), r.range(0, 256), 0.8, 0.8); }
    FIB = c; return c;
  };

  const drawMat = (ctx, cam, W, Hh) => {
    const tex = matTex(), step = 2;
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(0, 0, W, Hh);
    for (let sy = 0; sy < Hh; sy += step) {
      const a = cam.ground(sy), b = cam.ground(sy + step), m = cam.ground(sy + step / 2);
      if (!a || !b || !m) continue;
      const half = ((W / 2) * m.s) / cam.F, x0 = cam.C[0] - half;
      ctx.drawImage(tex, (x0 - TX0) * TS, (b.z - TZ0) * TS, 2 * half * TS, Math.max(0.6, (a.z - b.z) * TS), 0, sy, W, step + 0.6);
    }
    // crisp printed grid (1 cm lines, bolder every 5 cm, 45-degree guides)
    const gN = cam.ground(Hh), gF = cam.ground(0) || cam.ground(Hh * 0.05);
    const zN = Math.max(MZ0 + 0.6, gN.z), zF = Math.min(MZ1 - 0.6, gF.z), xh = ((W / 2) * gF.s) / cam.F;
    const xa = Math.max(MX0 + 0.6, cam.C[0] - xh), xb = Math.min(MX1 - 0.6, cam.C[0] + xh);
    const seg = (ax, az, bx, bz) => { const p = cam.proj([ax, 0, az]), q = cam.proj([bx, 0, bz]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
    ctx.save(); ctx.lineCap = 'butt';
    for (const major of [false, true]) {
      ctx.beginPath();
      for (let x = Math.ceil(xa); x <= xb; x++) if ((Math.abs(x) % 5 === 0) === major) seg(x, zN, x, zF);
      for (let z = Math.ceil(zN); z <= zF; z++) if ((Math.abs(z) % 5 === 0) === major) seg(xa, z, xb, z);
      ctx.strokeStyle = major ? 'rgba(222,238,184,0.42)' : 'rgba(205,230,170,0.2)'; ctx.lineWidth = major ? 1.35 : 0.9; ctx.stroke();
    }
    ctx.beginPath(); // diagonal guides, clipped to the mat
    for (let k = -300; k < 400; k += 50) {
      const z0 = MZ0 + 0.6, z1 = MZ1 - 0.6, xs = k + z0, xe = k + z1;
      const A = [clamp(xs, MX0, MX1), 0], B = [clamp(xe, MX0, MX1), 0]; A[1] = A[0] - k; B[1] = B[0] - k;
      const za = clamp(A[1], zN, zF), zb = clamp(B[1], zN, zF);
      if (zb - za > 0.5) seg(za + k, za, zb + k, zb);
    }
    ctx.strokeStyle = 'rgba(222,238,184,0.22)'; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
    // depth of field: far mat (and the desk) softly out of focus
    if (!DL) DL = H.layer(W / 2, Hh / 2);
    const d = DL.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W / 2, Hh / 2);
    d.filter = 'blur(2.2px)'; d.drawImage(ctx.canvas, 0, 0, W / 2, Hh / 2); d.filter = 'none';
    const gm = d.createLinearGradient(0, 0, 0, Hh / 2); gm.addColorStop(0, 'rgba(0,0,0,1)'); gm.addColorStop(0.36, 'rgba(0,0,0,0.6)'); gm.addColorStop(0.55, 'rgba(0,0,0,0)'); gm.addColorStop(0.85, 'rgba(0,0,0,0)'); gm.addColorStop(1, 'rgba(0,0,0,0.65)');
    d.globalCompositeOperation = 'destination-in'; d.fillStyle = gm; d.fillRect(0, 0, W / 2, Hh / 2);
    ctx.drawImage(DL, 0, 0, W, Hh);
  };

  // hull for shadows
  const hull = (pts) => {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return P;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };

  const drawFace = (ctx, cam, it) => {
    const { f, sp, front } = it, n = front ? f.n : mul(f.n, -1), lam = Math.max(0, dot(n, LIGHT));
    const path = () => { ctx.beginPath(); sp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
    path();
    ctx.fillStyle = front ? f.col : f.bcol || PAL.back; ctx.fill();
    ctx.save(); ctx.clip();
    // affine print frame (mm), fitted at the face centre
    const cl = [f.pw / 2, f.ph / 2], p0 = cam.proj(P3(f, cl)), pu = cam.proj(P3(f, [cl[0] + 1, cl[1]])), pv = cam.proj(P3(f, [cl[0], cl[1] + 1]));
    const a = [pu[0] - p0[0], pu[1] - p0[1]], b = [pv[0] - p0[0], pv[1] - p0[1]];
    ctx.transform(a[0], a[1], b[0], b[1], p0[0] - a[0] * cl[0] - b[0] * cl[1], p0[1] - a[1] * cl[0] - b[1] * cl[1]);
    ctx.scale(0.1, 0.1);
    const W10 = f.pw * 10, H10 = f.ph * 10;
    if (!front) { ctx.translate(W10, 0); ctx.scale(-1, 1); }
    const pr = front ? f.print : f.bprint;
    if (pr) pr(ctx, W10, H10, f);
    if (front && f.hinge && f.fl !== false) dots(ctx, 0, 1.2, W10, 1.2, 'rgba(60,45,30,0.42)', 0.9, [4, 3.5]);
    // paper fibre (moves with the face)
    if (!f.noFib) {
      if (!it.pat) { const pt = ctx.createPattern(fibre(), 'repeat'); pt.setTransform(new DOMMatrix([0.45, 0, 0, 0.45, (f.grp * 37) % 100, (f.grp * 53) % 100])); FIBP = pt; }
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.9; ctx.fillStyle = FIBP; ctx.fillRect(0, 0, W10, H10);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // per-face Lambert shading with a warm key and cool fill
    const s = 0.6 + 0.08 * n[1] + 0.52 * lam;
    path();
    if (s < 1) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${255 * Math.min(1, s * (1.0 + 0.05 * lam)) | 0},${255 * Math.min(1, s * 0.985) | 0},${255 * Math.min(1, s * (0.94 + 0.1 * (1 - lam))) | 0})`; ctx.fill();
    } else { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,232,195,${(s - 1) * 0.7})`; ctx.fill(); }
    // ambient occlusion where walls meet the mat
    if (it.minY < 0.4 && Math.abs(n[1]) < 0.6) {
      const g0 = it.lowPt, g1 = cam.proj(add(P3(f, [0, 0]), [0, 0, 0]));
      const q0 = cam.proj([g0[0], 0, g0[2]]), q1 = cam.proj([g0[0], 2.5, g0[2]]);
      const gr = ctx.createLinearGradient(q0[0], q0[1], q1[0], q1[1]); gr.addColorStop(0, 'rgba(90,100,90,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = gr; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
      void g1;
    }
    ctx.globalCompositeOperation = 'source-over';
    // soft light cut edges / creases (white core of the card)
    ctx.strokeStyle = `rgba(255,247,230,${0.22 + 0.4 * lam})`; ctx.lineWidth = 1.05; ctx.lineJoin = 'round'; ctx.stroke();
  };
  let FIBP = null;

  // the whole frame: mat -> flat pieces -> shadows -> standing pieces (painter's sort) -> light
  const renderScene = (ctx, W, Hh, cam, faces, tt) => {
    FIBP = null;
    drawMat(ctx, cam, W, Hh);
    const items = [], groups = new Map();
    for (const f of faces) {
      const wp = f.poly.map((p) => P3(f, p)), sp = wp.map(cam.proj);
      let ok = true, zs = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, maxY = -1e9, minY = 1e9, low = wp[0];
      for (let i = 0; i < sp.length; i++) {
        const p = sp[i]; if (p[2] < 3) ok = false; zs += p[2];
        minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
        maxY = Math.max(maxY, wp[i][1]); if (wp[i][1] < minY) { minY = wp[i][1]; low = wp[i]; }
      }
      if (!ok) continue;
      if (!groups.has(f.grp)) groups.set(f.grp, []);
      groups.get(f.grp).push(...wp);
      if (maxx < -40 || minx > W + 40 || maxy < -40 || miny > Hh + 40) continue;
      const cen = wp.reduce((s, p) => add(s, p), [0, 0, 0]).map((v) => v / wp.length);
      const front = dot(f.n, sub(cam.C, cen)) > 0;
      if (!front && f.closed) continue;
      items.push({ f, sp, front, depth: zs / sp.length + (f.bias || 0), ground: maxY < 0.8, minY, lowPt: [cen[0], 0, cen[2]] });
    }
    const ground = items.filter((i) => i.ground).sort((a, b) => b.depth - a.depth);
    const stand = items.filter((i) => !i.ground).sort((a, b) => (a.front !== b.front ? (a.front ? 1 : -1) : b.depth - a.depth));
    ground.forEach((it) => drawFace(ctx, cam, it));
    // shadows: each group's vertices projected along the light onto the mat (soft), plus a tight contact shadow
    if (!SL) { SL = H.layer(W / 2, Hh / 2); CL = H.layer(W / 2, Hh / 2); }
    const sg = SL.getContext('2d'), cg = CL.getContext('2d');
    [sg, cg].forEach((g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W / 2, Hh / 2); g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.fillStyle = '#06140c'; });
    for (const [, pts] of groups) {
      let top = -1e9; for (const p of pts) top = Math.max(top, p[1]);
      if (top < 0.8) continue;
      const sh = hull(pts.map((p) => { const q = cam.proj([p[0] - (LIGHT[0] / LIGHT[1]) * p[1], 0, p[2] - (LIGHT[2] / LIGHT[1]) * p[1]]); return [q[0], q[1]]; }));
      sg.beginPath(); sh.forEach((p, i) => (i ? sg.lineTo(p[0], p[1]) : sg.moveTo(p[0], p[1]))); sg.fill();
      const lowp = pts.filter((p) => p[1] < 0.7);
      if (lowp.length > 2) { const ch = hull(lowp.map((p) => { const q = cam.proj([p[0] + 0.25, 0, p[2] + 0.35]); return [q[0], q[1]]; })); cg.beginPath(); ch.forEach((p, i) => (i ? cg.lineTo(p[0], p[1]) : cg.moveTo(p[0], p[1]))); cg.fill(); }
    }
    ctx.save(); ctx.filter = 'blur(7px)'; ctx.globalAlpha = 0.42; ctx.drawImage(SL, 0, 0, W, Hh); ctx.filter = 'blur(2px)'; ctx.globalAlpha = 0.5; ctx.drawImage(CL, 0, 0, W, Hh); ctx.restore();
    stand.forEach((it) => drawFace(ctx, cam, it));
    // warm key-light pool and lens falloff
    ctx.save();
    const lp = ctx.createRadialGradient(W * 0.38, Hh * 0.35, 40, W * 0.45, Hh * 0.45, W * 0.75);
    lp.addColorStop(0, 'rgba(255,214,150,0.16)'); lp.addColorStop(0.6, 'rgba(255,200,140,0.04)'); lp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = lp; ctx.fillRect(0, 0, W, Hh);
    ctx.globalCompositeOperation = 'source-over';
    H.vignette(ctx, W, Hh, 0.42, '20,12,4');
    ctx.restore();
    H.grain(ctx, W, Hh, 0.03, 3 + Math.floor(tt * 12) % 7);
  };

  // stop-motion jitter: a model is nudged a hair every time the animator touches the set (on twos)
  const jit = (id, tq, amp = 0.05) => { const r = H.rng(id * 977 + Math.floor(tq * 12 + 1e-6) * 13); return [r.range(-amp, amp), r.range(-amp, amp), r.range(-amp, amp) * 0.12]; };
  const place = (faces, id, tq, x, y, z, yaw = 0, s = 1, amp = 0.04) => { const j = jit(id, tq, amp); return xf(faces, [x + j[0], y, z + j[1]], yaw + j[2], s); };


window.PAPER={makeCam,camAt,box,tent,flat,prism,ngon,fromPts,xf,place,strip,bez,star,txt,fitTxt,dots,partNo,ruler,knife,glueStick,renderScene,PAL,reset:()=>{GID=1;}};
})();
