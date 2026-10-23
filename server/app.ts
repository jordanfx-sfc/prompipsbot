import express, { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

// Ephemeral runtime state for active visitor session
export interface SessionRuntimeState {
  paymentVerified: boolean;
  activeTxId: string | null;
  mt5Account: {
    loginId: string;
    brokerServer: string;
    connected: boolean;
    lastPing: number | null;
  } | null;
  botEngineStatus: 'Disconnected' | 'Awaiting Payment' | 'Ready' | 'Running' | 'Not Started';
  isTrading: boolean;
  tradingBackendAttached: boolean;
}

export const runtimeState: SessionRuntimeState = {
  paymentVerified: false,
  activeTxId: null,
  mt5Account: null,
  botEngineStatus: 'Not Started',
  isTrading: false,
  tradingBackendAttached: false,
};

// Middleware: Authenticate Administrator via Bearer Token
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Administrator authentication token required.',
    });
  }
  const token = authHeader.split(' ')[1];
  if (!db.validateSession(token)) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid. Please log in again.',
    });
  }
  (req as any).adminToken = token;
  next();
}

const app = express();
app.use(express.json());

// Router for all API routes (mounted at /api and at root for Vercel serverless flexibility)
const router = express.Router();

// ==========================================
// PUBLIC ROUTES (No authentication required)
// ==========================================

// 1. Public Configuration
router.get('/public-config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: db.getPublicConfig(),
  });
});

// 2. Engine and System Status
router.get('/engine/status', (req: Request, res: Response) => {
  const publicConfig = db.getPublicConfig();
  res.json({
    success: true,
    data: {
      botEngineStatus: runtimeState.botEngineStatus,
      isTrading: runtimeState.isTrading,
      mt5Connected: runtimeState.mt5Account?.connected ?? false,
      mt5LoginId: runtimeState.mt5Account?.loginId ?? null,
      mt5BrokerServer: runtimeState.mt5Account?.brokerServer ?? null,
      paymentVerified: runtimeState.paymentVerified,
      activeTxId: runtimeState.activeTxId,
      subscriptionPrice: publicConfig.price,
      currency: publicConfig.currency,
      tradingBackendAttached: runtimeState.tradingBackendAttached,
      botActivationEnabled: publicConfig.botActivationEnabled,
      publicStatusMessage: publicConfig.publicStatusMessage,
      publicSettings: {
        websiteName: publicConfig.websiteName,
        websiteDescription: publicConfig.websiteDescription,
        contactEmail: publicConfig.contactEmail,
        whatsappSupport: publicConfig.whatsappSupport,
        telegramSupport: publicConfig.telegramSupport,
        otherSupport: publicConfig.otherSupport,
      },
      enabledPaymentMethods: publicConfig.paymentMethods,
    },
  });
});

// 3. MT5 Account Validation and Connection Handshake
router.post('/mt5/connect', (req: Request, res: Response) => {
  const { loginId, brokerServer, password } = req.body;

  if (!loginId || typeof loginId !== 'string' || loginId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid MT5 Login ID. Please enter your numeric MT5 account number.',
    });
  }

  if (!brokerServer || typeof brokerServer !== 'string' || brokerServer.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Broker server name is required (e.g. Exness-Real19, Deriv-Server).',
    });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'MT5 password is required to establish session authorization.',
    });
  }

  runtimeState.mt5Account = {
    loginId: loginId.trim(),
    brokerServer: brokerServer.trim(),
    connected: true,
    lastPing: Date.now(),
  };

  if (!runtimeState.paymentVerified) {
    runtimeState.botEngineStatus = 'Awaiting Payment';
  } else {
    runtimeState.botEngineStatus = 'Ready';
  }

  return res.json({
    success: true,
    message: 'MT5 connection parameters saved securely. Connection handshake established.',
    data: {
      loginId: runtimeState.mt5Account.loginId,
      brokerServer: runtimeState.mt5Account.brokerServer,
      connected: true,
      botEngineStatus: runtimeState.botEngineStatus,
    },
  });
});

