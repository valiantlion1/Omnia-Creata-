import React from 'react';
import { PRESETS } from '@/lib/presets';
import type { Preset } from '@/lib/presets';

export type Lang = 'en' | 'tr';
export type ThemeKey = 'midnight' | 'cyberpunk' | 'sunset' | 'ocean' | 'emerald' | 'royal' | 'aurora' | 'dusk';
export type TabKey = 'dashboard' | 'txt2img' | 'img2img' | 'lora' | 'presets' | 'gallery' | 'settings' | 'music';
export type FxQuality = 'eco' | 'normal' | 'quality';
export type WaveformStyle = 'bars' | 'wave';
export type FxMode = '2d' | '3d';
// New navigation types
export type PrimaryCategory = 'production' | 'models' | 'gallery' | 'studio' | 'music' | 'settings';
export type SubTab = 'txt2img' | 'img2img' | 'inpaint' | 'outpaint' | 'upscale' | 'pose' | 'promptStudio' | 'lora' | 'presets' | 'gallery' | 'settings' | 'music';

// New selector types for production panel
export type ModelKey = 'sd_xl_base_1.0' | 'sd_xl_refiner_1.0' | 'RealVisXL_V3.0' | 'Juggernaut-XL_v9_RunDiffusionPhoto_v2' | 'animagine-xl-4.0' | 'Pony_Diffusion_V6_XL';
// Style families (ids kept short, labels are i18n)
export type StyleKey = 'real' | 'anime' | 'prod' | 'cin' | 'illu' | 'cyber';
export type SubStyleKey =
  | 'photo' | 'hdr' | 'portrait' | 'film' | 'street'
  | 'jp' | 'manga' | 'vivid' | 'chibi'
  | 'studio' | 'pack' | 'macro' | 'ghost'
  | 'noir' | 'blade' | 'warm' | 'cold'
  | 'flat' | 'comic' | 'water' | 'ink'
  | 'neon' | 'city' | 'tech' | 'holo';
export type PoseKey = 'standing' | 'sitting' | 'closeup' | 'fullbody' | 'action' | 'running' | 'jump' | 'lying' | 'over_shoulder' | 'back_view' | 'profile' | 'three_quarter' | 'hands_up' | 'hands_on_hips' | 'crossed_arms' | 'kneeling';

// New: generation output
export type GeneratedImage = { url: string; createdAt: number } | null;

// New: generation progress
export type GenerationProgress = { isGenerating: boolean; progress: number };

// New: compute mode
export type ComputeMode = 'local' | 'cloud';

type State = {
  preset: Preset | null;
  prompt: string;
  negative: string;
  // key generation params mirrored for metadata overlay
  steps: number;
  cfg: number;
  // New: resolution controls
  width: number;
  height: number;
  // app
  lang: Lang;
  theme: ThemeKey;
  activeTab: TabKey;
  // FX & Sound
  fxQuality: FxQuality;
  fxMode: FxMode;
  soundOn: boolean;
  volume: number; // 0..1
  waveform: WaveformStyle;
  musicUrl: string;
  // New navigation state
  primaryCategory: PrimaryCategory;
  contextualSubTab: SubTab;
  // Composer visibility
  composerOpen: boolean;
  // Production selectors (UI-controlled, not injected to prompt)
  selectedModel: ModelKey;
  selectedLoras: string[];
  selectedStyles: StyleKey[];
  selectedSubStyles: SubStyleKey[];
  selectedPoses: PoseKey[];
  // New: compute mode selection (local/cloud)
  computeMode: ComputeMode;
  // New: store last generated image URL (object URL)
  generatedImage: GeneratedImage;
  // New: generation progress
  generationProgress: GenerationProgress;
};

type Action =
  | { type: 'setPreset'; preset: Preset | null }
  | { type: 'setPrompt'; prompt: string }
  | { type: 'setNegative'; negative: string }
  | { type: 'setSteps'; steps: number }
  | { type: 'setCfg'; cfg: number }
  | { type: 'setWidth'; width: number }
  | { type: 'setHeight'; height: number }
  | { type: 'setLang'; lang: Lang }
  | { type: 'setTheme'; theme: ThemeKey }
  | { type: 'setActiveTab'; tab: TabKey }
  | { type: 'setFxQuality'; fx: FxQuality }
  | { type: 'setFxMode'; mode: FxMode }
  | { type: 'setSoundOn'; on: boolean }
  | { type: 'setVolume'; volume: number }
  | { type: 'setWaveform'; waveform: WaveformStyle }
  | { type: 'setMusicUrl'; url: string }
  // new actions
  | { type: 'setPrimaryCategory'; category: PrimaryCategory }
  | { type: 'setContextualSubTab'; sub: SubTab }
  | { type: 'setComposerOpen'; open: boolean }
  // production selector actions
  | { type: 'setSelectedModel'; model: ModelKey }
  | { type: 'setSelectedLoras'; loras: string[] }
  | { type: 'setSelectedStyles'; styles: StyleKey[] }
  | { type: 'setSelectedSubStyles'; substyles: SubStyleKey[] }
  | { type: 'setSelectedPoses'; poses: PoseKey[] }
  // compute mode
  | { type: 'setComputeMode'; mode: ComputeMode }
  // New: set generated image
  | { type: 'setGeneratedImage'; image: GeneratedImage }
  // New: set generation progress
  | { type: 'setGenerationProgress'; progress: GenerationProgress };

