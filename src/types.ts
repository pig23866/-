export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string; // Tailwind color token or hex
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  accentBg: string;
  icon: string;
}

export type Priority = 'high' | 'medium' | 'low';

export type AssignmentStatus = 'todo' | 'in_progress' | 'completed' | 'submitted';

export type SubmissionType = 'classroom' | 'online' | 'paper' | 'email' | 'presentation' | 'other';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface DriveAttachment {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  deadline: string; // ISO 8601 string: YYYY-MM-DDTHH:mm
  priority: Priority;
  status: AssignmentStatus;
  submissionType: SubmissionType;
  subtasks: Subtask[];
  driveAttachments: DriveAttachment[];
  estimatedMinutes?: number;
  reminderMinutesBefore?: number; // e.g. 60 (1 hour before), 1440 (1 day before)
  reminderTriggered?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // 資安生命週期屬性
  securityClassification?: 'unclassified' | 'confidential' | 'secret'; // 密級：普通件 / 機密 / 極機密
  integrityHash?: string; // SHA-256 完整性雜湊
  digitalSignature?: string; // HMAC 數位簽章戳記 (不可否認性)
  encryptionStatus?: 'plaintext' | 'aes_256_gcm'; // 靜態資料加密狀態
  keyVersion?: number; // 使用之加密金鑰版本
  lifecycleStage?: 'generation' | 'access' | 'modification' | 'transit' | 'storage' | 'destruction'; // 目前生命週期階段
  signedBy?: string; // 簽章人
}

export type UrgencyLevel = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' | 'done';

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  diffHours: number;
  diffDays: number;
  timeRemainingText: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export type ViewMode = 'list' | 'board' | 'calendar' | 'subjects' | 'schedule' | 'security';

// Timetable / Schedule Types
export interface SchedulePeriod {
  period: number; // 1 ~ 11
  name: string; // e.g. "(一)", "(二)"
  startTime: string; // "08:00"
  endTime: string; // "08:50"
  startMinutes: number; // minutes from midnight (08:00 -> 480)
  endMinutes: number; // minutes from midnight (08:50 -> 530)
}

export interface CourseEntry {
  id: string;
  dayOfWeek: number; // 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri)
  period: number; // 1 to 11
  courseName: string; // e.g. "(必)數位電路設計"
  teacher: string; // e.g. "吳順裕"
  classroom: string; // e.g. "資訊系302教室"
  category?: string; // e.g. "專業必修", "軍事訓練", "通識"
  color?: string;
  note?: string;
}

export interface CurrentClassStatus {
  state: 'in_class' | 'in_break' | 'before_school' | 'after_school' | 'weekend';
  currentClass: CourseEntry | null;
  currentPeriod: SchedulePeriod | null;
  nextClass: CourseEntry | null;
  nextPeriod: SchedulePeriod | null;
  remainingMinutesInCurrent?: number;
  minutesUntilNext?: number;
  dayOfWeek: number; // 1-7
  isSimulation: boolean;
  simulatedTimeStr?: string;
}
