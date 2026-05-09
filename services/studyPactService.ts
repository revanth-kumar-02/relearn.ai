import { supabase } from './supabase';
import { StudyPact } from '../types';

export const studyPactService = {
  async createPact(pact: Omit<StudyPact, 'id' | 'created_at' | 'status'>) {
    // 1. Validation Logic
    if (pact.creator_id === pact.target_id) {
      throw new Error("You cannot challenge yourself!");
    }

    const deadlineDate = new Date(pact.deadline);
    if (deadlineDate <= new Date()) {
      throw new Error("Deadline must be in the future.");
    }

    // 2. Check for existing active pacts (limit 3)
    const { count } = await supabase
      .from('study_pacts')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', pact.creator_id)
      .in('status', ['pending', 'accepted']);

    if (count !== null && count >= 3) {
      throw new Error("You can only have 3 active/pending pacts at a time.");
    }

    // 3. Insert Pact
    const { data, error } = await supabase
      .from('study_pacts')
      .insert({
        ...pact,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Create Notification
    await supabase.from('notifications').insert({
      userId: pact.target_id,
      type: 'social',
      title: 'New Study Pact Proposal',
      message: `${pact.creator_name} has challenged you to: ${pact.goal_description}`,
      time: new Date().toISOString()
    });

    return data as StudyPact;
  },

  async getUserPacts(userId: string) {
    const { data, error } = await supabase
      .from('study_pacts')
      .select('*')
      .or(`creator_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StudyPact[];
  },

  async updatePactStatus(pactId: string, status: StudyPact['status']) {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('study_pacts')
      .update(updateData)
      .eq('id', pactId)
      .select()
      .single();

    if (error) throw error;
    return data as StudyPact;
  },

  subscribeToPacts(userId: string, callback: () => void) {
    return supabase
      .channel(`pacts_${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'study_pacts',
        filter: `creator_id=eq.${userId}`
      }, callback)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'study_pacts',
        filter: `target_id=eq.${userId}`
      }, callback)
      .subscribe();
  }
};
