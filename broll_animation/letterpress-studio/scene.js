(()=>{'use strict';
  // ---------- Wood-type letterpress broadside: 2 inks, per-block wear, wood grain, deboss ----------
  const PAPER = [238, 226, 198];
  const INKS = { black: [30, 27, 26], red: [206, 58, 36] };

  // cream rag stock: cloudy formation, irregular (patchy) fibre streaks and fine tooth, slight warm/cool drift
  const paperBase = (px, W, H_) => {
    const nz = H.makeNoise(17), img = px.createImageData(W, H_), d = img.data;
    // low-frequency fields on a 4px grid (bilinear), fine streak + tooth per pixel
    const GS = 4, gw = Math.ceil(W / GS) + 2, gh = Math.ceil(H_ / GS) + 2, G = new Float32Array(gw * gh * 3);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const x = gx * GS, y = gy * GS, j = (gy * gw + gx) * 3; G[j] = nz.fbm2(x * 0.006, y * 0.006, 4); G[j + 1] = nz.fbm2(x * 0.035, y * 0.028, 2); G[j + 2] = 0.5 + 0.5 * nz.n2(x * 0.01 + 40, y * 0.01); }
    for (let y = 0; y < H_; y++) {
      const gy = (y / GS) | 0, fy = (y % GS) / GS;
      for (let x = 0; x < W; x++) {
        const gx = (x / GS) | 0, fx = (x % GS) / GS, j00 = (gy * gw + gx) * 3, j01 = j00 + 3, j10 = j00 + gw * 3, j11 = j10 + 3;
        const bl = (c) => (G[j00 + c] * (1 - fx) + G[j01 + c] * fx) * (1 - fy) + (G[j10 + c] * (1 - fx) + G[j11 + c] * fx) * fy;
        const cl = bl(0), md = bl(1), streak = nz.n2(x * 0.16, y * 0.035) * bl(2);
        let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
        const v = 1 + cl * 0.045 + md * 0.018 + streak * 0.022 + ((h >>> 0) / 4294967296 - 0.5) * 0.035, warm = cl * 6, i = (y * W + x) * 4;
        d[i] = PAPER[0] * v + warm; d[i + 1] = PAPER[1] * v + warm * 0.4; d[i + 2] = PAPER[2] * v - warm * 0.6; d[i + 3] = 255;
      }
    }
    px.putImageData(img, 0, 0);
  };
  let HP = null; // hero paper cache

  // each glyph/ornament is a separate "block": colour encodes (id, density, grain phase)
  let nextId = 1, CT = 0;
  // timing: a block is invisible (but still consumes its random draws) until pressed, then lands with a small 'kiss'
  const stamp = (x, t0) => { x.globalAlpha = CT >= t0 ? 1 : 0; return 1 + 0.14 * (1 - H.ease.out(H.clamp((CT - t0) / 0.1))); };
  const blockStyle = (r, dens, grain) => `rgb(${(nextId++ % 250) + 1},${Math.round(dens * 255)},${grain ? Math.round(r.range(30, 255)) : 0})`;

  const setType = (x, r, text, font, cx, baseline, targetW, capH, opt = {}) => {
    const sp = opt.spacing || 0, grain = opt.grain !== false;
    x.font = `${font.split('|')[0]} 200px ${font.split('|')[1]}`;
    const capM = x.measureText('H'), cap = capM.actualBoundingBoxAscent;
    const ws = [...text].map((ch) => x.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
    const sx = targetW / total, sy = capH / cap;
    let acc = cx - targetW / 2;
    [...text].forEach((ch, i) => {
      const w = ws[i] * sx;
      if (ch !== ' ') {
        x.save();
        const k = stamp(x, (opt.t0 ?? 0) + i * (opt.dt ?? 0));
        x.translate(acc + w / 2, baseline + r.range(-1.6, 1.6) * (opt.jit ?? 1));
        x.rotate(r.range(-0.006, 0.006) * (opt.jit ?? 1)); x.translate(0, -capH / 2); x.scale(k, k); x.translate(0, capH / 2); x.scale(sx, sy);
        x.fillStyle = blockStyle(r, r.range(0.72, 1), grain);
        x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        x.fillText(ch, 0, 0);
        x.restore();
      }
      x.globalAlpha = 1;
      acc += w + sp * sx;
    });
  };

  const rule = (x, r, x0, x1, y, h, t0 = 0) => { x.fillStyle = blockStyle(r, r.range(0.85, 1), false); stamp(x, t0); x.fillRect(x0, y, x1 - x0, h); x.globalAlpha = 1; };
  const diamond = (x, r, cx, cy, s0, t0 = 0) => { x.fillStyle = blockStyle(r, r.range(0.8, 1), false); const s = s0 * stamp(x, t0); x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.7, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s * 0.7, cy); x.closePath(); x.fill(); x.globalAlpha = 1; };
  const star = (x, r, cx, cy, s0, t0 = 0) => { x.fillStyle = blockStyle(r, r.range(0.8, 1), false); const s = s0 * stamp(x, t0); x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? s * 0.42 : s; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); x.globalAlpha = 1; };
  const gear = (x, r, cx, cy, R0, teeth, rot, t0 = 0) => {
    x.fillStyle = blockStyle(r, r.range(0.85, 1), true);
    const R = R0 * stamp(x, t0);
    x.beginPath();
    for (let i = 0; i < teeth * 4; i++) {
      const a = rot + (i / (teeth * 4)) * Math.PI * 2, q = i % 4, rr = q === 0 || q === 1 ? R : R * 0.8;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath();
    x.moveTo(cx + R * 0.32, cy); x.arc(cx, cy, R * 0.32, 0, Math.PI * 2, true);
    x.fill('evenodd');
    // spokes cut-outs
    x.save(); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2 + Math.PI / 4; x.beginPath(); x.arc(cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52, R * 0.13, 0, 7); x.fill(); }
    x.restore(); x.globalAlpha = 1;
  };

  // ================= EXPLAINER: five proofs pulled off the press, one per beat =================
  const XE2 = H.ease, xcl = H.clamp, xseg = (t, a, b) => xcl((t - a) / (b - a));
  const SHEETS = [0, 5, 10], SWAP = 0.6;
  let LPX = null;
  const lph = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const fmtC = (n) => Math.round(n).toLocaleString('en-US');


