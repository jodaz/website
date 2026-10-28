// src/lib/blog.ts
// Build-time helpers for the blog collection. Entries live next to their
// translation (src/content/blog/en/..., src/content/blog/es/...), so a legacy
// entry slug looks like "en/my-post" and the public slug is its last segment.
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '@/lib/i18n';

export type BlogPost = CollectionEntry<'blog'>;

const WORDS_PER_MINUTE = 200;

export async function getPosts(lang: Lang): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => {
    if (data.lang !== lang) return false;
    return import.meta.env.DEV || !data.draft;
  });

  return posts.sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime(),
  );
}

export async function getLatestPost(lang: Lang): Promise<BlogPost | undefined> {
  const posts = await getPosts(lang);
  return posts[0];
}

export function postSlug(post: BlogPost): string {
  return post.slug.split('/').pop() ?? post.slug;
}

export function blogHref(lang: Lang): string {
  return lang === 'es' ? '/es/blog' : '/blog';
}

export function postHref(lang: Lang, slug: string): string {
  return `${blogHref(lang)}/${slug}`;
}

export async function getTranslation(post: BlogPost): Promise<BlogPost | undefined> {
  const otherLang: Lang = post.data.lang === 'es' ? 'en' : 'es';
  const slug = postSlug(post);

  const candidates = await getCollection(
    'blog',
    ({ data }) => data.lang === otherLang && !data.draft,
  );

  return candidates.find((candidate) => postSlug(candidate) === slug);
}

export function readingTime(body: string): number {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
