import { supabase } from '../../lib/supabase';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Converts a base64 string to a Uint8Array suitable for VAPID key applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks the current browser notification support and permission state.
 */
export const getNotificationStatus = (): NotificationStatus => {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationStatus;
};

/**
 * Registers the Service Worker if not already registered.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[NotificationService] Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Requests browser notification permission without repeating prompt if already denied.
 */
export const requestNotificationPermission = async (): Promise<NotificationStatus> => {
  const currentStatus = getNotificationStatus();
  if (currentStatus === 'unsupported' || currentStatus === 'denied') {
    return currentStatus;
  }
  if (currentStatus === 'granted') {
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationStatus;
  } catch (error) {
    console.error('[NotificationService] Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Creates and persists a PushSubscription for the given user in Supabase.
 */
export const subscribeUserToPush = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const status = await requestNotificationPermission();
  if (status !== 'granted') {
    return { success: false, error: status === 'denied' ? 'Permission denied' : 'Unsupported browser' };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, error: 'Service worker unavailable' };
  }

  try {
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.warn('[NotificationService] VAPID Public Key missing from environment.');
      }
      const convertedVapidKey = VAPID_PUBLIC_KEY ? urlBase64ToUint8Array(VAPID_PUBLIC_KEY) : undefined;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource
      });
    }

    // Extract subscription keys
    const rawSub = subscription.toJSON();
    const endpoint = rawSub.endpoint || '';
    const p256dh = rawSub.keys?.p256dh || '';
    const auth = rawSub.keys?.auth || '';

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: 'Invalid subscription credentials' };
    }

    // Persist subscription in Supabase user_push_subscriptions
    const { error: dbError } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });

    if (dbError) {
      console.error('[NotificationService] Failed to persist push subscription:', dbError.message);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[NotificationService] Failed to subscribe to push:', error);
    return { success: false, error: error.message || 'Subscription failed' };
  }
};

/**
 * Unsubscribes the current device from push notifications and removes record from Supabase.
 */
export const unsubscribeUserFromPush = async (userId: string): Promise<{ success: boolean }> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: true };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from Supabase
      if (userId && endpoint) {
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
          .eq('user_id', userId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Error unsubscribing:', error);
    return { success: false };
  }
};

/**
 * Checks if the current browser has an active push subscription registered in Supabase.
 */
export const getActivePushSubscription = async (): Promise<PushSubscription | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
};

/**
 * Sends a test notification to the user's active push subscription or browser notification.
 */
export const sendTestNotification = async (): Promise<{ success: boolean; message?: string }> => {
  const status = getNotificationStatus();
  if (status !== 'granted') {
    return { success: false, message: 'Notification permission is not granted.' };
  }

  try {
    // Get current session token for API authorization
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      // Call serverless Web Push endpoint
      const response = await fetch('/api/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: 'Relearn.ai Test Notification 🚀',
          notificationBody: 'Your browser push notifications are active and set up correctly!',
          icon: '/logo.png',
          url: '/'
        })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.sentCount > 0) {
          return { success: true, message: 'Test push notification sent via Service Worker!' };
        }
      }
    }

    // Fallback directly to Service Worker or standard Notification API
    const registration = await registerServiceWorker();
    const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
      body: 'Your browser notifications are active and set up correctly!',
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      tag: 'relearn-test-alert',
      renotify: true
    };

    if (registration && registration.showNotification) {
      await registration.showNotification('Relearn.ai Test Notification 🚀', options as NotificationOptions);
      return { success: true, message: 'Test notification displayed successfully!' };
    } else {
      new Notification('Relearn.ai Test Notification 🚀', options as NotificationOptions);
      return { success: true, message: 'Test notification displayed!' };
    }
  } catch (error: any) {
    console.error('[NotificationService] Error sending test notification:', error);
    return { success: false, message: error.message || 'Failed to send test notification.' };
  }
};

/**
 * Fallback backward compatible function for sending local browser notifications.
 */
export const sendBrowserNotification = async (title: string, body: string, icon: string = '/logo.png') => {
  if (getNotificationStatus() !== 'granted') return;
  try {
    const registration = await registerServiceWorker();
    const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
      body,
      icon,
      badge: icon,
      vibrate: [200, 100, 200],
      tag: 'relearn-browser-alert',
      renotify: true
    };

    if (registration && registration.showNotification) {
      registration.showNotification(title, options as NotificationOptions);
    } else {
      new Notification(title, options as NotificationOptions);
    }
  } catch (e) {
    console.error('[NotificationService] Fallback notification error:', e);
  }
};