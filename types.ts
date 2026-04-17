

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
  type: 'plan' | 'goal' | 'reminder' | 'system';
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
  totalStudyHours: number;
  plansCreated: number;
  plansCompleted: number;
}

export interface ProfileSettings {
  gradientTheme: string;
}

export interface User {
  id: string;
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