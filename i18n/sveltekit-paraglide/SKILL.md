---
name: sveltekit-paraglide
description: Use when adding, using, or debugging i18n in a SvelteKit project with Paraglide JS (@inlang/paraglide-js v2): setup via the Svelte CLI or init, hooks and middleware wiring, messages and runtime APIs, locale strategies, and the SSR, prerender, and reload pitfalls.
---

# SvelteKit i18n with Paraglide JS

Paraglide JS is SvelteKit's official i18n integration (a Svelte CLI add-on). It is a compiler-based i18n library from inlang/opral: messages compile to tree-shakable ESM functions with full type safety and localized URLs, and it works with CSR, SSR, and SSG. This skill is the working reference for wiring it into a SvelteKit app and for the traps that break most setups.

## When to Use

- Adding i18n to a SvelteKit project, or reviewing an existing Paraglide setup.
- Choosing or debugging locale detection strategies (URL, cookie, localStorage, preferred language).
- Localized routing questions: `localizeHref`, `deLocalizeUrl`, `reroute`, `%lang%`/`%dir%` in `app.html`.
- Symptoms: no locale in server code, wrong locale after hydration, locale switching that "doesn't work", prerender or build failures around locales.

## Identity and State

- Package: `@inlang/paraglide-js`, maintained by inlang/opral, MIT licensed. Latest published 2.x version: 2.29.0 (npm registry, checked 2026-10-19).
- v2 supersedes the deprecated `@inlang/paraglide-sveltekit` adapter (last version 0.16.1). The npm deprecation notice says to use the `paraglide-js` package directly with v2 or above because "the sveltekit adapter is not needed anymore". Do not install the adapter for new work.
- The compiler emits `messages.js`, `runtime.js`, `server.js`, and (by default) a `messages/` directory into the configured `outdir`. Treat that directory as build output: edit translation files, never generated code.

## Setup

- Svelte CLI (recommended): `npx sv add paraglide`. It adds the inlang project settings, the Paraglide Vite plugin, SvelteKit `handle` and `reroute` hooks, `%lang%`/`%dir%` attributes in `app.html`, an updated `.gitignore`, and an optional demo page. Pass language tags with `npx sv add paraglide="languageTags:en,es"`.
- Manually: `npx @inlang/paraglide-js@latest init`. Default paths are `./project.inlang` and `./src/paraglide`; change them with `--project` and `--outdir`. Init creates message files, configures the bundler, and compiles; unattended runs use `--yes`.

Locales and message files:

```json
// project.inlang/settings.json
{ "baseLocale": "en", "locales": ["en", "de", "fr"] }
```

```json
// messages/en.json
{ "greeting": "Hello {name}!" }
```

```json
// messages/de.json
{ "greeting": "Hallo {name}!" }
```

Vite plugin. This guide uses `outdir: './src/lib/paraglide'` so the `$lib/paraglide/...` imports below resolve; the manual init default is `./src/paraglide`, so keep the imports and this value consistent.

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['url', 'cookie', 'baseLocale']
		})
	]
});
```

`emitTsDeclarations: true` keeps the Svelte and TypeScript language servers in sync when message keys are added or renamed while the dev server runs; it requires TypeScript 5.6 or newer and reduces compiler speed.

## SvelteKit Wiring

Three files, each easy to miss:

**`src/app.html`** — set the locale and direction placeholders: `<html lang="%lang%" dir="%dir%">`.

**`src/hooks.server.ts`** — run requests through `paraglideMiddleware()` and fill the placeholders:

```ts
import type { Handle } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';

export const handle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		return resolve(
			{ ...event, request: localizedRequest },
			{
				transformPageChunk: ({ html }) =>
					html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
			}
		);
	});
