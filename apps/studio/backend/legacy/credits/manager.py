from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone, timedelta
import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum

from .models import (
    CreditAccount, CreditPlan, CreditUsage, PlanType, UsageType,
    get_default_plan, create_account_for_plan
)
from .transactions import CreditTransaction, TransactionType, TransactionStatus


class CreditError(Exception):
    """Base exception for credit operations"""
    pass


class InsufficientCreditsError(CreditError):
    """Raised when user doesn't have enough credits"""
    pass


class AccountNotFoundError(CreditError):
    """Raised when credit account is not found"""
    pass


class PlanNotFoundError(CreditError):
    """Raised when credit plan is not found"""
    pass


@dataclass
class CreditConfig:
    """Credit system configuration"""
    # Redis connection
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 2
    redis_prefix: str = "credits:"
    
    # Cache settings
    account_cache_ttl: int = 300  # 5 minutes
    plan_cache_ttl: int = 3600   # 1 hour
    usage_batch_size: int = 100
    
    # Billing settings
    billing_grace_period_days: int = 3
    auto_suspend_on_negative: bool = True
    min_credit_threshold: int = 10
    
    # Rate limiting
    enable_rate_limiting: bool = True
    rate_limit_window: int = 60  # seconds
    
    # Monitoring
    enable_usage_analytics: bool = True
    usage_retention_days: int = 90
    
    # Notifications
    low_credit_threshold: float = 0.2  # 20%
    critical_credit_threshold: float = 0.05  # 5%
    
    @classmethod
    def from_env(cls) -> 'CreditConfig':
        """Create config from environment variables"""
        import os
        
        return cls(
            redis_url=os.getenv('CREDITS_REDIS_URL', 'redis://localhost:6379'),
            redis_db=int(os.getenv('CREDITS_REDIS_DB', '2')),
            redis_prefix=os.getenv('CREDITS_REDIS_PREFIX', 'credits:'),
            account_cache_ttl=int(os.getenv('CREDITS_ACCOUNT_CACHE_TTL', '300')),
            plan_cache_ttl=int(os.getenv('CREDITS_PLAN_CACHE_TTL', '3600')),
            usage_batch_size=int(os.getenv('CREDITS_USAGE_BATCH_SIZE', '100')),
            billing_grace_period_days=int(os.getenv('CREDITS_BILLING_GRACE_DAYS', '3')),
            auto_suspend_on_negative=os.getenv('CREDITS_AUTO_SUSPEND', 'true').lower() == 'true',
            min_credit_threshold=int(os.getenv('CREDITS_MIN_THRESHOLD', '10')),
            enable_rate_limiting=os.getenv('CREDITS_RATE_LIMITING', 'true').lower() == 'true',
            rate_limit_window=int(os.getenv('CREDITS_RATE_LIMIT_WINDOW', '60')),
            enable_usage_analytics=os.getenv('CREDITS_USAGE_ANALYTICS', 'true').lower() == 'true',
            usage_retention_days=int(os.getenv('CREDITS_USAGE_RETENTION_DAYS', '90')),
            low_credit_threshold=float(os.getenv('CREDITS_LOW_THRESHOLD', '0.2')),
            critical_credit_threshold=float(os.getenv('CREDITS_CRITICAL_THRESHOLD', '0.05'))
        )


