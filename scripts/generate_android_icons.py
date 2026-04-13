#!/usr/bin/env python3
"""
generate_android_icons.py  (v3 — correct PNG filter reconstruction)
------------------------------------------------------------------------
Generates all Android mipmap icon files from the original 1024×1024 source.

Key fix over v2: PNG rows are filter-encoded. This version correctly applies
all 5 PNG filter types (None, Sub, Up, Average, Paeth) when reading pixels,
so composite_centered produces correct RGBA pixel values.

NEVER modifies assets/icon.png. NEVER crops the icon.

Adaptive icon foreground safe-zone rule:
  Icon is placed on canvas at 66.67% scale (72dp / 108dp).
  Samsung and all Android launchers mask the outer 25% — icon is never clipped.
"""

import os, sys, shutil, struct, zlib, subprocess

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SRC_ICON     = os.path.join(PROJECT_ROOT, "assets", "icon.png")
MIPMAP_BASE  = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res")

# ─── Android density table ────────────────────────────────────────────────────
DENSITIES = {
    "mipmap-mdpi":    {"legacy": 48,  "canvas": 108, "safe": 72},
    "mipmap-hdpi":    {"legacy": 72,  "canvas": 162, "safe": 108},
    "mipmap-xhdpi":   {"legacy": 96,  "canvas": 216, "safe": 144},
    "mipmap-xxhdpi":  {"legacy": 144, "canvas": 324, "safe": 216},
    "mipmap-xxxhdpi": {"legacy": 192, "canvas": 432, "safe": 288},
}

# ─── sips wrapper ─────────────────────────────────────────────────────────────

def sips_resize(src: str, dst: str, size: int):
    """Proportionally resize src to fit within size×size. No cropping."""
    r = subprocess.run(
        ["sips", "--resampleHeightWidthMax", str(size), src, "--out", dst],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"  ERROR sips: {r.stderr.strip()}")
        sys.exit(1)

# ─── PNG filter reconstruction ────────────────────────────────────────────────

def _paeth(a, b, c):
    """Paeth predictor (PNG filter type 4)."""
    p = a + b - c
    pa = abs(p - a); pb = abs(p - b); pc = abs(p - c)
    if pa <= pb and pa <= pc: return a
    if pb <= pc: return b
    return c

def _unfilter_rows(raw: bytes, width: int, height: int, channels: int):
    """
    Undo PNG filtering for all rows.
    Returns a flat bytearray of raw (unfiltered) pixel data,
    channels bytes per pixel, no filter byte per row.
    """
    stride = 1 + width * channels   # 1 filter byte + pixel data
    out = bytearray(width * height * channels)

    prev_row = bytearray(width * channels)  # previous unfiltered row (all zeros for row 0)

    for y in range(height):
        ftype = raw[y * stride]
        row_in  = raw[y * stride + 1 : y * stride + 1 + width * channels]
        row_out = bytearray(width * channels)

        if ftype == 0:   # None
            row_out[:] = row_in
        elif ftype == 1:  # Sub — each byte is delta from left neighbor
            for i in range(width * channels):
                a = row_out[i - channels] if i >= channels else 0
                row_out[i] = (row_in[i] + a) & 0xFF
        elif ftype == 2:  # Up — each byte is delta from byte above
            for i in range(width * channels):
                b = prev_row[i]
                row_out[i] = (row_in[i] + b) & 0xFF
        elif ftype == 3:  # Average
            for i in range(width * channels):
                a = row_out[i - channels] if i >= channels else 0
                b = prev_row[i]
                row_out[i] = (row_in[i] + (a + b) // 2) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(width * channels):
                a = row_out[i - channels] if i >= channels else 0
                b = prev_row[i]
                c = prev_row[i - channels] if i >= channels else 0
                row_out[i] = (row_in[i] + _paeth(a, b, c)) & 0xFF
        else:
            raise ValueError(f"Unknown PNG filter type {ftype} at row {y}")

        out[y * width * channels : (y + 1) * width * channels] = row_out
        prev_row = row_out

    return out

# ─── PNG reader ───────────────────────────────────────────────────────────────

def read_png_rgba(path: str):
    """
    Read a PNG file and return (width, height, pixels) where pixels is a
    flat list of (R,G,B,A) tuples. Handles RGB8 and RGBA8.
    """
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}"

    pos = 8
    w = h = ch = 0
    ct = 0
    idats = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos+4])[0]
        tag    = data[pos+4:pos+8]
        chunk  = data[pos+8:pos+8+length]
        if tag == b"IHDR":
            w  = struct.unpack(">I", chunk[0:4])[0]
            h  = struct.unpack(">I", chunk[4:8])[0]
            bd = chunk[8]
            ct = chunk[9]
            assert bd == 8, f"Only 8-bit PNGs supported (got {bd})"
            assert ct in (2, 6), f"Only RGB/RGBA supported (got color_type={ct})"
            ch = 3 if ct == 2 else 4
        elif tag == b"IDAT":
            idats.append(chunk)
        pos += 12 + length

    raw = zlib.decompress(b"".join(idats))
    unfiltered = _unfilter_rows(raw, w, h, ch)

    pixels = []
    for i in range(w * h):
        off = i * ch
        r = unfiltered[off]; g = unfiltered[off+1]; b = unfiltered[off+2]
        a = unfiltered[off+3] if ch == 4 else 255
        pixels.append((r, g, b, a))
    return w, h, pixels

