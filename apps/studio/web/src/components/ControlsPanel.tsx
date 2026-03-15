import React from 'react';
import { useTranslation } from 'react-i18next';
import { PRESETS } from '@/lib/presets';
import { useStore } from '@/lib/store';
import { hfClient } from '@/lib/hfClient';

const LabeledRange = ({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: { label: string; hint?: string; min: number; max: number; step?: number; value: number; onChange: (n: number)=>void }) => {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3 shadow-[0_0_30px_rgba(0,0,0,.25)_inset]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm" title={hint}>{label}</span>
          <span className="badge">{value}</span>
        </div>
        <input
          type="number"
          className="w-20 input px-2 py-1 text-right"
          value={value}
          step={step ?? 1}
          min={min}
          max={max}
          onChange={(e)=>onChange(Number(e.target.value))}
          title={hint}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--accent))]"
        title={hint}
      />
    </div>
  );
};

const ControlsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useStore();
  const [presetId, setPresetId] = React.useState(state.preset?.id ?? PRESETS[0]?.id ?? 'realistic_portrait');
  const preset = PRESETS.find(p => p.id === presetId) ?? PRESETS[0];

  const [steps, setSteps] = React.useState(preset.settings.steps);
  const [cfg, setCfg] = React.useState(preset.settings.cfgScale);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (preset) {
      dispatch({ type: 'setPreset', preset });
      setSteps(preset.settings.steps);
      setCfg(preset.settings.cfgScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const onGenerate = async () => {
    // reflect latest numeric controls to global store
    dispatch({ type: 'setSteps', steps });
    dispatch({ type: 'setCfg', cfg });
    console.log('Generate clicked with', { preset: preset?.id, prompt: state.prompt, negative: state.negative, steps, cfg });

    if (!state.prompt?.trim()) {
      alert(t('controlsPanel.pleaseEnterPrompt'));
      return;
    }

    try {
      setIsLoading(true);
      // basic map from preset to dimensions
      const width = preset?.settings.width;
      const height = preset?.settings.height;
      const blob = await hfClient.textToImage({
        prompt: state.prompt,
        negative_prompt: state.negative || undefined,
        steps,
        guidance_scale: cfg,
        width,
        height,
      });
      const url = URL.createObjectURL(blob);
      // eski objectURL varsa hafızadan düşür
      if (state.generatedImage?.url) {
        try { URL.revokeObjectURL(state.generatedImage.url); } catch {}
      }
      dispatch({ type: 'setGeneratedImage', image: { url, createdAt: Date.now() } });
      // switch to gallery/preview section if needed
      dispatch({ type: 'setActiveTab', tab: 'gallery' as any });
    } catch (err: any) {
      console.error(err);
      alert(`Üretim başarısız: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Sol taraf - Ana Prompt Alanı */}
      <div className="flex-1 space-y-6">
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">Görsel Tanımı</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-white/80">Ana Prompt</label>
              <textarea
                className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all resize-none"
                rows={4}
                value={state.prompt}
                onChange={(e)=>dispatch({ type: 'setPrompt', prompt: e.target.value })}
                placeholder="Yaratmak istediğiniz görüntüyü detaylı olarak tanımlayın..."
              />
              <div className="mt-2 text-xs text-white/60">İpucu: En önemli kelimeleri öne yazın. Stil ve ışık detayları ekleyin.</div>
            </div>
            <div>
              <label className="block text-sm mb-2 text-white/80">Negatif Prompt</label>
              <textarea
                className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all resize-none"
                rows={2}
                value={state.negative}
                onChange={(e)=>dispatch({ type: 'setNegative', negative: e.target.value })}
                placeholder="low quality, blurry, watermark, text"
              />
              <div className="mt-2 text-xs text-white/60">İstemediğiniz öğeleri belirtin.</div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <button 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onGenerate} 
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                Üretiliyor...
              </span>
            ) : (
              'Görsel Üret'
            )}
          </button>
        </div>
      </div>

      {/* Sağ taraf - Kompakt Ayarlar Paneli */}
      <div className="lg:w-80 space-y-4">
        {/* Kompakt Dropdown Ayarları */}
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-medium mb-3 text-white/80">Model & Stil</h3>
          <div className="grid grid-cols-2 gap-2">
            {/* Stil Preset */}
            <div className="relative">
              <select 
                value={presetId} 
                onChange={(e) => setPresetId(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 transition-all appearance-none cursor-pointer"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-800">{p.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <label className="absolute -top-2 left-2 bg-gray-900 px-1 text-xs text-white/60">Stil</label>
            </div>
            
            {/* LoRA */}
            <div className="relative">
              <select className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 transition-all appearance-none cursor-pointer">
                <option>Yok</option>
                <option>Realistic</option>
                <option>Anime</option>
                <option>Portrait</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <label className="absolute -top-2 left-2 bg-gray-900 px-1 text-xs text-white/60">LoRA</label>
            </div>
            
            {/* Alt Stil */}
            <div className="relative">
              <select className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 transition-all appearance-none cursor-pointer">
                <option>Varsayılan</option>
                <option>Cinematic</option>
                <option>Artistic</option>
                <option>Professional</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <label className="absolute -top-2 left-2 bg-gray-900 px-1 text-xs text-white/60">Alt Stil</label>
            </div>
            
            {/* Poz */}
            <div className="relative">
              <select className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-400 transition-all appearance-none cursor-pointer">
                <option>Otomatik</option>
                <option>Portre</option>
                <option>Tam Vücut</option>
                <option>Yakın Plan</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <label className="absolute -top-2 left-2 bg-gray-900 px-1 text-xs text-white/60">Poz</label>
            </div>
          </div>
        </div>
        
        {/* Çözünürlük */}
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-medium mb-3 text-white/80">Çözünürlük</h3>
          <div className="grid grid-cols-3 gap-2">
            <button className="bg-black/30 hover:bg-purple-600/30 border border-white/20 hover:border-purple-400 rounded-lg px-2 py-2 text-xs text-white transition-all">
              512×512
            </button>
            <button className="bg-purple-600/30 border border-purple-400 rounded-lg px-2 py-2 text-xs text-white">
              768×768
            </button>
            <button className="bg-black/30 hover:bg-purple-600/30 border border-white/20 hover:border-purple-400 rounded-lg px-2 py-2 text-xs text-white transition-all">
              1024×1024
            </button>
            <button className="bg-black/30 hover:bg-purple-600/30 border border-white/20 hover:border-purple-400 rounded-lg px-2 py-2 text-xs text-white transition-all">
              512×768
            </button>
            <button className="bg-black/30 hover:bg-purple-600/30 border border-white/20 hover:border-purple-400 rounded-lg px-2 py-2 text-xs text-white transition-all">
              768×512
            </button>
            <button className="bg-black/30 hover:bg-purple-600/30 border border-white/20 hover:border-purple-400 rounded-lg px-2 py-2 text-xs text-white transition-all">
              1024×768
            </button>
          </div>
        </div>

        {/* Gelişmiş Ayarlar */}
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-medium mb-3 text-white/80">Gelişmiş Ayarlar</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Steps</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/80">{steps}</span>
              </div>
              <input
                type="range"
                min={4}
                max={60}
                value={steps}
                onChange={(e)=>setSteps(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="text-xs text-white/50 mt-1">Daha yüksek adım, daha detaylı sonuç</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">CFG Scale</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/80">{cfg}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={cfg}
                onChange={(e)=>setCfg(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="text-xs text-white/50 mt-1">Prompta ne kadar sıkı bağlı kalsın</div>
            </div>
          </div>
        </div>

        {/* Hızlı Eylemler */}
        <div className="bg-gradient-card backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-medium mb-3 text-white/80">Hızlı Eylemler</h3>
          <div className="space-y-2">
            <button 
              className="w-full bg-white/10 hover:bg-white/20 text-white/80 py-2 px-3 rounded-lg transition-all text-sm"
              disabled={isLoading}
            >
              Rastgele Seed
            </button>
            <button 
              className="w-full bg-white/10 hover:bg-white/20 text-white/80 py-2 px-3 rounded-lg transition-all text-sm"
              disabled={isLoading}
            >
              Prompt Temizle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;