---
name: flutter-slang
description: Reference for localizing Flutter apps with slang v4 code generation (typed JSON messages, context.t, AppLocale, locale switching and persistence, CI drift checks), with the official gen-l10n/ARB workflow as the alternative.
---

# Flutter localization with slang

slang v4 compiles JSON/YAML/CSV/ARB message sources into type-safe Dart via
`build_runner` or its CLI; access is compile-time checked ("no typos or missing
arguments possible", slang README). Convention of `/Users/hmziq/os/flutter-starter`.

## When to Use

- Adding languages, keys, or parameters to a Flutter app using slang
  (`slang.yaml` / `build.yaml` + `lib/i18n/*.i18n.json` + committed `*.g.dart`).
- Wiring locale resolution, persistence, and live switching (`LocaleSettings`,
  `AppLocale`, `TranslationProvider`), or diagnosing generated drift.
- Choosing between slang and the official `flutter_localizations` + `intl`
  `gen-l10n` workflow.

## Identity and State (as of 2026-10-19)

- `slang` 4.19.2 (published 2026-09-12), `slang_flutter` 4.19.0, and
  `slang_build_runner` 4.19.0; the starter pins `^4.18.0` for all three.
- Sources are typed JSON by convention (`<locale>.i18n.json`); lookups compile
  to native Dart calls with zero runtime parsing (slang README).
- Contrast: the official workflow generates `AppLocalizations` from ARB bundles
  via `gen-l10n` + `flutter_localizations`/`intl`; slang migrates from ARB too,
  but its README notes ARB cannot express lists or maps (fixed `braces` mode).

## Setup

pubspec.yaml (starter):

```yaml
dependencies:
  slang: ^4.18.0
  slang_flutter: ^4.18.0        # Flutter integration (context.t, TranslationProvider)
dev_dependencies:
  build_runner: ^2.15.1
  slang_build_runner: ^4.18.0   # only for build_runner generation
```

`slang.yaml` at the project root (CLI configuration, starter values):

```yaml
base_locale: en                 # default: en
fallback_strategy: base_locale  # none | base_locale | base_locale_empty_string; default: none
input_directory: lib/i18n
input_file_pattern: .i18n.json  # default; .json/.yaml/.csv/.arb supported
output_directory: lib/i18n
output_file_name: translations.g.dart
lazy: false                     # default: true (lazy-load secondary locales where supported)
```

`build.yaml` builder options (keep in sync with `slang.yaml`):

```yaml
targets:
  $default:
    builders:
      slang_build_runner:
        options:
          base_locale: en
          fallback_strategy: base_locale
          input_directory: lib/i18n
          input_file_pattern: .i18n.json
          output_directory: lib/i18n
          output_file_name: translations.g.dart
          lazy: false
          locale_handling: true     # generate LocaleSettings/AppLocale (default: true)
          flutter_integration: true # generate Flutter features (default: true)
          timestamp: false          # omit the "Built on" header for deterministic output
```

`timestamp: false` stops header drift; on `Asset already exists`, switch to the
`legacy` builder (README FAQ).

## Message Sources

One file per locale under `lib/i18n/` (starter `en.i18n.json`):

```json
{
  "home": {
    "greeting": "Welcome, $name",
    "attemptsRemaining(count)": {
      "one": "1 attempt remaining",
      "other": "$count attempts remaining"
    }
  }
}
```

- Parameters: Dart interpolation (`$name`) by default; switch to `braces` or
  `double_braces` via `string_interpolation`.
- Pluralization: plural keywords (`zero`/`one`/`two`/`few`/`many`/`other`) mark
  a cardinal; `(ordinal)` selects ordinals; `(param=appleCount)` renames the
  default `n`. The starter's Arabic file defines all six CLDR categories.
- `(rich)` makes parameters accept `TextSpan`s/builders. Links: `@:absolute.path`,
  `@:.sibling`, escaped `@:{fields.name}`. Contexts/enums:
  `greet(context=GenderContext)` generates the enum, or `imports:` +
  `generate_enum: false` reuses one (modifiers combine, e.g. `apple(plural, rich)`).

## Generated Code and Access

Generation emits a committed `lib/i18n/translations.g.dart` plus per-locale
tables (`translations_en.g.dart`, `_ar`, `_zh_Hans` in the starter):

```dart
// Global accessor: does NOT rebuild on locale change (generated doc comment).
String a = t.home.greeting(name: 'Tom');
// Provider access: rebuilds listeners on locale change.
// Wrap the app: TranslationProvider(child: MyApp()) then use context.t.
final t = Translations.of(context); // or context.t
```

- `AppLocale` is a generated enum (`en`, `ar`, `zhHans`) with `.flutterLocale`,
  `.languageTag`, and `.translations` extensions.
- `LocaleSettings.setLocale(AppLocale)`, `setLocaleRaw(String)`, and
  `useDeviceLocale()` (Flutter only; listens to device changes); generated code
  also exposes `setLocaleSync` / `useDeviceLocaleSync` and `getLocaleStream()`.
- `AppLocaleUtils.supportedLocales` / `findDeviceLocale()` for `MaterialApp`
  (slang_flutter README).

## Locale Switching End to End

- Startup (starter `lib/bootstrap.dart`): persisted `localeOverride` ->
  `await LocaleSettings.setLocale(locale)`, else `useDeviceLocale()` (non-fatal).
- Persistence: `SettingsRepository` stores `localization.locale` as
  `locale.languageTag` (`null` = follow system); Riverpod `SettingsController.setLocale`
  applies and persists optimistically, rolling back both on failure.
- Live switching: `TranslationProvider` listens to `LocaleSettings`, so
  `context.t` / `Translations.of(context)` rebuild. `MaterialApp` takes
  `locale: TranslationProvider.of(context).flutterLocale` and
  `supportedLocales: AppLocaleUtils.supportedLocales` plus delegates (README:
  `GlobalMaterialLocalizations.delegates`; starter: ForUI's).
- RTL (Arabic): Flutter adapts layout per locale; the starter commits Noto Sans
  Arabic for glyphs and golden pixels, so check mirrored RTL baselines.

## Regeneration and Checks

- Dev: `dart run slang`; checkout/CI: `dart run build_runner build --delete-conflicting-outputs`.
- Starter `just gen` cleans and regenerates; `just gen-check` adds
  `git diff --exit-code`, failing CI on stale or hand-edited output.
- `dart run slang analyze` finds missing/unused keys (`--exit-if-changed` exits 1
  for CI); missing translations only occur when `fallback_strategy` is not `none`.

## Testing

- README: a test that builds a translation (proves compilation), plus a check
  that every `AppLocale.languageCode` is in `kMaterialSupportedLanguages`.
- Goldens per locale: the starter pins locale (`en`/`ar`/`zhHans`), viewport,
  brightness, and text scale, comparing exact pixels only on pinned macOS.

## Official gen-l10n Alternative

Use `flutter_localizations` + `intl` and ARB when no third-party generator is wanted:

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: any
flutter:
  generate: true
```

```yaml
# l10n.yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
```

- Messages live in ARB bundles (`app_en.arb` template + e.g. `app_es.arb`);
  generation runs on `flutter pub get` / `flutter run` or `flutter gen-l10n`.
- Wire `AppLocalizations.delegate` (+ `GlobalMaterialLocalizations.delegates`)
  into `localizationsDelegates`, use `AppLocalizations.supportedLocales`, and read
  strings via `AppLocalizations.of(context)!.helloWorld`.
- ARB plurals/selects use ICU syntax; placeholders live in `@key` metadata. The
  generated API is untyped, and slang's README notes ARB cannot express lists or maps.

## Pitfalls

- Never hand-edit `translations.g.dart` / `translations_*.g.dart`; edit
  `*.i18n.json` and regenerate (starter: "Regenerate, don't patch").
- Locale codes normalize: `zh-Hans.i18n.json` becomes `AppLocale.zhHans`; file
  names and enum identifiers are not the same string.
- Global `t` silently misses locale changes; use `context.t` / `Translations.of(context)`
  under `TranslationProvider` in widgets, keeping the global accessor for non-UI code.
- Stale generated output surfaces as compile-time missing keys; commit generated
  files and keep a `gen-check`-style drift gate.
- Default `fallback_strategy: none` requires every locale to define every key or
  generation cannot compile; custom plural languages throw until
  `LocaleSettings.setPluralResolver` is called (README FAQ).
- `timestamp: true` (default) rewrites the header each run. "setLocale did not
  update the UI" is usually a missing rebuild path, not a slang bug (README FAQ).

## Grounded in

- slang README/API docs v4.19.2 (2026-09-12): configuration table, getting
  started, changing locale, pluralization, links, RichText, tools/analyze, FAQ —
  https://pub.dev/packages/slang
- slang_flutter v4.19.0: `context.t`, `Translations.of`, `useDeviceLocale`,
  `AppLocaleUtils` — https://pub.dev/packages/slang_flutter
- slang_build_runner v4.19.0: `build.yaml` options,
  `build_runner build --delete-conflicting-outputs`, legacy builder —
  https://pub.dev/packages/slang_build_runner
- Flutter internationalization guide: `flutter_localizations` + `intl`,
  `l10n.yaml`, ARB, `flutter gen-l10n`, `AppLocalizations.of(context)` —
  https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization
- Starter convention under `/Users/hmziq/os/flutter-starter`:
  `docs/architecture.md` plus pubspec.yaml, slang.yaml, build.yaml, lib/i18n/,
  lib/bootstrap.dart, settings, justfile, and test/goldens/.
- Note: `slang.dev` (checked 2026-10-19) no longer serves package docs (root is
  an unrelated site; `/docs` is 404); the pub.dev READMEs are canonical.
