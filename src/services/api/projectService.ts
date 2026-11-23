/**
 * ─────────────────────────────────────────────────────────────────
 *  Relearn.ai — Dedicated Project Service & Persistence Layer
 * ─────────────────────────────────────────────────────────────────
 *
 *  Supabase-first with offline-localStorage fallback.
 *  Manages hands-on project labs, cloud workspace sync,
 *  milestone tracking, and persistent metrics.
 */

import { supabase, supabaseAvailable } from '../../lib/supabase';
import { lsGet, lsSet } from '../storage/storageService';
import { ProjectLab, ProjectMilestone, generateProjectLab } from '../ai/projectLabService';
import { ProjectBlueprint, synthesizeProjectFromBlueprint } from '../ai/projectBlueprintService';
import { Plan } from '../../types';

export interface ProjectOverviewStats {
  total: number;
  active: number;
  completed: number;
  notStarted: number;
  averageProgress: number;
}

const STORAGE_KEY_PREFIX = 'projects_v1_';

function canUseSupabase(): boolean {
  return supabaseAvailable && (typeof navigator === 'undefined' || navigator.onLine);
}

/**
 * Maps a Supabase project_workspaces database record to a client-side ProjectLab object.
 */
function mapDatabaseRowToProjectLab(row: any): ProjectLab {
  const meta = row.metadata || {};
  return {
    id: row.projectId,
    topic: meta.topic || row.title,
    title: row.title,
    tagline: meta.tagline || `Engineering project in ${row.technology}`,
    difficulty: (row.difficulty as any) || 'Intermediate',
    estimatedMinutes: Number(meta.estimatedMinutes) || 60,
    realWorldScenario: meta.realWorldScenario || '',
    technology: row.technology,
    planId: row.planId || undefined,
    planTitle: meta.planTitle || undefined,
    status: (row.status as any) || 'not_started',
    progress: typeof meta.progress === 'number' ? meta.progress : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    techStack: Array.isArray(meta.techStack) ? meta.techStack : [row.technology],
    architecture: meta.architecture || {
      components: [row.technology],
      dataFlow: 'Input -> Processing -> Output',
      keyChallenges: [],
    },
    milestones: Array.isArray(meta.milestones) ? meta.milestones : [],
    testChecklist: Array.isArray(meta.testChecklist) ? meta.testChecklist : [],
    solutionPreview: meta.solutionPreview,
    files: Array.isArray(row.files) && row.files.length > 0 ? row.files : (meta.files || []),
  };
}

/**
 * Retrieves all persisted projects for a user (Supabase-first with localStorage fallback).
 */
export async function getUserProjects(userId: string): Promise<ProjectLab[]> {
  if (!userId) return [];
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const localProjects = lsGet<ProjectLab[]>(key, []);

  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('project_workspaces')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        const remoteProjects: ProjectLab[] = data.map(mapDatabaseRowToProjectLab);

        // Merge remote projects with local projects (remote takes precedence on matching IDs,
        // but local projects not yet in Supabase are preserved)
        const remoteMap = new Map(remoteProjects.map((p) => [p.id, p]));
        const merged: ProjectLab[] = [...remoteProjects];

        for (const localP of localProjects) {
          if (!remoteMap.has(localP.id)) {
            merged.push(localP);
            // Opportunistically sync unsynced local project to Supabase
            saveProject(userId, localP).catch(() => {});
          }
        }

        lsSet(key, merged);
        return merged;
      }
    } catch (err) {
      console.warn('[ProjectService] Supabase getUserProjects failed, falling back to local cache:', err);
    }
  }

  return localProjects;
}

/**
 * Retrieves a single project by ID.
 */
export async function getProjectById(userId: string, projectId: string): Promise<ProjectLab | null> {
  if (!userId || !projectId) return null;

  if (canUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('project_workspaces')
        .select('*')
        .eq('userId', userId)
        .eq('projectId', projectId)
        .maybeSingle();

      if (!error && data) {
        return mapDatabaseRowToProjectLab(data);
      }
    } catch (err) {
      console.warn('[ProjectService] Supabase getProjectById failed, falling back to local cache:', err);
    }
  }

  const projects = await getUserProjects(userId);
  return projects.find((p) => p.id === projectId) || null;
}

