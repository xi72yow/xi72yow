import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import { join } from "node:path";

const repos = JSON.parse(readFileSync(join(import.meta.dirname, "../../repos.json"), "utf-8"));
const outDir = join(import.meta.dirname, "../public/images");
mkdirSync(outDir, { recursive: true });

for (const repo of repos.repos) {
  if (!repo.image) continue;

  const filename = `${repo.name}.webp`;
  console.log(`Fetching ${repo.name} image...`);

  try {
    const res = await fetch(repo.image);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(outDir, filename));
    console.log(`  → ${filename}`);
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
  }
}

// Profile photo
const photoUrl = "https://github.com/user-attachments/assets/708d1434-91f0-45c7-81e8-c51178313213";
console.log("Fetching profile photo...");
try {
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(import.meta.dirname, "../public/photo.webp"));
  console.log("  → photo.webp");
} catch (e) {
  console.error(`  Failed: ${e.message}`);
}

console.log("Done.");
