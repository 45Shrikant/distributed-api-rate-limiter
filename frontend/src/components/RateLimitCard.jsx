import React from 'react';
import { ShieldCheck, Clock, RefreshCw } from 'lucide-react';

export const RateLimitCard = ({
  limit = 100,
  remaining = 100,
  resetSeconds = 60,
  plan = 'free',
  algorithm = 'fixed_window',
  onRefresh,
}) => {
  const used = Math.max(0, limit - remaining);
  const percentage = Math.min(100, Math.round((used / limit) * 100));

  const getProgressColor = () => {
    if (percentage > 85) return 'bg-rose-500';
    if (percentage > 50) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Rate Limit Quota
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {algorithm.replace('_', ' ')}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Active Tier: <span className="text-slate-200 font-medium uppercase">{plan}</span> ({limit} req / 60s)
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            title="Refresh Quota"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metric Gauge */}
      <div className="mt-5">
        <div className="flex justify-between items-baseline mb-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white font-mono">{remaining}</span>
            <span className="text-xs text-slate-400">/ {limit} remaining</span>
          </div>
          <span className="text-xs font-mono text-slate-400">{percentage}% used</span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Window Reset: <strong className="text-slate-200 font-medium">{resetSeconds}s</strong></span>
        </div>
        <div className="text-slate-400">
          Redis Distributed Store
        </div>
      </div>
    </div>
  );
};

export default RateLimitCard;
