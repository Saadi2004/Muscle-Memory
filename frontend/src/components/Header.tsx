import React from 'react';
import { ShieldCheck, Cpu, Database, Radio, Activity, RefreshCw } from 'lucide-react';
import type { SystemStats } from '../types';

interface HeaderProps {
  stats: SystemStats | null;
  onRefresh: () => void;
  isLoading: boolean;
  activeTab: 'dashboard' | 'memory' | 'audit';
  setActiveTab: (tab: 'dashboard' | 'memory' | 'audit') => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onRefresh,
  isLoading,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-xl px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Muscle Memory
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-medium">
                Taskmaster Track
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-green"></span>
                <span>Autonomous Online</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Incident Recognition, Diagnosis & 3-Way Branching Engine
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Command Center
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Memory Bank ({stats?.memory_bank_size || 5})
          </button>
        </div>

        {/* Right: Cloud Badges & Live Refresh */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gemini 2.5 Flash</span>
            <span className="text-slate-600">|</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>SSE Stream</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh state"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
