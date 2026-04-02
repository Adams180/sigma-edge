import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Radio,
  Shield,
  Users,
  Settings,
  Zap,
  BarChart3,
  History,
  LogOut,
  Sun,
  Moon,
  Search,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
  Activity,
  AlertTriangle,
  Ghost,
  DollarSign,
  GitMerge,
  Bell,
  Clock,
  BookOpen,
  Coffee,
  Trophy,
  Shuffle,
  Copy,
  Target,
  Syringe,
  CloudRain,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const NAV_SECTIONS = [
  {
    title: 'GENERAL',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/fixtures', label: 'Fixtures', icon: CalendarDays },
      { path: '/pulse', label: 'Pulse Mode', icon: Activity, badge: 'LIVE' },
      { path: '/morning-brief', label: 'Morning Brief', icon: Coffee },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { path: '/scanner', label: 'Value Scanner', icon: TrendingUp },
      { path: '/signals', label: 'Signal History', icon: History },
      { path: '/live', label: 'Live Feed', icon: Radio },
      { path: '/performance', label: 'Performance', icon: BarChart3 },
      { path: '/bankroll', label: 'Bankroll Scenarios', icon: DollarSign },
      { path: '/arbitrage', label: 'Arb Scanner', icon: Shuffle },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { path: '/anomalies', label: 'Anomaly Radar', icon: AlertTriangle },
      { path: '/narrative', label: 'Narrative Engine', icon: BookOpen },
      { path: '/parlay', label: 'Parlay Finder', icon: GitMerge },
      { path: '/ghost', label: 'Ghost Model', icon: Ghost },
      { path: '/time-machine', label: 'Time Machine', icon: Clock },
      { path: '/injury', label: 'Injury Intel', icon: Syringe },
      { path: '/weather', label: 'Weather Edge', icon: CloudRain },
      { path: '/referees', label: 'Referee Intel', icon: Shield },
      { path: '/lineups', label: 'Lineup Monitor', icon: Users },
    ],
  },
  {
    title: 'COMMUNITY',
    items: [
      { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { path: '/copy-trading', label: 'Copy Trading', icon: Copy },
      { path: '/challenge', label: 'Daily Challenge', icon: Flame },
    ],
  },
  {
    title: 'OTHERS',
    items: [
      { path: '/alerts', label: 'Smart Alerts', icon: Bell },
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/help', label: 'Help', icon: HelpCircle },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className={`se-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="sidebar-brand-text">Sigma Edge</span>
            <span className="sidebar-brand-sub">Intelligence</span>
          </div>
        )}
        <button onClick={onToggle} className="sidebar-collapse-btn" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="sidebar-search">
          <Search size={16} />
          <span>Search...</span>
          <kbd>⌘K</kbd>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="sidebar-section">
            {!collapsed && <p className="sidebar-section-title">{section.title}</p>}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span className="sidebar-badge" style={item.badge === 'LIVE' ? { background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' } : undefined}>{item.badge}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="py-3 px-2 border-t border-[var(--color-border-subtle)] space-y-0.5">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="sidebar-item" title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Sign Out */}
        {user && (
          <button onClick={signOut} className="sidebar-item" title={collapsed ? 'Sign Out' : undefined}>
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
