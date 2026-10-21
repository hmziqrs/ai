---
name: rust-i18n
description: Use when adding, wiring, or debugging localization in a Rust desktop app (GPUI / gpui-component) with the Longbridge rust-i18n crate, including init, locale files, runtime locale switching, component-string overrides, and extraction.
---

# rust-i18n

Reference for the Longbridge `rust-i18n` crate in Rust desktop/GPUI applications: translations compiled into the binary from YAML/JSON/TOML files, a global `t!` macro, locale fallback chains, and gpui-component string overrides. Everything below is drawn from the official README, docs.rs, crates.io, and GPUI Kit's i18n documentation (see Grounded in). Scope is message selection: `set_locale` does not format dates, numbers, currencies, units, or plurals (GPUI Kit i18n docs).

## When to Use

- Adding UI localization to a Rust desktop app built with GPUI or gpui-component (GPUI Kit).
- Debugging locale files that do not load, wrong fallback order, or keys that render as-is.
- Overriding gpui-component's built-in component strings from the application.
- Extracting untranslated text with `cargo i18n`.
- Choosing between `_version: 1` split locale files and `_version: 2` single-file layouts.

## Identity and Version

- Crate name: `rust-i18n` (Rust identifier `rust_i18n`), maintained by Longbridge; repository https://github.com/longbridge/rust-i18n. Current release as of 2026-10-19: **4.2.4**, published 2026-09-29 (crates.io API); docs.rs builds 4.2.4, dated 29 September 2026. License: MIT.
- Common misremembering: the crate is often called "rust-intl". An unrelated, small `rust_intl` crate exists on crates.io (v0.2.2, repository github.com/voctal/rust-intl, ~375 Rust code lines, "A Rust internationalization library"). That is a different project with a different API — the crate this skill documents is `rust-i18n`.

## Install and Initialization

Add the dependency (README shows `rust-i18n = "4"`; component overrides require 4.2+):

```toml
[dependencies]
rust-i18n = "4"
```

Initialize once at the crate root of the crate that owns the locale files (`main.rs` or `lib.rs`); alternatively import per file with `use rust_i18n::t;`.

```rust
#[macro_use]
extern crate rust_i18n;

// Loads [package.metadata.i18n] config if present, or use arguments to override.
i18n!("locales", fallback = "en");             // single fallback
i18n!("locales", fallback = ["en", "es"]);     // priority chain
i18n!("locales", minify_key = true);           // short hashed keys for long literals
i18n!("locales", backend = RemoteI18n::new()); // custom backend (since v2.0.0); takes priority over local files
```

- `minify_key = true` also accepts `minify_key_len`, `minify_key_prefix` (default `t_`), and `minify_key_thresh` (only longer messages are hashed).
- Cargo.toml `[package.metadata.i18n]` (documented defaults): `available-locales = ["en"]`, `default-locale = "en"`, `load-path = "locales"`. The extractor docs describe this section as primarily for the `cargo i18n` command; `i18n!` reads it when present and arguments override it. Keep `load-path` identical to the path passed to `i18n!`.
- Feature flags: `load-path` enables runtime locale loading via `try_load_locales` (otherwise YAML/TOML parsing deps stay compile-time only); `log-miss-tr` logs missing translations at warning level (requires the `log` crate).

## Locale Files

- Default directory: `locales/` at the project root. YAML is the default format; JSON and TOML work by renaming (`en.json`, `en.toml`). Multiple files are merged. `_version` selects the layout and defaults to `1`.
- `_version: 1` — split per locale (`locales/en.yml`, `locales/zh-CN.yml`):

```yaml
_version: 1
hello: "Hello world"
messages.hello: "Hello, %{name}"
```

- `_version: 2` — one file per module, each key mapping locale to text:

```yaml
_version: 2
hello:
  en: Hello world
  zh-CN: 你好世界
messages.hello:
  en: Hello, %{name}
  zh-CN: 你好，%{name}
```

- Placeholders use `%{name}`; dotted keys (`messages.hello`) form nested message keys. With `minify_key`, long literals are replaced by generated keys such as `t_4Cct6Q289b12SkvF47dXIx`, and locale files must contain those generated keys.

## Runtime API

```rust
use rust_i18n::t;

t!("hello");                             // "Hello world"
t!("hello", locale = "zh-CN");           // explicit locale
t!("messages.hello", name = "world");    // %{name} parameter
t!("messages.hello", "name" => "world"); // key => value form
t!("Hello, %{name}, you serial number is: %{sn}", name = "Jason", sn = 123 : {:08});
                                         // std::fmt formatting: "... 000000123"
```

- `rust_i18n::set_locale("zh-CN")` sets the global locale, `rust_i18n::locale()` reads it back, and `rust_i18n::available_locales!()` lists available locales.
- The `fallback` argument accepts one locale or a priority list. Automatic territory fallback: if `zh-CN` is unavailable it falls back to `zh` (since v2.4.0).

## Component Overrides (gpui-component / GPUI Kit)

GPUI Component ships its own component strings in `crates/component/locales/ui.yml` (en, zh-CN, zh-HK, zh-TW, it; coverage varies by key). Overrides require rust-i18n 4.2 or later in the application crate.

