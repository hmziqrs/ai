---
name: astro-i18n
description: Reference for internationalizing Astro sites with the built-in i18n routing configuration and astro:i18n helpers, per-locale content collections, the official UI-string dictionary recipe, Paraglide JS integration, and SEO/locale URL rules; use when adding, reviewing, or debugging multi-language routing in an Astro project.
---

# Astro internationalization

Astro ships first-class i18n routing: configure `locales` and `defaultLocale` in `astro.config.mjs`, place localized content in folders under `src/pages/`, and use `astro:i18n` helpers to generate and validate localized URLs. This skill covers the current behavior (verified 2026-10-19; npm `astro` is 7.4.0, published 2026-10-15), the v6 default change for `redirectToDefaultLocale`, and when the official hand-written dictionary recipe is enough versus when to add Paraglide JS.

## When to Use

- Adding locale-prefixed URLs, per-locale fallbacks, or custom locale paths/domains to an Astro site.
- Translating page routes, UI strings, or content-collection entries with the current official patterns.
- Debugging localized 404s, redirect loops, missing `hreflang`, or evaluating third-party Astro i18n packages.

## Default answer: built-in i18n routing

- Astro's i18n routing was added in `astro@3.5.0` (configuration reference, `astro:i18n` module). Prefer it over hand-rolled middleware; add libraries only for message tooling, not for URL routing.
- Astro implements routing with its own middleware, placed where it awaits every `Response` from your middleware and page routes before running its own logic (validating localized URLs, redirects, fallbacks). Your redirects run first; the i18n middleware acts last.
- `routing: "manual"` disables Astro's i18n middleware entirely; no other `routing` options (such as `prefixDefaultLocale`) may be configured with it.

```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  i18n: {
    locales: ["es", "en", "pt-br"],
    defaultLocale: "en",
    fallback: { "pt-br": "es", fr: "en" },
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
      fallbackType: "redirect", // or "rewrite"
    },
  },
});
```

### v6 default change

`i18n.routing.redirectToDefaultLocale` defaulted to `true` in v5 and defaults to `false` in v6; in v6 it can only be used when `prefixDefaultLocale: true` is set. To recreate v5 behavior, set both flags explicitly to `true`. (Astro v6 upgrade guide.)

## Configuration

- `locales` (required): the supported languages; `defaultLocale` (required) must be one of them. Folder names in `src/pages/` must match the `locales` items exactly.
- `prefixDefaultLocale` (default `false`): when `false`, default-locale pages live at the root of `src/pages/` and only other locales get a `/[locale]/` prefix. When `true`, every locale is prefixed and `src/pages/index.astro` is always required; URLs without a prefix return 404 unless a fallback strategy covers them.
- `redirectToDefaultLocale`: when both it and `prefixDefaultLocale` are `true`, the home URL (`/`) redirects to `/[defaultLocale]/`. Otherwise the site can keep its home page outside the locale structure.
- `fallback`: maps a locale to the locale to use for missing pages, e.g. `{ fr: "en" }`. Astro builds a page in `src/pages/fr/` for every page that exists in `src/pages/en/` (a locale without a fallback returns 404).
- `routing.fallbackType` (default `"redirect"`): `"redirect"` sends visitors to the fallback URL (browser shows the new address); `"rewrite"` renders the fallback page's content at the originally requested URL.
- Custom locale paths: `locales: ["es", "en", { path: "french", codes: ["fr", "fr-BR", "fr-CA"] }]`. `codes` must follow the browser's `Accept-Language` syntax; the `/[locale]/` folder must match the `path` value ("french", no slashes) and URLs use the path. Limitations: `site` is mandatory, `output` must be `"server"`, and there can be no prerendered pages. It relies on the `X-Forwarded-Host`/`Host` and `X-Forwarded-Proto`/`URL#protocol` headers; if the proxy does not provide them, users get 404s.
- `domains`: maps a locale to a custom domain (e.g. `fr: "https://fr.example.com"`). Mapped locales drop the path prefix, but localized folders are still required, including for `defaultLocale`. Requires `site`, `output: "server"`, and no prerendered pages. Unmapped locales keep path-based URLs per `prefixDefaultLocale`. `getAbsoluteLocaleUrl()`/`getAbsoluteLocaleUrlList()` return the domain-form URLs.

## Content and routes

- Create `src/pages/[locale]/` folders anywhere inside `src/pages/`; Astro's file-based routing produces the localized URLs. The localized folders do not have to be at the root of `/pages/`.
- `Astro.currentLocale`: computed from the current URL, using the `locales` syntax; defaults to `i18n.defaultLocale` when the URL has no prefix. Available on all pages, including static prerendered ones.
- `Astro.preferredLocale` and `Astro.preferredLocaleList`: browser preference detection on pages rendered on demand, matching `Accept-Language` against `locales` (or `codes`). `preferredLocale` is `undefined` when nothing matches; `preferredLocaleList` is `[]` when nothing matches and falls back to `i18n.locales` when the browser sends no preference.
- With `fallbackType: "redirect"` a missing `/fr/my-page/` redirects to `/es/my-page/`; with `"rewrite"` the visitor sees the `es` content at `/fr/my-page/` without a redirect.

