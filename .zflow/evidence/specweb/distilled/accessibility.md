# Accessibility — distilled audit requirements

Distilled from the 30 accessibility pages of specification.website (`.zflow/evidence/specweb/accessibility/`).
Each block states one checkable practice, the exact source line it comes from, how a read-only
auditor verifies it on a live consumer-facing site, and a suggested severity.

---

## A1. Body text contrast meets WCAG AA minimum
- **Requirement:** Body text must contrast at least 4.5:1 against its background, and large text (18pt, or 14pt bold) at least 3:1.
- **Quote:** - **1.4.3 Contrast (Minimum) — AA.** Body text needs at least **4.5:1**. Large text (18pt, or 14pt bold) needs **3:1**.
- **Source:** .zflow/evidence/specweb/accessibility/color-contrast.md
- **Verify:** Run axe DevTools or Lighthouse accessibility audit on every key template (home, product, pricing, checkout) and review `color-contrast` failures; spot-check reported pairs (especially text over gradients/images) with a contrast checker.
- **Severity:** high

## A2. Non-text UI elements meet 3:1 contrast
- **Requirement:** Meaningful UI components (input borders, focus rings, icon-only buttons) and graphics needed to understand content must contrast at least 3:1 against adjacent colours.
- **Quote:** - **1.4.11 Non-text Contrast — AA.** Meaningful UI components (input borders, focus rings, icon-only buttons) and graphics needed to understand the content need at least **3:1** against adjacent colours.
- **Source:** .zflow/evidence/specweb/accessibility/color-contrast.md
- **Verify:** axe DevTools `non-text-contrast` rule on interactive components; manually sample icon-only-button glyph vs button fill with a contrast checker (automation misses gradients).
- **Severity:** medium

## A3. Enhanced (AAA) contrast targets
- **Requirement:** Enhanced contrast aims for 7:1 on body text and 4.5:1 on large text.
- **Quote:** - **1.4.6 Contrast (Enhanced) — AAA.** Body text **7:1**, large text **4.5:1**.
- **Source:** .zflow/evidence/specweb/accessibility/color-contrast.md
- **Verify:** Check muted/body text design tokens with a WCAG contrast checker against the shipped backgrounds; report as enhancement, not conformance floor.
- **Severity:** low

## A4. Text over images keeps contrast
- **Requirement:** Text laid over busy images or gradients must keep required contrast via a scrim or solid block behind it.
- **Quote:** - Text laid over a busy image with no scrim or solid block behind it.
- **Source:** .zflow/evidence/specweb/accessibility/color-contrast.md
- **Verify:** Screenshot hero/banner sections and sample foreground text against the lightest and darkest background areas under it with a contrast checker; axe misses text-on-image cases, so spot-check by hand.
- **Severity:** medium

## A5. contrast-color() ships with a fallback colour
- **Requirement:** If the CSS `contrast-color()` function is used, a plain `color` declaration must come first so unsupported browsers still get legible text.
- **Quote:** - **Shipping it with no fallback.** Without a plain `color` declaration first, older browsers fall back to the default text colour, which may be illegible on your background.
- **Source:** .zflow/evidence/specweb/accessibility/contrast-color.md
- **Verify:** `curl -s <site-css-url> | grep -n -B3 'contrast-color('` — confirm a plain color declaration or `@supports` guard precedes each use.
- **Severity:** low

## A6. contrast-color() result verified on mid-tone backgrounds
- **Requirement:** Because `contrast-color()` only returns black or white, its result must be verified to meet 4.5:1 against the actual shipped background, especially mid-tones.
- **Quote:** - **Mid-tone backgrounds.** Against a mid-tone such as a royal blue (`#2277d3`), neither black nor white reliably clears AA for small text. The function still returns one of them; it does not guarantee a readable pair. Keep input colours light or dark, or verify the result.
- **Source:** .zflow/evidence/specweb/accessibility/contrast-color.md
- **Verify:** Inspect the computed `color` in DevTools on elements using it and check the pair with a contrast checker; toggle dark mode / change the dynamic colour and re-check.
- **Severity:** low

## A7. Forced-colours mode restores lost boundaries
- **Requirement:** Under `@media (forced-colors: active)`, controls or containers whose boundary relied on `box-shadow` or background colour alone must regain a visible `border` or `outline`.
- **Quote:** - **Restore lost boundaries.** Where a control or container was defined by `box-shadow` or background colour alone, add a `border` or `outline` inside `@media (forced-colors: active)`.
- **Source:** .zflow/evidence/specweb/accessibility/forced-colors.md
- **Verify:** Chrome/Edge DevTools → Rendering panel → "Emulate CSS media feature forced-colors: active", reload; every control and container must keep a visible boundary. Also `curl -s <css> | grep 'forced-colors: active'` to confirm the site ships forced-colours-aware styles.
- **Severity:** medium

## A8. No state signalled by colour alone (forced-colours safe)
- **Requirement:** State (selected, error, disabled) must not be conveyed by colour alone; it needs a border, icon, or text fallback that survives forced colours.
- **Quote:** - Conveying state (selected, error, disabled) through colour that forced mode discards, with no border, icon, or text fallback.
- **Source:** .zflow/evidence/specweb/accessibility/forced-colors.md
- **Verify:** With forced-colors emulated (DevTools Rendering panel), confirm each state carries a non-colour cue; grayscale screenshot of error/selected states as a second check.
- **Severity:** medium

## A9. Every img has an alt attribute
- **Requirement:** Every `<img>` element must have an `alt` attribute, with the value chosen by the image's role on the page.
- **Quote:** The `alt` attribute on `<img>` provides a text alternative for an image. Screen readers announce it, browsers display it when the image fails to load, and crawlers use it to understand the content. An `alt` is required on every `<img>`; the *value* depends on what the image does on the page.
- **Source:** .zflow/evidence/specweb/accessibility/image-alt-text.md
- **Verify:** `curl -s <page> | grep -o '<img[^>]*>' | grep -v 'alt='` — any output is a failure; axe `image-alt` rule on every template.
- **Severity:** high

## A10. Decorative images use empty alt
- **Requirement:** Purely decorative images must use `alt=""` so assistive tech skips them.
- **Quote:** **Decorative images** — purely visual, add no information. Use an empty alt so assistive tech skips them.
- **Source:** .zflow/evidence/specweb/accessibility/image-alt-text.md
- **Verify:** Screen-reader pass (decorative images should be silent); review decorative flourishes in source for `alt=""` rather than descriptive text that interrupts reading flow.
- **Severity:** low

