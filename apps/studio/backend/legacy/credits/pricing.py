from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import math

from .models import UsageType, PlanType


class PricingModel(Enum):
    """Pricing model types"""
    FIXED = "fixed"  # Fixed cost per operation
    TIERED = "tiered"  # Different rates based on usage tiers
    DYNAMIC = "dynamic"  # Dynamic pricing based on demand/complexity
    SUBSCRIPTION = "subscription"  # Flat monthly rate
    PAY_AS_YOU_GO = "pay_as_you_go"  # Pay only for what you use


class ComplexityLevel(Enum):
    """Image generation complexity levels"""
    SIMPLE = "simple"  # Basic prompts, standard settings
    MODERATE = "moderate"  # Detailed prompts, some advanced settings
    COMPLEX = "complex"  # Very detailed prompts, advanced settings
    ULTRA = "ultra"  # Maximum quality, all advanced features


@dataclass
class PricingRule:
    """Individual pricing rule"""
    rule_id: str
    name: str
    description: str
    
    # Conditions
    usage_type: UsageType
    plan_types: List[PlanType] = field(default_factory=list)  # Empty means all plans
    min_quantity: int = 1
    max_quantity: Optional[int] = None
    
    # Pricing
    base_cost: float = 1.0
    cost_per_unit: float = 1.0
    multiplier: float = 1.0
    
    # Advanced pricing
    tier_rates: Dict[int, float] = field(default_factory=dict)  # {tier_threshold: rate}
    complexity_multipliers: Dict[ComplexityLevel, float] = field(default_factory=dict)
    
    # Time-based pricing
    peak_hours_multiplier: float = 1.0
    peak_hours: List[int] = field(default_factory=list)  # Hours of day (0-23)
    
    # Metadata
    active: bool = True
    priority: int = 100  # Lower number = higher priority
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def applies_to(self, usage_type: UsageType, plan_type: PlanType, quantity: int) -> bool:
        """Check if this rule applies to the given parameters"""
        if not self.active:
            return False
        
        if self.usage_type != usage_type:
            return False
        
        if self.plan_types and plan_type not in self.plan_types:
            return False
        
        if quantity < self.min_quantity:
            return False
        
        if self.max_quantity is not None and quantity > self.max_quantity:
            return False
        
        return True
    
    def calculate_cost(self, quantity: int, complexity: Optional[ComplexityLevel] = None, 
                     timestamp: Optional[datetime] = None) -> float:
        """Calculate cost based on this rule"""
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)
        
        # Base calculation
        if self.tier_rates:
            cost = self._calculate_tiered_cost(quantity)
        else:
            cost = self.base_cost + (self.cost_per_unit * quantity)
        
        # Apply multiplier
        cost *= self.multiplier
        
        # Apply complexity multiplier
        if complexity and complexity in self.complexity_multipliers:
            cost *= self.complexity_multipliers[complexity]
        
        # Apply peak hours multiplier
        if self.peak_hours and timestamp.hour in self.peak_hours:
            cost *= self.peak_hours_multiplier
        
        return max(0.0, cost)
    
    def _calculate_tiered_cost(self, quantity: int) -> float:
        """Calculate cost using tiered pricing"""
        if not self.tier_rates:
            return self.base_cost + (self.cost_per_unit * quantity)
        
        total_cost = self.base_cost
        remaining_quantity = quantity
        
        # Sort tiers by threshold
        sorted_tiers = sorted(self.tier_rates.items())
        
        for i, (threshold, rate) in enumerate(sorted_tiers):
            if remaining_quantity <= 0:
                break
            
            # Calculate quantity for this tier
            if i == 0:
                tier_quantity = min(remaining_quantity, threshold)
            else:
                prev_threshold = sorted_tiers[i-1][0]
                tier_quantity = min(remaining_quantity, threshold - prev_threshold)
            
            total_cost += tier_quantity * rate
            remaining_quantity -= tier_quantity
        
        # Handle remaining quantity at highest tier rate
        if remaining_quantity > 0 and sorted_tiers:
            highest_rate = sorted_tiers[-1][1]
            total_cost += remaining_quantity * highest_rate
        
        return total_cost


