# RTranslator — tham khảo cho WorkNote

Khảo sát read-only ngày **22/10/2026**, từ đề xuất người dùng. Không clone, cài package, chạy ứng dụng upstream hoặc sao chép source. Đây không phải benchmark WorkNote hay audit toàn bộ RTranslator.

## Nguồn đã đọc

- [Repository/README nhánh v3.00](https://github.com/niedev/RTranslator/tree/v3.00).
- [Recorder.java tại snapshot ae2bc042bf9d8f7a2a50e4c7966f0c8093a1aff8](https://github.com/niedev/RTranslator/blob/ae2bc042bf9d8f7a2a50e4c7966f0c8093a1aff8/app/src/main/java/nie/translator/rtranslator/voice_translation/neural_networks/voice/Recorder.java).

README mô tả ứng dụng Android và v3 beta; không phải implementation WASAPI/Windows có thể cắm trực tiếp vào WorkNote. Phần kỹ thuật cũ mô tả Whisper Small/ONNX; không suy ra mọi bản v3 dùng cùng model. V3 nêu các lựa chọn dịch Bergamot, MADLAD-400 3B, HY-MT 1.5 1.8B; chưa kiểm tra chất lượng Việt–Anh, RAM hay license từng model trên baseline WorkNote. Giữ Sherpa Việt đã chọn.

## Kỹ thuật hữu ích được xác nhận ở Recorder.java

- Audio mono 16 kHz; detection phối hợp amplitude gate và `vad.isSpeech()` trên block 512 mẫu, không chỉ threshold năng lượng.
- Pre-roll giữ âm đầu; `onVoiceStart`, `onVoice`, `onVoiceEnd` phân biệt mở lượt/phát đoạn/kết thúc lượt.
- Kết thúc dựa trên silence timeout và giới hạn độ dài lượt khoảng 29 giây; vòng buffer hữu hạn khoảng 30 giây.
- Các giá trị default amplitude 1500, silence timeout 1300 ms, pre-roll 1300 ms **không phải thông số được chứng minh phù hợp cho mic/WASAPI của WorkNote**.
- Playback suppression là virtual mute/zero buffer trong điều kiện nhất định, không phải acoustic echo cancellation. Không bê cơ chế mute về rồi giấu mất audio; WorkNote phải đánh dấu gap nếu tạm ngừng ghi.

## Áp dụng nhỏ nhất

1. **M1 đang làm:** hoàn thiện capture lifecycle, SQLite final-before-publish, ordered replay/idempotency, bounded queue và gap/error. Chưa thêm interface đa-engine hoặc model dịch.
2. **Đề xuất M1.5, chưa triển khai:** VAD/endpointing cho Sherpa offline, pre-roll có giới hạn, silence timeout + max utterance, flush stop; benchmark câu ngắn/phủ định/tên–số–deadline và latency end-of-speech→final UI. Không gọi đây là native streaming, không tạo interim giả.
3. **Sau khi chọn ưu tiên sản phẩm:** nếu ưu tiên Live Conversation, làm spike dịch Việt↔Anh local riêng, đo quality/license/RAM/latency trước khi thêm reply assistant. Nếu ưu tiên Meeting Notes, giữ M2 smart note có nguồn như roadmap hiện tại. Không tự đánh số lại M2–M4.
4. **AI Suggested Reply:** chỉ sau transcript và dịch đủ ổn; chỉ dựa dữ kiện/ngữ cảnh người dùng cung cấp, không bịa trải nghiệm/cam kết. Không nằm trong M1.

Đo riêng processing time, chờ gom audio, audio age/backlog và delivery UI. Các nhánh không đồng bộ như translation/reply phải có watermark và hàng đợi hữu hạn; RTF nhanh không chứng minh subtitle có độ trễ thấp.

## Giới hạn và license

Code repository khai báo Apache-2.0 không cấp quyền tự động cho model. NLLB ở phần tài liệu cũ có hạn chế phi thương mại; chưa đánh giá license các model v3. Không có URL/version Konvo cụ thể trong đề xuất, nên chưa xác minh khả năng hay thiết kế nội bộ của Konvo. Không chuyển desktop shell, thêm nhiều runtime, full-duplex hoặc TTS trong lúc ghi trong đợt này.
