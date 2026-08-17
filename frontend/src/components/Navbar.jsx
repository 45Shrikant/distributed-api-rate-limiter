import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Server, Shield, Zap, LogOut, LogIn, UserPlus, Gauge } from 'lucide-react';
import api from '../services/api.js';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [serverInfo, setServerInfo] = useState({ instance: '...', redis: '...', status: '...' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.success) {
          setServerInfo({
            instance: res.data.data.serverInstance,
            redis: res.data.data.services.redis,
            status: res.data.data.status,
          });
        }
      } catch (err) {
        setServerInfo({ instance: 'offline', redis: 'offline', status: 'error' });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-slate-800 text-white'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  return (
    <nav className="border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-white tracking-tight">
                  DistriLimit
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Redis
                </span>
              </div>
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link to="/" className={navLinkClass('/')}>
                <Activity className="w-4 h-4" />
                Analytics
              </Link>
              <Link to="/tester" className={navLinkClass('/tester')}>
                <Gauge className="w-4 h-4" />
                API Tester
              </Link>
              {isAdmin && (
                <Link to="/admin" className={navLinkClass('/admin')}>
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right Status & Auth */}
          <div className="flex items-center gap-3">
            {/* Server Node Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Node:</span>
              <span className="text-white font-medium">{serverInfo.instance}</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs">
                  <span className="text-slate-200 font-medium mr-1.5">{user.name}</span>
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                      user.plan === 'premium'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {user.plan}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
