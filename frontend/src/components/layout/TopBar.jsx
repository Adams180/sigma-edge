import { Search, Sun, Moon, Settings, Bell, Menu, X, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function TopBar({ onToggleSidebar, sidebarOpen }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const email = user?.email || '';
  const name = email.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="se-topbar">
      {/* Left: Menu toggle + Brand */}
      <div className="topbar-left">
        <button
          onClick={onToggleSidebar}
          className="topbar-icon-btn"
          title={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="topbar-brand">
          <div className="topbar-brand-icon">
            <Zap size={14} className="text-white" />
          </div>
          <span className="topbar-brand-text">Sigma Edge</span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="topbar-search">
        <Search size={16} className="opacity-40" />
        <input
          type="text"
          placeholder="Search pages and actions..."
          className="topbar-search-input"
        />
      </div>

      {/* Right: Controls */}
      <div className="topbar-controls">
        <button
          onClick={toggleTheme}
          className="topbar-icon-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={16} />
        </button>
        <div className="topbar-user">
          <div className="topbar-avatar">
            <span>{initial}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
