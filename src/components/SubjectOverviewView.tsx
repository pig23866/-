import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  Flame,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Subject, Assignment } from '../types';
import { getUrgencyInfo } from '../lib/dateUtils';

interface SubjectOverviewViewProps {
  subjects: Subject[];
  assignments: Assignment[];
  onSelectSubjectFilter: (subjectId: string) => void;
  onEditAssignment: (asg: Assignment) => void;
  onAddNewForSubject: (subjectId: string) => void;
  onLoadSampleAssignments?: () => void;
}

// Custom Tooltip for Recharts with Dark Mode Support
const CustomChartTooltip: React.FC<any> = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md min-w-[160px] animate-in fade-in duration-100">
        <p className="font-bold text-slate-200 border-b border-slate-700/60 pb-1.5 mb-2 flex items-center justify-between">
          <span>{label}</span>
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span className="text-slate-300 truncate">{entry.name}:</span>
              </div>
              <span className="font-bold text-white shrink-0 font-mono">
                {entry.value} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Urgency Pie Tooltip
const UrgencyPieTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md min-w-[170px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
          <span className="font-bold text-sm text-slate-100">{data.name}</span>
        </div>
        <p className="text-slate-300 mb-1">
          作業數量：<span className="font-bold text-white font-mono">{data.value} 筆</span>
        </p>
        <p className="text-[11px] text-slate-400">{data.desc}</p>
      </div>
    );
  }
  return null;
};

