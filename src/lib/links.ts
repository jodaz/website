import { Globe, Github, Instagram, Linkedin, Briefcase } from 'lucide-react';

export const FOOTER_LINKS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jodaz/',
    icon: Linkedin,
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/jodaz.dev',
    icon: Instagram, 
  },
  {
    label: 'Github',
    href: 'https://github.com/jodaz-dev',
    icon: Github, 
  },
  {
    label: 'Upwork',
    href: 'https://upwork.com/freelancers/jesusordosgoitty4',
    icon: Briefcase,
  },
];

// Profile social buttons. Icon path data vendored from Phosphor Icons
// (regular weight, MIT license, https://phosphoricons.com) — same set the
// vanguarddevs profile page uses.
export const PROFILE_SOCIALS = [
  {
    label: 'GitHub',
    href: 'https://github.com/jodaz',
    path: 'M208.31 75.68A59.78 59.78 0 0 0 202.93 28a8 8 0 0 0-6.93-4a59.75 59.75 0 0 0-48 24h-24a59.75 59.75 0 0 0-48-24a8 8 0 0 0-6.93 4a59.78 59.78 0 0 0-5.38 47.68A58.14 58.14 0 0 0 56 104v8a56.06 56.06 0 0 0 48.44 55.47A39.8 39.8 0 0 0 96 192v8H72a24 24 0 0 1-24-24a40 40 0 0 0-40-40a8 8 0 0 0 0 16a24 24 0 0 1 24 24a40 40 0 0 0 40 40h24v16a8 8 0 0 0 16 0v-40a24 24 0 0 1 48 0v40a8 8 0 0 0 16 0v-40a39.8 39.8 0 0 0-8.44-24.53A56.06 56.06 0 0 0 216 112v-8a58.14 58.14 0 0 0-7.69-28.32M200 112a40 40 0 0 1-40 40h-48a40 40 0 0 1-40-40v-8a41.74 41.74 0 0 1 6.9-22.48a8 8 0 0 0 1.1-7.69a43.8 43.8 0 0 1 .79-33.58a43.88 43.88 0 0 1 32.32 20.06a8 8 0 0 0 6.71 3.69h32.35a8 8 0 0 0 6.74-3.69a43.87 43.87 0 0 1 32.32-20.06a43.8 43.8 0 0 1 .77 33.58a8.09 8.09 0 0 0 1 7.65a41.7 41.7 0 0 1 7 22.52Z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/jodaz/',
    path: 'M216 24H40a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V40a16 16 0 0 0-16-16m0 192H40V40h176zM96 112v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m88 28v36a8 8 0 0 1-16 0v-36a20 20 0 0 0-40 0v36a8 8 0 0 1-16 0v-64a8 8 0 0 1 15.79-1.78A36 36 0 0 1 184 140m-84-56a12 12 0 1 1-12-12a12 12 0 0 1 12 12',
  },
  {
    label: 'Email',
    href: 'mailto:jesus@vanguarddevs.com',
    path: 'M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19V192Z',
  },
];

export const FOOTER_CREDITS_LINK = {
  label: 'jodaz.dev',
  href: 'https://jodaz.vanguarddevs.com',
  icon: Globe,
};
