import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { getAvailableProviders } from "../config.js";
import { extractDocumentText } from "../services/documentService.js";
import { looseParseJson, normalizeAnalysis } from "../services/fileService.js";
import { getProviderOrder } from "../services/providerRouter.js";
import { callLocalLlm } from "../services/providerRouter.js";
import { LOCAL_LLM_BASE_URL, LOCAL_LLM_MODEL } from "../config.js";
import { resetProvider } from "../services/rateLimitTracker.js";

describe("Multi-Provider & Document Extractor Architecture", () => {
  it("getAvailableProviders returns clean capability matrix", () => {
    const providers = getAvailableProviders();
    assert.equal(typeof providers.local, "boolean");
    assert.equal(typeof providers.gemini, "boolean");
    assert.equal(typeof providers.groq, "boolean");
    assert.equal(typeof providers.openrouter, "boolean");
    assert.equal(typeof providers.hasStt, "boolean");
    assert.equal(typeof providers.hasLlm, "boolean");
    assert.equal(typeof providers.hasVision, "boolean");
    assert.equal(typeof providers.hasAny, "boolean");
  });

  it("routes private text tasks to local before cloud providers", () => {
    const chatOrder = getProviderOrder("CHAT");
    const summaryOrder = getProviderOrder("TEXT_SUMMARY");
    const quizOrder = getProviderOrder("QUIZ");

    assert.equal(chatOrder[0], "local");
    assert.equal(summaryOrder[0], "local");
    assert.equal(quizOrder[0], "local");
  });

  it("calls an OpenAI-compatible local chat endpoint", async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestBody: any;

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(input);
      if (requestUrl.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: LOCAL_LLM_MODEL }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Phản hồi từ model local" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    try {
      resetProvider("local");
      const result = await callLocalLlm("Hãy trả lời từ tài liệu.");
      assert.equal(result, "Phản hồi từ model local");
      assert.equal(requestUrl, `${LOCAL_LLM_BASE_URL}/chat/completions`);
      assert.equal(requestBody.model, LOCAL_LLM_MODEL);
      assert.equal(requestBody.stream, false);
    } finally {
      globalThis.fetch = originalFetch;
      resetProvider("local");
    }
  });

  it("extractDocumentText reads UTF-8 and cleans HTML tags", async () => {
    const tmpPath = path.join(process.cwd(), "uploads", `test-doc-${Date.now()}.html`);
    if (!fs.existsSync(path.dirname(tmpPath))) {
      fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
    }
    await fs.promises.writeFile(
      tmpPath,
      "<html><body><h1>Bài Học 1</h1><p>Nội dung học tập về React.</p><script>alert('xss');</script></body></html>",
      "utf-8"
    );

    try {
      const stat = await fs.promises.stat(tmpPath);
      const res = await extractDocumentText(tmpPath, "text/html", "test-doc.html", stat.size);
      assert.ok(res.text.includes("Bài Học 1"));
      assert.ok(res.text.includes("Nội dung học tập về React"));
      assert.ok(!res.text.includes("<script>"));
      assert.ok(!res.text.includes("alert"));
    } finally {
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  });

  it("looseParseJson repairs truncated JSON successfully", () => {
    const truncatedJson = '{"summary": "Tóm tắt hay", "quiz": [{"id": "q1", "question": "Hỏi gì?", "options": ["A", "B"';
    const parsed = looseParseJson(truncatedJson);
    assert.ok(parsed);
    assert.equal(parsed.summary, "Tóm tắt hay");
  });

  it("normalizeAnalysis provides safe fallback mindmap and quiz", () => {
    const normalized = normalizeAnalysis({ summary: "Tóm tắt" }, "my-file.mp3");
    assert.equal(normalized.summary, "Tóm tắt");
    assert.deepEqual(normalized.quiz, []);
    assert.equal(normalized.mindmap.id, "root");
    assert.equal(normalized.mindmap.label, "my-file.mp3");
  });

  it("calculates timed segment duration accurately (dur = end - start)", () => {
    const rawGroqSegments = [
      { start: 0.0, end: 3.45, text: "Xin chào các bạn" },
      { start: 3.45, end: 7.82, text: "Hôm nay chúng ta học React" },
    ];

    const processed = rawGroqSegments.map((s) => ({
      start: Math.max(0, Number(s.start) || 0),
      dur: Math.max(0.5, Number((s.end - s.start).toFixed(2))),
      text: s.text.trim(),
    }));

    assert.equal(processed[0].start, 0.0);
    assert.equal(processed[0].dur, 3.45);
    assert.equal(processed[1].start, 3.45);
    assert.equal(processed[1].dur, 4.37);
  });
});
