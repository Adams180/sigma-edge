import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Radio,
  Shield,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart3,
  History,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scanner', label: 'Value Scanner', icon: TrendingUp },
  { path: '/signals', label: 'Signal History', icon: History },
  { path: '/live', label: 'Live Feed', icon: Radio },
  { path: '/referees', label: 'Referee Intel', icon: Shield },
  { path: '/lineups', label: 'Lineup Monitor', icon: Users },
  { path: '/performance', label: 'Performance', icon: BarChart3 },
];

const BOTTOM_ITEMS = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col bg-bg-surface border-r border-border-subtle z-50 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-5 border-b border-border-subtle ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-text-primary">Sigma Edge</span>
            <span className="text-[10px] text-text-muted font-medium tracking-widest uppercase">Intelligence</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-text-muted tracking-widest uppercase px-3 mb-3">
            Analytics
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-dim text-primary shadow-[0_0_20px_rgba(0,212,170,0.08)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(0,212,170,0.6)]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-3 border-t border-border-subtle space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Icon size={20} className="flex-shrink-0 text-text-muted group-hover:text-text-secondary" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* User & Sign Out */}
        {user && (
          <button
            onClick={signOut}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={20} className="flex-shrink-0 text-text-muted group-hover:text-red-400" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-200 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
