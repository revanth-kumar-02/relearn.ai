import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, UserPreferences } from '../types';
import { supabase, supabaseAvailable } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/dataService';
import { requestNotificationPermission } from '../services/notificationService';
import { setServiceAuthToken } from '../services/utils/auth';
import { logAuthDiagnostic } from '../utils/authDiagnostics';
import { adminService } from '../services/adminService';

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
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const defaultPreferences: UserPreferences = {
  theme: 'system',
  videoLanguage: 'en',
  contentLanguage: 'en',
  aiPersona: 'Chill Friend',
  learningStyle: 'Standard',
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
  const syncLock = useRef<string | null>(null);

  useEffect(() => {
    // 1. Initial check: load session from local storage immediately for fast UI
    const sessionUserId = getSession();
    logAuthDiagnostic('Session Restoration - Initial check', { sessionUserId });
    if (sessionUserId) {
      const users = getStoredUsers();
      const stored = users[sessionUserId];
      if (stored) {
        logAuthDiagnostic('Session Restoration - Loaded cached user', { userId: stored.id });
        setUser(stored);
      }
    }
    
    // 2. Hydrate from Supabase if completely available
    if (supabaseAvailable) {
      logAuthDiagnostic('Supabase available, fetching session');
      supabase.auth.getSession().then(({ data: { session } }) => {
        logAuthDiagnostic('Supabase getSession resolved', { hasSession: !!session });
        if (session && session.user) {
          setServiceAuthToken(session.access_token);
          syncSupabaseUser(session.user.id, session.user);
        } else {
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        logAuthDiagnostic('Supabase onAuthStateChange', { event, hasSession: !!session });
        if (session && session.user) {
          setServiceAuthToken(session.access_token);
          syncSupabaseUser(session.user.id, session.user);
        } else {
          setServiceAuthToken(null);
          setUser(null);
          clearSession();
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      logAuthDiagnostic('Supabase not available');
      setLoading(false);
    }
  }, []);

  const syncSupabaseUser = async (authId: string, authUser?: any) => {
    // Prevent concurrent syncs for the same user
    if (syncLock.current === authId) {
      logAuthDiagnostic('syncSupabaseUser locked (concurrent call)', { authId });
      return;
    }
    syncLock.current = authId;
    logAuthDiagnostic('syncSupabaseUser starting', { authId });

    try {
      // 1. Get auth status from Supabase to check verification
      let isVerified = true;
      let currentAuthUser = authUser;
      if (supabaseAvailable) {
        // If we don't have the authUser, fetch it (rarely needed now)
        currentAuthUser = authUser || (await supabase.auth.getUser()).data.user;
        isVerified = !!currentAuthUser?.email_confirmed_at;
      }

      // 2. Fetch deeper profile from our `users` table
      let profile: User | null = null;
      let fetchFailed = false;
      try {
        profile = await getUserProfile(authId);
        logAuthDiagnostic('Fetched user profile from DB', { hasProfile: !!profile });
      } catch (err: any) {
        logAuthDiagnostic('Failed to fetch user profile from DB, checking cache', { error: err?.message || err });
        fetchFailed = true;
        profile = getStoredUsers()[authId] || null;
      }
      
      // Auto-provision a new profile for Google/OAuth signups
      if (!profile && currentAuthUser && !fetchFailed) {
        logAuthDiagnostic('User profile not found. Auto-provisioning new profile.', { authId });
        const name = currentAuthUser?.user_metadata?.full_name || currentAuthUser?.user_metadata?.name || 'Scholar';
        const email = currentAuthUser?.email || '';
        const generatedUsername = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
        
        const newUser: User = {
          id: authId,
          name,
          username: generatedUsername,
          email,
          preferences: defaultPreferences,
          isVerified: isVerified,
          createdAt: new Date().toISOString(),
          stats: {
            studyStreak: 0,
            longestStreak: 0,
            totalStudyHours: 0,
            plansCreated: 0,
            plansCompleted: 0,
            totalXP: 0,
            level: 1,
            badges: [],
            lastStudyDate: undefined,
            streakFreezes: 1,
          },
          profileSettings: {
            gradientTheme: 'theme-1'
          }
        };

        // Save using dataService
        try {
          await saveUserProfile(authId, newUser as unknown as Record<string, unknown>);
          logAuthDiagnostic('Auto-provisioned profile saved', { authId });
        } catch (err: any) {
          logAuthDiagnostic('Auto-provisioned profile save failed (will retry via queue)', { error: err?.message || err });
        }
        profile = newUser;
      }

      if (profile) {
        const updatedProfile = { ...profile, isVerified };
        logAuthDiagnostic('Session successfully created', { userId: profile.id, isVerified });
        
        // Update presence and last_login on new session establishment (non-blocking)
        try {
          adminService.updatePresence(profile.id).catch(err => {
            console.error('[AuthContext] syncSupabaseUser updatePresence failed:', err);
          });
        } catch (e) {
          console.error('[AuthContext] syncSupabaseUser updatePresence synchronous error:', e);
        }

        const priorSession = getSession();
        if (!priorSession) {
          try {
            adminService.updateLastLogin(profile.id).catch(err => {
              console.error('[AuthContext] syncSupabaseUser updateLastLogin failed:', err);
            });
          } catch (e) {
            console.error('[AuthContext] syncSupabaseUser updateLastLogin synchronous error:', e);
          }

          try {
            const cached = JSON.parse(localStorage.getItem(`relearn_activity_${profile.id}`) || '[]');
            const logExists = cached.some((c: any) => c.title === 'Logged in' && (Date.now() - new Date(c.time).getTime()) < 10000);
            if (!logExists) {
              cached.unshift({
                id: crypto.randomUUID(),
                title: 'Logged in',
                time: new Date().toISOString(),
                icon: 'login',
                color: 'text-indigo-500',
                bg: 'bg-indigo-500/10'
              });
              localStorage.setItem(`relearn_activity_${profile.id}`, JSON.stringify(cached.slice(0, 50)));
              supabase.from('activity').insert({
                id: crypto.randomUUID(),
                userId: profile.id,
                title: 'Logged in',
                time: new Date().toISOString(),
                icon: 'login',
                color: 'text-indigo-500',
                bg: 'bg-indigo-500/10'
              }).catch(err => {
                console.error('[AuthContext] syncSupabaseUser activity insert failed:', err);
              });
            }
          } catch (e) {
            console.error('[AuthContext] syncSupabaseUser activity cache failed:', e);
          }
        }

        setUser(updatedProfile);
        setSession(profile.id);
        
        const users = getStoredUsers();
        users[profile.id] = updatedProfile;
        saveStoredUsers(users);

        // Handle deferred OAuth/verification redirects for HashRouter
        const currentHash = window.location.hash;
        const redirectPath = sessionStorage.getItem('oauth_redirect_path');
        logAuthDiagnostic('Handling post-auth redirects', { redirectPath, currentHash });
        
        if (redirectPath) {
          sessionStorage.removeItem('oauth_redirect_path');
          // 1. Clear search query parameters (?code=...) without triggering a reload
          window.history.replaceState(null, '', window.location.pathname);
          // 2. Set the hash which triggers the hashchange event and routes the user
          window.location.hash = '#' + redirectPath;
          logAuthDiagnostic('OAuth Redirect applied', { target: redirectPath });
        } else if (!currentHash || currentHash === '#' || currentHash === '#/' || currentHash === '#/login' || currentHash === '#/signup') {
          // 1. Clear search query parameters (?code=...) without triggering a reload
          window.history.replaceState(null, '', window.location.pathname);
          // 2. Redirect to dashboard
          window.location.hash = '#/dashboard';
          logAuthDiagnostic('Default redirect to dashboard applied');
        } else {
          // Just clean up the query parameters but keep the current hash route
          window.history.replaceState(null, '', window.location.pathname + currentHash);
          logAuthDiagnostic('Query params cleaned up; kept current route', { route: currentHash });
        }
      } else {
        logAuthDiagnostic('No profile available. Authentication block aborted.');
      }
    } catch (err: any) {
      logAuthDiagnostic('syncSupabaseUser failed', { error: err?.message || err });
      // Don't log common refresh token errors as warnings to avoid console noise
      if (!err?.message?.includes('Refresh Token Not Found')) {
        console.warn('[AuthContext] Sync failed:', err);
      }
    } finally {
      setLoading(false);
      syncLock.current = null;
    }
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
        await syncSupabaseUser(data.user.id, data.user);
        
        // Non-blocking background activity logging and presence updates
        try {
          adminService.updateLastLogin(data.user.id).catch(err => {
            console.error('[AuthContext] login updateLastLogin failed:', err);
          });
        } catch (e) {
          console.error('[AuthContext] login updateLastLogin sync error:', e);
        }

        try {
          adminService.updatePresence(data.user.id).catch(err => {
            console.error('[AuthContext] login updatePresence failed:', err);
          });
        } catch (e) {
          console.error('[AuthContext] login updatePresence sync error:', e);
        }

        try {
          const cached = JSON.parse(localStorage.getItem(`relearn_activity_${data.user.id}`) || '[]');
          cached.unshift({
            id: crypto.randomUUID(),
            title: 'Logged in',
            time: new Date().toISOString(),
            icon: 'login',
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
          });
          localStorage.setItem(`relearn_activity_${data.user.id}`, JSON.stringify(cached.slice(0, 50)));
          supabase.from('activity').insert({
            id: crypto.randomUUID(),
            userId: data.user.id,
            title: 'Logged in',
            time: new Date().toISOString(),
            icon: 'login',
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
          }).catch(err => {
            console.error('[AuthContext] login activity insert failed:', err);
          });
        } catch (e) {
          console.error('[AuthContext] login activity cache failed:', e);
        }
        return { success: true };
      }
    }

    // We do NOT allow new logins while offline.
    // Existing sessions are handled by the useEffect session hydration.
    return { 
      success: false, 
      message: 'Network required for authentication.' 
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
          emailRedirectTo: `${window.location.origin}/#/dashboard`,
        }
      });

      if (error) {
        // If we hit a rate limit (common during testing), allow falling back to local account
        // so the user isn't blocked from exploring the app.
        if (error.message.toLowerCase().includes('rate limit')) {
          console.warn('[AuthContext] Supabase rate limit hit. Falling back to local-first account.');
        } else {
          console.error('[AuthContext] Signup database error:', error);
          
          let userFriendlyMessage = error.message;
          const lowerMsg = error.message.toLowerCase();
          
          if (lowerMsg.includes('database error saving new user')) {
            userFriendlyMessage = 'User profile creation failed';
          } else if (lowerMsg.includes('email') && (lowerMsg.includes('already registered') || lowerMsg.includes('already exists') || lowerMsg.includes('taken'))) {
            userFriendlyMessage = 'Account already exists';
          } else if (lowerMsg.includes('conflict') || lowerMsg.includes('unique constraint') || lowerMsg.includes('duplicate key')) {
            userFriendlyMessage = 'Authentication record conflict detected';
          }
          
          return { success: false, message: userFriendlyMessage };
        }
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

    const generatedUsername = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: User = {
      id: finalUserId,
      name,
      username: generatedUsername,
      email,
      preferences: defaultPreferences,
      isVerified: false,
      createdAt: new Date().toISOString(),
      stats: {
        studyStreak: 0,
        longestStreak: 0,
        totalStudyHours: 0,
        plansCreated: 0,
        plansCompleted: 0,
        totalXP: 0,
        level: 1,
        badges: [],
        lastStudyDate: undefined,
        streakFreezes: 1,
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

    // Non-blocking background activity logging and presence updates
    try {
      adminService.updateLastLogin(finalUserId).catch(err => {
        console.error('[AuthContext] signup updateLastLogin failed:', err);
      });
    } catch (e) {
      console.error('[AuthContext] signup updateLastLogin sync error:', e);
    }

    try {
      adminService.updatePresence(finalUserId).catch(err => {
        console.error('[AuthContext] signup updatePresence failed:', err);
      });
    } catch (e) {
      console.error('[AuthContext] signup updatePresence sync error:', e);
    }

    try {
      const cached = JSON.parse(localStorage.getItem(`relearn_activity_${finalUserId}`) || '[]');
      cached.unshift({
        id: crypto.randomUUID(),
        title: 'Logged in',
        time: new Date().toISOString(),
        icon: 'login',
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
      });
      localStorage.setItem(`relearn_activity_${finalUserId}`, JSON.stringify(cached.slice(0, 50)));
      supabase.from('activity').insert({
        id: crypto.randomUUID(),
        userId: finalUserId,
        title: 'Logged in',
        time: new Date().toISOString(),
        icon: 'login',
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
      }).catch(err => {
        console.error('[AuthContext] signup activity insert failed:', err);
      });
    } catch (e) {
      console.error('[AuthContext] signup activity cache failed:', e);
    }
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

    // Supabase handles credentials securely via JWT. 
    // Local storage only stores public profile metadata.
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
      options: {
        emailRedirectTo: `${window.location.origin}/#/dashboard`,
      }
    });
    
    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const forgotPassword = async (email: string) => {
    if (!supabaseAvailable || !navigator.onLine) {
      return { success: false, message: 'Unable to send reset email. Please check your connection.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  };

  const loginWithGoogle = async () => {
    logAuthDiagnostic('loginWithGoogle called');
    if (supabaseAvailable && navigator.onLine) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/dashboard`,
        }
      });

      if (error) {
        logAuthDiagnostic('signInWithOAuth failed', { error: error.message });
        return { success: false, message: error.message };
      }
      logAuthDiagnostic('signInWithOAuth redirecting');
      return { success: true };
    }

    logAuthDiagnostic('signInWithOAuth failed (network or supabase unavailable)');
    return { 
      success: false, 
      message: 'Network connection required for Google Authentication.' 
    };
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
      forgotPassword,
      loginWithGoogle,
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
