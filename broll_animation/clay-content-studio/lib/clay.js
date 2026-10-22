/* Clay rendering helpers adapted from the user-supplied Soft 3D Clay Motion Prompt. */
(function(){
  function roundedPoly(pts) {
    const p = new Path2D();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[n - 1], pts[0]);
    p.moveTo(start[0], start[1]);
    for (let i = 0; i < n; i++) {
      const c = pts[i], nx = pts[(i + 1) % n];
      const m = mid(c, nx);
      p.arcTo(c[0], c[1], m[0], m[1], c[2] || 0);
    }
    p.closePath();
    return p;
  }
  // inner shadow: the casting fill is pushed far off-canvas in device space so only its shadow lands (no hairline)
  function innerShadow(ctx, path, rule, bb, color, blur, dx, dy) {
    const OFF = 5000;
    ctx.save();
    ctx.clip(path, rule);
    const p2 = new Path2D();
    const m = 400;
    p2.rect(bb[0] - m, bb[1] - m, bb[2] - bb[0] + 2 * m, bb[3] - bb[1] + 2 * m);
    p2.addPath(path);
    const M = ctx.getTransform();
    ctx.setTransform(new DOMMatrix().translate(OFF, 0).multiply(M));
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx - OFF; ctx.shadowOffsetY = dy;
    ctx.fillStyle = '#000';
    ctx.fill(p2, 'evenodd');
    ctx.restore();
  }
  let EXT = null;
  // o: {x,y,rot,s, path, rule, bb, face:[light,mid,dark], side:[light,dark], ext:[ex,ey], spec:[x,y,rx,ry]}
  function puffy(ctx, o) {
    const rule = o.rule || 'nonzero';
    const [ex, ey] = o.ext;
    const n = Math.ceil(Math.hypot(ex, ey) * 1.5);
    const W = ctx.canvas.width, Hh = ctx.canvas.height;
    const base = ctx.getTransform();
    let lc = ctx;
    if (!o.fast) {
      if (!EXT || EXT.width !== W) EXT = H.layer(W, Hh);
      lc = EXT.getContext('2d');
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, Hh);
    } else ctx.save();
    const bounce = H.mix(o.side[0], '#ffffff', 0.35);
    for (let i = n; i >= 1; i--) {
      const k = i / n;
      lc.setTransform(base); lc.translate(o.x + ex * k, o.y + ey * k); lc.rotate(o.rot || 0); lc.scale(o.s, o.s);
      const c = k > 0.86 ? H.mix(o.side[1], bounce, (k - 0.86) / 0.14) : k < 0.25 ? H.mix(o.face[2], o.side[0], k / 0.25) : H.mix(o.side[0], o.side[1], (k - 0.25) / 0.61);
      lc.fillStyle = H.rgba(c);
      lc.fill(o.path, rule);
    }
    if (!o.fast) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'blur(1.4px)'; ctx.drawImage(EXT, 0, 0); ctx.restore(); }
    else { ctx.restore(); ctx.setTransform(base); }
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0); ctx.scale(o.s, o.s);
    const bb = o.bb;
    const g = ctx.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
    g.addColorStop(0, H.rgba(o.face[0])); g.addColorStop(0.5, H.rgba(o.face[1])); g.addColorStop(1, H.rgba(o.face[2]));
    ctx.fillStyle = g; ctx.fill(o.path, rule);
    const S = o.s * Math.hypot(base.a, base.b);
    innerShadow(ctx, o.path, rule, bb, H.rgba(o.side[1], 0.5), 40 * S, -16 * S, -20 * S); // core shadow toward bottom-right
    innerShadow(ctx, o.path, rule, bb, H.rgba(o.side[0], 0.35), 14 * S, 0, 0);            // rounded falloff at every edge
    innerShadow(ctx, o.path, rule, bb, 'rgba(255,255,255,0.72)', 26 * S, 12 * S, 14 * S);  // soft top-left highlight
    if (o.spec) {
      ctx.save(); ctx.clip(o.path, rule);
      const [sx, sy, rx, ry] = o.spec;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx);
      sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.translate(sx, sy); ctx.scale(1, ry / rx); ctx.translate(-sx, -sy);
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, rx, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  function sphere(ctx, x, y, r, light, mid, dark) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.05);
    g.addColorStop(0, H.rgba(light)); g.addColorStop(0.55, H.rgba(mid)); g.addColorStop(1, H.rgba(dark));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    const p = new Path2D(); p.arc(x, y, r, 0, 7);
    innerShadow(ctx, p, 'nonzero', [x - r, y - r, x + r, y + r], H.rgba(H.mix(light, '#ffffff', 0.5), 0.8), r * 0.12, -r * 0.05, -r * 0.06);
    const s = ctx.createRadialGradient(x - r * 0.38, y - r * 0.45, 0, x - r * 0.38, y - r * 0.45, r * 0.42);
    s.addColorStop(0, 'rgba(255,255,255,0.9)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  function contactShadow(ctx, x, y, w, h, alpha, blur) {
    ctx.save(); ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = `rgba(110,80,170,${alpha})`;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 7); ctx.fill();
    ctx.filter = `blur(${blur * 0.4}px)`; ctx.fillStyle = `rgba(90,60,150,${alpha * 0.8})`;
    ctx.beginPath(); ctx.ellipse(x, y, w * 0.55, h * 0.45, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

window.CLAY={roundedPoly,puffy,sphere,contactShadow};
})();
