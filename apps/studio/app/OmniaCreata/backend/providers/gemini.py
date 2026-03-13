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


class GeminiProvider(BaseProvider):
    """Google Gemini provider for prompt enhancement and LLM tasks"""
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get Gemini authentication headers"""
        return {
            "x-goog-api-key": self.config.api_key
        }
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Gemini doesn't generate images directly, but can enhance prompts"""
        raise ProviderError(
            "Gemini provider is for text generation only, not image generation",
            self.config.name,
            "invalid_operation"
        )
    
    async def enhance_prompt(self, prompt: str, style: str = "realistic") -> str:
        """Enhance a prompt using Gemini"""
        import time
        start_time = time.time()
        
        # Build enhancement prompt based on style
        style_instructions = {
            "realistic": "photorealistic, high quality, detailed, professional photography",
            "anime": "anime style, manga, detailed anime art, vibrant colors",
            "ultra": "ultra high quality, masterpiece, extremely detailed, cinematic lighting"
        }
        
        enhancement_prompt = f"""
You are an expert AI art prompt engineer. Enhance the following prompt for {style} style image generation.

Original prompt: {prompt}

Enhance this prompt by:
1. Adding relevant {style_instructions.get(style, 'high quality')} descriptors
2. Improving composition and lighting descriptions
3. Adding technical photography/art terms when appropriate
4. Keeping the core concept intact
5. Making it more specific and detailed

Return only the enhanced prompt, no explanations:"""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": enhancement_prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024
            }
        }
        
        model = "gemini-1.5-flash"  # Default model
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        
        response = await self._make_request(
            "POST",
            url,
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"Gemini API error: {error_text}",
                self.config.name
            )
        
        result = await response.json()
        
        try:
            enhanced_prompt = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            return enhanced_prompt
        except (KeyError, IndexError) as e:
            raise ProviderError(
                f"Unexpected Gemini response format: {e}",
                self.config.name
            )
    
    async def analyze_image_prompt(self, prompt: str) -> Dict[str, Any]:
        """Analyze a prompt and extract components"""
        analysis_prompt = f"""
Analyze this image generation prompt and extract key components in JSON format:

Prompt: {prompt}

Return a JSON object with these fields:
- subject: main subject/character
- style: art style (realistic, anime, cartoon, etc.)
- mood: emotional tone
- lighting: lighting description
- composition: camera angle, framing
- colors: dominant colors mentioned
- technical: technical terms (4K, HDR, etc.)
- keywords: important descriptive keywords

Return only valid JSON:"""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": analysis_prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 20,
                "topP": 0.8,
                "maxOutputTokens": 512
            }
        }
        
        model = "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        
        response = await self._make_request(
            "POST",
            url,
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"Gemini API error: {error_text}",
                self.config.name
            )
        
        result = await response.json()
        
        try:
            analysis_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
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
        """Check Gemini API health"""
        try:
            # Simple test request
            test_payload = {
                "contents": [{
                    "parts": [{
                        "text": "Hello"
                    }]
                }],
                "generationConfig": {
                    "maxOutputTokens": 10
                }
            }
            
            response = await self._make_request(
                "POST",
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
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
        """Get list of available Gemini models"""
        return [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
        ]