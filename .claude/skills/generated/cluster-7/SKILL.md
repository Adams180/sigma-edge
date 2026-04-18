---
name: cluster-7
description: "Skill for the Cluster_7 area of sigma-edge. 9 symbols across 1 files."
---

# Cluster_7

9 symbols | 1 files | Cohesion: 77%

## When to Use

- Understanding how poisson_over_prob work
- Modifying cluster_7-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `probability_engine.py` | _safe_log, _log_poisson_pmf, _log_poisson_ge, _logsumexp, _log_normalise (+4) |

## Entry Points

Start here when exploring this area:

- **`poisson_over_prob`** (Function) — `probability_engine.py:298`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `poisson_over_prob` | Function | `probability_engine.py` | 298 |
| `_safe_log` | Function | `probability_engine.py` | 190 |
| `_log_poisson_pmf` | Function | `probability_engine.py` | 194 |
| `_log_poisson_ge` | Function | `probability_engine.py` | 201 |
| `_logsumexp` | Function | `probability_engine.py` | 207 |
| `_log_normalise` | Function | `probability_engine.py` | 215 |
| `_exp_normalise` | Function | `probability_engine.py` | 221 |
| `_market_prior` | Function | `probability_engine.py` | 440 |
| `_poisson_wdl_likelihood` | Function | `probability_engine.py` | 577 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → Get_conn` | cross_community | 6 |
| `Main → _safe_log` | cross_community | 6 |
| `Value_scanner → _safe_log` | cross_community | 6 |
| `Ref_watch → _safe_log` | cross_community | 6 |
| `Fixture_detail → Get_conn` | cross_community | 4 |
| `Fixture_detail → _safe_log` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "poisson_over_prob"})` — see callers and callees
2. `gitnexus_query({query: "cluster_7"})` — find related execution flows
3. Read key files listed above for implementation details
