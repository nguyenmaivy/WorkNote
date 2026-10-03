import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { LOCAL_LLM_BASE_URL, LOCAL_LLM_MODEL } from "../config.js";

export interface TutorChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QuizRpgQuestion {
  scenario: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  exp_reward: number;
  explanation: string;
}

const MAX_STDOUT_BYTES = 5 * 1024 * 1024; // 5MB limit
const MAX_STDERR_BYTES = 2 * 1024 * 1024; // 2MB limit

async function callLocalChat(
  messages: TutorChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs = 25000
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${LOCAL_LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: LOCAL_LLM_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });
    if (!response.ok) throw new Error(`Local LLM HTTP ${response.status}`);
    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Local LLM returned an empty response");
    }
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

function getPythonExecutable(): string {
  const venvWin = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvWin)) return venvWin;
  const venvUnix = path.join(process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(venvUnix)) return venvUnix;
  return "python";
}

async function callPythonTutor(payload: Record<string, any>, timeoutMs = 25000): Promise<any> {
  const scriptPath = path.join(process.cwd(), "server", "python", "tutor_llm.py");
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Tutor script not found at: ${scriptPath}`);
  }

  const pythonBin = getPythonExecutable();

  return new Promise((resolve, reject) => {
    let hasEnded = false;

    const timer = setTimeout(() => {
      if (!hasEnded) {
        hasEnded = true;
        child.kill();
        reject(new Error(`Tutor execution timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const child = spawn(pythonBin, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        HF_HUB_DISABLE_SYMLINKS_WARNING: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_STDOUT_BYTES) {
        stdout += chunk.toString("utf-8");
      }
    });

    child.stderr.on("data", (chunk) => {
      if (stderr.length < MAX_STDERR_BYTES) {
        stderr += chunk.toString("utf-8");
      }
    });

    child.on("close", (code) => {
      if (hasEnded) return;
      hasEnded = true;
      clearTimeout(timer);

      if (code !== 0) {
        return reject(new Error(`Tutor worker exited with code ${code}. Error logs: ${stderr.substring(0, 1000)}`));
      }

      try {
        const cleanOut = stdout.replace(/^\uFEFF/, "").trim();
        const parsed = JSON.parse(cleanOut);
        if (!parsed.success) {
          return reject(new Error(parsed.error || "Tutor worker returned error"));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Tutor output JSON. Payload size: ${stdout.length}`));
      }
    });

    child.on("error", (err) => {
      if (!hasEnded) {
        hasEnded = true;
        clearTimeout(timer);
        reject(new Error(`Failed to spawn Tutor worker: ${err.message}`));
      }
    });

    const payloadString = JSON.stringify(payload);
    child.stdin.write(payloadString, "utf-8");
    child.stdin.end();
  });
}

/**
 * Chat trực tiếp với mô hình Qwen2.5-1.5B GGUF chạy offline 100%
 */
export async function chatWithTutor(
  messages: TutorChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  try {
    const maxTokens = options?.maxTokens ?? 256;
    const temperature = options?.temperature ?? 0.7;
    try {
      return await callLocalChat(messages, maxTokens, temperature);
    } catch {
      const res = await callPythonTutor({
        action: "chat",
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      return res.reply;
    }
  } catch (err: any) {
    console.error("[TutorService] chatWithTutor Error:", err.message);
    throw err;
  }
}

/**
 * Tóm tắt nội dung văn bản thành các gạch đầu dòng súc tích
 */
export async function summarizeWithTutor(text: string, bullets = 3): Promise<string> {
  try {
    try {
      return await callLocalChat([
        {
          role: "system",
          content: `Tóm tắt văn bản thành chính xác ${bullets} gạch đầu dòng ngắn gọn bằng Tiếng Việt.`,
        },
        { role: "user", content: text },
      ], 256, 0.3);
    } catch {
      const res = await callPythonTutor({ action: "summarize", text, bullets });
      return res.summary;
    }
  } catch (err: any) {
    console.error("[TutorService] summarizeWithTutor Error:", err.message);
    throw err;
  }
}

/**
 * Sinh thử thách câu hỏi trắc nghiệm RPG (kèm EXP và kịch bản nhập vai)
 */
export async function generateQuizRpgWithTutor(content: string): Promise<QuizRpgQuestion | { raw: string }> {
  try {
    try {
      const raw = await callLocalChat([
        {
          role: "system",
          content: "Tạo đúng 1 câu hỏi RPG từ nội dung và chỉ trả JSON với các field scenario, question, options (A-D), correct_answer, exp_reward, explanation.",
        },
        { role: "user", content },
      ], 400, 0.4);
      const match = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const valid =
          typeof parsed?.scenario === "string" &&
          typeof parsed?.question === "string" &&
          parsed?.options &&
          ["A", "B", "C", "D"].includes(parsed?.correct_answer) &&
          Number(parsed?.exp_reward) >= 10 &&
          typeof parsed?.explanation === "string";
        if (valid) return parsed as QuizRpgQuestion;
      }
      return { raw };
    } catch {
      const res = await callPythonTutor({ action: "quiz_rpg", content });
      if (res.quiz) return res.quiz as QuizRpgQuestion;
      return { raw: res.quiz_raw };
    }
  } catch (err: any) {
    console.error("[TutorService] generateQuizRpgWithTutor Error:", err.message);
    throw err;
  }
}
