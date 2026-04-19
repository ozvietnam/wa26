'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', disabled, children, ...props }, ref) => {
    const baseClasses = 'btn transition-fast font-medium rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap';

    const variantClasses = {
      primary: 'bg-[#d97757] text-white hover:bg-[#c4694d] disabled:opacity-60',
      secondary: 'bg-[#f0ece4] text-[#d97757] border border-[#f0ece4] hover:border-[#d97757]',
      outline: 'border-2 border-[#d97757] text-[#d97757] hover:bg-[#f0ece4]',
      ghost: 'bg-transparent text-[#5a5a5a] border border-[#e8e4dc] hover:bg-[#f0ece4]',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-xs min-h-8',
      md: 'px-4 py-2.5 text-sm min-h-10',
      lg: 'px-5 py-3 text-base min-h-12',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
