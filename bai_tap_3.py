from transformers import pipeline

print("Đang khởi động Gia sư (lần này sẽ chạy nhanh như chớp vì đã có bộ nhớ đệm)...")
gia_su = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")

# 1. BÍ QUYẾT AI ENGINEER: Dùng Chat Template để phân vai
cuoc_tro_chuyen = [
    # System: Tiêm vào não con AI một "nhân cách" và bộ quy tắc
    {"role": "system", 
     "content": "Bạn là một AI thông minh. Yêu cầu bắt buộc: Trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề. Không lặp lại câu hỏi."},
    # User: Câu hỏi của con người
    {"role": "user", 
     "content": "AI là gì?"}
]

# 2. Cho AI sinh câu trả lời (Nới lỏng quota lên 200 từ)
ket_qua = gia_su(cuoc_tro_chuyen, max_new_tokens=200)

print("\n--- GIA SƯ AI TRẢ LỜI ---")
# 3. Mẹo lấy đúng câu trả lời cuối cùng, cắt bỏ hoàn toàn câu hỏi rác
cau_tra_loi_cuoi = ket_qua[0]['generated_text'][-1]['content']
print(cau_tra_loi_cuoi)