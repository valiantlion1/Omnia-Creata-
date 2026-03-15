import React from 'react';
import { useStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

const STYLE_FAMILIES = [
  { key: 'realistic', label: 'Realistic', sub: ['Portrait', 'Street Photo', 'Documentary', 'Product'] },
  { key: 'anime', label: 'Anime', sub: ['Kawaii', 'Shonen', 'Studio Ghibli', 'Cel Shaded'] },
  { key: 'product', label: 'Product', sub: ['Studio Light', 'Macro', 'E-commerce', 'Minimal'] },
  { key: 'cinematic', label: 'Cinematic', sub: ['Moody', 'Neon Noir', 'Film Grain', 'Sci-Fi'] },
  { key: 'illustration', label: 'Illustration', sub: ['Watercolor', 'Ink', 'Comic', 'Concept Art'] },
  { key: 'cyberpunk', label: 'Cyberpunk', sub: ['Neon City', 'Retro Wave', 'Tech Noir', 'Dystopia'] },
] as const;

const Composer: React.FC = () => {
  const { state, dispatch } = useStore();
  const { t } = useTranslation();

  const [prompt, setPrompt] = React.useState(state.prompt);
  const [negative, setNegative] = React.useState(state.negative);
  const [steps, setSteps] = React.useState(state.steps);
  const [cfg, setCfg] = React.useState(state.cfg);
  const [family, setFamily] = React.useState<typeof STYLE_FAMILIES[number]['key']>('realistic');
  const [mix, setMix] = React.useState<{ name: string; weight: number }[]>([]);

  React.useEffect(() => {
    if (!state.composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'setComposerOpen', open: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.composerOpen, dispatch]);

  React.useEffect(() => {
    // reset substyles when family changes
    const fam = STYLE_FAMILIES.find(f => f.key === family);
    if (fam) setMix(fam.sub.slice(0, 2).map(name => ({ name, weight: 0.5 })));
  }, [family]);

  if (!state.composerOpen) return null;

  const fam = STYLE_FAMILIES.find(f => f.key === family)!;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={() => dispatch({ type: 'setComposerOpen', open: false })} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl card card-pad overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">{t('studio.composer')}</h2>
          <button className="btn-outline" onClick={() => dispatch({ type: 'setComposerOpen', open: false })}>{t('common.close')}</button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm mb-1">Prompt</label>
            <textarea className="input min-h-[96px]" value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Describe your image..." />
          </div>
          <div>
            <label className="block text-sm mb-1">Negative</label>
            <input className="input" value={negative} onChange={(e)=>setNegative(e.target.value)} placeholder="What to avoid (optional)" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1">Style Family</label>
              <select className="input" value={family} onChange={(e)=>setFamily(e.target.value as any)}>
                {STYLE_FAMILIES.map(sf => (
                  <option key={sf.key} value={sf.key}>{sf.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">Sub-Styles Mix</label>
              <div className="space-y-3">
                {mix.map((m, idx) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="pill px-2 h-8 text-xs min-w-[120px] justify-center">{m.name}</span>
                    <input type="range" min={0} max={1} step={0.01} value={m.weight} onChange={(e)=>{
                      const w = Number(e.target.value);
                      setMix(prev => prev.map((x,i)=> i===idx ? { ...x, weight: w } : x));
                    }} className="flex-1 accent-[rgb(var(--accent))]" />
                    <span className="w-10 text-right text-xs">{(m.weight*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {fam.sub.map(s => (
                  <button key={s}
                    className={`pill h-8 px-2 text-xs ${mix.some(m=>m.name===s)?'border-[rgb(var(--accent))]/60':''}`}
                    onClick={() => {
                      setMix(prev => prev.some(m=>m.name===s) ? prev.filter(m=>m.name!==s) : [...prev, { name: s, weight: 0.5 }]);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Steps</label>
              <input type="number" min={1} max={150} className="input" value={steps} onChange={(e)=>setSteps(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm mb-1">CFG</label>
              <input type="number" min={1} max={50} className="input" value={cfg} onChange={(e)=>setCfg(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-outline" onClick={() => dispatch({ type: 'setComposerOpen', open: false })}>{t.close}</button>
            <button
              className="btn-primary"
              onClick={() => {
                // sync back to store for now
                dispatch({ type: 'setPrompt', prompt });
                dispatch({ type: 'setNegative', negative });
                dispatch({ type: 'setSteps', steps });
                dispatch({ type: 'setCfg', cfg });
                // future: enqueue job with chosen styles
                dispatch({ type: 'setComposerOpen', open: false });
              }}
            >
              {t.generate}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Composer;