---
name: antislop-copy
description: Cut human-facing copy to what its intended reader needs, using natural language without inventing facts; use for websites, READMEs, and other prose the user asks to shorten, rewrite, or de-slop.
---

# Antislop Copy

Give the intended human reader the shortest natural version that lets them understand, choose, or use the product. Delete whole sections before polishing sentences. A true fact still has to earn the reader's attention. Do not keep information merely because it helps the agent understand the project.

## When to Use

Apply to human-facing websites, READMEs, product descriptions, FAQs, release posts, and similar copy. Use for new copy from supplied facts, rewrites, and copy audits. Explicit invocation applies to the material the user supplies, including technical prose; do not refuse or skip it because of its filename or category. The user's requested audience, scope, tone, and deliverable take precedence over this skill's defaults.

Read the supplied copy and relevant source material, including its buttons, captions, and footnotes. Do not crawl the whole site by default. Change prose within the authorized scope; do not add design, layout, routing, installation, or publishing work.

## Write for the actual reader

Identify who will read the result and what they came to do. Infer that from the request and product; ask only when a material audience choice remains unclear. The agent editing the document is not its audience.

Adapt these questions to that reader's task: What is it? Is it for me? Will it work for me? What does it cost? Why should I believe it? How do I start? Keep only the answers needed here, not a section for every question.

Keep consequential compatibility, requirements, billing, limits, data handling, and cancellation conditions. Then retain the distinguishing capabilities or proof that affect the reader's decision. Neither a true statement nor a standard feature deserves space automatically.

For an end-user README, keep the product definition, relevant requirements, and shortest usable getting-started path. Remove agent workflows, implementation inventories, contributor procedures, and explanations of how the repository is organized unless these readers need them. Agent instructions belong in `AGENTS.md`; do not create or move material into another document unless asked.

Developers can be the product's human users. A library, SDK, or CLI README may need an installation command, a working example, and essential API constraints. Keep those when they enable the requested use; cut internal scaffolding. If an essential answer is missing, report that gap without inventing it.

## Cut before rewriting

1. Remove sections that repeat another section, answer no relevant reader question, or merely fill a layout slot. Do not preserve a section or feature card merely because the source has one.
2. Rank remaining information by consequence to the reader. Cut background, internal detail, and low-value facts along with filler. Preserve conditions needed to make the retained claims accurate and the product usable.
3. Test each sentence: does this reader need it to understand the product, decide whether it fits, or take their next step? If not, cut it. Keep evidence only when it supplies a concrete reason to trust a decision-relevant claim.
4. Join surviving facts into plain sentences. Build headings from the section's actual subject, without adding an implied promise or limit.

Prefer compact heroes, short feature descriptions, direct FAQ answers, and descriptive buttons such as "Download for Mac." Do not enforce card counts, sentence limits, or percentage cuts at the expense of useful information. Never pad to meet a target.

For pricing, retain plan, price, billing period, included capabilities, limits, trial duration and conversion terms, and cancellation information. For titles and meta descriptions, prioritize the page's subject and a supported distinguishing fact; use requested or existing length limits without distorting meaning.

## Remove rhetorical filler

Match meaning rather than keywords. Cut these when they add no needed information:

- Repeated benefits, including paraphrases of an already explained mechanism.
- Beliefs, mission declarations, founder legends, and scenarios presented instead of useful product facts. Keep concrete policies that change what the visitor receives.
- Self-praise and unmeasured quality words such as seamless, powerful, robust, intuitive, world-class, and blazing-fast. Keep a central product claim only in its supported form; flag missing support rather than inventing a measurement.
- Slogan headings and tails, "not just X, it's Y," rhetorical prompts, UI narration such as "Explore below," and "Ready to get started?" closers. Genuine FAQ questions stay.
- Decorative counted headings, colon reveals such as "The result:", and new taglines substituted for deleted copy. Keep at most one brand line per page, in the hero with a plain product definition beside it.
- Command references, flags, and configuration detail the intended reader does not need. Keep a necessary setup command or working example; link to existing fuller documentation where useful.
- Redundant links. Keep distinct destinations or actions readers actually need.

