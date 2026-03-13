from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import uuid


class PlanType(Enum):
    """Credit plan types"""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class UsageType(Enum):
    """Types of credit usage"""
    IMAGE_GENERATION = "image_generation"
    IMAGE_UPSCALING = "image_upscaling"
    IMAGE_PROCESSING = "image_processing"
    WATERMARK_REMOVAL = "watermark_removal"
    STORAGE = "storage"
    API_CALL = "api_call"
    BANDWIDTH = "bandwidth"
    CUSTOM = "custom"


@dataclass
class CreditPlan:
    """Credit plan configuration"""
    plan_id: str = field(default_factory=lambda: f"plan-{uuid.uuid4().hex[:8]}")
    name: str = ""
    description: str = ""
    plan_type: PlanType = PlanType.FREE
    
    # Credit allocation
    monthly_credits: int = 0
    bonus_credits: int = 0
    rollover_credits: bool = False
    max_rollover_credits: Optional[int] = None
    
    # Pricing
    monthly_price: float = 0.0
    credit_price: float = 0.0  # Price per additional credit
    currency: str = "USD"
    
    # Limits
    max_requests_per_minute: int = 10
    max_requests_per_hour: int = 100
    max_requests_per_day: int = 1000
    max_concurrent_requests: int = 5
    
    # Features
    features: List[str] = field(default_factory=list)
    priority_processing: bool = False
    api_access: bool = True
    webhook_support: bool = False
    custom_models: bool = False
    
    # Metadata
    active: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'plan_id': self.plan_id,
            'name': self.name,
            'description': self.description,
            'plan_type': self.plan_type.value,
            'monthly_credits': self.monthly_credits,
            'bonus_credits': self.bonus_credits,
            'rollover_credits': self.rollover_credits,
            'max_rollover_credits': self.max_rollover_credits,
            'monthly_price': self.monthly_price,
            'credit_price': self.credit_price,
            'currency': self.currency,
            'max_requests_per_minute': self.max_requests_per_minute,
            'max_requests_per_hour': self.max_requests_per_hour,
            'max_requests_per_day': self.max_requests_per_day,
            'max_concurrent_requests': self.max_concurrent_requests,
            'features': self.features,
            'priority_processing': self.priority_processing,
            'api_access': self.api_access,
            'webhook_support': self.webhook_support,
            'custom_models': self.custom_models,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CreditPlan':
        """Create from dictionary"""
        # Convert string enum back to enum object
        data['plan_type'] = PlanType(data['plan_type'])
        
        # Convert ISO strings back to datetime objects
        if data.get('created_at'):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data.get('updated_at'):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        
        return cls(**data)


