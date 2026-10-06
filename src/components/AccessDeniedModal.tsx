import React from 'react';
import { ShieldAlert, X, ArrowRight, UserCheck, Lock } from 'lucide-react';
import { useSecurity } from '../lib/security/SecurityContext';

export const AccessDeniedModal: React.FC = () => {
  const { deniedModal, closeDeniedModal, allProfiles, switchProfile, currentProfile } = useSecurity();

  if (!deniedModal || !deniedModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-rose-950">
                {deniedModal.title}
              </h3>
              <p className="text-xs text-rose-700">最小權限原則 (Least Privilege) 存取控制</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDeniedModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">攔截原因說明：</span>
            {deniedModal.reason}
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
            <div>
              <div className="font-bold">當前登入身分：</div>
              <div className="text-blue-700">
                {currentProfile.fullName} [{currentProfile.role}]
              </div>
            </div>
            <span className="px-2 py-1 text-[11px] font-bold bg-white text-blue-800 rounded border border-blue-300">
              密級: {currentProfile.clearanceLevel}
            </span>
          </div>

          {/* Quick Privilege Escalation / Persona Switch Guide */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>實測權限分級體驗：</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              若欲驗證「教官」或「資安保防官」的刪除與極機密讀寫權限，可直接點擊下方切換身分：
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  switchProfile('user_ins_chou');
                  closeDeniedModal();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>切換為 周韻寰 (教官)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  switchProfile('user_sec_admin');
                  closeDeniedModal();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>切換為 王建業 (資安官)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">已記入區塊鏈防竄改稽核鏈</span>
          <button
            type="button"
            onClick={closeDeniedModal}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
