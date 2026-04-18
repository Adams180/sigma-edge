---
name: cluster-11
description: "Skill for the Cluster_11 area of sigma-edge. 7 symbols across 3 files."
---

# Cluster_11

7 symbols | 3 files | Cohesion: 70%

## When to Use

- Understanding how scan_all, print_signals, main work
- Modifying cluster_11-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `predictor.py` | LivePredictor, scan_all, print_signals, main |
| `api.py` | _get_predictor, v2_signals |
| `odds_api.py` | get_odds |

## Entry Points

Start here when exploring this area:

- **`scan_all`** (Function) — `predictor.py:369`
- **`print_signals`** (Function) — `predictor.py:413`
- **`main`** (Function) — `predictor.py:445`
- **`get_odds`** (Function) — `odds_api.py:59`
- **`v2_signals`** (Function) — `api.py:515`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LivePredictor` | Class | `predictor.py` | 157 |
| `scan_all` | Function | `predictor.py` | 369 |
| `print_signals` | Function | `predictor.py` | 413 |
| `main` | Function | `predictor.py` | 445 |
| `get_odds` | Function | `odds_api.py` | 59 |
| `v2_signals` | Function | `api.py` | 515 |
| `_get_predictor` | Function | `api.py` | 504 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Season_codes` | cross_community | 5 |
| `Main → Download_csv` | cross_community | 5 |
| `Main → _parse_date` | cross_community | 5 |
| `Main → _safe_int` | cross_community | 5 |
| `Main → _safe_float` | cross_community | 5 |
| `Main → _log_poisson_pmf` | cross_community | 5 |
| `Main → _validate_key` | cross_community | 5 |
| `Main → _decay_avg` | cross_community | 4 |
| `Main → _league_avg` | cross_community | 4 |
| `Main → Form_factor` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_13 | 2 calls |
| Cluster_10 | 1 calls |
| Cluster_14 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "scan_all"})` — see callers and callees
2. `gitnexus_query({query: "cluster_11"})` — find related execution flows
3. Read key files listed above for implementation details
