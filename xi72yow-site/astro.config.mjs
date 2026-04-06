import { defineConfig } from "astro/config";
import UnoCSS from "@unocss/astro";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://xi72yow.de",
  integrations: [UnoCSS({ injectReset: true }), sitemap(), {
    name: "seasonal-toolbar",
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp }) => {
        addDevToolbarApp({
          id: "seasonal-effects",
          name: "Saison-Effekte",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="m3 9 3 3-3 3"/><path d="M12 6 9 9l3 3"/><path d="m22 2-5 10"/><path d="m17 12 5 10"/><circle cx="19" cy="12" r="2"/></svg>`,
          entrypoint: "./src/toolbar/seasonal.ts",
        });
      },
    },
  }],
  output: "static",
});
