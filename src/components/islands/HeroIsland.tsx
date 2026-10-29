// src/components/islands/HeroIsland.tsx
// React Island — the whole landing: founder profile rendered over the
// ColorBends animation, sized to fit a single viewport. When usage data is
// available the photo column is a two-tab panel ("Me" = photo, "AI usage" =
// token-usage card) that auto-advances every SLIDE_MS; a progress bar between
// the tabs and the box shows how far into the current slide we are.
import { useEffect, useState } from 'react';
import ColorBends from '@/components/ColorBends';
import AiUsageIsland, { type UsageCopy } from '@/components/islands/AiUsageIsland';
import type { AiUsage } from '@/data/ai-usage';

interface Social {
  href: string;
  label: string;
  path: string;
}

interface Props {
  name: string;
  role: string;
  bio: string;
  photoSrc: string;
  photoAlt: string;
  socials: Social[];
  lang: string;
  tabs: { me: string; ai: string };
  usage?: { data: AiUsage; copy: UsageCopy };
}

type Tab = 'me' | 'ai';

export const SLIDE_MS = 10_000;

const TABS: Tab[] = ['me', 'ai'];

const HeroIsland = ({ name, role, bio, photoSrc, photoAlt, socials, lang, tabs, usage }: Props) => {
  const [tab, setTab] = useState<Tab>('me');
  // Bumped on every slide change (auto or manual) so the interval and the CSS
  // animations restart from zero.
  const [cycle, setCycle] = useState(0);
  const rotate = Boolean(usage);

  useEffect(() => {
    if (!rotate) return;
    const id = window.setTimeout(() => {
      setTab((t) => (t === 'me' ? 'ai' : 'me'));
      setCycle((c) => c + 1);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [rotate, cycle]);

  const select = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setCycle((c) => c + 1);
  };

  const showUsage = rotate && tab === 'ai';

  return (
    <section className="min-h-[100dvh] bg-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 bg-black opacity-50 w-full h-full z-0">
        <ColorBends colors={['#4833e6']} noise={0.15} />
      </div>
      <div className="profile on-hero container mx-auto px-4 relative z-10" data-theme="dark">
        <div className="profile-main">
          <div className="profile-intro animate-slide-up-delayed">
            <h1 className="display">{name}</h1>
            <p className="mono profile-role">{role}</p>
            <p className="profile-bio">{bio}</p>
            <div className="profile-social">
              {socials.map(({ href, label, path }) => (
                <a
                  key={href}
                  className="btn"
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'me noopener noreferrer' : undefined}
                  aria-label={label}
                  title={label}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" aria-hidden="true">
                    <path fill="currentColor" d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <div className="profile-panel animate-slide-up-delayed" style={{ animationDelay: '0.2s' }}>
            {rotate ? (
              <>
                <div className="profile-tabs" role="tablist">
                  {TABS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`profile-tab-${key}`}
                      aria-selected={tab === key}
                      aria-controls={`profile-panel-${key}`}
                      className="mono profile-tab"
                      onClick={() => select(key)}
                    >
                      {key === 'me' ? tabs.me : tabs.ai}
                    </button>
                  ))}
                </div>
                <div className="profile-progress" aria-hidden="true">
                  <span
                    key={cycle}
                    className="profile-progress-fill"
                    style={{ animationDuration: `${SLIDE_MS}ms` }}
                  />
                </div>
              </>
            ) : null}
            <div
              className={`profile-photo${showUsage ? ' profile-photo--usage' : ''}`}
              role={rotate ? 'tabpanel' : undefined}
              id={rotate ? `profile-panel-${tab}` : undefined}
              aria-labelledby={rotate ? `profile-tab-${tab}` : undefined}
            >
              <div key={cycle} className={rotate ? 'profile-slide' : undefined}>
                {showUsage && usage ? (
                  <AiUsageIsland data={usage.data} copy={usage.copy} lang={lang} />
                ) : (
                  <img src={photoSrc} alt={photoAlt} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroIsland;
