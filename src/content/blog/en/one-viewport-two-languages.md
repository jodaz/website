---
title: "One viewport, two languages, zero client-side i18n"
description: "Why this site translates at build time, how the first-visit language redirect works, and what it costs to keep two pages in sync."
publishDate: 2026-10-25
tags: ["astro", "i18n"]
lang: "en"
draft: false
---

This site is one page. It has to work in English and Spanish, load quickly, and stay simple enough for me to maintain between client projects. The obvious solution is i18next with a language detector in React. I deliberately did not ship that.

The dependencies are still in `package.json`: `i18next`, `react-i18next`, `i18next-browser-languagedetector`, and `i18next-http-backend`. They are leftovers from the previous multi-page version of the site. Nothing in `src/` imports them at runtime. I keep meaning to remove them, but the point is that they were never part of the current design.

## Translation happens at build time

Both locale files are imported directly by `src/lib/i18n.ts`:

```ts
import en from '../../public/locales/en/common.json';
import es from '../../public/locales/es/common.json';

const translations = { en, es } as const;
export type Lang = 'en' | 'es';
```

`useTranslations(lang)` returns a `t()` function that walks a dot path through the selected object. If the key is missing, it walks the same path through the English file instead. If it is missing there too, it returns the key itself. That last detail is the one I rely on most: a typo does not crash the build or render an empty string. It renders `hero.ctaPrimary` on the page, which is impossible to miss.

The tradeoff is that `t()` only does lookup and fallback. It has no interpolation and no pluralisation. For the blog, the reading-time label is a template with an `{n}` placeholder that the component replaces before rendering. That is enough for this site. If the copy ever needs real plural rules, I will add a small formatter rather than pull a runtime library back in.

Because translation is resolved during the build, the browser downloads two static HTML documents: one at `/`, one at `/es`. There is no language bundle, no request for JSON, and no flash of the wrong language after hydration. The React islands only receive already-resolved strings as props. The home page passes the translated name, role, bio, photo alt text, and tab labels into the island; the island never calls `t()`.

## Choosing the language

The site keeps two different notions of language preference. The URL decides what is rendered. `localStorage` remembers what the visitor chose, so the next visit matches their last decision rather than their browser.

On a first visit, with no stored preference, `LanguageDetector.astro` runs a small inline script in the head. It reads `navigator.language` and redirects to the Spanish page when the browser starts with `es`. It only does this on the home page:

```ts
if (storedPref === 'en' || storedPref === 'es') {
  targetLang = storedPref;
} else if (isHomePage) {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  targetLang = browserLang.startsWith('es') ? 'es' : 'en';
  localStorage.setItem(PREFERRED_LANG_KEY, targetLang);
}
```

The conditional matters. A visitor who lands on a deep-linked page from a search result should get the language in that URL, not a redirect based on a browser setting. Automatic detection on every page would break indexing and make shared links unreliable. On the home page it is a reasonable default; everywhere else, the URL wins.

The header toggle writes the same `preferred_lang` key in `localStorage` before following the link to the other language. It also clears the `lang_redirected` flag in `sessionStorage`, so the detector does not fight the manual choice during the same session.

## Canonical URLs without trailing slashes

The public URL convention is no trailing slash: the English home is `https://jodaz.vanguarddevs.com`, the Spanish home is `/es`. `astro.config.mjs` enforces it:

```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es'],
  routing: {
    prefixDefaultLocale: false,
  },
},
trailingSlash: 'never',
```

`BaseHead` builds the canonical URL from `Astro.url.pathname` and strips any trailing slash, because `new URL('/', site)` always serialises the root as `/`. The same component emits `hreflang` links. A page only advertises a translation when one actually exists: the home pages pass `alternateUrl`, and a blog post passes it only when `getTranslation()` finds a counterpart with the same slug in the other language. When there is no counterpart, the page emits its own `hreflang` plus `x-default` pointing at itself instead of pretending an English or Spanish version exists.

## What the duplication costs

The two home pages are near-duplicates. `src/pages/index.astro` and `src/pages/es/index.astro` import the same island and pass the same prop shape, but each one resolves its own strings and declares its own `lang`. Every copy change is a two-file edit. That is the price of build-time translation without a routing abstraction.

For one landing page, I consider it a good trade. There is no hidden machinery to debug, the output is plain HTML, and the language of a page is obvious from its path. The blog follows the same rule at a smaller scale: each entry declares its `lang` in frontmatter, and the page generator asks for the entries that match. If the site grows into dozens of pages with shared navigation and dynamic copy, the duplication will stop being cheap and I will revisit the decision. For now, the whole translation system is one small file and two JSON objects.
