// haptic.ts — Haptic feedback utility
// Uses Vibration API (Android Chrome) — silently ignored on unsupported devices

export const haptic = {
  // Light tap — chip click, button press
  light: () => navigator.vibrate?.(8),

  // Medium — send message, confirm action
  medium: () => navigator.vibrate?.(18),

  // Heavy — delete, destructive action
  heavy: () => navigator.vibrate?.([12, 40, 12]),

  // Success — message saved, preferences saved
  success: () => navigator.vibrate?.([8, 30, 8]),

  // Error
  error: () => navigator.vibrate?.([20, 50, 20, 50, 20]),
};
