from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import uuid


class TransactionType(Enum):
    """Types of credit transactions"""
    ACCOUNT_CREATED = "account_created"
    CREDIT_PURCHASE = "credit_purchase"
    CREDIT_USED = "credit_used"
    MONTHLY_ALLOCATION = "monthly_allocation"
    BONUS_CREDIT = "bonus_credit"
    REFUND = "refund"
    PLAN_CHANGE = "plan_change"
    ADJUSTMENT = "adjustment"
    EXPIRED = "expired"
    ROLLOVER = "rollover"
    AUTO_RECHARGE = "auto_recharge"
    SUSPENSION = "suspension"
    REACTIVATION = "reactivation"


class TransactionStatus(Enum):
    """Transaction status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PROCESSING = "processing"


@dataclass
class CreditTransaction:
    """Credit transaction record"""
    transaction_id: str = field(default_factory=lambda: f"tx-{uuid.uuid4().hex[:12]}")
    account_id: str = ""
    user_id: str = ""
    
    # Transaction details
    transaction_type: TransactionType = TransactionType.CREDIT_USED
    status: TransactionStatus = TransactionStatus.COMPLETED
    amount: int = 0  # Positive for credits added, negative for credits used
    
    # Context
    description: str = ""
    reference_id: Optional[str] = None  # External reference (e.g., payment ID, job ID)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Balances (snapshot at time of transaction)
    balance_before: Optional[int] = None
    balance_after: Optional[int] = None
    
    # Timing
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    # Billing
    billing_period: Optional[str] = None  # e.g., "2024-01"
    invoice_id: Optional[str] = None
    
    def mark_completed(self, balance_after: int):
        """Mark transaction as completed"""
        self.status = TransactionStatus.COMPLETED
        self.balance_after = balance_after
        self.processed_at = datetime.now(timezone.utc)
    
    def mark_failed(self, error_message: str):
        """Mark transaction as failed"""
        self.status = TransactionStatus.FAILED
        self.error_message = error_message
        self.processed_at = datetime.now(timezone.utc)
    
    def can_retry(self) -> bool:
        """Check if transaction can be retried"""
        return (
            self.status == TransactionStatus.FAILED and
            self.retry_count < self.max_retries
        )
    
    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
        self.status = TransactionStatus.PENDING
    
    def is_credit_operation(self) -> bool:
        """Check if this is a credit-adding operation"""
        return self.transaction_type in {
            TransactionType.CREDIT_PURCHASE,
            TransactionType.MONTHLY_ALLOCATION,
            TransactionType.BONUS_CREDIT,
            TransactionType.REFUND,
            TransactionType.ADJUSTMENT,
            TransactionType.ROLLOVER,
            TransactionType.AUTO_RECHARGE,
            TransactionType.REACTIVATION
        }
    
    def is_debit_operation(self) -> bool:
        """Check if this is a credit-using operation"""
        return self.transaction_type in {
            TransactionType.CREDIT_USED,
            TransactionType.EXPIRED,
            TransactionType.SUSPENSION
        }
    
    def get_net_amount(self) -> int:
        """Get net amount (positive for credits added, negative for credits used)"""
        if self.is_credit_operation():
            return abs(self.amount)
        elif self.is_debit_operation():
            return -abs(self.amount)
        else:
            return self.amount
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'transaction_id': self.transaction_id,
            'account_id': self.account_id,
            'user_id': self.user_id,
            'transaction_type': self.transaction_type.value,
            'status': self.status.value,
            'amount': self.amount,
            'description': self.description,
            'reference_id': self.reference_id,
            'metadata': self.metadata,
            'balance_before': self.balance_before,
            'balance_after': self.balance_after,
            'timestamp': self.timestamp.isoformat(),
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'error_message': self.error_message,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries,
            'billing_period': self.billing_period,
            'invoice_id': self.invoice_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CreditTransaction':
        """Create from dictionary"""
        # Convert string enums back to enum objects
        data['transaction_type'] = TransactionType(data['transaction_type'])
        data['status'] = TransactionStatus(data['status'])
        
        # Convert ISO strings back to datetime objects
        if data.get('timestamp'):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        if data.get('processed_at'):
            data['processed_at'] = datetime.fromisoformat(data['processed_at'])
        
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation"""
        return f"Transaction({self.transaction_id}: {self.transaction_type.value} {self.amount} credits for {self.user_id})"
    
    def __repr__(self) -> str:
        """Detailed string representation"""
        return (
            f"CreditTransaction("
            f"id={self.transaction_id}, "
            f"type={self.transaction_type.value}, "
            f"amount={self.amount}, "
            f"status={self.status.value}, "
            f"user={self.user_id}"
            f")"
        )


