# Phase 4: POC Verification & Baseline Audit

> **Snapshot ngày 30/09/2026.** Git state, số file và kết quả bên dưới không mô tả checkout hiện tại. Xem [kiểm chứng mới](verification.md) và [roadmap](future_roadmap.md).

**Trạng thái:** Đã hoàn tất Audit
**Ngày lập:** 2026-09-30

## 1. Trạng thái Git (Git State)
- **Branch**: `main` (Ahead of origin/main by 1 commit)
- **Modified**: 31 files (config, services, hooks, components)
- **Untracked**: 23 files (bao gồm các script Python Đội 2/Đội 3, các service Giai đoạn 1 và tài liệu doc)
- **File Backup**: 9 file `*.bak` nằm trong `src/` và `src/components/`. Đang được giữ nguyên không xóa theo đúng tinh thần Giai đoạn 4.

## 2. Baseline Hiệu năng (Performance Baseline)
- **Frontend Bundle Size (Production Build)**:
  - `dist/assets/index-[hash].js`: **~1.45 MB** (Lớn, vượt ngưỡng cảnh báo 500kB của Vite).
  - `dist/assets/index-[hash].css`: **~130 kB**.
  => **Nhận định**: Sẽ được tối ưu bằng Code-splitting/Lazy Load ở Giai đoạn 5 khi tách nhỏ `App.tsx`.
- **Backend Bundle Size**: `dist/server.cjs` ~152 kB (Rất tối ưu).

## 3. Baseline Kiểm thử (Test Audit)
- 24/24 Unit tests & Smoke tests **PASS**.
- Local AI (Tutor/Librarian) bằng Python GGUF & Embeddings đã test thành công sau khi xử lý triệt để lỗi môi trường Numpy/Torch.
- Không có lỗi type check (tsc).

## 4. Quyết định Đóng băng & Chuyển giao (Feature Freeze)
- Mọi tính năng cốt lõi (Giai đoạn 1,2,3) đã ổn định.
- Sẽ thực hiện `git commit` để snapshot lại trạng thái hiện tại làm mốc an toàn.
- Giai đoạn 5 (Refactoring FE/BE) sẽ bắt đầu ngay sau đó.
