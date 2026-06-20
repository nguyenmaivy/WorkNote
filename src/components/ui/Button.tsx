import React from 'react';

export type ButtonVariant = 
  | 'brand' 
  | 'secondary' 
  | 'tertiary' 
  | 'success' 
  | 'danger' 
  | 'warning' 
  | 'dark' 
  | 'ghost';

export type ButtonSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'brand', 
  size = 'base', 
  icon, 
  children, 
  disabled, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "inline-flex items-center justify-center border-2 font-bold uppercase tracking-[0.8px] transition-all duration-100 ease-out select-none outline-none";
  
  // Size classes
  const sizeClasses = {
    xs: "text-[12px] px-[14px] py-[8px] rounded-[12px]",
    sm: "text-[13px] px-[16px] py-[10px] rounded-[12px]",
    base: "text-[15px] px-[20px] py-[14px] rounded-[12px]",
    lg: "text-[16px] px-[28px] py-[16px] rounded-[12px]",
    xl: "text-[17px] px-[32px] py-[18px] rounded-[12px]",
  };

  // Variant classes (bg, text, border, hover)
  // Note: Focus rings could be added with focus-visible
  const variantClasses = {
    brand: "bg-brand border-transparent text-white hover:bg-brand-medium focus-visible:ring-4 focus-visible:ring-brand-soft",
    secondary: "bg-neutral-primary-soft border-default text-body hover:bg-neutral-secondary-medium hover:text-heading focus-visible:ring-4 focus-visible:ring-neutral-tertiary",
    tertiary: "bg-neutral-primary-soft border-default text-fg-brand hover:bg-brand-softer focus-visible:ring-4 focus-visible:ring-brand-soft",
    success: "bg-success border-transparent text-white hover:bg-success-medium focus-visible:ring-4 focus-visible:ring-success-soft",
    danger: "bg-danger border-transparent text-white hover:bg-danger-medium focus-visible:ring-4 focus-visible:ring-danger-soft",
    warning: "bg-warning border-transparent text-dark hover:bg-warning-medium focus-visible:ring-4 focus-visible:ring-warning-soft",
    dark: "bg-dark border-transparent text-white hover:bg-dark-strong focus-visible:ring-4 focus-visible:ring-neutral-tertiary",
    ghost: "bg-transparent border-transparent text-heading hover:bg-neutral-secondary-medium focus-visible:ring-4 focus-visible:ring-neutral-tertiary",
  };

  // Drop-shadow style strings (Tailwind v4 allows arbitrary var usage, but we can set style directly for simplicity of dynamic values)
  const getShadowStyle = (v: ButtonVariant, d: boolean) => {
    if (d || v === 'ghost') return {};
    return {
      boxShadow: `0 4px 0 var(--shadow-${v === 'secondary' || v === 'tertiary' ? 'secondary' : v})`
    };
  };

  const disabledClasses = "bg-disabled border-default text-fg-disabled cursor-not-allowed opacity-100 hover:bg-disabled active:translate-y-0 active:shadow-none";
  
  // The pressed state drops the button 2px down and reduces shadow by 2px (handled in CSS or active variant)
  const activeClasses = (disabled || variant === 'ghost') 
    ? "" 
    : "active:translate-y-[2px] active:shadow-[0_2px_0_var(--shadow-color)]"; // Wait, dynamic shadow color on active is tricky in pure tailwind class without custom css, so we might need a style hack or just let the style object be updated.
  
  const isGhostOrDisabled = disabled || variant === 'ghost';

  return (
    <button
      disabled={disabled}
      className={`
        ${baseClasses} 
        ${sizeClasses[size]} 
        ${disabled ? disabledClasses : variantClasses[variant]} 
        ${isGhostOrDisabled ? '' : 'button-pressable'} 
        ${className}
      `}
      style={{
        ...getShadowStyle(variant, !!disabled),
        // Custom property to allow hover/active to easily reference the shadow color
        ['--shadow-color' as any]: `var(--shadow-${variant === 'secondary' || variant === 'tertiary' ? 'secondary' : variant})`
      }}
      {...props}
    >
      <div className="flex items-center gap-[8px]">
        {icon && <span className="flex items-center justify-center w-[18px] h-[18px] [&>svg]:w-full [&>svg]:h-full">{icon}</span>}
        {children && <span>{children}</span>}
      </div>
    </button>
  );
}
