// src/components/HeaderInteractive.tsx
// React Island — logo name reveal + language switching. Same minimal bar on
// every screen size: logo left, ES/EN right. No menu, no scroll styling.
import { useState, useEffect } from 'react';

interface Props {
  logoSrc: string;
  lang: string;
  altLangHref: string;
  isOpaque?: boolean;
}

const HeaderInteractive = ({ logoSrc, lang, altLangHref, isOpaque = false }: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isIntroing, setIsIntroing] = useState(true);

  useEffect(() => {
    // Intro animation: show name for 1.5 seconds on mount
    const timer = setTimeout(() => setIsIntroing(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const showName = isHovered || isIntroing;
  const altLang = lang === 'es' ? 'EN' : 'ES';

  const handleLangSwitch = () => {
    const targetLang = lang === 'es' ? 'en' : 'es';
    localStorage.setItem('preferred_lang', targetLang);
    sessionStorage.removeItem('lang_redirected');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOpaque ? 'bg-brand-dark py-1' : 'bg-transparent py-2'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12 lg:h-14">
          {/* Logo */}
          <a
            href={lang === 'es' ? '/es' : '/'}
            className="flex items-center transition-transform hover:scale-105 group px-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <img
              src={logoSrc}
              alt="Jesus Ordosgoitty Logo"
              className={`h-8 lg:h-9 w-auto transition-all duration-300 ${isOpaque ? 'brightness-0 invert' : ''}`}
            />
            <div
              className={`flex items-center transition-all duration-700 ease-in-out overflow-hidden whitespace-nowrap ${
                showName ? 'max-w-[300px] opacity-100' : 'max-w-0 opacity-0'
              } ${isOpaque ? 'text-white' : 'text-blue-50'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full opacity-60 mr-4 ml-4 ${isOpaque ? 'bg-white' : 'bg-brand-bright'}`} />
              <span className="text-lg lg:text-xl font-bold tracking-tight">
                Jesus Ordosgoitty
              </span>
            </div>
          </a>

          {/* Language switcher */}
          <a
            href={altLangHref}
            onClick={handleLangSwitch}
            className="text-sm px-3 py-1 rounded-none transition-all duration-300 font-bold text-blue-50 hover:bg-white hover:text-brand-dark"
            aria-label={`Switch to ${altLang}`}
          >
            {altLang}
          </a>
        </div>
      </div>
    </header>
  );
};

export default HeaderInteractive;
