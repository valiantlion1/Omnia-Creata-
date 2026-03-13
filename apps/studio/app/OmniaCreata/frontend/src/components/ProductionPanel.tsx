import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/lib/store';
import type { ModelKey, StyleKey, SubStyleKey, PoseKey } from '@/lib/store';
import { hfClient } from '@/lib/hfClient';
import { planWithLLM } from '@/lib/llmPlanner';

const MODEL_OPTIONS: { value: ModelKey; label: string }[] = [
  { value: 'sd_xl_base_1.0', label: 'SDXL Base 1.0' },
  { value: 'sd_xl_refiner_1.0', label: 'SDXL Refiner 1.0' },
  { value: 'RealVisXL_V3.0', label: 'RealVis XL V3.0' },
  { value: 'Juggernaut-XL_v9_RunDiffusionPhoto_v2', label: 'Juggernaut XL v9' },
  { value: 'animagine-xl-4.0', label: 'Animagine XL 4.0' },
];

// Note: These will be translated dynamically in the component
const STYLE_OPTIONS: { value: StyleKey; labelKey: string }[] = [
  { value: 'real', labelKey: 'productionPanel.styles.realistic' },
  { value: 'anime', labelKey: 'productionPanel.styles.anime' },
  { value: 'prod', labelKey: 'productionPanel.styles.product' },
  { value: 'cin', labelKey: 'productionPanel.styles.cinematic' },
  { value: 'illu', labelKey: 'productionPanel.styles.illustration' },
  { value: 'cyber', labelKey: 'productionPanel.styles.cyberpunk' },
];

const SUBSTYLE_GROUPS: Record<StyleKey, { value: SubStyleKey; labelKey: string }[]> = {
  real: [
    { value: 'photo', labelKey: 'productionPanel.substyles.photo' }, { value: 'hdr', labelKey: 'productionPanel.substyles.hdr' }, { value: 'portrait', labelKey: 'productionPanel.substyles.portrait' },
    { value: 'film', labelKey: 'productionPanel.substyles.analogFilm' }, { value: 'street', labelKey: 'productionPanel.substyles.street' },
  ],
  anime: [
    { value: 'jp', labelKey: 'productionPanel.substyles.japanese' }, { value: 'manga', labelKey: 'productionPanel.substyles.manga' }, { value: 'vivid', labelKey: 'productionPanel.substyles.vivid' }, { value: 'chibi', labelKey: 'productionPanel.substyles.chibi' },
  ],
  prod: [
    { value: 'studio', labelKey: 'productionPanel.substyles.studio' }, { value: 'pack', labelKey: 'productionPanel.substyles.packaging' }, { value: 'macro', labelKey: 'productionPanel.substyles.macro' }, { value: 'ghost', labelKey: 'productionPanel.substyles.ghostMannequin' },
  ],
  cin: [
    { value: 'noir', labelKey: 'productionPanel.substyles.noir' }, { value: 'blade', labelKey: 'productionPanel.substyles.bladeRunner' }, { value: 'warm', labelKey: 'productionPanel.substyles.warmTone' }, { value: 'cold', labelKey: 'productionPanel.substyles.coldTone' },
  ],
  illu: [
    { value: 'flat', labelKey: 'productionPanel.substyles.flat' }, { value: 'comic', labelKey: 'productionPanel.substyles.comic' }, { value: 'water', labelKey: 'productionPanel.substyles.watercolor' }, { value: 'ink', labelKey: 'productionPanel.substyles.ink' },
  ],
  cyber: [
    { value: 'neon', labelKey: 'productionPanel.substyles.neon' }, { value: 'city', labelKey: 'productionPanel.substyles.city' }, { value: 'tech', labelKey: 'productionPanel.substyles.tech' }, { value: 'holo', labelKey: 'productionPanel.substyles.holographic' },
  ],
};