## A11. Functional image alt describes the action
- **Requirement:** Images acting as links or buttons must have alt text describing the action, not the picture.
- **Quote:** **Functional images** — act as a link or button. Describe the action, not the picture.
- **Source:** .zflow/evidence/specweb/accessibility/image-alt-text.md
- **Verify:** `curl -s <page> | grep -oE '<a [^>]*>\s*<img[^>]*>'` and read each alt; axe `link-name` rule flags image links with no useful name.
- **Severity:** high

## A12. Alt text avoids "image of" and file names
- **Requirement:** Alt text must not say "image of"/"photo of" and must not use the file name.
- **Quote:** - **Don't say "image of"** or "photo of". The screen reader already announces "graphic".
- **Source:** .zflow/evidence/specweb/accessibility/image-alt-text.md
- **Verify:** `curl -s <page> | grep -o 'alt="[^"]*"' | grep -iE 'image of|photo of|DSC_|\.jpg|\.png|\.svg'` — any hit is a fail.
- **Severity:** low

## A13. Every form control has an associated label
- **Requirement:** Every form control needs a programmatically associated label (`<label for/id>`, wrapping label, or `aria-label`/`aria-labelledby` as last resort); a placeholder is not a label.
- **Quote:** > Every form control needs a programmatically associated label. A placeholder is not a label, and an unlabelled input is unusable for screen-reader and voice-control users.
- **Source:** .zflow/evidence/specweb/accessibility/form-labels.md
- **Verify:** Run axe on the newsletter, contact, search, and checkout forms (`label` rule flags missing associations); `curl -s <form> | grep -o '<input[^>]*>'` and confirm each has a matching label id or aria-label. Inspect the browser accessibility panel — "Name" must be set.
- **Severity:** high

## A14. Checkbox/radio groups are named
- **Requirement:** Every checkbox and radio button needs its own label, and the group needs a name from `<fieldset>`/`<legend>` or `role="group"` with `aria-labelledby`.
- **Quote:** - **Every checkbox and radio button** needs its own label, and the group needs a name from `<fieldset>`/`<legend>` or `role="group"` with `aria-labelledby`.
- **Source:** .zflow/evidence/specweb/accessibility/form-labels.md
- **Verify:** View source of any radio/checkbox group (newsletter preferences, checkout options) for fieldset/legend or role="group" + aria-labelledby around it.
- **Severity:** medium

## A15. Required fields state so in text
- **Requirement:** Required fields must say so in the label or instructions, not only with an asterisk and colour.
- **Quote:** - **Required fields** should say so in the label (or in instructions), not only with an asterisk and colour.
- **Source:** .zflow/evidence/specweb/accessibility/form-labels.md
- **Verify:** Inspect required inputs' labels for a text cue (e.g. "required") beyond `*`; screen-reader pass announces requiredness.
- **Severity:** low

## A16. Full keyboard operability, no traps
- **Requirement:** Every interactive element must be reachable and operable with the keyboard alone (Tab/Shift+Tab, Enter/Space, arrows, Escape), in logical order, with no focus traps.
- **Quote:** > Every interactive element on the page must be reachable and operable with a keyboard alone, in a logical order, with no traps that hold focus.
- **Source:** .zflow/evidence/specweb/accessibility/keyboard-navigation.md
- **Verify:** Unplug the mouse and walk every interactive feature on each template; open every dialog, menu, and dropdown and press Escape/Tab to confirm focus is managed and never trapped.
- **Severity:** high

## A17. No positive tabindex
- **Requirement:** Positive `tabindex` values must never be used.
- **Quote:** - **Never use positive `tabindex`** — it overrides DOM order and creates surprises.
- **Source:** .zflow/evidence/specweb/accessibility/keyboard-navigation.md
- **Verify:** `curl -s <page> | grep -oE 'tabindex="[1-9][0-9]*"'` — any hit fails.
- **Severity:** medium

## A18. Focus managed on view changes
- **Requirement:** When a dialog opens, focus moves into it and is trapped until close, then returns to the opener; SPA navigations move focus to the new view's main heading.
- **Quote:** Manage focus on view changes. When a dialog opens, move focus into it and trap it inside until it closes; then return focus to the element that opened it. Single-page navigations should move focus to the main heading of the new view.
- **Source:** .zflow/evidence/specweb/accessibility/keyboard-navigation.md
- **Verify:** Keyboard-only walkthrough of modal flows (newsletter modal, cookie settings, cart drawer) watching `document.activeElement` in the DevTools console at each step.
- **Severity:** medium

## A19. Visible focus indicator always
- **Requirement:** Keyboard focus must show a clear visible indicator; `outline: none` with no replacement is a failure.
- **Quote:** > Whenever a control receives keyboard focus, the page must show a clear, high-contrast indicator. Removing focus outlines without a replacement is a top accessibility failure.
- **Source:** .zflow/evidence/specweb/accessibility/focus-indicators.md
- **Verify:** Tab through every page template and confirm the focused control is obvious; `curl -s <css> | grep -nE 'outline:\s*(none|0)'` — each hit needs a matching replacement `:focus-visible` rule.
- **Severity:** high

## A20. Focus indicator contrast ≥ 3:1
- **Requirement:** The focus indicator must contrast at least 3:1 against adjacent colours, both focused and unfocused.
- **Quote:** - **Contrast at least 3:1** against the adjacent colour, both focused and unfocused (1.4.11).
- **Source:** .zflow/evidence/specweb/accessibility/focus-indicators.md
- **Verify:** Focus a control, sample the ring colour vs its surroundings with a contrast checker; two-tone rings pass on any background.
- **Severity:** medium

## A21. Focus indicator ≥ 2px thick with offset
- **Requirement:** The focus indicator must be at least 2 CSS pixels thick and offset away from the control so it does not disappear into the border.
- **Quote:** - **At least 2 CSS pixels thick** to meet 2.4.13's enclosed-area minimum.
- **Source:** .zflow/evidence/specweb/accessibility/focus-indicators.md
- **Verify:** Inspect computed `outline-width`/`outline-offset` in DevTools on focused elements across templates.
- **Severity:** low

## A22. Focused control not hidden behind sticky content
- **Requirement:** A focused control must never be entirely hidden behind author-created sticky content (sticky header/footer, cookie banner, chat widget).
- **Quote:** > A focused control must not be hidden behind a sticky header, cookie banner, or chat widget. WCAG 2.2 added this as a separate criterion because a perfect focus ring is worthless if something is sitting on top of it.
- **Source:** .zflow/evidence/specweb/accessibility/focus-not-obscured.md
- **Verify:** Tab every template top-to-bottom watching the focus ring the whole way — desktop, narrow viewport, 200% zoom, and with the cookie banner showing; scroll to mid-page first, where failures cluster. Purely visual check; no tooling does it.
- **Severity:** high

