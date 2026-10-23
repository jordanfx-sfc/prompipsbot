import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Server, Key, Lock, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { BotEngineStatus } from '../types';
import { connectMT5, disconnectMT5 } from '../services/api';

interface MT5ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLoginId: string | null;
  currentBrokerServer: string | null;
  isConnected: boolean;
  botEngineStatus: BotEngineStatus;
  paymentVerified: boolean;
  onConnectionSuccess: (data: { loginId: string; brokerServer: string; botEngineStatus: BotEngineStatus }) => void;
  onOpenPaymentGate: () => void;
}

export const MT5ConnectionModal: React.FC<MT5ConnectionModalProps> = ({
  isOpen,
  onClose,
  currentLoginId,
  currentBrokerServer,
  isConnected,
  botEngineStatus,
  paymentVerified,
  onConnectionSuccess,
  onOpenPaymentGate,
}) => {
  const [loginId, setLoginId] = useState(currentLoginId || '');
  const [brokerServer, setBrokerServer] = useState(currentBrokerServer || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!loginId.trim()) {
      setErrorMsg('LOGIN ID is required. Please enter your numeric MT5 account number.');
      return;
    }
    if (!brokerServer.trim()) {
      setErrorMsg('BROKER SERVER is required (e.g. Exness-Real19, Deriv-Server).');
      return;
    }
    if (!password) {
      setErrorMsg('PASSWORD is required to authenticate your MT5 trading terminal.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await connectMT5({
        loginId: loginId.trim(),
        brokerServer: brokerServer.trim(),
        password,
      });

      setSuccessMsg(response.message);
      if (response.data) {
        onConnectionSuccess({
          loginId: response.data.loginId,
          brokerServer: response.data.brokerServer,
          botEngineStatus: response.data.botEngineStatus,
        });
      }
      // Clear password from form state for safety
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect MT5. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectMT5();
      setLoginId('');
      setBrokerServer('');
      setPassword('');
      setSuccessMsg('MT5 account disconnected.');
      onConnectionSuccess({
        loginId: '',
        brokerServer: '',
        botEngineStatus: 'Disconnected',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to disconnect MT5.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset brokers for quick convenience
  const brokerPresets = ['Exness-Real19', 'Deriv-Server', 'ICMarkets-Live02', 'HFMarkets-Live', 'RoboForex-Pro'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0b0819] border border-purple-600/60 rounded-3xl p-5 md:p-6 shadow-2xl glow-purple text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-purple-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] glow-cyan" />
              <h2 className="font-display font-bold text-xl tracking-wide text-white">
                MT5 CONNECTION CONFIGURATION
              </h2>
            </div>
            <p className="text-xs text-purple-300/80 mt-1">
              Link your MetaTrader 5 trading terminal securely to PROMPIPS BOT
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200/90 flex items-start gap-2.5 leading-relaxed">
          <Shield className="w-4 h-4 text-[#00f2fe] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#00f2fe]">Security Notice:</span> Connect only an account you own and control. For maximum risk management, use a dedicated automated trading sub-account or least-privileged access credentials. Credentials are processed ephemerally on the backend session and never cached in plaintext browser storage.
          </div>
        </div>

        {/* Form with fields in exact specified sequence */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* FIELD 1: LOGIN ID */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              1. LOGIN ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. 50923812"
                className="w-full h-11 px-4 rounded-xl bg-[#061e28]/80 border border-purple-600/60 focus:border-[#00f2fe] focus:outline-none focus:ring-1 focus:ring-[#00f2fe] font-mono text-sm text-cyan-100 placeholder:text-slate-500 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-purple-400/60">
                MT5 ID
              </span>
            </div>
          </div>

          {/* FIELD 2: BROKER SERVER */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              2. BROKER SERVER
            </label>
            <div className="relative">
              <input
                type="text"
                value={brokerServer}
                onChange={(e) => setBrokerServer(e.target.value)}
                placeholder="e.g. Exness-Real19, Deriv-Server"
                className="w-full h-11 px-4 rounded-xl bg-[#061e28]/80 border border-purple-600/60 focus:border-[#00f2fe] focus:outline-none focus:ring-1 focus:ring-[#00f2fe] font-mono text-sm text-cyan-100 placeholder:text-slate-500 transition-all"
              />
              <Server className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            </div>
            {/* Quick broker tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-purple-400 font-mono self-center">Presets:</span>
              {brokerPresets.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBrokerServer(b)}
                  className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/60 text-[10px] font-mono text-purple-300 hover:text-[#00f2fe] hover:border-cyan-500/50 transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* FIELD 3: PASSWORD */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              3. PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter MT5 account password"
                className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#061e28]/80 border border-purple-600/60 focus:border-[#00f2fe] focus:outline-none focus:ring-1 focus:ring-[#00f2fe] font-mono text-sm text-cyan-100 placeholder:text-slate-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-cyan-300 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* FIELD 4: CONNECTION STATUS */}
          <div className="p-3.5 rounded-xl bg-[#051520] border border-cyan-800/40">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-purple-300 mb-1">
              4. CONNECTION STATUS
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConnected ? 'bg-[#00f59b] glow-green' : 'bg-rose-500'
                  }`}
                />
                <span className="font-mono text-sm font-semibold tracking-wide text-white">
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isConnected ? 'Session Authorized' : 'Awaiting Connection'}
              </span>
            </div>
          </div>

          {/* FIELD 5: BOT ENGINE STATUS */}
          <div className="p-3.5 rounded-xl bg-[#051520] border border-purple-800/50">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-purple-300 mb-1">
              5. BOT ENGINE STATUS
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    botEngineStatus === 'Running'
                      ? 'bg-[#00f59b] glow-green animate-pulse'
                      : botEngineStatus === 'Ready'
                      ? 'bg-cyan-400 glow-cyan'
                      : botEngineStatus === 'Awaiting Payment'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="font-mono text-sm font-semibold tracking-wide text-cyan-200">
                  {botEngineStatus}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {!paymentVerified ? '$50 Subscription Required' : 'Payment Cleared'}
              </span>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-bold text-sm tracking-widest uppercase transition-all shadow-lg glow-purple disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  AUTHENTICATING MT5...
                </>
              ) : (
                'SAVE & ESTABLISH MT5 CONNECTION'
              )}
            </button>

            {isConnected && !paymentVerified && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaymentGate();
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff0055] via-[#ff1e56] to-[#fb7185] text-white font-display font-bold text-sm tracking-widest uppercase shadow-lg glow-pink flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
              >
                START BOT AFTER PAYMENT ($50)
              </button>
            )}

            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-transparent border border-rose-800/40 text-rose-400 hover:bg-rose-950/20 text-xs font-mono tracking-wider transition-colors"
              >
                DISCONNECT MT5 TERMINAL
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
