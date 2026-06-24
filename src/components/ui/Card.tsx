import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: React.ReactNode;
}

export function Card({ interactive = false, className = '', children, ...props }: CardProps) {
  const baseClasses = "bg-[var(--color-surface)] border border-[#D1D5DB] rounded-[var(--radius-card)] overflow-hidden transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]";

  const staticClasses = "";

  // Interactive cards: shift up 2px, add shadow
  const interactiveClasses = "hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-hover)] cursor-pointer select-none";

  return (
    <div
      className={`${baseClasses} ${interactive ? interactiveClasses : staticClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