## A23. scroll-padding reserves the sticky-header strip
- **Requirement:** With a sticky header, the scroll container must set `scroll-padding-top` matching the header height (plus `scroll-padding-bottom` for sticky footers) so focus scrolling never stops under the header.
- **Quote:** **Reserve the sticky area in the scroll container.** When focus moves off-screen, the browser scrolls the element into view — and by default it stops as soon as the element touches the viewport edge, which is exactly where your sticky header lives. `scroll-padding-top` on the scrolling element tells the browser to treat that strip as unusable:
- **Source:** .zflow/evidence/specweb/accessibility/focus-not-obscured.md
- **Verify:** DevTools computed `scroll-padding-top` on `html`/root when the site has a sticky header; `curl -s <css> | grep -n 'scroll-padding'` confirms it ships.
- **Severity:** medium

## A24. Cookie banners modal or out of the way
- **Requirement:** A non-modal sticky cookie banner must either be made a true modal (focus trapped, rest inert) or not overlap focusable content.
- **Quote:** **Make banners modal or make them get out of the way.** A cookie banner that is non-modal and sticky is the canonical failure: focus can travel to the content behind it and end up underneath it. Either make it a true modal — trap focus inside it, and mark the rest [`inert`](/spec/accessibility/inert-attribute/) so focus cannot reach the obscured content in the first place — or ensure it does not overlap focusable content. See [cookie consent](/spec/privacy/cookie-consent/).
- **Source:** .zflow/evidence/specweb/accessibility/focus-not-obscured.md
- **Verify:** Fresh visit with the banner shown, then Tab — focus must never land on content hidden beneath the banner.
- **Severity:** medium

## A25. Skip link is the first focusable element
- **Requirement:** A 'skip to main content' link must be the first focusable element on every page template, targeting the main content container.
- **Quote:** > A 'skip to main content' link as the first focusable element lets keyboard and screen-reader users jump past repeated navigation on every page.
- **Source:** .zflow/evidence/specweb/accessibility/skip-links.md
- **Verify:** Load the page, press Tab once — the skip link must appear; `curl -s <page> | grep -i 'skip.to'` and confirm the target id exists. Check every template, not only the homepage.
- **Severity:** high

## A26. Skip link moves focus into main
- **Requirement:** The skip link must become visible on focus (offscreen positioning, not `display: none`) and actually move focus into `<main>` via `tabindex="-1"`.
- **Quote:** - **`tabindex="-1"`** on `<main>` ensures focus actually moves to it when the link is followed; some browsers otherwise just scroll the page.
- **Source:** .zflow/evidence/specweb/accessibility/skip-links.md
- **Verify:** Press Enter on the skip link and check `document.activeElement` in the DevTools console is the main element, not just a scroll; view source for `display: none` on the skip link (a fail).
- **Severity:** medium

## A27. Background content inert while overlay open
- **Requirement:** While an overlay (modal, slide-out menu, off-canvas panel) is open, background content must be unreachable — marked `inert`, not merely dimmed.
- **Quote:** > When an overlay is open, the content behind it should be unreachable — not just dimmed. The inert attribute removes a subtree from tab order and the accessibility tree at once, replacing fragile focus-trap JavaScript.
- **Source:** .zflow/evidence/specweb/accessibility/inert-attribute.md
- **Verify:** Open each overlay and press Tab repeatedly — focus must cycle only within the active region and never reach a background control; with a screen reader, background landmarks should not be announced.
- **Severity:** medium

## A28. aria-hidden alone not used for background content
- **Requirement:** Background content behind an overlay must not rely on `aria-hidden` alone (leaves elements focusable), and `inert` must be removed when the overlay closes.
- **Quote:** - Using `aria-hidden` alone for background content — it hides from screen readers but leaves elements focusable, so keyboard focus still escapes.
- **Source:** .zflow/evidence/specweb/accessibility/inert-attribute.md
- **Verify:** Close each overlay and Tab through the page to confirm the background is interactive again (no stranded inert); inspect open-state DOM for inert on the background rather than aria-hidden-only.
- **Severity:** medium

## A29. Exactly one main landmark per page
- **Requirement:** The page must use landmark elements with exactly one `<main>` per page.
- **Quote:** - **Exactly one `<main>` per page.** Two mains break the landmark list.
- **Source:** .zflow/evidence/specweb/accessibility/semantic-html.md
- **Verify:** `curl -s <page> | grep -c '<main'` — must equal 1; axe region/landmark rules flag pages with no main.
- **Severity:** high

## A30. Duplicate landmarks named
- **Requirement:** Duplicate landmarks (e.g. two `<nav>` blocks) must each be named with `aria-label` or `aria-labelledby`.
- **Quote:** - **Name every duplicate landmark** with `aria-label` or `aria-labelledby`. A page with two `<nav>` blocks needs each one named ("Primary", "Footer", "In page").
- **Source:** .zflow/evidence/specweb/accessibility/semantic-html.md
- **Verify:** `curl -s <page> | grep -o '<nav[^>]*>'` — every nav beyond the first must carry a name; the devtools accessibility-tree landmark list should show distinct names.
- **Severity:** medium

## A31. Heading outline without skipped levels
- **Requirement:** Headings must form an outline: one `<h1>`, `<h2>` for sections, `<h3>` for sub-sections, with no skipped levels.
- **Quote:** - **Headings form an outline.** Use one `<h1>`, then `<h2>` for sections, `<h3>` for sub-sections. Do not skip levels.
- **Source:** .zflow/evidence/specweb/accessibility/semantic-html.md
- **Verify:** axe `heading-order` rule, or `curl -s <page> | grep -o '<h[1-6]'` and check the sequence never jumps a level.
- **Severity:** medium

## A32. Lists use real list markup
- **Requirement:** Navigation and other list-like content must use real `<ul>`/`<ol>` markup.
- **Quote:** - **Lists are lists.** Wrap navigation items in `<ul>`; screen readers announce "list, six items".
- **Source:** .zflow/evidence/specweb/accessibility/semantic-html.md
- **Verify:** View nav/footer source for `ul`/`li` structure rather than bare divs/spans.
- **Severity:** low