## Page and API helpers

From `astro:i18n` (module reference). Returned URLs respect `base`, `trailingSlash`, `build.format`, `site`, and `i18n.routing`; the functions throw if the locale does not exist.

- `getRelativeLocaleUrl(locale, path?, options?)` and `getAbsoluteLocaleUrl(...)`: a URL for one locale. Absolute versions return a relative URL when `site` is not configured. `options.prependWith` prefixes a path segment; `options.normalizeLocale` (default `true`) lowercases the locale and replaces `_` with `-`.
- `getRelativeLocaleUrlList(path?, options?)` / `getAbsoluteLocaleUrlList(path?, options?)`: the same URLs for every configured locale.
- `getPathByLocale("fr")` returns the configured `path` ("french"); `getLocaleByPath("french")` returns the first configured code ("fr"). Use these with custom locale paths.
- Manual-routing helpers, available only when `routing: "manual"`: `redirectToDefaultLocale(context, statusCode?)`, `redirectToFallback(context, response)`, `notFound(context, response?)`, `middleware({ fallbackType, prefixDefaultLocale, redirectToDefaultLocale })`, and `requestHasLocale(context)`.
- General helpers: `normalizeTheLocale(locale)` (lowercase, `_` to `-`), `pathHasLocale(path)` (added in 4.6.0; checks a path before using URL-dependent utilities), `toCodes(locales)` and `toPaths(locales)` (first code per locale / configured paths, for use with `i18n` from `astro:config/client`).

## Content collections

Keep one folder per locale inside each collection (`src/content/blog/en/post-1.md`, `src/content/blog/fr/post-1.md`). Entry IDs are locale-prefixed (the built-in `glob()` loader slugifies IDs), so the first ID segment is the language.

```ts
// src/content.config.ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
});

export const collections = { blog };
```

```ts
// src/pages/[lang]/blog/[...slug].astro
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const pages = await getCollection("blog");
  return pages.map((page) => {
    const [lang, ...slug] = page.id.split("/");
    return { params: { lang, slug: slug.join("/") || undefined }, props: page };
  });
}
```

Use the same ID scheme for single entries: `getEntry("blog", `${lang}/${slug}`)`, or filter with `getCollection("blog", (entry) => entry.id.startsWith(`${lang}/`))`. Render with `render(entry)`. Astro 6 removed legacy content collections, so a loader (`glob()` or another Content Layer loader) is required.

## Translating UI strings

The official recipe keeps a hand-written dictionary in `src/i18n/ui.ts` (`languages`, `defaultLang`, and `ui` maps of keys to strings) plus `src/i18n/utils.ts` with `getLangFromUrl(url)` and `useTranslations(lang)`. `useTranslations` returns a `t(key)` function that falls back to the default language's value when a key is missing in the active locale. Set `<html lang={lang}>` from a layout. The recipe extends this with `showDefaultLang` + `useTranslatedPath` (hide the default language in the URL), a `routes` map (translate route segments), and `getRouteFromUrl` (language pickers). Use it while the site has a modest number of strings and no translated URL patterns.

Bring in Paraglide JS for Astro (`@inlang/paraglide-js`, latest 2.29.0 published 2026-10-15) when you want type-safe message keys with IDE autocomplete, translated URL patterns, or compiler-emitted, tree-shakable messages (the project reports up to 70% smaller i18n bundles than runtime-based libraries, and more than 400k weekly npm downloads).

- Setup: `npx @inlang/paraglide-js@latest init`, then register `paraglideVitePlugin({ project: "./project.inlang", outdir: "./src/paraglide", emitTsDeclarations: true })` in `vite.plugins`, set `output: "server"` with an adapter, and delegate in `src/middleware.ts`: `paraglideMiddleware(context.request, ({ request }) => next(request))`.
- Usage: `m.greeting({ name: "World" })`, plus `getLocale()`, `setLocale("de")`, `getTextDirection()` from `./paraglide/runtime.js`.
- Static sites: do not use `paraglideMiddleware()`; use `output: "static"` and set the locale during prerendering with `setLocale(assertIsLocale(context.currentLocale ?? baseLocale))` in middleware, and include `globalVariable` before `baseLocale` in the plugin `strategy`. Under `output: "server"` Astro ignores `getStaticPaths()` for dynamic routes unless the route opts into prerendering, so enumerate locales in `getStaticPaths()` for prerendered localized pages.
- Keep `AsyncLocalStorage` enabled on Vercel Edge and Cloudflare Workers with Node.js compatibility; `disableAsyncLocalStorage` is only a fallback for runtimes without it that still isolate requests per-request.
- `astro-i18next` (last published 2023-03-09, still `1.0.0-beta.21`) and `astro-i18n` (last published 2024-01-23, `2.2.4`) are stale; `@inlang/paraglide-astro` is deprecated on npm ("use the paraglide-js package directly with v2 or above -- the astro adapter is not needed anymore", last published 2025-03-13).

## SEO and URL quality

