import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
    const dest = join(outDir, filename);
    if (existsSync(dest)) {
      console.log(`Skipping ${repo.name} image (cached)`);
    } else {
      console.log(`Fetching ${repo.name} image...`);
      try {
        const res = await fetch(repo.image);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest);
        console.log(`  → ${filename}`);
      } catch (e) {
        console.error(`  Failed: ${e.message}`);
      }
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
const photoDest = join(import.meta.dirname, "../public/photo.webp");
if (existsSync(photoDest)) {
  console.log("Skipping profile photo (cached)");
} else {
  const photoUrl = "https://github.com/user-attachments/assets/708d1434-91f0-45c7-81e8-c51178313213";
  console.log("Fetching profile photo...");
  try {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 85 }).toFile(photoDest);
    console.log("  → photo.webp");
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
  }
}

// README images — download all external images and rewrite URLs in processed copies
console.log("\nProcessing README images...");
const readmeDir = join(import.meta.dirname, "../../readmes");
const manifest = {};

function urlHash(url) {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

function extractImageUrls(md) {
  const urls = new Set();
  for (const m of md.matchAll(/!\[[^\]]*\]\((\s*https?:\/\/[^)\s]+)\s*\)/g)) {
    urls.add(m[1].trim());
  }
  for (const m of md.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi)) {
    urls.add(m[1]);
  }
  return [...urls];
}

let readmeFiles = [];
try {
  readmeFiles = readdirSync(readmeDir).filter((f) => f.endsWith(".md"));
} catch {}

for (const file of readmeFiles) {
  const content = readFileSync(join(readmeDir, file), "utf-8");
  const urls = extractImageUrls(content);
  for (const url of urls) {
    if (manifest[url]) continue;
    const hash = urlHash(url);
    const webpName = `readme-${hash}.webp`;
    const svgName = `readme-${hash}.svg`;

    // Check cache
    if (existsSync(join(outDir, webpName))) {
      manifest[url] = `/images/${webpName}`;
      console.log(`  ${file}: cached ${webpName}`);
      continue;
    }
    if (existsSync(join(outDir, svgName))) {
      manifest[url] = `/images/${svgName}`;
      console.log(`  ${file}: cached ${svgName}`);
      continue;
    }

    console.log(`  ${file}: ${url.slice(0, 80)}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("svg")) {
        writeFileSync(join(outDir, svgName), buf);
        manifest[url] = `/images/${svgName}`;
        console.log(`    → ${svgName}`);
      } else {
        await sharp(buf)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(join(outDir, webpName));
        manifest[url] = `/images/${webpName}`;
        console.log(`    → ${webpName}`);
      }
    } catch (e) {
      console.error(`    Failed: ${e.message}`);
    }
  }
}

// Extract and generate video thumbnails from READMEs
const videoThumbs = {};
if (hasFFmpeg) {
  for (const file of readmeFiles) {
    const content = readFileSync(join(readmeDir, file), "utf-8");
    const videoMatches = [...content.matchAll(/<video[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi)];
    for (const m of videoMatches) {
      const videoUrl = m[1];
      if (videoThumbs[videoUrl]) continue;
      const hash = urlHash(videoUrl);
      const thumbName = `readme-video-${hash}.webp`;
      const thumbDest = join(outDir, thumbName);
      if (existsSync(thumbDest)) {
        videoThumbs[videoUrl] = `/images/${thumbName}`;
        console.log(`  ${file}: cached video thumb ${thumbName}`);
        continue;
      }
      console.log(`  ${file}: extracting video thumbnail...`);
      try {
        const res = await fetch(videoUrl, { headers: { Range: "bytes=0-5000000" } });
        if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = videoUrl.match(/\.(mp4|webm|mov)/i)?.[1] || "mp4";
        const tmpVideo = join(outDir, `_tmp_readme_video.${ext}`);
        const tmpFrame = join(outDir, "_tmp_readme_frame.png");
        writeFileSync(tmpVideo, buf);
        execFileSync("ffmpeg", ["-y", "-i", tmpVideo, "-vframes", "1", "-ss", "0.1", "-f", "image2", tmpFrame], { stdio: "ignore" });
        await sharp(tmpFrame).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(thumbDest);
        try { unlinkSync(tmpVideo); } catch {}
        try { unlinkSync(tmpFrame); } catch {}
        videoThumbs[videoUrl] = `/images/${thumbName}`;
        console.log(`    → ${thumbName}`);
      } catch (e) {
        console.error(`    Video thumb failed: ${e.message}`);
      }
    }
  }
}

// Write processed readmes with local image URLs
const processedDir = join(import.meta.dirname, "../../readmes-processed");
mkdirSync(processedDir, { recursive: true });
for (const file of readmeFiles) {
  let content = readFileSync(join(readmeDir, file), "utf-8");
  for (const [url, localPath] of Object.entries(manifest)) {
    while (content.includes(url)) {
      content = content.replace(url, localPath);
    }
  }
  // Replace <video> tags with consent wrapper + thumbnail
  content = content.replace(
    /<video[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/gi,
    (_, src) => {
      const thumb = videoThumbs[src];
      const bgStyle = thumb ? ` style="background:url('${thumb}') center/cover no-repeat"` : "";
      return `<div class="video-consent" data-video-src="${src}"${bgStyle}><div class="video-consent-overlay"><button class="video-consent-btn" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button><p class="video-consent-notice">Click to load video (connects to GitHub)</p></div></div>`;
    }
  );
  writeFileSync(join(processedDir, file), content);
}
console.log(`\nProcessed ${readmeFiles.length} readmes → readmes-processed/`);
console.log(`README images: ${Object.keys(manifest).length} URLs rewritten`);

console.log("Done.");
