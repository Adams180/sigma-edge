---
name: components
description: "Skill for the Components area of sigma-edge. 11 symbols across 5 files."
---

# Components

11 symbols | 5 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how useFetch, ValueScanner, RefWatch work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/src/components/ValueScanner.jsx` | marketLabel, formatKickoff, ValueScanner |
| `frontend/src/components/RefWatch.jsx` | cardClass, formatKickoff, RefWatch |
| `frontend/src/components/LiveFeed.jsx` | formatKickoff, LiveFeed |
| `frontend/src/components/LineupAlerts.jsx` | formatKickoff, LineupAlerts |
| `frontend/src/hooks.js` | useFetch |

## Entry Points

Start here when exploring this area:

- **`useFetch`** (Function) — `frontend/src/hooks.js:2`
- **`ValueScanner`** (Function) — `frontend/src/components/ValueScanner.jsx:19`
- **`RefWatch`** (Function) — `frontend/src/components/RefWatch.jsx:18`
- **`LiveFeed`** (Function) — `frontend/src/components/LiveFeed.jsx:12`
- **`LineupAlerts`** (Function) — `frontend/src/components/LineupAlerts.jsx:12`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useFetch` | Function | `frontend/src/hooks.js` | 2 |
| `ValueScanner` | Function | `frontend/src/components/ValueScanner.jsx` | 19 |
| `RefWatch` | Function | `frontend/src/components/RefWatch.jsx` | 18 |
| `LiveFeed` | Function | `frontend/src/components/LiveFeed.jsx` | 12 |
| `LineupAlerts` | Function | `frontend/src/components/LineupAlerts.jsx` | 12 |
| `marketLabel` | Function | `frontend/src/components/ValueScanner.jsx` | 3 |
| `formatKickoff` | Function | `frontend/src/components/ValueScanner.jsx` | 10 |
| `cardClass` | Function | `frontend/src/components/RefWatch.jsx` | 3 |
| `formatKickoff` | Function | `frontend/src/components/RefWatch.jsx` | 9 |
| `formatKickoff` | Function | `frontend/src/components/LiveFeed.jsx` | 3 |
| `formatKickoff` | Function | `frontend/src/components/LineupAlerts.jsx` | 3 |

## How to Explore

1. `gitnexus_context({name: "useFetch"})` — see callers and callees
2. `gitnexus_query({query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
