# Accessibility — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/accessibility/. Assembled from the local evidence corpus (.zflow/evidence/specweb/accessibility/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## accessibility-overlays
Source: https://specification.website/spec/accessibility/accessibility-overlays/

---
title: "Accessibility overlays"
category: accessibility
status: avoid
url: https://specification.website/spec/accessibility/accessibility-overlays/
updated: "2026-05-29T10:57:27.000Z"
sources:
  - title: "Overlay Fact Sheet"
    url: "https://overlayfactsheet.com/"
    publisher: "Overlay Fact Sheet"
  - title: "WP Accessibility Knowledge Base"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
  - title: "WebAIM — Survey of Web Accessibility Practitioners #3 (overlay findings)"
    url: "https://webaim.org/blog/practitioners-survey-3/"
    publisher: "WebAIM"
  - title: "Equalize Digital — Accessibility Checker documentation"
    url: "https://equalizedigital.com/accessibility-checker/documentation/"
    publisher: "Equalize Digital"
  - title: "EU Web Accessibility Directive"
    url: "https://digital-strategy.ec.europa.eu/en/policies/web-accessibility"
    publisher: "European Commission"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Accessibility overlays

> Third-party JavaScript widgets that claim to make a site WCAG-compliant at runtime. They do not work, often harm screen-reader users, and attract lawsuits.

## What it is

Accessibility overlays are third-party JavaScript widgets — AccessiBe, UserWay, EqualWeb, AudioEye, and similar — that you paste into a page with a single script tag. They promise to detect accessibility problems and fix them automatically at runtime, usually with a floating button that opens a panel of toggles for font size, contrast, and similar controls.

```html
<!-- The shape of the problem -->
<script src="https://acsbapp.com/apps/app/dist/js/app.js"></script>
```

The marketing claim is that one line of code makes a site WCAG-compliant. It does not.

## Why it matters

Overlays do not fix accessibility. They frequently make it worse:

- They override native semantics with injected ARIA, which confuses screen readers that already understood the original markup.
- They cannot generate meaningful alt text, correct heading order, or sensible link names from nothing — the underlying HTML still has to be right.
- They ship visitor data, including assistive-technology fingerprints, to a third-party server, raising privacy and GDPR concerns.
- They are now a litigation magnet. More than 1,000 ADA web-accessibility lawsuits in the US in 2023 named sites that used an overlay; some named the overlay vendor as a co-defendant.
- Under the EU Web Accessibility Directive and the European Accessibility Act, public-sector bodies and many private services must publish an accessibility statement based on the real state of the site. An overlay does not change that state.

The Overlay Fact Sheet, signed by more than 800 accessibility professionals including most of the field's recognised experts, recommends against them outright. WebAIM's survey of accessibility practitioners found that the large majority who had encountered overlays rated them as unhelpful or actively harmful — a verdict even stronger among respondents with disabilities.

## What to do instead

Fix the underlying site. There is no shortcut, but the work is well-scoped:

- Start with [semantic HTML](/spec/accessibility/semantic-html/) — correct landmarks, headings, lists, buttons, and links.
- Use [ARIA](/spec/accessibility/aria-usage/) only where native HTML cannot express the role, and never to paper over broken markup.
- Make every interactive control reachable and operable with the [keyboard](/spec/accessibility/keyboard-navigation/), with visible [focus indicators](/spec/accessibility/focus-indicators/).
- Meet [colour contrast](/spec/accessibility/color-contrast/) minimums in your design tokens, not in a user-toggled overlay.
- Give every form control a real [label](/spec/accessibility/form-labels/).

Audit with a combination of automated and manual tools: axe DevTools, Lighthouse, WAVE, and the Equalize Digital Accessibility Checker for WordPress sites all catch a useful subset of issues. None of them replace manual testing with a real screen reader (VoiceOver on macOS or iOS, NVDA on Windows) and keyboard-only navigation. Fix issues incrementally and track them like any other defect.

## Common mistakes

- Installing an overlay because a vendor email warned of "ADA risk". The overlay increases that risk.
- Treating an overlay's compliance badge as a legal defence. Courts have repeatedly rejected it.
- Leaving an overlay in place "while we work on the real fixes". It interferes with the audit and with users.
- Disabling browser or OS accessibility settings the user already configured by overriding them in the widget.

## Verification

- Search the page source for known overlay scripts (`acsbapp.com`, `userway.org`, `equalweb.com`, `audioeye.com`). Remove them.
- Run axe DevTools, Lighthouse, and WAVE against representative pages and triage the findings.
- Navigate the site using only the Tab, Shift+Tab, Enter, and arrow keys. Every action must be reachable and visible.
- Test the main user journeys with VoiceOver or NVDA. The page should be usable without the widget.
---

## accessible-authentication
Source: https://specification.website/spec/accessibility/accessible-authentication/

---
title: "Accessible authentication"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/accessible-authentication/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "WCAG 3.3.8 — Accessible Authentication (Minimum) (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html"
    publisher: "W3C"
  - title: "WCAG 3.3.9 — Accessible Authentication (Enhanced) (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-enhanced.html"
    publisher: "W3C"
  - title: "W3C — Web Authentication (WebAuthn)"
    url: "https://www.w3.org/TR/webauthn-3/"
    publisher: "W3C"
  - title: "MDN — HTML autocomplete attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Accessible authentication

> Let people log in without solving a puzzle, transcribing a code, or memorising anything. Don't block password managers, allow paste, and offer a method that needs no cognitive function test.

## What it is

WCAG 2.2 added two success criteria, both about logging in: **3.3.8 Accessible Authentication (Minimum)**, Level AA, and **3.3.9 (Enhanced)**, Level AAA. The rule is that no step of an authentication process may rely on a **cognitive function test** — remembering a password, solving a puzzle, transcribing characters, or recognising things — unless an accessible alternative is offered. The Minimum criterion exempts object recognition (e.g. "pick the photos with a bus") and personal-content recognition; the Enhanced criterion removes even those exemptions.

This does not outlaw passwords. A password field is fine as long as something other than the user's memory can supply the value: the criterion is satisfied when a mechanism is available to help, such as a password manager filling the field or simply allowing paste. What fails is a step that forces recall or transcription with no such help. So the fix is rarely to abolish passwords; it is to stop blocking the tools that remove the memory burden.

## Why it matters

A login screen is a gate in front of everything. People with cognitive disabilities — memory loss, dyslexia, dyscalculia — are routinely locked out by the very mechanisms meant to keep accounts safe. Asking someone to memorise a password, copy a six-digit code from a text message into a field, or solve a distorted-text CAPTCHA is a cognitive function test, and for a large group of users it simply does not work. Authentication failures don't just frustrate; they exclude people from banking, healthcare, and government services entirely.

## How to implement

The reliable way to pass is to make the browser or device do the remembering:

- **Support password managers.** Use proper `<input type="password">` fields with `autocomplete="current-password"` (or `new-password` when setting one) so managers fill and store credentials. Don't break this with custom widgets.
- **Allow paste** into every field, including password and one-time-code inputs. Blocking paste forces manual transcription — the exact thing the criterion forbids.
- **Let the platform handle OTPs.** Mark the field `autocomplete="one-time-code"` so the OS can offer the SMS code automatically instead of making the user read and retype it.
- **Offer passkeys / WebAuthn.** Biometric or device-bound credentials satisfy the criterion because they require no memorised secret and no test.
- **If you must use a CAPTCHA, don't make it the only gate.** Offer an alternative that isn't a puzzle, or use a non-interactive challenge.
- **Email or magic links** are an accessible fallback — the user clicks, no recall required.

## Common mistakes

- Disabling paste "for security" on password or 2FA fields.
- A reCAPTCHA-style image puzzle with no alternative path.
- "Security questions" that demand recall of obscure facts.
- Custom login fields with no `autocomplete`, so managers can't fill them.
- Asking the user to transcribe a code from an authenticator app with no copy affordance.

## Verification

- Log in using only a password manager — no typing. It should fill and submit.
- Confirm paste works in every credential and OTP field.
- Check each step for a puzzle, memory, or transcription demand; if one exists, confirm an accessible alternative is offered.
---

## aria-usage
Source: https://specification.website/spec/accessibility/aria-usage/

---
title: "ARIA — first rule of ARIA"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/aria-usage/
updated: "2026-08-21T00:00:00.000Z"
sources:
  - title: "ARIA in HTML (W3C Recommendation)"
    url: "https://www.w3.org/TR/html-aria/"
    publisher: "W3C"
  - title: "ARIA Authoring Practices Guide — Read Me First"
    url: "https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/"
    publisher: "W3C WAI"
  - title: "MDN — ARIA"
    url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA"
    publisher: "MDN"
  - title: "WCAG 4.1.2 — Name, Role, Value (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# ARIA — first rule of ARIA

> ARIA can make custom widgets accessible, but the first rule of ARIA is don't use ARIA. Reach for a native HTML element first; add ARIA only when nothing native fits.

## What it is

ARIA — Accessible Rich Internet Applications — is a set of HTML attributes (`role`, and the many `aria-*` attributes) that tell assistive technologies what a custom element is, what state it is in, and how it relates to other elements. ARIA never changes how something looks or behaves; it only affects the accessibility tree.

## Why it matters

ARIA is a sharp tool. Used well, it lets you describe widgets the HTML spec does not cover. Used badly, it overrides the real semantics of an element and makes the page *less* accessible than the unstyled HTML would have been. The W3C's four rules of ARIA lead with the most important one: reach for native HTML first.

