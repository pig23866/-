import { Assignment, CourseEntry, AuditLogActor, AssignmentsBackupPayload, ScheduleBackupPayload } from '../types';
import { computeExportChecksum, verifyExportChecksum } from './integrity';
import { logAuditEvent } from './auditLogger';

/**
 * Triggers file download in browser.
 */
function downloadJSON(filename: string, content: string): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(content);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// -------------------------------------------------------------
// 1. 作業備份與復原 (Assignments Backup & Restore)
// -------------------------------------------------------------

export function exportAssignmentsBackup(assignments: Assignment[], actor: AuditLogActor): void {
  const checksum = computeExportChecksum(assignments);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const payload: AssignmentsBackupPayload = {
    version: '2.0',
    type: 'assignments_backup',
    exportedAt: now.toISOString(),
    exportedBy: `${actor.displayName} (${actor.username})`,
    assignmentCount: assignments.length,
    assignments,
    checksum,
  };

  const filename = `作業備份_${dateStr}.json`;
  downloadJSON(filename, JSON.stringify(payload, null, 2));

  logAuditEvent({
    category: 'backup',
    action: '匯出作業備份',
    level: 'info',
    actor,
    target: filename,
    details: `匯出 ${assignments.length} 筆作業資料，完整性驗證碼：${checksum.substring(0, 8)}...`,
  });
}

export function parseAssignmentsBackup(rawText: string): {
  success: boolean;
  payload?: AssignmentsBackupPayload;
  error?: string;
  isChecksumValid: boolean;
} {
  try {
    const data = JSON.parse(rawText);

    // Support both format with metadata and direct array format
    if (Array.isArray(data)) {
      // Direct array format fallback
      const checksum = computeExportChecksum(data);
      const syntheticPayload: AssignmentsBackupPayload = {
        version: '1.0',
        type: 'assignments_backup',
        exportedAt: new Date().toISOString(),
        exportedBy: '原始備份匯入',
        assignmentCount: data.length,
        assignments: data,
        checksum,
      };
      return {
        success: true,
        payload: syntheticPayload,
        isChecksumValid: true,
      };
    }

    if (!data || data.type !== 'assignments_backup' || !Array.isArray(data.assignments)) {
      return {
        success: false,
        error: '檔案格式不符：請確認所選檔案為合法的作業備份 JSON 檔案。',
        isChecksumValid: false,
      };
    }

    const isChecksumValid = verifyExportChecksum(data.assignments, data.checksum);

    return {
      success: true,
      payload: data as AssignmentsBackupPayload,
      isChecksumValid,
    };
  } catch (err) {
    return {
      success: false,
      error: '檔案解析失敗：檔案內容並非標準 JSON 格式。',
      isChecksumValid: false,
    };
  }
}

// -------------------------------------------------------------
// 2. 課表備份與復原 (Schedule Backup & Restore)
// -------------------------------------------------------------

export function exportScheduleBackup(courses: CourseEntry[], actor: AuditLogActor): void {
  const checksum = computeExportChecksum(courses);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const payload: ScheduleBackupPayload = {
    version: '1.0',
    type: 'schedule_backup',
    exportedAt: now.toISOString(),
    exportedBy: `${actor.displayName} (${actor.username})`,
    courseCount: courses.length,
    courses,
    checksum,
  };

  const filename = `課表備份_${dateStr}.json`;
  downloadJSON(filename, JSON.stringify(payload, null, 2));

  logAuditEvent({
    category: 'backup',
    action: '匯出課表備份',
    level: 'info',
    actor,
    target: filename,
    details: `匯出 ${courses.length} 門課堂資料，完整性驗證碼：${checksum.substring(0, 8)}...`,
  });
}

export function parseScheduleBackup(rawText: string): {
  success: boolean;
  payload?: ScheduleBackupPayload;
  error?: string;
  isChecksumValid: boolean;
} {
  try {
    const data = JSON.parse(rawText);

    if (Array.isArray(data)) {
      const checksum = computeExportChecksum(data);
      const syntheticPayload: ScheduleBackupPayload = {
        version: '1.0',
        type: 'schedule_backup',
        exportedAt: new Date().toISOString(),
        exportedBy: '原始課表匯入',
        courseCount: data.length,
        courses: data,
        checksum,
      };
      return {
        success: true,
        payload: syntheticPayload,
        isChecksumValid: true,
      };
    }

    if (!data || data.type !== 'schedule_backup' || !Array.isArray(data.courses)) {
      return {
        success: false,
        error: '檔案格式不符：請確認所選檔案為合法的課表備份 JSON 檔案。',
        isChecksumValid: false,
      };
    }

    const isChecksumValid = verifyExportChecksum(data.courses, data.checksum);

    return {
      success: true,
      payload: data as ScheduleBackupPayload,
      isChecksumValid,
    };
  } catch (err) {
    return {
      success: false,
      error: '檔案解析失敗：檔案內容並非標準 JSON 格式。',
      isChecksumValid: false,
    };
  }
}
