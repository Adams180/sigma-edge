---
name: cluster-2
description: "Skill for the Cluster_2 area of sigma-edge. 18 symbols across 5 files."
---

# Cluster_2

18 symbols | 5 files | Cohesion: 78%

## When to Use

- Understanding how ingest_fixtures, ingest_all_historical_stats, ingest_logos work
- Modifying cluster_2-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `api_football.py` | _throttle, _validate_key, get, get_fixtures, get_fixture_lineups (+4) |
| `ingest_stats.py` | _upsert_team, _upsert_fixture, ingest_fixtures, ingest_all_historical_stats |
| `ingest_logos.py` | _normalise, ingest_logos |
| `ingest_lineups.py` | _previous_lineup, fetch_and_store_lineups |
| `scheduler.py` | _job_logos |

## Entry Points

Start here when exploring this area:

- **`ingest_fixtures`** (Function) — `ingest_stats.py:73`
- **`ingest_all_historical_stats`** (Function) — `ingest_stats.py:144`
- **`ingest_logos`** (Function) — `ingest_logos.py:52`
- **`fetch_and_store_lineups`** (Function) — `ingest_lineups.py:50`
- **`get`** (Function) — `api_football.py:36`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ingest_fixtures` | Function | `ingest_stats.py` | 73 |
| `ingest_all_historical_stats` | Function | `ingest_stats.py` | 144 |
| `ingest_logos` | Function | `ingest_logos.py` | 52 |
| `fetch_and_store_lineups` | Function | `ingest_lineups.py` | 50 |
| `get` | Function | `api_football.py` | 36 |
| `get_fixtures` | Function | `api_football.py` | 69 |
| `get_fixture_lineups` | Function | `api_football.py` | 80 |
| `get_teams` | Function | `api_football.py` | 93 |
| `get_fixture_detail` | Function | `api_football.py` | 98 |
| `get_player_stats` | Function | `api_football.py` | 103 |
| `get_team_players` | Function | `api_football.py` | 108 |
| `_job_logos` | Function | `scheduler.py` | 98 |
| `_upsert_team` | Function | `ingest_stats.py` | 17 |
| `_upsert_fixture` | Function | `ingest_stats.py` | 25 |
| `_normalise` | Function | `ingest_logos.py` | 21 |
| `_previous_lineup` | Function | `ingest_lineups.py` | 39 |
| `_throttle` | Function | `api_football.py` | 20 |
| `_validate_key` | Function | `api_football.py` | 28 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → _validate_key` | cross_community | 6 |
| `Main → _upsert_team` | cross_community | 5 |
| `Main → _throttle` | cross_community | 5 |
| `Main → Get_conn` | cross_community | 4 |
| `Ingest_stats_for_fixture → _validate_key` | cross_community | 4 |
| `Ingest_stats_for_fixture → _throttle` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 5 calls |
| Cluster_16 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ingest_fixtures"})` — see callers and callees
2. `gitnexus_query({query: "cluster_2"})` — find related execution flows
3. Read key files listed above for implementation details
