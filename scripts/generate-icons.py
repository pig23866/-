import zlib
import struct
import math
import os

def write_png(filename, width, height, pixels):
    """
    pixels: list of (r, g, b, a) tuples of length width * height
    """
    raw_bytes = bytearray()
    for y in range(height):
        raw_bytes.append(0) # filter byte: None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw_bytes.extend((r, g, b, a))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    idat = chunk(b"IDAT", zlib.compress(bytes(raw_bytes), 9))
    iend = chunk(b"IEND", b"")

    with open(filename, "wb") as f:
        f.write(header + ihdr + idat + iend)

def render_icon(size, is_maskable=False):
    pixels = []
    w = size
    h = size
    
    # Scale coordinates
    # Maskable icons need safe zone padding (10-15%)
    padding = 0.15 if is_maskable else 0.06
    eff_w = w * (1.0 - 2 * padding)
    eff_h = h * (1.0 - 2 * padding)
    offset_x = w * padding
    offset_y = h * padding

    for y in range(h):
        for x in range(w):
            # Base background gradient (Indigo 600 to Purple 700)
            t = (x + y) / (w + h)
            bg_r = int(79 + (124 - 79) * t)
            bg_g = int(70 + (58 - 70) * t)
            bg_b = int(229 + (237 - 229) * t)
            bg_a = 255

            # If not maskable, round corners
            if not is_maskable:
                corner_radius = w * 0.22
                dx = 0
                dy = 0
                if x < corner_radius:
                    dx = corner_radius - x
                elif x > w - corner_radius:
                    dx = x - (w - corner_radius)
                if y < corner_radius:
                    dy = corner_radius - y
                elif y > h - corner_radius:
                    dy = y - (h - corner_radius)
                
                if dx > 0 and dy > 0:
                    dist = math.hypot(dx, dy)
                    if dist > corner_radius:
                        pixels.append((0, 0, 0, 0))
                        continue
                    elif dist > corner_radius - 1:
                        # Antialias
                        alpha = max(0, min(255, int((corner_radius - dist) * 255)))
                        bg_a = alpha

            # Normalized coordinate in effective icon area (0.0 to 1.0)
            nx = (x - offset_x) / eff_w
            ny = (y - offset_y) / eff_h

            # Default to background
            r, g, b, a = bg_r, bg_g, bg_b, bg_a

            if 0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0:
                # Inside effective icon zone
                # Draw white clipboard card: nx in [0.22, 0.78], ny in [0.18, 0.84]
                card_x1, card_x2 = 0.22, 0.78
                card_y1, card_y2 = 0.18, 0.84
                card_r = 0.06

                in_card = False
                if card_x1 <= nx <= card_x2 and card_y1 <= ny <= card_y2:
                    cdx = 0
                    cdy = 0
                    if nx < card_x1 + card_r:
                        cdx = (card_x1 + card_r) - nx
                    elif nx > card_x2 - card_r:
                        cdx = nx - (card_x2 - card_r)
                    if ny < card_y1 + card_r:
                        cdy = (card_y1 + card_r) - ny
                    elif ny > card_y2 - card_r:
                        cdy = ny - (card_y2 - card_r)
                    
                    if cdx == 0 or cdy == 0 or math.hypot(cdx, cdy) <= card_r:
                        in_card = True

                # Top Clip: nx in [0.36, 0.64], ny in [0.14, 0.23]
                in_clip = (0.36 <= nx <= 0.64 and 0.14 <= ny <= 0.23)

                if in_card:
                    # White / clean slate card
                    r, g, b = 252, 253, 255
                    
                    # Header line
                    if 0.32 <= ny <= 0.35 and 0.32 <= nx <= 0.68:
                        r, g, b = 79, 70, 229 # Indigo
                    
                    # Item 1 Check circle and text bar
                    # Circle center (0.34, 0.44)
                    dist1 = math.hypot(nx - 0.34, ny - 0.44)
                    if dist1 < 0.035:
                        r, g, b = 16, 185, 129 # Emerald green
                        if dist1 < 0.015:
                            r, g, b = 255, 255, 255
                    elif 0.43 <= ny <= 0.455 and 0.42 <= nx <= 0.70:
                        r, g, b = 100, 116, 139 # Slate text

                    # Item 2 Circle and text bar
                    dist2 = math.hypot(nx - 0.34, ny - 0.55)
                    if dist2 < 0.035:
                        r, g, b = 99, 102, 241 # Indigo accent
                        if dist2 < 0.015:
                            r, g, b = 255, 255, 255
                    elif 0.54 <= ny <= 0.565 and 0.42 <= nx <= 0.65:
                        r, g, b = 100, 116, 139

                    # Item 3 Pending circle and text bar
                    dist3 = math.hypot(nx - 0.34, ny - 0.66)
                    if dist3 < 0.035:
                        r, g, b = 245, 158, 11 # Amber
                    elif 0.65 <= ny <= 0.675 and 0.42 <= nx <= 0.68:
                        r, g, b = 148, 163, 184

                    # Item 4 Inactive bar
                    if 0.74 <= ny <= 0.765 and 0.42 <= nx <= 0.60:
                        r, g, b = 203, 213, 225

                if in_clip:
                    # Dark blue clip
                    r, g, b = 49, 46, 129
                    # Clip hole
                    if math.hypot(nx - 0.50, ny - 0.17) < 0.018:
                        r, g, b = 224, 231, 255

                # Sparkle badge at bottom right: center (0.75, 0.78)
                dist_badge = math.hypot(nx - 0.73, ny - 0.76)
                if dist_badge < 0.08:
                    r, g, b = 124, 58, 237 # Purple badge
                    if dist_badge < 0.03:
                        r, g, b = 255, 255, 255 # Star center

            pixels.append((r, g, b, a))
            
    return pixels

os.makedirs("/public", exist_ok=True)

print("Generating 192x192 PNG...")
p192 = render_icon(192, is_maskable=False)
write_png("public/pwa-192x192.png", 192, 192, p192)

print("Generating 512x512 PNG...")
p512 = render_icon(512, is_maskable=False)
write_png("public/pwa-512x512.png", 512, 512, p512)

print("Generating 512x512 Maskable PNG...")
pmask = render_icon(512, is_maskable=True)
write_png("public/pwa-maskable-512x512.png", 512, 512, pmask)

print("Generating 180x180 Apple Touch Icon...")
p180 = render_icon(180, is_maskable=False)
write_png("public/apple-touch-icon.png", 180, 180, p180)

print("Generating favicon...")
write_png("public/favicon.ico", 192, 192, p192)

print("All icons successfully generated!")
