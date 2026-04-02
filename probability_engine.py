from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Sequence

from database import get_conn

log = logging.getLogger(__name__)


class PlayerValueEngine:
    """
    Computes injury impact and lambda adjustment for missing players.
    Implements the Bayesian update for player absences by position.
    """
    def __init__(self, team_id: int, fixture_id: int, season: int):
        self.team_id = team_id
        self.fixture_id = fixture_id
        self.season = season
        self._load_stats()

    def _load_stats(self):
        # Load team and player stats from DB
        with get_conn() as conn:
            self.team_xg = conn.execute(
                """SELECT SUM(total_xg) as sxg FROM player_stats WHERE team_id=? AND season=?""",
                (self.team_id, self.season),
            ).fetchone()["sxg"] or 1.0
            self.team_xt = conn.execute(
                """SELECT SUM(total_xg) as sxt FROM player_stats WHERE team_id=? AND season=?""",
                (self.team_id, self.season),
            ).fetchone()["sxt"] or 1.0
            self.team_def = conn.execute(
                """SELECT SUM(def_actions) as sdef FROM player_stats WHERE team_id=? AND season=?""",
                (self.team_id, self.season),
            ).fetchone()
            self.team_def = self.team_def["sdef"] if self.team_def and self.team_def["sdef"] is not None else 1.0

            # Get all players and their stats
            self.players = {}
            rows = conn.execute(
                """SELECT player_id, player_name, position, total_xg, total_xt, def_actions FROM player_stats WHERE team_id=? AND season=?""",
                (self.team_id, self.season),
            ).fetchall()
            for r in rows:
                self.players[r["player_id"]] = dict(r)

            # Get starters for this fixture
            starter_rows = conn.execute(
                """SELECT player_id FROM lineups WHERE fixture_id=? AND team_id=? AND is_starter=1 ORDER BY fetched_at DESC""",
                (self.fixture_id, self.team_id),
            ).fetchall()
            self.starters = {r["player_id"] for r in starter_rows}

    def missing_players(self):
        # Return list of missing player dicts
        return [p for pid, p in self.players.items() if pid not in self.starters]

    def lambda_adjustment(self, lambda_old: float) -> float:
        """
        For each missing player, compute ImpactScore and adjust lambda.
        """
        lam = lambda_old
        for p in self.missing_players():
            pos = (p.get("position") or "").lower()
            if "fwd" in pos or "att" in pos:
                impact = (p.get("total_xg", 0.0) / self.team_xg) + 0.05
            elif "mid" in pos:
                impact = (p.get("total_xt", 0.0) / (self.team_xt or 1.0)) + 0.03
            elif "def" in pos:
                impact = (p.get("def_actions", 0.0) / (self.team_def or 1.0)) + 0.02
            else:
                impact = 0.01
            lam = lam * (1 - impact)
        return lam

# ── Villarreal/Elche defensive override ──
def apply_villarreal_elche_override(fixture_id: int, home_id: int, away_id: int, season: int, lam_away: float) -> float:
    """
    If Villarreal is missing 4 defenders, increase Elche Over 0.5 Goals by 12.4%.
    """
    with get_conn() as conn:
        home_team = conn.execute("SELECT name FROM teams WHERE team_id=?", (home_id,)).fetchone()
        away_team = conn.execute("SELECT name FROM teams WHERE team_id=?", (away_id,)).fetchone()
        if not home_team or not away_team:
            return lam_away
        if home_team["name"].lower().startswith("villarreal") and away_team["name"].lower().startswith("elche"):
            # Count missing defenders
            starters = conn.execute(
                "SELECT player_id FROM lineups WHERE fixture_id=? AND team_id=? AND is_starter=1 ORDER BY fetched_at DESC",
                (fixture_id, home_id),
            ).fetchall()
            starters = {r["player_id"] for r in starters}
            defenders = conn.execute(
                "SELECT player_id FROM player_stats WHERE team_id=? AND season=? AND position LIKE '%Def%'",
                (home_id, season),
            ).fetchall()
            defenders = {r["player_id"] for r in defenders}
            missing = defenders - starters
            if len(missing) >= 4:
                return lam_away * 1.124
    return lam_away

