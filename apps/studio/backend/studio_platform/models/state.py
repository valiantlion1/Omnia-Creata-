from __future__ import annotations

from typing import Dict

from pydantic import BaseModel, Field

from .identity import DeletedIdentityTombstone, OmniaIdentity
from .workspace import Project, StudioWorkspace
from .generation import GenerationJob
from .media import MediaAsset, PublicPost, ShareLink
from .chat import ChatConversation, ChatMessage
from .billing import BillingWebhookReceipt, CreditLedgerEntry
from .telemetry import CostTelemetryEvent
from .persona import StudioPersona
from .prompt_memory import PromptMemoryProfile
from .style import StudioStyle
from .access_session import StudioAccessSession
from .login_attempt import StudioLoginAttemptRecord
from .moderation import ModerationAuditRecord, ModerationCase


class StudioState(BaseModel):
    identities: Dict[str, OmniaIdentity] = Field(default_factory=dict)
    deleted_identity_tombstones: Dict[str, DeletedIdentityTombstone] = Field(default_factory=dict)
    workspaces: Dict[str, StudioWorkspace] = Field(default_factory=dict)
    projects: Dict[str, Project] = Field(default_factory=dict)
    conversations: Dict[str, ChatConversation] = Field(default_factory=dict)
    chat_messages: Dict[str, ChatMessage] = Field(default_factory=dict)
    generations: Dict[str, GenerationJob] = Field(default_factory=dict)
    assets: Dict[str, MediaAsset] = Field(default_factory=dict)
    posts: Dict[str, PublicPost] = Field(default_factory=dict)
    shares: Dict[str, ShareLink] = Field(default_factory=dict)
    credit_ledger: Dict[str, CreditLedgerEntry] = Field(default_factory=dict)
    billing_webhook_receipts: Dict[str, BillingWebhookReceipt] = Field(default_factory=dict)
    cost_telemetry_events: Dict[str, CostTelemetryEvent] = Field(default_factory=dict)
    personas: Dict[str, StudioPersona] = Field(default_factory=dict)
    styles: Dict[str, StudioStyle] = Field(default_factory=dict)
    prompt_memories: Dict[str, PromptMemoryProfile] = Field(default_factory=dict)
    access_sessions: Dict[str, StudioAccessSession] = Field(default_factory=dict)
    login_attempts: Dict[str, StudioLoginAttemptRecord] = Field(default_factory=dict)
    moderation_cases: Dict[str, ModerationCase] = Field(default_factory=dict)
    moderation_audits: Dict[str, ModerationAuditRecord] = Field(default_factory=dict)
    migrations_applied: Dict[str, str] = Field(default_factory=dict)
