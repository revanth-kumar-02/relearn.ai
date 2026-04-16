import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTutorial } from '../contexts/TutorialContext';
import ConfirmationModal from './common/ConfirmationModal';
import {
  VIDEO_LANGUAGE_OPTIONS,
  VideoLanguageCode,
  getVideoLanguagePreference,
  setVideoLanguagePreference,
  getVideoLanguageLabel,
} from '../services/youtubeService';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, deleteAccount, updateProfile } = useAuth();
  const { refreshData, videoLanguage, updateVideoLanguage } = useData();
  const { resetTutorial } = useTutorial();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refreshData();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    deleteAccount();
    navigate('/');
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() || 'L';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark animate-fade-in pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
         <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-start rounded-full text-text-primary-light dark:text-text-primary-dark transition-colors">
             <span className="material-symbols-outlined font-bold">arrow_back</span>
         </button>
         <h1 className="flex-1 text-center text-lg font-bold text-text-primary-light dark:text-text-primary-dark pr-10 tracking-tight">Settings</h1>
      </header>

      <div className="p-4 space-y-6">
          {/* Profile Card */}
          <div 
            onClick={() => navigate('/profile')}
            className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-sm flex flex-col items-center cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center border-4 border-background-light dark:border-background-dark shadow-inner mb-3">
                  <span className="text-3xl font-black">{userInitial}</span>
              </div>
              <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">{user?.name}</h2>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{user?.email}</p>
          </div>

          {/* Local Storage Status Card */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 flex items-center justify-between border border-border-light dark:border-border-dark shadow-sm">
               <div className="flex items-center gap-4">
                   <div className="text-[#334155] dark:text-primary">
                       <span className="material-symbols-outlined text-4xl">storage</span>
                   </div>
                   <div>
                       <p className="font-bold text-text-primary-light dark:text-text-primary-dark">Local Storage</p>
                       <p className="text-xs font-bold text-green-500">Sync Active</p>
                   </div>
               </div>
               <button 
                onClick={handleRefresh} 
                className={`text-primary transition-all p-2 rounded-full hover:bg-primary/5 ${isRefreshing ? 'animate-spin' : ''}`}
               >
                   <span className="material-symbols-outlined text-3xl">refresh</span>
               </button>
          </div>

          {/* Preferences Section */}
          <div className="space-y-3">
              <h3 className="px-2 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">Preferences</h3>
              <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm">
                  {/* Video Language Selector */}
                  <div className="w-full flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                          <div className="text-[#334155] dark:text-text-secondary-dark">
                              <span className="material-symbols-outlined text-2xl">translate</span>
                          </div>
                          <div>
                              <span className="font-bold text-text-primary-light dark:text-text-primary-dark text-base">Video Language</span>
                              <p className="text-[11px] text-text-secondary-light dark:text-text-secondary-dark mt-0.5">Tutorial videos will be in this language</p>
                          </div>
                      </div>
                      <select
                          id="video-language-select"
                          value={videoLanguage}
                          onChange={(e) => updateVideoLanguage(e.target.value as VideoLanguageCode)}
                          className="bg-stone-100 dark:bg-stone-800 text-text-primary-light dark:text-text-primary-dark text-sm font-bold rounded-xl px-3 py-2 border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer transition-all hover:bg-stone-200 dark:hover:bg-stone-700"
                      >
                          {VIDEO_LANGUAGE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                      </select>
                  </div>
              </div>
          </div>

          {/* General Section */}
          <div className="space-y-3">
              <h3 className="px-2 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">General</h3>
              <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm">
                  <SettingItem 
                    icon="inventory_2" 
                    label="Archived Plans" 
                    onClick={() => navigate('/archived')} 
                  />
                  <SettingItem 
                    icon="notifications" 
                    label="Notifications" 
                    onClick={() => navigate('/notification-settings')} 
                    isLast
                  />
              </div>
          </div>

          {/* Support Section */}
          <div className="space-y-3">
              <h3 className="px-2 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">Support</h3>
              <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm">
                  <SettingItem 
                    icon="help" 
                    label="Help Center" 
                    onClick={() => navigate('/help-center')} 
                  />
                  <SettingItem 
                    icon="school" 
                    label="Show Tutorial" 
                    onClick={() => {
                        resetTutorial();
                        navigate('/dashboard');
                    }} 
                  />
                  <SettingItem 
                    icon="chat" 
                    label="Send Feedback" 
                    onClick={() => navigate('/feedback')} 
                    isLast
                  />
              </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-center">
                <button 
                    onClick={handleClearData}
                    className="flex items-center gap-2 px-6 py-3 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors group active:scale-95"
                >
                    <span className="material-symbols-outlined text-xl">delete_sweep</span>
                    <span className="text-sm font-bold tracking-tight">Clear All Local Data</span>
                </button>
            </div>
          </div>

          {/* Version Footer */}
          <div className="text-center pt-8 space-y-1">
              <p className="text-[10px] font-black text-text-secondary-light/30 dark:text-text-secondary-dark/30 uppercase tracking-[0.2em]">
                RELEARN.AI V4.0.1
              </p>
              <div className="space-y-0.5 px-4">
                  <p className="text-[9px] font-bold text-text-secondary-light/40 dark:text-text-secondary-dark/40 tracking-tight leading-relaxed">
                    © 2026 ReLearn.ai . All rights reserved to Revanth.
                  </p>
                  <p className="text-[9px] font-bold text-text-secondary-light/40 dark:text-text-secondary-dark/40 tracking-tight leading-relaxed">
                    Released on 17 April 2026.
                  </p>
              </div>
          </div>
      </div>
      
      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Wipe Local Data?"
        message="This will permanently delete all your learning plans, status markers, and progress history."
        actionLabel="Delete Everything"
        icon="delete_forever"
        isDanger
        onConfirm={confirmClearData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

interface SettingItemProps {
    icon: string;
    label: string;
    onClick: () => void;
    isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, label, onClick, isLast }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group ${!isLast ? 'border-b border-border-light dark:border-border-dark' : ''}`}
    >
        <div className="flex items-center gap-4">
            <div className="text-[#334155] dark:text-text-secondary-dark group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <span className="font-bold text-text-primary-light dark:text-text-primary-dark text-base">{label}</span>
        </div>
        <span className="material-symbols-outlined text-text-secondary-light/40 text-xl font-bold">chevron_right</span>
    </button>
);

export default Settings;