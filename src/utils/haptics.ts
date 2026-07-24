/**
 * Haptic feedback utility for mobile devices.
 * Provides subtle tactile feedback for interactive elements.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const triggerHaptic = (style: HapticStyle = 'light'): void => {
    if (typeof window === 'undefined' || !window.navigator.vibrate) return;

    switch (style) {
        case 'light':
            window.navigator.vibrate(10);
            break;
        case 'medium':
            window.navigator.vibrate(20);
            break;
        case 'heavy':
            window.navigator.vibrate(40);
            break;
        case 'success':
            window.navigator.vibrate([10, 30, 10]);
            break;
        case 'warning':
            window.navigator.vibrate([20, 50, 20]);
            break;
        case 'error':
            window.navigator.vibrate([50, 100, 50, 100]);
            break;
    }
};

/**
 * Hook to wrap a callback with haptic feedback.
 */
export const useHaptic = <T extends (...args: any[]) => any>(
    callback: T,
    style: HapticStyle = 'light'
): T => {
    return ((...args: Parameters<T>) => {
        triggerHaptic(style);
        return callback(...args);
    }) as T;
};
