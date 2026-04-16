export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const sendBrowserNotification = async (title: string, body: string, icon: string = '/logo.png') => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      // In environments where Service Worker is disabled or not reliable, we fallback directly to standard Notification API.
      // This prevents 'await navigator.serviceWorker.ready' from hanging indefinitely.
      
      const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
        body,
        icon,
        badge: icon, 
        vibrate: [200, 100, 200], 
        tag: 'learning-tracker-alert',
        renotify: true 
      };
      
      new Notification(title, options);
    } catch (e) {
      console.error("Error sending notification", e);
    }
  } else {
      console.log("Notification permission not granted");
  }
};