Which roles and attributes are actually *allowed* on a given element is not a matter of taste either. [ARIA in HTML](https://www.w3.org/TR/html-aria/) specifies it element by element. The answers are not always the intuitive ones: `role="button"` on an `<a href>` is permitted, while `<textarea>` accepts no role other than the `textbox` it already has, and `<input type="hidden">` accepts no `role` or `aria-*` attribute at all.

It has been a W3C Recommendation since December 2021, but "Recommendation" here does not mean finished. W3C republishes it as an amended Recommendation whenever the element table changes — several times a year, most recently on 11 August 2026 — so a rule you looked up two years ago may since have been added, narrowed, or dropped. Read the undated `/TR/html-aria/` URL, which always resolves to the current edition, and check the specification's own change log rather than a copy of the table in a blog post or a linter's rule set.

## How to implement

The four rules of ARIA, in plain English:

1. **Don't use ARIA if a native HTML element will do.** `<button>`, `<a href>`, `<input type="checkbox">`, `<details>` — these come with role, focus, and keyboard support for free.
2. **Don't change native semantics.** Never write `<h1 role="button">`. If you need a button, use a `<button>`.
3. **All interactive ARIA controls must be keyboard-operable.** A `role="button"` div without Space/Enter handlers is broken.
4. **Don't set `role="presentation"` or `aria-hidden="true"` on focusable elements.** You will hide controls from the very users who need them.

One more requirement sits outside that list but is enforced by WCAG all the same: every interactive element needs an accessible name — a visible label, `aria-label`, or `aria-labelledby`.

Common, useful ARIA attributes:

```html
<!-- An icon-only button needs a name -->
<button aria-label="Close">
  <svg aria-hidden="true" focusable="false">…</svg>
</button>

<!-- Associate a hint with an input -->
<label for="pw">Password</label>
<input id="pw" type="password" aria-describedby="pw-hint">
<p id="pw-hint">At least 12 characters.</p>

<!-- Group of toggle buttons sharing a label -->
<div role="group" aria-labelledby="format">
  <h3 id="format">Text format</h3>
  <button aria-pressed="true">Bold</button>
  <button aria-pressed="false">Italic</button>
</div>
```

- `aria-label` overrides the element's text — use only when there is no visible label.
- `aria-labelledby` points at the id of one or more existing elements; it takes precedence over `aria-label` and `<label>`.
- `aria-describedby` adds a description in addition to the name — for hints, errors, format examples.

## Common mistakes

- `role="button"` on a `<div>` with no `tabindex`, no key handlers, no focus style.
- Redundant roles: `<button role="button">`, `<nav role="navigation">`.
- `aria-label` written for SEO, in language different from the visible text — voice control users cannot say the visible text.
- `aria-hidden="true"` on a wrapper that contains a focusable button.
- ARIA states (`aria-expanded`, `aria-checked`) never updated by JavaScript when the UI changes.

## Verification

- Inspect every custom widget in the accessibility tree; the role, name, and state must match what is on screen.
- Run an automated checker for ARIA misuse.
- Test with a screen reader — the announcement must match how the control behaves.
---

## captions-and-transcripts
Source: https://specification.website/spec/accessibility/captions-and-transcripts/

---
title: "Captions and transcripts"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/captions-and-transcripts/
updated: "2026-05-29T10:57:27.000Z"
sources:
  - title: "WCAG 1.2.2 — Captions (Prerecorded) Level A"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html"
    publisher: "W3C"
  - title: "WCAG 1.2.3 — Audio Description or Media Alternative (Prerecorded) Level A"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html"
    publisher: "W3C"
  - title: "WCAG 1.2.1 — Audio-only and Video-only (Prerecorded) Level A"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html"
    publisher: "W3C"
  - title: "MDN — <track>: The Embed Text Track element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/track"
    publisher: "MDN"
  - title: "WP Accessibility — Accessible media"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
  - title: "Media Accessibility User Requirements"
    url: "https://www.w3.org/TR/media-accessibility-reqs/"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Captions and transcripts

> Video needs synchronised captions, audio-only content needs a transcript, and visuals that carry meaning need audio description. Auto-captions alone are not enough.

## What it is

Any time-based media a page plays — a video, a podcast episode, a recorded talk — must come with a text alternative that conveys the same information. In practice this means three things:

- **Captions** for video with sound (WCAG 1.2.2, Level A).
- **A transcript** for audio-only content such as podcasts (WCAG 1.2.1, Level A).
- **Audio description** — or a full text alternative — when the visuals carry meaning the soundtrack does not (WCAG 1.2.3, Level A).

Captions are not the same as subtitles. Subtitles translate dialogue for hearing viewers. Captions are written for deaf and hard-of-hearing viewers and include speaker identification, laughter, music cues, and other non-speech sound.

## Why it matters

Without captions and transcripts, a video or podcast simply does not exist for a large part of the audience. Deaf and hard-of-hearing users need captions. Blind users need either a soundtrack that already describes the visuals, or a separate audio description track. People in noisy or quiet environments, second-language speakers, and search engines all benefit from the same text layer.

WCAG 1.2.1, 1.2.2, and 1.2.3 are all Level A — the minimum legal accessibility bar in most jurisdictions, including the European Accessibility Act and the US Section 508.

## How to implement

For self-hosted video, attach a WebVTT caption file using the HTML5 `<track>` element with `kind="captions"`:

```html
<video controls>
  <source src="/media/intro.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="/media/intro.en.vtt"
    srclang="en"
    label="English"
    default
  />
  <track
    kind="descriptions"
    src="/media/intro.en.desc.vtt"
    srclang="en"
    label="English audio description"
  />
</video>
```

A WebVTT file is a plain `.vtt` text file starting with `WEBVTT`, followed by cue blocks:

```
WEBVTT

00:00:01.000 --> 00:00:04.500
[upbeat music]

00:00:04.600 --> 00:00:07.000
ANNA: Welcome to the show.
```

For audio-only content, publish a full transcript on the same page as the player — not behind a download link.

If visuals carry meaning the dialogue does not (an unspoken demo, a chart, an on-screen face), either record a version with descriptive narration baked in, add a `kind="descriptions"` track, or provide a media alternative in text.

For embedded video on YouTube or Vimeo, the responsibility still sits with you as the publisher: upload a corrected caption file, do not rely on auto-captions.

**Open captions** are burned into the video frame and always visible. **Closed captions** can be toggled. Closed is preferred — users can resize, restyle, and translate them.

## Common mistakes

- Shipping YouTube auto-captions unedited. They miss punctuation, mishear names, and are not WCAG-compliant.
- Treating subtitles as captions: dialogue only, no speaker labels, no sound effects.
- Putting the transcript on a separate page that is hard to find.
- Forgetting audio description on tutorial or demo videos where the screen carries the message.
- Setting `kind="subtitles"` when you mean `kind="captions"`.

## Verification

- Play the video with the sound off. Can you follow it from the captions alone?
- Play it with the screen off. Can you follow it from the soundtrack alone? If not, you need audio description.
- Validate the `.vtt` file at a WebVTT validator and confirm cues sync within 100 ms of speech.
- Run an automated accessibility scan (axe, Lighthouse) and confirm media elements have a `<track>` child.
- Test with a screen reader on the player page and confirm the transcript is reachable in the reading order.
---

## color-contrast
Source: https://specification.website/spec/accessibility/color-contrast/

---
title: "Colour contrast"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/color-contrast/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "WCAG 1.4.3 — Contrast (Minimum) (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
    publisher: "W3C"
  - title: "WCAG 1.4.6 — Contrast (Enhanced) (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html"
    publisher: "W3C"
  - title: "WCAG 1.4.11 — Non-text Contrast (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Low Contrast"
    url: "https://equalizedigital.com/accessibility-checker/insufficient-color-contrast/"
    publisher: "Equalize Digital"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Colour contrast

> Text and meaningful non-text elements must have enough contrast against their background so people with low vision and people in harsh light can read them.

## What it is

Contrast is the difference in luminance between the foreground (text, icons, control borders) and the background behind them. Luminance is not the same as how different two colours look. A vivid pairing chosen by hue, such as saturated red on green, can sit at almost the same lightness and fail, while an unremarkable dark grey on white passes comfortably. What the ratio measures is lightness against lightness, so picking colours because they clash or feel bold is no guarantee they contrast. WCAG defines minimum ratios that pages must meet so that text remains legible for users with low vision, age-related sight loss, or colour vision deficiencies, and for everyone reading on a glare-filled screen.

## Why it matters

Low contrast is consistently the single most common automated accessibility failure on the web. It locks out users with low vision, makes content unreadable in bright sunlight, and degrades comprehension even for users with average vision. Meeting the contrast minimum is the cheapest, highest-impact accessibility fix you can make to a site.

## How to implement

WCAG 2.2 sets three thresholds you should know:

- **1.4.3 Contrast (Minimum) — AA.** Body text needs at least **4.5:1**. Large text (18pt, or 14pt bold) needs **3:1**.
- **1.4.6 Contrast (Enhanced) — AAA.** Body text **7:1**, large text **4.5:1**.
- **1.4.11 Non-text Contrast — AA.** Meaningful UI components (input borders, focus rings, icon-only buttons) and graphics needed to understand the content need at least **3:1** against adjacent colours.

Pick colour pairs from a palette that has been checked against these ratios. Use design tokens, not one-off hex values, so a single fix propagates.

```css
:root {
  --text: #1a1a1a;       /* 16.1:1 on white — comfortable */
  --text-muted: #595959; /* 7.0:1 on white — passes AAA */
  --link: #0b5fff;       /* 6.4:1 on white */
}
```

APCA (the contrast algorithm being prototyped for WCAG 3) gives a more perceptually accurate score, especially for dark mode. Treat it as a useful second opinion, not a replacement — conformance today is still measured against WCAG 2 ratios.

## Common mistakes

- Light grey body text on white ("#aaa on #fff" is 2.3:1 — a clear fail).
- Placeholder text used as the only label, set in a low-contrast grey.
- Brand-coloured buttons where the label sits below 4.5:1 on the button fill.
- Disabled states styled so low that sighted keyboard users cannot see which control has focus.
- Text laid over a busy image with no scrim or solid block behind it.

## Verification

- Run an automated checker (axe DevTools, WAVE, Lighthouse, Equalize Digital) on every template.
- Spot-check the reported failures by hand — automation can miss text on gradients or images.
- Test the page in greyscale and in a high-glare environment.
---

## consistent-help
Source: https://specification.website/spec/accessibility/consistent-help/

---
title: "Consistent help"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/consistent-help/
updated: "2026-07-10T00:00:00.000Z"
sources:
  - title: "WCAG 3.2.6 — Consistent Help (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html"
    publisher: "W3C"
  - title: "WCAG 2.2 Recommendation"
    url: "https://www.w3.org/TR/WCAG22/#consistent-help"
    publisher: "W3C"
  - title: "WCAG 3.2.3 — Consistent Navigation (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Consistent help

> If you offer help — a contact link, a phone number, a chat widget, an FAQ — put it in the same relative place on every page that has it. Moving it around is the failure.

## What it is

**Consistent Help** is WCAG 2.2 Success Criterion 3.2.6, at **Level A** — the baseline conformance level. Where a set of pages repeats a help mechanism, that mechanism must appear in the **same order relative to the other content on the page**, unless the user themselves changes it.

The criterion names four kinds of help mechanism:

- **Human contact details** — a phone number, an email address, opening hours.
- **A human contact mechanism** — a contact form, a messaging system, live chat, a social media handle.
- **A self-help option** — an FAQ, a "How do I…" page, a support or documentation link.
- **A fully automated contact mechanism** — a chatbot.

"Same order relative to other page content" is about the serialised order of the content, not pixel position. A help link that is the last item in the header on every page still passes when a narrow viewport reflows the header below the logo, because its position in the content sequence has not moved. Two layout variations of the same page set are each judged on their own terms.

### It does not require you to offer help

The wrong belief readers arrive with is that 3.2.6 obliges every site to provide a support channel. It does not. The criterion is entirely conditional: *if* you already repeat a help mechanism across pages, keep it in a consistent place. A site with no contact link, no FAQ, and no chat widget satisfies 3.2.6 without doing anything.

It is also narrower than it sounds in the other direction. 3.2.6 does not govern the *content* of the help, whether the help is any good, or whether it is reachable in one click. And it is distinct from **3.2.3 Consistent Navigation**, which governs repeated navigation *blocks*. Help mechanisms often sit inside navigation, so a page can satisfy 3.2.3 and still fail 3.2.6 — for instance when the header nav is identical everywhere but a "Need help?" link floats into the footer on the checkout page.

## Why it matters

Someone who needs help is, by definition, already stuck. Making them hunt for the help itself compounds the problem, and it compounds hardest for the people least able to absorb it:

- Visitors with cognitive or learning disabilities, who rely on locating a known affordance in a known place rather than re-scanning each page.
- Visitors with low vision using magnification, who see a small slice of the page at a time and must pan to search. A help link that moves means panning the whole page again.
- Visitors with anxiety or under time pressure — a checkout timing out, a form rejecting an entry — for whom a relocated support link reads as no support link.

Users build a spatial and sequential memory of a site within a page or two. A consistent help affordance turns that memory into a reliable escape hatch. An inconsistent one throws the memory away exactly when it is needed.

## How to implement

- **Pick one slot and keep it.** Put the help affordance in the same place in the source order on every page that repeats it — last item in the primary nav, or first item in the footer's support column. Consistency of the source order is what is judged.
- **Render it from one shared template.** If the header and footer come from a single layout, this criterion is satisfied almost for free. Failures cluster on pages that opt out of the shared layout: checkout, login, and error pages.
- **Do not special-case the pages that need it most.** A stripped-down checkout that drops the site header to reduce distraction is precisely where a stuck user reaches for support.
- **If the mechanism differs by page, that's fine.** A contact link on marketing pages and a chat widget in the account area are different mechanisms, not an inconsistency. The criterion applies to each mechanism across the pages where it is repeated.
- **User-initiated change is allowed.** If someone collapses a help panel or dismisses a chat bubble, honouring that choice on the next page does not fail the criterion.

## Common mistakes

- A "Contact us" link in the header everywhere except checkout, where it moves to the footer.
- A chat widget that is the first thing in the DOM on the home page and buried after the main content elsewhere.
- Error pages and maintenance pages rendered from a bare template with no help affordance at all — see [error pages](/spec/resilience/error-pages/).
- Assuming that passing 3.2.3 Consistent Navigation covers this; help often sits outside the navigation block.
- Treating visual position as the test. The test is content order, per layout variation.

## Verification

- List the help mechanisms your site repeats. For each, open every page in the set and note its position in the source order.
- Tab through several pages in sequence. The help affordance should be reached at the same point in the tab order relative to the surrounding landmarks.
- Check the pages that skip the shared layout — checkout, login, 404, maintenance — since those are where the inconsistency lives.
- Repeat at a narrow viewport. Each layout variation is judged separately, so both must be internally consistent.
---

## contrast-color
Source: https://specification.website/spec/accessibility/contrast-color/

---
title: "Automatic contrasting colour"
category: accessibility
status: optional
url: https://specification.website/spec/accessibility/contrast-color/
updated: "2026-07-04T00:00:00.000Z"
sources:
  - title: "CSS Color Module Level 5 — contrast-color()"
    url: "https://drafts.csswg.org/css-color-5/#contrast-color"
    publisher: "W3C CSS Working Group"
  - title: "WCAG 1.4.3 — Contrast (Minimum) (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
    publisher: "W3C"
  - title: "MDN — contrast-color()"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/contrast-color"
    publisher: "MDN"
  - title: "How to have the browser pick a contrasting color in CSS"
    url: "https://webkit.org/blog/16929/contrast-color/"
    publisher: "WebKit"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Automatic contrasting colour

> Let the browser pick a legible black or white foreground for a dynamic background with the CSS contrast-color() function, instead of hard-coding colour pairs or computing luminance in JavaScript.

## What it is

`contrast-color()` is a CSS function that takes a `<color>` and returns whichever of `black` or `white` contrasts more strongly with it. You pass it the background (or the text colour) and the browser hands back a legible foreground, so the pairing is never hard-coded.

```css
button {
  background-color: var(--accent);
  color: contrast-color(var(--accent));
}
```

It is defined in CSS Color Module Level 5. The function commonly targets the WCAG AA minimum of 4.5:1, and browsers are free to use a more perceptually accurate algorithm to choose between black and white.

## Why it matters

- **One source of truth for colour.** When a background is dynamic — a user-chosen accent, a brand colour set in a CMS, a value that flips with `prefers-color-scheme` — you cannot know the right foreground ahead of time. `contrast-color()` computes it at render, so text stays readable whatever the background becomes.
- **No JavaScript.** It replaces the familiar helper that parses a colour, computes relative luminance, and picks black or white — one declaration instead of a script that has to run on every theme change.
- **It degrades safely.** This is progressive enhancement: browsers that do not understand it ignore the declaration, so pair it with a sensible fallback rather than relying on it.

## How to implement

Feed the same custom property to both the background and `contrast-color()`, and provide a hand-picked fallback colour first so unsupporting browsers still get legible text:

```css
button {
  background-color: var(--accent);
  color: #fff; /* fallback for older browsers */
}

@supports (color: contrast-color(red)) {
  button {
    color: contrast-color(var(--accent));
  }
}
```

Because the result is only ever black or white, reserve it for backgrounds that are clearly light or clearly dark, where one of the two is a strong match.

## Common mistakes

- **Mid-tone backgrounds.** Against a mid-tone such as a royal blue (`#2277d3`), neither black nor white reliably clears AA for small text. The function still returns one of them; it does not guarantee a readable pair. Keep input colours light or dark, or verify the result.
- **Expecting a brand colour back.** It returns `black` or `white` only — never a tint of your palette.
- **Shipping it with no fallback.** Without a plain `color` declaration first, older browsers fall back to the default text colour, which may be illegible on your background.

## Verification

- Feature-query it: `@supports (color: contrast-color(red))` tells you whether the browser will honour it.
- Inspect the computed `color` in DevTools and confirm the resulting pair meets 4.5:1 against the actual background values you ship, using a contrast checker.
- Toggle dark mode or change the dynamic colour and confirm the text stays legible either way.
- Baseline: `contrast-color()` became newly available across major browsers in April 2026 (Safari 26, Firefox 146, Chrome and Edge 147). Treat it as an enhancement for everyone else.
---

## css-state-selectors
Source: https://specification.website/spec/accessibility/css-state-selectors/

---
title: "CSS state and relational selectors"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/css-state-selectors/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "W3C Selectors Level 4 — Relational selector `:has()`"
    url: "https://www.w3.org/TR/selectors-4/#relational"
    publisher: "W3C"
  - title: "MDN — `:has()`"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has"
    publisher: "MDN"
  - title: "MDN — `:user-invalid`"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:user-invalid"
    publisher: "MDN"
  - title: "HTML Living Standard — Constraint validation"
    url: "https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraint-validation"
    publisher: "WHATWG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# CSS state and relational selectors

> Use `:has()` together with `:user-invalid`, `:user-valid`, `:placeholder-shown` and `:focus-within` to express form and component state in CSS, removing the JavaScript class-toggling pattern and the race conditions it brings.

## What it is

Two related primitives let CSS describe state that previously needed JavaScript.

**`:has()`** is the relational pseudo-class. A parent matches based on what it contains, so an ancestor can style itself from a descendant's state. It is the missing "parent selector" that the platform spent two decades without.

**The `:user-*` form-state pseudo-classes** — `:user-invalid` and `:user-valid` — only apply *after* the user has interacted with a field. They sit on top of the HTML constraint-validation model alongside the older `:invalid` / `:valid`, `:required` / `:optional`, `:in-range` / `:out-of-range`, `:placeholder-shown`, `:focus-within`, and `:focus-visible`.

Together they let the stylesheet, not a `classList.toggle()` call, hold the truth about what is focused, filled, valid, or hovered.

## Why it matters

The pattern this replaces is everywhere:

```js
input.addEventListener('input', () => {
  field.classList.toggle('has-error', !input.checkValidity());
  field.classList.toggle('is-empty', input.value === '');
});
```

That code has to exist on every field, runs on every keystroke, races with framework re-renders, and silently drifts out of sync when an attribute changes outside the listener. Moving the same logic into CSS removes the listener, removes the drift, and respects the browser's own constraint-validation timing — which is what assistive technology already listens to.

This page covers the *visual state* layer. Accessible *messaging* — labels, live regions, error summaries, `aria-invalid` — belongs with [accessible form errors](/spec/accessibility/form-errors/) and [form labels](/spec/accessibility/form-labels/). Both layers are needed; neither replaces the other.

## How to implement

**Style a form from its contents with `:has()`.** The submit button dims while any field is invalid; the field row highlights while its input is focused:

```css
form:has(:user-invalid) button[type="submit"] {
  opacity: 0.5;
  pointer-events: none;
}

.field:has(input:focus) label {
  color: var(--accent);
}

.field:has(input:placeholder-shown) label {
  /* float-label pattern, no JS */
  transform: translateY(0.75rem);
}
```

**Prefer `:user-invalid` over `:invalid`.** `:invalid` matches the moment the page loads, so every required-but-empty field renders red before the user has typed a character. `:user-invalid` waits for interaction or submission:

```css
/* Wrong: red on first paint */
input:invalid { border-color: red; }

/* Right: red only after the user has tried */
input:user-invalid { border-color: red; }
input:user-valid   { border-color: green; }
```

Pair the colour with text and an icon — colour alone is not enough (see [form errors](/spec/accessibility/form-errors/)).

## Common mistakes

- Using `:invalid` instead of `:user-invalid`, so a fresh form looks broken before anyone interacts with it.
- Nesting `:has()` selectors so deeply that selector matching regresses on large DOMs. Keep depth shallow and the inner selector specific.
- Forgetting `:has()` can reach siblings via combinators inside the argument — `.field:has(+ .field input:user-invalid)` lets one row react to the next.
- Relying on colour alone for invalid state. Add an icon or text; the visual state must not be the only signal.
- Re-implementing `:focus-within` with JS focus/blur listeners. The pseudo-class already exists and stays in sync.

## Verification

- Reload a form with required fields. Nothing should be red until the user interacts — if it is, you are still using `:invalid`.
- Focus an empty required input and tab away. The field should turn red and the submit button should dim.
- In Chrome DevTools, the Styles pane has "Force element state" with `:user-invalid`, `:focus-within`, and `:placeholder-shown` — use it to verify each rule fires.
- Run a screen reader through the form and confirm the visual state does not stand in for the accessible error message. `aria-invalid` and the announced text still need to be there.
---

## data-tables
Source: https://specification.website/spec/accessibility/data-tables/

---
title: "Accessible data tables"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/data-tables/
updated: "2026-05-29T10:57:27.000Z"
sources:
  - title: "WCAG 2.2 — 1.3.1 Info and Relationships (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html"
    publisher: "W3C"
  - title: "HTML Living Standard — Tabular data"
    url: "https://html.spec.whatwg.org/multipage/tables.html"
    publisher: "WHATWG"
  - title: "MDN — <table>: The Table element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table"
    publisher: "MDN"
  - title: "Web Accessibility Tutorials — Tables"
    url: "https://www.w3.org/WAI/tutorials/tables/"
    publisher: "W3C WAI"
  - title: "WP Accessibility"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Accessible data tables

> Tabular data must use real <table> markup with a caption, header cells, and scope attributes so screen readers can announce row and column relationships.

## What it is

A data table presents information where each cell only makes sense in the context of its row and its column. The `<table>` element, together with `<caption>`, `<thead>`, `<tbody>`, `<tfoot>` and `<th>`, encodes those relationships so that assistive technology can announce them as the user moves between cells.

## Why it matters

Sighted users scan a table visually — they see the column heading above a number and the row label to its left at the same time. Screen reader users cannot. They rely on the markup to be told, when they land on `£42`, that this is the **Price** column of the **Hardback** row. Without `<th>` and `scope`, that announcement does not happen and the table becomes a grid of disconnected values.

WCAG 1.3.1 Level A requires that information and relationships conveyed visually are also available in the markup. A layout `<table>` or a table built from `<div>`s fails this criterion.

## How to implement

A simple table needs a caption and one row of column headers:

```html
<table>
  <caption>Book prices, May 2026</caption>
  <thead>
    <tr><th scope="col">Format</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Hardback</th><td>£42</td></tr>
    <tr><th scope="row">Paperback</th><td>£18</td></tr>
  </tbody>
</table>
```

When headers span groups of rows or columns, use `scope="rowgroup"` and `scope="colgroup"`. When the structure is genuinely complex — multiple levels of headers, headers that don't line up — switch to the `id` and `headers` pattern:

```html
<table>
  <caption>Quarterly revenue by region</caption>
  <thead>
    <tr><td></td><th id="q1" scope="col">Q1</th><th id="q2" scope="col">Q2</th></tr>
  </thead>
  <tbody>
    <tr><th id="eu" scope="row">EU</th>
        <td headers="eu q1">€1.2m</td><td headers="eu q2">€1.4m</td></tr>
  </tbody>
</table>
```

For long extra context that won't fit in the caption, use `aria-describedby` pointing to a paragraph nearby.

Wide tables on narrow screens should scroll horizontally as a focusable region, so keyboard users can reach the off-screen columns:

```html
<div role="region" aria-label="Quarterly revenue" tabindex="0" style="overflow-x:auto">
  <table>…</table>
</div>
```

## Common mistakes

- Using `<table>` for page layout or for form field alignment. Use CSS Grid or Flexbox instead.
- `<td>` cells with bold text standing in for headers, with no `<th>`.
- A header row with no `scope` attribute — ambiguous for nested tables and complex headers.
- Hiding the caption with `display: none`; it is then also removed from the accessibility tree. Use a visually hidden class if you must.
- Setting `overflow-x: auto` on a `<div>` with no `tabindex` — mouse users can scroll, keyboard users cannot.

## Verification

- Tab through the table with a screen reader (VoiceOver, NVDA). Each data cell should be announced with its row and column header.
- Check the accessibility tree in DevTools. Headers should appear as `columnheader` or `rowheader`, not `cell`.
- Run an automated checker (axe, Lighthouse). It will flag missing `<th>`, missing `scope`, and layout tables.
- Disable CSS. The table should still read top-to-bottom in a sensible order.
---

## document-language
Source: https://specification.website/spec/accessibility/document-language/

---
title: "Document and parts language"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/document-language/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "WCAG 3.1.1 — Language of Page (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html"
    publisher: "W3C"
  - title: "WCAG 3.1.2 — Language of Parts (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Missing Language Declaration"
    url: "https://equalizedigital.com/accessibility-checker/documentation/missing-language-declaration/"
    publisher: "Equalize Digital"
  - title: "MDN — The lang global attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Document and parts language

> Set the page's primary language on <html lang> and mark any inline content in a different language with its own lang attribute, so screen readers pronounce it correctly.

## What it is

The `lang` attribute tells browsers, screen readers, search engines, translation tools, and AI agents what language a piece of content is written in. WCAG 3.1.1 (Level A) requires the page's primary language to be set on the root `<html>` element. WCAG 3.1.2 (Level AA) requires any inline passage in a different language to be marked too.

The value is a BCP 47 language tag — `en`, `nl`, `de`, `pt-BR`, `zh-Hant` — not a free-text string.

## Why it matters

Screen readers switch their pronunciation and accent based on `lang`. Without it, a Dutch screen reader will sing English words like Dutch, and an English one will mangle French. Translation tools and AI agents use it to decide whether to translate the text. Spell-checkers, hyphenation, and quotation marks all depend on it.

A missing `lang` is a Level A failure — the lowest possible bar — and one of the easiest accessibility findings for an automated scanner to catch.

## How to implement

Set the page language on `<html>`:

```html
<!doctype html>
<html lang="en-GB">
  <head>…</head>
  <body>…</body>
</html>
```

For a French quotation inside an English page, wrap it and mark the language:

```html
<p>
  As Antoine de Saint-Exupéry wrote,
  <q lang="fr">on ne voit bien qu'avec le cœur</q> —
  one sees clearly only with the heart.
</p>
```

A few rules:

- **Use BCP 47 tags.** `en`, `en-GB`, `pt-BR` — not `english` or `EN_GB`.
- **Match the actual content language.** A site delivered in Dutch with `lang="en"` is worse than no lang at all.
- **Set the directionality too** when needed: `<html lang="ar" dir="rtl">`.
- **Loanwords don't count.** "Café" in an English sentence does not need `lang="fr"`. Mark whole quotations or passages, not individual borrowed words.
- **Update the attribute on language switches.** A single-page app that changes language in the navigation must update `document.documentElement.lang`.

Related: see the [foundations/html-lang](/spec/foundations/html-lang) page for the underlying HTML requirement.

## Common mistakes

- Template ships with `<html lang="en">` and never changes, regardless of which language the page is rendered in.
- `lang=""` (empty) — counts as missing.
- Full-language names ("english") instead of BCP 47 codes.
- Inline quotations in another language with no marker, mispronounced by every screen reader.
- Right-to-left content without `dir="rtl"`, breaking layout.

## Verification

- View source. `<html>` must have a non-empty `lang` matching the page's actual language.
- Listen to a sample with a screen reader and confirm pronunciation matches the language.
- Run an automated checker; missing or invalid `lang` is a standard high-confidence rule.
---

## dragging-movements
Source: https://specification.website/spec/accessibility/dragging-movements/

---
title: "Dragging movements"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/dragging-movements/
updated: "2026-07-10T00:00:00.000Z"
sources:
  - title: "WCAG 2.5.7 — Dragging Movements (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html"
    publisher: "W3C"
  - title: "WCAG 2.2 Recommendation"
    url: "https://www.w3.org/TR/WCAG22/#dragging-movements"
    publisher: "W3C"
  - title: "WCAG 2.5.1 — Pointer Gestures (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html"
    publisher: "W3C"
  - title: "MDN — Pointer events"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Dragging movements

> Anything you can drag must also work with a single pointer that never drags. Sliders, sortable lists, and drag-to-pan maps each need a click or tap alternative.

## What it is

**Dragging Movements** is WCAG 2.2 Success Criterion 2.5.7, at **Level AA**. A dragging movement is any operation where the pointer presses down on one point, moves along a path while held, and releases somewhere else — dragging a slider thumb, reordering a list, panning a map, swiping a carousel.

The criterion says that all functionality using a dragging movement must also be achievable **with a single pointer that never drags**, unless dragging is essential or the behaviour belongs to the user agent rather than to you.

Three exceptions apply. Dragging may be **essential** — a drawing canvas or a signature field is the drag. The functionality may be **determined by the user agent and not modified by the author**, which exempts native scrollbars, touch scrolling, and the scrolling a browser supplies for a CSS `overflow` container. And a **path-based gesture** that traces a specific shape is governed by SC 2.5.1 Pointer Gestures instead.

### It does not ban drag and drop

The wrong belief to correct is that 2.5.7 outlaws dragging. It does not. Dragging is a fine interaction and most people like it. The criterion is purely **additive**: keep the drag, and add a second path to the same outcome that a single tap or click can walk. A sortable list that offers both drag handles and "move up" / "move down" buttons passes. A list that offers only the buttons also passes — but nobody asked you to remove the handles.

The other common confusion is with SC 2.5.1 Pointer Gestures. That criterion is about **multipoint or path-based** gestures — pinch-to-zoom, a two-finger swipe, tracing an L-shape. 2.5.7 is about the humble **single-pointer drag**. A control can fail one and pass the other, so check both.

## Why it matters

A drag is a sustained, precise, path-following press. It asks the user to keep contact while moving accurately, then release at exactly the right place. That combination excludes people who can point but cannot drag:

- Users with tremor, spasticity, or limited dexterity, for whom holding a press steady through a movement is unreliable.
- Users of head-pointers, eye-tracking, or mouth-sticks, where "press and hold while moving" is slow and error-prone.
- Switch-access users, who have no continuous pointer path at all.
- Anyone on a trackpad in a moving vehicle, or operating a touchscreen one-handed.

When the drag is the only route, these visitors are not merely inconvenienced — the feature is unreachable. If reordering your saved items or setting a price filter exists only as a drag, that function does not exist for them.

## How to implement

Start from the platform. `<input type="range">` already ships a non-dragging alternative: click anywhere on the track to jump the thumb there, and use the arrow keys once focused. A custom slider built from `<div>`s and `pointermove` handlers usually ships neither, which is how a passing control becomes a failing one.

Where you own the interaction, pair every drag with a click target:

- **Sliders and range controls.** Allow a click on the track to move the thumb. Add stepper buttons for fine adjustment where the range is wide.
- **Sortable lists.** Give each row "move up" and "move down" buttons, or a "move to…" control that opens a position picker. Keep the drag handle as well.
- **Maps and pannable canvases.** Provide directional arrow buttons and zoom `+` / `−` controls alongside drag-to-pan.
- **Carousels.** Provide previous / next buttons; do not rely on swipe alone.
- **Drop targets.** Offer a click-to-select, then click-to-place flow, or a plain file input beside the drag-and-drop zone.

Make the alternative a real, focusable control — a `<button>` — rather than a click handler bolted onto a `<div>`. That also satisfies [keyboard navigation](/spec/accessibility/keyboard-navigation/), which 2.5.7 does not itself require but which the same users usually need. Note that keyboard support alone does **not** satisfy this criterion: it is about the *pointer*, and a user with a head-pointer and no keyboard still needs a single-pointer route.

Size the alternative controls properly. A "move up" chevron that is 12 px square trades a dragging barrier for a [target-size](/spec/accessibility/touch-target-size/) one.

## Common mistakes

- A custom slider that only responds to `pointerdown` + `pointermove`, ignoring a plain click on the track.
- Drag-only reordering with no per-row move controls.
- A drag-and-drop upload zone with no file input behind it.
- Assuming keyboard operability is enough — the criterion is specifically about single-pointer use.
- Treating pinch-to-zoom as covered here; that is SC 2.5.1.
- Adding "move up" / "move down" buttons that are hidden until hover, so touch users never see them.

## Verification

- For every draggable control, complete the same task using only single clicks or taps — press and release in one spot, never moving while held. If you cannot, it fails.
- Test with the pointer only. Put the keyboard aside; keyboard access does not discharge this criterion.
- Check each alternative control is at least 24×24 CSS px and visible without hover.
- Confirm that anything you treat as exempt is genuinely essential (a drawing surface) or genuinely user-agent-supplied (a native scrollbar), and not simply convenient.
---

## empty-links-buttons
Source: https://specification.website/spec/accessibility/empty-links-buttons/

---
title: "Empty links and buttons"
category: accessibility
status: avoid
url: https://specification.website/spec/accessibility/empty-links-buttons/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "WCAG 2.4.4 — Link Purpose (In Context) (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html"
    publisher: "W3C"
  - title: "WCAG 4.1.2 — Name, Role, Value (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Empty Link"
    url: "https://equalizedigital.com/accessibility-checker/documentation/empty-link/"
    publisher: "Equalize Digital"
  - title: "Accessibility Checker — Empty Button"
    url: "https://equalizedigital.com/accessibility-checker/documentation/empty-button/"
    publisher: "Equalize Digital"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Empty links and buttons

> A link or button with no accessible name is invisible to screen readers and unreachable for voice control. Icon-only controls without a label are the usual culprit.

## What it is

An empty link or button is one where the accessibility tree records no name. Visually it might be a clear icon — a magnifying glass, a hamburger, an X — but the screen reader announces "link" or "button" with no further information. The user has no idea what it does.

This fails WCAG 2.4.4 (Level A, link purpose) and 4.1.2 (Level A, name role value) at the same time.

## Why it matters

Empty controls are at the top of every accessibility scanner's findings because they are easy to detect and ship in huge numbers. Icon-only buttons and image-only links are the usual sources: a designer placed an SVG inside a `<button>`, nobody added a label, and the control becomes a guessing game.

Voice-control users are hit hardest. Their software lets them say "click search" — but if the search button has no name, there is nothing to say.

## How to implement

Give every link and button an accessible name. Pick whichever fits the design:

**Icon plus visible text** (the easiest case):

```html
<button type="button">
  <svg aria-hidden="true" focusable="false">…</svg>
  Search
</button>
```

**Icon only — use `aria-label`**:

```html
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">…</svg>
</button>
```

**Image link** — give the `<img>` a useful `alt`:

```html
<a href="/"><img src="logo.svg" alt="Acme home"></a>
```

**Tooltip-only labelling is not enough.** A `title` attribute does not produce a reliable accessible name in every browser and assistive tech combination. Use `aria-label` or visible text instead.

Rules of thumb:

- Mark the SVG inside the button `aria-hidden="true"` and `focusable="false"` so the icon is not double-announced.
- If two controls do the same thing on the page (a top and a footer search), give them the same name.
- Never use a button as a styled wrapper around an empty span — the button has no name and no purpose.

## Common mistakes

- `<button><svg>…</svg></button>` with no label.
- `<a href="/"><img src="logo.svg"></a>` — image link with no alt text. The screen reader reads the URL.
- Empty `<a href="/path"></a>` left behind by a templating bug.
- Icon font glyphs (Font Awesome and similar) used as the only content with no label — the Unicode private-use character is announced as random nonsense.
- A label hidden with `display: none` instead of a visually-hidden utility, removing it from the accessibility tree.

## Verification

- Run an automated checker; "Empty Link" and "Empty Button" are direct, high-confidence findings.
- Inspect each icon-only control in the browser's accessibility panel — the Name field must be populated.
- Tab through the page with a screen reader and confirm every control announces something useful.
---

## focus-indicators
Source: https://specification.website/spec/accessibility/focus-indicators/

---
title: "Visible focus indicators"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/focus-indicators/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "WCAG 2.4.7 — Focus Visible (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html"
    publisher: "W3C"
  - title: "WCAG 1.4.11 — Non-text Contrast (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html"
    publisher: "W3C"
  - title: "WCAG 2.4.13 — Focus Appearance (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html"
    publisher: "W3C"
  - title: "MDN — :focus-visible"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Visible focus indicators

> Whenever a control receives keyboard focus, the page must show a clear, high-contrast indicator. Removing focus outlines without a replacement is a top accessibility failure.

## What it is

A focus indicator is the visible cue that tells a keyboard user which control will receive their next keystroke. Browsers ship one by default — usually a thin outline ring. WCAG 2.4.7 (Level AA) requires the active focus location to be visible at all times when navigating by keyboard.

WCAG 2.2 added two more rules. 2.4.13 (AAA) sets a minimum size and contrast for the indicator itself. 2.4.11 (AA) requires that the focused element is not hidden behind sticky headers or cookie banners — a separate failure with a separate fix, covered in [focus not obscured](/spec/accessibility/focus-not-obscured/). This page is about drawing the indicator; that one is about whether anything is sitting on top of it.

## Why it matters

Without a focus ring, a keyboard user is navigating blind — they tab three times, do not know where they are, and give up. The single most common cause is a stylesheet that hides the default ring to "tidy up the design":

```css
/* Don't ship this. */
*:focus { outline: none; }
```

This is a Level AA failure. If you remove the default style, you must replace it with something equal or better.

## How to implement

Use `:focus-visible` so the focus style appears for keyboard users but not for every mouse click on a button:

```css
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid #0b5fff;
  outline-offset: 2px;
  border-radius: 4px;
}
```

Guidelines:

- **Contrast at least 3:1** against the adjacent colour, both focused and unfocused (1.4.11).
- **At least 2 CSS pixels thick** to meet 2.4.13's enclosed-area minimum.
- **Offset the outline** away from the control so it never disappears into the border.
- **Two-tone rings** (a light ring and a dark ring) work on any background.
- **Keep focus visible across sticky UI.** A ring you drew correctly still fails if a sticky header covers it — see [focus not obscured](/spec/accessibility/focus-not-obscured/) for the scroll-padding fix.

`:focus-visible` is supported in every current browser. If you need to support older engines, pair it with `:focus` as a fallback.

## Common mistakes

- `outline: none` with no replacement.
- A focus style that only changes the text colour by a small amount.
- A focus ring drawn inside the button so the button's own background hides it.
- Custom widgets (cards, tab lists) that never style their focused state.

## Verification

- Tab through every page template; the focused control must be obvious from across the room.
- Check the contrast of the focus ring against its background.
- Confirm nothing covers the ring once it is drawn — [focus not obscured](/spec/accessibility/focus-not-obscured/) has the sticky-header and cookie-banner checks.
---

## focus-not-obscured
Source: https://specification.website/spec/accessibility/focus-not-obscured/

---
title: "Focus not obscured"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/focus-not-obscured/
updated: "2026-07-17T00:00:00.000Z"
sources:
  - title: "WCAG 2.4.11 — Focus Not Obscured (Minimum) (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html"
    publisher: "W3C"
  - title: "WCAG 2.4.12 — Focus Not Obscured (Enhanced) (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html"
    publisher: "W3C"
  - title: "WCAG 2.2 Recommendation"
    url: "https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum"
    publisher: "W3C"
  - title: "MDN — scroll-padding"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-padding"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Focus not obscured

> A focused control must not be hidden behind a sticky header, cookie banner, or chat widget. WCAG 2.2 added this as a separate criterion because a perfect focus ring is worthless if something is sitting on top of it.

## What it is

**Focus Not Obscured** is a pair of WCAG 2.2 success criteria about what sits *on top of* the focused control.

- **2.4.11 Focus Not Obscured (Minimum)**, Level **AA**: "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content."
- **2.4.12 Focus Not Obscured (Enhanced)**, Level **AAA**: no part of the focused component may be hidden.

The gap between them is the word **entirely**. At AA, a sliver of the control peeking out from under your sticky header is a pass. At AAA, any occlusion at all is a failure. AA is a floor, not a description of a good experience.

"Author-created content" is the operative phrase. If the browser's own UI covers something, that is not your criterion to fail. If *your* sticky header, cookie banner, or chat bubble covers it, it is.

### This is not the same as having a focus indicator

The wrong belief to correct is that a well-styled focus ring discharges this. It does not, and the two criteria fail independently.

[Visible focus indicators](/spec/accessibility/focus-indicators/) (2.4.7) asks whether you *drew* a focus indicator. Focus Not Obscured asks whether the user can *see* the one you drew. A site can have an immaculate three-pixel high-contrast ring and still fail 2.4.11 the moment Tab scrolls a link to the top of the viewport and a 64-pixel sticky header lands on it. The ring is rendering perfectly. It is simply underneath something.

That is why WCAG 2.2 made it a separate criterion rather than a note on 2.4.7: the fix lives in your scroll and layout behaviour, not in your focus styles.

## Why it matters

A keyboard user cannot see where focus went. That is the whole problem, and it is indistinguishable from having no focus indicator at all — they press Tab, the page scrolls, and the thing they are now about to activate is behind a banner. They are one Enter keystroke away from a link they cannot read.

Sighted keyboard users are the population this hurts most directly: people with motor disabilities who do not use a mouse, and people using switch access or voice control that drives the focus ring. Screen reader users are largely unaffected, because the content is announced regardless of what covers it — which is precisely why this bug survives so long. It is invisible to the automated checks and to the screen-reader pass, and it only shows up when a sighted person tabs through the page and watches.

The failure is also intermittent, which makes it easy to dismiss. Focus is obscured only when the focused element happens to land in the strip the sticky element occupies. Tab through the top of the page and everything is fine. Tab into the middle and a control vanishes.

## How to implement

Most failures come from one of three sources: sticky headers and footers, non-modal cookie banners, and floating chat or feedback widgets.

**Reserve the sticky area in the scroll container.** When focus moves off-screen, the browser scrolls the element into view — and by default it stops as soon as the element touches the viewport edge, which is exactly where your sticky header lives. `scroll-padding-top` on the scrolling element tells the browser to treat that strip as unusable:

```css
:root {
  /* Match the sticky header's height. */
  scroll-padding-top: 5rem;
}
```

Add `scroll-padding-bottom` if you also have a sticky footer. If the header's height changes responsively, drive both from the same custom property so they cannot drift apart.

**Prefer `scroll-padding` over `scroll-margin` for this.** `scroll-margin` is set per-target and you will forget one; `scroll-padding` is set once on the scroll container and applies to everything scrolled into it — including focus.

**Make banners modal or make them get out of the way.** A cookie banner that is non-modal and sticky is the canonical failure: focus can travel to the content behind it and end up underneath it. Either make it a true modal — trap focus inside it, and mark the rest [`inert`](/spec/accessibility/inert-attribute/) so focus cannot reach the obscured content in the first place — or ensure it does not overlap focusable content. See [cookie consent](/spec/privacy/cookie-consent/).

**Two exceptions are written into the criteria**, and both are narrower than people assume:

- **User-movable content.** Only the *initial* position is evaluated. If the user drags your panel over a control themselves, that is not your failure. If it starts there, it is.
- **User-opened content.** Content the user opened may obscure the focused component, but only if they can reveal it again *without moving focus* — pressing Escape, or scrolling. A disclosure the user cannot dismiss without tabbing onward does not qualify.

Neither exception covers "the user could have dismissed our banner". It was your content, placed there by you, in its initial position.

## Common mistakes

- A sticky header with no `scroll-padding-top` on the scroll container — by far the most common cause.
- `scroll-margin-top` applied to headings for anchor links, which fixes in-page jumps but does nothing for Tab.
- A non-modal cookie banner pinned to the bottom of the viewport, with the page behind it still focusable.
- A chat widget in the bottom-right corner that covers the last control in a form.
- Treating the AA "entirely hidden" threshold as the goal. Two visible pixels is a pass and still unusable.
- Assuming a screen-reader pass covers it. It does not — the content is announced from under the banner just fine.
- Testing only at desktop width. Sticky elements grow proportionally larger as the viewport shrinks.

## Verification

- Tab through every template from the top of the page to the bottom and *watch the focus ring the whole way*. Any control that disappears under a sticky element is a failure. This is a purely visual check; no tooling will do it for you.
- Repeat it at a narrow viewport and at 200% zoom, where sticky elements eat proportionally more of the screen.
- Repeat it with the cookie banner showing — that is a fresh visitor's first experience, and the state you are least likely to test.
- Scroll to the middle of a long page, then Tab. Failures cluster where the page is already scrolled.
- For AAA (2.4.12), check that no part of the control is covered, not merely that some of it shows.
---

## forced-colors
Source: https://specification.website/spec/accessibility/forced-colors/

---
title: "Forced colours mode"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/forced-colors/
updated: "2026-06-22T00:00:00.000Z"
sources:
  - title: "CSS Media Queries Level 5 — forced-colors"
    url: "https://drafts.csswg.org/mediaqueries-5/#forced-colors"
    publisher: "W3C"
  - title: "CSS Color Adjustment Module Level 1 — forced-color-adjust"
    url: "https://drafts.csswg.org/css-color-adjust-1/#forced"
    publisher: "W3C"
  - title: "MDN — forced-colors"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Forced colours mode

> Respect forced colours mode (Windows High Contrast and similar). The `forced-colors` media feature lets you repair UI the user's palette would otherwise flatten — without overriding their choice.

## What it is

Some users override every site's colours with a small, high-contrast palette of their own. Windows High Contrast mode is the best-known example; the operating system or browser substitutes the user's chosen foreground, background, link, and button colours for whatever the page declared. The browser exposes that state through the `forced-colors` media feature, which is `active` when a forced palette is in effect.

```css
@media (forced-colors: active) {
  .card {
    /* box-shadow is forced to none — restore the boundary with a border */
    border: 1px solid CanvasText;
  }
}
```

Forced colours mode works automatically for most semantic markup. The feature exists for the cases where the substitution removes information — and for the rare element that should opt out via `forced-color-adjust`.

## Why it matters

The high contrast of a reduced palette is essential for some users with low vision, light sensitivity, or cognitive needs to read a page at all. When forced colours apply, the browser drops `box-shadow`, flattens background images behind text, and recolours borders and text to system colours. UI that relied on a shadow, a background-colour swatch, or a coloured-but-borderless control can lose its visible boundary entirely.

Respecting the mode means two things: never fighting the user's palette, and repairing the few places where their palette erases a distinction your design carried in colour alone.

## How to implement

- **Build on semantic HTML.** Real `<button>`, `<a>`, and form controls map to system colour keywords automatically; custom `<div>` widgets do not.
- **Use CSS system colours** inside the query — `CanvasText`, `Canvas`, `LinkText`, `ButtonText`, `ButtonFace`, `Highlight` — so repairs track the user's actual palette rather than hard-coded values.
- **Restore lost boundaries.** Where a control or container was defined by `box-shadow` or background colour alone, add a `border` or `outline` inside `@media (forced-colors: active)`.
- **Opt out sparingly.** `forced-color-adjust: none` on an element (e.g. a colour-picker swatch or a meaningful chart key) preserves its own colours. Use it only where the colour *is* the information.
- **Pair with `prefers-contrast: more`** for users who asked for higher contrast without a forced palette — the two queries serve different audiences.

The site ships forced-colours-aware styles; see the related [colour contrast](/spec/accessibility/color-contrast/) page.

## Common mistakes

- Hard-coding colours inside the query instead of using system colour keywords, re-breaking the user's palette.
- Conveying state (selected, error, disabled) through colour that forced mode discards, with no border, icon, or text fallback.
- Slapping `forced-color-adjust: none` across large regions, defeating the mode for everything inside.
- Using the deprecated `-ms-high-contrast` media query instead of standard `forced-colors`.

## Verification

- On Windows, enable **Settings → Accessibility → Contrast themes** and pick a theme; reload the page.
- In Chrome or Edge DevTools, open the Rendering panel and set **Emulate CSS media feature forced-colors: active**.
- Confirm every control and container keeps a visible boundary, and that no state is signalled by colour alone.
---

## form-errors
Source: https://specification.website/spec/accessibility/form-errors/

---
title: "Accessible form errors"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/form-errors/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "WCAG 3.3.1 — Error Identification (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html"
    publisher: "W3C"
  - title: "WCAG 3.3.3 — Error Suggestion (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html"
    publisher: "W3C"
  - title: "WCAG 1.4.1 — Use of Color (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html"
    publisher: "W3C"
  - title: "MDN — ARIA live regions"
    url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Accessible form errors

> When a form submission fails, errors must be identified in text, associated with the input that caused them, and announced to assistive technology.

## What it is

An accessible form error tells the user three things, in text and in the accessibility tree: which field is wrong, what is wrong with it, and how to fix it. WCAG 3.3.1 (Level A) requires the field and the problem to be identified. 3.3.3 (Level AA) requires a fix to be suggested when known. 1.4.1 (Level A) forbids using colour as the only indicator.

## Why it matters

A red border alone is invisible to a screen-reader user, to a user with colour vision deficiency, and to a user reading on a sunlit phone. An error summary above the form helps everyone, but only if each error is also wired to its input — otherwise a screen-reader user reading the field on its own hears nothing wrong.

## How to implement

Associate each error message with its input using `aria-describedby` and mark the field invalid:

```html
<label for="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  aria-invalid="true"
  aria-describedby="email-error"
  required>
<p id="email-error" class="error">
  Enter an email address in the format name@example.com.
</p>
```

For an error summary at the top of the form after submission, render it server-side or move focus to it with JavaScript:

```html
<div role="alert" aria-labelledby="error-heading">
  <h2 id="error-heading">There are 2 problems with your submission</h2>
  <ul>
    <li><a href="#email">Email address is not valid</a></li>
    <li><a href="#postcode">Postcode is required</a></li>
  </ul>
</div>
```

Rules:

- **Identify the error in text.** "Email is required" — not just a red border.
- **Tell the user how to fix it.** "Enter a date in the format DD/MM/YYYY", not "Invalid date".
- **Announce dynamically inserted errors.** Use `role="alert"` (assertive) or a live region (`aria-live="polite"`) so screen readers hear the change — see [status messages](/spec/accessibility/status-messages/) for the mechanics.
- **Set `aria-invalid="true"`** on the field — and remove it when the user corrects the value.
- **Don't rely on colour alone.** Pair red with an icon, a word ("Error"), or a heavier border.
- **Don't validate every keystroke.** Validate on blur or on submit; constant interruptions are unusable with a screen reader.

## Common mistakes

- Red outline as the only signal.
- Error text that appears in the DOM but is never associated with the input.
- A live region inserted *after* the message, so the message is never announced.
- Server-side errors that move the user back to the top of the page with no focus management.
- Generic messages: "Invalid input".

## Verification

- Submit a form with deliberately bad data using a screen reader. The error must be announced and reachable.
- Tab to each invalid field; the error text must be read along with the label.
- Test in grayscale to confirm the error state is visible without colour.
---

## form-labels
Source: https://specification.website/spec/accessibility/form-labels/

---
title: "Form labels"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/form-labels/
updated: "2026-05-29T10:57:27.000Z"
sources:
  - title: "WCAG 3.3.2 — Labels or Instructions (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html"
    publisher: "W3C"
  - title: "WCAG 1.3.1 — Info and Relationships (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Missing Form Label"
    url: "https://equalizedigital.com/accessibility-checker/empty-missing-form-label/"
    publisher: "Equalize Digital"
  - title: "WP Accessibility — Web Forms"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Form labels

> Every form control needs a programmatically associated label. A placeholder is not a label, and an unlabelled input is unusable for screen-reader and voice-control users.

## What it is

A label is the human-readable name of a form control. It must be associated with the control in the accessibility tree so that assistive technologies announce it, click targets are extended to the label text, and voice-control users can say the field's name to focus it.

## Why it matters

An input without a label is a black box. A screen-reader user hears "edit, blank"; a voice-control user has nothing to say to reach it; a sighted user with a cognitive impairment can lose track of which field they are in when the placeholder disappears on focus. WCAG 3.3.2 (Level A) requires labels or instructions; 1.3.1 (Level A) requires that the relationship between label and field be programmatically determinable.

## How to implement

Prefer a visible `<label>` element associated by `for`/`id`:

```html
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">
```

Wrapping the input inside the label works too:

```html
<label>
  Email address
  <input type="email" name="email" autocomplete="email">
</label>
```

When the visual design genuinely cannot show a label (an icon-only search field, for example), use `aria-label` or `aria-labelledby` — but only as a last resort:

```html
<input type="search" aria-label="Search the site">
```

A few hard rules:

- **Placeholder is not a label.** It disappears on focus, has poor contrast by default, and is invisible to many assistive tools.
- **Every checkbox and radio button** needs its own label, and the group needs a name from `<fieldset>`/`<legend>` or `role="group"` with `aria-labelledby`.
- **Required fields** should say so in the label (or in instructions), not only with an asterisk and colour.
- **Hidden labels** (`.visually-hidden`) are acceptable; `display: none` strips them from the accessibility tree.

## Common mistakes

- `<input placeholder="Email">` with no `<label>`.
- A label that sits next to the input but is not associated with it.
- An icon-only button with no `aria-label`.
- Reusing the same `id` for several inputs, so `for` points at the wrong one.
- A `<legend>` that names the form section but no labels on the individual radio buttons.

## Verification

- Tab through the form with a screen reader. Each control must announce a meaningful name.
- Inspect each input in the browser's accessibility panel — the "Name" must be set.
- Run an automated checker; "Missing Form Label" is a standard rule.
---

## hidden-until-found
Source: https://specification.website/spec/accessibility/hidden-until-found/

---
title: "Hidden until found"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/hidden-until-found/
updated: "2026-05-31T17:50:00.000Z"
sources:
  - title: "HTML Standard — The hidden attribute"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#the-hidden-attribute"
    publisher: "WHATWG"
  - title: "CSS Containment Module Level 2 — Using content-visibility: hidden"
    url: "https://www.w3.org/TR/css-contain-2/#using-cv-hidden"
    publisher: "W3C"
  - title: "MDN — hidden global attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden"
    publisher: "MDN"
  - title: "Chrome for Developers — hidden=until-found and the beforematch event"
    url: "https://developer.chrome.com/articles/hidden-until-found"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Hidden until found

> Use hidden="until-found" for collapsible content so that browser find-in-page, assistive tech, and search engines can still reach the text and auto-expand it.

## What it is

`hidden="until-found"` is a value of the global `hidden` attribute defined in the HTML Standard. An element marked this way renders as if hidden — it takes up no visible space — but the browser's find-in-page (Ctrl/Cmd+F), the fragment-directive scroll-to-text, and `scrollIntoView()` still walk through it. When a match is found inside, the browser fires a `beforematch` event on the element, removes the `hidden` attribute, and scrolls the match into view.

The browser's user-agent stylesheet applies `content-visibility: hidden` to elements in the until-found state, and the find-in-page algorithm has a specific exception for that state — when a match would land inside the subtree, it walks the element, removes the `hidden` attribute, and scrolls into view. **Applying `content-visibility: hidden` directly in author CSS does not get you the same behaviour.** Per the CSS Containment specification, contents in that state are skipped from rendering *and* are not visible to screen readers, find-in-page, or other tools. The reachability is a property of the HTML attribute, not the CSS property.

## Why it matters

- `display: none` removes content from the accessibility tree and from find-in-page entirely. Accordion or tab patterns that hide panels with `display: none` are invisible to a user who knows the exact phrase they want.
- Find-in-page is a primary accessibility tool. Keyboard users, screen-reader users, users with cognitive disabilities, and anyone skimming a long document rely on it to locate content directly.
- Search engines and AI crawlers vary in how they treat content hidden with `display: none`. `hidden="until-found"` keeps the text in the DOM and reachable, which is the honest signal: this is real content, just collapsed by default.

## How to implement

Mark each collapsed panel and listen for `beforematch` so your widget state stays in sync:

```html
<button aria-expanded="false" aria-controls="panel-1">Shipping</button>
<div id="panel-1" hidden="until-found">
  We ship worldwide within 48 hours…
</div>
```

```js
const panel = document.getElementById('panel-1');
panel.addEventListener('beforematch', () => {
  const button = document.querySelector('[aria-controls="panel-1"]');
  button.setAttribute('aria-expanded', 'true');
  // remove any matching collapsed class on the button or panel
});
```

**Prefer `<details>/<summary>` where you can.** For the everyday "click a heading to expand a panel" pattern, the native disclosure element gives you focus management, keyboard handling, and find-in-page reachability with zero JavaScript. Reach for `hidden="until-found"` when you need a custom widget that `<details>` cannot model — a search-driven FAQ, a complex tab strip, an off-screen mega-menu that must still be findable.

## Common mistakes

- Using `display: none` on accordion panels and then wondering why users cannot find the content they remember reading. Switch the closed state to `hidden="until-found"`.
- Substituting `content-visibility: hidden` in author CSS as a "CSS equivalent" of the attribute. It is not — author-applied `content-visibility: hidden` hides content from find-in-page and screen readers in exactly the way the attribute is meant to avoid.
- Using `hidden="until-found"` for content that should be permanently hidden — error messages, off-screen utility nodes, suppressed admin tools. Use plain `hidden` or `display: none` instead.
- Forgetting to update `aria-expanded` and the visual chevron state in the `beforematch` handler. The panel opens but the button still claims it is collapsed.
- Treating it as a layout primitive. The element still participates in DOM order and document outline — it is hidden, not removed.

## Verification

- Open the page in Chrome or Edge. Press Ctrl/Cmd+F and search for a phrase that lives inside a collapsed panel. The browser should auto-scroll and reveal it.
- Repeat with a panel that uses `display: none`. The search should fail, confirming the regression you are avoiding.
- Tab through the widget with a screen reader (VoiceOver, NVDA, JAWS) and confirm the panel announces correctly once expanded.
- Inspect the element in DevTools after a match — the `hidden` attribute should be gone, the `beforematch` listener should have fired, and `aria-expanded` should read `true`.
---

## image-alt-text
Source: https://specification.website/spec/accessibility/image-alt-text/

---
title: "Image alt text"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/image-alt-text/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "WCAG 1.1.1 — Non-text Content (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Image Missing Alternative Text"
    url: "https://equalizedigital.com/accessibility-checker/missing-alternative-text/"
    publisher: "Equalize Digital"
  - title: "W3C WAI — Alt Decision Tree"
    url: "https://www.w3.org/WAI/tutorials/images/decision-tree/"
    publisher: "W3C WAI"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Image alt text

> Every <img> element must have an alt attribute. The value describes the image's purpose to screen readers, search engines, and anyone whose image fails to load.

## What it is

The `alt` attribute on `<img>` provides a text alternative for an image. Screen readers announce it, browsers display it when the image fails to load, and crawlers use it to understand the content. An `alt` is required on every `<img>`; the *value* depends on what the image does on the page.

## Why it matters

Images carry meaning. A product photo, a chart, an icon-only button, a decorative flourish — each plays a different role. Without an alt attribute, a screen-reader user hears the file name, or nothing at all, and loses that meaning. WCAG 1.1.1 is a Level A success criterion, which means failing it puts the page below the minimum bar.

## How to implement

Choose the alt value by asking what the image is doing on this page.

**Informative images** — convey content. Describe what is shown, in the context of the surrounding copy.

```html
<img src="bar-chart.png"
     alt="Sales by quarter: Q1 12k, Q2 18k, Q3 22k, Q4 30k.">
```

**Functional images** — act as a link or button. Describe the action, not the picture.

```html
<a href="/cart"><img src="cart.svg" alt="View basket"></a>
```

**Decorative images** — purely visual, add no information. Use an empty alt so assistive tech skips them.

```html
<img src="swirl.svg" alt="">
```

**Complex images** — charts, maps, infographics. Use a short alt plus a longer description nearby (a caption, a paragraph, or a `<figure>`/`<figcaption>` pair).

Two further rules:

- **Don't say "image of"** or "photo of". The screen reader already announces "graphic".
- **Don't use the file name.** "DSC_0142.jpg" is worse than no alt at all because users can't skip past it cleanly.

## Common mistakes

- Missing `alt` attribute entirely (different from `alt=""`).
- Decorative images with descriptive alts that interrupt the reading flow.
- Functional icon-only buttons with `alt=""`, leaving the button nameless.
- Duplicating the adjacent caption verbatim in the alt.
- Stuffing keywords into alt text for SEO.

## Verification

- Run an automated checker — Equalize Digital and axe both flag missing and suspicious alts.
- Disable images in the browser and read the page top to bottom. Does it still make sense?
- Listen to the page with a screen reader; decorative images should be silent.
---

## inert-attribute
Source: https://specification.website/spec/accessibility/inert-attribute/

---
title: "The inert attribute"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/inert-attribute/
updated: "2026-06-26T09:00:00.000Z"
sources:
  - title: "HTML Standard — The inert attribute"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#the-inert-attribute"
    publisher: "WHATWG"
  - title: "ARIA Authoring Practices Guide — Dialog (Modal) Pattern"
    url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    publisher: "W3C"
  - title: "MDN — inert"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# The inert attribute

> When an overlay is open, the content behind it should be unreachable — not just dimmed. The inert attribute removes a subtree from tab order and the accessibility tree at once, replacing fragile focus-trap JavaScript.

## What it is

`inert` is a boolean global attribute that makes an element and all of its descendants non-interactive. An inert subtree cannot receive focus, cannot be clicked, is skipped by the tab order, and is removed from the accessibility tree; in supporting browsers its text is also skipped by find-in-page. It is defined in the WHATWG HTML Standard and has been Baseline across browsers since April 2023.

The canonical use is managing background content. When a modal dialog, slide-out menu, or off-canvas panel is open, everything behind it should be genuinely unreachable — not merely greyed out, but inert to the keyboard and to assistive technology.

## Why it matters

Before `inert`, keeping focus inside an open dialog meant fragile scripting: trapping the Tab key, tracking the first and last focusable element, and toggling `tabindex="-1"` plus `aria-hidden` on every background node — then undoing it all on close. Miss one path and a keyboard user tabs out of the dialog into hidden content they cannot see. That is a focus-order failure (WCAG 2.4.3) and a likely keyboard trap.

`inert` collapses that into one declarative attribute. It removes the subtree from the tab order and the accessibility tree together, so keyboard and screen-reader users get the same boundary the visual design implies.

## How to implement

Mark the container that should become unreachable, and clear it when the content is active again:

```html
<main inert>
  <!-- page content, unreachable while the overlay is open -->
</main>
<div role="dialog" aria-modal="true">
  <!-- focusable overlay content -->
</div>
```

- A modal `<dialog>` opened with `showModal()` makes the rest of the document inert automatically — you do not need to set the attribute yourself. Reach for `inert` on non-`<dialog>` patterns: custom menus, off-screen navigation, multi-step panels.
- Obscure inert content visually (a backdrop or dimming) so sighted users are not confused by content they cannot use. The spec asks authors to do this.
- Toggle it from script as state changes: `el.inert = true`.
- Use `disabled`, not `inert`, to switch off an individual form control.

## Common mistakes

- Using `aria-hidden` alone for background content — it hides from screen readers but leaves elements focusable, so keyboard focus still escapes.
- Marking content inert while leaving it fully visible and undimmed.
- Forgetting to remove `inert` when the overlay closes, stranding the whole page.
- Applying `inert` to the dialog itself instead of to the background.

## Verification

- Open each overlay and press Tab repeatedly: focus must cycle only within the active region and never reach a background control.
- With a screen reader running, background landmarks and headings should not be announced while the overlay is open.
- Use find-in-page — in Chrome and Firefox, text inside an inert subtree is skipped (Safari does not yet honour this, so do not rely on it as the only barrier).
---

## keyboard-navigation
Source: https://specification.website/spec/accessibility/keyboard-navigation/

---
title: "Keyboard navigation"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/keyboard-navigation/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "WCAG 2.1.1 — Keyboard (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html"
    publisher: "W3C"
  - title: "WCAG 2.1.2 — No Keyboard Trap (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html"
    publisher: "W3C"
  - title: "WCAG 2.4.3 — Focus Order (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Keyboard navigation

> Every interactive element on the page must be reachable and operable with a keyboard alone, in a logical order, with no traps that hold focus.

## What it is

Keyboard navigation is the ability to reach and operate every control on a page using only a keyboard — Tab and Shift+Tab to move, Enter and Space to activate, arrow keys inside composite widgets, Escape to dismiss. Many users never touch a mouse: people using switch devices, screen readers, voice control, or just a laptop trackpad they find painful.

## Why it matters

If a control can be clicked but not focused, it does not exist for a large share of disabled users. WCAG 2.1.1 (Level A) requires all functionality to be operable from a keyboard. 2.1.2 (Level A) requires that focus is never trapped — the user must always be able to move on. 2.4.3 (Level A) requires the focus order to preserve meaning and operability.

## How to implement

The cheapest way to get keyboard support right is to use the right HTML element:

```html
<button type="button">Open menu</button>
<a href="/about">About</a>
<input type="checkbox" id="news"><label for="news">Subscribe</label>
```

Native `<button>`, `<a href>`, and form controls are focusable, operable, and announce their role for free. A `<div onclick>` gets none of that.

When you build a custom widget, you must add it back yourself:

- **`tabindex="0"`** to put a non-interactive element into the natural tab order.
- **`tabindex="-1"`** to make an element focusable only by script (useful for moving focus after a dialog opens).
- **Never use positive `tabindex`** — it overrides DOM order and creates surprises.
- **Key handlers** for the keys the role implies (Space and Enter on a button, arrows on a tab list, Escape on a dialog).
- **A visible focus style** so the user can see where they are.

Manage focus on view changes. When a dialog opens, move focus into it and trap it inside until it closes; then return focus to the element that opened it. Single-page navigations should move focus to the main heading of the new view.

## Common mistakes

- Click handlers attached to `<div>` or `<span>` with no role, tabindex, or key handlers.
- Modal dialogs that let Tab leak to the page underneath.
- Custom dropdowns that open on click but cannot be opened or operated from the keyboard.
- Positive `tabindex` values used to "fix" focus order, which then desynchronises with the visual layout.
- Hover-only menus that never receive focus.

## Verification

- Unplug the mouse. Walk through every interactive feature.
- Check that the focus order matches the visual reading order.
- Open every dialog, menu, and dropdown — press Escape and Tab to confirm focus is managed and never trapped.
---

## link-text
Source: https://specification.website/spec/accessibility/link-text/

---
title: "Descriptive link text"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/link-text/
updated: "2026-05-29T10:57:27.000Z"
sources:
  - title: "WCAG 2.4.4 — Link Purpose (In Context) (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html"
    publisher: "W3C"
  - title: "WCAG 2.4.9 — Link Purpose (Link Only) (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-link-only.html"
    publisher: "W3C"
  - title: "Accessibility Checker — Ambiguous Anchor Text"
    url: "https://equalizedigital.com/accessibility-checker/documentation/ambiguous-anchor-text/"
    publisher: "Equalize Digital"
  - title: "WP Accessibility — Content and images: Links"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Descriptive link text

> Every link's text must describe where it goes. 'Click here' and 'read more' fail screen-reader users who scan a page by jumping from link to link.

## What it is

Link text is the visible (or accessible) name of a link — the bit screen readers announce and the bit a sighted user scans for. WCAG 2.4.4 (Level A) requires that the purpose of each link is determinable from the link text together with its immediate context. The stricter 2.4.9 (AAA) requires the link text alone to be enough.

## Why it matters

Screen-reader users routinely call up a list of all links on the page to navigate. If that list is "click here, click here, read more, read more, learn more", the page has no usable structure. Sighted users skim links too — descriptive link text helps everyone. Search engines also use link text as one of the strongest signals of what the target page is about.

## How to implement

Write link text that names the destination or the action:

```html
<!-- Don't -->
<p>To read our refund policy, <a href="/refunds">click here</a>.</p>

<!-- Do -->
<p>Read our <a href="/refunds">refund policy</a>.</p>
```

For repeated "Read more" patterns on a card list, give each link a unique accessible name — the card heading is the easiest source:

```html
<article>
  <h2 id="post-42">How we cut bundle size by 60%</h2>
  <p>…</p>
  <a href="/blog/bundle-size" aria-labelledby="post-42">Read more</a>
</article>
```

Or include the title visually-hidden inside the link:

```html
<a href="/blog/bundle-size">
  Read more
  <span class="visually-hidden"> about cutting bundle size by 60%</span>
</a>
```

Further rules:

- **Don't put the URL in the link text** ("visit https://example.com/very/long/path") — screen readers spell it out character by character.
- **Don't repeat the destination twice** in the same paragraph with two different links.
- **Different link text for different destinations.** Two links named "Documentation" pointing at different pages are a fail.
- **Same link text for the same destination.** Two different names for the same URL is confusing.
- **Indicate file type and language changes** when relevant: "Annual report (PDF, 2.4 MB)".

## Common mistakes

- "Click here", "read more", "learn more", "here", with no context in the link itself.
- Image links with no alt text — the screen reader falls back to the URL.
- Identical link text on every card in a list, with no `aria-label` to disambiguate.
- A long sentence wrapped in `<a>` so the entire paragraph becomes the link text.
- Whitespace-only links produced by CSS background images.

## Verification

- Use a screen reader's link-list shortcut. Every entry should make sense out of context.
- Run an automated checker; "Ambiguous Anchor Text" is a standard rule.
- Read the page through a print stylesheet that lists every link — it should still be navigable.
---

## mobile-form-inputs
Source: https://specification.website/spec/accessibility/mobile-form-inputs/

---
title: "Mobile-friendly form inputs"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/mobile-form-inputs/
updated: "2026-09-19T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — The inputmode attribute"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute"
    publisher: "WHATWG"
  - title: "HTML Living Standard — The enterkeyhint attribute"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-enterkeyhint-attribute"
    publisher: "WHATWG"
  - title: "HTML Living Standard — The autocorrect attribute"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#attr-autocorrect"
    publisher: "WHATWG"
  - title: "MDN — text-size-adjust"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-size-adjust"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Mobile-friendly form inputs

> On a phone, the right input type, inputmode, and enterkeyhint summon the correct on-screen keyboard and a useful Enter key. Keep input text at 16px or larger so iOS Safari doesn't zoom on focus.

## What it is

On a touch device, every text field summons an on-screen keyboard. Four attributes decide which keyboard appears and how forgiving it is — and one CSS rule decides whether focusing the field yanks the whole page into a zoom.

```html
<input type="email" inputmode="email" enterkeyhint="next"
       autocomplete="email" autocapitalize="none" autocorrect="off">
<input type="tel" inputmode="tel" autocomplete="tel">
<input type="search" inputmode="search" enterkeyhint="search">
```

- **`type`** sets semantics, validation, and the default keyboard (`email`, `tel`, `url`, `number`, `search`, `date`…).
- **`inputmode`** tunes the keyboard layout without changing validation — e.g. `numeric` for a one-time code where `type="number"` would wrongly add a spinner and reject leading zeros.
- **`enterkeyhint`** labels the Enter key: `search`, `go`, `next`, `send`, `done`.
- **`autocapitalize` / `autocorrect` / `spellcheck`** stop the keyboard "fixing" emails, usernames, codes, and search queries.

`autocorrect` is the one that looks like a Safari quirk and is not. It began as an Apple extension, and for years setting it did nothing in Chromium, so plenty of codebases carry it as iOS-only defensive clutter — or dropped it as vendor cruft. It is now defined in the HTML Standard and supported by every current engine, Chrome and Edge having shipped it in September 2026. The advice below applies on every platform, not just on iPhones.

## Why it matters

The wrong keyboard turns a one-tap entry into a hunt. A phone number on a full QWERTY keyboard makes the user switch to the numeric layer; a `type="email"` field puts `@` and `.` on the primary keyboard automatically. An Enter key that says **Go** or **Search** tells the user the form will submit, instead of leaving them guessing whether Return inserts a newline.

These attributes also help beyond mobile. Correct `type` and `autocomplete` let every platform's password manager and autofill recognise the field, which reduces typos and abandoned forms — a measurable benefit for users with motor or cognitive disabilities, and the reason [form labels](/spec/accessibility/form-labels/) and `autocomplete` tokens matter for WCAG 1.3.5.

**The 16px rule:** iOS Safari automatically zooms in when the user focuses an `<input>`, `<select>`, or `<textarea>` whose font is smaller than 16px, then leaves the page scrolled awkwardly. Set form-control text to at least 16px (`1rem`) and the zoom never fires. Never reach for `maximum-scale=1` to suppress it — that disables pinch-zoom for everyone and fails WCAG 1.4.4 (see [meta viewport](/spec/foundations/meta-viewport/)).

## How to implement

- Pick the most specific `type` first; reach for `inputmode` only to refine the keyboard (`numeric`, `decimal`) when the type is wrong for the data.
- Add `enterkeyhint` where the Enter action isn't obvious.
- Turn off `autocapitalize`/`autocorrect` on emails, usernames, codes, and search.
- Give every control a real [label](/spec/accessibility/form-labels/) and an `autocomplete` token.
- Set input font-size to 16px or larger.

This site ships it: the search box (the ⌘K overlay and `/search/`) carries `inputmode="search"`, `enterkeyhint="search"`, and autocapitalise/autocorrect off, at a font size above 16px so iOS doesn't zoom on focus. (It stays `type="text"` only because the search component already renders its own clear button — `type="search"` would stack a second, native one on top.)

## Common mistakes

- `type="number"` for phone numbers, PINs, or card numbers. It strips leading zeros and adds a spinner. Use `type="tel"` or `inputmode="numeric"`.
- Sub-16px input fonts, then "fixing" the resulting zoom by disabling user scaling.
- Leaving autocapitalisation on for an email field, so the keyboard capitalises the first letter.

## Verification

- Focus each field on a real phone and confirm the keyboard layout and Enter-key label match the data.
- Focus a field on iOS Safari; the page must not zoom. If it does, the font is below 16px.
---

## native-interactive-elements
Source: https://specification.website/spec/accessibility/native-interactive-elements/

---
title: "Native interactive elements"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/native-interactive-elements/
updated: "2026-07-08T00:00:00.000Z"
sources:
  - title: "WHATWG HTML — The details element"
    url: "https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element"
    publisher: "WHATWG"
  - title: "WHATWG HTML — The dialog element"
    url: "https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element"
    publisher: "WHATWG"
  - title: "MDN — <dialog>"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog"
    publisher: "MDN"
  - title: "WAI-ARIA Authoring Practices"
    url: "https://www.w3.org/WAI/ARIA/apg/"
    publisher: "W3C WAI"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Native interactive elements

> Prefer native HTML interactive elements — <button>, <a>, <details>/<summary>, <dialog> — over divs with click handlers. You get keyboard support, focus management, and assistive-tech semantics for free.

## What it is

HTML ships a small set of interactive primitives — `<button>`, `<a href>`, `<details>`/`<summary>`, `<dialog>` — that come pre-wired with keyboard handling, focus management, ARIA roles, and browser behaviours. Reach for those first; reach for `<div role="button" tabindex="0">` only when the platform genuinely has no element for what you are building. The broader principle of "use the right tag" lives on [Semantic HTML](/spec/accessibility/semantic-html/); this page is about the interactive ones specifically.

## Why it matters

Replacing `<div onclick>` with `<button>` is not cosmetic. The native element gives you, with zero code:

- **Keyboard semantics.** `<button>` activates on ENTER and SPACE. `<a>` activates on ENTER. `<dialog>` closes on ESC. `<details>` toggles on ENTER or SPACE when `<summary>` has focus. Tab order is correct by default.
- **Focus management.** `<dialog>` traps focus inside the modal while open, returns focus to the opener on close, and renders in the top layer above other content.
- **Assistive-tech announcement.** Screen readers expose the right role ("button", "link", "dialog", "disclosure") and state ("expanded", "modal") without an `aria-*` attribute in sight.
- **Browser plumbing.** Open `<details>` state survives back/forward navigation. `<a>` populates history, supports middle-click and "open in new tab", honours `target` and `rel`.
- **Free maintenance.** Every browser ships fixes and refinements (animatable `<details>`, `::backdrop`, ESC-dismiss policy) without you changing a line.

Re-implement any of this in JavaScript and you have signed up to maintain it forever, with bugs.

## How to implement

**Disclosure / FAQ / accordion** — `<details>` and `<summary>`:

```html
<details>
  <summary>What is the return policy?</summary>
  <p>Returns are accepted within 30 days of delivery.</p>
</details>
```

Animate with modern CSS — no JavaScript needed:

```css
details::details-content {
  block-size: 0;
  overflow: hidden;
  transition: block-size 200ms, content-visibility 200ms allow-discrete;
  interpolate-size: allow-keywords;
}
details[open]::details-content { block-size: auto; }
```

**Single-open accordion** — give a group of sibling `<details>` the same `name` and the browser enforces that only one is open at a time, closing the others as each opens. No JavaScript, and every panel keeps its native keyboard activation, focus order, and disclosure semantics:

```html
<details name="faq">
  <summary>How do refunds work?</summary>
  <p>Refunds are issued to the original payment method within five days.</p>
</details>
<details name="faq">
  <summary>Can I change my plan later?</summary>
  <p>Yes — upgrade or downgrade at any time from your account settings.</p>
</details>
```

A shared `name` turns a stack of disclosures into an exclusive accordion — the most common accordion pattern — without the `role`, `aria-expanded`, and roving-focus bookkeeping a scripted version has to reimplement and keep correct.

**Modal dialog** — `<dialog>` with `showModal()`:

```html
<dialog id="confirm">
  <form method="dialog">
    <p>Delete this entry?</p>
    <button value="cancel">Cancel</button>
    <button value="confirm">Delete</button>
  </form>
</dialog>

<button type="button" onclick="confirm.showModal()">Delete</button>
```

`showModal()` opens it modally — focus is trapped, ESC dismisses, `::backdrop` styles the dim layer. Use `show()` for non-modal. For transient, non-blocking overlays (menus, tooltips, toasts) use the [Popover API](/spec/foundations/popover-api/) instead.

**Buttons and links.** A `<button>` does something on the current page; an `<a href>` goes somewhere. Inside a `<form>`, always set `type="button"` on buttons that are not the submit:

```html
<button type="button" onclick="reset()">Reset</button>
```

## Common mistakes

- **`<div onclick>` as a button.** No keyboard activation, no focus, no accessible name, no role.
- **`<a href="#" onclick>` as a button.** Pollutes browser history, breaks middle-click and "open in new tab", and announces as a link in screen readers.
- **Rebuilding `<details>` in JavaScript "to control the animation".** Modern CSS — `interpolate-size`, `transition-behavior: allow-discrete`, `::details-content` — animates the native element.
- **Scripting a single-open accordion.** Give sibling `<details>` the same `name` and the browser handles mutual exclusion for you, with correct disclosure semantics on every panel.
- **Using `<dialog>` for transient, non-blocking UI.** Reserve `<dialog>` for modal flows that require a decision. For menus, popovers, and toasts, use the [Popover API](/spec/foundations/popover-api/).
- **Forgetting `type="button"` inside a `<form>`.** A bare `<button>` defaults to `type="submit"` and submits the form on click.

## Verification

- Tab through the page. Every interactive thing must be reachable, in a sensible order, with a visible focus ring.
- Open Chrome DevTools → Elements → Accessibility tree. Confirm `details`, `dialog`, and `button` are exposed with the correct roles and states.
- Activate `<details>`, `<button>`, and `<dialog>` triggers using only the keyboard (ENTER, SPACE, ESC).
- In VoiceOver, open the Web Item Rotor — disclosure widgets and dialogs appear with the right labels.
- Search the codebase for `role="button"` and `onclick` on non-button elements. Each hit is a candidate for replacement.
---

## reduced-motion
Source: https://specification.website/spec/accessibility/reduced-motion/

---
title: "Reduced motion"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/reduced-motion/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "WCAG 2.3.3 — Animation from Interactions (Level AAA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html"
    publisher: "W3C"
  - title: "WCAG 2.2.2 — Pause, Stop, Hide (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html"
    publisher: "W3C"
  - title: "MDN — prefers-reduced-motion"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion"
    publisher: "MDN"
  - title: "WP Accessibility"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
  - title: "web.dev — prefers-reduced-motion: Sometimes less movement is more"
    url: "https://web.dev/articles/prefers-reduced-motion"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Reduced motion

> Respect the user's `prefers-reduced-motion` setting. Decorative animation, parallax, and autoplay can trigger vestibular distress, migraines, and seizures.

## What it is

Some users have signalled at the operating-system level that they want motion on screen reduced. The browser exposes that signal through the `prefers-reduced-motion` media query. When the value is `reduce`, the user is asking you to remove or shorten non-essential animation.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Why it matters

Uncontrolled motion is not a taste issue. It causes real harm:

- **Vestibular disorders.** Parallax, zooming transitions, and long slide-ins can trigger nausea, dizziness, and disorientation that lasts for hours.
- **Migraine and photosensitivity.** Looping background video and flashing transitions are common triggers.
- **Seizure risk.** Anything flashing more than three times per second is a WCAG Level A failure (2.3.1).

WCAG 2.2.2 Pause, Stop, Hide (Level A) requires that any moving, blinking, scrolling, or auto-updating content lasting more than five seconds can be paused or stopped. WCAG 2.3.3 (Level AAA) goes further: motion triggered by interaction must be disableable unless essential to the function.

## How to implement

Cover both CSS animations and JavaScript-driven motion.

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduce.matches) {
  startCarousel();
}
reduce.addEventListener('change', (e) => {
  e.matches ? stopCarousel() : startCarousel();
});
```

Apply the same logic to native media:

```html
<video autoplay muted loop playsinline>...</video>
```

Autoplaying background video should be gated on `prefers-reduced-motion: no-preference`, or shipped as a static poster image by default.

Distinguish decorative motion from meaningful motion. A spinner that says "loading" still needs to communicate; replace the spin with a static "Loading…" label or a very slow pulse. A tutorial transition that shows where a panel came from can be shortened to a fade rather than removed.

The worst offenders to audit first:

- Parallax scrolling.
- Large zoom or slide-in transitions on scroll.
- Autoplay carousels and sliders.
- Looping background video.
- Confetti, particle effects, and infinite marquees.

Browser support is universal across Chrome, Edge, Safari, and Firefox.

## Common mistakes

- Treating reduced motion as optional polish. It is a required accessibility behaviour.
- Removing transitions but leaving autoplay video running.
- Hiding the pause control behind a hover state on a touch device.
- Animating in JavaScript with no `matchMedia` check, so CSS overrides do nothing.

## Verification

- In macOS System Settings, enable **Accessibility → Display → Reduce motion**. Reload the page. Decorative animation should stop.
- In Chrome DevTools, open the command menu and run **Emulate CSS prefers-reduced-motion: reduce**.
- Confirm any motion longer than five seconds has a visible pause, stop, or hide control (WCAG 2.2.2).
- Confirm no content flashes more than three times in any one-second window.
---

## redundant-entry
Source: https://specification.website/spec/accessibility/redundant-entry/

---
title: "Redundant entry"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/redundant-entry/
updated: "2026-06-18T00:00:00.000Z"
sources:
  - title: "WCAG 3.3.7 — Redundant Entry (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html"
    publisher: "W3C"
  - title: "WCAG 2.2 Recommendation"
    url: "https://www.w3.org/TR/WCAG22/#redundant-entry"
    publisher: "W3C"
  - title: "MDN — HTML autocomplete attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Redundant entry

> Don't make people re-type information they already gave you in the same process. Auto-populate it, or let them pick it from what they entered a step ago.

## What it is

**Redundant Entry** is WCAG 2.2 Success Criterion 3.3.7, at **Level A** — the baseline conformance level. The rule is short: when information has already been entered by, or provided to, the user earlier in the **same process**, and that information is asked for again, it must be either **auto-populated** or **available for the user to select** rather than typed out a second time.

Three exceptions are spelled out: re-entry is genuinely **essential** (e.g. a memory test that is the point of the step), the information is **required for security** (re-typing a password to confirm it), or the previously entered information is **no longer valid**.

## Why it matters

A checkout, a multi-step signup, or a booking flow that asks for the same address, name, or email twice forces the user to either remember exactly what they typed two screens ago or scroll back to check. For people with **short-term and working-memory limitations**, that recall is a real barrier — the same cognitive-load problem that [accessible authentication](/spec/accessibility/accessible-authentication/) addresses at the login gate. It also punishes anyone entering text slowly: people with motor impairments, people on small touch keyboards, and people using switch or voice input all pay the re-typing cost twice. Every redundant field is another chance to introduce a mismatch and fail validation.

## How to implement

- **Carry data forward.** Once a value is captured in a process, store it in session state and pre-fill any later field that needs it. "Billing address same as shipping" — checked by default where sensible — is the canonical pattern.
- **Offer a selection, not a blank box.** Where auto-fill isn't appropriate, let the user pick the earlier value from a list or summary instead of re-keying it.
- **Lean on the platform.** Mark fields with the correct [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) tokens (`email`, `name`, `street-address`, `postal-code`) so the browser can fill repeated fields itself.
- **Confirm, then reuse.** On review screens, display the captured values back rather than presenting empty inputs to fill again.

## Common mistakes

- A two-step form that asks for an email address on page one and again on page three.
- "Confirm email" fields used for plain data entry (not a security confirmation) with no copy or carry-forward.
- A separate billing-address block with no "same as shipping" option.
- Wiping previously entered fields after a validation error elsewhere on the form.

## Verification

- Walk a multi-step flow end to end and note any value you are asked to type more than once.
- For each repeat, confirm it is auto-populated, selectable, or falls under the essential/security/expired exception.
- Trigger a validation error late in the flow and check that earlier entries survive.
---

## semantic-html
Source: https://specification.website/spec/accessibility/semantic-html/

---
title: "Semantic HTML and landmarks"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/semantic-html/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "WCAG 1.3.1 — Info and Relationships (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html"
    publisher: "W3C"
  - title: "MDN — HTML elements reference"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements"
    publisher: "MDN"
  - title: "W3C WAI — ARIA Landmarks"
    url: "https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/"
    publisher: "W3C WAI"
  - title: "WP Accessibility — Frontend code"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Semantic HTML and landmarks

> Use the right HTML element for the job. Landmarks like <header>, <nav>, <main>, and <footer> let assistive technologies announce structure and skip between regions.

## What it is

Semantic HTML is the practice of using the element whose name matches its meaning — a heading is `<h1>` to `<h6>`, a list is `<ul>` or `<ol>`, a button is `<button>`, a navigation block is `<nav>`. Landmarks are the small set of elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>` with a name, `<form>` with a name, `<search>`) that screen readers expose as a skippable region list.

