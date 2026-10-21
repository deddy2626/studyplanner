# Petal Study Planner

A cute pink-pastel study planner that works on phone and desktop.

- **Today**: progress ring, today's study blocks, focus timer, exam countdown, missed blocks
- **Week**: plan blocks per day, drag them between days, browse other weeks
- **Subjects**: colour, exam date and a topic checklist per subject
- **Progress**: weekly goal, hours per day, split by subject, streaks
- **Settings**: weekly goal, focus length, light/dark, backup and restore

Everything is saved in the browser (`localStorage`). Use **Settings > Download backup** to move data to another device.

## Run locally

It is a static site with no build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly will not work because browsers block ES modules on `file://`.)

## Deploy

**GitHub Pages**: repo Settings > Pages > Build and deployment > Deploy from a branch > `main` / `(root)`.

**Vercel**: import the repo, set Framework Preset to "Other", leave build command and output directory empty.

## Project layout

```
index.html        page shell
css/styles.css    design tokens (light + dark) and components
js/util.js        date and formatting helpers
js/store.js       state, localStorage persistence, queries (streaks, minutes)
js/views.js       HTML for each screen and dialog
js/app.js         events, timer, routing
```
