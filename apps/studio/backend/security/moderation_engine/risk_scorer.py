from __future__ import annotations

from .models import PromptRiskLevel


def risk_level_from_score(score: int) -> PromptRiskLevel:
    if score >= 85:
        return PromptRiskLevel.CRITICAL
    if score >= 60:
        return PromptRiskLevel.HIGH
    if score >= 25:
        return PromptRiskLevel.MEDIUM
    return PromptRiskLevel.LOW