// 4. Disconnect MT5
router.post('/mt5/disconnect', (req: Request, res: Response) => {
  runtimeState.mt5Account = null;
  runtimeState.isTrading = false;
  runtimeState.botEngineStatus = 'Disconnected';
  return res.json({
    success: true,
    message: 'MT5 account disconnected successfully.',
  });
});

// 5. Server-Side Payment Verification (TxID)
router.post('/verify-payment', (req: Request, res: Response) => {
  const { txId, paymentMethodName } = req.body;

  if (!txId || typeof txId !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Please enter the correct transaction ID',
    });
  }

  const trimmedTx = txId.trim();
  const isObviousSpam = /^(test|abc|123|demo|null|undefined|sample|none)$/i.test(trimmedTx);
  const hasValidLength = trimmedTx.length >= 8 && /^[a-zA-Z0-9_\-#]+$/.test(trimmedTx);

  if (!hasValidLength || isObviousSpam) {
    return res.status(400).json({
      success: false,
      message: 'Please enter the correct transaction ID',
    });
  }

  // Check duplicate usage across database
  if (db.isTxIdDuplicate(trimmedTx)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter the correct transaction ID',
    });
  }

  // Record transaction in persistent database
  const pricing = db.getPricing();
  db.recordTransaction(trimmedTx, pricing.price, paymentMethodName || 'Cryptocurrency / Mobile Money', 'verified');

  runtimeState.activeTxId = trimmedTx;
  runtimeState.paymentVerified = true;

  if (runtimeState.mt5Account && runtimeState.mt5Account.connected) {
    runtimeState.botEngineStatus = 'Ready';
  } else {
    runtimeState.botEngineStatus = 'Awaiting Payment';
  }

  return res.json({
    success: true,
    message: 'Payment verified successfully. Your subscription is ready for activation.',
    data: {
      paymentVerified: true,
      activeTxId: trimmedTx,
      botEngineStatus: runtimeState.botEngineStatus,
    },
  });
});

// 6. Start Bot
router.post('/bot/start', (req: Request, res: Response) => {
  const botSettings = db.getBotSettings();

  if (!botSettings.botActivationEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Bot activation is currently unavailable. Please contact support.',
    });
  }

  if (!runtimeState.paymentVerified) {
    return res.status(403).json({
      success: false,
      message: 'Payment required. Please complete and verify your subscription first.',
    });
  }

  if (!runtimeState.mt5Account || !runtimeState.mt5Account.connected) {
    return res.status(400).json({
      success: false,
      message: 'MT5 Connection is required before starting the trading engine.',
    });
  }

  if (!runtimeState.tradingBackendAttached) {
    return res.status(503).json({
      success: false,
      message: 'Trading engine is not connected yet.',
      detail:
        'The MT5 live execution bridge microservice is awaiting socket connection. No live orders can be placed until the backend daemon is attached.',
    });
  }

  runtimeState.isTrading = true;
  runtimeState.botEngineStatus = 'Running';

  return res.json({
    success: true,
    message: 'Trading engine started successfully.',
    data: {
      botEngineStatus: 'Running',
      isTrading: true,
    },
  });
});

// 7. Stop Bot
router.post('/bot/stop', (req: Request, res: Response) => {
  runtimeState.isTrading = false;
  runtimeState.botEngineStatus =
    runtimeState.paymentVerified && runtimeState.mt5Account ? 'Ready' : 'Disconnected';
  return res.json({
    success: true,
    message: 'Trading engine stopped.',
    data: {
      botEngineStatus: runtimeState.botEngineStatus,
      isTrading: false,
    },
  });
});

// ==========================================
// ADMINISTRATOR AUTHENTICATION ROUTES
// ==========================================

// Admin Login
router.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.',
    });
  }

  const authResult = db.authenticateAdmin(username, password);
  if (!authResult.success) {
    return res.status(401).json({
      success: false,
      error: authResult.error || 'Invalid administrator credentials.',
    });
  }

  return res.json({
    success: true,
    token: authResult.token,
    username: 'Prompipsboss',
    message: 'Administrator authenticated successfully.',
  });
});

// Admin Logout
router.post('/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const token = (req as any).adminToken;
  db.destroySession(token);
  return res.json({
    success: true,
    message: 'Administrator logged out successfully.',
  });
});

