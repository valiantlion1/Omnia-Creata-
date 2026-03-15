import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SHOWCASE_IMAGES = [
  { src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&h=600&fit=crop', title: 'Cyberpunk Warrior', author: '@alexart', likes: 234, model: 'SDXL' },
  { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=600&fit=crop', title: 'Mystical Forest', author: '@dreamscape', likes: 189, model: 'Pony V6' },
  { src: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=600&fit=crop', title: 'Neon Dreams', author: '@modernist', likes: 156, model: 'SDXL' },
  { src: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=600&h=600&fit=crop', title: 'Ancient Temple', author: '@otakuart', likes: 298, model: 'RealVis' },
  { src: 'https://images.unsplash.com/photo-1578301978693-85fa9fd0c644?w=600&h=600&fit=crop', title: 'Digital Portrait', author: '@aimaster', likes: 412, model: 'Juggernaut' },
  { src: 'https://images.unsplash.com/photo-1608501078713-8e445a709b39?w=600&h=600&fit=crop', title: 'Fantasy World', author: '@creator99', likes: 367, model: 'Animagine' },
];

const FEATURES = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Generate stunning images in seconds with GPU-accelerated inference. No more waiting.', gradient: 'from-amber-500/20 to-orange-500/20' },
  { icon: '🎨', title: 'Multi-Model Support', desc: 'Choose from 5+ premium AI models including SDXL, Pony V6, Juggernaut, and more.', gradient: 'from-purple-500/20 to-pink-500/20' },
  { icon: '✨', title: 'Magic Enhancer', desc: 'One-click prompt enhancement powered by AI. Turn simple ideas into masterpiece prompts.', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { icon: '🔒', title: 'Privacy First', desc: 'Your creations stay yours. Local processing, no data collection, full ownership.', gradient: 'from-emerald-500/20 to-green-500/20' },
  { icon: '🌍', title: 'Cloud Ready', desc: 'Seamlessly switch between local and cloud rendering. Scale when you need it.', gradient: 'from-sky-500/20 to-indigo-500/20' },
  { icon: '🎯', title: 'Smart Presets', desc: 'One-tap presets for Realistic, Anime, Ultra HD, and Fast generation modes.', gradient: 'from-rose-500/20 to-red-500/20' },
];

const PLANS = [
  { name: 'Starter', price: 'Free', period: '', credits: '50 / month', features: ['5 Models', 'Standard Quality', 'Community Support', '720p Max Resolution'], color: 'border-white/10', popular: false },
  { name: 'Pro', price: '$12', period: '/mo', credits: '1,000 / month', features: ['All Models', 'HD Quality', 'Priority Support', '4K Resolution', 'Magic Enhancer', 'Batch Generation'], color: 'border-[rgba(var(--accent),0.5)]', popular: true },
  { name: 'Studio', price: '$29', period: '/mo', credits: 'Unlimited', features: ['All Pro Features', 'Ultra HD 8K', '24/7 Support', 'API Access', 'Commercial License', 'Custom Models', 'Team Seats'], color: 'border-purple-500/50', popular: false },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const Home: React.FC = () => {
  const { } = useTranslation();
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % 3), 6000);
    return () => clearInterval(timer);
  }, []);

  const heroTexts = [
    { title: 'Create Without Limits', sub: 'AI-powered image generation for everyone' },
    { title: 'Your Imagination, Realized', sub: 'From concept to masterpiece in seconds' },
    { title: 'Join the Creator Revolution', sub: 'Thousands of artists trust Omnia Creata' },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">

      {/* ═══ HERO ═══ */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/6 w-[500px] h-[500px] bg-[rgba(var(--accent),0.08)] rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/6 w-[400px] h-[400px] bg-[rgba(var(--goldB),0.06)] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(var(--primary),0.04)] rounded-full blur-[180px]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div key={heroIdx} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }}>
              <motion.div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Powered by Stable Diffusion XL
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-4">
                <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">{heroTexts[heroIdx].title}</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">{heroTexts[heroIdx].sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/studio" className="group relative px-8 py-4 rounded-2xl font-bold text-white text-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
              <span className="relative z-10 flex items-center gap-2">
                Start Creating
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </Link>
            <a href="#features" className="px-8 py-4 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-medium transition-all hover:bg-white/[0.03]">
              Explore Features
            </a>
          </div>
        </div>

        {/* Slide Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setHeroIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === heroIdx ? 'bg-[rgb(var(--accent))] w-6' : 'bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10K+', label: 'Images Generated' },
            { value: '5K+', label: 'Active Creators' },
            { value: '5', label: 'AI Models' },
            { value: '99.9%', label: 'Uptime' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Why Omnia Creata?</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Everything you need to create stunning AI-generated art, all in one platform.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="group relative glass-card p-6 hover:scale-[1.02] transition-transform cursor-default">
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ SHOWCASE ═══ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(var(--accent),0.02)] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Community Showcase</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">See what creators are making with Omnia Creata</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SHOWCASE_IMAGES.map((img, i) => (
              <motion.div key={i} variants={fadeUp} className="group relative overflow-hidden rounded-2xl border border-white/5 hover:border-white/15 transition-all cursor-pointer">
                <div className="aspect-square overflow-hidden">
                  <img src={img.src} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h4 className="text-white font-semibold text-sm">{img.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-300">{img.author}</span>
                    <span className="text-xs text-gray-300 flex items-center gap-1">
                      <svg className="w-3 h-3 fill-red-400" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      {img.likes}
                    </span>
                  </div>
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] text-white/70">{img.model}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Simple Pricing</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Start free, upgrade when you're ready</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div key={i} variants={fadeUp} className={`relative glass-card p-7 ${plan.color} ${plan.popular ? 'ring-1 ring-[rgba(var(--accent),0.3)] shadow-[0_0_40px_rgba(var(--accent),0.08)]' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] text-white shadow-lg">MOST POPULAR</span>
                  </div>
                )}
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{plan.credits} credits</p>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] text-white hover:shadow-lg hover:shadow-[rgba(var(--accent),0.25)]' : 'bg-white/[0.05] border border-white/10 text-gray-300 hover:bg-white/[0.08] hover:text-white'}`}>
                  {plan.price === 'Free' ? 'Get Started Free' : 'Choose Plan'}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">How It Works</span>
            </h2>
            <p className="text-gray-500 text-lg">Three steps to your masterpiece</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Describe', desc: 'Type your vision in natural language. Use prompt chips or the Magic Enhancer for better results.', icon: '✍️' },
              { step: '02', title: 'Generate', desc: 'Choose your AI model and hit Generate. Watch your creation come to life in real-time.', icon: '⚡' },
              { step: '03', title: 'Refine', desc: 'Adjust settings, regenerate with different seeds, or upscale your favorite outputs.', icon: '💎' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="glass-card p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] flex items-center justify-center text-xs font-bold text-white">{s.step}</div>
                <span className="text-3xl block mt-4 mb-3">{s.icon}</span>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[rgba(var(--accent),0.06)] rounded-full blur-[150px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Ready to Create?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">Join thousands of creators who use Omnia Creata to bring their imagination to life.</p>
          <Link to="/studio" className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-white text-lg bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] hover:shadow-xl hover:shadow-[rgba(var(--accent),0.25)] hover:scale-105 transition-all">
            Open Prompt Studio
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Omnia Creata</span>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Omnia Creata Studio. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;