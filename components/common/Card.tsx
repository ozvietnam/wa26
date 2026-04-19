'use client';

import React from 'react';

type CardVariant = 'default' | 'hover' | 'elevated';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', ...props }, ref) => {
    const baseClasses = 'bg-white border border-[#e8e4dc] rounded-lg padding-4 transition-fast';

    const variantClasses = {
      default: 'shadow-sm',
      hover: 'shadow-sm hover:shadow-md hover:border-[#d97757]',
      elevated: 'shadow-lg',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export const CardHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`pb-4 border-b border-[#f0ece4] ${className}`} {...props} />
);

export const CardTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-2xl font-bold text-[#1a1a1a] ${className}`} {...props} />
);

export const CardDescription = ({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-[#5a5a5a] mt-1 ${className}`} {...props} />
);

export const CardContent = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`py-4 ${className}`} {...props} />
);

export const CardFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`pt-4 border-t border-[#f0ece4] flex gap-2 ${className}`} {...props} />
);
