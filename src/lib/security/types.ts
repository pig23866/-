// Information Security Architecture & Data Lifecycle Types

export type SecurityRole = 'student' | 'academic_officer' | 'instructor' | 'security_admin';

export type ClearanceLevel = 'unclassified' | 'confidential' | 'secret';

export type SecurityLifecycleStage =
  | 'generation'    // 資料產生：輸入驗證、密級劃分、產生初始 Hash
  | 'access'        // 資料存取：身分驗證、RBAC/ABAC 授權檢核、去識別化
  | 'modification'  // 資料修改：權限審核、防竄改重簽、異動稽核
  | 'transit'       // 資料傳輸：TLS/HTTPS 端對端安全信道、API Token 驗證
  | 'storage'       // 資料儲存：AES-256-GCM 加密、金鑰版本管理
  | 'destruction';  // 資料銷毀：加密抹除 (Crypto-shredding)、保存過期清理

export type AuthFactorType = 'password' | 'totp_mfa' | 'fido2_biometric' | 'pki_cert' | 'oauth_google';

export interface UserSecurityProfile {
  id: string;
  username: string;
  fullName: string;
  role: SecurityRole;
  clearanceLevel: ClearanceLevel;
  department: string; // e.g. "陸軍官校正98期第1教授班(資訊組)"
  studentId: string;
  email: string;
  accountStatus: 'active' | 'suspended' | 'probation' | 'revoked';
  mfaEnabled: boolean;
  biometricRegistered: boolean;
  pkiCertSerial?: string;
  lastLoginAt: string;
  failedLoginAttempts: number;
  isIsolated: boolean; // For incident containment
  privilegeElevationExpiresAt?: string; // JIT Privilege Elevation
}

export interface SecurityTokenSession {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresAt: number; // Unix timestamp ms
  issuedAt: number;
  jwtHeader: { alg: string; typ: string };
  jwtPayload: {
    sub: string;
    role: SecurityRole;
    clearance: ClearanceLevel;
    iss: string;
    iat: number;
    exp: number;
    jti: string;
  };
  jwtSignature: string;
  isRevoked: boolean;
  revokedReason?: string;
}

export interface CryptoKeyRecord {
  id: string;
  algorithm: 'AES-256-GCM' | 'HMAC-SHA256' | 'RSA-PSS-2048';
  version: number;
  status: 'active' | 'rotated' | 'revoked' | 'destroyed';
  purpose: 'DATA_ENCRYPTION_AT_REST' | 'DIGITAL_SIGNATURE' | 'BACKUP_SEAL';
  createdAt: string;
  rotatedAt?: string;
  destroyedAt?: string;
  keyFingerprint: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: SecurityRole;
  action:
    | 'AUTH_LOGIN'
    | 'AUTH_LOGOUT'
    | 'MFA_CHALLENGE'
    | 'PASSWORD_HASH_CHECK'
    | 'ASSIGNMENT_CREATE'
    | 'ASSIGNMENT_READ'
    | 'ASSIGNMENT_UPDATE'
    | 'ASSIGNMENT_DELETE'
    | 'DATA_ENCRYPT'
    | 'DATA_DECRYPT'
    | 'KEY_GENERATE'
    | 'KEY_ROTATE'
    | 'KEY_DESTROY'
    | 'TAMPER_CHECK_PASS'
    | 'TAMPER_DETECTED'
    | 'ACCESS_BLOCKED_ABAC'
    | 'ANOMALY_TRIGGERED'
    | 'INCIDENT_DECLARED'
    | 'INCIDENT_CONTAINED'
    | 'BACKUP_ENCRYPTED'
    | 'BACKUP_RESTORED'
    | 'PII_MASKED'
    | 'TOKEN_REVOKED';
  lifecycleStage: SecurityLifecycleStage;
  resourceType: 'ASSIGNMENT' | 'USER_ACCOUNT' | 'CRYPTO_KEY' | 'SYSTEM_CONFIG' | 'BACKUP_ARCHIVE';
  resourceId?: string;
  status: 'SUCCESS' | 'DENIED' | 'ALERT' | 'CONTAINED';
  ipAddress: string;
  networkDomain: 'CAMPUS_INTRANET' | 'EXTERNAL_WAN';
  deviceFingerprint: string;
  details: string;
  prevHash: string; // Blockchain-style tamper-evident hash chaining
  currentHash: string; // SHA-256(prevHash + timestamp + actorId + action + details)
  signature: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  attackType:
    | 'BRUTE_FORCE'
    | 'DATA_TAMPERING'
    | 'UNAUTHORIZED_EXFILTRATION'
    | 'INJECTION_ATTACK'
    | 'OFF_HOURS_ANOMALY'
    | 'PRIVILEGE_ESCALATION';
  detectedAt: string;
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  affectedActorId?: string;
  description: string;
  containmentActionTaken?: string;
  reportedToAgency: string; // e.g. "國防資通安全中心 (Mil-CERT) / 學校隊部資訊保防組"
  resolvedAt?: string;
}

export interface ZeroTrustAssessment {
  overallTrustScore: number; // 0 - 100
  deviceHealth: 'HEALTHY' | 'WARNING' | 'COMPROMISED';
  networkPosture: 'SECURE_CAMPUS_INTRANET' | 'UNTRUSTED_EXTERNAL';
  factors: {
    tlsEnforced: boolean;
    mfaVerified: boolean;
    abacPolicyMet: boolean;
    storageEncrypted: boolean;
    tokenValid: boolean;
    keysRotatedCompliant: boolean;
    auditLogIntact: boolean;
  };
  recommendations: string[];
}

export interface SecureSDLCItem {
  id: string;
  phase: 'Requirements' | 'Design & Architecture' | 'Coding' | 'Testing & SAST' | 'Deployment & Ops';
  title: string;
  strideCategory: 'Spoofing' | 'Tampering' | 'Repudiation' | 'Information Disclosure' | 'Denial of Service' | 'Elevation of Privilege';
  control: string;
  status: 'COMPLIANT' | 'ENFORCED' | 'AUDITED';
}
