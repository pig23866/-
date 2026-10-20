import bcrypt from 'bcryptjs';
import { AppUser, SessionUser, UserRole } from '../types';
import { loadWithIntegrity, saveWithIntegrity } from './integrity';
import { logAuditEvent } from './auditLogger';

const USERS_STORAGE_KEY = 'hw_auth_users_v2';
const SESSION_STORAGE_KEY = 'hw_auth_session_v2';

// Salt rounds for bcrypt hashing
const SALT_ROUNDS = 10;

// Helper to hash password synchronously
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

// Helper to verify password
export function verifyPassword(plainText: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plainText, hash);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// Initial seed users with pre-hashed bcrypt values
// User: 98210 / Aa98210
// Admin: Admin / Aa123456789
function getInitialSeedUsers(): AppUser[] {
  return [
    {
      username: '98210',
      displayName: '陸官正98期學員 (98210)',
      role: 'user',
      passwordHash: hashPassword('Aa98210'),
      createdAt: '2026-10-19T00:00:00.000Z',
    },
    {
      username: 'Admin',
      displayName: '系統管理員 (Admin)',
      role: 'admin',
      passwordHash: hashPassword('Aa123456789'),
      createdAt: '2026-10-19T00:00:00.000Z',
    },
  ];
}

// Load all users from storage with Hash integrity protection
export function loadUsers(): AppUser[] {
  const initial = getInitialSeedUsers();
  const parsed = loadWithIntegrity<AppUser[]>(
    USERS_STORAGE_KEY,
    initial,
    (details) => {
      logAuditEvent({
        category: 'security',
        action: '完整性自動修復',
        level: 'security',
        actor: { username: 'System', displayName: '安全保護引擎', role: 'admin' },
        target: USERS_STORAGE_KEY,
        details,
      });
    }
  );

  // Ensure default users exist
  let modified = false;
  for (const initUser of initial) {
    if (!parsed.some((u) => u.username.toLowerCase() === initUser.username.toLowerCase())) {
      parsed.push(initUser);
      modified = true;
    }
  }
  if (modified) {
    saveUsers(parsed);
  }
  return parsed;
}

// Save all users to storage with Hash integrity protection
export function saveUsers(users: AppUser[]): void {
  saveWithIntegrity(USERS_STORAGE_KEY, users);
}

// Authenticate user with bcrypt
export function loginUser(
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: SessionUser; error?: string } {
  const cleanUsername = usernameInput.trim();
  if (!cleanUsername) {
    return { success: false, error: '請輸入帳號' };
  }
  if (!passwordInput) {
    return { success: false, error: '請輸入密碼' };
  }

  const users = loadUsers();
  const found = users.find(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (!found) {
    logAuditEvent({
      category: 'auth',
      action: '登入失敗 (帳號不存在)',
      level: 'warn',
      actor: { username: cleanUsername, displayName: '未知使用者', role: 'user' },
      details: `嘗試登入未登記之帳號「${cleanUsername}」。`,
    });
    return { success: false, error: '帳號不存在，請確認輸入是否正確' };
  }

  const isMatch = verifyPassword(passwordInput, found.passwordHash);
  if (!isMatch) {
    logAuditEvent({
      category: 'auth',
      action: '登入失敗 (密碼錯誤)',
      level: 'warn',
      actor: { username: found.username, displayName: found.displayName, role: found.role },
      details: `帳號「${found.username}」密碼驗證不符。`,
    });
    return { success: false, error: '密碼錯誤，請重新輸入' };
  }

  // Update last login
  found.lastLoginAt = new Date().toISOString();
  saveUsers(users);

  const sessionUser: SessionUser = {
    username: found.username,
    displayName: found.displayName,
    role: found.role,
  };

  saveCurrentSession(sessionUser);

  logAuditEvent({
    category: 'auth',
    action: '登入成功',
    level: 'info',
    actor: sessionUser,
    details: `${sessionUser.role === 'admin' ? '系統管理員' : '一般學員'}「${sessionUser.displayName}」成功登入系統。`,
  });

  return { success: true, user: sessionUser };
}

// Change password for a user
export function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string,
  isAdminOverride = false,
  operatorActor?: SessionUser
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '新密碼長度至少需要 4 碼' };
  }

  const users = loadUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: '查無此使用者帳號' };
  }

  const user = users[index];

  // If not admin override, check old password
  if (!isAdminOverride) {
    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return { success: false, error: '目前舊密碼不正確' };
    }
  }

  // Hash new password using bcrypt
  user.passwordHash = hashPassword(newPassword);
  users[index] = user;
  saveUsers(users);

  const actor = operatorActor || {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  logAuditEvent({
    category: 'auth',
    action: isAdminOverride ? '管理員重設密碼' : '修改密碼',
    level: 'info',
    actor,
    target: user.username,
    details: isAdminOverride
      ? `管理員「${actor.displayName}」重設了「${user.username}」的密碼。`
      : `使用者「${user.displayName}」自行更新了密碼。`,
  });

  return { success: true };
}

