from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

from ..models import StudioAccessSession, utc_now

if TYPE_CHECKING:
    from ..service import StudioService

_STALE_SESSION_WINDOW = timedelta(days=30)
_REVOKED_RETENTION_WINDOW = timedelta(days=7)
_MAX_RECORDED_SESSIONS_PER_IDENTITY = 12
_ACCESS_SESSION_HASH_SCOPE = "studio-access-session:v1"


def _coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        try:
            parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        except ValueError:
            return None
        return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)
    return None


def _normalize_display_mode(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"browser", "standalone", "minimal-ui", "fullscreen"}:
        return normalized
    return "unknown"


def _browser_label(user_agent: str) -> str:
    normalized = user_agent.lower()
    if "edg/" in normalized:
        return "Edge"
    if "opr/" in normalized or "opera" in normalized:
        return "Opera"
    if "firefox/" in normalized:
        return "Firefox"
    if "chrome/" in normalized and "edg/" not in normalized and "opr/" not in normalized:
        return "Chrome"
    if "safari/" in normalized and "chrome/" not in normalized:
        return "Safari"
    if "android" in normalized:
        return "Android browser"
    return "Browser"


def _os_label(user_agent: str) -> str:
    normalized = user_agent.lower()
    if "android" in normalized:
        return "Android"
    if "iphone" in normalized or "ipad" in normalized or "ios" in normalized:
        return "iPhone"
    if "windows" in normalized:
        return "Windows"
    if "mac os x" in normalized or "macintosh" in normalized:
        return "macOS"
    if "cros" in normalized:
        return "ChromeOS"
    if "linux" in normalized:
        return "Linux"
    return "Unknown OS"


def _surface_label(display_mode: str) -> str:
    if display_mode in {"standalone", "minimal-ui", "fullscreen"}:
        return "Installed app"
    if display_mode == "browser":
        return "Browser"
    return "Studio"


def _device_label(*, browser_label: str, os_label: str, display_mode: str) -> str:
    if display_mode in {"standalone", "minimal-ui", "fullscreen"}:
        return f"{os_label} app"
    return f"{browser_label} on {os_label}"


def _host_label(value: str | None) -> str | None:
    candidate = str(value or "").strip().lower()
    if not candidate:
        return None
    if candidate.startswith("127.0.0.1") or candidate.startswith("localhost"):
        return "Local preview"
    return candidate


def _mask_ip(value: str | None) -> str | None:
    candidate = str(value or "").strip()
    if not candidate:
        return None
    if candidate in {"127.0.0.1", "::1", "localhost", "testclient"}:
        return "Local development"
    if ":" in candidate:
        chunks = [chunk for chunk in candidate.split(":") if chunk]
        if len(chunks) >= 2:
            return f"{chunks[0]}:{chunks[1]}::*"
        return "Private network"
    parts = candidate.split(".")
    if len(parts) != 4:
        return candidate
    try:
        octets = [int(part) for part in parts]
    except ValueError:
        return candidate
    if octets[0] == 10 or octets[0] == 127:
        return "Local development"
    if octets[0] == 192 and octets[1] == 168:
        return "Private network"
    if octets[0] == 172 and 16 <= octets[1] <= 31:
        return "Private network"
    return f"{octets[0]}.{octets[1]}.*.*"


