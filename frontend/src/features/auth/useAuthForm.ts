import { useState } from 'react'
import type { ComponentProps } from 'react'

export type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0]

export interface AuthErrorMapping {
  [errorCode: string]: string // maps error code to i18n key
}

export interface UseAuthFormResult {
  error: string | null
  isSubmitting: boolean
  setError: (error: string | null) => void
  setIsSubmitting: (submitting: boolean) => void
  clearError: () => void
  handleApiError: (
    error: Error | { code?: string; message?: string } | null,
    errorMapping: AuthErrorMapping,
    fallbackKey: string,
    t: (key: any, params?: any) => string,
  ) => void
}

/**
 * Hook to manage common auth form patterns across login, signup, forgot-password, etc.
 * Consolidates error handling, submission state, and error code mapping.
 */
export function useAuthForm(): UseAuthFormResult {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearError = () => setError(null)

  const handleApiError = (
    apiError: Error | { code?: string; message?: string } | null,
    errorMapping: AuthErrorMapping,
    fallbackKey: string,
    t: (key: string | any, params?: Record<string, unknown>) => string,
  ) => {
    if (!apiError) {
      setError(t(fallbackKey))
      return
    }

    // Get the error code from the API response
    const errorCode =
      'code' in apiError ? apiError.code : apiError.message?.split('::')[0]

    // Map the error code to an i18n key, or use fallback
    const i18nKey = errorCode
      ? errorMapping[errorCode] || fallbackKey
      : fallbackKey
    setError(t(i18nKey))
  }

  return {
    error,
    isSubmitting,
    setError,
    setIsSubmitting,
    clearError,
    handleApiError,
  }
}
