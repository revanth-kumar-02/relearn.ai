/**
 * ─────────────────────────────────────────────────────────────────
 *  Relearn.ai — Dedicated Project Service & Persistence Layer
 * ─────────────────────────────────────────────────────────────────
 *
 *  Manages real-world hands-on projects, milestone tracking,
 *  acceptance verification, and persistent metrics.
 */

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

/**
 * Retrieves all persisted projects for a user.
 */
export async function getUserProjects(userId: string): Promise<ProjectLab[]> {
  if (!userId) return [];
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  return lsGet<ProjectLab[]>(key, []);
}

/**
 * Retrieves a single project by ID.
 */
export async function getProjectById(userId: string, projectId: string): Promise<ProjectLab | null> {
  const projects = await getUserProjects(userId);
  return projects.find((p) => p.id === projectId) || null;
}

/**
 * Saves or updates a project in persistent storage.
 */
export async function saveProject(userId: string, project: ProjectLab): Promise<void> {
  if (!userId || !project.id) return;
  const projects = await getUserProjects(userId);
  const index = projects.findIndex((p) => p.id === project.id);

  const updatedProject = {
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

  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  lsSet(key, projects);
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
  return project;
}

/**
 * Deletes a project.
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  if (!userId) return;
  const projects = await getUserProjects(userId);
  const filtered = projects.filter((p) => p.id !== projectId);
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  lsSet(key, filtered);
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
  const active = projects.filter((p) => p.status === 'in_progress' || ((p.progress ?? 0) > 0 && (p.progress ?? 0) < 100)).length;
  const notStarted = projects.filter((p) => !p.status || p.status === 'not_started' || (p.progress ?? 0) === 0).length;

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
        if (k && (k.startsWith('blueprints_llm_v2_') || k.startsWith('blueprints_v1_'))) {
          const val = window.localStorage.getItem(k);
          if (val && val.includes('AI Generated')) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch {
      // Ignore in non-browser environments
    }
  }

  return cleaned;
}

/**
 * Deprecated: Previously seeded hardcoded projects.
 * Now cleanly returns genuine user projects without injecting any mock data.
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
