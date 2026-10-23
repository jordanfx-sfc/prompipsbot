import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL
  ? path.resolve('/tmp', 'prompips_data')
  : path.resolve(__dirname, '../data');
const DB_FILE = path.resolve(DATA_DIR, 'prompips_db.json');
const SEED_FILE = path.resolve(__dirname, '../data/prompips_db.json');

// Default bcrypt hash (cost factor 12) for master password: @Bossprompips1
const DEFAULT_ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2b$12$tgkYvlQ1XpBoZxTqxvTd7ekIczq7EbDQC/rcKJsJDiNMHTtEMbZG2';

export interface AdminUser {
  username: string;
  passwordHash: string;
  sessions: Record<string, { expiresAt: number; createdAt: number }>;
  failedAttempts: number[];
  lockoutUntil: number | null;
  lastLogoutTimestamp?: number | null;
}

export interface WebsiteSettings {
  websiteName: string;
  websiteDescription: string;
}

export interface PricingSettings {
  price: number;
  currency: string;
}

export interface PaymentMethod {
  id: string; // 'pm-trc20' | 'pm-erc20' | 'pm-btc'
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

// Initial 3 specified payment methods only
export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-trc20',
    name: 'TRC20',
    accountHolder: 'PROMPIPS Official Treasury',
    accountNumberOrAddress: 'TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC',
    network: 'USDT — TRON Network',
    instructions:
      'Send exactly $50 USDT via TRON (TRC20) network. Zero or near-zero gas fee. Copy and paste your Transaction ID below after sending.',
    qrCodeUrl: '',
    enabled: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'pm-erc20',
    name: 'ERC20',
    accountHolder: 'PROMPIPS Official Multi-Sig',
    accountNumberOrAddress: '0x4984ba14236737ada963abff469f2d25821c92dc',
    network: 'USDT — Ethereum Network',
    instructions:
      'Send $50 USDT via Ethereum (ERC20) network. Copy and paste your Transaction Hash below after sending.',
    qrCodeUrl: '',
    enabled: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'pm-btc',
    name: 'BTC',
    accountHolder: 'PROMPIPS Bitcoin Cold Storage',
    accountNumberOrAddress: '393j54v41LN7d6inoq6gRTTCbX2dQ3w5Br',
    network: 'Bitcoin Network',
    instructions:
      'Send $50 equivalent in BTC via native Bitcoin network. Copy and paste your Transaction Hash below after sending.',
    qrCodeUrl: '',
    enabled: true,
    createdAt: Date.now() - 86400000,
  },
];

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    'prompips_auth_secret_session_token_key_2026_k98x21a'
  );
}

