"""Scoring — single choice exact, multi choice set-equality (no partial credit in MVP)."""
from __future__ import annotations


def score_single(user_answer: str, correct_set: set[str]) -> tuple[bool, float]:
    """Single choice: correct set has exactly 1 element; user must match it."""
    if len(correct_set) != 1:
        return False, 0.0
    return user_answer in correct_set, 0.0  # score is filled by caller


def score_multi(user_answer: set[str], correct_set: set[str]) -> tuple[bool, float]:
    """Multi choice: exact set equality; no partial credit in MVP."""
    return frozenset(user_answer) == frozenset(correct_set), 0.0
