from security.redaction import redact_sensitive_text


def test_redacts_asset_delivery_query_tokens() -> None:
    redacted = redact_sensitive_text(
        "/v1/assets/asset-1/content?token=asset-delivery-token-1234567890&variant=content"
    )

    assert "asset-delivery-token-1234567890" not in redacted
    assert "token=***REDACTED***" in redacted


def test_redacts_bearer_tokens() -> None:
    redacted = redact_sensitive_text("Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456")

    assert "abcdefghijklmnopqrstuvwxyz123456" not in redacted
    assert "Bearer ***REDACTED***" in redacted
