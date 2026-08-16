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
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      location.pathname === path
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  DistriLimit <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Redis</span>
                </span>
                <p className="text-xs text-slate-400">Distributed Rate Limiter & Analytics</p>
              </div>
            </Link>

            {/* Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link to="/" className={navLinkClass('/')}>
                <Activity className="w-4 h-4" />
                Analytics Dashboard
              </Link>
              <Link to="/tester" className={navLinkClass('/tester')}>
                <Gauge className="w-4 h-4" />
                API Tester
              </Link>
              {isAdmin && (
                <Link to="/admin" className={navLinkClass('/admin')}>
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          {/* Right Status & Auth */}
          <div className="flex items-center gap-4">
            {/* Active Server Node Badge (Demonstrates Horizontal Scaling) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Node:</span>
              <span className="text-cyan-300 font-semibold">{serverInfo.instance}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" title="Redis Connected" />
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-200">{user.name}</p>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                        user.plan === 'premium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {user.plan} Plan
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
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
