---
name: parity-testing
description: Build and run reference-parity tests that compare a website clone with a versioned capture of its reference site, covering aria-snapshot structure matching, masked pixel diffs of static chrome, journey replay, per-archetype parity scores, and noise and sensitivity calibration.
---

# Reference Parity Testing

A parity test checks that a clone keeps the structure, layout and behaviour of the
reference site it reproduces. This skill covers capturing the reference, writing the
checks, calibrating them, and scoring them so that the implementation cannot pass by
editing the checks. Copy, logos and brand assets are out of scope; judge information
architecture, layout, components and interactions.

## When to Use

Use when building or auditing a clone of an existing site, when reference captures need
taking or refreshing, or when parity specs and thresholds need calibration. Behaviour
with no reference belongs in acceptance end-to-end tests; parity supplements them.

## Where Parity Sits in the Verification Ladder

Parity is one rung of a ladder. Each rung catches a different class of defect.

| Rung | Check | Written by | When | Effect |
| --- | --- | --- | --- | --- |
| L1 | Build, typecheck, lint, format | Foundations | Every cycle and CI | Blocks merge |
| L2 | Unit and integration tests for the change | Implementer, test first | Every cycle and CI | Blocks merge |
| L3 | Acceptance end-to-end, one per criterion | Test author, before implementation | Affected tests per cycle, all in CI | Blocks merge |
| L4 | Reference parity: aria structure, masked pixel diff of static chrome, journey replay | Recon plus test author | Touched routes per cycle, everything nightly | Blocks merge for touched routes |
| L5 | Budgets: accessibility and performance audits, bundle size, dependency audit, secret scan | Foundations | Nightly and before release | A red nightly opens a stop-the-line issue |
| L6 | Independent evaluation: skeptical reviewer with a calibrated rubric, vision judge, code review, security audit | Separate evaluator | Every cycle | Judged; high and medium findings block |

- Parity blocks merges for touched routes and runs in full nightly, so drift elsewhere
  still surfaces.
- Judged rungs (L6) never replace parity's pass or fail.
- The verifier is the ceiling. Weak parity checks get gamed, so build the checks before
  scaling the implementation. The C compiler work found the verifier had to be nearly
  perfect, with GCC as the oracle. Here the reference site plays that role.

## Compare Against a Versioned Capture

- Compare the clone with a versioned capture of the reference, never with the live site.
  A live reference drifts, and that drift would fail clone builds for reasons the clone
  did not cause.
- Capture each archetype instance chosen during discovery (two or three per archetype)
  at viewport widths 1440, 768 and 390 px: a full-page screenshot, a Playwright aria
  snapshot, computed design tokens, links and meta tags, and the recorded journeys with
  their before and after snapshots.
- Write a manifest beside each capture: source URL, capture date, browser and test tool
  versions, viewport widths, font files, seed values and a content hash per file.
- Only the capture job reaches the reference site. Honour `robots.txt` and rate-limit
  crawling. Recapture on demand through one named command, never during a test run.
  Every recapture is a reviewed baseline change.
- Keep captures, specs, journeys and calibration records on protected paths that
  implementation work may not edit, along with the discovery output that defines the
  archetypes. Enforce this with a CI path check on implementation diffs.

```text
discovery/                 recon output: archetypes, data model, journeys (protected)
tests/parity/specs/        parity specs per archetype (protected)
tests/parity/captures/     versioned reference captures and manifests (protected)
tests/parity/journeys/     replayable journey definitions (protected)
tests/parity/calibration/  noise and sensitivity records (protected)
```

## Deterministic Capture Setup

Capture and clone run under the same setup. Work through this checklist before trusting
any result:

```text
[ ] Viewport widths 1440, 768 and 390 px, same device scale factor on both sides
[ ] Same browser build, OS image and font files for capture and comparison
[ ] Web fonts loaded before any screenshot (document.fonts.ready)
[ ] Animations and transitions disabled for screenshots (animations: 'disabled')
[ ] Caret hidden (caret: 'hide') and pointer parked off interactive elements
[ ] Dynamic regions masked: live clocks, counters, avatars, ads, rotating content
[ ] Seeded data: fixed fixtures, fixed random seed, fixed dates wherever text shows them
[ ] Wait for the data the archetype displays, not a fixed sleep
[ ] Manifest records viewport, browser, font list, seed and capture date
```

Copy-paste setup for one static region:

