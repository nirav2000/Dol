# Dol — cohesive polish implementation plan
**Status:** implementation-ready specification; NOT implemented by this document  
**Baseline:** `main`, Dol v2.5.3 (12 October 2026)  
**Intent:** deliver a stable, enjoyable, polished factor-practice app in one disciplined implementation, not another sequence of feature accretions.

> **Non-negotiable:** Preserve the current iPhone keypad geometry, key order, sizes, spacing, position, action-key symbol **↵**, and its comfortable thumb location. On completion, **Next Question** replaces that SAME physical action key at the SAME coordinates. Do not relocate Enter, shift it down, or substitute a blue text button. Test this as a regression invariant.

## 0. Definition of success

Dol is primarily **fast factor-pair practice** with optional, genuinely useful understanding. The normal path is **see target → enter pairs → receive unobscured feedback → next question**. Help, method recognition, and review exist only on demand or as a restrained, dismissible post-round suggestion. No extra controls compete with the keypad. A user can complete a full session without ever opening a lesson.

**Ship gate:** every acceptance criterion in sections 9–12 passes on iPhone and iPad; no broken navigation, overlay, stale PWA cache, incorrect maths, duplicate score events, or data migration regressions. Do not declare complete on successful GitHub commits alone.

## 1. Current implementation inventory — preserve, consolidate, or retire

| Existing source | What is there today | Action |
|---|---|---|
| `index.html` | Play/Learn/Progress/Settings, guided/practice/timed, factor board, hint controls, review, footer version | Keep main navigation and modes. Reorganise *presentation*, not app identity. |
| `mobile-entry.mjs`, `mobile-entry.css` | Persistent fixed mobile dock, numeric keypad, first/second fields, Enter/Next Question action, adaptive dock reservation | **Preserve DOM and keypad geometry.** Rework only feedback and the content *above* the dock. |
| `learning-app.mjs` | Round state, scoring, duplicate/invalid detection, hints, Learn topics, progress, score persistence | Keep one authoritative round state/scoring pipeline. Extract view renderers if needed; do not duplicate state. |
| `logic.mjs`, `adaptive.mjs` | Factor mathematics, pair assessment, adaptive selection, 23 technique entries | Preserve correctness and adaptive intent; map techniques into families without deleting the underlying content. |
| `strategy-model.mjs` | `divisibilityRule`, `divisionChunks`, `factorLesson`, `transformationLesson`, technique-recognition session | Make this the **single source of mathematical explanations** and family metadata. Fix misleading examples. |
| `strategy-coach.mjs`, `strategy-coach.css` | Progressive hint dialog, technique workout, help attribution and history | **Keep one** progressive hint UI; simplify its hierarchy and attach tappable rule explanations. |
| `factor-patterns.mjs`, `factor-patterns.css` | Optional post-round factor explorer; duplicates mathematical prose and creates review DOM | Merge into the canonical round review; retire redundant explanations and any duplicate observer/render paths. |
| `round-tools.mjs`, `round-model.mjs`, `visual-tools.mjs` | Round review, scoring and visualisation tools, auto-advance | Use existing review/visual infrastructure. Do not add a second review scoring mechanism. |
| `learning-insights.mjs` | Answer evidence, pauses, adaptive recommendations and progress | Extend minimally with technique-family evidence, maintaining assisted/unassisted separation. |
| `focus-mode.css`, `styles.css` | Focus defaults and core visual design | Preserve black/grey visual language; unify responsive tokens. |
| `service-worker.js` | Cache-first PWA with versioned cache | Bump cache and precache every changed module; test actual upgrades. |
| `tests/*.test.mjs` | Node maths and app logic tests | Expand tests and add browser/mobile smoke coverage. |

**Existing product constraints:** all commits go to `main`; increment the visible version, footer, asset query strings and PWA cache together. Do not clone or create branches unless an actual tool limitation requires a local checkout. Keep shared App Platform, PWA, Version Lab and Learning SDK integrations; no new Firebase/auth requirement. Preserve local-first data and export.

## 2. Final information architecture: three moments, one practice screen

