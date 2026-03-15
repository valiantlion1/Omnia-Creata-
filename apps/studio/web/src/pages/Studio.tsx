import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

/* ═════════════════ CONSTANTS ═════════════════ */
interface GenerationSettings {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  sampler: string;
  scheduler: string;
  batchSize: number;
}

interface HistoryItem {
  id: string;
  url: string;
  prompt: string;
  model: string;
  timestamp: number;
  settings: Partial<GenerationSettings>;
}

const PRESETS = [
  { id: 'realistic', label: '📷 Realistic', steps: 30, cfg: 7.5, sampler: 'dpmpp_2m_sde_karras', w: 1024, h: 1024 },
  { id: 'anime', label: '🎨 Anime', steps: 25, cfg: 8, sampler: 'euler_a', w: 832, h: 1216 },
  { id: 'ultra', label: '✨ Ultra HD', steps: 40, cfg: 6.5, sampler: 'dpmpp_2m_sde_karras', w: 1024, h: 1024 },
  { id: 'fast', label: '⚡ Fast', steps: 12, cfg: 5, sampler: 'euler', w: 1024, h: 1024 },
] as const;

const ASPECT_RATIOS = [
  { id: 'square', label: '1:1', icon: '⬜', width: 1024, height: 1024 },
  { id: 'portrait', label: '3:4', icon: '📱', width: 768, height: 1024 },
  { id: 'landscape', label: '4:3', icon: '🖥️', width: 1024, height: 768 },
  { id: 'wide', label: '16:9', icon: '🎬', width: 1024, height: 576 },
  { id: 'tall', label: '9:16', icon: '📲', width: 576, height: 1024 },
];

const SAMPLERS = [
  { value: 'euler_a', label: 'Euler A' },
  { value: 'euler', label: 'Euler' },
  { value: 'dpmpp_2m', label: 'DPM++ 2M' },
  { value: 'dpmpp_2m_sde_karras', label: 'DPM++ 2M SDE Karras' },
  { value: 'ddim', label: 'DDIM' },
];

const SCHEDULERS = [
  { value: 'normal', label: 'Normal' },
  { value: 'karras', label: 'Karras' },
  { value: 'exponential', label: 'Exponential' },
  { value: 'sgm_uniform', label: 'SGM Uniform' },
];

