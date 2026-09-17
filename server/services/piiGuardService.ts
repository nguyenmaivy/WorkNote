/**
 * 🛡️ ĐỘI 1: VỆ BINH BẢO MẬT & THANH LỌC DỮ LIỆU CÁ NHÂN (The Sentry / PII Guard)
 * Tác giả: Bậc thầy Kỹ sư AI & CNTT
 * Mục tiêu: Tự động phát hiện, mã hóa ẩn danh hóa (Anonymization) và phục hồi (Deanonymization)
 * các thông tin định danh cá nhân (PII) trong tài liệu và ghi chú học tập.
 */

export interface PIIAnonymizeResult {
  maskedText: string;
  vault: Record<string, string>; // Bản đồ ánh xạ token ẩn danh -> dữ liệu gốc
  detectedCount: number;
  detectedTypes: Record<string, number>;
}

interface PIIPatternDef {
  type: string;
  placeholderPrefix: string;
  regex: RegExp;
}

// Danh mục các mẫu thông tin nhạy cảm thường gặp tại Việt Nam và Quốc tế
const PII_PATTERNS: PIIPatternDef[] = [
  // 1. API Keys & Secrets (AIza, sk-, Bearer tokens...)
  {
    type: "SECRET_KEY",
    placeholderPrefix: "MÃ_BÍ_MẬT",
    regex: /\b(?:sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36}|Bearer\s+[a-zA-Z0-9_\-\.]{20,})\b/g,
  },
  // 2. Email Address (RFC 5322)
  {
    type: "EMAIL",
    placeholderPrefix: "EMAIL",
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  },
  // 3. Số Căn cước công dân (12 số) hoặc CMND cũ (9 số)
  {
    type: "CITIZEN_ID",
    placeholderPrefix: "CCCD",
    regex: /(?<=\b|(?:CCCD|CMND|căn cước|chứng minh|định danh)[:\s]*)\b\d{9}\b|\b\d{12}\b/gi,
  },
  // 4. Số điện thoại Việt Nam (+84, 84, 03x, 05x, 07x, 08x, 09x)
  {
    type: "PHONE",
    placeholderPrefix: "SỐ_ĐIỆN_THOẠI",
    regex: /(?:\+84|84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])(?:\d{7}|\s\d{3}\s\d{4}|\.\d{3}\.\d{4}|-\d{3}-\d{4})\b/g,
  },
  // 5. Số tài khoản ngân hàng / Số thẻ (12 đến 19 chữ số hoặc có phân tách khoảng trắng/dấu gạch)
  {
    type: "BANK_ACCOUNT",
    placeholderPrefix: "TÀI_KHOẢN_NGÂN_HÀNG",
    regex: /(?<=(?:STK|tài khoản|ngân hàng|số thẻ|TK|card)[:\s]*)\b(?:\d[ -]?){9,18}\d\b/gi,
  },
  // 6. Họ và tên có tiền tố chỉ định (Ví dụ: "Họ và tên: Nguyễn Văn A", "Sinh viên: Trần Thị B")
  {
    type: "PERSON_NAME",
    placeholderPrefix: "HỌ_TÊN",
    regex: /(?<=(?:Họ và tên|Họ tên|Họ & tên|Sinh viên|Học viên|Tên tôi là|Tôi là|Học sinh)[:\s]+)[A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,4}/gu,
  },
];

/**
 * Quét và che giấu các thông tin định danh cá nhân nhạy cảm trong văn bản.
 * Dữ liệu thật sẽ được lưu vào một `vault` để có thể khôi phục lại khi cần.
 */
export function maskPII(text: string): PIIAnonymizeResult {
  if (!text || typeof text !== "string") {
    return { maskedText: "", vault: {}, detectedCount: 0, detectedTypes: {} };
  }

  let maskedText = text;
  const vault: Record<string, string> = {};
  const detectedTypes: Record<string, number> = {};
  let totalDetected = 0;

  // Bản đồ ngược tránh trùng lặp cùng 1 giá trị nhạy cảm (Ví dụ email xuất hiện 2 lần thì chung 1 token)
  const valueToTokenMap = new Map<string, string>();
  const counterByType: Record<string, number> = {};

  for (const pattern of PII_PATTERNS) {
    // Reset regex index cho global flag
    pattern.regex.lastIndex = 0;
    
    maskedText = maskedText.replace(pattern.regex, (matched) => {
      const trimmed = matched.trim();
      if (!trimmed) return matched;

      // Nếu giá trị này đã được gán token trước đó, tái sử dụng token
      if (valueToTokenMap.has(trimmed)) {
        return valueToTokenMap.get(trimmed)!;
      }

      counterByType[pattern.type] = (counterByType[pattern.type] || 0) + 1;
      const token = `[${pattern.placeholderPrefix}_${counterByType[pattern.type]}]`;

      vault[token] = trimmed;
      valueToTokenMap.set(trimmed, token);

      detectedTypes[pattern.type] = (detectedTypes[pattern.type] || 0) + 1;
      totalDetected++;

      return token;
    });
  }

  return {
    maskedText,
    vault,
    detectedCount: totalDetected,
    detectedTypes,
  };
}

/**
 * Khôi phục lại văn bản gốc từ văn bản đã được ẩn danh thông qua két bảo mật (vault).
 */
export function unmaskPII(maskedText: string, vault: Record<string, string>): string {
  if (!maskedText || !vault || Object.keys(vault).length === 0) {
    return maskedText;
  }

  let restored = maskedText;
  for (const [token, originalValue] of Object.entries(vault)) {
    // Thay thế toàn bộ token bằng giá trị gốc
    restored = restored.split(token).join(originalValue);
  }

  return restored;
}
