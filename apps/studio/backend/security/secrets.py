from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, TypeVar, Generic
from pydantic import SecretStr
import logging
import os

logger = logging.getLogger(__name__)

T = TypeVar('T')

class SecretsProvider(ABC):
    """
    Abstract Base Class for enterprise secret management.
    Allows seamless transition from Local .env to AWS Secrets Manager, Doppler, or HashiCorp Vault.
    """
    
    @abstractmethod
    def get_secret(self, key: str) -> Optional[SecretStr]:
        """Fetch a secret securely and wrap it in a Pydantic SecretStr to prevent leakage."""
        pass
    
    @abstractmethod
    def get_string(self, key: str) -> Optional[str]:
        """Fetch non-sensitive configuration."""
        pass

class EnvSecretsProvider(SecretsProvider):
    """
    Local environment variable secrets provider.
    Reads from the unified root `.env` securely.
    """
    
    def __init__(self):
        # Env is already loaded by dotenv in main/config scripts.
        pass

    def get_secret(self, key: str) -> Optional[SecretStr]:
        value = os.environ.get(key)
        if not value:
            return None
        return SecretStr(value)

    def get_string(self, key: str) -> Optional[str]:
        return os.environ.get(key)

# Global Instance
_secrets_provider: Optional[SecretsProvider] = None

def get_secrets_provider() -> SecretsProvider:
    """Singleton getter for the configured secrets provider."""
    global _secrets_provider
    if _secrets_provider is None:
        # Currently defaults to Env based provider. 
        # In the future, logic can be added here to check ENVIRONMENT and return AWSScretsManagerProvider etc.
        _secrets_provider = EnvSecretsProvider()
    return _secrets_provider

def require_secret(key: str) -> SecretStr:
    """Helper to enforce required secrets during initialization."""
    provider = get_secrets_provider()
    secret = provider.get_secret(key)
    if not secret:
        raise ValueError(f"CRITICAL: Required secret '{key}' is missing from the environment/vault.")
    return secret
