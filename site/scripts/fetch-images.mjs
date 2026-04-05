import { readFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { join } from "node:path";

const repos = JSON.parse(readFileSync(join(import.meta.dirname, "../../repos.json"), "utf-8"));
const outDir = join(import.meta.dirname, "../public/images");
mkdirSync(outDir, { recursive: true });

/** Check if ffmpeg is available */
let hasFFmpeg = false;
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  hasFFmpeg = true;
  console.log("ffmpeg found, video thumbnails enabled.");
} catch {
  console.log("ffmpeg not found, video thumbnails will be skipped.");
}

for (const repo of repos.repos) {
  // Fetch repo image
  if (repo.image) {
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

  // Extract video thumbnail (overrides image if video exists)
  if (repo.video && hasFFmpeg) {
    const thumbFile = `${repo.name}.webp`;
    const tmpFile = join(outDir, `${repo.name}_tmp_frame.png`);
    console.log(`Extracting video thumbnail for ${repo.name}...`);
    try {
      const res = await fetch(repo.video, { headers: { Range: "bytes=0-5000000" } });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = repo.video.match(/\.(mp4|webm|mov)/i)?.[1] || "mp4";
      const tmpVideo = join(outDir, `${repo.name}_tmp.${ext}`);

      // Write partial video to disk
      const { writeFileSync } = await import("node:fs");
      writeFileSync(tmpVideo, buf);

      // Extract first frame with ffmpeg
      execFileSync("ffmpeg", [
        "-y", "-i", tmpVideo,
        "-vframes", "1", "-ss", "0.1",
        "-f", "image2", tmpFile,
      ], { stdio: "ignore" });

      // Convert to WebP
      await sharp(tmpFile)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(join(outDir, thumbFile));

      // Cleanup temp files
      try { unlinkSync(tmpVideo); } catch {}
      try { unlinkSync(tmpFile); } catch {}

      console.log(`  → ${thumbFile} (from video)`);
    } catch (e) {
      console.error(`  Video thumbnail failed: ${e.message}`);
    }
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

// Generate OG image (1200x630) with profile photo, name and title
console.log("Generating OG image...");
try {
  const photoBuf = readFileSync(join(import.meta.dirname, "../public/photo.webp"));
  const photoResized = await sharp(photoBuf)
    .resize({ width: 300, height: 300, fit: "cover", position: "top" })
    .png()
    .toBuffer();

  // Create circular mask for the photo
  const circleMask = Buffer.from(
    `<svg width="300" height="300"><circle cx="150" cy="150" r="150" fill="white"/></svg>`
  );
  const photoCircle = await sharp(photoResized)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Download Inter font files for OG image rendering
  console.log("  Installing Inter font...");
  const fontDir = join(import.meta.dirname, "../public/fonts");
  mkdirSync(fontDir, { recursive: true });
  for (const [weight, file] of [["400", "inter-latin-400-normal.ttf"], ["500", "inter-latin-500-normal.ttf"], ["800", "inter-latin-800-normal.ttf"]]) {
    const url = `https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${weight}-normal.ttf`;
    const dest = join(fontDir, file);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.error(`  Font ${weight} failed: ${e.message}`);
    }
  }
  // Install fonts system-wide for librsvg
  const fontConfigDir = "/tmp/fonts";
  mkdirSync(fontConfigDir, { recursive: true });
  for (const f of ["inter-latin-400-normal.ttf", "inter-latin-500-normal.ttf", "inter-latin-800-normal.ttf"]) {
    try { const { copyFileSync } = await import("node:fs"); copyFileSync(join(fontDir, f), join(fontConfigDir, f)); } catch {}
  }
  try {
    writeFileSync("/tmp/fonts.conf", `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${fontConfigDir}</dir></fontconfig>`);
    process.env.FONTCONFIG_FILE = "/tmp/fonts.conf";
  } catch {}

  // Background with subtle glow bubbles + text overlay as SVG
  const bgSvg = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g1" cx="15%" cy="30%" r="40%">
          <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="85%" cy="70%" r="35%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g3" cx="60%" cy="20%" r="30%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="#171717"/>
      <ellipse cx="180" cy="190" rx="480" ry="400" fill="url(#g1)"/>
      <ellipse cx="1020" cy="440" rx="420" ry="350" fill="url(#g2)"/>
      <ellipse cx="720" cy="130" rx="360" ry="280" fill="url(#g3)"/>
      <text x="70" y="240" font-family="Inter, sans-serif" font-size="72" font-weight="800" fill="white">Maximilian Reinke</text>
      <text x="70" y="310" font-family="Inter, sans-serif" font-size="38" font-weight="500" fill="#0ea5e9">Solution Developer</text>
      <!-- Globe icon (tabler: world) -->
      <g transform="translate(70, 348)">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path d="M2 12h20"/>
        </svg>
      </g>
      <text x="110" y="372" font-family="Inter, sans-serif" font-size="28" font-weight="400" fill="#a3a3a3">reinke.ing</text>
      <!-- Mail icon (tabler: mail) -->
      <g transform="translate(70, 393)">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M3 7l9 6 9-6"/>
        </svg>
      </g>
      <text x="110" y="417" font-family="Inter, sans-serif" font-size="28" font-weight="400" fill="#a3a3a3">max@reinke.ing</text>
    </svg>
  `);

  // Compose background + photo
  await sharp(Buffer.from(await sharp(bgSvg).png().toBuffer()))
    .composite([
      { input: photoCircle, left: 810, top: 165 },
    ])
    .jpeg({ quality: 90 })
    .toFile(join(import.meta.dirname, "../public/og.jpg"));

  console.log("  → og.jpg");
} catch (e) {
  console.error(`  OG image failed: ${e.message}`);
}

console.log("Done.");