# Transaction factory functions
def create_purchase_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    payment_id: str,
    description: str = ""
) -> CreditTransaction:
    """Create a credit purchase transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.CREDIT_PURCHASE,
        amount=amount,
        description=description or f"Purchased {amount} credits",
        reference_id=payment_id,
        status=TransactionStatus.PENDING
    )


def create_usage_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    operation_id: str,
    usage_type: str,
    balance_before: int
) -> CreditTransaction:
    """Create a credit usage transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.CREDIT_USED,
        amount=-amount,  # Negative for usage
        description=f"Used {amount} credits for {usage_type}",
        reference_id=operation_id,
        balance_before=balance_before,
        balance_after=balance_before - amount,
        status=TransactionStatus.COMPLETED
    )


def create_monthly_allocation_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    plan_name: str,
    billing_period: str
) -> CreditTransaction:
    """Create a monthly credit allocation transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.MONTHLY_ALLOCATION,
        amount=amount,
        description=f"Monthly allocation of {amount} credits ({plan_name})",
        billing_period=billing_period,
        status=TransactionStatus.COMPLETED
    )


def create_bonus_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    reason: str
) -> CreditTransaction:
    """Create a bonus credit transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.BONUS_CREDIT,
        amount=amount,
        description=f"Bonus credits: {reason}",
        status=TransactionStatus.COMPLETED
    )


def create_refund_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    original_transaction_id: str,
    reason: str
) -> CreditTransaction:
    """Create a refund transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.REFUND,
        amount=amount,
        description=f"Refund: {reason}",
        reference_id=original_transaction_id,
        status=TransactionStatus.COMPLETED
    )


def create_adjustment_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    reason: str,
    admin_user_id: str
) -> CreditTransaction:
    """Create an admin adjustment transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.ADJUSTMENT,
        amount=amount,
        description=f"Admin adjustment: {reason}",
        metadata={"admin_user_id": admin_user_id},
        status=TransactionStatus.COMPLETED
    )


def create_rollover_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    from_period: str,
    to_period: str
) -> CreditTransaction:
    """Create a credit rollover transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.ROLLOVER,
        amount=amount,
        description=f"Rolled over {amount} credits from {from_period} to {to_period}",
        billing_period=to_period,
        metadata={"from_period": from_period, "to_period": to_period},
        status=TransactionStatus.COMPLETED
    )


def create_expiration_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    expiration_reason: str
) -> CreditTransaction:
    """Create a credit expiration transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.EXPIRED,
        amount=-amount,  # Negative for expiration
        description=f"Expired {amount} credits: {expiration_reason}",
        status=TransactionStatus.COMPLETED
    )


def create_auto_recharge_transaction(
    account_id: str,
    user_id: str,
    amount: int,
    payment_id: str,
    trigger_threshold: int
) -> CreditTransaction:
    """Create an auto-recharge transaction"""
    return CreditTransaction(
        account_id=account_id,
        user_id=user_id,
        transaction_type=TransactionType.AUTO_RECHARGE,
        amount=amount,
        description=f"Auto-recharged {amount} credits (triggered at {trigger_threshold} credits)",
        reference_id=payment_id,
        metadata={"trigger_threshold": trigger_threshold},
        status=TransactionStatus.PENDING
    )