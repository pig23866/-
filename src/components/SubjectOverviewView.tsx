import React from 'react';
import { BookOpen, CheckCircle2, Clock, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { Subject, Assignment } from '../types';
import { getUrgencyInfo } from '../lib/dateUtils';

interface SubjectOverviewViewProps {
  subjects: Subject[];
  assignments: Assignment[];
  onSelectSubjectFilter: (subjectId: string) => void;
  onEditAssignment: (asg: Assignment) => void;
  onAddNewForSubject: (subjectId: string) => void;
}

export const SubjectOverviewView: React.FC<SubjectOverviewViewProps> = ({
  subjects,
  assignments,
  onSelectSubjectFilter,
  onEditAssignment,
  onAddNewForSubject,
}) => {
  return (
    <div id="subject-overview-view" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {subjects.map((subj) => {
          const subjAssignments = assignments.filter((a) => a.subjectId === subj.id);
          const total = subjAssignments.length;
          const completed = subjAssignments.filter(
            (a) => a.status === 'completed' || a.status === 'submitted'
          ).length;
          const pending = total - completed;
          const overdue = subjAssignments.filter(
            (a) =>
              a.status !== 'completed' &&
              a.status !== 'submitted' &&
              getUrgencyInfo(a.deadline, a.status).level === 'overdue'
          ).length;

          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

          // Remaining estimated minutes
          const remainingMinutes = subjAssignments
            .filter((a) => a.status !== 'completed' && a.status !== 'submitted')
            .reduce((acc, a) => acc + (a.estimatedMinutes || 60), 0);

          // Top 3 urgent pending tasks
          const pendingList = subjAssignments
            .filter((a) => a.status !== 'completed' && a.status !== 'submitted')
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 3);

          return (
            <div
              key={subj.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: subj.color }}
                    />
                    <h4 className="text-base font-bold text-slate-900">{subj.name}</h4>
                    <span className="text-xs text-slate-400 font-mono">({subj.code})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddNewForSubject(subj.id)}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title={`新增 ${subj.name} 作業`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                    <span>完成率</span>
                    <span className="font-bold text-slate-800">{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${completionRate}%`,
                        backgroundColor: subj.color,
                      }}
                    />
                  </div>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[11px] text-slate-500">總計作業</span>
                    <span className="text-sm font-bold text-slate-800">{total}</span>
                  </div>
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                    <span className="block text-[11px] text-amber-700">待繳交</span>
                    <span className="text-sm font-bold text-amber-900">{pending}</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`block text-[11px] ${overdue > 0 ? 'text-red-700 font-semibold' : 'text-slate-500'}`}>
                      已逾期
                    </span>
                    <span className={`text-sm font-bold ${overdue > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                      {overdue}
                    </span>
                  </div>
                </div>

                {/* Remaining Estimated Workload */}
                {remainingMinutes > 0 && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    預估尚需花費：
                    <span className="font-semibold text-slate-700">
                      {Math.floor(remainingMinutes / 60) > 0
                        ? `${Math.floor(remainingMinutes / 60)} 小時 ${remainingMinutes % 60} 分鐘`
                        : `${remainingMinutes} 分鐘`}
                    </span>
                  </p>
                )}

                {/* Upcoming items in this subject */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">近期待辦項目：</span>
                  {pendingList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">無待辦事項，進度超前！</p>
                  ) : (
                    pendingList.map((asg) => {
                      const urgency = getUrgencyInfo(asg.deadline, asg.status);
                      return (
                        <div
                          key={asg.id}
                          onClick={() => onEditAssignment(asg)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        >
                          <span className="truncate text-slate-700 font-medium">{asg.title}</span>
                          <span className={`text-[10px] font-semibold shrink-0 ${urgency.colorClass}`}>
                            {urgency.timeRemainingText}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Filter Action */}
              <button
                type="button"
                onClick={() => onSelectSubjectFilter(subj.id)}
                className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <span>查看此學科所有作業清單</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
