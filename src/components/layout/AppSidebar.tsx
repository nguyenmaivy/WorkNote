import React from "react";
import { motion } from "motion/react";
import { X, CircleUserRound, Plus } from "lucide-react";
import { TABS } from "../../constants";
import type { TabId } from "../../types";
import type { UserProfile } from "../UserProfileSettings";
import type { UploadedFile } from "../../types";

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: TabId;
  onTabChange: (tabId: TabId) => void;
  userProfile: UserProfile;
  files: UploadedFile[];
}

export function AppSidebar({
  isOpen,
  onClose,
  currentTab,
  onTabChange,
  userProfile,
  files,
}: AppSidebarProps) {
  return (
    <aside
      className={`bg-[var(--color-surface)] text-[var(--color-text-primary)] w-64 fixed left-0 top-16 bottom-0 flex flex-col shadow-sm border-r border-[var(--color-border-subtle)] z-40 transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className="p-4 flex flex-col gap-2 h-full overflow-y-auto">
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-neutral-soft)] text-[var(--color-text-secondary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Hub header — avatar + user name */}
        <div className="flex items-center gap-3 mb-6 p-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-fixed)] flex items-center justify-center text-[var(--color-primary)] shrink-0 overflow-hidden">
            {userProfile.avatarBase64 ? (
              <img src={userProfile.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <CircleUserRound size={28} strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-[var(--color-text-primary)] leading-tight truncate font-display">
              {userProfile.displayName || "Learning Hub"}
            </div>
            <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
              {userProfile.school || `Academic Level ${Math.min(files.length, 9) + 1}`}
            </div>
          </div>
        </div>

        {/* New Study Session CTA */}
        <button
          onClick={() => {
            onTabChange("upload");
            onClose();
          }}
          className="bg-[var(--color-primary)] text-white text-[14px] font-medium py-2.5 px-4 rounded-full w-full mb-3 hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-1.5 shadow-[var(--shadow-primary-glow)]"
        >
          <Plus size={16} />
          New Study Session
        </button>

        {/* Tab navigation */}
        <nav className="flex-1 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  onClose();
                }}
                className={`relative rounded-[8px] flex items-center gap-3 px-3 py-2.5 text-[14px] transition-all duration-200 text-left active:scale-[0.98] ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white font-semibold shadow-[var(--shadow-primary-glow)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-text-primary)] font-medium"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-bg"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-[8px] bg-[var(--color-primary)] -z-10"
                  />
                )}
                <Icon size={18} className={isActive ? "text-white" : "text-[var(--color-text-secondary)]"} />
                <span className="flex-1">{tab.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
