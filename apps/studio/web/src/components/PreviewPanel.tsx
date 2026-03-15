import React from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

const PreviewPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const shortPrompt = state.prompt?.length > 80 ? state.prompt.slice(0, 80) + '…' : state.prompt || '—';

  const rerun = () => {
    // ileride: mevcut metadata ile işi tekrar sıraya al
    console.log('Re-run with', { prompt: state.prompt, steps: state.steps, cfg: state.cfg });
    // kullanıcıyı kontrol paneline odakla
    dispatch({ type: 'setActiveTab', tab: 'txt2img' as any });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Önizleme</h2>
        <span className="section-sub">son oluşturulan görüntü</span>
      </div>

      {state.generatedImage ? (
        <div className="relative">
          <img src={state.generatedImage.url} alt="Generated" className="w-full max-h-[520px] object-contain rounded-lg border border-zinc-800" />
          <div className="mt-2 text-xs text-zinc-400">{shortPrompt}</div>
        </div>
      ) : (
        <div className="h-[300px] rounded-xl border border-zinc-800/70 bg-zinc-900/40 flex items-center justify-center text-zinc-500">
          Henüz bir görsel yok. Önce prompt girip Generate’e bas.
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button className="btn" onClick={rerun}>Tekrar Çalıştır</button>
        <button className="btn-ghost" onClick={()=>dispatch({ type: 'setActiveTab', tab: 'txt2img' as any })}>Kontroller</button>
      </div>
    </div>
  );
};

export default PreviewPanel;