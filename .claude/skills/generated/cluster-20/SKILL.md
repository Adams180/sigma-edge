---
name: cluster-20
description: "Skill for the Cluster_20 area of sigma-edge. 12 symbols across 2 files."
---

# Cluster_20

12 symbols | 2 files | Cohesion: 84%

## When to Use

- Understanding how season_codes, download_csv, download_all work
- Modifying cluster_20-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backtest_v2.py` | LeagueParams, BacktestEngine, optimize_league, print_report, row (+3) |
| `csv_loader.py` | season_codes, download_csv, download_all, load_all_matches |

## Entry Points

Start here when exploring this area:

- **`season_codes`** (Function) — `csv_loader.py:52`
- **`download_csv`** (Function) — `csv_loader.py:65`
- **`download_all`** (Function) — `csv_loader.py:87`
- **`load_all_matches`** (Function) — `csv_loader.py:211`
- **`optimize_league`** (Function) — `backtest_v2.py:937`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LeagueParams` | Class | `backtest_v2.py` | 490 |
| `BacktestEngine` | Class | `backtest_v2.py` | 599 |
| `season_codes` | Function | `csv_loader.py` | 52 |
| `download_csv` | Function | `csv_loader.py` | 65 |
| `download_all` | Function | `csv_loader.py` | 87 |
| `load_all_matches` | Function | `csv_loader.py` | 211 |
| `optimize_league` | Function | `backtest_v2.py` | 937 |
| `print_report` | Function | `backtest_v2.py` | 998 |
| `row` | Function | `backtest_v2.py` | 1001 |
| `save_json` | Function | `backtest_v2.py` | 1100 |
| `main` | Function | `backtest_v2.py` | 1159 |
| `_print_calibration` | Function | `backtest_v2.py` | 1076 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Season_codes` | cross_community | 5 |
| `Main → Download_csv` | cross_community | 5 |
| `Main → _parse_date` | cross_community | 5 |
| `Main → _safe_int` | cross_community | 5 |
| `Main → _safe_float` | cross_community | 5 |
| `Main → BacktestResult` | cross_community | 4 |
| `Main → Record` | cross_community | 4 |
| `Main → IsotonicCalibrator` | cross_community | 4 |
| `Main → Season_codes` | intra_community | 4 |
| `Main → Download_csv` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_13 | 2 calls |
| Cluster_21 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "season_codes"})` — see callers and callees
2. `gitnexus_query({query: "cluster_20"})` — find related execution flows
3. Read key files listed above for implementation details
