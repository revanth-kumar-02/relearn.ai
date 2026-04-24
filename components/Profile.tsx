import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { User } from '../types';

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
  const { plans, tasks } = useData();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [isFlipped, setIsFlipped] = useState(false);

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
        <div className="relative w-full max-w-[500px] mx-auto aspect-[1.586/1] [perspective:1000px] group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>

            {/* FRONT SIDE */}
            <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#0f0f12] bg-gradient-to-br from-[#1a1a1e] to-[#050507] p-6 shadow-2xl border border-[#ffffff05] flex flex-col items-center justify-center text-center overflow-hidden [backface-visibility:hidden]">
              {/* Subtle Texture */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

              {/* Gold Accent Line Top */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-40"></div>

              {/* Flip Icon (Front Only) */}
              <div className="absolute top-4 right-4 p-2 text-[#D4AF37]/60 animate-pulse">
                <span className="material-symbols-outlined text-xl">flip_camera_android</span>
              </div>

              {/* Premium Text Avatar */}
              <div className="relative mb-4 group/avatar">
                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-b from-[#D4AF37] to-[#8A6E2F] shadow-lg shadow-black/50">
                  <div className="w-full h-full rounded-full bg-[#0f0f12] border-2 border-[#0f0f12] flex items-center justify-center">
                    <span className="text-3xl font-bold text-[#D4AF37] tracking-widest select-none font-display">
                      {(user.email ? user.email.charAt(0) : user.name.charAt(0)).toUpperCase()}
                    </span>
                  </div>
                </div>
                {isEditing && (
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#D4AF37] text-[#0f0f12] rounded-full flex items-center justify-center shadow-md hover:bg-[#E5C570] transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
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
              <div className="mt-6 flex items-center justify-center gap-4 text-[10px] tracking-widest text-zinc-400">
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
              <div className="absolute top-6 left-0 w-full h-10 bg-[#050505] border-y border-[#ffffff05]"></div>

              <div className="relative h-full flex flex-col p-6 pt-24 justify-between">

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
                      {user.id.split('-')[0].toUpperCase()} •••• {user.id.slice(-4).toUpperCase()}
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
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Plans Created" value={stats.plansCreated} icon="inventory_2" color="text-blue-500" bg="bg-blue-500/10" />
          <StatCard label="Completion" value={`${stats.completionRate}%`} icon="task_alt" color="text-green-500" bg="bg-green-500/10" />
          <StatCard label="Study Streak" value={`${stats.streak}d`} icon="local_fire_department" color="text-orange-500" bg="bg-orange-500/10" />
          <StatCard label="Total Hours" value={`${stats.totalHours}h`} icon="schedule" color="text-purple-500" bg="bg-purple-500/10" />
        </section>

        {/* Middle Section: Preferences */}
        <section className="space-y-4">
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
          <h3 className="px-1 text-[11px] font-black text-text-secondary-light/60 dark:text-text-secondary-dark/60 uppercase tracking-[0.15em]">Account Settings</h3>
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
