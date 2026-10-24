# Dol Square Studio v2.10.0 — all squares to 100 and rapid recall

## Entry points

**Play** (including the default Focus layout) offers **⚡ Quick square practice** alongside Start round and Learn squares. One tap opens the rapid drill; no extra launch screen.

**Learn** offers an equally prominent Quick practice action, followed by the existing guided square workshop. The original whole-card link still opens the individual lesson. **Progress** links back to Quick practice and separate due reviews.

The square map covers 1²–100² in six digestible bands: 1–12, 13–20, 21–32, 33–50, 51–75, 76–100. The old supplementary five-question 1–32 factor-game boundary exercise remains available, because Dol's factor targets are still 1–1024. A square course reaching 100² does not imply the factor game supports targets up to 10,000.

### Mental maths methods and patterns
- An anchor, neighbouring odd-number growth and a near-ten expansion for any n from 1 to 100.
- A shortcut for n ending in 5: multiply the tens part by its successor, append 25.
- The explicit *mirror-square* rule for pairs equidistant from 25, 50, 75 or 100: (c+d)²-(c-d)²=4cd, divisible by 100 when c is divisible by 25. For example, 21²=441 and 29²=841.
- Square roots, real area applications and the correct inclusive stopping point for testing factor candidates, including larger targets used only in the mathematics examples.
- A genuine n×n tiling for n≤20; an honest *schematic* for bigger squares rather than constructing up to 10,000 DOM elements.

## Quick-practice controls

1. On Play, tap **⚡ Quick square practice** once. The initial drill is 10 questions drawn from 1–32. The last chosen range (up to 12/20/32/50/75/100) and length (5/10/20) persist locally.
2. A dedicated custom digit keypad is shown on compact touchscreen phones; an optional toggle enables the iOS keyboard. On tablets and desktops, keep typing in the focused input. Press Enter for an immediate check. When the answer has the correct number of digits, it is checked automatically after a short correction window.
3. Correct and quick: a short success indicator appears and the drill moves to the next prompt automatically.
4. Slow (default >4 seconds, adjustable to 3/4/5/6), assisted or incorrect: the answer stops, shows a specific worked method, and continues on Enter or Next. Incorrect facts are repeated at the end of the *same* exercise for recovery, without being incorrectly marked as independently fluent.
5. Blank, skipped and worked examples are not counted as success. The clock is a non-punitive retrieval-latency measure, not a race timer; it pauses when the page is backgrounded.
6. When a session ends, Enter (or the **Another round** button) can start the next 10 due/new questions. If nothing is due, it is deliberately not recycled just to fill the session; learners can choose a wider range.

## Learning evidence and review schedule

Individual outcomes are stored in the *existing* account-scoped Apps Learning SDK as square:N events (not a parallel cloud database), with an elapsed duration, activity and target speed limit. Existing teaching events and factor points remain intact. The existing Apps Learning Sync captures these events to the authenticated account when cloud synchronisation is available.

- **Fast, accurate and unassisted** on a scheduled retrieval: successive intervals 7 / 14 / 30 / 60 / 90 days.
- **Slow but correct** in quick practice: shorter recall interval (1 day for earlier stages, 3 days after repeated successful returns).
- **Incorrect or helped**: repeat for understanding in-session and return for review in 1 day. Correct answers after a missed first attempt remain supported rather than counterfeit independent success.
- **Early repeat**: cannot push out an already scheduled review. Legacy square-course events retain their existing 1 / 3 / 7 / 14 / 30 progression.
- The thresholds are selectable initial educational heuristics, not a validated measure of memory or ability.

## Quality gates

All pure model unit tests must pass, including complete coverage to 100², mirror symmetry, early repeats, slow versus fast retrieval and scheduling. The UI suite must pass in Chromium and WebKit at 320×568, 390×844, 834×1194 and 1194×834 for rapid entry, touch keypad, Enter navigation, guided lessons, 100² schematic, local evidence and score preservation. Verify the tested revision is published and the actual live website exercises pass.

Version metadata, footer/header, URL cache busting and offline PWA cache name must match v2.10.0.
