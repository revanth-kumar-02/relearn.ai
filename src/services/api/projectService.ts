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
 * Generates initial high-quality curriculum projects anchored in the user's active learning plans.
 */
export async function seedInitialProjectsIfEmpty(userId: string, plans: Plan[]): Promise<ProjectLab[]> {
  const existing = await getUserProjects(userId);
  if (existing.length > 0) return existing;

  const initialProjects: ProjectLab[] = [];

  // Inspect existing plans
  const rustPlan = plans.find((p) => p.title.toLowerCase().includes('rust') || p.subject?.toLowerCase().includes('rust'));
  const flutterPlan = plans.find((p) => p.title.toLowerCase().includes('flutter') || p.subject?.toLowerCase().includes('dart'));

  if (rustPlan) {
    initialProjects.push({
      id: `proj-rust-${rustPlan.id || 'core'}`,
      planId: rustPlan.id,
      planTitle: rustPlan.title,
      topic: 'Rust Systems & Toolchain',
      title: 'Cargo CLI File Encryption Utility',
      tagline: 'Build a memory-safe command-line tool with Rust, Cargo subcommands, and stream encryption.',
      technology: 'Rust',
      difficulty: 'Beginner',
      estimatedMinutes: 90,
      status: 'in_progress',
      progress: 33,
      realWorldScenario:
        'Modern infrastructure teams require ultra-fast, zero-overhead command-line tools to encrypt sensitive deployment secrets before uploading to cloud buckets. In this project, you build a production-grade Rust CLI with Cargo.',
      techStack: ['Rust', 'Cargo', 'rustup', 'Clap CLI Parser', 'SHA-256'],
      architecture: {
        components: [
          'CLI Argument Parser (Clap/Args)',
          'Cryptographic Cipher Stream Engine',
          'Buffered File I/O Pipeline'
        ],
        dataFlow: 'Standard input/CLI flags -> File Buffer Stream -> XOR/AES Cipher Transformation -> Output Artifact',
        keyChallenges: [
          'Handling file buffer ownership without unnecessary memory allocations',
          'Graceful Rust Result<T, E> error propagation with the ?-operator'
        ]
      },
      milestones: [
        {
          id: 'm1',
          title: 'Milestone 1: Scaffold Rust Project with Cargo',
          objective: 'Initialize a binary Cargo package, configure dependencies, and parse arguments.',
          starterHint: 'Use cargo new --bin secret_cli and configure the main entrypoint in src/main.rs.',
          criteria: [
            'Create Cargo.toml with binary metadata',
            'Implement CLI argument parsing in src/main.rs',
            'Handle missing argument errors with informative help text'
          ],
          completedCriteria: { 'Create Cargo.toml with binary metadata': true },
          completed: true,
          starterCode: {
            language: 'rust',
            filename: 'src/main.rs',
            code: `use std::env;
use std::process;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("Usage: {} <encrypt|decrypt> <filename>", args[0]);
        process::exit(1);
    }

    let command = &args[1];
    let filename = &args[2];
    println!("Executing {} on file: {}", command, filename);
}
`
          }
        },
        {
          id: 'm2',
          title: 'Milestone 2: Implement Buffered File I/O & Cipher Transformation',
          objective: 'Read input files as byte streams and apply a key-based XOR transformation.',
          starterHint: 'Use std::fs::File and std::io::BufReader to process large files without exhausting RAM.',
          criteria: [
            'Safely open files using std::fs::read',
            'Transform byte buffer with a secret key without memory leaks',
            'Write resulting bytes to an output destination'
          ],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'rust',
            filename: 'src/cipher.rs',
            code: `pub fn process_bytes(data: &[u8], key: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, &byte)| byte ^ key[i % key.len()])
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_symmetric_cipher() {
        let text = b"Relearn.ai Rust Project";
        let key = b"secret_key_123";
        let encrypted = process_bytes(text, key);
        let decrypted = process_bytes(&encrypted, key);
        assert_eq!(text.to_vec(), decrypted);
    }
}
`
          }
        },
        {
          id: 'm3',
          title: 'Milestone 3: Verification, Cargo Tests & Error Handling',
          objective: 'Implement robust unit tests with cargo test and clean exit codes.',
          starterHint: 'Ensure invalid file paths return clear errors without panic!().',
          criteria: [
            'Add unit tests verifying reversible encryption',
            'Pass all cargo test assertions',
            'Benchmark throughput with a 1MB payload'
          ],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'rust',
            filename: 'tests/integration_test.rs',
            code: `// Run with: cargo test --test integration_test

#[test]
fn test_cli_end_to_end() {
    println!("Cargo integration test verifying zero-allocation buffer pipeline.");
    assert!(true);
}
`
          }
        }
      ],
      testChecklist: [
        'cargo check compiles with zero warnings',
        'cargo test passes all unit tests',
        'Command handles missing file paths gracefully'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (flutterPlan) {
    initialProjects.push({
      id: `proj-flutter-${flutterPlan.id || 'core'}`,
      planId: flutterPlan.id,
      planTitle: flutterPlan.title,
      topic: 'Flutter Architecture & State',
      title: 'Habit Tracker with Provider & SQLite',
      tagline: 'Create a cross-platform mobile habit tracker with reactive state management and offline persistence.',
      technology: 'Flutter',
      difficulty: 'Intermediate',
      estimatedMinutes: 120,
      status: 'in_progress',
      progress: 0,
      realWorldScenario:
        'Mobile productivity applications must maintain instant 60fps UI rendering while safely syncing user streaks and daily habits to local offline storage.',
      techStack: ['Flutter SDK', 'Dart 3', 'Provider', 'sqflite', 'Material 3'],
      architecture: {
        components: [
          'Presentation Layer (HabitCard, StreakCalendar)',
          'State Controller (HabitProvider with ChangeNotifier)',
          'Repository Layer (DatabaseHelper / SQLite)'
        ],
        dataFlow: 'User Tap -> Provider Action -> SQLite Transaction -> ChangeNotifier Notification -> Widget Re-render',
        keyChallenges: [
          'Managing immutable Habit models without UI stutter',
          'Ensuring streak calculation logic handles timezones accurately'
        ]
      },
      milestones: [
        {
          id: 'm1',
          title: 'Milestone 1: Scaffold Data Model & State Provider',
          objective: 'Define the immutable Habit model and ChangeNotifier provider.',
          starterHint: 'Create habit.dart and habit_provider.dart in lib/models/ and lib/providers/.',
          criteria: [
            'Create Habit model with id, title, streak, and isCompletedToday',
            'Implement ChangeNotifier with addHabit and toggleHabit methods',
            'Notify listeners upon state change'
          ],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'dart',
            filename: 'lib/models/habit.dart',
            code: `class Habit {
  final String id;
  final String title;
  final int streak;
  final bool isCompletedToday;

  Habit({
    required this.id,
    required this.title,
    this.streak = 0,
    this.isCompletedToday = false,
  });

  Habit copyWith({int? streak, bool? isCompletedToday}) {
    return Habit(
      id: id,
      title: title,
      streak: streak ?? this.streak,
      isCompletedToday: isCompletedToday ?? this.isCompletedToday,
    );
  }
}
`
          }
        },
        {
          id: 'm2',
          title: 'Milestone 2: Build Responsive Material 3 Habit List View',
          objective: 'Assemble the interactive ListView with animated check toggles.',
          starterHint: 'Use Consumer<HabitProvider> to rebuild only affected habit list tiles.',
          criteria: [
            'Create HabitTile widget with tactile tap feedback',
            'Display current streak badge with fire icon',
            'Handle empty state when no habits exist'
          ],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'dart',
            filename: 'lib/screens/habit_screen.dart',
            code: `import 'package:flutter/material.dart';

class HabitScreen extends StatelessWidget {
  const HabitScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Daily Habits')),
      body: const Center(
        child: Text('Implement Habit ListView with Consumer<HabitProvider>'),
      ),
    );
  }
}
`
          }
        },
        {
          id: 'm3',
          title: 'Milestone 3: Local SQLite Storage & Verification',
          objective: 'Persist habit streak records locally using sqflite transactions.',
          starterHint: 'Initialize database connection in database_helper.dart.',
          criteria: [
            'Initialize SQLite database on app launch',
            'Load saved habits into Provider on startup',
            'Verify habit toggles persist across app restarts'
          ],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'dart',
            filename: 'lib/services/database_helper.dart',
            code: `// SQLite database persistence helper for Flutter habits
// Run tests with: flutter test
`
          }
        }
      ],
      testChecklist: [
        'flutter analyze returns zero lint warnings',
        'flutter test passes model and provider tests',
        'UI maintains 60fps on streak update'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // If no matching plan, provide a Universal Fullstack/JavaScript starter project
  if (initialProjects.length === 0) {
    initialProjects.push({
      id: 'proj-fullstack-starter',
      topic: 'Fullstack Web Architecture',
      title: 'Real-Time State Synchronization Engine',
      tagline: 'Build an offline-first data sync engine with local optimistic updates and conflict resolution.',
      technology: 'TypeScript',
      difficulty: 'Intermediate',
      estimatedMinutes: 90,
      status: 'in_progress',
      progress: 0,
      realWorldScenario:
        'Modern collaborative web applications require robust optimistic UI updates that immediately respond to user clicks and sync cleanly with remote servers when online.',
      techStack: ['TypeScript', 'Web Workers', 'IndexedDB', 'WebSocket'],
      architecture: {
        components: ['Optimistic Mutation Queue', 'Network Status Watcher', 'LWW Conflict Resolver'],
        dataFlow: 'Client Action -> Optimistic Cache Update -> Background Queue -> Remote Sync Engine',
        keyChallenges: ['Resolving merge conflicts between concurrent client edits', 'Handling retry backoff during network drops']
      },
      milestones: [
        {
          id: 'm1',
          title: 'Milestone 1: Scaffold Optimistic Mutation Queue',
          objective: 'Define transaction models and in-memory queue management.',
          starterHint: 'Implement enqueue, dequeue, and peek operations.',
          criteria: ['Define Mutation interface', 'Implement FIFO queue with unique IDs', 'Add retry count tracking'],
          completedCriteria: {},
          completed: false,
          starterCode: {
            language: 'javascript',
            filename: 'src/syncQueue.js',
            code: `export class MutationQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(mutation) {
    this.queue.push({ ...mutation, id: crypto.randomUUID(), retries: 0 });
  }

  getPending() {
    return this.queue;
  }
}
`
          }
        }
      ],
      testChecklist: ['Queue maintains FIFO order', 'Mutations are resilient to browser crashes'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  lsSet(key, initialProjects);
  return initialProjects;
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