# ── Red Card Bayesian Posterior Shift ──
def predict_cards(team_id: int, season: int) -> float:
    """
    If a team has a red card in >20% of their last 5 games, return 1.5 (posterior shift), else 1.0.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT red_cards FROM fixture_stats WHERE team_id=? AND red_cards IS NOT NULL ORDER BY fetched_at DESC LIMIT 5""",
            (team_id,),
        ).fetchall()
        if not rows:
            return 1.0
        reds = [r["red_cards"] for r in rows]
        pct = sum(1 for r in reds if r and r > 0) / len(reds)
        return 1.5 if pct > 0.2 else 1.0


# ──────────────────────────────────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────────────────────────────────
_DEFAULT_WINDOW = 10          # last-N games for prior λ
_INJURY_DOCK    = 0.054       # 5.4 % Bayesian shift per missing key player
_KEY_PLAYER_N   = 3           # top-N by xG or assists = "key player"
_EPSILON        = 1e-12       # clamp to avoid log(0)


# ──────────────────────────────────────────────────────────────────────────
#  Data containers
# ──────────────────────────────────────────────────────────────────────────
@dataclass
class PoissonPrior:
    """Poisson prior derived from recent matches."""
    team_id: int
    stat: str               # "corners" | "goals"
    lam: float              # λ = sample mean of last N games
    n_games: int            # how many games contributed
    values: list[int] = field(default_factory=list)


@dataclass
class CardPrior:
    """Card prior blending team average with referee tendency."""
    team_id: int
    card_type: str          # "yellow_cards" | "red_cards"
    team_avg: float         # team's per-match average
    referee_avg: float      # referee's per-match average
    blended_lambda: float   # weighted combination


@dataclass
class MatchProbabilities:
    """Full posterior snapshot for a fixture."""
    fixture_id: int
    home_id: int
    away_id: int

    # log-space posteriors (natural log)
    log_home_win: float = 0.0
    log_draw: float     = 0.0
    log_away_win: float = 0.0

    # convenience — exponentiated & normalised
    p_home_win: float = 0.0
    p_draw: float     = 0.0
    p_away_win: float = 0.0

    # Poisson sub-models
    home_corners: PoissonPrior | None = None
    away_corners: PoissonPrior | None = None
    home_goals: PoissonPrior | None   = None
    away_goals: PoissonPrior | None   = None

    # Card sub-models
    home_cards: CardPrior | None = None
    away_cards: CardPrior | None = None

    # Injury flags
    missing_key_home: list[str] = field(default_factory=list)
    missing_key_away: list[str] = field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────
#  Utility math (all log-space)
# ──────────────────────────────────────────────────────────────────────────

def _safe_log(x: float) -> float:
    return math.log(max(x, _EPSILON))


def _log_poisson_pmf(k: int, lam: float) -> float:
    """log P(X=k) for Poisson(λ)."""
    if lam <= 0:
        return _safe_log(_EPSILON)
    return k * math.log(lam) - lam - math.lgamma(k + 1)


def _log_poisson_ge(threshold: int, lam: float, max_k: int = 50) -> float:
    """log P(X ≥ threshold) for Poisson(λ), by log-sum-exp."""
    terms = [_log_poisson_pmf(k, lam) for k in range(threshold, max_k + 1)]
    return _logsumexp(terms)


def _logsumexp(terms: Sequence[float]) -> float:
    """Numerically stable log-sum-exp."""
    if not terms:
        return _safe_log(_EPSILON)
    m = max(terms)
    return m + math.log(sum(math.exp(t - m) for t in terms))


def _log_normalise(log_probs: list[float]) -> list[float]:
    """Normalise a vector of log-probs so they sum to 1 in probability space."""
    log_z = _logsumexp(log_probs)
    return [lp - log_z for lp in log_probs]


def _exp_normalise(log_probs: list[float]) -> list[float]:
    """Return normalised probabilities in real space."""
    normed = _log_normalise(log_probs)
    return [math.exp(lp) for lp in normed]


# ──────────────────────────────────────────────────────────────────────────
#  ProbabilityEngine
# ──────────────────────────────────────────────────────────────────────────

