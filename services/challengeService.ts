import { supabase } from './supabase';
import { PublicChallenge } from '../types';

export const challengeService = {
  /**
   * Fetch all active global challenges
   */
  getChallenges: async (): Promise<PublicChallenge[]> => {
    const { data, error } = await supabase
      .from('public_challenges')
      .select('*')
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Join a challenge
   */
  joinChallenge: async (challengeId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        joined_at: new Date().toISOString(),
        progress: 0
      });

    if (error) throw error;

    // Increment participant count
    await supabase.rpc('increment_challenge_participants', { challenge_id: challengeId });
  },

  /**
   * Get user's progress in joined challenges
   */
  getUserChallenges: async (userId: string) => {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('*, challenge:public_challenges(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }
};
