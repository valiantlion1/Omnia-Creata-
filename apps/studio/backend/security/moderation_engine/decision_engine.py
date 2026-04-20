from __future__ import annotations

from .models import (
    AgeAmbiguity,
    ContextAnalysis,
    ContextType,
    LlmModerationAnalysis,
    ModerationAction,
    ModerationResult,
    PromptModerationDecision,
    PromptRiskLevel,
    SexualIntent,
)
from .risk_scorer import risk_level_from_score


def _max_risk_level(left: PromptRiskLevel, right: PromptRiskLevel) -> PromptRiskLevel:
    order = {
        PromptRiskLevel.LOW: 0,
        PromptRiskLevel.MEDIUM: 1,
        PromptRiskLevel.HIGH: 2,
        PromptRiskLevel.CRITICAL: 3,
    }
    return left if order[left] >= order[right] else right


def _block_result_for_reason(reason: str | None) -> ModerationResult:
    if reason in {
        "sexual_minors",
        "non_consensual_sexual_content",
        "graphic_extreme_violence",
        "self_harm_instructions",
    }:
        return ModerationResult.HARD_BLOCK
    return ModerationResult.SOFT_BLOCK


def decide_prompt_action(
    context: ContextAnalysis,
    *,
    llm_analysis: LlmModerationAnalysis | None = None,
) -> PromptModerationDecision:
    risk_score = max(context.risk_score, llm_analysis.risk_score if llm_analysis is not None else 0)
    risk_level = risk_level_from_score(risk_score)
    reason = context.reason_code or (llm_analysis.reason_code if llm_analysis is not None else None)
    age_ambiguity = context.age_ambiguity
    sexual_intent = context.sexual_intent
    context_type = context.context_type
    llm_used = llm_analysis is not None
    llm_model = llm_analysis.model if llm_analysis is not None else None
    signals = list(context.signals)
    explanation = context.explanation

    if llm_analysis is not None:
        if llm_analysis.age_ambiguity != AgeAmbiguity.UNKNOWN:
            age_ambiguity = llm_analysis.age_ambiguity
        if llm_analysis.sexual_intent != SexualIntent.NONE:
            sexual_intent = llm_analysis.sexual_intent
        if llm_analysis.context_type != ContextType.UNKNOWN:
            context_type = llm_analysis.context_type
        for signal in llm_analysis.signals:
            if signal not in signals:
                signals.append(signal)
        if llm_analysis.explanation:
            explanation = llm_analysis.explanation

    if age_ambiguity in {AgeAmbiguity.EXPLICIT_MINOR, AgeAmbiguity.IMPLIED_MINOR} and sexual_intent != SexualIntent.NONE:
        return PromptModerationDecision(
            result=ModerationResult.HARD_BLOCK,
            action=ModerationAction.HARD_BLOCK,
            risk_level=PromptRiskLevel.CRITICAL,
            risk_score=max(risk_score, 95),
            reason="sexual_minors",
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    if context_type in {ContextType.EXPLICIT_SEXUAL, ContextType.GRAPHIC_VIOLENCE, ContextType.SELF_HARM, ContextType.ILLEGAL}:
        return PromptModerationDecision(
            result=_block_result_for_reason(reason),
            action=ModerationAction.HARD_BLOCK,
            risk_level=_max_risk_level(risk_level, PromptRiskLevel.HIGH),
            risk_score=max(risk_score, 75),
            reason=reason,
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    if age_ambiguity == AgeAmbiguity.AMBIGUOUS and sexual_intent in {SexualIntent.MILD, SexualIntent.SUGGESTIVE}:
        rewritten_prompt = None
        if llm_analysis is not None and llm_analysis.rewrite_safe:
            rewritten_prompt = llm_analysis.rewrite_prompt
        return PromptModerationDecision(
            result=ModerationResult.REVIEW,
            action=ModerationAction.REWRITE,
            risk_level=_max_risk_level(risk_level, PromptRiskLevel.MEDIUM),
            risk_score=max(risk_score, 35),
            reason=reason or "age_ambiguity",
            provider_moderation="auto" if rewritten_prompt else "low",
            provider_review_required=not bool(rewritten_prompt),
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            rewritten_prompt=rewritten_prompt,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    if llm_analysis is not None and llm_analysis.recommended_action == ModerationAction.REWRITE and llm_analysis.rewrite_safe:
        return PromptModerationDecision(
            result=ModerationResult.REVIEW,
            action=ModerationAction.REWRITE,
            risk_level=_max_risk_level(risk_level, PromptRiskLevel.MEDIUM),
            risk_score=max(risk_score, 30),
            reason=reason,
            provider_moderation="auto",
            provider_review_required=False,
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            rewritten_prompt=llm_analysis.rewrite_prompt,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    if context_type in {ContextType.SWIMWEAR, ContextType.LINGERIE} or sexual_intent == SexualIntent.SUGGESTIVE:
        return PromptModerationDecision(
            result=ModerationResult.REVIEW,
            action=ModerationAction.REVIEW,
            risk_level=_max_risk_level(risk_level, PromptRiskLevel.MEDIUM),
            risk_score=max(risk_score, 28),
            reason=reason,
            provider_moderation="low",
            provider_review_required=True,
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    if age_ambiguity in {AgeAmbiguity.AMBIGUOUS, AgeAmbiguity.UNKNOWN} and risk_level == PromptRiskLevel.LOW:
        return PromptModerationDecision(
            result=ModerationResult.SAFE,
            action=ModerationAction.ALLOW_WITH_LOG,
            risk_level=risk_level,
            risk_score=risk_score,
            reason=reason,
            age_ambiguity=age_ambiguity,
            sexual_intent=sexual_intent,
            context_type=context_type,
            llm_used=llm_used,
            llm_model=llm_model,
            signals=tuple(signals),
            explanation=explanation,
        )

    return PromptModerationDecision(
        result=ModerationResult.SAFE,
        action=ModerationAction.ALLOW,
        risk_level=risk_level,
        risk_score=risk_score,
        reason=reason,
        age_ambiguity=age_ambiguity,
        sexual_intent=sexual_intent,
        context_type=context_type,
        llm_used=llm_used,
        llm_model=llm_model,
        signals=tuple(signals),
        explanation=explanation,
    )