const initialPreset = PRESETS[0] ?? null;
const initialState: State = {
  preset: initialPreset,
  prompt: '',
  negative: '',
  steps: initialPreset?.settings.steps ?? 30,
  cfg: initialPreset?.settings.cfgScale ?? 7,
  // resolution defaults from preset if available
  width: initialPreset?.settings.width ?? 1024,
  height: initialPreset?.settings.height ?? 1024,
  lang: 'tr',
  theme: 'midnight',
  activeTab: 'dashboard',
  fxQuality: 'normal',
  fxMode: '2d',
  soundOn: true,
  volume: 0.5,
  waveform: 'bars',
  musicUrl: '',

  // new defaults
  primaryCategory: 'production',
  contextualSubTab: 'txt2img',
  composerOpen: false,
  // defaults for production selectors
  selectedModel: 'sd_xl_base_1.0',
  selectedLoras: [],
  selectedStyles: ['real'],
  selectedSubStyles: [],
  selectedPoses: [],
  // compute mode default
  computeMode: (typeof localStorage !== 'undefined' && (localStorage.getItem('computeMode') as ComputeMode)) || 'cloud',
  generatedImage: null,
  generationProgress: { isGenerating: false, progress: 0 },
};

const StoreContext = React.createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => { } });

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setPreset':
      return {
        ...state,
        preset: action.preset,
        // sync base params from preset if available
        steps: action.preset?.settings.steps ?? state.steps,
        cfg: action.preset?.settings.cfgScale ?? state.cfg,
        width: action.preset?.settings.width ?? state.width,
        height: action.preset?.settings.height ?? state.height,
      };
    case 'setPrompt':
      return { ...state, prompt: action.prompt };
    case 'setNegative':
      return { ...state, negative: action.negative };
    case 'setSteps':
      return { ...state, steps: Math.max(1, Math.round(action.steps)) };
    case 'setCfg':
      return { ...state, cfg: clamp(action.cfg, 1, 50) };
    case 'setWidth':
      return { ...state, width: Math.round(clamp(action.width, 256, 2048)) };
    case 'setHeight':
      return { ...state, height: Math.round(clamp(action.height, 256, 2048)) };
    case 'setLang':
      return { ...state, lang: action.lang };
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'setActiveTab':
      return { ...state, activeTab: action.tab };
    case 'setFxQuality':
      return { ...state, fxQuality: action.fx };
    case 'setFxMode':
      return { ...state, fxMode: action.mode };
    case 'setSoundOn':
      return { ...state, soundOn: action.on };

    // new cases
    case 'setPrimaryCategory':
      return { ...state, primaryCategory: action.category };
    case 'setContextualSubTab':
      return { ...state, contextualSubTab: action.sub };
    case 'setComposerOpen':
      return { ...state, composerOpen: action.open };
    // production selector cases
    case 'setSelectedModel':
      return { ...state, selectedModel: action.model };
    case 'setSelectedLoras':
      return { ...state, selectedLoras: [...action.loras] };
    case 'setSelectedStyles':
      return { ...state, selectedStyles: [...action.styles] };
    case 'setSelectedSubStyles':
      return { ...state, selectedSubStyles: [...action.substyles] };
    case 'setSelectedPoses':
      return { ...state, selectedPoses: [...action.poses] };
    case 'setComputeMode':
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('computeMode', action.mode); } catch { }
      return { ...state, computeMode: action.mode };
    case 'setGeneratedImage':
      return { ...state, generatedImage: action.image };
    case 'setGenerationProgress':
      return { ...state, generationProgress: action.progress };
    default:
      return state;
  }
}

export const StoreProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // reflect theme on <html> element
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    // clear all theme classes
    const allThemes = ['theme-midnight', 'theme-cyberpunk', 'theme-sunset', 'theme-ocean', 'theme-emerald', 'theme-royal', 'theme-aurora', 'theme-dusk', 'theme-modern'];
    allThemes.forEach(t => root.classList.remove(t));
    // 'midnight' is the default (no class needed, uses :root vars)
    if (state.theme !== 'midnight') {
      root.classList.add(`theme-${state.theme}`);
    }
    // persist theme choice
    try { localStorage.setItem('oc-theme', state.theme); } catch { }
  }, [state.theme]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
};

export function useStore() {
  return React.useContext(StoreContext);
}