import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Assignment,
  Subject,
  ViewMode,
  AssignmentStatus,
  DriveAttachment,
  CourseEntry,
} from './types';
import { DEFAULT_SUBJECTS } from './lib/constants';
import {
  loadStoredAssignments,
  saveStoredAssignments,
  loadStoredSubjects,
  saveStoredSubjects,
  exportAssignmentsJSON,
} from './lib/storage';
import {
  loadStoredSchedule,
  saveStoredSchedule,
  DEFAULT_COURSES,
} from './lib/scheduleData';
import { getInitialAssignments } from './lib/initialData';
import { getUrgencyInfo } from './lib/dateUtils';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { sendBrowserNotification, playChime } from './lib/notifications';

import { Navbar } from './components/Navbar';
import { DeadlineAlertBanner } from './components/DeadlineAlertBanner';
import { CurrentClassBanner } from './components/CurrentClassBanner';
import { WeeklyScheduleModal } from './components/WeeklyScheduleModal';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { SubjectFilterBar } from './components/SubjectFilterBar';
import { AssignmentCard } from './components/AssignmentCard';
import { BoardView } from './components/BoardView';
import { CalendarView } from './components/CalendarView';
import { SubjectOverviewView } from './components/SubjectOverviewView';
import { SecurityLifecycleCenter } from './components/SecurityLifecycleCenter';
import { AssignmentModal } from './components/AssignmentModal';
import { DrivePickerModal } from './components/DrivePickerModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SecurityProvider, useSecurity } from './lib/security/SecurityContext';
import { SecurityStatusBar } from './components/SecurityStatusBar';
import { AuditDrawer } from './components/AuditDrawer';
import { AccessDeniedModal } from './components/AccessDeniedModal';

import {
  Inbox,
  Sparkles,
  Plus,
  ArrowRight,
  BookOpen,
  Filter,
} from 'lucide-react';

