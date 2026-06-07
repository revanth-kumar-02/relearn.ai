

export type PlanStatus = 'active' | 'completed' | 'archived' | 'cancelled';

export interface Plan {
  id: string;
  title: string;
  description?: string; // User provided description
  subject: string;
  totalDays: number;
  completedDays: number;
  progress: number; // 0 to 100
  dailyGoalMins: number;
  status: PlanStatus;
  createdAt?: string;
  isArchived?: boolean;
  coverImage?: string; // Base64 Data URL for the AI-generated cover
  journal?: string; // For long-form user notes about the entire plan
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  updatedAt?: string;
  isTeamPlan?: boolean;
  teamMembers?: string[];
  isImported?: boolean;
}

export interface Task {
  id: string;
  title: string;
  subtitle?: string; // For dashboard display
  description: string;
  durationMinutes: number;
  dueDate: string; // YYYY-MM-DD
  status: 'Not Started' | 'In Progress' | 'Completed';
  planId?: string;
  tags: string[];
  type: 'assignment' | 'quiz' | 'reading' | 'coding'; // For icons
  color?: string; // For dashboard UI
  bgColor?: string; // For dashboard UI
  notes?: string; // User notes from study session
  completedAt?: string; // ISO Date string for completion time
  createdAt?: string;
  priority?: 'Low' | 'Medium' | 'High';
  learningObjective?: string;
  aiExplanation?: string;
  practiceActivities?: string[];
  resources?: { title: string; url: string; type: 'video' | 'article' | 'link' }[];
  practiceQuestion?: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  bg: string;
}

export interface Notification {
  id: string;
  type: 'plan' | 'goal' | 'reminder' | 'system' | 'achievement' | 'friend_request';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface DiaryEntry {
  id:string;
  title: string;
  category: string;
  description: string;
  image: string;
  impactScore?: number;
  lastEngagement?: string;
  isNew?: boolean;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  videoLanguage?: string; // e.g. "en", "es"
  contentLanguage?: string; // e.g. "en", "es"
  aiPersona?: string; // e.g. "Strict Professor", "Chill Friend"
  learningStyle?: string; // e.g. "Pirate", "Socratic"
  notifications: {
    dailyReminder: boolean;
    dailyReminderTime: string; // "09:00"
    progressUpdates: boolean;
    newPlanSuggestions: boolean;
    streakNotifications: boolean;
    taskOverdueAlerts: boolean;
  };
}

export interface UserStats {
  studyStreak: number;
  longestStreak: number;
  totalStudyHours: number;
  plansCreated: number;
  plansCompleted: number;
  totalXP: number;
  level: number;
  badges: string[];
  lastStudyDate?: string;
  streakFreezes: number;
  totalTasksCompleted?: number;
  totalQuizzesCompleted?: number;
  totalMessagesSent?: number;
  totalPDFExports?: number;
  totalAIPlansGenerated?: number;
  quizPerfectScores?: number;
  subjectMastery?: Record<string, number>; // subject -> mastery percentage (0-100)
}

export interface ProfileSettings {
  gradientTheme: string;
}

export interface User {
  id: string;
  role?: 'user' | 'admin';
  name: string;
  username?: string; // Short unique ID/handle
  email: string;
  password?: string;
  profilePicture?: string; // Base64 string or URL
  preferences?: UserPreferences;
  profileSettings?: ProfileSettings;
  academicLevel?: string;
  learningGoals?: string[];
  preferredStudyTime?: string;
  weakSubjects?: string[];
  strongSubjects?: string[];
  stats?: UserStats;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanTemplate {
  id: string;
  title: string;
  description: string;
  subject: string;
  category: 'programming' | 'science' | 'math' | 'language' | 'business' | 'creative';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  totalDays: number;
  dailyGoalMins: number;
  coverGradient: string;
  icon: string;
  rating: number;
  days: Array<{
    day: number;
    topic: string;
    guidance: string;
  }>;
}

export interface SharedPlan {
  id: string;
  title: string;
  description: string;
  subject: string;
  tasks: {
    title: string;
    description: string;
    durationMinutes: number;
  }[];
  authorId: string;
  shareId: string;
  slug: string;
  isPublic: boolean;
  views: number;
  imports: number;
  createdAt: string;
}

export interface StudyRoom {
  id: string;
  name: string;
  host_id: string;
  room_code: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
  settings: {
    timer: number;
    break: number;
    longBreak: number;
  };
  shared_notes?: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  status: 'studying' | 'break' | 'idle';
  current_task?: string;
  joined_at: string;
  last_active_at: string;
  study_minutes_session: number;
}

export interface Marathon {
  id: string;
  title: string;
  description: string;
  task_goal: number;
  xp_reward: number;
  banner_image?: string;
  participant_count: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
}

export interface MarathonParticipant {
  id: string;
  marathon_id: string;
  user_id: string;
  progress: number;
  completed: boolean;
  joined_at: string;
  completed_at?: string;
}

export interface XPLog {
  id: string;
  user_id: string;
  source_type: 'marathon' | 'pact' | 'streak' | 'task';
  source_id?: string;
  xp_amount: number;
  created_at: string;
}

export interface StudyPact {
  id: string;
  creator_id: string;
  target_id: string;
  creator_name: string;
  target_name: string;
  goal_description: string;
  stakes: string;
  deadline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  created_at: string;
  completed_at?: string;
}

export interface PublicChallenge {
  id: string;
  title: string;
  description: string;
  subject: string;
  xp_reward: number;
  badge_reward?: string;
  start_date: string;
  end_date: string;
  participants_count: number;
  goal_criteria: {
    type: 'tasks_completed' | 'xp_earned' | 'quiz_score';
    target: number;
  };
}

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}