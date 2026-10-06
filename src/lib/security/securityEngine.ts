// Core Information Security Lifecycle Engine

import {
  SecurityRole,
  ClearanceLevel,
  SecurityLifecycleStage,
  UserSecurityProfile,
  SecurityTokenSession,
  CryptoKeyRecord,
  AuditLogEntry,
  SecurityIncident,
  ZeroTrustAssessment,
  SecureSDLCItem,
} from './types';
import {
  calculateSHA256,
  generateHMAC,
  generateAESKeyHex,
  encryptAESGCM,
  decryptAESGCM,
  hashPasswordPBKDF2,
  generateSaltHex,
  sanitizeInput,
  maskPII,
} from './cryptoUtils';
import { Assignment } from '../../types';

// Pre-configured Military Academy & Student Profiles
export const MOCK_SECURITY_PROFILES: UserSecurityProfile[] = [
  {
    id: 'user_std_98012',
    username: 'cadet_chang',
    fullName: '張祐銘',
    role: 'student',
    clearanceLevel: 'unclassified',
    department: '陸軍官校正98期第1教授班(資訊組)',
    studentId: '98012',
    email: 'cadet98012@cma.edu.tw',
    accountStatus: 'active',
    mfaEnabled: true,
    biometricRegistered: true,
    pkiCertSerial: 'CMA-PKI-2026-98012-A',
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isIsolated: false,
  },
  {
    id: 'user_off_98005',
    username: 'officer_lin',
    fullName: '林志豪 (學藝股長)',
    role: 'academic_officer',
    clearanceLevel: 'confidential',
    department: '陸軍官校正98期第1教授班',
    studentId: '98005',
    email: 'officer98005@cma.edu.tw',
    accountStatus: 'active',
    mfaEnabled: true,
    biometricRegistered: true,
    pkiCertSerial: 'CMA-PKI-2026-98005-B',
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isIsolated: false,
  },
  {
    id: 'user_ins_chou',
    username: 'instructor_chou',
    fullName: '周韻寰 (副教授/導師)',
    role: 'instructor',
    clearanceLevel: 'secret',
    department: '陸軍軍官學校資訊工程學系',
    studentId: 'T088',
    email: 'chou_yh@cma.edu.tw',
    accountStatus: 'active',
    mfaEnabled: true,
    biometricRegistered: true,
    pkiCertSerial: 'MOD-MIL-PKI-2026-8809',
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isIsolated: false,
  },
  {
    id: 'user_sec_admin',
    username: 'sec_officer',
    fullName: '王建業 (資安資訊保防官)',
    role: 'security_admin',
    clearanceLevel: 'secret',
    department: '國防資通安全保防資訊處',
    studentId: 'SEC001',
    email: 'sec_admin@cma.mil.tw',
    accountStatus: 'active',
    mfaEnabled: true,
    biometricRegistered: true,
    pkiCertSerial: 'MOD-TOPSEC-PKI-0019',
    lastLoginAt: new Date().toISOString(),
    failedLoginAttempts: 0,
    isIsolated: false,
  },
];

// Initial Cryptographic Key Management Store
export const INITIAL_CRYPTO_KEYS: CryptoKeyRecord[] = [
  {
    id: 'key_aes_v1',
    algorithm: 'AES-256-GCM',
    version: 1,
    status: 'active',
    purpose: 'DATA_ENCRYPTION_AT_REST',
    createdAt: '2026-09-01T08:00:00Z',
    keyFingerprint: 'f48c9032...e7b2',
  },
  {
    id: 'key_hmac_v1',
    algorithm: 'HMAC-SHA256',
    version: 1,
    status: 'active',
    purpose: 'DIGITAL_SIGNATURE',
    createdAt: '2026-09-01T08:00:00Z',
    keyFingerprint: '992a71bc...481d',
  },
];

