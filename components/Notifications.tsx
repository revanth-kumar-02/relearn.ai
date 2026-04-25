import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAllNotificationsAsRead, clearAllNotifications } = useData();
  const [filterType, setFilterType] = useState<string>('All');

  const filteredNotifications = notifications.filter(n => {
      if (filterType === 'All') return true;
      if (filterType === 'Reminders') return n.type === 'reminder';
      if (filterType === 'Progress Updates') return n.type === 'goal';
      if (filterType === 'System') return n.type === 'system' || n.type === 'plan';
      return true;
  });

  const getIconForType = (type: string) => {
      switch(type) {
          case 'plan': return 'auto_awesome';
          case 'goal': return 'trophy';
          case 'reminder': return 'notifications';
          case 'system': return 'system_update';
          default: return 'info';
      }
  };

  const getColorForType = (type: string) => {
      switch(type) {
          case 'plan': return 'text-primary bg-primary/20 border-primary';
          case 'goal': return 'text-secondary bg-secondary/20 border-secondary';
          case 'reminder': return 'text-amber-500 bg-amber-500/20 border-amber-500';
          case 'system': return 'text-gray-500 bg-gray-200 dark:bg-gray-700 border-gray-400';
          default: return 'text-gray-500 bg-gray-200 border-gray-400';
      }
  };

  const formatTimeAgo = (isoString: string) => {
      const date = new Date(isoString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return date.toLocaleDateString();
  };

  return (
    <div className="pb-20 min-h-screen bg-background-light dark:bg-background-dark">
      <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
         <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-text-primary-light dark:text-text-primary-dark shrink-0">
             <span className="material-symbols-outlined">arrow_back</span>
         </button>
         <h1 className="flex-1 text-center text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Notifications</h1>
      </div>

      {/* Actions & Filters */}
      <div className="p-4 space-y-4">
          <div className="flex gap-3">
              <button 
                onClick={markAllNotificationsAsRead}
                className="flex-1 py-2.5 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-all active:scale-[0.98]"
              >
                  Mark All Read
              </button>
              <button 
                onClick={clearAllNotifications}
                className="flex-1 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-sm rounded-xl hover:bg-red-500/20 transition-all active:scale-[0.98]"
              >
                  Clear All
              </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['All', 'Reminders', 'Progress Updates', 'System'].map((filter, i) => (
                  <button 
                    key={i} 
                    onClick={() => setFilterType(filter)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        filterType === filter 
                        ? 'bg-primary text-white shadow-md' 
                        : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                      {filter}
                  </button>
              ))}
          </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
          {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                  const colorClass = getColorForType(notif.type);
                  // Extract just the text/bg color parts for the icon container, rely on border for the left accent
                  const iconColor = colorClass.split(' ')[0];
                  const iconBg = colorClass.split(' ')[1];
                  const borderColor = colorClass.split(' ')[2];

                  return (
                    <div 
                        key={notif.id} 
                        className={`bg-surface-light dark:bg-surface-dark p-4 rounded-xl flex gap-3 shadow-sm border-l-4 ${borderColor.replace('border-', 'border-')} animate-fade-in relative overflow-hidden`}
                    >
                        {!notif.read && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></div>
                        )}
                        <div className={`h-12 w-12 rounded-full ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}>
                            <span className="material-symbols-outlined">{getIconForType(notif.type)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className={`font-bold text-sm truncate pr-4 ${notif.read ? 'text-text-secondary-light' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                                    {notif.title}
                                </h4>
                                <span className="text-xs text-text-secondary-light whitespace-nowrap">{formatTimeAgo(notif.time)}</span>
                            </div>
                            <p className="text-sm text-text-secondary-light line-clamp-2 leading-relaxed">
                                {notif.message}
                            </p>
                        </div>
                    </div>
                  );
              })
          ) : (
             <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                 <span className="material-symbols-outlined text-4xl mb-2 text-text-secondary-light">notifications_paused</span>
                 <p className="text-text-secondary-light font-medium">No notifications found</p>
                 <p className="text-xs text-text-secondary-light">We'll let you know when something important happens.</p>
             </div>
          )}
      </div>
    </div>
  );
};

export default Notifications;