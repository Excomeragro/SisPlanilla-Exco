from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

output = Path(r"C:\Users\EXCOMERCAFE\Downloads\Rotulo_EMPAQUE.png")
dpi = 300
width = round(23 / 2.54 * dpi)
height = round(5 / 2.54 * dpi)

image = Image.new("RGB", (width, height), "white")
draw = ImageDraw.Draw(image)

font_paths = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\Arial Bold.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
]
font_path = next(path for path in font_paths if Path(path).exists())

font_size = 500
while font_size > 20:
    font = ImageFont.truetype(font_path, font_size)
    bbox = draw.textbbox((0, 0), "EMPAQUE", font=font, stroke_width=0)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    if text_width <= width - 80 and text_height <= height - 40:
        break
    font_size -= 2

x = (width - text_width) // 2 - bbox[0]
y = (height - text_height) // 2 - bbox[1]
draw.text((x, y), "EMPAQUE", fill="black", font=font)
image.save(output, format="PNG", dpi=(dpi, dpi), optimize=True)
print(output)
