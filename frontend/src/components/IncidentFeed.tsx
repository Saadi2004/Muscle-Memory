import React from 'react';
import { ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle, Radio, Clock, ChevronRight } from 'lucide-react';
import type { DecisionLogEntry, RoutingBranchType } from '../types';

interface IncidentFeedProps {
  decisions: DecisionLogEntry[];
  selectedDecisionId: string | null;
  onSelectDecision: (decision: DecisionLogEntry) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  decisions,
  selectedDecisionId,
  onSelectDecision,
}) => {
  const getBranchBadge = (branch: RoutingBranchType) => {
    switch (branch) {
      case 'BRANCH_A_AUTO_RESOLVE':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Branch A: Auto-Healed',
          classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        };
      case 'BRANCH_B_ESCALATE_KNOWN':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Branch B: Critical Escalation',
          classes: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        };
      case 'BRANCH_C_ESCALATE_NOVEL':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Branch C: Novel Anomaly',
          classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Branch D: Suppressed',
          classes: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
        };
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'P0':
        return 'badge-p0';
      case 'P1':
        return 'badge-p1';
      case 'P2':
        return 'badge-p2';
      default:
        return 'badge-p3';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
          <h3 className="text-sm font-semibold text-white">Live Incident Feed</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {decisions.length} processed
        </span>
      </div>

      {decisions.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
          <span>No incident events received yet.</span>
          <span className="text-slate-500">Trigger a scenario above to test the agent.</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[640px] pr-1 mt-2 space-y-1">
          {decisions.map((entry) => {
            const isSelected = selectedDecisionId === entry.id;
            const branch = getBranchBadge(entry.decision.branch);
            return (
              <div
                key={entry.id}
                onClick={() => onSelectDecision(entry)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                    : 'border-transparent hover:bg-slate-900/60 hover:border-slate-800'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(
                        entry.severity_assessment.severity
                      )}`}
                    >
                      {entry.severity_assessment.severity}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${branch.classes}`}
                    >
                      {branch.icon}
                      {branch.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {formatTime(entry.timestamp)}
                  </div>
                </div>

                {/* Title & Service */}
                <h4 className="text-xs font-semibold text-slate-100 line-clamp-1 mb-1">
                  {entry.alert.title}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-indigo-400/90 truncate max-w-[180px]">
                    {entry.alert.service}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {entry.processing_time_ms}ms
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