### A. Practice — default and visually dominant
- One compact top line: Round, Score, Menu.
- Target number remains large, legible, visually appealing; shrink *surrounding vertical whitespace*, not its prominence.
- Compact timer/progress row and a less intrusive Finish Round affordance. No extra Next Round button.
- One factor board: count + discovered pair chips, with adaptive compact overflow. Show `2 of 6` or `2 found · 4 left`, **never inconsistent counts**. If pair count is hidden by preference, do not leak the total.
- Fixed current keypad, unchanged geometry and Enter action. The existing answer fields stay in the dock.
- Feedback in the **existing keypad heading** (not a new bar), so it is visible while typing. Success feedback may be brief; errors persist until the next meaningful edit or next submission. No layout jumps.
- One unobtrusive Hint entry point, always discoverable without covering factor chips. Avoid a new fixed floating button over the dock. When space is scarce, place it as a small control in the factor-board header or use the existing Hint control after scrolling only if visible without obstructing input.
- On mobile, hide the duplicated `#entryFeedback` visual message only if the same message is reliably announced and shown in the dock. On desktop, keep normal feedback.

### B. Help — temporary interruption, not a permanent panel
- Reuse the existing `strategyHintDialog` as the **only** guided hint UI. Do not resurrect the old `#helpSection` grid as a competing system; keep legacy IDs temporarily for compatibility, but route Help to the coach.
- Show `Step 1 of N`, Back, **Next step**, **Let me try**; each tap advances exactly one step. Never make progress dependent on an invisible gesture.
- Start with a question, then a rule, then apply it to the current number, then find the partner, then verify. Reveal only as much as requested.
- Underline actionable terms such as **digit-sum test**, **divisible by 7**, **doubling and halving**, **11 test**; tapping opens a small nested rule explanation *within the existing dialog* (back returns to the same hint step). No stack of new modal dialogs.
- Rule details include: **when to use**, exact rule, worked calculation, why it works (brief, optional), and `Try one` (optional). The user must be able to dismiss it in one action.
- Timed mode: preserve current clock-pause semantics while help is open; resume exactly once, without accidentally restarting a finished round. Mark only the relevant accepted pair assisted, not the whole session.

### C. Review — optional after a round
- Immediately show score, found/missed pairs and **Next Question in the unchanged Enter location**. Review must remain legible when the full keypad is hidden.
- Secondary link: **Explore how the pairs connect**. Open a single interactive view, using existing `round-tools` review + `visual-tools`, not a second independently rendered score board.
- Choose a pair to see **one useful route** to discover it: divisibility, a related known pair, or chunked division. Where meaningful, show an arrow such as `3 × 198 → 6 × 99` (double 3, halve 198). Not every pair needs a connecting arrow.
- Show a simple **systematic completeness** explanation: test potential smaller divisors through `floor(sqrt(n))`, including square-root pairs once. Do not imply that one chain of transformations necessarily discovers *all* pairs.
- Corrections/review taps never alter the historical independent practice score unless the pre-existing explicit review-scoring behaviour is intentionally invoked. Distinguish **original round result** from any interactive review correction; do not count the same pair twice.
- After review, at most **one** contextual suggestion, e.g. `Practise digit-sum tests · 3 quick questions`. Never auto-launch it, never block Next Question.

## 3. Maths content: technique families rather than 23 unrelated buttons

**Organise existing techniques by concept, without discarding the 23 underlying techniques.** One canonical metadata structure (e.g. `technique-families.mjs`, pure functions) provides ID, name, rule, applicability, examples, prerequisites, recognition prompts, and related rules. `strategy-model`, Learn, hint and review consume the same data. No repeated prose in `factor-patterns.mjs`.

| Family | Tests/methods | Core learning |
|---|---|---|
| Digit sums | 3, 9 | Sum digits once; a multiple of 9 is also a multiple of 3. Repeat digit sum only if useful, **not required**. |
| Final digits | 2, 5, 10 | Inspect units digit; 4/25/100 use last two; 8/125 use last three, or repeated halving. |
| Combined tests | 6 = 2×3, 12 = 3×4, 15 = 3×5, 18 = 2×9 | Combining **coprime** factors gives an exact divisibility test. Do **not** claim 2 and 4 can be combined to test 8. |
| Alternating sums | 11 | Alternating positional sums; a difference of **0** or any multiple of 11 passes. |
| General division | 7, 13, 17 and others | No requirement to memorise a tricky digit rule. Use known multiples, partition, quotient and remainder. |
| Factor transformations | Double/halve; multiply/divide by 3; known multiplication facts | Transform an existing pair while preserving product; only divide a side when exact. |
| Systematic search | 1, primes, square root bound, square middle pair | Know what to try and when all pairs are found. |

