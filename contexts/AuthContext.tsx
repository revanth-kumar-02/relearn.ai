import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPreferences } from '../types';
import { supabase, supabaseAvailable } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/dataService';
import { requestNotificationPermission } from '../services/notificationService';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  signup: (name: string, email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; message?: string }>;
  deleteAccount: () => void;
  checkVerification: () => Promise<boolean>;
  resendVerification: () => Promise<{ success: boolean; message?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const defaultPreferences: UserPreferences = {
  theme: 'system',
  videoLanguage: 'en',
  notifications: {
    dailyReminder: true,
    dailyReminderTime: "09:00",
    progressUpdates: true,
    newPlanSuggestions: false,
    streakNotifications: true,
    taskOverdueAlerts: true
  }
};

const LS_USERS_KEY = 'relearn_users';
const LS_SESSION_KEY = 'relearn_session';

// Hybrid local storage helpers for when offline
function getStoredUsers(): Record<string, User & { password?: string }> {
  try {
    const raw = localStorage.getItem(LS_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStoredUsers(users: Record<string, User>) {
  try { localStorage.setItem(LS_USERS_KEY, JSON.stringify(users)); } catch { }
}

function getSession(): string | null {
  try { return localStorage.getItem(LS_SESSION_KEY); } catch { return null; }
}

function setSession(userId: string) {
  try { localStorage.setItem(LS_SESSION_KEY, userId); } catch { }
}

function clearSession() {
  try { localStorage.removeItem(LS_SESSION_KEY); } catch { }
}

/** Hash a password using SHA-256 for offline storage (never store raw passwords) */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial check: load session from local storage immediately for fast UI
    const sessionUserId = getSession();
    if (sessionUserId) {
      const users = getStoredUsers();
      const stored = users[sessionUserId];
      if (stored) {
        setUser(stored);
      }
    }
    
    // 2. Hydrate from Supabase if completely available
    if (supabaseAvailable) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          syncSupabaseUser(session.user.id);
        } else {
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) {
          syncSupabaseUser(session.user.id);
        } else {
          setUser(null);
          clearSession();
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const syncSupabaseUser = async (authId: string) => {
    // 1. Get auth status from Supabase to check verification
    let isVerified = true;
    if (supabaseAvailable) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      isVerified = !!authUser?.email_confirmed_at;
    }

    // 2. Fetch deeper profile from our `users` table
    const profile = await getUserProfile(authId);
    if (profile) {
      const updatedProfile = { ...profile, isVerified };
      setUser(updatedProfile);
      setSession(profile.id);
      
      const users = getStoredUsers();
      users[profile.id] = updatedProfile;
      saveStoredUsers(users);
    }
    setLoading(false);
  };

  // Theme effect
  useEffect(() => {
    const theme = user?.preferences?.theme || 'system';
    const root = window.document.documentElement;
    root.classList.remove('dark');

    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
  }, [user]);

  const login = async (email: string, pass: string) => {
    if (supabaseAvailable && navigator.onLine) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        return { success: false, message: error.message };
      }
      
      if (data.user) {
        await syncSupabaseUser(data.user.id);
        return { success: true };
      }
    }

    // S2: Critical Auth Bypass Fix
    // We do NOT allow new logins while offline if we can't verify credentials.
    // Instead, we only allow existing sessions to persist (handled by the useEffect hydrate).
    return { 
      success: false, 
      message: 'You need to be online to log in for the first time on this device.' 
    };
  };

  const signup = async (name: string, email: string, pass: string) => {
    let finalUserId: string = crypto.randomUUID();

    if (supabaseAvailable && navigator.onLine) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }
      if (data.user) {
        finalUserId = data.user.id;
      }
    } else {
      // Local fallback check
      const users = getStoredUsers();
      const exists = Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return { success: false, message: 'An account with this email already exists.' };
      }
    }

    const newUser: User = {
      id: finalUserId,
      name,
      email,
      preferences: defaultPreferences,
      isVerified: false,
      createdAt: new Date().toISOString(),
      stats: {
        studyStreak: 0,
        totalStudyHours: 0,
        plansCreated: 0,
        plansCompleted: 0
      },
      profileSettings: {
        gradientTheme: 'theme-1'
      }
    };

    // Save to DataService (which handles Supabase `users` table and local cache)
    await saveUserProfile(finalUserId, newUser as unknown as Record<string, unknown>);

    // Cache the profile locally for offline startup (WITHOUT credentials)
    const storedUsers = getStoredUsers();
    storedUsers[finalUserId] = newUser;
    saveStoredUsers(storedUsers);

    // Automatically request notification permissions on account creation
    requestNotificationPermission().catch(console.error);

    setUser(newUser);
    setSession(finalUserId);
    return { success: true };
  };

  const logout = async () => {
    if (supabaseAvailable && navigator.onLine) {
      await supabase.auth.signOut();
    }
    setUser(null);
    clearSession();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return { success: false, message: "No user logged in" };

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // Save using dataService
    await saveUserProfile(user.id, updatedUser as unknown as Record<string, unknown>);

    return { success: true };
  };

  const changePassword = async (newPass: string) => {
    if (!user) return { success: false, message: "No user logged in" };

    if (supabaseAvailable && navigator.onLine) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) return { success: false, message: error.message };
    }

    // S1 Fix: Passwords are no longer stored in profile metadata
    //Supabase handles credentials. Local storage only stores public profile.
    return { success: true };
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    // Attempt local cleanup first
    const users = getStoredUsers();
    delete users[user.id];
    saveStoredUsers(users);

    try {
      localStorage.removeItem(`relearn_plans_${user.id}`);
      localStorage.removeItem(`relearn_tasks_${user.id}`);
      localStorage.removeItem(`relearn_activity_${user.id}`);
      localStorage.removeItem(`relearn_notifications_${user.id}`);
    } catch { }

    clearSession();
    setUser(null);
  };

  const checkVerification = async () => {
    if (!supabaseAvailable || !navigator.onLine) return user?.isVerified || false;
    
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error || !authUser) return false;
    
    const isVerified = !!authUser.email_confirmed_at;
    if (user && user.isVerified !== isVerified) {
      const updatedUser = { ...user, isVerified };
      setUser(updatedUser);
      
      // Update local storage
      const users = getStoredUsers();
      users[user.id] = updatedUser;
      saveStoredUsers(users);
    }
    return isVerified;
  };

  const resendVerification = async () => {
    if (!supabaseAvailable || !user?.email || !navigator.onLine) {
      return { success: false, message: 'Unable to resend email. Please check your connection.' };
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      checkVerification,
      resendVerification,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
