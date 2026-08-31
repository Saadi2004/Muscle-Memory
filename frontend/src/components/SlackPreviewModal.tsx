import React from 'react';
import { X, Hash } from 'lucide-react';
import type { DecisionLogEntry } from '../types';

interface SlackPreviewModalProps {
  decision: DecisionLogEntry | null;
  onClose: () => void;
}

export const SlackPreviewModal: React.FC<SlackPreviewModalProps> = ({ decision, onClose }) => {
  if (!decision) return null;

  const { alert, match_result, severity_assessment, decision: dec } = decision;

  const getBorderColor = () => {
    switch (dec.branch) {
      case 'BRANCH_A_AUTO_RESOLVE':
        return '#10b981';
      case 'BRANCH_B_ESCALATE_KNOWN':
        return '#ef4444';
      case 'BRANCH_C_ESCALATE_NOVEL':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getEmoji = () => {
    switch (dec.branch) {
      case 'BRANCH_A_AUTO_RESOLVE':
        return '🟢';
      case 'BRANCH_B_ESCALATE_KNOWN':
        return '🚨';
      case 'BRANCH_C_ESCALATE_NOVEL':
        return '⚠️';
      default:
        return '⚪';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1A1D21] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Slack Modal Header */}
        <div className="bg-[#121016] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-white">production-incidents</span>
            <span className="text-xs text-slate-500">| Slack Webhook Preview</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-4 space-y-3">
          {/* Bot Avatar & Info */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
              ⚡
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm text-white">Muscle Memory Agent</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono">
                  APP
                </span>
                <span className="text-xs text-slate-500">Today at {new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Slack Attachment Block */}
              <div
                className="mt-2.5 p-3.5 bg-[#222529] rounded-lg border-l-4 space-y-2 text-xs"
                style={{ borderLeftColor: getBorderColor() }}
              >
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{getEmoji()}</span>
                  <span>{dec.branch_name.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400">Service: </span>
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">{alert.service}</code>
                  </div>
                  <div>
                    <span className="text-slate-400">Severity: </span>
                    <strong className="text-white">{severity_assessment.severity}</strong> ({severity_assessment.blast_radius})
                  </div>
                  <div>
                    <span className="text-slate-400">Match Score: </span>
                    <strong className="text-white">{(match_result.confidence_score * 100).toFixed(0)}%</strong> ({match_result.confidence_level})
                  </div>
                  <div>
                    <span className="text-slate-400">Ticket: </span>
                    <span className="text-indigo-400 font-mono">{dec.remediation.ticket_id || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="text-slate-400 font-semibold mb-0.5">Alert Summary:</div>
                  <div className="text-slate-200">{alert.title}</div>
                  <div className="text-rose-400 font-mono text-[11px] mt-0.5 bg-slate-900/80 p-1.5 rounded">
                    {alert.error_message}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60">
                  <div className="text-slate-400 font-semibold mb-0.5">Agent Reasoning:</div>
                  <div className="text-slate-200">{dec.reasoning_summary}</div>
                </div>

                {dec.remediation.command_executed && (
                  <div className="pt-2 border-t border-slate-700/60">
                    <div className="text-slate-400 font-semibold mb-1">
                      {dec.remediation.executed ? 'Executed Auto-Fix:' : 'Proposed Runbook Command:'}
                    </div>
                    <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                      {dec.remediation.command_executed}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#121016] px-4 py-2.5 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
