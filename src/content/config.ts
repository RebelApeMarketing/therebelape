import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    date: z.coerce.date().optional(),
    author: z.string().default('Adam Miconi'),
    image: z.string().optional(),
    canonicalUrl: z.string().optional(),
    excerpt: z.string().optional(),
    lastModified: z.string().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = {
  posts,
  pages,
};