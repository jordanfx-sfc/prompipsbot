import React, { useState } from 'react';
import { Copy, Check, X, RefreshCw, ArrowRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { PaymentMethod, BotEngineStatus } from '../types';
import { verifyPaymentTxId } from '../services/api';

interface PaymentGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  price: number;
  currency: string;
  paymentMethods: PaymentMethod[];
  onPaymentSuccess: (txId: string, newStatus: BotEngineStatus) => void;
  onStartBotRequested: () => void;
}

export const PaymentGateModal: React.FC<PaymentGateModalProps> = ({
  isOpen,
  onClose,
  price,
  currency,
  paymentMethods,
  onPaymentSuccess,
  onStartBotRequested,
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods.length > 0 ? paymentMethods[0].id : ''
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [txIdInput, setTxIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'pending' | 'success' | 'failed'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const currentMethod =
    paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0] || null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txIdInput.trim()) {
      setVerificationStatus('failed');
      setStatusMessage('Please enter the correct transaction ID');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('pending');
    setStatusMessage('Querying server-side payment verification gateway...');

    try {
      const res = await verifyPaymentTxId(txIdInput.trim(), currentMethod?.name);
      if (res.success) {
        setVerificationStatus('success');
        setStatusMessage('Payment verified successfully. Your subscription is ready for activation.');
        if (res.data) {
          onPaymentSuccess(res.data.activeTxId, res.data.botEngineStatus);
        }
      } else {
        setVerificationStatus('failed');
        setStatusMessage(res.message || 'Please enter the correct transaction ID');
      }
    } catch (err: any) {
      setVerificationStatus('failed');
      setStatusMessage(err.message || 'Please enter the correct transaction ID');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0c081d] border border-purple-600/70 rounded-3xl p-5 md:p-6 shadow-2xl glow-purple text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-purple-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff1e56] glow-pink" />
              <h2 className="font-display font-bold text-xl tracking-wider text-white">
                PROMPIPS BOT SUBSCRIPTION
              </h2>
            </div>
            <p className="text-xs text-purple-300/80 mt-1">
              Unlock 24/7 automated algorithmic MT5 execution
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Highlight */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-purple-900/40 border border-purple-500/40 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono tracking-wider text-purple-300 uppercase block">
              License Fee
            </span>
            <div className="text-2xl font-bold font-display text-white mt-0.5">
              ${price} <span className="text-xs font-mono font-normal text-purple-300">/ {currency} Lifetime License</span>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-400/40 text-xs font-mono text-[#00f2fe] glow-cyan">
            ADMIN VERIFIED
          </div>
        </div>

        {/* Configured Payment Methods Tabs (Only Enabled Methods Shown to Visitors) */}
        {paymentMethods.length > 0 ? (
          <div className="mt-4">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-purple-300 mb-2 font-semibold">
              Select Configured Payment Method:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethods.map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setSelectedMethodId(pm.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-mono flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                    (currentMethod?.id === pm.id)
                      ? 'bg-cyan-950/80 border-[#00f2fe] text-[#00f2fe] shadow-md shadow-cyan-950/50'
                      : 'bg-[#0f0a24] border-purple-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-[11px] truncate max-w-full">{pm.name}</span>
                  {pm.network && <span className="text-[9px] text-purple-300 truncate max-w-full">{pm.network}</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs font-mono text-amber-200">
            Payment methods are currently being updated by the administrator. Please contact support.
          </div>
        )}

        {/* Payment Instructions Details */}
        {currentMethod && (
          <div className="mt-4 p-4 rounded-2xl bg-[#061822]/90 border border-cyan-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-purple-300 tracking-wider uppercase">
                {currentMethod.name} — {currentMethod.accountHolder ? `Recipient: ${currentMethod.accountHolder}` : 'Official Destination'}
              </span>
              <span className="text-[10px] font-mono text-[#00f59b] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                Amount: ${price}.00 {currency}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#030d13] border border-cyan-950 flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-cyan-200 break-all select-all">
                {currentMethod.accountNumberOrAddress}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(currentMethod.accountNumberOrAddress, currentMethod.id)}
                className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-[#00f2fe] hover:bg-cyan-900/40 transition-colors shrink-0 cursor-pointer"
                title="Copy details"
              >
                {copiedKey === currentMethod.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {currentMethod.instructions && (
              <p className="text-[11px] text-purple-300/80 leading-normal font-mono">
                {currentMethod.instructions}
              </p>
            )}
          </div>
        )}

        {/* Transaction ID Verification Form */}
        <form onSubmit={handleVerify} className="mt-5 space-y-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              TRANSACTION ID / REFERENCE
            </label>
            <div className="relative">
              <input
                type="text"
                value={txIdInput}
                onChange={(e) => setTxIdInput(e.target.value)}
                placeholder="Paste your transaction hash or payment reference..."
                disabled={isVerifying || verificationStatus === 'success'}
                className="w-full h-11 px-4 rounded-xl bg-[#061e28]/80 border border-purple-600/60 focus:border-[#00f2fe] focus:outline-none focus:ring-1 focus:ring-[#00f2fe] font-mono text-sm text-cyan-100 placeholder:text-slate-500 transition-all disabled:opacity-60"
              />
            </div>
            <p className="text-[10px] text-purple-400/80 mt-1">
              Obtain the TxID/Reference from your wallet (Binance, TrustWallet, TronLink) or banking app.
            </p>
          </div>

          {/* Visible Payment Status */}
          <div className="p-3.5 rounded-xl bg-[#070f1a] border border-cyan-900/50">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-purple-300 mb-1">
              PAYMENT VERIFICATION STATUS
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  verificationStatus === 'success'
                    ? 'bg-[#00f59b] glow-green'
                    : verificationStatus === 'pending'
                    ? 'bg-amber-400 animate-pulse'
                    : verificationStatus === 'failed'
                    ? 'bg-rose-500'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-mono text-slate-200">
                {verificationStatus === 'idle' && 'Awaiting transaction ID submission...'}
                {verificationStatus === 'pending' && statusMessage}
                {verificationStatus === 'success' && statusMessage}
                {verificationStatus === 'failed' && statusMessage}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            {verificationStatus !== 'success' ? (
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-bold text-sm tracking-widest uppercase transition-all shadow-lg glow-purple disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    VERIFYING SERVER-SIDE...
                  </>
                ) : (
                  'VERIFY PAYMENT'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartBotRequested();
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#00f59b] to-[#00f2fe] text-slate-950 font-display font-bold text-sm tracking-widest uppercase shadow-lg glow-green flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
              >
                ACTIVATE & START BOT
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs text-purple-400 hover:text-purple-200 transition-colors"
            >
              Close & Return to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
