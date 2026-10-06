import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  Paperclip,
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  Lock,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Assignment, Subject, AssignmentStatus } from '../types';
import { getUrgencyInfo, formatDateTimeDisplay } from '../lib/dateUtils';
import { PRIORITY_LABELS, SUBMISSION_LABELS, STATUS_LABELS } from '../lib/constants';
import { playChime } from '../lib/notifications';
import { useSecurity } from '../lib/security/SecurityContext';

interface AssignmentCardProps {
  assignment: Assignment;
  subject?: Subject;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AssignmentStatus) => void;
  onToggleSubtask: (assignmentId: string, subtaskId: string) => void;
  onOpenDrivePicker: (assignmentId: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  subject,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  onOpenDrivePicker,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    checkActionAllowed,
    verifyAssignment,
    simulateTamperAssignment,
    signAssignment,
    maskText,
    piiMaskingEnabled,
    recordAction,
  } = useSecurity();

  const [integrityState, setIntegrityState] = useState<{
    checked: boolean;
    valid: boolean;
    expected?: string;
  } | null>(null);

  const urgency = getUrgencyInfo(assignment.deadline, assignment.status);
  const priorityInfo = PRIORITY_LABELS[assignment.priority];
  const submissionInfo = SUBMISSION_LABELS[assignment.submissionType] || SUBMISSION_LABELS.other;
  const statusInfo = STATUS_LABELS[assignment.status];

  const totalSubtasks = assignment.subtasks.length;
  const completedSubtasks = assignment.subtasks.filter((st) => st.isCompleted).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleEditAttempt = () => {
    const check = checkActionAllowed('WRITE', assignment.securityClassification);
    if (!check.allowed) return;
    onEdit(assignment);
  };

  const handleDeleteAttempt = () => {
    const check = checkActionAllowed('DELETE', assignment.securityClassification);
    if (!check.allowed) return;
    onDelete(assignment.id);
  };

  const handleVerifyIntegrity = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await verifyAssignment(assignment);
    setIntegrityState({ checked: true, valid: res.isValid, expected: res.expectedHash });
  };

  const handleSimulateTamper = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const tampered = simulateTamperAssignment(assignment);
    onEdit(tampered);
    setIntegrityState({ checked: true, valid: false });
  };

  const handleRollbackAndResign = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanedTitle = assignment.title.replace(' [⚠️ 已被惡意篡改]', '');
    const cleanedDesc = (assignment.description || '').replace('\n[ATTACKER_PAYLOAD: unauthorized_modification_2026]', '');
    const resigned = await signAssignment({
      ...assignment,
      title: cleanedTitle,
      description: cleanedDesc,
    });
    onEdit(resigned);
    setIntegrityState({ checked: true, valid: true });
    recordAction('ASSIGNMENT_UPDATE', 'ASSIGNMENT', assignment.id, `復原並重新簽署作業 [${cleanedTitle}] 之 SHA-256 雜湊與 HMAC 簽章`);
  };

  const handleStatusClick = (newStatus: AssignmentStatus) => {
    if (newStatus === 'completed' || newStatus === 'submitted') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      playChime('success');
    }
    onStatusChange(assignment.id, newStatus);
  };

  const isUrgent = urgency.level === 'overdue' || urgency.level === 'today';

  return (
    <div
      id={`assignment-card-${assignment.id}`}
      className={`group relative bg-white rounded-2xl border transition-all duration-200 hover:shadow-md ${
        isUrgent
          ? 'border-red-300 ring-1 ring-red-200/60'
          : assignment.status === 'completed' || assignment.status === 'submitted'
          ? 'border-emerald-200/80 bg-slate-50/40'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Top Header Row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* Subject Badge & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            {subject && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${subject.badgeBg} ${subject.badgeBorder}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${priorityInfo.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
              {priorityInfo.label}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">
              <GraduationCap className="w-3 h-3" />
              {submissionInfo.label}
            </span>
          </div>

          {/* Right Menu Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    handleEditAttempt();
                  }}
                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  編輯作業
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenDrivePicker(assignment.id);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 cursor-pointer text-left"
                >
                  <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                  加雲端硬碟檔案
                </button>
                <button
                  type="button"
                  onClick={handleSimulateTamper}
                  className="w-full px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer text-left"
                  title="模擬駭客惡意篡改本機儲存資料 (測試完整性校驗與異常偵測)"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  🧪 模擬遭竄改測試
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    handleDeleteAttempt();
                  }}
                  className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer text-left"
                  title="學生身分將依最小權限原則攔截"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  刪除作業
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className={`text-base font-bold text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors ${
            assignment.status === 'completed' || assignment.status === 'submitted'
              ? 'line-through text-slate-500'
              : ''
          }`}
          onClick={handleEditAttempt}
        >
          {assignment.title}
        </h3>

        {/* Description */}
        {assignment.description && (
          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {assignment.description}
          </p>
        )}

        {/* Security Lifecycle Badge & Cryptographic Integrity Verifier */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
              assignment.securityClassification === 'secret'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : assignment.securityClassification === 'confidential'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Shield className="w-3 h-3 text-blue-500" />
            <span>
              {assignment.securityClassification === 'secret'
                ? '極機密'
                : assignment.securityClassification === 'confidential'
                ? '機密'
                : '普通件'}
            </span>
          </span>

          {/* Cryptographic Integrity Status */}
          {integrityState?.checked ? (
            integrityState.valid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>SHA-256 驗章合法</span>
              </span>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 rounded-md animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  <span>雜湊不合 (已被竄改!)</span>
                </span>
                <button
                  type="button"
                  onClick={handleRollbackAndResign}
                  className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title="復原資料並重新依金鑰簽署"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>復原重簽</span>
                </button>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={handleVerifyIntegrity}
              className="text-[10px] font-mono text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title="計算即時 SHA-256 並與防竄改簽章比對"
            >
              <Check className="w-3 h-3 text-slate-400" />
              <span>驗證完整性 ({assignment.integrityHash?.slice(0, 8)}...)</span>
            </button>
          )}
        </div>

        {/* Deadline & Urgency Reminder Row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${urgency.bgClass} ${urgency.colorClass} ${urgency.borderClass}`}
            >
              {urgency.level === 'overdue' ? (
                <AlertCircle className="w-3.5 h-3.5 animate-bounce" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>{urgency.timeRemainingText}</span>
            </div>

            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatDateTimeDisplay(assignment.deadline)}
            </span>
          </div>

          {/* Status Quick Button */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() =>
                handleStatusClick(
                  assignment.status === 'submitted'
                    ? 'todo'
                    : assignment.status === 'completed'
                    ? 'submitted'
                    : assignment.status === 'in_progress'
                    ? 'completed'
                    : 'in_progress'
                )
              }
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${statusInfo.badge}`}
              title="點擊切換狀態"
            >
              {statusInfo.label}
            </button>
          </div>
        </div>

        {/* Subtasks Progress & Interactive Checklist */}
        {totalSubtasks > 0 && (
          <div className="mt-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span className="font-medium flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                步驟清單 ({completedSubtasks}/{totalSubtasks})
              </span>
              <span className="font-semibold text-slate-700">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Subtask items toggle */}
            <div className="mt-2 space-y-1">
              {assignment.subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask(assignment.id, st.id)}
                  className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-0.5 select-none"
                >
                  {st.isCompleted ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={st.isCompleted ? 'line-through text-slate-400' : ''}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Drive Attachments */}
        {assignment.driveAttachments && assignment.driveAttachments.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium mr-1">
              <Paperclip className="w-3 h-3 text-slate-400" />
              雲端附件:
            </span>
            {assignment.driveAttachments.map((file) => (
              <a
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/80 transition-colors shadow-2xs group/link"
              >
                <FileText className="w-3 h-3 text-blue-500" />
                <span className="max-w-[160px] truncate">{file.name}</span>
                <ExternalLink className="w-2.5 h-2.5 text-blue-400 group-hover/link:text-blue-600" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Quick Status Bar on Bottom */}
      <div className="px-4 py-2 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px]">預估時長: {assignment.estimatedMinutes ? `${assignment.estimatedMinutes} 分鐘` : '未設定'}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleStatusClick('todo')}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-slate-200 transition-colors ${
              assignment.status === 'todo' ? 'font-bold text-slate-800' : 'text-slate-400'
            }`}
          >
            待辦
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('in_progress')}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-blue-100 transition-colors ${
              assignment.status === 'in_progress' ? 'font-bold text-blue-700' : 'text-slate-400'
            }`}
          >
            進行中
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('completed')}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-emerald-100 transition-colors ${
              assignment.status === 'completed' ? 'font-bold text-emerald-700' : 'text-slate-400'
            }`}
          >
            完成
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleStatusClick('submitted')}
            className={`px-2 py-0.5 rounded text-[11px] hover:bg-indigo-100 transition-colors ${
              assignment.status === 'submitted' ? 'font-bold text-indigo-700' : 'text-slate-400'
            }`}
          >
            已繳交
          </button>
        </div>
      </div>
    </div>
  );
};
