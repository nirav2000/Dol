## v2.12.8 — reliable mobile keypad across pointer profiles (28 October 2026)

- Apply compact phone keypad styling based on viewport, regardless of whether a touch-capable browser reports a coarse pointer; the JavaScript still controls whether the keypad is actually shown.
- Fix touch-profile transitions that could leave the entry controls hidden after advancing to the next question.
- Keep active and review pair tiles visually consistent, allowing a small responsive width variation without changing their heights.
- Ensure WebKit desktop/tablet review checks measure the board after returning to the top of the page rather than after a user-action scroll.
- Maintain the full 441 iPhone target-width Chromium/WebKit checks and retain all learning and history data.

## v2.12.7 — stable factor tiles on tablets (28 October 2026)

- Unify active Pair Board and completed-round tiles to the same minimum height and padding on tablets and desktop as well as phones.
- Prevent the old high-specificity tablet styling from shrinking the review cards.
- Regression tests now compare actual layout size rather than intentional animation transforms, across Chromium and WebKit.

## v2.12.6 — round review Next button height and accessibility (28 October 2026)

- Remove the legacy 100px height limit on the in-flow review keypad, which could leave Next Question extending below its container and clip the bottom of its button.
- Hide the redundant review keypad label, factor fields and digit keys unconditionally, including browsers that report touch capability without pointer:coarse.
- Retain a full-size, keyboard- and touch-accessible Next button with adequate scroll clearance and never overlay review content.
- The 441 factor-target geometry regression passed in Chromium and WebKit at 320px, 390px and 430px, including Focus mode.

## v2.12.5 — iPhone factor target typography (28 October 2026)

- Increase the target-number size proportionately on narrow and modern iPhones so a three-digit factor challenge remains prominent inside the full-width target tile.
- Preserve the target's vertical fit alongside the layout selector, safe area, touch keypad and round actions.
- Chromium/WebKit tests check the real 441 scenario across 320px, 390px and 430px widths and Focus/normal presentation.

## v2.12.4 — correct mobile-input detection and protect desktop resizing (28 October 2026)

- Hide duplicate Next/Start controls only when the actual mobile keypad is enabled, not merely because a browser window is narrow.
- Restore a normal Start/Next button in resized desktop browsers and maintain one review action on real touch phones.
- Run the screenshot-reproduction target geometry test first in CI to block any unreadable target regressions before longer app checks.
- Increment version and service-worker cache together without changing gameplay or learning evidence.

## v2.12.3 — full-width mobile target and regression guard (28 October 2026)

- Fixed the real iPhone Pair Board regression where the target number, including 441, collapsed into a thin strip beside Pause and Finish. The target now uses a full-width, minimum-readable area above the round controls and factor board, in normal and Focus modes.
- Phone gameplay uses a compact Explain/Rainbow/Arrays toolbar rather than a permanently expanded coaching panel. Teaching features remain available in both modes.
- Hide duplicate next-round controls on compact reviews, preserve the persistent thumb keypad and scroll to the visible target at the start of each Pair Board round.
- Added an automated real-browser geometry test of 441 in Chromium and WebKit across small and large phones and Focus/normal modes. Check target width, clipping, control and board order, keypad bounds, no horizontal overflow, and review navigation.
- GitHub Pages remains gated on the full suite; installed PWA assets use a bumped versioned offline cache.

## v2.12.2 — stable review continuation (28 October 2026)

Move the same mobile Next Question action into a dedicated review-footer slot after the main play grid, avoiding ancestors hidden by legacy Classic or Pair Board phase styling. Keep it non-overlay, thumb-accessible and available in Focus Mode. Cover the correct DOM placement in browser tests and animate the final discovered pair in review.

## v2.12.1 — iPhone review and target layout refinement (28 October 2026)

- Ensure Next Question stays visible in the inline round-review section after moving the persistent keypad from its original dock, without obscuring maths or scores.
- Position the Pair Board switcher beneath the target numeral on phones rather than overlapping the number.
- Bump the PWA cache so installed iPhone apps receive the layout corrections.

## v2.12.0 — learning-first responsive interface (28 October 2026)

