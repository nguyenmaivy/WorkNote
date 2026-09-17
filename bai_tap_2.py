from transformers import pipeline

print("Đang triệu hồi Gia sư AI...")
print("(Lần chạy đầu tiên sẽ tải khoảng ~1GB dữ liệu từ Hugging Face, em kiên nhẫn chờ chút nhé)")

# 1. Gọi ống dẫn sinh văn bản với model Qwen
gia_su = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")

# 2. Đặt câu hỏi
cau_hoi = "Trí tuệ nhân tạo (AI) là gì? Hãy giải thích ngắn gọn bằng tiếng Việt dễ hiểu nhất."
print(f"\nCâu hỏi của em: {cau_hoi}")

# 3. Yêu cầu AI trả lời (cho phép AI nói tối đa 100 token/từ mới)
ket_qua = gia_su(cau_hoi, max_new_tokens=100)

print("\n--- GIA SƯ AI TRẢ LỜI ---")
print(ket_qua[0]['generated_text'])