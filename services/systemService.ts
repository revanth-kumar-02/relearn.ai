import { supabase } from './supabase';

export interface SystemStatus {
  maintenance_mode: boolean;
  message: string;
  status: 'active' | 'completed' | 'none';
  version: string;
  updated_at: string;
}

export const systemService = {
  // Get current system status
  getSystemStatus: async (): Promise<SystemStatus> => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Table or record might not exist yet, return default
          return {
            maintenance_mode: false,
            message: '',
            status: 'none',
            version: '1.0.0',
            updated_at: new Date().toISOString()
          };
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      // Suppress logging if the table just doesn't exist yet (prevents console spam)
      if (err?.code !== 'PGRST116' && err?.message !== 'relation "system_config" does not exist') {
        console.warn('[SystemService] Failed to fetch system status:', err);
      }
      return {
        maintenance_mode: false,
        message: '',
        status: 'none',
        version: '1.0.0',
        updated_at: new Date().toISOString()
      };
    }
  },

  // Update system status (Admin only)
  updateSystemStatus: async (updates: Partial<SystemStatus>) => {
    const { error } = await supabase
      .from('system_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 'global'); // Assuming a single record with ID 'global'

    if (error) throw error;
  },

  // Subscribe to real-time updates
  subscribeToStatus: (callback: (status: SystemStatus) => void) => {
    return supabase
      .channel('system_status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        (payload) => {
          callback(payload.new as SystemStatus);
        }
      )
      .subscribe();
  }
};
