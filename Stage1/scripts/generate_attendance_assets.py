#!/usr/bin/env python3
"""
generate_attendance_assets.py — build the Auto-Attendance scenario's images.

Writes:
    frontend/public/datasets/attendance/register_sheet.png   the class register,
                                                             one row per student,
                                                             each with a portrait
    frontend/public/datasets/attendance/arrivals/01..06.png  the same students as
                                                             door-camera snapshots

The students are drawn illustrated avatars, not photographs of real people. That
is deliberate:
  • no privacy or licensing problem in a product used by school children, and
  • vision models decline to identify real faces, but happily compare distinctive
    illustrated ones — so the pipeline actually works end to end.

Each avatar is built from a different combination of hair, glasses, clothing
colour and accessories, matching the `appearance` column of the class register in
src/lib/dataLibrary.js. Keep the two in sync if you edit either.

Usage:  python Stage1/scripts/generate_attendance_assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "datasets" / "attendance"
AVATAR = 260

# roll, name, skin, hair colour, hair style, shirt colour, glasses, accessory
STUDENTS = [
    (12, "Aarav Sharma",  "#e8b98a", "#1c1410", "short",  "#d64545", "round",  None,
     "round glasses / red collared shirt / short black hair"),
    (13, "Diya Patel",    "#d9a071", "#2b1a12", "braid",  "#2f6fd0", None,     "hoops",
     "long braided hair / blue kurta / silver hoop earrings"),
    (14, "Kabir Nair",    "#c98b5e", "#241812", "curly",  "#2f9e5f", None,     "hood",
     "curly hair / green hoodie / no glasses"),
    (15, "Meera Iyer",    "#efc79c", "#3a2418", "bob",    "#e9c33d", "square", None,
     "short bob haircut / yellow top / thick square glasses"),
    (16, "Rohan Das",     "#b97a4e", "#15100c", "buzz",   "#e8823a", None,     "wristband",
     "buzz cut / orange t-shirt / blue wristband"),
    (17, "Ananya Rao",    "#e5b58c", "#2e1c14", "pony",   "#8b5cf6", None,     "studs",
     "ponytail / purple sweater / small stud earrings"),
]

BACKDROPS = ["#dceaf7", "#e7f4e4", "#faeede", "#eae4f7", "#e2f2f2", "#fbe7ee"]


def font(size: int, bold: bool = False):
    """Best-effort real font; PIL's bitmap default is unreadable at these sizes."""
    for name in (["arialbd.ttf", "seguisb.ttf"] if bold else ["arial.ttf", "segoeui.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_avatar(student, backdrop: str, tilt: int = 0) -> Image.Image:
    """One student portrait. `tilt` shifts the head slightly so the door-camera
    snapshot is not a pixel-identical copy of the register photo."""
    _roll, _name, skin, hair, style, shirt, glasses, accessory, _desc = student

    size = AVATAR
    img = Image.new("RGB", (size, size), backdrop)
    d = ImageDraw.Draw(img)

    cx = size // 2 + tilt
    head_top, head_bottom = 58, 178
    head_l, head_r = cx - 52, cx + 52

    # shoulders / clothing
    d.rounded_rectangle([cx - 96, 196, cx + 96, size + 40], radius=48, fill=shirt)
    if accessory == "hood":
        d.rounded_rectangle([cx - 104, 190, cx + 104, 250], radius=42,
                            outline="#237a49", width=7)
        d.line([cx - 18, 214, cx - 18, 252], fill="#f4f4f4", width=6)
        d.line([cx + 18, 214, cx + 18, 252], fill="#f4f4f4", width=6)
    else:
        # collar
        d.polygon([(cx - 30, 196), (cx, 226), (cx + 30, 196)], fill="#ffffff")

    # neck
    d.rounded_rectangle([cx - 20, 158, cx + 20, 208], radius=12, fill=skin)

    # ears
    d.ellipse([head_l - 12, 104, head_l + 8, 136], fill=skin)
    d.ellipse([head_r - 8, 104, head_r + 12, 136], fill=skin)

    # head
    d.ellipse([head_l, head_top, head_r, head_bottom], fill=skin)

    # hair
    if style == "short":
        d.chord([head_l - 4, head_top - 8, head_r + 4, head_top + 76], 180, 360, fill=hair)
    elif style == "buzz":
        d.chord([head_l - 2, head_top - 2, head_r + 2, head_top + 62], 180, 360, fill=hair)
    elif style == "bob":
        d.chord([head_l - 10, head_top - 10, head_r + 10, head_top + 84], 180, 360, fill=hair)
        d.rounded_rectangle([head_l - 10, head_top + 34, head_l + 14, 156], radius=10, fill=hair)
        d.rounded_rectangle([head_r - 14, head_top + 34, head_r + 10, 156], radius=10, fill=hair)
    elif style == "curly":
        for dx, dy, r in [(-46, 12, 21), (-24, -2, 23), (0, -8, 24),
                          (24, -2, 23), (46, 12, 21), (-38, 34, 17), (38, 34, 17)]:
            d.ellipse([cx + dx - r, head_top + dy - r + 18, cx + dx + r, head_top + dy + r + 18], fill=hair)
    elif style == "pony":
        d.chord([head_l - 6, head_top - 8, head_r + 6, head_top + 78], 180, 360, fill=hair)
        d.ellipse([head_r + 2, 96, head_r + 34, 170], fill=hair)          # the tail
        d.ellipse([head_r - 6, 88, head_r + 18, 112], fill="#e0567f")     # scrunchie
    elif style == "braid":
        d.chord([head_l - 8, head_top - 10, head_r + 8, head_top + 80], 180, 360, fill=hair)
        for i, y in enumerate(range(136, 232, 24)):                        # the plait
            r = 15 - i
            d.ellipse([cx + 44 - r, y - r, cx + 44 + r, y + r], fill=hair)
        d.ellipse([cx + 34, 232, cx + 54, 250], fill="#e0567f")

    # eyebrows
    d.line([cx - 32, 112, cx - 12, 108], fill=hair, width=5)
    d.line([cx + 12, 108, cx + 32, 112], fill=hair, width=5)

    # eyes
    for ex in (cx - 22, cx + 22):
        d.ellipse([ex - 9, 120, ex + 9, 138], fill="#ffffff")
        d.ellipse([ex - 4, 125, ex + 4, 133], fill="#20140e")

    # nose + mouth
    d.line([cx, 136, cx - 5, 148], fill="#b07f57", width=3)
    d.arc([cx - 17, 142, cx + 17, 166], 20, 160, fill="#8c4a44", width=4)

    # glasses
    if glasses == "round":
        for ex in (cx - 22, cx + 22):
            d.ellipse([ex - 19, 112, ex + 19, 146], outline="#33302e", width=4)
        d.line([cx - 3, 128, cx + 3, 128], fill="#33302e", width=4)
        d.line([cx - 41, 122, head_l - 2, 118], fill="#33302e", width=3)
        d.line([cx + 41, 122, head_r + 2, 118], fill="#33302e", width=3)
    elif glasses == "square":
        for ex in (cx - 23, cx + 23):
            d.rounded_rectangle([ex - 21, 112, ex + 21, 146], radius=5, outline="#1f1d1c", width=6)
        d.line([cx - 2, 128, cx + 2, 128], fill="#1f1d1c", width=6)
        d.line([cx - 44, 122, head_l - 2, 118], fill="#1f1d1c", width=4)
        d.line([cx + 44, 122, head_r + 2, 118], fill="#1f1d1c", width=4)

    # accessories
    if accessory == "hoops":
        d.ellipse([head_l - 16, 130, head_l + 4, 158], outline="#c9c9d1", width=4)
        d.ellipse([head_r - 4, 130, head_r + 16, 158], outline="#c9c9d1", width=4)
    elif accessory == "studs":
        d.ellipse([head_l - 8, 130, head_l - 1, 137], fill="#e6e6ee")
        d.ellipse([head_r + 1, 130, head_r + 8, 137], fill="#e6e6ee")
    elif accessory == "wristband":
        d.rounded_rectangle([cx + 62, 236, cx + 100, 258], radius=8, fill="#2f6fd0")

    return img


def build_register() -> Image.Image:
    """The class register: a header, then one row per student with their photo."""
    pad, row_h, thumb = 34, 118, 96
    width = 940
    height = pad * 2 + 132 + row_h * len(STUDENTS)

    img = Image.new("RGB", (width, height), "#fdfcf8")
    d = ImageDraw.Draw(img)

    f_title, f_sub = font(30, True), font(17)
    f_head, f_cell, f_small = font(15, True), font(19, True), font(15)

    d.rectangle([0, 0, width, 104], fill="#1f3a5f")
    d.text((pad, 26), "CLASS REGISTER — Grade 8B", font=f_title, fill="#ffffff")
    d.text((pad, 66), "Sutra Public School  ·  Class teacher: Mrs. R. Menon  ·  Session 2026-27",
           font=f_sub, fill="#a9c4e4")

    y = 124
    d.line([pad, y, width - pad, y], fill="#c8c4bb", width=2)
    for x, label in ((pad, "ROLL"), (pad + 92, "PHOTO"), (pad + 232, "NAME"),
                     (pad + 500, "APPEARANCE ON FILE")):
        d.text((x, y + 10), label, font=f_head, fill="#6a6459")
    y += 36
    d.line([pad, y, width - pad, y], fill="#c8c4bb", width=2)

    for i, student in enumerate(STUDENTS):
        roll, name, *_ = student
        desc = student[8]
        top = y + i * row_h
        if i % 2 == 0:
            d.rectangle([pad, top + 2, width - pad, top + row_h - 2], fill="#f5f2ea")

        d.text((pad + 8, top + row_h // 2 - 12), str(roll), font=f_cell, fill="#22303f")

        portrait = draw_avatar(student, BACKDROPS[i % len(BACKDROPS)]).resize(
            (thumb, thumb), Image.LANCZOS)
        px, py = pad + 92, top + (row_h - thumb) // 2
        img.paste(portrait, (px, py))
        d.rectangle([px - 1, py - 1, px + thumb, py + thumb], outline="#9a9488", width=2)

        d.text((pad + 232, top + row_h // 2 - 22), name, font=f_cell, fill="#22303f")
        d.text((pad + 232, top + row_h // 2 + 6), f"Roll {roll}", font=f_small, fill="#8a8478")

        # wrap the appearance text onto two lines at the nearest separator
        parts = [p.strip() for p in desc.split("/")]
        line1 = " / ".join(parts[:2])
        line2 = " / ".join(parts[2:])
        d.text((pad + 500, top + row_h // 2 - 20), line1, font=f_small, fill="#4a453d")
        if line2:
            d.text((pad + 500, top + row_h // 2 + 4), line2, font=f_small, fill="#4a453d")

        d.line([pad, top + row_h, width - pad, top + row_h], fill="#ddd8cd", width=1)

    return img


def main() -> None:
    arrivals = OUT / "arrivals"
    arrivals.mkdir(parents=True, exist_ok=True)

    for i, student in enumerate(STUDENTS):
        # A different backdrop and a small head shift, so the door-camera frame is
        # a genuinely different picture of the same person — not a copy-paste.
        shot = draw_avatar(student, BACKDROPS[(i + 3) % len(BACKDROPS)], tilt=(-6, 5, 0)[i % 3])
        path = arrivals / f"{i + 1:02d}.png"
        shot.save(path, optimize=True)
        print(f"  {path.relative_to(OUT.parent)}  ({path.stat().st_size // 1024} KB)")

    register = build_register()
    reg_path = OUT / "register_sheet.png"
    register.save(reg_path, optimize=True)
    print(f"  {reg_path.relative_to(OUT.parent)}  ({reg_path.stat().st_size // 1024} KB)")

    print(f"\nDone. {OUT}")


if __name__ == "__main__":
    main()
