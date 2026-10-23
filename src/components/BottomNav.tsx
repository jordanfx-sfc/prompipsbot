import React from 'react';
import { Home, Settings, Sliders } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'home' | 'settings';
  onChangeTab: (tab: 'home' | 'settings') => void;
  onOpenQuickMT5?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, onOpenQuickMT5 }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080514]/95 backdrop-blur-xl border-t border-purple-900/50">
      <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-around">
        {/* Home Tab */}
        <button
          onClick={() => onChangeTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
            currentTab === 'home'
              ? 'text-[#00f2fe]'
              : 'text-slate-400 hover:text-purple-300'
          }`}
        >
          <div className="relative">
            <Home className="w-5 h-5" />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00f2fe] glow-cyan" />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-wide mt-1">Home</span>
        </button>

        {/* Quick MT5 Action (Center Accent) */}
        {onOpenQuickMT5 && (
          <button
            onClick={onOpenQuickMT5}
            className="flex flex-col items-center justify-center px-4 py-1 text-purple-300 hover:text-[#00f2fe] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-600/50 flex items-center justify-center shadow-lg hover:border-cyan-400 transition-all">
              <Sliders className="w-4 h-4 text-[#00f2fe]" />
            </div>
            <span className="text-[10px] font-mono tracking-tight text-slate-400 mt-1">MT5</span>
          </button>
        )}

        {/* Settings Tab */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
            currentTab === 'settings'
              ? 'text-[#00f2fe]'
              : 'text-slate-400 hover:text-purple-300'
          }`}
        >
          <div className="relative">
            <Settings className="w-5 h-5" />
            {currentTab === 'settings' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00f2fe] glow-cyan" />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-wide mt-1">Settings</span>
        </button>
      </div>
    </nav>
  );
};
