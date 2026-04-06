import { defineConfig } from "astro/config";
import UnoCSS from "@unocss/astro";
import sitemap from "@astrojs/sitemap";
import rehypeVideoConsent from "../shared/rehype-video-consent.mjs";

export default defineConfig({
  site: "https://reinke.ing",
  integrations: [UnoCSS({ injectReset: true }), sitemap()],
  output: "static",
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid"],
    },
    shikiConfig: {
      theme: "github-dark",
    },
    rehypePlugins: [rehypeVideoConsent],
  },
});
