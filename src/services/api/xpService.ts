import { supabase } from '../../lib/supabase';

export const xpService = {
  async logXP(userId: string, amount: number, sourceType: 'marathon' | 'pact' | 'streak' | 'task' | 'quiz' | 'flashcard' | 'session' | 'general', sourceId?: string) {
    if (!userId || amount <= 0) return { newTotalXP: 0, newLevel: 1 };

    // 1. Primary path: atomic PostgreSQL RPC execution (logs XP & updates users.xp, invoking on_xp_change trigger)
    try {
      const { data, error } = await supabase.rpc('record_user_xp', {
        p_user_id: userId,
        p_amount: amount,
        p_source_type: sourceType,
        p_source_id: sourceId || null
      });

      if (!error && data) {
        return {
          newTotalXP: data.totalXP || amount,
          newLevel: data.level || 1
        };
      }
      if (error) {
        console.warn('[XPService] RPC record_user_xp error:', error);
      }
    } catch (rpcErr) {
      console.warn('[XPService] RPC record_user_xp exception:', rpcErr);
    }

    // 2. Fallback: Log the XP entry
    try {
      await supabase
        .from('xp_logs')
        .insert({
          user_id: userId,
          xp_amount: amount,
          source_type: sourceType,
          source_id: sourceId
        });
    } catch (logError) {
      console.warn('[XPService] xp_logs insert fallback failed:', logError);
    }

    // 3. Fallback: Update user XP directly (database on_xp_change trigger computes level automatically)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return { newTotalXP: amount, newLevel: 1 };
    }

    const newXp = (user.xp || 0) + amount;
    const { data: updatedUser } = await supabase
      .from('users')
      .update({ xp: newXp })
      .eq('id', userId)
      .select('xp, level')
      .single();

    return { 
      newTotalXP: updatedUser?.xp ?? newXp, 
      newLevel: updatedUser?.level ?? (Math.floor(Math.sqrt(newXp / 100)) + 1)
    };
  }
};
