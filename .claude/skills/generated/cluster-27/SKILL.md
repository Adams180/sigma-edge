---
name: cluster-27
description: "Skill for the Cluster_27 area of sigma-edge. 7 symbols across 1 files."
---

# Cluster_27

7 symbols | 1 files | Cohesion: 89%

## When to Use

- Understanding how poisson_wdl, poisson_over_prob work
- Modifying cluster_27-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backtest.py` | _log_poisson_pmf, _logsumexp, poisson_wdl, poisson_over_prob, _team_lambda (+2) |

## Entry Points

Start here when exploring this area:

- **`poisson_wdl`** (Function) — `backtest.py:62`
- **`poisson_over_prob`** (Function) — `backtest.py:84`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `poisson_wdl` | Function | `backtest.py` | 62 |
| `poisson_over_prob` | Function | `backtest.py` | 84 |
| `_log_poisson_pmf` | Function | `backtest.py` | 49 |
| `_logsumexp` | Function | `backtest.py` | 55 |
| `_team_lambda` | Function | `backtest.py` | 202 |
| `_scan_corners` | Function | `backtest.py` | 390 |
| `_scan_cards` | Function | `backtest.py` | 420 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Run → _log_poisson_pmf` | cross_community | 4 |
| `Run → _logsumexp` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "poisson_wdl"})` — see callers and callees
2. `gitnexus_query({query: "cluster_27"})` — find related execution flows
3. Read key files listed above for implementation details