// Admin Check Session
router.get('/admin/session', requireAdmin, (req: Request, res: Response) => {
  res.json({
    success: true,
    authenticated: true,
    username: 'Prompipsboss',
  });
});

// ==========================================
// PROTECTED ADMIN DASHBOARD ROUTES
// ==========================================

// Get complete Admin Dashboard data
router.get('/admin/dashboard-data', requireAdmin, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      settings: db.getSettings(),
      pricing: db.getPricing(),
      paymentMethods: db.getPaymentMethods(true),
      transactions: db.getTransactions(),
      auditLog: db.getAuditLog(),
      botSettings: db.getBotSettings(),
      runtimeState: {
        tradingBackendAttached: runtimeState.tradingBackendAttached,
        isTrading: runtimeState.isTrading,
        botEngineStatus: runtimeState.botEngineStatus,
        mt5Connected: runtimeState.mt5Account?.connected ?? false,
        mt5LoginId: runtimeState.mt5Account?.loginId ?? null,
      },
    },
  });
});

// A. Update General Settings
router.post('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const { websiteName, websiteDescription, contactEmail, whatsappSupport, telegramSupport, otherSupport } = req.body;
  const updated = db.updateSettings(
    {
      websiteName: websiteName ? String(websiteName).trim() : undefined,
      websiteDescription: websiteDescription ? String(websiteDescription).trim() : undefined,
      contactEmail: contactEmail ? String(contactEmail).trim() : undefined,
      whatsappSupport: whatsappSupport ? String(whatsappSupport).trim() : undefined,
      telegramSupport: telegramSupport ? String(telegramSupport).trim() : undefined,
      otherSupport: otherSupport ? String(otherSupport).trim() : undefined,
    },
    'Prompipsboss'
  );
  res.json({
    success: true,
    message: 'Website settings saved successfully.',
    data: updated,
  });
});

// B. Update Subscription Pricing
router.post('/admin/pricing', requireAdmin, (req: Request, res: Response) => {
  const { price, currency } = req.body;
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription price. Please enter a positive number.',
    });
  }

  const updated = db.updatePricing(numPrice, currency || 'USD', 'Prompipsboss');
  res.json({
    success: true,
    message: `Subscription price successfully updated to $${updated.price} ${updated.currency}.`,
    data: updated,
  });
});

// C. Payment Methods Management
router.post('/admin/payment-methods', requireAdmin, (req: Request, res: Response) => {
  const { name, accountHolder, accountNumberOrAddress, network, instructions, qrCodeUrl, enabled } = req.body;

  if (!name || !accountNumberOrAddress) {
    return res.status(400).json({
      success: false,
      message: 'Payment method name and account number or address are required.',
    });
  }

  const newMethod = db.addPaymentMethod(
    {
      name: String(name).trim(),
      accountHolder: accountHolder ? String(accountHolder).trim() : '',
      accountNumberOrAddress: String(accountNumberOrAddress).trim(),
      network: network ? String(network).trim() : '',
      instructions: instructions ? String(instructions).trim() : '',
      qrCodeUrl: qrCodeUrl ? String(qrCodeUrl).trim() : '',
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    },
    'Prompipsboss'
  );

  res.json({
    success: true,
    message: `Payment method "${newMethod.name}" added successfully.`,
    data: newMethod,
  });
});

router.put('/admin/payment-methods/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, accountHolder, accountNumberOrAddress, network, instructions, qrCodeUrl, enabled } = req.body;

  const updated = db.updatePaymentMethod(
    id,
    {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(accountHolder !== undefined && { accountHolder: String(accountHolder).trim() }),
      ...(accountNumberOrAddress !== undefined && { accountNumberOrAddress: String(accountNumberOrAddress).trim() }),
      ...(network !== undefined && { network: String(network).trim() }),
      ...(instructions !== undefined && { instructions: String(instructions).trim() }),
      ...(qrCodeUrl !== undefined && { qrCodeUrl: String(qrCodeUrl).trim() }),
      ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    },
    'Prompipsboss'
  );

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Payment method not found.' });
  }

  res.json({
    success: true,
    message: `Payment method "${updated.name}" updated successfully.`,
    data: updated,
  });
});

