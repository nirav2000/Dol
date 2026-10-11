# Dol — Factor Frenzy (solo typing)

A responsive, playable reimplementation of **Factor Frenzy** based on the supplied screenshots from mistakes.cool. This edition deliberately supports **solo typing only**.

## Run locally

The app uses browser ES modules and does not need an npm install or a backend. Serve this repository over HTTP:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/ or host the repository via GitHub Pages (root directory, `main` branch). Opening `index.html` directly using a `file://` URL will not load the modules in most browsers.

## Gameplay

1. Pick the maximum number (64, 128, 256, 512 or 1024) and round length (30, 60 or 90 seconds).
2. Press **Show number & start** to reveal a random number that has at least four factor pairs.
3. Enter a complete expression into one input (e.g. `3x35`, `4 × 6`, `4*6`, or `4 6`) and press **Enter** or **Add pair**.
4. A unique valid factor pair scores **1 point**. Reversing a pair does not earn extra points. Finding every factor pair earns a **2-point bonus**.
5. Pause/resume the countdown or finish early. The round summary reveals missing pairs. Choose **Next round** to continue.

Sound and optional counts can be toggled. Maximum, duration and mode are locked during an active/paused round, as shown in the reference interface. Scores, round number and settings persist in local browser storage.

## Verification

Run the dependency-free arithmetic tests with:

```sh
node --test tests/logic.test.mjs
```

The validation checks factors, perfect squares, eligible number selection, input parsing, helpful arithmetic errors, deduplication and timer display. CI runs these tests on pushes to `main`. Browser end-to-end interaction tests and visual screenshot comparisons still need verification in a hosted browser.

## Not included

Solo whiteboard, Boggle and head-to-head competition are **intentionally disabled**. Two-player competition on separate devices can be added later with authentication, shared rooms, server-authoritative timestamps and scoring, and a live synchronization transport. No account/login is required for solo play.

## Source limitations

The user-provided screenshots ground the visible layout and some gameplay rules, but not the original source code or all edge-case behaviours. Factor selection, early-completion handling and pause/resume semantics are implemented explicitly rather than claimed to be exact hidden copies of the original.
