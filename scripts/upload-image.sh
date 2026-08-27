#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <image-file>" >&2
  exit 1
fi

file=$1

if [[ ! -f "$file" ]]; then
  echo "file not found: $file" >&2
  exit 1
fi

: "${IMAGE_UPLOAD_URL:?IMAGE_UPLOAD_URL is required}"
: "${IMAGE_UPLOAD_TOKEN:?IMAGE_UPLOAD_TOKEN is required}"

endpoint="${IMAGE_UPLOAD_URL%/}/api/upload"

response=$(
  curl -sS -w "\n%{http_code}" \
    -H "Authorization: Bearer ${IMAGE_UPLOAD_TOKEN}" \
    -F "file=@${file}" \
    "$endpoint"
)

http_code=$(printf '%s\n' "$response" | tail -n 1)
body=$(printf '%s\n' "$response" | sed '$d')

if [[ "$http_code" != "200" ]]; then
  echo "upload failed (HTTP ${http_code}): ${body}" >&2
  exit 1
fi

url=$(printf '%s\n' "$body" | jq -r '.url // empty')
if [[ -z "$url" || "$url" == "null" ]]; then
  echo "upload succeeded but no url was returned: ${body}" >&2
  exit 1
fi

printf '%s\n' "$url"