const forme=(si,b,rd,t)=>{const r=H.rng(2026+si),T=SHEETS[si];
rule(b,r,65,1215,40,8,T+.1);rule(rd,r,65,1215,56,3,T+.2);
rule(b,r,65,1215,665,8,T+2.9);rule(rd,r,65,1215,651,3,T+3);
setType(rd,r,['THE FIRST PROOF','AT THE TYPE CASE','THE FINISHED PRINT'][si],'700|"Oswald"',640,112,540,34,{spacing:12,grain:false,t0:T+.65,dt:.025});
if(si===0){
setType(b,r,'GOOD IDEAS','400|"Anton"',640,315,1080,155,{spacing:9,t0:T+1.2,dt:.08});
setType(rd,r,'start small','700|"Libre Baskerville"',640,478,950,100,{spacing:3,t0:T+2.15,dt:.045});
setType(b,r,'ONE THOUGHT. ONE BLANK SHEET.','700|"Oswald"',640,588,800,36,{spacing:10,grain:false,t0:T+2.8,dt:.015});}
if(si===1){
setType(b,r,'SET THE TYPE','400|"Anton"',640,300,1080,145,{spacing:8,t0:T+.9,dt:.065});
setType(rd,r,'make your mark','700|"Libre Baskerville"',640,467,1050,90,{spacing:2,t0:T+1.9,dt:.045});
setType(b,r,'LETTER BY LETTER. LINE BY LINE.','700|"Oswald"',640,582,850,38,{spacing:8,grain:false,t0:T+2.7,dt:.015});}
if(si===2){
setType(b,r,'MAKE SOMETHING','400|"Anton"',640,312,1090,153,{spacing:8,t0:T+.9,dt:.065});
setType(rd,r,'worth sharing','700|"Libre Baskerville"',640,484,1040,105,{spacing:3,t0:T+2,dt:.045});
setType(b,r,'AN ORIGINAL LETTERPRESS STUDY','700|"Oswald"',640,589,820,34,{spacing:10,grain:false,t0:T+2.8,dt:.015});}
for(let i=0;i<13;i++)diamond(rd,r,640+(i-6)*38,625,i%2?4:7,T+3.15+Math.abs(i-6)*.025);
star(rd,r,150,106,18,T+.7);star(rd,r,1130,106,18,T+1.1);
};
  const renderSheet = (W, H_, si, t) => {
    if (!LPX) {
      const pc = H.layer(W, H_), px = pc.getContext('2d'), r = H.rng(2026);
      paperBase(px, W, H_);
      for (let i = 0; i < 260; i++) { const x0 = r.range(0, W), y0 = r.range(0, H_), a = r.range(0, 6.28), l = r.range(4, 22); px.strokeStyle = `rgba(${r.chance(0.5) ? '120,95,60' : '255,250,235'},${r.range(0.1, 0.3)})`; px.lineWidth = r.range(0.4, 1.1); px.beginPath(); px.moveTo(x0, y0); px.quadraticCurveTo(x0 + Math.cos(a + 0.5) * l * 0.6, y0 + Math.sin(a + 0.5) * l * 0.6, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); px.stroke(); }
      H.vignette(px, W, H_, 0.18, '120,85,40');
      const nz = H.makeNoise(33), GW = 427, GH = 240, fld = new Float32Array(GW * GH * 3);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const j = (y * GW + x) * 3; fld[j] = nz.fbm2(x * 0.05, y * 0.05, 3); fld[j + 1] = nz.fbm2(x * 0.6, y * 0.6, 2); fld[j + 2] = nz.fbm2(x * 0.012, y * 0.35, 2); }
      LPX = { paper: px.getImageData(0, 0, W, H_).data, fld, GW, GH, nz };
    }
    const { paper, fld, GW, GH, nz } = LPX;
    nextId = 1; CT = t;
    const blk = H.layer(W, H_), b = blk.getContext('2d'), red = H.layer(W, H_), rd = red.getContext('2d');
    forme(si, b, rd, t);
    const redShift = H.layer(W, H_), rs = redShift.getContext('2d'); rs.translate(W / 2, H_ / 2); rs.rotate([0.0015, -0.0011, 0.0013, -0.0015, 0.0009][si]); rs.translate(-W / 2, -H_ / 2); rs.drawImage(red, 2.5, -1.5);
    const bk = b.getImageData(0, 0, W, H_).data, rk = rs.getImageData(0, 0, W, H_).data;
    const blurOf = (c, px) => { const o = H.layer(W, H_), ox = o.getContext('2d'); ox.filter = `blur(${px}px)`; ox.drawImage(c, 0, 0); return ox.getImageData(0, 0, W, H_).data; };
    const both = H.layer(W, H_), bx = both.getContext('2d'); bx.drawImage(blk, 0, 0); bx.drawImage(redShift, 0, 0);
    const bb = blurOf(both, 2.2), bkB = blurOf(blk, 1.6), rkB = blurOf(redShift, 1.6);
    const samp = (x, y, c) => fld[(((y * GH / H_) | 0) * GW + ((x * GW / W) | 0)) * 3 + c];
    const inkPass = (i, x, y, m, mB, s) => {
      const a = m[i + 3] / 255; if (a < 0.02) return 0;
      const dens0 = m[i + 1] / 255, phase = m[i + 2] / 255, broad = samp(x, y, 0), fine = samp(x, y, 1), ab = mB[i + 3] / 255;
      let cov = xcl((Math.min(a, ab * 1.15) - (0.5 + fine * 0.45 + (lph(x, y, s) - 0.5) * 0.2)) * 2.6 + 0.5);
      if (cov <= 0) return 0;
      let dens = (0.25 + dens0 * 0.85) * (0.97 + broad * 0.22) + (lph(x, y, s + 1) - 0.5) * 0.08;
      const sq = xcl((a - ab) * 3.5); // ink squeezed to the rim of the block
      if (phase > 0) { const gv = Math.sin((y + samp(x, y, 2) * 40 + phase * 30) * 0.9 + Math.sin(x * 0.01 + phase * 9) * 2.5); dens *= 1 - 0.3 * H.smooth(0.55, 1, gv * 0.5 + nz.n2(x * 0.004 + phase * 7, y * 0.22) * 0.8); }
      if (lph(x, y, s + 2) < 0.004 + Math.max(0, -broad - 0.15) * 0.35 + Math.max(0, fine - 0.3) * 0.2) dens *= 0.25;
      dens = dens * (1 - sq * 0.5) + sq * 0.5 * Math.max(dens, 1.06) + sq * 0.12;
      return cov * xcl(dens);
    };
    const out = new ImageData(W, H_), d = out.data;
    for (let y = 0; y < H_; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let cr = paper[i], cg = paper[i + 1], cb = paper[i + 2];
      const gA = (y > 2 && y < H_ - 3 && x > 2 && x < W - 3) ? bb[i + 3 + (W + 1) * 8] - bb[i + 3 - (W + 1) * 8] : 0;
      // directional bite: shadowed upper-left wall, only a soft light on the lower-right (no pale all-round halo)
      const k = (1 - Math.max(gA, 0) / 255 * 0.14 - Math.min(gA, 0) / 255 * 0.04) * (1 - (bb[i + 3] / 255) * 0.05); cr *= k; cg *= k; cb *= k;
      const cR = inkPass(i, x, y, rk, rkB, 10);
      if (cR) { cr *= 1 - cR * (1 - INKS.red[0] / 255); cg *= 1 - cR * (1 - INKS.red[1] / 255); cb *= 1 - cR * (1 - INKS.red[2] / 255); }
      const cK = inkPass(i, x, y, bk, bkB, 20);
      if (cK) { cr = cr * (1 - cK) + INKS.black[0] * cK; cg = cg * (1 - cK) + INKS.black[1] * cK; cb = cb * (1 - cK) + INKS.black[2] * cK; }
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255;
    }
    const c = H.layer(W, H_); c.getContext('2d').putImageData(out, 0, 0);
    return c;
  };

