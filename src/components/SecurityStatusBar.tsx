import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Key,
  Clock,
  RotateCw,
  FileCheck,
  Eye,
  EyeOff,
  Wifi,
  Moon,
  Sun,
  AlertTriangle,
  Lock,
  ChevronDown,
  Layers,
  History,
  Terminal,
} from 'lucide-react';
import { useSecurity } from '../lib/security/SecurityContext';

interface SecurityStatusBarProps {
  onOpenSecurityCenter: () => void;
  onOpenAuditDrawer: () => void;
}

export const SecurityStatusBar: React.FC<SecurityStatusBarProps> = ({
  onOpenSecurityCenter,
  onOpenAuditDrawer,
}) => {
  const {
    currentProfile,
    allProfiles,
    switchProfile,
    tokenRemainingSecs,
    refreshToken,
    mfaVerified,
    networkDomain,
    setNetworkDomain,
    isCurfewActive,
    setIsCurfewActive,
    piiMaskingEnabled,
    setPiiMaskingEnabled,
    maskText,
    auditLogs,
    activeKeyRecord,
    activeIncident,
    containIncident,
    resolveIncident,
  } = useSecurity();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const formatSecs = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getClearanceBadge = (level: string) => {
    switch (level) {
      case 'secret':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 rounded">極機密</span>;
      case 'confidential':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 rounded">機密</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">普通件</span>;
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'security_admin':
        return '資安保防官';
      case 'instructor':
        return '授課教官';
      case 'academic_officer':
        return '學藝股長';
      default:
        return '一般學員';
    }
  };

  return (
    <aside aria-label="全生命週期資安防護與零信任架構控制列" className="mb-4">
      {/* Active Incident Containment Banner (If Any) */}
      {activeIncident && (
        <div className="mb-3 p-3 bg-red-900 text-white rounded-2xl shadow-md border border-red-700 flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">{activeIncident.title}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-red-800 text-red-200 rounded">
                  等級: {activeIncident.severity}
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">{activeIncident.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={containIncident}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              啟動隔離處置 (Quarantine)
            </button>
            <button
              type="button"
              onClick={resolveIncident}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              解除警報結案
            </button>
          </div>
        </div>
      )}

      {/* Main Zero Trust Control Strip */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-3 sm:p-3.5 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Active Persona & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-950/80 border border-blue-800/80 rounded-xl text-blue-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">零信任身分</span>
          </div>

          {/* User Profile Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-98 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="切換身分角色 (實測 RBAC / ABAC 最小權限與密級限制)"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-100">
                {piiMaskingEnabled ? maskText(currentProfile.fullName, 'name') : currentProfile.fullName}
              </span>
              <span className="text-[11px] text-slate-400 hidden xs:inline">
                [{getRoleTitle(currentProfile.role)}]
              </span>
              {getClearanceBadge(currentProfile.clearanceLevel)}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-slate-850 rounded-2xl shadow-2xl border border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-750 mb-1 flex items-center justify-between">
                  <span>切換身分角色 (實測存取控制)</span>
                  <span className="text-[10px] text-blue-400">RBAC / ABAC</span>
                </div>
                <div className="space-y-1">
                  {allProfiles.map((p) => {
                    const isSelected = p.id === currentProfile.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          switchProfile(p.id);
                          setIsProfileDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{piiMaskingEnabled ? maskText(p.fullName, 'name') : p.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({p.studentId})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{getRoleTitle(p.role)} • {p.department.split('(')[0]}</p>
                        </div>
                        <div>{getClearanceBadge(p.clearanceLevel)}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 mt-1 bg-slate-900 rounded-xl text-[10px] text-slate-400 leading-relaxed border border-slate-800">
                  💡 提示：切換至「一般學員」時，刪除作業將依「最小權限原則」遭到攔截；切換至「教官」或「資安官」則享有高階核可權。
                </div>
              </div>
            )}
          </div>

          {/* Token Expiry Timer */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded-xl border border-slate-700 text-slate-300 text-[11px]"
            title="JWT Session Token 有效倒數，支援 JIT 展延輪替"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-amber-300">{formatSecs(tokenRemainingSecs)}</span>
            <button
              type="button"
              onClick={refreshToken}
              className="p-1 hover:text-white rounded transition-colors cursor-pointer"
              title="執行 Token Refresh (金鑰輪替刷新)"
            >
              <RotateCw className="w-3 h-3 text-slate-400 hover:text-blue-300" />
            </button>
          </div>
        </div>

        {/* Right: Environmental Attributes & Security Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PII Masking Toggle */}
          <button
            type="button"
            onClick={() => setPiiMaskingEnabled(!piiMaskingEnabled)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-colors cursor-pointer text-[11px] ${
              piiMaskingEnabled
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="個資與學號去識別化脫敏開關 (Data Privacy & Masking)"
          >
            {piiMaskingEnabled ? <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> : <Eye className="w-3.5 h-3.5" />}
            <span>個資遮罩: {piiMaskingEnabled ? '已啟用' : '關閉'}</span>
          </button>

          {/* Network Location (ABAC Attribute) */}
          <button
            type="button"
            onClick={() => setNetworkDomain(networkDomain === 'CAMPUS_INTRANET' ? 'EXTERNAL_WAN' : 'CAMPUS_INTRANET')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-colors cursor-pointer text-[11px] ${
              networkDomain === 'CAMPUS_INTRANET'
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                : 'bg-amber-950/70 text-amber-300 border-amber-700'
            }`}
            title="切換連線網段屬性 (實測 ABAC 國防軍網限制)"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{networkDomain === 'CAMPUS_INTRANET' ? '校園軍網專線' : '外部網際網路'}</span>
          </button>

          {/* Curfew Attribute */}
          <button
            type="button"
            onClick={() => setIsCurfewActive(!isCurfewActive)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-colors cursor-pointer text-[11px] ${
              isCurfewActive
                ? 'bg-purple-950/80 text-purple-300 border-purple-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="模擬宵禁管制時段 (23:00~05:00 限制一般學員新增/修改機密作業)"
          >
            {isCurfewActive ? <Moon className="w-3.5 h-3.5 text-purple-400" /> : <Sun className="w-3.5 h-3.5" />}
            <span>宵禁政策: {isCurfewActive ? '管制中' : '常態'}</span>
          </button>

          {/* Live Audit Log Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenAuditDrawer}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer text-[11px]"
            title="檢視區塊鏈式連續雜湊鏈稽核日誌 (不可否認性追蹤)"
          >
            <History className="w-3.5 h-3.5" />
            <span>稽核日誌 ({auditLogs.length})</span>
          </button>

          {/* Full Security Architecture Center Link */}
          <button
            type="button"
            onClick={onOpenSecurityCenter}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer text-[11px]"
            title="前往資安生命週期儀表板 (作業一完整規範與演練評測)"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>資安架構詳情</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
