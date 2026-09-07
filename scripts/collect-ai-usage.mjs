#!/usr/bin/env node
/**
 * collect-ai-usage.mjs — aggregate local AI coding-harness token usage.
 *
 * Reads the JSONL session logs that Claude Code and Grok CLI already
 * write on this machine, and emits a small aggregate JSON for the website
 * widget. Nothing but counts leaves the log files: no prompts, no file paths,
 * no project names, no session ids.
 *
 * Usage:
 *   node scripts/collect-ai-usage.mjs                  # all time -> src/data/ai-usage.json
 *   node scripts/collect-ai-usage.mjs --days 365
 *   node scripts/collect-ai-usage.mjs --days 90        # limit to a trailing window
 *   node scripts/collect-ai-usage.mjs --include-generic # also scan unknown harnesses (approximate)
 *   node scripts/collect-ai-usage.mjs --dry-run        # print the summary, write nothing
 *   node scripts/collect-ai-usage.mjs --out path.json
 *
 * Requires Node >= 18. No dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = {
    days: 0,
    out: path.join(REPO_ROOT, 'src', 'data', 'ai-usage.json'),
    topModels: 8,
    includeGeneric: false,
    dryRun: false,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') opts.days = 0;
    else if (a === '--days') opts.days = Number(argv[++i]);
    else if (a === '--out') opts.out = path.resolve(process.cwd(), argv[++i]);
    else if (a === '--top') opts.topModels = Number(argv[++i]);
    else if (a === '--include-generic') opts.includeGeneric = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else {
      console.error(`unknown flag: ${a}`);
      process.exit(2);
    }
  }
  if (!Number.isFinite(opts.days) || opts.days < 0) {
    console.error('--days expects a non-negative number');
    process.exit(2);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const HOME = os.homedir();
const CUTOFF = opts.days > 0 ? new Date(Date.now() - opts.days * 864e5).toISOString().slice(0, 10) : null;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const exists = (p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
};

/** Recursively collect files matching `test`, bounded so a stray huge tree can't hang us. */
function walk(dir, test, { maxDepth = 8, limit = 20000 } = {}) {
  const out = [];
  const stack = [[dir, 0]];
  while (stack.length && out.length < limit) {
    const [current, depth] = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (depth < maxDepth && !entry.name.startsWith('node_modules')) stack.push([full, depth + 1]);
      } else if (entry.isFile() && test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

async function eachLine(file, fn) {
  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let index = 0;
  try {
    for await (const line of rl) {
      index += 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed[0] !== '{') continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      fn(obj, index);
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

/** ISO timestamp -> YYYY-MM-DD, tolerant of epoch seconds/millis. */
function toDay(value, fallback) {
  if (typeof value === 'string' && value.length >= 10) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 0) {
    const d = new Date(value > 1e12 ? value : value * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return fallback;
}

/* ------------------------------------------------------------------ *
 * Accumulator
 * ------------------------------------------------------------------ */

// `subagent` is the slice of `total` that came from sidechain / subagent turns
// (Claude Code `isSidechain: true`); it is a subset, never added on top.
const EMPTY = () => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, subagent: 0 });

const store = {
  harness: new Map(), // harnessId -> { ...EMPTY, sessions:Set, models:Set, agents:Set }
  model: new Map(), // `${harness}::${model}` -> { ...EMPTY, harness, model }
  daily: new Map(), // day -> { total, byHarness: Map }
  sessions: new Set(),
  files: 0,
  skippedOutOfRange: 0,
};

function record({ harness, model, day, usage, session, sidechain = false, agentId = null }) {
  if (CUTOFF && day && day < CUTOFF) {
    store.skippedOutOfRange += 1;
    return;
  }
  // `reasoning` is a subset of `output` wherever a harness reports it, so it
  // is tracked for display but never added into a total.
  const total = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
  if (total <= 0) return;

  let h = store.harness.get(harness);
  if (!h) {
    h = { ...EMPTY(), sessions: new Set(), models: new Set(), agents: new Set() };
    store.harness.set(harness, h);
  }
  const mKey = `${harness}::${model}`;
  let m = store.model.get(mKey);
  if (!m) {
    m = { ...EMPTY(), harness, model };
    store.model.set(mKey, m);
  }
  for (const k of ['input', 'output', 'cacheRead', 'cacheWrite', 'reasoning']) {
    h[k] += usage[k];
    m[k] += usage[k];
  }
  if (sidechain) {
    h.subagent += total;
    m.subagent += total;
    if (agentId) h.agents.add(agentId);
  }
  h.models.add(model);
  if (session) {
    h.sessions.add(session);
    store.sessions.add(`${harness}::${session}`);
  }

  if (day) {
    let d = store.daily.get(day);
    if (!d) {
      d = { total: 0, byHarness: new Map() };
      store.daily.set(day, d);
    }
    d.total += total;
    d.byHarness.set(harness, (d.byHarness.get(harness) ?? 0) + total);
  }
}

/* ------------------------------------------------------------------ *
 * Adapter: Claude Code  (~/.claude/projects/**\/*.jsonl)
 *
 * Assistant lines carry `message.model` and `message.usage` with
 * input_tokens / output_tokens / cache_creation_input_tokens /
 * cache_read_input_tokens. Counts are per message, so they are summed and
 * deduplicated on message id + requestId (the same message can be replayed
 * into more than one transcript file, e.g. after a resume).
 *
 * Subagent turns live in `<session>/subagents/agent-*.jsonl` with the same
 * shape, plus `isSidechain: true` and an `agentId`. They carry the parent
 * sessionId, so they fold into the parent session and are flagged as subagent
 * usage rather than counted as extra sessions.
 * ------------------------------------------------------------------ */

async function collectClaudeCode() {
  const roots = [
    process.env.CLAUDE_CONFIG_DIR,
    path.join(HOME, '.claude'),
    path.join(HOME, '.config', 'claude'),
  ].filter(Boolean);

  const seen = new Set();
  let found = false;

  for (const root of roots) {
    const projects = path.join(root, 'projects');
    if (!exists(projects)) continue;
    found = true;
    const files = walk(projects, (n) => n.endsWith('.jsonl'));
    for (const file of files) {
      store.files += 1;
      const fallbackDay = toDay(fs.statSync(file).mtimeMs, null);
      await eachLine(file, (o) => {
        if (o.type !== 'assistant') return;
        const msg = o.message;
        const u = msg?.usage;
        if (!u) return;
        const model = String(msg.model ?? 'unknown');
        if (model === '<synthetic>' || model === 'unknown') return;

        const key = `${msg.id ?? ''}|${o.requestId ?? o.uuid ?? ''}`;
        if (key !== '|') {
          if (seen.has(key)) return;
          seen.add(key);
        }

        record({
          harness: 'claude-code',
          model,
          day: toDay(o.timestamp, fallbackDay),
          session: o.sessionId ?? file,
          sidechain: o.isSidechain === true,
          agentId: o.agentId ?? null,
          usage: {
            input: num(u.input_tokens),
            output: num(u.output_tokens),
            cacheRead: num(u.cache_read_input_tokens),
            cacheWrite: num(u.cache_creation_input_tokens),
            reasoning: 0,
          },
        });
      });
    }
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * Adapter: Grok CLI
 *   $GROK_HOME/sessions/<url-encoded-cwd>/<session-uuid>/updates.jsonl
 *
 * Lines are JSON-RPC envelopes: { timestamp (epoch seconds), method,
 * params: { sessionId, update, _meta } }. A `turn_completed` update may carry
 * a `usage` object, and `usage.modelUsage` breaks that turn down per model —
 * which is what we want, since one turn can span several models.
 *
 * Grok's own semantics, verified against real logs:
 *   inputTokens     includes cachedReadTokens  (totalTokens = input + output)
 *   reasoningTokens is a SUBSET of outputTokens, not an addition
 * so the cached part is subtracted out of input to stay comparable with
 * Claude Code, and reasoning is carried as an annotation rather than summed.
 *
 * Counts are per turn (not cumulative), so they are summed, deduplicated on
 * session + prompt id in case a turn is ever re-logged.
 * ------------------------------------------------------------------ */

async function collectGrok() {
  const roots = [process.env.GROK_HOME, path.join(HOME, '.grok')].filter(Boolean);
  const seen = new Set();
  let found = false;

  for (const root of roots) {
    const sessions = path.join(root, 'sessions');
    if (!exists(sessions)) continue;
    found = true;
    const files = walk(sessions, (n) => n === 'updates.jsonl');
    for (const file of files) {
      store.files += 1;
      const fallbackDay = toDay(fs.statSync(file).mtimeMs, null);

      await eachLine(file, (o) => {
        const params = o.params ?? {};
        const update = params.update ?? {};
        if (update.sessionUpdate !== 'turn_completed') return;
        const usage = update.usage;
        if (!usage) return; // a cancelled or rate-limited turn logs no usage

        const sessionId = params.sessionId ?? file;
        const key = `${sessionId}|${update.prompt_id ?? params._meta?.eventId ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);

        const day = toDay(o.timestamp ?? params._meta?.agentTimestampMs, fallbackDay);
        // Prefer the per-model split; fall back to the turn total.
        const perModel =
          usage.modelUsage && typeof usage.modelUsage === 'object' && Object.keys(usage.modelUsage).length
            ? Object.entries(usage.modelUsage)
            : [['unknown', usage]];

        for (const [model, u] of perModel) {
          const cacheRead = num(u.cachedReadTokens);
          record({
            harness: 'grok',
            model,
            day,
            session: sessionId,
            usage: {
              input: Math.max(0, num(u.inputTokens) - cacheRead),
              output: num(u.outputTokens),
              cacheRead,
              cacheWrite: num(u.cacheCreationTokens),
              reasoning: num(u.reasoningTokens),
            },
          });
        }
      });
    }
  }
  return found;
}

/* ------------------------------------------------------------------ *
 * Adapter: generic (opt-in, approximate)
 *
 * For harnesses without a documented log shape (Grok CLI, Gemini CLI,
 * OpenCode, ...) we deep-scan JSON/JSONL records for a usage-shaped object and
 * take the nearest model name. Per-message logs come out right; cumulative
 * logs may over-count, which is why these sources are flagged `approximate`.
 * ------------------------------------------------------------------ */

const GENERIC_ROOTS = [
  ['gemini-cli', path.join(HOME, '.gemini')],
  ['opencode', path.join(HOME, '.local', 'share', 'opencode')],
  ['crush', path.join(HOME, '.local', 'share', 'crush')],
  ['aider', path.join(HOME, '.aider')],
  ['cline', path.join(HOME, '.cline')],
];

const USAGE_KEYS = {
  input: ['input_tokens', 'inputTokens', 'prompt_tokens', 'promptTokens'],
  output: ['output_tokens', 'outputTokens', 'completion_tokens', 'completionTokens'],
  cacheRead: ['cache_read_input_tokens', 'cachedInputTokens', 'cached_input_tokens', 'cacheReadTokens'],
  cacheWrite: ['cache_creation_input_tokens', 'cacheCreationInputTokens', 'cacheWriteTokens'],
  reasoning: ['reasoning_output_tokens', 'reasoningTokens', 'reasoning_tokens'],
};

function readUsage(obj) {
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 };
  let any = false;
  for (const [dst, keys] of Object.entries(USAGE_KEYS)) {
    for (const k of keys) {
      if (num(obj[k]) > 0) {
        usage[dst] = num(obj[k]);
        any = true;
        break;
      }
    }
  }
  return any ? usage : null;
}

function scanGeneric(node, ctx, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) scanGeneric(item, ctx, depth + 1);
    return;
  }
  if (typeof node.model === 'string' && node.model) ctx.model = node.model;
  if (typeof node.modelId === 'string' && node.modelId) ctx.model = node.modelId;
  const ts = node.timestamp ?? node.created_at ?? node.createdAt ?? node.time;
  if (ts) ctx.day = toDay(ts, ctx.day);

  const usage = readUsage(node);
  if (usage) {
    record({
      harness: ctx.harness,
      model: ctx.model || 'unknown',
      day: ctx.day,
      session: ctx.session,
      usage,
    });
    return; // don't double count a nested duplicate of the same object
  }
  for (const value of Object.values(node)) scanGeneric(value, ctx, depth + 1);
}

async function collectGeneric() {
  const used = [];
  for (const [harness, root] of GENERIC_ROOTS) {
    if (!exists(root)) continue;
    const files = walk(root, (n) => n.endsWith('.jsonl') || n.endsWith('.json'), { maxDepth: 6 });
    let hit = false;
    for (const file of files) {
      let stat;
      try {
        stat = fs.statSync(file);
      } catch {
        continue;
      }
      if (stat.size > 64 * 1024 * 1024) continue;
      store.files += 1;
      const fallbackDay = toDay(stat.mtimeMs, null);
      const before = store.model.size;

      if (file.endsWith('.jsonl')) {
        await eachLine(file, (o) => {
          scanGeneric(o, { harness, model: 'unknown', day: fallbackDay, session: file });
        });
      } else {
        try {
          const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
          scanGeneric(parsed, { harness, model: 'unknown', day: fallbackDay, session: file });
        } catch {
          /* not our JSON */
        }
      }
      if (store.model.size > before) hit = true;
    }
    if (hit) used.push(harness);
  }
  return used;
}

/* ------------------------------------------------------------------ *
 * Presentation metadata
 * ------------------------------------------------------------------ */

const HARNESS_LABELS = {
  'claude-code': 'Claude Code',
  grok: 'Grok CLI',
  'gemini-cli': 'Gemini CLI',
  opencode: 'OpenCode',
  crush: 'Crush',
  aider: 'Aider',
  cline: 'Cline',
};

const VENDOR_RULES = [
  [/^claude|^anthropic/i, 'Anthropic'],
  [/^gpt|^o[134]|^text-davinci/i, 'OpenAI'],
  [/^gemini/i, 'Google'],
  [/^grok/i, 'xAI'],
  [/^deepseek/i, 'DeepSeek'],
  [/^qwen/i, 'Alibaba'],
  [/^llama/i, 'Meta'],
  [/^mistral|^devstral|^codestral/i, 'Mistral'],
];

function vendorOf(model) {
  for (const [re, name] of VENDOR_RULES) if (re.test(model)) return name;
  return 'Other';
}

/** `claude-opus-4-5-20251101` -> `Claude Opus 4.5`; `grok-4.6` -> `Grok 4.6`. */
function prettyModel(id) {
  let s = String(id)
    .replace(/-(\d{8})$/, '') // trailing release date
    .replace(/@\d{8}$/, '')
    .replace(/^models\//, '');
  const parts = s.split(/[-_]/).filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    // join a bare "4" + "5" pair into "4.5"
    if (/^\d+$/.test(p) && /^\d+$/.test(parts[i + 1] ?? '')) {
      out.push(`${p}.${parts[i + 1]}`);
      i += 1;
      continue;
    }
    if (/^(gpt|o\d)$/i.test(p)) out.push(p.toUpperCase());
    else if (/^\d/.test(p)) out.push(p);
    else out.push(p[0].toUpperCase() + p.slice(1));
  }
  return out.join(' ');
}

const sum = (r) => r.input + r.output + r.cacheRead + r.cacheWrite;

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const detected = [];
if (await collectClaudeCode()) detected.push('claude-code');
if (await collectGrok()) detected.push('grok');
const approximate = opts.includeGeneric ? await collectGeneric() : [];
detected.push(...approximate);

const harnesses = [...store.harness.entries()]
  .map(([id, r]) => ({
    id,
    label: HARNESS_LABELS[id] ?? prettyModel(id),
    approximate: approximate.includes(id),
    input: r.input,
    output: r.output,
    cacheRead: r.cacheRead,
    cacheWrite: r.cacheWrite,
    reasoning: r.reasoning,
    subagent: r.subagent,
    total: sum(r),
    models: r.models.size,
    sessions: r.sessions.size,
    subagents: r.agents.size,
  }))
  .filter((h) => h.total > 0)
  .sort((a, b) => b.total - a.total);

let models = [...store.model.values()]
  .map((r) => ({
    id: r.model,
    label: prettyModel(r.model),
    harness: r.harness,
    vendor: vendorOf(r.model),
    input: r.input,
    output: r.output,
    cacheRead: r.cacheRead,
    cacheWrite: r.cacheWrite,
    reasoning: r.reasoning,
    subagent: r.subagent,
    total: sum(r),
  }))
  .filter((m) => m.total > 0)
  .sort((a, b) => b.total - a.total);

if (opts.topModels > 0 && models.length > opts.topModels) {
  const rest = models.slice(opts.topModels);
  const head = models.slice(0, opts.topModels);
  const other = rest.reduce(
    (acc, m) => {
      acc.input += m.input;
      acc.output += m.output;
      acc.cacheRead += m.cacheRead;
      acc.cacheWrite += m.cacheWrite;
      acc.reasoning += m.reasoning;
      acc.subagent += m.subagent;
      acc.total += m.total;
      return acc;
    },
    {
      id: 'other',
      label: `Other (${rest.length})`,
      harness: 'other',
      vendor: 'Other',
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      subagent: 0,
      total: 0,
    },
  );
  models = [...head, other];
}

const days = [...store.daily.keys()].sort();
const daily = days.map((date) => {
  const d = store.daily.get(date);
  return {
    date,
    total: d.total,
    byHarness: Object.fromEntries([...d.byHarness.entries()].sort((a, b) => b[1] - a[1])),
  };
});

const totals = harnesses.reduce(
  (acc, h) => {
    acc.input += h.input;
    acc.output += h.output;
    acc.cacheRead += h.cacheRead;
    acc.cacheWrite += h.cacheWrite;
    acc.reasoning += h.reasoning;
    acc.subagent += h.subagent;
    acc.total += h.total;
    return acc;
  },
  { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, subagent: 0, total: 0 },
);

const payload = {
  $schema: 'https://jesus.vanguarddevs.com/schemas/ai-usage.json',
  generatedAt: new Date().toISOString(),
  window: {
    days: opts.days || null,
    from: days[0] ?? null,
    to: days[days.length - 1] ?? null,
  },
  totals: { ...totals, sessions: store.sessions.size, activeDays: days.length },
  harnesses,
  models,
  daily,
  sources: detected,
};

const pretty = (n) => n.toLocaleString('en-US');

console.log(`\nScanned ${store.files} log file(s) across: ${detected.join(', ') || 'nothing found'}`);
if (!detected.length) {
  console.log(
    'No harness logs found. Looked in ~/.claude/projects and ~/.grok/sessions' +
      (opts.includeGeneric ? ', plus the generic roots.' : '. Try --include-generic for other tools.'),
  );
}
if (approximate.length) console.log(`Approximate (undocumented log format): ${approximate.join(', ')}`);
console.log(`Window: ${payload.window.from ?? '—'} → ${payload.window.to ?? '—'} (${days.length} active days)`);
const pct = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '0%');
console.log(`Total tokens: ${pretty(totals.total)}  (subagents: ${pretty(totals.subagent)}, ${pct(totals.subagent, totals.total)})`);
for (const h of harnesses) {
  console.log(
    `  ${h.label.padEnd(14)} ${pretty(h.total).padStart(16)}  ${h.models} model(s), ${h.sessions} session(s), ${h.subagents} subagent run(s)`,
  );
}
if (opts.verbose) {
  console.log('\nBy model (main thread / subagents):');
  for (const m of models) {
    const main = m.total - m.subagent;
    console.log(
      `  ${m.label.padEnd(26)} ${pretty(m.total).padStart(16)}  main ${pretty(main).padStart(14)}  sub ${pretty(m.subagent).padStart(14)} (${pct(m.subagent, m.total)})`,
    );
  }
}
if (store.skippedOutOfRange) console.log(`(${store.skippedOutOfRange} record(s) outside the ${opts.days}-day window)`);

if (opts.dryRun) {
  console.log('\n--dry-run: nothing written.');
} else {
  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${path.relative(process.cwd(), opts.out)}`);
  console.log('Commit it and redeploy to publish the new numbers.');
}
