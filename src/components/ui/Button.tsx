import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'brand'
  | 'tertiary';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'base' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  icon, 
  children, 
  disabled, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out select-none outline-none rounded-[6px] hover:-translate-y-[1px]";
  
  // Genesis Sizes
  const sizeClasses = {
    xs:   "text-[12px] px-2.5 h-[28px]",
    sm:   "text-[13px] px-3 h-[32px]",
    md:   "text-[14px] px-4 h-[38px]",
    base: "text-[14px] px-4 h-[38px]",
    lg:   "text-[15px] px-5 h-[44px]",
  };

  // Genesis Variants
  const variantClasses = {
    primary:     "bg-[var(--color-primary)] text-white border border-transparent hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--shadow-primary-glow)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    brand:       "bg-[var(--color-primary)] text-white border border-transparent hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--shadow-primary-glow)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    secondary:   "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    ghost:       "bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral-soft)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    tertiary:    "bg-transparent text-[var(--color-text-secondary)] border border-transparent hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral-soft)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    destructive: "bg-transparent text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[var(--color-error-soft)] focus-visible:shadow-[var(--shadow-focus-ring)]",
    danger:      "bg-transparent text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[var(--color-error-soft)] focus-visible:shadow-[var(--shadow-focus-ring)]",
  };

  const disabledClasses = "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none";
  
  return (
    <button
      disabled={disabled}
      className={`
        ${baseClasses} 
        ${sizeClasses[size]} 
        ${variantClasses[variant]}
        ${disabled ? disabledClasses : ''}
        ${className}
      `}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
      </div>
    </button>
  );
}
