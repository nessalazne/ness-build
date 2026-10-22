(() => {
'use strict';
const styles = window.MOTION_STYLES;
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches, detailPaused = reducedMotion.matches, selected = null;
let category = 'All styles', filtered = styles, toastTimer, frameTime = 0;
let detailTime = 0, detailLast = 0, previousFocus = null;
const visible = new Map(), tiles = new Map(), pixelBuffers = new Map(), TAU = Math.PI * 2;
const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const numbered = id => String(id).padStart(2, '0');

function promptFor(s) {
  const topic = $('topic').value.trim() || '[YOUR TOPIC]';
  const dimensions = $('format').value === 'landscape' ? '1920 × 1080, 16:9 landscape' : '1080 × 1920, 9:16 vertical';
  return `Create an original 12-second silent animated B-roll sequence about "${topic}" in the ${s.name.toLowerCase()} direction. Output: ${dimensions}, 30 fps.\n\nART DIRECTION\n${s.direction}\nUse this palette as a starting point: ${s.palette.join(', ')}. Adapt the composition to the topic with original symbols and shapes.\n\nMOTION\n${s.motion}\n0–3 seconds: establish one clear visual idea. 3–8 seconds: show a meaningful change or relationship. 8–10 seconds: resolve the idea. 10–12 seconds: hold the result, with only subtle residual movement. Use deliberate easing and stagger related actions so the eye can follow them.\n\nCOMPOSITION\nKeep the focal subject inside the central 70% of the frame. Preserve safe margins for social-platform controls. Use no more than six on-screen words at once. Make all text readable at phone size. If the topic needs numbers or factual claims, use only supplied information; mark missing values as placeholders.\n\nDELIVERY\nMake the visual sequence communicate the topic without narration. No logos, watermarks, recognizable characters, or borrowed footage. If video rendering is available, provide the finished MP4 and editable source. Otherwise provide a timed storyboard and implementation-ready animation plan, and state what still needs rendering.`.replaceAll('–', '-');
}

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

async function copyPrompt(s) {
  const text = promptFor(s);
  try {
    await navigator.clipboard.writeText(text);
    notify('Prompt copied');
  } catch {
    if (!$('style-dialog').open || selected?.id !== s.id) openStyle(s);
    $('prompt').focus();
    $('prompt').select();
    notify('Prompt selected. Press Ctrl+C or ⌘C to copy.');
  }
}

function updatePrompt() {
  if (!selected) return;
  $('prompt').value = promptFor(selected);
  $('prompt-length').textContent = `${$('prompt').value.trim().split(/\s+/).length} words`;
}

function openStyle(s) {
  const dialog = $('style-dialog');
  if (!dialog.open) previousFocus = document.activeElement;
  selected = s;
  detailTime = 0;
  detailLast = 0;
  detailPaused = paused;
  $('detail-motion').textContent = detailPaused ? 'Play' : 'Pause';
  $('modal-title').textContent = s.name;
  $('modal-category').textContent = s.category;
  $('modal-index').textContent = `STYLE ${numbered(s.id)} / ${styles.length}`;
  $('modal-description').textContent = `${s.description} ${s.direction}`;
  $('detail-canvas').setAttribute('aria-label', `${s.name}: ${s.description}`);
  $('swatches').replaceChildren(...s.palette.map(color => {
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color;
    swatch.title = color;
    swatch.setAttribute('aria-label', color);
    return swatch;
  }));
  updatePrompt();
  draw($('detail-canvas'), s, 3.5);
  if (!dialog.open) {
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  dialog.scrollTop = 0;
}

function changeStyle(direction) {
  const index = filtered.findIndex(s => s.id === selected.id);
  openStyle(filtered[(index + direction + filtered.length) % filtered.length]);
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const canvas = entry.target;
    if (entry.isIntersecting) visible.set(canvas, styles[Number(canvas.dataset.id) - 1]);
    else visible.delete(canvas);
  });
}, {rootMargin: '0px', threshold: 0.08});

