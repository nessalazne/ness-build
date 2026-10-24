(()=>{'use strict';let paperCache=null;function draw(ctx,W,H_,t){
      const nz = H.makeNoise(88);

if(!paperCache){const target=ctx;paperCache=H.layer(W,H_);ctx=paperCache.getContext('2d');
      // ---------- paper: mottled, sun-faded prussian blue (half-res) ----------
      {
        const w2 = W / 2, h2 = H_ / 2, pl = H.layer(w2, h2), pc = pl.getContext('2d');
        const id = pc.createImageData(w2, h2), d = id.data;
        const base = [22, 58, 112];
        for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
          const m = nz.fbm2(x * 0.008, y * 0.008, 4) * 0.2 + nz.fbm2(x * 0.05 + 10, y * 0.05, 2) * 0.06 + Math.max(0, nz.fbm2(x * 0.004 + 40, y * 0.004, 3) - 0.15) * 0.5;
          const fade = Math.max(0, 1 - Math.hypot(x - w2 * 0.2, y - h2 * 0.15) / (w2 * 0.9)) * 0.16; // sun-faded corner
          const ex = Math.min(x, w2 - x) / w2, ey = Math.min(y, h2 - y) / h2;
          const edge = (1 - H.smooth(0, 0.12, Math.min(ex * 1.8, ey))) * 0.3;
          const k = 1 + m + fade - edge;
          const i = (y * w2 + x) * 4;
          d[i] = base[0] * k + fade * 40; d[i + 1] = base[1] * k + fade * 30; d[i + 2] = base[2] * k + fade * 25; d[i + 3] = 255;
        }
        pc.putImageData(id, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.drawImage(pl, 0, 0, W, H_);
        // speckle flaws
        const rr = H.rng(4);
        for (let i = 0; i < 1600; i++) {
          ctx.fillStyle = rr.chance(0.7) ? `rgba(160,190,230,${rr.range(0.05, 0.25)})` : `rgba(5,20,50,${rr.range(0.1, 0.3)})`;
          ctx.fillRect(rr.range(0, W), rr.range(0, H_), rr.range(0.6, 1.8), rr.range(0.6, 1.8));
        }
      }

ctx=target;}ctx.drawImage(paperCache,0,0);
      // ---------- line layer ----------
      const LL = H.layer(W, H_), lc = LL.getContext('2d');
      let c = lc;
      const ink = (k) => { k.strokeStyle = '#eef4ff'; k.fillStyle = '#eef4ff'; k.lineCap = 'round'; k.lineJoin = 'round'; };
      ink(c);
      const T = (a, b) => H.clamp((t - a) / (b - a));
      // each group "develops" onto the print behind a soft wipe
      const group = (t0, t1, dir, x0, y0, x1, y1, fn) => {
        const p = T(t0, t1); if (p <= 0) return;
        const GLy = H.layer(W, H_); c = GLy.getContext('2d'); ink(c);
        fn();
        if (p < 1) {
          const e = H.ease.inOut(p), soft = 60;
          const g = dir === 'x' ? c.createLinearGradient(x0 - soft + (x1 - x0 + 2 * soft) * e - soft, 0, x0 - soft + (x1 - x0 + 2 * soft) * e, 0)
            : c.createLinearGradient(0, y0 - soft + (y1 - y0 + 2 * soft) * e - soft, 0, y0 - soft + (y1 - y0 + 2 * soft) * e);
          g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.save(); c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, W, H_); c.restore();
        }
        lc.drawImage(GLy, 0, 0); c = lc;
      };
      let POP = 10;
      const pop = () => { const tp = POP; POP += 0.085; return t >= tp; };
      const lw = (w) => { c.lineWidth = w; };
      const dash = (d) => c.setLineDash(d || []);
      const ln = (x0, y0, x1, y1, w = 1, d) => { lw(w); dash(d); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); dash(); };
      const rr_ = (x, y, w, h, r, lwid = 2.2, d) => { lw(lwid); dash(d); c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); dash(); };
      const circ = (x, y, r, lwid = 2.2, d) => { lw(lwid); dash(d); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); dash(); };
      const CENTER = [18, 4, 3, 4], HIDDEN = [7, 4];
      const arrow = (x, y, ang, s = 11) => {
        c.save(); c.translate(x, y); c.rotate(ang);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-s, -3); c.lineTo(-s, 3); c.closePath(); c.fill(); c.restore();
      };
      const label = (str, x, y, font = '700 18px "Space Mono"', align = 'center', rot = 0) => {
        c.save(); c.font = font; c.textAlign = align; c.textBaseline = 'middle'; c.translate(x, y); c.rotate(rot); c.fillText(str, 0, 0); c.restore();
      };
      // horizontal dimension: object span x0..x1, extension from yObj to yDim
      const dimH = (x0, x1, yObj, yDim, txt) => {
        if (!pop()) return;
        const s = Math.sign(yDim - yObj) || 1;
        ln(x0, yObj + s * 4, x0, yDim + s * 6, 0.9); ln(x1, yObj + s * 4, x1, yDim + s * 6, 0.9);
        ln(x0, yDim, x1, yDim, 0.9); arrow(x0, yDim, Math.PI); arrow(x1, yDim, 0);
        // gap behind text
        c.save(); c.font = '700 18px "Space Mono"'; const tw = c.measureText(txt).width; c.restore();
        c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect((x0 + x1) / 2 - tw / 2 - 4, yDim - 12, tw + 8, 24); c.restore();
        label(txt, (x0 + x1) / 2, yDim);
      };
      const dimV = (y0, y1, xObj, xDim, txt) => {
        if (!pop()) return;
        const s = Math.sign(xDim - xObj) || 1;
        ln(xObj + s * 4, y0, xDim + s * 6, y0, 0.9); ln(xObj + s * 4, y1, xDim + s * 6, y1, 0.9);
        ln(xDim, y0, xDim, y1, 0.9); arrow(xDim, y0, -Math.PI / 2); arrow(xDim, y1, Math.PI / 2);
        c.save(); c.font = '700 18px "Space Mono"'; const tw = c.measureText(txt).width; c.restore();
        c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(xDim - 12, (y0 + y1) / 2 - tw / 2 - 4, 24, tw + 8); c.restore();
        label(txt, xDim, (y0 + y1) / 2, undefined, 'center', -Math.PI / 2);
      };
      const leader = (x0, y0, x1, y1, txt, align = 'left') => {
        if (!pop()) return;
        ln(x0, y0, x1, y1, 0.9); ln(x1, y1, x1 + (align === 'left' ? 30 : -30), y1, 0.9);
        c.beginPath(); c.arc(x0, y0, 2.5, 0, 7); c.fill();
        label(txt, x1 + (align === 'left' ? 36 : -36), y1, '700 18px "Space Mono"', align);
      };

      // ---------- sheet border with zones ----------
      group(0.0, 0.5, 'x', 0, 0, W, H_, () => {
      lw(2.4); c.strokeRect(30, 30, W - 60, H_ - 60);
      lw(1); c.strokeRect(20, 20, W - 40, H_ - 40);
      for (let i = 1; i < 6; i++) { const x = 30 + (W - 60) * i / 6; ln(x, 20, x, 30, 1); ln(x, H_ - 30, x, H_ - 20, 1); }
      for (let i = 1; i < 4; i++) { const y = 30 + (H_ - 60) * i / 4; ln(20, y, 30, y, 1); ln(W - 30, y, W - 20, y, 1); }
      for (let i = 0; i < 6; i++) { const x = 30 + (W - 60) * (i + 0.5) / 6; label(String(6 - i), x, 25.5, '400 9px "Space Mono"'); label(String(6 - i), x, H_ - 25, '400 9px "Space Mono"'); }
      ['D', 'C', 'B', 'A'].forEach((L, i) => { const y = 30 + (H_ - 60) * (i + 0.5) / 4; label(L, 25, y, '400 9px "Space Mono"'); label(L, W - 25, y, '400 9px "Space Mono"'); });

      });

      group(.3,1.2,'x',65,0,1200,H_,()=>{
        label('FORM / FUNCTION',72,86,'700 36px "Space Mono"','left');
        label('MOUNTING BRACKET / CONCEPT STUDY',74,126,'700 18px "Space Mono"','left');
      });
      group(1.2,3,'x',100,0,1170,H_,()=>{
        c.globalAlpha=.4;
        [235,455].forEach(y=>ln(125,y,1165,y,1,HIDDEN));
        [230,370,680,1030].forEach(x=>ln(x,175,x,520,1,CENTER));
        c.globalAlpha=1;
      });
      group(3,5.7,'y',0,210,W,490,()=>{
        rr_(190,215,220,260,12,3);ln(190,445,410,445,2);
        [235,365].forEach(x=>[270,390].forEach(y=>{circ(x,y,18,2.4);ln(x-28,y,x+28,y,1,CENTER);ln(x,y-28,x,y+28,1,CENTER)}));
        label('FRONT',300,535,'700 22px "Space Mono"');
      });
      group(5.7,8,'y',0,215,W,480,()=>{
        c.lineWidth=3;c.beginPath();c.moveTo(600,215);c.lineTo(630,215);c.lineTo(630,445);c.lineTo(790,445);c.lineTo(790,475);c.lineTo(600,475);c.closePath();c.stroke();
        [252,288,372,408].forEach(y=>ln(600,y,630,y,1.2,HIDDEN));
        ln(730,445,730,475,1.2,HIDDEN);ln(762,445,762,475,1.2,HIDDEN);
        label('SIDE',695,535,'700 22px "Space Mono"');
      });
      group(8,10,'y',0,215,W,475,()=>{
        rr_(965,215,115,260,0,2.5);
        c.save();c.beginPath();c.rect(965,215,115,260);c.clip();for(let y=90;y<590;y+=15)ln(965,y,1080,y+115,1);c.restore();
        label('SECTION A',1022,535,'700 22px "Space Mono"');
      });
      group(10,11.3,'x',100,0,1180,H_,()=>{
        dimH(190,410,215,180,'WIDTH');dimV(215,475,190,145,'HEIGHT');
        dimH(600,790,475,495,'DEPTH');
        label('A',935,338,'700 24px "Space Mono"');label('A',1110,338,'700 24px "Space Mono"');
        ln(940,338,1100,338,1,CENTER);
      });
      group(11.3,12.4,'x',65,0,1210,H_,()=>{
        c.lineWidth=1.5;c.strokeRect(65,580,1145,82);ln(850,580,850,662,1.5);ln(1040,580,1040,662,1.5);
        label('ENGINEERING BLUEPRINT',85,610,'700 27px "Space Mono"','left');
        label('CONCEPT DRAWING / NOT TO SCALE',85,641,'700 16px "Space Mono"','left');
        label('DRAWING',870,603,'700 13px "Space Mono"','left');label('DC / 008',870,636,'700 22px "Space Mono"','left');
        label('SHEET / REV',1060,603,'700 13px "Space Mono"','left');label('01 / A',1060,636,'700 22px "Space Mono"','left');
      });
      // ---------- cyanotype line character: uneven exposure + bleed ----------
      {
        const id = lc.getImageData(0, 0, W, H_), d = id.data;
        for (let i = 3, p = 0; i < d.length; i += 4, p++) {
          if (!d[i]) continue;
          const x = p % W, y = (p / W) | 0;
          const k = 0.72 + 0.28 * (0.5 + 0.5 * nz.n2(x * 0.03, y * 0.03)) - (nz.n2(x * 0.5, y * 0.5) > 0.55 ? 0.3 : 0);
          d[i] = d[i] * k;
        }
        lc.putImageData(id, 0, 0);
      }
      ctx.save(); ctx.filter = 'blur(2.5px)'; ctx.globalAlpha = 0.45; ctx.drawImage(LL, 0, 0); ctx.restore();
      ctx.save(); ctx.filter = 'blur(0.6px)'; ctx.globalAlpha = 0.95; ctx.drawImage(LL, 0, 0); ctx.restore();

      // fine grid (printed underneath conceptually, but faint so draw after)
      ctx.save();
      for (let x = 30; x < W - 30; x += 20) { ctx.fillStyle = (x - 30) % 100 === 0 ? 'rgba(200,220,255,0.10)' : 'rgba(200,220,255,0.045)'; ctx.fillRect(x, 30, 1, H_ - 60); }
      for (let y = 30; y < H_ - 30; y += 20) { ctx.fillStyle = (y - 30) % 100 === 0 ? 'rgba(200,220,255,0.10)' : 'rgba(200,220,255,0.045)'; ctx.fillRect(30, y, W - 60, 1); }
      ctx.restore();

      // ---------- fold creases + wear ----------
      {
        const rr = H.rng(31);
        const fold = (vertical, pos) => {
          const g = vertical ? ctx.createLinearGradient(pos - 40, 0, pos + 40, 0) : ctx.createLinearGradient(0, pos - 34, 0, pos + 34);
          g.addColorStop(0, 'rgba(0,10,30,0)'); g.addColorStop(0.48, 'rgba(0,10,30,0.22)'); g.addColorStop(0.5, 'rgba(190,210,240,0.22)'); g.addColorStop(0.56, 'rgba(190,210,240,0.06)'); g.addColorStop(1, 'rgba(190,210,240,0)');
          ctx.fillStyle = g;
          if (vertical) ctx.fillRect(pos - 40, 0, 80, H_); else ctx.fillRect(0, pos - 34, W, 68);
          // abraded fibres along the crease
          for (let i = 0; i < 700; i++) {
            const a = rr.range(0, vertical ? H_ : W), o = rr.gauss() * 1.8;
            ctx.fillStyle = `rgba(200,220,245,${rr.range(0.1, 0.45)})`;
            const s = rr.range(0.6, 2.2);
            if (vertical) ctx.fillRect(pos + o, a, s * 0.7, s); else ctx.fillRect(a, pos + o, s, s * 0.7);
          }
        };
        fold(true, 427); fold(true, 853); fold(false, 362);
        // crossing points wear most
        [[427, 362], [853, 362]].forEach(([x, y]) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(200,220,245,0.28)'); g.addColorStop(1, 'rgba(200,220,245,0)');
          ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52);
        });
      }
      // slow camera drift across the sheet, settling on the full drawing
      {
        const e = H.ease.inOut(T(0, 12.5)), k = 1 + 0.05 * (1 - e);
        if (k > 1.0005) {
          const cv = ctx.canvas, snap = H.layer(cv.width, cv.height);
          snap.getContext('2d').drawImage(cv, 0, 0);
          const fx0 = W * (0.3 + 0.2 * e), fy0 = H_ * (0.4 + 0.1 * e);
          ctx.save(); ctx.translate(fx0, fy0); ctx.scale(k, k); ctx.translate(-fx0, -fy0); ctx.drawImage(snap, 0, 0, W, H_); ctx.restore();
        }
      }
      H.grain(ctx, W, H_, 0.04, 6 + (Math.floor(t * 12) % 4));
      H.vignette(ctx, W, H_, 0.3, '0,8,25');
}
function scoreSound(k){k.bed('hum',0,14.8,{gain:.07});
[1.2,3,5.7,8,10,11.3].forEach((t,i)=>{k.noise(t,{dur:i<4?1.5:.7,color:'pink',filter:'bandpass',f:2200,gain:.08,a:.05});k.tone(t,{f:180+i*40,type:'sine',dur:.1,gain:.07,a:.005});});
['C4','E4','G4'].forEach((f,i)=>k.tone(12.3+i*.09,{f,type:'sine',dur:1.2,gain:.09,a:.03}));}
window.BLUEPRINT_STUDIO={draw,scoreSound,duration:15,width:1280,height:720,assets:()=>{}};window.DURATION=15;window.scoreSound=scoreSound;})();