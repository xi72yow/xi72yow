import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const DIR = join(import.meta.dirname, "dist");
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

async function resolve(pathname) {
  let file = join(DIR, pathname);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, "index.html");
  } catch {}
  return file;
}

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = await resolve(pathname);

  try {
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(data);
  } catch {
    // SPA / clean URLs: try .html fallback, then 404
    try {
      const fallback = await readFile(file + ".html");
      res.writeHead(200, { "content-type": MIME[".html"] });
      res.end(fallback);
    } catch {
      const notFound = await readFile(join(DIR, "404.html")).catch(() => null);
      res.writeHead(404, { "content-type": MIME[".html"] });
      res.end(notFound || "404 Not Found");
    }
  }
});

server.listen(PORT, () => console.log(`Listening on :${PORT}`));
