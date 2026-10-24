(()=>{'use strict';
  // ---------- print helpers (local) ----------
  const fieldNoise = (w, h, seed, cell, oct, sx = 1, sy = 1) => {
    const nz = H.makeNoise(seed), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, g = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = nz.fbm2(i * 0.35 * sx, j * 0.35 * sy, oct);
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const fy = y / cell, j = fy | 0, ty = fy - j;
      for (let x = 0; x < w; x++) {
        const fx = x / cell, i = fx | 0, tx = fx - i, k = j * gw + i;
        const a = g[k] + (g[k + 1] - g[k]) * tx, b = g[k + gw] + (g[k + gw + 1] - g[k + gw]) * tx;
        out[y * w + x] = a + (b - a) * ty;
      }
    }
    return out;
  };
  // deterministic noise fields are cached across frames (pure: same inputs -> same arrays)
  const CACHE = {};
  const cachedField = (key, ...a) => CACHE[key] || (CACHE[key] = fieldNoise(...a));

  // mottled ink coverage: modulates alpha of a layer
  const inkify = (layer, seed, mottle, speck) => {
    const c = layer.getContext('2d'), w = layer.width, h = layer.height, img = c.getImageData(0, 0, w, h), d = img.data;
    const n1 = cachedField('ink1' + seed, w, h, seed, 5, 3), n2 = cachedField('ink2' + seed, w, h, seed + 9, 40, 3), r = H.rng(seed + 3);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (!d[i + 3]) { r(); continue; }
      let a = 1 - mottle * Math.max(0, n1[p] * 1.6 + n2[p] * 0.9);
      if (r() < speck * (0.4 + Math.max(0, n2[p]) * 3)) a *= 0.25;
      d[i + 3] *= H.clamp(a, 0, 1);
    }
    c.putImageData(img, 0, 0);
  };

  const C = { cream: '#ece2c9', red: '#cf3a2a', yellow: '#efb526', blue: '#1f4f9b', black: '#1c1a18' };

  // ring helper
  const ring = (c, x, y, ro, ri) => { c.beginPath(); c.arc(x, y, ro, 0, Math.PI * 2); c.arc(x, y, ri, 0, Math.PI * 2, true); c.fill(); };

  // constructed geometric lettering (Bayer-like universal alphabet)
  const letter = (c, ch, x, base, xh, sw) => {
    const R = xh / 2;
    if (ch === 'o') { ring(c, x + R, base - R, R, R - sw); return xh; }
    if (ch === 'b') { c.fillRect(x, base - xh * 1.55, sw, xh * 1.55); ring(c, x + R, base - R, R, R - sw); return xh; }
    if (ch === 'r') {
      c.fillRect(x, base - xh, sw, xh);
      c.beginPath(); c.arc(x + R, base - R, R, Math.PI, Math.PI * 1.62); c.arc(x + R, base - R, R - sw, Math.PI * 1.62, Math.PI, true); c.fill();
      return xh * 0.66;
    }
    if (ch === 't') {
      c.fillRect(x + xh * 0.18, base - xh * 1.4, sw, xh * 1.4);
      c.fillRect(x, base - xh, xh * 0.62, sw * 0.9);
      return xh * 0.62;
    }
    return xh * 0.5;
  };

  // ===================== EXPLAINER: "How does AI learn?" =====================
  // One long printed sheet of four panels; the camera tracks along it (Bayer-style info-design spread),
  // then pulls back to show the whole sheet as one diagram for the takeaway.
  let EX_PAPER = null;
  const exPaper = (W, HH) => {
    if (EX_PAPER) return EX_PAPER;
    const cv = H.layer(W, HH), x = cv.getContext('2d'), img = x.createImageData(W, HH), pd = img.data;
    const lo = cachedField('lo', W, HH, 11, 24, 4), fib = cachedField('fib', W, HH, 12, 2, 2, 3.5, 0.5), r0 = H.rng(5);
    const base = H.hex(C.cream), tan = H.hex('#c9ab78');
    for (let y = 0, p = 0; y < HH; y++) for (let xx = 0; xx < W; xx++, p++) {
      const ex = Math.min(xx, W - xx) / W, ey = Math.min(y, HH - y) / HH;
      const edge = Math.pow(1 - H.clamp(Math.min(ex * 3.2, ey * 2.2) + lo[p] * 0.15, 0, 1), 3);
      const k = 0.35 * edge + 0.12 * Math.max(0, lo[p]);
      const s = 1 + fib[p] * 0.035 + (r0() - 0.5) * 0.04, i = p * 4;
      pd[i] = (base[0] + (tan[0] - base[0]) * k) * s; pd[i + 1] = (base[1] + (tan[1] - base[1]) * k) * s; pd[i + 2] = (base[2] + (tan[2] - base[2]) * k) * s; pd[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const rf = H.rng(77);
    for (let i = 0; i < 26; i++) {
      const px = rf.range(0, W), py = rf.range(0, HH), rr = rf.range(2, 10), g = x.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(140,90,40,0.22)'); g.addColorStop(1, 'rgba(140,90,40,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
    }
    return (EX_PAPER = cv);
  };


const P=(t,a,b)=>H.clamp((t-a)/(b-a)),E=(t,a,b)=>H.ease.inOut(P(t,a,b));
function draw(ctx,W,HH,t){ctx.drawImage(exPaper(W,HH),0,0);
const L=H.layer(W,HH),c=L.getContext('2d'),reg={yellow:[2,-1],red:[-1.5,1],blue:[1,2],black:[0,0]};
const ink=(col,fn)=>{c.save();c.translate(...reg[col]);c.fillStyle=C[col];c.strokeStyle=C[col];fn();c.restore();};
const txt=(str,x,y,size=32)=>{c.font=`700 ${size}px "Space Grotesk"`;c.fillText(str,x,y);};
ink('black',()=>{c.fillRect(56,56,10,608*H.ease.out(P(t,0,.8)));c.fillRect(56,650,1168*H.ease.out(P(t,.2,1)),10);c.fillRect(766,56,5,560*H.ease.out(P(t,.4,1.2)));txt('FORM STUDY / 010',95,105,28);});
const compose=E(t,5.2,8),settle=E(t,9.5,11.5);
// The same primary forms migrate into the final composition.
ink('yellow',()=>{const p=H.ease.back(P(t,1.1,1.8));if(p>0){const x=H.lerp(235,350,compose),y=H.lerp(330,310,compose),rad=H.lerp(105,208,compose)*p;c.beginPath();c.arc(x,y,rad,0,Math.PI*2);c.fill();}});
ink('blue',()=>{const p=H.ease.back(P(t,2.3,3));if(p>0){const x=H.lerp(450,430,compose),y=H.lerp(330,404,compose),size=H.lerp(160,250,compose)*p;c.save();c.translate(x,y);c.rotate((1-settle)*compose*.13);c.fillRect(-size/2,-size/2,size,size);c.restore();}});
ink('red',()=>{const p=H.ease.back(P(t,3.5,4.2));if(p>0){const x=H.lerp(650,590,compose),y=H.lerp(330,440,compose),size=H.lerp(95,145,compose)*p;c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size*.85,y+size*.72);c.lineTo(x-size*.85,y+size*.72);c.closePath();c.fill();}});
ink('black',()=>{if(t>8.2){const p=H.ease.out(P(t,8.2,9));c.save();c.translate(252,495);c.scale(p,p);ring(c,0,0,100,76);c.restore();}if(t>9){const p=H.ease.out(P(t,9,9.8));c.save();c.translate(155,565);c.rotate(-Math.PI/4);c.fillRect(0,-6,475*p,12);c.restore();}});
ink('black',()=>{const stage=t<5.2?0:t<10?1:2;const start=[.8,5.2,10][stage];const p=H.ease.out(P(t,start,start+.55));c.save();c.beginPath();c.rect(800,150,425*p,440);c.clip();
if(stage===0){txt('start',810,220,74);txt('simple.',810,300,74);txt('circle',815,395,32);txt('square',815,445,32);txt('triangle',815,495,32);}
if(stage===1){txt('find',810,220,74);txt('rhythm.',810,300,74);txt('Move the forms.',815,415,30);txt('Let them overlap.',815,458,30);}
if(stage===2){txt('form',810,225,90);txt('in',810,320,90);txt('motion.',810,415,90);txt('A study in balance.',815,495,30);}
c.restore();});
ink('red',()=>c.fillRect(810,545,350*H.ease.out(P(t,11.2,12)),12));
ink('black',()=>{if(t>11.7){txt('BAUHAUS POSTER',95,620,30);txt('SHAPE / COLOR / SPACE',810,620,25);}});
inkify(L,21,.22,.004);ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(L,0,0);ctx.restore();
      // ---------- finish: fold creases, wear, grain ----------
      const crease = (x0, y0, x1, y1, wdt) => {
        const g = ctx.createLinearGradient(x0 - (y1 - y0 ? wdt : 0), y0 - (y1 - y0 ? 0 : wdt), x0 + (y1 - y0 ? wdt : 0), y0 + (y1 - y0 ? 0 : wdt));
        g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(0.45, 'rgba(255,250,235,0.18)'); g.addColorStop(0.55, 'rgba(70,50,30,0.14)'); g.addColorStop(1, 'rgba(70,50,30,0)');
        ctx.fillStyle = g;
        if (x0 === x1) ctx.fillRect(x0 - wdt, 0, wdt * 2, HH); else ctx.fillRect(0, y0 - wdt, W, wdt * 2);
      };
      crease(W / 2 + 3, 0, W / 2 + 3, HH, 7);
      crease(0, HH / 2 - 2, W, HH / 2 - 2, 6);
      // scuffs along the folds
      const rs = H.rng(31); ctx.fillStyle = 'rgba(245,238,220,0.5)';
      for (let i = 0; i < 260; i++) { const along = rs.range(0, 1); if (rs() < 0.5) ctx.fillRect(W / 2 + 2 + rs.gauss() * 1.2, along * HH, 1.2, rs.range(1, 4)); else ctx.fillRect(along * W, HH / 2 - 2 + rs.gauss() * 1.2, rs.range(1, 4), 1.2); }
      H.grain(ctx, W, HH, 0.07, 9 + Math.floor(t * 12), true);
      H.vignette(ctx, W, HH, 0.18, '60,40,20');
}
function scoreSound(k){k.bed('room',0,14.8,{gain:.06});
[1.1,2.3,3.5,8.2].forEach((t,i)=>{k.noise(t+.12,{dur:.075,color:'brown',filter:'lowpass',f:650,gain:.22,a:.002});k.tone(t+.12,{f:[220,277,330,165][i],type:'triangle',dur:.15,gain:.12,a:.002});});
[.8,5.2,10,11.7].forEach(t=>[0,.09,.18].forEach(d=>k.noise(t+d,{dur:.025,color:'pink',filter:'bandpass',f:1800,gain:.10,a:.002})));
k.noise(5.2,{dur:2.8,color:'pink',filter:'bandpass',f:650,gain:.055,a:.3});k.noise(9,{dur:.8,color:'pink',filter:'bandpass',f:900,gain:.07,a:.03});
['C4','E4','G4'].forEach((f,i)=>k.tone(11.8+i*.09,{f,type:'sine',dur:1.2,gain:.085,a:.02}));}
window.BAUHAUS_STUDIO={draw,scoreSound,duration:15,width:1280,height:720,assets:()=>exPaper(1280,720)};window.DURATION=15;window.scoreSound=scoreSound;
})();
