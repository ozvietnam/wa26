'use client';

import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  showIcon?: boolean;
}

export const ErrorMessage = ({ message, onDismiss, showIcon = true }: ErrorMessageProps) => {
  return (
    <div
      className="mb-4 p-4 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg flex items-start gap-3 animate-slideInUp"
      role="alert"
      aria-live="polite"
    >
      {showIcon && (
        <svg className="w-5 h-5 flex-shrink-0 text-[#ef4444] mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}

      <div className="flex-1">
        <p className="text-sm text-[#ef4444] font-medium">{message}</p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] rounded transition-colors flex-shrink-0"
          aria-label="Dismiss error"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
