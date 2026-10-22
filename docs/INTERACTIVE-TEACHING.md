# Interactive teaching - Dol 2.8.0

## Learner entry points

- Play > Hint: board-aware guided calculations, candidate tests, prime-piece grouping, balanced halve-and-double, square-root boundary, and systematic candidate checking.
- Learn > Squares & search limits: explanation, square reference 1-32, anchor and neighbouring-square techniques, and five-question untimed practice in three ranges.
- Progress > Learning steps: separate evidence for divisor choice, partner calculation, regrouping, and squares/search limits. Counts are practice evidence, not a claim of mastery.

## The 595 regression

With 1 x 595, 5 x 119 and 7 x 85 already found, use the actual 5 x 119 pair. Choose 7 as a divisor of 119; calculate 119 - 70 = 49; use 7 x 7 = 49; combine 10 + 7 = 17. Regroup the prime pieces [5,7,17]: selecting 5 and 7 produces 35, leaving 17 as the partner. Do not silently insert the resulting pair on the game board.

The integer boundary is 24 because 24 squared = 576 < 595 < 625 = 25 squared. A factor of 35 is still found as the partner of 17. Exact squares include their root. Enumerating all pairs checks every candidate, including composites; prime-only trial division is a different job.

## Evidence and safety

Opening the help menu does not mark assistance. Actual scaffolds apply to mathematically affected unfinished pairs. A full prime decomposition can support multiple pairs, so it is not incorrectly attributed to just one. Existing score and mistake counters never change during teaching. Blank answers and duplicate valid groupings do not create failed attempts. Guided evidence is labelled guided, even when a step is answered before an additional nudge. Worked examples are not recorded as successful independent answers.

Teaching history uses an account-scoped local key and writes concept events through the existing shared Learning SDK. No shared library is copied or changed. This release does not promise a new cross-device teaching-history merge: the local detailed history follows existing account scoping, and existing learning-sync behaviour remains unchanged.

Timed help resumes only a timer it paused itself. Reset and close release held timing once. Touch controls use native buttons, numeric input modes and keyboard-operable grouping, not drag-only interaction.

## Verification

Pure-model tests cover every target from 1 to 1024, all teaching routes, exact/inexact boundaries, repeated prime tokens, candidate remainders and answer validation. Local isolated Chromium rendering checks cover 320x568, 390x844, 834x1194 and 1194x834. Full CI adds the real app and WebKit, then deploys only the tested revision. Published-interface checks exercise the live hint and square workshop in both browser engines at all four sizes. GitHub Actions results, not this document, are the authoritative release/deployment evidence.
