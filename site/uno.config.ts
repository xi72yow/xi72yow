import { defineConfig, presetUno } from "unocss";
import presetWebFonts from "@unocss/preset-web-fonts";
import transformerDirectives from "@unocss/transformer-directives";

export default defineConfig({
  presets: [
    presetUno({ dark: "media" }),
    presetWebFonts({
      provider: "bunny",
      fonts: {
        sans: [
          {
            name: "Inter",
            weights: [400, 500, 600, 700, 800, 900],
          },
        ],
        mono: ["JetBrains Mono:400,500"],
      },
    }),
  ],
  transformers: [transformerDirectives()],
  shortcuts: {
    "accent": "text-sky-600 dark:text-sky-400",
    "accent-bg": "bg-sky-600 dark:bg-sky-500",
    "card": "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg",
    "section-container": "max-w-5xl mx-auto px-6 py-10 md:py-20",
  },
  theme: {
    colors: {
      surface: {
        DEFAULT: "#fafafa",
        dark: "#0a0a0a",
      },
    },
  },
});
