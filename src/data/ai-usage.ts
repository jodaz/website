// src/data/ai-usage.ts — types + presentation helpers for the AI usage widget.
// The JSON this describes is produced by `scripts/collect-ai-usage.mjs`.

export interface UsageBreakdown {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  /** Slice of `total` produced by subagent / sidechain turns. Always <= total. */
  subagent: number;
  total: number;
}

export interface HarnessUsage extends UsageBreakdown {
  id: string;
  label: string;
  models: number;
  sessions: number;
  /** Distinct subagent runs (Claude Code `agentId`). */
  subagents: number;
  approximate?: boolean;
}

export interface ModelUsage extends UsageBreakdown {
  id: string;
  label: string;
  harness: string;
  vendor: string;
}

export interface DailyUsage {
  date: string;
  total: number;
  byHarness: Record<string, number>;
}

export interface AiUsage {
  generatedAt: string;
  window: { days: number | null; from: string | null; to: string | null };
  totals: UsageBreakdown & { sessions: number; activeDays: number };
  harnesses: HarnessUsage[];
  models: ModelUsage[];
  daily: DailyUsage[];
  sources: string[];
}

/**
 * Categorical series colors, stepped for the dark surface (#0f172a) and
 * validated for colour-vision deficiency: the first three clear every gate on
 * all pairs, the fourth on adjacent pairs. Anything past the fourth harness
 * folds into the neutral "other" slot rather than inventing a hue.
 */
export const SERIES_COLORS = ['#0b5ef3', '#d95926', '#199e70', '#c98500'] as const;
export const SERIES_OTHER = '#94a3b8';

export function harnessColorMap(harnesses: { id: string }[]): Record<string, string> {
  const map: Record<string, string> = { other: SERIES_OTHER };
  harnesses.forEach((h, i) => {
    map[h.id] = SERIES_COLORS[i] ?? SERIES_OTHER;
  });
  return map;
}

/** 1284 -> "1,284"; 12_900 -> "12.9K"; 4_200_000_000 -> "4.2B" */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 10_000) return n.toLocaleString('en-US');
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const value = n / size;
      return `${value >= 100 ? Math.round(value) : value.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return n.toLocaleString('en-US');
}

export const full = (n: number): string => Math.round(n).toLocaleString('en-US');

export function formatDay(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
