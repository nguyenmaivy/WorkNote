import sys
import json
import os
import re
from pathlib import Path

# Tat cac thong bao ranh roi
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

try:
    from llama_cpp import Llama
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Missing python package: {str(e)}"}))
    sys.exit(1)

_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        model_path = Path(
            os.environ.get(
                "LOCAL_LLM_MODEL_PATH",
                Path.cwd() / "models" / "qwen2.5-1.5b-instruct-q4_k_m.gguf",
            )
        ).resolve()
        if not model_path.is_file():
            raise FileNotFoundError(f"Local model not found: {model_path}")
        _llm_instance = Llama(
            model_path=str(model_path),
            n_ctx=int(os.environ.get("LOCAL_LLM_CONTEXT_SIZE", "8192")),
            n_threads=int(os.environ.get("LOCAL_LLM_THREADS", "8")),
            n_gpu_layers=int(os.environ.get("LOCAL_LLM_GPU_LAYERS", "0")),
            verbose=False
        )
    return _llm_instance

def handle_chat(llm, payload):
    messages = payload.get("messages", [])
    if not messages:
        prompt = payload.get("prompt", "")
        system = payload.get("system", "Bạn là Gia sư AI thông minh của WorkNote. Hãy trả lời ngắn gọn, chuẩn xác.")
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ]
    
    max_tokens = int(payload.get("max_tokens", 256))
    temperature = float(payload.get("temperature", 0.7))
    
    response = llm.create_chat_completion(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature
    )
    content = response["choices"][0]["message"]["content"].strip()
    return {"success": True, "reply": content}

def handle_summarize(llm, payload):
    text = payload.get("text", "").strip()
    bullet_count = int(payload.get("bullets", 3))
    system_prompt = f"Bạn là chuyên gia tóm tắt kiến thức. Hãy tóm tắt văn bản người dùng thành chính xác {bullet_count} gạch đầu dòng ngắn gọn, súc tích, làm nổi bật ý chính."
    
    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        max_tokens=256,
        temperature=0.3
    )
    summary = response["choices"][0]["message"]["content"].strip()
    return {"success": True, "summary": summary}

def handle_quiz_rpg(llm, payload):
    topic_content = payload.get("content", "").strip()
    system_prompt = """Bạn là Game Master AI của phòng học WorkNote RPG.
Nhiệm vụ: Dựa trên nội dung học tập được cung cấp, hãy tạo ra đúng 1 thử thách trắc nghiệm RPG với bối cảnh phiêu lưu kích thích người học.
BẮT BUỘC trả về duy nhất định dạng JSON chuẩn (không viết thêm lời chào hay markdown ngoài JSON) theo mẫu:
{
  "scenario": "Tình huống phiêu lưu RPG ngắn đặt người chơi vào hoàn cảnh cần giải quyết bài toán",
  "question": "Câu hỏi kiến thức cốt lõi cần giải quyết",
  "options": {
    "A": "Lựa chọn 1",
    "B": "Lựa chọn 2",
    "C": "Lựa chọn 3",
    "D": "Lựa chọn 4"
  },
  "correct_answer": "A",
  "exp_reward": 50,
  "explanation": "Giải thích vì sao phương án đó là chìa khóa giải quyết câu đố"
}"""
    
    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Nội dung ôn tập: {topic_content}"}
        ],
        max_tokens=400,
        temperature=0.4
    )
    raw_content = response["choices"][0]["message"]["content"].strip()
    
    # Trich xuat JSON bang regex phong truong hop LLM kep markdown
    clean_raw = re.sub(r'^```json\s*', '', raw_content, flags=re.IGNORECASE)
    clean_raw = re.sub(r'```$', '', clean_raw).strip()
    
    json_match = re.search(r'\{.*\}', clean_raw, re.DOTALL)
    if json_match:
        try:
            target_str = json_match.group(0)
            parsed = json.loads(target_str)
            return {"success": True, "quiz": parsed}
        except Exception:
            try:
                # Thu thay the single quotes thanh double quotes neu co
                fixed_str = re.sub(r"(?<!\\)'", '"', target_str)
                parsed = json.loads(fixed_str)
                return {"success": True, "quiz": parsed}
            except Exception:
                pass
            
    return {"success": True, "quiz_raw": raw_content}

def main():
    try:
        raw_input = sys.stdin.read().lstrip('\ufeff')
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            return
            
        data = json.loads(raw_input)
        action = data.get("action", "chat")
        
        llm = get_llm()
        
        if action == "chat":
            res = handle_chat(llm, data)
        elif action == "summarize":
            res = handle_summarize(llm, data)
        elif action == "quiz_rpg":
            res = handle_quiz_rpg(llm, data)
        else:
            res = {"success": False, "error": f"Unknown action: {action}"}
            
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
