import React, { useState } from 'react';
import {
  Server,
  Zap,
  Shield,
  Lock,
  Unlock,
  Power,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  ArrowRight,
  Sparkles,
  Sliders,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { EngineStatusData, BotEngineStatus, PaymentMethod } from '../types';
import { verifyPaymentTxId, connectMT5, startBot, stopBot } from '../services/api';

interface TradingEngineDashboardProps {
  statusData: EngineStatusData;
  onOpenMT5Modal: () => void;
  onOpenPaymentModal: () => void;
  onRefreshStatus: () => void;
  onPaymentSuccess?: (txId: string, newStatus: BotEngineStatus) => void;
  onConnectionSuccess?: (data: {
    loginId: string;
    brokerServer: string;
    botEngineStatus: BotEngineStatus;
  }) => void;
  onOpenAdminPanel?: () => void;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-usdt-trc20',
    name: 'USDT (TRC20)',
    accountHolder: 'PROMPIPS Treasury',
    accountNumberOrAddress: 'TYDnm7x9vQP3L4u1kQ2V8s8P7oF4Y9wK1b',
    network: 'TRC-20 (Tron Network)',
    instructions:
      'Send exactly $50 USDT via TRC20 network. Zero or near-zero gas fee. Copy TXID from your wallet after sending.',
    enabled: true,
  },
  {
    id: 'pm-usdt-erc20',
    name: 'USDT (ERC20 / Polygon)',
    accountHolder: 'PROMPIPS Multi-Sig',
    accountNumberOrAddress: '0x892a0572e92c2b3e8c9b2f768b446a6e789bc44d',
    network: 'Ethereum / Polygon EVM',
    instructions:
      'Send $50 USDT to this EVM address. Ensure you select either Ethereum or Polygon network.',
    enabled: true,
  },
  {
    id: 'pm-bep20',
    name: 'BEP20 (BNB Smart Chain)',
    accountHolder: 'PROMPIPS Treasury',
    accountNumberOrAddress: '',
    network: 'BEP-20 (BNB Smart Chain)',
    instructions:
      'Send subscription fee via BEP20 (BNB Smart Chain). Awaiting administrator wallet address configuration.',
    enabled: true,
  },
  {
    id: 'pm-momo',
    name: 'Mobile Money / Bank Wire',
    accountHolder: 'Michael Mukiibi (PROMPIPS Finance)',
    accountNumberOrAddress: '+256 772 890 142 / Stanbic 90300189402',
    network: 'MTN / Airtel Mobile Money / Bank Transfer',
    instructions:
      'Send $50 equivalent (or local currency). Set reference as "PROMPIPS-BOT". Paste transfer transaction code below.',
    enabled: true,
  },
];

const BROKER_EXAMPLES = [
  'Exness',
  'IC Markets',
  'Pepperstone',
  'XM',
  'HFM',
  'FTMO',
  'and others',
];

