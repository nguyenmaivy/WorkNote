from transformers import pipeline

print("Đang đánh thức AI chuyên phân tích cảm xúc (chỉ tải về 1 lần duy nhất)...")
# Gọi ống dẫn "sentiment-analysis" (phân tích cảm xúc) 
# Sử dụng model mặc định (DistilBERT)
nha_phan_tich = pipeline("sentiment-analysis")

# Dữ liệu thử nghiệm
cau_noi_1 = "I absolutely love this AI project! It is amazing."
cau_noi_2 = "This bug makes me so angry and frustrated."

print("\n--- KẾT QUẢ ---")
# Đưa văn bản qua ống dẫn và xem kết quả
print(f"Câu 1: {nha_phan_tich(cau_noi_1)}")
print(f"Câu 2: {nha_phan_tich(cau_noi_2)}")