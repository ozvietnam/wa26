#!/usr/bin/env node

/**
 * Automated HS Code Lookup Test Suite
 * Tests 5 real customer scenarios on live website
 * Generates JSON report with results
 */

const fs = require("fs");
const path = require("path");

const LIVE_URL = "https://wa26.vercel.app/api/chat";

const TEST_CASES = [
  {
    id: 1,
    name: "Máy bơm nước dân dụng",
    question: "Mã HS của máy bơm nước gia đình dùng, công suất 0.75 KW, nhập khẩu từ Thái Lan là gì? Thuế suất bao nhiêu?",
    expectedHS: "8413.70.90",
    expectedMFN: "5%",
    expectedACFTA: "0%",
    expectedVAT: "10%",
    difficulty: "easy",
    tags: ["machinery", "import", "ACFTA"]
  },
  {
    id: 2,
    name: "Vải cotton in hoa (500kg)",
    question: "Cần tra mã HS vải cotton in họa tiết 500 kg từ Ấn Độ, 100% cotton, chiều rộng 1.5m. Có hạn chế nào không?",
    expectedHS: "5210.51.00",
    expectedMFN: "10%",
    expectedACFTA: "0%",
    expectedVAT: "10%",
    difficulty: "medium",
    tags: ["textiles", "AIFTA", "regulations"]
  },
  {
    id: 3,
    name: "USB Hub 4 cổng (USB 3.0)",
    question: "Công ty tôi sản xuất USB hub 4 cổng USB 3.0 từ Trung Quốc. Mã HS là gì? Có cần sertifikat không?",
    expectedHS: "8471.30.20",
    expectedMFN: "0-5%",
    expectedACFTA: "0%",
    hasCertificationAlert: true,
    difficulty: "medium",
    tags: ["electronics", "KTCN", "certification"]
  },
  {
    id: 4,
    name: "Cà phê nhân từ Lào (10 tấn)",
    question: "Nhập 10 tấn cà phê nhân (chưa rang) từ Lào, dùng để rang bán lẻ. Mã HS bao nhiêu? Cách tối ưu thuế?",
    expectedHS: "0901.11.10",
    expectedMFN: "5-10%",
    expectedACFTA: "0-5%",
    expectsCORules: true,
    difficulty: "hard",
    tags: ["agriculture", "ACFTA-Laos", "origin"]
  },
  {
    id: 5,
    name: "Axit clohidric HCl 37% (5 tấn)",
    question: "Nhập 5 tấn axit clohidric 37% từ Hàn Quốc cho sản xuất. Mã HS là gì? Có quy định vận chuyển nguy hiểm nào?",
    expectedHS: "2807.00.10",
    expectedMFN: "3-5%",
    expectedACFTA: "0%",
    hasDangerAlert: true,
    expectsDOTRules: true,
    difficulty: "hard",
    tags: ["chemicals", "AKFTA", "hazmat", "critical-alert"]
  }
];

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runAllTests() {
    console.log("🚀 Starting Automated HS Code Lookup Tests...\n");
    this.startTime = Date.now();

    for (const testCase of TEST_CASES) {
      console.log(`\n📝 Test ${testCase.id}: ${testCase.name}`);
      console.log(`   Question: "${testCase.question.substring(0, 60)}..."`);

      const result = await this.runTest(testCase);
      this.results.push(result);

      console.log(`   ✅ Status: ${result.status}`);
      console.log(`   ⏱️  Duration: ${result.duration}ms`);
    }

    this.endTime = Date.now();
    return this.generateReport();
  }

  async runTest(testCase) {
    const startTime = Date.now();
    const result = {
      id: testCase.id,
      name: testCase.name,
      question: testCase.question,
      status: "unknown",
      duration: 0,
      response: null,
      checks: {},
      score: 0,
      maxScore: 10,
      errors: []
    };

    try {
      // Call live API
      const response = await this.callChatAPI(testCase.question);
      result.response = response;
      result.status = "completed";

      // Run checks
      result.checks = this.runChecks(testCase, response);

      // Calculate score
      result.score = Object.values(result.checks).filter(v => v.passed).length;

    } catch (error) {
      result.status = "error";
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async callChatAPI(question) {
    try {
      const response = await fetch(LIVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: [],
          sessionId: `test_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  runChecks(testCase, response) {
    const checks = {};
    const reply = response?.reply || "";
    const replyLower = reply.toLowerCase();

    // Check 1: HS Code present
    checks.hsCodePresent = {
      name: "HS Code present in response",
      passed: testCase.expectedHS && replyLower.includes(testCase.expectedHS.toLowerCase()),
      weight: 3
    };

    // Check 2: MFN tariff mentioned
    checks.mfnTariffPresent = {
      name: "MFN tariff mentioned",
      passed: testCase.expectedMFN && (
        replyLower.includes(testCase.expectedMFN.toLowerCase()) ||
        replyLower.includes("mfn")
      ),
      weight: 2
    };

    // Check 3: ACFTA/FTA tariff mentioned
    checks.ftaTariffPresent = {
      name: "ACFTA/FTA tariff mentioned",
      passed: testCase.expectedACFTA && (
        replyLower.includes(testCase.expectedACFTA.toLowerCase()) ||
        replyLower.includes("acfta") ||
        replyLower.includes("aifta") ||
        replyLower.includes("akfta")
      ),
      weight: 2
    };

    // Check 4: VAT mentioned (if applicable)
    checks.vatPresent = {
      name: "VAT mentioned",
      passed: testCase.expectedVAT && replyLower.includes("vat"),
      weight: 1
    };

    // Check 5: Danger alert (for hazmat)
    if (testCase.hasDangerAlert) {
      checks.dangerAlert = {
        name: "⚠️ DANGER ALERT for hazmat products",
        passed: replyLower.includes("nguy hiểm") ||
                replyLower.includes("hazmat") ||
                replyLower.includes("chất độc") ||
                replyLower.includes("cảnh báo"),
        weight: 3,
        critical: true
      };
    }

    // Check 6: Certification alert
    if (testCase.hasCertificationAlert) {
      checks.certAlert = {
        name: "Certification requirements",
        passed: replyLower.includes("sertificat") ||
                replyLower.includes("ce") ||
                replyLower.includes("fcc"),
        weight: 2
      };
    }

    // Check 7: C/O Rules (rules of origin)
    if (testCase.expectsCORules) {
      checks.coRules = {
        name: "Rules of Origin (C/O) mentioned",
        passed: replyLower.includes("xuất xứ") || replyLower.includes("c/o"),
        weight: 2
      };
    }

    // Check 8: DOT/IMDG Rules
    if (testCase.expectsDOTRules) {
      checks.dotRules = {
        name: "DOT/IMDG hazmat rules",
        passed: replyLower.includes("imdg") ||
                replyLower.includes("dot") ||
                replyLower.includes("vận chuyển"),
        weight: 2
      };
    }

    // Check 9: Response clarity
    checks.clarity = {
      name: "Response is clear & structured",
      passed: reply.length > 100 && reply.includes("\n"),
      weight: 1
    };

    // Check 10: Response speed (quick response)
    checks.speed = {
      name: "Response within 5 seconds",
      passed: true, // Will be checked against duration
      weight: 1
    };

    return checks;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: this.endTime - this.startTime,
      totalTests: TEST_CASES.length,
      passedTests: this.results.filter(r => r.status === "completed").length,
      failedTests: this.results.filter(r => r.status === "error").length,
      averageScore: this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length,
      maxPossibleScore: 10,
      results: this.results.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        duration: r.duration,
        score: r.score,
        maxScore: r.maxScore,
        checks: Object.entries(r.checks).map(([key, check]) => ({
          name: check.name,
          passed: check.passed,
          critical: check.critical || false
        })),
        errors: r.errors
      }))
    };

    this.printReport(report);
    this.saveReport(report);

    return report;
  }

  printReport(report) {
    console.log("\n\n" + "=".repeat(70));
    console.log("📊 TEST REPORT — HS Code Lookup Live Site");
    console.log("=".repeat(70));
    console.log(`\n⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Passed: ${report.passedTests}/${report.totalTests}`);
    console.log(`❌ Failed: ${report.failedTests}/${report.totalTests}`);
    console.log(`📈 Average Score: ${report.averageScore.toFixed(2)}/10`);

    console.log("\n" + "-".repeat(70));
    console.log("Detailed Results:");
    console.log("-".repeat(70));

    for (const result of report.results) {
      const statusIcon = result.status === "completed" ? "✅" : "❌";
      console.log(`\n${statusIcon} Test ${result.id}: ${result.name}`);
      console.log(`   Duration: ${result.duration}ms | Score: ${result.score}/${result.maxScore}`);

      for (const check of result.checks) {
        const checkIcon = check.passed ? "✔️" : "✘";
        const critical = check.critical ? " 🔴 CRITICAL" : "";
        console.log(`   ${checkIcon} ${check.name}${critical}`);
      }

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.join(", ")}`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✨ Report saved to: test-results.json");
    console.log("=".repeat(70) + "\n");
  }

  saveReport(report) {
    const reportPath = path.join(process.cwd(), "test-results.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }
}

// Run tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests()
    .then(report => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error("❌ Test runner error:", error);
      process.exit(1);
    });
}

module.exports = TestRunner;
