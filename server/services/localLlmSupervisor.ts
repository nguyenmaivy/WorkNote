import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import {
  LOCAL_LLM_AUTOSTART,
  LOCAL_LLM_BASE_URL,
  LOCAL_LLM_CONTEXT_SIZE,
  LOCAL_LLM_ENABLED,
  LOCAL_LLM_GPU_LAYERS,
  LOCAL_LLM_MODEL,
  LOCAL_LLM_MODEL_PATH,
  LOCAL_LLM_THREADS,
} from "../config.js";

let child: ChildProcessWithoutNullStreams | null = null;
let supervisorTimer: ReturnType<typeof setInterval> | null = null;
let starting = false;

function pythonExecutable(): string {
  const windowsVenv = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (fs.existsSync(windowsVenv)) return windowsVenv;
  const unixVenv = path.join(process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(unixVenv)) return unixVenv;
  return "python";
}

function localEndpoint(): { host: string; port: string } | null {
  try {
    const url = new URL(LOCAL_LLM_BASE_URL);
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) return null;
    return { host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname, port: url.port || "80" };
  } catch {
    return null;
  }
}

async function isHealthy(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 700);
  try {
    const response = await fetch(`${LOCAL_LLM_BASE_URL}/models`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureRunning(): Promise<void> {
  if (starting || child || !LOCAL_LLM_ENABLED || !LOCAL_LLM_AUTOSTART) return;
  const endpoint = localEndpoint();
  if (!endpoint || await isHealthy()) return;

  const script = path.join(process.cwd(), "server", "python", "local_llm_server.py");
  if (!fs.existsSync(script) || !fs.existsSync(LOCAL_LLM_MODEL_PATH)) {
    console.warn(`[LocalLLM] Autostart skipped: missing script or model at ${LOCAL_LLM_MODEL_PATH}`);
    return;
  }

  starting = true;
  console.log(`[LocalLLM] Starting ${LOCAL_LLM_MODEL} from ${LOCAL_LLM_MODEL_PATH}`);
  const processChild = spawn(pythonExecutable(), [script], {
    cwd: process.cwd(),
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      LOCAL_LLM_HOST: endpoint.host,
      LOCAL_LLM_PORT: endpoint.port,
      LOCAL_LLM_MODEL,
      LOCAL_LLM_MODEL_PATH,
      LOCAL_LLM_CONTEXT_SIZE: String(LOCAL_LLM_CONTEXT_SIZE),
      LOCAL_LLM_THREADS: String(LOCAL_LLM_THREADS),
      LOCAL_LLM_GPU_LAYERS: String(LOCAL_LLM_GPU_LAYERS),
      LOCAL_LLM_PARENT_WATCH: "1",
    },
  });
  child = processChild;
  starting = false;

  processChild.stdout.on("data", (chunk) => console.log(`[LocalLLM] ${chunk.toString("utf-8").trim()}`));
  processChild.stderr.on("data", (chunk) => console.log(chunk.toString("utf-8").trim()));
  processChild.on("error", (error) => console.error("[LocalLLM] Process error:", error.message));
  processChild.on("close", (code) => {
    if (child === processChild) child = null;
    console.warn(`[LocalLLM] Process stopped (code=${code ?? "unknown"}).`);
  });
}

export function startLocalLlmSupervisor(): void {
  if (!LOCAL_LLM_ENABLED || !LOCAL_LLM_AUTOSTART || supervisorTimer) return;
  void ensureRunning();
  supervisorTimer = setInterval(() => void ensureRunning(), 15_000);
  supervisorTimer.unref();
}

export function stopLocalLlmSupervisor(): void {
  if (supervisorTimer) clearInterval(supervisorTimer);
  supervisorTimer = null;
  if (child) {
    child.stdin.end();
    child.kill();
    child = null;
  }
}