- A compact challenge summary replaces the crowded phone launcher; "Change challenge" reveals the full guided/practice/timed options and settings.
- Difficulty and number-limit selectors are editable whenever a round is not running. Selecting either automatically switches from Adaptive to Custom. All selectable number-limit values are represented, including 144; active-round settings are locked with an explanation.
- Pair Board placeholders and solved tiles share the same large mathematical number-card design across play and review, with stable geometry and discovery animations, including final-pair completion.
- A compact focus toolbar restores Explain, Factor Rainbow and Arrays while remaining in Focus. Visualisations open in a dismissible sheet rather than silently exiting Focus.
- Round review opens interactive "how to discover this pair" lessons on tap. "Correct the score" explicitly opts into manual score adjustments and cannot rewrite learning evidence.
- On phones, Next Question is placed after the round review in document flow, not over the mathematics, while the same thumb keypad remains in use during play.
- Full regression checks added for challenge selection, board sizing and animation, focus learning, review scoring, and mobile navigation; retain previous math and Firebase sync code.

# Factor Frenzy — Dol v2.10.2

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

## v2.11.1 — reliable iPhone PWA start (28 October 2026)

- Existing installed PWAs now check for service-worker updates at launch and whenever the app returns to the foreground. When a new worker takes control, a visible update button appears rather than silently replacing the page during a round.
- Cache warming is bounded to four parallel resources and tolerates individual HTTP errors. Also removed the overly broad \`/Dol/\` network-first match (which affected all static modules and could return a 503 even when a module was cached). Navigations remain network-first automatically; app code/assets are now cache-first. A single temporary hosting 503 no longer aborts the entire service-worker installation.

A published WebKit regression run observed intermittent GitHub Pages HTTP 503 responses for a module dependency. Dol's boot script now automatically retries one incomplete app startup (never a ready game), then offers a visible, accessible manual Retry control if the second attempt fails. This preserves local progress and prevents a stranded standalone PWA. Automated Chromium/WebKit tests simulate a first-load 503 and verify recovery.

## v2.11.0 — learning-first mobile restoration (28 October 2026)

Immersive Focus mode was enabled by default in v2.2.0 and hid the original factor rainbow and array tools, even after richer teaching arrived in v2.6.x–v2.10.x. The phone stylesheet further hid visuals in v2.7.16. Focus is now explicitly opt-in; existing data, scores and cloud sync are preserved.

Guided rounds now show a live board-aware "Your next discovery" card, square-root search boundary, a safe entry into interactive hints, and one-tap visual rainbow/array exploration. The rainbow follows only discovered pairs until the learner chooses to reveal the complete answer. Per-pair success animations complement full-round prime/square celebrations; reduced-motion preference is respected. The review explains how to prove completeness and why square middle pairs count once.

Automatic difficulty resumes using successful round history where available, avoids trivial single-pair targets at advanced levels, and treats helped correct answers as successful learning rather than failures. The learner can choose a harder level. Phone navigation, controls, and coaching are responsive without changing the established touch keypad or score accounting.

## v2.1.0 — interactive visuals and round review

Large tappable factor-pair review tiles recalculate score and completion bonus. Review corrections do not alter mastery evidence. Opt-in automatic next question offers 3/5/8/12-second review intervals, with hold/resume, visibility protection and manual next. In-round rainbows initially show only discovered pairs; revealing all or using arrays marks subsequent answers assisted. The Learn page includes a factor-rainbow and array playground for 1–1024, with remainders, rotation and grouped counters. Pure model tests and browser smoke tests cover these interactions.

## v2.2.0 — focus-first keyboard play

Focus mode is enabled on first visit and persists as a browser preference. It hides the nonessential navigation, settings, visual aids, and explanatory panels while preserving the number, score, timer, answer input, factor pairs and round controls. Move a mouse to the top edge to reveal navigation, tap the always-visible Menu button on touch devices, or use the keyboard to focus the menu. Exit focus and the Settings checkbox both switch layouts. The pair entry automatically receives focus on new rounds, after valid or invalid submissions, and on returning to Play. In manual-next mode, Enter advances from the finished-round screen when not using another interactive control; auto-next continues to operate independently.

## v2.4.0 — iPhone-first play

Touch devices up to 700px use a compact gameplay layout and a dedicated numeric keypad. The keypad action key starts as × to move to the second factor, then becomes ↵ to submit. Either factor can be edited, and Backspace deletes a digit. No native iOS QWERTY keyboard is needed. The existing answer form remains the authoritative validation/scoring path; desktop typing and the shared Learning SDK are unchanged. The screen accounts for safe areas and short viewports, with the target, timer, discovered pairs, input and keypad arranged vertically.

## v2.10.2 — Complete discovery with two-way regrouping

The board-aware tutor now moves small factors in **either direction** when reusing a known pair. For example, from 21 × 27 = 567 it can divide 21 by 3 and multiply 27 by 3 to discover the new 7 × 81. The always-valid 1 × target pair is also available as a quick identity technique, so no prime number or nearly complete board gets stranded without a suggestion. All user-visible worked steps remain interactive and score-neutral.

An exhaustive 3,072-case simulation (three starting-board states for each target from 1–1024) confirms that accepting successive recommended new pairs eventually completes the entire factor board without repeating a pair. Browser regression adds the 567 reverse-regroup case. The 990 six-pair case remains covered, including shortcuts to 10 × 99, balanced changes to 11 × 90, and regrouping to 30 × 33.

## v2.10.1 — Board-aware teaching and rapid mental routes

**Suggested hints never present a completed factor pair as a new discovery.** The tutor examines all accepted board pairs, counts the ones still missing and ranks several routes to *distinct* missing pairs. For 990 with 1 × 990, 2 × 495, 3 × 330, 6 × 165, 9 × 110 and 22 × 45 already found, it offers: (1) a one-question final-zero shortcut to 10 × 99; (2) halve/double the existing 22 × 45 to reach 11 × 90; and (3) split/regroup 3 × 330 to reach 30 × 33. It no longer asks the learner to rediscover 3 × 330 or 6 × 165. Three alternative route buttons are presented above an optional systematic check. The opening hint gives a reusable mental checklist and can be closed immediately so the learner works on the real board without extra interactions. A longer prime-pieces lesson is still available under 'Choose a different approach'.

Opening help does not itself mark an answer assisted; only affected new pairs are marked. Game points, mistakes, saved rounds and existing learning records are preserved. Regression tests cover the board's exact 990 state, 595, evolving progress, every target 1–1024, and touch-friendly Chromium/WebKit browser scenarios.

## v2.10.0 — Rapid fluency practice and squares 1–100

One-tap **Quick square practice** is available from the Focus-friendly Play screen, the Learn Studio and Progress. In the fast drill, a complete answer autocommits after a short correction window (or immediately on Enter), and correct fast responses advance automatically. Slow, assisted or incorrect responses pause with an example, and Enter resumes. Phones have a large native Dol number pad with an optional iOS keyboard. The next 10 new/due items are picked from the chosen range (12, 20, 32, 50, 75, 100); confident facts are not repeatedly recycled before their due dates. Fast unassisted square recall is spaced at 7/14/30/60/90 days on successful revisits, while slow, incorrect and helped facts return sooner. These times are initial heuristics, not diagnostic scores.

The square-learning map now teaches 1² through 100², with near-anchor mental techniques, 25/50/75 mirror patterns and correct mathematical explanations. Large area models use scaled schematics rather than generating 10,000 individual tiles. The factor game itself continues to use targets no larger than 1024. Learner evidence remains in the shared Learning SDK, and older evidence is never erased by this release. Read docs/SQUARE-NUMBERS-STUDIO.md for lessons, speed criteria and test cases.

## v2.9.0 — Square Numbers Studio

Square-number learning is now a connected course rather than just a reference card: a tappable entry from the Focus-friendly Play screen and Learn cards, individual lesson tiles for 1²–32², odd-number visual patterns, mental-square memory techniques, roots, factor-search boundaries and area examples, plus five-question guided lessons, ten-question mixed workouts, assisted recovery, per-skill retention and a dedicated **Review due** queue. All practice flows through the existing Learning SDK and Learning Sync adapter, with scores unaffected. See [Squares Studio details](docs/SQUARE-NUMBERS-STUDIO.md).

