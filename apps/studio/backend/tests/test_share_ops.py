from __future__ import annotations

import studio_platform.share_ops as share_ops
from studio_platform.models import ShareLink


def test_find_share_by_public_token_uses_constant_time_compare_for_hashed_tokens(
    monkeypatch,
) -> None:
    raw_token = "sharetoken-1234567890"
    secret = "share-secret"
    expected_hash = share_ops.hash_share_token(raw_token, secret=secret)
    comparisons: list[tuple[str, str]] = []
    original_compare = share_ops.hmac.compare_digest

    def fake_compare(left: str, right: str) -> bool:
        comparisons.append((left, right))
        return original_compare(left, right)

    monkeypatch.setattr(share_ops.hmac, "compare_digest", fake_compare)
    share = ShareLink(identity_id="user-1", asset_id="asset-1", token="", token_hash=expected_hash)

    assert share_ops.find_share_by_public_token([share], raw_token, secret=secret) is share
    assert comparisons
    assert any(left == expected_hash and right == expected_hash for left, right in comparisons)


def test_find_share_by_public_token_hash_uses_constant_time_compare_for_legacy_tokens(
    monkeypatch,
) -> None:
    raw_token = "legacy-share-token-123456"
    secret = "share-secret"
    token_hash = share_ops.hash_share_token(raw_token, secret=secret)
    comparisons: list[tuple[str, str]] = []
    original_compare = share_ops.hmac.compare_digest

    def fake_compare(left: str, right: str) -> bool:
        comparisons.append((left, right))
        return original_compare(left, right)

    monkeypatch.setattr(share_ops.hmac, "compare_digest", fake_compare)
    share = ShareLink(identity_id="user-1", asset_id="asset-1", token=raw_token)

    assert share_ops.find_share_by_public_token_hash([share], token_hash, secret=secret) is share
    assert comparisons
    assert any(right == token_hash for _, right in comparisons)
