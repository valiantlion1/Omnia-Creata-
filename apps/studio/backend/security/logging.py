import logging
import logging.config
import json
import time
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
import structlog
from fastapi import Request, Response
import traceback
import sys
import os

from .redaction import redact_sensitive_text


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class SecurityEventType(Enum):
    """Security event types"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    TOKEN_CREATED = "token_created"
    TOKEN_REVOKED = "token_revoked"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PERMISSION_DENIED = "permission_denied"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    PASSWORD_CHANGE = "password_change"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"


@dataclass
class LogConfig:
    """Logging configuration"""
    # Basic settings
    level: LogLevel = LogLevel.INFO
    format_type: str = "json"  # json, text, or structured
    
    # File logging
    enable_file_logging: bool = True
    log_directory: str = "logs"
    log_filename: str = "app.log"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    
    # Console logging
    enable_console_logging: bool = True
    console_format: str = "structured"
    
    # Security logging
    enable_security_logging: bool = True
    security_log_file: str = "security.log"
    
    # API request logging
    enable_request_logging: bool = True
    request_log_file: str = "requests.log"
    log_request_body: bool = False
    log_response_body: bool = False
    max_body_size: int = 1024  # Max body size to log
    
    # Error logging
    enable_error_logging: bool = True
    error_log_file: str = "errors.log"
    include_traceback: bool = True
    
    # Performance logging
    enable_performance_logging: bool = True
    performance_log_file: str = "performance.log"
    slow_request_threshold: float = 1.0  # seconds
    
    # Filtering
    exclude_paths: List[str] = field(default_factory=lambda: ["/health", "/metrics"])
    exclude_user_agents: List[str] = field(default_factory=list)
    
    # Sensitive data
    mask_sensitive_data: bool = True
    sensitive_fields: List[str] = field(default_factory=lambda: [
        "password", "token", "api_key", "secret", "authorization",
        "credit_card", "ssn", "email", "phone"
    ])
    
    def __post_init__(self):
        """Create log directory if it doesn't exist"""
        Path(self.log_directory).mkdir(parents=True, exist_ok=True)


@dataclass
class SecurityEvent:
    """Security event data"""
    event_type: SecurityEventType
    user_id: Optional[str] = None
    email: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[datetime] = None
    success: bool = True
    details: Dict[str, Any] = field(default_factory=dict)
    risk_score: int = 0  # 0-100
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['event_type'] = self.event_type.value
        data['timestamp'] = self.timestamp.isoformat() if self.timestamp else None
        return data


@dataclass
class APIRequestLog:
    """API request log data"""
    method: str
    path: str
    status_code: int
    duration: float
    timestamp: Optional[datetime] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    error: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat() if self.timestamp else None
        return data