## A33. Native HTML before ARIA
- **Requirement:** Reach for native HTML elements first; add ARIA only when nothing native fits (first rule of ARIA).
- **Quote:** > ARIA can make custom widgets accessible, but the first rule of ARIA is don't use ARIA. Reach for a native HTML element first; add ARIA only when nothing native fits.
- **Source:** .zflow/evidence/specweb/accessibility/aria-usage.md
- **Verify:** `curl -s <page> | grep -oE '<(div|span)[^>]*role="(button|link|checkbox|tab)"'` — each hit is a candidate that should have been a native element; axe flags redundant/misused roles.
- **Severity:** medium

## A34. Interactive ARIA controls keyboard-operable
- **Requirement:** All interactive ARIA controls must be keyboard-operable — a `role="button"` div without Space/Enter handlers is broken.
- **Quote:** 3. **All interactive ARIA controls must be keyboard-operable.** A `role="button"` div without Space/Enter handlers is broken.
- **Source:** .zflow/evidence/specweb/accessibility/aria-usage.md
- **Verify:** For every element carrying `role="button"` (or similar), focus it with Tab and activate with Enter and Space; both must work.
- **Severity:** high

## A35. No aria-hidden/presentation on focusable elements
- **Requirement:** `role="presentation"` and `aria-hidden="true"` must never be set on focusable elements.
- **Quote:** 4. **Don't set `role="presentation"` or `aria-hidden="true"` on focusable elements.** You will hide controls from the very users who need them.
- **Source:** .zflow/evidence/specweb/accessibility/aria-usage.md
- **Verify:** axe `aria-hidden-focus` rule; or DOM query for `[aria-hidden="true"]` subtrees containing links/buttons/inputs.
- **Severity:** high

## A36. ARIA states updated by script
- **Requirement:** ARIA states (`aria-expanded`, `aria-checked`) must be updated when the UI changes.
- **Quote:** - ARIA states (`aria-expanded`, `aria-checked`) never updated by JavaScript when the UI changes.
- **Source:** .zflow/evidence/specweb/accessibility/aria-usage.md
- **Verify:** Toggle each disclosure/menu/toggle button and inspect its `aria-expanded`/`aria-pressed` in DevTools before and after — it must match the visual state.
- **Severity:** medium

## A37. Native semantics not overridden
- **Requirement:** Native element semantics must not be overridden with ARIA roles (e.g. `<h1 role="button">`).
- **Quote:** 2. **Don't change native semantics.** Never write `<h1 role="button">`. If you need a button, use a `<button>`.
- **Source:** .zflow/evidence/specweb/accessibility/aria-usage.md
- **Verify:** `curl -s <page> | grep -oE '<(h[1-6]|nav|button|ul|table)[^>]*role='` — hits are suspect; check against the ARIA-in-HTML element table.
- **Severity:** medium

## A38. Link text describes destination
- **Requirement:** Every link's visible or accessible text must describe where it goes; "click here", "read more", "learn more" without context fail.
- **Quote:** > Every link's text must describe where it goes. 'Click here' and 'read more' fail screen-reader users who scan a page by jumping from link to link.
- **Source:** .zflow/evidence/specweb/accessibility/link-text.md
- **Verify:** `curl -s <page> | grep -oiE '>(click here|read more|learn more|here)<'` — generic anchors are fails; screen-reader link-list shortcut should show entries that make sense out of context.
- **Severity:** high

## A39. Repeated card links get unique accessible names
- **Requirement:** Repeated "Read more" links in card lists must each get a unique accessible name (e.g. via the card heading).
- **Quote:** For repeated "Read more" patterns on a card list, give each link a unique accessible name — the card heading is the easiest source:
- **Source:** .zflow/evidence/specweb/accessibility/link-text.md
- **Verify:** Open the accessibility tree or a link list on a card grid; identical names pointing at different destinations are fails. Two links with the same text to different destinations is also a fail.
- **Severity:** medium

## A40. Download links indicate file type
- **Requirement:** Links to files must indicate file type (and size when relevant), e.g. "Annual report (PDF, 2.4 MB)".
- **Quote:** - **Indicate file type and language changes** when relevant: "Annual report (PDF, 2.4 MB)".
- **Source:** .zflow/evidence/specweb/accessibility/link-text.md
- **Verify:** `curl -s <page> | grep -oE '<a [^>]*href="[^"]*\.(pdf|docx?|zip|xlsx?)"[^>]*>[^<]*'` — link text should name the format.
- **Severity:** low

## A41. Every link and button has an accessible name
- **Requirement:** Every link and button must have an accessible name; icon-only controls need `aria-label` or visible text.
- **Quote:** > A link or button with no accessible name is invisible to screen readers and unreachable for voice control. Icon-only controls without a label are the usual culprit.
- **Source:** .zflow/evidence/specweb/accessibility/empty-links-buttons.md
- **Verify:** axe `button-name` and `link-name` rules on every template (high-confidence findings); inspect icon-only controls in the browser accessibility panel — Name must be populated.
- **Severity:** high

## A42. title attribute is not sufficient labelling
- **Requirement:** A `title` attribute alone must not be the accessible name of a control; use `aria-label` or visible text.
- **Quote:** **Tooltip-only labelling is not enough.** A `title` attribute does not produce a reliable accessible name in every browser and assistive tech combination. Use `aria-label` or visible text instead.
- **Source:** .zflow/evidence/specweb/accessibility/empty-links-buttons.md
- **Verify:** `curl -s <page> | grep -oE '<(button|a )[^>]*title="[^"]*"[^>]*>'` and check each hit also has text content or aria-label.
- **Severity:** medium

## A43. Decorative SVGs inside buttons aria-hidden
- **Requirement:** Decorative SVG icons inside labelled buttons must be `aria-hidden="true"` and `focusable="false"` so they are not double-announced.
- **Quote:** - Mark the SVG inside the button `aria-hidden="true"` and `focusable="false"` so the icon is not double-announced.
- **Source:** .zflow/evidence/specweb/accessibility/empty-links-buttons.md
- **Verify:** Inspect icon-button markup: `<svg aria-hidden="true" focusable="false">` inside the button.
- **Severity:** low

## A44. Form errors identified in text
- **Requirement:** Submission errors must be identified in text — which field, what is wrong — never just a red border.
- **Quote:** - **Identify the error in text.** "Email is required" — not just a red border.
- **Source:** .zflow/evidence/specweb/accessibility/form-errors.md
- **Verify:** Submit each public form (contact, checkout, signup) with deliberately bad data and read the rendered errors; test in grayscale to confirm the error state is visible without colour.
- **Severity:** high

