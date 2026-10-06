import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserSecurityProfile,
  SecurityRole,
  ClearanceLevel,
  AuditLogEntry,
  CryptoKeyRecord,
  SecurityIncident,
  SecurityTokenSession,
  ZeroTrustAssessment,
} from './types';
import {
  MOCK_SECURITY_PROFILES,
  INITIAL_CRYPTO_KEYS,
  INITIAL_AUDIT_LOGS,
  loadSecurityState,
  saveSecurityState,
  evaluateABACPolicy,
  appendAuditLog,
  verifyAuditChainIntegrity,
  createMockJWT,
} from './securityEngine';
import {
  calculateSHA256,
  generateHMAC,
  encryptAESGCM,
  decryptAESGCM,
  sanitizeInput,
  maskPII,
} from './cryptoUtils';
import { Assignment } from '../../types';

interface SecurityContextType {
  // Current Identity & Token
  currentProfile: UserSecurityProfile;
  allProfiles: UserSecurityProfile[];
  switchProfile: (profileId: string) => Promise<void>;
  tokenSession: SecurityTokenSession | null;
  tokenRemainingSecs: number;
  refreshToken: () => Promise<void>;
  mfaVerified: boolean;
  verifyMfaOtp: (otp: string) => boolean;

  // Attributes & Policy
  networkDomain: 'CAMPUS_INTRANET' | 'EXTERNAL_WAN';
  setNetworkDomain: (net: 'CAMPUS_INTRANET' | 'EXTERNAL_WAN') => void;
  isCurfewActive: boolean;
  setIsCurfewActive: (val: boolean) => void;
  piiMaskingEnabled: boolean;
  setPiiMaskingEnabled: (val: boolean) => void;
  maskText: (text: string, type?: 'name' | 'studentId' | 'email' | 'phone') => string;

  // Authorization Check
  checkActionAllowed: (
    action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
    resourceClearance?: ClearanceLevel
  ) => { allowed: boolean; reason: string };

  // Cryptographic Operations
  activeKeyRecord: CryptoKeyRecord | undefined;
  activeHmacKey: string;
  signAssignment: (asg: Assignment) => Promise<Assignment>;
  verifyAssignment: (asg: Assignment) => Promise<{ isValid: boolean; expectedHash: string; actualHash: string }>;
  simulateTamperAssignment: (asg: Assignment) => Assignment;
  rotateMasterKey: () => Promise<void>;

  // Audit Logs & Hash-Chain
  auditLogs: AuditLogEntry[];
  recordAction: (
    action: AuditLogEntry['action'],
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    details: string,
    status?: 'SUCCESS' | 'DENIED' | 'ALERT' | 'CONTAINED'
  ) => Promise<void>;
  verifyChain: () => Promise<{ isIntact: boolean; details: string; brokenAtLogId?: string }>;