class SecurityLogger:
    """Security-focused logger with structured logging"""
    
    def __init__(self, config: LogConfig):
        self.config = config
        self._setup_logging()
        self._setup_structlog()
        
        # Create specialized loggers
        self.security_logger = logging.getLogger("security")
        self.request_logger = logging.getLogger("requests")
        self.error_logger = logging.getLogger("errors")
        self.performance_logger = logging.getLogger("performance")
        
        self._request_stats = {
            'total_requests': 0,
            'error_requests': 0,
            'slow_requests': 0,
            'average_duration': 0.0
        }
    
    def _setup_logging(self):
        """Setup Python logging configuration"""
        log_config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'json': {
                    'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                    'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
                },
                'structured': {
                    'format': '%(asctime)s | %(levelname)-8s | %(name)-12s | %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                },
                'simple': {
                    'format': '%(levelname)s: %(message)s'
                }
            },
            'handlers': {},
            'loggers': {
                '': {
                    'level': self.config.level.value,
                    'handlers': []
                }
            }
        }
        
        # Console handler
        if self.config.enable_console_logging:
            log_config['handlers']['console'] = {
                'class': 'logging.StreamHandler',
                'level': self.config.level.value,
                'formatter': self.config.console_format,
                'stream': 'ext://sys.stdout'
            }
            log_config['loggers']['']['handlers'].append('console')
        
        # File handlers
        if self.config.enable_file_logging:
            # Main log file
            log_config['handlers']['file'] = {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': self.config.level.value,
                'formatter': 'json' if self.config.format_type == 'json' else 'structured',
                'filename': os.path.join(self.config.log_directory, self.config.log_filename),
                'maxBytes': self.config.max_file_size,
                'backupCount': self.config.backup_count
            }
            log_config['loggers']['']['handlers'].append('file')
            
            # Security log file
            if self.config.enable_security_logging:
                log_config['handlers']['security'] = {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'INFO',
                    'formatter': 'json',
                    'filename': os.path.join(self.config.log_directory, self.config.security_log_file),
                    'maxBytes': self.config.max_file_size,
                    'backupCount': self.config.backup_count
                }
                log_config['loggers']['security'] = {
                    'level': 'INFO',
                    'handlers': ['security'],
                    'propagate': False
                }
            
            # Request log file
            if self.config.enable_request_logging:
                log_config['handlers']['requests'] = {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'INFO',
                    'formatter': 'json',
                    'filename': os.path.join(self.config.log_directory, self.config.request_log_file),
                    'maxBytes': self.config.max_file_size,
                    'backupCount': self.config.backup_count
                }
                log_config['loggers']['requests'] = {
                    'level': 'INFO',
                    'handlers': ['requests'],
                    'propagate': False
                }
            
            # Error log file
            if self.config.enable_error_logging:
                log_config['handlers']['errors'] = {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'ERROR',
                    'formatter': 'json',
                    'filename': os.path.join(self.config.log_directory, self.config.error_log_file),
                    'maxBytes': self.config.max_file_size,
                    'backupCount': self.config.backup_count
                }
                log_config['loggers']['errors'] = {
                    'level': 'ERROR',
                    'handlers': ['errors'],
                    'propagate': False
                }
            
            # Performance log file
            if self.config.enable_performance_logging:
                log_config['handlers']['performance'] = {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'level': 'INFO',
                    'formatter': 'json',
                    'filename': os.path.join(self.config.log_directory, self.config.performance_log_file),
                    'maxBytes': self.config.max_file_size,
                    'backupCount': self.config.backup_count
                }
                log_config['loggers']['performance'] = {
                    'level': 'INFO',
                    'handlers': ['performance'],
                    'propagate': False
                }
        
        logging.config.dictConfig(log_config)
    
    def _setup_structlog(self):
        """Setup structlog configuration"""
        processors = [
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
        ]
        
        if self.config.format_type == "json":
            processors.append(structlog.processors.JSONRenderer())
        else:
            processors.append(structlog.dev.ConsoleRenderer())
        
        structlog.configure(
            processors=processors,
            wrapper_class=structlog.stdlib.BoundLogger,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    def _mask_sensitive_data(self, data: Any) -> Any:
        """Mask sensitive data in logs"""
        if not self.config.mask_sensitive_data:
            return data
        
        if isinstance(data, dict):
            masked = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in self.config.sensitive_fields):
                    masked[key] = "***MASKED***"
                else:
                    masked[key] = self._mask_sensitive_data(value)
            return masked
        elif isinstance(data, list):
            return [self._mask_sensitive_data(item) for item in data]
        elif isinstance(data, str):
            redacted = redact_sensitive_text(data)
            # Simple email masking
            if "@" in redacted and "." in redacted:
                parts = redacted.split("@")
                if len(parts) == 2:
                    return f"{parts[0][:2]}***@{parts[1]}"
            return redacted
        else:
            return data
    
    def log_security_event(self, event: SecurityEvent):
        """Log security event"""
        if not self.config.enable_security_logging:
            return
        
        event_data = self._mask_sensitive_data(event.to_dict())
        
        self.security_logger.info(
            "Security event",
            extra={
                "event_type": event.event_type.value,
                "user_id": event.user_id,
                "ip_address": event.ip_address,
                "success": event.success,
                "risk_score": event.risk_score,
                "details": event_data
            }
        )
    
    def log_api_request(self, request_log: APIRequestLog):
        """Log API request"""
        if not self.config.enable_request_logging:
            return
        
        # Skip excluded paths
        if any(excluded in request_log.path for excluded in self.config.exclude_paths):
            return
        
        # Update stats
        self._update_request_stats(request_log)
        
        log_data = self._mask_sensitive_data(request_log.to_dict())
        
        self.request_logger.info(
            "API request",
            extra=log_data
        )
        
        # Log slow requests to performance logger
        if (self.config.enable_performance_logging and 
            request_log.duration > self.config.slow_request_threshold):
            self.performance_logger.warning(
                "Slow request detected",
                extra={
                    "method": request_log.method,
                    "path": request_log.path,
                    "duration": request_log.duration,
                    "threshold": self.config.slow_request_threshold
                }
            )
    
    def log_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """Log error with context"""
        if not self.config.enable_error_logging:
            return
        
        error_data = {
            "error_type": type(error).__name__,
            "error_message": redact_sensitive_text(error),
            "user_id": user_id,
            "request_id": request_id,
            "context": self._mask_sensitive_data(context) if context else None
        }
        
        if self.config.include_traceback:
            error_data["traceback"] = traceback.format_exc()
        
        self.error_logger.error(
            "Application error",
            extra=error_data
        )
    
    def _update_request_stats(self, request_log: APIRequestLog):
        """Update request statistics"""
        self._request_stats['total_requests'] += 1
        
        if request_log.status_code >= 400:
            self._request_stats['error_requests'] += 1
        
        if request_log.duration > self.config.slow_request_threshold:
            self._request_stats['slow_requests'] += 1
        
        # Update average duration
        total = self._request_stats['total_requests']
        current_avg = self._request_stats['average_duration']
        self._request_stats['average_duration'] = (
            (current_avg * (total - 1) + request_log.duration) / total
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get logging statistics"""
        return {
            'request_stats': dict(self._request_stats),
            'config': {
                'level': self.config.level.value,
                'format_type': self.config.format_type,
                'file_logging': self.config.enable_file_logging,
                'security_logging': self.config.enable_security_logging,
                'request_logging': self.config.enable_request_logging,
                'error_logging': self.config.enable_error_logging,
                'performance_logging': self.config.enable_performance_logging
            }
        }


# Global logger instance
_security_logger: Optional[SecurityLogger] = None


def setup_logging(config: Optional[LogConfig] = None) -> SecurityLogger:
    """Setup logging system"""
    global _security_logger
    
    if config is None:
        config = create_log_config_from_env()
    
    _security_logger = SecurityLogger(config)
    logging.info("Logging system initialized")
    
    return _security_logger


def get_logger() -> SecurityLogger:
    """Get global logger instance"""
    global _security_logger
    if _security_logger is None:
        raise RuntimeError("Logger not initialized. Call setup_logging() first.")
    return _security_logger


def create_log_config_from_env() -> LogConfig:
    """Create log configuration from environment variables"""
    return LogConfig(
        level=LogLevel(os.getenv("LOG_LEVEL", "INFO")),
        format_type=os.getenv("LOG_FORMAT", "json"),
        enable_file_logging=os.getenv("LOG_ENABLE_FILE", "true").lower() == "true",
        log_directory=os.getenv("LOG_DIRECTORY", "logs"),
        enable_security_logging=os.getenv("LOG_ENABLE_SECURITY", "true").lower() == "true",
        enable_request_logging=os.getenv("LOG_ENABLE_REQUESTS", "true").lower() == "true",
        log_request_body=os.getenv("LOG_REQUEST_BODY", "false").lower() == "true",
        log_response_body=os.getenv("LOG_RESPONSE_BODY", "false").lower() == "true",
        slow_request_threshold=float(os.getenv("LOG_SLOW_REQUEST_THRESHOLD", "1.0")),
        mask_sensitive_data=os.getenv("LOG_MASK_SENSITIVE", "true").lower() == "true"
    )


# Convenience functions

def log_security_event(
    event_type: SecurityEventType,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    details: Optional[Dict[str, Any]] = None,
    risk_score: int = 0
):
    """Log security event"""
    logger = get_logger()
    event = SecurityEvent(
        event_type=event_type,
        user_id=user_id,
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        details=details or {},
        risk_score=risk_score
    )
    logger.log_security_event(event)


def log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration: float,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
    request_body: Optional[str] = None,
    response_body: Optional[str] = None,
    error: Optional[str] = None
):
    """Log API request"""
    logger = get_logger()
    request_log = APIRequestLog(
        method=method,
        path=path,
        status_code=status_code,
        duration=duration,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
        request_body=request_body,
        response_body=response_body,
        error=error
    )
    logger.log_api_request(request_log)


def log_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None
):
    """Log error"""
    logger = get_logger()
    logger.log_error(error, context, user_id, request_id)


# Predefined configurations
DEVELOPMENT_LOG_CONFIG = LogConfig(
    level=LogLevel.DEBUG,
    format_type="structured",
    enable_file_logging=False,
    enable_console_logging=True,
    console_format="structured",
    log_request_body=True,
    log_response_body=True,
    mask_sensitive_data=False
)

PRODUCTION_LOG_CONFIG = LogConfig(
    level=LogLevel.INFO,
    format_type="json",
    enable_file_logging=True,
    enable_console_logging=False,
    log_request_body=False,
    log_response_body=False,
    mask_sensitive_data=True,
    include_traceback=False
)

SECURITY_FOCUSED_LOG_CONFIG = LogConfig(
    level=LogLevel.INFO,
    format_type="json",
    enable_security_logging=True,
    enable_request_logging=True,
    enable_error_logging=True,
    enable_performance_logging=True,
    mask_sensitive_data=True,
    include_traceback=True,
    slow_request_threshold=0.5
)
