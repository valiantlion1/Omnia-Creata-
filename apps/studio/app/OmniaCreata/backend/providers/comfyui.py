import json
import uuid
import asyncio
from typing import Dict, Any, Optional
from .base import (
    BaseProvider, 
    GenerationRequest, 
    GenerationResponse, 
    ProviderHealth, 
    ProviderStatus,
    ProviderError,
    ProviderUnavailableError
)


class ComfyUIProvider(BaseProvider):
    """ComfyUI provider for local image generation"""
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """ComfyUI doesn't require authentication headers"""
        return {}
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate image using ComfyUI"""
        workflow = self._build_workflow(request)
        
        # Queue the workflow
        prompt_id = await self._queue_prompt(workflow)
        
        # Wait for completion and get result
        result = await self._wait_for_completion(prompt_id)
        
        return GenerationResponse(
            image_url=result["image_url"],
            thumbnail_url=result.get("thumbnail_url"),
            metadata={
                "prompt": request.prompt,
                "negative_prompt": request.negative_prompt,
                "steps": request.steps,
                "cfg_scale": request.cfg_scale,
                "sampler": request.sampler,
                "seed": result.get("seed"),
                "model": request.model,
                "loras": request.loras,
                "vae": request.vae,
                "workflow_id": prompt_id
            },
            provider=self.config.name,
            generation_time_ms=result["generation_time_ms"],
            cost_estimate=self.config.cost_estimate_per_request,
            job_id=prompt_id
        )
    
    async def health_check(self) -> ProviderHealth:
        """Check ComfyUI health"""
        try:
            response = await self._make_request(
                "GET", 
                f"{self.config.base_url}/system_stats"
            )
            
            if response.status == 200:
                stats = await response.json()
                self.health.status = ProviderStatus.HEALTHY
                return self.health
            else:
                self.health.status = ProviderStatus.DEGRADED
                return self.health
                
        except Exception as e:
            self.health.status = ProviderStatus.UNAVAILABLE
            self.health.last_error = str(e)
            return self.health
    
    def _build_workflow(self, request: GenerationRequest) -> Dict[str, Any]:
        """Build ComfyUI workflow from generation request"""
        # Base workflow structure
        workflow = {
            "1": {
                "inputs": {
                    "ckpt_name": request.model or "sd_xl_base_1.0.safetensors"
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {"title": "Load Checkpoint"}
            },
            "2": {
                "inputs": {
                    "text": request.prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "CLIP Text Encode (Prompt)"}
            },
            "3": {
                "inputs": {
                    "text": request.negative_prompt or "",
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "CLIP Text Encode (Negative)"}
            },
            "4": {
                "inputs": {
                    "width": request.width,
                    "height": request.height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "_meta": {"title": "Empty Latent Image"}
            },
            "5": {
                "inputs": {
                    "seed": request.seed or -1,
                    "steps": request.steps,
                    "cfg": request.cfg_scale,
                    "sampler_name": request.sampler,
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0]
                },
                "class_type": "KSampler",
                "_meta": {"title": "KSampler"}
            }
        }
        
        # Add VAE decode
        node_id = 6
        if request.vae:
            # Load custom VAE
            workflow[str(node_id)] = {
                "inputs": {
                    "vae_name": request.vae
                },
                "class_type": "VAELoader",
                "_meta": {"title": "Load VAE"}
            }
            vae_input = [str(node_id), 0]
            node_id += 1
        else:
            # Use checkpoint VAE
            vae_input = ["1", 2]
        
        # VAE Decode
        workflow[str(node_id)] = {
            "inputs": {
                "samples": ["5", 0],
                "vae": vae_input
            },
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        }
        decode_node = str(node_id)
        node_id += 1
        
        # Add LoRA nodes if specified
        if request.loras:
            model_input = ["1", 0]
            clip_input = ["1", 1]
            
            for i, lora in enumerate(request.loras):
                lora_node = str(node_id)
                workflow[lora_node] = {
                    "inputs": {
                        "lora_name": lora["name"],
                        "strength_model": lora.get("weight", 0.75),
                        "strength_clip": lora.get("weight", 0.75),
                        "model": model_input,
                        "clip": clip_input
                    },
                    "class_type": "LoraLoader",
                    "_meta": {"title": f"Load LoRA {i+1}"}
                }
                model_input = [lora_node, 0]
                clip_input = [lora_node, 1]
                node_id += 1
            
            # Update sampler to use LoRA-modified model
            workflow["5"]["inputs"]["model"] = model_input
            # Update text encoders to use LoRA-modified CLIP
            workflow["2"]["inputs"]["clip"] = clip_input
            workflow["3"]["inputs"]["clip"] = clip_input
        
        # Add upscaler if specified
        if request.upscaler:
            upscale_node = str(node_id)
            workflow[upscale_node] = {
                "inputs": {
                    "upscale_model": request.upscaler,
                    "image": [decode_node, 0]
                },
                "class_type": "ImageUpscaleWithModel",
                "_meta": {"title": "Upscale Image"}
            }
            final_image_node = upscale_node
            node_id += 1
        else:
            final_image_node = decode_node
        
        # Save image
        workflow[str(node_id)] = {
            "inputs": {
                "filename_prefix": "omnia_creata",
                "images": [final_image_node, 0]
            },
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
        
        return workflow
    
    async def _queue_prompt(self, workflow: Dict[str, Any]) -> str:
        """Queue a prompt in ComfyUI"""
        prompt_id = str(uuid.uuid4())
        
        payload = {
            "prompt": workflow,
            "client_id": prompt_id
        }
        
        response = await self._make_request(
            "POST",
            f"{self.config.base_url}/prompt",
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"Failed to queue prompt: {error_text}",
                self.config.name
            )
        
        result = await response.json()
        return result.get("prompt_id", prompt_id)
    
    async def _wait_for_completion(self, prompt_id: str) -> Dict[str, Any]:
        """Wait for prompt completion and return result"""
        import time
        start_time = time.time()
        
        while True:
            # Check if we've exceeded timeout
            if time.time() - start_time > self.config.timeout:
                raise ProviderError(
                    f"Generation timed out after {self.config.timeout}s",
                    self.config.name,
                    "timeout"
                )
            
            # Check prompt status
            try:
                response = await self._make_request(
                    "GET",
                    f"{self.config.base_url}/history/{prompt_id}"
                )
                
                if response.status == 200:
                    history = await response.json()
                    
                    if prompt_id in history:
                        prompt_data = history[prompt_id]
                        
                        if "outputs" in prompt_data:
                            # Find the save image node output
                            for node_id, output in prompt_data["outputs"].items():
                                if "images" in output:
                                    image_info = output["images"][0]
                                    image_url = f"{self.config.base_url}/view?filename={image_info['filename']}&subfolder={image_info.get('subfolder', '')}&type={image_info.get('type', 'output')}"
                                    
                                    return {
                                        "image_url": image_url,
                                        "generation_time_ms": (time.time() - start_time) * 1000,
                                        "seed": prompt_data.get("meta", {}).get("seed")
                                    }
            
            except Exception as e:
                # Continue polling on errors
                pass
            
            # Wait before next poll
            await asyncio.sleep(1.0)
        
        raise ProviderError(
            "Failed to get generation result",
            self.config.name
        )