const POSE_OPTIONS: { value: PoseKey; labelKey: string }[] = [
  { value: 'standing', labelKey: 'productionPanel.poses.standing' },
  { value: 'sitting', labelKey: 'productionPanel.poses.sitting' },
  { value: 'closeup', labelKey: 'productionPanel.poses.closeup' },
  { value: 'fullbody', labelKey: 'productionPanel.poses.fullbody' },
  { value: 'action', labelKey: 'productionPanel.poses.action' },
  { value: 'running', labelKey: 'productionPanel.poses.running' },
  { value: 'jump', labelKey: 'productionPanel.poses.jump' },
  { value: 'lying', labelKey: 'productionPanel.poses.lying' },
  { value: 'over_shoulder', labelKey: 'productionPanel.poses.overShoulder' },
  { value: 'back_view', labelKey: 'productionPanel.poses.backView' },
  { value: 'profile', labelKey: 'productionPanel.poses.profile' },
  { value: 'three_quarter', labelKey: 'productionPanel.poses.threeQuarter' },
  { value: 'hands_up', labelKey: 'productionPanel.poses.handsUp' },
  { value: 'hands_on_hips', labelKey: 'productionPanel.poses.handsOnHips' },
  { value: 'crossed_arms', labelKey: 'productionPanel.poses.crossedArms' },
  { value: 'kneeling', labelKey: 'productionPanel.poses.kneeling' },
];

// Yeni: çözünürlük presetleri
const RES_PRESETS = [
  { id: 'square_768', label: '768 × 768', w: 768, h: 768 },
  { id: 'square_1024', label: '1024 × 1024', w: 1024, h: 1024 },
  { id: 'portrait', label: '768 × 1024', w: 768, h: 1024 },
  { id: 'landscape', label: '1024 × 768', w: 1024, h: 768 },
];