**Example 594:** `5+9+4=18` ⇒ divisible by **3 and 9**; optional `1+8=9`, clearly labelled optional. `5−9+4=0` ⇒ divisible by 11. Pairs are `1×594, 2×297, 3×198, 6×99, 9×66, 11×54, 18×33, 22×27`. The review can connect `3×198 → 6×99`, `9×66 → 18×33`, and `11×54 → 22×27`.

**Example 84:** exactly **six** pairs: `1×84, 2×42, 3×28, 4×21, 6×14, 7×12`. The digit sum `8+4=12` passes 3 but **not** 9. Because 84 passes 2 and 3 it passes 6; because it passes 3 and 4 it passes 12 (3 and 4 coprime).

**Example 420 ÷ 7:** show `420 = 350+70`, `350÷7=50`, `70÷7=10`, `50+10=60`, `7×60=420`. For **84 ÷ 7**, use `84=70+14` ⇒ `10+2=12`. Explain the divisor test *and* the partner calculation; avoid tautologies such as “test 7 as a divisor”.

**Non-divisor example 85 ÷ 7:** `7×12=84`, remainder `1`; therefore 7 is not a factor. Never use an exact-only explanation when the candidate fails.

**Implementation correction needed:** `factor-patterns.mjs` currently uses `divisionChunks` for arbitrary candidate divisors but its prose assumes an exact quotient and substitutes the pair's partner. The new shared explanation renderer MUST branch on `remainder===0` and use `divisionChunks().remainder` explicitly; no false equality.

## 4. Micro-practice of rules: optional, short, adaptive

- Existing **Choose the move** five-card workout in `strategy-coach.mjs` is valuable. Keep it accessible from Learn; **do not build another workout engine**.
- Add a `3 quick questions` preset to the same engine, with a targeted technique family. Questions should test recognition on **new numbers**, not just rehearse the round's target.
- A user may tap `Show the rule` on a question. This is **assisted recognition**, separately logged; don't count it as an independent success.
- Offer a post-round suggestion only after repeated evidence of difficulty with a technique, not after one typo. Respect `Dismiss` and avoid nagging (at most once per several rounds / same family cooldown).
- No compulsory course, badges, popups, long teaching carousel, or separate top-level tab.
- Preserve existing five-move session, progress/history and choice ratings. Add family IDs to future records without breaking historical records.

## 5. Error feedback and evidence

The game already treats empty/invalid/duplicate differently from incorrect submissions. Preserve that distinction.
- Empty Enter: no penalty, no intrusive message.
- Incomplete input or nonnumeric text: prompt to finish, not a mathematical error.
- Duplicate or reversed duplicate: neutral reminder; no new score and no misconception.
- `2×44=88` for 84: short **arithmetic mismatch**, not automatically a misunderstanding of divisibility. Show `2 × 44 = 88, not 84` in keypad header. Preserve the entered values for correction.
- Repeated arithmetic mismatches may prompt a *non-accusatory* help suggestion; do not infer a stable misconception from one attempt.
- Wrong but well-formed pairs: preserve learning evidence and no incorrect score award; never silently treat as a hint request.
- Correct pair: clear input once, award one point once, show a brief confirmation without obscuring factor chips.
- Feedback header is an accessible live region with deduplicated announcements; no flashing layout shift. If long, allow **two lines within a fixed reserved heading area** or truncate visible copy with an accessible full label, but never hide the key arithmetic.
- Avoid double-recording from touch pointerdown + synthetic click, rapid Enter, or delayed async events.

## 6. Responsive design and keyboard invariants

