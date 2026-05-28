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
    try {
      const { data, error } = await supabase.rpc('get_admin_all_users', {
        p_page: page,
        p_limit: limit,
        p_filter: filter || 'all'
      });

      if (error) throw error;

      return {
        data: data.data || [],
        count: data.count || 0
      };
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
    try {
      await supabase
        .from('users')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch {
      // Silently fail
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
  }
};
