# Dol Square Numbers Studio — v2.9.0

## Learner journey

A learner can reach the Squares Studio from Play's **Learn square numbers & roots** button (also visible in the default Focus layout), the **Squares through 12²** memory card (the entire card is keyboard and touch interactive), square/root technique cards, Learn's Square Workshop, a relevant in-round Hint, and Progress's square-number panel.

On Learn > **Squares & search limits**, the studio includes:
- Three stages: 1–12, 13–20, 21–32. Every square tile opens its own worked lesson and supports hidden-answer self-testing.
- Memory explanations using 5-ending shortcuts, near-ten expansions, useful anchors, odd-number differences and reversible multiplication facts.
- A visually built n × n square highlighting the new row and column, including the shared corner.
- Why square roots bound the search for factor pairs (inclusive for perfect squares; do not confuse primes-only tests with all factor pairs), including examples and area use cases.
- Untimed guided lesson (five items), mixed exercise (ten items), three-question single-square check, and a **Review due** route covering any due square recall, inverse root, boundary, odd-gap or area skill already attempted.
- Accessible native buttons, forms, status text, keyboard navigation, and responsive 320px–1194px layouts. Animations aren't necessary for learning.

The existing five-question square boundary workshop remains available beneath the new studio for regression compatibility and supplementary practice. Opening help does not mark competence.

## Evidence and spaced retrieval

All attempted answers write to the existing `createLearningStore({appId:'dol'})` domain-neutral Learning SDK. Concepts are explicitly differentiated:
`square:N`, `square-root:N`, `square-boundary:N`, `square-pattern:N` and `square-area:N`.

- One successful retrieval starts a review due in one day.
- Successful returns **after** the due date unlock intervals of 3, 7, 14 and 30 days.
- An early same-day repetition cannot increase the review interval.
- A wrong answer or one using hints is still valuable practice but resets the independent-retention streak. A successful later review is required for the next interval.
- A blank response, a skipped item, or revealing a worked example does not count as successful recall. Missed questions reappear once more within the current exercise as a supported retry; its early retry does not masquerade as spaced retention.
- The schedule is an initial educational heuristic, not an evidence-based assessment of the child. Statuses read **New**, **Practising**, **Review due** and **Retaining**. The Progress panel distinguishes retained squares from attempted ones.

Existing game scores, rounds, history and reset behaviour are unchanged. Detailed teaching evidence remains separate. New answer events use the existing Learning Sync adapter's account/guest identity and capture flow; no shared platform library is copied, and an offline or cloud sync failure cannot prevent local practice. Guest data remains device-local until account import is explicitly approved under the existing policy.

## Acceptance and release gates

- `node --test tests/*.test.mjs`, including `square-learning-model.test.mjs`
- Static syntax checks for both new modules.
- Browser exercises in Chromium and WebKit at 320x568, 390x844, 834x1194 and 1194x834; verify opening from Play, tapping lesson tiles, area diagram, mental methods, roots and boundary exercises, recording evidence, due-date review, no score mutation, no uncaught page errors.
- Existing coach and mobile regression suites remain intact.
- CI must pass before Pages deploys its tested commit, then published interface checks must pass. Separately verify the live version.
- Update both document version markers, URL cache busting and PWA cache name for each release.

## Future enhancement considerations

A future Learning SDK could expose versioned, shared SRS policies and unified per-skill reminders rather than implementing scheduling heuristics in each app. This release deliberately does not change shared platform services or automatically overwrite learning records.