## Why it matters

Assistive technology builds its model of the page from the tags. A screen-reader user presses a key to jump from heading to heading, from landmark to landmark, from form to form. None of that works on a page made of `<div>` soup. WCAG 1.3.1 (Level A) requires that information, structure, and relationships conveyed visually are also available programmatically — which in practice means using the right element.

## How to implement

A typical page skeleton:

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header>
    <a href="/" aria-label="Home">…logo…</a>
    <nav aria-label="Primary">
      <ul><li><a href="/about">About</a></li>…</ul>
    </nav>
  </header>

  <main id="main">
    <article>
      <h1>Page title</h1>
      <p>…</p>
      <h2>Section heading</h2>
      <p>…</p>
    </article>

    <aside aria-labelledby="related">
      <h2 id="related">Related</h2>
      …
    </aside>
  </main>

  <footer>
    <nav aria-label="Footer"><ul>…</ul></nav>
  </footer>
</body>
```

Key rules:

- **Exactly one `<main>` per page.** Two mains break the landmark list.
- **Name every duplicate landmark** with `aria-label` or `aria-labelledby`. A page with two `<nav>` blocks needs each one named ("Primary", "Footer", "In page").
- **Headings form an outline.** Use one `<h1>`, then `<h2>` for sections, `<h3>` for sub-sections. Do not skip levels.
- **Lists are lists.** Wrap navigation items in `<ul>`; screen readers announce "list, six items".
- **ARIA roles only when no semantic equivalent exists.** Prefer `<nav>` over `role="navigation"`.

## Common mistakes

- A whole page of `<div>` and `<span>`, with no landmarks at all.
- Two `<main>` elements, or no `<main>`.
- Multiple unnamed `<nav>` elements — the landmark list shows "navigation, navigation, navigation".
- Headings used for size rather than structure (`<h4>` because "I wanted it smaller").
- A `<button>` that is actually a `<div role="button" onclick>` with no keyboard support.

## Verification

- Open the accessibility tree in the browser devtools and look at the landmark list.
- Use a screen reader's landmark and heading shortcuts to navigate the page.
- Run an automated checker; missing landmarks and skipped heading levels are standard rules.
---

## skip-links
Source: https://specification.website/spec/accessibility/skip-links/

---
title: "Skip links"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/skip-links/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "WCAG 2.4.1 — Bypass Blocks (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html"
    publisher: "W3C"
  - title: "W3C WAI — Skip Links"
    url: "https://www.w3.org/WAI/WCAG22/Techniques/general/G1"
    publisher: "W3C WAI"
  - title: "WebAIM — Skip Navigation Links"
    url: "https://webaim.org/techniques/skipnav/"
    publisher: "WebAIM"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Skip links

> A 'skip to main content' link as the first focusable element lets keyboard and screen-reader users jump past repeated navigation on every page.

## What it is

A skip link is an in-page anchor — usually the first focusable element in `<body>` — that jumps to the start of the main content. It is hidden until it receives focus, so it stays out of the sighted user's way but is the first thing a keyboard or screen-reader user hits.

## Why it matters

Every page on a site usually starts with the same header, navigation, search box, and notification bar. Without a skip link, a keyboard user tabs through twenty controls before reaching the article they came for, on every single page. Screen-reader users have heading and landmark shortcuts, but switch-device and Tab-only users have nothing. WCAG 2.4.1 (Level A) requires a mechanism to bypass blocks of repeated content; a skip link is the most widely supported way to satisfy it.

## How to implement

Put the link first in the document order and target the main content container:

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header>…</header>
  <nav>…</nav>
  <main id="main" tabindex="-1">
    <!-- page content -->
  </main>
</body>
```

