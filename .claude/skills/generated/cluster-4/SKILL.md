---
name: cluster-4
description: "Skill for the Cluster_4 area of sigma-edge. 15 symbols across 6 files."
---

# Cluster_4

15 symbols | 6 files | Cohesion: 55%

## When to Use

- Understanding how scheduler_status, apply_villarreal_elche_override, predict_cards work
- Modifying cluster_4-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `probability_engine.py` | __init__, _load_stats, apply_villarreal_elche_override, predict_cards, _key_players (+2) |
| `api.py` | upcoming_fixtures, all_fixtures, team_logos, health |
| `scheduler.py` | scheduler_status |
| `ingest_stats.py` | team_stat_history |
| `ingest_odds.py` | latest_odds |
| `database.py` | get_conn |

## Entry Points

Start here when exploring this area:

- **`scheduler_status`** (Function) — `scheduler.py:152`
- **`apply_villarreal_elche_override`** (Function) — `probability_engine.py:79`
- **`predict_cards`** (Function) — `probability_engine.py:106`
- **`team_stat_history`** (Function) — `ingest_stats.py:176`
- **`latest_odds`** (Function) — `ingest_odds.py:158`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `scheduler_status` | Function | `scheduler.py` | 152 |
| `apply_villarreal_elche_override` | Function | `probability_engine.py` | 79 |
| `predict_cards` | Function | `probability_engine.py` | 106 |
| `team_stat_history` | Function | `ingest_stats.py` | 176 |
| `latest_odds` | Function | `ingest_odds.py` | 158 |
| `get_conn` | Function | `database.py` | 121 |
| `upcoming_fixtures` | Function | `api.py` | 73 |
| `all_fixtures` | Function | `api.py` | 114 |
| `team_logos` | Function | `api.py` | 203 |
| `health` | Function | `api.py` | 466 |
| `__init__` | Function | `probability_engine.py` | 17 |
| `_load_stats` | Function | `probability_engine.py` | 23 |
| `_key_players` | Function | `probability_engine.py` | 355 |
| `_lineup_player_ids` | Function | `probability_engine.py` | 388 |
| `_injury_dock` | Function | `probability_engine.py` | 399 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Value_scanner → Get_conn` | cross_community | 7 |
| `Main → Get_conn` | cross_community | 6 |
| `Ref_watch → Get_conn` | cross_community | 6 |
| `Fixture_detail → Get_conn` | cross_community | 4 |
| `Main → Get_conn` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "scheduler_status"})` — see callers and callees
2. `gitnexus_query({query: "cluster_4"})` — find related execution flows
3. Read key files listed above for implementation details