function renderGallery() {
  observer.disconnect();
  visible.clear();
  const query = $('search').value.trim().toLowerCase();
  filtered = styles.filter(s => (category === 'All styles' || s.category === category) && `${s.name} ${s.category} ${s.description} ${s.direction}`.toLowerCase().includes(query));
  const fragment = document.createDocumentFragment();
  filtered.forEach(s => {
    const card = document.createElement('article');
    card.className = 'card';
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'card-preview';
    preview.setAttribute('aria-label', `Explore ${s.name} and its prompt`);
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360; canvas.dataset.id = s.id;
    canvas.setAttribute('aria-hidden', 'true');
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = '<span>Explore style ↗</span>';
    preview.append(canvas, overlay);
    preview.addEventListener('click', () => openStyle(s));
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const label = document.createElement('span'); label.textContent = s.category.toUpperCase();
    const num = document.createElement('span'); num.textContent = numbered(s.id);
    meta.append(label, num);
    const bottom = document.createElement('div'); bottom.className = 'card-bottom';
    const title = document.createElement('button'); title.className = 'card-title-button';
    const heading = document.createElement('h2'); heading.textContent = s.name; title.append(heading);
    title.addEventListener('click', () => openStyle(s));
    const copy = document.createElement('button'); copy.className = 'card-copy'; copy.textContent = 'Copy prompt ↗';
    copy.setAttribute('aria-label', `Copy ${s.name} prompt`);
    copy.addEventListener('click', () => copyPrompt(s));
    bottom.append(title, copy);
    const description = document.createElement('p'); description.className = 'card-description'; description.textContent = s.description;
    card.append(preview, meta, bottom, description);
    fragment.append(card);
    draw(canvas, s, 3.5);
    observer.observe(canvas);
  });
  $('gallery').replaceChildren(fragment);
  $('empty').hidden = filtered.length > 0;
  $('result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'style' : 'styles'}${category !== 'All styles' ? ' / ' + category : ''}`;
}

function makeFilters() {
  ['All styles', ...new Set(styles.map(s => s.category))].forEach(name => {
    const button = document.createElement('button'); button.className = 'filter';
    button.setAttribute('aria-pressed', String(name === category));
    const title = document.createTextNode(name);
    const count = document.createElement('span');
    count.textContent = name === 'All styles' ? styles.length : styles.filter(s => s.category === name).length;
    button.append(title, count);
    button.addEventListener('click', () => {
      category = name;
      [...$('filters').children].forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      renderGallery();
    });
    $('filters').append(button);
  });
}

function texture(s) {
  if (tiles.has(s.id)) return tiles.get(s.id);
  const tile = document.createElement('canvas'); tile.width = tile.height = 128;
  const c = tile.getContext('2d');
  let seed = s.id * 971;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const speckled = ['sketch','chalk','ink','wash','paint','paper','print','emboss','clay'].includes(s.treatment);
  if (speckled) {
    for (let i = 0; i < 550; i++) {
      c.fillStyle = i % 2 ? '#00000013' : '#ffffff25';
      c.fillRect(random() * 128, random() * 128, random() * 1.5 + .4, random() * 1.5 + .4);
    }
  }
  if (['terminal','pixel','retro'].includes(s.treatment)) {
    c.fillStyle = '#00000017';
    for (let y = 0; y < 128; y += 4) c.fillRect(0, y, 128, 1);
  }
  tiles.set(s.id, tile);
  return tile;
}

function draw(canvas, s, seconds) {
  if (s.treatment === 'pixel' && canvas.width > 240) {
    if (!pixelBuffers.has(s.id)) {
      const buffer = document.createElement('canvas'); buffer.width = 240; buffer.height = 135;
      pixelBuffers.set(s.id, buffer);
    }
    const buffer = pixelBuffers.get(s.id);
    draw(buffer, s, seconds);
    const output = canvas.getContext('2d');
    output.setTransform(1, 0, 0, 1, 0, 0);
    output.imageSmoothingEnabled = false;
    output.drawImage(buffer, 0, 0, canvas.width, canvas.height);
    return;
  }
  const c = canvas.getContext('2d');
  const [bg, a, b, d] = s.palette;
  const t = seconds % 12, angle = t / 12 * TAU;
  const reveal = .25 + .75 * ease(t / 2);
  const lineStyle = ['sketch','chalk','ink','blueprint','wire','contour','outline'].includes(s.treatment);
  const glow = ['neon','particles','radar'].includes(s.treatment);
  const tactile = ['paper','clay','glass','metal','emboss','iso'].includes(s.treatment);
  c.setTransform(canvas.width / 960, 0, 0, canvas.height / 540, 0, 0);
  c.clearRect(0, 0, 960, 540); c.fillStyle = bg; c.fillRect(0, 0, 960, 540);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 3;
  function path(points, color, width = 3, close = false, fill = false) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
    if (close) c.closePath();
    c.strokeStyle = color; c.lineWidth = width;
    if (fill) { c.fillStyle = color; c.fill(); } else c.stroke();
  }
  function material(color, x, y, size) {
    if (s.treatment === 'metal' || s.treatment === 'glass') {
      const gradient = c.createLinearGradient(x - size, y - size, x + size, y + size);
      gradient.addColorStop(0, color); gradient.addColorStop(.42, bg); gradient.addColorStop(.52, d); gradient.addColorStop(1, color);
      return gradient;
    }
    return color;
  }
  function shape(x, y, size, color, kind = 'circle', rotation = 0) {
    c.save(); c.translate(x, y); c.rotate(rotation);
    if (glow) { c.shadowBlur = 18; c.shadowColor = color; }
    if (tactile) { c.shadowColor = '#00000030'; c.shadowBlur = 20; c.shadowOffsetX = 8; c.shadowOffsetY = 12; }
    c.beginPath();
    if (kind === 'box') c.roundRect(-size, -size, size * 2, size * 2, s.treatment === 'pixel' ? 0 : size * .17);
    else if (kind === 'triangle') { c.moveTo(0, -size); c.lineTo(size, size * .8); c.lineTo(-size, size * .8); c.closePath(); }
    else c.arc(0, 0, size, 0, TAU);
    c.fillStyle = material(color, 0, 0, size);
    c.strokeStyle = color; c.lineWidth = s.treatment === 'chalk' ? 6 : 3;
    if (lineStyle) { c.stroke(); if (s.treatment === 'sketch') { c.translate(3, -2); c.globalAlpha = .3; c.stroke(); } }
    else c.fill();
    if (s.treatment === 'glass') { c.shadowBlur = 0; c.strokeStyle = '#ffffff75'; c.lineWidth = 2; c.stroke(); }
    c.restore();
  }
  function text(value, x, y, size = 16, color = a, align = 'left') {
    c.fillStyle = color; c.textAlign = align;
    c.font = `${s.treatment === 'type' ? '700 ' : ''}${size}px ${s.treatment === 'serif' ? 'Georgia' : ['terminal','pixel','blueprint'].includes(s.treatment) ? 'monospace' : 'Arial'}`;
    c.fillText(value, x, y);
  }
  c.save();
  if (['blueprint','terminal','chart','radar','wire'].includes(s.treatment)) {
    c.globalAlpha = .12;
    for (let x = 0; x < 960; x += 48) path([[x,0],[x,540]],a,1);
    for (let y = 0; y < 540; y += 48) path([[0,y],[960,y]],a,1);
  }
  if (s.treatment === 'sketch') {
    c.globalAlpha = .12;
    for (let y = 78; y < 510; y += 34) path([[28,y],[932,y]],a,1);
  }
  c.restore();
  text('DC / MOTION STUDY', 34, 38, 12);
  text(numbered(s.id), 926, 38, 12, a, 'right');
  c.save(); c.globalAlpha = reveal;
  if (s.motif === 'orbit') {
    for (let j = 0; j < 3; j++) {
      c.save(); c.translate(480, 278); c.rotate((j - 1) * .65 + angle * .08);
      c.strokeStyle = [a,b,d][j]; c.globalAlpha = .55; c.lineWidth = lineStyle ? 2 : 1.5;
      c.beginPath(); c.ellipse(0,0,230,80,0,0,TAU); c.stroke(); c.restore();
      const theta = angle + j * 2.1;
      shape(480 + Math.cos(theta) * 220, 278 + Math.sin(theta) * 115, 21 + j * 8, [a,b,d][j], j === 1 ? 'box' : 'circle', theta * .2);
    }
    shape(480,278,60 + Math.sin(angle) * 5,a);
    if (!lineStyle) shape(466,263,18,b);
  } else if (s.motif === 'network' || s.motif === 'branch') {
    const nodes = s.motif === 'branch' ? [[180,365],[350,290],[510,240],[675,160],[760,290],[525,385],[365,150]] : [[185,285],[365,170],[365,365],[570,270],[770,170],[770,365]];
    const edges = s.motif === 'branch' ? [[0,1],[1,2],[2,3],[2,4],[1,5],[1,6]] : [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]];
    edges.forEach(([from,to], i) => {
      const p=nodes[from], q=nodes[to];
      path([p,q],b,s.motif === 'branch' ? 6 : 2);
      const f = (t / 3 + i * .13) % 1;
      shape(p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f,6,d);
    });
    nodes.forEach(([x,y], i) => {
      const scale = .8 + .2 * Math.sin(angle + i);
      shape(x,y,(i === 0 ? 29 : 24)*scale, i % 2 ? a : d, s.treatment === 'organic' ? 'triangle' : 'circle', i*.8);
      if (s.motif === 'network') text(['IN','01','02','03','OUT','END'][i],x,y+51,13,a,'center');
    });
  } else if (s.motif === 'rings') {
    for (let i = 8; i > 0; i--) {
      c.save(); c.translate(480,278); c.rotate(angle*.1 + i*.05);
      c.strokeStyle = [a,b,d][i%3]; c.lineWidth = s.treatment === 'emboss' ? 12 : s.treatment === 'contour' ? 3 : 7;
      if (glow) { c.shadowBlur=13; c.shadowColor=c.strokeStyle; }
      c.beginPath();
      for (let k=0; k<=100; k++) {
        const theta=k/100*TAU, radius=24+i*20+Math.sin(theta*3+angle+i*.3)*8;
        const x=Math.cos(theta)*radius*1.35, y=Math.sin(theta)*radius*.8;
        k ? c.lineTo(x,y) : c.moveTo(x,y);
      }
      c.closePath(); c.stroke(); c.restore();
    }
    shape(480,278,17,d);
    if (s.treatment === 'radar') {
      c.save(); c.translate(480,278); c.rotate(angle); const grad=c.createLinearGradient(0,0,185,0);grad.addColorStop(0,a+'99');grad.addColorStop(1,a+'00');
      c.fillStyle=grad;c.beginPath();c.moveTo(0,0);c.arc(0,0,185,-.5,0);c.closePath();c.fill();c.restore();
    }
  } else if (s.motif === 'wave' || s.motif === 'terrain') {
    const count=s.treatment === 'contour' ? 22 : 7;
    for (let i=0;i<count;i++) {
      const points=[];
      for(let x=100;x<=860;x+=10){
        const base=s.motif === 'terrain' ? Math.sin(x*.006+angle*.12)*55 + Math.cos(x*.013)*18 : Math.sin(x*.009-angle+i*.28)*45;
        points.push([x,190+i*(150/count)+base]);
      }
      if (['wash','paint'].includes(s.treatment)) {
        c.save();c.globalAlpha=.25+i/count*.3;
        path([...points,[860,420],[100,420]],[a,b,d][i%3],1,true,true);c.restore();
      } else path(points,[a,b,d][i%3],s.treatment==='contour'?2:5);
    }
    const x=100+(t/12)*760;
    shape(x,260+Math.sin(x*.009-angle)*45,12,d);
  } else if (s.motif === 'stack' || s.motif === 'collage') {
    for(let i=0;i<4;i++) {
      const settle=ease((t-i*.23)/1.4);
      c.save(); c.translate(300+i*115,305-i*24-(1-settle)*95);
      c.rotate(s.motif==='collage' ? (i-1.5)*.13+Math.sin(angle+i)*.025 : Math.sin(angle+i)*.025);
      if(s.treatment==='window') {
        c.shadowBlur=10;c.shadowColor='#0004';c.fillStyle=[a,b,d][i%3];c.fillRect(-105,-90,210,180);
        c.shadowBlur=0;c.fillStyle=bg;c.fillRect(-98,-83,196,22);text('WINDOW '+(i+1),-90,-67,11,a);
        path([[-75,30],[-35,-8],[5,12],[60,-30]],bg,4);
      } else {
        shape(0,0,94,[a,b,d][i%3],'box');
        c.shadowBlur=0;path([[-55,-30],[45,-30]],bg,6);path([[-55,-5],[20,-5]],bg,6);
        shape(40,42,14,b);
      }
      c.restore();
    }
  } else if (s.motif === 'grid') {
    for(let row=0;row<3;row++)for(let col=0;col<5;col++) {
      const i=row*5+col, x=248+col*116, y=165+row*107;
      const pulse=.72+.22*Math.sin(angle+i*.5);
      if(s.treatment==='iso') {
        const h=28+Math.sin(angle+i*.5)*15;
        path([[x-42,y],[x,y-23],[x+42,y],[x,y+23]],a,1,true,true);
        path([[x-42,y],[x,y+23],[x,y+23+h],[x-42,y+h]],b,1,true,true);
        path([[x+42,y],[x,y+23],[x,y+23+h],[x+42,y+h]],d,1,true,true);
      } else shape(x,y,37*pulse,[a,b,d][i%3],i%3===0?'circle':'box',s.treatment==='print' ? .03*Math.sin(i) : 0);
    }
  } else if (s.motif === 'chart') {
    path([[220,135],[220,400],[790,400]],b,2);
    for(let i=0;i<5;i++) {
      const h=(85+i*38+Math.sin(angle+i)*12)*ease(t/2);
      c.fillStyle=[a,b,d][i%3];c.beginPath();c.roundRect(265+i*99,400-h,64,h,9);c.fill();
      text(String(i+1).padStart(2,'0'),297+i*99,429,12,a,'center');
    }
  } else if (s.motif === 'bloom') {
    for(let i=0;i<10;i++) {
      c.save();c.translate(480,278);c.rotate(i*TAU/10+angle*.05);
      c.globalAlpha=s.treatment==='wash' ? .28 : .7;
      c.fillStyle=[a,b,d][i%3];c.beginPath();c.ellipse(0,72+Math.sin(angle+i*.4)*10,42,102,0,0,TAU);c.fill();c.restore();
    }
    shape(480,278,42,d);
  } else if (s.motif === 'arch') {
    for(let i=4;i>=0;i--) {
      c.save();c.translate(480,360);c.rotate(Math.sin(angle)*.025);
      c.lineWidth=22;c.strokeStyle=[a,b,d][i%3];
      if(tactile){c.shadowColor='#0003';c.shadowBlur=12;c.shadowOffsetY=8;}
      c.beginPath();c.moveTo(-(60+i*35),40);c.lineTo(-(60+i*35),-50);c.arc(0,-50,60+i*35,Math.PI,0);c.lineTo(60+i*35,40);c.stroke();c.restore();
    }
    shape(480+Math.sin(angle)*44,345,22,d);
  } else if(s.motif === 'sun') {
    for(let i=0;i<16;i++){
      const theta=i*TAU/16+angle*.035;
      path([[480+Math.cos(theta)*135,270+Math.sin(theta)*135],[480+Math.cos(theta)*185,270+Math.sin(theta)*185]],i%2?a:b,5);
    }
    shape(480,270,95+Math.sin(angle)*5,a);
    for(let i=0;i<5;i++)path([[190,385+i*15],[770,385+i*15]],b,2);
  } else if(s.motif === 'split') {
    const split=480+Math.sin(angle)*90;
    c.fillStyle=b;c.fillRect(split,70,960-split,400);
    shape(split,270,125,a,'circle');
    c.save();c.beginPath();c.rect(split,70,960-split,400);c.clip();shape(split,270,125,bg,'circle');c.restore();
  } else if(s.motif === 'spotlight') {
    shape(300+Math.sin(angle)*90+170,275,160,a);
    shape(340,275,58,bg,'triangle');shape(545,275,60,b,'box',angle*.1);shape(710,275,32,d);
  }
  if (['type','serif','outline','terminal'].includes(s.treatment)) {
    c.save();
    c.fillStyle=bg+'e8';c.fillRect(135,193,690,150);
    const words = s.name === 'Number counter' ? `${Math.round(86 * ease(t / 3))}` : ['MAKE','IT','MOVE'][Math.min(2,Math.floor(t/4))];
    if(s.treatment === 'outline') {
      c.font='bold 114px Arial';c.textAlign='center';c.lineWidth=2;c.strokeStyle=a;c.strokeText(words,480,310);
    } else text(s.treatment==='terminal'?'> '+words+'_':words,480,310,s.treatment==='serif'?105:96,a,'center');
    c.restore();
  }
  if(s.treatment === 'particles') {
    for(let i=0;i<65;i++) {
      const theta=i*2.399+angle*.15,r=30+((i*47)%240);
      c.fillStyle=i%3?a:d;c.globalAlpha=.25+(i%7)/10;
      c.beginPath();c.arc(480+Math.cos(theta)*r*1.4,275+Math.sin(theta)*r*.7,1+i%3,0,TAU);c.fill();
    }
  }
  c.restore();
  if(s.treatment==='print'){
    c.save();c.globalAlpha=.12;c.fillStyle=bg;
    for(let y=80;y<455;y+=12)for(let x=90;x<880;x+=12){c.beginPath();c.arc(x,y,2,0,TAU);c.fill();}c.restore();
  }
  c.fillStyle=c.createPattern(texture(s),'repeat');c.fillRect(0,0,960,540);
  c.globalAlpha=.65;text(s.name.toUpperCase(),34,508,13,a);text('LIVE STUDY',926,508,10,a,'right');c.globalAlpha=1;
  c.fillStyle=b;c.globalAlpha=.25;c.fillRect(34,524,892,2);c.globalAlpha=1;c.fillStyle=a;c.fillRect(34,524,892*t/12,2);
}

