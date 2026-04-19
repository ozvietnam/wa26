'use client';

import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium';

    const variantClasses = {
      primary: 'bg-[rgba(217,119,87,0.15)] text-[#d97757]',
      success: 'bg-[rgba(34,197,94,0.08)] text-[#059669]',
      warning: 'bg-[rgba(245,158,11,0.08)] text-[#92400e]',
      error: 'bg-[rgba(239,68,68,0.08)] text-[#7f1d1d]',
      info: 'bg-[rgba(59,130,246,0.04)] text-[#1e40af]',
    };

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