**Mobile fixed dock:** retain `--mobile-dock-bottom`, `--mobile-dock-width`, `--mobile-key-height`, existing `mobile-keypad` grid and key order from `mobile-entry.css`. No restyling that shifts Enter. Do not change action-key behaviour: first-factor step advances to second-factor entry; completed pair submits; after round it becomes Next Question in the same location.

**Above the dock:** compress header, margins, number-tile whitespace, timer, Finish Round spacing, factor slots. Never use `position:fixed` for feedback in a way that overlaps factor chips or the dock. Use measured dock footprint and viewport/safe-area inset. Preserve scroll when keyboard changes height and when hint closes.

**Factor chips:** responsive flex/grid; show found pairs legibly; if more pairs than available height, use a compact summary and explicit expansion (no clipped text behind dock). Preserve the count preference. Keep touch targets accessible and ensure expansion can be closed without losing input state.

**iPad:** do not force the mobile keypad if a hardware keyboard is active; maintain a sensible optional numeric pad. Hints can appear in a side panel on wide layouts **using the same state/content** as mobile modal, not a duplicate implementation. Desktop retains keyboard and normal feedback.

**Review:** full keypad hidden, only the existing action position reserved for Next Question. Review scrolls normally. No invisible keypad rows.

**Test sizes:** iPhone SE/small, iPhone 13-class, larger iPhone, iPad portrait and landscape, desktop narrow/wide, landscape short viewport, 200% zoom, dynamic type/large text. Check thumb target, no sideways scroll, menu/safe areas, error messages, long numbers (up to 1024), many factor pairs and virtual keyboard interactions.

## 7. Learn and Progress cleanup

**Learn:** replace the flat first impression with 5–7 family cards; each expands to existing rules/techniques, concrete examples, and `Try 3 questions`. Keep searchable technique catalogue as a secondary `All techniques` view so no existing content is lost. Keep memorisation guidance and existing strategy workout, but avoid duplicated intro text.

**Progress:** keep rounds, concepts, due reviews and unassisted pairs. Add a modest `Techniques worth revisiting` list only if reliable evidence exists. Keep recognition and calculation evidence separate, as currently intended. Do not equate rule recognition with proven factor fluency. Preserve local-only messaging and export.

**Settings:** only durable preferences (focus, sound, difficulty/count options and existing toggles). No new clutter or unnecessary switches. Existing localStorage keys remain readable.

## 8. Implementation sequence (one coherent release, not partial UI drops)

1. **Baseline audit:** run existing `node --test tests/*.test.mjs`; record current screenshots and touch coordinates for Enter/Next Question. Map all renderers, IDs, localStorage keys, scoring, and help/review paths. Fix any baseline failures before interpreting regressions.
2. **Maths engine consolidation:** introduce canonical family metadata and a pure explanation function (exact and non-exact), with tests for 84, 420, 594, 748, primes and squares. Make coach, Learn and review consume it.
3. **Unify review:** integrate the optional pattern explorer with `round-tools`/existing visual tools; eliminate duplicate mathematical prose, extra observers and conflicting review scoring. Keep historical session score immutable.
4. **Simplify hint flow:** single coach dialog; explicit step progress; inline rule drilldown and return; preserve timing and assisted-pair attribution.
5. **Polish mobile practice:** preserve keypad geometry; relocate feedback into existing heading; compact above-dock layout; ensure no obscured content. Do not change action-key layout.
6. **Unify technique workout:** family-targeted three-question preset reuses five-card engine; optional cooldown-based suggestion. Preserve existing five-card workout.
7. **Learn/Progress restructure:** families as primary Learn view, catalogue retained, concise evidence-based progress.
8. **Accessibility, PWA, regressions:** automated tests, manual mobile checks, cache upgrade, final polish pass. Remove dead UI paths and redundant CSS only after parity is proven.
9. **Release:** bump semver once for the integrated release (likely next minor, e.g. v2.6.0, **not predetermined**), update every version reference and PWA cache, commit/push **main**, verify GitHub Pages publication and live asset versions, then test the actual deployed app.

**Avoid feature creep:** defer multiplayer, cloud accounts, extra animations, AI-generated explanations, new badges, and unrelated shared-library migrations.

## 9. Test matrix — maths and pedagogy

