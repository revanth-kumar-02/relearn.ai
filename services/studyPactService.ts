import { supabase } from './supabase';
import { StudyPact } from '../types';

export const studyPactService = {
  /**
   * Propose a study pact to another user
   */
  createPact: async (pact: Omit<StudyPact, 'id' | 'created_at' | 'status'>): Promise<StudyPact> => {
    const { data, error } = await supabase
      .from('study_pacts')
      .insert({
        ...pact,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch pacts for the current user (sent or received)
   */
  getUserPacts: async (userId: string): Promise<StudyPact[]> => {
    const { data, error } = await supabase
      .from('study_pacts')
      .select('*')
      .or(`creator_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Accept a pending pact
   */
  acceptPact: async (pactId: string): Promise<void> => {
    const { error } = await supabase
      .from('study_pacts')
      .update({ status: 'active' })
      .eq('id', pactId);

    if (error) throw error;
  },

  /**
   * Decline or cancel a pact
   */
  cancelPact: async (pactId: string): Promise<void> => {
    const { error } = await supabase
      .from('study_pacts')
      .delete()
      .eq('id', pactId);

    if (error) throw error;
  },

  /**
   * Check and update status of active pacts
   * This would typically be called when a user completes a task
   */
  checkPactProgression: async (userId: string): Promise<void> => {
    // Logic to verify if goal_description (e.g. "Complete 5 tasks") is met
    // For simplicity, we can have a generic check or a specific one if goal is structured
    console.log(`Checking pacts for user ${userId}`);
  }
};
