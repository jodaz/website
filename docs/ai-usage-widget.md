# AI usage widget

A section on the landing page that shows how many tokens I actually push through
my AI coding tools, broken down by model and by harness.

There is no API, no key and no backend. A local script reads the session logs the
tools already write on my machine, aggregates them into a small JSON file, and the
Astro build bakes that file into the page.

```
~/.claude/projects/**/*.jsonl          ─┐
~/.grok/sessions/**/updates.jsonl      ─┼─> scripts/collect-ai-usage.mjs ─> src/data/ai-usage.json ─> build
(other harnesses, opt-in)              ─┘
```

## Refreshing the numbers

```bash
pnpm usage                    # all time -> src/data/ai-usage.json (7/30-day figures are derived from the daily series)
git add src/data/ai-usage.json && git commit -m "chore: refresh AI usage"
git push                      # redeploy publishes the new numbers
```

Useful flags:

| Flag | What it does |
|---|---|
| `--days 365` | widen the window (default 90) |
| `--all` | no window at all |
| `--top 12` | how many models to list before folding the rest into "Other" (default 8) |
| `--include-generic` | also scan harnesses with no documented log format (Gemini CLI, OpenCode, Aider, Cline). Marked *approximate* in the output because those logs may be cumulative. |
| `--dry-run` | print the summary, write nothing |
| `--verbose` | also print the per-model table, split into main thread vs subagent tokens |
| `--out path.json` | write somewhere else |

Preview before committing anything:

```bash
node scripts/collect-ai-usage.mjs --days 365 --verbose --dry-run
```

`CLAUDE_CONFIG_DIR` and `GROK_HOME` are honoured if either tool is installed
somewhere non-standard.

### Keeping it current automatically

A weekly cron entry is enough, since the site rebuilds on push. Cron does not
support backslash line continuation, so keep the command on one line, and use
the absolute path to `node` (`which node`) because cron does not load nvm:

```cron
NODE=/home/jesus/.nvm/versions/node/v24.20.0/bin/node
0 9 * * 1 cd ~/projects/website && $NODE scripts/collect-ai-usage.mjs && git commit -am "chore: refresh AI usage" && git push
```

The push needs non-interactive git auth (an SSH key without a passphrase or a
credential helper), and the job commits to whatever branch is checked out.

## What is and isn't in the JSON

Only aggregate counts. The script never copies prompts, responses, file paths,
project names or session ids into the output — session counts are cardinalities,
not identifiers. Look at `src/data/ai-usage.json` before committing; it is small
enough to read in full.

## Where the numbers come from

**Claude Code** writes one JSONL per session under `~/.claude/projects/`. Assistant
lines carry `message.model` and a `message.usage` object with `input_tokens`,
`output_tokens`, `cache_creation_input_tokens` and `cache_read_input_tokens`. Those
are per-message, so they're summed and deduplicated on message id + request id (the
same message can appear in more than one transcript after a `--resume`).

Subagent turns (the `Agent` tool) are written to `<session>/subagents/agent-*.jsonl`
with the same line shape, plus `isSidechain: true` and an `agentId`. They carry the
parent `sessionId`, so they fold into the parent session rather than inflating the
session count, and each line is bucketed under the model the *subagent* ran on, not
the parent's. Their tokens are counted into every total and also tracked as
`subagent` (a slice of `total`) on the totals, each harness and each model, with
`subagents` on the harness being the number of distinct agent runs. Grok and the
generic adapters report `subagent: 0`.

**Grok CLI** writes `~/.grok/sessions/<encoded-cwd>/<session-id>/updates.jsonl`.
Each line is a JSON-RPC envelope; the ones that matter carry
`params.update.sessionUpdate === "turn_completed"` with a `usage` object, and
`usage.modelUsage` splits that turn per model (one turn can span several). Counts
are per turn and not cumulative, so they're summed and deduplicated on session +
prompt id. Turns that were cancelled or rate-limited log no `usage` at all and are
skipped.

Two Grok-specific quirks, both handled — verified against real logs rather than
assumed:

- `inputTokens` **includes** `cachedReadTokens` (`totalTokens` is just input +
  output), so the cached part is subtracted out of input to stay comparable with
  Claude Code, whose `input_tokens` excludes cache.
- `reasoningTokens` is a **subset of** `outputTokens`, not an addition. It is
  tracked and shown as a footnote, never added into any total.

Cache reads dominate every agentic run — that's the nature of a long tool-use loop,
not a mistake in the counting. The widget gives them their own tile so the headline
number is readable rather than mysterious.

### Adding a harness

Add an adapter function in `scripts/collect-ai-usage.mjs` next to `collectGrok()`
and call `record({ harness, model, day, session, usage, sidechain?, agentId? })` per
message or turn (`sidechain: true` marks subagent usage). Add
a label in `HARNESS_LABELS`. The widget picks up new harnesses automatically; the
first four get a colour from `SERIES_COLORS`, the rest share the neutral slot.

Before writing an adapter, check the harness's own semantics: whether counts are
per-message or cumulative, whether input includes cache, and whether reasoning is
additive. Getting those three wrong is how usage dashboards end up off by an order
of magnitude.

## The widget

| File | Role |
|---|---|
| `scripts/collect-ai-usage.mjs` | reads local logs, writes the JSON |
| `src/data/ai-usage.json` | the committed aggregate (the only thing that ships) |
| `src/data/ai-usage.ts` | types, number formatting, series colours |
| `src/lib/ai-usage-props.ts` | build-time props: pulls i18n copy, returns `undefined` when there's no data |
| `src/components/islands/HeroIsland.tsx` | "Me" / "AI usage" tabs that auto-advance every 30s with a progress bar |
| `src/components/islands/AiUsageIsland.tsx` | the card: all-time total, subagent-share tag, 7-day bars, 7/30-day sums, input/output split, models (bar split main thread / subagent) |
| `public/locales/{en,es}/common.json` | copy, under `aiUsage` and `profile.tabMe` / `profile.tabAi` |

The hero hides the tabs and shows only the photo when `totals.total` is `0`,
so a fresh checkout that has never run the collector still builds and deploys
cleanly. The 7- and 30-day figures are computed inside the island from the
`daily` series, relative to `generatedAt`, so the JSON should always be
collected all-time (the default).

The card uses a single accent (the profile's `--signal-text` token) and labels
every value directly, so nothing depends on colour alone. `SERIES_COLORS` in
`src/data/ai-usage.ts` remains available for a per-harness view if one is added
later.
