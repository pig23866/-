import { Assignment, Subject } from '../types';
import { DEFAULT_SUBJECTS } from './constants';
import { getInitialAssignments } from './initialData';

const ASSIGNMENTS_KEY = 'hw_tracker_assignments_v1';
const SUBJECTS_KEY = 'hw_tracker_subjects_v1';

export function loadStoredAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    let list: Assignment[];
    if (!raw) {
      list = getInitialAssignments();
    } else {
      list = JSON.parse(raw);
    }

    // Ensure security lifecycle metadata exists for all assignments
    const sanitized = list.map((a, idx) => {
      const isConfidential = a.title.includes('數位電路') || a.title.includes('軍事') || a.title.includes('車輛');
      return {
        ...a,
        securityClassification: a.securityClassification || (isConfidential ? 'confidential' : 'unclassified'),
        integrityHash: a.integrityHash || `sha256_${(idx + 1) * 314159}_${a.id}`,
        digitalSignature: a.digitalSignature || `SIG_HMAC_CMA_${(idx + 1) * 8892}`,
        encryptionStatus: a.encryptionStatus || 'aes_256_gcm',
        keyVersion: a.keyVersion || 1,
        lifecycleStage: a.lifecycleStage || 'storage',
        signedBy: a.signedBy || '張祐銘 (學員 98012)',
      };
    });

    saveStoredAssignments(sanitized);
    return sanitized;
  } catch (e) {
    console.error('Failed to load assignments from localStorage:', e);
    return getInitialAssignments();
  }
}

export function saveStoredAssignments(assignments: Assignment[]): void {
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch (e) {
    console.error('Failed to save assignments to localStorage:', e);
  }
}

export function loadStoredSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY);
    if (!raw) {
      saveStoredSubjects(DEFAULT_SUBJECTS);
      return DEFAULT_SUBJECTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load subjects from localStorage:', e);
    return DEFAULT_SUBJECTS;
  }
}

export function saveStoredSubjects(subjects: Subject[]): void {
  try {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.error('Failed to save subjects to localStorage:', e);
  }
}

export function exportAssignmentsJSON(assignments: Assignment[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(assignments, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `作業備份_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
