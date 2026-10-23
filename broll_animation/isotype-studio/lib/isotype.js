/* Pictograms and lithographic finish adapted from the supplied document. */
(()=>{
  // ISOTYPE (Neurath / Arntz, Vienna Method) pictorial statistics.
  const PAPER = '#EFE7D4', INK = '#26231F', BLUE = '#294C63', RED = '#C2432C', OCHRE = '#D49A33';
  // Arntz-style standing figure in a 26 x 44 box, origin top-left
  function person(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(13, 5.2, 5.2, 0, Math.PI * 2);
    // torso with arms (one silhouette), rounded shoulders
    ctx.moveTo(4.5, 12.5);
    ctx.quadraticCurveTo(13, 10.6, 21.5, 12.5);
    ctx.quadraticCurveTo(25.5, 13.4, 25.5, 17.5);
    ctx.lineTo(25.5, 28.5); ctx.lineTo(22.5, 28.5); ctx.lineTo(22.2, 19.5);
    ctx.lineTo(21.0, 19.5); ctx.lineTo(20.8, 28.5);
    // legs
    ctx.lineTo(20.8, 44); ctx.lineTo(14.2, 44); ctx.lineTo(13.6, 30.5); ctx.lineTo(12.4, 30.5); ctx.lineTo(11.8, 44); ctx.lineTo(5.2, 44);
    ctx.lineTo(5.2, 28.5); ctx.lineTo(5.0, 19.5); ctx.lineTo(3.8, 19.5); ctx.lineTo(3.5, 28.5); ctx.lineTo(0.5, 28.5);
    ctx.lineTo(0.5, 17.5); ctx.quadraticCurveTo(0.5, 13.4, 4.5, 12.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // compute unit: Arntz-style computer (monitor + keyboard) in a 32 x 44 box
  function chip(ctx, x, y, s, bg) {
    const ink = ctx.fillStyle;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // monitor body
    ctx.beginPath();
    ctx.moveTo(2, 4); ctx.lineTo(30, 4); ctx.quadraticCurveTo(32, 4, 32, 6); ctx.lineTo(32, 27);
    ctx.quadraticCurveTo(32, 29, 30, 29); ctx.lineTo(2, 29); ctx.quadraticCurveTo(0, 29, 0, 27); ctx.lineTo(0, 6);
    ctx.quadraticCurveTo(0, 4, 2, 4); ctx.closePath(); ctx.fill();
    // neck + foot
    ctx.fillRect(12.5, 29, 7, 5); ctx.fillRect(8, 33, 16, 2.5);
    // keyboard slab
    ctx.beginPath(); ctx.moveTo(3, 44); ctx.lineTo(6, 38.5); ctx.lineTo(26, 38.5); ctx.lineTo(29, 44); ctx.closePath(); ctx.fill();
    // screen (negative space) with a single bright prompt line
    ctx.fillStyle = bg; ctx.fillRect(4, 8, 24, 17);
    ctx.fillStyle = ink; ctx.fillRect(7, 11, 10, 2.6); ctx.fillRect(7, 16, 14, 2.6); ctx.fillRect(7, 21, 6, 2.6);
    ctx.restore();
  }
  // data-centre (factory-like silhouette) for the key
  function factory(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 44); ctx.lineTo(0, 22); ctx.lineTo(9, 16); ctx.lineTo(9, 22); ctx.lineTo(18, 16); ctx.lineTo(18, 22);
    ctx.lineTo(27, 16); ctx.lineTo(27, 6); ctx.lineTo(33, 6); ctx.lineTo(33, 44); ctx.closePath();
    ctx.fill(); ctx.restore();
  }
  // ---- explainer pictograms (Arntz-style flat silhouettes) ----
  function catPic(ctx, x, y, s, bg) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(14, 12, 7.5, 0, 7);
    ctx.moveTo(7.2, 9); ctx.lineTo(8, -0.5); ctx.lineTo(13, 5); ctx.closePath();
    ctx.moveTo(20.8, 9); ctx.lineTo(20, -0.5); ctx.lineTo(15, 5); ctx.closePath();
    ctx.moveTo(8.5, 19); ctx.bezierCurveTo(1, 28, 2, 44, 5, 44); ctx.lineTo(23, 44); ctx.bezierCurveTo(26, 44, 27, 28, 19.5, 19); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); ctx.moveTo(22, 42); ctx.quadraticCurveTo(32, 40, 29, 28); ctx.stroke();
    ctx.fillStyle = bg; ctx.fillRect(13.3, 31, 1.4, 13);
    ctx.beginPath(); ctx.arc(11, 11.5, 1.3, 0, 7); ctx.arc(17, 11.5, 1.3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function dogPic(ctx, x, y, s, bg) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(7, 6); ctx.quadraticCurveTo(7, 1, 13, 1); ctx.lineTo(19, 1); ctx.quadraticCurveTo(23, 1, 23, 6); ctx.lineTo(23, 9); ctx.lineTo(30, 10); ctx.quadraticCurveTo(32, 14, 29, 17); ctx.lineTo(21, 18);
    ctx.bezierCurveTo(27, 26, 27, 44, 24, 44); ctx.lineTo(5, 44); ctx.bezierCurveTo(2, 44, 1, 28, 8, 18); ctx.quadraticCurveTo(6, 12, 7, 6); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); ctx.moveTo(5, 40); ctx.quadraticCurveTo(-3, 36, -1, 27); ctx.stroke();
    ctx.fillStyle = bg; ctx.fillRect(14.3, 31, 1.4, 13);
    ctx.beginPath(); ctx.arc(18, 7.5, 1.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(4, 9, 7, 16); ctx.lineTo(9.5, 15); ctx.quadraticCurveTo(8.5, 9, 10.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // flat ISOTYPE arrow (shaft + head), optionally curved via a quadratic control point
  function flatArrow(ctx, x0, y0, x1, y1, w, p = 1, cx = null, cy = null) {
    if (p <= 0) return;
    const pts = [];
    const n = 30;
    for (let k = 0; k <= n * p; k++) {
      const u = k / n;
      if (cx === null) pts.push([H.lerp(x0, x1, u), H.lerp(y0, y1, u)]);
      else { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; pts.push([a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1]); }
    }
    if (pts.length < 2) return;
    const [ex, ey] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
    const an = Math.atan2(ey - py, ex - px);
    ctx.save(); ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); pts.slice(0, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(ex - Math.cos(an) * w * 0.9, ey - Math.sin(an) * w * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + Math.cos(an) * w * 0.9, ey + Math.sin(an) * w * 0.9);
    ctx.lineTo(ex - Math.cos(an) * w * 0.9 + Math.cos(an + Math.PI / 2) * w * 1.25, ey - Math.sin(an) * w * 0.9 + Math.sin(an + Math.PI / 2) * w * 1.25);
    ctx.lineTo(ex - Math.cos(an) * w * 0.9 - Math.cos(an + Math.PI / 2) * w * 1.25, ey - Math.sin(an) * w * 0.9 - Math.sin(an + Math.PI / 2) * w * 1.25);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function checkPic(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(11, 31); ctx.lineTo(30, 6); ctx.stroke(); ctx.restore(); }
  function crossPic(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(29, 29); ctx.moveTo(29, 3); ctx.lineTo(3, 29); ctx.stroke(); ctx.restore(); }
  // ---- litho finish, cached once per size ----
  // paper mottle: one fbm per 4x4 px, drawn upscaled with smoothing (no blocky squares, no per-frame noise)
  const MOTTLE = {};
  function mottle(W, H_, oct) {
    const key = W + 'x' + H_ + 'x' + oct;
    if (MOTTLE[key]) return MOTTLE[key];
    const w = Math.ceil(W / 4), h = Math.ceil(H_ / 4), L = H.layer(w, h), c = L.getContext('2d'), id = c.createImageData(w, h);
    const nz = H.makeNoise(4);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = nz.fbm2((i * 4 + 2) * 0.006, (j * 4 + 2) * 0.006, oct), o = (j * w + i) * 4;
      id.data[o] = 150; id.data[o + 1] = 120; id.data[o + 2] = 80; id.data[o + 3] = v > 0.05 ? Math.min(255, (v - 0.05) * 0.06 * 255) : 0;
    }
    c.putImageData(id, 0, 0);
    return (MOTTLE[key] = L);
  }
  function lithoFinish(ctx, W, H_, oct) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mottle(W, H_, oct), 0, 0, W, H_); ctx.restore();
  }
  // ink film wear: where the litho ink did not fully take. Low-frequency density drift + fine pinholes and a few
  // dry streaks, removed from the ink layer with destination-out so paper shows through the flat fills.
  const WEAR = {};
  function wear(W, H_) {
    const key = W + 'x' + H_;
    if (WEAR[key]) return WEAR[key];
    const L = H.layer(W, H_), c = L.getContext('2d');
    const w = Math.ceil(W / 3), h = Math.ceil(H_ / 3), S = H.layer(w, h), sc = S.getContext('2d'), id = sc.createImageData(w, h);
    const nz = H.makeNoise(23), rf = H.rng(5);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = nz.fbm2(i * 0.05, j * 0.05, 3), f = nz.n2(i * 0.6 + 40, j * 0.6), o = (j * w + i) * 4;
      // coarse density drift + an 'orange-peel' fine stipple where the ink film is thin
      const a = Math.max(0, v * 0.5 + 0.5 - 0.4) * 0.34 + Math.max(0, f) * 0.07 + rf() * 0.035;
      id.data[o + 3] = Math.min(255, a * 255);
    }
    sc.putImageData(id, 0, 0);
    c.imageSmoothingEnabled = true; c.drawImage(S, 0, 0, W, H_);
    const r = H.rng(77);
    c.fillStyle = '#000';
    for (let n = 0; n < W * H_ * 0.0016; n++) {   // pinholes
      const x = r() * W, y = r() * H_, rr = 0.5 + r() * r() * 1.4;
      c.globalAlpha = 0.25 + r() * 0.55; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
    }
    c.globalAlpha = 0.09;
    for (let n = 0; n < 140; n++) {               // faint horizontal roller streaks
      const x = r() * W, y = r() * H_; c.fillRect(x, y, 20 + r() * 90, 0.8 + r() * 0.8);
    }
    c.globalAlpha = 1;
    return (WEAR[key] = L);
  }
  const INKL = {};
  function inkLayer(W, H_) {
    const key = W + 'x' + H_;
    const L = INKL[key] || (INKL[key] = H.layer(W, H_)), c = L.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H_);
    return L;
  }
  function printInk(out, L, W, H_) {
    const c = L.getContext('2d');
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'destination-out'; c.drawImage(wear(W, H_), 0, 0); c.restore();
    out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.drawImage(L, 0, 0); out.restore();
  }
  function spaced(ctx, str, x, y, track, align) {
    let w = 0; for (const ch of str) w += ctx.measureText(ch).width + track; w -= track;
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.textAlign = 'left';
    for (const ch of str) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + track; }
  }

window.ISOTYPE={PAPER,INK,BLUE,RED,OCHRE,person,flatArrow,inkLayer,printInk,lithoFinish,spaced};
})();
