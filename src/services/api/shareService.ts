import { supabase } from '../../lib/supabase';
import { Plan, Task, SharedPlan } from '../../types/index';

export const sharePlan = async (plan: Plan, tasks: Task[], userId: string): Promise<string> => {
  const shareId = crypto.randomUUID();
  const slug = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${shareId.slice(0, 8)}`;

  const sharedData: Omit<SharedPlan, 'id' | 'createdAt'> = {
    title: plan.title,
    description: plan.description || '',
    subject: plan.subject,
    tasks: tasks.map(t => ({
      title: t.title,
      description: t.description || '',
      durationMinutes: t.durationMinutes
    })),
    authorId: userId,
    shareId: shareId,
    slug: slug,
    isPublic: true,
    views: 0,
    imports: 0
  };

  const { data, error } = await supabase
    .from('shared_plans')
    .insert([sharedData])
    .select()
    .single();

  if (error) {
    console.error('Error sharing plan:', error);
    throw new Error('Failed to create share link');
  }

  return slug;
};

export const getSharedPlanBySlug = async (slug: string): Promise<SharedPlan | null> => {
  const { data, error } = await supabase
    .from('shared_plans')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    if (error) console.error('Error fetching shared plan:', error);
    return null;
  }

  // Atomically increment view count
  try {
    const { data: updatedViews, error: rpcErr } = await supabase.rpc('increment_shared_plan_views', { p_slug: slug });
    if (!rpcErr && typeof updatedViews === 'number') {
      data.views = updatedViews;
    }
  } catch (err) {
    console.warn('[ShareService] Failed to increment view count:', err);
  }

  return data;
};

export const incrementImportCount = async (planId: string) => {
  try {
    const { error: rpcErr } = await supabase.rpc('increment_shared_plan_imports', { p_plan_id: planId });
    if (rpcErr) {
      console.warn('[ShareService] increment_shared_plan_imports RPC error:', rpcErr);
    }
  } catch (err) {
    console.warn('[ShareService] Failed to increment import count:', err);
  }
};
