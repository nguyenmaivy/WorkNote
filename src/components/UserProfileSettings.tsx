import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  User,
  Save,
  Trash2,
  CheckCircle2,
  Mail,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/Button";

export interface UserProfile {
  displayName: string;
  avatarBase64: string | null;
  email: string;
  school: string;
  bio: string;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
  avatarBase64: null,
  email: "",
  school: "",
  bio: "",
};

const STORAGE_KEY = "vietlearn_user_profile";

export function getUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

interface UserProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export default function UserProfileSettings({ isOpen, onClose, onProfileUpdate }: UserProfileSettingsProps) {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load fresh on open
  useEffect(() => {
    if (isOpen) {
      setProfile(getUserProfile());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfile((prev) => ({ ...prev, avatarBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveUserProfile(profile);
    setSaved(true);
    onProfileUpdate?.(profile);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveAvatar = () => {
    setProfile((prev) => ({ ...prev, avatarBase64: null }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--color-surface)] rounded-[20px] shadow-2xl border border-[var(--color-border-subtle)] w-full max-w-lg overflow-hidden pointer-events-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-5 flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-10 w-20 h-20 bg-white rounded-full blur-2xl" />
              <div className="absolute bottom-0 right-20 w-32 h-32 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-[20px] font-bold text-white flex items-center gap-2 font-display">
                <User size={22} />
                Thông Tin Người Dùng
              </h2>
              <p className="text-[13px] text-white/70 mt-0.5">
                Cập nhật hồ sơ cá nhân của bạn
              </p>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 p-2 rounded-full hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
            {/* Avatar section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-[var(--color-primary)]/20 overflow-hidden bg-[var(--color-neutral-soft)] flex items-center justify-center shadow-lg">
                  {profile.avatarBase64 ? (
                    <img
                      src={profile.avatarBase64}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-[var(--color-text-secondary)]" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md hover:bg-[var(--color-primary-hover)] transition-colors border-2 border-white"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {profile.avatarBase64 && (
                <button
                  onClick={handleRemoveAvatar}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} /> Xóa ảnh đại diện
                </button>
              )}

              <p className="text-[11px] text-[var(--color-text-secondary)] text-center">
                Nhấn vào biểu tượng camera để chọn ảnh (PNG, JPG, dưới 2MB)
              </p>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-4">
              {/* Display Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <User size={13} className="text-[var(--color-primary)]" />
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên của bạn..."
                  value={profile.displayName}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  className="px-3 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] rounded-lg text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] font-medium placeholder:text-[var(--color-text-secondary)]/50"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Mail size={13} className="text-[var(--color-primary)]" />
                  Email (Tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="px-3 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] rounded-lg text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] font-medium placeholder:text-[var(--color-text-secondary)]/50"
                />
              </div>

              {/* School */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <GraduationCap size={13} className="text-[var(--color-primary)]" />
                  Trường / Tổ chức
                </label>
                <input
                  type="text"
                  placeholder="VD: Đại học Bách Khoa..."
                  value={profile.school}
                  onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
                  className="px-3 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] rounded-lg text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] font-medium placeholder:text-[var(--color-text-secondary)]/50"
                />
              </div>

              {/* Bio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[var(--color-text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles size={13} className="text-[var(--color-primary)]" />
                  Giới thiệu bản thân
                </label>
                <textarea
                  placeholder="Viết đôi dòng giới thiệu..."
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  className="px-3 py-2.5 bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] rounded-lg text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] font-medium placeholder:text-[var(--color-text-secondary)]/50 resize-none"
                />
              </div>
            </div>

            {/* Info notice */}
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 rounded-lg p-3 flex items-start gap-2 text-[12px] text-[var(--color-primary-hover)]">
              <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Tất cả dữ liệu hồ sơ được lưu trữ cục bộ trên trình duyệt của bạn. Không có dữ liệu nào được gửi lên server.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-neutral-soft)]/50 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Đóng
            </button>
            <Button
              onClick={handleSave}
              icon={saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              variant={saved ? "secondary" : "primary"}
            >
              {saved ? "Đã lưu ✓" : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
