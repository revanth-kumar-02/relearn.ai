/**
 * ─────────────────────────────────────────────────────────────────
 *  Learning Analytics Service
 * ─────────────────────────────────────────────────────────────────
 *
 *  Tracks lifecycle events and engagement depth without 
 *  external dependencies (privacy-first).
 */

type EventType = 
  | 'app_launch' 
  | 'plan_created' 
  | 'session_started' 
  | 'session_completed' 
  | 'task_updated' 
  | 'preferences_changed'
  | 'manual_generation_skipped_pdf';

interface AnalyticsPayload {
  timestamp: string;
  eventType: EventType;
  metadata?: Record<string, any>;
  sessionDuration?: number;
}

const STORAGE_KEY = 'relearn_analytics_v1';

class AnalyticsService {
  private events: AnalyticsPayload[] = [];

  constructor() {
    this.loadEvents();
  }

  private loadEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.events = saved ? JSON.parse(saved) : [];
    } catch (e) {}
  }

  private saveEvents() {
    try {
      // Keep only last 200 events to prevent storage bloat
      if (this.events.length > 200) {
        this.events = this.events.slice(-200);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch (e) {}
  }

  public track(eventType: EventType, metadata?: Record<string, any>) {
    const payload: AnalyticsPayload = {
      timestamp: new Date().toISOString(),
      eventType,
      metadata
    };

    this.events.push(payload);
    this.saveEvents();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] 📊 EVENT: ${eventType}`, metadata);
    }
  }

  public startSession(taskId: string) {
    const startTime = Date.now();
    this.track('session_started', { taskId, startTime });
    return startTime;
  }

  public endSession(taskId: string, startTime: number) {
    const sessionDuration = Math.round((Date.now() - startTime) / 1000);
    this.track('session_completed', { taskId, sessionDuration });
  }

  public getRecentEvents(count: number = 10) {
    return this.events.slice(-count).reverse();
  }

  /**
   * Performance Audit: Calculate deep engagement score
   */
  public getLevelOfDeepEngagement(): number {
    const sessions = this.events.filter(e => e.eventType === 'session_completed');
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((acc, s) => acc + (s.metadata?.sessionDuration || 0), 0);
    return Math.min(100, (totalDuration / 3600) * 10); // 10 points per hour of deep learning
  }
}

export const analytics = new AnalyticsService();
