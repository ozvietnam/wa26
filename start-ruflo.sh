#!/bin/bash
# Khởi động Ruflo với OpenRouter (tránh rate limit Anthropic)
export ANTHROPIC_BASE_URL="https://openrouter.ai/api/v1"
# Set ANTHROPIC_API_KEY in ~/.zshrc or pass inline — never commit secrets
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY (OpenRouter key) before running}"
export ANTHROPIC_MODEL="anthropic/claude-sonnet-4-5"

echo "🔀 Ruflo → OpenRouter (claude-sonnet-4-5)"
echo "   Rate limit: 200 req/min (vs 30k tokens/min Anthropic direct)"
echo ""
cd ~/Desktop/work/wa26
npx ruflo@latest hive-mind spawn "wa26" --claude --model anthropic/claude-sonnet-4-5
