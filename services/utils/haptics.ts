/**
 * U3: Mobile Haptic Feedback Utility
 * Provides subtle tactile feedback for key user actions.
 */
export const triggerHaptic = (type: 'success' | 'warning' | 'light' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'success':
        navigator.vibrate([10, 30, 10]);
        break;
      case 'warning':
        navigator.vibrate([50, 100, 50]);
        break;
      case 'light':
      default:
        navigator.vibrate(10);
        break;
    }
  }
};
