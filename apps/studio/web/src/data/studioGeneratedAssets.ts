import styleAnimeStorm from '@/assets/landing/generated/style-anime-storm.png'
import styleAutomotiveCampaign from '@/assets/landing/generated/style-automotive-campaign.png'
import styleCelCanyon from '@/assets/landing/generated/style-cel-canyon.png'
import styleClaymationWorkshop from '@/assets/landing/generated/style-claymation-workshop.png'
import styleCyberpunk from '@/assets/landing/generated/style-cyberpunk.png'
import styleFantasyDragon from '@/assets/landing/generated/style-fantasy-dragon.png'
import styleGlamEditorial from '@/assets/landing/generated/style-glam-editorial.png'
import styleLiquidAbstract from '@/assets/landing/generated/style-liquid-abstract.png'
import styleLuxuryProduct from '@/assets/landing/generated/style-luxury-product.png'
import styleNoirPortrait from '@/assets/landing/generated/style-noir-portrait.png'
import styleRetrofutureCity from '@/assets/landing/generated/style-retrofuture-city.png'
import styleUnderwaterEditorial from '@/assets/landing/generated/style-underwater-editorial.png'

export const studioGeneratedAssets = [
  {
    id: 'cyberpunk',
    src: styleCyberpunk,
    alt: 'Cyberpunk neon rain market with a lone creator silhouette',
    label: 'Cyberpunk',
    tag: 'Cyberpunk',
    mood: 'Neon - Rain - Noir',
    prompt: 'Cyberpunk neon rain market at night with cinematic wet-street reflections.',
    focus: '50% 48%',
  },
  {
    id: 'anime-storm',
    src: styleAnimeStorm,
    alt: 'Anime storm warrior on a violet lightning cliff',
    label: 'Anime',
    tag: 'Anime',
    mood: 'Storm - Cape - Violet',
    prompt: 'Anime warrior key visual with lightning, wind, and dramatic cliff atmosphere.',
    focus: '52% 42%',
  },
  {
    id: 'cel-canyon',
    src: styleCelCanyon,
    alt: 'Cel-shaded sci-fantasy explorer in a glowing canyon',
    label: 'Cel shading',
    tag: 'Cel shade',
    mood: 'Graphic - Canyon - Sunset',
    prompt: 'Cel-shaded sci-fantasy explorer crossing a glowing desert canyon.',
    focus: '50% 48%',
  },
  {
    id: 'fantasy-dragon',
    src: styleFantasyDragon,
    alt: 'Dark fantasy dragon on crystalline ruins under aurora light',
    label: 'Fantasy',
    tag: 'Fantasy',
    mood: 'Aurora - Dragon - Mythic',
    prompt: 'Dark fantasy dragon with iridescent scales and crystalline moonlit ruins.',
    focus: '52% 48%',
  },
  {
    id: 'glam-editorial',
    src: styleGlamEditorial,
    alt: 'Tasteful glam editorial portrait in black satin and gold light',
    label: 'Glam editorial',
    tag: 'Fashion',
    mood: 'Satin - Gold - Studio',
    prompt: 'Tasteful glam editorial portrait with sculptural fashion and dramatic studio light.',
    focus: '52% 36%',
  },
  {
    id: 'noir-portrait',
    src: styleNoirPortrait,
    alt: 'Photorealistic noir portrait in a rain-streaked glass studio',
    label: 'Photoreal noir',
    tag: 'Portrait',
    mood: 'Glass - Rain - Amber',
    prompt: 'Photoreal noir portrait with rain-streaked glass, rim light, and cinematic shadows.',
    focus: '56% 36%',
  },
  {
    id: 'luxury-product',
    src: styleLuxuryProduct,
    alt: 'Obsidian perfume bottle on volcanic stone with amber backlight',
    label: 'Luxury product',
    tag: 'Product',
    mood: 'Obsidian - Smoke - Amber',
    prompt: 'Luxury product advertising scene for an obsidian perfume bottle on volcanic stone.',
    focus: '50% 52%',
  },
  {
    id: 'underwater-editorial',
    src: styleUnderwaterEditorial,
    alt: 'Surreal underwater editorial scene with glowing coral and flowing fabric',
    label: 'Surreal editorial',
    tag: 'Editorial',
    mood: 'Coral - Fabric - Blue',
    prompt: 'Surreal underwater fashion editorial with glowing coral and cinematic blue-green light.',
    focus: '52% 44%',
  },
  {
    id: 'retrofuture-city',
    src: styleRetrofutureCity,
    alt: 'Retrofuturist sci-fi city at sunrise with chrome transit lines',
    label: 'Sci-fi city',
    tag: 'Sci-fi',
    mood: 'Chrome - Transit - Sunrise',
    prompt: 'Retrofuturist sci-fi city at sunrise with chrome towers and flying transit lines.',
    focus: '54% 50%',
  },
  {
    id: 'liquid-abstract',
    src: styleLiquidAbstract,
    alt: 'Abstract liquid glass ribbons and iridescent particles in a black void',
    label: 'Abstract',
    tag: 'Generative',
    mood: 'Glass - Particles - Void',
    prompt: 'Abstract generative art made of liquid glass ribbons and iridescent particles.',
    focus: '50% 50%',
  },
  {
    id: 'automotive-campaign',
    src: styleAutomotiveCampaign,
    alt: 'Cinematic sports car on a wet mountain pass at dusk',
    label: 'Car ad',
    tag: 'Automotive',
    mood: 'Wet road - Dusk - Speed',
    prompt: 'Cinematic stylized sports car campaign on a mountain pass with mist and headlights.',
    focus: '52% 54%',
  },
  {
    id: 'claymation-workshop',
    src: styleClaymationWorkshop,
    alt: 'Claymation miniature workshop with robots painting on canvas',
    label: 'Claymation',
    tag: 'Stop-motion',
    mood: 'Miniature - Handmade - Warm',
    prompt: 'Claymation stop-motion miniature workshop with tactile handmade textures.',
    focus: '50% 50%',
  },
] as const
