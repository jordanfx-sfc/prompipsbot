import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.resolve('/tmp', 'prompips_data')
  : path.resolve(__dirname, '../data');
const DB_FILE = path.resolve(DATA_DIR, 'prompips_db.json');
const SEED_FILE = path.resolve(__dirname, '../data/prompips_db.json');

export interface AdminUser {
  username: string;
  salt: string;
  passwordHash: string;
  sessions: Record<string, { expiresAt: number; createdAt: number }>;
  failedAttempts: number[];
  lockoutUntil: number | null;
  lastLogoutTimestamp?: number | null;
}

export interface WebsiteSettings {
  websiteName: string;
  websiteDescription: string;
  contactEmail: string;
  whatsappSupport: string;
  telegramSupport: string;
  otherSupport: string;
}

export interface PricingSettings {
  price: number;
  currency: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  accountHolder: string;
  accountNumberOrAddress: string;
  network: string;
  instructions: string;
  qrCodeUrl: string;
  enabled: boolean;
  createdAt: number;
}

export interface TransactionRecord {
  id: string;
  txId: string;
  amount: number;
  paymentMethodName: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: number;
  verifiedAt: number | null;
  reviewedBy: string | null;
  notes: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  actor: string;
}

export interface BotSettings {
  displayName: string;
  botStatus: string;
  botActivationEnabled: boolean;
  mt5IntegrationStatus: string;
  publicStatusMessage: string;
}

export interface DatabaseSchema {
  admin: AdminUser;
  settings: WebsiteSettings;
  pricing: PricingSettings;
  paymentMethods: PaymentMethod[];
  transactions: TransactionRecord[];
  auditLog: AuditLogEntry[];
  botSettings: BotSettings;
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '@Bossprompips1_master_secret_2026';
}

