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
    "accent": "text-[#fb0]",
    "accent-bg": "bg-gradient-to-br from-[#af0069] to-[#fb0]",
    "card": "bg-[rgba(0,0,0,0.6)] backdrop-blur-[24px] border border-[#fb0] rounded-[8px]",
    "section-container": "max-w-5xl mx-auto px-6 py-10 md:py-20",
    "font-brand": "font-[xi72yow,sans-serif]",
    "text-secondary": "text-[#a7a7a7]",
    "text-muted": "text-[#666]",
    "label": "text-[0.8rem] font-600 uppercase tracking-[0.05em] text-[#fb0]",
  },
  theme: {
    colors: {
      magenta: "#af0069",
      gold: "#fb0",
      surface: {
        DEFAULT: "#222",
      },
    },
    borderRadius: {
      DEFAULT: "8px",
      sm: "4px",
      md: "6px",
      lg: "8px",
      xl: "8px",
      "2xl": "8px",
      "3xl": "8px",
      full: "9999px",
    },
  },
});