```ts
import { test, expect } from '@playwright/test';

test('header matches reference at 1440 px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 768 });
  await page.goto('http://localhost:3000/catalogue');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(-1, -1);
  await expect(page.locator('header')).toHaveScreenshot('header-1440.png', {
    animations: 'disabled',
    caret: 'hide',
    mask: [page.getByTestId('cart-count')],
    threshold: 0.2,
  });
});
```

Store each region's baseline as its stored capture under `tests/parity/captures/`.

## Aria-Snapshot Structure Matching

This is the main verified signal. An aria snapshot records roles, names, heading levels
and children. Structure survives content changes that break text comparisons, so match
each archetype by role and structure rather than visible text.

Template for a catalogue-list archetype, in Playwright's YAML syntax:

```yaml
- banner:
  - link /.+/
  - navigation /Main|Site/:
    - /children: equal
    - link /.+/
    - link /.+/
    - link /.+/
- main:
  - heading /.+/ [level=1]
  - button /.+/
  - list:
    - /children: contain
    - listitem:
      - link /.+/
```

Match each region through its own locator, so a template covers only the region that
discovery assigned to it. The template lives in a protected `.aria.yml` file:

```ts
await expect(page.getByRole('main')).toMatchAriaSnapshot({
  name: 'catalogue-list.main.aria.yml',
});
```

Rules for templates:

- Use regular expressions for content-bearing names (`/.+/`, `/\d+ results/`). Use exact
  names only for fixed chrome labels such as landmarks and form controls, never for copy.
- Pick the children mode by region. `contain` (the default) suits lists that may hold
  extra items, `equal` suits fixed slots such as primary navigation, and `deep-equal`
  suits only small fixed components. Set a repository default with
  `expect.toMatchAriaSnapshot.children`.
- Derive templates from the reference capture and review them. Never generate one from
  the clone, which would copy the implementation into the oracle.
- Playwright is one implementation. Any accessibility-tree dump can follow the same
  rules: role and name patterns, ordered children, explicit children modes.

## Pixel Diff of Static Chrome Only

Compare pixels only for chrome that should not change with content: the header, primary
navigation, footer and layout grid. Do not diff article bodies, live data cards, charts,
avatars or ad slots; aria structure covers those.

Mask dynamic content inside chrome (cart count, signed-in name, live banner) through the
`mask` option. Set a threshold per region. Playwright's per-pixel `threshold` defaults to
0.2, and the allowed differing share is `maxDiffPixelRatio` or `maxDiffPixels`. The values
below are examples; calibration sets the real ones.

| Region | Scope | Masked | `threshold` | Max differing pixel ratio |
| --- | --- | --- | --- | --- |
| Header | `header` | cart count, account name | 0.2 | 0.002 |
| Primary navigation | navigation named Main | none | 0.2 | 0.001 |
| Footer | `footer` | none | 0.2 | 0.001 |
| Layout grid | first viewport, content regions | all content regions | 0.2 | 0.002 |

A vision judge may rate the overall look of a clone against its capture. Report the
rating and its reasons as judged evidence. It is never the pass or fail signal.

## Journey Replay

Discovery records only safe journeys: navigate, tab, sort, filter, paginate, open a modal
and hover. Forms are never submitted and sign-in is never attempted. The reference
capture holds the aria snapshot before and after each step.

Replay each journey on the clone and compare structure at every step:

1. Load the clone in a fresh browser context with the setup above.
2. Record the target region's aria snapshot, run the step, and record it again. Select
   targets by role and name pattern, never by CSS class.
3. Pass the step when both snapshots match the reference's recorded snapshots and the
   change between them has the same structure. For example, list order changed while the
   item count stayed equal.

```yaml
journey: catalogue-sort-then-filter
archetype: catalogue-list
steps:
  - id: sort
    action: click
    target: { role: button, name: /Sort|Order/ }
  - id: open-filters
    action: click
    target: { role: button, name: /Filter/ }
```

Hover steps compare only what they reveal. A failed step emits one `ERROR` line naming
the journey and step.

## Parity Score per Archetype

A parity check is one aria template match, one pixel region comparison, or one journey
step. Score each archetype separately:

```text
archetype score = passing checks / all checks in that archetype
```

Project target example:

```text
overall score       >= 95%   passing checks / all checks, every archetype
per-archetype score >= 90%   each archetype on its own
```

Both gates apply, because a large passing archetype can hide a failing one inside the
overall number. Report misses by archetype, with the failing check ids:

| Archetype | Score | Misses | Failing check ids |
| --- | --- | --- | --- |
| catalogue-list | 96.0% | 1 of 25 | `catalogue-list.nav.links` |
| product-detail | 88.0% | 3 of 25 | `product-detail.main.heading`, `product-detail.journey.sort`, `product-detail.header.pixels` |
| account-settings | 100.0% | 0 of 25 | none |
| **Overall** | **94.7%** | **4 of 75** | misses the 95% target |

## Calibration: Noise and Sensitivity

Calibrate before trusting any score. Noise: the reference compared with a fresh capture of
itself passes identically on every run. Sensitivity: a deliberately changed page fails the
check it targets. The run counts below are starting defaults for this procedure, not
figures from the sources; adjust them with evidence.

1. **Noise runs.** For each archetype instance, take a fresh capture of the reference ten
   times in the calibration environment and compare each one with the stored capture.
   Record each check's result per run and the largest pixel ratio per region.
2. **Set thresholds** above each region's largest noise value, with a recorded margin
   (default: twice that value). Aria checks have no threshold: an aria failure in any
   noise run is a noise source to fix, not a number to raise.
3. **Remove noise at its source.** If any noise run fails, find the cause (a font that
   loads late, a data value, an animation, a timestamp) and fix it with the setup
   checklist or a mask.
4. **Sensitivity runs.** Create a fault-injected copy of the clone in a scratch location,
   one fault per case, never in the shipped clone. Default fault set:
   - remove one primary navigation link (aria)
   - change one heading from level 1 to level 2 (aria)
   - move the footer above the main region (pixel and aria)
   - change the header background colour (pixel)
   - remove a clickable target that a journey depends on (journey)

   Run each fault three times. Each must fail its intended check on all three runs.
5. **Record** to `tests/parity/calibration/`: environment (OS, browser, runner, fonts,
   viewports, seed), noise results per check, largest noise value per region, thresholds
   with margin, each seeded fault and the check that caught it, and the reviewer.
6. **Re-calibrate** after changes to fonts, seed data, viewports, browser, OS image or the
   capture method. Re-calibration is a reviewed change to the record.

## Output Hygiene

- Print one summary line, then one `ERROR <id> <reason>` line per failing check, each
  reason on one line. Full logs (aria diffs, pixel diff images, journey traces, the run
  manifest) go to a per-run directory, never to the console.
- Iterate with `--fast`, a seeded sample of one instance per archetype plus every route
  the change touches. Run the full suite at the gate: nightly, and for merges that touch
  parity routes. Only full-suite scores count toward targets.
- Exit non-zero on any failing or skipped check.

```text
parity: overall 94.7% (71/75), target 95%; below 90%: product-detail 88.0%
ERROR product-detail.main.heading expected heading level 1, got level 2
ERROR product-detail.header.pixels header ratio 0.0041 above max 0.0020, cart count not masked
```

## Anti-Gaming Rules

- The builder never edits parity specs, captures, masks, thresholds, journey files or
  calibration records. A CI path check enforces this on every implementation diff.
- A changed baseline is its own reviewed change, with the reason, the before and after
  images or snapshots, and a reviewer who did not write the implementation.
- Never loosen a threshold, add a mask or drop a check to turn a run green. A mask is
  allowed only for content the reference itself varies, recorded in the manifest with
  its reason.
- Never regenerate an aria template from the clone. Templates come from the reference.
- Explain each failure with evidence as a clone defect, reference drift or harness noise.
  Reference drift triggers a separate recapture change; harness noise triggers calibration.
- A skipped check counts as failing until restored. A check weakened to pass is a
  regression of the verifier, not progress on the clone.

## Grounded in

Discovery and calibration steps derive from the repository's parity design study under
`research/`, the provenance record; this skill does not require loading it. Key sources:

- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps): a separate evaluator uses Playwright, hard thresholds and a calibrated rubric, since self-evaluation is lenient.
- Anthropic, [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler): the verifier must be nearly perfect, GCC served as the oracle, output is kept short and logged to files, and a sampled `--fast` suite runs during iteration.
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): browser checks run as a user would, and agents may only flip a pass flag in the feature list, which is kept as JSON because models rewrite it less often.
- Playwright, [Aria snapshots](https://playwright.dev/docs/aria-snapshots): template syntax, regular expression names, children matching modes.
- Playwright, [Visual comparisons](https://playwright.dev/docs/test-snapshots): thresholds, style overrides, environment consistency, baseline updates.
- Playwright, [PageAssertions API](https://playwright.dev/docs/api/class-pageassertions): the `mask`, `animations`, `caret` and `maxDiffPixelRatio` options.
