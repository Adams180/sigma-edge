---
name: cluster-6
description: "Skill for the Cluster_6 area of sigma-edge. 9 symbols across 2 files."
---

# Cluster_6

9 symbols | 2 files | Cohesion: 61%

## When to Use

- Understanding how evaluate, lineup_alerts, PoissonPrior work
- Modifying cluster_6-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `probability_engine.py` | PoissonPrior, CardPrior, MatchProbabilities, _poisson_prior, _goals_prior (+3) |
| `api.py` | lineup_alerts |

## Entry Points

Start here when exploring this area:

- **`evaluate`** (Function) — `probability_engine.py:476`
- **`lineup_alerts`** (Function) — `api.py:320`
- **`PoissonPrior`** (Class) — `probability_engine.py:135`
- **`CardPrior`** (Class) — `probability_engine.py:145`
- **`MatchProbabilities`** (Class) — `probability_engine.py:155`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PoissonPrior` | Class | `probability_engine.py` | 135 |
| `CardPrior` | Class | `probability_engine.py` | 145 |
| `MatchProbabilities` | Class | `probability_engine.py` | 155 |
| `evaluate` | Function | `probability_engine.py` | 476 |
| `lineup_alerts` | Function | `api.py` | 320 |
| `_poisson_prior` | Function | `probability_engine.py` | 242 |
| `_goals_prior` | Function | `probability_engine.py` | 275 |
| `_card_prior` | Function | `probability_engine.py` | 316 |
| `_card_likelihood_signal` | Function | `probability_engine.py` | 613 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Value_scanner → Get_conn` | cross_community | 7 |
| `Value_scanner → PoissonPrior` | cross_community | 7 |
| `Main → Get_conn` | cross_community | 6 |
| `Main → _safe_log` | cross_community | 6 |
| `Main → PoissonPrior` | cross_community | 6 |
| `Value_scanner → _safe_log` | cross_community | 6 |
| `Ref_watch → Get_conn` | cross_community | 6 |
| `Ref_watch → PoissonPrior` | cross_community | 6 |
| `Main → MatchProbabilities` | cross_community | 5 |
| `Value_scanner → MatchProbabilities` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 5 calls |
| Cluster_7 | 3 calls |
| Cluster_9 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "evaluate"})` — see callers and callees
2. `gitnexus_query({query: "cluster_6"})` — find related execution flows
3. Read key files listed above for implementation details
