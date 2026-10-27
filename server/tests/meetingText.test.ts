import { test } from "node:test";
import assert from "node:assert/strict";
import { sentenceCase, validRestoration, restoreMeetingText, normalizeMeetingText } from "../services/meetingText.js";

test("normalizes explicit numbers and spelled AI without guessing ambiguous words", () => {
  assert.equal(normalizeMeetingText("a i đạt năm mươi phần trăm năm hai không hai lăm"), "AI đạt 50% năm 2025");
  assert.equal(normalizeMeetingText("NĂM MƯƠI LĂM VÀ NĂM MƯƠI NHĂM"), "55 VÀ 55");
  assert.equal(normalizeMeetingText("ai là người miền nam năm mươi nam"), "ai là người miền nam 50 nam");
  assert.equal(normalizeMeetingText("mười một phần trăm và chín phần trăm"), "11% và 9%");
  assert.equal(validRestoration("50% năm 2025", "50 năm 2025"), false);
  assert.equal(validRestoration("50% năm 2025", "55% năm 2025"), false);
});

test("sentence case retains Vietnamese accents and sentence boundaries", () => {
  assert.equal(sentenceCase("XIN CHÀO. HÔM NAY HỌP! ĐÚNG KHÔNG? VÂNG"), "Xin chào. Hôm nay họp! Đúng không? Vâng");
});

test("restoration permits proper names but rejects rewriting and instructions", () => {
  const raw = "HÔM NAY NGUYỄN VĂN AN HỌP TẠI HÀ NỘI VỚI FPT";
  assert.equal(validRestoration(raw, "Hôm nay Nguyễn Văn An họp tại Hà Nội với FPT."), true);
  assert.equal(validRestoration(raw, "Hôm nay Nguyễn Văn Bình họp tại Hà Nội với FPT."), false);
  assert.equal(validRestoration(raw, "Đây là bản chỉnh: " + raw), false);
  assert.equal(validRestoration("DOANH THU 1.5 TRIỆU", "Doanh thu 15 triệu."), false);
});

test("local formatter keeps names and punctuation without changing transcript words", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "Nguyễn Văn An đến Hà Nội. FPT họp hôm nay." } }] }));
  try {
    assert.equal(await restoreMeetingText("NGUYỄN VĂN AN ĐẾN HÀ NỘI FPT HỌP HÔM NAY"), "Nguyễn Văn An đến Hà Nội. FPT họp hôm nay.");
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "XIN CHÀO" } }] }));
    assert.equal(await restoreMeetingText("XIN CHÀO"), "Xin chào");
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal(await restoreMeetingText("XIN CHÀO. HỌP HÔM NAY"), "Xin chào. Họp hôm nay");
  } finally { globalThis.fetch = original; }
});
