import json
from typing import Dict, Any, Optional
from .base import (
    BaseProvider, 
    GenerationRequest, 
    GenerationResponse, 
    ProviderHealth, 
    ProviderStatus,
    ProviderError
)


class OpenRouterProvider(BaseProvider):
    """OpenRouter provider for LLM tasks and prompt enhancement"""
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get OpenRouter authentication headers"""
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "HTTP-Referer": "https://omniacreata.studio",
            "X-Title": "Omnia Creata Studio"
        }
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """OpenRouter doesn't generate images directly, but can enhance prompts"""
        raise ProviderError(
            "OpenRouter provider is for text generation only, not image generation",
            self.config.name,
            "invalid_operation"
        )
    
    async def enhance_prompt(self, prompt: str, style: str = "realistic", model: str = "anthropic/claude-3.5-sonnet") -> str:
        """Enhance a prompt using OpenRouter LLM"""
        import time
        start_time = time.time()
        
        # Build enhancement prompt based on style
        style_instructions = {
            "realistic": "photorealistic, high quality, detailed, professional photography, cinematic lighting",
            "anime": "anime style, manga, detailed anime art, vibrant colors, studio quality animation",
            "ultra": "ultra high quality, masterpiece, extremely detailed, cinematic lighting, award-winning"
        }
        
        system_prompt = f"""
You are an expert AI art prompt engineer specializing in {style} style image generation.
Your task is to enhance prompts for optimal results with diffusion models like Stable Diffusion XL.

Guidelines:
- Add relevant {style_instructions.get(style, 'high quality')} descriptors
- Include technical photography/art terms when appropriate
- Improve composition and lighting descriptions
- Keep the core concept intact
- Make it more specific and detailed
- Use comma-separated format
- Avoid overly long prompts (max 200 words)

Return only the enhanced prompt, no explanations."""
        
        user_prompt = f"Enhance this prompt for {style} style: {prompt}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 500,
            "top_p": 0.9
        }
        
        response = await self._make_request(
            "POST",
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"OpenRouter API error: {error_text}",
                self.config.name
            )
        
        result = await response.json()
        
        try:
            enhanced_prompt = result["choices"][0]["message"]["content"].strip()
            return enhanced_prompt
        except (KeyError, IndexError) as e:
            raise ProviderError(
                f"Unexpected OpenRouter response format: {e}",
                self.config.name
            )
    
    async def analyze_image_prompt(self, prompt: str, model: str = "anthropic/claude-3.5-sonnet") -> Dict[str, Any]:
        """Analyze a prompt and extract components"""
        system_prompt = """
You are an AI art analysis expert. Analyze image generation prompts and extract key components.
Return your analysis as a valid JSON object with these exact fields:
- subject: main subject/character
- style: art style (realistic, anime, cartoon, etc.)
- mood: emotional tone
- lighting: lighting description
- composition: camera angle, framing
- colors: array of dominant colors mentioned
- technical: array of technical terms (4K, HDR, etc.)
- keywords: array of important descriptive keywords

Return only valid JSON, no explanations."""
        
        user_prompt = f"Analyze this image prompt: {prompt}"
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 400,
            "top_p": 0.8
        }
        
        response = await self._make_request(
            "POST",
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"OpenRouter API error: {error_text}",
                self.config.name
            )
        
        result = await response.json()
        
        try:
            analysis_text = result["choices"][0]["message"]["content"].strip()
            # Try to parse as JSON
            analysis = json.loads(analysis_text)
            return analysis
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            # Return basic analysis if parsing fails
            return {
                "subject": "unknown",
                "style": "realistic",
                "mood": "neutral",
                "lighting": "natural",
                "composition": "standard",
                "colors": [],
                "technical": [],
                "keywords": prompt.split()[:10]
            }
    
    async def health_check(self) -> ProviderHealth:
        """Check OpenRouter API health"""
        try:
            # Simple test request
            test_payload = {
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "user",
                        "content": "Hello"
                    }
                ],
                "max_tokens": 5
            }
            
            response = await self._make_request(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                json=test_payload
            )
            
            if response.status == 200:
                self.health.status = ProviderStatus.HEALTHY
            else:
                self.health.status = ProviderStatus.DEGRADED
                error_text = await response.text()
                self.health.last_error = f"HTTP {response.status}: {error_text}"
            
            return self.health
            
        except Exception as e:
            self.health.status = ProviderStatus.UNAVAILABLE
            self.health.last_error = str(e)
            return self.health
    
    async def get_available_models(self) -> list[str]:
        """Get list of popular OpenRouter models for prompt enhancement"""
        return [
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-haiku",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "openai/gpt-3.5-turbo",
            "meta-llama/llama-3.1-8b-instruct",
            "google/gemini-pro",
            "mistralai/mistral-7b-instruct"
        ]