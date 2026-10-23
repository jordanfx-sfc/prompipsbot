import React, { useState } from 'react';
import {
  Server,
  CreditCard,
  MessageSquare,
  Power,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Cpu,
  ShieldCheck,
  Lock,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { EngineStatusData, BotEngineStatus } from '../types';
import { disconnectMT5, stopBot, toggleAdminBackendBridge } from '../services/api';

interface SettingsViewProps {
  statusData: EngineStatusData;
  onRefreshStatus: () => void;
  onOpenMT5Modal: () => void;
  onOpenPaymentModal: () => void;
  onOpenAdminPanel: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  statusData,
  onRefreshStatus,
  onOpenMT5Modal,
  onOpenPaymentModal,
  onOpenAdminPanel,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleStopBot = async () => {
    setIsStopping(true);
    setActionMsg(null);
    try {
      const res = await stopBot();
      setActionMsg({ type: 'success', text: res.message });
      onRefreshStatus();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to stop trading engine.' });
    } finally {
      setIsStopping(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setActionMsg(null);
    try {
      const res = await disconnectMT5();
      setActionMsg({ type: 'success', text: res.message });
      onRefreshStatus();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to disconnect MT5.' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const contactEmail = statusData.publicSettings?.contactEmail || 'support@prompipsbot.com';
  const whatsappSupport = statusData.publicSettings?.whatsappSupport || '+1 (555) 789-2041';
  const telegramSupport = statusData.publicSettings?.telegramSupport || '@prompips_official';
  const otherSupport = statusData.publicSettings?.otherSupport || '24/7 VIP Automated Strategy Desk & Account Support';
  const price = statusData.subscriptionPrice || 50;
  const currency = statusData.currency || 'USD';

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Top Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-white">
            SETTINGS & ADMINISTRATION
          </h2>
          <p className="text-xs text-purple-300/70 font-mono mt-0.5">
            System configuration & administrative center
          </p>
        </div>
        <button
          onClick={onRefreshStatus}
          className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:text-white transition-colors"
          title="Refresh Engine Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 border ${
            actionMsg.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
          }`}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* REQUIREMENT 2: VISIBLE ADMIN BUTTON */}
      {/* "Add an Admin Panel button inside the Settings screen. The button must be visible to everyone. Do not hide it based on the visitor's identity." */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/90 via-[#180933] to-[#0c1a2e] border-2 border-purple-500/70 p-5 shadow-2xl glow-purple space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center glow-purple">
              <ShieldCheck className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg tracking-wider text-white">
                ADMIN CONTROL CENTER
              </h3>
              <span className="text-[10px] font-mono tracking-tight text-purple-300 block">
                PRICING · PAYMENT METHODS · BOT ACTIVATION · AUDIT LOGS
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
            OFFICIAL
          </span>
        </div>

        <p className="text-xs text-purple-200/80 leading-relaxed font-mono">
          Authorized administrative management portal for updating subscription pricing, adding/editing payment methods, validating transaction IDs, and configuring engine parameters.
        </p>

        <button
          onClick={onOpenAdminPanel}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-bold text-sm tracking-widest uppercase shadow-xl glow-purple flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer"
        >
          <Lock className="w-4 h-4 text-cyan-300" />
          ADMIN PANEL
        </button>
      </div>

      {/* 1. Subscription Information */}
      <div className="rounded-2xl bg-[#0f0a24] border border-purple-800/60 p-5 shadow-xl glow-purple space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#00f2fe]" />
            <h3 className="font-display font-bold text-lg text-white">SUBSCRIPTION STATUS</h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
              statusData.paymentVerified
                ? 'bg-emerald-950/80 border-emerald-500/50 text-[#00f59b]'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}
          >
            {statusData.paymentVerified ? 'ACTIVE / CLEARED' : `UNPAID ($${price} REQUIRED)`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#080516] border border-purple-900/40">
            <span className="text-purple-400/80 block text-[10px] mb-1">LICENSE TIER</span>
            <span className="text-white font-semibold">Standard Automated (${price} {currency})</span>
          </div>
          <div className="p-3 rounded-xl bg-[#080516] border border-purple-900/40">
            <span className="text-purple-400/80 block text-[10px] mb-1">PAYMENT GATEWAY</span>
            <span className="text-cyan-300 truncate block">
              {statusData.activeTxId ? 'Verified On-Chain' : 'Pending Gateway'}
            </span>
          </div>
        </div>

        {statusData.activeTxId && (
          <div className="p-3 rounded-xl bg-[#061822] border border-cyan-800/40 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-purple-400 block">ACTIVE TXID:</span>
              <code className="text-xs font-mono text-cyan-200 select-all truncate block max-w-[280px]">
                {statusData.activeTxId}
              </code>
            </div>
            <button
              onClick={() => handleCopy(statusData.activeTxId!, 'txid')}
              className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-[#00f2fe] hover:bg-cyan-900/40 transition-colors shrink-0"
            >
              {copiedKey === 'txid' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {!statusData.paymentVerified && (
          <button
            onClick={onOpenPaymentModal}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff0055] via-[#ff1e56] to-[#fb7185] text-white font-display font-bold text-xs tracking-widest uppercase shadow-lg glow-pink hover:opacity-95 transition-all cursor-pointer"
          >
            OPEN ${price} PAYMENT GATE
          </button>
        )}
      </div>

      {/* 2. MT5 Connection Settings */}
      <div className="rounded-2xl bg-[#0f0a24] border border-purple-800/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#00f2fe]" />
            <h3 className="font-display font-bold text-lg text-white">MT5 CONNECTION</h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
              statusData.mt5Connected
                ? 'bg-emerald-950/80 border-emerald-500/50 text-[#00f59b]'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {statusData.mt5Connected ? 'CONNECTED' : 'NOT CONNECTED'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#071720] border border-cyan-900/40 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center py-1 border-b border-cyan-950">
            <span className="text-purple-300">Login ID:</span>
            <span className="text-cyan-200 font-semibold">
              {statusData.mt5LoginId || 'Not Configured'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-cyan-950">
            <span className="text-purple-300">Broker Server:</span>
            <span className="text-cyan-200 font-semibold truncate max-w-[200px]">
              {statusData.mt5BrokerServer || 'Not Configured'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-purple-300">Engine State:</span>
            <span className="text-white font-semibold">{statusData.botEngineStatus}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenMT5Modal}
            className="flex-1 py-2.5 rounded-xl bg-purple-900/50 hover:bg-purple-800/60 border border-purple-600/50 text-white font-display font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            {statusData.mt5Connected ? 'EDIT CREDENTIALS' : 'CONFIGURE MT5'}
          </button>

          {statusData.mt5Connected && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-700/50 text-rose-300 text-xs font-mono tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDisconnecting ? 'DISCONNECTING...' : 'DISCONNECT'}
            </button>
          )}
        </div>
      </div>

      {/* 3. Stop Bot Control if running */}
      {statusData.isTrading && (
        <div className="rounded-2xl bg-rose-950/30 border border-rose-600/50 p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 font-display font-bold">
            <Power className="w-5 h-5 text-rose-400" />
            <span>ACTIVE TRADING ENGINE CONTROL</span>
          </div>
          <p className="text-xs font-mono text-slate-300">
            The trading engine is currently executing algorithmic signals. Press below to immediately halt order processing.
          </p>
          <button
            onClick={handleStopBot}
            disabled={isStopping}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-700 via-rose-600 to-pink-600 text-white font-display font-bold text-xs tracking-widest uppercase shadow-lg glow-pink flex items-center justify-center gap-2 cursor-pointer"
          >
            <Power className="w-4 h-4" />
            {isStopping ? 'STOPPING ENGINE...' : 'STOP BOT ENGINE NOW'}
          </button>
        </div>
      )}

      {/* 4. Support / Contact Details Configured by Administrator */}
      <div className="rounded-2xl bg-[#0f0a24] border border-purple-800/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#00f2fe]" />
          <h3 className="font-display font-bold text-lg text-white">SUPPORT & OFFICIAL CHANNELS</h3>
        </div>

        <div className="space-y-2.5 text-xs font-mono">
          {/* Telegram */}
          <div className="p-3 rounded-xl bg-[#080518] border border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-400 font-bold">Telegram:</span>
              <span className="text-slate-200">{telegramSupport}</span>
            </div>
            <button
              onClick={() => handleCopy(telegramSupport, 'tg')}
              className="p-1 text-purple-400 hover:text-cyan-300 transition-colors"
            >
              {copiedKey === 'tg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* WhatsApp */}
          <div className="p-3 rounded-xl bg-[#080518] border border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-400 font-bold">WhatsApp:</span>
              <span className="text-slate-200">{whatsappSupport}</span>
            </div>
            <button
              onClick={() => handleCopy(whatsappSupport, 'wa')}
              className="p-1 text-purple-400 hover:text-cyan-300 transition-colors"
            >
              {copiedKey === 'wa' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Email */}
          <div className="p-3 rounded-xl bg-[#080518] border border-purple-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-cyan-400 font-bold">Email:</span>
              <span className="text-slate-200">{contactEmail}</span>
            </div>
            <button
              onClick={() => handleCopy(contactEmail, 'email')}
              className="p-1 text-purple-400 hover:text-cyan-300 transition-colors"
            >
              {copiedKey === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Other info */}
          {otherSupport && (
            <p className="text-[11px] text-purple-300/70 pt-1">
              {otherSupport}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
