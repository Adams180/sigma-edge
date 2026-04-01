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
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] z-50 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-5 border-b border-[var(--color-border-subtle)] ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--stripe-gradient)' }}>
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[var(--color-text-primary)]">Sigma Edge</span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-widest uppercase">Intelligence</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] tracking-widest uppercase px-3 mb-3">
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
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-3 border-t border-[var(--color-border-subtle)] space-y-0.5">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-150 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {theme === 'dark' ? (
            <Sun size={18} className="flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-warning)]" />
          ) : (
            <Moon size={18} className="flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
          )}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* User & Sign Out */}
        {user && (
          <button
            onClick={signOut}
            className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)] transition-all duration-150 w-full ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} className="flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-danger)]" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-all duration-150 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
