import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPreferences } from '../types';
import { requestNotificationPermission, sendBrowserNotification } from '../services/notificationService';

const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  // Browser permission state
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Helper to safely access preferences with fallback
  const preferences = user?.preferences?.notifications || {
    dailyReminder: true,
    dailyReminderTime: "09:00",
    progressUpdates: true,
    newPlanSuggestions: false,
    streakNotifications: true,
    taskOverdueAlerts: true
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    
    if (result === 'granted') {
         sendBrowserNotification("Notifications Enabled", "You will now receive learning alerts right on your device.");
    }
  };

  const handleTestNotification = async () => {
      if (permission !== 'granted') {
          const result = await requestNotificationPermission();
          setPermission(result);
          if (result !== 'granted') {
              alert("Please allow notifications in your browser settings first.");
              return;
          }
      }
      
      sendBrowserNotification("Test Notification", "This is how your daily reminders will look! 🚀");
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

  // Check permission on mount
  useEffect(() => {
     if (typeof Notification !== 'undefined') {
         setPermission(Notification.permission);
     }
  }, []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
         <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark">
             <span className="material-symbols-outlined">arrow_back</span>
         </button>
         <h1 className="text-lg font-bold flex-1 text-center pr-10 text-text-primary-light dark:text-text-primary-dark">Notifications</h1>
      </div>

      <div className="p-4 space-y-6">
          {/* Notifications are now enabled automatically on account creation */}

          <div className="space-y-2">
              {/* Daily Reminder with Time Picker */}
              <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm flex items-center justify-between border border-border-light dark:border-border-dark">
                  <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined">notifications</span>
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
                                className="text-xs bg-transparent border border-border-light dark:border-border-dark rounded px-1 py-0.5 text-text-primary-light dark:text-text-primary-dark outline-none focus:border-primary disabled:opacity-50"
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
          
          <button 
             onClick={handleTestNotification}
             className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-text-primary-light dark:text-text-primary-dark font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
              Test Notification
          </button>
      </div>
    </div>
  );
};

export default NotificationSettings;