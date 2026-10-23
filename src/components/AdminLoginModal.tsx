import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertCircle, X, RefreshCw, KeyRound } from 'lucide-react';
import { adminLogin } from '../services/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Invalid username or password.');
      return;
    }

    setIsLoading(true);
    try {
      await adminLogin(username.trim(), password);
      setPassword('');
      setUsername('');
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0c081e] border border-purple-600/70 rounded-3xl p-6 shadow-2xl glow-purple text-slate-100 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/50 flex items-center justify-center glow-purple">
              <ShieldCheck className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl tracking-wider text-white">
                ADMINISTRATOR ACCESS
              </h2>
              <p className="text-xs font-mono text-purple-300/80">
                Authorized Personnel Control Center
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Banner */}
        <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 text-[11px] font-mono text-purple-300 leading-relaxed flex items-start gap-2">
          <KeyRound className="w-4 h-4 text-[#00f2fe] shrink-0 mt-0.5" />
          <span>
            Server-side rate limiting active. Sessions are cryptographically signed. Unauthorized attempts are logged.
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              ADMINISTRATOR USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              className="w-full h-11 px-4 rounded-xl bg-[#061e28]/80 border border-purple-600/60 focus:border-[#00f2fe] focus:outline-none focus:ring-1 focus:ring-[#00f2fe] font-mono text-sm text-cyan-100 placeholder:text-slate-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#00f2fe] mb-1.5 font-semibold">
              ADMINISTRATOR PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
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

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-bold text-sm tracking-widest uppercase transition-all shadow-lg glow-purple disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                'ENTER ADMIN CONTROL CENTER'
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 text-center text-xs text-purple-400 hover:text-purple-200 transition-colors"
            >
              Cancel & Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
