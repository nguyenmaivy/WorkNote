import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import type { SearchSnippet } from "./embedService.js";
import type { NotebookSource } from "./notebookService.js";
import { searchSources } from "./embedService.js";

const SIDECAR_SCRIPT = path.join(process.cwd(), "server", "python", "librarian_sidecar.py");
const READY_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

function getPythonBin(): string {
  const win = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (fs.existsSync(win)) return win;
  const unix = path.join(process.cwd(), ".venv", "bin", "python");
  if (fs.existsSync(unix)) return unix;
  return "python";
}

type PendingRequest = {
  resolve: (value: SearchSnippet[]) => void;
  timer: ReturnType<typeof setTimeout>;
  query: string;
  sources: NotebookSource[];
  limit: number;
};

class LibrarianSidecar {
  private proc: ChildProcess | null = null;
  private ready = false;
  private starting = false;
  private lineBuffer = "";
  private pendingQueue: PendingRequest[] = [];
  private currentRequest: PendingRequest | null = null;

  private start(): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    if (this.starting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.ready || !this.starting) {
            clearInterval(check);
            resolve(this.ready);
          }
        }, 200);
      });
    }

    this.starting = true;
    return new Promise((resolve) => {
      if (!fs.existsSync(SIDECAR_SCRIPT)) {
        this.starting = false;
        resolve(false);
        return;
      }

      const proc = spawn(getPythonBin(), [SIDECAR_SCRIPT], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      const readyTimer = setTimeout(() => {
        console.warn("[Sidecar] Timeout waiting for ready signal");
        this.starting = false;
        resolve(false);
      }, READY_TIMEOUT_MS);

      proc.stdout?.on("data", (chunk: Buffer) => {
        this.lineBuffer += chunk.toString("utf-8");
        let nl: number;
        while ((nl = this.lineBuffer.indexOf("\n")) !== -1) {
          const line = this.lineBuffer.slice(0, nl).trim();
          this.lineBuffer = this.lineBuffer.slice(nl + 1);
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.ready) {
              clearTimeout(readyTimer);
              this.proc = proc;
              this.ready = true;
              this.starting = false;
              console.log("[Sidecar] Python librarian ready ✓");
              resolve(true);
              return;
            }
            // Normal response
            this.handleResponse(msg);
          } catch { /* ignore parse errors */ }
        }
      });

      proc.stderr?.on("data", (d: Buffer) => {
        process.stderr.write("[Sidecar] " + d.toString());
      });

      proc.on("exit", (code) => {
        console.warn(`[Sidecar] Process exited (code ${code}), will restart on next request`);
        this.proc = null;
        this.ready = false;
        this.starting = false;
        if (this.currentRequest) {
          clearTimeout(this.currentRequest.timer);
          const fallback = searchSources(this.currentRequest.sources, this.currentRequest.query, this.currentRequest.limit);
          this.currentRequest.resolve(fallback);
          this.currentRequest = null;
        }
      });

      proc.on("error", (err) => {
        clearTimeout(readyTimer);
        console.warn("[Sidecar] Spawn error:", err.message);
        this.starting = false;
        resolve(false);
      });
    });
  }

  private handleResponse(msg: any) {
    if (!this.currentRequest) return;
    const req = this.currentRequest;
    this.currentRequest = null;
    clearTimeout(req.timer);

    let results: SearchSnippet[] = [];
    if (msg.success && Array.isArray(msg.results) && msg.results.length > 0) {
      results = msg.results;
    } else {
      results = searchSources(req.sources, req.query, req.limit);
    }
    req.resolve(results);

    // Process next in queue
    const next = this.pendingQueue.shift();
    if (next) this.sendRequest(next);
  }

  private sendRequest(req: PendingRequest) {
    this.currentRequest = req;
    const payload = JSON.stringify({
      query: req.query,
      documents: req.sources.map((s) => ({ id: s.id, title: s.title, content: s.content })),
      limit: req.limit,
    });
    this.proc!.stdin!.write(payload + "\n", "utf-8");

    req.timer = setTimeout(() => {
      console.warn("[Sidecar] Request timeout, falling back to TF-IDF");
      this.currentRequest = null;
      req.resolve(searchSources(req.sources, req.query, req.limit));
      const next = this.pendingQueue.shift();
      if (next) this.sendRequest(next);
    }, REQUEST_TIMEOUT_MS);
  }

  async search(sources: NotebookSource[], query: string, limit = 5): Promise<SearchSnippet[]> {
    if (!query.trim() || sources.length === 0) return [];

    const isReady = await this.start();
    if (!isReady || !this.proc) {
      return searchSources(sources, query, limit);
    }

    return new Promise((resolve) => {
      const req: PendingRequest = {
        resolve,
        query,
        sources,
        limit,
        timer: null as any,
      };

      if (this.currentRequest) {
        this.pendingQueue.push(req);
      } else {
        this.sendRequest(req);
      }
    });
  }

  shutdown() {
    if (this.proc) {
      this.proc.stdin?.end();
      this.proc.kill();
    }
  }
}

export const librarianSidecar = new LibrarianSidecar();
