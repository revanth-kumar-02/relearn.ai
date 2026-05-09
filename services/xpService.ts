import { supabase } from './supabase';

export const xpService = {
  async logXP(userId: string, amount: number, sourceType: 'marathon' | 'pact' | 'streak' | 'task', sourceId?: string) {
    // 1. Log the XP entry
    const { error: logError } = await supabase
      .from('xp_logs')
      .insert({
        user_id: userId,
        xp_amount: amount,
        source_type: sourceType,
        source_id: sourceId
      });

    if (logError) throw logError;

    // 2. Fetch current user stats
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stats, xp, level')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // 3. Calculate new totals
    const currentTotalXP = (user.stats?.totalXP || 0) + amount;
    // Simple level logic: every 1000 XP is a level
    const newLevel = Math.floor(currentTotalXP / 1000) + 1;

    // 4. Update user stats
    const { error: updateError } = await supabase
      .from('users')
      .update({
        xp: (user.xp || 0) + amount, // Legacy xp column if still used
        level: newLevel,
        stats: {
          ...user.stats,
          totalXP: currentTotalXP,
          level: newLevel
        }
      })
      .eq('id', userId);

    if (updateError) throw updateError;
    
    return { newTotalXP: currentTotalXP, newLevel };
  }
};
