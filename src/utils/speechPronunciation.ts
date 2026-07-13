/**
 * Chuẩn hóa cách đọc cho Web Speech API:
 * giọng đọc tiếng Việt thường "đánh vần" sai tên riêng / từ tiếng Anh ("YouTube", "API"...).
 * Ta thay các token đó bằng phiên âm tiếng Việt (các âm tiết mà giọng Việt đọc ra đúng),
 * đồng thời giữ bản đồ vị trí để highlight vẫn trỏ về CHỮ GỐC hiển thị trên màn hình.
 */

// Thương hiệu / từ ngoại phổ biến → phiên âm tiếng Việt. Khóa viết thường (so khớp không phân biệt hoa/thường).
// Chỉ chứa các từ KHÔNG trùng với từ tiếng Việt thông dụng để tránh đọc sai văn bản thuần Việt.
const BRAND_MAP: Record<string, string> = {
  youtube: "diu-túp",
  google: "gu-gồ",
  gmail: "gi-meo",
  facebook: "phây-búc",
  messenger: "mét-sừn-jơ",
  instagram: "in-sờ-ta-gram",
  tiktok: "tích-tóc",
  twitter: "tuýt-tơ",
  zalo: "za-lô",
  openai: "âu-pờn ây-ai",
  chatgpt: "chát ji-pi-ti",
  gemini: "ghê-mi-ni",
  claude: "klốt",
  copilot: "cô-pai-lốt",
  microsoft: "mai-cờ-rô-sốp",
  windows: "uyn-đâu",
  android: "en-đroi",
  iphone: "ai-phôn",
  ipad: "ai-pát",
  macbook: "mác-búc",
  python: "pai-thừn",
  javascript: "ja-va-xcrip",
  typescript: "típ-xcrip",
  react: "ri-ác",
  nodejs: "nốt-jê-ét",
  github: "gít-hấp",
  email: "i-meo",
  internet: "in-tơ-nét",
  website: "goép-sai",
  online: "on-lai",
  agent: "ây-jừnt",
  agents: "ây-jừnts",
  prompt: "prom",
  token: "tâu-cừn",
};

// Bảng đọc tên chữ cái Latin theo lối tiếng Anh nhưng viết bằng âm tiếng Việt,
// dùng để "đánh vần" các từ viết tắt toàn chữ hoa (AI, API, URL, HTML...).
const LETTER_VI: Record<string, string> = {
  a: "ây", b: "bi", c: "xi", d: "đi", e: "i", f: "ép", g: "giy", h: "ếch",
  i: "ai", j: "giây", k: "kây", l: "eo", m: "em", n: "en", o: "âu", p: "pi",
  q: "kiu", r: "a", s: "ét", t: "ti", u: "diu", v: "vi", w: "đắp-liu",
  x: "ích", y: "quai", z: "dét",
};

function spellAcronym(core: string): string {
  return core
    .split("")
    .map((c) => LETTER_VI[c.toLowerCase()] ?? c)
    .join("-");
}

/** Biến một "lõi từ" thành dạng đọc được nếu nó là từ ngoại/viết tắt; nếu không giữ nguyên. */
function transformCore(core: string): string {
  if (/^[A-Z]{2,6}$/.test(core)) return spellAcronym(core); // AI, API, URL, HTML...
  const brand = BRAND_MAP[core.toLowerCase()];
  return brand ?? core;
}

/** Tách dấu câu bao quanh khỏi lõi chữ. */
function splitToken(token: string): { lead: string; core: string; trail: string } {
  const lead = token.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? "";
  const trail = token.match(/[^\p{L}\p{N}]+$/u)?.[0] ?? "";
  if (lead.length + trail.length >= token.length) {
    return { lead: token, core: "", trail: "" };
  }
  return { lead, core: token.slice(lead.length, token.length - trail.length), trail };
}

export interface SpokenSegment {
  /** [s, e): khoảng vị trí trong chuỗi ĐỌC (spoken) */
  s: number;
  e: number;
  /** [o0, o1): khoảng vị trí token tương ứng trong chuỗi GỐC (hiển thị) */
  o0: number;
  o1: number;
}

export interface SpokenBuild {
  spoken: string;
  segments: SpokenSegment[];
}

/**
 * Dựng chuỗi để đọc + bản đồ vị trí về chuỗi gốc.
 * @param text   văn bản gốc hiển thị
 * @param enabled bật phiên âm (chỉ nên bật khi đọc bằng giọng tiếng Việt)
 */
export function buildSpokenSegments(text: string, enabled: boolean): SpokenBuild {
  const segments: SpokenSegment[] = [];
  let spoken = "";
  let last = 0;

  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tokenStart = m.index;
    const token = m[0];

    // sao chép khoảng trắng giữa các token y nguyên (giữ ngắt nghỉ tự nhiên)
    spoken += text.slice(last, tokenStart);
    last = tokenStart + token.length;

    let spokenToken = token;
    if (enabled) {
      const { lead, core, trail } = splitToken(token);
      spokenToken = core ? lead + transformCore(core) + trail : token;
    }

    const s = spoken.length;
    spoken += spokenToken;
    segments.push({ s, e: spoken.length, o0: tokenStart, o1: tokenStart + token.length });
  }
  spoken += text.slice(last);

  return { spoken, segments };
}

/** Tìm segment ứng với vị trí ký tự `si` trong chuỗi đọc (segment có s lớn nhất ≤ si). */
export function findSegment(segments: SpokenSegment[], si: number): SpokenSegment | null {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].s <= si) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans >= 0 ? segments[ans] : null;
}
