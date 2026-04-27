import { supabase } from './supabase';
import { User, StudyRoom, Plan } from '../types';

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
      const [
        { count: users },
        { count: plans },
        { count: rooms },
        { data: messages },
        { data: apiData }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('plans').select('*', { count: 'exact', head: true }),
        supabase.from('study_rooms').select('*', { count: 'exact', head: true }),
        supabase.from('room_messages').select('id'),
        supabase.from('api_usage').select('used_tokens, limit_tokens').eq('id', 'gemini_tokens').single()
      ]);

      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: onlineCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fiveMinsAgo);

      const totalUsers = users || 0;
      const activeUsers24h = Math.floor(totalUsers * 0.4); // Mock ratio
      const onlineUsers = onlineCount || 0;

      return {
        totalUsers,
        activeUsers24h,
        onlineUsers,
        totalPlans: plans || 0,
        totalRooms: rooms || 0,
        totalMessages: messages?.length || 0,
        averageStudyTime: 42, // Mock avg in minutes
        apiUsage: apiData ? { used: apiData.used_tokens, limit: apiData.limit_tokens } : { used: 0, limit: 10000000 }
      };
    } catch (err: any) {
      if (err?.message?.includes('relation') && err?.message?.includes('does not exist')) {
        // Silent fail for missing tables
      } else {
        console.error('[AdminService] Failed to fetch stats:', err);
      }
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
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('admin_users_view')
        .select('*', { count: 'exact' });

      if (filter === 'verified') query = query.eq('is_verified', true);
      if (filter === 'unverified') query = query.eq('is_verified', false);
      if (filter === 'online') {
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          query = query.gte('last_seen', fiveMinsAgo);
      }

      const { data, error, count } = await query
        .order('createdAt', { ascending: false })
        .range(from, to);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('relation')) {
          let fallbackQuery = supabase
            .from('users')
            .select('id, name, email, role, stats, createdAt', { count: 'exact' });
          
          const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
            .order('createdAt', { ascending: false })
            .range(from, to);
            
          if (fallbackError) throw fallbackError;
          return { data: (fallbackData || []) as UserAdminData[], count: fallbackCount || 0 };
        }
        throw error;
      }
      return { data: (data || []) as UserAdminData[], count: count || 0 };
    } catch (err) {
      console.error('[AdminService] Error fetching users:', err);
      return { data: [], count: 0 };
    }
  },

  // Admin: Delete a user completely (requires RPC)
  deleteUser: async (userId: string) => {
    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
    if (error) throw error;
  },

  // Get all active rooms
  // Get active rooms with pagination
  getAllRooms: async (page = 1, limit = 10): Promise<{ data: StudyRoom[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('study_rooms')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: (data || []) as StudyRoom[], count: count || 0 };
    } catch (err) {
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

  // Moderate: Update user role
  updateUserRole: async (userId: string, role: 'user' | 'admin') => {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },

  // Get all plans for admin dashboard with pagination
  getAllPlans: async (page = 1, limit = 10): Promise<{ data: any[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('plans')
        .select(`
          id,
          title,
          subject,
          createdAt,
          users:userId (
            name,
            email
          )
        `, { count: 'exact' })
        .order('createdAt', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error('[AdminService] Error fetching plans:', err);
      return { data: [], count: 0 };
    }
  },

  // Fetch Growth Data (Last 7 days)
  getGrowthData: async () => {
    try {
      const dates = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const [usersResponse, plansResponse] = await Promise.all([
        supabase.from('users').select('createdAt'),
        supabase.from('plans').select('createdAt')
      ]);

      const userData = usersResponse.data || [];
      const planData = plansResponse.data || [];

      return dates.map(date => {
        const dayStart = new Date(date).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: userData.filter(u => {
            const time = new Date(u.createdAt).getTime();
            return time < dayEnd; // Cumulative
          }).length,
          plans: planData.filter(p => {
            const time = new Date(p.createdAt).getTime();
            return time >= dayStart && time < dayEnd; // Daily activity
          }).length
        };
      });
    } catch (err) {
      console.error('[AdminService] Growth data fetch failed:', err);
      return [];
    }
  },

  // Get User Feedback
  // Get User Feedback with pagination
  getFeedback: async (page = 1, limit = 10): Promise<{ data: any[], count: number }> => {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('feedback')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
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
        emailRedirectTo: `${window.location.origin}/`
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
    try {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch {
      // Silently fail
    }
  }
};
