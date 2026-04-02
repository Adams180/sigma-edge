import { useState, useEffect } from 'react';
import { Target, Flame, Trophy, Star, Zap, Clock, CheckCircle, XCircle, ChevronRight, Gift } from 'lucide-react';
import api from '../api';

const CHALLENGES = [
  {
    id: 'daily_value',
    title: 'Value Hunter',
    description: 'Identify 3 bets with EV > 5% from today\'s fixtures.',
    xp: 150,
    difficulty: 'Medium',
    icon: Target,
    color: '#6366f1',
    category: 'Analysis',
  },
  {
    id: 'odds_accuracy',
    title: 'Sharp Eye',
    description: 'Find a match where model probability is 10%+ higher than implied odds.',
    xp: 200,
    difficulty: 'Hard',
    icon: Zap,
    color: '#f97316',
    category: 'Analysis',
  },
  {
    id: 'league_focus',
    title: 'League Deep Dive',
    description: 'Review all fixtures in the Premier League and identify the top pick.',
    xp: 100,
    difficulty: 'Easy',
    icon: Star,
    color: '#22c55e',
    category: 'Exploration',
  },
  {
    id: 'streak_builder',
    title: 'Streak Builder',
    description: 'Mark 5 picks from Ghost Model. Check back tomorrow to see their results.',
    xp: 300,
    difficulty: 'Hard',
    icon: Flame,
    color: '#ef4444',
    category: 'Challenge',
  },
  {
    id: 'narrative_reader',
    title: 'Know Your Edge',
    description: 'Read 5 Narrative Engine briefings and understand why each has an edge.',
    xp: 75,
    difficulty: 'Easy',
    icon: ChevronRight,
    color: '#a855f7',
    category: 'Learning',
  },
  {
    id: 'arb_finder',
    title: 'Risk-Free Radar',
    description: 'Run the Arbitrage Scanner and identify a 1%+ margin opportunity.',
    xp: 250,
    difficulty: 'Hard',
    icon: Trophy,
    color: '#fbbf24',
    category: 'Challenge',
  },
  {
    id: 'parlay_build',
    title: 'Parlay Architect',
    description: 'Construct a 3-leg correlated parlay using the Parlay Finder.',
    xp: 175,
    difficulty: 'Medium',
    icon: Gift,
    color: '#06b6d4',
    category: 'Analysis',
  },
];

const DIFFICULTY_COLORS = { Easy: 'var(--color-success)', Medium: 'var(--color-warning)', Hard: 'var(--color-danger)' };

const RANKS = [
  { name: 'Novice', xp: 0, icon: '🌱' },
  { name: 'Analyst', xp: 500, icon: '📊' },
  { name: 'Scout', xp: 1200, icon: '🔍' },
  { name: 'Edge Finder', xp: 2500, icon: '⚡' },
  { name: 'Sharp', xp: 5000, icon: '🎯' },
  { name: 'Legend', xp: 10000, icon: '🏆' },
];

export default function DailyChallenge() {
  const [completed, setCompleted] = useState(new Set());
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [streak, setStreak] = useState(4);

  useEffect(() => {
    (async () => {
      // Load from localStorage for persistence
      const saved = localStorage.getItem('sigma_challenges');
      if (saved) {
        const { completedIds, totalXp, st } = JSON.parse(saved);
        setCompleted(new Set(completedIds));
        setXp(totalXp || 0);
        setStreak(st || 0);
      }
      setLoading(false);
    })();
  }, []);

  const completeChallenge = (challenge) => {
    if (completed.has(challenge.id)) return;
    const newCompleted = new Set(completed);
    newCompleted.add(challenge.id);
    const newXp = xp + challenge.xp;
    setCompleted(newCompleted);
    setXp(newXp);
    // Persist
    localStorage.setItem('sigma_challenges', JSON.stringify({
      completedIds: [...newCompleted],
      totalXp: newXp,
      st: streak,
    }));
  };

  const currentRank = RANKS.filter(r => r.xp <= xp).pop() || RANKS[0];
  const nextRank = RANKS.find(r => r.xp > xp);
  const progressPct = nextRank ? Math.min(100, ((xp - currentRank.xp) / (nextRank.xp - currentRank.xp)) * 100) : 100;

  const daily = CHALLENGES.slice(0, 3);
  const weekly = CHALLENGES.slice(3);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Target size={24} className="inline mr-2 text-[var(--color-primary)]" />
            Daily Challenge
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Complete challenges to earn XP, level up your rank, and sharpen your analytical skills.
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Flame size={20} style={{ color: '#ef4444' }} />
            <div>
              <div className="text-lg font-black" style={{ color: '#ef4444' }}>{streak}</div>
              <div className="text-[10px]" style={{ color: '#ef444480' }}>Day Streak</div>
            </div>
          </div>
        )}
      </div>

      {/* Rank / XP bar */}
      <div className="fs-card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentRank.icon}</span>
            <div>
              <div className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{currentRank.name}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{xp.toLocaleString()} XP total</div>
            </div>
          </div>
          {nextRank && (
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Next: {nextRank.icon} {nextRank.name}</div>
              <div className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{(nextRank.xp - xp).toLocaleString()} XP to go</div>
            </div>
          )}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%`, background: 'var(--color-primary)' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--color-bg-elevated)', width: 'fit-content' }}>
        {['daily', 'weekly'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
            style={{
              background: activeTab === t ? 'var(--color-bg-card)' : 'transparent',
              color: activeTab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}>
            {t} challenges
          </button>
        ))}
      </div>

      {/* Challenges */}
      <div className="space-y-3">
        {(activeTab === 'daily' ? daily : weekly).map(c => {
          const done = completed.has(c.id);
          return (
            <div key={c.id} className="fs-card" style={{ opacity: done ? 0.65 : 1 }}>
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: c.color + '20', border: `1px solid ${c.color}40` }}>
                  <c.icon size={22} style={{ color: c.color }} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: DIFFICULTY_COLORS[c.difficulty] + '20', color: DIFFICULTY_COLORS[c.difficulty] }}>
                      {c.difficulty}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
                      {c.category}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.description}</p>
                </div>

                {/* XP + Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>+{c.xp} XP</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>reward</div>
                  </div>
                  {done ? (
                    <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                  ) : (
                    <button onClick={() => completeChallenge(c)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: c.color, color: '#fff' }}>
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All ranks */}
      <div className="fs-card mt-6">
        <div className="fs-card-header">
          <span className="fs-card-title"><Trophy size={16} className="inline mr-1" /> Rank Progression</span>
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {RANKS.map((r, i) => {
            const unlocked = xp >= r.xp;
            return (
              <div key={r.name} className="text-center px-3 py-2 rounded-xl flex-1 min-w-[80px]"
                style={{ background: unlocked ? 'rgba(99,102,241,0.12)' : 'var(--color-bg-elevated)', border: unlocked ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent' }}>
                <div className="text-xl">{r.icon}</div>
                <div className="text-xs font-semibold mt-1" style={{ color: unlocked ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{r.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{r.xp.toLocaleString()} XP</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