@dataclass
class CreditAccount:
    """User credit account"""
    account_id: str = field(default_factory=lambda: f"acc-{uuid.uuid4().hex[:8]}")
    user_id: str = ""
    plan_id: str = ""
    
    # Credit balances
    current_credits: int = 0
    monthly_credits: int = 0
    bonus_credits: int = 0
    purchased_credits: int = 0
    
    # Usage tracking
    credits_used_this_month: int = 0
    credits_used_total: int = 0
    last_reset_date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Account status
    active: bool = True
    suspended: bool = False
    suspension_reason: Optional[str] = None
    
    # Billing
    billing_cycle_start: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    next_billing_date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    auto_recharge: bool = False
    auto_recharge_amount: int = 0
    auto_recharge_threshold: int = 0
    
    # Metadata
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def get_total_credits(self) -> int:
        """Get total available credits"""
        return self.current_credits + self.monthly_credits + self.bonus_credits + self.purchased_credits
    
    def get_usage_percentage(self) -> float:
        """Get usage percentage for current month"""
        total_monthly = self.monthly_credits + self.bonus_credits
        if total_monthly == 0:
            return 0.0
        return min(100.0, (self.credits_used_this_month / total_monthly) * 100)
    
    def can_use_credits(self, amount: int) -> bool:
        """Check if account can use specified amount of credits"""
        if not self.active or self.suspended:
            return False
        return self.get_total_credits() >= amount
    
    def use_credits(self, amount: int) -> bool:
        """Use credits from account"""
        if not self.can_use_credits(amount):
            return False
        
        remaining = amount
        
        # Use purchased credits first
        if remaining > 0 and self.purchased_credits > 0:
            used = min(remaining, self.purchased_credits)
            self.purchased_credits -= used
            remaining -= used
        
        # Then use bonus credits
        if remaining > 0 and self.bonus_credits > 0:
            used = min(remaining, self.bonus_credits)
            self.bonus_credits -= used
            remaining -= used
        
        # Then use monthly credits
        if remaining > 0 and self.monthly_credits > 0:
            used = min(remaining, self.monthly_credits)
            self.monthly_credits -= used
            remaining -= used
        
        # Finally use current credits
        if remaining > 0 and self.current_credits > 0:
            used = min(remaining, self.current_credits)
            self.current_credits -= used
            remaining -= used
        
        # Update usage tracking
        used_amount = amount - remaining
        self.credits_used_this_month += used_amount
        self.credits_used_total += used_amount
        self.updated_at = datetime.now(timezone.utc)
        
        return remaining == 0
    
    def add_credits(self, amount: int, credit_type: str = "purchased"):
        """Add credits to account"""
        if credit_type == "monthly":
            self.monthly_credits += amount
        elif credit_type == "bonus":
            self.bonus_credits += amount
        elif credit_type == "purchased":
            self.purchased_credits += amount
        else:
            self.current_credits += amount
        
        self.updated_at = datetime.now(timezone.utc)
    
    def reset_monthly_credits(self, new_monthly_amount: int, rollover_enabled: bool = False, max_rollover: Optional[int] = None):
        """Reset monthly credits for new billing cycle"""
        # Handle rollover
        if rollover_enabled and self.monthly_credits > 0:
            rollover_amount = self.monthly_credits
            if max_rollover is not None:
                rollover_amount = min(rollover_amount, max_rollover)
            self.bonus_credits += rollover_amount
        
        # Reset monthly credits
        self.monthly_credits = new_monthly_amount
        self.credits_used_this_month = 0
        self.last_reset_date = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'account_id': self.account_id,
            'user_id': self.user_id,
            'plan_id': self.plan_id,
            'current_credits': self.current_credits,
            'monthly_credits': self.monthly_credits,
            'bonus_credits': self.bonus_credits,
            'purchased_credits': self.purchased_credits,
            'credits_used_this_month': self.credits_used_this_month,
            'credits_used_total': self.credits_used_total,
            'last_reset_date': self.last_reset_date.isoformat(),
            'active': self.active,
            'suspended': self.suspended,
            'suspension_reason': self.suspension_reason,
            'billing_cycle_start': self.billing_cycle_start.isoformat(),
            'next_billing_date': self.next_billing_date.isoformat(),
            'auto_recharge': self.auto_recharge,
            'auto_recharge_amount': self.auto_recharge_amount,
            'auto_recharge_threshold': self.auto_recharge_threshold,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CreditAccount':
        """Create from dictionary"""
        # Convert ISO strings back to datetime objects
        datetime_fields = ['last_reset_date', 'billing_cycle_start', 'next_billing_date', 'created_at', 'updated_at']
        for field in datetime_fields:
            if data.get(field):
                data[field] = datetime.fromisoformat(data[field])
        
        return cls(**data)


