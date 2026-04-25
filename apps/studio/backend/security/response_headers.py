from __future__ import annotations


def requires_no_store_headers(path: str) -> bool:
    normalized = str(path or "").strip().lower()
    if not normalized.startswith("/v1/"):
        return False
    if normalized.startswith("/v1/auth/"):
        return True
    if normalized.startswith("/v1/billing/"):
        return True
    if normalized.startswith("/v1/owner/"):
        return True
    if normalized.startswith("/v1/shares"):
        return True
    if normalized.startswith("/v1/assets/") and normalized.endswith(("/content", "/thumbnail", "/preview", "/blocked-preview")):
        return True
    if normalized in {"/v1/settings/bootstrap", "/v1/healthz/detail", "/v1/profiles/me/export"}:
        return True
    if normalized.startswith("/v1/projects/") and normalized.endswith("/export"):
        return True
    if normalized.startswith("/v1/assets/") and normalized.endswith("/clean-export"):
        return True
    return False
