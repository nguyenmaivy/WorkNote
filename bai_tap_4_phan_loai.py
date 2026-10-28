"""
BÀI TẬP 4: PHÂN LOẠI PHẢN HỒI KHÁCH HÀNG (Zero-Shot & LLM Prompting)
Mục tiêu: Giải quyết trực tiếp câu hỏi 11 khi phỏng vấn tại iNET
- Nhóm phân loại: "Khen ngợi", "Phàn nàn", "Yêu cầu hỗ trợ"
- Dùng model: Qwen/Qwen2.5-0.5B-Instruct (Chạy local, không tốn tiền API)
"""

from transformers import pipeline
import time

print("=" * 60)
print("KHỞI ĐỘNG HỆ THỐNG PHÂN LOẠI PHẢN HỒI KHÁCH HÀNG iNET")
print("=" * 60)

# Khởi tạo pipeline text-generation với Qwen2.5-0.5B
start_load = time.time()
classifier_llm = pipeline(
    "text-generation",
    model="Qwen/Qwen2.5-0.5B-Instruct",
    device_map="auto"
)
print(f"-> Nạp model hoàn tất sau: {time.time() - start_load:.2f}s\n")

# Danh sách feedback thực tế từ khách hàng dùng dịch vụ Cloud/Hosting của iNET
danh_sach_feedback = [
    "Dịch vụ hosting bên mình chạy rất mượt, web tải nhanh và đội ngũ hỗ trợ kỹ thuật nhiệt tình, cảm ơn iNET!",
    "Server VPS của tôi bị sập từ tối qua đến giờ chưa thấy ai fix, làm ảnh hưởng nghiêm trọng đến kinh doanh!",
    "Tôi vừa gia hạn tên miền nhưng chưa thấy kích hoạt DNS, xin hướng dẫn tôi cách trỏ về IP mới với.",
    "Giao diện quản lý hơi khó dùng đối với người mới, nhưng nhân viên tư vấn rất kiên nhẫn giải thích.",
    "Hệ thống bị lỗi 502 liên tục khi có lượng truy cập cao, đề nghị nâng cấp băng thông giúp tôi."
]

system_prompt = """Bạn là trợ lý AI chuyên phân tích và phân loại phản hồi khách hàng cho công ty dịch vụ hạ tầng mạng và hosting iNET.
Nhiệm vụ: Phân loại phản hồi của khách hàng vào DUY NHẤT 1 trong 3 nhóm sau:
1. "Khen ngợi": Khách hài lòng, khen ngợi dịch vụ, cảm ơn.
2. "Phàn nàn": Khách bức xúc, phàn nàn về lỗi kỹ thuật, dịch vụ kém, downtime.
3. "Yêu cầu hỗ trợ": Khách cần giải đáp thắc mắc, hướng dẫn cài đặt, yêu cầu kỹ thuật can thiệp.

Quy tắc bắt buộc:
- Chỉ trả lời ngắn gọn đúng 2 dòng:
Nhãn: [Khen ngợi / Phàn nàn / Yêu cầu hỗ trợ]
Lý do: [Giải thích ngắn gọn trong 1 câu vì sao chọn nhãn này]
"""

for i, fb in enumerate(danh_sach_feedback, 1):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Phản hồi khách hàng: \"{fb}\""}
    ]
    
    t0 = time.time()
    result = classifier_llm(
        messages, 
        max_new_tokens=60,
        temperature=0.1,  # Nhiệt độ thấp để phân loại chuẩn xác, không bị sáng tạo lung tung
        do_sample=False
    )
    latency = time.time() - t0
    
    output_text = result[0]['generated_text'][-1]['content'].strip()
    
    print(f"--- [Mẫu {i}] ---")
    print(f"Khách hàng nói: \"{fb}\"")
    print(f"AI Phân loại ({latency:.2f}s):\n{output_text}")
    print("-" * 60)
