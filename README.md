# Factor Frenzy — Dol v2.10.0

A solo maths learning app with three modes: guided learning (no timer), independent practice (no timer), and timed challenge (30/60/90 seconds). Uses a responsive black/grey/white design, progressive factor hints, a selectable divisor grid, 23 documented techniques and adaptive target selection.

## Maths and learning

- Factor pairs are computed by testing integer divisors up to the square root. Reversed pairs count once.
- Foundation includes small numbers such as 12. Higher stages add times-table fluency, systematic search, strategic factorisation and expert challenges.
- The adaptive generator considers factor-pair count, factor size, prime decomposition, squares, stage and past success on each target. This is a heuristic, not a calibrated psychometric model.
- Progressive hints ask a question first, then reveal divisibility and division steps, finally the pair.
- Halve-and-double is explicitly encouraged for fast discovery, alongside a systematic completeness check.
- Each accepted pair earns one point, and finding all pairs earns two more. The existing local score/round key is retained.
- The Learn tab documents rules, conceptual help, mental arithmetic, primes, visual techniques and memorisation.
- The Progress tab uses the shared Learning SDK at /Apps/learning/v1/index.js for local concept events and spaced practice indicators. No account or Firebase.
- The app uses the shared Apps Platform manifest contract. Shared Version Lab historical snapshots are managed centrally; /versionlabs/ is developer-only.

## Run

Serve over HTTP (ES modules require it), e.g. python3 -m http.server 8080. A network connection to the shared Learning SDK URL is required.

Run tests: node --test tests/*.test.mjs.

## Limitations

No multiplayer, authentication, cloud sync, validated learning diagnostics, or production offline support yet. Hints count against unassisted performance; learning estimates are heuristic. A complete browser smoke and accessibility audit should accompany release.

## v2.1.0 — interactive visuals and round review

Large tappable factor-pair review tiles recalculate score and completion bonus. Review corrections do not alter mastery evidence. Opt-in automatic next question offers 3/5/8/12-second review intervals, with hold/resume, visibility protection and manual next. In-round rainbows initially show only discovered pairs; revealing all or using arrays marks subsequent answers assisted. The Learn page includes a factor-rainbow and array playground for 1–1024, with remainders, rotation and grouped counters. Pure model tests and browser smoke tests cover these interactions.

## v2.2.0 — focus-first keyboard play

Focus mode is enabled on first visit and persists as a browser preference. It hides the nonessential navigation, settings, visual aids, and explanatory panels while preserving the number, score, timer, answer input, factor pairs and round controls. Move a mouse to the top edge to reveal navigation, tap the always-visible Menu button on touch devices, or use the keyboard to focus the menu. Exit focus and the Settings checkbox both switch layouts. The pair entry automatically receives focus on new rounds, after valid or invalid submissions, and on returning to Play. In manual-next mode, Enter advances from the finished-round screen when not using another interactive control; auto-next continues to operate independently.

## v2.4.0 — iPhone-first play

Touch devices up to 700px use a compact gameplay layout and a dedicated numeric keypad. The keypad action key starts as × to move to the second factor, then becomes ↵ to submit. Either factor can be edited, and Backspace deletes a digit. No native iOS QWERTY keyboard is needed. The existing answer form remains the authoritative validation/scoring path; desktop typing and the shared Learning SDK are unchanged. The screen accounts for safe areas and short viewports, with the target, timer, discovered pairs, input and keypad arranged vertically.

## v2.10.0 — Rapid fluency practice and squares 1–100

One-tap **Quick square practice** is available from the Focus-friendly Play screen, the Learn Studio and Progress. In the fast drill, a complete answer autocommits after a short correction window (or immediately on Enter), and correct fast responses advance automatically. Slow, assisted or incorrect responses pause with an example, and Enter resumes. Phones have a large native Dol number pad with an optional iOS keyboard. The next 10 new/due items are picked from the chosen range (12, 20, 32, 50, 75, 100); confident facts are not repeatedly recycled before their due dates. Fast unassisted square recall is spaced at 7/14/30/60/90 days on successful revisits, while slow, incorrect and helped facts return sooner. These times are initial heuristics, not diagnostic scores.

The square-learning map now teaches 1² through 100², with near-anchor mental techniques, 25/50/75 mirror patterns and correct mathematical explanations. Large area models use scaled schematics rather than generating 10,000 individual tiles. The factor game itself continues to use targets no larger than 1024. Learner evidence remains in the shared Learning SDK, and older evidence is never erased by this release. Read docs/SQUARE-NUMBERS-STUDIO.md for lessons, speed criteria and test cases.

## v2.9.0 — Square Numbers Studio

Square-number learning is now a connected course rather than just a reference card: a tappable entry from the Focus-friendly Play screen and Learn cards, individual lesson tiles for 1²–32², odd-number visual patterns, mental-square memory techniques, roots, factor-search boundaries and area examples, plus five-question guided lessons, ten-question mixed workouts, assisted recovery, per-skill retention and a dedicated **Review due** queue. All practice flows through the existing Learning SDK and Learning Sync adapter, with scores unaffected. See [Squares Studio details](docs/SQUARE-NUMBERS-STUDIO.md).

