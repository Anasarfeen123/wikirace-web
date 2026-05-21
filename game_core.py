"""
game_core.py — Shared game state, independent of UI.
"""

import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from wiki_api import normalize_title, titles_match


# ─── Dataclass ────────────────────────────────────────────────────────────────

@dataclass
class GameState:
    game_id:        str
    start_article:  str
    target_article: str
    current_article: str
    path:           list = field(default_factory=list)
    start_time:     float = field(default_factory=time.time)
    end_time:       Optional[float] = None
    clicks:         int = 0
    status:         str = "playing"   # playing | won | given_up

    def __post_init__(self):
        if not self.path:
            self.path = [self.start_article]

    # ── Read-only properties ──────────────────────────────────────────────────

    @property
    def elapsed(self) -> float:
        if self.end_time is not None:
            return self.end_time - self.start_time
        return time.time() - self.start_time

    @property
    def elapsed_str(self) -> str:
        return format_time(self.elapsed)

    @property
    def is_over(self) -> bool:
        return self.status != "playing"

    # ── Mutations ─────────────────────────────────────────────────────────────

    def navigate(self, article: str) -> bool:
        """
        Move to *article*. Returns True when the player has won.
        Raises ValueError if the game is already over.
        """
        if self.is_over:
            raise ValueError("Game is already over.")
        self.current_article = article
        self.path.append(article)
        self.clicks += 1
        if titles_match(article, self.target_article):
            self.status  = "won"
            self.end_time = time.time()
            return True
        return False

    def give_up(self):
        if self.is_over:
            return
        self.status   = "given_up"
        self.end_time = time.time()

    # ── Serialisation ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "game_id":        self.game_id,
            "start_article":  self.start_article,
            "target_article": self.target_article,
            "current_article": self.current_article,
            "path":           self.path,
            "clicks":         self.clicks,
            "status":         self.status,
            "elapsed":        round(self.elapsed, 3),
            "elapsed_str":    self.elapsed_str,
            "start_time":     self.start_time,
            "end_time":       self.end_time,
        }


# ─── Factory ──────────────────────────────────────────────────────────────────

def new_game(start: str, target: str) -> GameState:
    return GameState(
        game_id        = str(uuid.uuid4())[:8],
        start_article  = normalize_title(start),
        target_article = normalize_title(target),
        current_article = normalize_title(start),
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def format_time(seconds: float) -> str:
    """Format elapsed seconds as  M:SS.cc  or  SS.cc ."""
    mins = int(seconds) // 60
    secs = int(seconds) % 60
    cs   = int((seconds % 1) * 100)
    if mins:
        return f"{mins}:{secs:02d}.{cs:02d}"
    return f"{secs:02d}.{cs:02d}"
