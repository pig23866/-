import React, { useState } from 'react';
import {
  X,
  History,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  Copy,
  ExternalLink,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useSecurity } from '../lib/security/SecurityContext';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose }) => {
  const { auditLogs, verifyChain } = useSecurity();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    isChecked: boolean;
    isIntact: boolean;
    details: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    const res = await verifyChain();
    setVerifyResult({
      isChecked: true,
      isIntact: res.isIntact,
      details: res.details,
    });
    setIsVerifying(false);
  };

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = auditLogs
    .slice()
    .reverse()
    .filter((log) => {
      if (filterAction === 'denied' && log.status !== 'DENIED') return false;
      if (filterAction === 'assignment' && !log.action.startsWith('ASSIGNMENT')) return false;
      if (filterAction === 'auth' && !log.action.startsWith('AUTH') && !log.action.startsWith('MFA')) return false;
      if (filterAction === 'security' && !log.action.includes('KEY') && !log.action.includes('TAMPER') && !log.action.includes('INCIDENT') && !log.action.includes('ABAC')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.resourceId.toLowerCase().includes(q) ||
          log.currentHash.toLowerCase().includes(q)
        );
      }
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 text-slate-100 h-full shadow-2xl border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>防竄改連續雜湊鏈稽核日誌</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-900 text-blue-300 rounded border border-blue-700">
                  不可否認性
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                每筆紀錄皆綁定前像雜湊 (SHA-256 Blockchain Ledger)，異動即破壞鏈路
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chain Integrity Verifier Bar */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            <div className="text-slate-400">目前累積稽核日誌數：<span className="font-mono font-bold text-white">{auditLogs.length} 筆</span></div>
            <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
              最新鏈頂雜湊: {auditLogs[auditLogs.length - 1]?.currentHash.slice(0, 18)}...
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isVerifying ? (
              <span>正在校驗全鏈...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>校驗全鏈完整性</span>
              </>
            )}
          </button>
        </div>

        {/* Verification Result Notification */}
        {verifyResult && (
          <div
            className={`p-3 text-xs border-b flex items-start gap-2.5 ${
              verifyResult.isIntact
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                : 'bg-red-950/80 border-red-800 text-red-200'
            }`}
          >
            {verifyResult.isIntact ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">
              <span className="font-bold">
                {verifyResult.isIntact ? '✅ 完整性校驗 100% 通過' : '🚨 偵測到日誌遭竄改中斷！'}
              </span>
              <p className="mt-0.5 text-[11px] opacity-90">{verifyResult.details}</p>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-slate-850 border-b border-slate-800 flex flex-wrap gap-2 text-xs">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋人員、動作、細節、雜湊值..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: '全部' },
              { id: 'assignment', label: '作業' },
              { id: 'denied', label: '遭拒(ABAC)' },
              { id: 'security', label: '密鑰/資安' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAction(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterAction === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Log Entries List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">無相符的稽核日誌紀錄</div>
          ) : (
            filteredLogs.map((log) => {
              const isDenied = log.status === 'DENIED';
              const isFlagged = log.status === 'FLAGGED';
              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    isDenied
                      ? 'bg-rose-950/40 border-rose-800/80'
                      : isFlagged
                      ? 'bg-amber-950/40 border-amber-800/80'
                      : 'bg-slate-850/80 border-slate-750 hover:border-slate-650'
                  }`}
                >
                  {/* Top Row: Action, Status, Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                          isDenied
                            ? 'bg-rose-900 text-rose-200'
                            : isFlagged
                            ? 'bg-amber-900 text-amber-200'
                            : 'bg-blue-900 text-blue-200'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        [{log.lifecycleStage.toUpperCase()}]
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('zh-TW', { hour12: false })}
                    </span>
                  </div>

                  {/* Details */}
                  <p className="text-slate-200 text-xs mb-2 leading-relaxed">{log.details}</p>

                  {/* Context: Actor, IP, Network */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 border-t border-slate-750/60 pt-2 mb-2">
                    <div>
                      執行人員: <span className="font-semibold text-slate-200">{log.actorName}</span>
                    </div>
                    <div>
                      角色: <span className="text-slate-300">[{log.actorRole}]</span>
                    </div>
                    <div>
                      網段: <span className="font-mono text-slate-300">{log.ipAddress}</span> ({log.networkDomain})
                    </div>
                  </div>

                  {/* Blockchain Hash Chain Link */}
                  <div className="bg-slate-900/90 rounded-lg p-2 font-mono text-[10px] space-y-1 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 truncate">
                      <span className="shrink-0 text-slate-500 mr-2">PrevHash:</span>
                      <span className="truncate">{log.prevHash}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-300 font-bold truncate">
                      <span className="shrink-0 text-slate-500 mr-2">CurrHash:</span>
                      <span className="truncate">{log.currentHash}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(log.currentHash, log.id)}
                        className="ml-1 text-slate-400 hover:text-white cursor-pointer"
                        title="複製 SHA-256 雜湊"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    {copiedId === log.id && (
                      <div className="text-[10px] text-emerald-400 font-sans">已複製 SHA-256 雜湊！</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
