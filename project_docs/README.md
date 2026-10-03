# Tài liệu WorkNote

Cập nhật: **03/10/2026**. WorkNote là tên dự án; VietLearn AI Lab là tên hiện trên giao diện.

## Bắt đầu từ đâu?

| Nhu cầu | Tài liệu |
| --- | --- |
| Hiểu dự án và chạy tại máy local | [README chính](../README.md) |
| Làm thử theo ảnh chụp thực tế | [Hướng dẫn sử dụng](user_guide.md) |
| Hiểu phạm vi sản phẩm | [PRD hiện tại](prd.md) |
| Xem cách tổ chức hệ thống và các đánh đổi | [Kiến trúc](architecture.md) |
| Biết đã kiểm tra gì, còn thiếu gì | [Báo cáo kiểm chứng](verification.md) |
| Chọn việc tiếp theo trước khi ứng tuyển | [Roadmap ưu tiên](future_roadmap.md) và [checklist](task.md) |
| Tự chạy lại demo/chụp ảnh | [Script Playwright](capture-demo.mjs), [file mẫu](examples/react-study-note.txt) |
| CI và quy trình đóng góp | [Giai đoạn 6](phase6_ci.md), [CONTRIBUTING](../CONTRIBUTING.md) |

Nếu chỉ có 5 phút để đánh giá: đọc giới thiệu trong README → chạy NotebookLM với file mẫu → xem kiến trúc → xem giới hạn và roadmap.

## Cách đọc trạng thái

- **Có trong mã nguồn:** đã thấy implementation, chưa đồng nghĩa được test đầy đủ.
- **Đã kiểm chứng:** có lệnh, thao tác hoặc phản hồi thực tế trong [verification.md](verification.md).
- **Chưa kiểm chứng:** chưa chạy trong phiên hiện tại; không suy ra Pass từ ảnh giao diện.
- **Đề xuất:** hướng phát triển, chưa phải tính năng đã hoàn thành.

## Tài liệu lịch sử và kế hoạch chi tiết

Các tài liệu sau được giữ để theo dõi quá trình phát triển. Những số đo, giới hạn, tên model hoặc checkbox cũ là thông tin tại thời điểm ghi nhận; dùng báo cáo kiểm chứng mới cho trạng thái hiện tại.

| Tài liệu | Vai trò |
| --- | --- |
| [Kế hoạch 6 giai đoạn](implementation_plan_6_phases.md) | Bản kế hoạch review, không phải danh sách tính năng đã hoàn thành |
| [Business / economics](phase1_business_economics.md) | Giả định sản phẩm, phạm vi và mô hình chi phí |
| [Flows và contracts](phase2_flows_and_contracts.md) | Thiết kế luồng và hợp đồng dữ liệu |
| [Gherkin / DoD](phase3_gherkin_dod.md) | Tiêu chí nghiệm thu đề xuất |
| [Baseline trước đây](phase4_baseline.md) | Mốc kiểm tra cũ |
| [Tiến độ refactor](phase5_progress.md) | Lịch sử tách module và local LLM |
| [Test cases](test_cases.md) | Danh mục kịch bản, không phải tất cả đều đã chạy |
| [Walkthrough Phase 1](walkthrough.md) | Ghi chép triển khai cũ; không thay thế hướng dẫn người dùng mới |
| [Kế hoạch Hugging Face](huggingface_integration_architecture_plan.md) | Ý tưởng kiến trúc AI; không phải cam kết toàn bộ ứng dụng offline |
| [Lịch sử thay đổi](modification_history.md) | Nhật ký kỹ thuật và các lần học/thử nghiệm |
| [Đặc tả NotebookLM](../kitty-specs/worknote-notebooklm/README.md) | Đặc tả theo work package |

Ưu tiên khi tài liệu khác nhau: **mã nguồn + kiểm chứng hiện tại → README / hướng dẫn / kiến trúc → yêu cầu và roadmap → ghi chép lịch sử**. Các con số mục tiêu cần được đo trước khi đưa vào giới thiệu portfolio như một kết quả đạt được.
