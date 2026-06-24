import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/blog",
  }),

  schema: ({ image }) =>
    z.object({
      title: z.string().min(10).max(120),
      description: z.string().min(50).max(160),
      slug: z.string().optional(),
      category: z.string().min(2),
      tags: z.array(z.string()).default([]),
      author: z.string().default("Javier Bernal"),
      cover: image(),
      date: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      robots: z.boolean().default(true),
    }),
});

export const collections = {
  blog,
};