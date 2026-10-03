import React from "react";
import { Menu, Search, CloudLightning, Bell, CircleUserRound } from "lucide-react";
import type { UserProfile } from "../UserProfileSettings";

interface AppHeaderProps {
  hasApiKey: boolean;
  userProfile: UserProfile;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({
  hasApiKey,
  userProfile,
  onOpenSidebar,
  onOpenSettings,
}: AppHeaderProps) {
  return (
    <header className="bg-[var(--color-surface)]/85 backdrop-blur-md fixed top-0 left-0 right-0 z-50 shadow-sm border-b border-[var(--color-border-subtle)]">
      <div className="flex justify-between items-center px-6 mx-auto h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-[24px] md:text-[28px] font-bold text-[var(--color-primary)] tracking-[-0.02em] font-display leading-none">
            VietLearn AI Lab
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              className="pl-10 pr-4 py-2 bg-[var(--color-surface-container-low)] rounded-full border-none text-[14px] focus:ring-2 focus:ring-[var(--color-primary)] w-64 outline-none placeholder:text-[var(--color-text-secondary)]"
              placeholder="Search..."
              type="text"
            />
          </div>
          <button
            title={hasApiKey ? "Gemini Active" : "Local Mock — chưa cấu hình API key"}
            className={`p-2 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors ${
              hasApiKey ? "text-[var(--color-secondary)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            <CloudLightning size={20} />
          </button>
          <button className="p-2 rounded-full hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <Bell size={20} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded-full hover:bg-[var(--color-surface-container-low)] transition-colors overflow-hidden"
            title={userProfile.displayName || "Thông tin cá nhân"}
          >
            {userProfile.avatarBase64 ? (
              <img src={userProfile.avatarBase64} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <CircleUserRound size={22} className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