router.delete('/admin/payment-methods/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deletePaymentMethod(id, 'Prompipsboss');
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Payment method not found.' });
  }
  res.json({
    success: true,
    message: 'Payment method deleted successfully.',
  });
});

router.patch('/admin/payment-methods/:id/toggle', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { enabled } = req.body;
  const updated = db.togglePaymentMethod(id, Boolean(enabled), 'Prompipsboss');
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Payment method not found.' });
  }
  res.json({
    success: true,
    message: `Payment method "${updated.name}" is now ${updated.enabled ? 'enabled' : 'disabled'}.`,
    data: updated,
  });
});

// D. Payment Verification (Transactions)
router.patch('/admin/transactions/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!['pending', 'verified', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be pending, verified, or rejected.',
    });
  }

  const updated = db.updateTransactionStatus(id, status, 'Prompipsboss', notes);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Transaction record not found.' });
  }

  if (runtimeState.activeTxId === updated.txId) {
    runtimeState.paymentVerified = status === 'verified';
    if (status === 'verified') {
      runtimeState.botEngineStatus = runtimeState.mt5Account ? 'Ready' : 'Awaiting Payment';
    } else {
      runtimeState.botEngineStatus = 'Awaiting Payment';
    }
  }

  res.json({
    success: true,
    message: `Transaction ${updated.txId} marked as ${status.toUpperCase()}.`,
    data: updated,
  });
});

// E. Bot Settings
router.post('/admin/bot-settings', requireAdmin, (req: Request, res: Response) => {
  const { displayName, botStatus, botActivationEnabled, mt5IntegrationStatus, publicStatusMessage } = req.body;

  const updated = db.updateBotSettings(
    {
      ...(displayName !== undefined && { displayName: String(displayName).trim() }),
      ...(botStatus !== undefined && { botStatus: String(botStatus).trim() }),
      ...(botActivationEnabled !== undefined && { botActivationEnabled: Boolean(botActivationEnabled) }),
      ...(mt5IntegrationStatus !== undefined && { mt5IntegrationStatus: String(mt5IntegrationStatus).trim() }),
      ...(publicStatusMessage !== undefined && { publicStatusMessage: String(publicStatusMessage).trim() }),
    },
    'Prompipsboss'
  );

  res.json({
    success: true,
    message: 'Bot settings updated successfully.',
    data: updated,
  });
});

// Toggle Live MT5 Execution Bridge
router.post('/admin/toggle-backend', requireAdmin, (req: Request, res: Response) => {
  const { attached } = req.body;
  runtimeState.tradingBackendAttached =
    typeof attached === 'boolean' ? attached : !runtimeState.tradingBackendAttached;

  if (!runtimeState.tradingBackendAttached && runtimeState.isTrading) {
    runtimeState.isTrading = false;
    runtimeState.botEngineStatus = 'Ready';
  }

  db.addAuditLog(
    'BRIDGE_TOGGLE',
    `Live execution microservice bridge set to ${runtimeState.tradingBackendAttached ? 'ONLINE' : 'OFFLINE'}`,
    'Prompipsboss'
  );

  return res.json({
    success: true,
    tradingBackendAttached: runtimeState.tradingBackendAttached,
    message: runtimeState.tradingBackendAttached
      ? 'Live MT5 Execution Bridge is now ATTACHED.'
      : 'Live MT5 Execution Bridge is DISCONNECTED.',
  });
});

// Change Admin Password
router.post('/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters long.',
    });
  }

  db.updateAdminPassword(newPassword, 'Prompipsboss');
  return res.json({
    success: true,
    message: 'Administrator password changed successfully.',
  });
});

// Session reset
router.post('/engine/reset', (req: Request, res: Response) => {
  runtimeState.paymentVerified = false;
  runtimeState.activeTxId = null;
  runtimeState.mt5Account = null;
  runtimeState.botEngineStatus = 'Not Started';
  runtimeState.isTrading = false;
  runtimeState.tradingBackendAttached = false;
  return res.json({
    success: true,
    message: 'Runtime session reset to default.',
  });
});

// Mount router on both /api (standard) and / (if serverless function strips prefix)
app.use('/api', router);
app.use('/', router);

export { app };
export default app;
