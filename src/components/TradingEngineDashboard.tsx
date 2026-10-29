import React, { useState } from 'react';
import {
  Server,
  Zap,
  Shield,
  Power,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  DollarSign,
  AlertTriangle,
  Play,
  Square,
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
    id: 'pm-trc20',
    name: 'TRC20',
    accountHolder: 'PROMPIPS Official Treasury',
    accountNumberOrAddress: 'TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC',
    network: 'USDT — TRON Network',
    instructions:
      'Send exactly $50 USDT via TRON (TRC20) network. Zero or near-zero gas fee. Copy and paste your Transaction ID below after sending.',
    enabled: true,
  },
  {
    id: 'pm-erc20',
    name: 'ERC20',
    accountHolder: 'PROMPIPS Official Multi-Sig',
    accountNumberOrAddress: '0x4984ba14236737ada963abff469f2d25821c92dc',
    network: 'USDT — Ethereum Network',
    instructions:
      'Send $50 USDT via Ethereum (ERC20) network. Copy and paste your Transaction Hash below after sending.',
    enabled: true,
  },
  {
    id: 'pm-btc',
    name: 'BTC',
    accountHolder: 'PROMPIPS Bitcoin Cold Storage',
    accountNumberOrAddress: '393j54v41LN7d6inoq6gRTTCbX2dQ3w5Br',
    network: 'Bitcoin Network',
    instructions:
      'Send $50 equivalent in BTC via native Bitcoin network. Copy and paste your Transaction Hash below after sending.',
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
  const availableMethods =
    statusData.enabledPaymentMethods && statusData.enabledPaymentMethods.length > 0
      ? statusData.enabledPaymentMethods.filter((m) => {
          const id = (m.id || '').toLowerCase();
          const name = (m.name || '').toLowerCase();
          return (
            m.enabled &&
            (id === 'pm-trc20' ||
              id === 'pm-erc20' ||
              id === 'pm-btc' ||
              name.includes('trc') ||
              name.includes('erc') ||
              name.includes('btc') ||
              name.includes('bitcoin')) &&
            !name.includes('bep') &&
            !name.includes('momo') &&
            !name.includes('mobile') &&
            !name.includes('bank')
          );
        })
      : DEFAULT_METHODS;

  const methodsToDisplay = availableMethods.length > 0 ? availableMethods : DEFAULT_METHODS;

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    methodsToDisplay[0]?.id || 'pm-trc20'
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
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);

  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  const [engineAlert, setEngineAlert] = useState<{
    type: 'error' | 'success' | 'warning';
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const activeMethod =
    methodsToDisplay.find((m) => m.id === selectedMethodId) ||
    methodsToDisplay[0] ||
    DEFAULT_METHODS[0];

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleVerifyPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConnectMessage(null);

    const trimmed = txIdInput.trim();
    if (!trimmed) {
      setTxVerificationStatus('failed');
      setTxStatusMessage('Please enter a valid transaction ID or payment hash.');
      return;
    }

    setIsVerifyingTx(true);
    setTxVerificationStatus('pending');
    setTxStatusMessage('Verifying payment on the blockchain gateway...');

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
        setTxStatusMessage(res.message || 'Payment verification failed. Please check the transaction ID.');
      }
    } catch (err: any) {
      setTxVerificationStatus('failed');
      setTxStatusMessage(err.message || 'Payment verification failed. Please check the transaction ID.');
    } finally {
      setIsVerifyingTx(false);
    }
  };

  // 1. CONNECT BOT BUTTON
  const handleConnectBot = async () => {
    setEngineAlert(null);
    setConnectMessage(null);
    setConnectionError(false);

    if (!loginId.trim() || !brokerServer.trim() || !password) {
      setConnectMessage('Please complete all required MT5 connection fields (Login ID, Broker Server, and Password).');
      return;
    }

    setIsConnectingMT5(true);
    try {
      const connRes = await connectMT5({
        loginId: loginId.trim(),
        brokerServer: brokerServer.trim(),
        password,
      });

      if (connRes.success && connRes.data) {
        onConnectionSuccess?.({
          loginId: connRes.data.loginId,
          brokerServer: connRes.data.brokerServer,
          botEngineStatus: connRes.data.botEngineStatus,
        });
        setEngineAlert({
          type: 'success',
          title: 'Bot Connected',
          message: 'MT5 terminal connection verified and established successfully.',
        });
      } else {
        setConnectionError(true);
        setEngineAlert({
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to establish connection with MT5 broker server. Please verify your account credentials.',
        });
      }

      onRefreshStatus();
      setPassword('');
    } catch (err: any) {
      setConnectionError(true);
      setEngineAlert({
        type: 'error',
        title: 'Connection Error',
        message: err.message || 'MT5 connection failed.',
      });
    } finally {
      setIsConnectingMT5(false);
    }
  };

  // 2. START BOT BUTTON
  const handleStartBot = async () => {
    setEngineAlert(null);

    if (!statusData.mt5Connected) {
      setEngineAlert({
        type: 'error',
        title: 'Not Connected',
        message: 'Please connect your MT5 account before starting the bot.',
      });
      return;
    }

    if (!statusData.paymentVerified) {
      setEngineAlert({
        type: 'error',
        title: 'Subscription Required',
        message: 'Active approved subscription payment ($' + statusData.subscriptionPrice + ') is required to start the bot.',
      });
      return;
    }

    setIsStartingBot(true);
    try {
      const res = await startBot();
      setEngineAlert({
        type: 'success',
        title: 'Bot Running',
        message: res.message || 'Trading engine started successfully.',
      });
      onRefreshStatus();
    } catch (err: any) {
      setEngineAlert({
        type: 'error',
        title: 'Cannot Start Bot',
        message: err.message || 'Trading engine start failed.',
        detail: err.detail || 'Ensure the live execution bridge microservice is attached and operational.',
      });
    } finally {
      setIsStartingBot(false);
    }
  };

  // 3. STOP BOT BUTTON
  const handleStopBot = async () => {
    setIsStoppingBot(true);
    setEngineAlert(null);
    try {
      const res = await stopBot();
      setEngineAlert({
        type: 'success',
        title: 'Bot Stopped',
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

  // 4. BOT STATUS CALCULATION
  const getBotStatusText = (): string => {
    if (connectionError) return 'CONNECTION ERROR';
    if (statusData.isTrading) return 'BOT RUNNING';
    if (statusData.mt5Connected) return 'BOT CONNECTED';
    if (statusData.botEngineStatus === 'Ready') return 'BOT CONNECTED';
    if (statusData.botEngineStatus === 'Disconnected' || statusData.botEngineStatus === 'Not Started') {
      return 'NOT CONNECTED';
    }
    return 'NOT CONNECTED';
  };

  const currentStatusText = getBotStatusText();

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
      {/* ==============================================================
          TOP HEADING
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

      {/* Global Engine Alert Banner */}
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
          SUBSCRIPTION PRICE & PAYMENT MENU (Strictly 3 methods: TRC20, ERC20, BTC)
          ============================================================== */}
      <div className="relative rounded-3xl bg-[#0d0722] border border-purple-500/60 p-5 sm:p-6 shadow-2xl glow-purple overflow-hidden">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

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
              <span className="text-xs font-mono text-purple-300">{statusData.currency || 'USD'}</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300/80 block uppercase tracking-wider">
              One-Time Lifetime Access
            </span>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-2 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#00f2fe]" />
              Select Cryptocurrency Payment Method:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methodsToDisplay.map((method) => {
                const isSelected = method.id === selectedMethodId;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethodId(method.id);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-purple-900/50 border-[#00f2fe] shadow-lg glow-cyan text-white ring-1 ring-[#00f2fe]/50'
                        : 'bg-[#080415] border-purple-900/60 text-slate-300 hover:border-purple-600/70 hover:bg-purple-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-bold text-xs sm:text-sm truncate">
                        {method.name}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#00f2fe] glow-cyan shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300/90 truncate block font-semibold">
                      {method.network}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeMethod && (
            <div className="p-4 rounded-2xl bg-[#080415] border border-purple-900/70 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-purple-300 uppercase tracking-wide text-[10px]">
                  Network: <strong className="text-cyan-300 font-bold">{activeMethod.network}</strong>
                </span>
                {activeMethod.accountHolder && (
                  <span className="font-mono text-slate-400 text-[10px] truncate max-w-[180px]">
                    {activeMethod.accountHolder}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    {activeMethod.name} Wallet Address ({activeMethod.network}):
                  </span>
                  {copiedKey === 'address' && (
                    <span className="text-[10px] font-mono text-[#00f59b] flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" /> Address Copied!
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

              {activeMethod.instructions && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-slate-300 font-mono text-[11px] leading-relaxed">
                  <span className="text-purple-300 font-bold uppercase text-[10px] block mb-0.5">
                    Instructions ({activeMethod.network}):
                  </span>
                  {activeMethod.instructions}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <div>
              <label
                htmlFor="prompips-txid-input"
                className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5 flex items-center justify-between"
              >
                <span>Transaction ID / Hash:</span>
                <span className="text-cyan-400 text-[10px]">Required for Activation</span>
              </label>
              <div className="relative">
                <input
                  id="prompips-txid-input"
                  type="text"
                  value={txIdInput}
                  onChange={(e) => {
                    setTxIdInput(e.target.value);
                  }}
                  placeholder="Paste your Transaction Hash / TXID here..."
                  className="w-full h-12 px-4 rounded-xl bg-[#05020f] border border-purple-700/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-xs sm:text-sm tracking-wide placeholder:text-purple-400/40 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

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
                      ? 'Verification Notice'
                      : 'Verifying...'}
                  </span>
                  <p className="text-[11px] mt-0.5 font-mono">
                    {statusData.paymentVerified
                      ? `Subscription cleared ($${statusData.subscriptionPrice} ${statusData.currency || 'USD'}). Proceed to MT5 connection below.`
                      : txStatusMessage}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==============================================================
          SECOND HEADING
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
          MT5 CONNECTION SETUP & CONTROLS (Connect Bot, Start Bot, Stop Bot)
          ============================================================== */}
      <div className="relative rounded-3xl bg-turquoise-card border border-purple-500/60 p-5 sm:p-6 shadow-2xl glow-purple overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#03151d] border border-[#00f2fe]/40 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg tracking-wider text-white uppercase">
                MT5 CONNECTION & CONTROLS
              </h3>
              <span className="text-[10px] font-mono tracking-tight text-cyan-300/70 block">
                METATRADER 5 TERMINAL GATEWAY
              </span>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#021016] border border-cyan-500/30">
            <span
              className={`w-2 h-2 rounded-full ${
                currentStatusText === 'BOT RUNNING'
                  ? 'bg-[#00f59b] glow-green animate-pulse'
                  : currentStatusText === 'BOT CONNECTED'
                  ? 'bg-[#00f2fe] glow-cyan'
                  : currentStatusText === 'CONNECTION ERROR'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-cyan-100 flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#00f2fe]" />
              {currentStatusText}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 block mb-1.5">
              Account ID / Login:
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                setConnectMessage(null);
              }}
              placeholder="e.g. 10948210"
              className="w-full h-12 px-4 rounded-xl bg-[#020e15]/90 border border-cyan-900/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-sm tracking-wide placeholder:text-cyan-900/70 outline-none transition-all shadow-inner"
            />
          </div>

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
                setConnectMessage(null);
              }}
              placeholder="e.g. Exness-Real19, ICMarketsSC-Live, XMGlobal-Real"
              className="w-full h-12 px-4 rounded-xl bg-[#020e15]/90 border border-cyan-900/60 focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] text-white font-mono text-sm tracking-wide placeholder:text-cyan-900/70 outline-none transition-all shadow-inner"
            />

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
                  setConnectMessage(null);
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
              Protected by end-to-end encryption. Never stored in plaintext.
            </p>
          </div>
        </div>

        {/* Action Buttons: CONNECT BOT, START BOT, STOP BOT */}
        <div className="pt-2 space-y-3">
          {/* 1. CONNECT BOT BUTTON */}
          <button
            type="button"
            onClick={handleConnectBot}
            disabled={isConnectingMT5}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-extrabold text-sm sm:text-base tracking-widest uppercase shadow-2xl glow-purple flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
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

          {connectMessage && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs font-mono space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Input Required</span>
              </div>
              <p className="text-white font-mono text-xs font-semibold pl-6">
                {connectMessage}
              </p>
            </div>
          )}

          {/* 2. START BOT BUTTON */}
          <button
            type="button"
            onClick={handleStartBot}
            disabled={isStartingBot || statusData.isTrading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00f59b] via-emerald-600 to-cyan-600 hover:opacity-95 text-slate-950 font-display font-extrabold text-sm sm:text-base tracking-widest uppercase shadow-2xl glow-green flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isStartingBot ? (
              <>
                <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
                STARTING BOT...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 text-slate-950 fill-slate-950" />
                START BOT
              </>
            )}
          </button>

          {/* 3. STOP BOT BUTTON */}
          <button
            type="button"
            onClick={handleStopBot}
            disabled={isStoppingBot || !statusData.isTrading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-700 to-pink-700 hover:opacity-95 text-white font-display font-extrabold text-sm sm:text-base tracking-widest uppercase shadow-2xl flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isStoppingBot ? (
              <>
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
                STOPPING BOT...
              </>
            ) : (
              <>
                <Square className="w-5 h-5 text-white fill-white" />
                STOP BOT
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Transparency & Status Box */}
      <div className="p-4 rounded-2xl bg-[#090518] border border-purple-900/60 text-xs font-mono space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider">
            Engine Integrity & Status
          </span>
          <span className="text-[10px] text-cyan-300">{currentStatusText}</span>
        </div>

        <p className="text-slate-300/80 text-[11px] leading-relaxed">
          {statusData.isTrading ? (
            <span className="text-emerald-300 font-semibold">
              ● BOT RUNNING: System is actively trading via verified execution bridge.
            </span>
          ) : statusData.mt5Connected ? (
            <span className="text-cyan-300 font-semibold">
              ● BOT CONNECTED: MT5 terminal connected. Ready to start bot once subscription is verified.
            </span>
          ) : connectionError ? (
            <span className="text-rose-400 font-semibold">
              ● CONNECTION ERROR: Could not connect to broker server. Please check your credentials.
            </span>
          ) : (
            <span className="text-slate-400 font-semibold">
              ● NOT CONNECTED: Enter your MT5 credentials and click CONNECT BOT to begin.
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
