import React, { useState } from 'react';
import {
  Sliders,
  Server,
  Zap,
  Shield,
  Activity,
  Lock,
  Unlock,
  Power,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EngineStatusData, BotEngineStatus } from '../types';
import { startBot, stopBot } from '../services/api';

interface TradingEngineDashboardProps {
  statusData: EngineStatusData;
  onOpenMT5Modal: () => void;
  onOpenPaymentModal: () => void;
  onRefreshStatus: () => void;
}

export const TradingEngineDashboard: React.FC<TradingEngineDashboardProps> = ({
  statusData,
  onOpenMT5Modal,
  onOpenPaymentModal,
  onRefreshStatus,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [engineAlert, setEngineAlert] = useState<{
    type: 'error' | 'success' | 'warning';
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const handleStartBot = async () => {
    setEngineAlert(null);

    // Check Bot Activation status
    if (!statusData.botActivationEnabled) {
      setEngineAlert({
        type: 'error',
        title: 'Activation Unavailable',
        message: 'Bot activation is currently unavailable. Please contact support.',
      });
      return;
    }

    // Check MT5 connection
    if (!statusData.mt5Connected) {
      setEngineAlert({
        type: 'error',
        title: 'MT5 Connection Required',
        message: 'Please configure and authenticate your MT5 account before starting the bot.',
      });
      onOpenMT5Modal();
      return;
    }

    // Check Payment Gate
    if (!statusData.paymentVerified) {
      setEngineAlert({
        type: 'error',
        title: 'Payment Verification Required',
        message: `Bot subscription ($${statusData.subscriptionPrice}) must be paid and verified before engine activation.`,
      });
      onOpenPaymentModal();
      return;
    }

    setIsStarting(true);
    try {
      const res = await startBot();
      setEngineAlert({
        type: 'success',
        title: 'Engine Running',
        message: res.message || 'Trading engine started successfully.',
      });
      onRefreshStatus();
    } catch (err: any) {
      setEngineAlert({
        type: 'error',
        title: err.message === 'Bot activation is currently unavailable. Please contact support.'
          ? 'Activation Disabled'
          : 'Trading Backend Offline',
        message: err.message || 'Trading engine is not connected yet.',
        detail: err.detail,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopBot = async () => {
    setIsStopping(true);
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
      setIsStopping(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
      {/* 1. Header Title: "Trading Engine" */}
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/50 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#00f2fe] glow-cyan animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-300">
            PROMPIPS QUANTITATIVE SUITE
          </span>
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-wider text-white uppercase drop-shadow-[0_0_15px_rgba(124,58,237,0.3)]">
          TRADING ENGINE
        </h2>
        <p className="text-xs font-mono text-purple-300/80 mt-1 max-w-sm mx-auto">
          High-frequency algorithmic scalping and automated risk execution
        </p>
      </div>

      {/* Engine Alert Banner */}
      {engineAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
            engineAlert.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
              : engineAlert.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
              : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
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

      {/* 2. MT5 Connection Card (Large Turquoise-Tinted Interior with Purple Border) */}
      <div className="relative rounded-3xl bg-turquoise-card border border-purple-500/60 p-5 sm:p-6 shadow-2xl glow-purple overflow-hidden">
        {/* Subtle decorative background circuit glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#03151d] border border-[#00f2fe]/40 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg tracking-wider text-white">
                MT5 CONNECTION
              </h3>
              <span className="text-[10px] font-mono tracking-tight text-cyan-300/70 block">
                METATRADER 5 TERMINAL GATEWAY
              </span>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#021016] border border-cyan-500/30">
            <span
              className={`w-2 h-2 rounded-full ${
                statusData.mt5Connected ? 'bg-[#00f59b] glow-green' : 'bg-rose-500'
              }`}
            />
            <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-cyan-100">
              {statusData.mt5Connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* MT5 Account Details / Telemetry */}
        <div className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-[#020e15]/80 border border-cyan-900/50">
              <span className="text-[10px] font-mono uppercase text-purple-300 block mb-1">
                Account ID (Login)
              </span>
              <span className="text-sm font-mono font-bold text-cyan-100 tabular-nums">
                {statusData.mt5LoginId || '—'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#020e15]/80 border border-cyan-900/50">
              <span className="text-[10px] font-mono uppercase text-purple-300 block mb-1">
                Broker Server
              </span>
              <span className="text-sm font-mono font-bold text-cyan-100 truncate block">
                {statusData.mt5BrokerServer || '—'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#020e15]/80 border border-cyan-900/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-300 block mb-0.5">
                Bot Engine Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    statusData.isTrading
                      ? 'bg-[#00f59b] glow-green animate-pulse'
                      : statusData.botEngineStatus === 'Ready'
                      ? 'bg-cyan-400 glow-cyan'
                      : statusData.botEngineStatus === 'Awaiting Payment'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="font-mono text-xs font-bold text-white tracking-wide uppercase">
                  {statusData.isTrading ? 'Running' : statusData.botEngineStatus}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-cyan-400/90">
              {statusData.mt5Connected
                ? 'Gateway Ready'
                : 'Credentials Needed'}
            </span>
          </div>
        </div>

        {/* Configure MT5 Connection Button */}
        <button
          onClick={onOpenMT5Modal}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-700 to-cyan-700 hover:from-purple-700 hover:to-cyan-600 text-white font-display font-bold text-xs sm:text-sm tracking-widest uppercase transition-all shadow-lg glow-purple flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Sliders className="w-4 h-4 text-cyan-300" />
          {statusData.mt5Connected ? 'CONFIGURE MT5 CONNECTION' : 'SETUP MT5 CONNECTION'}
        </button>
      </div>

      {/* 3. Subscription Status & Pricing Card ($50) */}
      <div className="rounded-3xl bg-[#0d0722] border border-purple-700/50 p-5 shadow-xl glow-purple space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-600/50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#00f2fe]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 block">
                Subscription Gate
              </span>
              <h4 className="font-display font-bold text-base text-white">
                PROMPIPS BOT LICENSE
              </h4>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold font-display text-white tracking-tight">
              ${statusData.subscriptionPrice}
            </span>
            <span className="text-[10px] font-mono text-purple-300 block">One-time / Lifetime</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#080415] border border-purple-900/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            {statusData.paymentVerified ? (
              <Unlock className="w-4 h-4 text-[#00f59b]" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-slate-300">Verification:</span>
          </div>
          <span
            className={`font-semibold tracking-wide uppercase ${
              statusData.paymentVerified ? 'text-[#00f59b]' : 'text-amber-400'
            }`}
          >
            {statusData.paymentVerified
              ? `Payment Verified ($${statusData.subscriptionPrice} Cleared)`
              : `Unpaid ($${statusData.subscriptionPrice} Required)`}
          </span>
        </div>

        {!statusData.paymentVerified && (
          <button
            onClick={onOpenPaymentModal}
            className="w-full py-2.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/50 border border-purple-600/50 text-[#00f2fe] font-mono text-xs tracking-wider uppercase transition-colors"
          >
            View Payment Wallets & Verify TxID
          </button>
        )}
      </div>

      {/* 4. Main Engine Primary Action Button */}
      {/* Visual requirement: Bright pink/red action button */}
      <div className="space-y-3 pt-1">
        {/* State A: MT5 not yet configured */}
        {!statusData.mt5Connected && (
          <button
            onClick={onOpenMT5Modal}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-600 to-cyan-600 text-white font-display font-bold text-sm sm:text-base tracking-widest uppercase shadow-xl glow-purple flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <Sliders className="w-5 h-5 text-cyan-300" />
            CONNECT MT5 TO PROCEED
          </button>
        )}

        {/* State B: MT5 Connected, but Payment NOT verified */}
        {/* Requirement: After visitor fills in MT5 connection details, show a prominent button labelled: START BOT AFTER PAYMENT */}
        {statusData.mt5Connected && !statusData.paymentVerified && (
          <button
            onClick={onOpenPaymentModal}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#ff0055] via-[#ff1e56] to-[#fb7185] text-white font-display font-extrabold text-sm sm:text-base tracking-widest uppercase shadow-2xl glow-pink flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <Lock className="w-5 h-5 text-white" />
            START BOT AFTER PAYMENT
          </button>
        )}

        {/* State C: Payment Verified, Bot Ready to Start */}
        {/* Requirement: Once subscription verified, show START BOT button */}
        {statusData.mt5Connected && statusData.paymentVerified && !statusData.isTrading && (
          <button
            onClick={handleStartBot}
            disabled={isStarting}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#00f59b] via-[#00f2fe] to-emerald-400 text-slate-950 font-display font-extrabold text-base tracking-widest uppercase shadow-2xl glow-green flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Power className="w-5 h-5 text-slate-950" />
            {isStarting ? 'INITIALIZING ENGINE...' : 'START BOT'}
          </button>
        )}

        {/* State D: Bot is Trading/Running -> Prominent STOP BOT button */}
        {statusData.isTrading && (
          <button
            onClick={handleStopBot}
            disabled={isStopping}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#ff0055] via-rose-600 to-rose-700 text-white font-display font-extrabold text-base tracking-widest uppercase shadow-2xl glow-pink flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Power className="w-5 h-5 text-white" />
            {isStopping ? 'STOPPING...' : 'STOP BOT'}
          </button>
        )}
      </div>

      {/* 5. System Execution Transparency & Status Box */}
      {/* Strict Requirement: Never show “System is actively trading” unless an actual trading engine is connected and running. */}
      {/* Do not claim that trades are being executed when the site is only a frontend. */}
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
              ● Engine is primed and ready. Tap START BOT to begin order execution.
            </span>
          ) : statusData.botEngineStatus === 'Awaiting Payment' ? (
            <span className="text-amber-300">
              ● MT5 link verified. Subscription gate is awaiting payment confirmation.
            </span>
          ) : (
            <span className="text-slate-400">
              ● Engine status: Not Started. Configure MT5 connection to proceed.
            </span>
          )}
        </p>

        <div className="pt-2 border-t border-purple-950 flex items-center justify-between text-[10px] text-purple-400/80">
          <span>Execution Bridge: {statusData.tradingBackendAttached ? 'Online' : 'Standby'}</span>
          <span>Security: End-to-End Ephemeral</span>
        </div>
      </div>

      {/* 6. Algorithmic Specifications Strip */}
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
