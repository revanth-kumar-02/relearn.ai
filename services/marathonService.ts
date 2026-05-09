import { supabase } from './supabase';
import { Marathon, MarathonParticipant } from '../types';

export const marathonService = {
  async getMarathons() {
    const { data, error } = await supabase
      .from('marathons')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Marathon[];
  },

  async joinMarathon(marathonId: string, userId: string) {
    const { data, error } = await supabase
      .from('marathon_participants')
      .insert({
        marathon_id: marathonId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data as MarathonParticipant;
  },

  async getParticipation(userId: string) {
    const { data, error } = await supabase
      .from('marathon_participants')
      .select('*, marathon:marathons(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  async updateProgress(participationId: string, progress: number, goal: number) {
    const completed = progress >= goal;
    const completedAt = completed ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('marathon_participants')
      .update({
        progress,
        completed,
        completed_at: completedAt
      })
      .eq('id', participationId)
      .select()
      .single();

    if (error) throw error;
    return data as MarathonParticipant;
  },

  subscribeToMarathons(callback: () => void) {
    return supabase
      .channel('marathon_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marathons' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marathon_participants' }, callback)
      .subscribe();
  }
};
