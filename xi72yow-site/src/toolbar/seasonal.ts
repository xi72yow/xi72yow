import { defineToolbarApp } from "astro/toolbar";

export default defineToolbarApp({
  init(canvas, app) {
    const seasons = ["winter", "newyear", "valentine", "spring", "summer", "autumn", "halloween", "nikolaus", "christmas", "birthday"] as const;
    const labels: Record<string, string> = {
      winter: "Winter",
      newyear: "Neujahr",
      valentine: "Valentinstag",
      spring: "Fruehling",
      summer: "Sommer",
      autumn: "Herbst",
      halloween: "Halloween",
      nikolaus: "Nikolaus",
      christmas: "Weihnachten",
      birthday: "Geburtstag",
    };

    const container = document.createElement("astro-dev-toolbar-window");
    const heading = document.createElement("h2");
    heading.textContent = "Saison-Effekt";
    heading.style.marginBottom = "8px";
    container.appendChild(heading);

    for (const s of seasons) {
      const btn = document.createElement("astro-dev-toolbar-button");
      btn.textContent = labels[s];
      btn.dataset.season = s;
      btn.style.display = "block";
      btn.style.marginBottom = "4px";
      btn.addEventListener("click", () => {
        (window as any).__seasonOverride = s;
        window.dispatchEvent(new CustomEvent("season-change", { detail: s }));
        // highlight active
        container.querySelectorAll("astro-dev-toolbar-button").forEach((b: any) => {
          b.toggleAttribute("active", b.dataset.season === s);
        });
      });
      container.appendChild(btn);
    }

    canvas.appendChild(container);

    app.onToggled(({ state }) => {
      container.style.display = state ? "block" : "none";
    });
  },
});