// Initial Blockchain-style Hash-Chained Audit Ledger
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_001',
    timestamp: '2026-09-14T08:00:15Z',
    actorId: 'user_sec_admin',
    actorName: '王建業 (資安資訊保防官)',
    actorRole: 'security_admin',
    action: 'KEY_GENERATE',
    lifecycleStage: 'storage',
    resourceType: 'CRYPTO_KEY',
    resourceId: 'key_aes_v1',
    status: 'SUCCESS',
    ipAddress: '10.128.4.1',
    networkDomain: 'CAMPUS_INTRANET',
    deviceFingerprint: 'DEVICE-CMA-SEC-PC01',
    details: '系統開機初始化：產生 AES-256-GCM 主儲存加密金鑰',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    currentHash: 'c7dfb918a38c82302319c8021d7b0032aa289c099b2512a819c43912a7bf8912',
    signature: 'SIG-HMAC-SEC-001',
  },
  {
    id: 'log_002',
    timestamp: '2026-09-14T08:05:00Z',
    actorId: 'user_std_98012',
    actorName: '張祐銘',
    actorRole: 'student',
    action: 'MFA_CHALLENGE',
    lifecycleStage: 'access',
    resourceType: 'USER_ACCOUNT',
    resourceId: 'user_std_98012',
    status: 'SUCCESS',
    ipAddress: '10.128.8.42',
    networkDomain: 'CAMPUS_INTRANET',
    deviceFingerprint: 'CADET-LAPTOP-98012',
    details: '通過 TOTP 雙因子 (MFA) 驗證登入作業統整系統',
    prevHash: 'c7dfb918a38c82302319c8021d7b0032aa289c099b2512a819c43912a7bf8912',
    currentHash: '4a919cd82b01289cf821a789c0128b99182a019b88219c8821a9c182a991b821',
    signature: 'SIG-HMAC-STD-98012',
  },
  {
    id: 'log_003',
    timestamp: '2026-09-14T08:10:22Z',
    actorId: 'user_std_98012',
    actorName: '張祐銘',
    actorRole: 'student',
    action: 'ASSIGNMENT_CREATE',
    lifecycleStage: 'generation',
    resourceType: 'ASSIGNMENT',
    resourceId: 'asg_digital_circuit',
    status: 'SUCCESS',
    ipAddress: '10.128.8.42',
    networkDomain: 'CAMPUS_INTRANET',
    deviceFingerprint: 'CADET-LAPTOP-98012',
    details: '產生新作業：數位電路設計實驗預習報告，密級標定：普通件，計算 SHA-256 完整性雜湊',
    prevHash: '4a919cd82b01289cf821a789c0128b99182a019b88219c8821a9c182a991b821',
    currentHash: 'e89a01b9821c90182c89012a9128b0128c891209b8192a0192b89120a9182c91',
    signature: 'SIG-HMAC-STD-98012',
  },
];

// Secure SDLC & STRIDE Threat Matrix
export const SECURE_SDLC_CHECKLIST: SecureSDLCItem[] = [
  {
    id: 'sdlc_01',
    phase: 'Requirements',
    title: '資料生命週期密級劃分與個資法/資通安全法規範',
    strideCategory: 'Information Disclosure',
    control: '定義作業資料分為「普通」、「機密」與「極機密」，落實個資遮罩與去識別化',
    status: 'ENFORCED',
  },
  {
    id: 'sdlc_02',
    phase: 'Design & Architecture',
    title: '身分鑑別與零信任架構 (Authentication & Zero Trust)',
    strideCategory: 'Spoofing',
    control: '全面導入多因子驗證 (MFA/TOTP/FIDO2)，持續檢驗網路環境與設備指紋，不信任內部預設',
    status: 'ENFORCED',
  },
  {
    id: 'sdlc_03',
    phase: 'Design & Architecture',
    title: '角色與屬性存取控制 (RBAC + ABAC) 與最小權限原則',
    strideCategory: 'Elevation of Privilege',
    control: '落實 Least Privilege，學生僅能讀寫自己作業，教官可批閱，特權提權採 JIT 限時機制',
    status: 'ENFORCED',
  },
  {
    id: 'sdlc_04',
    phase: 'Coding',
    title: '輸入驗證與過濾 (Input Sanitization)',
    strideCategory: 'Tampering',
    control: '全欄位強制 HTML 實體編碼防禦 XSS，參數化防禦 SQL Injection 與 Command Injection',
    status: 'COMPLIANT',
  },
  {
    id: 'sdlc_05',
    phase: 'Coding',
    title: '密碼學與資料保護 (AES-256-GCM & SHA-256 Checksum)',
    strideCategory: 'Tampering',
    control: '儲存體採 AES-256-GCM 對稱加密，金鑰定期輪替；紀錄附帶 SHA-256 雜湊與數位簽章防竄改',
    status: 'ENFORCED',
  },
  {
    id: 'sdlc_06',
    phase: 'Testing & SAST',
    title: '靜態程式碼分析 (SAST) 與相依套件漏洞稽核',
    strideCategory: 'Information Disclosure',
    control: 'TypeScript 嚴格型別檢查、相依套件無已知 CVE 漏洞、密碼禁止明文儲存 (使用 PBKDF2/Argon2)',
    status: 'COMPLIANT',
  },
  {
    id: 'sdlc_07',
    phase: 'Deployment & Ops',
    title: '不可竄改稽核日誌與資安事件應變 (Audit Hash-Chain & IR)',
    strideCategory: 'Repudiation',
    control: '區塊鏈式連續雜湊鏈稽核日誌，確保不可否認性；異常偵測自動觸發帳號隔離與通報處置流程',
    status: 'ENFORCED',
  },
];

