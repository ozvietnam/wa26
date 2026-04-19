/**
 * Design System Tokens
 * Centralized design constants for the entire application
 * Using Warm Beige/Rust theme
 */

export const colors = {
  // Primary brand colors (Warm Beige/Rust)
  primary: {
    background: '#f9f7f3', // Warm beige
    accent: '#d97757', // Rust
    dark: '#c4694d', // Dark rust
    light: '#f0ece4', // Tan
  },

  // Neutral colors (text, borders)
  neutral: {
    textPrimary: '#1a1a1a', // Near black
    textSecondary: '#5a5a5a', // Medium gray
    textTertiary: '#9a9a9a', // Light gray
    borderLight: '#e8e4dc', // Light border
    borderMedium: '#f0ece4', // Medium border
    white: '#ffffff',
    black: '#000000',
  },

  // Semantic colors (success, warning, error, info)
  semantic: {
    success: '#22c55e', // Green - high contrast on beige
    successLight: 'rgba(34, 197, 94, 0.08)',
    warning: '#f59e0b', // Amber
    warningLight: 'rgba(245, 158, 11, 0.08)',
    error: '#ef4444', // Red
    errorLight: 'rgba(239, 68, 68, 0.08)',
    info: '#3b82f6', // Blue - for contrast
    infoLight: 'rgba(59, 130, 246, 0.04)',
  },

  // Semantic text colors
  semanticText: {
    success: '#059669',
    warning: '#92400e',
    error: '#7f1d1d',
    info: '#1e40af',
  },

  // Legacy colors used in chat content formatting
  legacy: {
    hsCodePrimary: '#b45a3c',
    hsCode: '#c4694d',
    taxRate: '#059669',
    linkGray: '#6b7280',
  },
} as const;

export const typography = {
  // Font sizes - 7-point scale
  size: {
    xs: '12px', // Small labels, captions
    sm: '14px', // Body small, form fields
    base: '16px', // Standard body text
    lg: '18px', // Large text
    xl: '20px', // Heading 4, subheading
    '2xl': '24px', // Heading 3
    '3xl': '32px', // Heading 2
    '4xl': '40px', // Heading 1
  },

  // Font weights
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Font families
  family: {
    sans: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
  },
} as const;

export const spacing = {
  // 8px base unit
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
  '5xl': '80px',
  '6xl': '96px',
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

export const zIndex = {
  hide: '-1',
  auto: '0',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  backdrop: '1300',
  modal: '1400',
  popover: '1500',
  tooltip: '1600',
} as const;

// Component-specific sizes
export const components = {
  button: {
    height: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
    padding: {
      sm: '8px 12px',
      md: '10px 16px',
      lg: '12px 20px',
    },
    minWidth: {
      sm: '32px',
      md: '40px',
      lg: '48px',
    },
  },
  input: {
    height: '40px',
    padding: '10px 12px',
    fontSize: '14px',
  },
  form: {
    labelFontSize: '14px',
    labelMarginBottom: '8px',
    fieldMarginBottom: '16px',
  },
  card: {
    padding: {
      sm: '12px',
      md: '16px',
      lg: '24px',
    },
    borderRadius: '12px',
  },
  modal: {
    maxWidth: '448px', // 2xl equivalent
    padding: '24px',
    borderRadius: '12px',
  },
  table: {
    cellPadding: '12px',
    rowHeight: '40px',
  },
} as const;

// Touch targets (mobile accessibility)
export const touchTargets = {
  minimum: '44px', // Apple HIG standard
  comfortable: '48px', // Android Material standard
  small: '36px', // For dense layouts
} as const;

// Transitions and animations
export const transitions = {
  fast: '0.15s',
  normal: '0.3s',
  slow: '0.5s',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Export all as a single object for easy imports
export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  components,
  touchTargets,
  transitions,
  breakpoints,
} as const;

export default tokens;
