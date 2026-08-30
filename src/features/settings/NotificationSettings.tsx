import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UserPreferences } from '../../types/index';
import {
  getNotificationStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  sendTestNotification,
  getActivePushSubscription,
  NotificationStatus
} from '../../services/api/notificationService';

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<NotificationStatus>('default');
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Helper to safely access preferences with fallback
  const preferences = user?.preferences?.notifications || {
    dailyReminder: true,
    dailyReminderTime: "09:00",
    progressUpdates: true,
    newPlanSuggestions: false,
    streakNotifications: true,
    taskOverdueAlerts: true
  };

  useEffect(() => {
    const checkStatus = async () => {
      const currentStatus = getNotificationStatus();
      setStatus(currentStatus);

      if (currentStatus === 'granted') {
        const sub = await getActivePushSubscription();
        setHasSubscription(!!sub);
      } else {
        setHasSubscription(false);
      }
    };

    checkStatus();
  }, []);

  const handleTogglePushSubscription = async () => {
    if (!user) {
      showToast('Please log in to manage push notifications.', 'warning');
      return;
    }

    if (status === 'denied') {
      showToast('Notification permission is blocked. Please allow notifications in your browser settings.', 'warning');
      return;
    }

    if (status === 'unsupported') {
      showToast('Browser notifications are not supported on this device/browser.', 'error');
      return;
    }

    setIsSubscribing(true);

    if (hasSubscription) {
      // Unsubscribe
      const res = await unsubscribeUserFromPush(user.id);
      setIsSubscribing(false);
      if (res.success) {
        setHasSubscription(false);
        showToast('Push notifications disabled for this device.', 'info');
      } else {
        showToast('Failed to disable push notifications.', 'error');
      }
    } else {
      // Subscribe
      const res = await subscribeUserToPush(user.id);
      setIsSubscribing(false);
      const newStatus = getNotificationStatus();
      setStatus(newStatus);

      if (res.success) {
        setHasSubscription(true);
        showToast('Push notifications enabled successfully! 🚀', 'success');
      } else {
        if (newStatus === 'denied') {
          showToast('Notification permission was denied in browser.', 'warning');
        } else {
          showToast(res.error || 'Failed to enable push notifications.', 'error');
        }
      }
    }
  };

  const handleTestNotificationClick = async () => {
    if (status !== 'granted') {
      showToast('Please enable push notifications first.', 'warning');
      return;
    }

    setIsTesting(true);
    const res = await sendTestNotification();
    setIsTesting(false);

    if (res.success) {
      showToast(res.message || 'Test notification sent!', 'success');
    } else {
      showToast(res.message || 'Failed to send test notification.', 'error');
    }
  };

  const toggleSetting = (key: keyof UserPreferences['notifications']) => {
    if (!user || !user.preferences) return;

    const currentSettings = user.preferences.notifications;
    const newSettings = {
      ...currentSettings,
      [key]: !currentSettings[key]
    };

    updateProfile({
      preferences: {
        ...user.preferences,
        notifications: newSettings
      }
    });
  };

  const updateTime = (newTime: string) => {
    if (!user || !user.preferences) return;

    const newSettings = {
      ...user.preferences.notifications,
      dailyReminderTime: newTime
    };

    updateProfile({
      preferences: {
        ...user.preferences,
        notifications: newSettings
      }
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10 text-text-primary-light dark:text-text-primary-dark">
          Notifications
        </h1>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Browser Push Status Card */}
        <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                status === 'granted' && hasSubscription
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : status === 'denied'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : status === 'unsupported'
                  ? 'bg-stone-500/10 text-stone-600 dark:text-stone-400'
                  : 'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {status === 'granted' && hasSubscription ? 'notifications_active' : status === 'denied' ? 'notifications_off' : 'add_alert'}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-base text-text-primary-light dark:text-text-primary-dark">
                  Browser Web Push
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block ${
                    status === 'granted' && hasSubscription
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : status === 'denied'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : status === 'unsupported'
                      ? 'bg-stone-500/15 text-stone-700 dark:text-stone-400'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}>
                    {status === 'granted' && hasSubscription
                      ? 'Enabled'
                      : status === 'granted' && !hasSubscription
                      ? 'Disabled on this device'
                      : status === 'denied'
                      ? 'Permission Denied'
                      : status === 'unsupported'
                      ? 'Unsupported Browser'
                      : 'Not Enabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
            {status === 'granted' && hasSubscription
              ? 'Web push notifications are active for this device. You will receive learning reminders and task alerts directly.'
              : status === 'denied'
              ? 'Notification permission is blocked by your browser settings. To enable alerts, please allow notifications for Relearn.ai in your browser site permissions.'
              : status === 'unsupported'
              ? 'Your browser or device does not support Web Push notifications.'
              : 'Enable Web Push notifications to get real-time study reminders, streak milestones, and task alerts.'}
          </p>

          {(status === 'default' || status === 'granted') && (
            <button
              onClick={handleTogglePushSubscription}
              disabled={isSubscribing}
              className={`w-full py-2.5 px-4 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                hasSubscription
                  ? 'bg-stone-200 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark hover:bg-stone-300 dark:hover:bg-stone-700'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg'
              } disabled:opacity-50`}
            >
              {isSubscribing ? (
                <span>Processing...</span>
              ) : hasSubscription ? (
                <>
                  <span className="material-symbols-outlined text-sm">notifications_off</span>
                  <span>Disable Push on this Device</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">notifications</span>
                  <span>Enable Push Notifications</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Preferences Section */}
        <div className="space-y-2">
          {/* Daily Reminder with Time Picker */}
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm flex items-center justify-between border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div>
                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">Daily Reminders</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary-light">Remind me at:</span>
                  <input
                    type="time"
                    value={preferences.dailyReminderTime}
                    onChange={(e) => updateTime(e.target.value)}
                    disabled={!preferences.dailyReminder}
                    className="text-xs bg-transparent border border-border-light dark:border-border-dark rounded px-2 py-0.5 text-text-primary-light dark:text-text-primary-dark outline-none focus:border-primary disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.dailyReminder}
                onChange={() => toggleSetting('dailyReminder')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Toggles List */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-border-light dark:border-border-dark">
            {[
              { key: 'progressUpdates', icon: 'trending_up', title: 'Progress Updates', desc: 'Get updates on your weekly goal progress' },
              { key: 'newPlanSuggestions', icon: 'auto_awesome', title: 'New Plan Suggestions', desc: 'Receive suggestions from our AI' },
              { key: 'streakNotifications', icon: 'local_fire_department', title: 'Streak Notifications', desc: 'Stay motivated by tracking streaks' },
              { key: 'taskOverdueAlerts', icon: 'task_alt', title: 'Task Overdue Alerts', desc: 'Get notified when a task is overdue' },
            ].map((item, idx) => {
              const settingsKey = item.key as keyof UserPreferences['notifications'];
              return (
                <div key={idx} className={`p-4 flex items-center justify-between ${idx !== 3 ? 'border-b border-border-light dark:border-border-dark' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="max-w-[200px]">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark text-sm">{item.title}</p>
                      <p className="text-xs text-text-secondary-light line-clamp-1">{item.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!preferences[settingsKey]}
                      onChange={() => toggleSetting(settingsKey)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Test Notification Button */}
        <button
          onClick={handleTestNotificationClick}
          disabled={isTesting}
          className="w-full py-3 bg-stone-200 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark font-bold rounded-xl hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">send</span>
          <span>{isTesting ? 'Sending Notification...' : 'Send Test Notification'}</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;