## A45. Errors associated via aria-invalid/aria-describedby
- **Requirement:** Error messages must be associated with their input using `aria-describedby`, and the field marked `aria-invalid="true"` (removed when corrected).
- **Quote:** - **Set `aria-invalid="true"`** on the field — and remove it when the user corrects the value.
- **Source:** .zflow/evidence/specweb/accessibility/form-errors.md
- **Verify:** After a failed submit, inspect each invalid input: `aria-invalid="true"` present and `aria-describedby` points at the error node's id; tabbing to the field with a screen reader reads the error with the label.
- **Severity:** medium

## A46. Dynamic errors announced
- **Requirement:** Dynamically inserted errors must be announced via `role="alert"` or an `aria-live` region that exists before the message.
- **Quote:** - **Announce dynamically inserted errors.** Use `role="alert"` (assertive) or a live region (`aria-live="polite"`) so screen readers hear the change — see [status messages](/spec/accessibility/status-messages/) for the mechanics.
- **Source:** .zflow/evidence/specweb/accessibility/form-errors.md
- **Verify:** With a screen reader running, submit bad data and confirm the error is spoken without hunting for it; DOM contains the alert/live region before the message appears.
- **Severity:** medium

## A47. Error copy explains the fix
- **Requirement:** Error messages must tell the user how to fix the problem, not just "Invalid input".
- **Quote:** - **Tell the user how to fix it.** "Enter a date in the format DD/MM/YYYY", not "Invalid date".
- **Source:** .zflow/evidence/specweb/accessibility/form-errors.md
- **Verify:** Read the rendered error copy on failed submissions of public forms; generic one-word errors fail.
- **Severity:** medium

## A48. Errors not colour-only
- **Requirement:** Error signalling must not rely on colour alone — pair red with an icon, a word ("Error"), or a heavier border.
- **Quote:** - **Don't rely on colour alone.** Pair red with an icon, a word ("Error"), or a heavier border.
- **Source:** .zflow/evidence/specweb/accessibility/form-errors.md
- **Verify:** Grayscale screenshot of the errored form — invalid fields must be identifiable without colour.
- **Severity:** medium

## A49. Status changes exposed via live regions
- **Requirement:** Outcomes that do not move focus (result counts, "saved", "added to basket", upload progress) must be exposed through a live region or announced with `ariaNotify()`.
- **Quote:** > When something succeeds, fails or changes without moving focus — a result count, a saved confirmation, a progress update — assistive technology has to be told. Expose it through a live region, or announce it with ariaNotify().
- **Source:** .zflow/evidence/specweb/accessibility/status-messages.md
- **Verify:** With a screen reader, perform the action (filter a list, add to basket, save) keeping focus still — the message should be heard; `curl -s <page> | grep -E 'role="(status|alert|log)"|aria-live'` on interactive listing pages.
- **Severity:** medium

## A50. Live-region container in initial HTML
- **Requirement:** The live-region container must be rendered in the initial HTML, empty, with the text written in afterwards.
- **Quote:** Render the container in the initial HTML, empty, and write into it afterwards:
- **Source:** .zflow/evidence/specweb/accessibility/status-messages.md
- **Verify:** View initial page source (`curl -s`) — the `role="status"`/`aria-live` element must exist before the first update; a `display: none` region will not be in the accessibility tree.
- **Severity:** medium

## A51. role="alert" reserved for errors
- **Requirement:** `role="status"` (polite) is the default; `role="alert"` must be reserved for errors and genuinely time-critical information.
- **Quote:** - **`role="alert"`** — assertive. It interrupts whatever the screen reader is saying. Reserve it for errors and genuinely time-critical information.
- **Source:** .zflow/evidence/specweb/accessibility/status-messages.md
- **Verify:** Grep the rendered DOM for `role="alert"` — every hit should be an error or time-critical message, not a routine confirmation.
- **Severity:** low

## A52. Paste allowed in credential and OTP fields
- **Requirement:** Paste must be allowed in every field, including password and one-time-code inputs — blocking paste forces transcription and fails accessible authentication.
- **Quote:** - **Allow paste** into every field, including password and one-time-code inputs. Blocking paste forces manual transcription — the exact thing the criterion forbids.
- **Source:** .zflow/evidence/specweb/accessibility/accessible-authentication.md
- **Verify:** On the login/ signup/ 2FA pages, attempt paste into password and code fields; `curl -s <page> | grep -iE 'onpaste|paste.*prevent|preventDefault'` for blockers.
- **Severity:** high

## A53. Password-manager support via autocomplete tokens
- **Requirement:** Credential fields must use proper `<input type="password">` with `autocomplete="current-password"` (or `new-password`) so password managers fill and store them.
- **Quote:** - **Support password managers.** Use proper `<input type="password">` fields with `autocomplete="current-password"` (or `new-password` when setting one) so managers fill and store credentials. Don't break this with custom widgets.
- **Source:** .zflow/evidence/specweb/accessibility/accessible-authentication.md
- **Verify:** `curl -s <login-url> | grep -o '<input[^>]*type="password"[^>]*>'` — must include the autocomplete token; log in using only a password manager as a live check.
- **Severity:** high

## A54. OTP fields marked one-time-code
- **Requirement:** One-time-code inputs must be marked `autocomplete="one-time-code"` so the OS can offer the code automatically.
- **Quote:** - **Let the platform handle OTPs.** Mark the field `autocomplete="one-time-code"` so the OS can offer the SMS code automatically instead of making the user read and retype it.
- **Source:** .zflow/evidence/specweb/accessibility/accessible-authentication.md
- **Verify:** Inspect the 2FA/verification input markup for `autocomplete="one-time-code"`.
- **Severity:** medium

## A55. CAPTCHA not the only gate
- **Requirement:** If a CAPTCHA is used, it must not be the only gate — an accessible non-puzzle alternative must be offered.
- **Quote:** - **If you must use a CAPTCHA, don't make it the only gate.** Offer an alternative that isn't a puzzle, or use a non-interactive challenge.
- **Source:** .zflow/evidence/specweb/accessibility/accessible-authentication.md
- **Verify:** Walk signup/login/contact flows and check any image puzzle has an alternative route (email link, audio, non-interactive challenge).
- **Severity:** medium