Style it so it is invisible by default and visible on focus:

```css
.skip-link {
  position: absolute;
  inset-inline-start: 1rem;
  inset-block-start: -3rem;
  background: #000;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  z-index: 1000;
  transition: inset-block-start 0.15s;
}

.skip-link:focus {
  inset-block-start: 1rem;
}
```

Notes:

- **Use `display: none` is wrong.** It removes the link from the accessibility tree. Use offscreen positioning instead.
- **`tabindex="-1"`** on `<main>` ensures focus actually moves to it when the link is followed; some browsers otherwise just scroll the page.
- **One link is usually enough.** A second link to the navigation is fine if the nav is also long.
- **Keep the text plain.** "Skip to main content" is well understood.

## Common mistakes

- Skip link present but never visible on focus (no `:focus` style).
- Skip link points to a `<div>` with no `id`, or the target has been renamed.
- Skip link hidden with `display: none`, so it never receives focus.
- Decorative banners or cookie modals sit between the skip link and the main content and steal focus.

## Verification

- Load the page and press Tab once. The skip link must appear.
- Press Enter. Focus must move into the main content, not just scroll the page.
- Confirm the link is reachable on every template, not only on the homepage.
---

## status-messages
Source: https://specification.website/spec/accessibility/status-messages/

---
title: "Status messages"
category: accessibility
status: recommended
url: https://specification.website/spec/accessibility/status-messages/
updated: "2026-09-25T00:00:00.000Z"
sources:
  - title: "WCAG 4.1.3 — Status Messages (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html"
    publisher: "W3C"
  - title: "Accessible Rich Internet Applications (WAI-ARIA) 1.2 — Live region roles"
    url: "https://www.w3.org/TR/wai-aria-1.2/#live_region_roles"
    publisher: "W3C"
  - title: "WAI-ARIA 1.3 — Interface Mixin ARIANotifyMixin"
    url: "https://www.w3.org/TR/wai-aria-1.3/#ARIANotifyMixin"
    publisher: "W3C"
  - title: "MDN — Element: ariaNotify() method"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaNotify"
    publisher: "MDN"
  - title: "MDN — ARIA live regions"
    url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Status messages