- Emit `hreflang` alternates for every locale version of a page, including itself. Google requires fully-qualified URLs (`https://example.com/de/about`, not `/de/about`), bidirectional references between versions, and recommends `hreflang="x-default"` for users whose language does not match any locale. HTML `<head>` links, `Link:` headers, and sitemaps are equivalent methods; `generateStaticLocalizedUrls()` from the Paraglide runtime helps enumerate URLs for sitemaps and hreflang. Google does not use `hreflang` or `lang` attributes to detect a page's language.
- Keep each locale's URL canonical: use distinct URLs per language version and set `site` so helpers can build absolute URLs. Note that `fallbackType: "rewrite"` serves another locale's content at the requested locale URL, so decide canonicals deliberately when using it.
- Avoid automatic redirects based on perceived language (`Accept-Language`): Googlebot typically crawls from the US and sends requests without `Accept-Language`, so it may never discover all variations. Prefer visible language switch links and `x-default`.

## Middleware integration

- Extend Astro's i18n routing: set `routing: "manual"`, import `middleware` from `astro:i18n`, and order it with `sequence()` so your middleware runs around it:

```js
// src/middleware.js
import { defineMiddleware, sequence } from "astro:middleware";
import { middleware } from "astro:i18n";

const userMiddleware = defineMiddleware(async (ctx, next) => {
  const response = await next(); // may be a response from Astro's i18n middleware
  return response;
});

export const onRequest = sequence(
  userMiddleware,
  middleware({ prefixDefaultLocale: true, redirectToDefaultLocale: false, fallbackType: "redirect" }),
);
```

- Replace it instead: with `routing: "manual"`, write your own `defineMiddleware` handler and call `redirectToDefaultLocale()`, `redirectToFallback()`, `notFound()`, and `requestHasLocale()` yourself; `middleware()` reconstructs Astro's default behavior inside your handler when you want it.

## Pitfalls

- With `prefixDefaultLocale: true`, `src/pages/index.astro` is always required, and unprefixed routes 404 unless a fallback covers them; enable `redirectToDefaultLocale` if `/` should redirect to the default locale.
- Upgrading from v5: `redirectToDefaultLocale` no longer defaults to `true`; set `prefixDefaultLocale` and `redirectToDefaultLocale` explicitly to recreate previous behavior, including in manual middleware.
- Folder names must match the configured locale path exactly; for custom locale paths use the `path` value ("french"), not the code, and use `getPathByLocale()`/`getLocaleByPath()` when converting.
- The helpers throw on unknown locales, and `getAbsoluteLocaleUrl()` silently returns a relative URL when `site` is not set.
- Custom locale paths and `i18n.domains` require `site`, `output: "server"`, and no prerendered pages; custom locale paths additionally fail with 404s when the host does not forward `Host`/`X-Forwarded-*` headers.
- `fallback` only applies when the fallback locale has a page to build; a locale without a fallback returns 404 for missing pages.
- Do not rely on `Accept-Language` redirects for discovery; crawlers may arrive without that header. Provide switch links and `x-default`.
- For Paraglide on static output, do not use `paraglideMiddleware()` and remember `getStaticPaths()` returns per-locale paths; under server output, dynamic routes ignore `getStaticPaths()` unless prerendered.
- `@inlang/paraglide-astro`, `astro-i18next`, and `astro-i18n` are deprecated or unmaintained; prefer the built-in router plus `@inlang/paraglide-js` when message tooling is needed.

## Grounded in

- Astro internationalization guide: https://docs.astro.build/en/guides/internationalization/
- `astro:i18n` module reference: https://docs.astro.build/en/reference/modules/astro-i18n/
- Configuration reference (i18n section): https://docs.astro.build/en/reference/configuration-reference/#i18n
- i18n recipe (pages, collections, UI strings, translated routes): https://docs.astro.build/en/recipes/i18n/
- Astro v6 upgrade guide (redirectToDefaultLocale default change, legacy collections removed): https://docs.astro.build/en/guides/upgrade-to/v6/
- Content collections API reference (`getCollection`, `getEntry`, `glob()` loader IDs): https://docs.astro.build/en/reference/modules/astro-content/
- Paraglide JS for Astro: https://paraglidejs.com/astro
- Paraglide JS static site generation (`getStaticPaths`, hreflang, locale setting): https://paraglidejs.com/static-site-generation
- npm registry: `astro` 7.4.0 (2026-10-15): https://registry.npmjs.org/astro
- npm registry: `@inlang/paraglide-js` 2.29.0 (2026-10-15): https://registry.npmjs.org/@inlang/paraglide-js
- npm registry: `@inlang/paraglide-astro` deprecated (0.4.1, 2025-03-13): https://registry.npmjs.org/@inlang/paraglide-astro
- npm registry: `astro-i18next` 1.0.0-beta.21 (2023-03-09): https://registry.npmjs.org/astro-i18next
- npm registry: `astro-i18n` 2.2.4 (2024-01-23): https://registry.npmjs.org/astro-i18n
- Google Search Central, localized versions (hreflang rules, x-default): https://developers.google.com/search/docs/specialty/international/localized-versions
- Google Search Central, managing multi-regional and multilingual sites (distinct URLs, avoid automatic redirects, crawler behavior): https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
