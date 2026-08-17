import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const RequestTimeSeriesChart = ({ data = [] }) => {
  return (
    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">API Traffic & Rate Limit Blocks</h3>
          <p className="text-xs text-slate-400">Total requests vs. throttled HTTP 429 blocks</p>
        </div>
      </div>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
            Awaiting API traffic logs...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickFormatter={(val) => val.split(' ')[1] || val} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="successful"
                name="200 OK (Allowed)"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="#10b981"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="blocked"
                name="429 Too Many Requests"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="#ef4444"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export const EndpointBarChart = ({ data = [] }) => {
  return (
    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Requests by Endpoint</h3>
        <p className="text-xs text-slate-400">Traffic volume distribution across endpoints</p>
      </div>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
            No endpoint records found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="endpoint" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.replace('/api', '')} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="successful" name="Successful" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="blocked" name="Rate-Limited" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default { RequestTimeSeriesChart, EndpointBarChart };
