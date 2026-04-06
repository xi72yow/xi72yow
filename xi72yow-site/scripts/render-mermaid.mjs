import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { glob } from "glob";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { lookup } from "node:dns";
import puppeteer from "puppeteer";

const distDir = join(import.meta.dirname, "../dist");
const mermaidPath = join(import.meta.dirname, "../node_modules/mermaid/dist/mermaid.min.js");

// Simple static file server for dist/
function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let filePath = join(distDir, req.url === "/" ? "/index.html" : req.url);
      if (!filePath.includes(".")) filePath += "/index.html";
      try {
        const data = await readFile(filePath);
        const ext = filePath.split(".").pop();
        const types = { html: "text/html", css: "text/css", js: "application/javascript", svg: "image/svg+xml", woff2: "font/woff2", woff: "font/woff", png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function main() {
  const files = await glob("**/*.html", { cwd: distDir, absolute: true });

  const mermaidFiles = files.filter((f) => {
    const html = readFileSync(f, "utf-8");
    return /data-language="mermaid"|class="language-mermaid"/.test(html);
  });

  if (mermaidFiles.length === 0) {
    console.log("No mermaid diagrams found.");
    return;
  }

  console.log(`Found mermaid diagrams in ${mermaidFiles.length} file(s).`);

  // Start local server so puppeteer can load CSS, fonts, etc.
  const { server, port } = await startServer();
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

  for (const file of mermaidFiles) {
    const relPath = file.replace(distDir, "");
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Load via HTTP so fonts and CSS work
    await page.goto(`http://localhost:${port}${relPath}`, { waitUntil: "networkidle0" });

    // Wait for fonts to be ready
    await page.evaluate(() => document.fonts.ready);

    // Inject mermaid
    const mermaidJs = readFileSync(mermaidPath, "utf-8");
    await page.addScriptTag({ content: mermaidJs });

    const count = await page.evaluate(async () => {
      const blocks = document.querySelectorAll(
        'pre[data-language="mermaid"], pre > code.language-mermaid'
      );
      if (!blocks.length) return 0;

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          background: "transparent",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
          primaryColor: "#333",
          primaryTextColor: "#e1e4e8",
          primaryBorderColor: "#888",
          lineColor: "#888",
          secondaryColor: "#2a2a2a",
          tertiaryColor: "#1a1a1a",
          mainBkg: "#333",
          nodeBorder: "#888",
          clusterBkg: "transparent",
          clusterBorder: "transparent",
          titleColor: "#e1e4e8",
          edgeLabelBackground: "transparent",
          nodeTextColor: "#e1e4e8",
          actorTextColor: "#e1e4e8",
          actorBkg: "#333",
          actorBorder: "#888",
          actorLineColor: "#888",
          signalColor: "#888",
          signalTextColor: "#e1e4e8",
          labelBoxBkgColor: "#333",
          labelBoxBorderColor: "#888",
          labelTextColor: "#e1e4e8",
          loopTextColor: "#e1e4e8",
          noteBkgColor: "#2a2a2a",
          noteBorderColor: "#888",
          noteTextColor: "#e1e4e8",
          activationBkgColor: "#333",
          activationBorderColor: "#888",
          sequenceNumberColor: "#222",
          git0: "#af0069",
          git1: "#fb0",
          git2: "#33ccff",
          git3: "#ff6600",
          gitBranchLabel0: "#e1e4e8",
          gitBranchLabel1: "#e1e4e8",
          gitBranchLabel2: "#e1e4e8",
          gitBranchLabel3: "#e1e4e8",
          gitInv0: "#e1e4e8",
        },
        securityLevel: "loose",
        flowchart: { useMaxWidth: false, htmlLabels: true },
        sequence: { useMaxWidth: false },
      });

      // Render in a full-width offscreen container
      const renderBox = document.createElement("div");
      renderBox.style.cssText = "position:absolute;left:0;top:0;width:1800px;visibility:hidden;";
      document.body.appendChild(renderBox);

      let count = 0;
      for (const el of blocks) {
        const pre = el.tagName === "CODE" ? el.parentElement : el;
        const code = pre.textContent;
        const div = document.createElement("div");
        div.className = "mermaid";
        renderBox.appendChild(div);
        try {
          const { svg } = await mermaid.render(
            "mermaid-" + Math.random().toString(36).slice(2),
            code
          );
          div.innerHTML = svg;
          count++;
        } catch (e) {
          renderBox.removeChild(div);
          continue;
        }
        pre.replaceWith(div);
      }
      renderBox.remove();
      return count;
    });

    // Remove injected mermaid script and artifacts
    await page.evaluate(() => {
      document.querySelectorAll("script").forEach((s) => {
        if (s.textContent.includes("mermaid")) s.remove();
      });
      document.querySelectorAll("[id^='dmermaid-']").forEach((el) => el.remove());
      document.querySelectorAll(".mermaid-main-font").forEach((el) => el.remove());
    });

    const rendered = await page.content();
    writeFileSync(file, rendered);
    console.log(`  ${file} (${count} diagram(s))`);

    await page.close();
  }

  await browser.close();
  server.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
