import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LogOut,
  Settings,
  DollarSign,
  CreditCard,
  FileCheck,
  Bot,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Clock,
  Eye,
  Key,
  Shield,
  Layers,
} from 'lucide-react';
import {
  AdminDashboardData,
  WebsiteSettings,
  PricingSettings,
  PaymentMethod,
  BotSettings,
} from '../types';
import {
  fetchAdminDashboardData,
  saveAdminSettings,
  saveAdminPricing,
  addAdminPaymentMethod,
  updateAdminPaymentMethod,
  deleteAdminPaymentMethod,
  toggleAdminPaymentMethod,
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
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'payments' | 'transactions' | 'bot' | 'security'>('general');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // General Settings Form
  const [settingsForm, setSettingsForm] = useState<WebsiteSettings>({
    websiteName: '',
    websiteDescription: '',
    contactEmail: '',
    whatsappSupport: '',
    telegramSupport: '',
    otherSupport: '',
  });

  // Pricing Form
  const [pricingForm, setPricingForm] = useState<PricingSettings>({
    price: 50,
    currency: 'USD',
  });

  // Bot Settings Form
  const [botForm, setBotForm] = useState<BotSettings>({
    displayName: '',
    botStatus: '',
    botActivationEnabled: true,
    mt5IntegrationStatus: '',
    publicStatusMessage: '',
  });

  // Payment Method Modal / Edit State
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<Omit<PaymentMethod, 'id' | 'createdAt'>>({
    name: '',
    accountHolder: '',
    accountNumberOrAddress: '',
    network: '',
    instructions: '',
    qrCodeUrl: '',
    enabled: true,
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
      setPricingForm(res.pricing);
      setBotForm(res.botSettings);
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

  // Section A: Save General Settings
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

  // Section B: Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('pricing');
    setStatusAlert(null);
    try {
      await saveAdminPricing(pricingForm.price, pricingForm.currency);
      setStatusAlert({
        type: 'success',
        message: `Subscription price successfully updated to $${pricingForm.price} ${pricingForm.currency}. Public dashboard updated.`,
      });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to update pricing.' });
    } finally {
      setSavingSection(null);
    }
  };

  // Section C: Payment Methods
  const handleOpenAddPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm({
      name: '',
      accountHolder: '',
      accountNumberOrAddress: '',
      network: '',
      instructions: '',
      qrCodeUrl: '',
      enabled: true,
    });
    setIsEditingPayment(true);
  };

  const handleOpenEditPayment = (method: PaymentMethod) => {
    setEditingPaymentId(method.id);
    setPaymentForm({
      name: method.name,
      accountHolder: method.accountHolder || '',
      accountNumberOrAddress: method.accountNumberOrAddress,
      network: method.network || '',
      instructions: method.instructions || '',
      qrCodeUrl: method.qrCodeUrl || '',
      enabled: method.enabled,
    });
    setIsEditingPayment(true);
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('paymentMethod');
    setStatusAlert(null);
    try {
      if (editingPaymentId) {
        await updateAdminPaymentMethod(editingPaymentId, paymentForm);
        setStatusAlert({ type: 'success', message: `Payment method "${paymentForm.name}" updated successfully.` });
      } else {
        await addAdminPaymentMethod(paymentForm);
        setStatusAlert({ type: 'success', message: `New payment method "${paymentForm.name}" created and saved.` });
      }
      setIsEditingPayment(false);
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to save payment method.' });
    } finally {
      setSavingSection(null);
    }
  };

  const handleDeletePayment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the "${name}" payment method?`)) return;
    try {
      await deleteAdminPaymentMethod(id);
      setStatusAlert({ type: 'success', message: `Payment method "${name}" deleted.` });
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to delete payment method.' });
    }
  };

  const handleTogglePayment = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAdminPaymentMethod(id, !currentStatus);
      onDataChanged();
      loadData();
    } catch (err: any) {
      setStatusAlert({ type: 'error', message: err.message || 'Failed to toggle payment method.' });
    }
  };

  // Section D: Update Transaction Status
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

  // Section E: Save Bot Settings
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

  // Section E: Toggle Backend Bridge
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

  // Section F: Change Password
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
                  Prompipsboss
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
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:text-white hover:bg-rose-900/50 text-xs font-mono transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
            <button onClick={() => setStatusAlert(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 border-b border-purple-950 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            General
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Subscription Pricing
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment Methods ({data?.paymentMethods.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'bot'
                ? 'bg-purple-900/70 border border-purple-500 text-cyan-300 shadow-md'
                : 'bg-[#0f0a24] border border-purple-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Bot Settings
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono tracking-wide flex items-center gap-2 transition-all whitespace-nowrap ${
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
              <span>Loading encrypted administrator settings...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: GENERAL SETTINGS */}
              {activeTab === 'general' && (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      A. GENERAL WEBSITE SETTINGS
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Website Name:
                        </label>
                        <input
                          type="text"
                          value={settingsForm.websiteName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, websiteName: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Official Contact Email:
                        </label>
                        <input
                          type="email"
                          value={settingsForm.contactEmail}
                          onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          WhatsApp Support Number:
                        </label>
                        <input
                          type="text"
                          value={settingsForm.whatsappSupport}
                          onChange={(e) => setSettingsForm({ ...settingsForm, whatsappSupport: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          Telegram Support Channel / Handle:
                        </label>
                        <input
                          type="text"
                          value={settingsForm.telegramSupport}
                          onChange={(e) => setSettingsForm({ ...settingsForm, telegramSupport: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-purple-300 mb-1">
                        Website Meta Description:
                      </label>
                      <textarea
                        rows={2}
                        value={settingsForm.websiteDescription}
                        onChange={(e) => setSettingsForm({ ...settingsForm, websiteDescription: e.target.value })}
                        className="w-full p-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-purple-300 mb-1">
                        Additional Support & SLA Information:
                      </label>
                      <input
                        type="text"
                        value={settingsForm.otherSupport}
                        onChange={(e) => setSettingsForm({ ...settingsForm, otherSupport: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'settings'}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 hover:from-purple-600 hover:to-cyan-500 text-white font-display font-bold text-xs tracking-wider uppercase shadow-md glow-purple cursor-pointer"
                    >
                      {savingSection === 'settings' ? 'SAVING...' : 'SAVE GENERAL SETTINGS'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: PRICING */}
              {activeTab === 'pricing' && (
                <form onSubmit={handleSavePricing} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      B. BOT SUBSCRIPTION PRICING CONFIGURATION
                    </h3>
                    <p className="text-xs text-purple-300/80">
                      Modifying this price automatically updates the public dashboard, MT5 gate, and payment verification screens across all devices.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1 font-semibold">
                          Subscription Price ($):
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={pricingForm.price}
                            onChange={(e) => setPricingForm({ ...pricingForm, price: Number(e.target.value) })}
                            className="w-full h-11 pl-8 pr-4 rounded-xl bg-[#061e28]/90 border border-purple-800 text-sm font-mono font-bold text-white focus:border-[#00f2fe]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1 font-semibold">
                          Currency Code:
                        </label>
                        <input
                          type="text"
                          value={pricingForm.currency}
                          onChange={(e) => setPricingForm({ ...pricingForm, currency: e.target.value.toUpperCase() })}
                          className="w-full h-11 px-4 rounded-xl bg-[#061e28]/90 border border-purple-800 text-sm font-mono font-bold text-white uppercase"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#061822] border border-cyan-800/40 text-xs font-mono text-cyan-200">
                      Live Preview: Visitors will see: <strong>${pricingForm.price} {pricingForm.currency}</strong> for full bot activation.
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'pricing'}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff0055] via-[#ff1e56] to-[#fb7185] text-white font-display font-bold text-xs tracking-wider uppercase shadow-md glow-pink cursor-pointer"
                    >
                      {savingSection === 'pricing' ? 'SAVING...' : 'SAVE SUBSCRIPTION PRICE'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: PAYMENT METHODS */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-900/60">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#00f2fe]">
                        C. CONFIGURED PAYMENT METHODS
                      </h3>
                      <p className="text-xs text-purple-300/80">
                        Only enabled payment methods are shown to public visitors.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenAddPayment}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Method
                    </button>
                  </div>

                  {/* List of Methods */}
                  <div className="space-y-3">
                    {data?.paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          pm.enabled
                            ? 'bg-[#0f0a24] border-purple-800/80 shadow-md'
                            : 'bg-[#080516]/60 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-bold text-sm text-white">
                                {pm.name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${
                                  pm.enabled
                                    ? 'bg-emerald-950/80 border-emerald-500/50 text-[#00f59b]'
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                              >
                                {pm.enabled ? 'ACTIVE (PUBLIC)' : 'DISABLED'}
                              </span>
                              {pm.network && (
                                <span className="text-[10px] font-mono text-purple-300">
                                  [{pm.network}]
                                </span>
                              )}
                            </div>

                            {pm.accountHolder && (
                              <p className="text-xs font-mono text-slate-300">
                                Recipient: <span className="text-cyan-300">{pm.accountHolder}</span>
                              </p>
                            )}

                            <div className="p-2 rounded-lg bg-[#040e16] border border-cyan-950/60 font-mono text-xs text-cyan-200 select-all break-all">
                              {pm.accountNumberOrAddress}
                            </div>

                            {pm.instructions && (
                              <p className="text-[11px] text-purple-300/80 font-mono">
                                {pm.instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => handleTogglePayment(pm.id, pm.enabled)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold transition-colors ${
                                pm.enabled
                                  ? 'bg-amber-950/80 border border-amber-600/50 text-amber-300'
                                  : 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-300'
                              }`}
                            >
                              {pm.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleOpenEditPayment(pm)}
                              className="p-1.5 rounded-lg bg-purple-950 border border-purple-800 text-purple-300 hover:text-white flex items-center justify-center transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(pm.id, pm.name)}
                              className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 hover:text-white flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add / Edit Form Modal */}
                  {isEditingPayment && (
                    <div className="p-4 rounded-2xl bg-[#080415] border border-cyan-600/50 space-y-3">
                      <div className="flex justify-between items-center border-b border-purple-950 pb-2">
                        <h4 className="font-display font-bold text-sm text-[#00f2fe]">
                          {editingPaymentId ? 'EDIT PAYMENT METHOD' : 'ADD NEW PAYMENT METHOD'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsEditingPayment(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-purple-300 mb-1">
                            Method Name (e.g. USDT TRC20, Mobile Money):
                          </label>
                          <input
                            type="text"
                            required
                            value={paymentForm.name}
                            onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-purple-300 mb-1">
                            Network / Category (e.g. TRC-20, MTN MoMo):
                          </label>
                          <input
                            type="text"
                            value={paymentForm.network}
                            onChange={(e) => setPaymentForm({ ...paymentForm, network: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-purple-300 mb-1">
                            Account Holder / Recipient Name:
                          </label>
                          <input
                            type="text"
                            value={paymentForm.accountHolder}
                            onChange={(e) => setPaymentForm({ ...paymentForm, accountHolder: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-purple-300 mb-1">
                            Wallet Address / Account Number:
                          </label>
                          <input
                            type="text"
                            required
                            value={paymentForm.accountNumberOrAddress}
                            onChange={(e) =>
                              setPaymentForm({ ...paymentForm, accountNumberOrAddress: e.target.value })
                            }
                            className="w-full h-9 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-purple-300 mb-1">
                          Payment Instructions (Shown to user during payment):
                        </label>
                        <textarea
                          rows={2}
                          value={paymentForm.instructions}
                          onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                          className="w-full p-2.5 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enabled-toggle"
                          checked={paymentForm.enabled}
                          onChange={(e) => setPaymentForm({ ...paymentForm, enabled: e.target.checked })}
                          className="w-4 h-4 accent-cyan-400"
                        />
                        <label htmlFor="enabled-toggle" className="text-xs font-mono text-purple-200 cursor-pointer">
                          Enable this payment method immediately for public visitors
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleSavePaymentMethod}
                          disabled={savingSection === 'paymentMethod'}
                          className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-slate-950 font-display font-bold text-xs uppercase"
                        >
                          {savingSection === 'paymentMethod' ? 'SAVING...' : 'SAVE METHOD'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPayment(false)}
                          className="px-4 py-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRANSACTIONS & VERIFICATION */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-900/60">
                    <div>
                      <h3 className="font-display font-bold text-base text-[#00f2fe]">
                        D. TRANSACTION VERIFICATION & AUDIT RECORDS
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
                                      className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] hover:bg-emerald-900"
                                      title="Mark as Verified"
                                    >
                                      Verify
                                    </button>
                                  )}
                                  {tx.status !== 'rejected' && (
                                    <button
                                      onClick={() => handleUpdateTxStatus(tx.id, 'rejected')}
                                      className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/50 text-[10px] hover:bg-rose-900"
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

              {/* TAB 5: BOT SETTINGS */}
              {activeTab === 'bot' && (
                <form onSubmit={handleSaveBotSettings} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-4">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      E. BOT ENGINE & ACTIVATION POLICIES
                    </h3>

                    {/* Activation Policy Toggle */}
                    <div className="p-4 rounded-2xl bg-[#080415] border border-purple-800/80 flex items-center justify-between">
                      <div>
                        <span className="font-display font-bold text-sm text-white block">
                          Bot Subscription Activation Gate
                        </span>
                        <p className="text-[11px] font-mono text-purple-300/80 mt-0.5">
                          When disabled, attempts to start the bot return: <em>"Bot activation is currently unavailable. Please contact support."</em>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBotForm({ ...botForm, botActivationEnabled: !botForm.botActivationEnabled })}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
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
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-purple-300 mb-1">
                          MT5 Integration Status Note:
                        </label>
                        <input
                          type="text"
                          value={botForm.mt5IntegrationStatus}
                          onChange={(e) => setBotForm({ ...botForm, mt5IntegrationStatus: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
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
                        className="w-full h-10 px-3 rounded-xl bg-[#061e28]/90 border border-purple-800 text-xs font-mono text-cyan-100"
                      />
                    </div>

                    {/* MT5 Execution Bridge Control */}
                    <div className="p-3.5 rounded-xl bg-[#061822] border border-cyan-800/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-white block">
                          Execution Bridge Microservice Socket:
                        </span>
                        <span className="text-[10px] font-mono text-purple-300">
                          {data?.runtimeState.tradingBackendAttached
                            ? '● Bridge is ATTACHED (Allows Live execution when payment verified)'
                            : '○ Bridge is DETACHED (Returns: "Trading engine is not connected yet.")'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBridge}
                        className="px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-xs font-mono text-cyan-300 hover:border-cyan-400"
                      >
                        {data?.runtimeState.tradingBackendAttached ? 'Detach Bridge' : 'Attach Bridge'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'bot'}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase shadow-md glow-purple cursor-pointer"
                    >
                      {savingSection === 'bot' ? 'SAVING...' : 'SAVE BOT CONFIGURATION'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 6: SECURITY & AUDIT LOG */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  {/* Password Change */}
                  <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-3">
                    <h3 className="font-display font-bold text-base text-[#00f2fe]">
                      ADMINISTRATOR CREDENTIALS
                    </h3>
                    <p className="text-xs font-mono text-purple-300/80">
                      Logged in as username: <strong>Prompipsboss</strong>. Update administrator password securely.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                      <div>
                        <label className="block text-[10px] font-mono text-purple-300 mb-1">
                          New Password (min 8 chars):
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-purple-300 mb-1">
                          Confirm New Password:
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-[#040e16] border border-purple-800 text-xs font-mono text-cyan-200"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSection === 'security'}
                      className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white font-display font-bold text-xs uppercase"
                    >
                      {savingSection === 'security' ? 'UPDATING...' : 'UPDATE ADMIN PASSWORD'}
                    </button>
                  </form>

                  {/* Audit Trail */}
                  <div className="p-4 rounded-2xl bg-[#0f0a24] border border-purple-900/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-display font-bold text-sm text-white">
                        ADMINISTRATIVE AUDIT LOG
                      </h4>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                      {data?.auditLog.map((log) => (
                        <div key={log.id} className="p-2.5 rounded-xl bg-[#070314] border border-purple-950 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <span className="font-bold text-cyan-300">[{log.action}]</span>{' '}
                            <span className="text-slate-300">{log.details}</span>
                          </div>
                          <div className="text-[10px] text-purple-400/80 shrink-0">
                            {new Date(log.timestamp).toLocaleString()} · {log.actor}
                          </div>
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
