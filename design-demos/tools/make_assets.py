"""Downscale the four bundled deity images for use in design prototypes."""
import os

from PIL import Image

SRC = r"C:\Users\kalbhairav\Documents\Project_Apex11\assets\images"
DST = r"C:\Users\kalbhairav\Documents\Project_Apex11\design-demos\assets"
NAMES = ["maha1.jpg", "batuk1.jpg", "swarna.jpg", "skanda.jpg"]

os.makedirs(DST, exist_ok=True)

for name in NAMES:
    image = Image.open(os.path.join(SRC, name)).convert("RGB")
    width, height = image.size
    target_width = 560
    image = image.resize((target_width, int(height * target_width / width)), Image.LANCZOS)
    out = os.path.join(DST, name)
    image.save(out, "JPEG", quality=78, optimize=True)
    print(name, image.size, round(os.path.getsize(out) / 1024), "KB")