/**
 * Saves or updates a project in persistent storage (Optimistic local cache + Supabase sync).
 */
export async function saveProject(userId: string, project: ProjectLab): Promise<void> {
  if (!userId || !project.id) return;
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const projects = lsGet<ProjectLab[]>(key, []);
  const index = projects.findIndex((p) => p.id === project.id);

  const updatedProject: ProjectLab = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    projects[index] = updatedProject;
  } else {
    projects.unshift({
      ...updatedProject,
      createdAt: updatedProject.createdAt || new Date().toISOString(),
    });
  }

  lsSet(key, projects);

  // Sync to Supabase cloud database
  if (canUseSupabase()) {
    try {
      // Validate planId format (must be valid UUID for foreign key, otherwise null)
      const isValidUUID =
        project.planId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.planId);

      const payload = {
        userId,
        planId: isValidUUID ? project.planId : null,
        projectId: project.id,
        title: project.title,
        technology: project.technology || 'General',
        difficulty: project.difficulty || 'Intermediate',
        status: project.status || 'not_started',
        files: project.files || [],
        metadata: {
          topic: project.topic,
          tagline: project.tagline,
          estimatedMinutes: project.estimatedMinutes,
          realWorldScenario: project.realWorldScenario,
          planTitle: project.planTitle,
          techStack: project.techStack,
          architecture: project.architecture,
          milestones: project.milestones,
          testChecklist: project.testChecklist,
          solutionPreview: project.solutionPreview,
          progress: project.progress,
        },
        updatedAt: updatedProject.updatedAt,
      };

      const { error } = await supabase
        .from('project_workspaces')
        .upsert(payload, { onConflict: 'userId,projectId' });

      if (error) {
        console.warn('[ProjectService] Supabase workspace upsert error:', error.message);
      }
    } catch (err) {
      console.warn('[ProjectService] Failed to sync project workspace to Supabase:', err);
    }
  }
}

/**
 * Updates progress for a milestone within a project.
 */
export async function updateMilestoneProgress(
  userId: string,
  projectId: string,
  milestoneId: string,
  completed: boolean,
  completedCriteria?: Record<string, boolean>
): Promise<ProjectLab | null> {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const milestone = project.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return project;

  milestone.completed = completed;
  if (completedCriteria) {
    milestone.completedCriteria = completedCriteria;
  }

  // Recalculate project progress
  const completedCount = project.milestones.filter((m) => m.completed).length;
  const totalCount = project.milestones.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  project.progress = progressPercent;
  if (progressPercent === 100) {
    project.status = 'completed';
  } else if (progressPercent > 0) {
    project.status = 'in_progress';
  } else {
    project.status = 'not_started';
  }

  await saveProject(userId, project);

  // Sync to project_milestone_progress table if workspace exists in Supabase
  if (canUseSupabase()) {
    try {
      const { data: wsRow } = await supabase
        .from('project_workspaces')
        .select('id')
        .eq('userId', userId)
        .eq('projectId', projectId)
        .maybeSingle();

      if (wsRow?.id) {
        await supabase
          .from('project_milestone_progress')
          .upsert(
            {
              workspaceId: wsRow.id,
              milestoneId,
              completed,
              completedCriteria: completedCriteria || {},
              verifiedAt: completed ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'workspaceId,milestoneId' }
          );
      }
    } catch (err) {
      console.warn('[ProjectService] Failed to sync milestone progress to Supabase:', err);
    }
  }

  return project;
}

