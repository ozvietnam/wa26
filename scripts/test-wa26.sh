#!/bin/bash
# WA26 End-to-End Tester
# Tests: API health, HS search, chatbot, feedback, key pool

BASE="https://wa26.vercel.app"
PASS=0
FAIL=0
WARN=0

green() { echo -e "\033[32m✅ $1\033[0m"; PASS=$((PASS+1)); }
red()   { echo -e "\033[31m❌ $1\033[0m"; FAIL=$((FAIL+1)); }
yellow(){ echo -e "\033[33m⚠️  $1\033[0m"; WARN=$((WARN+1)); }
info()  { echo -e "\033[36m   $1\033[0m"; }

echo "╔════════════════════════════════════════╗"
echo "║       WA26 End-to-End Tester           ║"
echo "║       $(date '+%Y-%m-%d %H:%M')              ║"
echo "╚════════════════════════════════════════╝"
echo ""

# === 1. Homepage ===
echo "━━━ 1. HOMEPAGE ━━━"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE")
[ "$code" = "200" ] && green "Homepage: $code" || red "Homepage: $code"

# === 2. Key Pool Status ===
echo ""
echo "━━━ 2. KEY POOL ━━━"
stats=$(curl -s "$BASE/api/stats")
total=$(echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin).get('keys',{}).get('totalKeys',0))" 2>/dev/null)
active=$(echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin).get('keys',{}).get('activeKeys',0))" 2>/dev/null)
cooldown=$(echo "$stats" | python3 -c "import sys,json; print(json.load(sys.stdin).get('keys',{}).get('cooldownKeys',0))" 2>/dev/null)
if [ "$total" -gt 0 ] 2>/dev/null; then
  green "Key pool: $total keys ($active active, $cooldown cooldown)"
else
  red "Key pool: no keys detected"
fi

# === 3. HS Knowledge API (no LLM needed) ===
echo ""
echo "━━━ 3. HS KNOWLEDGE API ━━━"

# Search
search=$(curl -s "https://hs-knowledge-api.vercel.app/api/search?q=m%C3%A1y+b%C6%A1m+n%C6%B0%E1%BB%9Bc&limit=3")
count=$(echo "$search" | python3 -c "
import sys,json; d=json.load(sys.stdin)
total=sum(len(v.get('items',[])) if isinstance(v,dict) else len(v) for v in d.get('results',{}).values())
print(total)" 2>/dev/null)
[ "$count" -gt 0 ] 2>/dev/null && green "HS search 'máy bơm nước': $count results" || red "HS search: 0 results"

# Detail
detail=$(curl -s "https://hs-knowledge-api.vercel.app/api/hs?hs=85176210")
found=$(echo "$detail" | python3 -c "import sys,json; print(json.load(sys.stdin).get('found',False))" 2>/dev/null)
[ "$found" = "True" ] && green "HS detail 85176210: found" || red "HS detail 85176210: not found"

# KTCN
ktcn=$(curl -s "https://hs-knowledge-api.vercel.app/api/kg_ktcn?hs=85176210")
ktcn_found=$(echo "$ktcn" | python3 -c "import sys,json; print(json.load(sys.stdin).get('found',False))" 2>/dev/null)
[ "$ktcn_found" = "True" ] && green "KTCN 85176210: found" || yellow "KTCN 85176210: not found (may not have KTCN)"

# === 4. Chatbot API ===
echo ""
echo "━━━ 4. CHATBOT API ━━━"

QUERIES=(
  "thiết bị thu phát vô tuyến"
  "máy bơm nước ly tâm"
  "xin chào"
  "ốc vít thép không gỉ M8"
)

for q in "${QUERIES[@]}"; do
  result=$(curl -s -m 90 "$BASE/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$q\",\"history\":[],\"sessionId\":\"test_$(date +%s)\"}")

  reply=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reply','')[:80])" 2>/dev/null)
  intent=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('routing',{}).get('intent','?'))" 2>/dev/null)
  conf=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('verdict',{}).get('confidence','?'))" 2>/dev/null)
  has_data=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('hasData','?'))" 2>/dev/null)
  duration=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('debug',{}).get('duration','?'))" 2>/dev/null)

  # Check if reply is meaningful (not fallback)
  if echo "$reply" | grep -q "chưa tìm được\|Xin lỗi\|lỗi"; then
    red "Chat '$q': FALLBACK"
    info "intent=$intent conf=$conf data=$has_data dur=$duration"
    info "reply: $reply"
  elif [ -n "$reply" ] && [ "$reply" != "null" ]; then
    green "Chat '$q': OK ($intent, conf=$conf, $duration)"
    info "reply: $reply"
  else
    red "Chat '$q': EMPTY REPLY"
  fi
done

# === 5. Feedback API ===
echo ""
echo "━━━ 5. FEEDBACK API ━━━"
fb=$(curl -s "$BASE/api/feedback" -H "Content-Type: application/json" \
  -d '{"sessionId":"test_001","messageIndex":1,"rating":"up","productName":"test","hsCode":"85176210"}')
fb_ok=$(echo "$fb" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
[ "$fb_ok" = "True" ] && green "Feedback API: OK" || red "Feedback API: FAIL"

# === 6. Tra cuu HS page ===
echo ""
echo "━━━ 6. PAGES ━━━"
for path in "/" "/chat" "/tra-cuu-hs" "/quy-dinh"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  [ "$code" = "200" ] && green "GET $path: $code" || red "GET $path: $code"
done

# === SUMMARY ===
echo ""
echo "╔════════════════════════════════════════╗"
echo "║  RESULTS: ✅ $PASS passed | ❌ $FAIL failed | ⚠️  $WARN warnings"
echo "╚════════════════════════════════════════╝"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
