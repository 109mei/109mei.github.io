# 画像を並べて1枚にする：python3 tools/sheet.py 出力.png 画像...
import sys
from PIL import Image
out, fs = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).resize((390, 844)) for f in fs]
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (390 * cols, 844 * rows), (0, 0, 0))
for i, im in enumerate(ims): s.paste(im, ((i % cols) * 390, (i // cols) * 844))
s.save(out)
