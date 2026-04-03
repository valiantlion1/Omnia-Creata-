from __future__ import annotations

from typing import Dict

from pydantic import BaseModel, Field

from .identity import OmniaIdentity
from .workspace import Project, StudioWorkspace
from .generation import GenerationJob
from .media import MediaAsset, PublicPost, ShareLink
from .chat import ChatConversation, ChatMessage
from .billing import CreditLedgerEntry


class StudioState(BaseModel):
    identities: Dict[str, OmniaIdentity] = Field(default_factory=dict)
    workspaces: Dict[str, StudioWorkspace] = Field(default_factory=dict)
    projects: Dict[str, Project] = Field(default_factory=dict)
    conversations: Dict[str, ChatConversation] = Field(default_factory=dict)
    chat_messages: Dict[str, ChatMessage] = Field(default_factory=dict)
    generations: Dict[str, GenerationJob] = Field(default_factory=dict)
    assets: Dict[str, MediaAsset] = Field(default_factory=dict)
    posts: Dict[str, PublicPost] = Field(default_factory=dict)
    shares: Dict[str, ShareLink] = Field(default_factory=dict)
    credit_ledger: Dict[str, CreditLedgerEntry] = Field(default_factory=dict)
