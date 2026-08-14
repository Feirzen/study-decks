# Study Decks

A self-contained quiz app that runs on GitHub Pages. Open one URL on your PC, laptop, or iPhone. Progress (scores, stars, misses, streaks, battle level) is saved per device in the browser and survives closing and reopening.

## Structure

```
index.html      markup shell
styles.css      themes + all styling (every color is a CSS custom property)
core.js         state, persistence, themes, audio, effects, keyboard nav
game.js         Battle Mode + pixel sprites
app.js          boot, routing, screens, events
.nojekyll       tells GitHub Pages to serve files as-is
sets/
  manifest.json list of classes and their sets
  religion-212/
    exam-1.json one study set
```

No build step and no dependencies. Edit a file, commit, refresh.

Adding a **class** = a new folder under `sets/` + an entry in `manifest.json`.
Adding a **set** = one `.json` file + a line in that class's `sets` array.

## Modes

- **Quiz** — by chapter, multiple-choice and select-all, immediate feedback with explanations, star any question, per-question grid.
- **Shuffle** — endless questions with a live streak and best-streak counter.
- **Battle** — every answer is an attack. Five enemies then a boss, floor after floor, until your HP runs out. XP and levels persist per deck.

All three write to the same progress record, so anything you answer anywhere shows up in the chapter grids.

## How progress works

- A correct answer marks a question green; a miss marks it red. A question can move back and forth freely, so the grid always reflects how you are actually doing right now.
- Every miss is counted for the lifetime of the deck. Miss something twice and it stars itself automatically.
- **Starred** and **Misses** are mutually exclusive filters that scope Shuffle and Battle. Misses covers anything you have *ever* missed, with currently-wrong questions weighted to come up first.
- Shuffle and Battle order questions by weight rather than pure random: currently wrong beats previously missed beats never missed. Every question still appears once per pass.

## Themes

Four, picked from the palette button in the top right and remembered across sessions:

- **Midnight** — the original dark theme
- **Paper** — light
- **Sepia** — warm and low-light
- **Chameleon** — a fresh generated palette every 3 answers. Hue is random; saturation and lightness are constrained so contrast is always readable. Tap the lizard to lock a palette you like, tap again to release it.

Category and deck colors from the JSON are automatically re-fitted to whichever theme is active, so authored colors stay legible on light and dark alike.

## Keyboard

Arrow keys move the highlight, Enter selects or submits, Backspace leaves the current screen.

## Set file schema

```jsonc
{
  "id": "religion-212-exam-1",          // unique across all sets
  "class": "Religion 212",
  "title": "Exam 1",
  "subtitle": "New Testament — Backgrounds & Acts",
  "categories": [
    {
      "category": "Historical Background",
      "color": "#7C3AED",               // accent color for this chapter
      "questions": [
        {
          "id": "h1",                   // unique within the set
          "type": "mc",                 // "mc" = one answer
          "question": "Who was the first king of Israel?",
          "options": ["King David", "King Solomon", "King Saul", "King Rehoboam"],
          "answer": 2,                  // 0-based index of the correct option
          "explanation": "King Saul was the first king of Israel."
        },
        {
          "id": "h2",
          "type": "multi",              // "multi" = select all that apply
          "question": "Which are true? (Select all that apply)",
          "options": ["A", "B", "C", "D"],
          "answers": [0, 2],            // 0-based indices of ALL correct options
          "explanation": "..."
        }
      ]
    }
  ]
}
```

Options are shuffled on every visit, so answer order never matters.

`manifest.json` entries take an optional `"color"` per set, used for that deck's accent on the class screen. Older set files may still contain a `"flashcards"` array; it is ignored.

### Writing options

Keep all options within roughly the same length. A correct answer that is noticeably longer or more specific than its distractors is guessable without knowing the material.

## One-time setup (GitHub Pages)

1. Create a new GitHub repo (e.g. `study-decks`).
2. Upload everything in this folder to the repo root.
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
4. Wait about a minute, then open `https://<your-username>.github.io/study-decks/`.
5. On iPhone: open that URL in Safari → Share → **Add to Home Screen**. It launches full-screen like an app.

## Adding a new set later

Give Claude your study material and say which class it belongs to. Claude generates the set `.json`, drops it in the right folder, and adds it to `manifest.json`. Commit and push, then refresh the page.

## Not done yet

- Cross-device sync (planned: a Cloudflare Worker + KV with a per-question merge, so a phone and a laptop can't clobber each other).
- Offline / installable PWA (web app manifest + service worker).
