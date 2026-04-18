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
  Flame,
  Syringe,
  CloudRain,
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
];

/**
 * Off-canvas sidebar — fixed behind the page shell.
 * When open, the page shell slides right to reveal it.
 */
export default function Sidebar({ onNavigate }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="se-sidebar">
      {/* Spacer matching topbar height */}
      <div className="h-16 shrink-0" />

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title} className="sidebar-section">
            {idx > 0 && <div className="sidebar-divider" />}
            <p className="sidebar-section-title">{section.title}</p>
            <div className="sidebar-section-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={`sidebar-item ${active ? 'active' : ''}`}
                  >
                    {active && <span className="sidebar-active-indicator" />}
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className="sidebar-badge"
                        style={
                          item.badge === 'LIVE'
                            ? {
                                background: 'rgba(34,197,94,0.15)',
                                color: '#22C55E',
                                border: '1px solid rgba(34,197,94,0.3)',
                              }
                            : undefined
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings, Theme, Sign Out */}
      <div className="sidebar-bottom">
        <NavLink
          to="/alerts"
          onClick={onNavigate}
          className={`sidebar-item ${isActive('/alerts') ? 'active' : ''}`}
        >
          {isActive('/alerts') && <span className="sidebar-active-indicator" />}
          <Bell size={17} />
          <span>Smart Alerts</span>
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={`sidebar-item ${isActive('/settings') ? 'active' : ''}`}
        >
          {isActive('/settings') && <span className="sidebar-active-indicator" />}
          <Settings size={17} />
          <span>Settings</span>
        </NavLink>
        <button onClick={toggleTheme} className="sidebar-item">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        {user && (
          <button onClick={signOut} className="sidebar-item">
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