@dataclass
class PricingConfig:
    """Pricing engine configuration"""
    # Default costs (in credits)
    default_image_generation_cost: int = 10
    default_upscaling_cost: int = 5
    default_processing_cost: int = 3
    default_storage_cost_per_mb: float = 0.1
    
    # Resolution-based multipliers
    resolution_multipliers: Dict[str, float] = field(default_factory=lambda: {
        "512x512": 1.0,
        "768x768": 1.5,
        "1024x1024": 2.0,
        "1536x1536": 3.0,
        "2048x2048": 4.0
    })
    
    # Model-based multipliers
    model_multipliers: Dict[str, float] = field(default_factory=lambda: {
        "stable-diffusion-xl": 1.0,
        "stable-diffusion-3": 1.5,
        "dalle-3": 2.0,
        "midjourney": 2.5
    })
    
    # Quality multipliers
    quality_multipliers: Dict[str, float] = field(default_factory=lambda: {
        "draft": 0.5,
        "standard": 1.0,
        "high": 1.5,
        "ultra": 2.0
    })
    
    # Batch processing discounts
    batch_discounts: Dict[int, float] = field(default_factory=lambda: {
        5: 0.95,   # 5% discount for 5+ images
        10: 0.90,  # 10% discount for 10+ images
        25: 0.85,  # 15% discount for 25+ images
        50: 0.80,  # 20% discount for 50+ images
        100: 0.75  # 25% discount for 100+ images
    })
    
    # Plan-based discounts
    plan_discounts: Dict[PlanType, float] = field(default_factory=lambda: {
        PlanType.FREE: 1.0,
        PlanType.STARTER: 0.95,
        PlanType.PRO: 0.90,
        PlanType.ENTERPRISE: 0.80
    })
    
    # Dynamic pricing settings
    enable_dynamic_pricing: bool = False
    peak_hours: List[int] = field(default_factory=lambda: [9, 10, 11, 14, 15, 16, 19, 20, 21])
    peak_multiplier: float = 1.2
    off_peak_multiplier: float = 0.9
    
    # Complexity analysis
    enable_complexity_analysis: bool = True
    complexity_keywords: Dict[ComplexityLevel, List[str]] = field(default_factory=lambda: {
        ComplexityLevel.SIMPLE: ["simple", "basic", "minimal"],
        ComplexityLevel.MODERATE: ["detailed", "realistic", "artistic"],
        ComplexityLevel.COMPLEX: ["highly detailed", "photorealistic", "intricate"],
        ComplexityLevel.ULTRA: ["ultra detailed", "masterpiece", "8k", "professional"]
    })
    
    @classmethod
    def from_env(cls) -> 'PricingConfig':
        """Create config from environment variables"""
        import os
        
        return cls(
            default_image_generation_cost=int(os.getenv('PRICING_DEFAULT_IMAGE_COST', '10')),
            default_upscaling_cost=int(os.getenv('PRICING_DEFAULT_UPSCALE_COST', '5')),
            default_processing_cost=int(os.getenv('PRICING_DEFAULT_PROCESS_COST', '3')),
            default_storage_cost_per_mb=float(os.getenv('PRICING_STORAGE_COST_PER_MB', '0.1')),
            enable_dynamic_pricing=os.getenv('PRICING_DYNAMIC_ENABLED', 'false').lower() == 'true',
            peak_multiplier=float(os.getenv('PRICING_PEAK_MULTIPLIER', '1.2')),
            off_peak_multiplier=float(os.getenv('PRICING_OFF_PEAK_MULTIPLIER', '0.9')),
            enable_complexity_analysis=os.getenv('PRICING_COMPLEXITY_ANALYSIS', 'true').lower() == 'true'
        )


