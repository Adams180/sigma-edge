---
name: cluster-9
description: "Skill for the Cluster_9 area of sigma-edge. 9 symbols across 3 files."
---

# Cluster_9

9 symbols | 3 files | Cohesion: 65%

## When to Use

- Understanding how corners_over_prob, cards_over_prob, ref_watch work
- Modifying cluster_9-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `probability_engine.py` | _referee_for_fixture, corners_over_prob, cards_over_prob, _team_id |
| `api.py` | ref_watch, fixture_detail, _prior_dict, _card_dict |
| `inefficiency_scanner.py` | _model_prob |

## Entry Points

Start here when exploring this area:

- **`corners_over_prob`** (Function) — `probability_engine.py:643`
- **`cards_over_prob`** (Function) — `probability_engine.py:667`
- **`ref_watch`** (Function) — `api.py:264`
- **`fixture_detail`** (Function) — `api.py:383`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `corners_over_prob` | Function | `probability_engine.py` | 643 |
| `cards_over_prob` | Function | `probability_engine.py` | 667 |
| `ref_watch` | Function | `api.py` | 264 |
| `fixture_detail` | Function | `api.py` | 383 |
| `_referee_for_fixture` | Function | `probability_engine.py` | 304 |
| `_team_id` | Function | `probability_engine.py` | 694 |
| `_model_prob` | Function | `inefficiency_scanner.py` | 294 |
| `_prior_dict` | Function | `api.py` | 405 |
| `_card_dict` | Function | `api.py` | 410 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Ref_watch → Get_conn` | cross_community | 6 |
| `Ref_watch → PoissonPrior` | cross_community | 6 |
| `Ref_watch → _safe_log` | cross_community | 6 |
| `Fixture_detail → Get_conn` | cross_community | 4 |
| `Fixture_detail → _safe_log` | cross_community | 4 |
| `Fixture_detail → PoissonPrior` | cross_community | 4 |
| `Fixture_detail → CardPrior` | cross_community | 4 |
| `Ref_watch → CardPrior` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 4 calls |
| Cluster_6 | 3 calls |
| Cluster_7 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "corners_over_prob"})` — see callers and callees
2. `gitnexus_query({query: "cluster_9"})` — find related execution flows
3. Read key files listed above for implementation details
