#!/usr/bin/env bash
set -euo pipefail

GITHUB_USER="xi72yow"
FEATURED_TOPIC="x"
API_URL="https://api.github.com"
MODELS_URL="https://models.inference.ai.azure.com/chat/completions"
MODEL="gpt-4o"

# Auth header (works in Actions via GITHUB_TOKEN, optional for local testing)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_HEADER="Authorization: Bearer ${GITHUB_TOKEN}"
  CURL_AUTH=(-H "${AUTH_HEADER}")
else
  echo "Warning: No GITHUB_TOKEN set, running without auth (rate-limited, no AI descriptions)"
  CURL_AUTH=()
fi

# ── Fetch all public repos ──────────────────────────────────────────────
echo "Fetching public repos for ${GITHUB_USER}..."
all_repos_json=$(curl -sf "${CURL_AUTH[@]}" \
  "${API_URL}/users/${GITHUB_USER}/repos?type=public&per_page=100&sort=updated")

# Filter to only repos with the featured topic
repos_json=$(echo "${all_repos_json}" | jq -c "[.[] | select(.topics | index(\"${FEATURED_TOPIC}\"))]")

repo_count=$(echo "${repos_json}" | jq 'length')
all_count=$(echo "${all_repos_json}" | jq 'length')
echo "Found ${all_count} public repos, ${repo_count} tagged with '${FEATURED_TOPIC}'."

# ── Aggregate language stats across ALL public non-fork repos ────────────
echo "Aggregating language stats across all non-fork public repos..."
non_fork_repos=$(echo "${all_repos_json}" | jq -c '[.[] | select(.fork == false)]')
non_fork_count=$(echo "${non_fork_repos}" | jq 'length')
all_lang_jsons=""

for i in $(seq 0 $((non_fork_count - 1))); do
  nf_full_name=$(echo "${non_fork_repos}" | jq -r ".[$i].full_name")
  echo "  Languages for ${nf_full_name} ($((i + 1))/${non_fork_count})"
  nf_langs=$(curl -sf --max-time 10 "${CURL_AUTH[@]}" \
    "${API_URL}/repos/${nf_full_name}/languages" 2>/dev/null || echo "{}")
  if echo "${nf_langs}" | jq empty 2>/dev/null; then
    all_lang_jsons="${all_lang_jsons}${nf_langs}"$'\n'
  fi
done