## A56. No redundant re-entry in multi-step flows
- **Requirement:** Information already entered earlier in the same process must be auto-populated or selectable when asked for again (exceptions: essential, security, no-longer-valid).
- **Quote:** > Don't make people re-type information they already gave you in the same process. Auto-populate it, or let them pick it from what they entered a step ago.
- **Source:** .zflow/evidence/specweb/accessibility/redundant-entry.md
- **Verify:** Walk checkout/signup end to end noting any value typed more than once; trigger a late validation error and confirm earlier entries survive.
- **Severity:** medium

## A57. Correct autocomplete tokens on repeated fields
- **Requirement:** Form fields should carry correct `autocomplete` tokens (`email`, `name`, `street-address`, `postal-code`) so the browser can fill repeated fields.
- **Quote:** - **Lean on the platform.** Mark fields with the correct [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) tokens (`email`, `name`, `street-address`, `postal-code`) so the browser can fill repeated fields itself.
- **Source:** .zflow/evidence/specweb/accessibility/redundant-entry.md
- **Verify:** `curl -s <form-url> | grep -o 'autocomplete="[^"]*"'` and compare tokens against each field's purpose (also enables autofill for WCAG 1.3.5).
- **Severity:** medium

## A58. Help mechanisms in consistent relative order
- **Requirement:** Any help mechanism repeated across pages (contact link, phone number, chat widget, FAQ) must appear in the same order relative to other content on every page that repeats it.
- **Quote:** > If you offer help — a contact link, a phone number, a chat widget, an FAQ — put it in the same relative place on every page that has it. Moving it around is the failure.
- **Source:** .zflow/evidence/specweb/accessibility/consistent-help.md
- **Verify:** `curl -s` several templates (home, product, checkout, login, 404) and compare the help affordance's DOM position relative to surrounding landmarks; Tab through pages in sequence — reached at the same relative point.
- **Severity:** medium

## A59. html lang declares page language
- **Requirement:** The root `<html>` element must declare the page's primary language, and inline foreign-language content must carry its own `lang`.
- **Quote:** > Set the page's primary language on <html lang> and mark any inline content in a different language with its own lang attribute, so screen readers pronounce it correctly.
- **Source:** .zflow/evidence/specweb/accessibility/document-language.md
- **Verify:** `curl -s <page> | grep -o '<html[^>]*lang="[^"]*"'` — non-empty and matching the actual content language; axe `html-has-lang` / `html-lang-valid`.
- **Severity:** high

## A60. lang uses valid BCP 47 tags
- **Requirement:** Language values must be BCP 47 tags (`en`, `en-GB`, `pt-BR`), not free-text like "english" or "EN_GB".
- **Quote:** - **Use BCP 47 tags.** `en`, `en-GB`, `pt-BR` — not `english` or `EN_GB`.
- **Source:** .zflow/evidence/specweb/accessibility/document-language.md
- **Verify:** Read the lang value from the html tag and validate against the BCP 47 syntax; `lang=""` counts as missing.
- **Severity:** medium

## A61. Foreign-language passages marked with lang
- **Requirement:** Inline quotations or passages in a different language must be marked with a `lang` attribute (loanwords excluded).
- **Quote:** - Inline quotations in another language with no marker, mispronounced by every screen reader.
- **Source:** .zflow/evidence/specweb/accessibility/document-language.md
- **Verify:** Review quoted foreign-language passages in page copy for a lang attribute on the wrapping element.
- **Severity:** low

## A62. prefers-reduced-motion respected
- **Requirement:** The site must respect `prefers-reduced-motion: reduce` — decorative animation, parallax, and autoplay motion stop or shorten.
- **Quote:** > Respect the user's `prefers-reduced-motion` setting. Decorative animation, parallax, and autoplay can trigger vestibular distress, migraines, and seizures.
- **Source:** .zflow/evidence/specweb/accessibility/reduced-motion.md
- **Verify:** Chrome DevTools → Command menu → "Emulate CSS prefers-reduced-motion: reduce", reload — decorative animation should stop; `curl -s <css-urls> | grep -c 'prefers-reduced-motion'` to confirm the media query ships.
- **Severity:** high

## A63. Motion >5s has pause/stop/hide
- **Requirement:** Moving, blinking, scrolling, or auto-updating content lasting more than five seconds must have a pause, stop, or hide control.
- **Quote:** WCAG 2.2.2 Pause, Stop, Hide (Level A) requires that any moving, blinking, scrolling, or auto-updating content lasting more than five seconds can be paused or stopped. WCAG 2.3.3 (Level AAA) goes further: motion triggered by interaction must be disableable unless essential to the function.
- **Source:** .zflow/evidence/specweb/accessibility/reduced-motion.md
- **Verify:** Identify carousels, marquees, tickers, and background video on marketing pages; look for a visible pause control that is not hidden behind hover (touch devices).
- **Severity:** medium

## A64. Nothing flashes more than 3 times per second
- **Requirement:** No content may flash more than three times in any one-second window.
- **Quote:** - Confirm no content flashes more than three times in any one-second window.
- **Source:** .zflow/evidence/specweb/accessibility/reduced-motion.md
- **Verify:** Observe hero animations, video loops, and transition effects for >3 flashes per second (seizure risk, WCAG 2.3.1).
- **Severity:** high

## A65. Autoplay video gated on reduced motion
- **Requirement:** Autoplaying background video must be gated on `prefers-reduced-motion: no-preference` or ship as a static poster image by default.
- **Quote:** Autoplaying background video should be gated on `prefers-reduced-motion: no-preference`, or shipped as a static poster image by default.
- **Source:** .zflow/evidence/specweb/accessibility/reduced-motion.md
- **Verify:** With reduce emulated, confirm hero background videos do not autoplay; view source for `autoplay` video elements and check for a matchMedia gate or poster default.
- **Severity:** medium

## A66. No third-party accessibility overlays
- **Requirement:** The site must not embed third-party accessibility overlay scripts (AccessiBe, UserWay, EqualWeb, AudioEye and similar).
- **Quote:** - Search the page source for known overlay scripts (`acsbapp.com`, `userway.org`, `equalweb.com`, `audioeye.com`). Remove them.
- **Source:** .zflow/evidence/specweb/accessibility/accessibility-overlays.md
- **Verify:** `curl -s <page> | grep -E 'acsbapp\.com|userway\.org|equalweb\.com|audioeye\.com'` — any hit fails.
- **Severity:** high

