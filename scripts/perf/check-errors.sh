#!/bin/zsh
# Re-fetches every page from the last bench run and flags server errors hidden inside 200 streaming responses.
# Usage: scripts/perf/check-errors.sh <label>   (reads results-<label>.tsv written by bench.sh)
cd "$(dirname "$0")"
B=http://localhost:3100
while IFS=$'\t' read -r jar pg rest; do
  body=$(curl -s -b $jar.jar "$B$pg")
  if echo "$body" | grep -qE 'digest|Application error|Invalid .prisma'; then echo "ERROR  $jar $pg"; else echo "ok     $jar $pg"; fi
done < results-${1:-latest}.tsv