class ProbabilityEngine:
    """
    Central Bayesian engine.  Call :meth:`evaluate` with a fixture id
    to obtain a full :class:`MatchProbabilities` posterior.
    """

    def __init__(self, window: int = _DEFAULT_WINDOW):
        self.window = window

    # ── 1. Poisson Model ─────────────────────────────────────────────────

    def _poisson_prior(self, team_id: int, stat: str) -> PoissonPrior:
        """
        Build a Poisson prior λ from the team's last *window* finished
        matches.  ``stat`` is a column in ``fixture_stats``
        (corners | yellow_cards | red_cards) or we derive goals from
        the fixtures table.
        """
        if stat == "goals":
            return self._goals_prior(team_id)

        col = stat if stat in ("corners", "yellow_cards", "red_cards", "xg") else "corners"
        with get_conn() as conn:
            rows = conn.execute(
                f"""SELECT fs.{col} AS value
                    FROM fixture_stats fs
                    JOIN fixtures f ON fs.fixture_id = f.fixture_id
                    WHERE fs.team_id = ? AND fs.{col} IS NOT NULL
                          AND f.status = 'FT'
                    ORDER BY f.date_utc DESC
                    LIMIT ?""",
                (team_id, self.window),
            ).fetchall()

        values = [r["value"] for r in rows]
        lam = sum(values) / len(values) if values else 1.0
        return PoissonPrior(
            team_id=team_id,
            stat=stat,
            lam=lam,
            n_games=len(values),
            values=values,
        )

    def _goals_prior(self, team_id: int) -> PoissonPrior:
        """λ for goals scored — derived from the fixtures table."""
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT
                       CASE WHEN f.home_id = ? THEN f.home_goals
                            ELSE f.away_goals END AS goals
                   FROM fixtures f
                   WHERE (f.home_id = ? OR f.away_id = ?)
                         AND f.status = 'FT'
                         AND goals IS NOT NULL
                   ORDER BY f.date_utc DESC
                   LIMIT ?""",
                (team_id, team_id, team_id, self.window),
            ).fetchall()

        values = [r["goals"] for r in rows if r["goals"] is not None]
        lam = sum(values) / len(values) if values else 1.0
        return PoissonPrior(
            team_id=team_id, stat="goals", lam=lam,
            n_games=len(values), values=values,
        )

    def poisson_over_prob(self, lam: float, threshold: int) -> float:
        """P(X ≥ threshold) under Poisson(λ) — real-valued."""
        return math.exp(_log_poisson_ge(threshold, lam))

    # ── 2. Referee-Weighted Card Model ───────────────────────────────────

    def _referee_for_fixture(self, fixture_id: int) -> dict | None:
        """Return referee row if we have one mapped to this fixture."""
        with get_conn() as conn:
            row = conn.execute(
                """SELECT r.*
                   FROM fixture_referees fr
                   JOIN referees r ON fr.referee_id = r.referee_id
                   WHERE fr.fixture_id = ?""",
                (fixture_id,),
            ).fetchone()
        return dict(row) if row else None

    def _card_prior(
        self,
        team_id: int,
        card_type: str,
        referee: dict | None,
        referee_weight: float = 0.35,
    ) -> CardPrior:
        """
        Blend team card average with referee card average.

            λ_blended = (1 − w) · team_avg  +  w · referee_avg

        Default referee_weight = 0.35 (empirical — referees explain
        ≈ 35 % of card variance in top-5 league data).
        """
        # Team average from last N games
        team_prior = self._poisson_prior(team_id, card_type)
        team_avg = team_prior.lam

        # Referee average
        if referee and referee.get("total_matches", 0) > 0:
            ref_key = "avg_yellow_per_match" if card_type == "yellow_cards" else "avg_red_per_match"
            ref_avg = referee.get(ref_key, team_avg) or team_avg
        else:
            ref_avg = team_avg          # no referee data → fall back
            referee_weight = 0.0        # disable blending

        blended = (1 - referee_weight) * team_avg + referee_weight * ref_avg

        return CardPrior(
            team_id=team_id,
            card_type=card_type,
            team_avg=team_avg,
            referee_avg=ref_avg,
            blended_lambda=blended,
        )

    # ── 3. Injury / Key-Player Impact Signal ────────────────────────────

    def _key_players(self, team_id: int, season: int) -> list[dict]:
        """
        Return the union of top-N players by xG and top-N by assists
        for a team in the given season.  These define "key players".
        """
        with get_conn() as conn:
            by_xg = conn.execute(
                """SELECT player_id, player_name, total_xg, total_assists
                   FROM player_stats
                   WHERE team_id = ? AND season = ?
                   ORDER BY total_xg DESC
                   LIMIT ?""",
                (team_id, season, _KEY_PLAYER_N),
            ).fetchall()

            by_ast = conn.execute(
                """SELECT player_id, player_name, total_xg, total_assists
                   FROM player_stats
                   WHERE team_id = ? AND season = ?
                   ORDER BY total_assists DESC
                   LIMIT ?""",
                (team_id, season, _KEY_PLAYER_N),
            ).fetchall()

        seen: set[int] = set()
        result: list[dict] = []
        for r in list(by_xg) + list(by_ast):
            pid = r["player_id"]
            if pid not in seen:
                seen.add(pid)
                result.append(dict(r))
        return result

    def _lineup_player_ids(self, fixture_id: int, team_id: int) -> set[int]:
        """Return the set of starter player_ids from the latest lineup fetch."""
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT player_id FROM lineups
                   WHERE fixture_id = ? AND team_id = ? AND is_starter = 1
                   ORDER BY fetched_at DESC""",
                (fixture_id, team_id),
            ).fetchall()
        return {r["player_id"] for r in rows}

    def _injury_dock(
        self,
        fixture_id: int,
        team_id: int,
        season: int,
    ) -> tuple[float, list[str]]:
        """
        Compute the cumulative log-space dock if key players are absent.

        Returns (log_multiplier, [missing_player_names]).
        Each missing key player shifts the prior by −5.4 %:
            log_multiplier = N_missing × log(1 − 0.054)
        """
        key = self._key_players(team_id, season)
        if not key:
            return 0.0, []

        starters = self._lineup_player_ids(fixture_id, team_id)
        if not starters:
            # No lineup data yet — no dock
            return 0.0, []

        key_ids = {p["player_id"] for p in key}
        missing_ids = key_ids - starters
        missing_names = [
            p["player_name"] for p in key if p["player_id"] in missing_ids
        ]

        n_missing = len(missing_ids)
        if n_missing == 0:
            return 0.0, []

        log_mult = n_missing * math.log(1 - _INJURY_DOCK)
        log.info(
            "Injury dock: %d key player(s) missing for team %d → %.4f log shift  (%s)",
            n_missing, team_id, log_mult, ", ".join(missing_names),
        )
        return log_mult, missing_names

    # ── Market-implied priors ────────────────────────────────────────────

    def _market_prior(self, fixture_id: int) -> tuple[float, float, float]:
        """
        Derive log-space priors [home, draw, away] from the latest
        h2h odds.  If no odds exist, fall back to uniform 1/3.
        """
        with get_conn() as conn:
            rows = conn.execute(
                """SELECT outcome_name, price
                   FROM odds_snapshots
                   WHERE fixture_id = ? AND market = 'h2h'
                   ORDER BY fetched_at DESC
                   LIMIT 3""",
                (fixture_id,),
            ).fetchall()

        if len(rows) < 3:
            # Uniform prior
            u = _safe_log(1 / 3)
            return u, u, u

        implied: dict[str, float] = {}
        for r in rows:
            name = r["outcome_name"]
            # Implied probability = 1 / decimal_odds
            implied[name] = 1.0 / max(r["price"], 1.01)

        # Normalise (remove overround)
        total = sum(implied.values())
        p_home = implied.get("Home", implied.get("1", 1 / 3)) / total
        p_draw = implied.get("Draw", implied.get("X", 1 / 3)) / total
        p_away = implied.get("Away", implied.get("2", 1 / 3)) / total

        return _safe_log(p_home), _safe_log(p_draw), _safe_log(p_away)

    # ── Master evaluation ────────────────────────────────────────────────

    def evaluate(self, fixture_id: int, season: int | None = None) -> MatchProbabilities:
        """
        Full Bayesian evaluation for a fixture.

        Pipeline:
            1. Market-implied prior  → log P(H)
            2. Poisson likelihood for corners & goals → log P(D|H)
            3. Referee-weighted card update
            4. Injury dock
            5. Normalise → posterior

        Returns a :class:`MatchProbabilities` with all sub-models attached.
        """
        from config import CURRENT_SEASON
        season = season or CURRENT_SEASON

        # ── Fixture metadata ─────────────────────────────────────────────
        with get_conn() as conn:
            fix = conn.execute(
                "SELECT * FROM fixtures WHERE fixture_id = ?",
                (fixture_id,),
            ).fetchone()
        if not fix:
            raise ValueError(f"Fixture {fixture_id} not found in database")

        home_id = fix["home_id"]
        away_id = fix["away_id"]

        result = MatchProbabilities(
            fixture_id=fixture_id,
            home_id=home_id,
            away_id=away_id,
        )

        # ── Step 1: Prior from market odds ───────────────────────────────
        log_h, log_d, log_a = self._market_prior(fixture_id)

        # ── Step 2: Poisson likelihood — corners ─────────────────────────
        result.home_corners = self._poisson_prior(home_id, "corners")
        result.away_corners = self._poisson_prior(away_id, "corners")
        result.home_goals   = self._poisson_prior(home_id, "goals")
        result.away_goals   = self._poisson_prior(away_id, "goals")

        # Use Poisson goal-scoring rates as a W/D/L likelihood:
        #   P(home_win | λ_h, λ_a) ≈ Σ P(h > a) via Skellam-like approx
        log_like_h, log_like_d, log_like_a = self._poisson_wdl_likelihood(
            result.home_goals.lam, result.away_goals.lam,
        )

        # Bayesian update:  log P(H|D) = log P(H) + log P(D|H)
        log_h += log_like_h
        log_d += log_like_d
        log_a += log_like_a

        # ── Step 3: Referee-weighted card update ─────────────────────────
        referee = self._referee_for_fixture(fixture_id)

        result.home_cards = self._card_prior(home_id, "yellow_cards", referee)
        result.away_cards = self._card_prior(away_id, "yellow_cards", referee)

        # Higher expected cards → slight shift toward draw (more fouls ≈
        # more disrupted play).  We model this as a soft log-likelihood.
        card_signal = self._card_likelihood_signal(
            result.home_cards.blended_lambda,
            result.away_cards.blended_lambda,
        )
        log_h += card_signal["log_home"]
        log_d += card_signal["log_draw"]
        log_a += card_signal["log_away"]

        # ── Step 4: Injury dock ──────────────────────────────────────────
        home_dock, missing_h = self._injury_dock(fixture_id, home_id, season)
        away_dock, missing_a = self._injury_dock(fixture_id, away_id, season)
        result.missing_key_home = missing_h
        result.missing_key_away = missing_a

        # Dock the respective win probability in log-space
        log_h += home_dock      # negative shift = lower P(home win)
        log_a += away_dock      # negative shift = lower P(away win)

        # ── Step 5: Normalise ────────────────────────────────────────────
        #   log P(H|D) = log P(H|D)_unnorm − log Z
        log_probs = _log_normalise([log_h, log_d, log_a])
        probs = [math.exp(lp) for lp in log_probs]

        result.log_home_win = log_probs[0]
        result.log_draw     = log_probs[1]
        result.log_away_win = log_probs[2]
        result.p_home_win   = probs[0]
        result.p_draw       = probs[1]
        result.p_away_win   = probs[2]

        log.info(
            "Fixture %d posterior: Home=%.3f  Draw=%.3f  Away=%.3f",
            fixture_id, probs[0], probs[1], probs[2],
        )
        return result

    # ── Poisson W/D/L likelihood via Monte-Carlo-free grid ───────────────

    @staticmethod
    def _poisson_wdl_likelihood(
        lam_home: float,
        lam_away: float,
        max_goals: int = 10,
    ) -> tuple[float, float, float]:
        """
        Compute log P(home_win), log P(draw), log P(away_win)
        from two independent Poisson goal processes.

            P(home_win) = Σ_{h>a} P(H=h)·P(A=a)
        """
        log_home_terms: list[float] = []
        log_draw_terms: list[float] = []
        log_away_terms: list[float] = []

        for h in range(max_goals + 1):
            lp_h = _log_poisson_pmf(h, lam_home)
            for a in range(max_goals + 1):
                lp_a = _log_poisson_pmf(a, lam_away)
                joint = lp_h + lp_a
                if h > a:
                    log_home_terms.append(joint)
                elif h == a:
                    log_draw_terms.append(joint)
                else:
                    log_away_terms.append(joint)

        return (
            _logsumexp(log_home_terms),
            _logsumexp(log_draw_terms),
            _logsumexp(log_away_terms),
        )

    # ── Card → match-outcome likelihood signal ───────────────────────────

    @staticmethod
    def _card_likelihood_signal(
        home_card_lambda: float,
        away_card_lambda: float,
    ) -> dict[str, float]:
        """
        Translate blended card-λ into a soft W/D/L likelihood nudge.

        Heuristic (backed by Bundesliga / PL regressions):
        • Higher total cards → more disrupted game → draw slightly
          more likely.
        • Asymmetric cards → disciplined team gets a small edge.

        Returns dict with log_home, log_draw, log_away adjustments.
        """
        total = home_card_lambda + away_card_lambda
        diff  = away_card_lambda - home_card_lambda  # positive = away more carded

        # Sigmoid-style soft signal (small magnitude by design)
        draw_boost = 0.02 * (total - 4.0)       # baseline ~4 cards/match
        home_edge  = 0.015 * diff                # opponent carded more
        away_edge  = -home_edge

        return {
            "log_home": home_edge,
            "log_draw": draw_boost,
            "log_away": away_edge,
        }

    # ── Convenience: Poisson market probabilities ────────────────────────

    def corners_over_prob(
        self, fixture_id: int, line: float = 9.5,
    ) -> dict[str, float]:
        """
        P(total corners ≥ ceil(line)) using both teams' Poisson λ.
        Returns {"over": p, "under": 1−p, "home_lambda": …, "away_lambda": …}.
        """
        home = self._poisson_prior(
            self._team_id(fixture_id, "home"), "corners",
        )
        away = self._poisson_prior(
            self._team_id(fixture_id, "away"), "corners",
        )
        combined_lam = home.lam + away.lam
        threshold = math.ceil(line)
        p_over = self.poisson_over_prob(combined_lam, threshold)
        return {
            "over": p_over,
            "under": 1 - p_over,
            "home_lambda": home.lam,
            "away_lambda": away.lam,
            "combined_lambda": combined_lam,
        }

    def cards_over_prob(
        self, fixture_id: int, line: float = 3.5, card_type: str = "yellow_cards",
    ) -> dict[str, float]:
        """
        P(total cards ≥ ceil(line)) using referee-weighted card λ.
        """
        referee = self._referee_for_fixture(fixture_id)
        home = self._card_prior(
            self._team_id(fixture_id, "home"), card_type, referee,
        )
        away = self._card_prior(
            self._team_id(fixture_id, "away"), card_type, referee,
        )
        combined_lam = home.blended_lambda + away.blended_lambda
        threshold = math.ceil(line)
        p_over = self.poisson_over_prob(combined_lam, threshold)
        return {
            "over": p_over,
            "under": 1 - p_over,
            "home_lambda": home.blended_lambda,
            "away_lambda": away.blended_lambda,
            "combined_lambda": combined_lam,
            "referee": referee.get("name") if referee else None,
        }

    # ── Internal helper ──────────────────────────────────────────────────

    def _team_id(self, fixture_id: int, side: str) -> int:
        col = "home_id" if side == "home" else "away_id"
        with get_conn() as conn:
            row = conn.execute(
                f"SELECT {col} FROM fixtures WHERE fixture_id = ?",
                (fixture_id,),
            ).fetchone()
        if not row:
            raise ValueError(f"Fixture {fixture_id} not found")
        return row[col]