> When something succeeds, fails or changes without moving focus — a result count, a saved confirmation, a progress update — assistive technology has to be told. Expose it through a live region, or announce it with ariaNotify().

## What it is

A status message tells the user the outcome of something they did, or the state of something the page is doing, without taking focus. "3 results." "Saved." "Added to basket." "Uploading, 40%." WCAG 4.1.3 (Level AA) requires these to be programmatically determinable through role or properties, so assistive technology can present them without the user having to go looking.

The word "status" is doing precise work here. A message that takes focus is not a status message — it is a dialog or an error summary, and it announces itself by being focused. A status message is the opposite case: the page changes somewhere the user is not, and the change still has to reach them.

Two mechanisms exist, and they are not alternatives so much as different shapes. A **live region** is an element whose content changes are watched: mark it with `role="status"`, `role="alert"`, `role="log"` or an `aria-live` value, and the accessibility tree reports what appears inside it. **`ariaNotify()`** is a method call — `element.ariaNotify("Saved")` — that queues a string for the screen reader with no DOM counterpart at all.

The belief worth correcting: **adding `aria-live` and the text in the same operation announces nothing.** A live region is only live once it is in the accessibility tree; the browser announces changes it observes *after* that point. Insert `<div role="status">3 results</div>` into the page and most screen readers say nothing, because there was no region to change. The container has to be there first, empty, and the text goes in later. This single mechanical detail accounts for most live regions that "don't work".

