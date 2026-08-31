import React, { useState } from 'react';
import { Database, Search, Plus, Check, Copy } from 'lucide-react';
import type { PastIncident } from '../types';

interface MemoryBankProps {
  incidents: PastIncident[];
  onOpenAddModal: () => void;
}

export const MemoryBank: React.FC<MemoryBankProps> = ({ incidents, onOpenAddModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(incidents.map((i) => i.category)))];

  const filteredIncidents = incidents.filter((inc) => {
    const matchesCategory = selectedCategory === 'all' || inc.category === selectedCategory;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.root_cause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Incident Memory Bank (Knowledge Base)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            The historical muscle memory database the agent searches against during incident triage.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Teach Muscle Memory (Add Incident)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, service, root cause, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Incident Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className="glass-panel p-4 flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {inc.id}
                  </span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {inc.category}
                  </span>
                </div>
                <span className="text-xs font-bold text-rose-400 font-mono">
                  {inc.severity}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1">
                {inc.title}
              </h3>
              <div className="text-xs text-indigo-400 font-mono mb-2">
                Service: {inc.service}
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div>
                  <strong className="text-slate-400 text-[11px] block uppercase font-semibold">
                    Root Cause
                  </strong>
                  <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                    {inc.root_cause}
                  </p>
                </div>

                <div>
                  <strong className="text-slate-400 text-[11px] block uppercase font-semibold">
                    Resolution Runbook
                  </strong>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {inc.runbook.summary}
                  </p>
                </div>

                {inc.runbook.remediation_command && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>Command:</span>
                      <button
                        onClick={() => copyCommand(inc.runbook.remediation_command || '', inc.id)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedId === inc.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedId === inc.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-2 bg-slate-950 text-slate-300 rounded border border-slate-900 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                      {inc.runbook.remediation_command}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {inc.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                Resolved by: {inc.resolved_by}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
