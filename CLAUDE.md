# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal one-page landing site for Jesus Ordosgoitty (https://jodaz.vanguarddevs.com). Astro 5 static output, React 18 islands, Tailwind 3 + shadcn/ui, bilingual (en default at `/`, es at `/es/`). Package manager is pnpm.

## Commands

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # static output to dist/
pnpm preview
pnpm usage          # regenerate src/data/ai-usage.json from local AI tool logs (see docs/ai-usage-widget.md)
```

Known not set up (verified):
- `pnpm check` prompts to install `@astrojs/check` (not in devDependencies). Run `pnpm add -D @astrojs/check` first if you need type checking.
- There is no test suite.

CI (`.github/workflows/ci.yml`) runs `pnpm lint` then `pnpm build` on PRs to `main` and pushes to `main`. Both must pass locally before opening a PR. Lint config is `eslint.config.js` (flat config): TS/TSX everywhere, React hooks/refresh rules only under `src/components/`, so build-time helpers like `useTranslations` in `src/lib` are not treated as hooks. Warnings do not fail CI; errors do.

## Architecture

### Pages and i18n
- Two real pages: `src/pages/index.astro` (en) and `src/pages/es/index.astro` (es). They are deliberate near-duplicates; edit both when changing the home page. `404.astro` is the only other route. Old routes (`/about`, `/articles/*`) are meta-refresh redirects in `astro.config.mjs`, not pages.
- Translations live in `public/locales/{en,es}/common.json` and are imported at build time by `src/lib/i18n.ts` (`useTranslations(lang)` returns `t('dot.path')` with en fallback). i18next/react-i18next are in `package.json` but the site does not load them at runtime; do not add client-side i18n.
- Add copy to both locale files under the same key. `t()` returns the key string when a key is missing, so a typo shows up literally on the page.
- Language choice: `LanguageDetector.astro` (inline script in `<head>`) redirects on first visit from browser language, home page only, and stores `preferred_lang` in localStorage. `HeaderInteractive.tsx` writes the same key on manual toggle. `BaseLayout` needs `alternateUrl` for the redirect to work.

### Rendering model
- `BaseLayout.astro` wraps every page: `BaseHead` (meta/OG/hreflang), `LanguageDetector`, `Header`, `<main>`. Layout imports `src/index.css` once.
- Interactive UI is React islands under `src/components/islands/`. `HeroIsland` (`client:load`) is the whole landing; its photo column is a two-tab panel ("Me" = photo, "AI usage" = `AiUsageIsland`) that auto-advances every 30s (`SLIDE_MS`) with a progress bar between the tabs and the box. Astro/TS code does the data prep and passes plain props; keep `t()` calls out of React and hand it resolved strings (see `src/lib/ai-usage-props.ts` for the pattern).
- Path alias `@/` maps to `src/`.

### AI usage widget
`scripts/collect-ai-usage.mjs` reads Claude Code / Grok CLI session logs on the developer machine and writes aggregate-only, all-time counts to `src/data/ai-usage.json`, which is committed and baked into the build. `getAiUsageProps()` returns `undefined` when totals are zero, and `HeroIsland` then hides the tabs and shows only the photo, so a fresh checkout still builds. The 7- and 30-day figures are derived from the JSON's `daily` series inside the island. Full details, flags, and how to add a harness adapter: `docs/ai-usage-widget.md`.

### Legacy components
`src/components/` still contains sections from the previous multi-page site (`PortfolioSection`, `ServicesSection`, `ContactSection`, `ArticlesList`, `Footer`, `views/`, `content/projects/` collection). Only `404.astro` reaches some of them via `BottomGridWrapper`; the home page does not. Don't assume they are wired up or that their copy is current.

## Styling rules

- Tailwind utilities only; no custom CSS files or inline styles except for dynamic values (`.agent/rules/styling-consistency.md`).
- Design tokens are HSL CSS variables in `src/index.css` and exposed through `tailwind.config.ts` (`bg-background`, `text-primary`, `bg-brand-dark`, etc.). Add colors there, not as hex literals in components.
- Brand look ("Modern Blueprint", see `BRAND_GUIDELINES.md`): square corners (`rounded-none`), 2px borders, outlined buttons that fill with the accent on hover, Fira Code everywhere. `src/components/ui/button.tsx` already follows this; `404.astro` predates it and still uses `rounded-lg`.
- `cn()` from `src/lib/utils.ts` for class merging (shadcn convention; `components.json` is present).

## Conventions

- TypeScript strict; avoid `any` (`.agent/rules/typescript.md`). Existing `any` escapes in `i18n.ts` and `analytics.ts` are the exceptions, not the pattern.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).
- `.agent/` holds rules and skills written for other agent tools (brand guidelines, react-best-practices, shadcn-ui, systematic-debugging). They are reference material, not loaded automatically here.
- Env: only `PUBLIC_GA_MEASUREMENT_ID` (see `.env.example`). `src/lib/env.ts` reads a different, unused `VITE_` name; `analytics.ts` reads the `PUBLIC_` one.
