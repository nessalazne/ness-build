(()=>{'use strict';
  // ---------- brainstorming cork board ----------
  const TAU = Math.PI * 2;
  let CORK = null; // static cork texture, computed once (deterministic)
  const INK = '#1b1f29', BLUE = '#1f3c8f', RED = '#c3202a';

  function grainPattern(ctx, seed) {
    const c = H.layer(160, 160), x = c.getContext('2d'), img = x.createImageData(160, 160), d = img.data, r = H.rng(seed), nz = H.makeNoise(seed);
    for (let i = 0; i < 160 * 160; i++) {
      const px = i % 160, py = (i / 160) | 0;
      const v = 200 + (r() - 0.5) * 50 + nz.n2(px * 0.4, py * 0.05) * 20;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return ctx.createPattern(c, 'repeat');
  }

  // handwriting: per-word jitter on baseline/rotation, light double-pass for marker bleed
  function hand(ctx, lines, x, y, font, color, seed, lh, opts = {}) {
    const r = H.rng(seed);
    ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle';
    lines.forEach((ln, li) => {
      const words = ln.split(' ');
      const sp = ctx.measureText(' ').width * 0.9;
      const total = words.reduce((a, w) => a + ctx.measureText(w).width, 0) + sp * (words.length - 1);
      let cx = x - total / 2 + r.range(-4, 4);
      const cy = y + (li - (lines.length - 1) / 2) * lh;
      words.forEach((w) => {
        const ww = ctx.measureText(w).width;
        ctx.save(); ctx.translate(cx + ww / 2, cy + r.range(-2, 2)); ctx.rotate(r.range(-0.045, 0.045));
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.35; ctx.fillText(w, 0.7, 0.5);
        ctx.globalAlpha = opts.alpha || 0.93; ctx.fillText(w, 0, 0);
        ctx.restore();
        cx += ww + sp;
      });
    });
    ctx.restore();
  }
  // wobbly marker line
  function mline(ctx, pts, w, color, r, close) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    pts.forEach((p, i) => { const x = p[0] + r.range(-0.8, 0.8), y = p[1] + r.range(-0.8, 0.8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (close) ctx.closePath();
    ctx.stroke(); ctx.restore();
  }
  const arcPts = (cx, cy, rx, ry, a0, a1, n = 20) => { const o = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };

  function rawNote(ctx, o, pat) {
    const { x, y, w, h, rot, col } = o;
    const r = H.rng(o.seed);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const hw = w / 2, hh = h / 2, lift = (o.lift ?? 1) * 1.35;
    // shadow (bottom lifts off the board -> bigger, softer shadow there)
    const air = Math.max(0, o.air || 0); ctx.save(); ctx.filter = `blur(${7 + air * 40}px)`; ctx.translate(air * 50, air * 70); ctx.fillStyle = `rgba(40,20,5,${0.42 - air * 0.5})`;
    ctx.beginPath(); ctx.moveTo(-hw + 3, -hh + 5); ctx.lineTo(hw + 3, -hh + 5); ctx.lineTo(hw + 6 + 6 * lift, hh + 8 + 10 * lift); ctx.quadraticCurveTo(0, hh + 4 + 6 * lift, -hw + 1, hh + 6 + 9 * lift); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.filter = 'blur(1.5px)'; ctx.fillStyle = 'rgba(40,20,5,0.3)'; ctx.fillRect(-hw + 1, -hh + 2, w, h * 0.3); ctx.restore();
    // paper with curled bottom edge
    const bc = 5 * lift;
    const shape = () => { ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw + 0.5, hh - bc); ctx.quadraticCurveTo(hw * 0.2, hh + bc * 0.4, -hw, hh - bc * 0.4); ctx.closePath(); };
    shape(); ctx.fillStyle = col; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    // paper grain
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.16; ctx.fillStyle = pat; ctx.fillRect(-hw, -hh, w, h + 10);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // adhesive strip (slightly darker, flatter band at top)
    const ag = ctx.createLinearGradient(0, -hh, 0, -hh + h * 0.2);
    ag.addColorStop(0, 'rgba(90,60,0,0.07)'); ag.addColorStop(0.9, 'rgba(90,60,0,0.05)'); ag.addColorStop(1, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = ag; ctx.fillRect(-hw, -hh, w, h * 0.2 + 1);
    // curl shading (lower part bends toward the light, then dips)
    const cg = ctx.createLinearGradient(0, hh * 0.25, 0, hh + 4);
    cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.55, `rgba(255,255,240,${0.14 * lift})`); cg.addColorStop(0.85, `rgba(60,30,0,${0.1 * lift})`); cg.addColorStop(1, `rgba(60,30,0,${0.2 * lift})`);
    ctx.fillStyle = cg; ctx.fillRect(-hw, -hh, w, h + 10);
    // corner lift
    const rg = ctx.createRadialGradient(hw, hh, 2, hw, hh, w * 0.45); rg.addColorStop(0, `rgba(60,30,0,${0.16 * lift})`); rg.addColorStop(1, 'rgba(60,30,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(-hw, -hh, w, h + 10);
    // light falloff across the sheet (lamp at upper-left)
    const lg = ctx.createLinearGradient(-hw, -hh, hw, hh); lg.addColorStop(0, 'rgba(255,255,255,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = lg; ctx.fillRect(-hw, -hh, w, h + 10);
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,50,10,0.18)'; ctx.lineWidth = 0.8; shape(); ctx.stroke();
    // content
    if (o.draw) { ctx.save(); ctx.translate(0, o.pin ? 8 : 0); o.draw(ctx, r, hw, hh); ctx.restore(); }
    ctx.restore();
  }

  function tape(ctx, x, y, w, h, rot, seed) {
    const r = H.rng(seed);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const edge = (x0, sgn) => { const pts = []; for (let k = 0; k <= 8; k++) pts.push([x0 + sgn * r.range(0, 3.5), -h / 2 + k * h / 8]); return pts; };
    const L = edge(-w / 2, 1), R = edge(w / 2, -1);
    const path = () => { ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); R.slice().reverse().forEach((p) => ctx.lineTo(...p)); ctx.closePath(); };
    ctx.save(); ctx.filter = 'blur(2px)'; ctx.translate(2, 3); path(); ctx.fillStyle = 'rgba(40,25,5,0.18)'; ctx.fill(); ctx.restore();
    path(); ctx.fillStyle = 'rgba(232,218,170,0.62)'; ctx.fill();
    ctx.save(); path(); ctx.clip();
    for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(255,255,255,${r.range(0, 0.12)})`; ctx.fillRect(r.range(-w / 2, w / 2), r.range(-h / 2, h / 2), r.range(4, 18), 1); }
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,90,30,0.12)');
    ctx.fillStyle = g; ctx.fillRect(-w / 2 - 4, -h / 2, w + 8, h);
    ctx.restore();
    ctx.restore();
  }

  function pinShadow(ctx, x, y) {
    ctx.save(); ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(30,15,0,0.45)';
    ctx.beginPath(); ctx.ellipse(x + 9, y + 12, 10, 8, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(30,15,0,0.35)'; ctx.lineWidth = 1.6; ctx.filter = 'blur(0.8px)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y + 20); ctx.stroke(); ctx.restore();
  }
  function pinHead(ctx, x, y, col) {
    const c = H.hex(col);
    // collar
    ctx.save();
    let g = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, 12);
    g.addColorStop(0, H.rgba(H.mix(c, [255, 255, 255], 0.35))); g.addColorStop(0.6, H.rgba(c)); g.addColorStop(1, H.rgba(H.mix(c, [0, 0, 0], 0.5)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    // dome
    g = ctx.createRadialGradient(x - 4, y - 5, 0.5, x - 1, y - 2, 9);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, H.rgba(H.mix(c, [255, 255, 255], 0.25))); g.addColorStop(1, H.rgba(H.mix(c, [0, 0, 0], 0.35)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x - 1, y - 2, 7.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = H.rgba(H.mix(c, [0, 0, 0], 0.55), 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function yarn(ctx, a, b, sag, prog, r) {
    if (prog <= 0) return;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
    const pts = [];
    const n = 60, m = Math.max(1, Math.round(n * prog));
    for (let k = 0; k <= m; k++) { const t = k / n, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]]); }
    const path = (dx = 0, dy = 0) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] + dx, p[1] + dy) : ctx.moveTo(p[0] + dx, p[1] + dy)); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.filter = 'blur(2.5px)'; ctx.strokeStyle = 'rgba(30,10,0,0.4)'; ctx.lineWidth = 3; path(5, 9); ctx.stroke(); ctx.filter = 'none';
    ctx.strokeStyle = '#a8121b'; ctx.lineWidth = 3.4; path(); ctx.stroke();
    ctx.strokeStyle = '#d8323a'; ctx.lineWidth = 2; path(-0.4, -0.5); ctx.stroke();
    // twist highlights
    ctx.setLineDash([2.2, 3.2]); ctx.strokeStyle = 'rgba(255,150,140,0.75)'; ctx.lineWidth = 1.1; path(-0.6, -0.8); ctx.stroke();
    ctx.lineDashOffset = 2.6; ctx.strokeStyle = 'rgba(90,0,0,0.5)'; ctx.lineWidth = 1; path(0.8, 0.8); ctx.stroke();
    ctx.setLineDash([]);
    // stray fibers
    for (let k = 0; k < 6; k++) { const p = pts[Math.floor(r() * pts.length)]; ctx.strokeStyle = 'rgba(200,40,40,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + r.range(-4, 4), p[1] + r.range(-4, 4)); ctx.stroke(); }
    ctx.restore();
  }

  // ===== EXPLAINER HELPERS =====
  let BIGCORK = null;
  const XW = 1280, XH = 720;
  function bigCork() {
    if (BIGCORK) return BIGCORK;
    const L = H.layer(XW, XH), c = L.getContext('2d'), img = c.createImageData(XW, XH), d = img.data, nz = H.makeNoise(12);
    const A = [176, 128, 78], B = [214, 170, 112], Dk = [120, 78, 40];
    for (let y = 0; y < XH; y++) for (let x = 0; x < XW; x++) {
      const g1 = nz.n2(x * 0.21, y * 0.21), h = ((x * 374761393 + y * 668265263) ^ 0x5bd1e995) >>> 0, rr = ((h ^ (h >>> 13)) * 1274126177 >>> 0) / 4294967296;
      // second, finer granule octave (as in the hero's cork) so the texture stays crisp when the camera zooms in
      const g2 = nz.n2(x * 0.55 + 40, y * 0.55);
      const v = H.clamp(0.5 + g1 * 0.8 + g2 * 0.45 + (rr - 0.5) * 0.3), low = nz.n2(x * 0.006, y * 0.006) * 0.1;
      const pore = g2 > 0.42 ? H.clamp((g2 - 0.42) * 5) * 0.85 : (rr > 0.95 ? 0.6 : 0);
      const rr2 = (((h * 2246822519) ^ (h >>> 16)) >>> 0) / 4294967296;
      const i = (y * XW + x) * 4, s = 1 + low + (rr2 - 0.5) * 0.12; // 1px granules, +-6% luminance
      d[i] = H.lerp(A[0] + (B[0] - A[0]) * v, Dk[0], pore) * s; d[i + 1] = H.lerp(A[1] + (B[1] - A[1]) * v, Dk[1], pore) * s; d[i + 2] = H.lerp(A[2] + (B[2] - A[2]) * v, Dk[2], pore) * s; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // old pin holes from earlier brainstorms
    { const r = H.rng(77); for (let k = 0; k < 260; k++) { const x = r() * XW, y = r() * XH, rad = r.range(0.9, 1.8); c.fillStyle = 'rgba(40,20,5,0.6)'; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,230,190,0.18)'; c.beginPath(); c.arc(x - rad * 0.6, y - rad * 0.6, rad * 0.7, 0, Math.PI * 2); c.fill(); } }
    // frame (wood with grain lines, like the hero's)
    const f = 26;
    const wood = (x, y, w, h, vert) => {
      const g = vert ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#7a4e2a'); g.addColorStop(0.4, '#9a6a3c'); g.addColorStop(1, '#5a361b');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = 'rgba(60,30,10,0.35)'; c.lineWidth = 0.9;
      const len = vert ? h : w, n = Math.ceil(len / 6);
      for (let k = 0; k < 10; k++) { c.beginPath(); for (let s2 = 0; s2 <= n; s2++) { const q = s2 / n; const px = vert ? x + 2 + k * 2.4 + Math.sin(q * len / 40 + k) * 0.9 : x + q * w; const py = vert ? y + q * h : y + 2 + k * 2.4 + Math.sin(q * len / 40 + k) * 0.9; s2 ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
      c.restore();
    };
    wood(0, 0, XW, f, false); wood(0, XH - f, XW, f, false); wood(0, 0, f, XH, true); wood(XW - f, 0, f, XH, true);
    c.strokeStyle = 'rgba(20,10,0,0.35)'; c.lineWidth = 8; c.filter = 'blur(5px)'; c.strokeRect(f + 3, f + 3, XW - 2 * f - 6, XH - 2 * f - 6); c.filter = 'none';
    BIGCORK = L; return L;
  }
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  // write-on: reveal content left to right like a marker moving
  function wr(ctx, p, x0, y0, w, h, fn) { if (p <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w * Math.min(1, p), h); ctx.clip(); fn(); ctx.restore(); }
  function arrowM(ctx, pts, p, col, w, r) {
    if (p <= 0) return;
    const n = Math.max(2, Math.round(pts.length * Math.min(1, p)));
    const seg = pts.slice(0, n);
    mline(ctx, seg, w, col, r);
    if (p >= 1) { const a = pts[pts.length - 1], b = pts[pts.length - 3] || pts[0], an = Math.atan2(a[1] - b[1], a[0] - b[0]); mline(ctx, [[a[0] + Math.cos(an + 2.6) * 22, a[1] + Math.sin(an + 2.6) * 22], a, [a[0] + Math.cos(an - 2.6) * 22, a[1] + Math.sin(an - 2.6) * 22]], w, col, r); }
  }
  const qpts = (a, c, b, n = 24) => { const o = []; for (let k = 0; k <= n; k++) { const t = k / n, m = 1 - t; o.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]); } return o; };

  // ===== END EXPLAINER HELPERS =====

const noteCache=new Map();
function note(ctx,o,pat){
 if((o.air||0)>0 || ![295,790,780].includes(o.w)){rawNote(ctx,o,pat);return;}
 const key=[o.x,o.y,o.w,o.h,o.rot,o.col,o.seed,o.lift].join(',');
 if(!noteCache.has(key)){const layer=H.layer(1280,720);rawNote(layer.getContext('2d'),{...o,draw:null},pat);noteCache.set(key,layer);}
 ctx.drawImage(noteCache.get(key),0,0);
 if(o.draw){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);ctx.translate(0,o.pin?8:0);o.draw(ctx,H.rng(o.seed),o.w/2,o.h/2);ctx.restore();}
}
let pattern=null;
const prog=(t,a,b)=>H.clamp((t-a)/(b-a));
function draw(ctx,W,H_,t){
if(!pattern)pattern=grainPattern(ctx,3);
ctx.drawImage(bigCork(),0,0);
const put=(o,t0)=>{if(t<=t0)return;const s=1+.32*(1-H.ease.back(prog(t,t0,t0+.3)));ctx.save();ctx.translate(o.x,o.y);ctx.scale(s,s);ctx.translate(-o.x,-o.y);note(ctx,{...o,air:Math.max(0,s-1)},pattern);ctx.restore();};
const pin=(x,y,t0)=>{if(t<t0)return;pinShadow(ctx,x,y);const sc=1+.9*(1-prog(t,t0,t0+.14))**2;ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);pinHead(ctx,0,0,RED);ctx.restore();};
// The taped hook becomes the board's heading as the plan fills in.
const e=H.ease.inOut(prog(t,1.7,2.3)),hy=H.lerp(345,115,e),hw=H.lerp(720,780,e),hh=H.lerp(235,110,e);
put({x:640,y:hy,w:hw,h:hh,rot:-.018,col:'#fffbed',seed:12,lift:.2,draw(c){hand(c,['One idea. One video.'],0,0,'700 54px Kalam',INK,13,58);}},.1);
if(t>.4){tape(ctx,640-hw/2+35,hy-hh/2+5,95,30,-.3,15);tape(ctx,640+hw/2-35,hy-hh/2+5,95,30,.3,16);}
const notes=[{x:255,y:365,col:'#fbe36a',rot:-.055,start:2.5,title:'CAPTURE',lines:['One useful','idea'],seed:21},{x:640,y:365,col:'#86d0f2',rot:.035,start:5,title:'OUTLINE',lines:['Hook. Point.','Example.'],seed:22},{x:1025,y:365,col:'#ff8db5',rot:-.04,start:7.5,title:'RECORD',lines:['Say it in','your words'],seed:23}];
notes.forEach((n,i)=>{put({...n,w:295,h:290,lift:.8,draw(c){
 hand(c,[n.title],0,-88,'700 42px Kalam',INK,n.seed,45);
 wr(c,prog(t,n.start+.35,n.start+1),-137,-50,274,125,()=>hand(c,n.lines,0,4,'700 36px Kalam',BLUE,n.seed+10,43));
 const R=H.rng(n.seed+20),p=prog(t,n.start+1.05,n.start+1.5);
 if(i===0){mline(c,arcPts(0,90,22,24,0,TAU*p,28),3,INK,R);if(p===1){mline(c,[[-10,115],[-10,124],[10,124],[10,115]],3,INK,R);[-1,1].forEach(s=>mline(c,[[s*32,78],[s*42,72]],3,INK,R));}}
 if(i===1)wr(c,p,-65,65,130,70,()=>{[-1,0,1].forEach(j=>{mline(c,[[-55,88+j*17],[-48,94+j*17],[-37,80+j*17]],3,INK,R);mline(c,[[-20,88+j*17],[65,88+j*17]],3,INK,R);});});
 if(i===2)wr(c,p,-65,60,130,75,()=>{mline(c,[[-48,68],[48,68],[48,120],[-48,120],[-48,68]],3,INK,R);mline(c,[[-9,78],[17,94],[-9,110],[-9,78]],3,RED,R);});
 }},n.start);});
// Yarn is above the note surfaces but below the pin heads.
yarn(ctx,[255,232],[640,232],-65,prog(t,4.2,4.9),H.rng(61));
yarn(ctx,[640,232],[1025,232],-65,prog(t,6.7,7.4),H.rng(62));
notes.forEach(n=>pin(n.x,232,n.start+.3));
if(t>9.5){const p=prog(t,9.5,10.2);arrowM(ctx,qpts([1025,520],[1020,565],[905,578]),p,RED,4,H.rng(80));}
put({x:640,y:611,w:790,h:94,rot:.012,col:'#b6e27a',seed:90,lift:.4,draw(c){
 hand(c,['Make it. Share it. Start again.'],0,0,'700 42px Kalam',INK,91,45);
}},10.5);
if(t>11.5)mline(ctx,arcPts(640,612,425,61,-.2,-.2+TAU*1.025*prog(t,11.5,12.5),65),4,RED,H.rng(92));
const g=ctx.createRadialGradient(330,120,50,400,200,1100);g.addColorStop(0,'rgba(255,240,210,0.18)');g.addColorStop(.5,'rgba(255,240,210,0)');g.addColorStop(1,'rgba(40,20,0,0.3)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H_);
H.vignette(ctx,W,H_,.35,'30,15,0');H.grain(ctx,W,H_,.04,8+Math.floor(t*12));
}
function scoreSound(k){k.bed('room',0,14.8,{gain:.08});
[.1,2.5,5,7.5,10.5].forEach(t=>{k.play('slap',t+.11,{gain:.26});k.tone(t+.11,{f:[[0,130],[.07,65]],dur:.1,gain:.1});});
[2.8,5.3,7.8].forEach(t=>k.noise(t+.14,{dur:.045,color:'pink',filter:'lowpass',f:800,gain:.17,a:.002}));
[2.85,5.35,7.85,11.5].forEach(t=>k.noise(t,{dur:t===11.5?1:.65,color:'pink',filter:'bandpass',f:1500,gain:.10,a:.02}));
[4.2,6.7,9.5].forEach(t=>{k.noise(t,{dur:.7,color:'pink',filter:'bandpass',f:900,gain:.07,a:.07});k.tone(t+.7,{f:190,type:'triangle',dur:.18,gain:.07,a:.003});});
['C4','E4','G4'].forEach((f,i)=>k.tone(12.5+i*.08,{f,type:'sine',dur:1,gain:.075,a:.02}));}
window.STICKY_STUDIO={draw,scoreSound,duration:15,width:1280,height:720,assets:()=>bigCork()};window.DURATION=15;window.scoreSound=scoreSound;
})();
