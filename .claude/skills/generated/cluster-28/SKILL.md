---
name: cluster-28
description: "Skill for the Cluster_28 area of sigma-edge. 8 symbols across 1 files."
---

# Cluster_28

8 symbols | 1 files | Cohesion: 84%

## When to Use

- Understanding how kelly_fraction_calc, run, Signal work
- Modifying cluster_28-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backtest.py` | kelly_fraction_calc, Signal, BacktestResult, _record_match, _attack_defense_lambda (+3) |

## Entry Points

Start here when exploring this area:

- **`kelly_fraction_calc`** (Function) — `backtest.py:90`
- **`run`** (Function) — `backtest.py:456`
- **`Signal`** (Class) — `backtest.py:102`
- **`BacktestResult`** (Class) — `backtest.py:125`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `Signal` | Class | `backtest.py` | 102 |
| `BacktestResult` | Class | `backtest.py` | 125 |
| `kelly_fraction_calc` | Function | `backtest.py` | 90 |
| `run` | Function | `backtest.py` | 456 |
| `_record_match` | Function | `backtest.py` | 210 |
| `_attack_defense_lambda` | Function | `backtest.py` | 248 |
| `_scan_h2h` | Function | `backtest.py` | 286 |
| `_collect_calibration` | Function | `backtest.py` | 567 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → _attack_defense_lambda` | cross_community | 4 |
| `Main → Kelly_fraction_calc` | cross_community | 4 |
| `Main → Signal` | cross_community | 4 |
| `Run → _log_poisson_pmf` | cross_community | 4 |
| `Run → _logsumexp` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_27 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "kelly_fraction_calc"})` — see callers and callees
2. `gitnexus_query({query: "cluster_28"})` — find related execution flows
3. Read key files listed above for implementation details