const ProductionPanel: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useStore();

  const [steps, setSteps] = React.useState(state.steps);
  const [cfg, setCfg] = React.useState(state.cfg);
  const [isLoading, setIsLoading] = React.useState(false);
  // Varsayılan: LLM açık, tam otomasyon
  const [useAI, setUseAI] = React.useState(true);
  const [lastReason, setLastReason] = React.useState<string | undefined>(undefined);

  // Local derived data for sub-styles based on selectedStyles
  const subOptions: { value: SubStyleKey; label: string }[] = React.useMemo(() => {
    const groups = state.selectedStyles.flatMap((sk) => SUBSTYLE_GROUPS[sk] || []);
    // unique by value
    const map = new Map<string, { value: SubStyleKey; label: string }>();
    groups.forEach((g) => { if (!map.has(g.value)) map.set(g.value, { value: g.value, label: t(g.labelKey) }); });
    return Array.from(map.values());
  }, [state.selectedStyles, t]);

  // Preset tıklanınca genişlik/yüksekliği güncelle
  const onResPreset = (w: number, h: number) => {
    dispatch({ type: 'setWidth', width: w });
    dispatch({ type: 'setHeight', height: h });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm opacity-80">{t('productionPanel.aiInterpretation')}</div>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="accent-violet-500" checked={useAI} onChange={(e)=>setUseAI(e.target.checked)} />
          <span className="text-xs opacity-70">{useAI ? t('productionPanel.on') : t('productionPanel.off')}</span>
        </label>
      </div>
      {lastReason && (
        <div className="text-[11px] opacity-60 mb-2">{t('productionPanel.plan')}: {lastReason}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.model')}</label>
          <CompactSingleSelect
            value={state.selectedModel}
            options={MODEL_OPTIONS}
            onChange={(val)=>dispatch({ type: 'setSelectedModel', model: val as ModelKey })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.lora')}</label>
          <CompactMultiSelect
            value={state.selectedLoras}
            options={[
              { value: 'Lora_FaceID_A', label: 'FaceID A' },
              { value: 'Lora_FaceID_B', label: 'FaceID B' },
              { value: 'Lora_Cinematic', label: 'Cinematic' },
              { value: 'Lora_StudioLight', label: 'Studio Light' },
              { value: 'Lora_FilmGrain', label: 'Film Grain' },
            ]}
            onChange={(vals)=>dispatch({ type: 'setSelectedLoras', loras: vals })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.style')}</label>
          <CompactMultiSelect
            value={state.selectedStyles}
            options={STYLE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
            onChange={(vals)=>dispatch({ type: 'setSelectedStyles', styles: vals as StyleKey[] })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.substyle')}</label>
          <CompactMultiSelect
            value={state.selectedSubStyles}
            options={subOptions}
            onChange={(vals)=>dispatch({ type: 'setSelectedSubStyles', substyles: vals as SubStyleKey[] })}
          />
        </div>
        <div className="xl:col-span-2">
          <label className="block text-sm mb-1">{t('productionPanel.pose')}</label>
          <CompactMultiSelect
            value={state.selectedPoses}
            options={POSE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
            onChange={(vals)=>dispatch({ type: 'setSelectedPoses', poses: vals as PoseKey[] })}
          />
        </div>
      </div>

      {/* Çözünürlük alanı */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm mb-2">{t('productionPanel.resolution.title')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RES_PRESETS.map(p => (
              <button
                key={p.id}
                className={`pill px-3 py-2 text-sm border ${state.width===p.w && state.height===p.h ? 'border-[rgb(var(--accent))] bg-[rgba(var(--accent),.08)]' : 'border-zinc-700/70 hover:border-zinc-600/80'}`}
                onClick={()=>onResPreset(p.w, p.h)}
                title={t('productionPanel.resolution.quickSelect')}
              >{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-2">{t('productionPanel.resolution.advanced')}</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs mb-1 opacity-75">{t('productionPanel.resolution.width')}</span>
              <input type="number" className="input" min={256} max={2048} step={64}
                value={state.width} onChange={(e)=>dispatch({ type: 'setWidth', width: Number(e.target.value) })} />
            </div>
            <div>
              <span className="block text-xs mb-1 opacity-75">{t('productionPanel.resolution.height')}</span>
              <input type="number" className="input" min={256} max={2048} step={64}
                value={state.height} onChange={(e)=>dispatch({ type: 'setHeight', height: Number(e.target.value) })} />
            </div>
          </div>
          <div className="text-[11px] opacity-60 mt-1">{t('productionPanel.resolution.tip')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.steps')}</label>
          <input type="number" className="input" min={1} max={200} value={steps} onChange={(e)=>setSteps(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('productionPanel.cfg')}</label>
          <input type="number" className="input" min={1} max={50} step={0.5} value={cfg} onChange={(e)=>setCfg(Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-3">
          {/* Progress Indicator */}
          {state.generationProgress.isGenerating && (
            <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">{t('productionPanel.generating')}</span>
                <span className="text-xs text-zinc-400">{Math.round(state.generationProgress.progress)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldA))] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.generationProgress.progress}%` }}
                />
              </div>
            </div>
          )}
          
          <button
            className="btn-primary h-10 px-4 shadow hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading || state.generationProgress.isGenerating}
            onClick={async () => {
              // son değerleri store'a yansıt
              dispatch({ type: 'setSteps', steps });
              dispatch({ type: 'setCfg', cfg });

              if (!state.prompt?.trim()) {
                alert(t('productionPanel.pleaseEnterPrompt'));
                return;
              }

              try {
                setIsLoading(true);

                // Varsayılanlar (kullanıcı seçimi)
                let prompt = state.prompt;
                let negative = state.negative || undefined;
                let s = steps, c = cfg;
                let width = state.width, height = state.height;

                if (useAI) {
                  try {
                    const plan = await planWithLLM(state.prompt, {
                      styles: state.selectedStyles,
                      substyles: state.selectedSubStyles,
                      poses: state.selectedPoses,
                      locale: state.lang,
                    });
                    prompt = plan.prompt || prompt;
                    negative = plan.negative || negative;
                    s = plan.steps || s;
                    c = plan.cfg || c;
                    width = plan.width || width;
                    height = plan.height || height;
                    setLastReason(plan.reasoning);
                  } catch (e) {
                    console.warn(t('productionPanel.llmPlanFailed'), e);
                    setLastReason(undefined);
                  }
                } else {
                  setLastReason(undefined);
                }

                // Progress indicator için state güncellemesi
                dispatch({ type: 'setGenerationProgress', progress: { isGenerating: true, progress: 0 } });

                const blob = await hfClient.textToImage({
                  prompt,
                  negative_prompt: negative,
                  steps: s,
                  guidance_scale: c,
                  width,
                  height,
                });
                const url = URL.createObjectURL(blob);
                if (state.generatedImage?.url) {
                  try { URL.revokeObjectURL(state.generatedImage.url); } catch {}
                }
                dispatch({ type: 'setGeneratedImage', image: { url, createdAt: Date.now() } });
                // Progress tamamlandı
                dispatch({ type: 'setGenerationProgress', progress: { isGenerating: false, progress: 100 } });
                // Gallery sekmesine otomatik geçiş kaldırıldı - kullanıcı manuel olarak geçebilir
              } catch (err: any) {
                console.error(err);
                alert(`${t('productionPanel.generationFailed')}: ${err?.message || err}`);
                // Hata durumunda progress'i sıfırla
                dispatch({ type: 'setGenerationProgress', progress: { isGenerating: false, progress: 0 } });
              } finally {
                setIsLoading(false);
              }
            }}>
            {isLoading || state.generationProgress.isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                {t('productionPanel.generating')}…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 opacity-90" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"/></svg>
                {t('productionPanel.generate')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionPanel;

// Compact dropdown components to reduce vertical space
const useClickOutside = (ref: React.RefObject<HTMLElement>, onOutside: () => void) => {
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOutside(); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, onOutside]);
};

const Chevron: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className ?? 'h-4 w-4 opacity-70'} viewBox="0 0 20 20" fill="currentColor">
    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"/>
  </svg>
);

// Modern pill/tag formatında seçiciler
const CompactSingleSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));
  
  const selectedOption = options.find(opt => opt.value === value);
  
  return (
    <div ref={ref} className="relative">
      <button
        className="input h-9 flex items-center justify-between w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? '' : 'opacity-50'}>
          {selectedOption?.label || placeholder || 'Seçiniz'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 first:rounded-t-lg last:rounded-b-lg ${
                opt.value === value ? 'bg-[rgba(var(--accent),.1)] text-[rgb(var(--accent))]' : ''
              }`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CompactMultiSelect: React.FC<{
  value: string[];
  options: { value: string; label: string }[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const toggleOption = (optValue: string) => {
    const newValue = value.includes(optValue)
      ? value.filter(v => v !== optValue)
      : [...value, optValue];
    onChange(newValue);
  };
  
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(val => {
            const opt = options.find(o => o.value === val);
            return opt ? (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[rgba(var(--accent),.1)] text-[rgb(var(--accent))] border border-[rgba(var(--accent),.3)] rounded-full"
              >
                {opt.label}
                <button
                  onClick={() => toggleOption(val)}
                  className="hover:bg-[rgba(var(--accent),.2)] rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {options.filter(opt => !value.includes(opt.value)).map(opt => (
          <button
            key={opt.value}
            onClick={() => toggleOption(opt.value)}
            className="px-2 py-1 text-xs border border-zinc-700 hover:border-zinc-600 rounded-full hover:bg-zinc-800 transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.length === 0 && placeholder && (
        <div className="text-xs opacity-50 px-2 py-1">{placeholder}</div>
      )}
    </div>
  );
};