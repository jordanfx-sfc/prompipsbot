import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LogOut,
  Settings,
  CreditCard,
  FileCheck,
  Bot,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Key,
  Shield,
  Save,
  Database,
  Lock,
} from 'lucide-react';
import {
  AdminDashboardData,
  WebsiteSettings,
  BotSettings,
} from '../types';
import {
  fetchAdminDashboardData,
  saveAdminPaymentSettings,
  saveAdminSettings,
  updateAdminTransactionStatus,
  saveAdminBotSettings,
  toggleAdminBackendBridge,
  changeAdminPassword,
  adminLogout,
} from '../services/api';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'transactions' | 'bot' | 'general' | 'security'>('payments');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dedicated Payment Settings Form (TRC20, ERC20, BTC, Price, Instructions)
  const [paymentSettingsForm, setPaymentSettingsForm] = useState({
    price: 50,
    currency: 'USD',
    trc20Enabled: true,
    trc20Address: 'TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC',
    trc20Instructions: 'Send exactly $50 USDT via TRON (TRC20) network. Zero or near-zero gas fee. Copy and paste your Transaction ID below after sending.',
    erc20Enabled: true,
    erc20Address: '0x4984ba14236737ada963abff469f2d25821c92dc',
    erc20Instructions: 'Send $50 USDT via Ethereum (ERC20) network. Copy and paste your Transaction Hash below after sending.',
    btcEnabled: true,
    btcAddress: '393j54v41LN7d6inoq6gRTTCbX2dQ3w5Br',
    btcInstructions: 'Send $50 equivalent in BTC via native Bitcoin network. Copy and paste your Transaction Hash below after sending.',
  });

  // General Settings Form (No support contacts)
  const [settingsForm, setSettingsForm] = useState<WebsiteSettings>({
    websiteName: '',
    websiteDescription: '',
  });

  // Bot Settings Form
  const [botForm, setBotForm] = useState<BotSettings>({
    displayName: '',
    botStatus: '',
    botActivationEnabled: true,
    mt5IntegrationStatus: '',
    publicStatusMessage: '',
  });

  // Security Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading state for operations
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminDashboardData();
      setData(res);
      setSettingsForm(res.settings);
      setBotForm(res.botSettings);

      // Populate Dedicated Payment Settings Form
      const trcMethod = res.paymentMethods.find((m) => m.id === 'pm-trc20' || m.name.toLowerCase().includes('trc'));
      const ercMethod = res.paymentMethods.find((m) => m.id === 'pm-erc20' || m.name.toLowerCase().includes('erc'));
      const btcMethod = res.paymentMethods.find((m) => m.id === 'pm-btc' || m.name.toLowerCase().includes('btc'));

      setPaymentSettingsForm({
        price: res.pricing.price || 50,
        currency: res.pricing.currency || 'USD',
        trc20Enabled: trcMethod ? trcMethod.enabled : true,
        trc20Address: trcMethod ? trcMethod.accountNumberOrAddress : 'TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC',
        trc20Instructions: trcMethod?.instructions || 'Send exactly $50 USDT via TRON (TRC20) network. Zero or near-zero gas fee. Copy and paste your Transaction ID below after sending.',
        erc20Enabled: ercMethod ? ercMethod.enabled : true,
        erc20Address: ercMethod ? ercMethod.accountNumberOrAddress : '0x4984ba14236737ada963abff469f2d25821c92dc',
        erc20Instructions: ercMethod?.instructions || 'Send $50 USDT via Ethereum (ERC20) network. Copy and paste your Transaction Hash below after sending.',
        btcEnabled: btcMethod ? btcMethod.enabled : true,
        btcAddress: btcMethod ? btcMethod.accountNumberOrAddress : '393j54v41LN7d6inoq6gRTTCbX2dQ3w5Br',
        btcInstructions: btcMethod?.instructions || 'Send $50 equivalent in BTC via native Bitcoin network. Copy and paste your Transaction Hash below after sending.',
      });
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to load administrator data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await adminLogout();
    onClose();
    onDataChanged();
  };

  // Dedicated Save Payment Settings Handler
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('paymentSettings');
    setStatusAlert(null);

    // Client-side validations
    const priceNum = Number(paymentSettingsForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setStatusAlert({ type: 'error', message: 'Subscription price must be a positive number.' });
      setSavingSection(null);
      return;
    }

    if (paymentSettingsForm.trc20Enabled && !paymentSettingsForm.trc20Address.trim()) {
      setStatusAlert({ type: 'error', message: 'TRC20 is enabled but wallet address is empty.' });
      setSavingSection(null);
      return;
    }

    if (paymentSettingsForm.erc20Enabled && !paymentSettingsForm.erc20Address.trim()) {
      setStatusAlert({ type: 'error', message: 'ERC20 is enabled but wallet address is empty.' });
      setSavingSection(null);
      return;
    }

    if (paymentSettingsForm.btcEnabled && !paymentSettingsForm.btcAddress.trim()) {
      setStatusAlert({ type: 'error', message: 'BTC is enabled but wallet address is empty.' });
      setSavingSection(null);
      return;
    }

    try {
      const res = await saveAdminPaymentSettings({
        price: priceNum,
        currency: paymentSettingsForm.currency,
        trc20Enabled: paymentSettingsForm.trc20Enabled,
        trc20Address: paymentSettingsForm.trc20Address.trim(),
        trc20Instructions: paymentSettingsForm.trc20Instructions,
        erc20Enabled: paymentSettingsForm.erc20Enabled,
        erc20Address: paymentSettingsForm.erc20Address.trim(),
        erc20Instructions: paymentSettingsForm.erc20Instructions,
        btcEnabled: paymentSettingsForm.btcEnabled,
        btcAddress: paymentSettingsForm.btcAddress.trim(),
        btcInstructions: paymentSettingsForm.btcInstructions,
      });

      setStatusAlert({
        type: 'success',
        message: res.message || 'Payment settings successfully saved and persisted to server-side storage.',
      });
      onDataChanged();
      await loadData();
    } catch (err: any) {
      setStatusAlert({
        type: 'error',
        message: err.message || 'Failed to save payment settings. Please check the values and retry.',
      });
    } finally {
      setSavingSection(null);
    }
  };

  // Save General Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('settings');
    setStatusAlert(null);
    try {
      await saveAdminSettings(settingsForm);
      setStatusAlert({ type: 'success', message: 'General settings saved and persisted to server.' });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSavingSection(null);
    }
  };

  // Update Transaction Status
  const handleUpdateTxStatus = async (id: string, newStatus: 'pending' | 'verified' | 'rejected') => {
    try {
      await updateAdminTransactionStatus(id, newStatus);
      setStatusAlert({ type: 'success', message: `Transaction status updated to ${newStatus.toUpperCase()}.` });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to update transaction status.' });
    }
  };

  // Save Bot Settings
  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('bot');
    setStatusAlert(null);
    try {
      await saveAdminBotSettings(botForm);
      setStatusAlert({ type: 'success', message: 'Bot configuration saved.' });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to save bot settings.' });
    } finally {
      setSavingSection(null);
    }
  };

  // Toggle Backend Bridge
  const handleToggleBridge = async () => {
    try {
      const res = await toggleAdminBackendBridge();
      setStatusAlert({ type: 'success', message: res.message });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message });
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setStatusAlert({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusAlert({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setSavingSection('security');
    try {
      await changeAdminPassword(newPassword);
      setStatusAlert({ type: 'success', message: 'Administrator password updated and re-hashed securely.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setSavingSection(null);
    }
  };

  if (!isOpen) return null;

  const storageStatus = data?.storageStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#090518] border border-purple-600/70 rounded-3xl p-4 sm:p-6 shadow-2xl glow-purple text-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/60 flex items-center justify-center glow-purple">
              <ShieldCheck className="w-5 h-5 text-[#00f2fe]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl tracking-wider text-white">
                  ADMIN CONTROL CENTER
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                  OFFICIAL
                </span>
              </div>
              <p className="text-xs font-mono text-purple-300/80">
                PROMPIPS BOT Unified Administrative Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:text-white hover:bg-rose-900/50 text-xs font-mono transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Storage Persistence Status Banner */}
        {storageStatus && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs flex items-center justify-between border shrink-0 font-mono ${
              storageStatus.connected
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Storage Engine:</strong> {storageStatus.message}
              </span>
            </div>
            {storageStatus.lastSaveError && (
              <span className="text-rose-400 text-[10px] font-bold">
                Save warning: {storageStatus.lastSaveError}
              </span>
            )}
          </div>
        )}

        {/* Global Status Banner */}
        {statusAlert && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs flex items-center justify-between border shrink-0 ${
              statusAlert.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-mono">{statusAlert.message}</span>
            </div>
            <button onClick={() => setStatusAlert(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 border-b border-purple-950 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md ring-1 ring-[#00f2fe]/40'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-[#00f2fe]" />
            Payment Settings (Wallets & Price)
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Verification & TxIDs ({data?.transactions.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('bot')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'bot'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Bot Settings
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            General
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Security & Audit
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs font-mono text-purple-300 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00f2fe]" />
              <span>Loading administrator settings...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DEDICATED PAYMENT SETTINGS (Requirement 2) */}
              {activeTab === 'payments' && (
                <form onSubmit={handleSavePaymentSettings} className="space-y-5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0f0a24] border border-purple-900/70 space-y-5">
                    <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
                      <div>
                        <h3 className="font-display font-bold text-base sm:text-lg text-[#00f2fe] flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-[#00f2fe]" />
                          CRYPTOCURRENCY PAYMENT SETTINGS
                        </h3>
                        <p className="text-xs text-purple-300/80 font-mono mt-0.5">
                          Configure wallet addresses, active networks, and subscription price. Changes persist across redeployments and update the public menu immediately.
                        </p>
                      </div>
                    </div>

                    {/* Subscription Price Field */}
                    <div className="p-4 rounded-xl bg-[#080516] border border-purple-800/60 max-w-md space-y-2">
                      <label className="block text-xs font-mono uppercase tracking-wider text-purple-200 font-bold">
                        Editable Subscription Price:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-sm font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={paymentSettingsForm.price}
                            onChange={(e) =>
                              setPaymentSettingsForm({
                                ...paymentSettingsForm,
                                price: Number(e.target.value),
                              })
                            }
                            required
                            className="w-full h-11 pl-8 pr-4 rounded-xl bg-[#03151d] border border-purple-700 focus:border-[#00f2fe] text-sm font-mono font-bold text-white outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={paymentSettingsForm.currency}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              currency: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-24 h-11 px-3 text-center rounded-xl bg-[#03151d] border border-purple-700 text-sm font-mono font-bold text-white uppercase outline-none"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300/80 block">
                        Displayed on public website: ${paymentSettingsForm.price} {paymentSettingsForm.currency}
                      </span>
                    </div>

                    {/* 1. TRC20 (USDT — TRON Network) */}
                    <div className="p-4 rounded-xl bg-[#080516] border border-cyan-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            1. TRC20 (USDT — TRON Network)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                            TRON
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentSettingsForm.trc20Enabled}
                            onChange={(e) =>
                              setPaymentSettingsForm({
                                ...paymentSettingsForm,
                                trc20Enabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-cyan-400 rounded"
                          />
                          <span className="text-xs font-mono font-bold text-purple-200">
                            {paymentSettingsForm.trc20Enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Editable TRC20 Wallet Address:
                        </label>
                        <input
                          type="text"
                          value={paymentSettingsForm.trc20Address}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              trc20Address: e.target.value,
                            })
                          }
                          placeholder="e.g. TFNGqoaBdSvcNRYTv8pRPTyXARawuJTkUC"
                          className="w-full h-11 px-3.5 rounded-xl bg-[#03151d] border border-purple-800 focus:border-[#00f2fe] text-xs font-mono text-cyan-200 outline-none select-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          TRC20 Payment Instructions:
                        </label>
                        <textarea
                          rows={2}
                          value={paymentSettingsForm.trc20Instructions}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              trc20Instructions: e.target.value,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* 2. ERC20 (USDT — Ethereum Network) */}
                    <div className="p-4 rounded-xl bg-[#080516] border border-cyan-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            2. ERC20 (USDT — Ethereum Network)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                            ETHEREUM
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentSettingsForm.erc20Enabled}
                            onChange={(e) =>
                              setPaymentSettingsForm({
                                ...paymentSettingsForm,
                                erc20Enabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-cyan-400 rounded"
                          />
                          <span className="text-xs font-mono font-bold text-purple-200">
                            {paymentSettingsForm.erc20Enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Editable ERC20 Wallet Address:
                        </label>
                        <input
                          type="text"
                          value={paymentSettingsForm.erc20Address}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              erc20Address: e.target.value,
                            })
                          }
                          placeholder="e.g. 0x4984ba14236737ada963abff469f2d25821c92dc"
                          className="w-full h-11 px-3.5 rounded-xl bg-[#03151d] border border-purple-800 focus:border-[#00f2fe] text-xs font-mono text-cyan-200 outline-none select-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          ERC20 Payment Instructions:
                        </label>
                        <textarea
                          rows={2}
                          value={paymentSettingsForm.erc20Instructions}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              erc20Instructions: e.target.value,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* 3. BTC (Bitcoin Network) */}
                    <div className="p-4 rounded-xl bg-[#080516] border border-cyan-950/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            3. BTC (Bitcoin Network)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                            BITCOIN
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentSettingsForm.btcEnabled}
                            onChange={(e) =>
                              setPaymentSettingsForm({
                                ...paymentSettingsForm,
                                btcEnabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-cyan-400 rounded"
                          />
                          <span className="text-xs font-mono font-bold text-purple-200">
                            {paymentSettingsForm.btcEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Editable BTC Wallet Address:
                        </label>
                        <input
                          type="text"
                          value={paymentSettingsForm.btcAddress}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              btcAddress: e.target.value,
                            })
                          }
                          placeholder="e.g. 393j54v41LN7d6inoq6gRTTCbX2dQ3w5Br"
                          className="w-full h-11 px-3.5 rounded-xl bg-[#03151d] border border-purple-800 focus:border-[#00f2fe] text-xs font-mono text-cyan-200 outline-none select-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          BTC Payment Instructions:
                        </label>
                        <textarea
                          rows={2}
                          value={paymentSettingsForm.btcInstructions}
                          onChange={(e) =>
                            setPaymentSettingsForm({
                              ...paymentSettingsForm,
                              btcInstructions: e.target.value,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* Prominent Save Payment Settings Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={savingSection === 'paymentSettings'}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-extrabold text-xs sm:text-sm tracking-widest uppercase shadow-xl glow-purple flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98] disabled:opacity-50"
                      >
                        {savingSection === 'paymentSettings' ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                            SAVING PAYMENT SETTINGS...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 text-cyan-300" />
                            SAVE PAYMENT SETTINGS
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 2: TRANSACTIONS & VERIFICATION */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-900/60">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#00f2fe]">
                        CUSTOMER TRANSACTION VERIFICATIONS
                      </h3>
                      <p className="text-xs text-purple-300/80">
                        Review customer submitted TxIDs and update verification status.
                      </p>
                    </div>
                  </div>

                  {data?.transactions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#0f0a24] border border-purple-900/50 text-center font-mono text-xs text-purple-300">
                      No transaction IDs submitted yet. When visitors submit TxIDs, they appear here.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-purple-900/60">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-[#120a2e] text-purple-300 border-b border-purple-900">
                          <tr>
                            <th className="p-3">TxID / Reference</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-950 bg-[#0a051d]">
                          {data?.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-purple-950/30">
                              <td className="p-3">
                                <span className="font-bold text-cyan-200 select-all block max-w-[200px] truncate">
                                  {tx.txId}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">{tx.paymentMethodName}</td>
                              <td className="p-3 text-white font-bold">${tx.amount}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                    tx.status === 'verified'
                                      ? 'bg-emerald-950 border-emerald-500/50 text-[#00f59b]'
                                      : tx.status === 'pending'
                                      ? 'bg-amber-950 border-amber-500/50 text-amber-300'
                                      : 'bg-rose-950 border-rose-500/50 text-rose-300'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-slate-400">
                                {new Date(tx.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1.5">
                                  {tx.status !== 'verified' && (
                                    <button
                                      onClick={() => handleUpdateTxStatus(tx.id, 'verified')}
                                      className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] hover:bg-emerald-900 cursor-pointer"
                                      title="Mark as Verified"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  {tx.status !== 'rejected' && (
                                    <button
                                      onClick={() => handleUpdateTxStatus(tx.id, 'rejected')}
                                      className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/50 text-[10px] hover:bg-rose-900 cursor-pointer"
                                      title="Mark as Rejected"
                                    >
                                      Reject
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BOT SETTINGS */}
              {activeTab === 'bot' && (
                <form onSubmit={handleSaveBotSettings} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      BOT ENGINE & ACTIVATION POLICIES
                    </h3>

                    {/* Activation Policy Toggle */}
                    <div className="p-4 rounded-2xl bg-[#080415] border border-purple-800/80 flex items-center justify-between">
                      <div>
                        <span className="font-display font-bold text-sm text-white block">
                          Bot Subscription Activation Gate
                        </span>
                        <p className="text-[11px] font-mono text-purple-300/80 mt-0.5">
                          When disabled, attempts to start the bot return pause notice.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBotForm({ ...botForm, botActivationEnabled: !botForm.botActivationEnabled })}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                            botForm.botActivationEnabled
                              ? 'bg-emerald-950 border-emerald-500 text-[#00f59b]'
                              : 'bg-rose-950 border-rose-500 text-rose-300'
                          }`}
                        >
                          {botForm.botActivationEnabled ? 'ACTIVATION ENABLED' : 'ACTIVATION DISABLED'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Bot Display Name:
                        </label>
                        <input
                          type="text"
                          value={botForm.displayName}
                          onChange={(e) => setBotForm({ ...botForm, displayName: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          MT5 Integration Status:
                        </label>
                        <input
                          type="text"
                          value={botForm.mt5IntegrationStatus}
                          onChange={(e) => setBotForm({ ...botForm, mt5IntegrationStatus: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-purple-300 mb-1">
                        Public Engine Status Message:
                      </label>
                      <input
                        type="text"
                        value={botForm.publicStatusMessage}
                        onChange={(e) => setBotForm({ ...botForm, publicStatusMessage: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    {/* Live Execution Bridge Toggle */}
                    <div className="p-4 rounded-2xl bg-[#080415] border border-cyan-900/60 flex items-center justify-between">
                      <div>
                        <span className="font-display font-bold text-sm text-cyan-200 block">
                          Live MT5 Execution Bridge
                        </span>
                        <p className="text-[11px] font-mono text-cyan-300/70 mt-0.5">
                          Status: {data?.runtimeState.tradingBackendAttached ? 'ONLINE' : 'STANDBY'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBridge}
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                          data?.runtimeState.tradingBackendAttached
                            ? 'bg-emerald-950 border-emerald-500 text-[#00f59b]'
                            : 'bg-amber-950 border-amber-500 text-amber-300'
                        }`}
                      >
                        {data?.runtimeState.tradingBackendAttached ? 'BRIDGE ATTACHED' : 'ATTACH BRIDGE'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'bot'}
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-xs uppercase cursor-pointer"
                    >
                      {savingSection === 'bot' ? 'SAVING...' : 'SAVE BOT SETTINGS'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: GENERAL SETTINGS (Zero Support Contacts) */}
              {activeTab === 'general' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      WEBSITE INFORMATION
                    </h3>

                    <div>
                      <label className="block text-[11px] font-mono text-purple-300 mb-1">
                        Website Name:
                      </label>
                      <input
                        type="text"
                        value={settingsForm.websiteName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, websiteName: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-purple-300 mb-1">
                        Website Meta Description:
                      </label>
                      <textarea
                        rows={3}
                        value={settingsForm.websiteDescription}
                        onChange={(e) => setSettingsForm({ ...settingsForm, websiteDescription: e.target.value })}
                        className="w-full p-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'settings'}
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-xs uppercase cursor-pointer"
                    >
                      {savingSection === 'settings' ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 5: SECURITY & AUDIT */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe] flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      CHANGE ADMINISTRATOR PASSWORD
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          New Password:
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Confirm New Password:
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full h-10 px-3 rounded-xl bg-[#03151d] border border-purple-800 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'security'}
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-display font-bold text-xs uppercase cursor-pointer"
                    >
                      {savingSection === 'security' ? 'UPDATING...' : 'UPDATE PASSWORD'}
                    </button>
                  </form>

                  {/* Audit Log */}
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-3">
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      ADMINISTRATIVE AUDIT LOG
                    </h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {data?.auditLog.map((log) => (
                        <div key={log.id} className="p-2.5 rounded-lg bg-[#061822] border border-cyan-950 text-slate-300 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-cyan-300 mr-2">[{log.action}]</span>
                            <span className="text-[11px]">{log.details}</span>
                          </div>
                          <span className="text-[10px] text-purple-400 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
