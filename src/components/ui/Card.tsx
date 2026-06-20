import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: React.ReactNode;
}

export function Card({ interactive = false, className = '', children, ...props }: CardProps) {
  const baseClasses = "bg-neutral-primary-soft border-2 rounded-xl text-body";
  
  const staticClasses = "border-default shadow-xs";
  
  // Interactive cards need a specific active state: shift down 2px, shadow shrink
  const interactiveClasses = "border-default shadow-xs hover:bg-brand-softer hover:border-brand-subtle transition-all duration-100 ease-out cursor-pointer active:translate-y-[2px] active:shadow-[0_0px_0_var(--color-border-default)] select-none";

  return (
    <div 
      className={`${baseClasses} ${interactive ? interactiveClasses : staticClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
