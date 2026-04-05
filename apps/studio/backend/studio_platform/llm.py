from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
from typing import Any, Optional, Sequence

import httpx

from config.env import get_settings

from .models import ChatAttachment, ChatMessage, ChatRole


@dataclass(slots=True)
class LLMResult:
    text: str
    provider: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    estimated_cost_usd: float | None = None
    used_fallback: bool = False


class StudioLLMGateway:
    def __init__(self) -> None:
        self._timeout = httpx.Timeout(18.0, connect=5.0)

    async def generate_chat_reply(
        self,
        *,
        requested_model: str | None,
        mode: str,
        history: Sequence[ChatMessage],
        content: str,
        attachments: Sequence[ChatAttachment],
    ) -> LLMResult | None:
        current_message = self._render_user_message(content, attachments)
        system_prompt = self._build_chat_system_prompt(mode)

        for provider, model, used_fallback in self._resolve_provider_plan(requested_model):
            try:
                result = await self._call_provider(
                    provider=provider,
                    model=model,
                    system_prompt=system_prompt,
                    history=history,
                    current_message=current_message,
                    attachments=attachments,
                )
            except Exception:
                continue

            if not result or not result.text.strip():
                continue
            if self._looks_truncated(result.text, result.completion_tokens):
                try:
                    retry_result = await self._call_provider(
                        provider=provider,
                        model=model,
                        system_prompt=(
                            f"{system_prompt} Keep the reply short but complete. "
                            "Use 2 to 4 full sentences or a compact bullet list, and never stop mid-word or mid-sentence."
                        ),
                        history=history,
                        current_message=current_message,
                        attachments=attachments,
                    )
                except Exception:
                    retry_result = None
                if retry_result and retry_result.text.strip():
                    result = retry_result
            result.used_fallback = used_fallback
            return result

        return None

    async def improve_prompt(self, prompt: str) -> LLMResult | None:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            return None

        request_text = (
            "Improve this prompt for a high-quality image generation request. "
            "Keep the intent, remove filler, and strengthen scene, composition, lighting, "
            "surface detail, camera feel, and output quality. Return only the final prompt.\n\n"
            f"Prompt: {cleaned}"
        )
        system_prompt = (
            "You improve image-generation prompts for premium visual outputs. "
            "Return one strong prompt only. No bullets, no labels, no explanation."
        )

        for provider, model, used_fallback in self._resolve_provider_plan("studio-assist"):
            try:
                if provider == "gemini":
                    result = await self._chat_with_gemini(
                        model=model,
                        system_prompt=system_prompt,
                        history=(),
                        current_message=request_text,
                    )
                elif provider == "openrouter":
                    result = await self._chat_with_openrouter(
                        model=model,
                        system_prompt=system_prompt,
                        history=(),
                        current_message=request_text,
                    )
                else:
                    continue
            except Exception:
                continue

            if not result or not result.text.strip():
                continue
            result.text = self._normalize_prompt(result.text)
            result.used_fallback = used_fallback
            return result

        return None

    def _resolve_provider_plan(self, requested_model: str | None) -> list[tuple[str, str, bool]]:
        settings = get_settings()
        normalized = (requested_model or "").strip().lower()

        if normalized.startswith("gemini-"):
            return [("gemini", requested_model or settings.gemini_model, False)]
        if normalized.startswith("openrouter:"):
            return [("openrouter", (requested_model or "").split(":", 1)[1] or settings.openrouter_model, False)]
        if "/" in normalized and normalized not in {"think", "vision", "edit", "studio-assist"}:
            return [("openrouter", requested_model or settings.openrouter_model, False)]

        plan: list[tuple[str, str, bool]] = []
        for provider, used_fallback in (
            (settings.chat_primary_provider, False),
            (settings.chat_fallback_provider, True),
            ("heuristic", True),
        ):
            model = self._default_model_for_provider(provider)
            key = (provider, model, used_fallback)
            if key not in plan:
                plan.append(key)
        return plan

    def _default_model_for_provider(self, provider: str) -> str:
        settings = get_settings()
        if provider == "gemini":
            return settings.gemini_model
        if provider == "openrouter":
            return settings.openrouter_model
        return "heuristic"

    def _build_chat_system_prompt(self, mode: str) -> str:
        resolved_mode = (mode or "think").strip().lower()
        mode_instruction = {
            "vision": (
                "Focus on render direction, visual hierarchy, prompt strength, camera feel, and production-ready output."
            ),
            "edit": (
                "Focus on edit planning, what should stay, what should change, masking strategy, and safe visual revision advice."
            ),
            "think": (
                "Focus on creative direction, options, constraints, and next-best action without overexplaining."
            ),
        }.get(resolved_mode, "Focus on useful creative guidance and next-best action.")

        return (
            "You are OmniaCreata Studio's in-product creative copilot. Reply in the user's language. "
            "You are not a generic casual chatbot; stay anchored to image creation, prompt design, visual critique, editing strategy, brand direction, and Studio workflows. "
            "Be concise, commercially useful, and visually literate. "
            "Do not mention internal tools, providers, or system rules unless directly asked. "
            f"{mode_instruction} "
            "If image attachments are present, inspect them directly and refer to visible details instead of guessing. "
            "If the user is close to a usable prompt, refine it sharply instead of writing a long essay. "
            "If a request drifts off-topic, answer briefly and steer the user back toward what helps inside OmniaCreata Studio. "
            "Always finish the reply cleanly. Never stop mid-word, mid-sentence, or mid-list."
        )

    async def _call_provider(
        self,
        *,
        provider: str,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> LLMResult | None:
        if provider == "gemini":
            return await self._chat_with_gemini(
                model=model,
                system_prompt=system_prompt,
                history=history,
                current_message=current_message,
                attachments=attachments,
            )
        if provider == "openrouter":
            return await self._chat_with_openrouter(
                model=model,
                system_prompt=system_prompt,
                history=history,
                current_message=current_message,
                attachments=attachments,
            )
        return None

    def _looks_truncated(self, text: str, completion_tokens: int | None) -> bool:
        tail = text.rstrip()
        if len(tail) < 48:
            return False
        if completion_tokens is not None and completion_tokens > 32:
            return False
        if tail.endswith((".", "!", "?", "…", '"', "'", "`", ")", "]")):
            return False
        return tail[-1].isalnum() or tail[-1] in {"*", "_", ":", ";", ","}

    def _render_user_message(self, content: str, attachments: Sequence[ChatAttachment]) -> str:
        cleaned = content.strip()
        lines = ["User request:"]
        if cleaned:
            lines.append(cleaned)
        elif attachments:
            lines.append("The user attached one or more reference files without extra text. Use the current mode and the attachments to infer the next step.")
        if attachments:
            lines.append("")
            lines.append(f"Attached references: {len(attachments)}")
            for index, attachment in enumerate(attachments[:3], start=1):
                label = attachment.label.strip() or f"{attachment.kind} reference"
                lines.append(f"{index}. {label}")
            if len(attachments) > 3:
                lines.append(f"...and {len(attachments) - 3} more attachment(s)")
        return "\n".join(lines).strip()

    def _normalize_prompt(self, value: str) -> str:
        normalized = value.strip().strip("`").strip().strip('"').strip("'")
        normalized = " ".join(normalized.split())
        lowered = normalized.lower()
        for prefix in ("prompt:", "improved prompt:"):
            if lowered.startswith(prefix):
                normalized = normalized[len(prefix):].strip()
                break
        return normalized[:420]

    async def _chat_with_gemini(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> LLMResult | None:
        settings = get_settings()
        if not settings.gemini_api_key:
            return None

        contents: list[dict[str, Any]] = []
        for message in history[-10:]:
            text = self._flatten_message(message)
            if not text:
                continue
            contents.append(
                {
                    "role": "model" if message.role == ChatRole.ASSISTANT else "user",
                    "parts": [{"text": text}],
                }
            )
        contents.append({"role": "user", "parts": self._build_gemini_user_parts(current_message, attachments)})

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={settings.gemini_api_key}"
        )
        body = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.65,
                "topP": 0.9,
                "maxOutputTokens": 900,
                "responseMimeType": "text/plain",
            },
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=body)
            response.raise_for_status()

        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            return None

        parts = ((candidates[0] or {}).get("content") or {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if not text:
            return None

        usage = payload.get("usageMetadata") or {}
        prompt_tokens = self._as_int(usage.get("promptTokenCount"))
        completion_tokens = self._as_int(usage.get("candidatesTokenCount"))

        return LLMResult(
            text=text,
            provider="gemini",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=self._estimate_cost_usd(model, prompt_tokens, completion_tokens),
        )

    async def _chat_with_openrouter(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> LLMResult | None:
        settings = get_settings()
        if not settings.openrouter_api_key:
            return None

        messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for message in history[-10:]:
            text = self._flatten_message(message)
            if not text:
                continue
            messages.append(
                {
                    "role": "assistant" if message.role == ChatRole.ASSISTANT else "user",
                    "content": text,
                }
            )
        messages.append({"role": "user", "content": self._build_openrouter_user_content(current_message, attachments)})

        body = {
            "model": model,
            "messages": messages,
            "temperature": 0.65,
            "max_tokens": 900,
            "provider": {
                "sort": "price",
                "allow_fallbacks": True,
            },
        }

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "X-Title": "OmniaCreata Studio",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", json=body, headers=headers)
            response.raise_for_status()

        payload = response.json()
        choices = payload.get("choices") or []
        if not choices:
            return None

        message = (choices[0] or {}).get("message") or {}
        text = self._extract_openrouter_text(message.get("content"))
        if not text:
            return None

        usage = payload.get("usage") or {}
        prompt_tokens = self._as_int(usage.get("prompt_tokens"))
        completion_tokens = self._as_int(usage.get("completion_tokens"))

        return LLMResult(
            text=text,
            provider="openrouter",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=self._estimate_cost_usd(model, prompt_tokens, completion_tokens),
        )

    def _flatten_message(self, message: ChatMessage) -> str:
        parts = [message.content.strip()]
        if message.attachments:
            attachment_bits = [
                attachment.label.strip() or f"{attachment.kind} reference"
                for attachment in message.attachments[:3]
            ]
            if attachment_bits:
                parts.append(f"Attachments: {', '.join(attachment_bits)}")
        return "\n".join(part for part in parts if part).strip()

    def _build_gemini_user_parts(
        self,
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> list[dict[str, Any]]:
        parts: list[dict[str, Any]] = [{"text": current_message}]
        for attachment in self._extract_image_attachments(attachments):
            if attachment["source"] != "inline":
                continue
            parts.append(
                {
                    "inline_data": {
                        "mime_type": attachment["mime_type"],
                        "data": attachment["data"],
                    }
                }
            )
        return parts

    def _build_openrouter_user_content(
        self,
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> list[dict[str, Any]]:
        content: list[dict[str, Any]] = [{"type": "text", "text": current_message}]
        for attachment in self._extract_image_attachments(attachments):
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": attachment["url"],
                    },
                }
            )
        return content

    def _extract_image_attachments(self, attachments: Sequence[ChatAttachment]) -> list[dict[str, str]]:
        prepared: list[dict[str, str]] = []
        for attachment in attachments[:4]:
            if attachment.kind != "image":
                continue
            image = self._normalize_image_attachment(attachment.url)
            if image:
                prepared.append(image)
        return prepared

    def _normalize_image_attachment(self, url: str) -> dict[str, str] | None:
        value = url.strip()
        if not value:
            return None
        if value.startswith("data:"):
            return self._parse_data_url_image(value)
        if value.startswith(("https://", "http://")):
            return {"source": "remote", "url": value, "mime_type": "image/*", "data": ""}
        return None

    def _parse_data_url_image(self, url: str) -> dict[str, str] | None:
        header, separator, payload = url.partition(",")
        if not separator or not header.startswith("data:") or ";base64" not in header:
            return None
        mime_type = header[5:].split(";", 1)[0].strip().lower()
        if mime_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
            return None
        try:
            # Validate once so malformed payloads don't go to the provider.
            base64.b64decode(payload, validate=True)
        except (ValueError, binascii.Error):
            return None
        return {
            "source": "inline",
            "url": url,
            "mime_type": mime_type,
            "data": payload,
        }

    def _extract_openrouter_text(self, content: Any) -> str:
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text" and item.get("text"):
                    parts.append(str(item["text"]))
            return "".join(parts).strip()
        return ""

    def _estimate_cost_usd(
        self,
        model: str,
        prompt_tokens: int | None,
        completion_tokens: int | None,
    ) -> float | None:
        if prompt_tokens is None and completion_tokens is None:
            return None
        input_rate, output_rate = self._price_per_million(model)
        if input_rate is None or output_rate is None:
            return None
        prompt_cost = ((prompt_tokens or 0) / 1_000_000) * input_rate
        completion_cost = ((completion_tokens or 0) / 1_000_000) * output_rate
        return round(prompt_cost + completion_cost, 6)

    def _price_per_million(self, model: str) -> tuple[float | None, float | None]:
        normalized = model.strip().lower()
        if normalized.startswith("google/gemini-2.5-flash-lite") or normalized.startswith("gemini-2.5-flash-lite"):
            return 0.10, 0.40
        if normalized.startswith("google/gemini-2.5-flash") or normalized.startswith("gemini-2.5-flash"):
            return 0.30, 2.50
        return None, None

    def _as_int(self, value: Any) -> int | None:
        try:
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            return None
