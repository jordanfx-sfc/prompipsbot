import React from 'react';
import { Shield, Activity, Power } from 'lucide-react';
import { BotEngineStatus } from '../types';

interface HeaderProps {
  botEngineStatus: BotEngineStatus;
  isTrading: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ botEngineStatus, isTrading, onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#080514]/90 backdrop-blur-md border-b border-purple-900/40 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1px] glow-purple flex items-center justify-center">
            <div className="w-full h-full bg-[#0d0722] rounded-[7px] flex items-center justify-center">
              <span className="font-display font-bold text-sm tracking-wider text-[#00f2fe]">P</span>
            </div>
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-widest text-white leading-none">
              PROMPIPS <span className="text-[#00f2fe]">BOT</span>
            </h1>
            <p className="text-[10px] font-mono tracking-tight text-purple-300/70 mt-0.5">
              QUANTITATIVE EXECUTION
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#120a2e] border border-purple-800/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isTrading
                  ? 'bg-[#00f59b] glow-green animate-pulse'
                  : botEngineStatus === 'Ready'
                  ? 'bg-cyan-400 glow-cyan'
                  : botEngineStatus === 'Awaiting Payment'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wide text-slate-300">
              {isTrading ? 'ACTIVE' : botEngineStatus}
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            aria-label="Engine Settings"
            className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:text-white hover:border-purple-600 transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
