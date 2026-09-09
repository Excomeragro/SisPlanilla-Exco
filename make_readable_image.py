from pathlib import Path
from PIL import Image, ImageOps

source = Path(r"C:\Users\EXCOMERCAFE\Documents\Planilla\doc1_work\image1_clean.png")
destination = Path(r"C:\Users\EXCOMERCAFE\Downloads\Doc1_legible_por_paneles.png")

image = Image.open(source).convert("L")
width, height = image.size
panel_width = width // 5
panels = []

for index in range(5):
    left = index * panel_width
    right = width if index == 4 else (index + 1) * panel_width
    panel = image.crop((left, 0, right, height))
    mask = panel.point(lambda value: 255 if value < 245 else 0)
    bbox = mask.getbbox()
    if bbox:
        pad = 10
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(panel.width, bbox[2] + pad)
        y1 = min(panel.height, bbox[3] + pad)
        panel = panel.crop((x0, y0, x1, y1))
    panel = ImageOps.autocontrast(panel)
    panel = panel.point(lambda value: 0 if value < 185 else 255)
    panels.append(panel)

gap = 18
canvas_width = max(panel.width for panel in panels)
canvas_height = sum(panel.height for panel in panels) + gap * (len(panels) - 1)
canvas = Image.new("L", (canvas_width, canvas_height), 255)
y = 0
for panel in panels:
    x = (canvas_width - panel.width) // 2
    canvas.paste(panel, (x, y))
    y += panel.height + gap

scale = 2
canvas = canvas.resize((canvas.width * scale, canvas.height * scale), Image.Resampling.LANCZOS)
canvas.save(destination, format="PNG", optimize=True, dpi=(300, 300))
print(destination)
