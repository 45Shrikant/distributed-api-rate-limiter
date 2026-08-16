import React from 'react';
import { ShieldCheck, Zap, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

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
    if (percentage > 85) return 'bg-rose-500 shadow-rose-500/50';
    if (percentage > 50) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 backdrop-blur-md relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Your Rate-Limit Quota
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30">
                {algorithm.replace('_', ' ')}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Active Tier: <span className="text-emerald-400 uppercase font-semibold">{plan}</span> ({limit} req / 60s)
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Refresh Quota"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metric Gauge */}
      <div className="mt-6">
        <div className="flex justify-between items-baseline mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white font-mono">{remaining}</span>
            <span className="text-xs text-slate-400">/ {limit} requests left</span>
          </div>
          <span className="text-xs font-mono text-slate-400">{percentage}% consumed</span>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 shadow-sm ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Window Reset: <strong className="text-cyan-300 font-bold">{resetSeconds}s</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span>Redis Distributed Counter</span>
        </div>
      </div>
    </div>
  );
};

export default RateLimitCard;
