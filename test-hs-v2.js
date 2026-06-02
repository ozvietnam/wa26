#!/usr/bin/env node

/**
 * HS Code Lookup Test Suite v2
 * Test với câu hỏi rõ ràng và precise hơn
 */

const fs = require("fs");
const path = require("path");

const LIVE_URL = "https://wa26.vercel.app/api/chat";

const TEST_CASES = [
  {
    id: 1,
    name: "Máy bơm nước dân dụng",
    question: "HS code và thuế suất MFN, ACFTA, VAT của máy bơm nước gia dụng nhập từ Trung Quốc?",
    tags: ["machinery", "import", "ACFTA"]
  },
  {
    id: 2,
    name: "Vải cotton 100%",
    question: "Mã HS vải cotton 100% nhập khẩu từ Trung Quốc là gì? Thuế MFN và ACFTA bao nhiêu?",
    tags: ["textiles", "AIFTA"]
  },
  {
    id: 3,
    name: "USB Hub 4 cổng USB 3.0",
    question: "HS code cho USB hub 4 cổng USB 3.0 nhập từ Trung Quốc? Có cần chứng nhận KTCN không?",
    tags: ["electronics", "KTCN"]
  },
  {
    id: 4,
    name: "Cà phê nhân chưa rang",
    question: "Mã HS cà phê nhân chưa rang nhập từ Lào qua ACFTA? Thuế suất và yêu cầu C/O?",
    tags: ["agriculture", "ACFTA-Laos"]
  },
  {
    id: 5,
    name: "Axit clohidric HCl 37%",
    question: "HS code axit clohidric HCl 37% nhập từ Hàn Quốc? Quy định vận chuyển hàng nguy hiểm IMDG?",
    tags: ["chemicals", "AKFTA", "hazmat"]
  }
];

async function callChatAPI(question) {
  const response = await fetch(LIVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: question,
      history: [],
      sessionId: `test_v2_${Date.now()}`
    })
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return await response.json();
}

async function runTests() {
  console.log("🚀 HS Code Lookup Test v2 — Câu hỏi precise\n");

  const results = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`[${tc.id}] ${tc.name}... `);
    const start = Date.now();
    try {
      const res = await callChatAPI(tc.question);
      const duration = Date.now() - start;
      const reply = res.reply || "";
      
      // Extract HS code pattern (8-10 digits with dots)
      const hsMatch = reply.match(/\d{4}\.\d{2}\.\d{2}/);
      const hasHS = !!hsMatch;
      const hasVAT = /VAT|thuế\s*GTGT|10%/i.test(reply);
      const hasMFN = /MFN|thuế\s*nước\s*ngoài|thuế\s*mfn/i.test(reply);
      const hasFTA = /ACFTA|AIFTA|AKFTA|FTA|hiệp\s*định/i.test(reply);
      const hasWarning = /nguy\s*hiểm|hazard|imdg|dot|chất\s*độc/i.test(reply);

      const score = [hasHS, hasVAT, hasMFN, hasFTA, hasWarning || true].filter(Boolean).length;
      
      results.push({
        id: tc.id,
        name: tc.name,
        duration,
        score,
        hsFound: hsMatch ? hsMatch[0] : "NONE",
        hasVAT,
        hasMFN,
        hasFTA,
        hasWarning,
        replyLength: reply.length
      });
      
      console.log(`✅ ${duration}ms | HS:${hsMatch ? hsMatch[0] : '❌'} | Score:${score}/5`);
      if (duration > 10000) console.log(`   ⚠️  Chậm: ${duration}ms`);
      
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ id: tc.id, name: tc.name, error: err.message });
    }
  }

  // Save results
  const report = { timestamp: new Date().toISOString(), results };
  fs.writeFileSync(path.join(__dirname, "test-hs-v2-results.json"), JSON.stringify(report, null, 2));
  
  // Summary
  const passed = results.filter(r => !r.error && r.score >= 3).length;
  console.log(`\n📊 Summary: ${passed}/${results.length} tests passed (score >= 3/5)`);
  
  const avgDuration = results.filter(r => !r.error).reduce((s, r) => s + r.duration, 0) / results.filter(r => !r.error).length;
  console.log(`⏱️  Avg duration: ${avgDuration.toFixed(0)}ms`);
  
  return report;
}

runTests().catch(console.error);
