import type { Config } from 'tailwindcss'
import { colors, typography, spacing, borderRadius, shadows } from './lib/design-tokens'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors (warm beige/rust)
        primary: {
          bg: colors.primary.background,
          accent: colors.primary.accent,
          dark: colors.primary.dark,
          light: colors.primary.light,
        },
        // Neutral
        neutral: {
          textPrimary: colors.neutral.textPrimary,
          textSecondary: colors.neutral.textSecondary,
          textTertiary: colors.neutral.textTertiary,
          borderLight: colors.neutral.borderLight,
          borderMedium: colors.neutral.borderMedium,
        },
        // Semantic
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        info: colors.semantic.info,
      },
      fontSize: {
        xs: typography.size.xs,
        sm: typography.size.sm,
        base: typography.size.base,
        lg: typography.size.lg,
        xl: typography.size.xl,
        '2xl': typography.size['2xl'],
        '3xl': typography.size['3xl'],
        '4xl': typography.size['4xl'],
      },
      fontWeight: {
        regular: typography.weight.regular.toString(),
        medium: typography.weight.medium.toString(),
        semibold: typography.weight.semibold.toString(),
        bold: typography.weight.bold.toString(),
      },
      spacing: {
        xs: spacing.xs,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
        xl: spacing.xl,
        '2xl': spacing['2xl'],
        '3xl': spacing['3xl'],
        '4xl': spacing['4xl'],
      },
      borderRadius: {
        sm: borderRadius.sm,
        md: borderRadius.md,
        lg: borderRadius.lg,
        xl: borderRadius.xl,
      },
      boxShadow: {
        sm: shadows.sm,
        md: shadows.md,
        lg: shadows.lg,
        xl: shadows.xl,
        '2xl': shadows['2xl'],
      },
    },
  },
  plugins: [],
}

export default config