function signSessionToken(username: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24 hours
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${username}:${issuedAt}:${expiresAt}:${nonce}`;
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

function verifySessionToken(token: string, lastLogoutTimestamp?: number | null): { valid: boolean; username?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [b64Payload, hmac] = token.split('.');
  if (!b64Payload || !hmac) return { valid: false };

  try {
    const payload = Buffer.from(b64Payload, 'base64url').toString('utf-8');
    const expectedHmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');

    const hmacBuf = Buffer.from(hmac, 'utf-8');
    const expectedBuf = Buffer.from(expectedHmac, 'utf-8');
    if (hmacBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
      return { valid: false };
    }

    const [username, issuedAtStr, expiresAtStr] = payload.split(':');
    const issuedAt = Number(issuedAtStr);
    const expiresAt = Number(expiresAtStr);
    const now = Date.now();

    if (now > expiresAt) return { valid: false };
    if (lastLogoutTimestamp && issuedAt <= lastLogoutTimestamp) return { valid: false };

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

function generateInitialDatabase(): DatabaseSchema {
  const initialPassword = process.env.ADMIN_PASSWORD || '@Bossprompips1';
  const initialUsername = process.env.ADMIN_USERNAME || 'Prompipsboss';
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(initialPassword, salt);

  return {
    admin: {
      username: initialUsername,
      salt,
      passwordHash,
      sessions: {},
      failedAttempts: [],
      lockoutUntil: null,
      lastLogoutTimestamp: null,
    },
    settings: {
      websiteName: 'PROMPIPS BOT',
      websiteDescription:
        'High-performance automated MT5 trading bot interface with real-time connection status and secure $50 subscription verification.',
      contactEmail: 'support@prompipsbot.com',
      whatsappSupport: '+1 (555) 789-2041',
      telegramSupport: '@prompips_official',
      otherSupport: '24/7 VIP Automated Strategy Desk & Account Support',
    },
    pricing: {
      price: 50,
      currency: 'USD',
    },
    paymentMethods: [
      {
        id: 'pm-usdt-trc20',
        name: 'USDT (TRC20)',
        accountHolder: 'PROMPIPS Treasury',
        accountNumberOrAddress: 'TYDnm7x9vQP3L4u1kQ2V8s8P7oF4Y9wK1b',
        network: 'TRC-20 (Tron Network)',
        instructions:
          'Send exactly $50 USDT via TRC20 network. Zero or near-zero gas fee. Copy TXID from your wallet after sending.',
        qrCodeUrl: '',
        enabled: true,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'pm-usdt-erc20',
        name: 'USDT (ERC20 / Polygon)',
        accountHolder: 'PROMPIPS Multi-Sig',
        accountNumberOrAddress: '0x892a0572e92c2b3e8c9b2f768b446a6e789bc44d',
        network: 'Ethereum / Polygon EVM',
        instructions:
          'Send $50 USDT to this EVM address. Ensure you select either Ethereum or Polygon network.',
        qrCodeUrl: '',
        enabled: true,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'pm-bep20',
        name: 'BEP20 (BNB Smart Chain)',
        accountHolder: 'PROMPIPS Treasury',
        accountNumberOrAddress: '',
        network: 'BEP-20 (BNB Smart Chain)',
        instructions:
          'Send subscription fee via BEP20 (BNB Smart Chain). Awaiting administrator wallet address configuration.',
        qrCodeUrl: '',
        enabled: true,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'pm-momo',
        name: 'Mobile Money / Bank Wire',
        accountHolder: 'Michael Mukiibi (PROMPIPS Finance)',
        accountNumberOrAddress: '+256 772 890 142 / Stanbic 90300189402',
        network: 'MTN / Airtel Mobile Money / Bank Transfer',
        instructions:
          'Send $50 equivalent (or local currency). Set reference as "PROMPIPS-BOT". Paste transfer transaction code below.',
        qrCodeUrl: '',
        enabled: true,
        createdAt: Date.now() - 86400000,
      },
    ],
    transactions: [],
    auditLog: [
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: 'SYSTEM_INITIALIZATION',
        details: 'Initialized PROMPIPS BOT persistent database and admin credentials.',
        actor: 'SYSTEM',
      },
    ],
    botSettings: {
      displayName: 'PROMPIPS BOT Core v4.2',
      botStatus: 'Standby',
      botActivationEnabled: true,
      mt5IntegrationStatus: 'Operational Gateway',
      publicStatusMessage: 'Quantitative scalping algorithmic engine is primed for execution.',
    },
  };
}

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all required fields exist
        if (parsed.admin && parsed.settings && parsed.pricing) {
          return parsed;
        }
      } else if (IS_VERCEL && fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.save(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('[DB] Failed to load DB file, initializing fresh store:', err);
    }
    const fresh = generateInitialDatabase();
    this.save(fresh);
    return fresh;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const content = JSON.stringify(dataToSave || this.data, null, 2);
      fs.writeFileSync(DB_FILE, content, 'utf-8');
    } catch (err) {
      console.error('[DB] Error writing to DB file:', err);
    }
  }

  // --- ADMIN AUTH & SESSIONS ---

  public isLockedOut(): { locked: boolean; remainingMinutes: number } {
    const now = Date.now();
    if (this.data.admin.lockoutUntil && this.data.admin.lockoutUntil > now) {
      const remainingMs = this.data.admin.lockoutUntil - now;
      return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
    }
    return { locked: false, remainingMinutes: 0 };
  }

  public authenticateAdmin(username: string, password: string): { success: boolean; token?: string; error?: string } {
    const now = Date.now();
    const configuredUsername = process.env.ADMIN_USERNAME || this.data.admin.username || 'Prompipsboss';
    // Exact match for username
    const isUsernameMatch = username === configuredUsername;

    const masterPassword = process.env.ADMIN_PASSWORD || '@Bossprompips1';
    let isPasswordMatch = false;

    // Check 1: Direct comparison against master configured password
    if (password === masterPassword) {
      isPasswordMatch = true;
      // Ensure stored password hash matches master credentials
      if (!this.data.admin.salt) {
        this.data.admin.salt = crypto.randomBytes(16).toString('hex');
      }
      this.data.admin.passwordHash = hashPassword(masterPassword, this.data.admin.salt);
    } else if (this.data.admin.passwordHash && this.data.admin.salt) {
      // Check 2: PBKDF2 hash comparison (e.g. if updated via Admin Panel)
      const computedHash = hashPassword(password, this.data.admin.salt);
      const computedBuf = Buffer.from(computedHash, 'utf-8');
      const storedBuf = Buffer.from(this.data.admin.passwordHash, 'utf-8');
      if (computedBuf.length === storedBuf.length) {
        isPasswordMatch = crypto.timingSafeEqual(computedBuf, storedBuf);
      }
    }

    if (isUsernameMatch && isPasswordMatch) {
      // Lockout recovery: correct credentials clear any failed attempts and lockout
      this.data.admin.failedAttempts = [];
      this.data.admin.lockoutUntil = null;

      // Create secure signed session token (verifiable across serverless instances and cold starts)
      const token = signSessionToken(configuredUsername);
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
      if (!this.data.admin.sessions) {
        this.data.admin.sessions = {};
      }
      this.data.admin.sessions[token] = { expiresAt, createdAt: now };

      this.addAuditLog('ADMIN_LOGIN', 'Administrator successfully logged into control center.', configuredUsername);
      this.save();

      return { success: true, token };
    }

    // Check lockout for failed attempts
    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        success: false,
        error: `Account is temporarily locked due to repeated failed attempts. Please try again in ${lockout.remainingMinutes} minutes.`,
      };
    }

    // Clean failed attempts older than 15 mins
    const fifteenMinsAgo = now - 15 * 60 * 1000;
    this.data.admin.failedAttempts = (this.data.admin.failedAttempts || []).filter((t) => t > fifteenMinsAgo);
    this.data.admin.failedAttempts.push(now);

    if (this.data.admin.failedAttempts.length >= 5) {
      this.data.admin.lockoutUntil = now + 15 * 60 * 1000; // 15 min lockout
      this.addAuditLog('ADMIN_LOCKOUT', '5 failed login attempts recorded; locked out for 15 minutes.', 'SECURITY');
    }
    this.save();
    return { success: false, error: 'Invalid administrator credentials.' };
  }

  public validateSession(token: string): boolean {
    if (!token) return false;

    // Cryptographic signature & expiration validation (works across all Vercel serverless cold starts)
    const verified = verifySessionToken(token, this.data.admin.lastLogoutTimestamp);
    if (verified.valid) {
      return true;
    }

    // Secondary map check for legacy or in-memory sessions
    if (this.data.admin.sessions && this.data.admin.sessions[token]) {
      const session = this.data.admin.sessions[token];
      if (Date.now() <= session.expiresAt) {
        if (!this.data.admin.lastLogoutTimestamp || session.createdAt > this.data.admin.lastLogoutTimestamp) {
          return true;
        }
      }
      delete this.data.admin.sessions[token];
      this.save();
    }
    return false;
  }

  public destroySession(token: string) {
    this.data.admin.lastLogoutTimestamp = Date.now();
    if (this.data.admin.sessions && this.data.admin.sessions[token]) {
      delete this.data.admin.sessions[token];
    }
    this.addAuditLog('ADMIN_LOGOUT', 'Administrator session ended.', this.data.admin.username);
    this.save();
  }

  public updateAdminPassword(newPassword: string, actor: string): boolean {
    const salt = crypto.randomBytes(16).toString('hex');
    this.data.admin.salt = salt;
    this.data.admin.passwordHash = hashPassword(newPassword, salt);
    this.addAuditLog('PASSWORD_CHANGED', 'Administrator password was updated.', actor);
    this.save();
    return true;
  }

  // --- AUDIT LOG ---

  public addAuditLog(action: string, details: string, actor: string) {
    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      details,
      actor,
    };
    if (!this.data.auditLog) this.data.auditLog = [];
    this.data.auditLog.unshift(entry);
    // Keep last 150 entries
    if (this.data.auditLog.length > 150) {
      this.data.auditLog = this.data.auditLog.slice(0, 150);
    }
    this.save();
  }

  public getAuditLog(): AuditLogEntry[] {
    return this.data.auditLog || [];
  }

  // --- SETTINGS ---

  public getSettings(): WebsiteSettings {
    return { ...this.data.settings };
  }

  public updateSettings(newSettings: Partial<WebsiteSettings>, actor: string): WebsiteSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.addAuditLog('SETTINGS_UPDATE', `Updated website settings: ${Object.keys(newSettings).join(', ')}`, actor);
    this.save();
    return this.data.settings;
  }

  // --- PRICING ---

  public getPricing(): PricingSettings {
    return { ...this.data.pricing };
  }

  public updatePricing(price: number, currency: string = 'USD', actor: string): PricingSettings {
    const prevPrice = this.data.pricing.price;
    this.data.pricing = { price, currency };
    this.addAuditLog('PRICING_UPDATE', `Changed subscription price from $${prevPrice} to $${price} ${currency}`, actor);
    this.save();
    return this.data.pricing;
  }

  // --- PAYMENT METHODS ---

  public getPaymentMethods(all: boolean = false): PaymentMethod[] {
    const methods = this.data.paymentMethods || [];
    if (all) return methods;
    return methods.filter((m) => m.enabled);
  }

  public addPaymentMethod(method: Omit<PaymentMethod, 'id' | 'createdAt'>, actor: string): PaymentMethod {
    const newMethod: PaymentMethod = {
      ...method,
      id: 'pm-' + crypto.randomUUID().slice(0, 8),
      createdAt: Date.now(),
    };
    this.data.paymentMethods.push(newMethod);
    this.addAuditLog('PAYMENT_METHOD_ADDED', `Added payment method: ${newMethod.name}`, actor);
    this.save();
    return newMethod;
  }

  public updatePaymentMethod(id: string, updates: Partial<PaymentMethod>, actor: string): PaymentMethod | null {
    const idx = this.data.paymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.data.paymentMethods[idx] = { ...this.data.paymentMethods[idx], ...updates };
    this.addAuditLog('PAYMENT_METHOD_UPDATED', `Updated payment method: ${this.data.paymentMethods[idx].name}`, actor);
    this.save();
    return this.data.paymentMethods[idx];
  }

  public deletePaymentMethod(id: string, actor: string): boolean {
    const idx = this.data.paymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const name = this.data.paymentMethods[idx].name;
    this.data.paymentMethods.splice(idx, 1);
    this.addAuditLog('PAYMENT_METHOD_DELETED', `Deleted payment method: ${name}`, actor);
    this.save();
    return true;
  }

  public togglePaymentMethod(id: string, enabled: boolean, actor: string): PaymentMethod | null {
    return this.updatePaymentMethod(id, { enabled }, actor);
  }

  // --- TRANSACTIONS ---

  public getTransactions(): TransactionRecord[] {
    return this.data.transactions || [];
  }

  public isTxIdDuplicate(txId: string, currentId?: string): boolean {
    const normalized = txId.trim().toLowerCase();
    return (this.data.transactions || []).some(
      (t) => t.txId.toLowerCase() === normalized && (!currentId || t.id !== currentId) && t.status !== 'rejected'
    );
  }

  public recordTransaction(
    txId: string,
    amount: number,
    paymentMethodName: string = 'Crypto / Mobile Money',
    status: 'pending' | 'verified' = 'verified'
  ): TransactionRecord {
    const normalized = txId.trim();
    const existing = (this.data.transactions || []).find((t) => t.txId.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      return existing;
    }

    const record: TransactionRecord = {
      id: crypto.randomUUID(),
      txId: normalized,
      amount,
      paymentMethodName,
      status,
      submittedAt: Date.now(),
      verifiedAt: status === 'verified' ? Date.now() : null,
      reviewedBy: 'SYSTEM_AUTOVERIFY',
      notes: 'Submitted via customer payment gate.',
    };

    if (!this.data.transactions) this.data.transactions = [];
    this.data.transactions.unshift(record);
    this.addAuditLog('TX_SUBMITTED', `New transaction ID submitted: ${normalized} ($${amount})`, 'CUSTOMER');
    this.save();
    return record;
  }

  public updateTransactionStatus(
    id: string,
    status: 'pending' | 'verified' | 'rejected',
    actor: string,
    notes?: string
  ): TransactionRecord | null {
    const record = (this.data.transactions || []).find((t) => t.id === id);
    if (!record) return null;

    const oldStatus = record.status;
    record.status = status;
    record.reviewedBy = actor;
    if (status === 'verified') {
      record.verifiedAt = Date.now();
    }
    if (notes !== undefined) {
      record.notes = notes;
    }

    this.addAuditLog('TX_STATUS_CHANGE', `Transaction ${record.txId} changed from ${oldStatus} to ${status}`, actor);
    this.save();
    return record;
  }

  // --- BOT SETTINGS ---

  public getBotSettings(): BotSettings {
    return { ...this.data.botSettings };
  }

  public updateBotSettings(updates: Partial<BotSettings>, actor: string): BotSettings {
    this.data.botSettings = { ...this.data.botSettings, ...updates };
    this.addAuditLog('BOT_SETTINGS_UPDATE', `Updated bot settings: ${Object.keys(updates).join(', ')}`, actor);
    this.save();
    return this.data.botSettings;
  }

  // --- PUBLIC CONFIG (Safe for unauthenticated visitors) ---

  public getPublicConfig() {
    return {
      websiteName: this.data.settings.websiteName,
      websiteDescription: this.data.settings.websiteDescription,
      contactEmail: this.data.settings.contactEmail,
      whatsappSupport: this.data.settings.whatsappSupport,
      telegramSupport: this.data.settings.telegramSupport,
      otherSupport: this.data.settings.otherSupport,
      price: this.data.pricing.price,
      currency: this.data.pricing.currency,
      paymentMethods: this.getPaymentMethods(false), // ONLY enabled methods!
      botActivationEnabled: this.data.botSettings.botActivationEnabled,
      publicStatusMessage: this.data.botSettings.publicStatusMessage,
      displayName: this.data.botSettings.displayName,
    };
  }
}

export const db = new DatabaseManager();
