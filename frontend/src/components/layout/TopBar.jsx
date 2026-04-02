import { Search, Sun, Moon, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function TopBar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const email = user?.email || '';
  const name = email.split('@')[0] || 'User';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="se-topbar">
      {/* Left: User info */}
      <div className="topbar-user">
        <div className="topbar-avatar">
          <span>{initial}</span>
        </div>
        <div>
          <p className="topbar-username">{name}</p>
          <span className="topbar-role-badge">Member</span>
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
        <button className="topbar-icon-btn" title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