## Why it matters

Filter a product list and a sighted user catches "24 items" in their peripheral vision without breaking stride. A screen-reader user whose focus is still in the filter control hears silence — and silence is ambiguous. Did the filter apply? Is it still loading? Did it find nothing? The usual response is to go hunting through the page to find out, which costs far more than the sentence would have.

The same gap opens everywhere a page reports back without moving focus: search result counts, autosave confirmations, items added to a basket, character counters, "copied to clipboard", background upload progress, a form that submitted successfully. None of these are errors, so none of them get the attention that error handling gets — and all of them leave a user guessing.

## How to implement

Pick the role by what the message is, not by how much you want it heard:

- **`role="status"`** — polite. The outcome of an action or a state change that is not urgent. This is the right default.
- **`role="alert"`** — assertive. It interrupts whatever the screen reader is saying. Reserve it for errors and genuinely time-critical information.
- **`role="log"`** — a sequence where order matters and new entries are appended, such as a chat transcript.

Render the container in the initial HTML, empty, and write into it afterwards:

```html
<!-- Present from first paint. -->
<p id="search-status" role="status"></p>
```

```js
document.getElementById("search-status").textContent = `${count} results`;
```

For an announcement with no visible counterpart, or one that has to fire without any DOM change, call `ariaNotify()`:

