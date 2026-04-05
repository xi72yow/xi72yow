import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
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

console.log("Done.");
