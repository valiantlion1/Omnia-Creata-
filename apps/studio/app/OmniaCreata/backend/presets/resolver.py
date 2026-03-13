import json
import re
import os
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from providers.base import GenerationRequest


@dataclass
class PresetConfig:
    """Configuration for a preset"""
    name: str
    description: str
    base_model: str
    loras: List[Dict[str, Any]]
    vae: str
    sampler: str
    steps: int
    cfg: float
    upscaler: str
    resolution: Dict[str, int]
    negative_prompt: str
    enhancement_prompts: List[str]
    tiled_upscale: bool = False
    refiner: Optional[Dict[str, Any]] = None


@dataclass
class LoRAMapping:
    """LoRA mapping configuration"""
    pattern: str
    loras: List[Dict[str, Any]]
    compiled_pattern: re.Pattern = None
    
    def __post_init__(self):
        self.compiled_pattern = re.compile(self.pattern, re.IGNORECASE)


class PresetResolver:
    """Resolves presets and applies keyword-based LoRA mappings"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "config/presets.json"
        self.presets: Dict[str, PresetConfig] = {}
        self.keyword_mappings: List[LoRAMapping] = []
        self.asset_paths: Dict[str, Any] = {}
        self.defaults: Dict[str, Any] = {}
        self.validation: Dict[str, Any] = {}
        
        self._load_config()
    
    def _load_config(self) -> None:
        """Load preset configuration from JSON file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Load presets
            for preset_name, preset_data in config.get('presets', {}).items():
                self.presets[preset_name] = PresetConfig(
                    name=preset_data['name'],
                    description=preset_data['description'],
                    base_model=preset_data['baseModel'],
                    loras=preset_data.get('loras', []),
                    vae=preset_data['vae'],
                    sampler=preset_data['sampler'],
                    steps=preset_data['steps'],
                    cfg=preset_data['cfg'],
                    upscaler=preset_data['upscaler'],
                    resolution=preset_data['resolution'],
                    negative_prompt=preset_data['negativePrompt'],
                    enhancement_prompts=preset_data['enhancementPrompts'],
                    tiled_upscale=preset_data.get('tiledUpscale', False),
                    refiner=preset_data.get('refiner')
                )
            
            # Load keyword mappings
            for pattern, loras in config.get('keywordMappings', {}).items():
                self.keyword_mappings.append(LoRAMapping(
                    pattern=pattern,
                    loras=loras
                ))
            
            # Load other configurations
            self.asset_paths = config.get('assetPaths', {})
            self.defaults = config.get('defaults', {})
            self.validation = config.get('validation', {})
            
        except FileNotFoundError:
            raise FileNotFoundError(f"Preset configuration file not found: {self.config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in preset configuration: {e}")
    
    def resolve_preset(self, prompt: str, preset_name: str = None) -> GenerationRequest:
        """Resolve a preset and apply keyword mappings to create a generation request"""
        # Use default preset if none specified
        if not preset_name:
            preset_name = self.defaults.get('preset', 'realistic')
        
        # Get preset configuration
        if preset_name not in self.presets:
            raise ValueError(f"Unknown preset: {preset_name}")
        
        preset = self.presets[preset_name]
        
        # Parse existing LoRA specifications in prompt
        prompt, explicit_loras = self._parse_explicit_loras(prompt)
        
        # Apply keyword-based LoRA mappings
        keyword_loras = self._apply_keyword_mappings(prompt)
        
        # Combine LoRAs: preset + keyword + explicit (explicit takes priority)
        combined_loras = self._combine_loras(
            preset.loras,
            keyword_loras,
            explicit_loras
        )
        
        # Enhance prompt with preset-specific terms
        enhanced_prompt = self._enhance_prompt(prompt, preset.enhancement_prompts)
        
        # Create generation request
        request = GenerationRequest(
            prompt=enhanced_prompt,
            negative_prompt=preset.negative_prompt,
            width=preset.resolution['width'],
            height=preset.resolution['height'],
            steps=preset.steps,
            cfg_scale=preset.cfg,
            sampler=preset.sampler,
            model=preset.base_model,
            loras=combined_loras,
            vae=preset.vae,
            upscaler=preset.upscaler
        )
        
        return request
    
    def _parse_explicit_loras(self, prompt: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Parse explicit LoRA specifications from prompt"""
        # Pattern: (lora:name:weight) or <lora:name:weight>
        lora_pattern = r'[(<]lora:([^:>)]+):([0-9.]+)[>)]'
        
        explicit_loras = []
        
        def replace_lora(match):
            name = match.group(1)
            weight = float(match.group(2))
            
            explicit_loras.append({
                'name': name if name.endswith('.safetensors') else f"{name}.safetensors",
                'weight': weight
            })
            
            return ''  # Remove from prompt
        
        cleaned_prompt = re.sub(lora_pattern, replace_lora, prompt)
        cleaned_prompt = re.sub(r'\s+', ' ', cleaned_prompt).strip()
        
        return cleaned_prompt, explicit_loras
    
    def _apply_keyword_mappings(self, prompt: str) -> List[Dict[str, Any]]:
        """Apply keyword-based LoRA mappings"""
        keyword_loras = []
        
        for mapping in self.keyword_mappings:
            if mapping.compiled_pattern.search(prompt):
                keyword_loras.extend(mapping.loras)
        
        return keyword_loras
    
    def _combine_loras(self, 
                      preset_loras: List[Dict[str, Any]], 
                      keyword_loras: List[Dict[str, Any]], 
                      explicit_loras: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Combine LoRAs from different sources, handling duplicates"""
        combined = {}
        
        # Add preset LoRAs
        for lora in preset_loras:
            name = lora['name']
            combined[name] = lora.copy()
        
        # Add keyword LoRAs (may override preset)
        for lora in keyword_loras:
            name = lora['name']
            if name in combined:
                # Average weights if both exist
                existing_weight = combined[name]['weight']
                new_weight = lora['weight']
                combined[name]['weight'] = (existing_weight + new_weight) / 2
            else:
                combined[name] = lora.copy()
        
        # Add explicit LoRAs (highest priority)
        for lora in explicit_loras:
            name = lora['name']
            combined[name] = lora.copy()
        
        # Limit to max LoRAs
        max_loras = self.validation.get('maxLoras', 5)
        lora_list = list(combined.values())[:max_loras]
        
        return lora_list
    
    def _enhance_prompt(self, prompt: str, enhancement_prompts: List[str]) -> str:
        """Enhance prompt with preset-specific terms"""
        # Check if prompt already contains enhancement terms
        prompt_lower = prompt.lower()
        missing_enhancements = []
        
        for enhancement in enhancement_prompts:
            if enhancement.lower() not in prompt_lower:
                missing_enhancements.append(enhancement)
        
        # Add missing enhancements
        if missing_enhancements:
            enhanced = f"{prompt}, {', '.join(missing_enhancements)}"
        else:
            enhanced = prompt
        
        return enhanced
    
    def get_available_presets(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available presets with their descriptions"""
        presets_info = {}
        
        for name, preset in self.presets.items():
            presets_info[name] = {
                'name': preset.name,
                'description': preset.description,
                'steps': preset.steps,
                'cfg': preset.cfg,
                'sampler': preset.sampler,
                'resolution': preset.resolution,
                'loras': len(preset.loras),
                'upscaler': preset.upscaler
            }
        
        return presets_info
    
    def validate_request(self, request: GenerationRequest) -> List[str]:
        """Validate a generation request against configuration limits"""
        errors = []
        
        # Validate steps
        min_steps = self.validation.get('minSteps', 10)
        max_steps = self.validation.get('maxSteps', 100)
        if not (min_steps <= request.steps <= max_steps):
            errors.append(f"Steps must be between {min_steps} and {max_steps}")
        
        # Validate CFG
        min_cfg = self.validation.get('minCfg', 1.0)
        max_cfg = self.validation.get('maxCfg', 20.0)
        if not (min_cfg <= request.cfg_scale <= max_cfg):
            errors.append(f"CFG scale must be between {min_cfg} and {max_cfg}")
        
        # Validate resolution
        min_res = self.validation.get('minResolution', 256)
        max_res = self.validation.get('maxResolution', 2048)
        if not (min_res <= request.width <= max_res) or not (min_res <= request.height <= max_res):
            errors.append(f"Resolution must be between {min_res}x{min_res} and {max_res}x{max_res}")
        
        # Validate sampler
        supported_samplers = self.validation.get('supportedSamplers', [])
        if supported_samplers and request.sampler not in supported_samplers:
            errors.append(f"Unsupported sampler: {request.sampler}")
        
        # Validate LoRA count
        max_loras = self.validation.get('maxLoras', 5)
        if request.loras and len(request.loras) > max_loras:
            errors.append(f"Too many LoRAs: {len(request.loras)} (max: {max_loras})")
        
        return errors
    
    def get_preset_by_style(self, style_keywords: List[str]) -> str:
        """Get best matching preset based on style keywords"""
        style_mapping = {
            'realistic': ['photo', 'realistic', 'real', 'photography', 'portrait'],
            'anime': ['anime', 'manga', 'cartoon', 'animated', 'cel'],
            'ultra': ['ultra', 'masterpiece', 'detailed', 'high quality', 'professional']
        }
        
        scores = {}
        for preset_name, keywords in style_mapping.items():
            score = sum(1 for keyword in style_keywords if any(k in keyword.lower() for k in keywords))
            scores[preset_name] = score
        
        # Return preset with highest score, or default
        best_preset = max(scores.items(), key=lambda x: x[1])[0]
        return best_preset if scores[best_preset] > 0 else self.defaults.get('preset', 'realistic')