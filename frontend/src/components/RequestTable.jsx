import React from 'react';

export const RequestTable = ({ requests = [] }) => {
  const getMethodBadge = (method) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'POST':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (code) => {
    if (code === 200 || code === 201) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (code === 429) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-semibold';
    }
    if (code >= 400 && code < 500) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent API Requests</h3>
          <p className="text-xs text-slate-400">Live request audit stream logged to database</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
              <th className="pb-2.5 px-3">Status</th>
              <th className="pb-2.5 px-3">Method</th>
              <th className="pb-2.5 px-3">Endpoint</th>
              <th className="pb-2.5 px-3">Latency</th>
              <th className="pb-2.5 px-3">Client IP</th>
              <th className="pb-2.5 px-3">Instance</th>
              <th className="pb-2.5 px-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">
                  No request records yet. Trigger calls from the API Tester.
                </td>
              </tr>
            ) : (
              requests.map((req, idx) => (
                <tr key={req._id || idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded border text-[11px] ${getStatusBadge(req.statusCode)}`}>
                      {req.statusCode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getMethodBadge(req.method)}`}>
                      {req.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">{req.endpoint}</td>
                  <td className="py-2.5 px-3 text-slate-400">{req.responseTime}ms</td>
                  <td className="py-2.5 px-3 text-slate-400">{req.ip}</td>
                  <td className="py-2.5 px-3 text-slate-300">{req.serverInstance || 'server-1'}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {new Date(req.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestTable;
