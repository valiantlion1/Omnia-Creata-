from typing import Dict, List
from core.models import Model
from core.database import SessionLocal

class ModelRegistry:
    """Registry for AI models and their capabilities"""
    
    def __init__(self):
        self.models = {}
        self._initialized = False
    
    def _load_models(self):
        """Load models from database"""
        if self._initialized:
            return
            
        try:
            db = SessionLocal()
            models = db.query(Model).filter(Model.is_active == True).all()
            for model in models:
                self.models[model.name] = {
                    'name': model.name,
                    'display_name': model.display_name,
                    'description': model.description,
                    'category': model.category,
                    'version': model.version,
                    'file_path': model.file_path,
                    'gpu_memory_mb': model.gpu_memory_mb,
                    'avg_processing_time_ms': model.avg_processing_time_ms,
                    'supported_formats': model.supported_formats,
                    'max_resolution': model.max_resolution,
                    'is_premium_only': model.is_premium_only
                }
            self._initialized = True
        except Exception as e:
            # If database not available, use fallback models
            self._load_fallback_models()
            self._initialized = True
        finally:
            if 'db' in locals():
                db.close()
    
    def list_models(self) -> List[Dict]:
        """List all available models"""
        self._load_models()
        return list(self.models.values())
    
    def get_model(self, name: str) -> Dict:
        """Get specific model by name"""
        self._load_models()
        return self.models.get(name)
    
    def _load_fallback_models(self):
        """Load fallback models when database is not available"""
        for model_data in DEFAULT_MODELS:
            self.models[model_data['name']] = model_data
    
    def get_models_by_category(self, category: str) -> List[Dict]:
        """Get models by category"""
        self._load_models()
        return [model for model in self.models.values() 
                if model['category'] == category]
    
    def is_model_available(self, name: str) -> bool:
        """Check if model is available"""
        self._load_models()
        return name in self.models
    
    def get_default_model(self, category: str) -> Dict:
        """Get default model for category"""
        models = self.get_models_by_category(category)
        return models[0] if models else None

# Global registry instance
registry = ModelRegistry()

# Default models configuration
DEFAULT_MODELS = [
    {
        'name': 'rembg_u2net',
        'display_name': 'U2Net Background Remover',
        'description': 'High-quality background removal using U2Net model',
        'category': 'background_removal',
        'version': '1.0.0',
        'file_path': '/models/u2net.pth',
        'gpu_memory_mb': 2048,
        'avg_processing_time_ms': 3000,
        'supported_formats': ['jpg', 'png', 'webp'],
        'max_resolution': {'width': 4096, 'height': 4096},
        'is_premium_only': False
    },
    {
        'name': 'esrgan_4x',
        'display_name': 'ESRGAN 4x Upscaler',
        'description': 'AI-powered 4x image upscaling',
        'category': 'super_resolution',
        'version': '1.0.0',
        'file_path': '/models/esrgan_4x.pth',
        'gpu_memory_mb': 4096,
        'avg_processing_time_ms': 8000,
        'supported_formats': ['jpg', 'png'],
        'max_resolution': {'width': 2048, 'height': 2048},
        'is_premium_only': True
    },
    {
        'name': 'yolo_crop',
        'display_name': 'YOLO Smart Crop',
        'description': 'Intelligent cropping using object detection',
        'category': 'crop',
        'version': '1.0.0',
        'file_path': '/models/yolov8.pt',
        'gpu_memory_mb': 1024,
        'avg_processing_time_ms': 1500,
        'supported_formats': ['jpg', 'png', 'webp'],
        'max_resolution': {'width': 8192, 'height': 8192},
        'is_premium_only': False
    }
]
