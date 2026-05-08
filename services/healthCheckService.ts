import { supabase } from './supabase';

export interface HealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'critical';
  issues: HealthIssue[];
  stats: {
    totalUsers: number;
    totalPlans: number;
    totalTasks: number;
    orphanedTasks: number;
  };
}

export interface HealthIssue {
  id: string;
  type: 'orphan' | 'corruption' | 'missing_data' | 'api_limit';
  severity: 'low' | 'medium' | 'high';
  message: string;
  fixable: boolean;
  affectedTable: string;
}

export const healthCheckService = {
  /**
   * Runs a full diagnostic of the database and connected services
   */
  runFullDiagnostic: async (): Promise<HealthReport> => {
    const issues: HealthIssue[] = [];
    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues,
      stats: {
        totalUsers: 0,
        totalPlans: 0,
        totalTasks: 0,
        orphanedTasks: 0
      }
    };

    try {
      // 1. Check User Stats Corruption
      const { data: users, count: userCount } = await supabase
        .from('users')
        .select('id, stats', { count: 'exact' });
      
      report.stats.totalUsers = userCount || 0;
      users?.forEach(u => {
        if (u.stats && (u.stats.totalXP < 0 || u.stats.level < 1)) {
          issues.push({
            id: `user_${u.id}_stats`,
            type: 'corruption',
            severity: 'medium',
            message: `User ${u.id} has invalid stats (XP: ${u.stats.totalXP}, Level: ${u.stats.level})`,
            fixable: true,
            affectedTable: 'users'
          });
        }
      });

      // 2. Check for Orphaned Tasks
      // This is tricky without a join, but we can fetch all plans and tasks
      const [{ data: plans }, { data: tasks }] = await Promise.all([
        supabase.from('plans').select('id'),
        supabase.from('tasks').select('id, planId')
      ]);

      report.stats.totalPlans = plans?.length || 0;
      report.stats.totalTasks = tasks?.length || 0;

      const planIds = new Set(plans?.map(p => p.id));
      tasks?.forEach(t => {
        if (!planIds.has(t.planId)) {
          report.stats.orphanedTasks++;
          issues.push({
            id: `task_${t.id}_orphan`,
            type: 'orphan',
            severity: 'low',
            message: `Task ${t.id} is orphaned (Parent Plan ${t.planId} missing)`,
            fixable: true,
            affectedTable: 'tasks'
          });
        }
      });

      // 3. API Limit Check
      const { data: apiData } = await supabase
        .from('api_usage')
        .select('*')
        .eq('id', 'gemini_tokens')
        .single();
      
      if (apiData && apiData.used_tokens > apiData.limit_tokens * 0.9) {
        issues.push({
          id: 'api_limit_warning',
          type: 'api_limit',
          severity: 'high',
          message: `API Usage is at ${Math.round((apiData.used_tokens / apiData.limit_tokens) * 100)}% of limit`,
          fixable: false,
          affectedTable: 'api_usage'
        });
      }

      // Final Status
      if (issues.some(i => i.severity === 'high')) report.status = 'critical';
      else if (issues.length > 0) report.status = 'degraded';

      return report;
    } catch (err: any) {
      console.error('[HealthCheck] Diagnostic failed:', err);
      return {
        ...report,
        status: 'critical',
        issues: [{
          id: 'system_error',
          type: 'corruption',
          severity: 'high',
          message: `Health check failed to run: ${err.message}`,
          fixable: false,
          affectedTable: 'all'
        }]
      };
    }
  },

  /**
   * Attempts to fix a specific issue
   */
  fixIssue: async (issue: HealthIssue): Promise<boolean> => {
    try {
      if (issue.type === 'orphan' && issue.affectedTable === 'tasks') {
        // Delete orphaned task
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', issue.id.replace('task_', '').replace('_orphan', ''));
        if (error) throw error;
        return true;
      }

      if (issue.type === 'corruption' && issue.affectedTable === 'users') {
        // Reset user stats to minimums
        const userId = issue.id.replace('user_', '').replace('_stats', '');
        const { error } = await supabase
          .from('users')
          .update({ 
            stats: { 
              totalXP: 0, 
              level: 1, 
              streak: 0,
              completedTasks: 0,
              badges: []
            } 
          })
          .eq('id', userId);
        if (error) throw error;
        return true;
      }

      return false;
    } catch (err) {
      console.error('[HealthCheck] Failed to fix issue:', err);
      return false;
    }
  }
};