```

Pass the middleware request through a copy of the event: SvelteKit 3 makes `event.request` readonly, so assigning to it is not supported. The hook types above are SvelteKit 3; on SvelteKit 2, import `Handle` (and `Reroute` below) from `@sveltejs/kit`.

**`src/hooks.ts`** — map localized URLs back to canonical routes. This must be exported from `src/hooks.ts`, not `src/hooks.server.ts`:

```ts
import type { Reroute } from '@sveltejs/kit/hooks';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
```

## Messages and Runtime API

```js
import { m } from '$lib/paraglide/messages.js';
import {
	getLocale, setLocale, getTextDirection,
	locales, baseLocale, localizeHref, deLocalizeHref
} from '$lib/paraglide/runtime.js';

m.greeting({ name: 'World' });                     // "Hello World!"
m.greeting({ name: 'Samuel' }, { locale: 'de' });  // force a locale for one message
getLocale();                                       // current locale, e.g. "en"
setLocale('de');                                   // update strategies, then navigate/reload
localizeHref('/blog');                             // "/de/blog" for the current locale
deLocalizeHref('/de/about');                       // "/about"
```

- Message functions are fully typed (keys and parameters). Message text can be typed as `LocalizedString` to distinguish translated strings from plain strings at compile time.
- `getLocale()` resolves through the configured strategies; in SSR it reads the request-scoped locale that `paraglideMiddleware()` stores in AsyncLocalStorage.
- `setLocale()` updates the configured strategies and then performs a full document navigation, or reloads the current document, so document-level state such as `<html lang>` stays consistent.
- `localizeHref`/`deLocalizeHref` are the client UI helpers (relative paths in, relative out); `localizeUrl`/`deLocalizeUrl` are their server-side, URL-object equivalents.
- `locales` and `baseLocale` are exported runtime constants; `getTextDirection(locale?)` returns `"ltr"` or `"rtl"` for a locale or the current one.
- `paraglideMiddleware()` accepts `effectiveRequestUrl` (behind proxies) and handles locale detection, redirects, URL de-localization, and request isolation; it does not define routes or intercept links.

## Locale Strategies

Built-in strategies: `cookie`, `localStorage`, `preferredLanguage`, `url`, `baseLocale`, `globalVariable`. Custom strategies are named `custom-<name>` and registered with `defineCustomClientStrategy()` / `defineCustomServerStrategy()`.

Ordering semantics: strategies are evaluated in order and the first one that returns a locale wins. The array is a fallback chain, not a set of preferences. Strategies that always resolve — `url` with the default wildcard pattern, `baseLocale` — belong last, because they prevent every later strategy from running.

- `url` matches via `urlPatterns` (URLPattern). Without explicit patterns, a default wildcard `/:path(.*)?` matches every path, so unprefixed paths resolve to the base locale.
- `preferredLanguage` reads `navigator.languages` on the client and the `Accept-Language` header on the server (exact matches first, then base language codes).
- `localStorage` is browser-only: on the server it is skipped and evaluation falls through to the next strategy.
- `globalVariable` is for tests and quick starts; it can cause cross-request issues on the server and does not persist across reloads.
- `cookie` reads and writes the locale cookie; keep it in the chain when a persisted choice must affect the first server-rendered request.
- `routeStrategies` overrides strategies per route; rules are checked in declaration order, first match wins, and `exclude: true` skips i18n middleware behavior for the route (useful for `/api/*` and unprefixed private routes).
- The compiler default strategy is `["cookie", "globalVariable", "baseLocale"]`; the SvelteKit guide's recipe for localized URLs is `["url", "cookie", "baseLocale"]`.

## Minimal End-to-End Example

With the `vite.config.ts`, `settings.json`, and message files above, plus the `handle` and `reroute` hooks:

```svelte
<!-- src/routes/+page.svelte -->
<script>
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { localizeHref, locales } from '$lib/paraglide/runtime.js';
</script>

<h1>{m.greeting({ name: 'World' })}</h1>

<nav aria-label="Languages">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })} data-sveltekit-reload>{locale}</a>
	{/each}
</nav>
```

The hooks make `/de/...` URLs work; `data-sveltekit-reload` forces each cross-locale link to be a full page load so the localized URL, the server-rendered document, and the runtime locale stay in sync.

## Pitfalls

1. Strategy order is precedence, not preference. In `["localStorage", "preferredLanguage", "url", "baseLocale"]`, the browser language always wins and a manual selection never takes effect; put `localStorage` (and `cookie` where relevant) first if the stored choice must win. Read the array as "first match wins".

2. SSR cannot read `localStorage`. The first document request runs on the server, so a strategy like `["localStorage", "preferredLanguage", "url", "baseLocale"]` falls through to `preferredLanguage` or `url` and can redirect to a locale that differs from the hydrated client locale. If a stored override must affect the first request, add a server-visible strategy: `["localStorage", "cookie", "preferredLanguage", "url", "baseLocale"]`.

3. Prerendering and hydration. For SSG, add `export const prerender = true` to the root layout and include a visible locale switcher; SvelteKit crawls anchor tags at build time to generate every locale variant. Mark links that cross locales with `data-sveltekit-reload`, otherwise a client-side navigation leaves the server-rendered document and the runtime locale out of sync. With `@sveltejs/adapter-static` in SPA fallback mode, set `paths.relative: false` to avoid locale-prefixed 404s for assets.

4. `setLocale()` navigates or reloads; it is not a reactive re-render. A plain `localizeHref()` link switch does not take effect under client-side routing; use `setLocale()` or `data-sveltekit-reload`. `setLocale(locale, { reload: false })` is a narrow client-only escape hatch for a fully client-rendered surface that owns its complete reactive shell; it does not update the URL, `<html lang>`, or metadata, and is wrong for SSR, SSG, or hydrated documents and for routes whose strategy includes `url`.

5. Keep message files in version control, not the output. Translations are version-controlled files (`messages/en.json`, `messages/de.json`, and `project.inlang/settings.json`). The generated `outdir` emits its own `.gitignore` by default (`emitGitIgnore: true`); never commit or hand-edit generated files, because every compile overwrites them.

6. Messages need a request context. Calling `m.*` on the server outside a `load` function, hook, or the middleware callback can throw "No locale found" or resolve the wrong locale. Keep AsyncLocalStorage enabled (the default) so concurrent requests get isolated locales, and only disable it for runtimes that lack it and guarantee per-request isolation.

7. Locale switching via links inside client-side routing is a documented failure mode. If a link built with `localizeHref()` does not change the language, the fix is `setLocale()` or a reloading link (`data-sveltekit-reload` in SvelteKit), not more localization code.

## Grounded in

All facts above are drawn from the following sources (fetched 2026-10-19):

- Paraglide JS SvelteKit guide — https://paraglidejs.com/sveltekit
- Paraglide JS Strategy guide — https://paraglidejs.com/strategy
- Paraglide JS Runtime reference — https://paraglidejs.com/runtime
- Paraglide JS Basics (messages, `m.*`, `getLocale`/`setLocale`, `localizeHref`) — https://paraglidejs.com/basics
- Paraglide JS Compiler Options (defaults, `emitTsDeclarations`, `routeStrategies`, `strategy` default) — https://paraglidejs.com/compiler-options
- Paraglide JS Middleware guide (AsyncLocalStorage, redirects, `effectiveRequestUrl`) — https://paraglidejs.com/middleware
- Paraglide JS Errors page ("No locale found", locale switching via links) — https://paraglidejs.com/errors
- Paraglide JS Changelog (2.29.0, versions) — https://paraglidejs.com/changelog
- Paraglide JS GitHub repository (inlang/opral; v2 status; version-controlled translation files) — https://github.com/opral/paraglide-js
- npm registry metadata for the current version (2.29.0) — https://registry.npmjs.org/@inlang/paraglide-js
- npm deprecation notice for `@inlang/paraglide-sveltekit` (0.16.1, adapter no longer needed) — https://www.npmjs.com/package/@inlang/paraglide-sveltekit
- Svelte CLI `paraglide` add-on docs (`sv add paraglide`, what it generates, options) — https://svelte.dev/docs/cli/paraglide
