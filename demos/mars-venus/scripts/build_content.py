"""Builds public/data/content.json, the single data contract the app reads.
Joins hand-written game content in the book's framing (content/ideas.json) with measured research
(research/ranking.json, research/science.json) on chapter. All three sources are
one row per chapter, so the join cannot duplicate rows. Fails loudly on any gap.
Run: python3 scripts/build_content.py   (also checks the 5 golden questions and that English and Vietnamese match)
Also writes public/i18n.js (all screen text) from content/ui.en.json and content/ui.vi.json."""
import json, re, sys
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
        ids = [x.get("id", "") for x in i["scenarios"]]
        assert len(set(ids)) == len(ids), f"ch{ch}: moment IDs must be unique"
        for sc in i["scenarios"]:
            assert re.fullmatch(rf"{ch}-{sc['for']}-\d+", sc.get("id", "")), f"ch{ch}: moment ID {sc.get('id')!r} must look like {ch}-{sc['for']}-1"
            for k in ("prompt", "good", "miss"):
                check_tags(f"ch{ch} {sc['id']} {k}", sc[k])
                assert sc[k] and len(sc[k].split()) <= 9, f"ch{ch} {sc['id']} {k}: keep it to 9 words or fewer"
        out.append({**{k: i[k] for k in ("chapter", "name", "bookTitle", "icon", "why", "actions", "scenarios")},
                    "reader": {"rank": r["rank"], "score": r["score"], "quoteLikes": r["quote_likes"], "mentions": r["mentions"]},
                    "light": s["verdict"], "lightReason": s["reason"], "sources": srcs,
                    "map": {"x": round(r["score"] / top, 3), "y": LIGHT_Y[s["verdict"]]}})
    method = (f"How we rank: we counted likes on quotes from each habit's chapter on Goodreads (a book review site), and how often {rank['reviews_read']} real reviews "
              f"mention it (read on {rank['read_on']}). The light shows what research studies say. We keep the two apart.")
    return {"version": 1, "method": method, "readOn": rank["read_on"], "reviewsRead": rank["reviews_read"],
            "quotesChecked": rank["quotes_checked"], "ideas": out}

ALLOWED_TAGS = {"<b>", "</b>", "<i>", "</i>", "<br>"}

def check_tags(where, text):
    """Only <b>, <i> and <br> may appear, correctly paired. The app escapes everything else (see rich() in app.js)."""
    stack = []
    for tag in re.findall(r"<[^>]*>", text):
        assert tag in ALLOWED_TAGS, f"{where}: tag {tag!r} is not allowed (only <b>, <i>, <br>)"
        if tag in ("<b>", "<i>"): stack.append(tag)
        elif tag != "<br>":
            assert stack and stack.pop() == tag.replace("/", ""), f"{where}: {tag} closes nothing or the wrong tag"
    assert not stack, f"{where}: {stack} not closed"
    assert "<" not in re.sub(r"<(/?b|/?i|br)>", "", text), f"{where}: stray '<' in text"

def check_pair(where, en, vi):
    """A translation must keep every {blank} and HTML tag, and must not be empty."""
    assert isinstance(vi, str) and vi.strip(), f"{where}: Vietnamese text is missing"
    check_tags(where + " (en)", en); check_tags(where + " (vi)", vi)
    for pat, what in ((r"\{\w+\}", "blanks"), (r"<[^>]+>", "HTML tags")):
        assert sorted(re.findall(pat, en)) == sorted(re.findall(pat, vi)), f"{where}: {what} differ: {en!r} vs {vi!r}"

def build_i18n():
    en = {k: v for k, v in json.loads((ROOT / "content/ui.en.json").read_text()).items() if not k.startswith("_")}
    vi = json.loads((ROOT / "content/ui.vi.json").read_text())
    vi = {k: v for k, v in vi.items() if not k.startswith("_")}
    assert set(en) == set(vi), f"ui text keys differ: missing in vi {sorted(set(en) - set(vi))}, extra in vi {sorted(set(vi) - set(en))}"
    for k in en: check_pair(f"ui {k}", en[k], vi[k])
    out = ROOT / "public/i18n.js"
    out.write_text("/* Generated by scripts/build_content.py from content/ui.en.json and content/ui.vi.json. Do not edit by hand. */\n"
                   "window.I18N = " + json.dumps({"en": en, "vi": vi}, ensure_ascii=False, indent=1) + ";\n")
    return len(en)

def add_vietnamese(c):
    vi = {i["chapter"]: i for i in json.loads((ROOT / "content/ideas.vi.json").read_text())["ideas"]}
    assert set(vi) == {i["chapter"] for i in c["ideas"]}, "ideas.vi.json must cover all 13 chapters"
    for i in c["ideas"]:
        v, ch = vi[i["chapter"]], i["chapter"]
        for k in ("name", "bookTitle", "lightReason"): check_pair(f"ch{ch} {k}", i[k] if k != "lightReason" else i["lightReason"], v[k])
        for k in ("why", "actions"):
            for side in ("mars", "venus"): check_pair(f"ch{ch} {k}.{side}", i[k][side], v[k][side])
        vs = {x.get("id"): x for x in v["scenarios"]}
        en_ids = [x["id"] for x in i["scenarios"]]
        assert len(vs) == len(v["scenarios"]), f"ch{ch}: Vietnamese moment IDs must be unique"
        assert set(vs) == set(en_ids), f"ch{ch}: Vietnamese moment IDs {sorted(vs)} must match English {sorted(en_ids)}"
        for se in i["scenarios"]:
            sv, sid = vs[se["id"]], se["id"]
            for k in ("prompt", "good", "miss"):
                check_pair(f"ch{ch} {sid} {k}", se[k], sv[k])
                assert len(sv[k]) <= 70, f"ch{ch} {sid} {k}: keep Vietnamese to 70 characters or fewer"
            # the same speaker must appear in both languages (catches a moment joined to the wrong text)
            for en_name, vi_name in (("Venus", "Sao Kim"), ("Mars", "Sao Hỏa")):
                assert (en_name in se["prompt"]) == (vi_name in sv["prompt"]), f"ch{ch} {sid}: {en_name} and {vi_name} must both appear or both be absent"
        i["vi"] = {"name": v["name"], "bookTitle": v["bookTitle"], "why": v["why"], "actions": v["actions"],
                   "scenarios": [{"id": se["id"], **{k: vs[se["id"]][k] for k in ("prompt", "good", "miss")}} for se in i["scenarios"]],
                   "lightReason": v["lightReason"]}

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
    add_vietnamese(c)
    keys = build_i18n()
    p = ROOT / "public/data/content.json"; p.write_text(json.dumps(c, ensure_ascii=False, indent=1))
    print(f"ok {p.relative_to(ROOT)}: {len(c['ideas'])} ideas, {sum(len(i['scenarios']) for i in c['ideas'])} scenarios, {sum(len(i['sources']) for i in c['ideas'])} receipts; public/i18n.js: {keys} keys in English and Vietnamese")
