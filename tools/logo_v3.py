"""Cut the new (black mark, navy + berry wordmark) GranthAI logo into web assets."""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC = '/mnt/user-data/attachments/d0c72f19-302b-531a-a75d-1ecbe76900b1/7d998fff-image.jpg'
SITE = '/home/claude/granthai/site/'
A = SITE + 'assets/'
SPLIT = 330  # empty column band between mark and wordmark: 309-352

im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W, _ = im.shape


def trim(img, pad=0):
    x0, y0, x1, y1 = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def unpremult(rgb, alpha):
    a = alpha[..., None] / 255
    out = np.where(a > 0.02, np.clip((rgb - 255 * (1 - a)) / np.maximum(a, 1e-3), 0, 255), 0)
    return np.dstack([out, alpha]).astype(np.uint8)


# ---- mark: flood-fill the white background from the border, keep enclosed white (book pages, nucleus)
m = im[:, :SPLIT]
mn = m.min(axis=2)
lab, _ = ndimage.label(mn > 200)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border))
alpha = np.full(mn.shape, 255.0)
alpha[bg] = 0
band = ndimage.binary_dilation(bg, iterations=2) & ~bg
alpha[band] = np.clip((255 - mn[band]) / 200 * 255, 0, 255)
mark = trim(Image.fromarray(unpremult(m, alpha), 'RGBA'))
mark = mark.resize((round(mark.width * 300 / mark.height), 300), Image.LANCZOS)
mark.save(A + 'logo-mark.png', optimize=True)
print('mark', mark.size, mark.width / mark.height)

# ---- wordmark: alpha from distance to white (letter holes become transparent)
w = im[:, SPLIT:]
mn = w.min(axis=2)
alpha = np.clip((245 - mn) * 255 / 190, 0, 255)
word = trim(Image.fromarray(unpremult(w, alpha), 'RGBA'))
word = word.resize((round(word.width * 90 / word.height), 90), Image.LANCZOS)
word.save(A + 'wordmark.png', optimize=True)
# light version for dark backgrounds: navy -> warm white, berry -> soft rose
wa = np.asarray(word).astype(np.float32).copy()
r, g, b = wa[..., 0], wa[..., 1], wa[..., 2]
berry = (r > b + 18) & (r > 70)
navy = ~berry
wa[navy, :3] = [250, 248, 245]
wa[berry, :3] = [232, 168, 182]
Image.fromarray(wa.astype(np.uint8), 'RGBA').save(A + 'wordmark-light.png', optimize=True)
print('word', word.size)

# ---- full lockup (transparent) for the og image and video
lock_h = 300
mk = mark
wd = word.resize((round(word.width * 150 / word.height), 150), Image.LANCZOS)
gap = 40
lock = Image.new('RGBA', (mk.width + gap + wd.width, lock_h), (0, 0, 0, 0))
lock.alpha_composite(mk, (0, 0))
lock.alpha_composite(wd, (mk.width + gap, (lock_h - wd.height) // 2 + 20))
lock.save(A + 'logo-full.png', optimize=True)


def tile(size, pad=0.12, bgc=(255, 255, 255, 255), radius=0):
    t = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if radius:
        ImageDraw.Draw(t).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=bgc)
    else:
        t.paste(Image.new('RGBA', (size, size), bgc))
    h = int(size * (1 - 2 * pad))
    mm = mark.resize((round(mark.width * h / mark.height), h), Image.LANCZOS)
    t.alpha_composite(mm, ((size - mm.width) // 2, (size - h) // 2))
    return t


tile(64, 0.08, (255, 255, 255, 255), 14).save(SITE + 'favicon.png', optimize=True)
tile(180, 0.12).convert('RGB').save(SITE + 'apple-touch-icon.png', optimize=True)
tile(256, 0.10, (255, 255, 255, 255), 56).save('/home/claude/granth/site/assets/logo-tile.png')

# ---- og image: soft gradient + lockup
og = Image.new('RGB', (1200, 630))
px = og.load()
c0, c1, c2 = np.array([237, 235, 250]), np.array([249, 238, 240]), np.array([238, 244, 251])
for x in range(1200):
    t = x / 1199
    c = c0 + (c1 - c0) * (t / 0.5) if t < 0.5 else c1 + (c2 - c1) * ((t - 0.5) / 0.5)
    for y in range(630):
        px[x, y] = tuple(int(v) for v in c)
og = og.convert('RGBA')
L = lock.resize((960, round(lock.height * 960 / lock.width)), Image.LANCZOS)
og.alpha_composite(L, ((1200 - L.width) // 2, (630 - L.height) // 2))
og.convert('RGB').save(A + 'og-image-v4.jpg', quality=90)
