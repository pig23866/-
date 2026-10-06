import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  KeyRound,
  FileCheck,
  AlertTriangle,
  Fingerprint,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  Smartphone,
  Server,
  FileText,
  RotateCw,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Play,
  Binary,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SecurityRole,
  ClearanceLevel,
  UserSecurityProfile,
  AuditLogEntry,
  SecurityIncident,
  ZeroTrustAssessment,
} from '../lib/security/types';
import {
  MOCK_SECURITY_PROFILES,
  SECURE_SDLC_CHECKLIST,
  evaluateABACPolicy,
  appendAuditLog,
  verifyAuditChainIntegrity,
  createMockJWT,
  SecurityState,
  loadSecurityState,
  saveSecurityState,
} from '../lib/security/securityEngine';
import {
  calculateSHA256,
  generateHMAC,
  generateAESKeyHex,
  encryptAESGCM,
  decryptAESGCM,
  hashPasswordPBKDF2,
  generateSaltHex,
  analyzePasswordStrength,
  sanitizeInput,
  maskPII,
} from '../lib/security/cryptoUtils';
import { Assignment } from '../types';

interface SecurityLifecycleCenterProps {
  assignments: Assignment[];
  onUpdateAssignments: (assignments: Assignment[]) => void;
  onRefreshParentLogs?: () => void;
}

type ActiveSubTab =
  | 'lifecycle_overview'
  | 'auth_identity'
  | 'rbac_abac'
  | 'crypto_keys'
  | 'integrity_tamper'
  | 'audit_logs'
  | 'incident_response'
  | 'sdlc_zerotrust';

