import React from 'react';
import { AlertCircle, Clock, Bell, CheckCircle2, ChevronRight } from 'lucide-react';
import { Assignment } from '../types';
import { getUrgencyInfo } from '../lib/dateUtils';
import { playChime, requestNotificationPermission } from '../lib/notifications';

interface DeadlineAlertBannerProps {
  assignments: Assignment[];
  onFilterUrgent: () => void;
  isUrgentFilterActive: boolean;
  notificationGranted: boolean;
  setNotificationGranted: (val: boolean) => void;
}

export const DeadlineAlertBanner: React.FC<DeadlineAlertBannerProps> = ({
  assignments,
  onFilterUrgent,
  isUrgentFilterActive,
  notificationGranted,
  setNotificationGranted,
}) => {
  const pendingAssignments = assignments.filter((a) => a.status !== 'completed' && a.status !== 'submitted');

  const overdueList = pendingAssignments.filter((a) => getUrgencyInfo(a.deadline, a.status).level === 'overdue');
  const todayList = pendingAssignments.filter((a) => getUrgencyInfo(a.deadline, a.status).level === 'today');
  const tomorrowList = pendingAssignments.filter((a) => getUrgencyInfo(a.deadline, a.status).level === 'tomorrow');

  // Find the single next upcoming deadline
  const sortedPending = [...pendingAssignments].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );
  const nextUp = sortedPending[0];
  const nextUrgency = nextUp ? getUrgencyInfo(nextUp.deadline, nextUp.status) : null;

  const handleEnableNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationGranted(granted);
    if (granted) {
      playChime('info');
    }
  };

  if (pendingAssignments.length === 0) {
    return (
      <div
        id="deadline-banner-clean"
        className="mb-6 p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900">太棒了！所有作業皆已完成或繳交</h4>
            <p className="text-xs text-emerald-700 mt-0.5">目前沒有未結的課業繳交項目，保持良好學習步調。</p>
          </div>
        </div>
      </div>
    );
  }

  const hasUrgent = overdueList.length > 0 || todayList.length > 0;

  return (
    <div
      id="deadline-alert-banner"
      className={`mb-6 p-4 rounded-2xl border transition-all shadow-xs ${
        hasUrgent
          ? 'bg-gradient-to-r from-red-50 via-rose-50 to-amber-50/60 border-red-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasUrgent
                ? 'bg-red-500 text-white shadow-xs shadow-red-200 animate-pulse'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {hasUrgent ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900">
                {hasUrgent ? '作業期限提醒警示' : '目前作業進度總覽'}
              </h4>

              {overdueList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white animate-pulse">
                  {overdueList.length} 項逾期
                </span>
              )}
              {todayList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                  {todayList.length} 項今日截止
                </span>
              )}
              {tomorrowList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  {tomorrowList.length} 項明日截止
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-1">
              {nextUp ? (
                <>
                  最近待辦：<span className="font-semibold text-slate-800">{nextUp.title}</span> —{' '}
                  <span className={`font-semibold ${nextUrgency?.colorClass}`}>
                    {nextUrgency?.timeRemainingText}
                  </span>
                </>
              ) : (
                '目前待繳清單正常。'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          {!notificationGranted && (
            <button
              id="enable-notifications-btn"
              type="button"
              onClick={handleEnableNotification}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white/80 hover:bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>開啟瀏覽器提醒</span>
            </button>
          )}

          {hasUrgent && (
            <button
              id="filter-urgent-toggle-btn"
              type="button"
              onClick={onFilterUrgent}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-2xs ${
                isUrgentFilterActive
                  ? 'bg-red-600 text-white shadow-red-200'
                  : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
              }`}
            >
              <span>{isUrgentFilterActive ? '顯示全部作業' : '只看急件與今日截止'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
