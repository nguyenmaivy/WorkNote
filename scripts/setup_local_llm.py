import os
import subprocess
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / ".venv"
MODEL_DIR = ROOT / "models"
MODEL_PATH = MODEL_DIR / "qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_URL = (
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/"
    "qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true"
)
WHEEL_INDEX = os.environ.get(
    "WORKNOTE_LLM_WHEEL_INDEX",
    "https://abetlen.github.io/llama-cpp-python/whl/cpu",
)


def venv_python():
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def download_model():
    if MODEL_PATH.is_file() and MODEL_PATH.stat().st_size > 1_000_000_000:
        print(f"Model already present: {MODEL_PATH}")
        return

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    partial = MODEL_PATH.with_suffix(".gguf.part")

    def progress(blocks, block_size, total_size):
        if total_size <= 0:
            return
        percent = min(100, blocks * block_size * 100 // total_size)
        print(f"\rDownloading model: {percent:3d}%", end="", flush=True)

    print(f"Downloading Qwen2.5-1.5B Q4_K_M to {MODEL_PATH}")
    urllib.request.urlretrieve(MODEL_URL, partial, progress)
    print()
    partial.replace(MODEL_PATH)


def main():
    if not venv_python().is_file():
        print("Creating .venv...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True)

    print("Installing local LLM runtime...")
    subprocess.run(
        [
            str(venv_python()),
            "-m",
            "pip",
            "install",
            "-r",
            str(ROOT / "requirements-local-llm.txt"),
            "--extra-index-url",
            WHEEL_INDEX,
        ],
        check=True,
    )
    download_model()
    print("Local LLM setup complete. Run: npm run dev")


if __name__ == "__main__":
    main()
