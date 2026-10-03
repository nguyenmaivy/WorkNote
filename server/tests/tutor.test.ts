import test from "node:test";
import assert from "node:assert/strict";
import { chatWithTutor, summarizeWithTutor, generateQuizRpgWithTutor } from "../services/tutorService.js";

test("Đội 3 (The Tutor): Chat cục bộ với Qwen2.5-1.5B GGUF", async () => {
  const reply = await chatWithTutor([
    { role: "system", content: "Bạn là trợ lý AI súc tích. Hãy chỉ trả lời đúng một chữ: 'OK'." },
    { role: "user", content: "Kiểm tra kết nối." }
  ], { maxTokens: 10 });

  assert.ok(typeof reply === "string");
  assert.ok(reply.length > 0);
  assert.match(reply, /ok/i);
});

test("Đội 3 (The Tutor): Tóm tắt tài liệu văn bản offline", async () => {
  const sampleDoc = "Git là hệ thống quản lý phiên bản phân tán. Git giúp lập trình viên theo dõi các thay đổi trong mã nguồn trong quá trình phát triển phần mềm.";
  const summary = await summarizeWithTutor(sampleDoc, 2);

  assert.ok(typeof summary === "string");
  assert.ok(summary.length > 0);
});

test("Đội 3 (The Tutor): Sinh câu hỏi trắc nghiệm RPG (JSON Format)", async () => {
  const content = "HTML là ngôn ngữ đánh dấu siêu văn bản dùng để cấu trúc các trang web.";
  const quiz = await generateQuizRpgWithTutor(content);

  assert.ok(quiz);
  if ("scenario" in quiz) {
    assert.ok(quiz.question);
    assert.ok(quiz.options);
    assert.ok(["A", "B", "C", "D"].includes(quiz.correct_answer));
    assert.ok(quiz.exp_reward >= 10);
  } else {
    // Neu fallback dang raw string
    assert.ok(quiz.raw.length > 0);
  }
});
