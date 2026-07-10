// utils/authErrors.ts — v1.0
// Shared Firebase Auth error-code → user-friendly message mapping.
// Extracted from LoginModal so VerificationModal can reuse the same
// copy instead of duplicating/drifting from it.

export function friendlyAuthError(code: string): string {
  return ({
    'auth/email-already-in-use':    'This email is already registered. Try signing in instead.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/user-not-found':          'No account found with that email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Incorrect email or password.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/too-many-requests':       'Too many attempts. Please wait a moment.',
    'auth/network-request-failed':  'Network error. Check your connection.',
    'auth/popup-closed-by-user':    'Sign-in window was closed. Please try again.',
    'auth/cancelled-popup-request': '',
    'auth/user-token-expired':      'Your session has expired. Please sign in again.',
    'auth/invalid-user-token':      'Your session has expired. Please sign in again.',
    'auth/user-disabled':           'This account has been disabled. Contact support if this seems wrong.',
    'auth/requires-recent-login':   'Please sign in again to continue.',
  } as Record<string, string>)[code] ?? 'Authentication failed. Please try again.';
}