## A67. Video provides synchronised captions
- **Requirement:** Video with sound must provide synchronised captions via a `<track kind="captions">` WebVTT file (or corrected uploaded captions on embedded players); auto-captions alone are not enough.
- **Quote:** For self-hosted video, attach a WebVTT caption file using the HTML5 `<track>` element with `kind="captions"`:
- **Source:** .zflow/evidence/specweb/accessibility/captions-and-transcripts.md
- **Verify:** `curl -s <video-page> | grep -o '<track[^>]*kind="captions"'` on self-hosted video; on YouTube/Vimeo embeds open the player and check for uploaded (not auto) captions; play with sound off and follow from captions alone.
- **Severity:** high

## A68. Audio content has an on-page transcript
- **Requirement:** Audio-only content (podcasts) must have a full transcript published on the same page as the player, not behind a download link.
- **Quote:** For audio-only content, publish a full transcript on the same page as the player — not behind a download link.
- **Source:** .zflow/evidence/specweb/accessibility/captions-and-transcripts.md
- **Verify:** On episode pages, confirm transcript text is in the page DOM (`curl -s <episode> | grep -i transcript` or grep a quoted passage).
- **Severity:** medium

## A69. Meaningful visuals have audio description
- **Requirement:** Where visuals carry meaning the soundtrack lacks (demos, charts), provide audio description — a `kind="descriptions"` track, narration baked in, or a text media alternative.
- **Quote:** If visuals carry meaning the dialogue does not (an unspoken demo, a chart, an on-screen face), either record a version with descriptive narration baked in, add a `kind="descriptions"` track, or provide a media alternative in text.
- **Source:** .zflow/evidence/specweb/accessibility/captions-and-transcripts.md
- **Verify:** Play the video with the screen off — if it cannot be followed from the soundtrack, check for a descriptions track or text alternative.
- **Severity:** medium

## A70. Track kind is captions, not subtitles
- **Requirement:** Caption tracks must use `kind="captions"` (not `kind="subtitles"`), and caption content must include speaker identification and non-speech sound.
- **Quote:** - Setting `kind="subtitles"` when you mean `kind="captions"`.
- **Source:** .zflow/evidence/specweb/accessibility/captions-and-transcripts.md
- **Verify:** Inspect `<track>` kind attributes and the VTT content for speaker labels and sound cues; validate the .vtt at a WebVTT validator.
- **Severity:** low

## A71. Data tables use th + scope + caption
- **Requirement:** Tabular data must use real `<table>` markup with a caption, `<th>` header cells, and `scope` attributes.
- **Quote:** > Tabular data must use real <table> markup with a caption, header cells, and scope attributes so screen readers can announce row and column relationships.
- **Source:** .zflow/evidence/specweb/accessibility/data-tables.md
- **Verify:** `curl -s <page> | grep -A4 '<table'` — look for `<th` and `scope=`; axe flags missing th/scope and layout tables; screen-reader check announces row/column headers per cell.
- **Severity:** medium

## A72. No layout tables
- **Requirement:** `<table>` must not be used for page layout or form-field alignment.
- **Quote:** - Using `<table>` for page layout or for form field alignment. Use CSS Grid or Flexbox instead.
- **Source:** .zflow/evidence/specweb/accessibility/data-tables.md
- **Verify:** Disable CSS — a layout table reads as nonsense top-to-bottom; axe layout-table heuristics.
- **Severity:** low

## A73. Scrollable table wrappers are focusable
- **Requirement:** Horizontally scrolling table wrappers must be focusable regions (`tabindex="0"` with an accessible name) so keyboard users can reach off-screen columns.
- **Quote:** - Setting `overflow-x: auto` on a `<div>` with no `tabindex` — mouse users can scroll, keyboard users cannot.
- **Source:** .zflow/evidence/specweb/accessibility/data-tables.md
- **Verify:** At a narrow viewport, Tab to the wide-table region and arrow-scroll it; inspect the wrapper for `tabindex="0"` and `aria-label`/`role="region"`.
- **Severity:** low

## A74. Interactive targets ≥ 24×24 CSS px
- **Requirement:** Interactive targets must be at least 24×24 CSS pixels (44×44 as the enhanced target); inline links in running prose are exempt.
- **Quote:** > Interactive controls must be large enough to tap or click reliably. WCAG 2.2 sets a 24×24 CSS px minimum, with 44×44 CSS px as the enhanced target.
- **Source:** .zflow/evidence/specweb/accessibility/touch-target-size.md
- **Verify:** DevTools-inspect computed width/height (bounding box) of buttons, checkboxes, and icon links at mobile layout — both ≥24px, aim 44; axe DevTools / Lighthouse flag WCAG 2.5.8 failures.
- **Severity:** medium

## A75. Sub-24px targets need 24px spacing
- **Requirement:** A target smaller than 24 CSS px is only allowed when a 24px-diameter circle around its centre overlaps no other target.
- **Quote:** If a target genuinely must be smaller than 24 CSS px — for example, a dense data table — WCAG 2.5.8 allows it as long as a **24 px diameter circle around the target's centre does not overlap any other target**. The spacing alone satisfies the criterion.
- **Source:** .zflow/evidence/specweb/accessibility/touch-target-size.md
- **Verify:** For dense control clusters (share/like/bookmark button rows), measure centre-to-centre spacing — each target's 24px circle must not touch a neighbour's.
- **Severity:** low

## A76. Dragging has a single-pointer alternative
- **Requirement:** All functionality using a dragging movement must also be achievable with a single pointer that never drags (unless dragging is essential or user-agent-supplied).
- **Quote:** > Anything you can drag must also work with a single pointer that never drags. Sliders, sortable lists, and drag-to-pan maps each need a click or tap alternative.
- **Source:** .zflow/evidence/specweb/accessibility/dragging-movements.md
- **Verify:** For each slider, sortable list, map, and carousel, complete the task using only single clicks/taps (press and release in one spot); keyboard support alone does not discharge this.
- **Severity:** medium

## A77. Carousels have prev/next buttons
- **Requirement:** Carousels must provide previous/next buttons, not swipe alone.
- **Quote:** - **Carousels.** Provide previous / next buttons; do not rely on swipe alone.
- **Source:** .zflow/evidence/specweb/accessibility/dragging-movements.md
- **Verify:** Inspect carousel markup for visible prev/next button controls; confirm alternatives are ≥24×24 px and visible without hover.
- **Severity:** medium

## A78. Drop zones have a file-input alternative
- **Requirement:** Drag-and-drop upload zones must offer a plain file input (or click-to-select flow) beside them.
- **Quote:** - **Drop targets.** Offer a click-to-select, then click-to-place flow, or a plain file input beside the drag-and-drop zone.
- **Source:** .zflow/evidence/specweb/accessibility/dragging-movements.md
- **Verify:** Inspect upload zones (support forms, avatar upload) for an `<input type="file">` alternative.
- **Severity:** low

