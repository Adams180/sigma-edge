---
name: cluster-10
description: "Skill for the Cluster_10 area of sigma-edge. 5 symbols across 1 files."
---

# Cluster_10

5 symbols | 1 files | Cohesion: 53%

## When to Use

- Understanding how scan_fixture, scan_from_events, LiveSignal work
- Modifying cluster_10-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `predictor.py` | LiveSignal, _resolve_team, _best_odds, scan_fixture, scan_from_events |

## Entry Points

Start here when exploring this area:

- **`scan_fixture`** (Function) — `predictor.py:215`
- **`scan_from_events`** (Function) — `predictor.py:400`
- **`LiveSignal`** (Class) — `predictor.py:112`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LiveSignal` | Class | `predictor.py` | 112 |
| `scan_fixture` | Function | `predictor.py` | 215 |
| `scan_from_events` | Function | `predictor.py` | 400 |
| `_resolve_team` | Function | `predictor.py` | 132 |
| `_best_odds` | Function | `predictor.py` | 137 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_14 | 3 calls |
| Cluster_26 | 1 calls |
| Cluster_13 | 1 calls |
| Cluster_25 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "scan_fixture"})` — see callers and callees
2. `gitnexus_query({query: "cluster_10"})` — find related execution flows
3. Read key files listed above for implementation details
