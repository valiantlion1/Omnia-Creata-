#!/usr/bin/env python3
"""
text_normalizer.py — OmniaPixels TXT helper
-------------------------------------------
Robustly read a text-like file, detect/repair encoding, and emit agent-friendly
variants (UTF-8, UTF-8 with BOM, CRLF endings, ASCII-only, first-N lines, split).

USAGE EXAMPLES
1) Produce safe variants next to the source:
   python text_normalizer.py --input "OmniaPixels_Ultimate_Blueprint_Part1-32_plaintext.txt" --utf8 --utf8-bom --crlf --ascii --slice 1000 --probe 100

2) Only make the first 1000 lines file:
   python text_normalizer.py -i OP_full.txt --slice 1000

3) Split into ~800-line parts into ./out/:
   python text_normalizer.py -i OP_full.txt --split 800 --outdir out

Exit code is non-zero if the input looks binary and --force is not given.
"""

from __future__ import annotations
import argparse
import sys
import os
from pathlib import Path

CTRL_RANGES = [(0x00,0x08),(0x0E,0x1F)]  # exclude \t(0x09), \n(0x0A), \r(0x0D)
ZIP_MAGIC = b"PK\x03\x04"

def is_probably_binary(data: bytes) -> bool:
    if not data:
        return False
    if b"\x00" in data:
        return True
    if data.startswith(ZIP_MAGIC):
        return True
    total = len(data)
    ctrl = 0
    for b in data:
        for lo, hi in CTRL_RANGES:
            if lo <= b <= hi:
                ctrl += 1
                break
    # If more than 1% are control chars (excluding whitespace), assume binary
    return (ctrl / max(1,total)) > 0.01

def try_decode(data: bytes) -> tuple[str,str]:
    """Return (text, encoding) using a small heuristic set; never raises."""
    for enc in ("utf-8", "utf-8-sig", "utf-16", "utf-16le", "utf-16be", "cp1254", "latin-1"):
        try:
            return data.decode(enc), enc
        except Exception:
            continue
    # Fallback that won't throw
    return data.decode("latin-1", errors="replace"), "latin-1*"

def normalize_newlines(text: str, mode: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if mode == "crlf":
        return text.replace("\n", "\r\n")
    return text

def write_text(path: Path, text: str, encoding: str = "utf-8", bom: bool = False):
    if bom and encoding.lower().startswith("utf-8"):
        encoding = "utf-8-sig"
    path.write_text(text, encoding=encoding)

def ascii_sanitize(text: str) -> str:
    try:
        return text.encode("ascii", "ignore").decode("ascii")
    except Exception:
        return "".join(ch if ord(ch) < 128 else "" for ch in text)

def slice_lines(text: str, n: int) -> str:
    lines = text.splitlines()
    return "\n".join(lines[:n])

def split_lines(text: str, chunk: int) -> list[str]:
    lines = text.splitlines()
    parts = []
    for i in range(0, len(lines), chunk):
        parts.append("\n".join(lines[i:i+chunk]))
    return parts

def main():
    ap = argparse.ArgumentParser(description="Normalize/convert text for agent-friendly ingestion.")
    ap.add_argument("-i","--input", required=True, help="Input file path (expected to be text)")
    ap.add_argument("--outdir", default="", help="Output directory (default: same as input)")
    ap.add_argument("--utf8", action="store_true", help="Emit UTF-8 (no BOM) normalized-LF version")
    ap.add_argument("--utf8-bom", action="store_true", help="Emit UTF-8 with BOM version")
    ap.add_argument("--crlf", action="store_true", help="Emit UTF-8 (no BOM) with CRLF line endings")
    ap.add_argument("--ascii", action="store_true", help="Emit ASCII-only sanitized version")
    ap.add_argument("--slice", type=int, default=0, help="Emit first N lines as a separate file")
    ap.add_argument("--probe", type=int, default=0, help="Emit first N lines (ASCII-only) as probe file")
    ap.add_argument("--split", type=int, default=0, help="Split into parts of N lines each")
    ap.add_argument("--force", action="store_true", help="Attempt decode even if file appears binary")
    args = ap.parse_args()

    src = Path(args.input)
    if not src.exists():
        print(f"[ERR] Input not found: {src}", file=sys.stderr)
        return 2

    data = src.read_bytes()

    if is_probably_binary(data) and not args.force:
        print(f"[ERR] File looks binary/compressed (contains control bytes or ZIP header). Use --force if you know it's actually text encoded weirdly.", file=sys.stderr)
        return 3

    text, used_enc = try_decode(data)
    # Always normalize to LF in-memory
    text = normalize_newlines(text, "lf")

    outdir = Path(args.outdir) if args.outdir else src.parent
    outdir.mkdir(parents=True, exist_ok=True)

    stem = src.stem
    # Avoid duplicate suffixes like .txt.txt
    base = stem if stem else "output"
    out_paths = []

    if args.utf8:
        p = outdir / f"{base}_utf8.txt"
        write_text(p, text, "utf-8", bom=False)
        out_paths.append(str(p))
    if args.utf8_bom:
        p = outdir / f"{base}_utf8_BOM.txt"
        write_text(p, text, "utf-8", bom=True)
        out_paths.append(str(p))
    if args.crlf:
        p = outdir / f"{base}_crlf.txt"
        write_text(p, normalize_newlines(text, "crlf"), "utf-8", bom=False)
        out_paths.append(str(p))
    if args.ascii:
        p = outdir / f"{base}_ascii.txt"
        write_text(p, ascii_sanitize(text), "ascii", bom=False)
        out_paths.append(str(p))
    if args.slice and args.slice > 0:
        p = outdir / f"{base}_first{args.slice}.txt"
        write_text(p, slice_lines(text, args.slice), "utf-8", bom=False)
        out_paths.append(str(p))
    if args.probe and args.probe > 0:
        p = outdir / f"{base}_probe{args.probe}_ascii.txt"
        write_text(p, ascii_sanitize(slice_lines(text, args.probe)), "ascii", bom=False)
        out_paths.append(str(p))
    if args.split and args.split > 0:
        parts = split_lines(text, args.split)
        for idx, part in enumerate(parts, 1):
            p = outdir / f"{base}_part{idx:02d}.txt"
            write_text(p, part, "utf-8", bom=False)
            out_paths.append(str(p))

    if not out_paths:
        # Default behavior if no flags: emit a safe UTF-8 & a first1000 slice
        p1 = outdir / f"{base}_utf8.txt"
        write_text(p1, text, "utf-8", bom=False)
        out_paths.append(str(p1))
        p2 = outdir / f"{base}_first1000.txt"
        write_text(p2, slice_lines(text, 1000), "utf-8", bom=False)
        out_paths.append(str(p2))

    # Summary JSON to stdout (so agents can parse outputs quickly)
    print(json.dumps({"decoded_from": used_enc, "outputs": out_paths}, ensure_ascii=False))

if __name__ == "__main__":
    sys.exit(main())
