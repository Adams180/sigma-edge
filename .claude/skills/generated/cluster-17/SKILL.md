---
name: cluster-17
description: "Skill for the Cluster_17 area of sigma-edge. 6 symbols across 1 files."
---

# Cluster_17

6 symbols | 1 files | Cohesion: 71%

## When to Use

- Understanding how team_id_from_name work
- Modifying cluster_17-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `ingest_csv.py` | team_id_from_name, _parse_date, _int, _float, _fetch_csv (+1) |

## Entry Points

Start here when exploring this area:

- **`team_id_from_name`** (Function) — `ingest_csv.py:48`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `team_id_from_name` | Function | `ingest_csv.py` | 48 |
| `_parse_date` | Function | `ingest_csv.py` | 60 |
| `_int` | Function | `ingest_csv.py` | 70 |
| `_float` | Function | `ingest_csv.py` | 77 |
| `_fetch_csv` | Function | `ingest_csv.py` | 84 |
| `_ingest_source` | Function | `ingest_csv.py` | 101 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 1 calls |
| Cluster_15 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "team_id_from_name"})` — see callers and callees
2. `gitnexus_query({query: "cluster_17"})` — find related execution flows
3. Read key files listed above for implementation details