- 84 yields exactly six unique unordered pairs; 594 yields eight; 748 yields correct complete set; primes yield one pair; perfect squares have one central square pair.
- 3/9 digit sum: 594 → 18; optional 1+8=9; 84 → 12, divisible by 3 not 9.
- 11 test: 594 → 5−9+4=0, **passes**; nonzero multiples of 11 also pass; failed examples do not pass.
- 7: 420÷7=60 via 350+70; 84÷7=12 via 70+14; 85÷7 remainder 1. All displayed equations arithmetically valid.
- Combined rules: 6 = 2 & 3; 12 = 3 & 4; 18 = 2 & 9; guard against combining non-coprime tests incorrectly.
- Transformations: `3×198→6×99` valid; halving odd numbers disallowed; no duplicate/reversed pairs.
- Hint step counter matches actual number of steps; back/forward and drilldown preserve position and question.
- `Show the rule` demonstrates *how*, not “test divisor X”; no false inference from one attempt.
- Assistance evidence attached to appropriate pair; no accidental score changes on help/review.

## 10. Test matrix — user interaction

- iPhone Enter action's bounding rectangle before/after release is unchanged at each reference viewport; **Next Question occupies same rectangle** as Enter in review.
- Fast repeated taps register once per gesture; no missed keys; synthetic clicks do not duplicate submission.
- Empty Enter, incomplete, duplicate, reversed duplicate, incorrect product and correct product all behave as specified.
- Error message readable while keypad visible; all entered values remain editable; no factor slots obscured.
- Many pairs + feedback + long target + landscape: no overlap; review readable when keypad disappears.
- Finish Round and Next Question are not redundant; Next Question remains reachable without scrolling.
- Timed hint pauses/resumes correctly; repeated open/close doesn't add time; focus restored.
- Guided, independent and timed modes remain functional; menu, Learn, Progress, Settings and focus mode work.
- No repeated suggestion nagging; dismiss stays dismissed for cooldown; three-question preset ends cleanly and returns to practice.
- Accessibility: keyboard-only, VoiceOver labels, dialog focus trap/return, 44px-equivalent touch targets, contrast, reduced motion, zoom and large text.

## 11. Persistence and deployment regression tests

- Existing score/round and session histories preserved after upgrade.
- Existing `dol-strategy-history-v1`, `dol-fact-evidence-v1`, `dol-round-tools-v1` and focus/adaptive settings read safely; missing or malformed data fails gracefully.
- Historic technique records without family ID map lazily; **no destructive migration**.
- Export still works and retains historical records.
- PWA precache includes all new modules; old service worker does not serve mixed-version JS/CSS after refresh; offline/online launch works where supported.
- GitHub Actions/Pages build and deployment success checked; live site reports intended version and correct new assets.
- Update README (currently starts at v2.0.0), changelog/dev notes, version footer and manifest/cache where applicable.

## 12. Release acceptance checklist (must be demonstrated, not asserted)

- [ ] Baseline and expanded automated tests pass.
- [ ] Maths examples and all technique families validated.
- [ ] One canonical explanation source; no contradictory duplicate hint/review systems.
- [ ] Practice stays uncluttered; keypad, Enter and Next Question placement **unchanged**.
- [ ] iPhone feedback visible; factor chips readable; no overlay or scroll regression.
- [ ] Progressive help and tappable rule explanation work; clock/assistance correct.
- [ ] Optional interactive review is accurate and does not silently rescore history.
- [ ] Three-question family practice reuses existing engine and never interrupts the round.
- [ ] Existing modes, settings, progress, export, PWA and platform integrations pass.
- [ ] Screenshots checked at representative iPhone/iPad/desktop sizes.
- [ ] `main` pushed, version incremented, live Pages deployment verified and smoke-tested.
- [ ] No high-priority known bugs or placeholder/inert controls.

### Stop condition

If a credential or external service truly blocks a step, identify the **exact** missing permission/action. Otherwise investigate failures and repeat fix → test → deploy → verify. Do not claim the implementation complete until the release checklist is satisfied. If a feature cannot be made reliable without harming practice flow, simplify or defer it explicitly rather than shipping a half-working extra control.
