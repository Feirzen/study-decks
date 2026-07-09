# Study Decks

A self-contained flashcard + quiz app that runs on GitHub Pages. Open one URL on your PC, laptop, or iPhone. Progress (scores, stars, streaks, known cards) is saved per device in the browser and survives closing/reopening.

## Structure

```
index.html                     the whole app (no build step, no dependencies)
.nojekyll                       tells GitHub Pages to serve files as-is
sets/
  manifest.json                list of classes and their sets
  religion-212/
    exam-1.json                one study set
```

Adding a **class** = a new folder under `sets/` + an entry in `manifest.json`.
Adding a **set** = one `.json` file + a line in that class's `sets` array.

## Modes

- **Quiz** — by category, multiple-choice and select-all, immediate feedback with explanations, star any question, per-question grid.
- **Flashcards** — flip cards (tap to reveal), "Got it / Still learning". Every quiz question becomes a flashcard automatically (front = question, back = answer + explanation). You can also add dedicated cards (see below).
- **Shuffle** — infinite random questions with a live streak + best-streak counter.

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
      "color": "#7C3AED",               // accent color for this category
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
      ],
      "flashcards": [                   // OPTIONAL dedicated cards (not derived from questions)
        { "id": "fc1", "front": "Define Hellenism", "back": "The popular Greek-influenced culture of antiquity." }
      ]
    }
  ]
}
```

Options are shuffled on every visit, so answer order never matters.

## One-time setup (GitHub Pages)

1. Create a new GitHub repo (e.g. `study-decks`).
2. Upload everything in this folder to the repo root.
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
4. Wait ~1 minute, then open `https://<your-username>.github.io/study-decks/`.
5. On iPhone: open that URL in Safari → Share → **Add to Home Screen**. It launches full-screen like an app.

## Adding a new set later

Give Claude your study material and say which class it belongs to. Claude generates the set `.json`, drops it in the right folder, and adds it to `manifest.json`. Commit + push and refresh the page.
