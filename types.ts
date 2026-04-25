

export interface Plan {
  id: string;
  title: string;
  description?: string; // User provided description
  subject: string;
  totalDays: number;
  completedDays: number;
  progress: number; // 0 to 100
  dailyGoalMins: number;
  status?: 'Active' | 'Completed' | 'Archived';
  createdAt?: string;
  isArchived?: boolean;
  coverImage?: string; // Base64 Data URL for the AI-generated cover
  journal?: string; // For long-form user notes about the entire plan
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  updatedAt?: string;
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
  type: 'plan' | 'goal' | 'reminder' | 'system' | 'achievement';
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
}

export interface ProfileSettings {
  gradientTheme: string;
}

export interface User {
  id: string;
  role?: 'user' | 'admin';
  name: string;
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
  popularity: number;
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

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}