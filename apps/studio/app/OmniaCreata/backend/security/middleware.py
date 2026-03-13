import time
import uuid
from typing import Callable, Optional, Dict, Any, List
from fastapi import FastAPI, Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.types import ASGIApp
import json
import asyncio
from contextlib import asynccontextmanager

from .logging import (
    SecurityLogger, APIRequestLog, SecurityEvent, SecurityEventType,
    log_api_request, log_security_event, log_error, get_logger
)
from .headers import SecurityHeaders, SecurityHeadersMiddleware
from .cors import CORSConfig, setup_cors
from .auth import get_current_user_optional, User


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging API requests"""
    
    def __init__(
        self,
        app: ASGIApp,
        logger: Optional[SecurityLogger] = None,
        log_request_body: bool = False,
        log_response_body: bool = False,
        max_body_size: int = 1024,
        exclude_paths: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.logger = logger
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.max_body_size = max_body_size
        self.exclude_paths = exclude_paths or ["/health", "/metrics", "/docs", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip excluded paths
        if any(excluded in str(request.url.path) for excluded in self.exclude_paths):
            return await call_next(request)
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Get user info
        user = None
        user_id = None
        try:
            user = await get_current_user_optional(request)
            user_id = user.id if user else None
        except Exception:
            pass  # User not authenticated or error getting user
        
        # Get client info
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Read request body if needed
        request_body = None
        if self.log_request_body:
            try:
                body = await request.body()
                if len(body) <= self.max_body_size:
                    request_body = body.decode('utf-8')
                else:
                    request_body = f"<body too large: {len(body)} bytes>"
            except Exception as e:
                request_body = f"<error reading body: {str(e)}>"
        
        # Process request
        error = None
        response_body = None
        try:
            response = await call_next(request)
            
            # Read response body if needed
            if self.log_response_body and hasattr(response, 'body'):
                try:
                    if hasattr(response, 'body') and len(response.body) <= self.max_body_size:
                        response_body = response.body.decode('utf-8')
                    else:
                        response_body = f"<body too large or not available>"
                except Exception:
                    response_body = "<error reading response body>"
            
        except Exception as e:
            error = str(e)
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id}
            )
            
            # Log error
            if self.logger:
                self.logger.log_error(
                    e,
                    context={
                        "method": request.method,
                        "path": str(request.url.path),
                        "request_id": request_id
                    },
                    user_id=user_id,
                    request_id=request_id
                )
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log request
        if self.logger:
            request_log = APIRequestLog(
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration=duration,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_id=request_id,
                request_body=request_body,
                response_body=response_body,
                error=error
            )
            self.logger.log_api_request(request_log)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"


class SecurityEventMiddleware(BaseHTTPMiddleware):
    """Middleware for logging security events"""
    
    def __init__(
        self,
        app: ASGIApp,
        logger: Optional[SecurityLogger] = None,
        track_failed_auth: bool = True,
        track_rate_limits: bool = True,
        suspicious_patterns: Optional[List[str]] = None
    ):
        super().__init__(app)
        self.logger = logger
        self.track_failed_auth = track_failed_auth
        self.track_rate_limits = track_rate_limits
        self.suspicious_patterns = suspicious_patterns or [
            "../", "<script", "SELECT * FROM", "DROP TABLE", "UNION SELECT"
        ]
        self.failed_attempts = {}  # IP -> count
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Check for suspicious patterns
        if self._is_suspicious_request(request):
            if self.logger:
                log_security_event(
                    SecurityEventType.SUSPICIOUS_ACTIVITY,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    success=False,
                    details={
                        "path": str(request.url.path),
                        "method": request.method,
                        "reason": "suspicious_patterns_detected"
                    },
                    risk_score=70
                )
        
        response = await call_next(request)
        
        # Track authentication failures
        if self.track_failed_auth and response.status_code == 401:
            self._track_failed_attempt(client_ip)
            
            if self.logger:
                log_security_event(
                    SecurityEventType.UNAUTHORIZED_ACCESS,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    success=False,
                    details={
                        "path": str(request.url.path),
                        "method": request.method,
                        "failed_attempts": self.failed_attempts.get(client_ip, 0)
                    },
                    risk_score=self._calculate_risk_score(client_ip)
                )
        
        # Track rate limit violations
        if self.track_rate_limits and response.status_code == 429:
            if self.logger:
                log_security_event(
                    SecurityEventType.RATE_LIMIT_EXCEEDED,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    success=False,
                    details={
                        "path": str(request.url.path),
                        "method": request.method
                    },
                    risk_score=50
                )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"
    
    def _is_suspicious_request(self, request: Request) -> bool:
        """Check if request contains suspicious patterns"""
        # Check URL path
        path = str(request.url.path).lower()
        query = str(request.url.query).lower()
        
        for pattern in self.suspicious_patterns:
            if pattern.lower() in path or pattern.lower() in query:
                return True
        
        # Check headers for suspicious content
        for header_value in request.headers.values():
            for pattern in self.suspicious_patterns:
                if pattern.lower() in header_value.lower():
                    return True
        
        return False
    
    def _track_failed_attempt(self, ip: str):
        """Track failed authentication attempts"""
        self.failed_attempts[ip] = self.failed_attempts.get(ip, 0) + 1
    
    def _calculate_risk_score(self, ip: str) -> int:
        """Calculate risk score based on failed attempts"""
        attempts = self.failed_attempts.get(ip, 0)
        if attempts >= 10:
            return 90
        elif attempts >= 5:
            return 70
        elif attempts >= 3:
            return 50
        else:
            return 30


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking performance metrics"""
    
    def __init__(
        self,
        app: ASGIApp,
        slow_request_threshold: float = 1.0,
        very_slow_threshold: float = 5.0
    ):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.very_slow_threshold = very_slow_threshold
        self.metrics = {
            'total_requests': 0,
            'slow_requests': 0,
            'very_slow_requests': 0,
            'average_response_time': 0.0,
            'max_response_time': 0.0,
            'min_response_time': float('inf')
        }
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Update metrics
        self._update_metrics(duration)
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        
        # Log slow requests
        if duration > self.very_slow_threshold:
            try:
                logger = get_logger()
                logger.performance_logger.error(
                    "Very slow request detected",
                    extra={
                        "method": request.method,
                        "path": str(request.url.path),
                        "duration": duration,
                        "threshold": self.very_slow_threshold,
                        "severity": "critical"
                    }
                )
            except Exception:
                pass
        elif duration > self.slow_request_threshold:
            try:
                logger = get_logger()
                logger.performance_logger.warning(
                    "Slow request detected",
                    extra={
                        "method": request.method,
                        "path": str(request.url.path),
                        "duration": duration,
                        "threshold": self.slow_request_threshold,
                        "severity": "warning"
                    }
                )
            except Exception:
                pass
        
        return response
    
    def _update_metrics(self, duration: float):
        """Update performance metrics"""
        self.metrics['total_requests'] += 1
        
        if duration > self.very_slow_threshold:
            self.metrics['very_slow_requests'] += 1
        elif duration > self.slow_request_threshold:
            self.metrics['slow_requests'] += 1
        
        # Update response time stats
        total = self.metrics['total_requests']
        current_avg = self.metrics['average_response_time']
        self.metrics['average_response_time'] = (
            (current_avg * (total - 1) + duration) / total
        )
        
        self.metrics['max_response_time'] = max(
            self.metrics['max_response_time'], duration
        )
        self.metrics['min_response_time'] = min(
            self.metrics['min_response_time'], duration
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        return dict(self.metrics)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for centralized error handling"""
    
    def __init__(
        self,
        app: ASGIApp,
        logger: Optional[SecurityLogger] = None,
        include_traceback: bool = False
    ):
        super().__init__(app)
        self.logger = logger
        self.include_traceback = include_traceback
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # Get request context
            request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
            
            # Get user info
            user_id = None
            try:
                user = await get_current_user_optional(request)
                user_id = user.id if user else None
            except Exception:
                pass
            
            # Log error
            if self.logger:
                self.logger.log_error(
                    e,
                    context={
                        "method": request.method,
                        "path": str(request.url.path),
                        "query_params": dict(request.query_params),
                        "headers": dict(request.headers)
                    },
                    user_id=user_id,
                    request_id=request_id
                )
            
            # Return error response
            error_response = {
                "error": "Internal server error",
                "request_id": request_id,
                "timestamp": time.time()
            }
            
            if self.include_traceback:
                import traceback
                error_response["traceback"] = traceback.format_exc()
            
            return JSONResponse(
                status_code=500,
                content=error_response
            )


def setup_security_middleware(
    app: FastAPI,
    cors_config: Optional[CORSConfig] = None,
    security_headers: Optional[SecurityHeaders] = None,
    logger: Optional[SecurityLogger] = None,
    enable_request_logging: bool = True,
    enable_security_events: bool = True,
    enable_performance_tracking: bool = True,
    enable_error_handling: bool = True,
    log_request_body: bool = False,
    log_response_body: bool = False,
    slow_request_threshold: float = 1.0
) -> FastAPI:
    """Setup all security middleware for FastAPI app"""
    
    # Error handling (first)
    if enable_error_handling:
        app.add_middleware(
            ErrorHandlingMiddleware,
            logger=logger,
            include_traceback=False  # Never include in production
        )
    
    # Performance tracking
    if enable_performance_tracking:
        app.add_middleware(
            PerformanceMiddleware,
            slow_request_threshold=slow_request_threshold
        )
    
    # Security event tracking
    if enable_security_events:
        app.add_middleware(
            SecurityEventMiddleware,
            logger=logger
        )
    
    # Request logging
    if enable_request_logging:
        app.add_middleware(
            RequestLoggingMiddleware,
            logger=logger,
            log_request_body=log_request_body,
            log_response_body=log_response_body
        )
    
    # Security headers
    if security_headers:
        app.add_middleware(SecurityHeadersMiddleware, headers=security_headers)
    
    # CORS (last)
    if cors_config:
        setup_cors(app, cors_config)
    
    return app


# Convenience function for common setups
def setup_development_middleware(app: FastAPI, logger: Optional[SecurityLogger] = None) -> FastAPI:
    """Setup middleware for development environment"""
    from .cors import create_default_cors_config
    from .headers import create_development_security_headers
    
    return setup_security_middleware(
        app=app,
        cors_config=create_default_cors_config(development=True),
        security_headers=create_development_security_headers(),
        logger=logger,
        enable_request_logging=True,
        enable_security_events=True,
        enable_performance_tracking=True,
        enable_error_handling=True,
        log_request_body=True,
        log_response_body=False,
        slow_request_threshold=2.0
    )


def setup_production_middleware(app: FastAPI, logger: Optional[SecurityLogger] = None) -> FastAPI:
    """Setup middleware for production environment"""
    from .cors import create_cors_config_from_env
    from .headers import create_production_security_headers
    
    return setup_security_middleware(
        app=app,
        cors_config=create_cors_config_from_env(),
        security_headers=create_production_security_headers(),
        logger=logger,
        enable_request_logging=True,
        enable_security_events=True,
        enable_performance_tracking=True,
        enable_error_handling=True,
        log_request_body=False,
        log_response_body=False,
        slow_request_threshold=1.0
    )