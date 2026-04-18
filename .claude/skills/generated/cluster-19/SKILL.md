---
name: cluster-19
description: "Skill for the Cluster_19 area of sigma-edge. 8 symbols across 2 files."
---

# Cluster_19

8 symbols | 2 files | Cohesion: 84%

## When to Use

- Understanding how summary_text, scan, main work
- Modifying cluster_19-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `inefficiency_scanner.py` | TradeReport, summary_text, _market_label, InefficiencyScanner, scan (+2) |
| `api.py` | value_scanner |

## Entry Points

Start here when exploring this area:

- **`summary_text`** (Function) — `inefficiency_scanner.py:89`
- **`scan`** (Function) — `inefficiency_scanner.py:191`
- **`main`** (Function) — `inefficiency_scanner.py:393`
- **`value_scanner`** (Function) — `api.py:216`
- **`TradeReport`** (Class) — `inefficiency_scanner.py:80`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TradeReport` | Class | `inefficiency_scanner.py` | 80 |
| `InefficiencyScanner` | Class | `inefficiency_scanner.py` | 171 |
| `summary_text` | Function | `inefficiency_scanner.py` | 89 |
| `scan` | Function | `inefficiency_scanner.py` | 191 |
| `main` | Function | `inefficiency_scanner.py` | 393 |
| `value_scanner` | Function | `api.py` | 216 |
| `_market_label` | Function | `inefficiency_scanner.py` | 123 |
| `_upcoming_fixture_ids` | Function | `inefficiency_scanner.py` | 334 |

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
| Cluster_18 | 1 calls |
| Cluster_4 | 1 calls |
| Cluster_1 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "summary_text"})` — see callers and callees
2. `gitnexus_query({query: "cluster_19"})` — find related execution flows
3. Read key files listed above for implementation details
