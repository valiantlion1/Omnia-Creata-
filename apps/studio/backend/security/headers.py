from typing import Dict, Optional, List
from dataclasses import dataclass, field
from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
import logging
import secrets
import hashlib
import base64

logger = logging.getLogger(__name__)


@dataclass
class SecurityHeaders:
    """Security headers configuration"""
    
    # Content Security Policy
    content_security_policy: Optional[str] = None
    csp_report_only: bool = False
    
    # HSTS (HTTP Strict Transport Security)
    strict_transport_security: Optional[str] = "max-age=31536000; includeSubDomains"
    
    # X-Frame-Options
    x_frame_options: str = "DENY"
    
    # X-Content-Type-Options
    x_content_type_options: str = "nosniff"
    
    # X-XSS-Protection
    x_xss_protection: str = "1; mode=block"
    
    # Referrer Policy
    referrer_policy: str = "strict-origin-when-cross-origin"
    
    # Permissions Policy
    permissions_policy: Optional[str] = None
    
    # Cross-Origin Policies
    cross_origin_embedder_policy: str = "require-corp"
    cross_origin_opener_policy: str = "same-origin"
    cross_origin_resource_policy: str = "same-origin"
    
    # Custom headers
    custom_headers: Dict[str, str] = field(default_factory=dict)
    
    # Security settings
    enable_csp_nonce: bool = True
    enable_csp_hash: bool = False
    remove_server_header: bool = True
    remove_x_powered_by: bool = True
    
    def __post_init__(self):
        """Initialize default CSP if not provided"""
        if self.content_security_policy is None:
            self.content_security_policy = self._create_default_csp()
    
    def _create_default_csp(self) -> str:
        """Create default Content Security Policy"""
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "child-src 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "manifest-src 'self'"
        ]
        
        return "; ".join(csp_directives)
    
    def create_csp_with_nonce(self, nonce: str) -> str:
        """Create CSP with nonce"""
        if not self.content_security_policy:
            return ""
        
        csp = self.content_security_policy
        
        # Add nonce to script-src and style-src
        if "script-src" in csp:
            csp = csp.replace("script-src", f"script-src 'nonce-{nonce}'")
        
        if "style-src" in csp:
            csp = csp.replace("style-src", f"style-src 'nonce-{nonce}'")
        
        return csp
    
    def add_custom_header(self, name: str, value: str):
        """Add custom security header"""
        self.custom_headers[name] = value
        logger.info(f"Added custom security header: {name}")
    
    def remove_custom_header(self, name: str):
        """Remove custom security header"""
        if name in self.custom_headers:
            del self.custom_headers[name]
            logger.info(f"Removed custom security header: {name}")
    
    def to_headers_dict(self, nonce: Optional[str] = None) -> Dict[str, str]:
        """Convert to headers dictionary"""
        headers = {}
        
        # Content Security Policy
        if self.content_security_policy:
            csp = self.content_security_policy
            if nonce and self.enable_csp_nonce:
                csp = self.create_csp_with_nonce(nonce)
            
            header_name = "Content-Security-Policy-Report-Only" if self.csp_report_only else "Content-Security-Policy"
            headers[header_name] = csp
        
        # HSTS
        if self.strict_transport_security:
            headers["Strict-Transport-Security"] = self.strict_transport_security
        
        # Other security headers
        if self.x_frame_options:
            headers["X-Frame-Options"] = self.x_frame_options
        
        if self.x_content_type_options:
            headers["X-Content-Type-Options"] = self.x_content_type_options
        
        if self.x_xss_protection:
            headers["X-XSS-Protection"] = self.x_xss_protection
        
        if self.referrer_policy:
            headers["Referrer-Policy"] = self.referrer_policy
        
        if self.permissions_policy:
            headers["Permissions-Policy"] = self.permissions_policy
        
        # Cross-Origin policies
        if self.cross_origin_embedder_policy:
            headers["Cross-Origin-Embedder-Policy"] = self.cross_origin_embedder_policy
        
        if self.cross_origin_opener_policy:
            headers["Cross-Origin-Opener-Policy"] = self.cross_origin_opener_policy
        
        if self.cross_origin_resource_policy:
            headers["Cross-Origin-Resource-Policy"] = self.cross_origin_resource_policy
        
        # Custom headers
        headers.update(self.custom_headers)
        
        return headers


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers"""
    
    def __init__(self, app, config: SecurityHeaders):
        super().__init__(app)
        self.config = config
        self._nonce_cache: Dict[str, str] = {}
    
    def generate_nonce(self) -> str:
        """Generate cryptographically secure nonce"""
        return base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
    
    def calculate_script_hash(self, script_content: str) -> str:
        """Calculate SHA256 hash for script content"""
        script_bytes = script_content.encode('utf-8')
        hash_bytes = hashlib.sha256(script_bytes).digest()
        return base64.b64encode(hash_bytes).decode('utf-8')
    
    async def dispatch(self, request: Request, call_next):
        # Generate nonce for this request
        nonce = None
        if self.config.enable_csp_nonce:
            nonce = self.generate_nonce()
            # Store nonce in request state for use in templates
            request.state.csp_nonce = nonce
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        security_headers = self.config.to_headers_dict(nonce)
        
        for header_name, header_value in security_headers.items():
            response.headers[header_name] = header_value
        
        # Remove server identification headers
        if self.config.remove_server_header:
            response.headers.pop("Server", None)
        
        if self.config.remove_x_powered_by:
            response.headers.pop("X-Powered-By", None)
        
        return response


def setup_security_headers(
    app: FastAPI,
    config: Optional[SecurityHeaders] = None,
    environment: str = "production"
) -> SecurityHeaders:
    """Setup security headers middleware"""
    
    if config is None:
        config = create_default_security_headers(environment)
    
    # Add security headers middleware
    app.add_middleware(SecurityHeadersMiddleware, config=config)
    
    logger.info(f"Security headers middleware configured for {environment} environment")
    
    return config


def create_default_security_headers(environment: str = "production") -> SecurityHeaders:
    """Create default security headers based on environment"""
    
    if environment.lower() in ["development", "dev", "local"]:
        return SecurityHeaders(
            content_security_policy=(
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https: http:; "
                "font-src 'self' data:; "
                "connect-src 'self' ws: wss: localhost:* 127.0.0.1:*; "
                "media-src 'self'; "
                "object-src 'none'; "
                "child-src 'self'; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'"
            ),
            strict_transport_security=None,  # No HTTPS in development
            x_frame_options="SAMEORIGIN",
            cross_origin_embedder_policy="unsafe-none",
            cross_origin_opener_policy="unsafe-none",
            cross_origin_resource_policy="cross-origin",
            enable_csp_nonce=False,  # Simpler in development
            remove_server_header=False
        )
    
    elif environment.lower() in ["staging", "test"]:
        return SecurityHeaders(
            content_security_policy=(
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "media-src 'self'; "
                "object-src 'none'; "
                "child-src 'self'; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "upgrade-insecure-requests"
            ),
            strict_transport_security="max-age=31536000; includeSubDomains",
            x_frame_options="DENY",
            permissions_policy=(
                "geolocation=(), microphone=(), camera=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=()"
            ),
            enable_csp_nonce=True
        )
    
    else:  # production
        return SecurityHeaders(
            content_security_policy=(
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self' https:; "
                "media-src 'self'; "
                "object-src 'none'; "
                "child-src 'none'; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "upgrade-insecure-requests"
            ),
            strict_transport_security="max-age=63072000; includeSubDomains; preload",
            x_frame_options="DENY",
            permissions_policy=(
                "geolocation=(), microphone=(), camera=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "fullscreen=(self), picture-in-picture=()"
            ),
            enable_csp_nonce=True,
            enable_csp_hash=True
        )


def create_security_headers_from_env() -> SecurityHeaders:
    """Create security headers configuration from environment variables"""
    import os
    
    return SecurityHeaders(
        content_security_policy=os.getenv("CSP_POLICY"),
        csp_report_only=os.getenv("CSP_REPORT_ONLY", "false").lower() == "true",
        strict_transport_security=os.getenv("HSTS_HEADER"),
        x_frame_options=os.getenv("X_FRAME_OPTIONS", "DENY"),
        x_content_type_options=os.getenv("X_CONTENT_TYPE_OPTIONS", "nosniff"),
        x_xss_protection=os.getenv("X_XSS_PROTECTION", "1; mode=block"),
        referrer_policy=os.getenv("REFERRER_POLICY", "strict-origin-when-cross-origin"),
        permissions_policy=os.getenv("PERMISSIONS_POLICY"),
        enable_csp_nonce=os.getenv("CSP_ENABLE_NONCE", "true").lower() == "true",
        remove_server_header=os.getenv("REMOVE_SERVER_HEADER", "true").lower() == "true"
    )


# Predefined configurations
STRICT_SECURITY_HEADERS = SecurityHeaders(
    content_security_policy=(
        "default-src 'none'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "child-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "base-uri 'none'; "
        "upgrade-insecure-requests"
    ),
    strict_transport_security="max-age=63072000; includeSubDomains; preload",
    x_frame_options="DENY",
    enable_csp_nonce=True
)

API_SECURITY_HEADERS = SecurityHeaders(
    content_security_policy="default-src 'none'; frame-ancestors 'none'",
    strict_transport_security="max-age=31536000; includeSubDomains",
    x_frame_options="DENY",
    x_content_type_options="nosniff",
    cross_origin_resource_policy="same-origin",
    enable_csp_nonce=False
)

DEVELOPMENT_SECURITY_HEADERS = SecurityHeaders(
    content_security_policy=None,  # Disabled for easier development
    strict_transport_security=None,
    x_frame_options="SAMEORIGIN",
    cross_origin_embedder_policy="unsafe-none",
    enable_csp_nonce=False,
    remove_server_header=False
)