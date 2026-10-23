import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TradingEngineDashboard } from './components/TradingEngineDashboard';
import { SettingsView } from './components/SettingsView';
import { MT5ConnectionModal } from './components/MT5ConnectionModal';
import { PaymentGateModal } from './components/PaymentGateModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { EngineStatusData, BotEngineStatus } from './types';
import { fetchEngineStatus, checkAdminSession } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'settings'>('home');
  const [isMT5ModalOpen, setIsMT5ModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Initial State before backend loads
  const [statusData, setStatusData] = useState<EngineStatusData>({
    botEngineStatus: 'Not Started',
    isTrading: false,
    mt5Connected: false,
    mt5LoginId: null,
    mt5BrokerServer: null,
    paymentVerified: false,
    activeTxId: null,
    subscriptionPrice: 50,
    currency: 'USD',
    tradingBackendAttached: false,
    botActivationEnabled: true,
    publicStatusMessage: 'Quantitative scalping algorithmic engine is primed for execution.',
    publicSettings: {
      websiteName: 'PROMPIPS BOT',
      websiteDescription:
        'High-performance automated MT5 trading bot interface with real-time connection status and secure $50 subscription verification.',
    },
    enabledPaymentMethods: [
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
    ],
  });

  const loadStatus = async () => {
    try {
      const data = await fetchEngineStatus();
      setStatusData(data);
    } catch (err) {
      console.warn('Could not connect to backend status endpoint:', err);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectionSuccess = (data: {
    loginId: string;
    brokerServer: string;
    botEngineStatus: BotEngineStatus;
  }) => {
    setStatusData((prev) => ({
      ...prev,
      mt5Connected: !!data.loginId,
      mt5LoginId: data.loginId || null,
      mt5BrokerServer: data.brokerServer || null,
      botEngineStatus: data.botEngineStatus,
    }));
  };

  const handlePaymentSuccess = (txId: string, newStatus: BotEngineStatus) => {
    setStatusData((prev) => ({
      ...prev,
      paymentVerified: true,
      activeTxId: txId,
      botEngineStatus: newStatus,
    }));
  };

  const handleOpenAdminPanel = async () => {
    const isAuthed = await checkAdminSession();
    if (isAuthed) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoginOpen(false);
    setIsAdminDashboardOpen(true);
  };

  return (
    <div className="min-h-screen bg-radial-purple flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Top Header */}
      <Header
        botEngineStatus={statusData.botEngineStatus}
        isTrading={statusData.isTrading}
        onOpenSettings={() => setCurrentTab('settings')}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-20">
        {currentTab === 'home' ? (
          <TradingEngineDashboard
            statusData={statusData}
            onOpenMT5Modal={() => setIsMT5ModalOpen(true)}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onRefreshStatus={loadStatus}
            onPaymentSuccess={handlePaymentSuccess}
            onConnectionSuccess={handleConnectionSuccess}
            onOpenAdminPanel={handleOpenAdminPanel}
          />
        ) : (
          <SettingsView
            statusData={statusData}
            onRefreshStatus={loadStatus}
            onOpenMT5Modal={() => setIsMT5ModalOpen(true)}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenAdminPanel={handleOpenAdminPanel}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        onOpenQuickMT5={() => setIsMT5ModalOpen(true)}
      />

      {/* MT5 Connection Modal */}
      <MT5ConnectionModal
        isOpen={isMT5ModalOpen}
        onClose={() => setIsMT5ModalOpen(false)}
        currentLoginId={statusData.mt5LoginId}
        currentBrokerServer={statusData.mt5BrokerServer}
        isConnected={statusData.mt5Connected}
        botEngineStatus={statusData.botEngineStatus}
        paymentVerified={statusData.paymentVerified}
        onConnectionSuccess={handleConnectionSuccess}
        onOpenPaymentGate={() => setIsPaymentModalOpen(true)}
      />

      {/* Payment Gate Modal (Dynamic Methods & Price) */}
      <PaymentGateModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        price={statusData.subscriptionPrice}
        currency={statusData.currency}
        paymentMethods={statusData.enabledPaymentMethods}
        onPaymentSuccess={handlePaymentSuccess}
        onStartBotRequested={() => {
          setIsPaymentModalOpen(false);
        }}
      />

      {/* Admin Login Modal (Triggered by visible Admin Panel button in Settings) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Control Center Dashboard Modal (Full Admin Capabilities) */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onDataChanged={loadStatus}
      />
    </div>
  );
}