// Helper to load and save security state from localStorage
const SEC_STORAGE_KEY = 'homework_security_state_v1';

export interface SecurityState {
  currentProfile: UserSecurityProfile;
  allProfiles: UserSecurityProfile[];
  cryptoKeys: CryptoKeyRecord[];
  activeAesKeyHex: string;
  activeHmacKeyHex: string;
  auditLogs: AuditLogEntry[];
  incidents: SecurityIncident[];
  tokenSession: SecurityTokenSession;
  dataEncryptionEnabled: boolean;
  piiMaskingEnabled: boolean;
  zeroTrustEnforced: boolean;
  rateLimitCount: number;
}

// Generate realistic JWT Token
export const createMockJWT = async (
  profile: UserSecurityProfile,
  hmacSecret: string
): Promise<SecurityTokenSession> => {
  const now = Date.now();
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: profile.id,
    role: profile.role,
    clearance: profile.clearanceLevel,
    iss: 'cma-auth-center',
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + 15 * 60 * 1000) / 1000), // 15 minutes
    jti: 'jti_' + Math.random().toString(36).substring(2, 10),
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const signature = await generateHMAC(hmacSecret, unsignedToken);
  const accessToken = `${unsignedToken}.${signature.substring(0, 32)}`;
  const refreshToken = `rft_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`;

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresAt: now + 15 * 60 * 1000,
    issuedAt: now,
    jwtHeader: header,
    jwtPayload: payload,
    jwtSignature: signature,
    isRevoked: false,
  };
};

/**
 * ABAC (Attribute-Based Access Control) Policy Evaluator
 * Evaluates Role + Clearance + Time of Day + Network Location
 */
export const evaluateABACPolicy = (
  actor: UserSecurityProfile,
  resourceClearance: ClearanceLevel,
  action: 'READ' | 'WRITE' | 'DELETE' | 'EXPORT',
  network: 'CAMPUS_INTRANET' | 'EXTERNAL_WAN',
  currentTime: Date = new Date()
): { allowed: boolean; reason: string } => {
  if (actor.isIsolated || actor.accountStatus !== 'active') {
    return { allowed: false, reason: '帳號已被停權或列為資安受害隔離對象，禁止存取任何資源。' };
  }

  // Clearance hierarchy: unclassified (1) < confidential (2) < secret (3)
  const clearanceRank = { unclassified: 1, confidential: 2, secret: 3 };
  if (clearanceRank[actor.clearanceLevel] < clearanceRank[resourceClearance]) {
    return {
      allowed: false,
      reason: `安全密級不足：使用者密級為 [${actor.clearanceLevel}]，此資源要求 [${resourceClearance}]。`,
    };
  }

  // Network Domain Restrictions
  if (resourceClearance === 'secret' && network !== 'CAMPUS_INTRANET') {
    return {
      allowed: false,
      reason: '高密級 (機密/極機密) 資源依國防法規僅限「軍校校園內部專用內網」環境存取。',
    };
  }

  // Curfew / After-hours restrictions for normal students (e.g. 23:00 - 05:30)
  const hour = currentTime.getHours();
  const isNightCurfew = hour >= 23 || hour < 5;
  if (actor.role === 'student' && isNightCurfew && action === 'WRITE') {
    return {
      allowed: false,
      reason: '宵夜管制時段 (23:00~05:00)：一般學員禁止進行修改或新增，依資安保防規範僅開放唯讀查閱。',
    };
  }

  // RBAC checks
  if (action === 'DELETE' && actor.role === 'student') {
    return { allowed: false, reason: '依最小權限原則 (Least Privilege)，學員帳號無法直接實體銷毀紀錄，僅能由教官或資安官核准。' };
  }

  return { allowed: true, reason: 'ABAC 政策驗證通過：身分、密級、網路脈絡與時間符合存取授權。' };
};

