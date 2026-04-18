---
name: cluster-0
description: "Skill for the Cluster_0 area of sigma-edge. 6 symbols across 2 files."
---

# Cluster_0

6 symbols | 2 files | Cohesion: 71%

## When to Use

- Understanding how ingest_csv_all, db_has_data work
- Modifying cluster_0-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scheduler.py` | _job_seed_csv, _job_upcoming, _job_daily_csv, _initial_seed |
| `ingest_csv.py` | ingest_csv_all, db_has_data |

## Entry Points

Start here when exploring this area:

- **`ingest_csv_all`** (Function) — `ingest_csv.py:215`
- **`db_has_data`** (Function) — `ingest_csv.py:225`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ingest_csv_all` | Function | `ingest_csv.py` | 215 |
| `db_has_data` | Function | `ingest_csv.py` | 225 |
| `_job_seed_csv` | Function | `scheduler.py` | 32 |
| `_job_upcoming` | Function | `scheduler.py` | 43 |
| `_job_daily_csv` | Function | `scheduler.py` | 54 |
| `_initial_seed` | Function | `scheduler.py` | 121 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_15 | 1 calls |
| Cluster_2 | 1 calls |
| Cluster_17 | 1 calls |
| Cluster_4 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "ingest_csv_all"})` — see callers and callees
2. `gitnexus_query({query: "cluster_0"})` — find related execution flows
3. Read key files listed above for implementation details
