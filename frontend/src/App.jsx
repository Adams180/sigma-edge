import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeamLogosProvider } from './contexts/TeamLogosContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import ValueScanner from './pages/ValueScanner';
import SignalHistory from './pages/SignalHistory';
import RefWatch from './pages/RefWatch';
import LineupAlerts from './pages/LineupAlerts';
import LiveFeed from './pages/LiveFeed';
import Performance from './pages/Performance';
import Fixtures from './pages/Fixtures';
import PulseMode from './pages/PulseMode';
import AnomalyRadar from './pages/AnomalyRadar';
import GhostModel from './pages/GhostModel';
import BankrollScenarios from './pages/BankrollScenarios';
import CorrelatedParlayFinder from './pages/CorrelatedParlayFinder';
import SmartAlerts from './pages/SmartAlerts';
import TimeMachine from './pages/TimeMachine';
import NarrativeEngine from './pages/NarrativeEngine';
import MorningBrief from './pages/MorningBrief';
import Leaderboard from './pages/Leaderboard';
import ArbitrageScanner from './pages/ArbitrageScanner';
import CopyTrading from './pages/CopyTrading';
import DailyChallenge from './pages/DailyChallenge';
import InjuryIntel from './pages/InjuryIntel';
import WeatherEdge from './pages/WeatherEdge';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col transition-[margin] duration-200" style={{ marginLeft: collapsed ? 64 : 220 }}>
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6 lg:p-8 flex flex-col gap-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/scanner" element={<ValueScanner />} />
              <Route path="/signals" element={<SignalHistory />} />
              <Route path="/live" element={<LiveFeed />} />
              <Route path="/referees" element={<RefWatch />} />
              <Route path="/lineups" element={<LineupAlerts />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/pulse" element={<PulseMode />} />
              <Route path="/anomalies" element={<AnomalyRadar />} />
              <Route path="/ghost" element={<GhostModel />} />
              <Route path="/bankroll" element={<BankrollScenarios />} />
              <Route path="/parlay" element={<CorrelatedParlayFinder />} />
              <Route path="/alerts" element={<SmartAlerts />} />
              <Route path="/time-machine" element={<TimeMachine />} />
              <Route path="/narrative" element={<NarrativeEngine />} />
              <Route path="/morning-brief" element={<MorningBrief />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/arbitrage" element={<ArbitrageScanner />} />
              <Route path="/copy-trading" element={<CopyTrading />} />
              <Route path="/challenge" element={<DailyChallenge />} />
              <Route path="/injury" element={<InjuryIntel />} />
              <Route path="/weather" element={<WeatherEdge />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TeamLogosProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthRoute />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
      </TeamLogosProvider>
    </AuthProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}
