from __future__ import annotations

from dataclasses import replace

from .context_analyzer import analyze_context
from .decision_engine import decide_prompt_action
from .fast_filter import run_fast_filter
from .llm_analyzer import run_llm_analysis
from .models import (
    ModerationAction,
    ModerationResult,
    PromptModerationDecision,
    PromptRiskLevel,
)
from .normalization import parse_prompt
from .rewrite_engine import rewrite_prompt


async def moderate_prompt(prompt: str) -> PromptModerationDecision:
    if not prompt:
        return PromptModerationDecision(
            result=ModerationResult.SAFE,
            action=ModerationAction.ALLOW,
            risk_level=PromptRiskLevel.LOW,
        )

    parsed = parse_prompt(prompt)
    fast_filter = run_fast_filter(parsed)
    if fast_filter.outcome.value == "safe":
        return PromptModerationDecision(
            result=fast_filter.result,
            action=ModerationAction.ALLOW,
            risk_level=PromptRiskLevel.LOW,
            risk_score=0,
            reason=fast_filter.reason,
            signals=fast_filter.signals,
            explanation="fast_filter_safe",
        )
    if fast_filter.outcome.value == "block":
        return PromptModerationDecision(
            result=fast_filter.result,
            action=ModerationAction.HARD_BLOCK,
            risk_level=PromptRiskLevel.CRITICAL if fast_filter.result == ModerationResult.HARD_BLOCK else PromptRiskLevel.HIGH,
            risk_score=95 if fast_filter.result == ModerationResult.HARD_BLOCK else 75,
            reason=fast_filter.reason,
            signals=fast_filter.signals,
            explanation="fast_filter_block",
        )

    context = analyze_context(parsed)
    llm_analysis = await run_llm_analysis(parsed, context)
    decision = decide_prompt_action(context, llm_analysis=llm_analysis)
    if decision.action == ModerationAction.REWRITE and not decision.rewritten_prompt:
        fallback_rewrite = rewrite_prompt(prompt, context)
        if fallback_rewrite:
            decision = replace(
                decision,
                rewritten_prompt=fallback_rewrite,
                provider_moderation="auto",
                provider_review_required=False,
            )
        else:
            decision = replace(
                decision,
                action=ModerationAction.REVIEW,
                provider_moderation="low",
                provider_review_required=True,
            )
    if decision.action == ModerationAction.REWRITE and decision.rewritten_prompt:
        decision = replace(decision, rewrite_applied=True)
    return decision