## A79. Collapsed content reachable by find-in-page
- **Requirement:** Collapsible content should use `hidden="until-found"` (or native `<details>`) rather than `display: none`, so browser find-in-page, assistive tech, and search engines can reach and auto-expand it.
- **Quote:** > Use hidden="until-found" for collapsible content so that browser find-in-page, assistive tech, and search engines can still reach the text and auto-expand it.
- **Source:** .zflow/evidence/specweb/accessibility/hidden-until-found.md
- **Verify:** In Chrome/Edge, Ctrl/Cmd+F a phrase that lives inside a collapsed FAQ panel — it should auto-expand and scroll; view source for `hidden="until-found"` or `<details>`.
- **Severity:** medium

## A80. No content-visibility: hidden substitute
- **Requirement:** Author CSS must not substitute `content-visibility: hidden` for the `hidden="until-found"` attribute — it hides content from find-in-page and screen readers.
- **Quote:** - Substituting `content-visibility: hidden` in author CSS as a "CSS equivalent" of the attribute. It is not — author-applied `content-visibility: hidden` hides content from find-in-page and screen readers in exactly the way the attribute is meant to avoid.
- **Source:** .zflow/evidence/specweb/accessibility/hidden-until-found.md
- **Verify:** `curl -s <css> | grep -n 'content-visibility:\s*hidden'` on collapse-panel styles — hits are the wrong mechanism.
- **Severity:** low

## A81. beforematch syncs widget state
- **Requirement:** When find-in-page expands a `hidden="until-found"` panel, the widget state (`aria-expanded`, chevron) must update to match.
- **Quote:** - Forgetting to update `aria-expanded` and the visual chevron state in the `beforematch` handler. The panel opens but the button still claims it is collapsed.
- **Source:** .zflow/evidence/specweb/accessibility/hidden-until-found.md
- **Verify:** Trigger a find-in-page match on a collapsed panel, then inspect the toggle button's `aria-expanded` — it must read true.
- **Severity:** low

## A82. Input text ≥ 16px, no zoom suppression
- **Requirement:** Form-control text must be at least 16px so iOS Safari does not zoom on focus, and user scaling must never be suppressed with `maximum-scale=1`.
- **Quote:** > On a phone, the right input type, inputmode, and enterkeyhint summon the correct on-screen keyboard and a useful Enter key. Keep input text at 16px or larger so iOS Safari doesn't zoom on focus.
- **Source:** .zflow/evidence/specweb/accessibility/mobile-form-inputs.md
- **Verify:** DevTools computed `font-size` on inputs/selects/textareas ≥16px; `curl -s <page> | grep -o '<meta name="viewport"[^>]*>'` — must not contain `maximum-scale=1`.
- **Severity:** medium

## A83. Correct input types and inputmode on mobile
- **Requirement:** Fields must use the most specific `type` plus `inputmode`/`enterkeyhint` so mobile keyboards match the data — never `type="number"` for phone numbers, PINs, or card numbers.
- **Quote:** - `type="number"` for phone numbers, PINs, or card numbers. It strips leading zeros and adds a spinner. Use `type="tel"` or `inputmode="numeric"`.
- **Source:** .zflow/evidence/specweb/accessibility/mobile-form-inputs.md
- **Verify:** Inspect checkout/contact forms: tel fields use `type="tel"` or `inputmode="numeric"`, email fields `type="email"`; focus each field on a real phone and confirm the keyboard layout and Enter-key label match the data.
- **Severity:** medium

## A84. Native interactive elements over div click handlers
- **Requirement:** Prefer native interactive elements (`<button>`, `<a href>`, `<details>/<summary>`, `<dialog>`) over divs with click handlers.
- **Quote:** > Prefer native HTML interactive elements — <button>, <a>, <details>/<summary>, <dialog> — over divs with click handlers. You get keyboard support, focus management, and assistive-tech semantics for free.
- **Source:** .zflow/evidence/specweb/accessibility/native-interactive-elements.md
- **Verify:** `curl -s <page> | grep -cE '<div[^>]*(onclick|role="button")'` — hits are replacement candidates; keyboard-test each (reachable, operable, named).
- **Severity:** medium

## A85. Non-submit buttons declare type="button"
- **Requirement:** Buttons inside a `<form>` that are not the submit must declare `type="button"`.
- **Quote:** - **Forgetting `type="button"` inside a `<form>`.** A bare `<button>` defaults to `type="submit"` and submits the form on click.
- **Source:** .zflow/evidence/specweb/accessibility/native-interactive-elements.md
- **Verify:** Inspect non-submit buttons in form markup for `type="button"`; click them and confirm no accidental submission.
- **Severity:** low

## A86. No a href="#" as a button
- **Requirement:** `<a href="#" onclick>` must not be used as a button — it pollutes history, breaks middle-click/open-in-new-tab, and misannounces as a link.
- **Quote:** - **`<a href="#" onclick>` as a button.** Pollutes browser history, breaks middle-click and "open in new tab", and announces as a link in screen readers.
- **Source:** .zflow/evidence/specweb/accessibility/native-interactive-elements.md
- **Verify:** `curl -s <page> | grep -oE '<a [^>]*href="#"[^>]*>'` — hits with click behaviour are fails.
- **Severity:** medium

## A87. Invalid styling uses :user-invalid
- **Requirement:** Style invalid fields with `:user-invalid` rather than `:invalid` so a fresh form does not render red before the user interacts.
- **Quote:** **Prefer `:user-invalid` over `:invalid`.** `:invalid` matches the moment the page loads, so every required-but-empty field renders red before the user has typed a character. `:user-invalid` waits for interaction or submission:
- **Source:** .zflow/evidence/specweb/accessibility/css-state-selectors.md
- **Verify:** Reload a form with required fields — nothing should be red until interaction; `curl -s <css> | grep -n ':invalid'` vs `:user-invalid` on error styles.
- **Severity:** low

## A88. Invalid state not colour-only
- **Requirement:** The visual invalid state must not be the only signal — add an icon or text alongside the colour change.
- **Quote:** - Relying on colour alone for invalid state. Add an icon or text; the visual state must not be the only signal.
- **Source:** .zflow/evidence/specweb/accessibility/css-state-selectors.md
- **Verify:** Grayscale screenshot of an interacted-with errored form — invalid fields must be identifiable without colour; confirm the accessible error message (`aria-invalid` + announced text) exists independently of the CSS state.
- **Severity:** medium