class PricingEngine:
    """Main pricing calculation engine"""
    
    def __init__(self, config: PricingConfig):
        self.config = config
        self.rules: List[PricingRule] = []
        self.custom_calculators: Dict[UsageType, Callable] = {}
        
        # Load default rules
        self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default pricing rules"""
        # Image generation rules
        self.add_rule(PricingRule(
            rule_id="default_image_generation",
            name="Default Image Generation",
            description="Standard pricing for image generation",
            usage_type=UsageType.IMAGE_GENERATION,
            base_cost=0,
            cost_per_unit=self.config.default_image_generation_cost,
            complexity_multipliers={
                ComplexityLevel.SIMPLE: 0.8,
                ComplexityLevel.MODERATE: 1.0,
                ComplexityLevel.COMPLEX: 1.3,
                ComplexityLevel.ULTRA: 1.6
            }
        ))
        
        # Upscaling rules
        self.add_rule(PricingRule(
            rule_id="default_upscaling",
            name="Default Upscaling",
            description="Standard pricing for image upscaling",
            usage_type=UsageType.IMAGE_UPSCALING,
            base_cost=0,
            cost_per_unit=self.config.default_upscaling_cost
        ))
        
        # Processing rules
        self.add_rule(PricingRule(
            rule_id="default_processing",
            name="Default Processing",
            description="Standard pricing for image processing",
            usage_type=UsageType.IMAGE_PROCESSING,
            base_cost=0,
            cost_per_unit=self.config.default_processing_cost
        ))
        
        # Tiered pricing for high volume
        self.add_rule(PricingRule(
            rule_id="bulk_image_generation",
            name="Bulk Image Generation",
            description="Tiered pricing for bulk image generation",
            usage_type=UsageType.IMAGE_GENERATION,
            min_quantity=10,
            base_cost=0,
            tier_rates={
                10: self.config.default_image_generation_cost * 0.95,
                25: self.config.default_image_generation_cost * 0.90,
                50: self.config.default_image_generation_cost * 0.85,
                100: self.config.default_image_generation_cost * 0.80
            },
            priority=50  # Higher priority than default rule
        ))
    
    def add_rule(self, rule: PricingRule):
        """Add a pricing rule"""
        self.rules.append(rule)
        # Sort by priority (lower number = higher priority)
        self.rules.sort(key=lambda r: r.priority)
    
    def remove_rule(self, rule_id: str) -> bool:
        """Remove a pricing rule"""
        for i, rule in enumerate(self.rules):
            if rule.rule_id == rule_id:
                del self.rules[i]
                return True
        return False
    
    def get_rule(self, rule_id: str) -> Optional[PricingRule]:
        """Get a pricing rule by ID"""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                return rule
        return None
    
    def register_custom_calculator(self, usage_type: UsageType, calculator: Callable):
        """Register a custom cost calculator for a usage type"""
        self.custom_calculators[usage_type] = calculator
    
    def calculate_cost(self, usage_type: UsageType, quantity: int = 1, 
                     plan_type: PlanType = PlanType.FREE, **kwargs) -> int:
        """Calculate cost for a given usage"""
        # Check for custom calculator first
        if usage_type in self.custom_calculators:
            return self.custom_calculators[usage_type](quantity, plan_type, **kwargs)
        
        # Find applicable rule
        applicable_rule = None
        for rule in self.rules:
            if rule.applies_to(usage_type, plan_type, quantity):
                applicable_rule = rule
                break
        
        if not applicable_rule:
            # Fallback to default costs
            return self._calculate_default_cost(usage_type, quantity, **kwargs)
        
        # Extract parameters
        complexity = kwargs.get('complexity')
        timestamp = kwargs.get('timestamp')
        
        # Calculate base cost using rule
        base_cost = applicable_rule.calculate_cost(quantity, complexity, timestamp)
        
        # Apply additional modifiers
        final_cost = self._apply_modifiers(base_cost, usage_type, quantity, plan_type, **kwargs)
        
        # Convert to integer credits (round up)
        return max(1, math.ceil(final_cost))
    
    def _calculate_default_cost(self, usage_type: UsageType, quantity: int, **kwargs) -> float:
        """Calculate default cost when no rules apply"""
        base_costs = {
            UsageType.IMAGE_GENERATION: self.config.default_image_generation_cost,
            UsageType.IMAGE_UPSCALING: self.config.default_upscaling_cost,
            UsageType.IMAGE_PROCESSING: self.config.default_processing_cost,
            UsageType.STORAGE: self.config.default_storage_cost_per_mb,
        }
        
        return base_costs.get(usage_type, 1.0) * quantity
    
    def _apply_modifiers(self, base_cost: float, usage_type: UsageType, quantity: int, 
                        plan_type: PlanType, **kwargs) -> float:
        """Apply various cost modifiers"""
        cost = base_cost
        
        # Resolution modifier
        resolution = kwargs.get('resolution')
        if resolution and resolution in self.config.resolution_multipliers:
            cost *= self.config.resolution_multipliers[resolution]
        
        # Model modifier
        model = kwargs.get('model')
        if model and model in self.config.model_multipliers:
            cost *= self.config.model_multipliers[model]
        
        # Quality modifier
        quality = kwargs.get('quality')
        if quality and quality in self.config.quality_multipliers:
            cost *= self.config.quality_multipliers[quality]
        
        # Batch discount
        if quantity > 1:
            for threshold, discount in sorted(self.config.batch_discounts.items(), reverse=True):
                if quantity >= threshold:
                    cost *= discount
                    break
        
        # Plan discount
        if plan_type in self.config.plan_discounts:
            cost *= self.config.plan_discounts[plan_type]
        
        # Dynamic pricing
        if self.config.enable_dynamic_pricing:
            timestamp = kwargs.get('timestamp', datetime.now(timezone.utc))
            if timestamp.hour in self.config.peak_hours:
                cost *= self.config.peak_multiplier
            else:
                cost *= self.config.off_peak_multiplier
        
        return cost
    
    def analyze_prompt_complexity(self, prompt: str) -> ComplexityLevel:
        """Analyze prompt complexity based on keywords"""
        if not self.config.enable_complexity_analysis:
            return ComplexityLevel.MODERATE
        
        prompt_lower = prompt.lower()
        
        # Count keywords for each complexity level
        complexity_scores = {}
        for level, keywords in self.config.complexity_keywords.items():
            score = sum(1 for keyword in keywords if keyword in prompt_lower)
            complexity_scores[level] = score
        
        # Determine complexity based on highest score
        if complexity_scores[ComplexityLevel.ULTRA] > 0:
            return ComplexityLevel.ULTRA
        elif complexity_scores[ComplexityLevel.COMPLEX] > 0:
            return ComplexityLevel.COMPLEX
        elif complexity_scores[ComplexityLevel.SIMPLE] > complexity_scores[ComplexityLevel.MODERATE]:
            return ComplexityLevel.SIMPLE
        else:
            return ComplexityLevel.MODERATE
    
    def estimate_generation_cost(self, prompt: str, model: str = "stable-diffusion-xl", 
                               resolution: str = "1024x1024", quality: str = "standard",
                               quantity: int = 1, plan_type: PlanType = PlanType.FREE) -> Dict[str, Any]:
        """Estimate cost for image generation with detailed breakdown"""
        complexity = self.analyze_prompt_complexity(prompt)
        
        cost = self.calculate_cost(
            usage_type=UsageType.IMAGE_GENERATION,
            quantity=quantity,
            plan_type=plan_type,
            complexity=complexity,
            model=model,
            resolution=resolution,
            quality=quality
        )
        
        return {
            "total_cost": cost,
            "cost_per_image": cost / quantity if quantity > 0 else 0,
            "complexity": complexity.value,
            "modifiers": {
                "model": model,
                "resolution": resolution,
                "quality": quality,
                "plan_discount": self.config.plan_discounts.get(plan_type, 1.0),
                "batch_discount": self._get_batch_discount(quantity)
            },
            "breakdown": {
                "base_cost": self.config.default_image_generation_cost * quantity,
                "complexity_multiplier": self._get_complexity_multiplier(complexity),
                "resolution_multiplier": self.config.resolution_multipliers.get(resolution, 1.0),
                "model_multiplier": self.config.model_multipliers.get(model, 1.0),
                "quality_multiplier": self.config.quality_multipliers.get(quality, 1.0)
            }
        }
    
    def _get_batch_discount(self, quantity: int) -> float:
        """Get batch discount for quantity"""
        for threshold, discount in sorted(self.config.batch_discounts.items(), reverse=True):
            if quantity >= threshold:
                return discount
        return 1.0
    
    def _get_complexity_multiplier(self, complexity: ComplexityLevel) -> float:
        """Get complexity multiplier"""
        # Find the rule that has complexity multipliers
        for rule in self.rules:
            if rule.usage_type == UsageType.IMAGE_GENERATION and complexity in rule.complexity_multipliers:
                return rule.complexity_multipliers[complexity]
        return 1.0


class CostCalculator:
    """Utility class for common cost calculations"""
    
    def __init__(self, pricing_engine: PricingEngine):
        self.engine = pricing_engine
    
    def image_generation_cost(self, **kwargs) -> int:
        """Calculate image generation cost"""
        return self.engine.calculate_cost(UsageType.IMAGE_GENERATION, **kwargs)
    
    def upscaling_cost(self, **kwargs) -> int:
        """Calculate upscaling cost"""
        return self.engine.calculate_cost(UsageType.IMAGE_UPSCALING, **kwargs)
    
    def processing_cost(self, **kwargs) -> int:
        """Calculate processing cost"""
        return self.engine.calculate_cost(UsageType.IMAGE_PROCESSING, **kwargs)
    
    def storage_cost(self, size_mb: float, **kwargs) -> int:
        """Calculate storage cost"""
        return self.engine.calculate_cost(UsageType.STORAGE, quantity=int(size_mb), **kwargs)
    
    def batch_generation_cost(self, prompts: List[str], **kwargs) -> Dict[str, Any]:
        """Calculate cost for batch generation"""
        total_cost = 0
        individual_costs = []
        
        for prompt in prompts:
            complexity = self.engine.analyze_prompt_complexity(prompt)
            cost = self.engine.calculate_cost(
                UsageType.IMAGE_GENERATION,
                quantity=1,
                complexity=complexity,
                **kwargs
            )
            individual_costs.append({
                "prompt": prompt[:50] + "..." if len(prompt) > 50 else prompt,
                "complexity": complexity.value,
                "cost": cost
            })
            total_cost += cost
        
        # Apply batch discount
        batch_discount = self.engine._get_batch_discount(len(prompts))
        final_cost = int(total_cost * batch_discount)
        
        return {
            "total_cost": final_cost,
            "original_cost": total_cost,
            "batch_discount": batch_discount,
            "savings": total_cost - final_cost,
            "individual_costs": individual_costs
        }


# Global pricing engine instance
_pricing_engine: Optional[PricingEngine] = None


def setup_pricing_engine(config: Optional[PricingConfig] = None) -> PricingEngine:
    """Setup global pricing engine"""
    global _pricing_engine
    
    if config is None:
        config = PricingConfig.from_env()
    
    _pricing_engine = PricingEngine(config)
    return _pricing_engine


def get_pricing_engine() -> PricingEngine:
    """Get global pricing engine"""
    if _pricing_engine is None:
        raise RuntimeError("Pricing engine not initialized. Call setup_pricing_engine() first.")
    return _pricing_engine


# Convenience functions
def get_operation_cost(usage_type: UsageType, **kwargs) -> int:
    """Get cost for an operation"""
    engine = get_pricing_engine()
    return engine.calculate_cost(usage_type, **kwargs)


def calculate_image_generation_cost(prompt: str, **kwargs) -> Dict[str, Any]:
    """Calculate image generation cost with breakdown"""
    engine = get_pricing_engine()
    return engine.estimate_generation_cost(prompt, **kwargs)


def calculate_upscaling_cost(quantity: int = 1, **kwargs) -> int:
    """Calculate upscaling cost"""
    engine = get_pricing_engine()
    return engine.calculate_cost(UsageType.IMAGE_UPSCALING, quantity=quantity, **kwargs)


def calculate_processing_cost(quantity: int = 1, **kwargs) -> int:
    """Calculate processing cost"""
    engine = get_pricing_engine()
    return engine.calculate_cost(UsageType.IMAGE_PROCESSING, quantity=quantity, **kwargs)