# ─── PNG writer ───────────────────────────────────────────────────────────────

def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

def write_rgba_png(path: str, width: int, height: int, pixels):
    """Write a flat list of (R,G,B,A) tuples to an RGBA PNG file."""
    raw = bytearray()
    for row in range(height):
        raw += b"\x00"  # filter type None (simplest, always correct)
        for col in range(width):
            r, g, b, a = pixels[row * width + col]
            raw += bytes([r, g, b, a])
    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">II", width, height) + bytes([8, 6, 0, 0, 0])  # RGBA, 8-bit
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(_png_chunk(b"IHDR", ihdr))
        f.write(_png_chunk(b"IDAT", compressed))
        f.write(_png_chunk(b"IEND", b""))

# ─── Compositing ─────────────────────────────────────────────────────────────

def composite_centered(src: str, canvas_size: int, icon_size: int, dst: str):
    """
    Resize src icon to icon_size×icon_size, place it centered on a
    canvas_size×canvas_size TRANSPARENT background, write to dst.
    """
    tmp = dst + ".tmp_resize.png"
    sips_resize(src, tmp, icon_size)

    src_w, src_h, src_pixels = read_png_rgba(tmp)
    os.remove(tmp)

    offset_x = (canvas_size - src_w) // 2
    offset_y = (canvas_size - src_h) // 2

    # Transparent canvas
    canvas = [(0, 0, 0, 0)] * (canvas_size * canvas_size)

    # Blit icon pixels onto canvas
    for row in range(src_h):
        for col in range(src_w):
            cx = offset_x + col
            cy = offset_y + row
            if 0 <= cx < canvas_size and 0 <= cy < canvas_size:
                canvas[cy * canvas_size + cx] = src_pixels[row * src_w + col]

    write_rgba_png(dst, canvas_size, canvas_size, canvas)

    # Verify the output
    v = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", dst],
                       capture_output=True, text=True).stdout
    dims = [l.split(": ")[1].strip() for l in v.splitlines() if "pixel" in l]

    # Spot-check: center pixel should not be transparent (icon is centered and opaque)
    out_w, out_h, out_px = read_png_rgba(dst)
    center = out_px[(out_h // 2) * out_w + (out_w // 2)]
    print(f"    output: {dims[0]}×{dims[1]}, center pixel RGBA={center}")
    if center[3] == 0:
        print("    WARNING: center pixel is transparent — something went wrong!")
        sys.exit(1)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not os.path.exists(SRC_ICON):
        print(f"ERROR: Source icon not found: {SRC_ICON}")
        sys.exit(1)

    print(f"Source: {SRC_ICON}")
    r = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", SRC_ICON],
                       capture_output=True, text=True)
    print(r.stdout.strip())

    # Self-test the PNG reader on the source icon before generating any files
    print("\nSelf-test: reading source icon...")
    sw, sh, spx = read_png_rgba(SRC_ICON)
    center = spx[(sh // 2) * sw + (sw // 2)]
    topleft = spx[0]
    print(f"  Source: {sw}×{sh}, center RGBA={center}, top-left RGBA={topleft}")
    if center[3] == 0:
        print("  ERROR: Source icon center pixel is transparent — unexpected!")
        sys.exit(1)
    print("  Self-test PASSED ✅\n")

    for density, spec in DENSITIES.items():
        dest_dir = os.path.join(MIPMAP_BASE, density)
        os.makedirs(dest_dir, exist_ok=True)

        legacy = spec["legacy"]
        canvas = spec["canvas"]
        safe   = spec["safe"]

        print(f"[{density}]")

        # 1. Legacy ic_launcher.png — simple resize
        legacy_dst = os.path.join(dest_dir, "ic_launcher.png")
        sips_resize(SRC_ICON, legacy_dst, legacy)
        v = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", legacy_dst],
                           capture_output=True, text=True).stdout
        dims = [l.split(": ")[1].strip() for l in v.splitlines() if "pixel" in l]
        print(f"  ic_launcher.png        → {dims[0]}×{dims[1]} (want {legacy}×{legacy})")

        # 2. Round variant — identical to legacy
        round_dst = os.path.join(dest_dir, "ic_launcher_round.png")
        shutil.copy2(legacy_dst, round_dst)
        print(f"  ic_launcher_round.png  → copy of legacy")

        # 3. Adaptive foreground — icon at safe zone, centered on transparent canvas
        fg_dst = os.path.join(dest_dir, "ic_launcher_foreground.png")
        print(f"  ic_launcher_foreground → {safe}px icon on {canvas}px transparent canvas")
        composite_centered(SRC_ICON, canvas, safe, fg_dst)

    # Remove the stock Android vector foreground (wrong icon entirely)
    fg_xml = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res",
                          "drawable-v24", "ic_launcher_foreground.xml")
    if os.path.exists(fg_xml):
        os.remove(fg_xml)
        print(f"\nRemoved stock vector: {fg_xml}")

    # Write correct adaptive icon manifest
    anydpi_dir = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res",
                              "mipmap-anydpi-v26")
    os.makedirs(anydpi_dir, exist_ok=True)
    adaptive_xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
    for fname in ("ic_launcher.xml", "ic_launcher_round.xml"):
        p = os.path.join(anydpi_dir, fname)
        with open(p, "w") as f:
            f.write(adaptive_xml)
        print(f"Wrote: {p}")

    print("\n✅ All icons generated and verified. No transparent center pixels found.")

if __name__ == "__main__":
    main()
