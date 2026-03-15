export type PresetId =
  | 'realistic_portrait'
  | 'anime'
  | 'product'
  | 'wallpaper'
  | 'cinematic_moody'
  | 'cyberpunk_neon'
  | 'fashion_beauty'
  | 'illustration_clean'
  | 'retro_film'
  | 'minimal_graphic'
  | 'lowpoly_isometric';

export type Preset = {
  id: PresetId;
  name: string;
  description: string;
  settings: {
    steps: number;
    cfgScale: number;
    width: number;
    height: number;
    sampler: string;
    style:
      | 'realistic'
      | 'anime'
      | 'product'
      | 'wallpaper'
      | 'cinematic'
      | 'cyberpunk'
      | 'fashion'
      | 'illustration'
      | 'retro'
      | 'minimal'
      | 'lowpoly';
  };
};

export const PRESETS: Preset[] = [
  {
    id: 'realistic_portrait',
    name: 'Realistic Portrait',
    description: 'Natural skin tones, detailed face, soft lighting.',
    settings: { steps: 28, cfgScale: 5.5, width: 1024, height: 1344, sampler: 'dpmpp_2m_sde_karras', style: 'realistic' },
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Bold lines, vibrant colors, anime character look.',
    settings: { steps: 24, cfgScale: 6.5, width: 1024, height: 1024, sampler: 'euler_a', style: 'anime' },
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Clean background, sharp edges, product showcase.',
    settings: { steps: 22, cfgScale: 5.0, width: 1216, height: 832, sampler: 'dpmpp_2m', style: 'product' },
  },
  {
    id: 'wallpaper',
    name: 'Wallpaper',
    description: 'Wide aspect, balanced detail, desktop/phone friendly.',
    settings: { steps: 18, cfgScale: 4.5, width: 1344, height: 768, sampler: 'ddim', style: 'wallpaper' },
  },
  // New presets
  {
    id: 'cinematic_moody',
    name: 'Cinematic Moody',
    description: 'Moody lighting, volumetric fog, filmic tones, story-driven frames.',
    settings: { steps: 30, cfgScale: 6.5, width: 1280, height: 720, sampler: 'dpmpp_2m_sde_karras', style: 'cinematic' },
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    description: 'Neon glow, rainy streets, high contrast, futuristic vibes.',
    settings: { steps: 28, cfgScale: 6.8, width: 1216, height: 832, sampler: 'dpmpp_2m', style: 'cyberpunk' },
  },
  {
    id: 'fashion_beauty',
    name: 'Fashion Beauty',
    description: 'Editorial look, beauty lighting, glossy highlights, sharp details.',
    settings: { steps: 26, cfgScale: 5.8, width: 1024, height: 1344, sampler: 'dpmpp_2m_sde_karras', style: 'fashion' },
  },
  {
    id: 'illustration_clean',
    name: 'Illustration Clean',
    description: 'Clean linework, pastel palette, soft shading.',
    settings: { steps: 22, cfgScale: 6.0, width: 1024, height: 1024, sampler: 'euler_a', style: 'illustration' },
  },
  {
    id: 'retro_film',
    name: 'Retro Film',
    description: 'Analog texture, film grain, warm tones, soft halation.',
    settings: { steps: 24, cfgScale: 5.2, width: 1152, height: 896, sampler: 'ddim', style: 'retro' },
  },
  {
    id: 'minimal_graphic',
    name: 'Minimal Graphic',
    description: 'Flat shapes, bold typography, modern poster feel.',
    settings: { steps: 16, cfgScale: 4.0, width: 1024, height: 1365, sampler: 'euler', style: 'minimal' },
  },
  {
    id: 'lowpoly_isometric',
    name: 'Low-Poly Isometric',
    description: 'Stylized isometric scenes, low-poly geometry, crisp edges.',
    settings: { steps: 20, cfgScale: 5.0, width: 1216, height: 1216, sampler: 'euler', style: 'lowpoly' },
  },
];