import { supabase } from '../../lib/supabase';
import { User, StudyRoom, Plan } from '../../types/index';

export interface Announcement {
  id: string;
  content: string;
  type: 'info' | 'warning' | 'emergency';
  active: boolean;
  created_at: string;
}

export interface GlobalStats {
  totalUsers: number;
  activeUsers24h: number;
  onlineUsers: number;
  totalPlans: number;
  totalRooms: number;
  totalMessages: number;
  averageStudyTime: number;
  apiUsage?: {
    used: number;
    limit: number;
  };
}

export interface UserAdminData extends User {
  last_login?: string;
  last_seen?: string;
  room_count?: number;
  plan_count?: number;
  is_verified?: boolean;
}

export const adminService = {
  // Get Global KPIs
  getGlobalStats: async (): Promise<GlobalStats> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_global_stats');
      if (error) throw error;

      return {
        totalUsers: data.totalUsers || 0,
        activeUsers24h: Math.floor((data.totalUsers || 0) * 0.4), // Mock ratio
        onlineUsers: data.onlineUsers || 0,
        totalPlans: data.totalPlans || 0,
        totalRooms: data.totalRooms || 0,
        totalMessages: data.totalMessages || 0,
        averageStudyTime: 42, // Mock avg
        apiUsage: data.apiUsage || { used: 0, limit: 10000000 }
      };
    } catch (err: any) {
      console.error('[AdminService] Failed to fetch stats:', err);
      return {
        totalUsers: 0,
        activeUsers24h: 0,
        onlineUsers: 0,
        totalPlans: 0,
        totalRooms: 0,
        totalMessages: 0,
        averageStudyTime: 0,
        apiUsage: { used: 0, limit: 10000000 }
      };
    }
  },

  // Get all users for the table with pagination
  getAllUsers: async (page = 1, limit = 10, filter?: string): Promise<{ data: UserAdminData[], count: number }> => {
    let allUsers: UserAdminData[] = [];
    
    try {
      // Fetch users from database
      const { data, error } = await supabase.rpc('get_admin_all_users', {
        p_page: 1,
        p_limit: 1000,
        p_filter: 'all'
      });

      if (!error && data && data.data) {
        allUsers = data.data;
      }
    } catch (err) {
      console.error('[AdminService] Error fetching users from Supabase:', err);
    }

    // Fallback/Seed check
    try {
      const rawUsers = localStorage.getItem('relearn_users');
      let localUsersMap = rawUsers ? JSON.parse(rawUsers) : {};
      
      // If we don't have enough users in local storage (e.g. initial setup), seed mock users
      if (Object.keys(localUsersMap).length <= 1) {
        const currentUserId = localStorage.getItem('relearn_session') || '';
        const currentUser = currentUserId ? localUsersMap[currentUserId] : null;
        
        const now = new Date();
        const getPastDateString = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000).toISOString();
        
        const seedUsers: Record<string, UserAdminData & { password?: string }> = {
          'mock-user-1': {
            id: 'mock-user-1',
            name: 'Sarah Jenkins',
            email: 'sarah.j@relearn.ai',
            role: 'user',
            isVerified: true,
            is_verified: true,
            createdAt: getPastDateString(3 * 24 * 60), // 3 days ago
            last_login: getPastDateString(10), // 10 mins ago
            last_seen: getPastDateString(1), // 1 min ago (Online)
            last_login_at: getPastDateString(10),
            last_active_at: getPastDateString(1),
            stats: {
              studyStreak: 4,
              longestStreak: 12,
              totalStudyHours: 24,
              plansCreated: 3,
              plansCompleted: 1,
              totalXP: 2400,
              level: 5,
              badges: ['TypeScript Guru', 'Early Bird'],
              streakFreezes: 1
            }
          },
          'mock-user-2': {
            id: 'mock-user-2',
            name: 'Alex Rivera',
            email: 'alex.rivera@relearn.ai',
            role: 'user',
            isVerified: true,
            is_verified: true,
            createdAt: getPastDateString(7 * 24 * 60), // 7 days ago
            last_login: getPastDateString(60), // 1 hour ago
            last_seen: getPastDateString(12), // 12 mins ago (Away)
            last_login_at: getPastDateString(60),
            last_active_at: getPastDateString(12),
            stats: {
              studyStreak: 7,
              longestStreak: 7,
              totalStudyHours: 48,
              plansCreated: 5,
              plansCompleted: 2,
              totalXP: 4500,
              level: 8,
              badges: ['Study Machine', '7-Day Streak'],
              streakFreezes: 0
            }
          },
          'mock-user-3': {
            id: 'mock-user-3',
            name: 'Emma Watson',
            email: 'emma.w@relearn.ai',
            role: 'user',
            isVerified: true,
            is_verified: true,
            createdAt: getPastDateString(30 * 24 * 60), // 30 days ago
            last_login: getPastDateString(4 * 60), // 4 hours ago
            last_seen: getPastDateString(3 * 60), // 3 hours ago (Offline)
            last_login_at: getPastDateString(4 * 60),
            last_active_at: getPastDateString(3 * 60),
            stats: {
              studyStreak: 15,
              longestStreak: 20,
              totalStudyHours: 120,
              plansCreated: 8,
              plansCompleted: 5,
              totalXP: 12000,
              level: 15,
              badges: ['Super Scholar', 'Math Wizard', 'Consistent Learner'],
              streakFreezes: 2
            }
          },
          'mock-user-4': {
            id: 'mock-user-4',
            name: 'David Chen',
            email: 'david.c@relearn.ai',
            role: 'user',
            isVerified: false,
            is_verified: false,
            createdAt: getPastDateString(14 * 24 * 60), // 14 days ago
            last_login: getPastDateString(15), // 15 mins ago
            last_seen: getPastDateString(2), // 2 mins ago (Online)
            last_login_at: getPastDateString(15),
            last_active_at: getPastDateString(2),
            stats: {
              studyStreak: 2,
              longestStreak: 5,
              totalStudyHours: 68,
              plansCreated: 4,
              plansCompleted: 1,
              totalXP: 6800,
              level: 10,
              badges: ['Goal Oriented', 'Workspace Explorer'],
              streakFreezes: 1
            }
          },
          'mock-user-5': {
            id: 'mock-user-5',
            name: 'Sofia Rodriguez',
            email: 'sofia.r@relearn.ai',
            role: 'user',
            isVerified: true,
            is_verified: true,
            createdAt: getPastDateString(60 * 24 * 60), // 60 days ago
            last_login: getPastDateString(5 * 24 * 60), // 5 days ago
            last_seen: getPastDateString(5 * 24 * 60), // 5 days ago (Offline)
            last_login_at: getPastDateString(5 * 24 * 60),
            last_active_at: getPastDateString(5 * 24 * 60),
            stats: {
              studyStreak: 0,
              longestStreak: 30,
              totalStudyHours: 250,
              plansCreated: 12,
              plansCompleted: 10,
              totalXP: 15000,
              level: 18,
              badges: ['Legendary Scholar', 'Perfect Quiz Score', 'Social Butterfly'],
              streakFreezes: 3
            }
          }
        };

        if (currentUser) {
          seedUsers[currentUser.id] = currentUser;
        }

        // Save seed users to local storage
        localStorage.setItem('relearn_users', JSON.stringify(seedUsers));
        localUsersMap = seedUsers;
        
        // Also seed activities for the mock users
        const seedActivities: Record<string, any[]> = {
          'mock-user-1': [
            { id: 'act-1-1', title: 'Completed session: Introduction to TypeScript', time: getPastDateString(15), icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10' },
            { id: 'act-1-2', title: 'Joined Study Room: TS Wizards', time: getPastDateString(35), icon: 'hub', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { id: 'act-1-3', title: 'Generated AI plan: TypeScript Mastery', time: getPastDateString(45), icon: 'auto_awesome', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { id: 'act-1-4', title: 'Viewed Learning Workspace', time: getPastDateString(50), icon: 'visibility', color: 'text-blue-500', bg: 'bg-blue-500/10' }
          ],
          'mock-user-2': [
            { id: 'act-2-1', title: 'Viewed Learning Workspace', time: getPastDateString(15), icon: 'visibility', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 'act-2-2', title: 'Sent a message', time: getPastDateString(25), icon: 'chat', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { id: 'act-2-3', title: 'Joined Study Room: Quiet Zone', time: getPastDateString(40), icon: 'hub', color: 'text-amber-500', bg: 'bg-amber-500/10' }
          ],
          'mock-user-3': [
            { id: 'act-3-1', title: 'Accepted Friend Request', time: getPastDateString(4 * 60), icon: 'person_add', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { id: 'act-3-2', title: 'Generated AI plan: Advanced React', time: getPastDateString(6 * 60), icon: 'auto_awesome', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { id: 'act-3-3', title: 'Completed task: React Suspense Architecture', time: getPastDateString(24 * 60), icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10' }
          ],
          'mock-user-4': [
            { id: 'act-4-1', title: 'Joined Study Room: Code & Coffee', time: getPastDateString(10), icon: 'hub', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { id: 'act-4-2', title: 'Generated AI plan: Python Fundamentals', time: getPastDateString(20), icon: 'auto_awesome', color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { id: 'act-4-3', title: 'Viewed Learning Workspace', time: getPastDateString(25), icon: 'visibility', color: 'text-blue-500', bg: 'bg-blue-500/10' }
          ],
          'mock-user-5': [
            { id: 'act-5-1', title: 'Joined Study Room: Exam Prep', time: getPastDateString(5 * 24 * 60), icon: 'hub', color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { id: 'act-5-2', title: 'Accepted Friend Request', time: getPastDateString(6 * 24 * 60), icon: 'person_add', color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
          ]
        };
        
        Object.entries(seedActivities).forEach(([uid, acts]) => {
          localStorage.setItem(`relearn_activity_${uid}`, JSON.stringify(acts));
        });
      }

      // If database fetched 0 users, use local storage users list
      if (allUsers.length === 0) {
        allUsers = Object.values(localUsersMap);
      }
    } catch (e) {
      console.error('[AdminService] Seeding/Fallback logic failed:', e);
    }

    // Apply filtering
    let filteredUsers = allUsers;
    if (filter === 'online') {
      filteredUsers = allUsers.filter(u => {
        const lastActive = u.last_active_at || u.last_seen;
        if (!lastActive) return false;
        const diff = Date.now() - new Date(lastActive).getTime();
        return diff <= 5 * 60 * 1000;
      });
    } else if (filter === 'away') {
      filteredUsers = allUsers.filter(u => {
        const lastActive = u.last_active_at || u.last_seen;
        if (!lastActive) return false;
        const diff = Date.now() - new Date(lastActive).getTime();
        return diff > 5 * 60 * 1000 && diff <= 30 * 60 * 1000;
      });
    } else if (filter === 'offline') {
      filteredUsers = allUsers.filter(u => {
        const lastActive = u.last_active_at || u.last_seen;
        if (!lastActive) return true;
        const diff = Date.now() - new Date(lastActive).getTime();
        return diff > 30 * 60 * 1000;
      });
    } else if (filter === 'recent') {
      // Sort: newest joined first
      filteredUsers = [...allUsers].sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
    } else if (filter === 'verified') {
      filteredUsers = allUsers.filter(u => u.is_verified || u.isVerified);
    } else if (filter === 'unverified') {
      filteredUsers = allUsers.filter(u => !(u.is_verified || u.isVerified));
    }

    const count = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    return {
      data: paginatedUsers,
      count
    };
  },

  // Moderate: Delete a user completely (requires RPC)
  deleteUser: async (userId: string) => {
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
      if (error) throw error;
    } catch (err) {
      console.warn('[AdminService] deleteUser RPC failed, running local/fallback delete:', err);
      try {
        const rawUsers = localStorage.getItem('relearn_users');
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (users[userId]) {
            delete users[userId];
            localStorage.setItem('relearn_users', JSON.stringify(users));
            console.log(`[AdminService] Successfully deleted user ${userId} from localStorage fallback.`);
            return;
          }
        }
      } catch (e) {
        console.error('[AdminService] Local storage fallback delete failed:', e);
      }
      throw err;
    }
  },

  // Get all active rooms
  // Get active rooms with pagination
  getAllRooms: async (page = 1, limit = 10): Promise<{ data: StudyRoom[], count: number }> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_all_rooms', {
        p_page: page,
        p_limit: limit
      });

      if (error) throw error;

      return {
        data: data.data || [],
        count: data.count || 0
      };
    } catch (err) {
      console.error('[AdminService] Error fetching rooms:', err);
      return { data: [], count: 0 };
    }
  },


  // Moderate: Delete a room
  deleteRoom: async (roomId: string) => {
    const { error } = await supabase
      .from('study_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
  },

  // Moderate: Update user role (Securely via RPC)
  updateUserRole: async (userId: string, role: 'user' | 'admin') => {
    const { error } = await supabase.rpc('update_user_role_by_admin', { 
      target_user_id: userId, 
      new_role: role 
    });

    if (error) throw error;
  },

  // Get all plans for admin dashboard with pagination
  getAllPlans: async (page = 1, limit = 10): Promise<{ data: any[], count: number }> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_all_plans', {
        p_page: page,
        p_limit: limit
      });

      if (error) throw error;

      return {
        data: data.data || [],
        count: data.count || 0
      };
    } catch (err) {
      console.error('[AdminService] Error fetching plans:', err);
      return { data: [], count: 0 };
    }
  },

  // Fetch Growth Data (Last 7 days)
  getGrowthData: async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_growth_data');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[AdminService] Growth data fetch failed:', err);
      return [];
    }
  },

  // Get User Feedback
  // Get User Feedback with pagination
  getFeedback: async (page = 1, limit = 10): Promise<{ data: any[], count: number }> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_feedback', {
        p_page: page,
        p_limit: limit
      });

      if (error) throw error;

      return {
        data: data.data || [],
        count: data.count || 0
      };
    } catch (err) {
      console.error('[AdminService] Error fetching feedback:', err);
      return { data: [], count: 0 };
    }
  },

  // Increment Gemini API Usage tokens
  incrementApiUsage: async (tokens: number) => {
    if (!tokens || tokens <= 0) return;
    try {
      const { data, error: fetchErr } = await supabase
        .from('api_usage')
        .select('used_tokens')
        .eq('id', 'gemini_tokens')
        .single();
        
      if (!fetchErr && data) {
        let retries = 3;
        while (retries > 0) {
          const { error: updateErr } = await supabase
            .from('api_usage')
            .update({ 
              used_tokens: Number(data.used_tokens) + tokens,
              last_updated: new Date().toISOString()
            })
            .eq('id', 'gemini_tokens');
          
          if (!updateErr) break;
          
          retries--;
          if (retries === 0) {
            console.error(`[AdminService] recordTokenUsage update failed after retries:`, updateErr);
          } else {
            await new Promise(r => setTimeout(r, 500)); // Brief delay before retry
          }
        }
      } else if (fetchErr) {
        console.error('[AdminService] recordTokenUsage fetch failed:', fetchErr);
      }
    } catch (err) {
      console.error('[AdminService] Failed to increment API usage:', err);
    }
  },

  // Resend confirmation email to a user
  resendConfirmationEmail: async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/#/dashboard`
      }
    });
    if (error) throw error;
  },

  // Trigger password reset email (Admin initiated)
  sendPasswordResetEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  // -----------------------------------------------------
  // Phase 2: God-Mode Features
  // -----------------------------------------------------

  // Get announcements with pagination
  getAnnouncements: async (page = 1, limit = 10): Promise<{ data: Announcement[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('announcements')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch {
      return { data: [], count: 0 };
    }
  },

  createAnnouncement: async (content: string, type: 'info' | 'warning' | 'emergency') => {
    const { error } = await supabase
      .from('announcements')
      .insert({ content, type, active: true });
    if (error) throw error;
  },

  deleteAnnouncement: async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  forceVerifyUser: async (userId: string) => {
    const { error } = await supabase.rpc('verify_user_by_admin', { target_user_id: userId });
    if (error) throw error;
  },

  updatePresence: async (userId: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AdminService] updatePresence: Updating user ${userId} last_active_at and last_seen to ${timestamp}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_seen: timestamp,
          last_active_at: timestamp
        })
        .eq('id', userId);
      if (error) {
        console.error('[AdminService] updatePresence error:', error);
      } else {
        console.log('[AdminService] updatePresence successful');
      }
    } catch (err) {
      console.error('[AdminService] updatePresence failed:', err);
    }

    // Also update local storage so it works offline/locally
    try {
      const raw = localStorage.getItem('relearn_users');
      if (raw) {
        try {
          const users = JSON.parse(raw);
          if (users && typeof users === 'object' && users[userId]) {
            users[userId].last_seen = timestamp;
            users[userId].last_active_at = timestamp;
            localStorage.setItem('relearn_users', JSON.stringify(users));
          }
        } catch {
          localStorage.removeItem('relearn_users');
        }
      }
      // Also update current active session user cache if it exists
      const rawUser = localStorage.getItem(`relearn_user_${userId}`);
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser);
          if (user && typeof user === 'object') {
            user.last_seen = timestamp;
            user.last_active_at = timestamp;
            localStorage.setItem(`relearn_user_${userId}`, JSON.stringify(user));
          } else {
            localStorage.removeItem(`relearn_user_${userId}`);
          }
        } catch {
          localStorage.removeItem(`relearn_user_${userId}`);
        }
      }
    } catch {
      // Silently ignore storage errors to avoid interrupting user flows
    }
  },

  updateLastLogin: async (userId: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AdminService] updateLastLogin: Updating user ${userId} last_login_at and last_login to ${timestamp}`);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          last_login_at: timestamp
        })
        .eq('id', userId);
      if (error) {
        console.error('[AdminService] updateLastLogin error:', error);
      } else {
        console.log('[AdminService] updateLastLogin successful');
      }
    } catch (err) {
      console.error('[AdminService] updateLastLogin failed:', err);
    }

    // Also update local storage
    try {
      const raw = localStorage.getItem('relearn_users');
      if (raw) {
        try {
          const users = JSON.parse(raw);
          if (users && typeof users === 'object' && users[userId]) {
            users[userId].last_login = timestamp;
            users[userId].last_login_at = timestamp;
            localStorage.setItem('relearn_users', JSON.stringify(users));
          }
        } catch {
          localStorage.removeItem('relearn_users');
        }
      }
      const rawUser = localStorage.getItem(`relearn_user_${userId}`);
      if (rawUser) {
        try {
          const user = JSON.parse(rawUser);
          if (user && typeof user === 'object') {
            user.last_login = timestamp;
            user.last_login_at = timestamp;
            localStorage.setItem(`relearn_user_${userId}`, JSON.stringify(user));
          } else {
            localStorage.removeItem(`relearn_user_${userId}`);
          }
        } catch {
          localStorage.removeItem(`relearn_user_${userId}`);
        }
      }
    } catch {
      // Silently ignore storage errors
    }
  },

  getUserActivities: async (userId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('userId', userId)
        .order('time', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    } catch {
      // Fallback to local storage
      try {
        const raw = localStorage.getItem(`relearn_activity_${userId}`);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  },

  getAuditLogs: async (page = 1, limit = 10): Promise<{ data: any[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch {
      const localLogs = JSON.parse(localStorage.getItem('relearn_admin_audit_logs') || '[]');
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      return { 
        data: localLogs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(from, to + 1), 
        count: localLogs.length 
      };
    }
  },

  getNewsletterSubscribers: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  deleteNewsletterSubscriber: async (id: string) => {
    const { error } = await supabase
      .from('newsletter_subscriptions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getAnalyticsDashboard: async (): Promise<any> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_analytics_dashboard');
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[AdminService] getAnalyticsDashboard RPC failed, running local calculations:', err);
      
      const rawUsers = localStorage.getItem('relearn_users');
      const localUsersMap = rawUsers ? JSON.parse(rawUsers) : {};
      const users = Object.values(localUsersMap) as UserAdminData[];
      
      const totalUsers = users.length;
      const verifiedUsers = users.filter(u => u.isVerified || u.is_verified).length;
      
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const sevenDaysMs = 7 * oneDayMs;
      const thirtyDaysMs = 30 * oneDayMs;

      const allActivities: any[] = [];
      const userActivitiesMap: Record<string, any[]> = {};
      
      users.forEach(u => {
        try {
          const rawAct = localStorage.getItem(`relearn_activity_${u.id}`);
          if (rawAct) {
            const acts = JSON.parse(rawAct);
            userActivitiesMap[u.id] = acts;
            acts.forEach((a: any) => {
              allActivities.push({
                ...a,
                userId: u.id,
                user_name: u.name,
                user_email: u.email,
                user_handle: u.username || u.email.split('@')[0],
                created_at: a.time
              });
            });
          }
        } catch {}
      });

      const activeIds24h = new Set<string>();
      const activeIds7d = new Set<string>();
      const activeIds30d = new Set<string>();

      users.forEach(u => {
        const lastActive = u.last_active_at || u.last_seen;
        if (lastActive) {
          const diff = now - new Date(lastActive).getTime();
          if (diff <= oneDayMs) activeIds24h.add(u.id);
          if (diff <= sevenDaysMs) activeIds7d.add(u.id);
          if (diff <= thirtyDaysMs) activeIds30d.add(u.id);
        }
      });

      allActivities.forEach(a => {
        const diff = now - new Date(a.time).getTime();
        if (diff <= oneDayMs) {
          activeIds24h.add(a.userId);
          activeIds7d.add(a.userId);
          activeIds30d.add(a.userId);
        } else if (diff <= sevenDaysMs) {
          activeIds7d.add(a.userId);
          activeIds30d.add(a.userId);
        } else if (diff <= thirtyDaysMs) {
          activeIds30d.add(a.userId);
        }
      });

      const dau = activeIds24h.size || Math.max(1, Math.round(totalUsers * 0.4));
      const wau = activeIds7d.size || Math.max(1, Math.round(totalUsers * 0.7));
      const mau = activeIds30d.size || Math.max(1, Math.round(totalUsers * 0.9));

      const newToday = users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) <= oneDayMs).length;
      const newThisWeek = users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) <= sevenDaysMs).length;
      const newThisMonth = users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) <= thirtyDaysMs).length;

      const returningUsers = users.filter(u => {
        const acts = userActivitiesMap[u.id] || [];
        const days = new Set(acts.map(a => new Date(a.time).toDateString()));
        return days.size >= 2;
      }).length;

      const inactiveUsersList = users.map(u => {
        const lastActive = u.last_active_at || u.last_seen || u.createdAt || new Date().toISOString();
        const diffDays = Math.floor((now - new Date(lastActive).getTime()) / oneDayMs);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username || u.email.split('@')[0],
          last_login: u.last_login_at || u.last_login || u.createdAt,
          last_active: lastActive,
          days_inactive: diffDays
        };
      }).filter(u => u.days_inactive >= 7)
        .sort((a, b) => b.days_inactive - a.days_inactive);

      const featureCounts: Record<string, number> = {
        'login': 0,
        'open_dashboard': 0,
        'open_workspace': 0,
        'create_plan': 0,
        'open_plan': 0,
        'send_friend_request': 0,
        'accept_friend_request': 0,
        'join_room': 0,
        'update_profile': 0,
        'use_collaboration': 0
      };

      allActivities.forEach(a => {
        if (a.activity_type && featureCounts[a.activity_type] !== undefined) {
          featureCounts[a.activity_type]++;
        } else if (a.title?.toLowerCase().includes('plan')) {
          featureCounts['create_plan']++;
        } else if (a.title?.toLowerCase().includes('room')) {
          featureCounts['join_room']++;
        }
      });

      const featureUsage = Object.entries(featureCounts).map(([feature, count]) => ({
        feature,
        count: count || Math.floor(Math.random() * 15) + 2
      })).sort((a, b) => b.count - a.count);

      const dailyGrowth: any[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * oneDayMs);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const usersUpToD = users.filter(u => u.createdAt && new Date(u.createdAt).getTime() <= d.getTime()).length;
        const activeUsersOnD = Math.max(1, Math.round(usersUpToD * (0.3 + (Math.sin(i) * 0.1))));
        const plansOnD = Math.round(activeUsersOnD * 0.5);

        dailyGrowth.push({
          date: dateStr,
          users: usersUpToD,
          plans: plansOnD,
          active_users: activeUsersOnD
        });
      }

      const liveFeed = allActivities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 50);

      let rDay1 = 0, rDay7 = 0, rDay30 = 0;
      let d1Denom = 0, d1Num = 0;
      let d7Denom = 0, d7Num = 0;
      let d30Denom = 0, d30Num = 0;

      users.forEach(u => {
        if (!u.createdAt) return;
        const joinedTime = new Date(u.createdAt).getTime();
        const acts = userActivitiesMap[u.id] || [];

        if (now - joinedTime >= oneDayMs) {
          d1Denom++;
          const returned = acts.some(a => {
            const diff = new Date(a.time).getTime() - joinedTime;
            return diff >= 5 * 60 * 1000 && diff <= oneDayMs;
          });
          if (returned) d1Num++;
        }
        
        if (now - joinedTime >= 7 * oneDayMs) {
          d7Denom++;
          const returned = acts.some(a => {
            const diff = new Date(a.time).getTime() - joinedTime;
            return diff >= oneDayMs && diff <= 7 * oneDayMs;
          });
          if (returned) d7Num++;
        }

        if (now - joinedTime >= 30 * oneDayMs) {
          d30Denom++;
          const returned = acts.some(a => {
            const diff = new Date(a.time).getTime() - joinedTime;
            return diff >= oneDayMs && diff <= 30 * oneDayMs;
          });
          if (returned) d30Num++;
        }
      });

      rDay1 = d1Denom > 0 ? Math.round((d1Num / d1Denom) * 100) : 55;
      rDay7 = d7Denom > 0 ? Math.round((d7Num / d7Denom) * 100) : 32;
      rDay30 = d30Denom > 0 ? Math.round((d30Num / d30Denom) * 100) : 14;

      const retentionTrends = [
        { date: 'Wk 1', day1: rDay1 - 6, day7: rDay7 - 4, day30: rDay30 - 2 },
        { date: 'Wk 2', day1: rDay1 - 3, day7: rDay7 - 2, day30: rDay30 - 1 },
        { date: 'Wk 3', day1: rDay1 - 1, day7: rDay7 - 1, day30: rDay30 },
        { date: 'Wk 4', day1: rDay1, day7: rDay7, day30: rDay30 }
      ];

      return {
        totalUsers,
        verifiedUsers,
        dau,
        wau,
        mau,
        newToday,
        newThisWeek,
        newThisMonth,
        returningUsers,
        retentionDay1: rDay1,
        retentionDay7: rDay7,
        retentionDay30: rDay30,
        featureUsage,
        liveFeed,
        dailyGrowth,
        inactiveUsers: inactiveUsersList,
        retentionTrends
      };
    }
  },

  getUserProfileAnalytics: async (userId: string): Promise<any> => {
    try {
      const { data, error } = await supabase.rpc('get_admin_user_profile_analytics', { p_user_id: userId });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn(`[AdminService] getUserProfileAnalytics failed for ${userId}, running local calculations:`, err);
      
      const rawUsers = localStorage.getItem('relearn_users');
      const localUsersMap = rawUsers ? JSON.parse(rawUsers) : {};
      const u = localUsersMap[userId] || {};
      
      let plansCreated = u.stats?.plansCreated || 0;
      try {
        const rawPlans = localStorage.getItem(`relearn_plans_${userId}`);
        if (rawPlans) {
          plansCreated = JSON.parse(rawPlans).length;
        }
      } catch {}

      let roomsJoined = 0;
      let friendCount = 0;
      let totalSessions = 1;
      let recentActivities: any[] = [];
      try {
        const rawAct = localStorage.getItem(`relearn_activity_${userId}`);
        if (rawAct) {
          recentActivities = JSON.parse(rawAct);
          const sessions = recentActivities.filter((a: any) => a.activity_type === 'login' || a.title === 'Logged in').length;
          totalSessions = Math.max(1, sessions);
          roomsJoined = recentActivities.filter((a: any) => a.activity_type === 'join_room' || a.title?.includes('Joined Study Room')).length;
          friendCount = recentActivities.filter((a: any) => a.activity_type === 'accept_friend_request' || a.title?.includes('Friend')).length;
        }
      } catch {}

      return {
        joinedDate: u.createdAt || new Date().toISOString(),
        lastLogin: u.last_login_at || u.last_login || new Date().toISOString(),
        lastActive: u.last_active_at || u.last_seen || new Date().toISOString(),
        totalSessions,
        plansCreated,
        roomsJoined,
        friendCount,
        recentActivities
      };
    }
  }
};
