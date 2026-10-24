(() => {
'use strict';
const $ = id => document.getElementById(id);
const dialog = $('sample-dialog');
const frame = $('sample-frame');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const samples = [...document.querySelectorAll('.sample-feature')].map(link => {
  const path = link.getAttribute('href');
  const slug = path.replace(/\/$/, '');
  return {
    path, video: `${path}${slug}.mp4`, preview: `previews/${slug}.mp4`, poster: link.querySelector('img').getAttribute('src'),
    title: link.querySelector('h2').textContent,
    category: link.querySelector('.eyebrow').textContent.split(' / ').slice(1).join(' / '),
    description: link.querySelector('p:not(.eyebrow)').textContent, link
  };
});
let current = 0, opener = null, paused = reducedMotion.matches;
const visible = new Set(), previews = [], promptCache = new Map();
function syncPreviews() {
  previews.forEach(video => {
    const shouldPlay = visible.has(video) && !paused && !document.hidden && !document.querySelector('dialog[open]');
    if (shouldPlay) {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {}); // The poster remains available when autoplay is blocked.
    } else video.pause();
  });
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
  syncPreviews();
}, {threshold: 0.15});
function status(message) { $('sample-status').textContent = message; }
async function loadPrompt(sample) {
  if (!promptCache.has(sample.path)) {
    const request = fetch(`${sample.path}prompt.txt`).then(response => {
      if (!response.ok) throw new Error('Prompt unavailable');
      return response.text();
    }).catch(error => { promptCache.delete(sample.path); throw error; });
    promptCache.set(sample.path, request);
  }
  return promptCache.get(sample.path);
}
function openSample(index) {
  if (index < 0 || index >= samples.length) return;
  const sample = samples[index];
  if (!dialog.open) opener = document.activeElement;
  current = index;
  status('');
  $('sample-title').textContent = sample.title;
  $('sample-index').textContent = `#${String(index + 1).padStart(2, '0')} / ${samples.length}`;
  $('sample-category').textContent = sample.category;
  $('sample-previous').disabled = index === 0;
  $('sample-next').disabled = index === samples.length - 1;
  frame.title = `${sample.title}: full animation and controls`;
  frame.style.visibility = 'hidden';
  frame.setAttribute('aria-busy', 'true');
  // The original player's render flag starts paused and leaves all controls available.
  frame.src = `${sample.path}?render=1`;
  if (!dialog.open) { dialog.showModal(); document.body.style.overflow = 'hidden'; }
  syncPreviews();

}
async function copySample(index) {
  const sample = samples[index];
  try {
    const text = await loadPrompt(sample);
    // A response for a previous slide must not overwrite the current selection.
    if (dialog.open && samples[current] !== sample) return;
    try {
      await navigator.clipboard.writeText(text);
      if (dialog.open) status('Prompt copied');
      else {
        $('toast').textContent = 'Prompt copied'; $('toast').classList.add('show');
        setTimeout(() => $('toast').classList.remove('show'), 2400);
      }
    } catch {
      if (!dialog.open || current !== index) openSample(index);
      status('Clipboard access is unavailable. Use Download prompt in the sample.');
    }
  } catch {
    if (!dialog.open) openSample(index);
    status('The prompt could not load. Try again or open the full sample.');
  }
}
samples.forEach((sample, index) => {
  const card = document.createElement('article'); card.className = 'card sample-card';
  const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'card-preview';
  preview.setAttribute('aria-label', `Watch ${sample.title}`);
  const video = document.createElement('video');
  video.poster = sample.poster; video.dataset.src = sample.preview; video.preload = 'none';
  video.addEventListener('error', () => { if (video.dataset.src !== sample.video) { video.dataset.src = sample.video; video.removeAttribute('src'); syncPreviews(); } });
  video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('aria-hidden', 'true');
  const overlay = document.createElement('span'); overlay.className = 'preview-overlay';
  overlay.innerHTML = '<span aria-hidden="true">▶</span>';
  preview.append(video, overlay); preview.addEventListener('click', () => openSample(index));
  const body = document.createElement('div'); body.className = 'card-body';
  const meta = document.createElement('div'); meta.className = 'card-meta';
  const number = document.createElement('span'); number.textContent = '#' + String(index + 1).padStart(2, '0');
  const category = document.createElement('span'); category.textContent = sample.category;
  meta.append(number, category);
  const title = document.createElement('button'); title.className = 'card-title-button';
  const heading = document.createElement('h2'); heading.textContent = sample.title; title.append(heading);
  title.addEventListener('click', () => openSample(index));
  const description = document.createElement('p'); description.className = 'card-description'; description.textContent = sample.description;
  const copy = document.createElement('button'); copy.className = 'card-copy'; copy.textContent = 'Copy prompt';
  copy.setAttribute('aria-label', `Copy ${sample.title} prompt`); copy.addEventListener('click', () => copySample(index));
  body.append(meta, title, description, copy); card.append(preview, body);
  card.addEventListener('click', event => { if (!event.target.closest('button, a')) openSample(index); });
  sample.link.replaceWith(card); previews.push(video); observer.observe(video);
});
$('sample-close').addEventListener('click', () => dialog.close());
$('sample-previous').addEventListener('click', () => openSample(current - 1));
$('sample-next').addEventListener('click', () => openSample(current + 1));
$('sample-copy').addEventListener('click', () => copySample(current));
frame.addEventListener('load', () => {
  if (!dialog.open || frame.getAttribute('src') === 'about:blank') return;
  const doc = frame.contentDocument;
  if (!doc || !doc.getElementById('play')) {
    frame.style.visibility = 'visible';
    frame.removeAttribute('aria-busy');
    status('The sample could not load. Close the popup and try again.');
    return;
  }
  const layout = doc.createElement('style');
  layout.textContent = `
    html{color-scheme:dark}body{background:#050505}
    .page{max-width:1100px;padding:16px 24px 24px}
    .top{padding-bottom:12px}.hero{margin:18px 0;gap:20px}
    .hero h1{font-size:32px}.hero .eyebrow{margin-bottom:8px;font-size:9px}
    .hero>p{font-size:12px;max-width:350px}
    .film-wrap{width:min(100%,720px,calc((100dvh - 190px)*16/9));margin-inline:auto}
    .under{gap:28px;margin:26px 0}.controls{gap:10px;padding:12px}
    @media(max-width:700px){
      .page{padding:14px 14px 24px}.hero{margin:16px 0}
      .hero h1{font-size:28px}.hero>p{margin-top:12px;max-width:none}
      .film-wrap{width:100%}.controls{gap:8px}.under{gap:20px}
    }
  `;
  doc.head.append(layout);
  doc.querySelector('.top a[href="../"]')?.addEventListener('click', event => { event.preventDefault(); dialog.close(); });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); dialog.close(); }
    else if (!['INPUT','TEXTAREA','SELECT'].includes(doc.activeElement.tagName) && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault(); openSample(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  Promise.resolve(frame.contentWindow.renderReady).then(() => {
    if (!dialog.open || frame.contentDocument !== doc) return;
    frame.contentWindow.seek(0);
    frame.style.visibility = 'visible';
    frame.removeAttribute('aria-busy');
  }).catch(() => {
    if (!dialog.open || frame.contentDocument !== doc) return;
    frame.style.visibility = 'visible';
    frame.removeAttribute('aria-busy');
    status('The animation could not initialize. Try the MP4 download in the sample.');
  });
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  frame.src = 'about:blank';
  document.body.style.overflow = ''; opener?.focus({preventScroll: true}); syncPreviews();
});
new MutationObserver(syncPreviews).observe($('style-dialog'), {attributes: true, attributeFilter: ['open']});
document.addEventListener('preview-motion-change', event => { paused = event.detail.paused; syncPreviews(); });
document.addEventListener('visibilitychange', syncPreviews);
reducedMotion.addEventListener('change', event => {
  const play = frame.contentDocument?.getElementById('play');
  if (event.matches && play?.getAttribute('aria-pressed') === 'true') play.click();
});
document.addEventListener('keydown', event => {
  if (!dialog.open || ['INPUT','TEXTAREA','SELECT','VIDEO'].includes(document.activeElement.tagName)) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); openSample(current + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
})();
