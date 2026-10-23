import {
  EngineStatusData,
  MT5Credentials,
  PaymentMethod,
  WebsiteSettings,
  PricingSettings,
  BotSettings,
  AdminDashboardData,
} from '../types';

const ADMIN_TOKEN_KEY = 'prompips_admin_token';

export function getStoredAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredAdminToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- PUBLIC APIS ---

export async function fetchEngineStatus(): Promise<EngineStatusData> {
  const res = await fetch('/api/engine/status');
  if (!res.ok) {
    throw new Error('Failed to fetch system status from backend.');
  }
  const json = await res.json();
  return json.data;
}

export async function connectMT5(creds: MT5Credentials): Promise<{
  success: boolean;
  message: string;
  data?: { loginId: string; brokerServer: string; connected: boolean; botEngineStatus: any };
}> {
  const res = await fetch('/api/mt5/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'MT5 connection failed.');
  }
  return json;
}

export async function disconnectMT5(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/mt5/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  return json;
}

export async function verifyPaymentTxId(
  txId: string,
  paymentMethodName?: string
): Promise<{
  success: boolean;
  message: string;
  data?: { paymentVerified: boolean; activeTxId: string; botEngineStatus: any };
}> {
  const res = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txId, paymentMethodName }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Please Fill in the correct transaction ID');
  }
  return json;
}

export async function startBot(): Promise<{ success: boolean; message: string; detail?: string }> {
  const res = await fetch('/api/bot/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) {
    const error = new Error(json.message || 'Cannot start trading engine.') as any;
    error.detail = json.detail;
    throw error;
  }
  return json;
}

export async function stopBot(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/bot/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Cannot stop trading engine.');
  }
  return json;
}

// --- ADMIN AUTH APIS ---

export async function adminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; token: string; username: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.message || 'Invalid administrator credentials.');
  }
  setStoredAdminToken(json.token);
  return json;
}

export async function adminLogout(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    setStoredAdminToken(null);
    return await res.json();
  } catch {
    setStoredAdminToken(null);
    return { success: true, message: 'Logged out.' };
  }
}

export async function checkAdminSession(): Promise<boolean> {
  const token = getStoredAdminToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/admin/session', {
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- ADMIN CONTROL CENTER APIS ---

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const res = await fetch('/api/admin/dashboard-data', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Unauthorized or session expired. Please log in again.');
  }
  const json = await res.json();
  return json.data;
}

export async function saveAdminSettings(settings: Partial<WebsiteSettings>): Promise<WebsiteSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save settings.');
  return json.data;
}

export async function saveAdminPricing(price: number, currency: string = 'USD'): Promise<PricingSettings> {
  const res = await fetch('/api/admin/pricing', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ price, currency }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update pricing.');
  return json.data;
}

export async function addAdminPaymentMethod(
  method: Omit<PaymentMethod, 'id' | 'createdAt'>
): Promise<PaymentMethod> {
  const res = await fetch('/api/admin/payment-methods', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(method),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to add payment method.');
  return json.data;
}

export async function updateAdminPaymentMethod(
  id: string,
  method: Partial<PaymentMethod>
): Promise<PaymentMethod> {
  const res = await fetch(`/api/admin/payment-methods/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(method),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update payment method.');
  return json.data;
}

export async function deleteAdminPaymentMethod(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/payment-methods/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete payment method.');
  return json.success;
}

export async function toggleAdminPaymentMethod(id: string, enabled: boolean): Promise<PaymentMethod> {
  const res = await fetch(`/api/admin/payment-methods/${id}/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ enabled }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to toggle payment method.');
  return json.data;
}

export async function updateAdminTransactionStatus(
  id: string,
  status: 'pending' | 'verified' | 'rejected',
  notes?: string
): Promise<any> {
  const res = await fetch(`/api/admin/transactions/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update transaction status.');
  return json.data;
}

export async function saveAdminBotSettings(settings: Partial<BotSettings>): Promise<BotSettings> {
  const res = await fetch('/api/admin/bot-settings', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update bot settings.');
  return json.data;
}

export async function toggleAdminBackendBridge(attached?: boolean): Promise<{
  success: boolean;
  tradingBackendAttached: boolean;
  message: string;
}> {
  const res = await fetch('/api/admin/toggle-backend', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ attached }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to toggle backend bridge.');
  return json;
}

export async function changeAdminPassword(newPassword: string): Promise<void> {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to change admin password.');
}
