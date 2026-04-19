'use client';

import React from 'react';
import { Input, type InputProps } from './Input';

export interface FormFieldProps extends Omit<InputProps, 'label'> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, required, error, helperText, ...inputProps }, ref) => {
    return (
      <div className="mb-4 last:mb-0">
        <Input
          ref={ref}
          label={label}
          error={error}
          helperText={helperText}
          required={required}
          {...inputProps}
        />
      </div>
    );
  }
);

FormField.displayName = 'FormField';
