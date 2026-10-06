import React from 'react';
import { Assignment, Subject, AssignmentStatus } from '../types';
import { STATUS_LABELS } from '../lib/constants';
import { AssignmentCard } from './AssignmentCard';
import { Plus } from 'lucide-react';

interface BoardViewProps {
  assignments: Assignment[];
  subjects: Subject[];
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AssignmentStatus) => void;
  onToggleSubtask: (assignmentId: string, subtaskId: string) => void;
  onOpenDrivePicker: (assignmentId: string) => void;
  onAddNewWithStatus?: (status: AssignmentStatus) => void;
}

const COLUMNS: { status: AssignmentStatus; label: string; headerBg: string; border: string }[] = [
  { status: 'todo', label: '待辦作業 (未開始)', headerBg: 'bg-slate-100 text-slate-700', border: 'border-slate-200' },
  { status: 'in_progress', label: '進行中 (處理中)', headerBg: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { status: 'completed', label: '已完成 (待送出)', headerBg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  { status: 'submitted', label: '已繳交 (完成存檔)', headerBg: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  assignments,
  subjects,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  onOpenDrivePicker,
  onAddNewWithStatus,
}) => {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colAssignments = assignments.filter((a) => a.status === col.status);

        return (
          <div
            key={col.status}
            id={`board-column-${col.status}`}
            className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${col.headerBg}`}>
                  {col.label}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{colAssignments.length}</span>
              </div>

              {onAddNewWithStatus && (
                <button
                  type="button"
                  onClick={() => onAddNewWithStatus(col.status)}
                  className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="在此欄位新增作業"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {colAssignments.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  目前沒有此狀態之作業
                </div>
              ) : (
                colAssignments.map((asg) => (
                  <AssignmentCard
                    key={asg.id}
                    assignment={asg}
                    subject={subjectMap.get(asg.subjectId)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onToggleSubtask={onToggleSubtask}
                    onOpenDrivePicker={onOpenDrivePicker}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
