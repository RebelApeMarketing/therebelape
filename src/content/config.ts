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

const locations = defineCollection({
  type: 'content',
  schema: z.object({
    city: z.string(),
    state: z.string(),
    stateAbbr: z.string(),
    region: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    clientType: z.string(), // e.g., "Medical Spa in Salt Lake City", "Roofing Company in Northern Utah"
    industry: z.string(),
    description: z.string(),
    image: z.string().optional(),
    excerpt: z.string(),
    results: z.object({
      metric1: z.string(),
      metric2: z.string().optional(),
      metric3: z.string().optional(),
    }),
    timeline: z.string(),
    services: z.array(z.string()),
    publishDate: z.coerce.date(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts,
  pages,
  locations,
  caseStudies,
};