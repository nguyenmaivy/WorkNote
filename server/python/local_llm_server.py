import json
import os
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from llama_cpp import Llama


HOST = os.environ.get("LOCAL_LLM_HOST", "127.0.0.1")
PORT = int(os.environ.get("LOCAL_LLM_PORT", "11434"))
MODEL_NAME = os.environ.get("LOCAL_LLM_MODEL", "worknote-qwen2.5-1.5b")
MODEL_PATH = Path(
    os.environ.get(
        "LOCAL_LLM_MODEL_PATH",
        Path.cwd() / "models" / "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    )
).resolve()
N_CTX = int(os.environ.get("LOCAL_LLM_CONTEXT_SIZE", "8192"))
N_THREADS = int(os.environ.get("LOCAL_LLM_THREADS", str(max(2, min(8, os.cpu_count() or 4)))))
N_GPU_LAYERS = int(os.environ.get("LOCAL_LLM_GPU_LAYERS", "0"))

if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"Local model not found: {MODEL_PATH}")

llm = None
model_lock = threading.Lock()


class LocalLlmHandler(BaseHTTPRequestHandler):
    server_version = "WorkNoteLocalLLM/1.0"

    def log_message(self, _format, *_args):
        return

    def _json(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path in ("/health", "/v1/models"):
            if self.path == "/health":
                return self._json(200, {"status": "ok", "model": MODEL_NAME})
            return self._json(
                200,
                {
                    "object": "list",
                    "data": [
                        {
                            "id": MODEL_NAME,
                            "object": "model",
                            "owned_by": "worknote-local",
                        }
                    ],
                },
            )
        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            return self._json(404, {"error": "Not found"})

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 20 * 1024 * 1024:
                return self._json(400, {"error": "Invalid request body size"})
            raw_body = self.rfile.read(length)
            try:
                decoded_body = raw_body.decode("utf-8-sig")
            except UnicodeDecodeError:
                decoded_body = raw_body.decode("cp1258")
            body = json.loads(decoded_body)
            messages = body.get("messages")
            if not isinstance(messages, list) or not messages:
                return self._json(400, {"error": "messages must be a non-empty array"})

            max_tokens = max(1, min(int(body.get("max_tokens", 1024)), 2048))
            temperature = max(0.0, min(float(body.get("temperature", 0.3)), 2.0))
            started = time.time()
            with model_lock:
                if llm is None:
                    return self._json(503, {"error": "Model is still loading"})
                response = llm.create_chat_completion(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    stream=False,
                )

            choice = response.get("choices", [{}])[0]
            content = choice.get("message", {}).get("content", "")
            self._json(
                200,
                {
                    "id": response.get("id", f"worknote-{int(time.time())}"),
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": MODEL_NAME,
                    "choices": [
                        {
                            "index": 0,
                            "message": {"role": "assistant", "content": content},
                            "finish_reason": choice.get("finish_reason", "stop"),
                        }
                    ],
                    "usage": response.get("usage", {}),
                    "worknote": {"elapsedMs": round((time.time() - started) * 1000)},
                },
            )
        except Exception as exc:
            sys.stderr.write(f"[LocalLLM] Request failed: {exc}\n")
            sys.stderr.flush()
            self._json(500, {"error": str(exc)})


def watch_parent_stdin():
    try:
        sys.stdin.buffer.read(1)
    finally:
        os._exit(0)


class ExclusiveThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


if os.environ.get("LOCAL_LLM_PARENT_WATCH") == "1":
    threading.Thread(target=watch_parent_stdin, daemon=True).start()

try:
    server = ExclusiveThreadingHTTPServer((HOST, PORT), LocalLlmHandler)
except OSError as exc:
    sys.stderr.write(f"[LocalLLM] Cannot bind {HOST}:{PORT}: {exc}\n")
    sys.exit(2)
sys.stderr.write(
    f"[LocalLLM] Loading {MODEL_PATH.name} (ctx={N_CTX}, threads={N_THREADS}, gpu_layers={N_GPU_LAYERS})\n"
)
sys.stderr.flush()
llm = Llama(
    model_path=str(MODEL_PATH),
    n_ctx=N_CTX,
    n_threads=N_THREADS,
    n_batch=256,
    n_gpu_layers=N_GPU_LAYERS,
    verbose=False,
)
sys.stderr.write(f"[LocalLLM] Ready at http://{HOST}:{PORT}/v1 using {MODEL_NAME}\n")
sys.stderr.flush()
server.serve_forever()
