import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Zap, Clock } from 'lucide-react';
import type { SystemStats } from '../types';

interface StatsOverviewProps {
  stats: SystemStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 my-4">
      {/* 1. Total Triaged */}
      <div className="glass-panel p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Total Triaged</span>
          <Zap className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {stats?.total_triaged || 0}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">alerts</span>
        </div>
        <div className="text-[11px] text-indigo-400 mt-1">Autonomous Event Loop</div>
      </div>

      {/* 2. Auto-Resolved (Branch A) */}
      <div className="glass-panel p-3.5 flex flex-col justify-between border-emerald-500/20 bg-emerald-950/10">
        <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
          <span>Branch A: Auto-Healed</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-300 tracking-tight">
            {stats?.auto_resolved_count || 0}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
            {stats?.auto_resolve_rate || '0%'}
          </span>
        </div>
        <div className="text-[11px] text-emerald-400/80 mt-1">0 Human Input Needed</div>
      </div>

      {/* 3. Critical Escalated (Branch B) */}
      <div className="glass-panel p-3.5 flex flex-col justify-between border-red-500/20 bg-red-950/10">
        <div className="flex items-center justify-between text-red-400 text-xs font-medium">
          <span>Branch B: Known Critical</span>
          <AlertOctagon className="w-4 h-4 text-red-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-red-300 tracking-tight">
            {stats?.escalated_known_count || 0}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">paged</span>
        </div>
        <div className="text-[11px] text-red-400/80 mt-1">Past Runbook Attached</div>
      </div>

      {/* 4. Honest Uncertainty (Branch C) */}
      <div className="glass-panel p-3.5 flex flex-col justify-between border-amber-500/20 bg-amber-950/10">
        <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
          <span>Branch C: Novel Anomaly</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-amber-300 tracking-tight">
            {stats?.escalated_novel_count || 0}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">novel</span>
        </div>
        <div className="text-[11px] text-amber-400/80 mt-1">Diagnostic Blueprint Sent</div>
      </div>

      {/* 5. Latency */}
      <div className="glass-panel p-3.5 flex flex-col justify-between col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Avg Agent Latency</span>
          <Clock className="w-4 h-4 text-violet-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold text-white tracking-tight">
            {stats?.avg_triage_time_ms || 180}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">ms</span>
        </div>
        <div className="text-[11px] text-violet-400 mt-1">Instant SRE Response</div>
      </div>
    </div>
  );
};
