import React from 'react';
import { Play, Sparkles, PlusCircle, Loader2 } from 'lucide-react';
import type { ScenarioPreset } from '../types';

interface AlertSimulatorProps {
  scenarios: ScenarioPreset[];
  onSimulate: (scenarioId: string) => void;
  onOpenCustomModal: () => void;
  isSimulating: boolean;
  activeScenarioId: string | null;
}

export const AlertSimulator: React.FC<AlertSimulatorProps> = ({
  scenarios,
  onSimulate,
  onOpenCustomModal,
  isSimulating,
  activeScenarioId,
}) => {
  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'red':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="glass-panel p-4 mb-5 border-indigo-500/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Event Trigger Simulator (Taskmaster Track Demo Scenarios)
            </h2>
            <p className="text-xs text-slate-400">
              Fire realistic production alerts to observe real-time branching & autonomous resolution.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCustomModal}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
          Inject Custom Alert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {scenarios.map((scen) => {
          const isCurrent = isSimulating && activeScenarioId === scen.id;
          return (
            <div
              key={scen.id}
              className="glass-subtle p-3 hover:border-slate-600 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${getBadgeStyle(
                      scen.badge_color
                    )}`}
                  >
                    {scen.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {scen.alert.service}
                  </span>
                </div>
                <h3 className="text-xs font-medium text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {scen.name.replace(/Scenario \d+: /, '')}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {scen.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {scen.expected_branch.replace('BRANCH_', '')}
                </span>
                <button
                  onClick={() => onSimulate(scen.id)}
                  disabled={isSimulating}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-all flex items-center gap-1 shadow disabled:opacity-50"
                >
                  {isCurrent ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Triaging...
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Simulate Alert
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
