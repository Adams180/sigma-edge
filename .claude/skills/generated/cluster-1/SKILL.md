---
name: cluster-1
description: "Skill for the Cluster_1 area of sigma-edge. 9 symbols across 6 files."
---

# Cluster_1

9 symbols | 6 files | Cohesion: 75%

## When to Use

- Understanding how start_scheduler, main, ingest_all_odds work
- Modifying cluster_1-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `ingest_lineups.py` | _upcoming_fixtures, poll_upcoming_lineups, start_lineup_watcher |
| `main.py` | _setup_logging, main |
| `scheduler.py` | start_scheduler |
| `ingest_odds.py` | ingest_all_odds |
| `database.py` | init_db |
| `api.py` | _startup |

## Entry Points

Start here when exploring this area:

- **`start_scheduler`** (Function) — `scheduler.py:67`
- **`main`** (Function) — `main.py:40`
- **`ingest_all_odds`** (Function) — `ingest_odds.py:146`
- **`poll_upcoming_lineups`** (Function) — `ingest_lineups.py:136`
- **`start_lineup_watcher`** (Function) — `ingest_lineups.py:155`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `start_scheduler` | Function | `scheduler.py` | 67 |
| `main` | Function | `main.py` | 40 |
| `ingest_all_odds` | Function | `ingest_odds.py` | 146 |
| `poll_upcoming_lineups` | Function | `ingest_lineups.py` | 136 |
| `start_lineup_watcher` | Function | `ingest_lineups.py` | 155 |
| `init_db` | Function | `database.py` | 114 |
| `_setup_logging` | Function | `main.py` | 31 |
| `_upcoming_fixtures` | Function | `ingest_lineups.py` | 20 |
| `_startup` | Function | `api.py` | 57 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Main → _validate_key` | cross_community | 6 |
| `Main → _upsert_team` | cross_community | 5 |
| `Main → _throttle` | cross_community | 5 |
| `Main → _validate_key` | cross_community | 5 |
| `Main → _throttle` | cross_community | 5 |
| `Main → Get_conn` | cross_community | 4 |
| `Main → _match_fixture_id` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_2 | 2 calls |
| Cluster_4 | 2 calls |
| Cluster_14 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "start_scheduler"})` — see callers and callees
2. `gitnexus_query({query: "cluster_1"})` — find related execution flows
3. Read key files listed above for implementation details
