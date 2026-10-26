# Interactive teaching - Dol 2.10.2 (first implemented in 2.8.0)

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

## Board-aware and quick help (2.10.1)

An accepted pair is never suggested as an undiscovered goal. The model filters every pair of the target number, counts the remaining pairs, and selects different *unsolved* goals for a quick last-digit divisibility shortcut, halve-and-double using a pair on the board, and split-and-regroup using a known pair. The tutor prioritises the small mental moves rather than claiming a proven globally optimal path.

Example: For 990 the six accepted pairs are 1 × 990, 2 × 495, 3 × 330, 6 × 165, 9 × 110 and 22 × 45. Of twelve total pairs the six missing ones are 5 × 198, 10 × 99, 11 × 90, 15 × 66, 18 × 55 and 30 × 33. Suggested paths are:

- Final zero gives 10 as a factor; calculate 990 ÷ 10 = 99, to discover 10 × 99.
- From the accepted 22 × 45, halve 22 and double 45 to discover 11 × 90.
- From the accepted 3 × 330, split 330 into ten groups of 33, then combine 3 × 10 to discover 30 × 33.

The introductory hint lists the progress count and a transferable routine: inspect endings; transform known pairs; split/recombine; check candidates only up to floor(sqrt(target)). It does *not* show the uncompleted answers upfront. Each guided move takes one or two interactive responses and the learner can instead return to the board immediately. Advanced prime-piece grouping and systematic search remain opt-in; mistakes and scoring are never changed by the tutor, and assistance is scoped to still-unfinished pairs.

The candidate picker explicitly acknowledges if a candidate's pair has already been found. A new hint opening regenerates proposed moves from the latest board. Property tests cover 1–1024, and Chromium/WebKit browser regression tests simulate the six-pair 990 scenario and assert that no known pair is marked assisted.

## Two-way regrouping and completion proof (2.10.2)

Some pairs cannot be reached by splitting only the larger factor. With 567 and known 3 × 189, 9 × 63, 21 × 27, the new reverse route asks the learner to divide 21 by 3 (=7) and then multiply 27 by 3 (=81). This produces the previously missing 7 × 81 while preserving the known pairs. The strategy planner now scores both directions of an exact factor move, and a simple 1 × target route covers all other unfinished identity pairs, including primes.

To prove the new suggestion engine does not get stuck, regression tests simulate choosing the first recommendation repeatedly until the board is complete for every integer 1–1024, from an empty board, from the first four accepted pairs, and from every-other accepted pair. This is 3,072 completion cases. The 990 route priorities and non-repetition evidence continue to be tested. UI smoke checks cover 567 and 990 in Chromium and WebKit phone/tablet viewports.
