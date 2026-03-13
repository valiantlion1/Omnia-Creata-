import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Model {
  name: string;
  path: string;
  type: 'checkpoints' | 'controlnet' | 'vae' | 'lora' | 'upscale_models';
  family: string;
  size_mb: number;
  ext: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  modelType?: 'checkpoints' | 'controlnet' | 'vae' | 'lora' | 'upscale_models';
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  modelType = 'checkpoints' 
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Thumbnail helpers
  const stringToHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const generateSvgThumb = (model: Model) => {
    const base = `${model.name}-${model.family}-${model.type}`;
    const hash = stringToHash(base);
    const h1 = hash % 360;
    const h2 = (hash * 7) % 360;
    const color1 = `hsl(${h1} 70% 45%)`;
    const color2 = `hsl(${h2} 70% 35%)`;
    const initials = model.name
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'AI';

    const svg = `<?xml version='1.0' encoding='UTF-8'?>\n<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400' viewBox='0 0 640 400'>\n  <defs>\n    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>\n      <stop offset='0%' stop-color='${color1}'/>\n      <stop offset='100%' stop-color='${color2}'/>\n    </linearGradient>\n  </defs>\n  <rect width='100%' height='100%' fill='url(#g)'/>\n  <g opacity='0.15'>\n    <circle cx='120' cy='80' r='120' fill='white'/>\n    <circle cx='520' cy='340' r='160' fill='white'/>\n    <circle cx='460' cy='120' r='90' fill='white'/>\n  </g>\n  <text x='50%' y='52%' font-family='Inter,Segoe UI,Arial' font-weight='700' font-size='160' text-anchor='middle' fill='rgba(255,255,255,0.9)'>${initials}</text>\n</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const keywordQueryMap: Array<[RegExp, string]> = [
    [/sdxl/i, '3d abstract neon'],
    [/real(vis|istic|photo)/i, 'portrait realistic'],
    [/anime|anything|nai|aom/i, 'anime illustration'],
    [/dreamshaper|juggernaut|fantasy/i, 'fantasy concept art'],
    [/line\s?art/i, 'line art black white'],
    [/pixel/i, 'pixel art'],
    [/controlnet|canny|depth|pose|tile|ip-[\w]+/i, 'blueprint technology'],
    [/vae/i, 'color wheel gradient'],
    [/lora/i, 'neural network abstract'],
    [/upscale/i, 'texture details macro'],
    [/flux/i, 'fluid abstract']
  ];

  const getExternalTemplateUrl = (model: Model) => {
    const text = `${model.name} ${model.family} ${model.type}`;
    const match = keywordQueryMap.find(([re]) => re.test(text));
    const query = match ? match[1] : 'ai abstract gradient';
    return `https://source.unsplash.com/featured/640x400?${encodeURIComponent(query)}`;
  };

  const getModelThumbSrc = (model: Model) => {
    return { external: getExternalTemplateUrl(model), fallback: generateSvgThumb(model) };
  };

  useEffect(() => {
    fetchModels();
  }, [modelType]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data[modelType] || []);
    } catch (error) {
      console.error('Model yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedModelData = models.find(m => m.name === selectedModel);

  const formatSize = (sizeMb: number) => {
    if (sizeMb > 1024) {
      return `${(sizeMb / 1024).toFixed(1)} GB`;
    }
    return `${sizeMb.toFixed(0)} MB`;
  };

  const getModelIcon = (type: string, family: string) => {
    const iconClass = 'w-4 h-4';
    
    if (type === 'checkpoints') {
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="checkpoint-grad" x1="0" y1="0" x2="24" y2="24">
              <stop offset="0%" stopColor="rgb(var(--accent))" />
              <stop offset="100%" stopColor="rgb(var(--goldB))" />
            </linearGradient>
          </defs>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                stroke="url(#checkpoint-grad)" strokeWidth="1.5" fill="url(#checkpoint-grad)" fillOpacity="0.1"/>
        </svg>
      );
    }
    
    return (
      <div className={`${iconClass} rounded bg-gradient-to-br from-accent/20 to-goldB/20 border border-accent/30`} />
    );
  };

  return (
    <div className="relative z-[1000]">{/* trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative w-full px-4 py-3 bg-zinc-900/50 border border-zinc-700/50 rounded-lg 
                   hover:border-accent/50 hover:bg-zinc-800/50 transition-all duration-300 
                   focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedModelData && (
              <div className="w-8 h-5 rounded overflow-hidden border border-zinc-600/50">
                <img
                  src={getModelThumbSrc(selectedModelData).external}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getModelThumbSrc(selectedModelData).fallback;
                  }}
                  alt={selectedModelData.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-left">
              <div className="text-sm font-medium text-gray-200">{selectedModelData?.name || 'Model Seçin'}</div>
              {selectedModelData && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="capitalize">{selectedModelData.family}</span>
                  <span>•</span>
                  <span>{formatSize(selectedModelData.size_mb)}</span>
                </div>
              )}
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 
                        bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-lg" />
      </button>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-[2000] flex items-center justify-center" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative w-[min(1100px,95vw)] max-h-[85vh] bg-zinc-900/95 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-700/50 bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-gray-200">Model Seç</span>
                  <span className="text-xs text-gray-400">{models.length} model</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded hover:bg-white/5">
                  <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="p-4 flex items-center gap-3 border-b border-zinc-700/50">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Model ara..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-md text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {loading ? (
                  <div className="col-span-full text-center text-gray-400">Yükleniyor...</div>
                ) : filteredModels.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400">Sonuç yok</div>
                ) : (
                  filteredModels.map((model, i) => {
                    const { external, fallback } = getModelThumbSrc(model);
                    return (
                      <motion.button
                        key={model.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => { onModelChange(model.name); setIsOpen(false); setSearchTerm(''); }}
                        className={`group relative overflow-hidden rounded-lg border ${selectedModel === model.name ? 'border-accent/60' : 'border-zinc-700/60'} bg-zinc-900/40 hover:bg-zinc-800/40 focus:outline-none`}
                      >
                        <div className="aspect-[16/10] w-full bg-zinc-800/60">
                          <img src={external} onError={(e)=>{(e.currentTarget as HTMLImageElement).src = fallback;}} alt={model.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-3 text-left">
                          <div className="text-sm font-medium text-gray-200 truncate group-hover:text-accent transition-colors">{model.name}</div>
                          <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                            <span className="capitalize">{model.family}</span>
                            <span>•</span>
                            <span>{formatSize(model.size_mb)}</span>
                            <span>•</span>
                            <span className="uppercase">{model.ext.replace('.', '')}</span>
                          </div>
                        </div>
                        {selectedModel === model.name && (<div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse" />)}
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;