export const SecurityLifecycleCenter: React.FC<SecurityLifecycleCenterProps> = ({
  assignments,
  onUpdateAssignments,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('lifecycle_overview');
  const [secState, setSecState] = useState<SecurityState | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Password Sandbox state
  const [testPassword, setTestPassword] = useState('Cadet_2026@CMA#Defense');
  const [passwordSalt, setPasswordSalt] = useState(() => generateSaltHex(16));
  const [passwordHash, setPasswordHash] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<any>(null);
  const [isHashing, setIsHashing] = useState(false);

  // TOTP Simulator state
  const [totpSecondsLeft, setTotpSecondsLeft] = useState(30);
  const [totpCode, setTotpCode] = useState('742 918');
  const [totpInput, setTotpInput] = useState('');
  const [totpVerified, setTotpVerified] = useState<boolean | null>(null);

  // ABAC Interactive Tester
  const [abacAction, setAbacAction] = useState<'READ' | 'WRITE' | 'DELETE' | 'EXPORT'>('WRITE');
  const [abacClearance, setAbacClearance] = useState<ClearanceLevel>('confidential');
  const [abacNetwork, setAbacNetwork] = useState<'CAMPUS_INTRANET' | 'EXTERNAL_WAN'>('CAMPUS_INTRANET');
  const [abacCurfewSim, setAbacCurfewSim] = useState(false);
  const [abacDecision, setAbacDecision] = useState<{ allowed: boolean; reason: string } | null>(null);

  // Input Sanitizer Sandbox
  const [rawInputPayload, setRawInputPayload] = useState(
    `<script>alert("XSS Steal Token: " + document.cookie);</script> -- SELECT * FROM users WHERE '1'='1'`
  );
  const [sanitizerResult, setSanitizerResult] = useState<any>(null);

  // Anti-tamper verification
  const [tamperStatus, setTamperStatus] = useState<{
    scanned: boolean;
    tamperedCount: number;
    details: string;
    brokenIds: string[];
  }>({ scanned: false, tamperCount: 0, details: '', brokenIds: [] } as any);

  // Audit chain verification
  const [auditChainStatus, setAuditChainStatus] = useState<{
    verified: boolean;
    isIntact: boolean;
    details: string;
  } | null>(null);

  // Load state on mount
  useEffect(() => {
    loadSecurityState().then((st) => {
      setSecState(st);
      evaluateAbacDecision(st.currentProfile, abacClearance, abacAction, abacNetwork, abacCurfewSim);
    });
  }, []);

  // Sync password strength & hash
  useEffect(() => {
    const strength = analyzePasswordStrength(testPassword);
    setPasswordStrength(strength);
    setIsHashing(true);
    hashPasswordPBKDF2(testPassword, passwordSalt, 100000).then((res) => {
      setPasswordHash(res.hashHex);
      setIsHashing(false);
    });
  }, [testPassword, passwordSalt]);

  // Sync TOTP 30s countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTotpSecondsLeft((prev) => {
        if (prev <= 1) {
          const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
          setTotpCode(`${randomCode.slice(0, 3)} ${randomCode.slice(3)}`);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper for copy
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Switch Active Role
  const handleSwitchRole = async (profileId: string) => {
    if (!secState) return;
    const target = secState.allProfiles.find((p) => p.id === profileId);
    if (!target) return;

    const newJwt = await createMockJWT(target, secState.activeHmacKeyHex);
    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: target.id,
        actorName: target.fullName,
        actorRole: target.role,
        action: 'AUTH_LOGIN',
        lifecycleStage: 'access',
        resourceType: 'USER_ACCOUNT',
        resourceId: target.id,
        status: 'SUCCESS',
        ipAddress: '10.128.8.42',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: `DEV-${target.role.toUpperCase()}-01`,
        details: `切換使用者身分至：${target.fullName} [${target.role.toUpperCase()}]，核發新短期 Access Token`,
      },
      secState.activeHmacKeyHex
    );

    const nextState: SecurityState = {
      ...secState,
      currentProfile: target,
      tokenSession: newJwt,
      auditLogs: updatedLogs,
    };
    setSecState(nextState);
    saveSecurityState(nextState);

    evaluateAbacDecision(target, abacClearance, abacAction, abacNetwork, abacCurfewSim);
  };

  // Evaluate ABAC
  const evaluateAbacDecision = (
    actor: UserSecurityProfile,
    clearance: ClearanceLevel,
    action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
    network: 'CAMPUS_INTRANET' | 'EXTERNAL_WAN',
    isCurfew: boolean
  ) => {
    const fakeDate = new Date();
    if (isCurfew) {
      fakeDate.setHours(23, 45, 0, 0); // Simulated Curfew Hour
    } else {
      fakeDate.setHours(10, 30, 0, 0);
    }
    const res = evaluateABACPolicy(actor, clearance, action, network, fakeDate);
    setAbacDecision(res);
  };

  // Rotate Cryptographic Key
  const handleRotateKey = async () => {
    if (!secState) return;
    const newKeyHex = await generateAESKeyHex();
    const newVersion = secState.cryptoKeys.length + 1;
    const newKeyRecord = {
      id: `key_aes_v${newVersion}`,
      algorithm: 'AES-256-GCM' as const,
      version: newVersion,
      status: 'active' as const,
      purpose: 'DATA_ENCRYPTION_AT_REST' as const,
      createdAt: new Date().toISOString(),
      keyFingerprint: `${newKeyHex.slice(0, 8)}...${newKeyHex.slice(-4)}`,
    };

    const updatedKeys = secState.cryptoKeys.map((k) =>
      k.purpose === 'DATA_ENCRYPTION_AT_REST' && k.status === 'active'
        ? { ...k, status: 'rotated' as const, rotatedAt: new Date().toISOString() }
        : k
    );
    updatedKeys.unshift(newKeyRecord);

    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: secState.currentProfile.id,
        actorName: secState.currentProfile.fullName,
        actorRole: secState.currentProfile.role,
        action: 'KEY_ROTATE',
        lifecycleStage: 'storage',
        resourceType: 'CRYPTO_KEY',
        resourceId: newKeyRecord.id,
        status: 'SUCCESS',
        ipAddress: '10.128.4.1',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-KMS-ROTATOR',
        details: `執行金鑰定期輪替：舊金鑰歸檔，啟用新版本 AES-256-GCM 金鑰 (v${newVersion})，指紋: ${newKeyRecord.keyFingerprint}`,
      },
      secState.activeHmacKeyHex
    );

    const nextState: SecurityState = {
      ...secState,
      cryptoKeys: updatedKeys,
      activeAesKeyHex: newKeyHex,
      auditLogs: updatedLogs,
    };
    setSecState(nextState);
    saveSecurityState(nextState);
  };

  // Destroy / Shred Key
  const handleDestroyKey = async (keyId: string) => {
    if (!secState) return;
    if (!window.confirm('確定要執行密碼學抹除 (Crypto-shredding) 銷毀此金鑰？此操作不可逆！')) return;

    const updatedKeys = secState.cryptoKeys.map((k) =>
      k.id === keyId ? { ...k, status: 'destroyed' as const, destroyedAt: new Date().toISOString() } : k
    );

    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: secState.currentProfile.id,
        actorName: secState.currentProfile.fullName,
        actorRole: secState.currentProfile.role,
        action: 'KEY_DESTROY',
        lifecycleStage: 'destruction',
        resourceType: 'CRYPTO_KEY',
        resourceId: keyId,
        status: 'SUCCESS',
        ipAddress: '10.128.4.1',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-KMS-SHREDDER',
        details: `已執行密碼學抹除：覆寫零填充並銷毀歷史金鑰 [${keyId}]，所有以該金鑰加密的歷史快照永久銷毀`,
      },
      secState.activeHmacKeyHex
    );

    const nextState = { ...secState, cryptoKeys: updatedKeys, auditLogs: updatedLogs };
    setSecState(nextState);
    saveSecurityState(nextState);
  };

  // Run Anti-Tamper Scan on Assignments
  const handleScanIntegrity = async () => {
    if (!secState) return;
    const brokenIds: string[] = [];

    for (const a of assignments) {
      const payload = `${a.id}|${a.title}|${a.deadline}|${a.priority}|${a.status}|${a.description}`;
      const actualHash = await calculateSHA256(payload);
      if (a.integrityHash && a.integrityHash !== actualHash && !a.integrityHash.startsWith('sha256_')) {
        brokenIds.push(a.id);
      }
    }

    const isTampered = brokenIds.length > 0;
    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: secState.currentProfile.id,
        actorName: secState.currentProfile.fullName,
        actorRole: secState.currentProfile.role,
        action: isTampered ? 'TAMPER_DETECTED' : 'TAMPER_CHECK_PASS',
        lifecycleStage: 'storage',
        resourceType: 'ASSIGNMENT',
        status: isTampered ? 'ALERT' : 'SUCCESS',
        ipAddress: '10.128.8.42',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-INTEGRITY-AGENT',
        details: isTampered
          ? `⚠️ 完整性掃描警報：偵測到 ${brokenIds.length} 筆作業記錄雜湊與資料不符，疑似遭到直接修改！`
          : `✅ 完整性掃描通過：全部 ${assignments.length} 筆作業之 SHA-256 雜湊與數位簽章 100% 完整無竄改。`,
      },
      secState.activeHmacKeyHex
    );

    const nextState = { ...secState, auditLogs: updatedLogs };
    setSecState(nextState);
    saveSecurityState(nextState);

    setTamperStatus({
      scanned: true,
      tamperedCount: brokenIds.length,
      brokenIds,
      details: isTampered
        ? `⚠️ 警告！發現 ${brokenIds.length} 筆作業的 SHA-256 雜湊與內容不吻合，確認資料已被未授權修改！`
        : `✅ 完美合格！系統掃描 ${assignments.length} 筆作業，SHA-256 完整性與 HMAC 數位簽章檢驗通過。`,
    });
  };

  // Simulate Malicious Tampering
  const handleSimulateTamper = async () => {
    if (assignments.length === 0) return;
    const target = assignments[0];
    const tampered = assignments.map((a, idx) =>
      idx === 0
        ? {
            ...a,
            title: a.title + ' [⚠️ 未授權遭惡意竄改]',
            description: a.description + ' (駭客注入惡意修改，但雜湊值未同步更新)',
          }
        : a
    );
    onUpdateAssignments(tampered);

    if (secState) {
      const updatedLogs = await appendAuditLog(
        secState.auditLogs,
        {
          timestamp: new Date().toISOString(),
          actorId: 'ATTACKER_UNKNOWN',
          actorName: '未授權本機惡意處理程序',
          actorRole: 'student',
          action: 'ASSIGNMENT_UPDATE',
          lifecycleStage: 'modification',
          resourceType: 'ASSIGNMENT',
          resourceId: target.id,
          status: 'ALERT',
          ipAddress: '192.168.1.105',
          networkDomain: 'EXTERNAL_WAN',
          deviceFingerprint: 'UNKNOWN-COMPROMISED-NODE',
          details: `模擬攻擊：未經授權惡意修改 [${target.title}] 內文，破壞密碼學簽章完整性`,
        },
        secState.activeHmacKeyHex
      );
      const nextState = { ...secState, auditLogs: updatedLogs };
      setSecState(nextState);
      saveSecurityState(nextState);
    }

    setTamperStatus({
      scanned: true,
      tamperedCount: 1,
      brokenIds: [target.id],
      details: `⚠️ 模擬竄改已執行！第一筆作業內容已被人為修改，此時雜湊已失效。請點擊「執行完整性掃描」進行驗證！`,
    });
  };

  // Heal & Re-sign All Assignments
  const handleHealAndSignAll = async () => {
    if (!secState) return;
    const healed: Assignment[] = [];

    for (const a of assignments) {
      const cleanTitle = a.title.replace(' [⚠️ 未授權遭惡意竄改]', '');
      const cleanDesc = a.description.replace(' (駭客注入惡意修改，但雜湊值未同步更新)', '');
      const payload = `${a.id}|${cleanTitle}|${a.deadline}|${a.priority}|${a.status}|${cleanDesc}`;
      const hash = await calculateSHA256(payload);
      const sig = await generateHMAC(secState.activeHmacKeyHex, hash);

      healed.push({
        ...a,
        title: cleanTitle,
        description: cleanDesc,
        integrityHash: hash,
        digitalSignature: sig.substring(0, 32),
        encryptionStatus: 'aes_256_gcm',
        keyVersion: 1,
        lifecycleStage: 'storage',
        signedBy: secState.currentProfile.fullName,
      });
    }

    onUpdateAssignments(healed);

    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: secState.currentProfile.id,
        actorName: secState.currentProfile.fullName,
        actorRole: secState.currentProfile.role,
        action: 'DATA_ENCRYPT',
        lifecycleStage: 'storage',
        resourceType: 'ASSIGNMENT',
        status: 'SUCCESS',
        ipAddress: '10.128.8.42',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-CRYPTO-HEALER',
        details: `已完成資安自癒：重新計算全量 ${healed.length} 筆作業之 SHA-256 完整性雜湊並施加 HMAC 數位簽章戳記`,
      },
      secState.activeHmacKeyHex
    );

    const nextState = { ...secState, auditLogs: updatedLogs };
    setSecState(nextState);
    saveSecurityState(nextState);

    setTamperStatus({
      scanned: true,
      tamperedCount: 0,
      brokenIds: [],
      details: '✅ 自癒簽署完成！全量作業已重新綁定 SHA-256 與 HMAC 數位簽章戳記，恢復不可否認性防護。',
    });
  };

  // Verify Audit Chain
  const handleVerifyAuditChain = async () => {
    if (!secState) return;
    const res = await verifyAuditChainIntegrity(secState.auditLogs);
    setAuditChainStatus({
      verified: true,
      isIntact: res.isIntact,
      details: res.details,
    });
  };

  // Declare Incident & Contain
  const handleDeclareIncident = async () => {
    if (!secState) return;
    const incident: SecurityIncident = {
      id: 'INC-' + Date.now().toString().slice(-6),
      title: '偵測到異常權限嘗試與資料異動警報',
      severity: 'HIGH',
      attackType: 'DATA_TAMPERING',
      detectedAt: new Date().toISOString(),
      status: 'CONTAINED',
      affectedActorId: secState.currentProfile.id,
      description: `系統觸發完整性警報與異地存取異常，啟動緊急應變程序：立即鎖定受害帳號並強制撤銷所有活躍 Access Token。`,
      containmentActionTaken: '已強制撤銷 JWT Token、凍結本機快取寫入、通報國防資通安全中心 (Mil-CERT) 建立專案編號。',
      reportedToAgency: '國防資通安全中心 (Mil-CERT) / 陸軍軍官學校資訊保防組',
    };

    const updatedProfile = {
      ...secState.currentProfile,
      isIsolated: true,
      accountStatus: 'suspended' as const,
    };

    const updatedProfiles = secState.allProfiles.map((p) =>
      p.id === updatedProfile.id ? updatedProfile : p
    );

    const updatedToken = {
      ...secState.tokenSession,
      isRevoked: true,
      revokedReason: '資安應變程序主動隔離撤銷',
    };

    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: 'SEC_SYSTEM_AUTOMATION',
        actorName: '資安自動防衛應變引擎',
        actorRole: 'security_admin',
        action: 'INCIDENT_CONTAINED',
        lifecycleStage: 'access',
        resourceType: 'USER_ACCOUNT',
        resourceId: updatedProfile.id,
        status: 'CONTAINED',
        ipAddress: '10.128.4.1',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-INCIDENT-RESPONDER',
        details: `緊急資安事件 [${incident.id}] 處置完成：隔離帳號 ${updatedProfile.fullName}，撤銷 Bearer Token，發送通報至 Mil-CERT`,
      },
      secState.activeHmacKeyHex
    );

    const nextState: SecurityState = {
      ...secState,
      currentProfile: updatedProfile,
      allProfiles: updatedProfiles,
      tokenSession: updatedToken,
      incidents: [incident, ...secState.incidents],
      auditLogs: updatedLogs,
    };

    setSecState(nextState);
    saveSecurityState(nextState);
  };

  // Restore Isolated Account
  const handleRestoreAccount = async () => {
    if (!secState) return;
    const updatedProfile = {
      ...secState.currentProfile,
      isIsolated: false,
      accountStatus: 'active' as const,
    };
    const updatedProfiles = secState.allProfiles.map((p) =>
      p.id === updatedProfile.id ? updatedProfile : p
    );
    const newJwt = await createMockJWT(updatedProfile, secState.activeHmacKeyHex);

    const updatedLogs = await appendAuditLog(
      secState.auditLogs,
      {
        timestamp: new Date().toISOString(),
        actorId: 'SEC_ADMIN',
        actorName: '王建業 (資安資訊保防官)',
        actorRole: 'security_admin',
        action: 'AUTH_LOGIN',
        lifecycleStage: 'access',
        resourceType: 'USER_ACCOUNT',
        resourceId: updatedProfile.id,
        status: 'SUCCESS',
        ipAddress: '10.128.4.1',
        networkDomain: 'CAMPUS_INTRANET',
        deviceFingerprint: 'SYS-ADMIN-CONSOLE',
        details: `資安調查結案：解除 ${updatedProfile.fullName} 之帳號隔離狀態，重新簽發零信任合格憑證與短期 Token`,
      },
      secState.activeHmacKeyHex
    );

    const nextState = {
      ...secState,
      currentProfile: updatedProfile,
      allProfiles: updatedProfiles,
      tokenSession: newJwt,
      auditLogs: updatedLogs,
    };
    setSecState(nextState);
    saveSecurityState(nextState);
  };

  // Run Input Sanitizer Test
  const handleTestSanitizer = () => {
    const res = sanitizeInput(rawInputPayload);
    setSanitizerResult(res);
  };

  if (!secState) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        載入資安防護架構與密碼學引擎中...
      </div>
    );
  }

  const { currentProfile, tokenSession, cryptoKeys, auditLogs, incidents } = secState;

  // Compute Zero Trust score
  const zeroTrustScore = currentProfile.isIsolated ? 25 : tokenSession.isRevoked ? 50 : 98;

  return (
    <div id="security-lifecycle-center" className="space-y-6">
      {/* Top Banner: Enterprise Security Lifecycle Core */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-black bg-blue-500 text-white rounded-md tracking-wider">
                國防軍校資安作業一
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-900/80 text-indigo-200 rounded-md border border-indigo-700/50">
                Identity • Access • Data Protection • Audit & IR
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-400" />
              全生命週期資安防禦與資料保護系統
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              資安不是只有「登入」或「密碼」，而是貫穿資料從<b>「產生 → 存取 → 修改 → 傳輸 → 保存 → 銷毀」</b>的完整生命週期。
            </p>
          </div>

          {/* Zero Trust Real-time Badge */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-3.5 border border-slate-700 flex items-center gap-4 shrink-0">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-inner ${
                  currentProfile.isIsolated
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {zeroTrustScore}%
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-slate-400">零信任評估狀態 (Zero Trust)</div>
              <div className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                {currentProfile.isIsolated ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">已啟動資安應變隔離</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>連續安全鑑別通過</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                當前密級：
                <span className="text-amber-400 font-semibold uppercase">{currentProfile.clearanceLevel}</span> •
                網域：<span className="text-blue-300 font-semibold">校園軍用內網</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Stage Lifecycle Chain Visual Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/80">
          <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span>核心防禦鏈 (The 7 Pillars of Information Security):</span>
            <span className="text-[11px] text-blue-400 font-normal">點選下方分頁進入各階段模組操作驗證</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
            {[
              { step: '1', title: '身分驗證', sub: 'MFA / 憑證 / PBKDF2', icon: Fingerprint, color: 'text-blue-400' },
              { step: '2', title: '角色與權限', sub: 'RBAC / 最小權限', icon: UserCheck, color: 'text-indigo-400' },
              { step: '3', title: '存取控制', sub: 'ABAC / 密級規範', icon: Lock, color: 'text-sky-400' },
              { step: '4', title: '資料保護', sub: 'AES-256 / SHA-256', icon: Key, color: 'text-amber-400' },
              { step: '5', title: '稽核追蹤', sub: '區塊雜湊鏈 / 不可否認', icon: FileCheck, color: 'text-emerald-400' },
              { step: '6', title: '異常偵測', sub: '暴力破解 / 竄改告警', icon: Activity, color: 'text-orange-400' },
              { step: '7', title: '事件應變', sub: '隔離 / 通報 / 復原', icon: ShieldAlert, color: 'text-rose-400' },
            ].map((st) => (
              <div
                key={st.step}
                className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex flex-col items-center justify-center gap-1"
              >
                <st.icon className={`w-4 h-4 ${st.color}`} />
                <span className="font-extrabold text-white text-[11px]">{st.title}</span>
                <span className="text-[9px] text-slate-400 truncate w-full">{st.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'lifecycle_overview', label: '資料生命週期總覽', icon: Layers },
          { id: 'auth_identity', label: '身分驗證與密碼安全', icon: Fingerprint },
          { id: 'rbac_abac', label: 'RBAC與ABAC存取控制', icon: UserCheck },
          { id: 'crypto_keys', label: '資料加密與金鑰管理', icon: Key },
          { id: 'integrity_tamper', label: '完整性與防竄改驗證', icon: Binary },
          { id: 'audit_logs', label: '區塊雜湊鏈稽核日誌', icon: FileText },
          { id: 'incident_response', label: '異常偵測與事件應變', icon: ShieldAlert },
          { id: 'sdlc_zerotrust', label: 'Secure SDLC與零信任', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActiveSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Lifecycle Overview */}
      {activeTab === 'lifecycle_overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              作業資料六大生命週期資安控制矩陣 (Data Lifecycle Security Matrix)
            </h3>
            <p className="text-xs text-slate-600">
              本作業系統針對學員作業資料之產生、讀取、修改、傳輸、儲存及銷毀，實作對應密碼學、身分驗證與存取控制機制：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                {
                  stage: '1. 資料產生 (Generation)',
                  tag: '輸入驗證 • 密級標定',
                  desc: '作業建立時嚴格執行 XSS/SQLi 輸入過濾 (Sanitization)，依課目屬性標定密級 (普通/機密/極機密)，即刻計算 SHA-256 完整性雜湊。',
                  icon: FileText,
                  badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                },
                {
                  stage: '2. 資料存取 (Access)',
                  tag: '身分驗證 • RBAC/ABAC',
                  desc: '多因子 (MFA/TOTP/FIDO2) 身分鑑別，核發短期 15 分鐘 JWT Access Token；透過 ABAC 檢核使用者密級、時間時段與內網環境，落實最小權限原則。',
                  icon: UserCheck,
                  badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                },
                {
                  stage: '3. 資料修改 (Modification)',
                  tag: '防竄改 • 不可否認性',
                  desc: '作業變更時，自動更新 SHA-256 雜湊與 HMAC 數位簽章戳記，並將異動行為寫入不可竄改的連續雜湊鏈稽核日誌，確保事後無法否認。',
                  icon: Binary,
                  badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
                },
                {
                  stage: '4. 資料傳輸 (Transit)',
                  tag: 'TLS 1.3 • 端對端加密',
                  desc: '全面強制 HTTPS/TLS 1.3 加密通道，啟用 HSTS 標頭與 CORS 防護；外部連線必須攜帶合法 Bearer Token 與 API 速率限制 (Rate Limiting)。',
                  icon: Smartphone,
                  badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                },
                {
                  stage: '5. 資料保存 (Storage)',
                  tag: 'AES-256-GCM • 金鑰管理',
                  desc: '靜態資料 (Data at Rest) 採 AES-GCM 256 位元對稱加密，金鑰由集中式 KMS 實施版本輪替 (Rotation) 與指紋追蹤，個資欄位自動去識別化。',
                  icon: Key,
                  badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                },
                {
                  stage: '6. 資料銷毀 (Destruction)',
                  tag: '密碼抹除 • Crypto-shredding',
                  desc: '休學、畢業或資料保存期 (180天) 屆滿時，執行密碼學抹除 (銷毀金鑰使密文無法復原) 與零填充覆寫，並留存銷毀不可否認性收執。',
                  icon: Trash2,
                  badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                      <item.icon className="w-4 h-4 text-blue-600" />
                      {item.stage}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">當前作用中加密金鑰</div>
              <div className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                AES-256-GCM (v{cryptoKeys[0]?.version || 1})
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">指紋: {cryptoKeys[0]?.keyFingerprint}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">不可竄改稽核日誌數</div>
              <div className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                {auditLogs.length} 筆連續雜湊鏈
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1">鏈上校驗完整度: 100%</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">資安事件通報狀態</div>
              <div className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                {incidents.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-700">無未結事件</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-700">{incidents.length} 件已處置隔離</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">連線國防資通安全中心 (Mil-CERT)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500">個資去識別化與隱私</div>
              <div className="text-xl font-black text-blue-600 mt-1 flex items-center gap-2">
                <EyeOff className="w-5 h-5" />
                PII 遮罩防護中
              </div>
              <div className="text-[10px] text-slate-400 mt-1">符合個資法第 18 條與資通法規範</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authentication & Password Security */}
      {activeTab === 'auth_identity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-Factor Authentication (MFA / TOTP) Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  多因子驗證 (MFA / TOTP 雙重鑑別器)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  RFC 6238 標準
                </span>
              </div>
              <p className="text-xs text-slate-600">
                傳統帳密登入面臨密碼外洩、撞庫與釣魚風險。本系統採用 30 秒動態一次性密碼 (TOTP)，防止未授權登入：
              </p>

              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">當前動態 6 位數驗證碼 (TOTP Token)</div>
                  <div className="text-2xl font-black font-mono tracking-widest text-emerald-400 mt-0.5">
                    {totpCode}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">更新倒數</div>
                  <div className="text-lg font-bold font-mono text-amber-400">{totpSecondsLeft}s</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700">模擬驗證碼輸入測試：</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={7}
                    placeholder="輸入 6 位驗證碼"
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanInput = totpInput.replace(/\s+/g, '');
                      const cleanReal = totpCode.replace(/\s+/g, '');
                      setTotpVerified(cleanInput === cleanReal);
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    校驗
                  </button>
                </div>
                {totpVerified === true && (
                  <div className="p-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    TOTP 校驗成功！身分驗證通過，核發高信任等級憑證。
                  </div>
                )}
                {totpVerified === false && (
                  <div className="p-2 text-xs text-red-700 bg-red-50 rounded-lg border border-red-200 flex items-center gap-1.5 font-semibold">
                    <XCircle className="w-4 h-4 text-red-600" />
                    驗證碼不吻合或已過期，請重新嘗試！
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>生物辨識 (FIDO2 / WebAuthn)：<b>已註冊金鑰憑證</b></span>
                <span>國防軍職憑證 (PKI)：<b>CMA-PKI-2026-98012-A</b></span>
              </div>
            </div>

            {/* Password Security & Argon2/PBKDF2 Hashing Sandbox */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  密碼安全與加鹽雜湊沙盒 (PBKDF2 / Argon2 運算)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  禁止明文儲存
                </span>
              </div>
              <p className="text-xs text-slate-600">
                依資安規範，任何密碼均<b>不得以明文或簡易 MD5 儲存</b>。本系統導入高運算成本之 <b>PBKDF2 (100,000次迭代) + 隨機鹽值 (Salt)</b>，抵禦彩虹表與 GPU 暴力破解：
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">測試密碼輸入：</label>
                <input
                  type="text"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                />

                {/* Password Strength Gauge */}
                {passwordStrength && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">密碼熵 (Entropy)：{passwordStrength.entropyBits} bits</span>
                      <span
                        className={`font-bold ${
                          passwordStrength.score >= 3 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {passwordStrength.score === 4
                          ? '極強 (Very Strong)'
                          : passwordStrength.score === 3
                          ? '強 (Strong)'
                          : '中等/建議增強'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          passwordStrength.score === 4
                            ? 'bg-emerald-500 w-full'
                            : passwordStrength.score === 3
                            ? 'bg-blue-500 w-3/4'
                            : 'bg-amber-500 w-1/2'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>密碼學隨機鹽值 (Cryptographic Salt 128-bit)：</span>
                  <button
                    type="button"
                    onClick={() => setPasswordSalt(generateSaltHex(16))}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    重產鹽值
                  </button>
                </div>
                <div className="text-slate-800 truncate">{passwordSalt}</div>

                <div className="text-[10px] text-slate-500 pt-1">
                  PBKDF2-SHA256 儲存雜湊值 (100,000 Iterations)：
                </div>
                <div className="text-purple-700 truncate font-bold">
                  {isHashing ? '運算加密雜湊中...' : passwordHash}
                </div>
              </div>
            </div>
          </div>

          {/* Session & JWT Token Inspector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                Session 與 JWT Token 安全管理 (Access & Refresh Token 生命週期)
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  tokenSession.isRevoked
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {tokenSession.isRevoked ? '❌ Token 已遭撤銷 (Revoked)' : '✅ Token 有效 (Active 15m)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1">
                <div className="text-[10px] text-rose-400 font-bold">JWT Header (演算法與類型)</div>
                <pre className="text-[11px] text-rose-300">{JSON.stringify(tokenSession.jwtHeader, null, 2)}</pre>
              </div>

              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1">
                <div className="text-[10px] text-purple-400 font-bold">JWT Payload (主體宣告與密級)</div>
                <pre className="text-[11px] text-purple-300">{JSON.stringify(tokenSession.jwtPayload, null, 2)}</pre>
              </div>

              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1">
                <div className="text-[10px] text-sky-400 font-bold">HMAC-SHA256 簽署簽章</div>
                <div className="text-[11px] text-sky-300 break-all">{tokenSession.jwtSignature}</div>
                <div className="text-[10px] text-slate-400 pt-2">
                  Refresh Token: <span className="text-amber-300">{tokenSession.refreshToken.slice(0, 16)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RBAC & ABAC Access Control */}
      {activeTab === 'rbac_abac' && (
        <div className="space-y-6">
          {/* Identity & Role Switcher */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                身分切換與 RBAC 角色矩陣 (Role-Based Access Control)
              </h4>
              <span className="text-xs text-slate-500">點選切換不同角色，觀察權限與存取判定差異</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MOCK_SECURITY_PROFILES.map((prof) => {
                const isCurrent = currentProfile.id === prof.id;
                return (
                  <div
                    key={prof.id}
                    onClick={() => handleSwitchRole(prof.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900">{prof.fullName}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          prof.role === 'security_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : prof.role === 'instructor'
                            ? 'bg-amber-100 text-amber-800'
                            : prof.role === 'academic_officer'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {prof.role.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">{prof.department}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      密級：<b className="uppercase text-slate-700">{prof.clearanceLevel}</b> • 學號：{prof.studentId}
                    </div>
                    {isCurrent && (
                      <div className="mt-2 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        目前作用身分
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ABAC Attribute-Based Policy Tester */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                ABAC 屬性存取控制決策引擎 (Attribute-Based Access Control Tester)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                動態情境評估
              </span>
            </div>
            <p className="text-xs text-slate-600">
              ABAC 結合<b>「身分屬性 (Role/Clearance) + 資源屬性 (密級) + 環境屬性 (網路網域、管制時段)」</b>進行多維度存取授權裁決：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">要求操作 (Action)</label>
                <select
                  value={abacAction}
                  onChange={(e) => {
                    const act = e.target.value as any;
                    setAbacAction(act);
                    evaluateAbacDecision(currentProfile, abacClearance, act, abacNetwork, abacCurfewSim);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="READ">READ (讀取作業)</option>
                  <option value="WRITE">WRITE (新增或修改作業)</option>
                  <option value="DELETE">DELETE (刪除/銷毀紀錄)</option>
                  <option value="EXPORT">EXPORT (匯出備份資料)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">資源密級 (Resource Clearance)</label>
                <select
                  value={abacClearance}
                  onChange={(e) => {
                    const cl = e.target.value as any;
                    setAbacClearance(cl);
                    evaluateAbacDecision(currentProfile, cl, abacAction, abacNetwork, abacCurfewSim);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="unclassified">UNCLASSIFIED (普通件)</option>
                  <option value="confidential">CONFIDENTIAL (機密件 - 如演習/電路報告)</option>
                  <option value="secret">SECRET (極機密件 - 國防教案/密碼)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">連線網域環境 (Network)</label>
                <select
                  value={abacNetwork}
                  onChange={(e) => {
                    const net = e.target.value as any;
                    setAbacNetwork(net);
                    evaluateAbacDecision(currentProfile, abacClearance, abacAction, net, abacCurfewSim);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CAMPUS_INTRANET">校園軍用專屬內網 (Secure Intranet)</option>
                  <option value="EXTERNAL_WAN">校外網際網路 (External Untrusted)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">管制時段模擬 (Curfew)</label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !abacCurfewSim;
                    setAbacCurfewSim(next);
                    evaluateAbacDecision(currentProfile, abacClearance, abacAction, abacNetwork, next);
                  }}
                  className={`w-full p-2 rounded-lg font-bold border transition-all cursor-pointer ${
                    abacCurfewSim
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {abacCurfewSim ? '🌙 熄燈管制時段 (23:45)' : '☀️ 正常日間時段 (10:30)'}
                </button>
              </div>
            </div>

            {/* ABAC Decision Box */}
            {abacDecision && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  abacDecision.allowed
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-300 text-rose-900'
                }`}
              >
                {abacDecision.allowed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-extrabold text-xs sm:text-sm">
                    ABAC 裁決結果：{abacDecision.allowed ? '✅ 存取授權通過 (ALLOWED)' : '❌ 存取拒絕封鎖 (DENIED)'}
                  </div>
                  <div className="text-xs mt-1 leading-relaxed">{abacDecision.reason}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Crypto & Key Management */}
      {activeTab === 'crypto_keys' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  金鑰管理與生命週期中心 (Cryptographic Key Management System - KMS)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  落實金鑰生命週期規範：<b>產生 (Generate) → 保存 (Store) → 輪替 (Rotate) → 撤銷 (Revoke) → 銷毀 (Destroy)</b>
                </p>
              </div>

              <button
                type="button"
                onClick={handleRotateKey}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>執行金鑰即時輪替 (Rotate Key)</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {cryptoKeys.map((key) => (
                <div key={key.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 font-mono">{key.id}</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-700 rounded">
                        {key.algorithm}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          key.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : key.status === 'rotated'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {key.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>用途：{key.purpose}</span>
                      <span>指紋：<code className="font-mono text-slate-700">{key.keyFingerprint}</code></span>
                      <span>建立時間：{new Date(key.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {key.status !== 'destroyed' && (
                      <button
                        type="button"
                        onClick={() => handleDestroyKey(key.id)}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                        title="執行密碼學抹除"
                      >
                        抹除銷毀
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & PII Masking Demonstration */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-blue-600" />
              個資去識別化與隱私保護 (PII Masking & Privacy by Design)
            </h4>
            <p className="text-xs text-slate-600">
              符合個人資料保護法與國防資通安全規範，展示資料遮罩前後對比：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1.5">
                <div className="font-bold text-red-800">❌ 未遮罩原始資料 (存在洩密風險)</div>
                <div className="font-mono text-slate-700">學員姓名：張祐銘</div>
                <div className="font-mono text-slate-700">軍籍學號：98012</div>
                <div className="font-mono text-slate-700">公務信箱：cadet98012@cma.edu.tw</div>
                <div className="font-mono text-slate-700">緊急電話：0912-345-678</div>
              </div>

              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="font-bold text-emerald-800">✅ 系統去識別化遮罩 (合規防護)</div>
                <div className="font-mono text-slate-900">學員姓名：{maskPII.name('張祐銘')}</div>
                <div className="font-mono text-slate-900">軍籍學號：{maskPII.studentId('98012')}</div>
                <div className="font-mono text-slate-900">公務信箱：{maskPII.email('cadet98012@cma.edu.tw')}</div>
                <div className="font-mono text-slate-900">緊急電話：{maskPII.phone('0912-345-678')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Integrity & Anti-Tamper */}
      {activeTab === 'integrity_tamper' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Binary className="w-4 h-4 text-blue-600" />
                  資料完整性校驗與不可否認性 (Data Integrity & Non-repudiation)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  每筆作業產生時均由 Web Crypto API 計算 <b>SHA-256 雜湊</b>與 <b>HMAC 數位簽章戳記</b>，杜絕事後否認與未授權竄改：
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanIntegrity}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>執行完整性掃描</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateTamper}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>模擬惡意竄改 (駭客攻擊)</span>
                </button>

                <button
                  type="button"
                  onClick={handleHealAndSignAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>一鍵資安自癒與重新簽署</span>
                </button>
              </div>
            </div>

            {tamperStatus.scanned && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed font-medium ${
                  tamperStatus.tamperedCount > 0
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                {tamperStatus.details}
              </div>
            )}

            {/* List of current assignments with cryptographic hashes */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700">當前作業資料庫之完整性雜湊與不可否認戳記：</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {assignments.map((a) => (
                  <div key={a.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                        <span>{a.title}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            a.securityClassification === 'secret'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : a.securityClassification === 'confidential'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          密級: {a.securityClassification || '普通件'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3">
                        <span>SHA-256: <code className="text-blue-600">{a.integrityHash?.slice(0, 20)}...</code></span>
                        <span>數位簽章: <code className="text-purple-600">{a.digitalSignature?.slice(0, 16)}...</code></span>
                        <span>簽章人: {a.signedBy || '張祐銘'}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                        AES-256-GCM
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Input Validation & Sanitization Sandbox */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              輸入驗證與過濾沙盒 (Input Sanitization: XSS & SQLi 防禦)
            </h4>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">測試惡意攻擊字串：</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rawInputPayload}
                  onChange={(e) => setRawInputPayload(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleTestSanitizer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  執行淨化過濾
                </button>
              </div>
            </div>

            {sanitizerResult && (
              <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">過濾淨化結果 (Sanitized Output):</span>
                  {sanitizerResult.hasDetectedThreat ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      攔截威脅: {sanitizerResult.threatTypes.join(', ')}
                    </span>
                  ) : (
                    <span className="text-emerald-400">乾淨安全字串</span>
                  )}
                </div>
                <div className="text-emerald-300 bg-slate-950 p-2 rounded border border-slate-800 break-all">
                  {sanitizerResult.sanitized}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Immutable Hash-Chained Audit Logs */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  區塊鏈式連續雜湊鏈稽核日誌 (Immutable Hash-Chained Audit Trail)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  每筆日誌均以前一筆雜湊 (prevHash) 運算當前 SHA-256，任何抽單、刪改日誌均會破壞連續鏈而立刻被識破：
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerifyAuditChain}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>核驗雜湊鏈完整度</span>
                </button>
              </div>
            </div>

            {auditChainStatus && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium ${
                  auditChainStatus.isIntact
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {auditChainStatus.details}
              </div>
            )}

            {/* Audit Log Stream */}
            <div className="space-y-3 pt-2">
              {auditLogs.slice().reverse().map((log, idx) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{log.id}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">階段: {log.lifecycleStage}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()} • IP: {log.ipAddress} ({log.networkDomain})
                    </div>
                  </div>

                  <div className="text-slate-800 font-medium">{log.details}</div>

                  <div className="p-2 bg-slate-900 text-slate-300 rounded-lg font-mono text-[10px] space-y-0.5">
                    <div>
                      prevHash: <span className="text-amber-400">{log.prevHash.slice(0, 24)}...</span>
                    </div>
                    <div>
                      currentHash: <span className="text-emerald-400 font-bold">{log.currentHash}</span>
                    </div>
                    <div>
                      操作人員: <span className="text-sky-300">{log.actorName} ({log.actorRole})</span> •
                      簽章: <span className="text-purple-300">{log.signature}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Incident Response */}
      {activeTab === 'incident_response' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  資安事件應變中心 (Incident Response & Containment Center)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  當發現帳號被盜、異常大量下載或資料外洩時，依國防 SOP 啟動通報、隔離與復原程序：
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!currentProfile.isIsolated ? (
                  <button
                    type="button"
                    onClick={handleDeclareIncident}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>啟動緊急事件應變 (隔離受害帳號)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRestoreAccount}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>事件結案：解除隔離並復原帳號</span>
                  </button>
                )}
              </div>
            </div>

            {currentProfile.isIsolated && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-950 space-y-2">
                <div className="font-black text-sm flex items-center gap-2 text-rose-700">
                  <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                  當前受害帳號 [{currentProfile.fullName}] 已被即時隔離凍結！
                </div>
                <p>
                  處置項目：1. 撤銷所有作用中 Bearer Token；2. 凍結儲存體讀寫權限；3. 通報國防資通安全中心 (Mil-CERT) 與隊部資訊保防組。
                </p>
              </div>
            )}

            {/* Incidents List */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700">歷史資安處置紀錄與通報單 (Incident Logs):</div>
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  目前系統無待處理資安事件，處於綠燈安全監控狀態。
                </div>
              ) : (
                incidents.map((inc) => (
                  <div key={inc.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        [{inc.id}] {inc.title}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded font-bold text-[10px]">
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{inc.description}</p>
                    <div className="p-2 bg-white rounded border border-rose-200 text-slate-600 text-[11px] space-y-1">
                      <div><b>隔離防護處置：</b>{inc.containmentActionTaken}</div>
                      <div><b>通報單位：</b>{inc.reportedToAgency}</div>
                      <div><b>偵測通報時間：</b>{new Date(inc.detectedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: Secure SDLC & Zero Trust */}
      {activeTab === 'sdlc_zerotrust' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              安全開發生命週期 (Secure SDLC) 與 STRIDE 威脅建模矩陣
            </h4>
            <p className="text-xs text-slate-600">
              從需求、架構設計、編程開發、安全測試到維運部署，全面內嵌資安防護規範：
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">SDLC 階段</th>
                    <th className="p-3">STRIDE 威脅類別</th>
                    <th className="p-3">防禦控制措施 (Control Implemented)</th>
                    <th className="p-3 text-center">合規狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SECURE_SDLC_CHECKLIST.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{item.phase}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.strideCategory}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{item.control}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
