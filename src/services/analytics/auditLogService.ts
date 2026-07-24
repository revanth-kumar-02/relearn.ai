/**
 * Admin Audit Log Service
 * 
 * Records every admin action with full accountability trail.
 * Persists to Supabase with non-deletable entries.
 */

import { supabase } from '../../lib/supabase';

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: 'user' | 'plan' | 'room' | 'announcement' | 'system' | 'feedback' | 'newsletter';
  target_id?: string;
  target_label?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export type AuditAction = 
  | 'user.delete'
  | 'user.verify'
  | 'user.role_change'
  | 'user.password_reset'
  | 'user.resend_confirmation'
  | 'room.delete'
  | 'announcement.create'
  | 'announcement.delete'
  | 'system.maintenance_toggle'
  | 'system.status_update'
  | 'feedback.delete'
  | 'newsletter.broadcast'
  | 'newsletter.unsubscribe';

const ACTION_LABELS: Record<AuditAction, string> = {
  'user.delete': 'Deleted user',
  'user.verify': 'Force-verified user',
  'user.role_change': 'Changed user role',
  'user.password_reset': 'Sent password reset',
  'user.resend_confirmation': 'Resent confirmation email',
  'room.delete': 'Force-closed study room',
  'announcement.create': 'Created announcement',
  'announcement.delete': 'Deleted announcement',
  'system.maintenance_toggle': 'Toggled maintenance mode',
  'system.status_update': 'Updated system status',
  'feedback.delete': 'Deleted feedback',
  'newsletter.broadcast': 'Dispatched newsletter campaign',
  'newsletter.unsubscribe': 'Removed newsletter subscriber',
};

/**
 * Record an admin action to the audit log
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: AuditAction,
  targetType: AuditLogEntry['target_type'],
  targetId?: string,
  targetLabel?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    // Also log locally as fallback
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      admin_id: adminId,
      admin_email: adminEmail,
      action: ACTION_LABELS[action] || action,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      details,
      created_at: new Date().toISOString(),
    };

    // Try to persist to Supabase
    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: entry.admin_id,
        admin_email: entry.admin_email,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id,
        target_label: entry.target_label,
        details: entry.details,
        created_at: entry.created_at,
      });

    if (error) {
      // If table doesn't exist yet, persist locally
      console.warn('[AuditLog] Supabase insert failed, storing locally:', error.message);
      persistLocally(entry);
    }

    console.log(`[AuditLog] ${entry.action}: ${entry.target_label || entry.target_id || 'N/A'}`);
  } catch (err) {
    console.error('[AuditLog] Failed to record audit entry:', err);
  }
}

// Local persistence fallback
const LS_KEY = 'relearn_admin_audit_logs';

function persistLocally(entry: AuditLogEntry): void {
  try {
    const entries = getLocalEntries();
    entries.unshift(entry);
    if (entries.length > 500) entries.length = 500;
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {}
}

function getLocalEntries(): AuditLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch { return []; }
}

/**
 * Fetch audit log entries
 */
export async function getAuditLog(
  page: number = 1, 
  limit: number = 20,
  filterAction?: string
): Promise<{ data: AuditLogEntry[]; count: number }> {
  try {
    let query = supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filterAction) {
      query = query.eq('action', filterAction);
    }

    const { data, error, count } = await query;

    if (error) {
      console.warn('[AuditLog] Supabase fetch failed, using local:', error.message);
      const local = getLocalEntries();
      return { data: local.slice((page - 1) * limit, page * limit), count: local.length };
    }

    return { data: data || [], count: count || 0 };
  } catch {
    const local = getLocalEntries();
    return { data: local.slice((page - 1) * limit, page * limit), count: local.length };
  }
}

/**
 * Get human-readable label for an action
 */
export function getActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] || action;
}

/**
 * Migrate local logs to Supabase
 */
export async function migrateLocalAuditLogs(): Promise<void> {
  const localLogs = getLocalEntries();
  if (localLogs.length === 0) return;

  try {
    const { error } = await supabase
      .from('admin_audit_logs')
      .insert(localLogs.map(entry => ({
        admin_id: entry.admin_id,
        admin_email: entry.admin_email,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id,
        target_label: entry.target_label,
        details: entry.details,
        created_at: entry.created_at,
      })));

    if (!error) {
      console.log('[AuditLog] Successfully migrated local logs to Supabase.');
      localStorage.removeItem(LS_KEY); // Clear local logs once migrated
    } else {
      console.warn('[AuditLog] Failed to migrate local logs:', error.message);
    }
  } catch (err) {
    console.error('[AuditLog] Error migrating local logs:', err);
  }
}
