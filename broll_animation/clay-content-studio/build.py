"""Bundle the working page, offline player, and reusable prompt from editable sources."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent
font_css = '\n'.join(
    "@font-face{font-family:Fredoka;font-weight:" + weight + ";font-style:normal;src:url(data:font/ttf;base64," + base64.b64encode((root / f'lib/fredoka-{weight}.ttf').read_bytes()).decode() + ") format('truetype')}"
    for weight in ['600', '700']
)
scripts = '\n'.join('<script>\n' + (root / filename).read_text() + '\n</script>' for filename in ['lib/harness.js', 'lib/sound.js', 'lib/clay.js', 'scene.js', 'player.js'])
template = (root / 'page.html').read_text()
page = template.replace('/* FONTS */', font_css).replace('<!-- SCRIPTS -->', scripts)
(root / 'index.html').write_text(page)

# The offline player has no download/copy calls and does not need a server.
offline = page
start = offline.index('<div class="under">')
end = offline.index('</main>', start)
offline = offline[:start] + offline[end:]
offline = offline.replace('<a href="../">← B-ROLL MOTION LIBRARY</a>', '<span>AISOCIALHUB / CLAY CONTENT STUDIO</span>')
(root / 'animation.html').write_text(offline)

prompt_html = offline.replace(font_css, "@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&display=block');")
(root / 'prompt.txt').write_text((root / 'prompt-brief.txt').read_text() + '\n```html\n' + prompt_html + '\n```\n')
print('Built index.html, offline animation.html, and prompt.txt')
