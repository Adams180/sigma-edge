---
name: pages
description: "Skill for the Pages area of sigma-edge. 66 symbols across 28 files."
---

# Pages

66 symbols | 28 files | Cohesion: 95%

## When to Use

- Working with code in `frontend/`
- Understanding how ValueScanner, load, SignalHistory work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/pages/Performance.jsx` | formatPct, formatMoney, Performance, exportCSV, exportJSON |
| `frontend/src/pages/SmartAlerts.jsx` | SmartAlerts, toggleAlert, deleteAlert, toggleCondition |
| `frontend/src/pages/NarrativeEngine.jsx` | NarrativeEngine, load, generateNarrative, generateFactors |
| `frontend/src/pages/ValueScanner.jsx` | formatKickoff, ValueScanner, load |
| `frontend/src/pages/SignalHistory.jsx` | SignalHistory, toggleSort, SortBtn |
| `frontend/src/pages/TimeMachine.jsx` | TimeMachine, load, navigate |
| `frontend/src/pages/WeatherEdge.jsx` | weatherImpactRules, getSimulatedWeather, WeatherEdge |
| `frontend/src/pages/RefWatch.jsx` | threatLevel, RefWatch, toggleSort |
| `frontend/src/pages/Fixtures.jsx` | groupByDate, formatDateHeading, Fixtures |
| `frontend/src/pages/CorrelatedParlayFinder.jsx` | CorrelatedParlayFinder, load, buildParlay |

## Entry Points

Start here when exploring this area:

- **`ValueScanner`** (Function) — `frontend/src/pages/ValueScanner.jsx:12`
- **`load`** (Function) — `frontend/src/pages/ValueScanner.jsx:23`
- **`SignalHistory`** (Function) — `frontend/src/pages/SignalHistory.jsx:6`
- **`SettingsPage`** (Function) — `frontend/src/pages/SettingsPage.jsx:66`
- **`handleUpgrade`** (Function) — `frontend/src/pages/SettingsPage.jsx:78`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ValueScanner` | Function | `frontend/src/pages/ValueScanner.jsx` | 12 |
| `load` | Function | `frontend/src/pages/ValueScanner.jsx` | 23 |
| `SignalHistory` | Function | `frontend/src/pages/SignalHistory.jsx` | 6 |
| `SettingsPage` | Function | `frontend/src/pages/SettingsPage.jsx` | 66 |
| `handleUpgrade` | Function | `frontend/src/pages/SettingsPage.jsx` | 78 |
| `useTier` | Function | `frontend/src/hooks/useTier.js` | 12 |
| `toggleTheme` | Function | `frontend/src/contexts/ThemeContext.jsx` | 19 |
| `Dashboard` | Function | `frontend/src/pages/Dashboard.jsx` | 37 |
| `AuthPage` | Function | `frontend/src/pages/AuthPage.jsx` | 4 |
| `useAuth` | Function | `frontend/src/contexts/AuthContext.jsx` | 76 |
| `TopBar` | Function | `frontend/src/components/layout/TopBar.jsx` | 4 |
| `Sidebar` | Function | `frontend/src/components/layout/Sidebar.jsx` | 92 |
| `Performance` | Function | `frontend/src/pages/Performance.jsx` | 39 |
| `TimeMachine` | Function | `frontend/src/pages/TimeMachine.jsx` | 5 |
| `load` | Function | `frontend/src/pages/TimeMachine.jsx` | 13 |
| `navigate` | Function | `frontend/src/pages/TimeMachine.jsx` | 28 |
| `ProGate` | Function | `frontend/src/components/ui/ProGate.jsx` | 9 |
| `SmartAlerts` | Function | `frontend/src/pages/SmartAlerts.jsx` | 17 |
| `toggleAlert` | Function | `frontend/src/pages/SmartAlerts.jsx` | 32 |
| `deleteAlert` | Function | `frontend/src/pages/SmartAlerts.jsx` | 33 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SettingsPage → UseAuth` | cross_community | 3 |
| `ValueScanner → UseAuth` | cross_community | 3 |

## How to Explore

1. `gitnexus_context({name: "ValueScanner"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
