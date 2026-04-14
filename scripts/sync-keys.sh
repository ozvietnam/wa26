#!/bin/bash
# Sync Gemini API keys from Google Sheet → Vercel env
# Sheet: https://docs.google.com/spreadsheets/d/1dwwUcX_1Os4guq084rYsF6uHi_OtWjtd0XqA8BPo8g0
# Scans all sheets (gid 0-9) for keys matching AIzaSy pattern

SHEET_ID="1dwwUcX_1Os4guq084rYsF6uHi_OtWjtd0XqA8BPo8g0"
PROJECT_DIR="/Users/ozvietnamdesktop/Desktop/work/wa26"
KEY_CACHE="$PROJECT_DIR/.keys-cache"

# Collect all keys from all sheets
ALL_KEYS=""
for gid in 0 1 2 3 4 5 6 7 8 9; do
  csv=$(curl -sL "https://docs.google.com/spreadsheets/d/$SHEET_ID/export?format=csv&gid=$gid" 2>/dev/null)
  # Skip HTML error pages
  echo "$csv" | grep -q "DOCTYPE" && continue
  # Extract AIzaSy keys
  keys=$(echo "$csv" | grep -oE 'AIzaSy[A-Za-z0-9_-]{30,40}' | sort -u)
  if [ -n "$keys" ]; then
    ALL_KEYS="$ALL_KEYS $keys"
  fi
done

# Deduplicate and join with commas
JOINED=$(echo "$ALL_KEYS" | tr ' ' '\n' | sort -u | grep -v '^$' | paste -sd ',' -)

if [ -z "$JOINED" ]; then
  echo "[sync-keys] No keys found in sheet"
  exit 0
fi

KEY_COUNT=$(echo "$JOINED" | tr ',' '\n' | wc -l | tr -d ' ')

# Check if changed
if [ -f "$KEY_CACHE" ] && [ "$(cat "$KEY_CACHE")" = "$JOINED" ]; then
  echo "[sync-keys] No changes ($KEY_COUNT keys)"
  exit 0
fi

# Update Vercel
echo "[sync-keys] Found $KEY_COUNT keys — updating Vercel..."
cd "$PROJECT_DIR"
vercel env rm GEMINI_API_KEY production -y 2>/dev/null
echo "$JOINED" | vercel env add GEMINI_API_KEY production 2>/dev/null

if [ $? -eq 0 ]; then
  echo "$JOINED" > "$KEY_CACHE"
  echo "[sync-keys] Updated! $KEY_COUNT keys deployed"
  # Trigger redeploy
  vercel --prod 2>/dev/null | grep -E "Production:|ready"
else
  echo "[sync-keys] ERROR: Failed to update Vercel env"
  exit 1
fi
