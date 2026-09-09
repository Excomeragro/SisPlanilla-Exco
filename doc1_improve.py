from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
from PIL import Image, ImageOps, ImageFilter


SRC = Path(r"C:\Users\EXCOMERCAFE\Downloads\Doc1.docx")
WORK = Path(r"C:\Users\EXCOMERCAFE\Documents\Planilla\doc1_work")
WORK.mkdir(exist_ok=True)

OUT_IMG = WORK / "image1_clean.png"
OUT_DOCX = WORK / "Doc1_mejorado.docx"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture"
XML_NS = "http://www.w3.org/XML/1998/namespace"

ET.register_namespace("w", W_NS)
ET.register_namespace("r", R_NS)
ET.register_namespace("wp", WP_NS)
ET.register_namespace("a", A_NS)
ET.register_namespace("pic", PIC_NS)


def clean_image(src_path: Path, out_path: Path) -> None:
    img = Image.open(src_path).convert("L")
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageOps.equalize(img)
    img = img.filter(ImageFilter.SHARPEN)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=180, threshold=3))
    # Push the page closer to crisp black and white while keeping the flyer legible.
    img = img.point(lambda p: 255 if p > 240 else (0 if p < 80 else p))
    img.save(out_path, format="JPEG", quality=95)


def emu_from_inches(value: float) -> int:
    return int(value * 914400)


def update_document_xml(xml_text: str) -> str:
    root = ET.fromstring(xml_text)
    ns = {"w": W_NS}

    sect_pr = root.find(".//w:sectPr", ns)
    if sect_pr is not None:
        pg_sz = sect_pr.find("w:pgSz", ns)
        if pg_sz is not None:
            width = pg_sz.get(f"{{{W_NS}}}w")
            height = pg_sz.get(f"{{{W_NS}}}h")
            pg_sz.set(f"{{{W_NS}}}w", height)
            pg_sz.set(f"{{{W_NS}}}h", width)
            pg_sz.set(f"{{{W_NS}}}orient", "landscape")

        pg_mar = sect_pr.find("w:pgMar", ns)
        if pg_mar is not None:
            small = str(emu_from_inches(0.25))
            for attr in ("top", "bottom", "left", "right"):
                pg_mar.set(f"{{{W_NS}}}{attr}", small)

    return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")


def update_image_size(xml_text: str, width_emu: int, height_emu: int) -> str:
    root = ET.fromstring(xml_text)
    ns = {"wp": WP_NS, "a": A_NS, "pic": PIC_NS, "w": W_NS}

    extent = root.find(".//wp:inline/wp:extent", ns)
    if extent is not None:
        extent.set("cx", str(width_emu))
        extent.set("cy", str(height_emu))

    docpr = root.find(".//wp:inline/wp:docPr", ns)
    if docpr is not None and not docpr.get("name"):
        docpr.set("name", "Picture 1")

    # Also update the nested graphic frame size if present.
    aext = root.find(".//a:xfrm/a:ext", ns)
    if aext is not None:
        aext.set("cx", str(width_emu))
        aext.set("cy", str(height_emu))

    return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")


def main() -> None:
    tmp_image = WORK / "src_image.jpeg"
    with ZipFile(SRC) as src_zip:
        with src_zip.open("word/media/image1.jpeg") as f:
            tmp_image.write_bytes(f.read())

        with Image.open(tmp_image) as img:
            clean_image(tmp_image, OUT_IMG)
            w, h = Image.open(OUT_IMG).size

        with ZipFile(OUT_DOCX, "w", compression=ZIP_DEFLATED) as dst_zip:
            for item in src_zip.infolist():
                data = src_zip.read(item.filename)
                if item.filename == "word/media/image1.jpeg":
                    data = OUT_IMG.read_bytes()
                elif item.filename == "word/document.xml":
                    data = update_document_xml(data.decode("utf-8")).encode("utf-8")
                    # Make the picture fill most of the landscape page.
                    page_w = emu_from_inches(11.0 - 0.5)
                    page_h = int(page_w * h / w)
                    data = update_image_size(data.decode("utf-8"), page_w, page_h).encode("utf-8")
                dst_zip.writestr(item, data)

    print(OUT_DOCX)


if __name__ == "__main__":
    main()
