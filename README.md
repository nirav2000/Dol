# Dol — Factor Frenzy

Solo typing recreation of the **Factor Frenzy** game shown on mistakes.cool.

## Play
Open `index.html` in a browser or use GitHub Pages. Choose the maximum number and time limit, then select **Show number & start**. Enter both factors and press **Add pair** (or Enter). Each unique unordered factor pair scores 1 point. Finding all pairs earns 2 bonus points.

## Features
- Solo typing only; whiteboard and Boggle modes are disabled intentionally.
- Configurable maximum (64, 128, 256, 512, 1024) and timer (30, 60, 90 seconds).
- Random numbers with at least four factor pairs.
- Validates multiplication, deduplicates reversed pairs, tracks round/score, shows progress and missed pairs.
- Sound toggle, optional pair count, score reset, keyboard-friendly inputs.
- Local storage remembers settings and scores on the current device.
- Responsive, static and dependency-free; no accounts or backend required.

## Future multiplayer
Real-time two-device competition is **not implemented**. Future work needs authenticated identities, server-authoritative round/timer/score validation, and live room synchronization. Local storage is not a multiplayer datastore.

## Notes
The screenshot provided documents the original layout and visible rules. The precise hidden random-number selection and round transition logic could not be verified from that screenshot; this is an independently implemented playable interpretation.