function AppContent() {
  const {
    isAuditDrawerOpen,
    setIsAuditDrawerOpen,
    generateEncryptedBackup,
    restoreEncryptedBackup,
  } = useSecurity();

  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  // Assignments & Subjects state
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadStoredAssignments());
  const [subjects, setSubjects] = useState<Subject[]>(() => loadStoredSubjects());
  const [courses, setCourses] = useState<CourseEntry[]>(() => loadStoredSchedule());

  // Filter & View State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'subject'>('deadline');
  const [isUrgentFilterActive, setIsUrgentFilterActive] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Notification State
  const [notificationGranted, setNotificationGranted] = useState<boolean>(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  // Modal States
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [prefillAssignmentData, setPrefillAssignmentData] = useState<{
    title?: string;
    subjectId?: string;
    notes?: string;
    description?: string;
  } | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [targetAssignmentIdForDrive, setTargetAssignmentIdForDrive] = useState<string | null>(null);
  const [pendingDriveAttachments, setPendingDriveAttachments] = useState<DriveAttachment[]>([]);

  // Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Save assignments on change
  useEffect(() => {
    saveStoredAssignments(assignments);
  }, [assignments]);

  // Save subjects on change
  useEffect(() => {
    saveStoredSubjects(subjects);
  }, [subjects]);

  // Save courses on change
  useEffect(() => {
    saveStoredSchedule(courses);
  }, [courses]);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setIsAuthenticated(true);
      },
      () => {
        setUser(null);
        setIsAuthenticated(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Periodic automatic deadline reminder engine (runs every 60 seconds)
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date().getTime();
      assignments.forEach((asg) => {
        if (asg.status === 'completed' || asg.status === 'submitted') return;

        const dueTime = new Date(asg.deadline).getTime();
        const diffHours = (dueTime - now) / (1000 * 60 * 60);

        // If due within 2 hours and not yet triggered
        if (diffHours > 0 && diffHours <= 2 && !asg.reminderTriggered) {
          sendBrowserNotification(
            `作業期限提醒：${asg.title}`,
            `該作業將於約 ${Math.round(diffHours * 60)} 分鐘後截止，請把握時間繳交！`
          );
          playChime('urgent');

          // Mark as triggered in state
          setAssignments((prev) =>
            prev.map((a) => (a.id === asg.id ? { ...a, reminderTriggered: true } : a))
          );
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [assignments]);

  // Auth Handlers
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      const isUserCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/user-cancelled' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('popup-closed-by-user') ||
            err.message.includes('cancelled-popup-request')));

      if (!isUserCancelled) {
        console.error('Google Sign In Error:', err);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Subject Counts Map
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      counts[a.subjectId] = (counts[a.subjectId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  // Filtered & Sorted Assignments
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((asg) => {
        // Subject Filter
        if (selectedSubjectId && asg.subjectId !== selectedSubjectId) {
          return false;
        }

        // Status Filter
        if (statusFilter === 'pending' && (asg.status === 'completed' || asg.status === 'submitted')) {
          return false;
        }
        if (statusFilter === 'done' && asg.status !== 'completed' && asg.status !== 'submitted') {
          return false;
        }

        // Urgent Filter
        if (isUrgentFilterActive) {
          const urgency = getUrgencyInfo(asg.deadline, asg.status);
          if (urgency.level !== 'overdue' && urgency.level !== 'today') {
            return false;
          }
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = asg.title.toLowerCase().includes(q);
          const matchesDesc = asg.description.toLowerCase().includes(q);
          const matchesNotes = asg.notes?.toLowerCase().includes(q) || false;
          const matchesAttachment = asg.driveAttachments.some((att) =>
            att.name.toLowerCase().includes(q)
          );
          if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesAttachment) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          // Incompleted items first, then sorted by deadline
          const aDone = a.status === 'completed' || a.status === 'submitted';
          const bDone = b.status === 'completed' || b.status === 'submitted';
          if (aDone !== bDone) return aDone ? 1 : -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }

        if (sortBy === 'priority') {
          const weight = { high: 3, medium: 2, low: 1 };
          return weight[b.priority] - weight[a.priority];
        }

        if (sortBy === 'subject') {
          return a.subjectId.localeCompare(b.subjectId);
        }

        return 0;
      });
  }, [assignments, selectedSubjectId, statusFilter, isUrgentFilterActive, searchQuery, sortBy]);

  // Handlers for Assignment operations
  const handleSaveAssignment = (assignmentToSave: Assignment) => {
    setAssignments((prev) => {
      const index = prev.findIndex((a) => a.id === assignmentToSave.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = assignmentToSave;
        return updated;
      }
      return [assignmentToSave, ...prev];
    });
    setEditingAssignment(null);
    setPendingDriveAttachments([]);
  };

  const handleDeleteAssignment = (id: string) => {
    const target = assignments.find((a) => a.id === id);
    if (!target) return;

    setConfirmConfig({
      isOpen: true,
      title: '確認刪除作業？',
      message: `確定要刪除「${target.title}」嗎？此操作將自統整系統中移除此作業紀錄。`,
      isDestructive: true,
      onConfirm: () => {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        setConfirmConfig((c) => ({ ...c, isOpen: false }));
      },
    });
  };

  const handleStatusChange = (id: string, newStatus: AssignmentStatus) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus, updatedAt: new Date().toISOString() } : a))
    );
  };

  const handleToggleSubtask = (assignmentId: string, subtaskId: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== assignmentId) return a;
        return {
          ...a,
          subtasks: a.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Open Drive picker for an existing assignment or currently open modal
  const handleOpenDrivePicker = (assignmentId?: string) => {
    if (assignmentId) {
      setTargetAssignmentIdForDrive(assignmentId);
    } else {
      setTargetAssignmentIdForDrive(null);
    }
    setIsDrivePickerOpen(true);
  };

  const handleDriveFileSelected = (attachment: DriveAttachment) => {
    if (targetAssignmentIdForDrive) {
      // Adding directly to existing card
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.id !== targetAssignmentIdForDrive) return a;
          const exists = a.driveAttachments.some((att) => att.id === attachment.id);
          if (exists) return a;
          return {
            ...a,
            driveAttachments: [...a.driveAttachments, attachment],
            updatedAt: new Date().toISOString(),
          };
        })
      );
      setTargetAssignmentIdForDrive(null);
    } else {
      // Adding to the currently editing modal
      setPendingDriveAttachments((prev) => [...prev, attachment]);
    }
  };

  // Reset to initial demo data
  const handleResetData = () => {
    setConfirmConfig({
      isOpen: true,
      title: '重設為預設示範作業？',
      message: '這將會清除您目前自訂的所有作業，並載入各學科示範範本。',
      isDestructive: false,
      onConfirm: () => {
        const fresh = getInitialAssignments();
        setAssignments(fresh);
        setSubjects(DEFAULT_SUBJECTS);
        setConfirmConfig((c) => ({ ...c, isOpen: false }));
        playChime('info');
      },
    });
  };

  const handleQuickAddFromCourse = (courseName: string, classroom: string, teacher: string) => {
    let matchedSubjectId = 'cs';
    const name = courseName.toLowerCase();
    if (name.includes('數位電路') || name.includes('資訊') || name.includes('計算機')) {
      matchedSubjectId = 'cs';
    } else if (name.includes('英文')) {
      matchedSubjectId = 'english';
    } else if (name.includes('憲法') || name.includes('立國精神') || name.includes('通識')) {
      matchedSubjectId = 'politics';
    } else if (name.includes('車輛') || name.includes('機械')) {
      matchedSubjectId = 'mechanics';
    } else if (
      name.includes('軍事倫理') ||
      name.includes('教練') ||
      name.includes('體育') ||
      name.includes('體能') ||
      name.includes('裝備')
    ) {
      matchedSubjectId = 'military';
    } else if (name.includes('社團')) {
      matchedSubjectId = 'arts';
    } else {
      matchedSubjectId = subjects[0]?.id || 'other';
    }

    setEditingAssignment(null);
    setPendingDriveAttachments([]);
    setPrefillAssignmentData({
      title: `${courseName} - 課堂隨堂作業`,
      subjectId: matchedSubjectId,
      description: `於 ${classroom} 上課指派之隨堂作業 / 預習進度`,
      notes: `授課教官/老師：${teacher} | 上課地點：${classroom}`,
    });
    setIsAssignmentModalOpen(true);
  };

  const handleOpenAddModal = (defaultStatus?: AssignmentStatus, defaultSubjectId?: string) => {
    setEditingAssignment(null);
    setPrefillAssignmentData(null);
    setPendingDriveAttachments([]);
    if (defaultSubjectId) {
      setSelectedSubjectId(defaultSubjectId);
    }
    setIsAssignmentModalOpen(true);
  };

  const handleTriggerRestore = () => {
    restoreFileInputRef.current?.click();
  };

  const handleFileRestoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await restoreEncryptedBackup(text);
    if (res.success && res.assignments) {
      setAssignments(res.assignments);
      setConfirmConfig({
        isOpen: true,
        title: '✅ 安全備份還原成功！',
        message: `已通過 SHA-256 完整性雜湊與數位簽章檢驗，成功復原 ${res.assignments.length} 筆作業記錄。`,
        isDestructive: false,
        onConfirm: () => setConfirmConfig((c) => ({ ...c, isOpen: false })),
      });
    } else {
      setConfirmConfig({
        isOpen: true,
        title: '🚨 備份檔校驗失敗，拒絕還原！',
        message: res.error || 'SHA-256 雜湊或數位簽章不符，疑似遭到竄改。',
        isDestructive: true,
        onConfirm: () => setConfirmConfig((c) => ({ ...c, isOpen: false })),
      });
    }
    e.target.value = '';
  };

  const handleExportSecureBackup = async () => {
    const jsonStr = await generateEncryptedBackup(assignments);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `作業統整安全備份_${new Date().toISOString().slice(0, 10)}.cma.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        isAuthenticated={isAuthenticated}
        isSigningIn={isSigningIn}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
        onOpenSecurity={() => setViewMode(viewMode === 'security' ? 'list' : 'security')}
        isSecurityView={viewMode === 'security'}
        onExportBackup={handleExportSecureBackup}
        onRestoreBackup={handleTriggerRestore}
        onResetData={handleResetData}
        notificationGranted={notificationGranted}
        setNotificationGranted={setNotificationGranted}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Active Security & Zero Trust Control Bar */}
        <SecurityStatusBar
          onOpenSecurityCenter={() => setViewMode('security')}
          onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        />

        {/* Real-time Timetable Widget (首頁清楚顯示現在甚麼課 下一節甚麼課 在哪裡上課) */}
        <CurrentClassBanner
          courses={courses}
          onOpenFullSchedule={() => setIsScheduleModalOpen(true)}
          onQuickAddAssignment={handleQuickAddFromCourse}
        />

        {/* Deadline Alert Banner (能自動提醒繳交期限) */}
        <DeadlineAlertBanner
          assignments={assignments}
          onFilterUrgent={() => setIsUrgentFilterActive(!isUrgentFilterActive)}
          isUrgentFilterActive={isUrgentFilterActive}
          notificationGranted={notificationGranted}
          setNotificationGranted={setNotificationGranted}
        />

        {/* Filter and Subject Category Bar (分類各科作業內容) */}
        <SubjectFilterBar
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          subjectCounts={subjectCounts}
          totalCount={assignments.length}
        />

        {/* Main Content Area based on View Mode */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredAssignments.length === 0 ? (
              <div
                id="empty-state-card"
                className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">查無相符作業項目</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  目前篩選條件下沒有作業，您可以清除篩選條件或點擊下方按鈕新增一筆作業。
                </p>
                <div className="flex items-center justify-center gap-3">
                  {(selectedSubjectId || isUrgentFilterActive || searchQuery || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(null);
                        setIsUrgentFilterActive(false);
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      清除所有篩選
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增作業</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    subject={subjectMap.get(assignment.subjectId)}
                    onEdit={(asg) => {
                      setEditingAssignment(asg);
                      setIsAssignmentModalOpen(true);
                    }}
                    onDelete={handleDeleteAssignment}
                    onStatusChange={handleStatusChange}
                    onToggleSubtask={handleToggleSubtask}
                    onOpenDrivePicker={handleOpenDrivePicker}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'board' && (
          <BoardView
            assignments={filteredAssignments}
            subjects={subjects}
            onEdit={(asg) => {
              setEditingAssignment(asg);
              setIsAssignmentModalOpen(true);
            }}
            onDelete={handleDeleteAssignment}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onOpenDrivePicker={handleOpenDrivePicker}
            onAddNewWithStatus={(st) => handleOpenAddModal(st)}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            assignments={assignments}
            subjects={subjects}
            onSelectAssignment={(asg) => {
              setEditingAssignment(asg);
              setIsAssignmentModalOpen(true);
            }}
            onAddNewForDate={(dateStr) => {
              setEditingAssignment(null);
              setIsAssignmentModalOpen(true);
            }}
          />
        )}

        {viewMode === 'schedule' && (
          <WeeklyScheduleView
            courses={courses}
            onSaveCourses={(updated) => setCourses(updated)}
            onQuickAddAssignment={handleQuickAddFromCourse}
          />
        )}

        {viewMode === 'subjects' && (
          <SubjectOverviewView
            subjects={subjects}
            assignments={assignments}
            onSelectSubjectFilter={(id) => {
              setSelectedSubjectId(id);
              setViewMode('list');
            }}
            onEditAssignment={(asg) => {
              setEditingAssignment(asg);
              setIsAssignmentModalOpen(true);
            }}
            onAddNewForSubject={(id) => {
              handleOpenAddModal(undefined, id);
            }}
          />
        )}

        {viewMode === 'security' && (
          <SecurityLifecycleCenter
            assignments={assignments}
            onUpdateAssignments={(updated) => {
              setAssignments(updated);
              saveStoredAssignments(updated);
            }}
          />
        )}
      </main>

      {/* Full Weekly Schedule Timetable Modal */}
      <WeeklyScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        courses={courses}
        onSaveCourses={(updated) => setCourses(updated)}
        onQuickAddAssignment={handleQuickAddFromCourse}
      />

      {/* Assignment Create / Edit Modal */}
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setEditingAssignment(null);
          setPrefillAssignmentData(null);
          setPendingDriveAttachments([]);
        }}
        onSave={handleSaveAssignment}
        subjects={subjects}
        initialData={editingAssignment}
        prefillData={prefillAssignmentData}
        onOpenDrivePicker={() => handleOpenDrivePicker()}
        currentPendingAttachments={pendingDriveAttachments}
        onRemoveAttachment={(id) => {
          setPendingDriveAttachments((prev) => prev.filter((a) => a.id !== id));
        }}
      />

      {/* Google Drive Picker Modal */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => {
          setIsDrivePickerOpen(false);
          setTargetAssignmentIdForDrive(null);
        }}
        onSelectFile={handleDriveFileSelected}
        isAuthenticated={isAuthenticated}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
      />

      {/* Immutable Hash-chained Audit Drawer */}
      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* ABAC Access Denied Feedback Modal */}
      <AccessDeniedModal />

      {/* Hidden File Input for Cryptographic Backup Restore */}
      <input
        type="file"
        ref={restoreFileInputRef}
        onChange={handleFileRestoreChange}
        accept=".json"
        className="hidden"
      />
    </div>
  );
}

export default function App() {
  return (
    <SecurityProvider>
      <AppContent />
    </SecurityProvider>
  );
}

