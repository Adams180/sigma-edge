---
name: cluster-18
description: "Skill for the Cluster_18 area of sigma-edge. 6 symbols across 1 files."
---

# Cluster_18

6 symbols | 1 files | Cohesion: 67%

## When to Use

- Understanding how kelly_fraction, fractional_kelly, TradeSignal work
- Modifying cluster_18-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `inefficiency_scanner.py` | TradeSignal, kelly_fraction, fractional_kelly, _scan_fixture, _fixture_meta (+1) |

## Entry Points

Start here when exploring this area:

- **`kelly_fraction`** (Function) — `inefficiency_scanner.py:137`
- **`fractional_kelly`** (Function) — `inefficiency_scanner.py:149`
- **`TradeSignal`** (Class) — `inefficiency_scanner.py:55`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TradeSignal` | Class | `inefficiency_scanner.py` | 55 |
| `kelly_fraction` | Function | `inefficiency_scanner.py` | 137 |
| `fractional_kelly` | Function | `inefficiency_scanner.py` | 149 |
| `_scan_fixture` | Function | `inefficiency_scanner.py` | 221 |
| `_fixture_meta` | Function | `inefficiency_scanner.py` | 344 |
| `_latest_odds` | Function | `inefficiency_scanner.py` | 371 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Value_scanner → Get_conn` | cross_community | 7 |
| `Value_scanner → PoissonPrior` | cross_community | 7 |
| `Main → Get_conn` | cross_community | 6 |
| `Main → _safe_log` | cross_community | 6 |
| `Main → PoissonPrior` | cross_community | 6 |
| `Value_scanner → _safe_log` | cross_community | 6 |
| `Main → MatchProbabilities` | cross_community | 5 |
| `Value_scanner → MatchProbabilities` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 2 calls |
| Cluster_6 | 1 calls |
| Cluster_9 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "kelly_fraction"})` — see callers and callees
2. `gitnexus_query({query: "cluster_18"})` — find related execution flows
3. Read key files listed above for implementation details