Stop when the facts end. Do not manufacture a closer.

## Protect factual meaning

Accuracy takes priority over every cut and style preference.

- Add no facts, numbers, names, history, customers, quotes, or claims. Combining two supported statements must not imply an unsupported causal, comparative, or universal claim.
- Keep qualifiers, scope, status, attribution, units, and conditions. Preserve "on macOS," "beta," and "most of the 40 customers we interviewed" when their removal would broaden a claim. Check headings and separated sentences independently.
- Preserve compatibility, pricing, support, data-handling, and cancellation details consequential to the reader's decision or use. Do not turn limited security evidence into an absolute guarantee.
- Leave prices, legal text, quoted words, link destinations, code, and identifiers unchanged unless the task authorizes their alteration. A whole quotation may be omitted if it is not material; do not silently edit its words.
- Update editorial counts when the edited list changes. "Three reasons" can become two reasons. "Supports 8 integrations" is a product fact, not a count to change because only five are displayed.
- Do not choose silently between conflicting source values. Preserve the uncertainty and flag it in the handoff; ask for the authoritative value if a clean rewrite depends on it. Do not insert verification markers into live copy unless an annotated draft was requested.
- Flag unsupported competitor, platform-policy, certification, or security claims when relevant. Do not strengthen them or imply external verification you did not perform.
- Consumer release posts retain user-visible changes, consequential fixes, and compatibility or security notices. Omit internal development churn. Keep all entries when the user requests a complete changelog; shorten a vague bug-fix entry to "plus bug fixes" when appropriate.

## Keep prose natural

Keep articles, verbs, and connectors. Avoid rhythmic runs of fragments such as "Fast. Simple. Secure." A heading may be short, but must remain clear and accurate on its own.

Preserve the author's perspective: a solo maker's "I," a company's "we," and the reader's "you." Do not replace it with distancing phrases such as "the team." Avoid starting every sentence with the product name. Use natural contractions and avoid em dashes in authored prose; protected quotations remain unchanged.

For multiple pages, keep facts consistent and flag mismatches. Each page must work for someone arriving from search, so a brief product definition may repeat. Put a full explanation on its most relevant page and link from others where that suits their purpose; do not remove necessary standalone answers.

## Compact examples

These examples use synthetic facts.

**Keep the README useful to its reader:** "Shelf reads EPUB files on Linux. Download the AppImage and open it. Development uses three review agents" becomes "Shelf reads EPUB files on Linux. Download the AppImage and open it."

**Keep attribution or remove the claim:** "Most of the 40 freelancers we interviewed told us they lose a day monthly chasing payments. Tallyfox sends automatic payment reminders" must not become "Freelancers lose a day monthly chasing payments." If only the product action matters, keep "Tallyfox sends automatic payment reminders."

**Keep actual release changes:** "We've reimagined recurring invoices with custom schedules, added Stripe payouts, and squashed pesky bugs" becomes "This release adds custom schedules for recurring invoices and Stripe payouts, plus bug fixes." It must not become "Two changes. Custom schedules. Stripe payouts."

**Cut framing without inventing history:** "It's tax season. Sound familiar? We built the tool we wished existed. We're six people in Lisbon and answer support ourselves" becomes "We're six people in Lisbon, and we answer support ourselves."

## Check and deliver

Trace each retained claim to supplied evidence. Recheck edited counts, qualifiers, headings, and cross-page facts. Check that the reader can still decide and act, then make another deletion pass for information serving the writer or agent instead. Keep the surviving prose natural. Use applicable repository checks when required; prose alone does not require new tests or builds.

Match the requested output: edit authorized files and summarize briefly, return findings for an audit, or return copy for a rewrite-only request. Mention unresolved conflicts, missing essential evidence, or tradeoffs affecting requested content when needed. Do not explain every cut or add an editing essay. Include a cut list or word count only when requested or necessary; measure counts before reporting them. Keep annotations out of publishable copy unless requested.
