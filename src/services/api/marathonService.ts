import { supabase } from '../../lib/supabase';
import { Marathon, MarathonParticipant } from '../../types/index';

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

    // Log "Joined Marathon" activity
    try {
      await supabase
        .from('activity')
        .insert({
          id: crypto.randomUUID(),
          userId: userId,
          title: 'Joined a Community Learning Marathon',
          time: new Date().toISOString(),
          icon: 'emoji_events',
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          activity_type: 'use_collaboration',
          page_name: 'collaboration_hub',
          metadata: { sub_feature: 'join_marathon', marathon_id: marathonId }
        });
    } catch (e) {
      console.warn('[MarathonService] Failed to insert marathon activity in DB:', e);
    }
    
    try {
      const cached = JSON.parse(localStorage.getItem(`relearn_activity_${userId}`) || '[]');
      cached.unshift({
        id: crypto.randomUUID(),
        title: 'Joined a Community Learning Marathon',
        time: new Date().toISOString(),
        icon: 'emoji_events',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        activity_type: 'use_collaboration',
        page_name: 'collaboration_hub',
        metadata: { sub_feature: 'join_marathon', marathon_id: marathonId }
      });
      localStorage.setItem(`relearn_activity_${userId}`, JSON.stringify(cached.slice(0, 50)));
    } catch {}

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