const proofCache=new Map();
const printSheet=(W,H_,si,t)=>{const end=SHEETS[si]+3.6;if(t<end)return renderSheet(W,H_,si,t);if(!proofCache.has(si))proofCache.set(si,renderSheet(W,H_,si,end));return proofCache.get(si);};
  const lpExplainer = (ctx, W, H_, t) => {
    let cur = 0; for (let i = 0; i < SHEETS.length; i++) if (t >= SHEETS[i]) cur = i;
    const sw = cur > 0 ? xseg(t, SHEETS[cur], SHEETS[cur] + SWAP) : 1;
    ctx.fillStyle = '#26221e'; ctx.fillRect(0, 0, W, H_); // the press bed
    // fresh sheet already on the bed, drops the last few px as it is laid down
    const drop = 1 - XE2.out(sw);
    ctx.save(); ctx.translate(W / 2, H_ / 2); ctx.scale(1 - drop * 0.03, 1 - drop * 0.03); ctx.translate(-W / 2, -H_ / 2);
    ctx.drawImage(printSheet(W, H_, cur, t), 0, 0); ctx.restore();
    if (sw < 1) {
      // the finished proof is lifted off the forme and carried away
      const u = XE2.in(sw), old = printSheet(W, H_, cur - 1, SHEETS[cur] - 0.001);
      ctx.save(); ctx.translate(W / 2 - u * 1500, H_ / 2 - u * 260); ctx.rotate(-u * 0.12); ctx.scale(1 + u * 0.04, 1 + u * 0.04);
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30 * u + 4; ctx.shadowOffsetY = 18 * u + 2;
      ctx.drawImage(old, -W / 2, -H_ / 2); ctx.restore();
    }
  };

function scoreSound(k){k.bed('room',0,14.8,{gain:.065});
[0,5,10].forEach((T,si)=>{[.65,.9,1.9,2.8].forEach((off,j)=>{for(let i=0;i<7;i++)k.noise(T+off+i*.075,{dur:.035,color:'brown',filter:'lowpass',f:850,gain:.12,a:.002});});k.play('press',T+3.35,{gain:.35});if(T)k.noise(T,{dur:.6,color:'pink',filter:'bandpass',f:[[0,450],[.6,1200]],gain:.12,a:.07});});
['C4','G4','E5'].forEach((f,i)=>k.tone(13.5+i*.1,{f,type:'sine',dur:.9,gain:.08,a:.02}));}
window.LETTERPRESS_STUDIO={draw:lpExplainer,scoreSound,duration:15,width:1280,height:720,assets:()=>{}};window.DURATION=15;window.scoreSound=scoreSound;})();