export const SubjectOverviewView: React.FC<SubjectOverviewViewProps> = ({
  subjects,
  assignments,
  onSelectSubjectFilter,
  onEditAssignment,
  onAddNewForSubject,
  onLoadSampleAssignments,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'completion' | 'urgent' | 'trend'>('all');

  // Overall Statistics
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (a) => a.status === 'completed' || a.status === 'submitted'
  ).length;
  const pendingAssignments = totalAssignments - completedAssignments;
  const overallCompletionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  // Urgent assignments (overdue or due within 24h)
  const overdueAssignments = assignments.filter(
    (a) => a.status !== 'completed' && a.status !== 'submitted' && getUrgencyInfo(a.deadline, a.status).level === 'overdue'
  );
  const dueTodayAssignments = assignments.filter(
    (a) => a.status !== 'completed' && a.status !== 'submitted' && getUrgencyInfo(a.deadline, a.status).level === 'today'
  );
  const urgentCount = overdueAssignments.length + dueTodayAssignments.length;

  // 1. 各學科/課程完成率圖表資料 (BarChart Data)
  const completionChartData = useMemo(() => {
    return subjects
      .map((subj) => {
        const subjAssignments = assignments.filter((a) => a.subjectId === subj.id);
        const total = subjAssignments.length;
        const completed = subjAssignments.filter(
          (a) => a.status === 'completed' || a.status === 'submitted'
        ).length;
        const pending = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Clean short name for x-axis
        let shortName = subj.name.replace(/^\(必\)/, '').trim();
        if (shortName.length > 7) shortName = shortName.slice(0, 6) + '..';

        return {
          id: subj.id,
          fullName: subj.name,
          name: shortName,
          code: subj.code,
          total,
          已完成: completed,
          待繳交: pending,
          完成率: rate,
          color: subj.color,
        };
      })
      .filter((item) => item.total > 0 || totalAssignments === 0)
      .slice(0, 10);
  }, [subjects, assignments, totalAssignments]);

  // 2. 緊急作業分布資料 (Donut / PieChart Data)
  const urgencyDistributionData = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let dueSoon = 0; // 1-3 days
    let dueThisWeek = 0; // 4-7 days
    let dueLater = 0; // > 7 days
    let completed = 0;

    const now = new Date();

    assignments.forEach((a) => {
      if (a.status === 'completed' || a.status === 'submitted') {
        completed++;
        return;
      }
      const deadline = new Date(a.deadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        overdue++;
      } else if (diffHours <= 24) {
        dueToday++;
      } else if (diffHours <= 72) {
        dueSoon++;
      } else if (diffHours <= 168) {
        dueThisWeek++;
      } else {
        dueLater++;
      }
    });

    const list = [
      { name: '已逾期 (需立即處理)', value: overdue, fill: '#EF4444', desc: '已超過規定繳交時間' },
      { name: '今日截止 (<24h)', value: dueToday, fill: '#F59E0B', desc: '今天即將截止，緊急' },
      { name: '3天內截止 (近期)', value: dueSoon, fill: '#3B82F6', desc: '建議今日安排時間撰寫' },
      { name: '本週截止 (4-7天)', value: dueThisWeek, fill: '#6366F1', desc: '進度仍在正常排程中' },
      { name: '充裕 / 長程 (>7天)', value: dueLater, fill: '#10B981', desc: '繳交期限尚充裕' },
      { name: '已完成 / 已繳交', value: completed, fill: '#8B5CF6', desc: '已完成或送出' },
    ];

    // Filter out 0 value entries unless all are 0
    const filtered = list.filter((item) => item.value > 0);
    return filtered.length > 0 ? filtered : [{ name: '暫無作業', value: 1, fill: '#94A3B8', desc: '尚未建立任何作業' }];
  }, [assignments]);

  // 3. 過期作業趨勢與截止時間分布 (AreaChart Data)
  const timelineTrendData = useMemo(() => {
    const now = new Date();
    const daysRange = [-3, -2, -1, 0, 1, 2, 3, 5, 7, 10, 14];

    return daysRange.map((offset) => {
      const targetDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const targetDayStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      let label = targetDayStr;
      if (offset === 0) label = `今天 (${targetDayStr})`;
      else if (offset === -1) label = `昨天 (${targetDayStr})`;
      else if (offset === 1) label = `明天 (${targetDayStr})`;

      // Count deadlines falling on or before this day
      const targetEndMs = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59).getTime();

      // Overdue at this point
      const overdueCount = assignments.filter((a) => {
        if (a.status === 'completed' || a.status === 'submitted') return false;
        const dl = new Date(a.deadline).getTime();
        return dl < now.getTime() && (offset <= 0 ? dl <= targetEndMs : true);
      }).length;

      // Deadlines on this exact date
      const dueOnDate = assignments.filter((a) => {
        const dl = new Date(a.deadline);
        return dl.toDateString() === targetDate.toDateString();
      }).length;

      // Completed up to now
      const completedCount = assignments.filter((a) => a.status === 'completed' || a.status === 'submitted').length;

      return {
        label,
        dayOffset: offset,
        已逾期趨勢: overdueCount,
        當日截止量: dueOnDate,
        已完成累積: completedCount,
      };
    });
  }, [assignments]);

  return (
    <div id="subject-overview-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & KPI Cards */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <BarChart3 className="w-3.5 h-3.5" />
                Recharts 數據視覺化
              </span>
              <span className="text-xs text-slate-400">即時作業狀態分析</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              作業概覽與統計面板
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              統整各學科作業完成率、緊急作業分布與過期作業趨勢，清楚掌握學習進度與繳交時間點。
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {totalAssignments === 0 && onLoadSampleAssignments && (
              <button
                type="button"
                onClick={onLoadSampleAssignments}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:scale-102 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                載入示範作業 (8筆)
              </button>
            )}
            <button
              type="button"
              onClick={() => onAddNewForSubject(subjects[0]?.id || 'course-cs-prog')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              新增作業
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
          {/* Card 1: Total Assignments */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>作業總數</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {totalAssignments}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>已完成: {completedAssignments}</span>
              <span>待辦: {pendingAssignments}</span>
            </div>
          </div>

          {/* Card 2: Overall Completion Rate */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>整體完成率</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
              {overallCompletionRate}%
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${overallCompletionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Urgent Assignments (Due Today) */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>今日與緊急</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {urgentCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              今日截止：{dueTodayAssignments.length} 筆
            </p>
          </div>

          {/* Card 4: Overdue Assignments */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>已逾期作業</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${overdueAssignments.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {overdueAssignments.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {overdueAssignments.length > 0 ? '請優先儘速補交' : '無逾期，進度正常'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Switcher Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeChartTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            全部圖表總覽
          </button>
          <button
            type="button"
            onClick={() => setActiveChartTab('completion')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeChartTab === 'completion'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            各學科完成率
          </button>
          <button
            type="button"
            onClick={() => setActiveChartTab('urgent')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeChartTab === 'urgent'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            緊急作業分布
          </button>
          <button
            type="button"
            onClick={() => setActiveChartTab('trend')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeChartTab === 'trend'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            過期趨勢分析
          </button>
        </div>

        {totalAssignments === 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>目前為空作業清單，點選上方「載入示範作業」即可預覽圖表</span>
          </div>
        )}
      </div>

      {/* Grid of 3 Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: 各學科作業完成率 (BarChart) */}
        {(activeChartTab === 'all' || activeChartTab === 'completion') && (
          <div className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs ${activeChartTab === 'completion' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  各學科作業完成率與繳交進度
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  比較各學科「已完成」與「待繳交」作業數量及完成比率
                </p>
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={completionChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip unit="筆" />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar dataKey="已完成" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="待繳交" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>提示：綠色為已完成/已繳交，黃色為未完成待辦項目</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                統計共 {completionChartData.length} 門課程
              </span>
            </div>
          </div>
        )}

        {/* CHART 2: 緊急作業分布 (Donut / PieChart) */}
        {(activeChartTab === 'all' || activeChartTab === 'urgent') && (
          <div className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs ${activeChartTab === 'urgent' ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-amber-500" />
                  緊急作業分布比例
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  依截止期限緊迫度統計：逾期、今日截止、近期與充裕
                </p>
              </div>
            </div>

            <div className="h-[280px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {urgencyDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<UrgencyPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Statistic */}
              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                  {pendingAssignments}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">待處理作業</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>逾期 ({overdueAssignments.length})</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
                <span>今日截止 ({dueTodayAssignments.length})</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                可將滑鼠懸停於區塊檢視說明
              </span>
            </div>
          </div>
        )}

        {/* CHART 3: 過期作業趨勢與截止時間軸 (AreaChart) */}
        {(activeChartTab === 'all' || activeChartTab === 'trend') && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  過期作業趨勢與未來截止排程分析
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  追蹤作業逾期數量變化，並預測未來各天的到期負載量
                </p>
              </div>

              {overdueAssignments.length > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>目前有 {overdueAssignments.length} 筆作業已逾期，需優先補繳</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>全部作業掌握中，無過期積壓！</span>
                </div>
              )}
            </div>

            <div className="h-[290px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip unit="筆" />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="已逾期趨勢"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOverdue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="當日截止量"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="已完成累積"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDone)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>橫軸為時間推移（過去天數至未來兩週），縱軸為作業數量。</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                當日截止量高峰期建議提早安排時間完成
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Course Detail Breakdown Cards */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              各學科/課程詳細清單與作業統計卡片
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              點擊可直接篩選該課程作業，或為特定課程新增作業項目
            </p>
          </div>
        </div>

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

            const remainingMinutes = subjAssignments
              .filter((a) => a.status !== 'completed' && a.status !== 'submitted')
              .reduce((acc, a) => acc + (a.estimatedMinutes || 60), 0);

            const pendingList = subjAssignments
              .filter((a) => a.status !== 'completed' && a.status !== 'submitted')
              .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
              .slice(0, 3);

            return (
              <div
                key={subj.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: subj.color }}
                      />
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {subj.name}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono shrink-0">({subj.code})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddNewForSubject(subj.id)}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                      title={`新增 ${subj.name} 作業`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
                      <span>完成率</span>
                      <span className="font-bold text-slate-800 dark:text-white">{completionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">總計作業</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{total}</span>
                    </div>
                    <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-100 dark:border-amber-900/50">
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300">待繳交</span>
                      <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{pending}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${overdue > 0 ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/60' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'}`}>
                      <span className={`block text-[11px] ${overdue > 0 ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                        已逾期
                      </span>
                      <span className={`text-sm font-bold ${overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
                        {overdue}
                      </span>
                    </div>
                  </div>

                  {/* Remaining Estimated Workload */}
                  {remainingMinutes > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      預估尚需花費：
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {Math.floor(remainingMinutes / 60) > 0
                          ? `${Math.floor(remainingMinutes / 60)} 小時 ${remainingMinutes % 60} 分鐘`
                          : `${remainingMinutes} 分鐘`}
                      </span>
                    </p>
                  )}

                  {/* Upcoming items in this subject */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">近期待辦項目：</span>
                    {pendingList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">無待辦事項，進度超前！</p>
                    ) : (
                      pendingList.map((asg) => {
                        const urgency = getUrgencyInfo(asg.deadline, asg.status);
                        return (
                          <div
                            key={asg.id}
                            onClick={() => onEditAssignment(asg)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="truncate text-slate-700 dark:text-slate-200 font-medium">{asg.title}</span>
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
                  className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <span>查看此學科所有作業清單</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
