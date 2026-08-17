import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import StatCard from '../components/StatCard.jsx';
import { RequestTimeSeriesChart, EndpointBarChart } from '../components/RequestChart.jsx';
import RateLimitCard from '../components/RateLimitCard.jsx';
import RequestTable from '../components/RequestTable.jsx';
import { Activity, ShieldAlert, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

export const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    blockedRequests: 0,
    averageResponseTime: 0,
    topEndpoints: [],
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [endpointData, setEndpointData] = useState([]);
  const [quotaInfo, setQuotaInfo] = useState({
    limit: 100,
    remaining: 100,
    resetSeconds: 60,
    plan: 'free',
    algorithm: 'fixed_window',
  });
  const [recentRequests, setRecentRequests] = useState([]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch overview KPIs
      const overviewRes = await api.get('/analytics/overview');
      if (overviewRes.data.success) {
        setOverview(overviewRes.data.data);
      }

      // 2. Fetch hourly time-series chart data
      const hourlyRes = await api.get('/analytics/hourly?hours=24');
      if (hourlyRes.data.success) {
        setHourlyData(hourlyRes.data.data.data || []);
      }

      // 3. Fetch endpoint breakdown
      const endpointRes = await api.get('/analytics/endpoints');
      if (endpointRes.data.success) {
        setEndpointData(endpointRes.data.data.endpoints || []);
      }

      // 4. Fetch User Quota or probe test quota
      if (isAuthenticated) {
        const quotaRes = await api.get('/user/rate-limit');
        if (quotaRes.data.success) {
          setQuotaInfo((prev) => ({
            ...prev,
            ...quotaRes.data.data,
          }));
        }

        const requestsRes = await api.get('/user/requests?limit=15');
        if (requestsRes.data.success) {
          setRecentRequests(requestsRes.data.data.requests || []);
        }
      } else {
        // Probe test endpoint to get headers for anonymous visitor
        const testRes = await api.get('/test/rate-limit?limit=100&window=60');
        if (testRes.headers) {
          setQuotaInfo({
            limit: parseInt(testRes.headers['x-ratelimit-limit'] || '100', 10),
            remaining: parseInt(testRes.headers['x-ratelimit-remaining'] || '100', 10),
            resetSeconds: parseInt(testRes.headers['x-ratelimit-reset'] || '60', 10),
            plan: 'guest (IP)',
            algorithm: 'fixed_window',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const blockRate =
    overview.totalRequests > 0
      ? ((overview.blockedRequests / overview.totalRequests) * 100).toFixed(1)
      : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Traffic & Rate Limit Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributed API rate limiting, active token quotas, and request metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total API Requests"
          value={overview.totalRequests.toLocaleString()}
          subtitle="Processed by Express nodes"
          icon={Activity}
        />
        <StatCard
          title="Successful (200 OK)"
          value={overview.successfulRequests.toLocaleString()}
          subtitle="Passed rate limiter"
          icon={CheckCircle2}
        />
        <StatCard
          title="Throttled (429 Blocks)"
          value={overview.blockedRequests.toLocaleString()}
          subtitle={`${blockRate}% block rate`}
          icon={ShieldAlert}
        />
        <StatCard
          title="Avg Latency"
          value={`${overview.averageResponseTime}ms`}
          subtitle="Redis + Mongo logging"
          icon={Clock}
        />
      </div>

      {/* User Rate Limit Quota Card */}
      <RateLimitCard
        limit={quotaInfo.limit}
        remaining={quotaInfo.remaining}
        resetSeconds={quotaInfo.resetSeconds}
        plan={quotaInfo.plan || (user?.plan ?? 'free')}
        algorithm={quotaInfo.algorithm}
        onRefresh={fetchDashboardData}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RequestTimeSeriesChart data={hourlyData} />
        <EndpointBarChart data={endpointData} />
      </div>

      {/* Recent Request Stream Table */}
      {recentRequests.length > 0 && <RequestTable requests={recentRequests} />}
    </div>
  );
};

export default Dashboard;