```js
button.ariaNotify("Link copied to clipboard", { priority: "normal" });
```

`ariaNotify()` reached Baseline Newly available in September 2026 (Chrome 141, Firefox 150, Safari 27). A few properties of it are worth knowing before you reach for it:

- `priority: "normal"` maps roughly to `aria-live="polite"`, `priority: "high"` to `assertive` — but live-region announcements take priority over both.
- Only the most recent announcement is reliably spoken. Combine several into one string rather than making several calls.
- The voice is chosen from the element's `lang` attribute, or the nearest ancestor's — another reason the [document language](/spec/accessibility/document-language/) has to be right.
- Usage can be switched off by the `aria-notify` directive in a [Permissions-Policy](/spec/security/permissions-policy/) header, in which case calls silently do nothing.
- Nothing about it is visible. If the information matters, it still has to appear on screen for everyone else.

Whichever mechanism you use, keep the message to one idea, phrase it as the user's outcome rather than the system's ("Saved", not "PUT 200"), and do not move focus to deliver it.

## Common mistakes

- Inserting the live region and its text together, so there is no change to observe.
- Hiding a live region with `display: none` or `visibility: hidden`, which removes it from the accessibility tree entirely. Use a visually-hidden class that keeps the element rendered.
- `role="alert"` on everything, so every routine confirmation interrupts the user mid-sentence.
- Announcing on each keystroke instead of debouncing to the settled result.
- Re-rendering a whole region when one line changed, so the screen reader reads the lot.
- Using `ariaNotify()` as the only channel, leaving sighted users with no confirmation at all.

