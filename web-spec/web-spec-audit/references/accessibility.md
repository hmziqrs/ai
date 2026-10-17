# Accessibility — 88 audit checks

Scope: WCAG 2.2 AA is the working bar — contrast, alt text, form labels and errors, keyboard operability, focus visibility and non-obscuring, skip links and landmarks, ARIA discipline, link and button names, status messages, accessible authentication, reduced motion, captions, tables, target size, dragging alternatives, and mobile inputs.

Source: [The Website Specification](https://specification.website/spec/accessibility/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.3, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/accessibility/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — colour contrast, image alt text, form labels, keyboard navigation, visible focus indicators, skip links, semantic HTML and landmarks, descriptive link text, accessible form errors, document and parts language, reduced motion, captions and transcripts, accessible data tables, touch target size · **Avoid** — empty links and buttons, accessibility overlays · **Recommended** — focus not obscured, status messages, accessible authentication, redundant entry, consistent help, mobile-friendly form inputs.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

---

- **A1 — Body text contrast meets WCAG AA minimum** (high · `color-contrast`)
  Verify: Run axe DevTools or Lighthouse accessibility audit on every key template (home, product, pricing, checkout) and review `color-contrast` failures; spot-check reported pairs (especially text over gradients/images) with a contrast checker.
- **A2 — Non-text UI elements meet 3:1 contrast** (medium · `color-contrast`)
  Verify: axe DevTools `non-text-contrast` rule on interactive components; manually sample icon-only-button glyph vs button fill with a contrast checker (automation misses gradients).
- **A3 — Enhanced (AAA) contrast targets** (low · `color-contrast`)
  Verify: Check muted/body text design tokens with a WCAG contrast checker against the shipped backgrounds; report as enhancement, not conformance floor.
- **A4 — Text over images keeps contrast** (medium · `color-contrast`)
  Verify: Screenshot hero/banner sections and sample foreground text against the lightest and darkest background areas under it with a contrast checker; axe misses text-on-image cases, so spot-check by hand.
- **A5 — contrast-color() ships with a fallback colour** (low · `contrast-color`)
  Verify: `curl -s <site-css-url> | grep -n -B3 'contrast-color('` — confirm a plain color declaration or `@supports` guard precedes each use.
- **A6 — contrast-color() result verified on mid-tone backgrounds** (low · `contrast-color`)
  Verify: Inspect the computed `color` in DevTools on elements using it and check the pair with a contrast checker; toggle dark mode / change the dynamic colour and re-check.
- **A7 — Forced-colours mode restores lost boundaries** (medium · `forced-colors`)
  Verify: Chrome/Edge DevTools → Rendering panel → "Emulate CSS media feature forced-colors: active", reload; every control and container must keep a visible boundary. Also `curl -s <css> | grep 'forced-colors: active'` to confirm the site ships forced-colours-aware styles.
- **A8 — No state signalled by colour alone (forced-colours safe)** (medium · `forced-colors`)
  Verify: With forced-colors emulated (DevTools Rendering panel), confirm each state carries a non-colour cue; grayscale screenshot of error/selected states as a second check.
- **A9 — Every img has an alt attribute** (high · `image-alt-text`)
  Verify: `curl -s <page> | grep -o '<img[^>]*>' | grep -v 'alt='` — any output is a failure; axe `image-alt` rule on every template.
- **A10 — Decorative images use empty alt** (low · `image-alt-text`)
  Verify: Screen-reader pass (decorative images should be silent); review decorative flourishes in source for `alt=""` rather than descriptive text that interrupts reading flow.
- **A11 — Functional image alt describes the action** (high · `image-alt-text`)
  Verify: `curl -s <page> | grep -oE '<a [^>]*>\s*<img[^>]*>'` and read each alt; axe `link-name` rule flags image links with no useful name.
- **A12 — Alt text avoids "image of" and file names** (low · `image-alt-text`)
  Verify: `curl -s <page> | grep -o 'alt="[^"]*"' | grep -iE 'image of|photo of|DSC_|\.jpg|\.png|\.svg'` — any hit is a fail.
- **A13 — Every form control has an associated label** (high · `form-labels`)
  Verify: Run axe on the newsletter, contact, search, and checkout forms (`label` rule flags missing associations); `curl -s <form> | grep -o '<input[^>]*>'` and confirm each has a matching label id or aria-label. Inspect the browser accessibility panel — "Name" must be set.
- **A14 — Checkbox/radio groups are named** (medium · `form-labels`)
  Verify: View source of any radio/checkbox group (newsletter preferences, checkout options) for fieldset/legend or role="group" + aria-labelledby around it.
- **A15 — Required fields state so in text** (low · `form-labels`)
  Verify: Inspect required inputs' labels for a text cue (e.g. "required") beyond `*`; screen-reader pass announces requiredness.
- **A16 — Full keyboard operability, no traps** (high · `keyboard-navigation`)
  Verify: Unplug the mouse and walk every interactive feature on each template; open every dialog, menu, and dropdown and press Escape/Tab to confirm focus is managed and never trapped.
- **A17 — No positive tabindex** (medium · `keyboard-navigation`)
  Verify: `curl -s <page> | grep -oE 'tabindex="[1-9][0-9]*"'` — any hit fails.
- **A18 — Focus managed on view changes** (medium · `keyboard-navigation`)
  Verify: Keyboard-only walkthrough of modal flows (newsletter modal, cookie settings, cart drawer) watching `document.activeElement` in the DevTools console at each step.
- **A19 — Visible focus indicator always** (high · `focus-indicators`)
  Verify: Tab through every page template and confirm the focused control is obvious; `curl -s <css> | grep -nE 'outline:\s*(none|0)'` — each hit needs a matching replacement `:focus-visible` rule.
- **A20 — Focus indicator contrast ≥ 3:1** (medium · `focus-indicators`)
  Verify: Focus a control, sample the ring colour vs its surroundings with a contrast checker; two-tone rings pass on any background.
- **A21 — Focus indicator ≥ 2px thick with offset** (low · `focus-indicators`)
  Verify: Inspect computed `outline-width`/`outline-offset` in DevTools on focused elements across templates.
- **A22 — Focused control not hidden behind sticky content** (high · `focus-not-obscured`)
  Verify: Tab every template top-to-bottom watching the focus ring the whole way — desktop, narrow viewport, 200% zoom, and with the cookie banner showing; scroll to mid-page first, where failures cluster. Purely visual check; no tooling does it.
- **A23 — scroll-padding reserves the sticky-header strip** (medium · `focus-not-obscured`)
  Verify: DevTools computed `scroll-padding-top` on `html`/root when the site has a sticky header; `curl -s <css> | grep -n 'scroll-padding'` confirms it ships.
- **A24 — Cookie banners modal or out of the way** (medium · `focus-not-obscured`)
  Verify: Fresh visit with the banner shown, then Tab — focus must never land on content hidden beneath the banner.
- **A25 — Skip link is the first focusable element** (high · `skip-links`)
  Verify: Load the page, press Tab once — the skip link must appear; `curl -s <page> | grep -i 'skip.to'` and confirm the target id exists. Check every template, not only the homepage.
- **A26 — Skip link moves focus into main** (medium · `skip-links`)
  Verify: Press Enter on the skip link and check `document.activeElement` in the DevTools console is the main element, not just a scroll; view source for `display: none` on the skip link (a fail).
- **A27 — Background content inert while overlay open** (medium · `inert-attribute`)
  Verify: Open each overlay and press Tab repeatedly — focus must cycle only within the active region and never reach a background control; with a screen reader, background landmarks should not be announced.
- **A28 — aria-hidden alone not used for background content** (medium · `inert-attribute`)
  Verify: Close each overlay and Tab through the page to confirm the background is interactive again (no stranded inert); inspect open-state DOM for inert on the background rather than aria-hidden-only.
- **A29 — Exactly one main landmark per page** (high · `semantic-html`)
  Verify: `curl -s <page> | grep -c '<main'` — must equal 1; axe region/landmark rules flag pages with no main.
- **A30 — Duplicate landmarks named** (medium · `semantic-html`)
  Verify: `curl -s <page> | grep -o '<nav[^>]*>'` — every nav beyond the first must carry a name; the devtools accessibility-tree landmark list should show distinct names.
- **A31 — Heading outline without skipped levels** (medium · `semantic-html`)
  Verify: axe `heading-order` rule, or `curl -s <page> | grep -o '<h[1-6]'` and check the sequence never jumps a level.
- **A32 — Lists use real list markup** (low · `semantic-html`)
  Verify: View nav/footer source for `ul`/`li` structure rather than bare divs/spans.
- **A33 — Native HTML before ARIA** (medium · `aria-usage`)
  Verify: `curl -s <page> | grep -oE '<(div|span)[^>]*role="(button|link|checkbox|tab)"'` — each hit is a candidate that should have been a native element; axe flags redundant/misused roles.
- **A34 — Interactive ARIA controls keyboard-operable** (high · `aria-usage`)
  Verify: For every element carrying `role="button"` (or similar), focus it with Tab and activate with Enter and Space; both must work.
- **A35 — No aria-hidden/presentation on focusable elements** (high · `aria-usage`)
  Verify: axe `aria-hidden-focus` rule; or DOM query for `[aria-hidden="true"]` subtrees containing links/buttons/inputs.
- **A36 — ARIA states updated by script** (medium · `aria-usage`)
  Verify: Toggle each disclosure/menu/toggle button and inspect its `aria-expanded`/`aria-pressed` in DevTools before and after — it must match the visual state.
- **A37 — Native semantics not overridden** (medium · `aria-usage`)
  Verify: `curl -s <page> | grep -oE '<(h[1-6]|nav|button|ul|table)[^>]*role='` — hits are suspect; check against the ARIA-in-HTML element table.
- **A38 — Link text describes destination** (high · `link-text`)
  Verify: `curl -s <page> | grep -oiE '>(click here|read more|learn more|here)<'` — generic anchors are fails; screen-reader link-list shortcut should show entries that make sense out of context.
- **A39 — Repeated card links get unique accessible names** (medium · `link-text`)
  Verify: Open the accessibility tree or a link list on a card grid; identical names pointing at different destinations are fails. Two links with the same text to different destinations is also a fail.
- **A40 — Download links indicate file type** (low · `link-text`)
  Verify: `curl -s <page> | grep -oE '<a [^>]*href="[^"]*\.(pdf|docx?|zip|xlsx?)"[^>]*>[^<]*'` — link text should name the format.
- **A41 — Every link and button has an accessible name** (high · `empty-links-buttons`)
  Verify: axe `button-name` and `link-name` rules on every template (high-confidence findings); inspect icon-only controls in the browser accessibility panel — Name must be populated.
- **A42 — title attribute is not sufficient labelling** (medium · `empty-links-buttons`)
  Verify: `curl -s <page> | grep -oE '<(button|a )[^>]*title="[^"]*"[^>]*>'` and check each hit also has text content or aria-label.
- **A43 — Decorative SVGs inside buttons aria-hidden** (low · `empty-links-buttons`)
  Verify: Inspect icon-button markup: `<svg aria-hidden="true" focusable="false">` inside the button.
- **A44 — Form errors identified in text** (high · `form-errors`)
  Verify: Walk each public form (contact, checkout, signup) with deliberately bad data, observe-and-abort: fill invalid values and trigger client-side validation, which fires before any submit; server-rendered error states are checked only on a capture the dispatch supplies — otherwise unconfirmed. Test in grayscale to confirm the error state is visible without colour.
- **A45 — Errors associated via aria-invalid/aria-describedby** (medium · `form-errors`)
  Verify: On a supplied failed-submit capture (or during the observe-and-abort walk where the invalid state is visible pre-submit), inspect each invalid input: `aria-invalid="true"` present and `aria-describedby` points at the error node's id; tabbing to the field with a screen reader reads the error with the label.
- **A46 — Dynamic errors announced** (medium · `form-errors`)
  Verify: With a screen reader running, enter bad data and trigger client-side validation (no submit): the error must be spoken without hunting for it; DOM contains the alert/live region before the message appears. Server-side announcements are checked only on a supplied capture — otherwise unconfirmed.
- **A47 — Error copy explains the fix** (medium · `form-errors`)
  Verify: Read the rendered error copy on failed submissions of public forms; generic one-word errors fail.
- **A48 — Errors not colour-only** (medium · `form-errors`)
  Verify: Grayscale screenshot of the errored form — invalid fields must be identifiable without colour.
- **A49 — Status changes exposed via live regions** (medium · `status-messages`)
  Verify: With a screen reader, perform the action (filter a list, add to basket, save) keeping focus still — the message should be heard; `curl -s <page> | grep -E 'role="(status|alert|log)"|aria-live'` on interactive listing pages.
- **A50 — Live-region container in initial HTML** (medium · `status-messages`)
  Verify: View initial page source (`curl -s`) — the `role="status"`/`aria-live` element must exist before the first update; a `display: none` region will not be in the accessibility tree.
- **A51 — role="alert" reserved for errors** (low · `status-messages`)
  Verify: Grep the rendered DOM for `role="alert"` — every hit should be an error or time-critical message, not a routine confirmation.
- **A52 — Paste allowed in credential and OTP fields** (high · `accessible-authentication`)
  Verify: On the login/ signup/ 2FA pages, attempt paste into password and code fields; `curl -s <page> | grep -iE 'onpaste|paste.*prevent|preventDefault'` for blockers.
- **A53 — Password-manager support via autocomplete tokens** (high · `accessible-authentication`)
  Verify: `curl -s <login-url> | grep -o '<input[^>]*type="password"[^>]*>'` — must include the autocomplete token; log in using only a password manager as a live check.
- **A54 — OTP fields marked one-time-code** (medium · `accessible-authentication`)
  Verify: Inspect the 2FA/verification input markup for `autocomplete="one-time-code"`.
- **A55 — CAPTCHA not the only gate** (medium · `accessible-authentication`)
  Verify: Walk signup/login/contact flows and check any image puzzle has an alternative route (email link, audio, non-interactive challenge).
- **A56 — No redundant re-entry in multi-step flows** (medium · `redundant-entry`)
  Verify: Walk checkout/signup end to end noting any value typed more than once; trigger a late validation error and confirm earlier entries survive.
- **A57 — Correct autocomplete tokens on repeated fields** (medium · `redundant-entry`)
  Verify: `curl -s <form-url> | grep -o 'autocomplete="[^"]*"'` and compare tokens against each field's purpose (also enables autofill for WCAG 1.3.5).
- **A58 — Help mechanisms in consistent relative order** (medium · `consistent-help`)
  Verify: `curl -s` several templates (home, product, checkout, login, 404) and compare the help affordance's DOM position relative to surrounding landmarks; Tab through pages in sequence — reached at the same relative point.
- **A59 — html lang declares page language** (high · `document-language`)
  Verify: `curl -s <page> | grep -o '<html[^>]*lang="[^"]*"'` — non-empty and matching the actual content language; axe `html-has-lang` / `html-lang-valid`.
- **A60 — lang uses valid BCP 47 tags** (medium · `document-language`)
  Verify: Read the lang value from the html tag and validate against the BCP 47 syntax; `lang=""` counts as missing.
- **A61 — Foreign-language passages marked with lang** (low · `document-language`)
  Verify: Review quoted foreign-language passages in page copy for a lang attribute on the wrapping element.
- **A62 — prefers-reduced-motion respected** (high · `reduced-motion`)
  Verify: Chrome DevTools → Command menu → "Emulate CSS prefers-reduced-motion: reduce", reload — decorative animation should stop; `curl -s <css-urls> | grep -c 'prefers-reduced-motion'` to confirm the media query ships.
- **A63 — Motion >5s has pause/stop/hide** (medium · `reduced-motion`)
  Verify: Identify carousels, marquees, tickers, and background video on marketing pages; look for a visible pause control that is not hidden behind hover (touch devices).
- **A64 — Nothing flashes more than 3 times per second** (high · `reduced-motion`)
  Verify: Observe hero animations, video loops, and transition effects for >3 flashes per second (seizure risk, WCAG 2.3.1).
- **A65 — Autoplay video gated on reduced motion** (medium · `reduced-motion`)
  Verify: With reduce emulated, confirm hero background videos do not autoplay; view source for `autoplay` video elements and check for a matchMedia gate or poster default.
- **A66 — No third-party accessibility overlays** (high · `accessibility-overlays`)
  Verify: `curl -s <page> | grep -E 'acsbapp\.com|userway\.org|equalweb\.com|audioeye\.com'` — any hit fails.
- **A67 — Video provides synchronised captions** (high · `captions-and-transcripts`)
  Verify: `curl -s <video-page> | grep -o '<track[^>]*kind="captions"'` on self-hosted video; on YouTube/Vimeo embeds open the player and check for uploaded (not auto) captions; play with sound off and follow from captions alone.
- **A68 — Audio content has an on-page transcript** (medium · `captions-and-transcripts`)
  Verify: On episode pages, confirm transcript text is in the page DOM (`curl -s <episode> | grep -i transcript` or grep a quoted passage).
- **A69 — Meaningful visuals have audio description** (medium · `captions-and-transcripts`)
  Verify: Play the video with the screen off — if it cannot be followed from the soundtrack, check for a descriptions track or text alternative.
- **A70 — Track kind is captions, not subtitles** (low · `captions-and-transcripts`)
  Verify: Inspect `<track>` kind attributes and the VTT content for speaker labels and sound cues; validate the .vtt at a WebVTT validator.
- **A71 — Data tables use th + scope + caption** (medium · `data-tables`)
  Verify: `curl -s <page> | grep -A4 '<table'` — look for `<th` and `scope=`; axe flags missing th/scope and layout tables; screen-reader check announces row/column headers per cell.
- **A72 — No layout tables** (low · `data-tables`)
  Verify: Disable CSS — a layout table reads as nonsense top-to-bottom; axe layout-table heuristics.
- **A73 — Scrollable table wrappers are focusable** (low · `data-tables`)
  Verify: At a narrow viewport, Tab to the wide-table region and arrow-scroll it; inspect the wrapper for `tabindex="0"` and `aria-label`/`role="region"`.
- **A74 — Interactive targets ≥ 24×24 CSS px** (medium · `touch-target-size`)
  Verify: DevTools-inspect computed width/height (bounding box) of buttons, checkboxes, and icon links at mobile layout — both ≥24px, aim 44; axe DevTools / Lighthouse flag WCAG 2.5.8 failures.
- **A75 — Sub-24px targets need 24px spacing** (low · `touch-target-size`)
  Verify: For dense control clusters (share/like/bookmark button rows), measure centre-to-centre spacing — each target's 24px circle must not touch a neighbour's.
- **A76 — Dragging has a single-pointer alternative** (medium · `dragging-movements`)
  Verify: For each slider, sortable list, map, and carousel, complete the task using only single clicks/taps (press and release in one spot); keyboard support alone does not discharge this.
- **A77 — Carousels have prev/next buttons** (medium · `dragging-movements`)
  Verify: Inspect carousel markup for visible prev/next button controls; confirm alternatives are ≥24×24 px and visible without hover.
- **A78 — Drop zones have a file-input alternative** (low · `dragging-movements`)
  Verify: Inspect upload zones (support forms, avatar upload) for an `<input type="file">` alternative.
- **A79 — Collapsed content reachable by find-in-page** (medium · `hidden-until-found`)
  Verify: In Chrome/Edge, Ctrl/Cmd+F a phrase that lives inside a collapsed FAQ panel — it should auto-expand and scroll; view source for `hidden="until-found"` or `<details>`.
- **A80 — No content-visibility: hidden substitute** (low · `hidden-until-found`)
  Verify: `curl -s <css> | grep -n 'content-visibility:\s*hidden'` on collapse-panel styles — hits are the wrong mechanism.
- **A81 — beforematch syncs widget state** (low · `hidden-until-found`)
  Verify: Trigger a find-in-page match on a collapsed panel, then inspect the toggle button's `aria-expanded` — it must read true.
- **A82 — Input text ≥ 16px, no zoom suppression** (medium · `mobile-form-inputs`)
  Verify: DevTools computed `font-size` on inputs/selects/textareas ≥16px; `curl -s <page> | grep -o '<meta name="viewport"[^>]*>'` — must not contain `maximum-scale=1`.
- **A83 — Correct input types and inputmode on mobile** (medium · `mobile-form-inputs`)
  Verify: Inspect checkout/contact forms: tel fields use `type="tel"` or `inputmode="numeric"`, email fields `type="email"`; focus each field on a real phone and confirm the keyboard layout and Enter-key label match the data.
- **A84 — Native interactive elements over div click handlers** (medium · `native-interactive-elements`)
  Verify: `curl -s <page> | grep -cE '<div[^>]*(onclick|role="button")'` — hits are replacement candidates; keyboard-test each (reachable, operable, named).
- **A85 — Non-submit buttons declare type="button"** (low · `native-interactive-elements`)
  Verify: Inspect non-submit buttons in form markup for `type="button"`; click them and confirm no accidental submission.
- **A86 — No a href="#" as a button** (medium · `native-interactive-elements`)
  Verify: `curl -s <page> | grep -oE '<a [^>]*href="#"[^>]*>'` — hits with click behaviour are fails.
- **A87 — Invalid styling uses :user-invalid** (low · `css-state-selectors`)
  Verify: Reload a form with required fields — nothing should be red until interaction; `curl -s <css> | grep -n ':invalid'` vs `:user-invalid` on error styles.
- **A88 — Invalid state not colour-only** (medium · `css-state-selectors`)
  Verify: Grayscale screenshot of an interacted-with errored form — invalid fields must be identifiable without colour; confirm the accessible error message (`aria-invalid` + announced text) exists independently of the CSS state.