class CreditManager:
    """Main credit management system"""
    
    def __init__(self, config: CreditConfig, redis_client=None):
        self.config = config
        self.redis = redis_client
        self.logger = logging.getLogger(__name__)
        
        # Cache for frequently accessed data
        self._account_cache: Dict[str, CreditAccount] = {}
        self._plan_cache: Dict[str, CreditPlan] = {}
        
        # Batch processing
        self._usage_batch: List[CreditUsage] = []
        self._transaction_batch: List[CreditTransaction] = []
        
    async def initialize(self):
        """Initialize the credit manager"""
        if self.redis is None:
            import redis.asyncio as redis
            self.redis = redis.from_url(
                self.config.redis_url,
                db=self.config.redis_db,
                decode_responses=True
            )
        
        # Load default plans
        await self._load_default_plans()
        
        self.logger.info("Credit manager initialized")
    
    async def _load_default_plans(self):
        """Load default credit plans into Redis"""
        from .models import DEFAULT_PLANS
        
        for plan_type, plan in DEFAULT_PLANS.items():
            await self._save_plan(plan)
    
    # Account Management
    async def create_account(self, user_id: str, plan_type: PlanType = PlanType.FREE) -> CreditAccount:
        """Create a new credit account"""
        # Check if account already exists
        existing = await self.get_account(user_id)
        if existing:
            raise CreditError(f"Account already exists for user {user_id}")
        
        # Create new account
        account = create_account_for_plan(user_id, plan_type)
        await self._save_account(account)
        
        # Log transaction
        transaction = CreditTransaction(
            account_id=account.account_id,
            user_id=user_id,
            transaction_type=TransactionType.ACCOUNT_CREATED,
            amount=account.monthly_credits + account.bonus_credits,
            description=f"Account created with {plan_type.value} plan"
        )
        await self._save_transaction(transaction)
        
        self.logger.info(f"Created credit account for user {user_id} with plan {plan_type.value}")
        return account
    
    async def get_account(self, user_id: str) -> Optional[CreditAccount]:
        """Get credit account by user ID"""
        # Check cache first
        if user_id in self._account_cache:
            return self._account_cache[user_id]
        
        # Load from Redis
        key = f"{self.config.redis_prefix}account:{user_id}"
        data = await self.redis.hgetall(key)
        
        if not data:
            return None
        
        account = CreditAccount.from_dict(data)
        
        # Cache the account
        self._account_cache[user_id] = account
        
        return account
    
    async def get_account_by_id(self, account_id: str) -> Optional[CreditAccount]:
        """Get credit account by account ID"""
        # Find user_id from account_id mapping
        mapping_key = f"{self.config.redis_prefix}account_mapping:{account_id}"
        user_id = await self.redis.get(mapping_key)
        
        if not user_id:
            return None
        
        return await self.get_account(user_id)
    
    async def _save_account(self, account: CreditAccount):
        """Save account to Redis"""
        key = f"{self.config.redis_prefix}account:{account.user_id}"
        mapping_key = f"{self.config.redis_prefix}account_mapping:{account.account_id}"
        
        # Save account data
        await self.redis.hset(key, mapping=account.to_dict())
        await self.redis.expire(key, self.config.account_cache_ttl)
        
        # Save account ID mapping
        await self.redis.set(mapping_key, account.user_id)
        await self.redis.expire(mapping_key, self.config.account_cache_ttl)
        
        # Update cache
        self._account_cache[account.user_id] = account
    
    # Credit Operations
    async def use_credits(self, user_id: str, amount: int, usage_type: UsageType, 
                         operation_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Use credits from user account"""
        account = await self.get_account(user_id)
        if not account:
            raise AccountNotFoundError(f"No account found for user {user_id}")
        
        if not account.can_use_credits(amount):
            raise InsufficientCreditsError(f"Insufficient credits. Required: {amount}, Available: {account.get_total_credits()}")
        
        # Use credits
        success = account.use_credits(amount)
        if not success:
            raise CreditError("Failed to use credits")
        
        # Save updated account
        await self._save_account(account)
        
        # Record usage
        usage = CreditUsage(
            account_id=account.account_id,
            user_id=user_id,
            usage_type=usage_type,
            credits_used=amount,
            operation_id=operation_id,
            metadata=metadata or {},
            billing_period=datetime.now(timezone.utc).strftime("%Y-%m"),
            final_cost=amount
        )
        
        await self._record_usage(usage)
        
        # Log transaction
        transaction = CreditTransaction(
            account_id=account.account_id,
            user_id=user_id,
            transaction_type=TransactionType.CREDIT_USED,
            amount=-amount,
            description=f"Credits used for {usage_type.value}",
            metadata=metadata or {}
        )
        await self._save_transaction(transaction)
        
        # Check for low credit warnings
        await self._check_credit_thresholds(account)
        
        self.logger.info(f"User {user_id} used {amount} credits for {usage_type.value}")
        return True
    
    async def add_credits(self, user_id: str, amount: int, credit_type: str = "purchased", 
                         description: str = "", metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Add credits to user account"""
        account = await self.get_account(user_id)
        if not account:
            raise AccountNotFoundError(f"No account found for user {user_id}")
        
        # Add credits
        account.add_credits(amount, credit_type)
        await self._save_account(account)
        
        # Log transaction
        transaction_type = {
            "monthly": TransactionType.MONTHLY_ALLOCATION,
            "bonus": TransactionType.BONUS_CREDIT,
            "purchased": TransactionType.CREDIT_PURCHASE,
            "refund": TransactionType.REFUND
        }.get(credit_type, TransactionType.CREDIT_PURCHASE)
        
        transaction = CreditTransaction(
            account_id=account.account_id,
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            description=description or f"Added {amount} {credit_type} credits",
            metadata=metadata or {}
        )
        await self._save_transaction(transaction)
        
        self.logger.info(f"Added {amount} {credit_type} credits to user {user_id}")
        return True
    
    async def check_credits(self, user_id: str) -> Tuple[int, Dict[str, int]]:
        """Check user's credit balance"""
        account = await self.get_account(user_id)
        if not account:
            raise AccountNotFoundError(f"No account found for user {user_id}")
        
        total_credits = account.get_total_credits()
        breakdown = {
            "current": account.current_credits,
            "monthly": account.monthly_credits,
            "bonus": account.bonus_credits,
            "purchased": account.purchased_credits
        }
        
        return total_credits, breakdown
    
    # Plan Management
    async def change_plan(self, user_id: str, new_plan_type: PlanType) -> bool:
        """Change user's credit plan"""
        account = await self.get_account(user_id)
        if not account:
            raise AccountNotFoundError(f"No account found for user {user_id}")
        
        new_plan = await self.get_plan_by_type(new_plan_type)
        if not new_plan:
            raise PlanNotFoundError(f"Plan {new_plan_type.value} not found")
        
        old_plan_id = account.plan_id
        account.plan_id = new_plan.plan_id
        
        # Reset monthly credits for new plan
        account.reset_monthly_credits(
            new_plan.monthly_credits,
            new_plan.rollover_credits,
            new_plan.max_rollover_credits
        )
        
        # Add bonus credits if any
        if new_plan.bonus_credits > 0:
            account.add_credits(new_plan.bonus_credits, "bonus")
        
        await self._save_account(account)
        
        # Log transaction
        transaction = CreditTransaction(
            account_id=account.account_id,
            user_id=user_id,
            transaction_type=TransactionType.PLAN_CHANGE,
            amount=new_plan.monthly_credits,
            description=f"Plan changed from {old_plan_id} to {new_plan.plan_id}",
            metadata={"old_plan": old_plan_id, "new_plan": new_plan.plan_id}
        )
        await self._save_transaction(transaction)
        
        self.logger.info(f"Changed plan for user {user_id} to {new_plan_type.value}")
        return True
    
    async def get_plan_by_type(self, plan_type: PlanType) -> Optional[CreditPlan]:
        """Get plan by type"""
        # Check cache first
        cache_key = f"plan_type_{plan_type.value}"
        if cache_key in self._plan_cache:
            return self._plan_cache[cache_key]
        
        # Load from Redis
        key = f"{self.config.redis_prefix}plan:type:{plan_type.value}"
        data = await self.redis.hgetall(key)
        
        if not data:
            # Return default plan
            plan = get_default_plan(plan_type)
            await self._save_plan(plan)
            return plan
        
        plan = CreditPlan.from_dict(data)
        self._plan_cache[cache_key] = plan
        return plan
    
    async def _save_plan(self, plan: CreditPlan):
        """Save plan to Redis"""
        key = f"{self.config.redis_prefix}plan:{plan.plan_id}"
        type_key = f"{self.config.redis_prefix}plan:type:{plan.plan_type.value}"
        
        plan_data = plan.to_dict()
        
        # Save plan data
        await self.redis.hset(key, mapping=plan_data)
        await self.redis.expire(key, self.config.plan_cache_ttl)
        
        # Save type mapping
        await self.redis.hset(type_key, mapping=plan_data)
        await self.redis.expire(type_key, self.config.plan_cache_ttl)
        
        # Update cache
        self._plan_cache[f"plan_type_{plan.plan_type.value}"] = plan
    
    # Usage and Analytics
    async def _record_usage(self, usage: CreditUsage):
        """Record credit usage"""
        if self.config.enable_usage_analytics:
            # Add to batch for efficient processing
            self._usage_batch.append(usage)
            
            # Process batch if it's full
            if len(self._usage_batch) >= self.config.usage_batch_size:
                await self._process_usage_batch()
    
    async def _process_usage_batch(self):
        """Process batched usage records"""
        if not self._usage_batch:
            return
        
        # Save all usage records
        pipe = self.redis.pipeline()
        
        for usage in self._usage_batch:
            key = f"{self.config.redis_prefix}usage:{usage.usage_id}"
            pipe.hset(key, mapping=usage.to_dict())
            
            # Set expiration based on retention policy
            expire_time = int(timedelta(days=self.config.usage_retention_days).total_seconds())
            pipe.expire(key, expire_time)
            
            # Add to user's usage index
            user_usage_key = f"{self.config.redis_prefix}user_usage:{usage.user_id}"
            pipe.zadd(user_usage_key, {usage.usage_id: usage.timestamp.timestamp()})
            pipe.expire(user_usage_key, expire_time)
        
        await pipe.execute()
        
        self.logger.debug(f"Processed {len(self._usage_batch)} usage records")
        self._usage_batch.clear()
    
    async def get_usage_history(self, user_id: str, limit: int = 100) -> List[CreditUsage]:
        """Get user's credit usage history"""
        user_usage_key = f"{self.config.redis_prefix}user_usage:{user_id}"
        
        # Get recent usage IDs
        usage_ids = await self.redis.zrevrange(user_usage_key, 0, limit - 1)
        
        if not usage_ids:
            return []
        
        # Get usage records
        usage_records = []
        for usage_id in usage_ids:
            key = f"{self.config.redis_prefix}usage:{usage_id}"
            data = await self.redis.hgetall(key)
            if data:
                usage_records.append(CreditUsage.from_dict(data))
        
        return usage_records
    
    # Transaction Management
    async def _save_transaction(self, transaction: CreditTransaction):
        """Save transaction record"""
        # Add to batch for efficient processing
        self._transaction_batch.append(transaction)
        
        # Process batch if it's full
        if len(self._transaction_batch) >= self.config.usage_batch_size:
            await self._process_transaction_batch()
    
    async def _process_transaction_batch(self):
        """Process batched transaction records"""
        if not self._transaction_batch:
            return
        
        pipe = self.redis.pipeline()
        
        for transaction in self._transaction_batch:
            key = f"{self.config.redis_prefix}transaction:{transaction.transaction_id}"
            pipe.hset(key, mapping=transaction.to_dict())
            
            # Set expiration
            expire_time = int(timedelta(days=self.config.usage_retention_days).total_seconds())
            pipe.expire(key, expire_time)
            
            # Add to user's transaction index
            user_tx_key = f"{self.config.redis_prefix}user_transactions:{transaction.user_id}"
            pipe.zadd(user_tx_key, {transaction.transaction_id: transaction.timestamp.timestamp()})
            pipe.expire(user_tx_key, expire_time)
        
        await pipe.execute()
        
        self.logger.debug(f"Processed {len(self._transaction_batch)} transaction records")
        self._transaction_batch.clear()
    
    async def get_transaction_history(self, user_id: str, limit: int = 100) -> List[CreditTransaction]:
        """Get user's transaction history"""
        user_tx_key = f"{self.config.redis_prefix}user_transactions:{user_id}"
        
        # Get recent transaction IDs
        tx_ids = await self.redis.zrevrange(user_tx_key, 0, limit - 1)
        
        if not tx_ids:
            return []
        
        # Get transaction records
        transactions = []
        for tx_id in tx_ids:
            key = f"{self.config.redis_prefix}transaction:{tx_id}"
            data = await self.redis.hgetall(key)
            if data:
                transactions.append(CreditTransaction.from_dict(data))
        
        return transactions
    
    # Monitoring and Alerts
    async def _check_credit_thresholds(self, account: CreditAccount):
        """Check if account is below credit thresholds"""
        usage_percentage = account.get_usage_percentage()
        remaining_percentage = 1.0 - (usage_percentage / 100.0)
        
        if remaining_percentage <= self.config.critical_credit_threshold:
            await self._send_credit_alert(account, "critical", remaining_percentage)
        elif remaining_percentage <= self.config.low_credit_threshold:
            await self._send_credit_alert(account, "low", remaining_percentage)
    
    async def _send_credit_alert(self, account: CreditAccount, level: str, remaining_percentage: float):
        """Send credit alert (placeholder for notification system)"""
        alert_data = {
            "user_id": account.user_id,
            "account_id": account.account_id,
            "level": level,
            "remaining_percentage": remaining_percentage,
            "total_credits": account.get_total_credits(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Store alert in Redis for processing by notification system
        alert_key = f"{self.config.redis_prefix}alerts:credit:{account.user_id}:{level}"
        await self.redis.hset(alert_key, mapping=alert_data)
        await self.redis.expire(alert_key, 3600)  # 1 hour
        
        self.logger.warning(f"Credit {level} alert for user {account.user_id}: {remaining_percentage:.1%} remaining")
    
    # Cleanup and Maintenance
    async def cleanup_expired_data(self):
        """Clean up expired data"""
        # This would be called periodically by a background task
        await self._process_usage_batch()
        await self._process_transaction_batch()
        
        # Clear local caches
        self._account_cache.clear()
        self._plan_cache.clear()
        
        self.logger.info("Cleaned up expired credit data")
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get system-wide credit statistics"""
        stats = {
            "total_accounts": 0,
            "active_accounts": 0,
            "total_credits_issued": 0,
            "total_credits_used": 0,
            "plans_distribution": {},
            "usage_by_type": {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # This would aggregate data from Redis
        # Implementation depends on specific requirements
        
        return stats


# Global credit manager instance
_credit_manager: Optional[CreditManager] = None


async def setup_credit_manager(config: Optional[CreditConfig] = None, redis_client=None) -> CreditManager:
    """Setup global credit manager"""
    global _credit_manager
    
    if config is None:
        config = CreditConfig.from_env()
    
    _credit_manager = CreditManager(config, redis_client)
    await _credit_manager.initialize()
    
    return _credit_manager


def get_credit_manager() -> CreditManager:
    """Get global credit manager"""
    if _credit_manager is None:
        raise RuntimeError("Credit manager not initialized. Call setup_credit_manager() first.")
    return _credit_manager


# Convenience functions
async def use_credits(user_id: str, amount: int, usage_type: UsageType, **kwargs) -> bool:
    """Convenience function to use credits"""
    manager = get_credit_manager()
    return await manager.use_credits(user_id, amount, usage_type, **kwargs)


async def add_credits(user_id: str, amount: int, **kwargs) -> bool:
    """Convenience function to add credits"""
    manager = get_credit_manager()
    return await manager.add_credits(user_id, amount, **kwargs)


async def check_credits(user_id: str) -> Tuple[int, Dict[str, int]]:
    """Convenience function to check credits"""
    manager = get_credit_manager()
    return await manager.check_credits(user_id)


async def create_account(user_id: str, plan_type: PlanType = PlanType.FREE) -> CreditAccount:
    """Convenience function to create account"""
    manager = get_credit_manager()
    return await manager.create_account(user_id, plan_type)