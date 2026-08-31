#!/usr/bin/env node
// Collects everything needed to write profile-texts.json: repo metadata, languages
// and README excerpts. Text generation itself happens in the profile-text skill,
// github models was retired on 2026-07-30 and had been the previous generator.

const USER = "xi72yow";
const FEATURED_TOPIC = "x";
const FUN_TOPIC = "xx";
const API = "https://api.github.com";
const README_CHARS = 2000;

const token = process.env.GITHUB_TOKEN;

async function api(path, accept = "application/vnd.github+json") {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: accept,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    throw new Error(
      `GET ${path} failed: ${res.status} ${res.statusText}` +
        (remaining === "0" ? " (rate limit exhausted, set GITHUB_TOKEN)" : ""),
    );
  }
  return accept.includes("raw") ? res.text() : res.json();
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

if (!token) {
  console.error("Warning: no GITHUB_TOKEN set, running unauthenticated (60 requests/hour)");
}

const all = await api(`/users/${USER}/repos?type=public&per_page=100&sort=updated`);
const featured = all.filter(
  (r) =>
    r.name !== USER &&
    (r.topics ?? []).some((t) => t === FEATURED_TOPIC || t === FUN_TOPIC),
);

const repos = [];
for (const repo of featured) {
  console.error(`Fetching ${repo.name} (${repos.length + 1}/${featured.length})`);

  const languages = await api(`/repos/${repo.full_name}/languages`);
  let readme = "";
  try {
    readme = await api(`/repos/${repo.full_name}/readme`, "application/vnd.github.raw+json");
  } catch {
    console.error(`  no readme for ${repo.name}`);
  }

  repos.push({
    name: repo.name,
    url: repo.html_url,
    featured: (repo.topics ?? []).includes(FEATURED_TOPIC) ? "x" : "xx",
    github_description: repo.description ?? "",
    topics: (repo.topics ?? []).filter((t) => t !== FEATURED_TOPIC && t !== FUN_TOPIC),
    languages: Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name),
    readme_excerpt: stripMarkdown(readme).slice(0, README_CHARS),
  });
}

const languages_overall = [
  ...new Set(repos.flatMap((r) => r.languages)),
].sort();

process.stdout.write(
  JSON.stringify({ user: USER, languages_overall, repos }, null, 2) + "\n",
);
