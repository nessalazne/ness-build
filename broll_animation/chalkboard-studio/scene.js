/* Chalk material rendering adapted from the user-supplied document; original lesson and score. */
(()=>{
  const seg = (pts, step = 2.5) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let j = 0; j < n; j++) out.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const normals = (P) => P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [-dy / d, dx / d];
  });
  const wob = (pts, nz, seed, amp = 1.5, freq = 0.012) => {
    const N = normals(pts); let L = 0;
    return pts.map((p, i) => {
      if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const o = nz.n2(L * freq + seed * 1.37, seed * 0.71) * amp + nz.n2(L * freq * 6 + seed, seed + 3.3) * amp * 0.25;
      return [p[0] + N[i][0] * o, p[1] + N[i][1] * o];
    });
  };
  const ell = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2) => {
    const n = Math.max(10, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 2.5)), out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
  };
  const quad = (p0, p1, p2, n = 40) => {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; out.push([m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0], m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1]]); }
    return out;
  };
let slateCache=null;
function draw(ctx,W,H_,t){
      const nz = H.makeNoise(31);
      const F = 30, TRAY = 646;
      if(!slateCache){const layer=H.layer(W,H_);const target=ctx;ctx=layer.getContext('2d');
      // ---------- slate ----------
      H.paper(ctx, W, H_, '#2c4639', 17, 0.05);
      const lit = ctx.createRadialGradient(560, 260, 100, 640, 360, 900);
      lit.addColorStop(0, 'rgba(120,150,130,0.10)'); lit.addColorStop(1, 'rgba(0,10,5,0.35)');
      ctx.fillStyle = lit; ctx.fillRect(0, 0, W, H_);
      // ghost of an older lesson + eraser smears
      {
        const g = H.layer(W, H_), gc = g.getContext('2d');
        gc.fillStyle = '#e8eee6'; gc.font = '400 40px "Kalam"';
        gc.fillText('counting', 760, 120); gc.fillText('1 + 1 = 2', 820, 190);
        gc.fillText('show your working', 120, 600);
        gc.strokeStyle = '#e8eee6'; gc.lineWidth = 6; gc.beginPath(); gc.arc(1060, 330, 70, 0, 7); gc.stroke();
        ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.globalAlpha = 0.07; ctx.drawImage(g, 0, 0); ctx.restore();
        const rr = H.rng(12);
        const sm = H.layer(W, H_), sc = sm.getContext('2d'); sc.lineCap = 'round';
        for (let i = 0; i < 26; i++) {
          // eraser swipes: arcs and figure-eights
          const x = rr.range(80, 1200), y = rr.range(70, 600), R = rr.range(60, 170), a0 = rr.range(0, 6.28);
          sc.strokeStyle = `rgba(215,228,215,${rr.range(0.035, 0.075)})`; sc.lineWidth = rr.range(45, 80);
          sc.beginPath(); sc.ellipse(x, y, R, R * rr.range(0.3, 0.7), rr.range(-0.4, 0.4), a0, a0 + rr.range(1.5, 3.5)); sc.stroke();
        }
        for (let i = 0; i < 10; i++) {
          const x = rr.range(150, 1100), y = rr.range(90, 560);
          sc.strokeStyle = `rgba(215,228,215,${rr.range(0.03, 0.05)})`; sc.lineWidth = rr.range(50, 70);
          sc.beginPath(); sc.moveTo(x, y); sc.lineTo(x + rr.range(150, 360), y + rr.range(-20, 20)); sc.stroke();
        }
        ctx.save(); ctx.filter = 'blur(7px)'; ctx.drawImage(sm, 0, 0); ctx.restore();
        // streaky texture inside smears (felt lines)
        ctx.save(); ctx.globalAlpha = 0.5; ctx.filter = 'blur(1px)';
        const st = H.layer(W, H_), stc = st.getContext('2d');
        for (let i = 0; i < 260; i++) {
          const x = rr.range(60, 1200), y = rr.range(60, 620);
          stc.strokeStyle = `rgba(220,230,220,${rr.range(0.015, 0.04)})`; stc.lineWidth = rr.range(0.8, 2);
          stc.beginPath(); stc.moveTo(x, y); stc.quadraticCurveTo(x + 40, y + rr.range(-6, 6), x + rr.range(60, 140), y + rr.range(-8, 8)); stc.stroke();
        }
        ctx.drawImage(st, 0, 0); ctx.restore();
      }
      ctx=target;slateCache=layer;}ctx.drawImage(slateCache,0,0);
      // ---------- chalk layer ----------
      const CL = H.layer(W, H_), c = CL.getContext('2d',{willReadFrequently:true});
      c.lineCap = 'round'; c.lineJoin = 'round';
      const COL = { w: [240, 242, 236], y: [246, 222, 120], p: [244, 150, 175], b: [150, 205, 240] };
      // chalk stroke: several parallel sub-strokes (flat of the stick) at varying pressure
      const T = (a, b) => H.clamp((t - a) / (b - a));
      let TIP = null;
      const chalk = (pts, col, w, seed, pr = 0.85, prog = 1) => {
        if (prog <= 0) return;
        let P = pts; if (prog < 1) { P = pts.slice(0, Math.max(2, Math.ceil(pts.length * prog))); TIP = P[P.length - 1]; }
        const rr = H.rng(seed), N = normals(P), rgb = COL[col];
        const n = 4;
        for (let k = 0; k < n; k++) {
          const off = (k / (n - 1) - 0.5) * w * 0.7 + rr.range(-0.5, 0.5);
          const a = pr * rr.range(0.75, 1);
          c.lineWidth = w * rr.range(0.5, 0.72);
          for (let i = 0; i < P.length - 1; i += 6) {
            const fl = 0.7 + 0.3 * nz.n2(i * 0.04 + k, seed * 0.17);
            c.strokeStyle = H.rgba(rgb, Math.min(1, a * fl));
            c.beginPath();
            for (let j = i; j <= Math.min(P.length - 1, i + 6); j++) {
              const x = P[j][0] + N[j][0] * off, y = P[j][1] + N[j][1] * off;
              j === i ? c.moveTo(x, y) : c.lineTo(x, y);
            }
            c.stroke();
          }
        }
      };
      const L = (pts, s, amp = 1.4) => wob(seg(pts), nz, s, amp);
      const write = (str, x, y, font, col, rot, seed, a = 0.95, t0 = -1, t1 = 0) => {
        c.save(); c.font = font; c.translate(x, y); c.rotate(rot);
        const rr = H.rng(seed); let px = 0;
        const nCh = Math.ceil(str.length * T(t0, t1));
        if (nCh > 0 && nCh < str.length) { const ww = c.measureText(str.slice(0, nCh)).width; TIP = [x + Math.cos(rot) * ww - Math.sin(rot) * -14, y + Math.sin(rot) * ww - 14]; }
        let ci = 0;
        for (const ch of str) {
          if (ci++ >= nCh) { px += c.measureText(ch).width; continue; }
          const w = c.measureText(ch).width;
          c.fillStyle = H.rgba(COL[col], a * rr.range(0.8, 1));
          c.save(); c.translate(px, rr.range(-1.5, 1.5)); c.rotate(rr.range(-0.04, 0.04)); c.fillText(ch, 0, 0); c.restore();
          px += w + rr.range(-0.5, 1);
        }
        c.restore();
        return px;
      };
      const arrowHead = (P, col, w, seed, len = 18, pg = 1) => {
        if (pg <= 0) return;
        const a = P[P.length - 1], b = P[Math.max(0, P.length - 6)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
        chalk(L([[a[0] - Math.cos(ang - 0.5) * len, a[1] - Math.sin(ang - 0.5) * len], a], seed, 0.4), col, w, seed, 0.85, H.clamp(pg * 2));
        chalk(L([[a[0] - Math.cos(ang + 0.5) * len, a[1] - Math.sin(ang + 0.5) * len], a], seed + 1, 0.4), col, w, seed + 1, 0.85, H.clamp(pg * 2 - 1));
      };
      // Original lesson: make addition visible with two groups of chalk counters.
      write('Make the answer visible.',82,112,'700 58px "Kalam"','w',-.012,1,.95,.15,1.5);
      chalk(L([[84,133],[870,127]],2,1.2),'y',5,2,.85,T(1.5,1.9));
      write('What is 2 + 3?',92,210,'400 42px "Patrick Hand"','b',-.02,3,.95,2,2.9);
      write('2',125,345,'700 92px "Kalam"','y',-.025,4,.95,3,3.5);
      write('+',320,345,'700 76px "Kalam"','w',0,5,.95,3.5,3.85);
      write('3',535,345,'700 92px "Kalam"','p',.02,6,.95,3.85,4.35);
      const counters=[[120,435,'y',4.5],[210,435,'y',5.1],[450,435,'p',5.7],[540,435,'p',6.3],[630,435,'p',6.9]];
      counters.forEach(([x,y,col,start],i)=>{
        chalk(L(ell(x,y,26,26),40+i,1.1),col,7,40+i,.95,T(start,start+.42));
        for(let k=0;k<5;k++)chalk(L([[x-16,y-12+k*6],[x+16,y-12+k*6]],70+i*5+k,.8),col,4,70+i*5+k,.65,T(start+.15,start+.5));
      });
      const brace=L([[84,489],[84,510],[666,510],[666,489]],90,1);
      chalk(brace,'w',5,90,.9,T(7.5,8.15));
      write('Count them together',190,562,'400 39px "Patrick Hand"','w',-.015,91,.95,8.15,9.2);
      const ar=L(quad([688,438],[764,392],[827,394]),92,.8);
      chalk(ar,'y',6,92,.95,T(9.2,9.8));arrowHead(ar,'y',6,93,20,T(9.8,10));
      write('5',930,420,'700 135px "Kalam"','y',-.04,94,.98,10,10.6);
      chalk(L(ell(970,369,100,100,-2.3,4.1),95,2),'p',6,95,.9,T(10.6,11.4));
      write('2 + 3 = 5',857,525,'400 46px "Patrick Hand"','w',-.02,96,.95,11.4,12.2);
      write('Now you can see why.',760,597,'400 34px "Patrick Hand"','b',-.01,97,.95,12.2,13.1);
      // ---------- chalk grain: only the board's high points take chalk ----------
      {
        const id = c.getImageData(0, 0, W, H_), d = id.data;
        const sm = H.layer(W / 2, H_ / 2), sx = sm.getContext('2d');
        const ns = sx.createImageData(W / 2, H_ / 2), rr = H.rng(77);
        for (let i = 0; i < ns.data.length; i += 4) { const v = rr() * 255; ns.data[i] = ns.data[i + 1] = ns.data[i + 2] = v; ns.data[i + 3] = 255; }
        sx.putImageData(ns, 0, 0);
        const big = H.layer(W, H_), bx = big.getContext('2d'); bx.drawImage(sm, 0, 0, W, H_);
        const gd = bx.getImageData(0, 0, W, H_).data, r2 = H.rng(78);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
          const a = d[i + 3] / 255; if (!a) continue;
          const x = p % W, y = (p / W) | 0;
          const g = gd[i] / 255 * 0.55 + r2() * 0.45 + nz.n2(x * 0.05, y * 0.05) * 0.12;
          const k = H.clamp((g - (1 - a) * 0.95 - 0.08) * 3.0);
          d[i + 3] = 255 * Math.min(1, a * 1.15) * k;
        }
        c.putImageData(id, 0, 0);
      }
      // dust halo around strokes then the chalk itself
      ctx.save(); ctx.filter = 'blur(4px)'; ctx.globalAlpha = 0.22; ctx.drawImage(CL, 0, 0); ctx.restore();
      ctx.drawImage(CL, 0, 0);
      // falling dust specks under writing
      {
        const rr = H.rng(90);
        for (let i = 0; i < 500; i++) {
          const x = rr.range(60, 1220), y = rr.range(60, 630);
          ctx.fillStyle = `rgba(235,240,232,${rr.range(0.05, 0.25)})`;
          ctx.fillRect(x, y, rr.range(0.8, 1.8), rr.range(0.8, 1.8));
        }
        // slowly drifting dust motes in the air (ambient life)
        for (let i = 0; i < 70; i++) {
          const x0 = rr.range(40, 1240), sp = rr.range(8, 22), ph = rr.range(0, 700);
          const y = 40 + ((ph + t * sp) % 600), x = x0 + Math.sin(t * 0.8 + i) * 8;
          ctx.fillStyle = `rgba(240,244,236,${rr.range(0.12, 0.35)})`;
          ctx.beginPath(); ctx.arc(x, y, rr.range(0.6, 1.5), 0, 7); ctx.fill();
        }
        // puff of dust where the chalk touches
        if (TIP) {
          for (let i = 0; i < 26; i++) {
            const r3 = H.rng(Math.floor(t * 30) * 100 + i);
            ctx.fillStyle = `rgba(240,244,236,${r3.range(0.15, 0.5)})`;
            ctx.fillRect(TIP[0] + r3.range(-12, 12), TIP[1] + r3.range(0, 30), r3.range(0.8, 2), r3.range(0.8, 2));
          }
        }
      }
      H.vignette(ctx, W, H_, 0.35, '0,8,4');
      // the chalk stick in hand
      if (TIP) {
        const [tx, ty] = TIP, ang = 0.8;
        ctx.save();
        ctx.save(); ctx.filter = 'blur(6px)'; ctx.fillStyle = 'rgba(0,10,5,0.4)'; ctx.translate(tx + 16, ty + 20); ctx.rotate(ang); ctx.fillRect(4, -7, 80, 14); ctx.restore();
        ctx.translate(tx, ty); ctx.rotate(ang);
        const g2 = ctx.createLinearGradient(0, -8, 0, 8); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.45, '#ecece4'); g2.addColorStop(1, '#a9aaa2');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(6, -8); ctx.lineTo(86, -8); ctx.lineTo(86, 8); ctx.lineTo(6, 8); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(86, 0, 3, 8, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      // ---------- oak frame ----------
      const wood = (x, y, w, h, horiz, seed, base = [128, 84, 46]) => {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.fillStyle = H.rgba(base); ctx.fillRect(x, y, w, h);
        const rr = H.rng(seed);
        const n = 70;
        for (let i = 0; i < n; i++) {
          const o = rr() * (horiz ? h : w), dark = rr.chance(0.6);
          ctx.strokeStyle = dark ? `rgba(60,34,14,${rr.range(0.1, 0.35)})` : `rgba(210,160,100,${rr.range(0.06, 0.18)})`;
          ctx.lineWidth = rr.range(0.6, 2.2);
          ctx.beginPath();
          const len = horiz ? w : h, fq = rr.range(0.004, 0.012), amp = rr.range(0.5, 3), ph = rr.range(0, 6);
          for (let s = 0; s <= len; s += 12) {
            const off = o + Math.sin(s * fq + ph) * amp + nz.n2(s * 0.01, i) * 2;
            const px = horiz ? x + s : x + off, py = horiz ? y + off : y + s;
            s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
        // bevel shading
        const g = horiz ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, 'rgba(255,220,170,0.25)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,15,5,0.4)');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.restore();
      };
      wood(0, 0, W, F, true, 1);
      wood(0, 0, F, TRAY, false, 2);
      wood(W - F, 0, F, TRAY, false, 3);
      // inner shadow of frame on slate
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(F, F, W - 2 * F, 5); ctx.fillRect(F, F, 5, TRAY - F);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(F, F + 5, W - 2 * F, 4);
      // tray: ledge top + front lip
      wood(0, TRAY, W, 30, true, 4, [150, 102, 58]);
      wood(0, TRAY + 30, W, H_ - TRAY - 30, true, 5, [110, 70, 36]);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(F, TRAY - 6, W - 2 * F, 6);
      ctx.fillStyle = 'rgba(255,230,190,0.25)'; ctx.fillRect(0, TRAY + 30, W, 1.5);
      // chalk dust on the ledge
      {
        const rr = H.rng(55);
        const dg = ctx.createLinearGradient(0, TRAY, 0, TRAY + 30);
        dg.addColorStop(0, 'rgba(235,235,225,0.32)'); dg.addColorStop(1, 'rgba(235,235,225,0.08)');
        ctx.fillStyle = dg; ctx.fillRect(F, TRAY, W - 2 * F, 30);
        for (let i = 0; i < 1400; i++) {
          const x = rr.range(F, W - F), y = TRAY + Math.pow(rr(), 1.6) * 28;
          ctx.fillStyle = `rgba(245,245,238,${rr.range(0.1, 0.5)})`; ctx.fillRect(x, y, rr.range(0.8, 2.2), rr.range(0.8, 1.6));
        }
        for (let i = 0; i < 6; i++) {
          const x = rr.range(100, 1150);
          const g = ctx.createRadialGradient(x, TRAY + 16, 2, x, TRAY + 16, 60);
          g.addColorStop(0, 'rgba(240,240,230,0.25)'); g.addColorStop(1, 'rgba(240,240,230,0)');
          ctx.fillStyle = g; ctx.fillRect(x - 60, TRAY, 120, 30);
        }
      }
      // chalk sticks
      const stick = (x, len, col, rot) => {
        ctx.save(); ctx.translate(x, TRAY + 15); ctx.rotate(rot);
        ctx.fillStyle = 'rgba(30,15,5,0.35)'; ctx.beginPath(); ctx.ellipse(len / 2 + 3, 7, len / 2 + 2, 4, 0, 0, 7); ctx.fill();
        const g = ctx.createLinearGradient(0, -7, 0, 7);
        g.addColorStop(0, H.rgba(H.mix(col, '#ffffff', 0.5))); g.addColorStop(0.4, H.rgba(col)); g.addColorStop(1, H.rgba(H.mix(col, '#000000', 0.35)));
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(0, -7, len, 14, 6); ctx.fill();
        ctx.fillStyle = H.rgba(H.mix(col, '#ffffff', 0.3)); ctx.beginPath(); ctx.ellipse(len - 2, 0, 3, 7, 0, 0, 7); ctx.fill();
        ctx.restore();
      };
      stick(180, 96, [242, 242, 236], -0.03);
      stick(310, 44, [246, 220, 110], 0.05);
      stick(380, 62, [242, 150, 172], -0.02);
      stick(470, 38, [150, 205, 238], 0.08);
      // felt eraser
      ctx.save(); ctx.translate(980, TRAY - 2);
      ctx.fillStyle = 'rgba(20,10,5,0.4)'; ctx.fillRect(4, 22, 170, 10);
      const eg = ctx.createLinearGradient(0, 0, 0, 22); eg.addColorStop(0, '#c48a52'); eg.addColorStop(1, '#8a5a30');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.roundRect(0, 0, 170, 22, 4); ctx.fill();
      ctx.fillStyle = '#5c5c5c'; ctx.fillRect(2, 20, 166, 12);
      ctx.fillStyle = 'rgba(240,240,235,0.55)'; ctx.fillRect(2, 26, 166, 6);
      ctx.restore();
      H.grain(ctx, W, H_, 0.03, 5);

}

function scoreSound(k){
 k.bed('room',0,14.7,{gain:.12});
 const scratch=(a,b)=>k.noise(a,{dur:b-a,color:'pink',filter:'bandpass',f:1700,q:.7,gain:.085,a:.025,hold:Math.max(0,b-a-.08)});
 [[.15,1.5],[1.5,1.9],[2,2.9],[3,3.5],[3.5,3.85],[3.85,4.35],[7.5,8.15],[8.15,9.2],[9.2,10],[10,10.6],[10.6,11.4],[11.4,12.2],[12.2,13.1]].forEach(([a,b])=>scratch(a,b));
 [4.5,5.1,5.7,6.3,6.9].forEach((t,i)=>{scratch(t,t+.48);k.noise(t+.48,{dur:.045,color:'brown',filter:'lowpass',f:1300,gain:.15,a:.002});});
 k.tone(13.2,{f:'C5',dur:.5,type:'sine',gain:.08,a:.015});k.tone(13.32,{f:'G5',dur:.6,type:'sine',gain:.055,a:.02});
}
window.CHALK_STUDIO={draw,scoreSound,duration:15,width:1280,height:720,assets:()=>{}};window.DURATION=15;window.scoreSound=scoreSound;
})();
