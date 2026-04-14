from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict

from ..owner_health_ops import (
    build_generation_broker_payload,
    build_owner_health_detail_extensions,
    build_owner_health_payload,
    derive_overall_health_status,
)

if TYPE_CHECKING:
    from ..service import StudioService


class HealthService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def serialize_health_payload(self, payload: Dict[str, Any], detail: bool) -> Dict[str, Any]:
        if detail:
            return payload

        providers = payload.get("providers", [])
        return {
            "status": payload.get("status", "unknown"),
            "providers": [
                {
                    "name": provider.get("name"),
                    "status": provider.get("status"),
                    "success_rate_last_5m": provider.get("success_rate_last_5m"),
                    "avg_latency_ms_last_5m": provider.get("avg_latency_ms_last_5m"),
                }
                for provider in providers
            ],
        }

    async def health(self, detail: bool = False) -> Dict[str, Any]:
        counts = await self.service.store.get_counts_summary()
        data_authority = await self.service.store.describe_persistence()
        provider_status = await self.service.providers.health_snapshot(probe=detail)
        generation_routing_summary = self.service.providers.routing_summary()
        chat_routing_summary = self.service.llm_gateway.routing_summary()
        broker_metrics = await self.service.generation_broker.metrics() if self.service.generation_broker is not None else None
        claimed_count = (
            await self.service.generation_broker.claimed_count() if self.service.generation_broker is not None else 0
        )
        worker_processing_active = bool(
            self.service._generation_maintenance_task is not None
            and not self.service._generation_maintenance_task.done()
        )
        shared_queue_configured = bool((self.service.settings.redis_url or "").strip())
        generation_broker_payload = build_generation_broker_payload(
            settings=self.service.settings,
            generation_runtime_mode=self.service._generation_runtime_mode,
            generation_broker=self.service.generation_broker,
            shared_queue_configured=shared_queue_configured,
            generation_broker_degraded_reason=self.service._generation_broker_degraded_reason,
            broker_metrics=broker_metrics,
            claimed_count=claimed_count,
        )
        overall_status = derive_overall_health_status(
            settings=self.service.settings,
            provider_status=provider_status,
            generation_runtime_mode=self.service._generation_runtime_mode,
            generation_broker_degraded_reason=self.service._generation_broker_degraded_reason,
        )

        detail_extensions: Dict[str, Any] = {}
        if detail:
            detail_extensions = await build_owner_health_detail_extensions(
                store=self.service.store,
                settings=self.service.settings,
                providers=self.service.providers,
                llm_gateway=self.service.llm_gateway,
                generation_routing=generation_routing_summary,
                chat_routing=chat_routing_summary,
                provider_status=provider_status,
                data_authority=data_authority,
                generation_runtime_mode=self.service._generation_runtime_mode,
                generation_broker_payload=generation_broker_payload,
                build_provider_spend_guardrails_summary=self.service._build_provider_spend_guardrails_summary,
                build_cost_telemetry_summary=self.service._build_cost_telemetry_summary,
                build_public_plan_payload=self.service.get_public_plan_payload,
            )

        return build_owner_health_payload(
            overall_status=overall_status,
            provider_status=provider_status,
            counts=counts,
            generation_runtime_mode=self.service._generation_runtime_mode,
            generation_queue=self.service.generation_dispatcher.metrics(),
            generation_broker_payload=generation_broker_payload,
            worker_id=self.service._worker_id,
            worker_processing_active=worker_processing_active,
            generation_routing=generation_routing_summary,
            chat_routing=chat_routing_summary,
            data_authority=data_authority,
            **detail_extensions,
        )
