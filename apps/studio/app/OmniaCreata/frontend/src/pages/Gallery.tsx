import React, { useState } from 'react';
import { motion } from 'framer-motion';

const GALLERY_IMAGES = [
    { id: '1', src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&h=800&fit=crop', prompt: 'Cyberpunk warrior in neon city', model: 'SDXL', steps: 30, cfg: 7.5, ratio: 'portrait' },
    { id: '2', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=600&fit=crop', prompt: 'Abstract fluid art with vibrant colors', model: 'Pony V6', steps: 25, cfg: 8, ratio: 'square' },
    { id: '3', src: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop', prompt: 'Neon geometric composition', model: 'SDXL', steps: 30, cfg: 7, ratio: 'landscape' },
    { id: '4', src: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=600&h=800&fit=crop', prompt: 'Japanese temple in autumn', model: 'RealVis', steps: 35, cfg: 6.5, ratio: 'portrait' },
    { id: '5', src: 'https://images.unsplash.com/photo-1578301978693-85fa9fd0c644?w=600&h=600&fit=crop', prompt: 'Digital portrait study', model: 'Juggernaut', steps: 28, cfg: 7, ratio: 'square' },
    { id: '6', src: 'https://images.unsplash.com/photo-1608501078713-8e445a709b39?w=800&h=600&fit=crop', prompt: 'Fantasy landscape with floating islands', model: 'Animagine', steps: 30, cfg: 8, ratio: 'landscape' },
    { id: '7', src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&h=800&fit=crop', prompt: 'Surreal dreamscape', model: 'SDXL', steps: 40, cfg: 6, ratio: 'portrait' },
    { id: '8', src: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=600&h=600&fit=crop', prompt: 'Macro flower with water drops', model: 'RealVis', steps: 30, cfg: 7, ratio: 'square' },
];

const Gallery: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<typeof GALLERY_IMAGES[0] | null>(null);
    const [filter, setFilter] = useState('all');

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'portrait', label: 'Portrait' },
        { id: 'landscape', label: 'Landscape' },
        { id: 'square', label: 'Square' },
    ];

    const filtered = filter === 'all' ? GALLERY_IMAGES : GALLERY_IMAGES.filter(i => i.ratio === filter);

    return (
        <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Gallery</h1>
                    <p className="text-gray-500 text-sm">Your generated masterpieces</p>
                </motion.div>

                {/* Filters */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-8">
                    {filters.map(f => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${filter === f.id
                                ? 'bg-[rgba(var(--accent),0.15)] border border-[rgba(var(--accent),0.4)] text-white'
                                : 'bg-white/[0.03] border border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </motion.div>

                {/* Grid */}
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {filtered.map((img, i) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedImage(img)}
                            className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                        >
                            <img src={img.src} alt={img.prompt} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                                <p className="text-white text-xs font-medium truncate">{img.prompt}</p>
                                <p className="text-gray-400 text-[10px] mt-1">{img.model} • {img.steps} steps</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <span className="text-4xl mb-4 opacity-40">🖼️</span>
                        <p className="text-gray-500 text-sm">No images found in this category</p>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {selectedImage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
                    onClick={() => setSelectedImage(null)}
                >
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-4xl w-full flex flex-col md:flex-row gap-6" onClick={e => e.stopPropagation()}>
                        <img src={selectedImage.src} alt={selectedImage.prompt} className="max-h-[70vh] object-contain rounded-2xl" />
                        <div className="md:w-72 shrink-0 glass-card p-5 rounded-2xl self-start">
                            <h3 className="text-white font-bold text-sm mb-3">Generation Details</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-gray-500">Prompt</span></div>
                                <p className="text-gray-300 text-xs leading-relaxed">{selectedImage.prompt}</p>
                                <div className="border-t border-white/5 pt-2 mt-3 space-y-1.5">
                                    <div className="flex justify-between"><span className="text-gray-500">Model</span><span className="text-white">{selectedImage.model}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Steps</span><span className="text-white">{selectedImage.steps}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">CFG</span><span className="text-white">{selectedImage.cfg}</span></div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedImage(null)} className="mt-4 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white transition">Close</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default Gallery;