## Verification

- Turn on a screen reader, perform the action, and keep focus where it was. You should hear the message without moving.
- Inspect the initial HTML: the live-region container must be present before the first update.
- Check the accessibility tree in DevTools — a region that is `display: none` will not be in it.
- Trigger several updates in quick succession and confirm the result is one useful sentence, not a pile-up.
---

## touch-target-size
Source: https://specification.website/spec/accessibility/touch-target-size/

---
title: "Touch target size"
category: accessibility
status: required
url: https://specification.website/spec/accessibility/touch-target-size/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "WCAG 2.5.8 — Target Size (Minimum) Level AA"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html"
    publisher: "W3C"
  - title: "WCAG 2.5.5 — Target Size (Enhanced) Level AAA"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html"
    publisher: "W3C"
  - title: "MDN — pointer (media feature)"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer"
    publisher: "MDN"
  - title: "Human Interface Guidelines — Layout"
    url: "https://developer.apple.com/design/human-interface-guidelines/layout"
    publisher: "Apple"
  - title: "Material Design — Accessibility: Layout and typography"
    url: "https://m2.material.io/design/usability/accessibility.html#layout-and-typography"
    publisher: "Google"
  - title: "WP Accessibility"
    url: "https://wpaccessibility.org/"
    publisher: "WP Accessibility"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Touch target size

> Interactive controls must be large enough to tap or click reliably. WCAG 2.2 sets a 24×24 CSS px minimum, with 44×44 CSS px as the enhanced target.

## What it is

A touch target is the area a user can tap, click, or otherwise activate to trigger a control — a button, a link, a checkbox, an icon. The target is not just the visible glyph; it is the full hit area the browser registers as activating the control.

WCAG 2.2 introduced a new Level AA success criterion, **2.5.8 Target Size (Minimum)**, that requires interactive targets to be at least **24×24 CSS pixels**. The older Level AAA criterion, **2.5.5 Target Size (Enhanced)**, asks for **44×44 CSS pixels**. Apple's Human Interface Guidelines recommend **44pt**, and Material Design recommends **48dp**.

## Why it matters

Small targets are easy to miss. That penalises:

- Users with motor impairments — Parkinson's, tremors, arthritis, limited fine-motor control.
- Users on small phones, or holding a phone one-handed on a commute.
- Older users, whose pointing precision declines with age.
- Anyone tapping while walking, in a moving vehicle, or wearing gloves.

Mis-taps are not just annoying. They can submit the wrong form, open the wrong link, or trigger destructive actions like "delete".

## How to implement

Set a minimum size on every interactive element:

```css
button,
a.button,
[role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

For icon-only buttons that must look small, expand the hit area with padding rather than shrinking the target:

```css
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 10px; /* hit area extends past the 24px icon */
  background: transparent;
  border: 0;
}
```

```html
<button class="icon-button" aria-label="Close dialog">
  <svg width="24" height="24" aria-hidden="true">…</svg>
</button>
```

If a target genuinely must be smaller than 24 CSS px — for example, a dense data table — WCAG 2.5.8 allows it as long as a **24 px diameter circle around the target's centre does not overlap any other target**. The spacing alone satisfies the criterion.

**Inline links inside running prose are exempt** from both criteria. A link in a sentence is sized by the line-height of the paragraph, and forcing 44 px around each one would wreck typography.

## Adapt to the pointer

A mouse is precise; a fingertip is roughly 8–10 mm of imprecision. You can detect which the visitor is using and reserve the larger targets for touch, rather than forcing 44 px everywhere. The `pointer` and `hover` media features describe the *primary* input; `any-pointer` and `any-hover` describe whether *any* available input matches.

```css
/* Touch / stylus as the primary pointer: enlarge tap targets. */
@media (pointer: coarse) {
  .toolbar button { min-height: 44px; min-width: 44px; }
}

/* No reliable hover (most touchscreens): don't hide controls behind :hover. */
@media (hover: none) {
  .card-actions { opacity: 1; }
}
```

Two cautions. Treat this as *progressive enhancement* on top of a baseline that is already accessible — 24 px is the floor for every pointer, so never use `pointer: fine` as an excuse to ship sub-24-px controls to mouse users. And remember many devices have both a touchscreen and a trackpad; when a control must work for the coarsest available input, test with `any-pointer: coarse` rather than `pointer: coarse`.

## Common mistakes

- Setting `font-size` but no `min-height` on a button, so its hit area collapses on short labels.
- Tiny close (×) icons in dialogs and toasts, 16 px or less, with no padding.
- Stacking small icon buttons (share, like, bookmark) directly next to each other with no spacing.
- Wrapping a small icon in a link without giving the `<a>` a block-level layout — the link only hits the glyph.
- Removing `padding` "to make the design tighter" and shipping a button you can only tap with a stylus.

## Verification

- Inspect the element in DevTools. Read the computed `width` and `height` (or the bounding box). Both must be at least 24 CSS px; aim for 44.
- On a real phone, try tapping every primary control with a thumb, one-handed. If you miss, it is too small.
- Run axe DevTools or Lighthouse — both flag WCAG 2.5.8 failures.
- For dense UIs, draw a 24 px circle around each target's centre and check no two circles overlap.
---

