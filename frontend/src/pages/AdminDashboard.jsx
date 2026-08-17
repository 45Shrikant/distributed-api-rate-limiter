import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import { Shield, Users, Sliders, CheckCircle, Save, AlertCircle, RefreshCw } from 'lucide-react';

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState({
    users: { total: 0, free: 0, premium: 0 },
    traffic: { totalRequests: 0, blockedRequests: 0, blockRate: '0%' },
  });
  const [usersList, setUsersList] = useState([]);
  const [rateLimitRules, setRateLimitRules] = useState({
    defaults: { plans: {}, endpoints: {} },
    customOverrides: [],
  });

  const [editConfig, setEditConfig] = useState({ key: 'free', limit: 100, windowSeconds: 60, type: 'plan' });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, limitsRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users?limit=20'),
        api.get('/admin/rate-limits'),
      ]);

      if (statsRes.data.success) setAdminStats(statsRes.data.data);
      if (usersRes.data.success) setUsersList(usersRes.data.data.users || []);
      if (limitsRes.data.success) setRateLimitRules(limitsRes.data.data);
    } catch (err) {
      console.error('Failed to load admin metrics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await api.put(`/admin/rate-limits/${editConfig.key}`, {
        limit: parseInt(editConfig.limit, 10),
        windowSeconds: parseInt(editConfig.windowSeconds, 10),
        type: editConfig.type,
      });

      if (res.data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchAdminData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update rate limit rule.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Admin Governance & Quotas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure dynamic rate limit thresholds, inspect users, and audit cluster traffic.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Admin KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={adminStats.users.total}
          subtitle={`${adminStats.users.premium} on Premium tier`}
          icon={Users}
        />
        <StatCard
          title="Free Tier Subscribers"
          value={adminStats.users.free}
          subtitle="Quota: 100 req/min"
          icon={Users}
        />
        <StatCard
          title="Cluster Requests"
          value={adminStats.traffic.totalRequests.toLocaleString()}
          subtitle="Persistent audit logs"
          icon={Shield}
        />
        <StatCard
          title="Total Block Rate"
          value={adminStats.traffic.blockRate}
          subtitle={`${adminStats.traffic.blockedRequests} throttled`}
          icon={Sliders}
        />
      </div>

      {/* Rate Limit Configuration Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Dynamic Rate Limit Override</h3>
          </div>
          <p className="text-xs text-slate-400">
            Adjust limits dynamically in MongoDB without restarting Node.js backend servers.
          </p>

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Rate limit rule updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdateLimit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Target Plan / Endpoint Key
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-600"
                value={editConfig.key}
                onChange={(e) => {
                  const key = e.target.value;
                  const type = key.startsWith('/') ? 'endpoint' : 'plan';
                  setEditConfig((prev) => ({ ...prev, key, type }));
                }}
              >
                <optgroup label="Subscription Plans">
                  <option value="free">free (Default 100 req/min)</option>
                  <option value="premium">premium (Default 1,000 req/min)</option>
                </optgroup>
                <optgroup label="Protected Endpoints">
                  <option value="/api/auth/login">/api/auth/login (Auth Bruteforce Guard)</option>
                  <option value="/api/auth/register">/api/auth/register (Registration Guard)</option>
                  <option value="/api/products">/api/products (Catalog Overrides)</option>
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Request Limit
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-600"
                  value={editConfig.limit}
                  onChange={(e) => setEditConfig({ ...editConfig, limit: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Window (Seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-600"
                  value={editConfig.windowSeconds}
                  onChange={(e) => setEditConfig({ ...editConfig, windowSeconds: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Dynamic Rule
            </button>
          </form>
        </div>

        {/* Current Active Rules Breakdown */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
          <h3 className="text-sm font-semibold text-white">Active Rule Matrix</h3>
          <p className="text-xs text-slate-400">Default fallback tiers and custom MongoDB overrides</p>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-200 font-semibold">Plan: Free</span>
                <p className="text-[10px] text-slate-500">Unauthenticated / Starter users</p>
              </div>
              <span className="text-emerald-400 font-semibold">100 req / 60s</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-amber-300 font-semibold">Plan: Premium</span>
                <p className="text-[10px] text-slate-500">Subscribed API consumers</p>
              </div>
              <span className="text-emerald-400 font-semibold">1,000 req / 60s</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-slate-300 font-semibold">Auth: /api/auth/login</span>
                <p className="text-[10px] text-slate-500">Brute-force security barrier</p>
              </div>
              <span className="text-emerald-400 font-semibold">5 req / 60s (per IP)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
        <h3 className="text-sm font-semibold text-white">Registered API Users ({usersList.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2.5 px-3">User</th>
                <th className="pb-2.5 px-3">Email</th>
                <th className="pb-2.5 px-3">Role</th>
                <th className="pb-2.5 px-3">Subscription Plan</th>
                <th className="pb-2.5 px-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">
                    No users registered in database yet.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{u.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.plan === 'premium'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