@dataclass
class CreditUsage:
    """Credit usage record"""
    usage_id: str = field(default_factory=lambda: f"usage-{uuid.uuid4().hex[:8]}")
    account_id: str = ""
    user_id: str = ""
    
    # Usage details
    usage_type: UsageType = UsageType.IMAGE_GENERATION
    credits_used: int = 0
    operation_id: Optional[str] = None
    
    # Context
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Timing
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    billing_period: str = ""  # e.g., "2024-01"
    
    # Cost breakdown
    base_cost: float = 0.0
    multiplier: float = 1.0
    final_cost: int = 0  # Final credits charged
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'usage_id': self.usage_id,
            'account_id': self.account_id,
            'user_id': self.user_id,
            'usage_type': self.usage_type.value,
            'credits_used': self.credits_used,
            'operation_id': self.operation_id,
            'description': self.description,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat(),
            'billing_period': self.billing_period,
            'base_cost': self.base_cost,
            'multiplier': self.multiplier,
            'final_cost': self.final_cost
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CreditUsage':
        """Create from dictionary"""
        # Convert string enum back to enum object
        data['usage_type'] = UsageType(data['usage_type'])
        
        # Convert ISO string back to datetime object
        if data.get('timestamp'):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        
        return cls(**data)


# Predefined credit plans
DEFAULT_PLANS = {
    PlanType.FREE: CreditPlan(
        plan_id="free-plan",
        name="Free Plan",
        description="Basic plan with limited credits",
        plan_type=PlanType.FREE,
        monthly_credits=100,
        monthly_price=0.0,
        credit_price=0.01,
        max_requests_per_minute=5,
        max_requests_per_hour=50,
        max_requests_per_day=200,
        max_concurrent_requests=2,
        features=["basic_generation", "standard_quality"],
        priority_processing=False,
        api_access=True,
        webhook_support=False,
        custom_models=False
    ),
    
    PlanType.STARTER: CreditPlan(
        plan_id="starter-plan",
        name="Starter Plan",
        description="Perfect for individuals and small projects",
        plan_type=PlanType.STARTER,
        monthly_credits=1000,
        bonus_credits=100,
        monthly_price=9.99,
        credit_price=0.008,
        rollover_credits=True,
        max_rollover_credits=500,
        max_requests_per_minute=15,
        max_requests_per_hour=200,
        max_requests_per_day=2000,
        max_concurrent_requests=5,
        features=["basic_generation", "high_quality", "upscaling"],
        priority_processing=False,
        api_access=True,
        webhook_support=True,
        custom_models=False
    ),
    
    PlanType.PRO: CreditPlan(
        plan_id="pro-plan",
        name="Pro Plan",
        description="Advanced features for professionals",
        plan_type=PlanType.PRO,
        monthly_credits=5000,
        bonus_credits=500,
        monthly_price=29.99,
        credit_price=0.006,
        rollover_credits=True,
        max_rollover_credits=2000,
        max_requests_per_minute=30,
        max_requests_per_hour=500,
        max_requests_per_day=10000,
        max_concurrent_requests=10,
        features=["basic_generation", "high_quality", "ultra_quality", "upscaling", "batch_processing"],
        priority_processing=True,
        api_access=True,
        webhook_support=True,
        custom_models=True
    ),
    
    PlanType.ENTERPRISE: CreditPlan(
        plan_id="enterprise-plan",
        name="Enterprise Plan",
        description="Unlimited power for large organizations",
        plan_type=PlanType.ENTERPRISE,
        monthly_credits=25000,
        bonus_credits=2500,
        monthly_price=99.99,
        credit_price=0.004,
        rollover_credits=True,
        max_rollover_credits=10000,
        max_requests_per_minute=100,
        max_requests_per_hour=2000,
        max_requests_per_day=50000,
        max_concurrent_requests=25,
        features=["all_features", "priority_support", "custom_integration"],
        priority_processing=True,
        api_access=True,
        webhook_support=True,
        custom_models=True
    )
}


def get_default_plan(plan_type: PlanType) -> CreditPlan:
    """Get default plan configuration"""
    return DEFAULT_PLANS.get(plan_type, DEFAULT_PLANS[PlanType.FREE])


def create_account_for_plan(user_id: str, plan_type: PlanType) -> CreditAccount:
    """Create a new credit account for a user with specified plan"""
    plan = get_default_plan(plan_type)
    
    return CreditAccount(
        user_id=user_id,
        plan_id=plan.plan_id,
        monthly_credits=plan.monthly_credits,
        bonus_credits=plan.bonus_credits
    )