class AccessSessionService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def _fingerprint(self, value: str | None) -> str | None:
        candidate = str(value or "").strip()
        if not candidate:
            return None
        secret = (self.service._asset_token_secret or "").strip() or "omnia-creata-local-session-secret"
        digest = hmac.new(
            secret.encode("utf-8"),
            f"{_ACCESS_SESSION_HASH_SCOPE}:{candidate}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return digest

    async def touch_session(
        self,
        *,
        identity_id: str,
        session_id: str | None,
        auth_provider: str | None,
        user_agent: str | None,
        client_ip: str | None,
        host_label: str | None,
        display_mode: str | None,
        token_issued_at: Any = None,
        token_expires_at: Any = None,
    ) -> None:
        normalized_session_id = str(session_id or "").strip()
        if not normalized_session_id:
            return

        normalized_user_agent = str(user_agent or "").strip()
        normalized_display_mode = _normalize_display_mode(display_mode)
        browser_label = _browser_label(normalized_user_agent)
        os_label = _os_label(normalized_user_agent)
        now = utc_now()
        issued_at = _coerce_datetime(token_issued_at)
        expires_at = _coerce_datetime(token_expires_at)
        masked_ip = _mask_ip(client_ip)
        normalized_host = _host_label(host_label)
        user_agent_hash = self._fingerprint(normalized_user_agent)
        ip_hash = self._fingerprint(client_ip)

        def mutate(state) -> None:
            existing = state.access_sessions.get(normalized_session_id)
            if existing is not None and existing.identity_id != identity_id:
                return

            session = existing or StudioAccessSession(
                id=normalized_session_id,
                identity_id=identity_id,
                session_id=normalized_session_id,
                auth_provider=auth_provider,
                device_label=_device_label(
                    browser_label=browser_label,
                    os_label=os_label,
                    display_mode=normalized_display_mode,
                ),
                browser_label=browser_label,
                os_label=os_label,
                display_mode=normalized_display_mode,
                surface_label=_surface_label(normalized_display_mode),
                network_label=masked_ip or normalized_host,
                ip_label=masked_ip,
                ip_hash=ip_hash,
                host_label=normalized_host,
                user_agent_hash=user_agent_hash,
                first_seen_at=now,
                last_seen_at=now,
                token_issued_at=issued_at,
                token_expires_at=expires_at,
                revoked_at=None,
                revoked_reason=None,
            )

            session.auth_provider = auth_provider or session.auth_provider
            session.browser_label = browser_label
            session.os_label = os_label
            session.display_mode = normalized_display_mode
            session.surface_label = _surface_label(normalized_display_mode)
            session.device_label = _device_label(
                browser_label=browser_label,
                os_label=os_label,
                display_mode=normalized_display_mode,
            )
            session.network_label = masked_ip or normalized_host or session.network_label
            session.ip_label = masked_ip or session.ip_label
            session.ip_hash = ip_hash or session.ip_hash
            session.host_label = normalized_host or session.host_label
            session.user_agent_hash = user_agent_hash or session.user_agent_hash
            session.last_seen_at = now
            session.token_issued_at = issued_at or session.token_issued_at
            session.token_expires_at = expires_at or session.token_expires_at
            session.revoked_at = None
            session.revoked_reason = None
            state.access_sessions[normalized_session_id] = session
            self._prune_sessions_locked(state=state, identity_id=identity_id, current_time=now)

        await self.service.store.mutate(mutate)

    def _prune_sessions_locked(self, *, state, identity_id: str, current_time: datetime) -> None:
        identity_sessions = [
            session
            for session in state.access_sessions.values()
            if session.identity_id == identity_id
        ]
        identity_sessions.sort(key=lambda session: session.last_seen_at, reverse=True)

        retained: set[str] = set()
        active_kept = 0
        for session in identity_sessions:
            if session.revoked_at is not None:
                revoked_age = current_time - session.revoked_at
                if revoked_age <= _REVOKED_RETENTION_WINDOW:
                    retained.add(session.id)
                continue

            if current_time - session.last_seen_at > _STALE_SESSION_WINDOW:
                continue

            if active_kept < _MAX_RECORDED_SESSIONS_PER_IDENTITY:
                retained.add(session.id)
                active_kept += 1

        for session in identity_sessions:
            if session.id not in retained:
                state.access_sessions.pop(session.id, None)

    def _serialize_session(
        self,
        *,
        session: StudioAccessSession,
        current_session_id: str | None,
    ) -> dict[str, Any]:
        current = bool(current_session_id and session.session_id == current_session_id)
        return {
            "id": session.id,
            "session_id": session.session_id,
            "auth_provider": session.auth_provider,
            "device_label": session.device_label,
            "browser_label": session.browser_label,
            "os_label": session.os_label,
            "display_mode": session.display_mode,
            "surface_label": session.surface_label,
            "network_label": session.network_label,
            "ip_label": session.ip_label,
            "host_label": session.host_label,
            "current": current,
            "first_seen_at": session.first_seen_at.isoformat(),
            "last_seen_at": session.last_seen_at.isoformat(),
            "token_expires_at": session.token_expires_at.isoformat() if session.token_expires_at else None,
        }

    async def build_payload(
        self,
        *,
        identity_id: str,
        current_session_id: str | None,
    ) -> dict[str, Any]:
        current_time = utc_now()

        await self.service.store.mutate(
            lambda state: self._prune_sessions_locked(state=state, identity_id=identity_id, current_time=current_time)
        )

        def query(state) -> dict[str, Any]:
            sessions = [
                session.model_copy(deep=True)
                for session in state.access_sessions.values()
                if session.identity_id == identity_id and session.revoked_at is None
            ]
            sessions.sort(
                key=lambda session: (
                    0 if current_session_id and session.session_id == current_session_id else 1,
                    -session.last_seen_at.timestamp(),
                )
            )
            serialized = [
                self._serialize_session(session=session, current_session_id=current_session_id)
                for session in sessions
            ]
            other_count = sum(1 for item in serialized if item["current"] is not True)
            return {
                "current_session_id": current_session_id,
                "sessions": serialized,
                "session_count": len(serialized),
                "other_session_count": other_count,
                "can_sign_out_others": other_count > 0,
            }

        return await self.service.store.read(query)

    async def revoke_other_sessions(
        self,
        *,
        identity_id: str,
        current_session_id: str | None,
        reason: str = "signed_out_elsewhere",
    ) -> dict[str, Any]:
        current_time = utc_now()

        def mutate(state) -> None:
            for session in state.access_sessions.values():
                if session.identity_id != identity_id:
                    continue
                if current_session_id and session.session_id == current_session_id:
                    continue
                if session.revoked_at is None:
                    session.revoked_at = current_time
                    session.revoked_reason = reason
            self._prune_sessions_locked(state=state, identity_id=identity_id, current_time=current_time)

        await self.service.store.mutate(mutate)
        return await self.build_payload(identity_id=identity_id, current_session_id=current_session_id)

    def session_context_from_token(self, access_token: str | None) -> dict[str, Any]:
        candidate = str(access_token or "").strip()
        if not candidate:
            return {
                "session_id": None,
                "issued_at": None,
                "expires_at": None,
            }
        try:
            header_b64, payload_b64, *_ = candidate.split(".")
            _ = header_b64
            # PyJWT adds padding when decoding; using its public API keeps the helper small.
            from jwt import decode as jwt_decode  # local import keeps service dependency-light

            payload = jwt_decode(
                candidate,
                options={
                    "verify_signature": False,
                    "verify_exp": False,
                    "verify_aud": False,
                    "verify_iss": False,
                },
            )
        except Exception:
            payload = {}

        session_id = str(payload.get("session_id") or payload.get("jti") or "").strip()
        if not session_id:
            session_id = hashlib.sha256(candidate.encode("utf-8")).hexdigest()[:32]
        return {
            "session_id": session_id,
            "issued_at": _coerce_datetime(payload.get("iat")),
            "expires_at": _coerce_datetime(payload.get("exp")),
            "claims": payload if isinstance(payload, dict) else {},
        }