function signSessionToken(username: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24 hours
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${username}:${issuedAt}:${expiresAt}:${nonce}`;
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

function verifySessionToken(
  token: string,
  lastLogoutTimestamp?: number | null
): { valid: boolean; username?: string } {
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
  const initialUsername = process.env.ADMIN_USERNAME || 'Prompipsboss';
  const passwordHash = DEFAULT_ADMIN_PASSWORD_HASH;

  return {
    admin: {
      username: initialUsername,
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
    },
    pricing: {
      price: 50,
      currency: 'USD',
    },
    paymentMethods: [...INITIAL_PAYMENT_METHODS],
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
  private pgPool: pg.Pool | null = null;
  public isPostgresConnected: boolean = false;
  public postgresError: string | null = null;
  public lastSaveError: string | null = null;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadLocal();
    this.initPostgres();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  // Filter legacy/unauthorized methods, ensuring strictly TRC20, ERC20, BTC
  private sanitizePaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
    const validMap = new Map<string, PaymentMethod>();

    // Seed defaults
    for (const initMethod of INITIAL_PAYMENT_METHODS) {
      validMap.set(initMethod.id, { ...initMethod });
    }

    // Merge existing methods matching TRC20, ERC20, BTC
    if (Array.isArray(methods)) {
      for (const m of methods) {
        const idLower = (m.id || '').toLowerCase();
        const nameLower = (m.name || '').toLowerCase();

        if (idLower === 'pm-trc20' || nameLower.includes('trc20') || nameLower.includes('tron')) {
          const base = validMap.get('pm-trc20')!;
          validMap.set('pm-trc20', {
            ...base,
            accountNumberOrAddress: m.accountNumberOrAddress || base.accountNumberOrAddress,
            enabled: m.enabled !== undefined ? m.enabled : base.enabled,
            instructions: m.instructions || base.instructions,
          });
        } else if (idLower === 'pm-erc20' || nameLower.includes('erc20') || nameLower.includes('ethereum')) {
          const base = validMap.get('pm-erc20')!;
          validMap.set('pm-erc20', {
            ...base,
            accountNumberOrAddress: m.accountNumberOrAddress || base.accountNumberOrAddress,
            enabled: m.enabled !== undefined ? m.enabled : base.enabled,
            instructions: m.instructions || base.instructions,
          });
        } else if (idLower === 'pm-btc' || nameLower.includes('btc') || nameLower.includes('bitcoin')) {
          const base = validMap.get('pm-btc')!;
          validMap.set('pm-btc', {
            ...base,
            accountNumberOrAddress: m.accountNumberOrAddress || base.accountNumberOrAddress,
            enabled: m.enabled !== undefined ? m.enabled : base.enabled,
            instructions: m.instructions || base.instructions,
          });
        }
      }
    }

    return Array.from(validMap.values());
  }

  private loadLocal(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.admin && parsed.pricing) {
          if (!parsed.admin.passwordHash || !parsed.admin.passwordHash.startsWith('$2')) {
            parsed.admin.passwordHash = DEFAULT_ADMIN_PASSWORD_HASH;
          }
          parsed.paymentMethods = this.sanitizePaymentMethods(parsed.paymentMethods);
          return parsed;
        }
      } else if (IS_VERCEL && fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.admin.passwordHash || !parsed.admin.passwordHash.startsWith('$2')) {
          parsed.admin.passwordHash = DEFAULT_ADMIN_PASSWORD_HASH;
        }
        parsed.paymentMethods = this.sanitizePaymentMethods(parsed.paymentMethods);
        this.saveLocal(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('[DB] Failed to load local DB file, initializing fresh store:', err);
    }
    const fresh = generateInitialDatabase();
    this.saveLocal(fresh);
    return fresh;
  }

  private async initPostgres() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      this.postgresError = 'POSTGRES_URL or DATABASE_URL environment variable is not configured.';
      return;
    }

    try {
      this.pgPool = new pg.Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      // Create persistence table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS prompips_kv (
          key VARCHAR(64) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Attempt to load from PostgreSQL
      const res = await this.pgPool.query(`SELECT data FROM prompips_kv WHERE key = 'app_state';`);
      if (res.rows.length > 0 && res.rows[0].data) {
        const dbState = res.rows[0].data as DatabaseSchema;
        if (dbState.admin && dbState.pricing) {
          dbState.paymentMethods = this.sanitizePaymentMethods(dbState.paymentMethods);
          this.data = dbState;
          this.saveLocal(this.data);
          console.log('[DB] Successfully synced state from persistent PostgreSQL database.');
        }
      } else {
        // Initial insert
        await this.pgPool.query(
          `INSERT INTO prompips_kv (key, data, updated_at) VALUES ('app_state', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [JSON.stringify(this.data)]
        );
        console.log('[DB] Seeded initial state into persistent PostgreSQL database.');
      }

      this.isPostgresConnected = true;
      this.postgresError = null;
    } catch (err: any) {
      this.isPostgresConnected = false;
      this.postgresError = err.message || 'PostgreSQL connection failed.';
      console.warn('[DB] PostgreSQL initialization notice:', this.postgresError);
    }
  }

  private saveLocal(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const content = JSON.stringify(dataToSave || this.data, null, 2);
      fs.writeFileSync(DB_FILE, content, 'utf-8');
      if (IS_VERCEL) {
        // Keep in memory and tmp
      } else if (DB_FILE !== SEED_FILE && fs.existsSync(path.dirname(SEED_FILE))) {
        try {
          fs.writeFileSync(SEED_FILE, content, 'utf-8');
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('[DB] Error writing to local DB file:', err);
      this.lastSaveError = err.message || 'Local filesystem save error';
    }
  }

  public async save(): Promise<{ success: boolean; error?: string }> {
    this.saveLocal();

    if (this.pgPool && this.isPostgresConnected) {
      try {
        await this.pgPool.query(
          `INSERT INTO prompips_kv (key, data, updated_at) VALUES ('app_state', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
          [JSON.stringify(this.data)]
        );
        this.lastSaveError = null;
        return { success: true };
      } catch (err: any) {
        console.error('[DB] Error persisting to PostgreSQL:', err);
        this.lastSaveError = err.message || 'PostgreSQL write error';
        return { success: false, error: this.lastSaveError || undefined };
      }
    }

    return { success: true };
  }

  public getStorageStatus() {
    const hasPgUrl = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    return {
      type: this.isPostgresConnected ? 'postgres' : 'local_file',
      connected: this.isPostgresConnected,
      postgresConfigured: hasPgUrl,
      lastSaveError: this.lastSaveError,
      message: this.isPostgresConnected
        ? 'PostgreSQL Database Connected (Full persistence across Vercel redeployments)'
        : hasPgUrl
        ? `PostgreSQL configured but connection failed: ${this.postgresError || 'Check credentials'}`
        : 'Local Storage Active (Warning: For full persistence across Vercel redeployments, add POSTGRES_URL or DATABASE_URL in Vercel Project Settings)',
    };
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

  public authenticateAdmin(
    username: string,
    password: string
  ): { success: boolean; token?: string; error?: string } {
    const now = Date.now();

    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        success: false,
        error: `Account is temporarily locked due to repeated failed attempts. Please try again in ${lockout.remainingMinutes} minutes.`,
      };
    }

    const configuredUsername =
      process.env.ADMIN_USERNAME || this.data.admin.username || 'Prompipsboss';
    const isUsernameMatch = username === configuredUsername;

    const storedHash = this.data.admin.passwordHash || DEFAULT_ADMIN_PASSWORD_HASH;
    let isPasswordMatch = false;

    if (process.env.ADMIN_PASSWORD) {
      isPasswordMatch = password === process.env.ADMIN_PASSWORD;
    } else {
      try {
        isPasswordMatch = bcrypt.compareSync(password, storedHash);
      } catch {
        isPasswordMatch = false;
      }
    }

    if (!isUsernameMatch && isPasswordMatch) {
      try {
        bcrypt.compareSync(password, DEFAULT_ADMIN_PASSWORD_HASH);
      } catch {
        // ignore
      }
    }

    if (isUsernameMatch && isPasswordMatch) {
      this.data.admin.failedAttempts = [];
      this.data.admin.lockoutUntil = null;

      const token = signSessionToken(configuredUsername);
      const expiresAt = now + 24 * 60 * 60 * 1000;
      if (!this.data.admin.sessions) {
        this.data.admin.sessions = {};
      }
      this.data.admin.sessions[token] = { expiresAt, createdAt: now };

      this.addAuditLog('ADMIN_LOGIN', 'Administrator successfully authenticated.', 'Administrator');
      this.save();

      return { success: true, token };
    }

    const fifteenMinsAgo = now - 15 * 60 * 1000;
    this.data.admin.failedAttempts = (this.data.admin.failedAttempts || []).filter(
      (t) => t > fifteenMinsAgo
    );
    this.data.admin.failedAttempts.push(now);

    if (this.data.admin.failedAttempts.length >= 5) {
      this.data.admin.lockoutUntil = now + 15 * 60 * 1000;
      this.addAuditLog(
        'ADMIN_LOCKOUT',
        '5 failed login attempts recorded; locked out for 15 minutes.',
        'SECURITY'
      );
    }
    this.save();

    return { success: false, error: 'Invalid username or password.' };
  }

  public validateSession(token: string): boolean {
    if (!token) return false;

    const verified = verifySessionToken(token, this.data.admin.lastLogoutTimestamp);
    if (verified.valid) {
      return true;
    }

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
    this.addAuditLog('ADMIN_LOGOUT', 'Administrator session terminated.', 'Administrator');
    this.save();
  }

  public updateAdminPassword(newPassword: string, actor: string): boolean {
    const passwordHash = bcrypt.hashSync(newPassword, 12);
    this.data.admin.passwordHash = passwordHash;
    this.addAuditLog('PASSWORD_CHANGED', 'Administrator password was updated and re-hashed.', actor);
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
    if (this.data.auditLog.length > 150) {
      this.data.auditLog = this.data.auditLog.slice(0, 150);
    }
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

  // --- PAYMENT METHODS (Strictly 3: TRC20, ERC20, BTC) ---

  public getPaymentMethods(all: boolean = false): PaymentMethod[] {
    const methods = this.sanitizePaymentMethods(this.data.paymentMethods || []);
    if (all) return methods;
    return methods.filter((m) => m.enabled);
  }

  // Unified Payment Settings Update
  public async updatePaymentSettings(
    payload: {
      price: number;
      currency?: string;
      trc20Enabled: boolean;
      trc20Address: string;
      trc20Instructions?: string;
      erc20Enabled: boolean;
      erc20Address: string;
      erc20Instructions?: string;
      btcEnabled: boolean;
      btcAddress: string;
      btcInstructions?: string;
    },
    actor: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // 1. Validate Price
    const numPrice = Number(payload.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return { success: false, error: 'Subscription price must be a positive number.' };
    }

    // 2. Validate Addresses
    const cleanTRC = (payload.trc20Address || '').trim();
    const cleanERC = (payload.erc20Address || '').trim();
    const cleanBTC = (payload.btcAddress || '').trim();

    if (payload.trc20Enabled && !cleanTRC) {
      return { success: false, error: 'TRC20 is enabled but wallet address is empty.' };
    }
    if (payload.trc20Enabled && (!cleanTRC.startsWith('T') || cleanTRC.length < 30 || cleanTRC.length > 40)) {
      return { success: false, error: 'Invalid TRC20 address. TRON addresses start with "T" (e.g. TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC).' };
    }

    if (payload.erc20Enabled && !cleanERC) {
      return { success: false, error: 'ERC20 is enabled but wallet address is empty.' };
    }
    if (payload.erc20Enabled && (!cleanERC.startsWith('0x') || cleanERC.length !== 42)) {
      return { success: false, error: 'Invalid ERC20 address. Ethereum addresses start with "0x" and are 42 characters long.' };
    }

    if (payload.btcEnabled && !cleanBTC) {
      return { success: false, error: 'BTC is enabled but wallet address is empty.' };
    }
    if (
      payload.btcEnabled &&
      !(cleanBTC.startsWith('1') || cleanBTC.startsWith('3') || cleanBTC.startsWith('bc1'))
    ) {
      return { success: false, error: 'Invalid BTC address. Bitcoin addresses start with 1, 3, or bc1.' };
    }

    // At least one method must remain enabled
    if (!payload.trc20Enabled && !payload.erc20Enabled && !payload.btcEnabled) {
      return { success: false, error: 'At least one payment method (TRC20, ERC20, or BTC) must be enabled.' };
    }

    // Apply updates
    this.data.pricing.price = numPrice;
    if (payload.currency) {
      this.data.pricing.currency = payload.currency.toUpperCase();
    }

    const currentMethods = this.sanitizePaymentMethods(this.data.paymentMethods);

    // TRC20
    const trcMethod = currentMethods.find((m) => m.id === 'pm-trc20');
    if (trcMethod) {
      trcMethod.enabled = payload.trc20Enabled;
      trcMethod.accountNumberOrAddress = cleanTRC;
      if (payload.trc20Instructions !== undefined) {
        trcMethod.instructions = payload.trc20Instructions.trim();
      }
    }

    // ERC20
    const ercMethod = currentMethods.find((m) => m.id === 'pm-erc20');
    if (ercMethod) {
      ercMethod.enabled = payload.erc20Enabled;
      ercMethod.accountNumberOrAddress = cleanERC;
      if (payload.erc20Instructions !== undefined) {
        ercMethod.instructions = payload.erc20Instructions.trim();
      }
    }

    // BTC
    const btcMethod = currentMethods.find((m) => m.id === 'pm-btc');
    if (btcMethod) {
      btcMethod.enabled = payload.btcEnabled;
      btcMethod.accountNumberOrAddress = cleanBTC;
      if (payload.btcInstructions !== undefined) {
        btcMethod.instructions = payload.btcInstructions.trim();
      }
    }

    this.data.paymentMethods = currentMethods;

    this.addAuditLog(
      'PAYMENT_SETTINGS_UPDATE',
      `Updated payment settings: Price=$${numPrice}, TRC20=${payload.trc20Enabled}, ERC20=${payload.erc20Enabled}, BTC=${payload.btcEnabled}`,
      actor
    );

    const saveResult = await this.save();
    if (!saveResult.success) {
      return {
        success: false,
        error: `Database persistence error: ${saveResult.error}. Changes were saved to local memory only.`,
      };
    }

    return {
      success: true,
      data: {
        pricing: this.data.pricing,
        paymentMethods: this.getPaymentMethods(true),
        storageStatus: this.getStorageStatus(),
      },
    };
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
    paymentMethodName: string = 'Cryptocurrency',
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

  // --- PUBLIC CONFIG (Safe for unauthenticated visitors — NO SUPPORT CONTACTS) ---

  public getPublicConfig() {
    return {
      websiteName: this.data.settings.websiteName,
      websiteDescription: this.data.settings.websiteDescription,
      price: this.data.pricing.price,
      currency: this.data.pricing.currency,
      paymentMethods: this.getPaymentMethods(false), // ONLY enabled methods among TRC20, ERC20, BTC
      botActivationEnabled: this.data.botSettings.botActivationEnabled,
      publicStatusMessage: this.data.botSettings.publicStatusMessage,
      displayName: this.data.botSettings.displayName,
    };
  }
}

export const db = new DatabaseManager();