1. Application `locales/ui.yml`, `_version: 2`, component keys under the `gpui_component` namespace (the Rust crate name `gpui-component` with hyphens converted to underscores):

```yaml
_version: 2
app:
  save:
    en: Save
    fr: Enregistrer
gpui_component:
  Calendar:
    month.January:
      fr: Janvier
```

2. Initialize app locales and register the override before initializing the component:

```rust
rust_i18n::i18n!("locales", fallback = "en");

app.run(move |cx| {
    use gpui_kit::component as gpui_component;
    rust_i18n::extend!(gpui_component); // once, at startup
    gpui_kit::init(cx);
});
```

- Merge priority: the application's value first, then the component's built-in value; keys the app omits keep the built-in value, so a partial locale such as `fr` is valid.
- The namespace applies to component lookups only: in app code `t!("gpui_component.Calendar.month.February")` returns the key unless you define it. Read component strings by rendering components, and use your own keys (for example `t!("app.save")`) for application copy.
- gpui-component re-exports the locale accessors: `use gpui_kit::component::{locale, set_locale};`.

## Extraction Tooling

- `cargo install rust-i18n-cli` provides the `cargo i18n` command; it scans Rust sources for untranslated `t!` literals and merges entries into YAML. It is experimental, outputs YAML only in the `_version: 2` format, and writes new entries to `locales/TODO.<locale>.yml`.
- `--locale` restricts which locale is checked; `-t "text"` or `-t "text => translation"` adds translations for non-literal `t!` keys; `[package.metadata.i18n]` (`available-locales`, `default-locale`, `load-path`) tells the extractor which locales to check.

## GPUI Notes

- Look strings up at render time so a later `set_locale` takes effect. The active locale is global state outside GPUI's change tracking: changing it alone does not repaint — call `cx.notify()` on the owning view or `cx.refresh_windows()`; rebuild cached menus and labels explicitly.
- Keep application copy in complete message keys so each language can reorder words and punctuation; do not assemble sentences from separately translated fragments.
- Tests: `set_locale` is process-global. Restore the previous locale after any test that changes it, or isolate such tests, so parallel tests do not leak locale state.

## Minimal Complete Example

Cargo.toml:

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2021"

[dependencies]
rust-i18n = "4"

[package.metadata.i18n]
available-locales = ["en", "zh-CN"]
default-locale = "en"
load-path = "locales"
```

locales/en.yml:

```yaml
_version: 1
app.title: "My App"
messages.greeting: "Hello, %{name}!"
```

main.rs:

```rust
#[macro_use]
extern crate rust_i18n;

i18n!("locales", fallback = "en");

fn main() {
    println!("{}", t!("app.title")); // My App
    println!("{}", t!("messages.greeting", name = "Ada")); // Hello, Ada!

    rust_i18n::set_locale("zh-CN");
    println!("{}", rust_i18n::locale()); // zh-CN
}
```

## Pitfalls

- Wrong crate: "rust-intl" / `rust_intl` is unrelated; depend on `rust-i18n`.
- A missing key returns the key text itself (GPUI Kit's mistakes table: "Application t! returns a key") — define the key or fix the namespace.
- Overrides that silently do nothing: key outside `gpui_component`, misspelled key or locale code, or `extend!` called after `gpui_kit::init` (it must be registered first).
- Expecting app `t!` to read component built-ins; it reads only your application locale files.
- Changed locale without a repaint: the UI keeps the old language until you notify the view or refresh windows.
- Locale leakage between tests through the global `set_locale`.
- Territory fallback can mask a missing regional file: `zh-CN` silently shows `zh` strings when `zh-CN` is missing.
- `package.metadata.i18n` mismatch: `load-path` must match the path passed to `i18n!`.
- `minify_key` rewrites long literal keys to hashes; locale files that lack the generated hash stop matching.
- Dropping `%{name}` placeholders in a translation loses runtime values.
- RTL: setting an Arabic or Hebrew locale selects strings but does not mirror layout.

## Grounded in

- `rust-i18n` README — https://github.com/longbridge/rust-i18n (features, install, `i18n!` options, locale file versions, `t!` / `set_locale` / `locale` / `available_locales!`, backend, `extend!` and namespace, extractor, `package.metadata.i18n`, use cases).
- docs.rs `rust_i18n` 4.2.4 — https://docs.rs/rust-i18n (release date, macros/functions/traits list, `extend!` since v4.2.0, territory fallback since v2.4.0, `minify_key` since v3.1.0, feature flags).
- crates.io `rust-i18n` — https://crates.io/crates/rust-i18n (current version 4.2.4 published 2026-09-29, MIT, repository).
- crates.io `rust_intl` — https://crates.io/crates/rust_intl (unrelated crate: v0.2.2, repository github.com/voctal/rust-intl, ~375 Rust code lines).
- GPUI Kit i18n docs — https://gpui-kit.com/docs/i18n (component locale file, `gpui_component` namespace, `extend!` ordering, merge priority, locale accessors, notify/refresh requirement, formatting scope, RTL note, common-mistakes table).
- gpui-component repository — https://github.com/longbridge/gpui-component (redirects to github.com/longbridge/gpui-kit; gpui-component is the styled component layer of GPUI Kit).
