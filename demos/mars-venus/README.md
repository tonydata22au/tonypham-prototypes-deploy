# Swipe the Moment

A 30-second phone game based on John Gray's book *Men Are from Mars, Women
Are from Venus* (1992). You pick your planet, then swipe how you would react
to moments from the other planet. Each habit shows two things: what readers
love, and what research says.

**Play it:** https://demo-mars-venus.tonypham-demos.pages.dev
(the "How I built it" page is at `/how`).

## What is in this folder?

| Path | What it is |
|---|---|
| `public/` | The live game: `index.html`, `app.js`, `styles.css`, the "How I built it" page (`how.html`) and its pictures (`img/`). |
| `public/data/content.json` | The one data file the game reads. It is generated, so do not edit it by hand. |
| `content/ideas.json` | The game's words: 13 habits, the book's advice for Mars and for Venus, a daily action, and 52 moments. |
| `research/ranking.json` | How much readers love each habit: Goodreads quote likes and mentions in 124 reviews. |
| `research/science.json` | What research says about each habit, with source links. |
| `scripts/build_content.py` | Joins the three files above into `public/data/content.json` and checks them. |

## How do I change the game?

1. Edit `content/ideas.json`. Keep each moment to 9 words or fewer.
2. Rebuild the data file:

   ```sh
   python3 scripts/build_content.py
   ```

   The script stops if a habit has no source link, if a planet is missing a
   moment, or if any of its 5 test questions gives the wrong answer.
3. Open `public/` with any local web server to try it, for example
   `cd public && python3 -m http.server 8000`.
4. Publish again with `scripts/publish mars-venus <folder>` from a fresh
   clone of this repo. The live link stays the same.

## What isn't proven?

- The "good" replies are a reading of the book. The research lights cover
  each habit, not each reply.
- Few reviews name a single habit; most talk about the whole book.
- It was tested in a phone-size browser, not on every phone.
- It is a game, not therapy. It stores nothing and tracks nothing.