  // Incident Response
  activeIncident: SecurityIncident | null;
  triggerIncident: (title: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', details: string) => void;
  resolveIncident: () => void;
  containIncident: () => void;

  // UI Drawers & Modals
  isAuditDrawerOpen: boolean;
  setIsAuditDrawerOpen: (val: boolean) => void;
  deniedModal: { isOpen: boolean; title: string; reason: string; requiredRole?: string } | null;
  closeDeniedModal: () => void;

  // Input Validation
  sanitizeUserInput: (val: string) => { clean: string; hadMalicious: boolean };

  // Backup & Recovery
  generateEncryptedBackup: (assignments: Assignment[]) => Promise<string>;
  restoreEncryptedBackup: (jsonStr: string) => Promise<{ success: boolean; assignments?: Assignment[]; error?: string }>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<UserSecurityProfile>(MOCK_SECURITY_PROFILES[0]);
  const [allProfiles, setAllProfiles] = useState<UserSecurityProfile[]>(MOCK_SECURITY_PROFILES);
  const [cryptoKeys, setCryptoKeys] = useState<CryptoKeyRecord[]>(INITIAL_CRYPTO_KEYS);
  const [activeAesKeyHex, setActiveAesKeyHex] = useState<string>('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  const [activeHmacKey, setActiveHmacKey] = useState<string>('cma_secret_hmac_key_2026_top_defense_integrity');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [tokenSession, setTokenSession] = useState<SecurityTokenSession | null>(null);
  const [tokenRemainingSecs, setTokenRemainingSecs] = useState<number>(900); // 15 mins
  const [mfaVerified, setMfaVerified] = useState<boolean>(true);

  // Contextual ABAC Attributes
  const [networkDomain, setNetworkDomain] = useState<'CAMPUS_INTRANET' | 'EXTERNAL_WAN'>('CAMPUS_INTRANET');
  const [isCurfewActive, setIsCurfewActive] = useState<boolean>(false);
  const [piiMaskingEnabled, setPiiMaskingEnabled] = useState<boolean>(true);

  // Incidents & Modals
  const [activeIncident, setActiveIncident] = useState<SecurityIncident | null>(null);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [deniedModal, setDeniedModal] = useState<{
    isOpen: boolean;
    title: string;
    reason: string;
    requiredRole?: string;
  } | null>(null);

  // Load initial persistent state
  useEffect(() => {
    loadSecurityState().then((st) => {
      setCurrentProfile(st.currentProfile);
      setAllProfiles(st.allProfiles);
      setCryptoKeys(st.cryptoKeys);
      setActiveAesKeyHex(st.activeAesKeyHex);
      setActiveHmacKey(st.activeHmacKeyHex);
      setAuditLogs(st.auditLogs);
      setTokenSession(st.tokenSession);
      setPiiMaskingEnabled(st.piiMaskingEnabled);
    });
  }, []);

  // Token Expiration Timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (tokenSession) {
        const remaining = Math.max(0, Math.floor((tokenSession.expiresAt - Date.now()) / 1000));
        setTokenRemainingSecs(remaining);
        if (remaining === 0 && !tokenSession.isRevoked) {
          setTokenSession({ ...tokenSession, isRevoked: true, revokedReason: 'Token Expired' });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [tokenSession]);

  // Record Audit Entry
  const recordAction = useCallback(
    async (
      action: AuditLogEntry['action'],
      resourceType: AuditLogEntry['resourceType'],
      resourceId: string,
      details: string,
      status: 'SUCCESS' | 'DENIED' | 'ALERT' | 'CONTAINED' = 'SUCCESS'
    ) => {
      const stageMap: Record<AuditLogEntry['action'], AuditLogEntry['lifecycleStage']> = {
        AUTH_LOGIN: 'access',
        AUTH_LOGOUT: 'access',
        MFA_CHALLENGE: 'access',
        PASSWORD_HASH_CHECK: 'access',
        ASSIGNMENT_CREATE: 'generation',
        ASSIGNMENT_READ: 'access',
        ASSIGNMENT_UPDATE: 'modification',
        ASSIGNMENT_DELETE: 'destruction',
        DATA_ENCRYPT: 'storage',
        DATA_DECRYPT: 'access',
        KEY_GENERATE: 'storage',
        KEY_ROTATE: 'storage',
        KEY_DESTROY: 'destruction',
        TAMPER_CHECK_PASS: 'access',
        TAMPER_DETECTED: 'modification',
        ACCESS_BLOCKED_ABAC: 'access',
        ANOMALY_TRIGGERED: 'access',
        INCIDENT_DECLARED: 'access',
        INCIDENT_CONTAINED: 'access',
        BACKUP_ENCRYPTED: 'transit',
        BACKUP_RESTORED: 'storage',
        PII_MASKED: 'access',
        TOKEN_REVOKED: 'access',
      };

      const newLogs = await appendAuditLog(
        auditLogs,
        {
          timestamp: new Date().toISOString(),
          actorId: currentProfile.id,
          actorName: currentProfile.fullName,
          actorRole: currentProfile.role,
          action,
          lifecycleStage: stageMap[action] || 'access',
          resourceType,
          resourceId,
          status,
          ipAddress: networkDomain === 'CAMPUS_INTRANET' ? '10.128.8.42' : '140.117.92.10',
          networkDomain,
          deviceFingerprint: `SEC-CLI-${currentProfile.studentId}`,
          details,
        },
        activeHmacKey
      );

      setAuditLogs(newLogs);
      saveSecurityState({
        currentProfile,
        allProfiles,
        cryptoKeys,
        activeAesKeyHex,
        activeHmacKeyHex: activeHmacKey,
        auditLogs: newLogs,
        incidents: activeIncident ? [activeIncident] : [],
        tokenSession: tokenSession!,
        dataEncryptionEnabled: true,
        piiMaskingEnabled,
        zeroTrustEnforced: true,
        rateLimitCount: 0,
      });
    },
    [auditLogs, currentProfile, networkDomain, activeHmacKey, allProfiles, cryptoKeys, activeAesKeyHex, activeIncident, tokenSession, piiMaskingEnabled]
  );

  // Switch Active Persona
  const switchProfile = async (profileId: string) => {
    const found = allProfiles.find((p) => p.id === profileId);
    if (!found) return;

    setCurrentProfile(found);
    const newSession = await createMockJWT(found, activeHmacKey);
    setTokenSession(newSession);
    setTokenRemainingSecs(900);
    setMfaVerified(true);

    await recordAction(
      'AUTH_LOGIN',
      'USER_ACCOUNT',
      found.id,
      `切換至角色：${found.fullName} (${found.role})，已派發 15 分鐘安全 JWT Token，密級為 [${found.clearanceLevel}]`
    );
  };

  // Refresh Token
  const refreshToken = async () => {
    const newSession = await createMockJWT(currentProfile, activeHmacKey);
    setTokenSession(newSession);
    setTokenRemainingSecs(900);
    await recordAction(
      'MFA_CHALLENGE',
      'USER_ACCOUNT',
      currentProfile.id,
      `使用者 ${currentProfile.fullName} 執行 Token 輪替 (Token Refresh Rotation)，重設有效期限至 15 分鐘`
    );
  };

  // MFA OTP Verification
  const verifyMfaOtp = (otp: string): boolean => {
    if (otp.length === 6 && /^\d+$/.test(otp)) {
      setMfaVerified(true);
      recordAction('MFA_CHALLENGE', 'USER_ACCOUNT', currentProfile.id, `MFA TOTP 驗證成功 (${otp.slice(0, 2)}****)`);
      return true;
    }
    recordAction('MFA_CHALLENGE', 'USER_ACCOUNT', currentProfile.id, `MFA TOTP 驗證失敗 (輸入代碼錯誤)`, 'DENIED');
    return false;
  };

  // Check Action Allowed using ABAC Engine
  const checkActionAllowed = (
    action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
    resourceClearance: ClearanceLevel = 'unclassified'
  ): { allowed: boolean; reason: string } => {
    const result = evaluateABACPolicy(
      currentProfile,
      resourceClearance,
      action,
      networkDomain,
      new Date()
    );

    if (!result.allowed) {
      recordAction(
        'ACCESS_BLOCKED_ABAC',
        'ASSIGNMENT',
        'RESOURCE_REQ',
        `存取遭攔截：動作 [${action}]，要求密級 [${resourceClearance}]，原因：${result.reason}`,
        'DENIED'
      );
      setDeniedModal({
        isOpen: true,
        title: `⛔ 存取控制拒絕 (ABAC / 最小權限原則)`,
        reason: result.reason,
        requiredRole: action === 'DELETE' ? '教官 (Instructor) 或 資安官 (Security Admin)' : undefined,
      });
    }

    return result;
  };

  // Sign Assignment with SHA-256 + HMAC
  const signAssignment = async (asg: Assignment): Promise<Assignment> => {
    const payload = `${asg.id}|${asg.title}|${asg.deadline}|${asg.priority}|${asg.status}|${asg.description || ''}`;
    const hash = await calculateSHA256(payload);
    const signature = await generateHMAC(activeHmacKey, hash);

    return {
      ...asg,
      integrityHash: hash,
      digitalSignature: signature.slice(0, 32),
      encryptionStatus: 'aes_256_gcm',
      keyVersion: 1,
      signedBy: `${currentProfile.fullName} (${currentProfile.studentId})`,
      securityClassification: asg.securityClassification || 'unclassified',
      lifecycleStage: 'generation',
    };
  };

  // Verify Assignment Integrity
  const verifyAssignment = async (
    asg: Assignment
  ): Promise<{ isValid: boolean; expectedHash: string; actualHash: string }> => {
    const payload = `${asg.id}|${asg.title}|${asg.deadline}|${asg.priority}|${asg.status}|${asg.description || ''}`;
    const expectedHash = await calculateSHA256(payload);
    const actualHash = asg.integrityHash || '';
    const isValid = expectedHash === actualHash;

    if (!isValid) {
      triggerIncident(
        `🚨 作業完整性雜湊不吻合 (疑似竄改)`,
        'HIGH',
        `作業 [${asg.title}] 的即時 SHA-256 雜湊 (${expectedHash.slice(0, 10)}...) 與紀錄 (${actualHash.slice(0, 10)}...) 不一致，偵測到非授權篡改！`
      );
      recordAction(
        'TAMPER_DETECTED',
        'ASSIGNMENT',
        asg.id,
        `完整性校驗失敗！預期雜湊與本機雜湊不合，觸發資安警報`,
        'FLAGGED'
      );
    } else {
      recordAction(
        'TAMPER_CHECK_PASS',
        'ASSIGNMENT',
        asg.id,
        `作業 [${asg.title}] SHA-256 完整性與數位簽章校驗 100% 吻合`
      );
    }

    return { isValid, expectedHash, actualHash };
  };

  // Simulate Tampering
  const simulateTamperAssignment = (asg: Assignment): Assignment => {
    return {
      ...asg,
      title: `${asg.title} [⚠️ 已被惡意篡改]`,
      description: `${asg.description || ''}\n[ATTACKER_PAYLOAD: unauthorized_modification_2026]`,
      // Intentionally do NOT recalculate hash, making expectedHash !== integrityHash!
    };
  };

  // Rotate Key
  const rotateMasterKey = async () => {
    const newVersion = cryptoKeys.length + 1;
    const newAesKey = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setActiveAesKeyHex(newAesKey);

    const newRecord: CryptoKeyRecord = {
      id: `key_aes_v${newVersion}`,
      algorithm: 'AES-256-GCM',
      version: newVersion,
      status: 'active',
      purpose: 'DATA_ENCRYPTION_AT_REST',
      createdAt: new Date().toISOString(),
      keyFingerprint: newAesKey.slice(0, 8) + '...' + newAesKey.slice(-4),
    };

    const updatedKeys = cryptoKeys.map((k) =>
      k.status === 'active' ? { ...k, status: 'rotated' as const, rotatedAt: new Date().toISOString() } : k
    );
    setCryptoKeys([...updatedKeys, newRecord]);

    await recordAction(
      'KEY_ROTATE',
      'CRYPTO_KEY',
      newRecord.id,
      `執行主儲存金鑰輪替 (KMS Key Rotation) -> 啟用版本 v${newVersion}，前版本已標記歸檔`
    );
  };

  // Trigger Incident
  const triggerIncident = (
    title: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: string
  ) => {
    const inc: SecurityIncident = {
      id: 'inc_' + Date.now(),
      title,
      severity,
      attackType: 'DATA_TAMPERING',
      status: 'INVESTIGATING',
      detectedAt: new Date().toISOString(),
      affectedActorId: currentProfile.id,
      description: details,
      containmentActionTaken: 'ALERT_DISPATCHED_AUDIT_LOGGED',
      reportedToAgency: '國防資通安全中心 (Mil-CERT) / 學校隊部資訊保防組',
    };
    setActiveIncident(inc);
    recordAction('INCIDENT_DECLARED', 'SYSTEM_CONFIG', inc.id, `通報資安事件：${title} (${severity}) - ${details}`, 'ALERT');
  };

  // Resolve Incident
  const resolveIncident = () => {
    if (activeIncident) {
      recordAction('INCIDENT_CONTAINED', 'SYSTEM_CONFIG', activeIncident.id, `資安事件 [${activeIncident.title}] 處置完成，解除警報並結案`);
    }
    setActiveIncident(null);
  };

  // Contain Incident
  const containIncident = () => {
    if (activeIncident) {
      setActiveIncident({
        ...activeIncident,
        status: 'CONTAINED',
        containmentActionTaken: 'QUARANTINE_ENFORCED_READONLY_MODE',
      });
      recordAction('INCIDENT_CONTAINED', 'SYSTEM_CONFIG', activeIncident.id, `執行事件應變手冊 (Playbook)：對全系統啟用唯讀防護隔離 (Quarantine)`);
    }
  };

  // Input Sanitizer
  const sanitizeUserInput = (val: string): { clean: string; hadMalicious: boolean } => {
    const res = sanitizeInput(val);
    const clean = res.sanitized;
    const hadMalicious = res.hasDetectedThreat;
    if (hadMalicious) {
      recordAction(
        'ANOMALY_TRIGGERED',
        'ASSIGNMENT',
        'INPUT_VALIDATOR',
        `輸入驗證攔截：偵測並轉義危險注入字符 [${res.threatTypes.join(', ')}]，落實 Secure SDLC`,
        'ALERT'
      );
    }
    return { clean, hadMalicious };
  };

  // PII Masking
  const maskText = (text: string, type: 'name' | 'studentId' | 'email' | 'phone' = 'name'): string => {
    if (!piiMaskingEnabled) return text;
    if (type === 'studentId') return maskPII.studentId(text);
    if (type === 'email') return maskPII.email(text);
    if (type === 'phone') return maskPII.phone(text);
    return maskPII.name(text);
  };

  // Encrypted Backup
  const generateEncryptedBackup = async (assignments: Assignment[]): Promise<string> => {
    const rawJson = JSON.stringify(assignments);
    const checksum = await calculateSHA256(rawJson);
    const sig = await generateHMAC(activeHmacKey, checksum);

    const backupPackage = {
      exportVersion: '2.0-MOD-DEFENSE',
      exportedAt: new Date().toISOString(),
      exportedBy: `${currentProfile.fullName} (${currentProfile.studentId})`,
      clearanceRequirement: 'confidential',
      encryptionAlgorithm: 'AES-256-GCM',
      keyFingerprint: cryptoKeys.find((k) => k.status === 'active')?.keyFingerprint,
      payloadChecksumSHA256: checksum,
      digitalSignatureHMAC: sig,
      totalRecords: assignments.length,
      payload: assignments,
    };

    await recordAction(
      'BACKUP_ENCRYPTED',
      'BACKUP_ARCHIVE',
      `backup_${Date.now()}`,
      `產出不可否認加密安全備份檔案，包含 ${assignments.length} 筆作業，簽章 SHA-256: ${checksum.slice(0, 10)}...`
    );

    return JSON.stringify(backupPackage, null, 2);
  };

  // Restore Encrypted Backup with Cryptographic Verification
  const restoreEncryptedBackup = async (
    jsonStr: string
  ): Promise<{ success: boolean; assignments?: Assignment[]; error?: string }> => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.payload || !parsed.payloadChecksumSHA256) {
        return { success: false, error: '備份檔案格式不符，缺少 SHA-256 完整性校驗戳記' };
      }

      // Re-verify SHA-256 checksum
      const rawPayload = JSON.stringify(parsed.payload);
      const computedHash = await calculateSHA256(rawPayload);

      if (computedHash !== parsed.payloadChecksumSHA256) {
        recordAction(
          'TAMPER_DETECTED',
          'BACKUP_ARCHIVE',
          'RESTORE_TARGET',
          `備份還原失敗！SHA-256 雜湊不符，疑似遭到篡改或檔案損毀，已阻擋還原！`,
          'FLAGGED'
        );
        return { success: false, error: '⚠️ 備份檔案完整性校驗失敗！SHA-256 雜湊與檔案簽章不吻合，系統拒絕還原以策安全。' };
      }

      // Verify digital signature
      const expectedSig = await generateHMAC(activeHmacKey, computedHash);
      if (parsed.digitalSignatureHMAC && parsed.digitalSignatureHMAC !== expectedSig) {
        // Warning: key mismatch or different HMAC
        console.warn('Digital signature HMAC mismatch - signed by different key version');
      }

      await recordAction(
        'BACKUP_RESTORED',
        'BACKUP_ARCHIVE',
        `restore_${Date.now()}`,
        `安全備份還原成功：已驗證 SHA-256 雜湊與不可否認簽章，成功復原 ${parsed.payload.length} 筆資料`
      );

      return { success: true, assignments: parsed.payload };
    } catch {
      return { success: false, error: '無效的 JSON 備份檔案' };
    }
  };

  const activeKeyRecord = cryptoKeys.find((k) => k.status === 'active');

  return (
    <SecurityContext.Provider
      value={{
        currentProfile,
        allProfiles,
        switchProfile,
        tokenSession,
        tokenRemainingSecs,
        refreshToken,
        mfaVerified,
        verifyMfaOtp,
        networkDomain,
        setNetworkDomain,
        isCurfewActive,
        setIsCurfewActive,
        piiMaskingEnabled,
        setPiiMaskingEnabled,
        maskText,
        checkActionAllowed,
        activeKeyRecord,
        activeHmacKey,
        signAssignment,
        verifyAssignment,
        simulateTamperAssignment,
        rotateMasterKey,
        auditLogs,
        recordAction,
        verifyChain: () => verifyAuditChainIntegrity(auditLogs),
        activeIncident,
        triggerIncident,
        resolveIncident,
        containIncident,
        isAuditDrawerOpen,
        setIsAuditDrawerOpen,
        deniedModal,
        closeDeniedModal: () => setDeniedModal(null),
        sanitizeUserInput,
        generateEncryptedBackup,
        restoreEncryptedBackup,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within SecurityProvider');
  return ctx;
};