function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden) { detailLast=now; return; }
  if (now-frameTime<1000/24) return;
  frameTime=now;
  if($('style-dialog').open && selected) {
    if(!detailPaused) {
      detailTime += detailLast ? Math.min((now-detailLast)/1000,.1) : 0;
      draw($('detail-canvas'),selected,detailTime);
    }
    detailLast=now;
  } else if(!paused) {
    let count=0;
    for(const [canvas,s] of visible) {
      if(count++>=8) break;
      draw(canvas,s,now/1000+s.id*.31);
    }
  }
}

$('search').addEventListener('input',renderGallery);
$('reset').addEventListener('click',()=>{
  $('search').value='';category='All styles';
  [...$('filters').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===0)));
  renderGallery();$('search').focus();
});
function updateMotionButton() {
  $('motion-toggle').textContent=paused?'Play previews':'Pause previews';
  $('motion-toggle').setAttribute('aria-pressed',String(paused));
}
$('motion-toggle').addEventListener('click',()=>{paused=!paused;updateMotionButton();});
reducedMotion.addEventListener('change',event=>{
  paused=event.matches;detailPaused=event.matches;updateMotionButton();
  $('detail-motion').textContent=detailPaused?'Play':'Pause';
});
$('close-dialog').addEventListener('click',()=>$('style-dialog').close());
$('style-dialog').addEventListener('click',event=>{
  if(event.target!==$('style-dialog'))return;
  const box=event.target.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();
});
$('style-dialog').addEventListener('close',()=>{document.body.style.overflow='';previousFocus?.focus();});
$('detail-motion').addEventListener('click',()=>{detailPaused=!detailPaused;$('detail-motion').textContent=detailPaused?'Play':'Pause';});
$('copy-prompt').addEventListener('click',()=>copyPrompt(selected));
$('topic').addEventListener('input',updatePrompt);
$('format').addEventListener('change',updatePrompt);
$('previous').addEventListener('click',()=>changeStyle(-1));
$('next').addEventListener('click',()=>changeStyle(1));
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!$('style-dialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
    event.preventDefault();$('search').focus();
  }
});
updateMotionButton();makeFilters();renderGallery();requestAnimationFrame(animate);
})();