// Create a new user account (Admin feature)
export function createUser(
  params: {
    username: string;
    displayName: string;
    password: string;
    role: UserRole;
  },
  operatorActor?: SessionUser
): { success: boolean; error?: string; user?: AppUser } {
  const username = params.username.trim();
  const displayName = params.displayName.trim();
  const password = params.password;
  const role = params.role || 'user';

  if (!username) {
    return { success: false, error: '請輸入帳號' };
  }
  if (username.length < 2) {
    return { success: false, error: '帳號長度至少需 2 個字元' };
  }
  if (/\s/.test(username)) {
    return { success: false, error: '帳號不可包含空格' };
  }
  if (!displayName) {
    return { success: false, error: '請輸入姓名或稱謂' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: '密碼長度至少需要 4 碼' };
  }

  const users = loadUsers();
  const exists = users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { success: false, error: `帳號「${username}」已存在，請使用其他帳號名稱` };
  }

  // Hash password using bcrypt
  const newUser: AppUser = {
    username,
    displayName,
    role,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  logAuditEvent({
    category: 'user',
    action: '建立新帳號',
    level: 'info',
    actor: operatorActor || { username: 'Admin', displayName: '管理員', role: 'admin' },
    target: username,
    details: `建立了新帳號「${displayName} (${username})」，身分：${role === 'admin' ? '系統管理員' : '一般學員'}，密碼已以 bcrypt 雜湊。`,
  });

  return { success: true, user: newUser };
}

// Delete user account (Admin feature)
export function deleteUser(
  usernameToDelete: string,
  currentAdminUsername: string,
  operatorActor?: SessionUser
): { success: boolean; error?: string } {
  const target = usernameToDelete.trim();
  if (!target) {
    return { success: false, error: '請指定欲刪除之帳號' };
  }
  if (target.toLowerCase() === currentAdminUsername.toLowerCase()) {
    return { success: false, error: '無法刪除目前正在登入的管理員帳號' };
  }
  if (target.toLowerCase() === 'admin') {
    return { success: false, error: '系統預設管理員 (Admin) 受系統保護，不可刪除' };
  }

  const users = loadUsers();
  const targetUser = users.find((u) => u.username.toLowerCase() === target.toLowerCase());
  const remaining = users.filter(
    (u) => u.username.toLowerCase() !== target.toLowerCase()
  );

  if (remaining.length === users.length) {
    return { success: false, error: '查無欲刪除之帳號' };
  }

  saveUsers(remaining);

  logAuditEvent({
    category: 'user',
    action: '刪除帳號',
    level: 'warn',
    actor: operatorActor || { username: currentAdminUsername, displayName: '管理員', role: 'admin' },
    target,
    details: `已移除帳號「${targetUser?.displayName || target} (${target})」。`,
  });

  return { success: true };
}

// Load currently active session
export function loadCurrentSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load session:', e);
    return null;
  }
}

// Save active session
export function saveCurrentSession(user: SessionUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

// Logout session
export function logoutSession(): void {
  saveCurrentSession(null);
}

