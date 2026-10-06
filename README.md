# Study Decks

A self-contained quiz app that runs on GitHub Pages. Open one URL on your PC, laptop, or iPhone. Progress (scores, stars, misses, streaks, battle saves) is saved per device in the browser and survives closing and reopening.

## Structure

```
index.html      markup shell
styles.css      themes + all styling (every color is a CSS custom property)
core.js         state, persistence, themes, audio, effects, keyboard nav
game.js         Battle Mode: engine, level-ups, boons, battle screen, effects
stories.js      Story library, extra sprites + recolors, scenery
hall.js         Heroes, Hall of Fame, save migration
sprites.js      Pixel art for Battle (data only)
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
- **Lesson button** — in Shuffle and Battle, any question from a chapter that has lessons shows a 📖 Lesson button next to the star. It opens the matching lesson in a pop-up over the question (the lesson sitting in front of that question in the chapter), so your streak and battle stay exactly where they are. Chapters with two lessons get Lesson 1 / Lesson 2 tabs in the pop-up.
- **Battle** — every answer is an attack. Three save slots per deck (`fc:adv:<deck id>`, v2), saved after every answer.
  - **Heroes** live across decks (`fc:heroes`). Make one (class + name) or bring an old one into a new slot. Heroes keep their level, boon and trophies forever; each adventure starts them on Floor 1 with fresh techniques.
  - **Levels never stop.** Flat 50 XP per level (5 per correct answer, more for kills and bosses). Every level is a pick: +20 max HP and a full heal, learn one of four class techniques (Hone once all four are known), or roll a boon.
  - **Boons**: one at a time per hero, rolled by rarity (common, uncommon, rare, legendary, chaos). Rerolling is a gamble that replaces the current one. Chaos boons are cosmetic chaos with a small upside (rainbow hero, noodle body, mirrored arena, kazoo hits...).
  - **Stories** (`stories.js`): each deck gets its own five-floor story with scenery, foes, bosses, a final boss and a trophy. Library: Shrunk!, The Ember Relic, The Captive Princess, The Sunken Kingdom, The Clockwork Tower, Frostbound, Sands of the Pharaoh, The Midnight Carnival, plus the original Dragon's Lair. A deck picks one automatically from its id; set `"story": "<id>"` on the set in `manifest.json` to choose.
  - **Trophies**: beating a story's final boss gives the hero that story's trophy and a small permanent perk. The home screen's **Hall of Fame** shows every trophy (animated) and the hero roster.
  - Classes: **Knight** (30% less damage; Shield Bash, Whirlwind, Holy Strike, Judgment), **Wizard** (charges twice as fast; Frost Lance, Fireball, Chain Lightning, Meteor), **Ranger** (30% crit; Volley, Piercing Shot, Snipe, Arrow Rain). Arm a technique before answering; a wrong answer fizzles it.
  - Regular foes never repeat a question until you've seen the whole pool (tracked per save slot). Bosses still pull from your misses, and starred questions can come back now and then on purpose.
  - A defeated foe's spot stays empty until you hit Next, then the next one walks in. On wide screens the arena sits beside the question.
  - Getting knocked out sends you back to the floor entrance with your level, picks and boon intact.

All three write to the same progress record, so anything you answer anywhere shows up in the chapter grids.

## How progress works

- A correct answer marks a question green; a miss marks it red. A question can move back and forth freely, so the grid always reflects how you are actually doing right now.
- Every miss is counted for the lifetime of the deck. Miss something twice and it stars itself automatically.
- **Starred** and **Misses** are mutually exclusive filters that scope Shuffle and Battle. Misses covers anything you have *ever* missed, with currently-wrong questions weighted to come up first.
- Shuffle and Battle order questions by weight rather than pure random: currently wrong beats previously missed beats never missed. Every question still appears once per pass.

## Themes

Four, picked from the palette button and remembered across sessions. The top-right **gear** rolls out the controls (lizard, mute, theme, fullscreen) and tucks them away again. Fullscreen is hidden where the browser can't do it (iPhone Safari, or when launched from the home screen).

- **Midnight** — the original dark theme
- **Paper** — light
- **Sepia** — warm and low-light
- **Chameleon** — a fresh generated palette after every answer. Hue is random; saturation and lightness are constrained so contrast is always readable. Two controls sit in the top bar:
  - **Lizard** sets the tone. Tap to cycle: grey = any palette, white = light palettes only, black = dark palettes only.
  - **Padlock** on the lizard's corner freezes the current palette. It is remembered across sessions (and across theme switches) until you tap it again. Changing the lizard while locked moves the freeze onto a fresh palette in the new tone.

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
