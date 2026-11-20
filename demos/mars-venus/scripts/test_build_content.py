"""Proves build_content.py refuses broken content. Run: python3 scripts/test_build_content.py
Each case copies this demo folder to a temp dir, breaks one thing, and expects the build to fail with a clear message."""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def run_build(mutate):
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d) / "demo"
        shutil.copytree(ROOT, tmp, ignore=shutil.ignore_patterns("img", "__pycache__"))
        mutate(tmp)
        r = subprocess.run([sys.executable, "-I", str(tmp / "scripts/build_content.py")], capture_output=True, text=True)
        return r.returncode, r.stdout + r.stderr

def edit(path, fn):
    def go(tmp):
        p = tmp / path; d = json.loads(p.read_text()); fn(d); p.write_text(json.dumps(d, ensure_ascii=False))
    return go

def swap_vi_ids(d):  # a Vietnamese moment joined to the wrong English moment
    s = d["ideas"][2]["scenarios"]; s[0]["id"], s[2]["id"] = s[2]["id"], s[0]["id"]

CASES = [
    ("good content builds", lambda tmp: None, 0, "ok public/data/content.json"),
    ("Vietnamese IDs swapped between planets", edit("content/ideas.vi.json", swap_vi_ids), 1, "must both appear or both be absent"),
    ("a Vietnamese moment is missing", edit("content/ideas.vi.json", lambda d: d["ideas"][0]["scenarios"].pop()), 1, "must match English"),
    ("a script tag in the screen text", edit("content/ui.vi.json", lambda d: d.update({"start.question": "<script>alert(1)</script>"})), 1, "is not allowed"),
    ("an unclosed <b> tag", edit("content/ui.en.json", lambda d: d.update({"res.gems": "<b>{n} hidden gems: readers skip them."})), 1, "not closed"),
    ("a lost {blank} in Vietnamese", edit("content/ui.vi.json", lambda d: d.update({"plan.start": "Bắt đầu ▶"})), 1, "blanks differ"),
]
failed = 0
for name, mutate, want_code, want_text in CASES:
    code, out = run_build(mutate)
    ok = (code == 0) == (want_code == 0) and want_text in out
    failed += not ok
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"\n  exit {code}, output tail: {out.strip().splitlines()[-1:]}"))
sys.exit(1 if failed else 0)
