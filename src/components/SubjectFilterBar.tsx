import React from 'react';
import {
  List,
  Kanban,
  Calendar as CalendarIcon,
  PieChart,
  CalendarDays,
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { Subject, ViewMode } from '../types';

interface SubjectFilterBarProps {
  subjects: Subject[];
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'all' | 'pending' | 'done';
  onStatusFilterChange: (s: 'all' | 'pending' | 'done') => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  sortBy: 'deadline' | 'priority' | 'subject';
  onSortByChange: (s: 'deadline' | 'priority' | 'subject') => void;
  subjectCounts: Record<string, number>;
  totalCount: number;
}

export const SubjectFilterBar: React.FC<SubjectFilterBarProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  subjectCounts,
  totalCount,
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="assignment-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋作業名稱、內容、備註或檔案..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded-md"
            >
              清除
            </button>
          )}
        </div>

        {/* Status Filter & Sort Dropdown */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onStatusFilterChange('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange('pending')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'pending'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              待繳交
            </button>
            <button
              type="button"
              onClick={() => onStatusFilterChange('done')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === 'done'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              已完成
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="assignment-sort-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="text-xs bg-transparent border-0 text-slate-700 font-medium py-1.5 pr-6 pl-1 rounded-lg focus:ring-0 cursor-pointer"
            >
              <option value="deadline">按繳交期限 (最急優先)</option>
              <option value="priority">按重要優先級 (高→低)</option>
              <option value="subject">按學科類別分類</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="清單檢視"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('board')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'board'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="看板檢視"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="行事曆檢視"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('schedule')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'schedule'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="全週課表系統"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('subjects')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'subjects'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="學科統計"
            >
              <PieChart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('security')}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'security'
                  ? 'bg-slate-900 text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="資安生命週期管理系統 (作業一：Identity, Access, Crypto, Audit, IR)"
            >
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-[11px] font-bold hidden sm:inline">資安架構</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Category Bar (分類各科作業內容) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium px-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>學科分類：</span>
        </div>

        <button
          type="button"
          onClick={() => onSelectSubject(null)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedSubjectId === null
              ? 'bg-slate-900 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200'
          }`}
        >
          <span>全部科目</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedSubjectId === null ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {subjects.map((subj) => {
          const isSelected = selectedSubjectId === subj.id;
          const count = subjectCounts[subj.id] || 0;

          return (
            <button
              key={subj.id}
              type="button"
              onClick={() => onSelectSubject(isSelected ? null : subj.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1 font-semibold shadow-xs'
                  : 'hover:bg-slate-100/80'
              } ${subj.badgeBg} border ${subj.badgeBorder}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: subj.color }}
              />
              <span>{subj.name}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 text-slate-700 font-semibold shadow-2xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
