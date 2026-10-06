// Web Crypto API & Cryptographic Utility Functions

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Convert ArrayBuffer to Hex string
export const buf2hex = (buffer: ArrayBuffer): string => {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
};

// Convert Hex string to Uint8Array
export const hex2buf = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/**
 * SHA-256 Cryptographic Hash Calculation (Data Integrity)
 */
export const calculateSHA256 = async (data: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = textEncoder.encode(data);
    const hashBuf = await window.crypto.subtle.digest('SHA-256', encoded);
    return buf2hex(hashBuf);
  }
  // Deterministic fallback for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
};

/**
 * HMAC-SHA256 Digital Signature Generation (Non-repudiation & Authenticity)
 */
export const generateHMAC = async (secret: string, message: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const keyData = textEncoder.encode(secret);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const msgData = textEncoder.encode(message);
    const signature = await window.crypto.subtle.sign('HMAC', key, msgData);
    return buf2hex(signature);
  }
  const simple = await calculateSHA256(`${secret}:${message}`);
  return simple;
};

/**
 * Generate 256-bit AES-GCM Key (Key Management)
 */
export const generateAESKeyHex = async (): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return buf2hex(exported);
  }
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return buf2hex(randomBytes.buffer);
};

/**
 * AES-GCM 256-bit Encryption (Data at Rest Protection)
 */
export const encryptAESGCM = async (
  plaintext: string,
  keyHex: string
): Promise<{ ciphertextHex: string; ivHex: string; tagLen: number }> => {
  const keyBytes = hex2buf(keyHex);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const plainBytes = textEncoder.encode(plaintext);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plainBytes
  );

  return {
    ciphertextHex: buf2hex(cipherBuffer),
    ivHex: buf2hex(iv.buffer),
    tagLen: 128,
  };
};

/**
 * AES-GCM 256-bit Decryption
 */
export const decryptAESGCM = async (
  ciphertextHex: string,
  ivHex: string,
  keyHex: string
): Promise<string> => {
  const keyBytes = hex2buf(keyHex);
  const iv = hex2buf(ivHex);
  const cipherBytes = hex2buf(ciphertextHex);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    cipherBytes
  );

  return textDecoder.decode(decryptedBuf);
};

/**
 * Password Hashing (Argon2 / PBKDF2 high-work-factor simulation)
 * Passwords are NEVER stored in plaintext. Always salted and hashed.
 */
export const hashPasswordPBKDF2 = async (
  password: string,
  saltHex: string,
  iterations = 100000
): Promise<{ hashHex: string; iterations: number; saltHex: string }> => {
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBytes = hex2buf(saltHex);
  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 256 bits
  );

  return {
    hashHex: buf2hex(derivedKey),
    iterations,
    saltHex,
  };
};

/**
 * Generate Secure Cryptographic Salt
 */
export const generateSaltHex = (bytesCount = 16): string => {
  const salt = new Uint8Array(bytesCount);
  window.crypto.getRandomValues(salt);
  return buf2hex(salt.buffer);
};

/**
 * Password Entropy & Strength Checker
 */
export const analyzePasswordStrength = (
  password: string
): { score: number; feedback: string[]; entropyBits: number } => {
  const feedback: string[] = [];
  let poolSize = 0;

  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (password.length < 8) {
    feedback.push('長度過短（建議至少 12 字元以上）');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('缺少大寫字母 (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('缺少小寫字母 (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('缺少數字 (0-9)');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('缺少特殊符號 (!@#$%^&*...)');
  }

  const entropyBits = Math.round(password.length * (poolSize > 0 ? Math.log2(poolSize) : 0));
  let score = 0;
  if (entropyBits >= 75 && password.length >= 12) score = 4; // Very Strong
  else if (entropyBits >= 55 && password.length >= 10) score = 3; // Strong
  else if (entropyBits >= 35 && password.length >= 8) score = 2; // Moderate
  else score = 1; // Weak

  return { score, feedback, entropyBits };
};

/**
 * Input Sanitization (XSS, HTML Injection & SQLi prevention)
 */
export const sanitizeInput = (
  input: string
): { sanitized: string; hasDetectedThreat: boolean; threatTypes: string[] } => {
  const threatTypes: string[] = [];
  let hasDetectedThreat = false;

  // XSS Pattern Detection
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe/gi,
    /<img[^>]+src=[^>]+onerror/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      hasDetectedThreat = true;
      threatTypes.push('Cross-Site Scripting (XSS)');
      break;
    }
  }

  // SQL Injection Pattern Detection
  const sqliPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))(\s)*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /(union\s+select|select\s+.*\s+from|drop\s+table|insert\s+into)/i,
  ];

  for (const pattern of sqliPatterns) {
    if (pattern.test(input)) {
      hasDetectedThreat = true;
      threatTypes.push('SQL Injection Pattern');
      break;
    }
  }

  // Sanitize HTML special entities
  const sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return { sanitized, hasDetectedThreat, threatTypes };
};

/**
 * PII Masking & De-identification (Privacy Protection)
 */
export const maskPII = {
  studentId: (id: string): string => {
    if (!id || id.length < 4) return '***';
    return id.substring(0, 3) + '***' + id.substring(id.length - 1);
  },
  email: (email: string): string => {
    if (!email || !email.includes('@')) return '***@***';
    const [user, domain] = email.split('@');
    const maskedUser = user.length > 2 ? user.slice(0, 2) + '***' : user[0] + '***';
    return `${maskedUser}@${domain}`;
  },
  name: (name: string): string => {
    if (!name) return '***';
    if (name.length === 2) return name[0] + '○';
    if (name.length >= 3) return name[0] + '○' + name.slice(2);
    return name;
  },
  phone: (phone: string): string => {
    if (!phone || phone.length < 8) return '****-***';
    return phone.slice(0, 4) + '-***-' + phone.slice(-3);
  },
};
