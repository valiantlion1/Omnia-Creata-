import { builtinCategories, platformCatalog } from "@prompt-vault/config";
import type { PromptVaultDataset } from "@prompt-vault/types";

const demoUserId = "demo-user";

function isoDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

export function createDemoDataset(): PromptVaultDataset {
  const collections: PromptVaultDataset["collections"] = [
    {
      id: "collection-launch",
      userId: demoUserId,
      name: "Omnia Creata Launch",
      description: "Go-to prompts for brand narrative, product copy, and onboarding.",
      color: "teal",
      icon: "sparkles",
      createdAt: isoDaysAgo(90),
      updatedAt: isoDaysAgo(2)
    },
    {
      id: "collection-cinematic",
      userId: demoUserId,
      name: "Cinematic Image Lab",
      description: "Reusable prompts for image, video, and storyboard iterations.",
      color: "coral",
      icon: "image",
      createdAt: isoDaysAgo(72),
      updatedAt: isoDaysAgo(4)
    },
    {
      id: "collection-studio",
      userId: demoUserId,
      name: "Studio Systems",
      description: "Agent instructions, coding flows, and operating procedures.",
      color: "ink",
      icon: "workflow",
      createdAt: isoDaysAgo(65),
      updatedAt: isoDaysAgo(1)
    },
    {
      id: "collection-audio",
      userId: demoUserId,
      name: "Sound Experiments",
      description: "Suno and music direction prompts with style notes.",
      color: "amber",
      icon: "music",
      createdAt: isoDaysAgo(50),
      updatedAt: isoDaysAgo(6)
    }
  ];

  const tags: PromptVaultDataset["tags"] = [
    { id: "tag-saas", userId: demoUserId, name: "saas", color: "teal", createdAt: isoDaysAgo(90) },
    { id: "tag-launch", userId: demoUserId, name: "launch", color: "coral", createdAt: isoDaysAgo(88) },
    { id: "tag-cinematic", userId: demoUserId, name: "cinematic", color: "coral", createdAt: isoDaysAgo(78) },
    { id: "tag-agent", userId: demoUserId, name: "agent", color: "ink", createdAt: isoDaysAgo(66) },
    { id: "tag-coding", userId: demoUserId, name: "coding", color: "ink", createdAt: isoDaysAgo(64) },
    { id: "tag-ux", userId: demoUserId, name: "ui", color: "blue", createdAt: isoDaysAgo(63) },
    { id: "tag-suno", userId: demoUserId, name: "suno", color: "amber", createdAt: isoDaysAgo(50) },
    { id: "tag-tr", userId: demoUserId, name: "turkish", color: "sage", createdAt: isoDaysAgo(45) }
  ];

  const versions: PromptVaultDataset["versions"] = [
    {
      id: "chain-launch-v1",
      versionNumber: 1,
      body: "You are an expert product storyteller. Create a positioning narrative for Prompt Vault focused on trust, structure, and cross-device reuse.",
      summary: "First positioning draft",
      resultNotes: "Strong clarity, but it needed more mobile emphasis.",
      createdAt: isoDaysAgo(10),
      createdBy: demoUserId
    },
    {
      id: "chain-launch-v2",
      versionNumber: 2,
      body: "You are a senior SaaS copy strategist. Write a concise hero section for Prompt Vault that emphasizes searchability, reusable prompts, mobile-ready access, and premium trust.",
      summary: "Refined launch positioning",
      resultNotes: "This version converted better for short-form homepage copy.",
      createdAt: isoDaysAgo(2),
      createdBy: demoUserId
    },
    {
      id: "chain-image-v1",
      versionNumber: 1,
      body: "Create a cinematic jewelry still life in warm dawn light, reflective surfaces, shallow depth of field, and editorial luxury styling.",
      summary: "Luxury still life seed",
      resultNotes: "Best with Midjourney stylize 250.",
      createdAt: isoDaysAgo(12),
      createdBy: demoUserId
    },
    {
      id: "chain-image-v2",
      versionNumber: 2,
      body: "Create a cinematic jewelry still life on travertine with warm dawn light, soft haze, editorial luxury styling, close-up macro framing, and tactile shadows.",
      summary: "Added surface and lens direction",
      resultNotes: "Produced stronger detail separation in Flux and Midjourney.",
      createdAt: isoDaysAgo(4),
      createdBy: demoUserId
    },
    {
      id: "chain-code-v1",
      versionNumber: 1,
      body: "Refactor this React feature into modular components. Preserve behavior, improve readability, and call out regression risks before editing.",
      summary: "Base refactor brief",
      resultNotes: "Useful across Codex and Cursor.",
      createdAt: isoDaysAgo(9),
      createdBy: demoUserId
    },
    {
      id: "chain-agent-v1",
      versionNumber: 1,
      body: "Act as an operations agent. Review the week's launches, summarize blockers, propose next steps, and separate urgent work from strategic work.",
      summary: "Weekly review agent",
      resultNotes: "Very strong for executive check-ins.",
      createdAt: isoDaysAgo(7),
      createdBy: demoUserId
    },
    {
      id: "chain-music-v1",
      versionNumber: 1,
      body: "Write a Turkish synthwave anthem about building in silence, with neon textures, Anatolian melodic references, and a soaring chorus.",
      summary: "Turkish synthwave starting point",
      resultNotes: "Works well when tempo is set around 104 BPM.",
      createdAt: isoDaysAgo(6),
      createdBy: demoUserId
    },
    {
      id: "chain-video-v1",
      versionNumber: 1,
      body: "Generate a 30-second storyboard for a premium SaaS launch video with tactile close-ups, human hands, interface overlays, and restrained cinematic motion.",
      summary: "Video storyboard seed",
      resultNotes: "Good baseline for Runway and Veo shot lists.",
      createdAt: isoDaysAgo(3),
      createdBy: demoUserId
    }
  ];

  const prompts: PromptVaultDataset["prompts"] = [
    {
      id: "prompt-launch",
      userId: demoUserId,
      title: "Prompt Vault hero narrative",
      body: versions[1].body,
      summary: "Homepage hero copy framework for the product launch.",
      notes: "Angle toward trust, speed, and mobile usability rather than generic AI hype.",
      resultNotes: "Best output came from Claude and GPT with a short brand brief attached.",
      recommendedVariations: "Try a version centered on creators, then one for teams.",
      categoryId: "cat-marketing",
      collectionId: "collection-launch",
      type: "prompt",
      language: "en",
      platforms: ["chatgpt", "claude"],
      tagIds: ["tag-saas", "tag-launch"],
      isFavorite: true,
      isArchived: false,
      isPinned: true,
      status: "active",
      rating: 5,
      latestVersionId: "chain-launch-v2",
      latestVersionNumber: 2,
      versionChainId: "chain-launch",
      sourceUrl: "https://omniacreata.com",
      sourceLabel: "Product positioning notes",
      variables: [
        { id: "var-product", key: "product_name", label: "Product name", defaultValue: "Prompt Vault", required: true },
        { id: "var-audience", key: "audience", label: "Audience", defaultValue: "AI creators", required: true }
      ],
      createdAt: isoDaysAgo(10),
      updatedAt: isoDaysAgo(2)
    },
    {
      id: "prompt-image",
      userId: demoUserId,
      title: "Cinematic jewelry still life",
      body: versions[3].body,
      summary: "Luxury product prompt for tactile still life imagery.",
      notes: "Keep object count low and camera close to preserve premium feel.",
      resultNotes: "Most reliable when paired with warm beige palette references.",
      recommendedVariations: "Swap travertine for black slate or smoked glass.",
      categoryId: "cat-image",
      collectionId: "collection-cinematic",
      type: "template",
      language: "en",
      platforms: ["midjourney", "flux"],
      tagIds: ["tag-cinematic"],
      isFavorite: true,
      isArchived: false,
      isPinned: false,
      status: "active",
      rating: 4,
      latestVersionId: "chain-image-v2",
      latestVersionNumber: 2,
      versionChainId: "chain-image",
      variables: [
        { id: "var-subject", key: "subject", label: "Subject", defaultValue: "gold jewelry", required: true },
        { id: "var-surface", key: "surface", label: "Surface", defaultValue: "travertine" }
      ],
      createdAt: isoDaysAgo(12),
      updatedAt: isoDaysAgo(4)
    },
    {
      id: "prompt-code",
      userId: demoUserId,
      title: "Safe React refactor brief",
      body: versions[4].body,
      summary: "Engineering prompt for preserving behavior while improving code structure.",
      notes: "Use when refactors must stay pragmatic and review-oriented.",
      resultNotes: "Good prompt for avoiding overconfident rewrites.",
      recommendedVariations: "Add TypeScript, App Router, or test coverage constraints.",
      categoryId: "cat-coding",
      collectionId: "collection-studio",
      type: "workflow",
      language: "en",
      platforms: ["codex", "cursor"],
      tagIds: ["tag-agent", "tag-coding"],
      isFavorite: false,
      isArchived: false,
      isPinned: true,
      status: "reviewed",
      rating: 5,
      latestVersionId: "chain-code-v1",
      latestVersionNumber: 1,
      versionChainId: "chain-code",
      variables: [
        { id: "var-stack", key: "stack", label: "Stack", defaultValue: "React + TypeScript" }
      ],
      createdAt: isoDaysAgo(9),
      updatedAt: isoDaysAgo(1)
    },
    {
      id: "prompt-agent",
      userId: demoUserId,
      title: "Weekly operator review",
      body: versions[5].body,
      summary: "Agent instruction for reviewing momentum, blockers, and next actions.",
      notes: "Great for Sunday planning or Monday leadership recaps.",
      resultNotes: "The separation of urgent vs strategic work is especially useful.",
      recommendedVariations: "Attach KPI tables or launch notes for better context.",
      categoryId: "cat-agent",
      collectionId: "collection-studio",
      type: "agent_instruction",
      language: "en",
      platforms: ["chatgpt", "claude", "gemini"],
      tagIds: ["tag-agent"],
      isFavorite: true,
      isArchived: false,
      isPinned: false,
      status: "active",
      rating: 5,
      latestVersionId: "chain-agent-v1",
      latestVersionNumber: 1,
      versionChainId: "chain-agent",
      variables: [
        { id: "var-period", key: "review_period", label: "Review period", defaultValue: "This week", required: true }
      ],
      createdAt: isoDaysAgo(7),
      updatedAt: isoDaysAgo(7)
    },
    {
      id: "prompt-music",
      userId: demoUserId,
      title: "Turkish synthwave anthem",
      body: versions[6].body,
      summary: "Suno-ready music prompt with regional flavor and modern energy.",
      notes: "Works best when you keep the lyrical perspective first-person.",
      resultNotes: "A good balance of nostalgia and propulsion.",
      recommendedVariations: "Try a darker, slower variation with midnight city imagery.",
      categoryId: "cat-music",
      collectionId: "collection-audio",
      type: "prompt",
      language: "tr",
      platforms: ["suno"],
      tagIds: ["tag-suno", "tag-tr"],
      isFavorite: false,
      isArchived: false,
      isPinned: false,
      status: "active",
      rating: 4,
      latestVersionId: "chain-music-v1",
      latestVersionNumber: 1,
      versionChainId: "chain-music",
      variables: [
        { id: "var-mood", key: "mood", label: "Mood", defaultValue: "hopeful but driven" }
      ],
      createdAt: isoDaysAgo(6),
      updatedAt: isoDaysAgo(6)
    },
    {
      id: "prompt-video",
      userId: demoUserId,
      title: "Premium SaaS launch storyboard",
      body: versions[7].body,
      summary: "Short-form launch video structure for product reveal sequences.",
      notes: "Treat motion as restrained and tactile rather than flashy.",
      resultNotes: "Useful for aligning motion references before editing.",
      recommendedVariations: "Make one version for feature reveal, one for trust storytelling.",
      categoryId: "cat-video",
      collectionId: "collection-cinematic",
      type: "workflow",
      language: "en",
      platforms: ["runway", "veo"],
      tagIds: ["tag-cinematic", "tag-saas"],
      isFavorite: false,
      isArchived: false,
      isPinned: false,
      status: "draft",
      rating: 4,
      latestVersionId: "chain-video-v1",
      latestVersionNumber: 1,
      versionChainId: "chain-video",
      variables: [
        { id: "var-duration", key: "duration", label: "Duration", defaultValue: "30 seconds", required: true }
      ],
      createdAt: isoDaysAgo(3),
      updatedAt: isoDaysAgo(3)
    }
  ];

  const activities: PromptVaultDataset["activities"] = [
    {
      id: "activity-1",
      userId: demoUserId,
      type: "updated",
      promptId: "prompt-code",
      promptTitle: "Safe React refactor brief",
      createdAt: isoDaysAgo(1),
      description: "Adjusted the coding workflow prompt with safer review language."
    },
    {
      id: "activity-2",
      userId: demoUserId,
      type: "version_created",
      promptId: "prompt-launch",
      promptTitle: "Prompt Vault hero narrative",
      createdAt: isoDaysAgo(2),
      description: "Saved version 2 of the launch hero narrative."
    },
    {
      id: "activity-3",
      userId: demoUserId,
      type: "favorited",
      promptId: "prompt-agent",
      promptTitle: "Weekly operator review",
      createdAt: isoDaysAgo(7),
      description: "Marked the weekly review agent as a reliable favorite."
    },
    {
      id: "activity-4",
      userId: demoUserId,
      type: "created",
      promptId: "prompt-video",
      promptTitle: "Premium SaaS launch storyboard",
      createdAt: isoDaysAgo(3),
      description: "Created a fresh storyboard workflow for launch motion."
    }
  ];

  return {
    categories: builtinCategories,
    platforms: platformCatalog,
    collections,
    tags,
    prompts,
    versions,
    activities,
    aiSuggestions: [],
    aiUsage: [],
    preferences: {
      language: "en",
      theme: "system",
      density: "comfortable",
      defaultView: "list",
      enableOfflineCache: true
    }
  };
}
