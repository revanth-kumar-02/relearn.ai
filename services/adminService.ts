import { supabase } from './supabase';
import { User, StudyRoom, Plan } from '../types';

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

      const totalUsers = users || 0;
      const activeUsers24h = Math.floor(totalUsers * 0.4); // Mock ratio
      const onlineUsers = Math.floor(activeUsers24h * 0.15); // Mock online users based on active

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

  // Get all users for the table
  getAllUsers: async (): Promise<UserAdminData[]> => {
    try {
      // Query the specialized view which includes verification status
      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        // Fallback to normal users table if view doesn't exist yet
        if (error.code === 'PGRST205' || error.message.includes('relation')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('users')
            .select('id, name, email, role, stats, createdAt')
            .order('createdAt', { ascending: false });
          if (fallbackError) throw fallbackError;
          return fallbackData as UserAdminData[];
        }
        throw error;
      }
      return data as UserAdminData[];
    } catch (err) {
      return [];
    }
  },

  // Admin: Delete a user completely (requires RPC)
  deleteUser: async (userId: string) => {
    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
    if (error) throw error;
  },

  // Get all active rooms
  getAllRooms: async (): Promise<StudyRoom[]> => {
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudyRoom[];
    } catch (err) {
      return [];
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

  // Get all plans for admin dashboard
  getAllPlans: async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          id,
          title,
          createdAt,
          users:userId (
            name,
            email
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[AdminService] Error fetching plans:', err);
      return [];
    }
  },

  // Fetch Growth Data (Last 7 days)
  getGrowthData: async () => {
    // This would typically be a complex query or an edge function
    // Returning mock data for the chart for now
    return [
      { date: '2026-04-20', users: 120, plans: 45 },
      { date: '2026-04-21', users: 132, plans: 52 },
      { date: '2026-04-22', users: 145, plans: 61 },
      { date: '2026-04-23', users: 168, plans: 75 },
      { date: '2026-04-24', users: 189, plans: 88 },
      { date: '2026-04-25', users: 210, plans: 112 },
      { date: '2026-04-26', users: 245, plans: 134 },
    ];
  },

  // Get User Feedback
  getFeedback: async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
        // Return empty if table doesn't exist
        return [];
    }
    return data;
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
        await supabase
          .from('api_usage')
          .update({ 
            used_tokens: Number(data.used_tokens) + tokens,
            last_updated: new Date().toISOString()
          })
          .eq('id', 'gemini_tokens');
      }
    } catch (err) {
      console.error('[AdminService] Failed to increment API usage:', err);
    }
  },

  // Resend confirmation email to a user
  resendConfirmationEmail: async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    if (error) throw error;
  }
};
