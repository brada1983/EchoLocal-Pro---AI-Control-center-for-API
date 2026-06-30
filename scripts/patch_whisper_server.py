#!/usr/bin/env python3
"""Idempotently patches /opt/whisper-api/server.py with the request-tracking
middleware + /metrics route described in patches/server.py.snippet.py.

Why a patcher script instead of a literal unified diff: this repo doesn't
have a copy of the real server.py to diff against (it lives only on the
LXC), so a patch with fixed line numbers would be fragile. This script
locates insertion points by structural markers (the import block, the
`app = FastAPI(...)` line) instead.

Default mode is DRY RUN — it prints exactly what would change and does not
touch the file. Pass --apply to actually write (a timestamped .bak is made
first). Safe to re-run: skips entirely if the patch marker is already present.

Usage (on the LXC):
    python3 scripts/patch_whisper_server.py [--target /opt/whisper-api/server.py] [--apply]
"""
import argparse
import datetime
import re
import sys
from pathlib import Path

MARKER = "ECHOLOCAL_METRICS_PATCH"
SNIPPET_PATH = Path(__file__).resolve().parent.parent / "patches" / "server.py.snippet.py"


def split_snippet(snippet: str) -> tuple[str, str]:
    """Splits the reference snippet into the (imports+state) block and the
    (middleware+route) block, using the same markers it's commented with."""
    imports_match = re.search(
        r"# --- ECHOLOCAL_METRICS_PATCH: imports ---.*?(?=# --- ECHOLOCAL_METRICS_PATCH: middleware ---)",
        snippet,
        re.DOTALL,
    )
    middleware_match = re.search(
        r"# --- ECHOLOCAL_METRICS_PATCH: middleware ---.*?# --- END ECHOLOCAL_METRICS_PATCH ---",
        snippet,
        re.DOTALL,
    )
    if not imports_match or not middleware_match:
        sys.exit(f"FATAL: couldn't parse markers out of {SNIPPET_PATH}")
    return imports_match.group(0).rstrip() + "\n", middleware_match.group(0).rstrip() + "\n"


def find_import_block_end(lines: list[str]) -> int:
    """Returns the index right after the last top-level import statement."""
    last_import = -1
    for i, line in enumerate(lines):
        if re.match(r"^(import |from )\S", line):
            last_import = i
    if last_import == -1:
        sys.exit("FATAL: couldn't find any top-level `import`/`from` line in server.py")
    return last_import + 1


def find_app_creation_end(lines: list[str]) -> int:
    """Returns the index right after the `app = FastAPI(...)` statement,
    handling the common case where the call fits on one line and the
    multi-line case by scanning forward to the matching closing paren."""
    for i, line in enumerate(lines):
        if re.search(r"^\s*app\s*=\s*FastAPI\(", line):
            depth = line.count("(") - line.count(")")
            j = i
            while depth > 0:
                j += 1
                if j >= len(lines):
                    sys.exit("FATAL: unbalanced parens scanning FastAPI(...) call")
                depth += lines[j].count("(") - lines[j].count(")")
            return j + 1
    sys.exit("FATAL: couldn't find `app = FastAPI(...)` in server.py — apply patches/server.py.snippet.py manually")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", default="/opt/whisper-api/server.py")
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    args = parser.parse_args()

    target = Path(args.target)
    original = target.read_text(encoding="utf-8")

    if MARKER in original:
        print(f"[patch] {target} already patched (marker found), nothing to do.")
        return

    snippet = SNIPPET_PATH.read_text(encoding="utf-8")
    imports_block, middleware_block = split_snippet(snippet)

    lines = original.splitlines(keepends=True)
    import_end = find_import_block_end(lines)
    new_lines = lines[:import_end] + ["\n", imports_block, "\n"] + lines[import_end:]

    # Recompute app-creation index against the now-modified lines.
    app_end = find_app_creation_end(new_lines)
    new_lines = new_lines[:app_end] + ["\n", middleware_block, "\n"] + new_lines[app_end:]

    patched = "".join(new_lines)

    if not args.apply:
        print(f"[patch] DRY RUN — would insert imports after line {import_end} and")
        print(f"        middleware/route after the `app = FastAPI(...)` block.")
        print(f"        Re-run with --apply to write {target} (backup made first).")
        print()
        print("--- imports block ---")
        print(imports_block)
        print("--- middleware/route block ---")
        print(middleware_block)
        return

    backup = target.with_suffix(f".py.bak.{datetime.datetime.now():%Y%m%d%H%M%S}")
    backup.write_text(original, encoding="utf-8")
    target.write_text(patched, encoding="utf-8")
    print(f"[patch] backed up original to {backup}")
    print(f"[patch] wrote patched {target}")
    print("[patch] now run: systemctl restart whisper-api")


if __name__ == "__main__":
    main()
