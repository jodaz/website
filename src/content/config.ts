import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    image: image().optional(),
    tags: z.array(z.string()).default([]),
    isFeatured: z.boolean().default(false),
    githubUrl: z.string().url().optional(),
    liveUrl: z.string().url().optional(),
    lang: z.enum(['en', 'es']).default('en'),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    lang: z.enum(['en', 'es']).default('en'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  'projects': projects,
  'blog': blog,
};
