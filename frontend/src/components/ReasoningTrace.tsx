import React, { useState } from 'react';
import {
  Brain,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Layers,
  Sparkles,
  Activity,
  GitBranch,
} from 'lucide-react';
import type { DecisionLogEntry } from '../types';

interface ReasoningTraceProps {
  decision: DecisionLogEntry | null;
  onOpenSlackPreview: (decision: DecisionLogEntry) => void;
  onPromoteToMemory: (decision: DecisionLogEntry) => void;
}

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({
  decision,
  onOpenSlackPreview,
  onPromoteToMemory,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!decision) {
    return (
      <div className="glass-panel p-8 h-full flex flex-col items-center justify-center text-center text-slate-400">
        <Brain className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-200">No Incident Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select an incident from the live feed or simulate one from the top bar to inspect the
          agent's multi-step Gemini reasoning trace.
        </p>
      </div>
    );
  }

  const { alert, match_result, severity_assessment, decision: dec } = decision;

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const getBranchColor = (branch: string) => {
    switch (branch) {
      case 'BRANCH_A_AUTO_RESOLVE':
        return 'emerald';
      case 'BRANCH_B_ESCALATE_KNOWN':
        return 'rose';
      case 'BRANCH_C_ESCALATE_NOVEL':
        return 'amber';
      default:
        return 'slate';
    }
  };

  const branchColor = getBranchColor(dec.branch);

  return (
    <div className="glass-panel p-5 h-full flex flex-col overflow-y-auto space-y-4">
      {/* Top Banner: Incident Title & Metadata */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              {decision.id}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Alert: {alert.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {decision.model_used}
            </span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-emerald-400 font-mono">
              ⚡ {decision.processing_time_ms}ms
            </span>
          </div>
        </div>

        <h2 className="text-base font-bold text-white tracking-tight">
          {alert.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5 font-mono">
          <span>Service: <strong className="text-slate-200">{alert.service}</strong></span>
          <span>•</span>
          <span>Region: <strong className="text-slate-200">{alert.region}</strong></span>
          <span>•</span>
          <span>Source: <strong className="text-slate-200">{alert.source}</strong></span>
        </div>
      </div>

      {/* Decision Summary Card */}
      <div
        className={`p-4 rounded-xl border ${
          branchColor === 'emerald'
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
            : branchColor === 'rose'
            ? 'bg-rose-950/20 border-rose-500/40 text-rose-100'
            : branchColor === 'amber'
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
            : 'bg-slate-900 border-slate-700 text-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {dec.branch_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSlackPreview(decision)}
              className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5"
            >
              💬 View Slack Alert
            </button>
            {dec.branch === 'BRANCH_C_ESCALATE_NOVEL' && (
              <button
                onClick={() => onPromoteToMemory(decision)}
                className="text-xs px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1"
              >
                🧠 Teach Muscle Memory
              </button>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed font-medium">
          {dec.action_summary}
        </p>
        <p className="text-[11px] text-slate-300/80 mt-1">
          {dec.reasoning_summary}
        </p>
      </div>

      {/* Step 1: Ingestion & Raw Error */}
      <div className="glass-subtle p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Step 1: Signal Ingestion & Error Trace</span>
        </div>
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-rose-300/90 break-words mb-2">
          {alert.error_message}
        </div>
        {alert.stack_trace && alert.stack_trace !== 'None (metric warning)' && (
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer hover:text-slate-200 font-mono text-[11px] mb-1">
              View Stack Trace Log snippet
            </summary>
            <pre className="p-2 bg-slate-950 rounded border border-slate-900 text-[11px] text-slate-300 overflow-x-auto">
              {alert.stack_trace}
            </pre>
          </details>
        )}
      </div>

      {/* Step 2: Historical Memory Match (Gemini Reasoning) */}
      <div className="glass-subtle p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>Step 2: Incident Memory Matching</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-300">
              {(match_result.confidence_score * 100).toFixed(0)}% Match
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                match_result.is_known
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {match_result.confidence_level}
            </span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mb-3 border border-slate-800">
          <div
            className={`h-full transition-all duration-700 ${
              match_result.confidence_score >= 0.7
                ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                : 'bg-gradient-to-r from-slate-600 to-amber-400'
            }`}
            style={{ width: `${Math.max(10, match_result.confidence_score * 100)}%` }}
          ></div>
        </div>

        {/* Matched Incident ID */}
        {match_result.is_known && match_result.matched_incident ? (
          <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/30 rounded-lg mb-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300">
                Matched: {match_result.matched_incident.id} — {match_result.matched_incident.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Category: {match_result.matched_incident.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              <strong>Root Cause:</strong> {match_result.matched_incident.root_cause}
            </p>
          </div>
        ) : (
          <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg mb-2.5 text-xs text-amber-200/90">
            <strong>Honest Uncertainty Guardrail Triggered:</strong> No past incident in the memory bank
            shares this root cause or error trajectory. Confidence is below 70% threshold.
          </div>
        )}

        <p className="text-xs text-slate-300 leading-relaxed mb-2">
          <strong>Match Rationale:</strong> {match_result.match_rationale}
        </p>

        {/* Factors */}
        {match_result.similarity_factors.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold">Similarity Vectors:</div>
            {match_result.similarity_factors.map((f, i) => (
              <div key={i} className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                <span>✓</span> {f}
              </div>
            ))}
          </div>
        )}

        {match_result.divergent_factors.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold">Divergent Vectors:</div>
            {match_result.divergent_factors.map((f, i) => (
              <div key={i} className="text-[11px] text-amber-400 flex items-center gap-1.5 font-mono">
                <span>!</span> {f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Multidimensional Severity Assessment */}
      <div className="glass-subtle p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Step 3: Urgency & Blast Radius Assessment</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${
                severity_assessment.severity === 'P0'
                  ? 'badge-p0'
                  : severity_assessment.severity === 'P1'
                  ? 'badge-p1'
                  : severity_assessment.severity === 'P2'
                  ? 'badge-p2'
                  : 'badge-p3'
              }`}
            >
              Severity {severity_assessment.severity}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Impact {severity_assessment.impact_score}/10
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
          <div className="p-2 bg-slate-950 rounded border border-slate-900">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Blast Radius</span>
            <div className="font-medium text-slate-200 mt-0.5">{severity_assessment.blast_radius}</div>
          </div>
          <div className="p-2 bg-slate-950 rounded border border-slate-900">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">SLA Breach Risk</span>
            <div className={`font-medium mt-0.5 ${severity_assessment.sla_breach_risk ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
              {severity_assessment.sla_breach_risk ? '⚠️ High / Imminent Breach' : '✓ Nominal'}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Severity Rationale:</strong> {severity_assessment.severity_rationale}
        </p>
      </div>

      {/* Step 4: Remediation Output & Command */}
      <div className="glass-subtle p-3.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Step 4: Remediation Execution & Ticket</span>
          </div>
          {dec.remediation.ticket_id && (
            <a
              href={dec.remediation.ticket_url || '#'}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono hover:underline"
            >
              {dec.remediation.ticket_id}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {dec.remediation.command_executed && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span>{dec.remediation.executed ? 'Executed Command:' : 'Proposed Runbook Command:'}</span>
              <button
                onClick={() => copyCommand(dec.remediation.command_executed || '')}
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCmd ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 text-slate-200 rounded-lg border border-slate-800 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {dec.remediation.command_executed}
            </pre>
          </div>
        )}

        <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
          {dec.remediation.execution_output}
        </div>
      </div>
    </div>
  );
};