# Merge all language objects at once
all_lang_bytes=$(echo "${all_lang_jsons}" | jq -s '
  reduce .[] as $obj ({};
    reduce ($obj | to_entries[]) as $e (.;
      .[$e.key] = ((.[$e.key] // 0) + $e.value)
    )
  )
')

echo "Aggregated languages from ${non_fork_count} non-fork repos."

# ── Build repo data (featured only) ─────────────────────────────────────
repos_output="[]"

for i in $(seq 0 $((repo_count - 1))); do
  repo=$(echo "${repos_json}" | jq ".[$i]")
  name=$(echo "${repo}" | jq -r '.name')
  full_name=$(echo "${repo}" | jq -r '.full_name')
  url=$(echo "${repo}" | jq -r '.html_url')
  homepage=$(echo "${repo}" | jq -r '.homepage // empty')
  stars=$(echo "${repo}" | jq -r '.stargazers_count')
  fork=$(echo "${repo}" | jq -r '.fork')
  description_raw=$(echo "${repo}" | jq -r '.description // empty')
  topics=$(echo "${repo}" | jq -c "[.topics // [] | .[] | select(. != \"${FEATURED_TOPIC}\")]")

  # Skip the profile repo itself
  if [[ "${name}" == "${GITHUB_USER}" ]]; then
    echo "Skipping profile repo: ${name}"
    continue
  fi

  echo "Processing ${name} ($((i + 1))/${repo_count})..."

  # Fetch languages (top 3 by bytes)
  languages=$(curl -sf "${CURL_AUTH[@]}" \
    "${API_URL}/repos/${full_name}/languages" | jq -c '[to_entries | sort_by(-.value) | .[:3] | .[].key]')

  # Fetch last 3 non-merge commits
  commits_raw=$(curl -sf "${CURL_AUTH[@]}" \
    "${API_URL}/repos/${full_name}/commits?per_page=30" 2>/dev/null || echo "[]")

  commits=$(echo "${commits_raw}" | jq -c '[.[] | select(.parents | length <= 1) | {
    message: .commit.message,
    date: .commit.author.date,
    author: .commit.author.name
  }] | .[:3]' 2>/dev/null || echo "[]")

  # Fetch full README for AI context + image extraction
  readme_content=$(curl -sf "${CURL_AUTH[@]}" \
    -H "Accept: application/vnd.github.raw+json" \
    "${API_URL}/repos/${full_name}/readme" 2>/dev/null || echo "")

  # Collapse multiline HTML tags into single lines for regex matching
  readme_oneline=$(echo "${readme_content}" | tr '\n' ' ' | sed 's/  */ /g')

  # Extract first image URL from README, skipping badges (shields.io, workflow badges, etc.)
  first_image=$(echo "${readme_content}" | grep -oP '!\[[^\]]*\]\(\K[^\)]+' | grep -viP 'shields\.io|badge|workflows|codecov|coveralls|travis|circleci|img\.shields' | head -1 || \
    echo "${readme_oneline}" | grep -oP '<img[^>]+src="\K[^"]+' | grep -viP 'shields\.io|badge|workflows|codecov|coveralls|travis|circleci|img\.shields' | head -1 || echo "")

  # Extract first video URL from README (<video src="..."> or github user-content video links)
  first_video=$(echo "${readme_oneline}" | grep -oP '<video[^>]+src="\K[^"]+' | head -1 || \
    echo "${readme_content}" | grep -oP 'https://[^)"\s]+\.(mp4|webm|mov)' | head -1 || echo "")

  # Make relative URLs absolute
  if [[ -n "${first_image}" && ! "${first_image}" =~ ^https?:// ]]; then
    first_image="https://raw.githubusercontent.com/${full_name}/main/${first_image}"
  fi
  if [[ -n "${first_video}" && ! "${first_video}" =~ ^https?:// ]]; then
    first_video="https://raw.githubusercontent.com/${full_name}/main/${first_video}"
  fi

  # Extract a plain-text README teaser (strip markdown/HTML, first ~300 chars)
  readme_teaser=$(echo "${readme_content}" | \
    sed 's/<[^>]*>//g' | \
    sed 's/!\[[^]]*\]([^)]*)//g' | \
    sed 's/\[[^]]*\]([^)]*)//g' | \
    sed 's/^#\+\s*//g' | \
    sed 's/[*_`~]//g' | \
    sed '/^\s*$/d' | \
    sed '/^[![]/d' | \
    tr '\n' ' ' | \
    sed 's/  */ /g' | \
    head -c 300)

  # Trim README for AI context
  readme_content=$(echo "${readme_content}" | head -c 2000)

  # ── AI: Generate descriptions (EN + DE) ─────────────────────────────
  ai_context="Repository: ${name}
Original description: ${description_raw}
Languages: ${languages}
Topics: ${topics}
README excerpt: ${readme_content}"

  ai_payload=$(jq -nc \
    --arg model "${MODEL}" \
    --arg system "You generate concise repository descriptions. Respond ONLY with valid JSON, no markdown fences. Format: {\"en\": \"...\", \"de\": \"...\"}" \
    --arg context "${ai_context}" \
    '{
      model: $model,
      messages: [
        { role: "system", content: $system },
        { role: "user", content: ("Write a short description (1-2 sentences) for this repo in English and German. Be specific about what it does, not generic. Use a neutral, technical tone. No marketing language, no superlatives, no hype, no em dashes. Context: " + $context) }
      ],
      temperature: 0.3,
      max_tokens: 300
    }')

  ai_response=$(curl -s -X POST "${MODELS_URL}" \
    "${CURL_AUTH[@]}" \
    -H "Content-Type: application/json" \
    -d "${ai_payload}" || echo "")

  if [[ -n "${ai_response}" ]]; then
    descriptions=$(echo "${ai_response}" | jq -r '.choices[0].message.content' 2>/dev/null || echo "")
    # Try to parse as JSON, strip markdown fences if present
    descriptions=$(echo "${descriptions}" | sed 's/^```json//;s/^```//;s/```$//' | tr -d '\n')
    description_en=$(echo "${descriptions}" | jq -r '.en // empty' 2>/dev/null || echo "${description_raw}")
    description_de=$(echo "${descriptions}" | jq -r '.de // empty' 2>/dev/null || echo "${description_raw}")
  else
    echo "  AI request failed, using original description"
    description_en="${description_raw}"
    description_de="${description_raw}"
  fi

  # ── Build repo entry ────────────────────────────────────────────────
  # Only include stars if > 5
  show_stars="null"
  if [[ "${stars}" -gt 5 ]]; then
    show_stars="${stars}"
  fi

  repo_entry=$(jq -nc \
    --arg name "${name}" \
    --arg url "${url}" \
    --arg homepage "${homepage}" \
    --arg desc_en "${description_en}" \
    --arg desc_de "${description_de}" \
    --argjson languages "${languages}" \
    --argjson topics "${topics}" \
    --argjson stars "${show_stars}" \
    --argjson fork "${fork}" \
    --argjson commits "${commits}" \
    --arg image "${first_image}" \
    --arg video "${first_video}" \
    --arg teaser "${readme_teaser}" \
    '{
      name: $name,
      url: $url,
      homepage: ($homepage | if . == "" then null else . end),
      image: ($image | if . == "" then null else . end),
      video: ($video | if . == "" then null else . end),
      description_en: $desc_en,
      description_de: $desc_de,
      readme_teaser: ($teaser | if . == "" then null else . end),
      tech_stack: $languages,
      topics: $topics,
      stars: $stars,
      is_fork: $fork,
      last_commits: $commits
    }')

  repos_output=$(echo "${repos_output}" | jq --argjson entry "${repo_entry}" '. + [$entry]')

done

# ── Generate profile (about + skills) via AI ─────────────────────────────
echo "Generating profile section..."

# Aggregate all unique languages and tech across repos
all_languages=$(echo "${repos_output}" | jq -r '[.[].tech_stack[]] | unique | join(", ")')
all_descriptions=$(echo "${repos_output}" | jq -r '[.[] | "\(.name): \(.description_en)"] | join("\n")')

profile_context="Developer: Maximilian Reinke (GitHub: ${GITHUB_USER})
All languages/tech used across projects: ${all_languages}
Project summaries:
${all_descriptions}"

profile_payload=$(jq -nc \
  --arg model "${MODEL}" \
  --arg system "You generate developer profile data. Respond ONLY with valid JSON, no markdown fences. Format:
{
  \"about_en\": [\"paragraph 1\", \"paragraph 2\"],
  \"about_de\": [\"paragraph 1\", \"paragraph 2\"],
  \"skills\": [
    {\"category\": \"Languages\", \"items\": [\"...\"]},
    {\"category\": \"Frontend\", \"items\": [\"...\"]},
    ...
  ]
}
Skills categories should be derived from the actual tech stack. Only include technologies that are evident from the repositories. Group them logically (Languages, Frontend, Backend, Tools, Embedded, etc.)." \
  --arg context "${profile_context}" \
  '{
    model: $model,
    messages: [
      { role: "system", content: $system },
      { role: "user", content: ("Generate a 2-paragraph developer bio based on the following project data. Tone: technical, neutral, factual. No marketing language, no superlatives, no \"passionate\", no hype, no em dashes. Paragraph 1: What this developer builds and their focus areas (derived from the projects). Paragraph 2: Technical approach and primary tools (derived from the tech stacks). Do not fabricate experience — only reference what is evident from the repositories. Refer to the developer by name (Maximilian Reinke), not by GitHub username. Write in third person. Provide both English and German versions. Context:\n" + $context) }
    ],
    temperature: 0.3,
    max_tokens: 800
  }')

profile_response=$(curl -s -X POST "${MODELS_URL}" \
  "${CURL_AUTH[@]}" \
  -H "Content-Type: application/json" \
  -d "${profile_payload}" || echo "")

if [[ -n "${profile_response}" ]]; then
  profile_data=$(echo "${profile_response}" | jq -r '.choices[0].message.content' 2>/dev/null || echo "")
  profile_data=$(echo "${profile_data}" | sed 's/^```json//;s/^```//;s/```$//' | tr -d '\n')
  profile_json=$(echo "${profile_data}" | jq '.' 2>/dev/null || echo "null")
else
  echo "  Profile AI request failed, using fallback"
  profile_json="null"
fi

# Fallback if AI failed
if [[ "${profile_json}" == "null" ]]; then
  profile_json=$(jq -nc \
    --arg langs "${all_languages}" \
    '{
      about_en: ["A developer building tools across embedded systems, web applications, and Linux infrastructure."],
      about_de: ["Ein Entwickler, der Tools im Bereich Embedded-Systeme, Webanwendungen und Linux-Infrastruktur baut."],
      skills: [{"category": "Technologies", "items": ($langs | split(", "))}]
    }')
fi

echo "Profile section generated."

# ── Compute language stats ───────────────────────────────────────────────
echo "Computing language stats..."
lang_total=$(echo "${all_lang_bytes}" | jq '[.[]] | add')
language_stats=$(echo "${all_lang_bytes}" | jq -c --argjson total "${lang_total}" '
  to_entries
  | sort_by(-.value)
  | map({
      name: .key,
      bytes: .value,
      percentage: ((.value / $total * 1000 | round) / 10)
    })
')
echo "Language stats: ${lang_total} bytes total across $(echo "${language_stats}" | jq 'length') languages."

# Merge language_stats into profile
profile_json=$(echo "${profile_json}" | jq --argjson stats "${language_stats}" '. + {language_stats: $stats}')

# ── Write repos.json ─────────────────────────────────────────────────────
output_json=$(jq -nc \
  --arg updated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg user "${GITHUB_USER}" \
  --argjson repos "${repos_output}" \
  --argjson profile "${profile_json}" \
  '{
    updated_at: $updated,
    user: $user,
    profile: $profile,
    repos: ($repos | sort_by(.stars // 0) | reverse)
  }')

echo "${output_json}" | jq '.' > repos.json
echo "Written repos.json with $(echo "${repos_output}" | jq 'length') repos."

# ── Generate README.md ───────────────────────────────────────────────────
{
  echo "# Hey, I'm ${GITHUB_USER}"
  echo ""
  echo "From embedded systems to web apps, from security tooling to Linux infrastructure, from DevOps to developer experience. I build what's needed."
  echo ""
  echo "## Selected Projects"
  echo ""

  {
    section_repos=$(echo "${repos_output}" | jq -c '.')
    count=$(echo "${section_repos}" | jq 'length')

    for j in $(seq 0 $((count - 1))); do
      entry=$(echo "${section_repos}" | jq ".[$j]")
      r_name=$(echo "${entry}" | jq -r '.name')
      r_url=$(echo "${entry}" | jq -r '.url')
      r_desc=$(echo "${entry}" | jq -r '.description_en')
      r_stack=$(echo "${entry}" | jq -r '.tech_stack | join(", ")')
      r_stars=$(echo "${entry}" | jq -r '.stars // empty')
      r_homepage=$(echo "${entry}" | jq -r '.homepage // empty')
      r_commits=$(echo "${entry}" | jq -c '.last_commits')
      r_image=$(echo "${entry}" | jq -r '.image // empty')
      r_video=$(echo "${entry}" | jq -r '.video // empty')

      # Header with optional stars
      header="### [${r_name}](${r_url})"
      if [[ -n "${r_stars}" && "${r_stars}" != "null" ]]; then
        header="${header} :star: ${r_stars}"
      fi
      echo "${header}"
      echo ""

      # Description
      if [[ -n "${r_desc}" ]]; then
        echo "${r_desc}"
        echo ""
      fi

      # Video (preferred) or Image
      if [[ -n "${r_video}" ]]; then
        echo "<p align=\"center\"><video src=\"${r_video}\" width=\"600\" autoplay loop muted></video></p>"
        echo ""
      elif [[ -n "${r_image}" ]]; then
        echo "<p align=\"center\"><img src=\"${r_image}\" alt=\"${r_name}\" width=\"600\"></p>"
        echo ""
      fi

      # Tech stack
      if [[ -n "${r_stack}" ]]; then
        echo "**Tech:** ${r_stack}"
        echo ""
      fi

      # Homepage link
      if [[ -n "${r_homepage}" ]]; then
        echo "[Live](${r_homepage})"
        echo ""
      fi

      # Recent commits
      commit_count=$(echo "${r_commits}" | jq 'length')
      if [[ "${commit_count}" -gt 0 ]]; then
        echo "<details><summary>Recent activity</summary>"
        echo ""
        for k in $(seq 0 $((commit_count - 1))); do
          c_msg=$(echo "${r_commits}" | jq -r ".[$k].message" | head -1)
          c_date=$(echo "${r_commits}" | jq -r ".[$k].date" | cut -dT -f1)
          echo "- \`${c_date}\` ${c_msg}"
        done
        echo ""
        echo "</details>"
        echo ""
      fi
    done
  }

  echo "---"
  echo ""
  echo "*Last updated: $(date -u +%Y-%m-%d)*"
} > README.md

echo "Written README.md"
echo "Done!"
