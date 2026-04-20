from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from security.moderation import PromptModerationDecision

from ..models import ModerationAuditRecord

if TYPE_CHECKING:
    from ..service import StudioService


class ModerationAuditService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def serialize_audit(self, audit: ModerationAuditRecord) -> dict[str, Any]:
        return audit.model_dump(mode="json")

    async def record_prompt_decision(
        self,
        *,
        surface: str,
        identity_id: str | None,
        original_text: str,
        final_text: str,
        decision: PromptModerationDecision,
    ) -> ModerationAuditRecord:
        audit = ModerationAuditRecord(
            surface=surface,
            identity_id=identity_id,
            original_text=original_text[:4000],
            final_text=final_text[:4000],
            action=decision.action.value,
            legacy_result=decision.result.value,
            risk_level=decision.risk_level.value,
            risk_score=decision.risk_score,
            reason_code=decision.reason,
            age_ambiguity=decision.age_ambiguity.value,
            sexual_intent=decision.sexual_intent.value,
            context_type=decision.context_type.value,
            provider_moderation=decision.provider_moderation,
            rewrite_applied=decision.rewrite_applied,
            llm_used=decision.llm_used,
            llm_model=decision.llm_model,
            explanation=decision.explanation[:1000],
            signals=list(decision.signals),
        )
        await self.service.store.save_model("moderation_audits", audit)
        self.service._log_security_event(
            "prompt_moderation_decision",
            level=logging.WARNING if decision.action.value == "hard_block" else logging.INFO,
            audit_id=audit.id,
            surface=surface,
            identity_id=identity_id,
            action=decision.action.value,
            legacy_result=decision.result.value,
            risk_level=decision.risk_level.value,
            risk_score=decision.risk_score,
            reason_code=decision.reason,
            age_ambiguity=decision.age_ambiguity.value,
            sexual_intent=decision.sexual_intent.value,
            context_type=decision.context_type.value,
            rewrite_applied=decision.rewrite_applied,
            llm_used=decision.llm_used,
        )
        return audit
