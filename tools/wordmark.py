"""Build the GranthAI wordmark as SVG paths: Latin letters hanging from a
Devanagari-style headline (shirorekha)."""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

def wordmark(font_path, text="GranthAI", bar=0.075, track=0.0, color="#1f3a2e", accent=None, split=6, bar_from=0, bar_to=None, gap=0.0, bar_ext=0.06):
    f = TTFont(font_path)
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    os2 = f['OS/2']; xh = getattr(os2, 'sxHeight', 0) or upm*0.5; cap = getattr(os2, 'sCapHeight', 0) or upm*0.7
    x = 0; parts = []; boxes = []
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(pen)
        bp = BoundsPen(gs); gs[g].draw(bp)
        col = accent if (accent and i >= split) else color
        parts.append((x, pen.getCommands(), col)); boxes.append((x, bp.bounds))
        x += gs[g].width + track*upm + (gap*upm if i == split-1 else 0)
    width = x
    th = bar*upm; top = xh + th*0.35   # bar sits on top of the x-height letters
    x0 = boxes[0][0] + boxes[0][1][0]; x1 = boxes[-1][0] + boxes[-1][1][2]
    bt = len(text)-1 if bar_to is None else bar_to
    b0 = boxes[bar_from][0] + boxes[bar_from][1][0] - bar_ext*upm; b1 = boxes[bt][0] + boxes[bt][1][2] + bar_ext*upm
    asc = max(b[1][3] for b in boxes); desc = min(b[1][1] for b in boxes)
    pad = upm*0.04
    vb = (x0 - pad, -(max(asc, top) + pad), (x1 - x0) + 2*pad, (max(asc, top) - desc) + 2*pad)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" role="img" aria-label="{text}">']
    out.append(f'<rect x="{b0:.0f}" y="{-top:.0f}" width="{b1-b0:.0f}" height="{th:.0f}" rx="{th*0.2:.0f}" fill="{color}"/>')
    for xo, d, col in parts:
        out.append(f'<path transform="translate({xo:.0f} 0) scale(1 -1)" d="{d}" fill="{col}"/>')
    out.append('</svg>')
    return "\n".join(out)

if __name__ == "__main__":
    font, dst = sys.argv[1], sys.argv[2]
    kw = {}
    if len(sys.argv) > 3: kw['accent'] = sys.argv[3]
    for a in sys.argv[4:]:
        k,v=a.split('='); kw[k]=float(v) if '.' in v else int(v)
    open(dst, "w").write(wordmark(font, **kw))
