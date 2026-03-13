import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ═════════ STATIC DATA ═════════ */
const MODELS = [
    { id: 'Pony_Diffusion_V6_XL', name: 'Pony Diffusion V6 XL', desc: 'Top-tier anime & stylized art. Excels at character design, dynamic poses, and vibrant colors.', icon: '🦄', tags: ['Anime', 'Stylized'], size: '6.5 GB', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', best: 'Character art, illustrations' },
    { id: 'Juggernaut-XL', name: 'Juggernaut XL', desc: 'Industry-leading photorealism. Perfect for portraits, product shots, and cinematic scenes.', icon: '📸', tags: ['Photo', 'Realistic', 'Portrait'], size: '6.5 GB', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', best: 'Portraits, photography' },
    { id: 'RealVisXL_V3.0', name: 'RealVis XL V3', desc: 'Cinematic quality with stunning depth of field and film-like color grading.', icon: '🎞️', tags: ['Cinematic', 'Film'], size: '6.5 GB', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', best: 'Cinematic, landscapes' },
    { id: 'animagine-xl-4.0', name: 'Animagine XL 4.0', desc: 'Pure anime aesthetic with clean linework and vibrant coloring.', icon: '🌸', tags: ['Anime', 'Manga'], size: '6.5 GB', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/30', best: 'Anime art, manga' },
    { id: 'sd_xl_base_1.0', name: 'SDXL Base 1.0', desc: 'Versatile foundation model. Great all-rounder for any style.', icon: '🎨', tags: ['General', 'Versatile'], size: '6.5 GB', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', best: 'General purpose' },
];

const COMMUNITY_IMAGES = [
    { src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop', title: 'Neon Warrior', likes: 234, user: '@cyberart' },
    { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop', title: 'Abstract Waves', likes: 189, user: '@fluid_master' },
    { src: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=400&fit=crop', title: 'Digital Geometry', likes: 156, user: '@shapeshift' },
    { src: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=400&h=400&fit=crop', title: 'Sakura Gate', likes: 298, user: '@nippon_art' },
    { src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=400&fit=crop', title: 'Gradient Dream', likes: 412, user: '@colorist' },
    { src: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=400&fit=crop', title: 'Fluid Bloom', likes: 367, user: '@botanica' },
];

const TABS = [
    { id: 'models', label: 'AI Models', icon: '🤖' },
    { id: 'loras', label: 'LoRAs', icon: '🧩' },
    { id: 'community', label: 'Community', icon: '🌍' },
] as const;

type TabId = typeof TABS[number]['id'];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/* ═════════ COMPONENT ═════════ */
const Explore: React.FC = () => {
    const [tab, setTab] = useState<TabId>('models');
    const [selected, setSelected] = useState<string | null>(null);
    const [loras, setLoras] = useState<{ name: string; description: string }[]>([]);
    const [search, setSearch] = useState('');

    // Fetch LoRAs from backend
    useEffect(() => {
        fetch('/api/loras')
            .then(r => r.ok ? r.json() : { loras: [] })
            .then(data => setLoras(data.loras || []))
            .catch(() => setLoras([]));
    }, []);

    const filteredModels = search
        ? MODELS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
        : MODELS;

    return (
        <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] p-6">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Explore</h1>
                    <p className="text-gray-500 text-sm">Discover models, LoRAs, and community creations</p>
                </motion.div>

                {/* Tabs */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 mb-6">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id
                                ? 'bg-[rgba(var(--accent),0.15)] border border-[rgba(var(--accent),0.4)] text-white shadow-[0_0_20px_rgba(var(--accent),0.1)]'
                                : 'bg-white/[0.03] border border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                                }`}>
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </motion.div>

                {/* Search */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-6">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={tab === 'models' ? 'Search models by name or tag...' : tab === 'loras' ? 'Search LoRAs...' : 'Search community...'}
                            className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:ring-1 focus:ring-[rgba(var(--accent),0.5)] focus:border-transparent transition"
                        />
                    </div>
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {tab === 'models' && (
                        <motion.div key="models" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0 }} className="space-y-4">
                            {filteredModels.map((model) => (
                                <motion.div
                                    key={model.id}
                                    variants={fadeUp}
                                    onClick={() => setSelected(selected === model.id ? null : model.id)}
                                    className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.01] ${selected === model.id ? `bg-gradient-to-r ${model.color} ${model.border}` : ''}`}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${model.color} flex items-center justify-center text-3xl shrink-0 border ${model.border}`}>
                                            {model.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-white">{model.name}</h3>
                                                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">{model.size}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed mb-3">{model.desc}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {model.tags.map(tag => (
                                                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-400">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <Link to="/studio" onClick={e => e.stopPropagation()}
                                            className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] text-white hover:shadow-lg hover:shadow-[rgba(var(--accent),0.2)] transition-all">
                                            Use Model
                                        </Link>
                                    </div>

                                    {selected === model.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/5">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div className="bg-black/20 rounded-xl p-3"><span className="text-gray-500 block mb-1">Best For</span><span className="text-white font-medium">{model.best}</span></div>
                                                <div className="bg-black/20 rounded-xl p-3"><span className="text-gray-500 block mb-1">Resolution</span><span className="text-white font-medium">1024×1024</span></div>
                                                <div className="bg-black/20 rounded-xl p-3"><span className="text-gray-500 block mb-1">Rec. Steps</span><span className="text-white font-medium">25-40</span></div>
                                                <div className="bg-black/20 rounded-xl p-3"><span className="text-gray-500 block mb-1">Rec. CFG</span><span className="text-white font-medium">6-8</span></div>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                            {filteredModels.length === 0 && (
                                <div className="text-center py-16 text-gray-500 text-sm">No models match your search</div>
                            )}
                        </motion.div>
                    )}

                    {tab === 'loras' && (
                        <motion.div key="loras" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            {loras.length > 0 ? loras.map((l, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="glass-card p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-xl">🧩</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{l.name}</h4>
                                        <p className="text-xs text-gray-500 truncate">{l.description || 'LoRA model'}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">Strength: 1.0</span>
                                </motion.div>
                            )) : (
                                <div className="text-center py-16">
                                    <span className="text-4xl mb-4 block opacity-30">🧩</span>
                                    <p className="text-gray-500 text-sm mb-2">No LoRAs found</p>
                                    <p className="text-gray-600 text-xs">Place LoRA files in <code className="bg-white/5 px-1 rounded">C:/AI/models/loras</code></p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {tab === 'community' && (
                        <motion.div key="community" variants={stagger} initial="hidden" animate="visible" exit={{ opacity: 0 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {COMMUNITY_IMAGES.map((img, i) => (
                                <motion.div key={i} variants={fadeUp} className="group relative overflow-hidden rounded-2xl border border-white/5 hover:border-white/15 transition-all cursor-pointer">
                                    <div className="aspect-square overflow-hidden">
                                        <img src={img.src} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                                        <h4 className="text-white font-semibold text-sm">{img.title}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-300">{img.user}</span>
                                            <span className="text-xs text-gray-300 flex items-center gap-1">❤️ {img.likes}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default Explore;
