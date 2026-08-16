import React, { useState } from 'react';
import api from '../services/api.js';
import { Play, Zap, Server, Shield, Clock, AlertOctagon, CheckCircle, ArrowRight, Code2, RefreshCw } from 'lucide-react';

const PRESET_ENDPOINTS = [
  { label: 'Test Rate Limiter (Limit: 5 req / 30s)', path: '/test/rate-limit?limit=5&window=30', method: 'GET' },
  { label: 'Products Catalog (Plan/IP Limited)', path: '/products', method: 'GET' },
  { label: 'Product Details (/api/products/1)', path: '/products/1', method: 'GET' },
  { label: 'User Profile (Requires Auth)', path: '/user/profile', method: 'GET' },
  { label: 'Analytics Overview', path: '/analytics/overview', method: 'GET' },
];

export const ApiTester = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(PRESET_ENDPOINTS[0].path);
  const [method, setMethod] = useState(PRESET_ENDPOINTS[0].method);
  const [algorithm, setAlgorithm] = useState('fixed_window');
  const [customBody, setCustomBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [burstProgress, setBurstProgress] = useState(null);

  const [lastResponse, setLastResponse] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);

  const executeRequest = async (overridePath = null) => {
    setLoading(true);
    const startTime = Date.now();
    const targetPath = overridePath || selectedEndpoint;

    // Append algorithm query param if testing test route
    let finalPath = targetPath;
    if (finalPath.includes('/test/rate-limit')) {
      finalPath += `&algorithm=${algorithm}`;
    }

    try {
      const config = {
        method,
        url: finalPath,
        ...(method !== 'GET' && customBody ? { data: JSON.parse(customBody) } : {}),
      };

      const res = await api(config);
      const latency = Date.now() - startTime;

      const responseData = {
        status: res.status,
        statusText: res.statusText,
        headers: {
          limit:
            res.headers['x-ratelimit-limit'] ||
            res.data?.data?.headers?.['X-RateLimit-Limit'] ||
            res.data?.data?.rateLimit?.limit ||
            'N/A',
          remaining:
            res.headers['x-ratelimit-remaining'] !== undefined
              ? res.headers['x-ratelimit-remaining']
              : res.data?.data?.headers?.['X-RateLimit-Remaining'] ||
                (res.data?.data?.rateLimit?.remaining !== undefined
                  ? String(res.data?.data?.rateLimit?.remaining)
                  : 'N/A'),
          reset:
            res.headers['x-ratelimit-reset'] ||
            res.data?.data?.headers?.['X-RateLimit-Reset'] ||
            (res.data?.data?.rateLimit?.resetSeconds !== undefined
              ? String(res.data?.data?.rateLimit?.resetSeconds)
              : 'N/A'),
          serverInstance:
            res.headers['x-server-instance'] ||
            res.data?.data?.headers?.['X-Server-Instance'] ||
            res.data?.data?.serverInstance ||
            'render-backend-1',
          retryAfter: res.headers['retry-after'] || null,
        },
        data: res.data,
        latency,
        timestamp: new Date().toLocaleTimeString(),
        path: finalPath,
      };

      setLastResponse(responseData);
      setRequestHistory((prev) => [responseData, ...prev.slice(0, 19)]);
    } catch (error) {
      const latency = Date.now() - startTime;
      const res = error.response;

      const errorData = {
        status: res?.status || 500,
        statusText: res?.statusText || 'Rate Limit Exceeded',
        headers: {
          limit:
            res?.headers?.['x-ratelimit-limit'] ||
            res?.data?.data?.headers?.['X-RateLimit-Limit'] ||
            res?.data?.data?.rateLimit?.limit ||
            '5',
          remaining:
            res?.headers?.['x-ratelimit-remaining'] !== undefined
              ? res?.headers?.['x-ratelimit-remaining']
              : '0',
          reset:
            res?.headers?.['x-ratelimit-reset'] ||
            res?.data?.data?.headers?.['X-RateLimit-Reset'] ||
            res?.data?.retryAfter ||
            '30',
          serverInstance:
            res?.headers?.['x-server-instance'] ||
            res?.data?.data?.headers?.['X-Server-Instance'] ||
            'render-backend-1',
          retryAfter:
            res?.headers?.['retry-after'] ||
            res?.data?.retryAfter ||
            res?.data?.data?.rateLimit?.retryAfter ||
            null,
        },
        data: res?.data || { message: error.message },
        latency,
        timestamp: new Date().toLocaleTimeString(),
        path: finalPath,
      };

      setLastResponse(errorData);
      setRequestHistory((prev) => [errorData, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
    }
  };

  // Sends a rapid burst of 10 requests to demonstrate rate limit threshold breach
  const sendBurst = async (count = 10) => {
    setLoading(true);
    setBurstProgress({ total: count, current: 0 });

    for (let i = 1; i <= count; i++) {
      setBurstProgress({ total: count, current: i });
      await executeRequest();
      // Brief 50ms pause between burst iterations
      await new Promise((r) => setTimeout(r, 60));
    }

    setBurstProgress(null);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            Interactive Rate Limit Playground
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Live API Request & Rate Limit Tester
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Dispatch requests to test IP/User quotas, trigger rapid burst thresholds, and inspect response headers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Request Dispatcher Form (Left Column) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              Configure Request
            </h3>

            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Preset Endpoint
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                value={selectedEndpoint}
                onChange={(e) => {
                  setSelectedEndpoint(e.target.value);
                  const found = PRESET_ENDPOINTS.find((p) => p.path === e.target.value);
                  if (found) setMethod(found.method);
                }}
              >
                {PRESET_ENDPOINTS.map((preset, idx) => (
                  <option key={idx} value={preset.path}>
                    [{preset.method}] {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Path & Method */}
            <div className="flex gap-2">
              <select
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <input
                type="text"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                placeholder="/api/..."
              />
            </div>

            {/* Algorithm Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Rate Limiter Algorithm Strategy
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fixed_window', label: 'Fixed Window' },
                  { id: 'sliding_window', label: 'Sliding Log' },
                  { id: 'token_bucket', label: 'Token Bucket' },
                ].map((algo) => (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => setAlgorithm(algo.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                      algorithm === algo.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {algo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => executeRequest()}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {loading && !burstProgress ? 'Sending...' : 'Send Single Call'}
              </button>
              <button
                onClick={() => sendBurst(10)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {burstProgress ? `Bursting (${burstProgress.current}/${burstProgress.total})...` : 'Send Burst (10x)'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Rate Limit Header Inspector (Right Column) */}
        <div className="lg:col-span-7 space-y-6">
          {lastResponse ? (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg font-mono font-black px-3 py-1 rounded-xl border ${
                      lastResponse.status === 200 || lastResponse.status === 201
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : lastResponse.status === 429
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {lastResponse.status} {lastResponse.statusText}
                  </span>
                  <div>
                    <p className="text-xs text-slate-400 font-mono">{lastResponse.path}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{lastResponse.latency}ms round-trip latency</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400">{lastResponse.timestamp}</span>
                </div>
              </div>

              {/* 429 Alert Banner */}
              {lastResponse.status === 429 && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-300">Rate Limit Exceeded (HTTP 429)</h4>
                    <p className="text-xs text-rose-400/90 mt-0.5">
                      Redis counter crossed the threshold. Client must wait{' '}
                      <strong>{lastResponse.headers.retryAfter || lastResponse.headers.reset} seconds</strong> before retrying.
                    </p>
                  </div>
                </div>
              )}

              {/* Rate Limit Headers Grid */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Parsed Rate-Limit Response Headers
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400">X-RateLimit-Limit</p>
                    <p className="text-xl font-bold text-cyan-400 mt-1">{lastResponse.headers.limit}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400">X-RateLimit-Remaining</p>
                    <p
                      className={`text-xl font-bold mt-1 ${
                        lastResponse.headers.remaining === '0' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {lastResponse.headers.remaining}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400">X-RateLimit-Reset</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{lastResponse.headers.reset}s</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-400">X-Server-Instance</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{lastResponse.headers.serverInstance}</p>
                  </div>
                </div>
              </div>

              {/* JSON Payload Viewer */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Response Payload
                </h4>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-60">
                  {JSON.stringify(lastResponse.data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
              <Zap className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No requests sent yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Click "Send Single Call" or "Send Burst" to test rate limit quotas and observe live Redis counters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiTester;
