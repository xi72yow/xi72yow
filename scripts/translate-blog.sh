#!/usr/bin/env bash
set -euo pipefail

# Translates blog posts from English to German using GitHub Models API.
# Uses content hashes to skip unchanged posts.

MODELS_URL="https://models.inference.ai.azure.com/chat/completions"
MODEL="gpt-4o"
BLOG_DIR="blog"
OUTPUT_FILE="site/src/data/blog-translations.json"
CACHE_FILE=".cache/ai-cache.json"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Warning: No GITHUB_TOKEN set, skipping blog translation"
  exit 0
fi

AUTH_HEADER="Authorization: Bearer ${GITHUB_TOKEN}"
mkdir -p .cache "$(dirname "${OUTPUT_FILE}")"

# Load existing cache
if [[ -f "${CACHE_FILE}" ]]; then
  ai_cache=$(cat "${CACHE_FILE}")
else
  ai_cache="{}"
fi

# Load existing translations (to preserve unchanged entries)
if [[ -f "${OUTPUT_FILE}" ]]; then
  translations=$(cat "${OUTPUT_FILE}")
else
  translations="{}"
fi

# Find all blog posts
shopt -s nullglob
posts=("${BLOG_DIR}"/*.md)
shopt -u nullglob

if [[ ${#posts[@]} -eq 0 ]]; then
  echo "No blog posts found in ${BLOG_DIR}"
  echo "{}" | jq '.' > "${OUTPUT_FILE}"
  exit 0
fi

echo "Found ${#posts[@]} blog post(s) to check..."

for post_file in "${posts[@]}"; do
  slug=$(basename "${post_file}" .md)
  content=$(cat "${post_file}")
  content_hash=$(printf '%s' "${content}" | sha256sum | cut -d' ' -f1)
  cache_key="blog:${slug}"

  # Check cache
  stored_hash=$(echo "${ai_cache}" | jq -r --arg k "${cache_key}" '.[$k].hash // empty')

  if [[ "${stored_hash}" == "${content_hash}" ]]; then
    echo "  ${slug}: unchanged (hash match)"
    continue
  fi

  echo "  ${slug}: translating..."

  # Extract frontmatter fields
  title=$(echo "${content}" | sed -n 's/^title: *"\(.*\)"/\1/p' | head -1)
  description=$(echo "${content}" | sed -n 's/^description: *"\(.*\)"/\1/p' | head -1)

  # Extract body (everything after the second ---)
  body=$(echo "${content}" | awk '/^---$/{n++; next} n>=2' )

  # Build translation prompt
  translate_payload=$(jq -nc \
    --arg model "${MODEL}" \
    --arg title "${title}" \
    --arg description "${description}" \
    --arg body "${body}" \
    '{
      model: $model,
      messages: [
        { role: "system", content: "You translate blog content from English to German. Respond ONLY with valid JSON, no markdown fences. Format: {\"title\": \"...\", \"description\": \"...\", \"body\": \"...\"}" },
        { role: "user", content: ("Translate the following blog post content from English to German. Keep the same tone and style. Keep technical terms, code snippets, and URLs unchanged. No em dashes.\n\nTitle: " + $title + "\nDescription: " + $description + "\nBody:\n" + $body) }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }')

  ai_response=$(curl -s -X POST "${MODELS_URL}" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    -d "${translate_payload}" || echo "")

  if [[ -z "${ai_response}" ]]; then
    echo "    Translation request failed"
    continue
  fi

  api_error=$(echo "${ai_response}" | jq -r '.error.message // empty' 2>/dev/null)
  if [[ -n "${api_error}" ]]; then
    echo "    AI API error: ${api_error}"
    continue
  fi

  result=$(echo "${ai_response}" | jq -r '.choices[0].message.content' 2>/dev/null || echo "")
  result=$(echo "${result}" | sed 's/^```json//;s/^```//;s/```$//')

  # Validate JSON
  if ! echo "${result}" | jq empty 2>/dev/null; then
    echo "    Invalid JSON response, skipping"
    continue
  fi

  title_de=$(echo "${result}" | jq -r '.title // empty')
  desc_de=$(echo "${result}" | jq -r '.description // empty')
  body_de=$(echo "${result}" | jq -r '.body // empty')

  if [[ -z "${title_de}" || -z "${body_de}" ]]; then
    echo "    Incomplete translation, skipping"
    continue
  fi

  # Update translations output
  translations=$(echo "${translations}" | jq \
    --arg slug "${slug}" \
    --arg title "${title_de}" \
    --arg desc "${desc_de}" \
    --arg body "${body_de}" \
    '.[$slug] = {title: $title, description: $desc, body: $body}')

  # Update cache
  ai_cache=$(echo "${ai_cache}" | jq \
    --arg k "${cache_key}" \
    --arg h "${content_hash}" \
    --arg title "${title_de}" \
    --arg desc "${desc_de}" \
    --arg body "${body_de}" \
    '.[$k] = {hash: $h, data: {title: $title, description: $desc, body: $body}}')

  echo "    Translated successfully"
done

# Write outputs
echo "${translations}" | jq '.' > "${OUTPUT_FILE}"
echo "${ai_cache}" | jq '.' > "${CACHE_FILE}"
echo "Written ${OUTPUT_FILE}"
echo "Blog translation done!"
