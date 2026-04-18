---
name: cluster-29
description: "Skill for the Cluster_29 area of sigma-edge. 5 symbols across 1 files."
---

# Cluster_29

5 symbols | 1 files | Cohesion: 80%

## When to Use

- Understanding how print_report, print_calibration, save_report_json work
- Modifying cluster_29-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backtest.py` | BacktestEngine, print_report, print_calibration, save_report_json, main |

## Entry Points

Start here when exploring this area:

- **`print_report`** (Function) — `backtest.py:588`
- **`print_calibration`** (Function) — `backtest.py:634`
- **`save_report_json`** (Function) — `backtest.py:660`
- **`main`** (Function) — `backtest.py:712`
- **`BacktestEngine`** (Class) — `backtest.py:164`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BacktestEngine` | Class | `backtest.py` | 164 |
| `print_report` | Function | `backtest.py` | 588 |
| `print_calibration` | Function | `backtest.py` | 634 |
| `save_report_json` | Function | `backtest.py` | 660 |
| `main` | Function | `backtest.py` | 712 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Season_codes` | cross_community | 4 |
| `Main → Download_csv` | cross_community | 4 |
| `Main → _parse_date` | cross_community | 4 |
| `Main → _safe_int` | cross_community | 4 |
| `Main → _safe_float` | cross_community | 4 |
| `Main → _attack_defense_lambda` | cross_community | 4 |
| `Main → Kelly_fraction_calc` | cross_community | 4 |
| `Main → Signal` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_20 | 1 calls |
| Cluster_28 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "print_report"})` — see callers and callees
2. `gitnexus_query({query: "cluster_29"})` — find related execution flows
3. Read key files listed above for implementation details
