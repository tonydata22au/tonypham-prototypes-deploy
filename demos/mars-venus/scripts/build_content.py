"""Builds public/data/content.json, the single data contract the app reads.
Joins hand-written game content in the book's framing (content/ideas.json) with measured research
(research/ranking.json, research/science.json) on chapter. All three sources are
one row per chapter, so the join cannot duplicate rows. Fails loudly on any gap.
Run: python3 scripts/build_content.py   (also checks the 5 golden questions)"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
LIGHT_Y = {"GREEN": 0.86, "AMBER": 0.5, "GREY": 0.3, "RED": 0.1}

def build():
    ideas = {i["chapter"]: i for i in json.loads((ROOT / "content/ideas.json").read_text())["ideas"]}
    rank = json.loads((ROOT / "research/ranking.json").read_text())
    sci = {i["chapter"]: i for i in json.loads((ROOT / "research/science.json").read_text())["ideas"]}
    rows = {r["chapter"]: r for r in rank["chapters"]}
    assert set(ideas) == set(rows) == set(sci) == set(range(1, 14)), "every chapter 1-13 needs content, ranking and science"
    top = max(r["score"] for r in rows.values())
    out = []
    for ch in range(1, 14):
        i, r, s = ideas[ch], rows[ch], sci[ch]
        assert r["research"] == s["verdict"], f"ch{ch}: ranking and science disagree on the light"
        srcs = [{"title": x.get("title") or x["url"], "url": x["url"], "status": x.get("status", "snippet")} for x in s["sources"] if x.get("url", "").startswith("http")]
        assert srcs, f"ch{ch}: needs at least one source link (receipt)"
        sides = [x["for"] for x in i["scenarios"]]
        assert sides.count("mars") == 2 and sides.count("venus") == 2, f"ch{ch}: two moments for each planet"
        assert set(i["why"]) == set(i["actions"]) == {"mars", "venus"}, f"ch{ch}: why and actions need a mars and a venus line"
        for sc in i["scenarios"]:
            for k in ("prompt", "good", "miss"):
                assert sc[k] and len(sc[k].split()) <= 9, f"ch{ch} {sc['area']} {k}: keep it to 9 words or fewer"
        out.append({**{k: i[k] for k in ("chapter", "name", "bookTitle", "icon", "why", "actions", "scenarios")},
                    "reader": {"rank": r["rank"], "score": r["score"], "quoteLikes": r["quote_likes"], "mentions": r["mentions"]},
                    "light": s["verdict"], "lightReason": s["reason"], "sources": srcs,
                    "map": {"x": round(r["score"] / top, 3), "y": LIGHT_Y[s["verdict"]]}})
    method = (f"How we rank: we counted likes on quotes from each habit's chapter on Goodreads (a book review site), and how often {rank['reviews_read']} real reviews "
              f"mention it (read on {rank['read_on']}). The light shows what research studies say. We keep the two apart.")
    return {"version": 1, "method": method, "readOn": rank["read_on"], "reviewsRead": rank["reviews_read"],
            "quotesChecked": rank["quotes_checked"], "ideas": out}

def golden(c):
    I = c["ideas"]; by = lambda f: sorted(i["chapter"] for i in I if f(i))
    from collections import Counter
    checks = {
        "top reader idea is Ch1": max(I, key=lambda i: i["reader"]["score"])["chapter"] == 1,
        "lights are 5 green, 6 amber, 1 red, 1 grey": Counter(i["light"] for i in I) == Counter(GREEN=5, AMBER=6, RED=1, GREY=1),
        "hidden gems are Ch2, 9, 10, 13": by(lambda i: i["reader"]["score"] < 30 and i["light"] == "GREEN") == [2, 9, 10, 13],
        "popular but shaky are Ch1, 3, 8": by(lambda i: i["reader"]["score"] > 50 and i["light"] != "GREEN") == [1, 3, 8],
        "only Ch4 is loved and backed": by(lambda i: i["reader"]["score"] > 50 and i["light"] == "GREEN") == [4],
    }
    for k, ok in checks.items(): print(("PASS " if ok else "FAIL ") + k)
    return all(checks.values())

if __name__ == "__main__":
    c = build()
    if not golden(c): sys.exit(1)
    p = ROOT / "public/data/content.json"; p.write_text(json.dumps(c, ensure_ascii=False, indent=1))
    print(f"ok {p.relative_to(ROOT)}: {len(c['ideas'])} ideas, {sum(len(i['scenarios']) for i in c['ideas'])} scenarios, {sum(len(i['sources']) for i in c['ideas'])} receipts")
