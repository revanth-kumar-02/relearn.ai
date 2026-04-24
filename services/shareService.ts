import { supabase } from './supabase';
import { Plan, Task, SharedPlan } from '../types';

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

  if (error) {
    console.error('Error fetching shared plan:', error);
    return null;
  }

  // Increment view count
  await supabase
    .from('shared_plans')
    .update({ views: (data.views || 0) + 1 })
    .eq('id', data.id);

  return data;
};

export const incrementImportCount = async (planId: string) => {
  const { data } = await supabase
    .from('shared_plans')
    .select('imports')
    .eq('id', planId)
    .single();
    
  await supabase
    .from('shared_plans')
    .update({ imports: (data?.imports || 0) + 1 })
    .eq('id', planId);
};
