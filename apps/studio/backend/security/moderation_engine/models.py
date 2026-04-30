from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ModerationResult(str, Enum):
    SAFE = "safe"
    REVIEW = "review"
    SOFT_BLOCK = "soft_block"
    HARD_BLOCK = "hard_block"


class ModerationAction(str, Enum):
    ALLOW = "allow"
    ALLOW_WITH_LOG = "allow_with_log"
    REWRITE = "rewrite"
    REVIEW = "review"
    HARD_BLOCK = "hard_block"


class PromptRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AgeAmbiguity(str, Enum):
    CLEAR_ADULT = "clear_adult"
    AMBIGUOUS = "ambiguous"
    IMPLIED_MINOR = "implied_minor"
    EXPLICIT_MINOR = "explicit_minor"
    UNKNOWN = "unknown"


class SexualIntent(str, Enum):
    NONE = "none"
    MILD = "mild"
    SUGGESTIVE = "suggestive"
    EXPLICIT = "explicit"


class ContextType(str, Enum):
    GENERAL = "general"
    FASHION = "fashion"
    EDITORIAL = "editorial"
    SWIMWEAR = "swimwear"
    LINGERIE = "lingerie"
    ROMANTIC = "romantic"
    EXPLICIT_SEXUAL = "explicit_sexual"
    GRAPHIC_VIOLENCE = "graphic_violence"
    SELF_HARM = "self_harm"
    ILLEGAL = "illegal"
    UNKNOWN = "unknown"


class FastFilterOutcome(str, Enum):
    SAFE = "safe"
    BLOCK = "block"
    ANALYZE = "analyze"


@dataclass(frozen=True, slots=True)
class ParsedPrompt:
    original: str
    normalized: str
    tokens: tuple[str, ...]
    word_count: int


@dataclass(frozen=True, slots=True)
class FastFilterDecision:
    outcome: FastFilterOutcome
    reason: str | None = None
    result: ModerationResult = ModerationResult.SAFE
    signals: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ContextAnalysis:
    risk_score: int = 0
    reason_code: str | None = None
    age_ambiguity: AgeAmbiguity = AgeAmbiguity.UNKNOWN
    sexual_intent: SexualIntent = SexualIntent.NONE
    context_type: ContextType = ContextType.GENERAL
    signals: tuple[str, ...] = ()
    explanation: str = ""


@dataclass(frozen=True, slots=True)
class LlmModerationAnalysis:
    risk_score: int = 0
    recommended_action: ModerationAction = ModerationAction.ALLOW
    reason_code: str | None = None
    age_ambiguity: AgeAmbiguity = AgeAmbiguity.UNKNOWN
    sexual_intent: SexualIntent = SexualIntent.NONE
    context_type: ContextType = ContextType.UNKNOWN
    rewrite_safe: bool = False
    rewrite_prompt: str | None = None
    explanation: str = ""
    signals: tuple[str, ...] = ()
    model: str | None = None


@dataclass(frozen=True, slots=True)
class ImageModerationAnalysis:
    """Result of analyzing a generated image with a vision-capable model.

    Mirrors the prompt-side `LlmModerationAnalysis` vocabulary so the
    decision engine can apply the same balanced action ladder
    (allow / log / review / soft_block / hard_block) without learning
    a second taxonomy for image post-checks.
    """

    risk_score: int = 0
    recommended_action: ModerationAction = ModerationAction.ALLOW
    reason_code: str | None = None
    age_ambiguity: AgeAmbiguity = AgeAmbiguity.UNKNOWN
    sexual_intent: SexualIntent = SexualIntent.NONE
    context_type: ContextType = ContextType.UNKNOWN
    explanation: str = ""
    signals: tuple[str, ...] = ()
    model: str | None = None
    skipped: bool = False
    skipped_reason: str | None = None


@dataclass(frozen=True, slots=True)
class ImageModerationDecision:
    """Final decision applied to a generated image asset.

    `library_state_override` is what the asset's library_state should be set to
    if the analysis demands it (e.g. "blocked" or "needs_review"); a value of
    None means the existing pipeline default stays.
    """

    result: ModerationResult = ModerationResult.SAFE
    action: ModerationAction = ModerationAction.ALLOW
    risk_level: PromptRiskLevel = PromptRiskLevel.LOW
    risk_score: int = 0
    reason: str | None = None
    library_state_override: str | None = None
    age_ambiguity: AgeAmbiguity = AgeAmbiguity.UNKNOWN
    sexual_intent: SexualIntent = SexualIntent.NONE
    context_type: ContextType = ContextType.UNKNOWN
    signals: tuple[str, ...] = ()
    explanation: str = ""
    analyzer_used: bool = False
    analyzer_model: str | None = None
    analyzer_skipped: bool = False
    analyzer_skipped_reason: str | None = None


@dataclass(frozen=True, slots=True)
class PromptModerationDecision:
    result: ModerationResult = ModerationResult.SAFE
    action: ModerationAction = ModerationAction.ALLOW
    risk_level: PromptRiskLevel = PromptRiskLevel.LOW
    risk_score: int = 0
    reason: str | None = None
    provider_moderation: str = "auto"
    provider_review_required: bool = False
    age_ambiguity: AgeAmbiguity = AgeAmbiguity.UNKNOWN
    sexual_intent: SexualIntent = SexualIntent.NONE
    context_type: ContextType = ContextType.GENERAL
    rewrite_applied: bool = False
    rewritten_prompt: str | None = None
    llm_used: bool = False
    llm_model: str | None = None
    signals: tuple[str, ...] = ()
    explanation: str = ""

    def __iter__(self):
        yield self.result
        yield self.reason
