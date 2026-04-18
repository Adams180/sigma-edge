---
name: cluster-14
description: "Skill for the Cluster_14 area of sigma-edge. 7 symbols across 2 files."
---

# Cluster_14

7 symbols | 2 files | Cohesion: 58%

## When to Use

- Understanding how get, get_events, ingest_odds_for_sport work
- Modifying cluster_14-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `odds_api.py` | _throttle, _validate_key, get, get_events |
| `ingest_odds.py` | _match_fixture_id, _store_odds, ingest_odds_for_sport |

## Entry Points

Start here when exploring this area:

- **`get`** (Function) — `odds_api.py:34`
- **`get_events`** (Function) — `odds_api.py:79`
- **`ingest_odds_for_sport`** (Function) — `ingest_odds.py:103`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `get` | Function | `odds_api.py` | 34 |
| `get_events` | Function | `odds_api.py` | 79 |
| `ingest_odds_for_sport` | Function | `ingest_odds.py` | 103 |
| `_throttle` | Function | `odds_api.py` | 18 |
| `_validate_key` | Function | `odds_api.py` | 26 |
| `_match_fixture_id` | Function | `ingest_odds.py` | 43 |
| `_store_odds` | Function | `ingest_odds.py` | 71 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → _validate_key` | cross_community | 5 |
| `Main → _throttle` | cross_community | 5 |
| `Main → _validate_key` | cross_community | 5 |
| `Main → _match_fixture_id` | cross_community | 4 |
| `Main → _throttle` | cross_community | 4 |
| `Ingest_odds_for_sport → _validate_key` | cross_community | 4 |
| `Ingest_odds_for_sport → _throttle` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_11 | 1 calls |
| Cluster_4 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "get"})` — see callers and callees
2. `gitnexus_query({query: "cluster_14"})` — find related execution flows
3. Read key files listed above for implementation details
