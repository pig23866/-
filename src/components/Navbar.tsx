import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  Bell,
  Download,
  Upload,
  RotateCcw,
  HardDrive,
  LogOut,
  User as UserIcon,
  CheckCircle,
  Calendar,
  Shield,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { playChime, requestNotificationPermission } from '../lib/notifications';

interface NavbarProps {
  user: User | null;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenAddModal: () => void;
  onOpenSchedule: () => void;
  onOpenSecurity?: () => void;
  isSecurityView?: boolean;
  onExportBackup: () => void;
  onRestoreBackup?: () => void;
  onResetData: () => void;
  notificationGranted: boolean;
  setNotificationGranted: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isAuthenticated,
  isSigningIn,
  onSignIn,
  onSignOut,
  onOpenAddModal,
  onOpenSchedule,
  onOpenSecurity,
  isSecurityView,
  onExportBackup,
  onRestoreBackup,
  onResetData,
  notificationGranted,
  setNotificationGranted,
}) => {
  const [currentClock, setCurrentClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const day = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentClock(`${month}月${date}日 週${day} ${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNotification = async () => {
    if (!notificationGranted) {
      const granted = await requestNotificationPermission();
      setNotificationGranted(granted);
      if (granted) playChime('info');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                作業統整系統
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200/60">
                期限提醒 • 學科分類
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              目前時間：{currentClock}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Button */}
          <button
            type="button"
            onClick={handleToggleNotification}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              notificationGranted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
            }`}
            title={notificationGranted ? '桌面即時提醒已啟用' : '點擊啟用作業期限桌面通知'}
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Timetable / Schedule Button */}
          <button
            id="navbar-open-schedule-btn"
            type="button"
            onClick={onOpenSchedule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 hover:border-blue-200 rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="開啟陸官正98期全週課表"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>全週課表</span>
          </button>

          {/* Security Lifecycle Architecture (作業一) */}
          <button
            id="navbar-open-security-btn"
            type="button"
            onClick={onOpenSecurity}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              isSecurityView
                ? 'bg-slate-900 text-blue-400 border-slate-900 shadow-xs'
                : 'text-slate-700 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 border-blue-200'
            }`}
            title="國防資安作業一：全生命週期資安架構 (Identity, Access, Crypto, Audit, IR)"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">資安架構</span>
            <span className="text-[10px] px-1.5 py-0.2 font-bold bg-blue-600 text-white rounded">作業一</span>
          </button>

          {/* Backup Export */}
          <button
            type="button"
            onClick={onExportBackup}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="產出不可否認安全加密備份檔案 (附帶 SHA-256 Checksum 與數位簽章)"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">安全備份</span>
          </button>

          {/* Backup Restore */}
          {onRestoreBackup && (
            <button
              type="button"
              onClick={onRestoreBackup}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-blue-750 bg-white hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="還原安全備份 (自動進行 SHA-256 完整性與數位簽章核驗)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">還原備份</span>
            </button>
          )}

          {/* Reset Demo */}
          <button
            type="button"
            onClick={onResetData}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="重設示範資料"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>示範資料</span>
          </button>

          {/* Google Auth Status / Sign In Button */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <div
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-xl"
                title={`已連結 Google 帳號: ${user.email || user.displayName}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-600" />
                )}
                <span className="text-xs font-semibold text-slate-700 max-w-[80px] sm:max-w-[110px] truncate hidden xs:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="雲端硬碟已連線" />
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="登出 Google 帳號"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="pl-1 sm:pl-2 border-l border-slate-200">
              <GoogleSignInButton onClick={onSignIn} isLoading={isSigningIn} />
            </div>
          )}

          {/* Primary Add Assignment Button */}
          <button
            id="navbar-add-assignment-btn"
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-blue-300 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增作業</span>
          </button>
        </div>
      </div>
    </header>
  );
};
