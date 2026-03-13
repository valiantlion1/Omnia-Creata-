import React from 'react';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  'SDXL', 'Realistic', 'Anime', 'Artstyle', '3D', 'Product', 'Portrait', 'Landscape', 'Architecture', 'Fashion', 'Food', 'Vehicle', 'Sci-Fi', 'Fantasy', 'Horror', 'Cyberpunk', 'Pixel', 'Watercolor', 'Oil Painting', 'Sketch', 'Cartoon', 'Comics', 'NSFW', 'LoRA - Face', 'LoRA - Style', 'LoRA - Pose', 'ControlNet'
];

const MOCK: Record<string, string[]> = {
  SDXL: ['sd_xl_base_1.0', 'sd_xl_refiner_1.0', 'JuggernautXL_v9', 'RealVisXL_V3.0'],
  Realistic: ['RealVisXL_V3.0', 'PhotonXL', 'DreamshaperXL'],
  Anime: ['AnimePastelXL', 'CounterfeitXL', 'AnyLoraXL'],
  'LoRA - Style': ['Lora_Cinematic', 'Lora_StudioLight', 'Lora_FilmGrain'],
  'LoRA - Face': ['Lora_FaceID_A', 'Lora_FaceID_B'],
  ControlNet: ['Canny', 'OpenPose', 'Depth', 'SoftEdge'],
};

const ModelManager: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [cat, setCat] = React.useState('SDXL');

  const list = (MOCK[cat] || []).filter((m) => m.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">{t('modelManager.title')}</h2>
        <span className="section-sub">{t('modelManager.subtitle')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-sm mb-1">{t('modelManager.category')}</label>
          <select className="input" value={cat} onChange={(e)=>setCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">{t('modelManager.searchLocal')}</label>
          <div className="flex gap-2">
            <input className="input" placeholder={t('modelManager.searchPlaceholder')} value={query} onChange={(e)=>setQuery(e.target.value)} />
            <button className="btn-outline">{t('modelManager.search')}</button>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <ul className="space-y-1">
          {list.map((m) => (
            <li key={m} className="px-2 py-2 rounded-lg hover:bg-zinc-800 flex items-center justify-between">
              <span>{m}</span>
              <div className="flex items-center gap-2">
                <button className="btn-ghost text-xs">{t('modelManager.use')}</button>
                <button className="btn-outline text-xs">{t('modelManager.download')}</button>
              </div>
            </li>
          ))}
          {list.length===0 && <li className="text-zinc-500 px-2 py-2">{t('modelManager.noResults')}</li>}
        </ul>

        <div className="pt-3 border-t border-zinc-800/60">
          <p className="section-title mb-2">{t('modelManager.searchOnline.title')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input md:col-span-2" placeholder={t('modelManager.searchOnline.placeholder')} />
            <button className="btn-primary">{t('modelManager.searchOnline.search')}</button>
          </div>
          <p className="section-sub mt-2">{t('modelManager.searchOnline.description')}</p>
        </div>
      </div>
    </div>
  );
};

export default ModelManager;