const VISUAL_MODELS = [
  { id: 'Pony_Diffusion_V6_XL', label: 'Pony V6 XL', desc: 'Anime & Stylized', icon: '🦄', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' },
  { id: 'Juggernaut-XL_v9_RunDiffusionPhoto_v2', label: 'Juggernaut', desc: 'Photorealism', icon: '📸', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  { id: 'RealVisXL_V3.0', label: 'RealVis XL', desc: 'Cinematic', icon: '🎞️', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
  { id: 'animagine-xl-4.0', label: 'Animagine', desc: 'Anime Art', icon: '🌸', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/30' },
  { id: 'sd_xl_base_1.0', label: 'SDXL Base', desc: 'General Purpose', icon: '🎨', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' },
];

const PROMPT_CHIPS = [
  "Masterpiece", "8k resolution", "Ultra detailed", "Cinematic lighting",
  "Volumetric fog", "Unreal Engine 5", "Photorealistic", "Vibrant colors"
];

/* ═════════════════ API LAYER ═════════════════ */
const API_BASE = '/api';

async function submitGeneration(payload: {
  prompt: string;
  negativePrompt?: string;
  model: string;
  steps: number;
  cfgScale: number;
  seed: number;
  sampler: string;
  width: number;
  height: number;
}): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    prompt: payload.prompt,
    negative_prompt: payload.negativePrompt || undefined,
    model: payload.model,
    steps: payload.steps,
    cfg_scale: payload.cfgScale,
    seed: payload.seed >= 0 ? payload.seed : undefined,
    sampler: payload.sampler,
    width: payload.width,
    height: payload.height,
    preset: 'realistic',
    aspect_ratio: '1:1',
    enhance_prompt: false,
  };
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function pollGeneration(id: string): Promise<{ status: string; images?: { url: string }[]; error?: string }> {
  const res = await fetch(`${API_BASE}/generate/${id}`);
  if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
  return res.json();
}

/* ═════════════════ COMPONENT ═════════════════ */
const Studio: React.FC = () => {
  const { } = useTranslation();
  const [selectedModel, setSelectedModel] = useState<string>('Pony_Diffusion_V6_XL');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    negativePrompt: '',
    width: 1024,
    height: 1024,
    steps: 25,
    cfgScale: 7.0,
    seed: -1,
    sampler: 'euler_a',
    scheduler: 'normal',
    batchSize: 1,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [showNegative, setShowNegative] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const abortRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  /* ── Enhance ── */
  const handleEnhance = async () => {
    if (!settings.prompt) return;
    setIsEnhancing(true);
    await new Promise(r => setTimeout(r, 600));
    const randomChips = [...PROMPT_CHIPS].sort(() => 0.5 - Math.random()).slice(0, 3);
    setSettings(prev => ({
      ...prev,
      prompt: `${prev.prompt}, ${randomChips.join(", ")}, dramatic composition, sharp focus, artstation trending`
    }));
    setIsEnhancing(false);
  };

  /* ── Preset ── */
  const applyPreset = (preset: typeof PRESETS[number]) => {
    setActivePreset(preset.id);
    setSettings(prev => ({
      ...prev,
      steps: preset.steps,
      cfgScale: preset.cfg,
      sampler: preset.sampler,
      width: preset.w,
      height: preset.h,
    }));
  };

  /* ── Random seed ── */
  const randomizeSeed = () => setSettings(s => ({ ...s, seed: Math.floor(Math.random() * 2 ** 32) }));

  /* ── GENERATE ── */
  const handleGenerate = useCallback(async () => {
    if (!selectedModel || !settings.prompt.trim()) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setErrorMsg(null);
    setStatusText('Submitting to backend...');
    abortRef.current = false;

    try {
      // 1. Submit generation request
      const { id: genId } = await submitGeneration({
        prompt: settings.prompt,
        negativePrompt: settings.negativePrompt,
        model: selectedModel,
        steps: settings.steps,
        cfgScale: settings.cfgScale,
        seed: settings.seed,
        sampler: settings.sampler,
        width: settings.width,
        height: settings.height,
      });

      setStatusText('Queued — waiting for GPU...');
      setGenerationProgress(10);

      // 2. Poll for completion
      let done = false;
      let pollCount = 0;
      const maxPolls = 300; // 5 min max
      while (!done && !abortRef.current && pollCount < maxPolls) {
        await new Promise(r => setTimeout(r, 1000)); // 1s interval
        pollCount++;

        const result = await pollGeneration(genId);

        if (result.status === 'processing') {
          const progress = Math.min(10 + (pollCount / (settings.steps * 0.5)) * 80, 90);
          setGenerationProgress(progress);
          setStatusText(`Generating... Step ${Math.min(pollCount, settings.steps)}/${settings.steps}`);
        } else if (result.status === 'completed') {
          done = true;
          setGenerationProgress(100);
          setStatusText('Complete!');
          const imageUrl = result.images?.[0]?.url;
          if (imageUrl) {
            setGeneratedImage(imageUrl);
            setHistory(prev => [{
              id: genId,
              url: imageUrl,
              prompt: settings.prompt,
              model: selectedModel,
              timestamp: Date.now(),
              settings: { steps: settings.steps, cfgScale: settings.cfgScale, seed: settings.seed },
            }, ...prev].slice(0, 50));
          }
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Generation failed on server');
        }
      }
      if (pollCount >= maxPolls) throw new Error('Generation timed out');
    } catch (error: any) {
      console.error('Generation error:', error);
      setErrorMsg(error.message || 'Generation failed');
      // Fallback demo image
      const demoUrl = `https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=${settings.width}&h=${settings.height}&fit=crop`;
      setGeneratedImage(demoUrl);
      setGenerationProgress(100);
      setStatusText('Demo fallback (backend offline)');
      setHistory(prev => [{
        id: crypto.randomUUID(),
        url: demoUrl,
        prompt: settings.prompt,
        model: selectedModel,
        timestamp: Date.now(),
        settings: { steps: settings.steps, cfgScale: settings.cfgScale, seed: settings.seed },
      }, ...prev].slice(0, 50));
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setStatusText('');
      }, 1200);
    }
  }, [selectedModel, settings]);

  /* ── Slider ── */
  const SliderControl = ({ label, value, min, max, step = 1, onChange }: any) => (
    <div className="space-y-1.5 mb-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span className="text-xs font-mono text-gray-300 bg-white/5 px-1.5 py-0.5 rounded">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="oc-slider" />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[rgb(var(--bg))] text-white relative">

      {/* ─── MAIN AREA ──────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* Top Overlay: Presets */}
        <div className="absolute top-4 left-6 z-10 hidden md:flex gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`preset-chip text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-md transition-all ${activePreset === p.id
                ? 'bg-[rgba(var(--accent),0.2)] border border-[rgba(var(--accent),0.5)] text-white shadow-[0_0_15px_rgba(var(--accent),0.3)]'
                : 'bg-black/30 border border-white/10 text-gray-400 hover:text-white'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Top Right: History Toggle */}
        <div className="absolute top-4 right-6 z-10 flex gap-2">
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all ${showHistory ? 'bg-[rgba(var(--accent),0.2)] border border-[rgba(var(--accent),0.5)] text-white' : 'bg-black/30 border border-white/10 text-gray-400 hover:text-white'}`}>
              🕐 History ({history.length})
            </button>
          )}
        </div>

        {/* Center: Image Preview */}
        <div className="flex-1 flex items-center justify-center p-6 pb-[220px] overflow-auto">
          {/* Generation status overlay */}
          {isGenerating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="glass-card p-8 rounded-2xl flex flex-col items-center max-w-xs text-center">
                <div className="relative w-20 h-20 mb-4">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - generationProgress / 100)}`} strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">{Math.round(generationProgress)}%</span>
                </div>
                <p className="text-sm text-gray-300 mb-1">{statusText}</p>
                <p className="text-[10px] text-gray-500">{selectedModel} • {settings.steps} steps</p>
              </div>
            </motion.div>
          )}

          {generatedImage && !isGenerating ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative group max-h-full">
              <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10" />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button className="bg-black/60 backdrop-blur-md p-2 rounded-lg hover:bg-white/20 transition" title="Save"><span>💾</span></button>
                <button className="bg-black/60 backdrop-blur-md p-2 rounded-lg hover:bg-white/20 transition" title="Upscale"><span>🔍</span></button>
                <button onClick={() => { setSettings(s => ({ ...s, seed: s.seed })); handleGenerate(); }} className="bg-black/60 backdrop-blur-md p-2 rounded-lg hover:bg-white/20 transition" title="Regenerate"><span>🔄</span></button>
              </div>
              {/* Status tag */}
              {errorMsg && (
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs backdrop-blur-md">
                  ⚠️ {errorMsg}
                </div>
              )}
            </motion.div>
          ) : !isGenerating && (
            <div className="flex flex-col items-center justify-center text-center max-w-md opacity-40">
              <div className="w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-white/5 to-white/10 flex items-center justify-center border border-white/10">
                <span className="text-4xl">✨</span>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Create something amazing</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Describe your vision below. Our AI will transform your words into art.</p>
            </div>
          )}
        </div>

        {/* History Strip */}
        <AnimatePresence>
          {showHistory && history.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 100, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="absolute bottom-[200px] left-0 right-0 z-10 border-t border-white/5 bg-black/60 backdrop-blur-xl overflow-hidden">
              <div className="flex gap-2 p-3 overflow-x-auto hide-scrollbar">
                {history.map((item) => (
                  <button key={item.id} onClick={() => setGeneratedImage(item.url)}
                    className="shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border border-white/10 hover:border-[rgba(var(--accent),0.5)] transition-all group">
                    <img src={item.url} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: Prompt Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-[rgb(var(--bg))] via-[rgb(var(--bg))] to-transparent">
          <div className="max-w-4xl mx-auto w-full">

            {/* Chips Row */}
            <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar px-2">
              {PROMPT_CHIPS.map(chip => (
                <button key={chip} onClick={() => setSettings(s => ({ ...s, prompt: s.prompt ? `${s.prompt}, ${chip}` : chip }))}
                  className="whitespace-nowrap px-3 py-1 text-[11px] rounded-full bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  + {chip}
                </button>
              ))}
            </div>

            {/* Prompt Container */}
            <div className="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl relative transition-all">

              {/* Negative Prompt */}
              <AnimatePresence>
                {showNegative && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-b border-white/5 bg-red-500/5">
                    <textarea
                      value={settings.negativePrompt} onChange={e => setSettings(s => ({ ...s, negativePrompt: e.target.value }))}
                      placeholder="Negative: ugly, blurry, deformed, low quality, bad anatomy..."
                      className="w-full bg-transparent border-none p-4 text-sm text-red-200/80 placeholder-red-900/50 focus:ring-0 resize-none"
                      rows={2}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col md:flex-row items-end gap-2 p-2">
                {/* Magic Enhancer */}
                <button
                  onClick={handleEnhance}
                  disabled={isEnhancing || !settings.prompt}
                  className={`p-3 rounded-xl transition-all self-stretch flex items-center justify-center w-12 shrink-0
                             ${settings.prompt ? 'text-amber-300 hover:bg-amber-400/10' : 'text-gray-600'} 
                             ${isEnhancing ? 'animate-pulse' : ''}`}
                  title="Magic Enhance Prompt"
                >
                  <span className="text-xl">✨</span>
                </button>

                {/* Main Prompt */}
                <div className="flex-1 w-full bg-black/20 rounded-xl border border-white/5 focus-within:border-[rgba(var(--accent),0.3)] focus-within:bg-black/40 transition-all flex flex-col">
                  <textarea
                    value={settings.prompt}
                    onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleGenerate(); } }}
                    placeholder="Imagine a vivid cyberpunk city at night with neon reflections..."
                    className="w-full bg-transparent border-none p-3 pb-8 text-[15px] text-white placeholder-gray-500 focus:ring-0 resize-none h-24"
                  />

                  <div className="absolute bottom-4 left-16 flex items-center gap-3">
                    <button onClick={() => setShowNegative(!showNegative)} className={`text-[11px] px-2 py-0.5 rounded transition ${showNegative ? 'bg-red-500/20 text-red-300' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      {showNegative ? '- Negative' : '+ Negative'}
                    </button>
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 font-mono">
                      {settings.width}×{settings.height}
                    </span>
                    <span className="text-[10px] text-gray-600">Ctrl+Enter to generate</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !settings.prompt.trim()}
                  className="btn-generate h-24 px-6 md:px-8 rounded-xl font-bold text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center gap-1 shrink-0 min-w-[120px]"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-xs font-mono">{Math.round(generationProgress)}%</span>
                      <div className="absolute bottom-0 left-0 h-1 bg-white/80 transition-all duration-500" style={{ width: `${generationProgress}%` }} />
                    </>
                  ) : (
                    <>
                      <span className="text-xl leading-none tracking-widest">SEND</span>
                      <span className="text-[10px] text-white/50 tracking-wide font-normal">Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDEBAR ──────────────── */}
      <div className="w-full md:w-[320px] shrink-0 border-l border-white/5 bg-black/20 overflow-y-auto hide-scrollbar z-20">
        <div className="p-5 space-y-6">

          {/* Models */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]"></span>
              AI Model
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {VISUAL_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 text-left rounded-xl border transition-all relative overflow-hidden ${selectedModel === m.id
                    ? `bg-gradient-to-br ${m.color} ${m.border} shadow-lg ring-1 ring-white/10`
                    : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                    } ${m.id === 'sd_xl_base_1.0' ? 'col-span-2' : ''}`}
                >
                  <span className="text-2xl mb-1 block opacity-80">{m.icon}</span>
                  <div className="text-[11px] font-bold text-white truncate">{m.label}</div>
                  <div className="text-[9px] text-gray-500 truncate">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]"></span>
              Aspect Ratio
            </h4>
            <div className="flex gap-1.5">
              {ASPECT_RATIOS.map(r => (
                <button key={r.id} onClick={() => setSettings(prev => ({ ...prev, width: r.width, height: r.height }))}
                  className={`flex-1 py-2 text-center rounded-lg text-[10px] font-medium transition-all ${settings.width === r.width && settings.height === r.height
                    ? 'bg-[rgba(var(--accent),0.2)] border border-[rgba(var(--accent),0.5)] text-white'
                    : 'bg-white/[0.03] border border-white/[0.04] text-gray-500 hover:text-gray-300'
                    }`}
                >
                  <div className="text-lg mb-0.5">{r.icon}</div>
                  <div>{r.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Seed Control */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]"></span>
              Seed
            </h4>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.seed}
                onChange={e => setSettings(s => ({ ...s, seed: parseInt(e.target.value) || -1 }))}
                className="flex-1 px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:ring-1 focus:ring-[rgb(var(--accent))] font-mono"
                placeholder="-1 = random"
              />
              <button onClick={randomizeSeed} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition" title="Randomize">
                🎲
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">-1 for random seed</p>
          </div>

          {/* Batch Size */}
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]"></span>
              Batch Size
            </h4>
            <div className="flex gap-1.5">
              {[1, 2, 4].map(n => (
                <button key={n} onClick={() => setSettings(s => ({ ...s, batchSize: n }))}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-medium transition-all ${settings.batchSize === n
                    ? 'bg-[rgba(var(--accent),0.2)] border border-[rgba(var(--accent),0.5)] text-white'
                    : 'bg-white/[0.03] border border-white/[0.04] text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {n} {n === 1 ? 'Image' : 'Images'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-2 border-t border-white/5">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-left group">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
                Advanced Settings
              </h4>
              <span className={`text-[10px] text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4">
                  <SliderControl label="Steps" value={settings.steps} min={10} max={60} onChange={(v: number) => setSettings(s => ({ ...s, steps: v }))} />
                  <SliderControl label="CFG Value" value={settings.cfgScale} min={1} max={20} step={0.5} onChange={(v: number) => setSettings(s => ({ ...s, cfgScale: v }))} />

                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Sampler</label>
                      <select value={settings.sampler} onChange={e => setSettings(s => ({ ...s, sampler: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:ring-1 focus:ring-[rgb(var(--accent))]">
                        {SAMPLERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">Scheduler</label>
                      <select value={settings.scheduler} onChange={e => setSettings(s => ({ ...s, scheduler: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:ring-1 focus:ring-[rgb(var(--accent))]">
                        {SCHEDULERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Studio;