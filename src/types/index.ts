export type BotEngineStatus = 'Disconnected' | 'Awaiting Payment' | 'Ready' | 'Running' | 'Not Started';

export interface PaymentMethod {
  id: string;
  name: string;
  accountHolder?: string;
  accountNumberOrAddress: string;
  network?: string;
  instructions: string;
  qrCodeUrl?: string;
  enabled: boolean;
  createdAt?: number;
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

export interface TransactionRecord {
  id: string;
  txId: string;
  amount: number;
  paymentMethodName: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: number;
  verifiedAt: number | null;
  reviewedBy?: string | null;
  notes?: string;
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

export interface EngineStatusData {
  botEngineStatus: BotEngineStatus;
  isTrading: boolean;
  mt5Connected: boolean;
  mt5LoginId: string | null;
  mt5BrokerServer: string | null;
  paymentVerified: boolean;
  activeTxId: string | null;
  subscriptionPrice: number;
  currency: string;
  tradingBackendAttached: boolean;
  botActivationEnabled: boolean;
  publicStatusMessage: string;
  publicSettings: WebsiteSettings;
  enabledPaymentMethods: PaymentMethod[];
}

export interface MT5Credentials {
  loginId: string;
  brokerServer: string;
  password?: string;
}

export interface AdminDashboardData {
  settings: WebsiteSettings;
  pricing: PricingSettings;
  paymentMethods: PaymentMethod[];
  transactions: TransactionRecord[];
  auditLog: AuditLogEntry[];
  botSettings: BotSettings;
  runtimeState: {
    tradingBackendAttached: boolean;
    isTrading: boolean;
    botEngineStatus: BotEngineStatus;
    mt5Connected: boolean;
    mt5LoginId: string | null;
  };
}
