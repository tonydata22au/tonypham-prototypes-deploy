# Swipe the Moment

A 30-second phone game based on John Gray's book *Men Are from Mars, Women
Are from Venus* (1992). You pick your planet, then swipe how you would react
to moments from the other planet. Each habit shows two things: what readers
love, and what research says. It plays in English and Vietnamese: use the
EN | VI switch, or add `?lang=vi` to the link.

**Play it:** https://demo-mars-venus.tonypham-demos.pages.dev
(the "How I built it" page is at `/how`).

## What is in this folder?

| Path | What it is |
|---|---|
| `public/` | The live game: `index.html`, `app.js`, `styles.css`, the "How I built it" page (`how.html`) and its pictures (`img/`). |
| `public/data/content.json` | The habits, moments and research the game reads, in both languages. Generated: do not edit by hand. |
| `public/i18n.js` | Every screen text in English and Vietnamese. Generated: do not edit by hand. |
| `content/ideas.json` | The game's words: 13 habits, the book's advice for Mars and for Venus, a daily action, and 52 moments. |
| `content/ideas.vi.json` | The same, in Vietnamese. Each moment has an ID such as `3-venus-1` that links it to its English version. Translated by Codex (GPT-6.2 Sol). |
| `content/ui.en.json`, `content/ui.vi.json` | Every screen text, in English and in Vietnamese. |
| `research/ranking.json` | How much readers love each habit: Goodreads quote likes and mentions in 124 reviews. |
| `research/science.json` | What research says about each habit, with source links. |
| `scripts/build_content.py` | Builds `public/data/content.json` and `public/i18n.js` from the files above, and checks them. |
| `scripts/test_build_content.py` | Breaks the content on purpose in 5 ways and checks that the build refuses each one. |

## How do I change the game?

1. Edit `content/ideas.json` (English moments: 9 words or fewer) and the
   moment with the same ID in `content/ideas.vi.json` (Vietnamese: 70
   characters or fewer).
   Screen text lives in `content/ui.en.json` and `content/ui.vi.json`.
2. Rebuild the data file:

   ```sh
   python3 scripts/build_content.py
   ```

   The script stops if a habit has no source link, if a planet is missing a
   moment, if any of its 5 test questions gives the wrong answer, or if the
   English and Vietnamese texts don't match (same keys, moment IDs, blanks
   and tags). Text may only use the tags `<b>`, `<i>` and `<br>`. To check
   that these guards still work, run `python3 scripts/test_build_content.py`.
3. Open `public/` with any local web server to try it, for example
   `cd public && python3 -m http.server 8000`.
4. Publish again with `scripts/publish mars-venus <folder>` from a fresh
   clone of this repo. The live link stays the same.

## What isn't proven?

- The "good" replies are a reading of the book. The research lights cover
  each habit, not each reply.
- Few reviews name a single habit; most talk about the whole book.
- It was tested in a phone-size browser, not on every phone.
- A native Vietnamese speaker has not checked the translation yet.
- It is a game, not therapy. It stores nothing and tracks nothing.
