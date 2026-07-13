import { Router } from "express";
import { YoutubeTranscript } from "youtube-transcript";
import { extractYoutubeId } from "../services/fileService.js";

const router = Router();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface Cue {
  start: number; // seconds
  dur: number; // seconds
  text: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;#39;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Balanced-brace extraction of a JSON object that follows a marker in the page.
function extractJsonAfter(html: string, marker: string): any | null {
  let i = html.indexOf(marker);
  if (i < 0) return null;
  i = html.indexOf("{", i);
  if (i < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// Determine the video's ORIGINAL spoken language + the list of caption languages
// available, by reading the watch page's player response (the library alone picks
// the first track alphabetically, which is often the wrong language).
async function detectTracks(
  id: string
): Promise<{ originalLang: string | null; langs: string[] }> {
  try {
    const html = await (
      await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en" },
      })
    ).text();
    const pr = extractJsonAfter(html, "ytInitialPlayerResponse");
    const tracks: any[] = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const langs = [...new Set(tracks.map((t) => String(t.languageCode || "").slice(0, 2)).filter(Boolean))];
    const asr = tracks.find((t) => t.kind === "asr");
    const originalLang =
      (pr?.videoDetails?.defaultAudioLanguage as string | undefined)?.slice(0, 2) ||
      (asr?.languageCode as string | undefined)?.slice(0, 2) ||
      (tracks[0]?.languageCode as string | undefined)?.slice(0, 2) ||
      null;
    return { originalLang, langs };
  } catch {
    return { originalLang: null, langs: [] };
  }
}

// youtube-transcript returns offset/duration in MILLISECONDS.
async function fetchTimed(id: string, lang?: string): Promise<{ lang: string; cues: Cue[] } | null> {
  try {
    const raw = await YoutubeTranscript.fetchTranscript(id, lang ? { lang } : undefined);
    if (!raw?.length) return null;
    const cues: Cue[] = raw
      .map((s: any) => ({
        start: (Number(s.offset) || 0) / 1000,
        dur: (Number(s.duration) || 0) / 1000,
        text: decodeEntities(String(s.text || "")),
      }))
      .filter((c) => c.text);
    const actualLang = (raw[0] as any)?.lang || lang || "auto";
    return { lang: actualLang, cues };
  } catch {
    return null;
  }
}

// Merge tiny auto-caption fragments into readable, sentence-ish cues.
function mergeCues(segs: Cue[], maxChars = 90, maxWindow = 6): Cue[] {
  const out: { start: number; end: number; text: string }[] = [];
  let cur: { start: number; end: number; text: string } | null = null;
  for (const s of segs) {
    const end = s.start + s.dur;
    if (!cur) {
      cur = { start: s.start, end, text: s.text };
      continue;
    }
    const sentenceEnd = /[.!?…。！？]$/.test(cur.text);
    const windowOK = end - cur.start <= maxWindow;
    const charsOK = cur.text.length < maxChars;
    if (!sentenceEnd && windowOK && charsOK) {
      cur.text = `${cur.text} ${s.text}`.trim();
      cur.end = end;
    } else {
      out.push(cur);
      cur = { start: s.start, end, text: s.text };
    }
  }
  if (cur) out.push(cur);
  return out.map((c) => ({ start: c.start, dur: Math.max(0.4, c.end - c.start), text: c.text }));
}

// ─── POST /api/youtube-transcript ──────────────────────────────────────────────
// Body: { url, lang? }. Without lang → original-language captions (auto-detected).
// With lang → that language's track (YouTube's own translation when available).
router.post("/", async (req, res): Promise<any> => {
  try {
    const { url, lang } = req.body || {};
    const id = extractYoutubeId(String(url || ""));
    if (!id) return res.status(400).json({ error: "Link YouTube không hợp lệ." });

    if (lang) {
      const got = await fetchTimed(id, String(lang).slice(0, 2));
      if (!got) return res.status(404).json({ error: "Video không có phụ đề ngôn ngữ này." });
      return res.json({ success: true, lang: got.lang, segments: mergeCues(got.cues) });
    }

    // Original track: detect the real spoken language first.
    const { originalLang, langs } = await detectTracks(id);
    const got = (await fetchTimed(id, originalLang || undefined)) || (await fetchTimed(id));
    if (!got) {
      return res.status(404).json({ error: "Video này không có phụ đề công khai để bóc tách." });
    }
    return res.json({
      success: true,
      lang: originalLang || got.lang,
      availableLangs: langs,
      segments: mergeCues(got.cues),
    });
  } catch {
    return res.status(500).json({ error: "Không lấy được phụ đề video." });
  }
});

export default router;