/**
 * Append Tamper-Evident Hash-Chained Audit Log
 */
export const appendAuditLog = async (
  currentLogs: AuditLogEntry[],
  entry: Omit<AuditLogEntry, 'id' | 'prevHash' | 'currentHash' | 'signature'>,
  hmacSecret: string
): Promise<AuditLogEntry[]> => {
  const prevEntry = currentLogs[currentLogs.length - 1];
  const prevHash = prevEntry
    ? prevEntry.currentHash
    : '0000000000000000000000000000000000000000000000000000000000000000';

  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const payloadToHash = `${prevHash}|${entry.timestamp}|${entry.actorId}|${entry.action}|${entry.details}`;
  const currentHash = await calculateSHA256(payloadToHash);
  const signature = await generateHMAC(hmacSecret, currentHash);

  const fullEntry: AuditLogEntry = {
    ...entry,
    id,
    prevHash,
    currentHash,
    signature: signature.substring(0, 24),
  };

  return [...currentLogs, fullEntry];
};

/**
 * Verify Integrity of Audit Chain (Blockchain Ledger Verifier)
 */
export const verifyAuditChainIntegrity = async (
  logs: AuditLogEntry[]
): Promise<{ isIntact: boolean; brokenAtLogId?: string; details: string }> => {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    if (i > 0 && entry.prevHash !== prevHash) {
      return {
        isIntact: false,
        brokenAtLogId: entry.id,
        details: `第 ${i + 1} 筆稽核日誌的前像雜湊 (prevHash) 與前筆不吻合，偵測到日誌遭人為截斷或竄改！`,
      };
    }

    const payloadToHash = `${entry.prevHash}|${entry.timestamp}|${entry.actorId}|${entry.action}|${entry.details}`;
    const expectedHash = await calculateSHA256(payloadToHash);
    if (expectedHash !== entry.currentHash) {
      return {
        isIntact: false,
        brokenAtLogId: entry.id,
        details: `第 ${i + 1} 筆稽核日誌當前雜湊與內文不符，內容疑似遭到竄改！`,
      };
    }

    prevHash = entry.currentHash;
  }

  return { isIntact: true, details: `已成功核驗全部 ${logs.length} 筆連續雜湊鏈稽核紀錄，完整性 100% 吻合，無被竄改痕跡。` };
};

/**
 * Initialize or Load Persistent Security Engine State
 */
export const loadSecurityState = async (): Promise<SecurityState> => {
  const defaultAesKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const defaultHmacKey = 'cma_secret_hmac_key_2026_top_defense_integrity';

  const defaultState: SecurityState = {
    currentProfile: MOCK_SECURITY_PROFILES[0],
    allProfiles: MOCK_SECURITY_PROFILES,
    cryptoKeys: INITIAL_CRYPTO_KEYS,
    activeAesKeyHex: defaultAesKey,
    activeHmacKeyHex: defaultHmacKey,
    auditLogs: INITIAL_AUDIT_LOGS,
    incidents: [],
    tokenSession: await createMockJWT(MOCK_SECURITY_PROFILES[0], defaultHmacKey),
    dataEncryptionEnabled: true,
    piiMaskingEnabled: true,
    zeroTrustEnforced: true,
    rateLimitCount: 0,
  };

  try {
    const raw = localStorage.getItem(SEC_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      // refresh token validity
      tokenSession: parsed.tokenSession || defaultState.tokenSession,
    };
  } catch {
    return defaultState;
  }
};

export const saveSecurityState = (state: SecurityState) => {
  try {
    localStorage.setItem(SEC_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save security state:', err);
  }
};
