import { defineConfig } from "astro/config";
import UnoCSS from "@unocss/astro";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://xi72yow.de",
  integrations: [UnoCSS({ injectReset: true }), sitemap()],
  output: "static",
});
