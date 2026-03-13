from typing import List, Optional, Union
from dataclasses import dataclass, field
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import re

logger = logging.getLogger(__name__)


@dataclass
class CORSConfig:
    """CORS configuration"""
    allow_origins: List[str] = field(default_factory=lambda: ["*"])
    allow_credentials: bool = True
    allow_methods: List[str] = field(default_factory=lambda: ["*"])
    allow_headers: List[str] = field(default_factory=lambda: ["*"])
    expose_headers: List[str] = field(default_factory=list)
    max_age: int = 600
    
    # Security settings
    strict_mode: bool = False
    allowed_origins_regex: Optional[str] = None
    development_mode: bool = False
    
    def __post_init__(self):
        """Validate and adjust configuration"""
        if self.strict_mode:
            self._apply_strict_settings()
        
        if self.development_mode:
            self._apply_development_settings()
        
        self._validate_configuration()
    
    def _apply_strict_settings(self):
        """Apply strict security settings"""
        # Remove wildcard origins in strict mode
        if "*" in self.allow_origins:
            logger.warning("Removing wildcard origin in strict mode")
            self.allow_origins = [origin for origin in self.allow_origins if origin != "*"]
        
        # Restrict methods in strict mode
        if "*" in self.allow_methods:
            self.allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        
        # Restrict headers in strict mode
        if "*" in self.allow_headers:
            self.allow_headers = [
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-API-Key"
            ]
    
    def _apply_development_settings(self):
        """Apply development-friendly settings"""
        # Allow localhost and common development ports
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8000"
        ]
        
        # Add development origins if not already present
        for origin in dev_origins:
            if origin not in self.allow_origins:
                self.allow_origins.append(origin)
        
        logger.info("Applied development CORS settings")
    
    def _validate_configuration(self):
        """Validate CORS configuration"""
        # Check for security issues
        if "*" in self.allow_origins and self.allow_credentials:
            logger.warning(
                "Security Warning: Using wildcard origin with credentials enabled. "
                "This is not allowed by browsers and may cause CORS errors."
            )
        
        # Validate regex pattern if provided
        if self.allowed_origins_regex:
            try:
                re.compile(self.allowed_origins_regex)
            except re.error as e:
                raise ValueError(f"Invalid regex pattern for allowed_origins_regex: {e}")
        
        # Log configuration
        logger.info(f"CORS configuration validated: {len(self.allow_origins)} origins allowed")
    
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed"""
        # Check explicit origins
        if origin in self.allow_origins or "*" in self.allow_origins:
            return True
        
        # Check regex pattern
        if self.allowed_origins_regex:
            try:
                return bool(re.match(self.allowed_origins_regex, origin))
            except re.error:
                logger.error(f"Error matching origin {origin} against regex pattern")
                return False
        
        return False
    
    def add_origin(self, origin: str):
        """Add an allowed origin"""
        if origin not in self.allow_origins:
            self.allow_origins.append(origin)
            logger.info(f"Added CORS origin: {origin}")
    
    def remove_origin(self, origin: str):
        """Remove an allowed origin"""
        if origin in self.allow_origins:
            self.allow_origins.remove(origin)
            logger.info(f"Removed CORS origin: {origin}")
    
    def to_middleware_kwargs(self) -> dict:
        """Convert to FastAPI CORS middleware kwargs"""
        return {
            "allow_origins": self.allow_origins,
            "allow_credentials": self.allow_credentials,
            "allow_methods": self.allow_methods,
            "allow_headers": self.allow_headers,
            "expose_headers": self.expose_headers,
            "max_age": self.max_age
        }


def setup_cors(
    app: FastAPI,
    config: Optional[CORSConfig] = None,
    environment: str = "production"
) -> CORSConfig:
    """Setup CORS middleware for FastAPI application"""
    
    # Create default config if none provided
    if config is None:
        config = create_default_cors_config(environment)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        **config.to_middleware_kwargs()
    )
    
    logger.info(f"CORS middleware configured for {environment} environment")
    logger.debug(f"CORS origins: {config.allow_origins}")
    
    return config


def create_default_cors_config(environment: str = "production") -> CORSConfig:
    """Create default CORS configuration based on environment"""
    
    if environment.lower() in ["development", "dev", "local"]:
        return CORSConfig(
            allow_origins=[
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
                "http://127.0.0.1:5173"
            ],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            allow_headers=[
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-API-Key",
                "X-CSRF-Token"
            ],
            development_mode=True,
            strict_mode=False
        )
    
    elif environment.lower() in ["staging", "test"]:
        return CORSConfig(
            allow_origins=[
                "https://staging.omniacreata.com",
                "https://test.omniacreata.com"
            ],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=[
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-API-Key"
            ],
            strict_mode=True
        )
    
    else:  # production
        return CORSConfig(
            allow_origins=[
                "https://omniacreata.com",
                "https://www.omniacreata.com",
                "https://app.omniacreata.com"
            ],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=[
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-API-Key"
            ],
            expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining"],
            max_age=3600,  # 1 hour
            strict_mode=True
        )


def create_cors_config_from_env() -> CORSConfig:
    """Create CORS configuration from environment variables"""
    import os
    
    # Get origins from environment
    origins_env = os.getenv("CORS_ORIGINS", "")
    if origins_env:
        origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
    else:
        origins = ["*"]
    
    # Get other settings
    allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
    
    methods_env = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
    methods = [method.strip() for method in methods_env.split(",") if method.strip()]
    
    headers_env = os.getenv("CORS_ALLOW_HEADERS", "*")
    if headers_env == "*":
        headers = ["*"]
    else:
        headers = [header.strip() for header in headers_env.split(",") if header.strip()]
    
    max_age = int(os.getenv("CORS_MAX_AGE", "600"))
    strict_mode = os.getenv("CORS_STRICT_MODE", "false").lower() == "true"
    development_mode = os.getenv("CORS_DEVELOPMENT_MODE", "false").lower() == "true"
    
    regex_pattern = os.getenv("CORS_ORIGINS_REGEX")
    
    return CORSConfig(
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=methods,
        allow_headers=headers,
        max_age=max_age,
        strict_mode=strict_mode,
        development_mode=development_mode,
        allowed_origins_regex=regex_pattern
    )


# Predefined configurations
DEVELOPMENT_CORS = CORSConfig(
    allow_origins=["*"],
    allow_credentials=False,  # Can't use credentials with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
    development_mode=True
)

STRICT_CORS = CORSConfig(
    allow_origins=[],  # Must be explicitly set
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Content-Type",
        "Authorization"
    ],
    strict_mode=True
)

API_ONLY_CORS = CORSConfig(
    allow_origins=[],  # Must be explicitly set
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-API-Key"
    ],
    expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining"],
    strict_mode=True
)