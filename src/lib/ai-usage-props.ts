// src/lib/ai-usage-props.ts — build-time props for the AI usage tab in the hero.
// Resolves copy with t() here so the React island only receives plain strings.
// Returns undefined when the committed JSON has no usage yet, so a fresh
// checkout still builds and the hero simply hides the tab.
import usage from '@/data/ai-usage.json';
import type { AiUsage } from '@/data/ai-usage';
import type { UsageCopy } from '@/components/islands/AiUsageIsland';
import { useTranslations, type Lang } from '@/lib/i18n';

export interface AiUsageProps {
  data: AiUsage;
  copy: UsageCopy;
}

export function getAiUsageProps(lang: Lang): AiUsageProps | undefined {
  const data = usage as unknown as AiUsage;
  if (!data?.totals?.total || !data.models?.length) return undefined;
  const t = useTranslations(lang);
  return {
    data,
    copy: {
      allTime: t('aiUsage.allTime'),
      last7: t('aiUsage.last7'),
      last30: t('aiUsage.last30'),
      input: t('aiUsage.input'),
      output: t('aiUsage.output'),
      models: t('aiUsage.models'),
      tokens: t('aiUsage.tokens'),
      subagents: t('aiUsage.subagents'),
      mainThread: t('aiUsage.mainThread'),
      updated: t('aiUsage.updated'),
    },
  };
}
