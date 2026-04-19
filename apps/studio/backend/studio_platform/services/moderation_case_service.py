from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..models import (
    GenerationJob,
    MediaAsset,
    ModerationCase,
    ModerationCaseSource,
    ModerationCaseStatus,
    ModerationCaseSubject,
    ModerationResolution,
    ModerationVisibilityEffect,
    PublicPost,
    StudioState,
    Visibility,
    utc_now,
)

if TYPE_CHECKING:
    from ..service import StudioService


class ModerationCaseService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def serialize_case(self, case: ModerationCase) -> dict[str, Any]:
        payload = case.model_dump(mode="json")
        payload["subject"] = case.subject.value
        payload["source"] = case.source.value
        payload["status"] = case.status.value
        payload["visibility_effect"] = case.visibility_effect.value
        if case.resolution is not None:
            payload["resolution"]["status"] = case.resolution.status.value
            payload["resolution"]["visibility_effect"] = case.resolution.visibility_effect.value
        return payload

    def _identity_owns_case_locked(
        self,
        *,
        state: StudioState,
        identity_id: str,
        case: ModerationCase,
    ) -> bool:
        if case.target_identity_id == identity_id:
            return True
        if case.target_post_id:
            post = state.posts.get(case.target_post_id)
            if post is not None and post.identity_id == identity_id:
                return True
        if case.target_asset_id:
            asset = state.assets.get(case.target_asset_id)
            if asset is not None and asset.identity_id == identity_id:
                return True
        if case.target_generation_id:
            generation = state.generations.get(case.target_generation_id)
            if generation is not None and generation.identity_id == identity_id:
                return True
        return False

    def _record_case_on_post_locked(
        self,
        *,
        state: StudioState,
        post_id: str | None,
        case_id: str,
        visibility_effect: ModerationVisibilityEffect,
    ) -> None:
        if not post_id:
            return
        post = state.posts.get(post_id)
        if post is None:
            return
        if case_id not in post.moderation_case_ids:
            post.moderation_case_ids.append(case_id)
        post.visibility_effect = visibility_effect
        if visibility_effect != ModerationVisibilityEffect.NONE:
            post.visibility = Visibility.PRIVATE
        post.updated_at = utc_now()
        state.posts[post.id] = post

    async def get_case(self, case_id: str) -> ModerationCase:
        case = await self.service.store.get_model("moderation_cases", case_id, ModerationCase)
        if case is None:
            raise KeyError("Moderation case not found")
        return case

    async def list_cases(
        self,
        *,
        status: ModerationCaseStatus | None = None,
        source: ModerationCaseSource | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        cases = await self.service.store.list_models("moderation_cases", ModerationCase)
        filtered: list[ModerationCase] = []
        for case in cases:
            if status is not None and case.status != status:
                continue
            if source is not None and case.source != source:
                continue
            filtered.append(case)
        filtered.sort(key=lambda item: (item.updated_at, item.created_at), reverse=True)
        return [self.serialize_case(case) for case in filtered[: max(1, limit)]]

    async def record_generation_block_case(
        self,
        *,
        identity_id: str,
        decision_tier: str,
        reason_code: str,
        prompt: str | None,
    ) -> ModerationCase:
        case = ModerationCase(
            subject=ModerationCaseSubject.GENERATION,
            source=ModerationCaseSource.GENERATION_INTAKE,
            decision_tier=decision_tier,
            reason_code=reason_code,
            visibility_effect=ModerationVisibilityEffect.NONE,
            status=ModerationCaseStatus.ACTIONED,
            actor_or_reporter=identity_id,
            target_identity_id=identity_id,
            description=(prompt or "")[:800],
        )
        await self.service.store.save_model("moderation_cases", case)
        return case

    async def report_public_post(
        self,
        *,
        reporter_identity_id: str,
        post_id: str,
        reason_code: str,
        detail: str,
    ) -> ModerationCase:
        await self.service.get_identity(reporter_identity_id)
        post = await self.service.public._require_publicly_interactable_post(post_id)
        if post.identity_id == reporter_identity_id:
            raise ValueError("You cannot report your own post.")

        normalized_reason = self.service._normalize_reason_code(reason_code, fallback="public_report")
        case = ModerationCase(
            subject=ModerationCaseSubject.POST,
            source=ModerationCaseSource.PUBLIC_REPORT,
            decision_tier="review",
            reason_code=normalized_reason,
            visibility_effect=ModerationVisibilityEffect.HIDDEN_PENDING_REVIEW,
            status=ModerationCaseStatus.OPEN,
            actor_or_reporter=reporter_identity_id,
            target_identity_id=post.identity_id,
            target_post_id=post.id,
            target_asset_id=post.cover_asset_id,
            target_generation_id=post.id,
            description=detail.strip()[:1200],
        )

        def mutation(state: StudioState) -> None:
            state.moderation_cases[case.id] = case
            self._record_case_on_post_locked(
                state=state,
                post_id=post.id,
                case_id=case.id,
                visibility_effect=ModerationVisibilityEffect.HIDDEN_PENDING_REVIEW,
            )

        await self.service.store.mutate(mutation)
        self.service._log_security_event(
            "public_post_reported",
            reporter_identity_id=reporter_identity_id,
            post_id=post.id,
            reason_code=normalized_reason,
            moderation_case_id=case.id,
        )
        return case

    async def submit_appeal(
        self,
        *,
        identity_id: str,
        linked_case_id: str | None,
        subject: ModerationCaseSubject | None,
        subject_id: str | None,
        reason_code: str,
        detail: str,
    ) -> ModerationCase:
        await self.service.get_identity(identity_id)
        linked_case: ModerationCase | None = None
        resolved_subject = subject
        target_identity_id: str | None = identity_id if subject == ModerationCaseSubject.ACCOUNT else None
        target_generation_id: str | None = None
        target_post_id: str | None = None
        target_asset_id: str | None = None

        if linked_case_id:
            linked_case = await self.get_case(linked_case_id)
            allowed = await self.service.store.read(
                lambda state: self._identity_owns_case_locked(state=state, identity_id=identity_id, case=linked_case)
            )
            if not allowed:
                raise PermissionError("Appeals are limited to your own moderation cases.")
            resolved_subject = linked_case.subject
            target_identity_id = linked_case.target_identity_id or target_identity_id
            target_generation_id = linked_case.target_generation_id
            target_post_id = linked_case.target_post_id
            target_asset_id = linked_case.target_asset_id

        if resolved_subject == ModerationCaseSubject.POST:
            if not target_post_id:
                if not subject_id:
                    raise ValueError("Choose a post to appeal.")
                post = await self.service.owned_post(identity_id, subject_id)
                target_post_id = post.id
                target_identity_id = post.identity_id
                target_asset_id = post.cover_asset_id
                target_generation_id = post.id
        elif resolved_subject == ModerationCaseSubject.ASSET:
            if not target_asset_id:
                if not subject_id:
                    raise ValueError("Choose an asset to appeal.")
                asset = await self.service.require_owned_model("assets", subject_id, MediaAsset, identity_id)
                target_asset_id = asset.id
                target_identity_id = asset.identity_id
        elif resolved_subject == ModerationCaseSubject.GENERATION:
            if not target_generation_id:
                if not subject_id:
                    raise ValueError("Choose a generation to appeal.")
                generation = await self.service.require_owned_model("generations", subject_id, GenerationJob, identity_id)
                target_generation_id = generation.id
                target_identity_id = generation.identity_id
        else:
            resolved_subject = ModerationCaseSubject.ACCOUNT
            target_identity_id = identity_id

        normalized_reason = self.service._normalize_reason_code(reason_code, fallback="appeal")
        case = ModerationCase(
            subject=resolved_subject or ModerationCaseSubject.ACCOUNT,
            source=ModerationCaseSource.APPEAL,
            decision_tier="review",
            reason_code=normalized_reason,
            visibility_effect=ModerationVisibilityEffect.NONE,
            status=ModerationCaseStatus.OPEN,
            actor_or_reporter=identity_id,
            target_identity_id=target_identity_id,
            target_generation_id=target_generation_id,
            target_post_id=target_post_id,
            target_asset_id=target_asset_id,
            linked_case_id=linked_case.id if linked_case is not None else linked_case_id,
            description=detail.strip()[:1200],
        )
        await self.service.store.save_model("moderation_cases", case)
        self.service._log_security_event(
            "moderation_appeal_submitted",
            identity_id=identity_id,
            moderation_case_id=case.id,
            linked_case_id=case.linked_case_id,
            subject=case.subject.value,
            reason_code=normalized_reason,
        )
        return case

    async def resolve_case(
        self,
        *,
        resolver_identity_id: str,
        case_id: str,
        status: ModerationCaseStatus,
        resolution_note: str,
        visibility_effect: ModerationVisibilityEffect | None,
    ) -> ModerationCase:
        case = await self.get_case(case_id)
        now = utc_now()
        resolved_effect = visibility_effect or case.visibility_effect

        def mutation(state: StudioState) -> None:
            current = state.moderation_cases.get(case.id)
            if current is None:
                raise KeyError("Moderation case not found")
            current.status = status
            current.visibility_effect = resolved_effect
            current.resolution = ModerationResolution(
                status=status,
                note=resolution_note.strip()[:1200],
                resolved_by=resolver_identity_id,
                visibility_effect=resolved_effect,
                resolved_at=now,
            )
            current.updated_at = now
            state.moderation_cases[current.id] = current

            if current.target_post_id:
                post = state.posts.get(current.target_post_id)
                if post is not None:
                    post.visibility_effect = resolved_effect
                    if resolved_effect != ModerationVisibilityEffect.NONE:
                        post.visibility = Visibility.PRIVATE
                    post.updated_at = now
                    state.posts[post.id] = post

        await self.service.store.mutate(mutation)
        resolved = await self.get_case(case.id)
        self.service._log_security_event(
            "moderation_case_resolved",
            resolver_identity_id=resolver_identity_id,
            moderation_case_id=resolved.id,
            status=resolved.status.value,
            visibility_effect=resolved.visibility_effect.value,
        )
        return resolved
