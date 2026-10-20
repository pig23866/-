import { Assignment, Subject } from '../types';
import { DEFAULT_SUBJECTS } from './constants';
import { getInitialAssignments } from './initialData';
import { loadWithIntegrity, saveWithIntegrity } from './integrity';
import { logAuditEvent } from './auditLogger';

const ASSIGNMENTS_KEY = 'hw_tracker_assignments_v2';
const SUBJECTS_KEY = 'hw_tracker_subjects_v2';

export function loadStoredAssignments(): Assignment[] {
  return loadWithIntegrity<Assignment[]>(
    ASSIGNMENTS_KEY,
    getInitialAssignments(),
    (details) => {
      // Quietly log security event to audit system without displaying intrusive UI hints
      logAuditEvent({
        category: 'security',
        action: '完整性自動修復',
        level: 'security',
        actor: { username: 'System', displayName: '安全保護引擎', role: 'admin' },
        target: ASSIGNMENTS_KEY,
        details,
      });
    }
  );
}

export function saveStoredAssignments(assignments: Assignment[]): void {
  saveWithIntegrity(ASSIGNMENTS_KEY, assignments);
}

export function clearAllStoredAssignments(): void {
  saveWithIntegrity(ASSIGNMENTS_KEY, []);
}

export function loadStoredSubjects(): Subject[] {
  const loaded = loadWithIntegrity<Subject[]>(
    SUBJECTS_KEY,
    DEFAULT_SUBJECTS,
    (details) => {
      logAuditEvent({
        category: 'security',
        action: '完整性自動修復',
        level: 'security',
        actor: { username: 'System', displayName: '安全保護引擎', role: 'admin' },
        target: SUBJECTS_KEY,
        details,
      });
    }
  );

  const hasLegacy = loaded.some((s) => s.id === 'math' || s.name === '數學' || s.name === '國語文');
  if (hasLegacy || loaded.length === 0) {
    saveStoredSubjects(DEFAULT_SUBJECTS);
    return DEFAULT_SUBJECTS;
  }
  return loaded;
}

export function saveStoredSubjects(subjects: Subject[]): void {
  saveWithIntegrity(SUBJECTS_KEY, subjects);
}
