import React, { useState, useEffect } from 'react';
import { X, Save, Brain, Sparkles } from 'lucide-react';
import type { PastIncident, DecisionLogEntry } from '../types';

interface AddIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: PastIncident) => void;
  initialFromDecision?: DecisionLogEntry | null;
}

export const AddIncidentModal: React.FC<AddIncidentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialFromDecision,
}) => {
  const [title, setTitle] = useState('');
  const [service, setService] = useState('');
  const [category, setCategory] = useState('security_auth');
  const [severity, setSeverity] = useState('P1');
  const [rootCause, setRootCause] = useState('');
  const [runbookSummary, setRunbookSummary] = useState('');
  const [remediationCommand, setRemediationCommand] = useState('');
  const [tags, setTags] = useState('auth, panic, rs256');

  useEffect(() => {
    if (initialFromDecision) {
      const { alert, severity_assessment } = initialFromDecision;
      setTitle(`Resolved: ${alert.title}`);
      setService(alert.service);
      setSeverity(severity_assessment.severity);
      setRootCause(
        `Nil pointer dereference in auth middleware JWT parser when client sends malformed Bearer token without public key header.`
      );
      setRunbookSummary(
        `Deploy hotfix patch to validate RSA key header presence before invoking rs256 verifier, restart auth-service deployment.`
      );
      setRemediationCommand(
        `kubectl set image deployment/auth-service auth-service=gcr.io/prod/auth-service:v3.1.2 -n prod && kubectl rollout status deployment/auth-service -n prod`
      );
      setTags(`${alert.service}, jwt, nil_pointer, hotfix`);
    } else {
      setTitle('');
      setService('');
      setRootCause('');
      setRunbookSummary('');
      setRemediationCommand('');
      setTags('');
    }
  }, [initialFromDecision, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newIncident: PastIncident = {
      id: `INC-2026-${Date.now().toString().slice(-4)}`,
      title,
      service,
      category,
      severity,
      symptoms: [title, `Service: ${service}`],
      error_patterns: [title.split(' ')[0], service],
      root_cause: rootCause,
      runbook: {
        summary: runbookSummary,
        action_type: 'auto_script',
        remediation_command: remediationCommand,
        runbook_url: 'https://wiki.internal.net/runbooks/new-learned-incident',
        estimated_recovery_time_sec: 60,
        automated_safe: true,
      },
      occurred_at: new Date().toISOString(),
      resolved_by: 'Muscle Memory Learning Loop',
      post_mortem_notes: 'Trained and memorized into autonomous agent memory bank.',
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    onSave(newIncident);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {initialFromDecision ? 'Teach Muscle Memory from Incident' : 'Add Historical Incident to Memory'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
          {initialFromDecision && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Promoting novel incident from alert <strong>{initialFromDecision.alert.id}</strong> into
                the knowledge bank so future occurrences will be recognized automatically!
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Incident Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Redis Connection Pool Exhaustion"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Affected Service</label>
              <input
                type="text"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. auth-service"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="database">Database</option>
                <option value="cache">Cache</option>
                <option value="network_infra">Network Infra</option>
                <option value="security_auth">Security Auth</option>
                <option value="deployment_regression">Deployment Regression</option>
                <option value="resource_exhaustion">Resource Exhaustion</option>
                <option value="third_party_api">Third Party API</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="P0">P0 (Critical Outage)</option>
                <option value="P1">P1 (Major Degradation)</option>
                <option value="P2">P2 (Moderate)</option>
                <option value="P3">P3 (Minor)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Root Cause Analysis</label>
            <textarea
              rows={2}
              required
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Explain the underlying technical root cause..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Resolution Runbook Summary</label>
            <input
              type="text"
              required
              value={runbookSummary}
              onChange={(e) => setRunbookSummary(e.target.value)}
              placeholder="e.g. Restart connection pooler and deploy hotfix..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Remediation Shell Command</label>
            <input
              type="text"
              value={remediationCommand}
              onChange={(e) => setRemediationCommand(e.target.value)}
              placeholder="e.g. kubectl rollout restart deployment/auth-service"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Searchable Tags (Comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. auth, redis, timeout, 502"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save to Memory Bank
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
