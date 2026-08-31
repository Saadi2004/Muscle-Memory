import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import type { AlertEvent } from '../types';

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (alert: Partial<AlertEvent>) => void;
  isSubmitting: boolean;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [service, setService] = useState('checkout-service');
  const [title, setTitle] = useState('500 Internal Server Error Surge on /checkout/pay');
  const [errorMessage, setErrorMessage] = useState('NullPointerException in PaymentSessionValidator.java:78');
  const [stackTrace, setStackTrace] = useState('java.lang.NullPointerException: Session token cannot be null\n  at com.internal.checkout.PaymentSessionValidator.validate(PaymentSessionValidator.java:78)');
  const [region] = useState('us-central1');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: `ALT-CUSTOM-${Date.now().toString().slice(-6)}`,
      service,
      environment: 'production',
      title,
      error_message: errorMessage,
      stack_trace: stackTrace,
      region,
      source: 'custom-webhook-injector',
      metrics: {
        error_rate_percent: 22.5,
        p99_latency_ms: 650,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Inject Custom Alert Event</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Affected Service</label>
            <input
              type="text"
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Alert Headline / Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Error Message / Signature</label>
            <input
              type="text"
              required
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-rose-300 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Stack Trace / Log Snippet (Optional)</label>
            <textarea
              rows={3}
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Processing...' : 'Send Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
