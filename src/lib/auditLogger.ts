import { AuditLogEntry, LogCategory, LogLevel, AuditLogActor } from '../types';
import { computeHash } from './integrity';

const AUDIT_LOGS_STORAGE_KEY = 'hw_audit_logs_v2';
const MAX_LOGS = 500;

/**
 * Loads audit logs from storage.
 */
export function loadAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (!raw) {
      // Seed an initial system bootstrap log
      const initial: AuditLogEntry = {
        id: 'log-init-001',
        timestamp: new Date().toISOString(),
        category: 'security',
        action: '日誌系統啟動',
        level: 'info',
        actor: {
          username: 'System',
          displayName: '系統安全核心',
          role: 'admin',
        },
        target: 'AuditLogger',
        details: '系統日誌服務與完整性 Hash 雜湊保護機制已就緒。',
        hash: computeHash('INIT_ROOT_HASH::' + new Date().toISOString()),
      };
      saveAuditLogs([initial]);
      return [initial];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return [];
  }
}

/**
 * Saves audit logs with hash protection.
 */
function saveAuditLogs(logs: AuditLogEntry[]): void {
  try {
    // Keep max logs to prevent storage exhaustion
    const sliced = logs.slice(0, MAX_LOGS);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(sliced));
  } catch (err) {
    console.error('Failed to save audit logs:', err);
  }
}

/**
 * Records an audit log entry with SHA-256 cryptographic chaining.
 */
export function logAuditEvent(params: {
  category: LogCategory;
  action: string;
  level?: LogLevel;
  actor: AuditLogActor;
  target?: string;
  details: string;
  metadata?: Record<string, unknown>;
}): AuditLogEntry {
  const currentLogs = loadAuditLogs();
  const previousHash = currentLogs[0]?.hash || 'GENESIS_HASH';

  const newEntryId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const level = params.level || 'info';

  const entryPayload = {
    id: newEntryId,
    timestamp,
    category: params.category,
    action: params.action,
    level,
    actor: params.actor,
    target: params.target || '',
    details: params.details,
    metadata: params.metadata || {},
    prevHash: previousHash,
  };

  const hash = computeHash(entryPayload);

  const fullEntry: AuditLogEntry = {
    id: newEntryId,
    timestamp,
    category: params.category,
    action: params.action,
    level,
    actor: params.actor,
    target: params.target,
    details: params.details,
    metadata: params.metadata,
    hash,
  };

  // Prepend to top so newest is first
  saveAuditLogs([fullEntry, ...currentLogs]);
  return fullEntry;
}

/**
 * Clears all audit logs (Admin only operation).
 * Leaves a record that logs were cleared by the admin.
 */
export function clearAuditLogs(adminActor: AuditLogActor): void {
  const clearEntry: AuditLogEntry = {
    id: `log-${Date.now()}-clear`,
    timestamp: new Date().toISOString(),
    category: 'security',
    action: '日誌記錄清除',
    level: 'warn',
    actor: adminActor,
    target: 'AuditLogs',
    details: `管理員「${adminActor.displayName}」執行了清空系統歷史日誌操作。`,
    hash: computeHash(`CLEARED_BY_${adminActor.username}_${Date.now()}`),
  };
  saveAuditLogs([clearEntry]);
}

/**
 * Exports logs as formatted JSON.
 */
export function exportAuditLogsJSON(): void {
  const logs = loadAuditLogs();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `系統安全稽核日誌_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
