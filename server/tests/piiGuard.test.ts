import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { maskPII, unmaskPII } from "../services/piiGuardService.js";

describe("piiGuardService (The Sentry - Đội 1: Bảo mật dữ liệu cá nhân)", () => {
  it("anonymizes email and phone number correctly", () => {
    const rawText = "Liên hệ với tôi qua email sinhvien@hcmus.edu.vn hoặc SĐT 0912345678 để nhận tài liệu.";
    const { maskedText, vault, detectedCount, detectedTypes } = maskPII(rawText);

    assert.equal(detectedCount, 2);
    assert.equal(detectedTypes["EMAIL"], 1);
    assert.equal(detectedTypes["PHONE"], 1);
    assert.ok(maskedText.includes("[EMAIL_1]"));
    assert.ok(maskedText.includes("[SỐ_ĐIỆN_THOẠI_1]"));
    assert.ok(!maskedText.includes("sinhvien@hcmus.edu.vn"));
    assert.ok(!maskedText.includes("0912345678"));

    // Phục hồi nguyên vẹn
    const restored = unmaskPII(maskedText, vault);
    assert.equal(restored, rawText);
  });

  it("anonymizes CCCD and Bank Account in financial / study records", () => {
    const rawText = "Hồ sơ sinh viên: CCCD: 079201004567. Chuyển khoản học phí vào STK: 1903456789012.";
    const { maskedText, vault, detectedCount } = maskPII(rawText);

    assert.ok(detectedCount >= 2);
    assert.ok(maskedText.includes("[CCCD_1]"));
    assert.ok(maskedText.includes("[TÀI_KHOẢN_NGÂN_HÀNG_1]"));
    assert.ok(!maskedText.includes("079201004567"));
    assert.ok(!maskedText.includes("1903456789012"));

    const restored = unmaskPII(maskedText, vault);
    assert.equal(restored, rawText);
  });

  it("anonymizes contextual student person name", () => {
    const rawText = "Họ và tên: Nguyễn Văn An. Sinh viên: Trần Thị Mai tham gia nhóm học tập.";
    const { maskedText, vault, detectedCount } = maskPII(rawText);

    assert.ok(detectedCount >= 2);
    assert.ok(maskedText.includes("[HỌ_TÊN_1]"));
    assert.ok(maskedText.includes("[HỌ_TÊN_2]"));
    assert.ok(!maskedText.includes("Nguyễn Văn An"));
    assert.ok(!maskedText.includes("Trần Thị Mai"));

    const restored = unmaskPII(maskedText, vault);
    assert.equal(restored, rawText);
  });

  it("reuses same token for repeated identical sensitive data", () => {
    const rawText = "Gửi bài vào email test@gmail.com. Nhắc lại: test@gmail.com là địa chỉ duy nhất.";
    const { maskedText, vault, detectedCount } = maskPII(rawText);

    assert.equal(detectedCount, 1);
    // Cả 2 chỗ đều được thay bằng [EMAIL_1]
    const matches = maskedText.match(/\[EMAIL_1\]/g);
    assert.equal(matches?.length, 2);

    const restored = unmaskPII(maskedText, vault);
    assert.equal(restored, rawText);
  });

  it("handles blank or null text safely", () => {
    const { maskedText, vault, detectedCount } = maskPII("");
    assert.equal(maskedText, "");
    assert.equal(detectedCount, 0);
    assert.deepEqual(vault, {});
  });
});
