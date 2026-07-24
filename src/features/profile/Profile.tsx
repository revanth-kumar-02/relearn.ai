import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { User } from '../../types/index';
import { friendService, FriendRequest } from '../../services/api/friendService';
import { BADGES } from '../../services/api/gamificationService';
import { supabase } from '../../lib/supabase';

const GRADIENT_THEMES = [
  { id: 'theme-1', name: 'Blue Purple', className: 'bg-gradient-to-r from-blue-500 to-purple-600' },
  { id: 'theme-2', name: 'Teal Cyan', className: 'bg-gradient-to-r from-teal-400 to-cyan-500' },
  { id: 'theme-3', name: 'Indigo Violet', className: 'bg-gradient-to-r from-indigo-500 to-violet-600' },
  { id: 'theme-4', name: 'Dark Navy', className: 'bg-gradient-to-r from-blue-700 to-slate-900' },
  { id: 'theme-5', name: 'Emerald Teal', className: 'bg-gradient-to-r from-emerald-500 to-teal-600' },
  { id: 'theme-6', name: 'Orange Pink', className: 'bg-gradient-to-r from-orange-400 to-pink-500' },
  { id: 'theme-7', name: 'Sunset', className: 'bg-gradient-to-r from-orange-500 to-red-600' },
  { id: 'theme-8', name: 'Midnight', className: 'bg-gradient-to-r from-blue-900 to-black' },
  { id: 'theme-9', name: 'Sky', className: 'bg-gradient-to-r from-sky-400 to-indigo-400' },
  { id: 'theme-10', name: 'Royal', className: 'bg-gradient-to-r from-purple-700 to-blue-600' },
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, tasks } = useData();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { showToast } = useToast();
  const { startTutorial } = useTutorial();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFlipped, setIsFlipped] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'sent'>(
    (location.state as any)?.activeFriendTab || 'friends'
  );
  const [viewingProfileUser, setViewingProfileUser] = useState<any | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (location.state && (location.state as any).activeFriendTab) {
      setActiveTab((location.state as any).activeFriendTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    startTutorial('profile');
  }, [startTutorial]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        academicLevel: user.academicLevel || 'Undergraduate',
        learningGoals: user.learningGoals || [],
        preferredStudyTime: user.preferredStudyTime || 'Morning',
        weakSubjects: user.weakSubjects || [],
        strongSubjects: user.strongSubjects || [],
        profileSettings: user.profileSettings || {
          gradientTheme: 'theme-1'
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFriends();
      const subscription = friendService.subscribeToFriendships(user.id, () => {
        loadFriends();
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    try {
      const [friendsList, pending, sent] = await Promise.all([
        friendService.getFriends(user.id),
        friendService.getPendingRequests(user.id),
        friendService.getSentRequests(user.id)
      ]);
      setFriends(friendsList);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const handleViewProfile = async (userId: string) => {
    setIsFetchingProfile(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, profilePicture, academicLevel, learningGoals, weakSubjects, strongSubjects, preferredStudyTime, stats')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setViewingProfileUser(data);
    } catch (err) {
      showToast("Failed to load user profile", "error");
      console.error(err);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const targetUsername = typeof e === 'string' ? e : friendUsername;
    
    if (!user || !targetUsername) return;
    setIsAddingFriend(true);
    try {
      await friendService.sendFriendRequest(user.id, targetUsername);
      showToast(`Request sent to ${targetUsername}`, "success");
      setFriendUsername('');
      setSearchResults([]);
    } catch (err: any) {
      showToast(err.message || "Failed to send request", "error");
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setFriendUsername(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!val || val.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await friendService.searchUsers(val, user!.id);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  if (!user) return null;

  const currentTheme = GRADIENT_THEMES.find(t => t.id === formData.profileSettings?.gradientTheme) || GRADIENT_THEMES[0];

  const stats = {
    plansCreated: plans.length,
    plansCompleted: plans.filter(p => p.progress === 100).length,
    totalHours: Math.round(tasks.filter(t => t.status === 'Completed').reduce((acc, t) => acc + t.durationMinutes, 0) / 60),
    streak: user.stats?.studyStreak || 0,
    completionRate: plans.length > 0 ? Math.round((plans.filter(p => p.progress === 100).length / plans.length) * 100) : 0,
  };

  const getLevelInfo = (completed: number) => {
    if (completed >= 10) return { level: 5, title: 'Master', min: 10, max: null, next: null };
    if (completed >= 7) return { level: 4, title: 'Advanced', min: 7, max: 10, next: 'Master' };
    if (completed >= 4) return { level: 3, title: 'Dedicated', min: 4, max: 7, next: 'Advanced' };
    if (completed >= 2) return { level: 2, title: 'Explorer', min: 2, max: 4, next: 'Dedicated' };
    return { level: 1, title: 'Beginner', min: 0, max: 2, next: 'Explorer' };
  };

  const levelInfo = getLevelInfo(stats.plansCompleted);
  const nextLevelProgress = levelInfo.max
    ? Math.min(100, Math.max(0, ((stats.plansCompleted - levelInfo.min) / (levelInfo.max - levelInfo.min)) * 100))
    : 100;

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile(formData);
    if (result.success) {
      setIsEditing(false);
      showToast("Profile updated successfully.", "success");
    } else {
      showToast(result.message || "We couldn't save your changes right now. Let's try that again.", "error");
    }
    setIsSaving(false);
  };

  const handleArrayInput = (field: keyof User, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    if (value && !currentArray.includes(value)) {
      setFormData({ ...formData, [field]: [...currentArray, value] });
    }
  };

  const removeArrayItem = (field: keyof User, item: string) => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData({ ...formData, [field]: currentArray.filter(i => i !== item) });
  };

  const handlePasswordChange = async () => {
    if (!newPassword) return;
    const result = await changePassword(newPassword);
    if (result.success) {
      showToast('Password changed successfully', "success");
      setShowPasswordModal(false);
      setNewPassword('');
    } else {
      showToast(result.message || "We couldn't save your changes right now. Let's try that again.", "error");
    }
  };
  
  const handleProfilePictureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be less than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, profilePicture: base64String }));
      
      // Auto-save the profile picture even if not in edit mode (or just update the state)
      // Actually, since we are in a "formData" pattern, we should probably wait for handleSave
      // but let's make it feel responsive.
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-border-light dark:border-border-dark">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">Profile</h1>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10 rounded-lg transition-all"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : (isEditing ? 'Save' : 'Edit')}
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Luxury Identity Flip Card */}
        <div id="tutorial-profile-header" className="relative w-full max-w-[500px] mx-auto aspect-[1.3/1] sm:aspect-[1.586/1] [perspective:1000px] group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

            {/* FRONT SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#0f0f12] bg-gradient-to-br from-[#1a1a1e] to-[#050507] p-4 sm:p-6 shadow-2xl border border-[#ffffff05] flex flex-col items-center justify-center text-center overflow-hidden [backface-visibility:hidden]">
              {/* Subtle Texture */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

              {/* Gold Accent Line Top */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-40"></div>

              {/* Flip Icon (Front Only) */}
              <div className="absolute top-4 right-4 p-2 text-[#D4AF37]/60 animate-pulse">
                <span className="material-symbols-outlined text-xl">flip_camera_android</span>
              </div>

              {/* Premium Avatar */}
              <div className="relative mb-4 group/avatar" onClick={handleProfilePictureClick}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] bg-gradient-to-b from-[#D4AF37] to-[#8A6E2F] shadow-lg shadow-black/50 ${isEditing ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}>
                  <div className="w-full h-full rounded-full bg-[#0f0f12] border-2 border-[#0f0f12] flex items-center justify-center overflow-hidden">
                    {formData.profilePicture ? (
                      <img 
                        src={formData.profilePicture} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-[#D4AF37] tracking-widest select-none font-display">
                        {(user.email ? user.email.charAt(0) : user.name.charAt(0)).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#D4AF37] text-[#0f0f12] rounded-full flex items-center justify-center shadow-md hover:bg-[#E5C570] transition-colors">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="space-y-1 z-10 w-full">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xl font-medium bg-transparent border-b border-[#D4AF37]/30 text-[#D4AF37] text-center w-full outline-none focus:border-[#D4AF37] font-sans tracking-wide"
                  />
                ) : (
                  <h2 className="text-xl font-medium tracking-wide text-[#E5C570] font-sans">{user.name}</h2>
                )}
                <p className="text-xs text-zinc-500 tracking-wider uppercase">{user.email}</p>
              </div>

              {/* Metadata */}
              <div className="mt-3 sm:mt-6 flex items-center justify-center gap-2 sm:gap-4 text-[8px] sm:text-[10px] tracking-widest text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]"></span>
                  <span>SINCE {user.createdAt ? new Date(user.createdAt).getFullYear() : '2025'}</span>
                </div>
                <div className="w-[1px] h-3 bg-zinc-800"></div>
                <div className="flex items-center gap-1.5">
                  <span>{formData.academicLevel?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* BACK SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#0f0f12] bg-gradient-to-bl from-[#1a1a1e] to-[#050507] shadow-2xl border border-[#ffffff05] overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {/* Magnetic Strip */}
              <div className="absolute top-4 sm:top-6 left-0 w-full h-8 sm:h-10 bg-[#050505] border-y border-[#ffffff05]"></div>

              <div className="relative h-full flex flex-col p-4 sm:p-6 pt-16 sm:pt-24 justify-between">

                <div className="flex justify-between items-start">
                  {/* Premium Smart Chip */}
                  <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-[#FFE5B4] via-[#D4AF37] to-[#AA8C2C] shadow-md border-[0.5px] border-[#FFFFF0]/20 relative overflow-hidden">
                    {/* Chip Circuit Lines */}
                    <div className="absolute inset-0 opacity-50">
                      {/* Horizontal Mid */}
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#4a3718]"></div>
                      {/* Vertical Mid */}
                      <div className="absolute top-0 left-1/2 h-full w-[1px] bg-[#4a3718]"></div>
                      {/* Vertical Left Third */}
                      <div className="absolute top-0 left-[30%] h-full w-[1px] bg-[#4a3718]"></div>
                      {/* Vertical Right Third */}
                      <div className="absolute top-0 right-[30%] h-full w-[1px] bg-[#4a3718]"></div>
                      {/* Center Rect */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 border border-[#4a3718] rounded-[3px]"></div>
                    </div>
                    {/* Metallic Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50"></div>
                  </div>

                  {/* Level Info */}
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-1 font-bold">
                      Level {levelInfo.level}
                    </div>
                    <div className="text-xs font-medium text-zinc-300 tracking-wide mb-2">
                      {levelInfo.title}
                    </div>
                    {levelInfo.next && (
                      <div className="w-24 ml-auto">
                        <div className="h-[2px] w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4AF37]" style={{ width: `${nextLevelProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-[0.2em] mb-1">Identity Number</p>
                    <p className="font-mono text-sm tracking-widest text-zinc-400 shadow-black drop-shadow-sm">
                      {user.username ? user.username.toUpperCase() : user.id.split('-')[0].toUpperCase()}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="p-1 bg-white rounded-sm border border-[#D4AF37]/30">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}`} alt="QR" className="w-10 h-10" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Stats Section */}
        <section id="tutorial-profile-stats" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Plans Created" value={stats.plansCreated} icon="inventory_2" color="text-blue-500" bg="bg-blue-500/10" />
          <StatCard label="Completion" value={`${stats.completionRate}%`} icon="task_alt" color="text-green-500" bg="bg-green-500/10" />
          <StatCard label="Study Streak" value={`${stats.streak}d`} icon="local_fire_department" color="text-orange-500" bg="bg-orange-500/10" />
          <StatCard label="Total Hours" value={`${stats.totalHours}h`} icon="schedule" color="text-purple-500" bg="bg-purple-500/10" />
        </section>

        {/* Obtained Badges (New Section) */}
        <section className="space-y-4">
          <h3 className="px-1 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">Obtained Badges</h3>
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-sm overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
            
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              {(() => {
                const earnedBadgeIds = user.stats?.badges || [];
                const earnedBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id));
                
                if (earnedBadges.length === 0) {
                  return (
                    <div className="w-full text-center py-4">
                      <p className="text-xs text-text-secondary-light italic">No badges earned yet. Complete tasks, streaks, or quizzes to start collecting!</p>
                    </div>
                  );
                }

                return earnedBadges.map(badge => (
                  <BadgeItem 
                    key={badge.id}
                    icon={badge.icon}
                    label={badge.name}
                    unlocked={true}
                    description={badge.description}
                    color={badge.color}
                  />
                ));
              })()}
            </div>
          </div>
        </section>

        {/* Middle Section: Preferences */}
        <section id="tutorial-profile-preferences" className="space-y-4">
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-sm space-y-6">
            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">school</span>
              Academic Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary-light uppercase tracking-widest">Academic Level</label>
                {isEditing ? (
                  <select
                    value={formData.academicLevel}
                    onChange={e => setFormData({ ...formData, academicLevel: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-background-dark border border-border-light dark:border-border-dark outline-none text-sm"
                  >
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Professional">Professional</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{formData.academicLevel}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary-light uppercase tracking-widest">Preferred Study Time</label>
                {isEditing ? (
                  <select
                    value={formData.preferredStudyTime}
                    onChange={e => setFormData({ ...formData, preferredStudyTime: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-background-dark border border-border-light dark:border-border-dark outline-none text-sm"
                  >
                    <option value="Early Morning">Early Morning</option>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Night Owl">Night Owl</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{formData.preferredStudyTime}</p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
              <ArraySection
                label="Learning Goals"
                items={formData.learningGoals || []}
                isEditing={isEditing}
                onAdd={(v) => handleArrayInput('learningGoals', v)}
                onRemove={(v) => removeArrayItem('learningGoals', v)}
                placeholder="e.g. Master React, Pass Finals"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ArraySection
                  label="Strong Subjects"
                  items={formData.strongSubjects || []}
                  isEditing={isEditing}
                  onAdd={(v) => handleArrayInput('strongSubjects', v)}
                  onRemove={(v) => removeArrayItem('strongSubjects', v)}
                  placeholder="e.g. Math, Physics"
                />
                <ArraySection
                  label="Weak Subjects"
                  items={formData.weakSubjects || []}
                  isEditing={isEditing}
                  onAdd={(v) => handleArrayInput('weakSubjects', v)}
                  onRemove={(v) => removeArrayItem('weakSubjects', v)}
                  placeholder="e.g. History, Biology"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Section: Settings */}
        <section className="space-y-3">
          <h3 className="px-1 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">Community & Settings</h3>
          
          {/* Friends Section */}
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-sm space-y-6">
            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">group</span>
                Friend Zone
                {pendingRequests.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                    {pendingRequests.length}
                  </span>
                )}
              </span>
            </h3>

            {/* Tab Bar */}
            <div className="flex border-b border-border-light dark:border-border-dark">
              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'friends'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary-light/60 dark:text-text-secondary-dark/60 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                Friends ({friends.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('incoming')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'incoming'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary-light/60 dark:text-text-secondary-dark/60 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                Incoming
                {pendingRequests.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
                ({pendingRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sent')}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'sent'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary-light/60 dark:text-text-secondary-dark/60 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                Sent ({sentRequests.length})
              </button>
            </div>

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-6">
                {/* Add Friend Form */}
                <div className="relative">
                  <form onSubmit={handleAddFriend} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary-light">tag</span>
                      <input
                        type="text"
                        placeholder="Search by ID (e.g. revanth)"
                        value={friendUsername}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-background-dark border border-border-light dark:border-border-dark outline-none text-sm focus:border-primary transition-all text-text-primary-light dark:text-text-primary-dark"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingFriend || !friendUsername}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:scale-105"
                    >
                      {isAddingFriend ? '...' : 'Add'}
                    </button>
                  </form>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-2xl z-30 overflow-hidden animate-scale-in origin-top">
                      {searchResults.map(result => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleAddFriend(result.username)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b last:border-0 border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                              {result.profilePicture ? (
                                <img src={result.profilePicture} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-text-secondary-light">{result.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">{result.name}</p>
                              <p className="text-[10px] text-text-secondary-light">@{result.username}</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-primary text-sm">person_add</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Friends List */}
                <div className="space-y-3">
                  {friends.length === 0 ? (
                    <p className="text-center py-6 text-xs text-text-secondary-light italic">No friends added yet. Share your ID to get started!</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {friends.map(friend => (
                        <div key={friend.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                              {friend.profilePicture ? (
                                <img src={friend.profilePicture} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-text-secondary-light">{friend.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">{friend.name}</p>
                              <p className="text-[10px] text-text-secondary-light">@{friend.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleViewProfile(friend.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-text-secondary-light hover:text-primary transition-all"
                              title="View Profile"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </button>
                            <button 
                              type="button"
                              onClick={async () => {
                                if (confirm(`Remove ${friend.name} from friends?`)) {
                                  try {
                                    await friendService.removeFriend(friend.friendshipId);
                                    showToast("Friend removed", "success");
                                    loadFriends();
                                  } catch (err) {
                                    showToast("Failed to remove friend", "error");
                                  }
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/0 text-red-500 opacity-0 group-hover:opacity-100 group-hover:bg-red-500/10 transition-all"
                              title="Remove Friend"
                            >
                              <span className="material-symbols-outlined text-sm">person_remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Incoming Requests Tab */}
            {activeTab === 'incoming' && (
              <div className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <p className="text-center py-6 text-xs text-text-secondary-light italic">No pending incoming requests.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                            {req.requester?.profilePicture ? (
                              <img src={req.requester.profilePicture} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-primary">{req.requester?.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">{req.requester?.name}</p>
                            <p className="text-[10px] text-text-secondary-light">@{req.requester?.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewProfile(req.requester_id)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-white/5 text-text-secondary-light hover:text-primary flex items-center gap-1 transition-all"
                            title="View Profile"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span className="hidden sm:inline">View Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await friendService.rejectFriendRequest(req.id);
                                showToast("Request declined", "info");
                                loadFriends();
                              } catch (err) {
                                showToast("Failed to decline request", "error");
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-text-secondary-light hover:text-red-500 transition-colors"
                            title="Decline"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await friendService.acceptFriendRequest(req.id);
                                showToast("Friend request accepted!", "success");
                                loadFriends();
                              } catch (err) {
                                showToast("Failed to accept request", "error");
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:scale-110 transition-transform"
                            title="Accept"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests Tab */}
            {activeTab === 'sent' && (
              <div className="space-y-3">
                {sentRequests.length === 0 ? (
                  <p className="text-center py-6 text-xs text-text-secondary-light italic">No pending sent requests.</p>
                ) : (
                  <div className="space-y-2">
                    {sentRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                            {req.receiver?.profilePicture ? (
                              <img src={req.receiver.profilePicture} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-text-secondary-light">{req.receiver?.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">{req.receiver?.name}</p>
                            <p className="text-[10px] text-text-secondary-light">@{req.receiver?.username}</p>
                            <p className="text-[9px] text-zinc-500">Sent {new Date(req.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewProfile(req.receiver_id)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 dark:bg-white/5 text-text-secondary-light hover:text-primary flex items-center gap-1 transition-all"
                            title="View Profile"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span className="hidden sm:inline">View Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await friendService.rejectFriendRequest(req.id);
                                showToast("Friend request cancelled", "info");
                                loadFriends();
                              } catch (err) {
                                showToast("Failed to cancel request", "error");
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Cancel Request"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm">
            <SettingItem icon="settings" label="System Settings" onClick={() => navigate('/settings')} />
            <SettingItem icon="lock" label="Change Password" onClick={() => setShowPasswordModal(true)} />
            <SettingItem icon="logout" label="Logout" onClick={logout} isLast color="text-red-500" />
          </div>
        </section>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-surface-dark rounded-3xl p-6 border border-white/10 shadow-2xl animate-scale-in">
            <h3 className="text-center font-bold text-lg mb-6 text-white">Change Password</h3>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 font-bold text-sm text-white">Cancel</button>
              <button onClick={handlePasswordChange} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewingProfileUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setViewingProfileUser(null)}>
          <div 
            className="w-full max-w-md bg-white dark:bg-surface-dark rounded-3xl p-6 border border-border-light dark:border-white/10 shadow-2xl animate-scale-in relative overflow-hidden text-text-primary-light dark:text-text-primary-dark"
            onClick={e => e.stopPropagation()}
          >
            {/* Elegant Top Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-violet-600"></div>

            {/* Close Button */}
            <button 
              onClick={() => setViewingProfileUser(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {/* Profile Header Details */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-b from-primary to-violet-600 shadow-lg mb-3">
                <div className="w-full h-full rounded-full bg-white dark:bg-background-dark border-2 border-white dark:border-background-dark flex items-center justify-center overflow-hidden">
                  {viewingProfileUser.profilePicture ? (
                    <img 
                      src={viewingProfileUser.profilePicture} 
                      alt={viewingProfileUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary font-display">
                      {viewingProfileUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <h4 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{viewingProfileUser.name}</h4>
              <p className="text-xs text-text-secondary-light">@{viewingProfileUser.username}</p>
            </div>

            {/* Academic Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-border-light dark:border-border-dark">
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-secondary-light tracking-wider">Level</p>
                  <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{viewingProfileUser.academicLevel || 'Undergraduate'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-text-secondary-light tracking-wider">Study Time</p>
                  <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">{viewingProfileUser.preferredStudyTime || 'Morning'}</p>
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-text-secondary-light tracking-wider px-1">Learning Goals</p>
                <div className="flex flex-wrap gap-1.5">
                  {viewingProfileUser.learningGoals && viewingProfileUser.learningGoals.length > 0 ? (
                    viewingProfileUser.learningGoals.map((goal: string) => (
                      <span key={goal} className="px-2.5 py-1 text-[11px] font-bold bg-primary/10 text-primary rounded-full">{goal}</span>
                    ))
                  ) : (
                    <span className="text-xs text-text-secondary-light italic px-1">None specified</span>
                  )}
                </div>
              </div>

              {/* Subjects */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-text-secondary-light tracking-wider px-1">Strong Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProfileUser.strongSubjects && viewingProfileUser.strongSubjects.length > 0 ? (
                      viewingProfileUser.strongSubjects.map((sub: string) => (
                        <span key={sub} className="px-2.5 py-1 text-[11px] font-bold bg-green-500/10 text-green-500 rounded-full">{sub}</span>
                      ))
                    ) : (
                      <span className="text-xs text-text-secondary-light italic px-1">None specified</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-text-secondary-light tracking-wider px-1">Weak Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProfileUser.weakSubjects && viewingProfileUser.weakSubjects.length > 0 ? (
                      viewingProfileUser.weakSubjects.map((sub: string) => (
                        <span key={sub} className="px-2.5 py-1 text-[11px] font-bold bg-red-500/10 text-red-500 rounded-full">{sub}</span>
                      ))
                    ) : (
                      <span className="text-xs text-text-secondary-light italic px-1">None specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Level / Badges if available */}
              {viewingProfileUser.stats && (
                <div className="pt-3 border-t border-border-light dark:border-border-dark flex justify-between items-center text-xs text-text-secondary-light">
                  <span>Streak: <strong className="text-orange-500">{viewingProfileUser.stats.studyStreak || 0}d</strong></span>
                  <span>Badges: <strong>{(viewingProfileUser.stats.badges || []).length}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner for fetching profile details */}
      {isFetchingProfile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color, bg }: any) => (
  <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm flex flex-col items-center text-center space-y-1">
    <div className={`w-10 h-10 rounded-full ${bg} ${color} flex items-center justify-center mb-1`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <p className="text-lg font-black text-text-primary-light dark:text-text-primary-dark">{value}</p>
    <p className="text-[10px] font-bold text-text-secondary-light uppercase tracking-wider">{label}</p>
  </div>
);

const BadgeItem = ({ icon, label, unlocked, description, color }: any) => {
  const isEmoji = icon && icon.length <= 2;
  const isGradient = color && (color.includes('from-') || color.includes('to-'));
  
  return (
    <div className={`flex flex-col items-center text-center gap-2 transition-all ${unlocked ? 'opacity-100 scale-100' : 'opacity-30 grayscale scale-95'}`}>
      <div className={`w-16 h-16 rounded-2xl ${unlocked ? 'bg-white dark:bg-background-dark shadow-lg shadow-black/5' : 'bg-gray-100 dark:bg-white/5'} flex items-center justify-center border border-border-light dark:border-border-dark relative group`}>
        {isEmoji ? (
          <span className="text-2xl">{icon}</span>
        ) : (
          <span className={`material-symbols-outlined text-3xl ${unlocked ? (isGradient ? 'text-primary' : color) : 'text-gray-400'}`}>
            {icon}
          </span>
        )}
        
        {unlocked && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 ${isGradient ? `bg-gradient-to-br ${color}` : 'bg-green-500'} rounded-full border-2 border-white dark:border-surface-dark flex items-center justify-center shadow-sm`}>
            <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>
          </div>
        )}
        
        {/* Tooltip on Hover */}
        <div className="absolute bottom-full mb-2 w-32 p-2 bg-black/90 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          <p className="font-bold mb-0.5">{label}</p>
          <p className="opacity-70">{description}</p>
        </div>
      </div>
      <span className="text-[10px] font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">{label}</span>
    </div>
  );
};

const ArraySection = ({ label, items, isEditing, onAdd, onRemove, placeholder }: any) => {
  const [input, setInput] = useState('');
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-text-secondary-light uppercase tracking-widest">{label}</label>
      <div className="flex flex-wrap gap-2">
        {items.map((item: string) => (
          <span key={item} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center gap-1">
            {item}
            {isEditing && (
              <button onClick={() => onRemove(item)} className="hover:text-primary-dark">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </span>
        ))}
        {isEditing && (
          <div className="flex items-center gap-2 w-full mt-1">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (onAdd(input), setInput(''))}
              placeholder={placeholder}
              className="flex-1 p-2 rounded-lg bg-gray-50 dark:bg-background-dark border border-border-light dark:border-border-dark text-xs outline-none focus:border-primary"
            />
            <button
              onClick={() => { onAdd(input); setInput(''); }}
              className="p-2 bg-primary text-white rounded-lg"
            >
              <span className="material-symbols-outlined text-xs">add</span>
            </button>
          </div>
        )}
        {!isEditing && items.length === 0 && <p className="text-xs text-text-secondary-light italic">None added</p>}
      </div>
    </div>
  );
};

const SettingItem = ({ icon, label, onClick, isLast, color = 'text-text-primary-light dark:text-text-primary-dark' }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group ${isLast ? '' : 'border-b border-border-light dark:border-border-dark'}`}
  >
    <div className="flex items-center gap-4">
      <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      <span className={`font-bold text-sm ${color}`}>{label}</span>
    </div>
    <span className="material-symbols-outlined text-text-secondary-light/40 text-xl">chevron_right</span>
  </button>
);

export default Profile;
