import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Paperclip,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  ExternalLink,
  Shield,
} from 'lucide-react';
import {
  Assignment,
  Subject,
  Priority,
  AssignmentStatus,
  SubmissionType,
  Subtask,
  DriveAttachment,
} from '../types';
import { SUBMISSION_LABELS } from '../lib/constants';
import { formatDateForInput } from '../lib/dateUtils';
import { useSecurity } from '../lib/security/SecurityContext';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: Assignment) => void;
  subjects: Subject[];
  initialData?: Assignment | null;
  prefillData?: {
    title?: string;
    subjectId?: string;
    notes?: string;
    description?: string;
  } | null;
  onOpenDrivePicker: () => void;
  currentPendingAttachments: DriveAttachment[];
  onRemoveAttachment: (id: string) => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  initialData,
  prefillData,
  onOpenDrivePicker,
  currentPendingAttachments,
  onRemoveAttachment,
}) => {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 'math');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<AssignmentStatus>('todo');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('classroom');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [securityClassification, setSecurityClassification] = useState<'unclassified' | 'confidential' | 'secret'>('unclassified');
  const [sanitizationWarning, setSanitizationWarning] = useState<string | null>(null);

  const {
    currentProfile,
    checkActionAllowed,
    signAssignment,
    sanitizeUserInput,
    recordAction,
  } = useSecurity();

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<DriveAttachment[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSubjectId(initialData.subjectId);
      setDescription(initialData.description || '');
      setDeadline(initialData.deadline);
      setPriority(initialData.priority);
      setStatus(initialData.status);
      setSubmissionType(initialData.submissionType);
      setEstimatedMinutes(initialData.estimatedMinutes || 60);
      setNotes(initialData.notes || '');
      setSecurityClassification(initialData.securityClassification || 'unclassified');
      setSubtasks(initialData.subtasks || []);
      setAttachments(initialData.driveAttachments || []);
    } else {
      // Default: Tomorrow at 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);

      setTitle(prefillData?.title || '');
      setSubjectId(prefillData?.subjectId || subjects[0]?.id || 'math');
      setDescription(prefillData?.description || '');
      setDeadline(formatDateForInput(tomorrow));
      setPriority('medium');
      setStatus('todo');
      setSubmissionType('classroom');
      setEstimatedMinutes(60);
      setNotes(prefillData?.notes || '');
      setSecurityClassification('unclassified');
      setSubtasks([]);
      setAttachments([]);
    }
  }, [initialData, prefillData, isOpen, subjects]);

  // Sync any newly added attachments from the drive picker
  useEffect(() => {
    if (currentPendingAttachments.length > 0) {
      setAttachments((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const added = currentPendingAttachments.filter((a) => !ids.has(a.id));
        return [...prev, ...added];
      });
    }
  }, [currentPendingAttachments]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSt: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newSubtaskText.trim(),
      isCompleted: false,
    };
    setSubtasks([...subtasks, newSt]);
    setNewSubtaskText('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const setQuickDeadline = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    setDeadline(formatDateForInput(d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Check ABAC policy before proceeding
    const accessCheck = checkActionAllowed('WRITE', securityClassification);
    if (!accessCheck.allowed) {
      return;
    }

    // Input Sanitization (Secure SDLC Anti-XSS / Anti-Injection)
    const { clean: cleanTitle, hadMalicious: badTitle } = sanitizeUserInput(title.trim());
    const { clean: cleanDesc, hadMalicious: badDesc } = sanitizeUserInput(description.trim());
    const { clean: cleanNotes, hadMalicious: badNotes } = sanitizeUserInput(notes.trim());

    if (badTitle || badDesc || badNotes) {
      setSanitizationWarning('🛡️ 輸入驗證攔截：已自動過濾危險腳本字符 (XSS/SQLi 防禦)，落實 Secure SDLC 規範！');
    }

    const id = initialData?.id || `asg-${Date.now()}`;
    const baseAssignment: Assignment = {
      id,
      title: cleanTitle,
      subjectId,
      description: cleanDesc,
      deadline,
      priority,
      status,
      submissionType,
      subtasks,
      driveAttachments: attachments,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      notes: cleanNotes,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      securityClassification,
      lifecycleStage: initialData ? 'modification' : 'generation',
    };

    const signed = await signAssignment(baseAssignment);

    await recordAction(
      initialData ? 'ASSIGNMENT_UPDATE' : 'ASSIGNMENT_CREATE',
      'ASSIGNMENT',
      id,
      `${initialData ? '編輯修改' : '建立新增'}作業：[${cleanTitle}]，密級標定：[${securityClassification}]，計算 SHA-256 完整性雜湊並以 HMAC 簽署`
    );

    onSave(signed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="assignment-modal"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {initialData ? '編輯作業內容' : '新增作業項目'}
            </h3>
            <p className="text-xs text-slate-500">輸入學科、截止日期與步驟要求，自動追蹤繳交期限</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {sanitizationWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
              <span className="font-medium">{sanitizationWarning}</span>
              <button
                type="button"
                onClick={() => setSanitizationWarning(null)}
                className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Subject & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                所屬學科 <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-subject-select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                作業名稱 <span className="text-red-500">*</span>
              </label>
              <input
                id="modal-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：數學第四章習題 P.60-P.65"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              作業說明與要求 (可填寫題號、格式規範或注意事項)
            </label>
            <textarea
              id="modal-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細說明老師交代的格式、頁數、計算題規定等..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
            />
          </div>

          {/* Deadline with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                繳交期限 (Deadline) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>快速設定:</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(6)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                >
                  6小時後
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(24)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                >
                  明天此時
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(72)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                >
                  3天後
                </button>
              </div>
            </div>
            <input
              id="modal-deadline-input"
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Priority, Status, Submission Type, Security Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">優先級</label>
              <select
                id="modal-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="high">🔥 高優先 (重大作業/考試)</option>
                <option value="medium">⚡ 中等 (一般平日作業)</option>
                <option value="low">🌱 低優先 (自修或長程)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">目前狀態</label>
              <select
                id="modal-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="todo">待辦 (未開始)</option>
                <option value="in_progress">進行中</option>
                <option value="completed">已完成 (待交)</option>
                <option value="submitted">已繳交送出</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">繳交方式</label>
              <select
                id="modal-submission-select"
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {Object.entries(SUBMISSION_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                安全密級標定
              </label>
              <select
                id="modal-security-classification-select"
                value={securityClassification}
                onChange={(e) => setSecurityClassification(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="unclassified">普通件 (Unclassified)</option>
                <option value="confidential">機密件 (Confidential)</option>
                <option value="secret">極機密件 (Secret)</option>
              </select>
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              步驟拆解清單 (Checklist)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="輸入單一工作步驟 (例如：查閱文獻、撰寫草稿、檢查排版)..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新增步驟
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                {subtasks.map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 px-2 py-1 bg-white rounded-lg border border-slate-200/80 text-xs"
                  >
                    <span className="text-slate-500 font-mono text-[11px]">{idx + 1}.</span>
                    <span className="flex-1 text-slate-800">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Google Drive Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                Google 雲端硬碟附件
              </label>
              <button
                type="button"
                onClick={onOpenDrivePicker}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                從 Google 雲端新增或上傳檔案
              </button>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-1.5 bg-blue-50/30 p-2.5 rounded-xl border border-blue-100">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{att.name}</span>
                      {att.size && <span className="text-[11px] text-slate-400">({att.size})</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={att.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="開啟檔案"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachments(attachments.filter((a) => a.id !== att.id));
                          onRemoveAttachment(att.id);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="移除附件"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                尚未附加雲端硬碟檔案，點擊上方按鈕挑選作業報告、投影片或講義
              </div>
            )}
          </div>

          {/* Notes & Estimated Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                預估完成所需時間 (分鐘)
              </label>
              <input
                type="number"
                min="0"
                step="15"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                placeholder="60"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">備忘註記</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：需找同學小組共同檢討"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              id="modal-submit-btn"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-200 transition-colors cursor-pointer"
            >
              {initialData ? '儲存變更' : '新增至作業清單'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
