import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "../blog" }),
  schema: z.object({
    title: z.string(),
    titleDe: z.string().optional(),
    description: z.string(),
    descriptionDe: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    site: z.enum(["both", "xi72yow"]).default("both"),
  }),
});

const blogDe = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "../blog-de" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const readmes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "../readmes-processed" }),
  schema: z.object({}),
});

export const collections = { blog, blogDe, readmes };