export const TradingEngineDashboard: React.FC<TradingEngineDashboardProps> = ({
  statusData,
  onOpenMT5Modal,
  onOpenPaymentModal,
  onRefreshStatus,
  onPaymentSuccess,
  onConnectionSuccess,
  onOpenAdminPanel,
}) => {
  // Payment methods list: Filter out any legacy BTC method, ensure BEP20 is present
  const availableMethods =
    statusData.enabledPaymentMethods && statusData.enabledPaymentMethods.length > 0
      ? statusData.enabledPaymentMethods.filter(
          (m) =>
            m.enabled &&
            !m.name.toLowerCase().includes('btc') &&
            !m.name.toLowerCase().includes('bitcoin')
        )
      : DEFAULT_METHODS;

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    availableMethods[0]?.id || 'pm-usdt-trc20'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Payment Verification State
  const [txIdInput, setTxIdInput] = useState<string>(statusData.activeTxId || '');
  const [isVerifyingTx, setIsVerifyingTx] = useState(false);
  const [txVerificationStatus, setTxVerificationStatus] = useState<
    'idle' | 'pending' | 'success' | 'failed'
  >(statusData.paymentVerified ? 'success' : 'idle');
  const [txStatusMessage, setTxStatusMessage] = useState<string>(
    statusData.paymentVerified
      ? 'Payment verified successfully. Your subscription is ready for activation.'
      : ''
  );

  // MT5 Setup State
  const [loginId, setLoginId] = useState<string>(statusData.mt5LoginId || '');
  const [brokerServer, setBrokerServer] = useState<string>(statusData.mt5BrokerServer || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnectingMT5, setIsConnectingMT5] = useState(false);

  // Connect Bot Action Message (Exact requirement)
  const [connectBotMessage, setConnectBotMessage] = useState<string | null>(null);

  // Bot start/stop state
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [engineAlert, setEngineAlert] = useState<{
    type: 'error' | 'success' | 'warning';
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const activeMethod =
    availableMethods.find((m) => m.id === selectedMethodId) ||
    availableMethods[0] ||
    DEFAULT_METHODS[0];

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleVerifyPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConnectBotMessage(null);

    const trimmed = txIdInput.trim();
    if (!trimmed) {
      setTxVerificationStatus('failed');
      setTxStatusMessage('Please enter the correct transaction ID');
      return;
    }

    setIsVerifyingTx(true);
    setTxVerificationStatus('pending');
    setTxStatusMessage('Verifying payment on the blockchain / gateway...');

    try {
      const res = await verifyPaymentTxId(trimmed, activeMethod?.name);
      if (res.success) {
        setTxVerificationStatus('success');
        setTxStatusMessage(
          res.message || 'Payment verified successfully. Your subscription is ready for activation.'
        );
        if (res.data) {
          onPaymentSuccess?.(res.data.activeTxId, res.data.botEngineStatus);
        }
        onRefreshStatus();
      } else {
        setTxVerificationStatus('failed');
        setTxStatusMessage('Please enter the correct transaction ID');
      }
    } catch (err: any) {
      setTxVerificationStatus('failed');
      setTxStatusMessage('Please enter the correct transaction ID');
    } finally {
      setIsVerifyingTx(false);
    }
  };

  const handleConnectBot = async () => {
    // Clear previous alerts
    setEngineAlert(null);

    // Requirement 4:
    // When CONNECT BOT is clicked:
    // Display the following exact message: "Please enter the correct transaction ID"
    // Do NOT display generic errors, 404s, backend crash messages, or stack traces.
    // Keep the user on the page so they can complete the payment verification and retry.
    if (!statusData.paymentVerified && txVerificationStatus !== 'success') {
      setConnectBotMessage('Please enter the correct transaction ID');
      // Scroll smoothly to the transaction ID input field if not already in view
      const txInputElem = document.getElementById('prompips-txid-input');
      if (txInputElem) {
        txInputElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        txInputElem.focus();
      }
      return;
    }

    // If payment is verified, proceed to MT5 connection and engine activation
    if (!loginId.trim() || !brokerServer.trim() || !password) {
      setConnectBotMessage('Please enter your MT5 Account ID, Broker Server, and Password.');
      return;
    }

    setIsConnectingMT5(true);
    setConnectBotMessage(null);
    try {
      const connRes = await connectMT5({
        loginId: loginId.trim(),
        brokerServer: brokerServer.trim(),
        password,
      });

      if (connRes.data) {
        onConnectionSuccess?.({
          loginId: connRes.data.loginId,
          brokerServer: connRes.data.brokerServer,
          botEngineStatus: connRes.data.botEngineStatus,
        });
      }

      onRefreshStatus();
      setPassword('');

      // Auto start bot if activation enabled
      if (statusData.botActivationEnabled) {
        try {
          const startRes = await startBot();
          setEngineAlert({
            type: 'success',
            title: 'Engine Running',
            message: startRes.message || 'Trading engine connected and running.',
          });
          onRefreshStatus();
        } catch (startErr: any) {
          setEngineAlert({
            type: 'warning',
            title: 'MT5 Gateway Connected',
            message: 'MT5 credentials linked. Quantitative engine is primed in Standby mode.',
            detail: startErr.detail,
          });
        }
      }
    } catch (err: any) {
      // Clean user-friendly message without stack traces
      setConnectBotMessage('Please enter the correct transaction ID');
    } finally {
      setIsConnectingMT5(false);
    }
  };

  const handleStopBot = async () => {
    setIsStoppingBot(true);
    setEngineAlert(null);
    try {
      const res = await stopBot();
      setEngineAlert({
        type: 'success',
        title: 'Engine Stopped',
        message: res.message || 'Trading engine stopped.',
      });
      onRefreshStatus();
    } catch (err: any) {
      setEngineAlert({
        type: 'error',
        title: 'Stop Error',
        message: err.message || 'Could not stop trading engine.',
      });
    } finally {
      setIsStoppingBot(false);
    }
  };

  const handleBrokerExampleClick = (example: string) => {
    if (example === 'and others') {
      const input = document.getElementById('prompips-broker-input');
      if (input) input.focus();
    } else {
      setBrokerServer(`${example}-Real`);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
      {/* ==============================================================
          SECTION 1: TOP HEADING (Exact Requirement)
          "Activate your bot to get started"
          ============================================================== */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/50 mb-3 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#00f2fe] glow-cyan animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-300">
            PROMPIPS QUANTITATIVE SUITE
          </span>
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-wider text-white uppercase drop-shadow-[0_0_20px_rgba(0,242,254,0.35)] leading-tight">
          Activate your bot to get started
        </h1>
        <p className="text-xs font-mono text-purple-300/80 mt-2 max-w-md mx-auto">
          Complete the one-time ${statusData.subscriptionPrice} lifetime subscription to unlock automated algorithmic execution
        </p>
      </div>

      {/* Global Engine Alert Banner if present */}
      {engineAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
            engineAlert.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/70 text-rose-200'
              : engineAlert.type === 'warning'
              ? 'bg-amber-950/70 border-amber-500/70 text-amber-200'
              : 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold font-mono tracking-wide">
            {engineAlert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : engineAlert.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="uppercase">{engineAlert.title}</span>
          </div>
          <p className="text-slate-200 font-mono text-[11px] pl-6 font-semibold">
            {engineAlert.message}
          </p>
          {engineAlert.detail && (
            <p className="text-slate-400 font-mono text-[10px] pl-6">
              {engineAlert.detail}
            </p>
          )}
        </div>
      )}

      {/* ==============================================================
          SECTIONS 2, 3, 4: SUBSCRIPTION PRICE & PAYMENT MENU
          - Subscription price loaded from admin ($50)
          - Available payment methods (USDT TRC20, USDT ERC20, BEP20 BNB Smart Chain, Momo)
          - Payment instructions & 1-click copy
          - Transaction ID input & Verify Payment button
          - Payment verification status
          ============================================================== */}
      <div className="relative rounded-3xl bg-[#0d0722] border border-purple-500/60 p-5 sm:p-6 shadow-2xl glow-purple overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 2. Subscription Price Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#03151d] border border-[#00f2fe]/40 flex items-center justify-center glow-cyan shadow-inner">
              <DollarSign className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300 block">
                BOT SUBSCRIPTION
              </span>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                PROMPIPS BOT LICENSE
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-3xl font-extrabold font-display text-[#00f2fe] tracking-tight drop-shadow-[0_0_10px_rgba(0,242,254,0.4)]">
                ${statusData.subscriptionPrice}
              </span>
              <span className="text-xs font-mono text-purple-300">USD</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300/80 block uppercase tracking-wider">
              One-Time Lifetime Access
            </span>
          </div>
        </div>

        {/* 3. Payment Method Selection Tabs */}
        <div className="pt-4 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-2 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#00f2fe]" />
              Select Payment Method:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((method) => {
                const isSelected = method.id === selectedMethodId;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethodId(method.id);
                      setConnectBotMessage(null);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-purple-900/40 border-[#00f2fe] shadow-lg glow-cyan text-white'
                        : 'bg-[#080415] border-purple-900/60 text-slate-300 hover:border-purple-600/70 hover:bg-purple-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-bold text-xs truncate">
                        {method.name}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#00f2fe] glow-cyan shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-purple-300/80 truncate block">
                      {method.network || 'Official Network'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Payment Method Details & Instructions */}
          {activeMethod && (
            <div className="p-4 rounded-2xl bg-[#080415] border border-purple-900/70 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-purple-300 uppercase tracking-wide text-[10px]">
                  Network: <strong className="text-cyan-300">{activeMethod.network || 'Standard'}</strong>
                </span>
                {activeMethod.accountHolder && (
                  <span className="font-mono text-slate-400 text-[10px] truncate max-w-[180px]">
                    Payee: {activeMethod.accountHolder}
                  </span>
                )}
              </div>

              {/* BEP20 Unconfigured Wallet Handling */}
              {activeMethod.id === 'pm-bep20' &&
              (!activeMethod.accountNumberOrAddress || !activeMethod.accountNumberOrAddress.trim()) ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Awaiting Administrator Wallet Configuration</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    The administrator has not configured the BEP20 (BNB Smart Chain) address yet. Please select another payment method above (e.g. USDT TRC20 or ERC20), or configure the BEP20 address in the Admin Panel.
                  </p>
                  {onOpenAdminPanel && (
                    <button
                      type="button"
                      onClick={onOpenAdminPanel}
                      className="mt-1 text-[11px] text-[#00f2fe] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      Open Admin Panel to Configure BEP20 Address →
                    </button>
                  )}
                </div>
              ) : (
                /* Configured Wallet Address with 1-Click Copy */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Payment Address / Account:
                    </span>
                    {copiedKey === 'address' && (
                      <span className="text-[10px] font-mono text-[#00f59b] flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3" /> Copied to Clipboard!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#03151d] border border-cyan-900/60 font-mono text-xs text-cyan-200 break-all select-all">
                    <span className="flex-1 font-mono tracking-tight select-all">
                      {activeMethod.accountNumberOrAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeMethod.accountNumberOrAddress, 'address')}
                      aria-label="Copy address"
                      className="p-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-[#00f2fe] hover:text-white transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedKey === 'address' ? (
                        <Check className="w-4 h-4 text-[#00f59b]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Instructions */}
              {activeMethod.instructions && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-slate-300 font-mono text-[11px] leading-relaxed">
                  <span className="text-purple-300 font-bold uppercase text-[10px] block mb-0.5">
                    Instructions:
                  </span>
                  {activeMethod.instructions}
                </div>
              )}
            </div>
          )}

          {/* 4. Transaction ID Input and Verify Payment Button */}
          <div className="pt-2 space-y-3">
            <div>
              <label
                htmlFor="prompips-txid-input"
                className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5 flex items-center justify-between"
              >
                <span>Transaction ID / Hash / Reference:</span>
                <span className="text-cyan-400 text-[10px]">Step 1 of 2</span>
              </label>
              <div className="relative">
                <input
                  id="prompips-txid-input"
                  type="text"
                  value={txIdInput}
                  onChange={(e) => {
                    setTxIdInput(e.target.value);
                    setConnectBotMessage(null);
                  }}
                  placeholder="Paste your Transaction Hash / TXID / Transfer Code here..."
                  className="w-full h-12 px-4 rounded-xl bg-[#05020f] border border-purple-700/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-xs sm:text-sm tracking-wide placeholder:text-purple-400/40 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Verify Payment Button */}
            <button
              type="button"
              onClick={handleVerifyPayment}
              disabled={isVerifyingTx}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-800 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-500 text-white font-display font-bold text-xs sm:text-sm tracking-widest uppercase transition-all shadow-lg glow-purple flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
            >
              {isVerifyingTx ? (
                <>
                  <RefreshCw className="w-4 h-4 text-cyan-300 animate-spin" />
                  VERIFYING PAYMENT...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                  VERIFY PAYMENT
                </>
              )}
            </button>

            {/* Payment Verification Status Display */}
            {(txStatusMessage || statusData.paymentVerified) && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                  statusData.paymentVerified || txVerificationStatus === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                    : txVerificationStatus === 'failed'
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                    : 'bg-purple-950/60 border-purple-600/60 text-purple-200'
                }`}
              >
                {statusData.paymentVerified || txVerificationStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00f59b] shrink-0 mt-0.5" />
                ) : txVerificationStatus === 'failed' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-spin" />
                )}
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[11px]">
                    {statusData.paymentVerified || txVerificationStatus === 'success'
                      ? 'Payment Verified'
                      : txVerificationStatus === 'failed'
                      ? 'Verification Failed'
                      : 'Verifying...'}
                  </span>
                  <p className="text-[11px] mt-0.5 font-mono">
                    {statusData.paymentVerified
                      ? `Subscription cleared ($${statusData.subscriptionPrice} USD). Proceed to MT5 connection below.`
                      : txStatusMessage || 'Please enter the correct transaction ID'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==============================================================
          SECTION 5: SECOND HEADING (Exact Requirement)
          "Activate your bot to get started"
          ============================================================== */}
      <div className="text-center pt-3 pb-1">
        <h2 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl tracking-wider text-white uppercase drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]">
          Activate your bot to get started
        </h2>
        <p className="text-xs font-mono text-purple-300/80 mt-1 max-w-sm mx-auto">
          Enter your MetaTrader 5 account details to connect the algorithmic execution bridge
        </p>
      </div>

      {/* ==============================================================
          SECTION 6: MT5 CONNECTION SETUP
          - Account ID / Login input
          - Broker Server input with helpful examples:
            Exness, IC Markets, Pepperstone, XM, HFM, FTMO, and others
          - Password input with show/hide password toggle
          - Secure connection indicator
          ============================================================== */}
      <div className="relative rounded-3xl bg-turquoise-card border border-purple-500/60 p-5 sm:p-6 shadow-2xl glow-purple overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* MT5 Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#03151d] border border-[#00f2fe]/40 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg tracking-wider text-white uppercase">
                MT5 CONNECTION SETUP
              </h3>
              <span className="text-[10px] font-mono tracking-tight text-cyan-300/70 block">
                METATRADER 5 TERMINAL GATEWAY
              </span>
            </div>
          </div>

          {/* Secure connection indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#021016] border border-cyan-500/30">
            <span
              className={`w-2 h-2 rounded-full ${
                statusData.mt5Connected ? 'bg-[#00f59b] glow-green' : 'bg-[#00f2fe] glow-cyan'
              }`}
            />
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-cyan-100 flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#00f2fe]" />
              {statusData.mt5Connected ? 'CONNECTED' : '256-BIT SSL'}
            </span>
          </div>
        </div>

        {/* MT5 Inputs Form */}
        <div className="py-4 space-y-4">
          {/* Account ID / Login input */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5">
              Account ID / Login:
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                setConnectBotMessage(null);
              }}
              placeholder="e.g. 10948210"
              className="w-full h-12 px-4 rounded-xl bg-[#020e15]/90 border border-cyan-900/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-sm tracking-wide placeholder:text-cyan-900/70 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Broker Server input */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5 flex items-center justify-between">
              <span>Broker Server:</span>
              <span className="text-cyan-400/80 text-[10px]">Any MT5 broker supported</span>
            </label>
            <input
              id="prompips-broker-input"
              type="text"
              value={brokerServer}
              onChange={(e) => {
                setBrokerServer(e.target.value);
                setConnectBotMessage(null);
              }}
              placeholder="e.g. Exness-Real19, ICMarketsSC-Live, XMGlobal-Real"
              className="w-full h-12 px-4 rounded-xl bg-[#020e15]/90 border border-cyan-900/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-sm tracking-wide placeholder:text-cyan-900/70 outline-none transition-all shadow-inner"
            />

            {/* Helpful Broker Examples: Exness, IC Markets, Pepperstone, XM, HFM, FTMO, and others */}
            <div className="mt-2 space-y-1.5">
              <span className="text-[10px] font-mono text-purple-300/80 block">
                Helpful broker examples (click to select or type manually):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BROKER_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleBrokerExampleClick(example)}
                    className="px-2.5 py-1 rounded-lg bg-[#03151d] border border-cyan-900/50 hover:border-[#00f2fe]/60 hover:bg-cyan-950/40 text-[10px] font-mono text-cyan-200 transition-colors cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Password input with show/hide toggle */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5">
              MT5 Password:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setConnectBotMessage(null);
                }}
                placeholder="Enter your MT5 trader password"
                className="w-full h-12 pl-4 pr-12 rounded-xl bg-[#020e15]/90 border border-cyan-900/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-sm tracking-wide placeholder:text-cyan-900/70 outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-cyan-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] font-mono text-cyan-300/60 mt-1">
              Protected by end-to-end ephemeral encryption. Never stored in plaintext.
            </p>
          </div>
        </div>

        {/* ==============================================================
            SECTION 7: CONNECT BOT BUTTON (Exact Requirement)
            Prominent button labelled: CONNECT BOT
            When clicked:
            - Display the following exact message:
              "Please enter the correct transaction ID"
            - Do NOT display generic errors, 404s, backend crash messages, or stack traces.
            - Keep the user on the page so they can complete the payment verification and retry.
            ============================================================== */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleConnectBot}
            disabled={isConnectingMT5}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#ff0055] via-[#ff1e56] to-[#fb7185] hover:opacity-95 text-white font-display font-extrabold text-sm sm:text-base tracking-widest uppercase shadow-2xl glow-pink flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isConnectingMT5 ? (
              <>
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                CONNECTING MT5...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-white" />
                CONNECT BOT
              </>
            )}
          </button>

          {/* Exact Action Message Display: "Please enter the correct transaction ID" */}
          {connectBotMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/70 text-rose-200 text-xs font-mono space-y-1 shadow-lg">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="uppercase tracking-wider">Verification Required</span>
              </div>
              <p className="text-white font-mono text-xs font-semibold pl-6">
                {connectBotMessage}
              </p>
            </div>
          )}

          {/* Running Bot Stop Button if already active */}
          {statusData.isTrading && (
            <button
              type="button"
              onClick={handleStopBot}
              disabled={isStoppingBot}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-900 to-rose-700 hover:from-rose-800 hover:to-rose-600 text-white font-display font-bold text-xs sm:text-sm tracking-widest uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Power className="w-4 h-4 text-white" />
              {isStoppingBot ? 'STOPPING...' : 'STOP BOT'}
            </button>
          )}
        </div>
      </div>

      {/* Execution Transparency & Status Box */}
      <div className="p-4 rounded-2xl bg-[#090518] border border-purple-900/60 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider">
            Engine Integrity & Verification
          </span>
          <span className="text-[10px] text-cyan-300">PROMPIPS v4.2 PROTOCOL</span>
        </div>

        <p className="text-slate-300/80 text-[11px] leading-relaxed">
          {statusData.isTrading ? (
            <span className="text-emerald-300 font-semibold">
              ● System is actively trading via verified execution bridge.
            </span>
          ) : statusData.botEngineStatus === 'Ready' ? (
            <span className="text-cyan-300">
              ● Engine is primed and ready. Orders will be placed upon active session triggers.
            </span>
          ) : statusData.botEngineStatus === 'Awaiting Payment' ? (
            <span className="text-amber-300">
              ● MT5 link verified. Subscription gate is awaiting payment confirmation.
            </span>
          ) : (
            <span className="text-slate-400">
              ● Engine status: Not Started. Complete subscription verification and connect your MT5 account to activate.
            </span>
          )}
        </p>

        <div className="pt-2 border-t border-purple-950 flex items-center justify-between text-[10px] text-purple-400/80">
          <span>Execution Bridge: {statusData.tradingBackendAttached ? 'Online' : 'Standby'}</span>
          <span>Security: End-to-End Ephemeral</span>
        </div>
      </div>

      {/* Algorithmic Specifications Strip */}
      <div className="grid grid-cols-3 gap-2.5 pt-1 text-center font-mono">
        <div className="p-3 rounded-2xl bg-[#080516] border border-purple-900/50">
          <span className="text-[10px] text-purple-400 block mb-0.5">LATENCY</span>
          <span className="text-xs font-bold text-cyan-200">1.2ms</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#080516] border border-purple-900/50">
          <span className="text-[10px] text-purple-400 block mb-0.5">SL / TP</span>
          <span className="text-xs font-bold text-[#00f59b]">DYNAMIC</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#080516] border border-purple-900/50">
          <span className="text-[10px] text-purple-400 block mb-0.5">PAIRS</span>
          <span className="text-xs font-bold text-cyan-200">MULTI</span>
        </div>
      </div>
    </div>
  );
};