/**
 * Deletes a project.
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  if (!userId || !projectId) return;
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const projects = lsGet<ProjectLab[]>(key, []);
  const filtered = projects.filter((p) => p.id !== projectId);
  lsSet(key, filtered);

  if (canUseSupabase()) {
    try {
      await supabase
        .from('project_workspaces')
        .delete()
        .eq('userId', userId)
        .eq('projectId', projectId);
    } catch (err) {
      console.warn('[ProjectService] Failed to delete project from Supabase:', err);
    }
  }
}

/**
 * Computes live metrics across user projects.
 */
export function calculateProjectStats(projects: ProjectLab[]): ProjectOverviewStats {
  const total = projects.length;
  if (total === 0) {
    return { total: 0, active: 0, completed: 0, notStarted: 0, averageProgress: 0 };
  }

  const completed = projects.filter((p) => p.status === 'completed' || (p.progress ?? 0) === 100).length;
  const active = projects.filter(
    (p) => p.status === 'in_progress' || ((p.progress ?? 0) > 0 && (p.progress ?? 0) < 100)
  ).length;
  const notStarted = projects.filter(
    (p) => !p.status || p.status === 'not_started' || (p.progress ?? 0) === 0
  ).length;

  const totalProgress = projects.reduce((acc, curr) => acc + (curr.progress || 0), 0);
  const averageProgress = Math.round(totalProgress / total);

  return {
    total,
    active,
    completed,
    notStarted,
    averageProgress,
  };
}

/**
 * Automatically purges legacy mock starter projects (proj-rust-*, proj-flutter-*, proj-fullstack-*)
 * from the user's localStorage so their screen starts 100% clean.
 */
export async function purgeLegacyMockProjects(userId: string): Promise<ProjectLab[]> {
  if (!userId) return [];
  const projects = await getUserProjects(userId);
  const cleaned = projects.filter((p) => {
    const isMockId =
      p.id.startsWith('proj-rust-') ||
      p.id.startsWith('proj-flutter-') ||
      p.id === 'proj-fullstack-starter';
    const isMockTitle =
      (p.title === 'Cargo CLI File Encryption Utility' && p.id.startsWith('proj-rust-')) ||
      (p.title.includes('Habit Tracker with Provider') && p.id.startsWith('proj-flutter-'));
    return !isMockId && !isMockTitle;
  });

  if (cleaned.length !== projects.length) {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    lsSet(key, cleaned);
  }

  // Also clean up any legacy blueprint cache keys containing "AI Generated"
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith('blueprints_tier_v3_') || k.startsWith('blueprints_llm_v2_') || k.startsWith('blueprints_v1_'))) {
          const val = window.localStorage.getItem(k);
          if (val && val.includes('AI Generated')) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // Ignore in non-browser environments
    }
  }

  return cleaned;
}

/**
 * Deprecated: Previously seeded hardcoded projects.
 * Cleanly returns genuine user projects without injecting mock data.
 */
export async function seedInitialProjectsIfEmpty(userId: string, _plans: Plan[]): Promise<ProjectLab[]> {
  return purgeLegacyMockProjects(userId);
}

/**
 * Synthesizes and launches a new hands-on project lab from a chosen ProjectBlueprint.
 */
export async function launchProjectFromBlueprint(
  userId: string,
  blueprint: ProjectBlueprint,
  plan: Plan
): Promise<ProjectLab> {
  const lab = synthesizeProjectFromBlueprint(userId, blueprint, plan);
  await saveProject(userId, lab);
  return lab;
}

/**
 * Generates and saves a new hands-on project lab based on a user's plan.
 */
export async function generateProjectFromPlan(userId: string, plan: Plan): Promise<ProjectLab> {
  const lab = await generateProjectLab(
    plan.subject,
    plan.subject,
    plan.description || plan.subject,
    plan.difficulty || 'Intermediate',
    plan.id,
    plan.subject || plan.title
  );

  const enrichedLab: ProjectLab = {
    ...lab,
    planId: plan.id,
    planTitle: plan.subject || plan.title,
    technology: plan.subject,
    status: 'not_started',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveProject(userId, enrichedLab);
  return enrichedLab;
}
