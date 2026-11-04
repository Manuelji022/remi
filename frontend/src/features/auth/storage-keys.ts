// Storage keys for auth-related client-side state
// These keys are used consistently across the app for browser storage operations

export const AUTH_STORAGE_KEYS = {
  // localStorage keys (persistent across sessions)
  tour: {
    progress: (userId: string) => `remi:ai-tour:v1:${userId}`,
  },

  // sessionStorage keys (cleared when tab closes)
  twoFactor: {
    pending: 'auth.2fa.pending',
  },
  signup: {
    otpPending: 'remi:signupOtpPending',
  },
}
