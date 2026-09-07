// src/components/islands/AiUsageIsland.tsx
// React Island — compact AI token-usage card that sits in the hero's "AI usage"
// tab, sized to the same box as the profile photo. Data comes from
// `src/data/ai-usage.json`, written by scripts/collect-ai-usage.mjs; the 7- and
// 30-day windows are derived here from the daily series at build time.
import { useMemo, useState } from 'react';
import { compact, formatDay, full, type AiUsage, type DailyUsage } from '@/data/ai-usage';

export interface UsageCopy {
  allTime: string;
  last7: string;
  last30: string;
  input: string;
  output: string;
  models: string;
  tokens: string;
  subagents: string;
  mainThread: string;
  updated: string;
}

interface Props {
  data: AiUsage;
  copy: UsageCopy;
  lang: string;
}

const DAY = 864e5;

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Sum of `total` over the trailing `days` days ending on `end` (inclusive). */
function windowTotal(daily: DailyUsage[], end: number, days: number): number {
  const from = isoDay(end - (days - 1) * DAY);
  return daily.reduce((acc, d) => (d.date >= from ? acc + d.total : acc), 0);
}

/** One slot per day for the last 7 days, zero-filled so the chart always has 7 bars. */
function lastSevenDays(daily: DailyUsage[], end: number): DailyUsage[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDay(end - (6 - i) * DAY);
    return byDate.get(date) ?? { date, total: 0, byHarness: {} };
  });
}

const label = 'mono text-[10px] text-[color:var(--steel)]';

function Stat({ heading, value, exact }: { heading: string; value: string; exact: string }) {
  return (
    <div>
      <p className={label}>{heading}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none tabular-nums text-[color:var(--ink)]" title={exact}>
        {value}
      </p>
    </div>
  );
}

function WeekBars({ days, lang, copy }: { days: DailyUsage[]; lang: string; copy: UsageCopy }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.total), 1);
  const active = hover !== null ? days[hover] : null;

  return (
    <div className="relative flex flex-1 flex-col max-[820px]:flex-none">
      <div
        className="flex min-h-0 flex-1 items-end justify-between gap-2 max-[820px]:h-12 max-[820px]:flex-none"
        onPointerLeave={() => setHover(null)}
      >
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            aria-label={`${formatDay(d.date, lang)}: ${full(d.total)} ${copy.tokens}`}
            className="group flex h-full flex-1 cursor-default items-end"
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span
              className={`block w-full transition-opacity ${
                hover === null || hover === i ? 'opacity-100' : 'opacity-40'
              } bg-[color:var(--signal-text)]`}
              style={{ height: `${Math.max((d.total / max) * 100, 2)}%` }}
            />
          </button>
        ))}
      </div>
      {active ? (
        <p className="pointer-events-none absolute left-0 top-0 text-[11px] tabular-nums text-[color:var(--ink)]">
          {formatDay(active.date, lang)} · {compact(active.total)}
        </p>
      ) : null}
    </div>
  );
}

const AiUsageIsland = ({ data, copy, lang }: Props) => {
  const end = useMemo(() => {
    const t = new Date(data.generatedAt).getTime();
    return Number.isNaN(t) ? Date.now() : t;
  }, [data.generatedAt]);

  const week = useMemo(() => lastSevenDays(data.daily, end), [data.daily, end]);
  const last7 = useMemo(() => windowTotal(data.daily, end, 7), [data.daily, end]);
  const last30 = useMemo(() => windowTotal(data.daily, end, 30), [data.daily, end]);

  const { totals } = data;
  const io = totals.input + totals.output || 1;
  const inputShare = (totals.input / io) * 100;
  const modelMax = Math.max(...data.models.map((m) => m.total), 1);
  const modelSum = data.models.reduce((acc, m) => acc + m.total, 0) || 1;
  const subagent = totals.subagent ?? 0;
  const subagentShare = totals.total > 0 ? (subagent / totals.total) * 100 : 0;

  return (
    <div className="absolute inset-0 flex flex-col gap-3 bg-[color:var(--tint)] p-4 text-[color:var(--ink)] max-[820px]:relative max-[820px]:inset-auto max-[820px]:gap-2 sm:p-5">
      {subagent > 0 ? (
        <p
          className={`${label} absolute right-4 top-4 border-2 border-[color:var(--rule-color)] px-1.5 py-0.5 tabular-nums sm:right-5 sm:top-5`}
          title={`${full(subagent)} ${copy.tokens} · ${copy.subagents}`}
        >
          <span className="text-[color:var(--ink)]">{subagentShare.toFixed(0)}%</span> {copy.subagents}
        </p>
      ) : null}
      <div>
        <p className={label}>{copy.allTime}</p>
        <p className="mt-1 text-4xl font-bold leading-none tabular-nums" title={full(totals.total)}>
          {compact(totals.total)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat heading={copy.last7} value={compact(last7)} exact={full(last7)} />
        <Stat heading={copy.last30} value={compact(last30)} exact={full(last30)} />
      </div>

      <WeekBars days={week} lang={lang} copy={copy} />

      <div>
        <div className="flex justify-between">
          <p className={label}>
            {copy.input} <span className="text-[color:var(--ink)]">{compact(totals.input)}</span>
          </p>
          <p className={label}>
            <span className="text-[color:var(--ink)]">{compact(totals.output)}</span> {copy.output}
          </p>
        </div>
        <div
          className="mt-1 flex h-1.5 w-full bg-[color:var(--rule-color)]"
          role="img"
          aria-label={`${copy.input} ${full(totals.input)}, ${copy.output} ${full(totals.output)}`}
        >
          <span className="h-full bg-[color:var(--signal-text)]" style={{ width: `${inputShare}%` }} />
          <span className="h-full flex-1 bg-[color:var(--ink)]" />
        </div>
      </div>

      <div>
        <p className={label}>{copy.models}</p>
        <ul className="mt-1 space-y-1">
          {data.models.map((m) => {
            const sub = m.subagent ?? 0;
            const main = Math.max(m.total - sub, 0);
            const subPct = m.total > 0 ? (sub / m.total) * 100 : 0;
            return (
              <li key={`${m.harness}:${m.id}`} className="text-xs leading-tight">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{m.label}</span>
                  <span className="shrink-0 tabular-nums text-[color:var(--steel)]">
                    {((m.total / modelSum) * 100).toFixed(0)}%
                  </span>
                </div>
                <div
                  className="mt-0.5 flex h-px w-full bg-[color:var(--rule-color)]"
                  role="img"
                  aria-label={`${copy.mainThread} ${full(main)}, ${copy.subagents} ${full(sub)}`}
                  title={`${copy.mainThread} ${full(main)} · ${copy.subagents} ${full(sub)} (${subPct.toFixed(0)}%)`}
                >
                  <div className="flex h-full" style={{ width: `${Math.max((m.total / modelMax) * 100, 1)}%` }}>
                    <span className="h-full bg-[color:var(--signal-text)]" style={{ width: `${100 - subPct}%` }} />
                    <span className="h-full flex-1 bg-[color:var(--ink)]" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className={label}>
        {copy.updated}{' '}
        <time dateTime={data.generatedAt}>{formatDay(data.generatedAt.slice(0, 10), lang)}</time>
      </p>
    </div>
  );
};

export default AiUsageIsland;
