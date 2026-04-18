---
name: cluster-13
description: "Skill for the Cluster_13 area of sigma-edge. 8 symbols across 2 files."
---

# Cluster_13

8 symbols | 2 files | Cohesion: 63%

## When to Use

- Understanding how initialize, dixon_coles_wdl, fit work
- Modifying cluster_13-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backtest_v2.py` | dixon_coles_wdl, IsotonicCalibrator, fit, record, BacktestResult (+2) |
| `predictor.py` | initialize |

## Entry Points

Start here when exploring this area:

- **`initialize`** (Function) — `predictor.py:172`
- **`dixon_coles_wdl`** (Function) — `backtest_v2.py:59`
- **`fit`** (Function) — `backtest_v2.py:136`
- **`record`** (Function) — `backtest_v2.py:247`
- **`run`** (Function) — `backtest_v2.py:625`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `IsotonicCalibrator` | Class | `backtest_v2.py` | 121 |
| `BacktestResult` | Class | `backtest_v2.py` | 454 |
| `initialize` | Function | `predictor.py` | 172 |
| `dixon_coles_wdl` | Function | `backtest_v2.py` | 59 |
| `fit` | Function | `backtest_v2.py` | 136 |
| `record` | Function | `backtest_v2.py` | 247 |
| `run` | Function | `backtest_v2.py` | 625 |
| `_collect_raw_predictions` | Function | `backtest_v2.py` | 759 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Season_codes` | cross_community | 5 |
| `Main → Download_csv` | cross_community | 5 |
| `Main → _parse_date` | cross_community | 5 |
| `Main → _safe_int` | cross_community | 5 |
| `Main → _safe_float` | cross_community | 5 |
| `Main → _log_poisson_pmf` | cross_community | 5 |
| `Run → _log_poisson_pmf` | cross_community | 5 |
| `Main → BacktestResult` | cross_community | 4 |
| `Main → Record` | cross_community | 4 |
| `Main → IsotonicCalibrator` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_26 | 2 calls |
| Cluster_20 | 1 calls |
| Cluster_14 | 1 calls |
| Cluster_24 | 1 calls |
| Cluster_25 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "initialize"})` — see callers and callees
2. `gitnexus_query({query: "cluster_13"})` — find related execution flows
3. Read key files listed above for implementation details
