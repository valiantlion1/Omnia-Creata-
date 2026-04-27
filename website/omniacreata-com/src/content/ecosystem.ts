export type ProductFeature = {
  title: string;
  description: string;
};

export type PreviewCard = {
  label: string;
  title: string;
  detail: string;
};

export type ProductSlug =
  | "omnia-creata-studio"
  | "omniapixels"
  | "omniaorganizer"
  | "prompt-vault"
  | "omnia-watch";

export type ProductRecord = {
  slug: ProductSlug;
  badge: string;
  name: string;
  shortDescription: string;
  tagline: string;
  headline: string;
  heroSummary: string;
  roleTitle: string;
  roleDescription: string;
  keyFeatures: ProductFeature[];
  ecosystemPoints: ProductFeature[];
  previewCards: PreviewCard[];
  heroStats: Array<{ label: string; value: string }>;
  companionSlugs: ProductSlug[];
};

export const products: ProductRecord[] = [
  {
    slug: "omnia-creata-studio",
    badge: "Flagship environment",
    name: "OmniaCreata Studio",
    shortDescription:
      "The central creative environment where briefs, assets, prompts, and approvals converge.",
    tagline: "The premium operating environment for intelligent creation.",
    headline: "Lead every intelligent workflow from one deliberate control surface.",
    heroSummary:
      "OmniaCreata Studio is the flagship workspace for the ecosystem. It gives teams a unified place to shape strategy, direct AI-assisted creation, review output, and move polished work into release.",
    roleTitle: "Studio is the orchestration layer.",
    roleDescription:
      "It is where the rest of the ecosystem becomes usable as one system. Ideas enter through Prompt Vault, edited visual assets can arrive through OmniaPixels, execution stays aligned through OmniaOrganizer, and live signals remain visible through Omnia Watch.",
    keyFeatures: [
      {
        title: "Creative orchestration boards",
        description:
          "Manage briefs, assets, creative direction, and output review inside a cinematic workspace designed for long-form thinking.",
      },
      {
        title: "AI-native production flows",
        description:
          "Turn concepts into structured workflows with reusable sequences for ideation, generation, refinement, and delivery.",
      },
      {
        title: "Premium review surfaces",
        description:
          "Bring comments, approvals, revisions, and launch-ready handoff together without fragmenting context across tools.",
      },
      {
        title: "Connected ecosystem control",
        description:
          "Operate the broader Omnia Creata product family from a single place instead of hopping between disconnected utilities.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Receives structured prompt systems",
        description:
          "Studio draws organized prompting logic, libraries, and experimentation history from Prompt Vault.",
      },
      {
        title: "Receives mobile-ready visuals",
        description:
          "Phone-edited images and clean exports can flow in from OmniaPixels when the mobile app is ready.",
      },
      {
        title: "Keeps operations synchronized",
        description:
          "Plans, milestones, and execution states remain tied to OmniaOrganizer and informed by Omnia Watch.",
      },
    ],
    previewCards: [
      {
        label: "Workspace",
        title: "Live campaign boards",
        detail:
          "Shape concepts, reference prompts, assign tasks, and evaluate draft output without breaking the creative thread.",
      },
      {
        label: "Direction",
        title: "System-grade briefing",
        detail:
          "Translate creative intent into reusable structures with briefs that stay aligned across the ecosystem.",
      },
      {
        label: "Review",
        title: "Fast, premium approvals",
        detail:
          "Move from iteration to sign-off with presentation-quality previews and contextual change tracking.",
      },
    ],
    heroStats: [
      { label: "Role", value: "Flagship core" },
      { label: "Focus", value: "Creation orchestration" },
      { label: "Designed for", value: "Long-form intelligent work" },
    ],
    companionSlugs: [
      "prompt-vault",
      "omniapixels",
      "omniaorganizer",
      "omnia-watch",
    ],
  },
  {
    slug: "omniapixels",
    badge: "Mobile photo editor",
    name: "OmniaPixels",
    shortDescription:
      "A local-first mobile photo editor and upscaler for improving existing images on-device.",
    tagline: "Mobile photo editing for the Omnia Creata ecosystem.",
    headline: "Improve photos on your phone without turning editing into a cloud workflow.",
    heroSummary:
      "OmniaPixels handles the phone-first editing path: select a photo, adjust it, compare an upscale, and export a clean copy.",
    roleTitle: "OmniaPixels is the mobile photo tool.",
    roleDescription:
      "It keeps existing photos and visual assets useful when the work needs quick mobile correction, enhancement, and export.",
    keyFeatures: [
      {
        title: "Gallery-first editing",
        description:
          "Start from photos already on the phone, keep the flow simple, and move quickly into editing.",
      },
      {
        title: "Refinement and enhancement",
        description:
          "Tune crop, rotation, light, color, detail, and upscale without bouncing into fragmented editing steps.",
      },
      {
        title: "Before and after confidence",
        description:
          "Compare changes clearly before saving a new copy of the image.",
      },
      {
        title: "Clean mobile export",
        description:
          "Save or share finished images in formats that make sense for mobile publishing.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Powered by prompt intelligence",
        description:
          "Prompt Vault can later support reusable visual-editing notes, but the first OmniaPixels app stays photo-first.",
      },
      {
        title: "Feeds final assets into Studio",
        description:
          "Approved imagery flows into the flagship environment for broader creative assembly and review.",
      },
      {
        title: "Tracks production readiness",
        description:
          "Organizer and Watch provide planning, monitoring, and quality oversight around visual execution.",
      },
    ],
    previewCards: [
      {
        label: "Gallery",
        title: "Photo-to-edit flow",
        detail:
          "Open recent photos and move into edit mode without dashboard friction.",
      },
      {
        label: "Refinement",
        title: "High-trust finishing tools",
        detail:
          "Polish assets for publishing, presentation, and campaign deployment with measured enhancement steps.",
      },
      {
        label: "Series work",
        title: "Simple saved copies",
        detail:
          "Protect originals while exporting polished versions for sharing or publishing.",
      },
    ],
    heroStats: [
      { label: "Role", value: "Mobile photo tool" },
      { label: "Focus", value: "Local editing and upscale" },
      { label: "Designed for", value: "Fast phone workflows" },
    ],
    companionSlugs: ["omnia-creata-studio", "prompt-vault", "omnia-watch"],
  },
  {
    slug: "omniaorganizer",
    badge: "Operational flow",
    name: "OmniaOrganizer",
    shortDescription:
      "A creator-first command layer for planning, prioritization, delivery pacing, and operational clarity.",
    tagline: "Operational clarity for AI-native teams and creator workflows.",
    headline: "Keep intelligent work moving with calm, visible operational control.",
    heroSummary:
      "OmniaOrganizer gives the ecosystem a planning backbone. It aligns tasks, milestones, responsibilities, and pacing so creative work stays intentional from ideation through delivery.",
    roleTitle: "OmniaOrganizer is the operational layer.",
    roleDescription:
      "It connects planning to Studio, turns prompt and asset work into accountable progress, and helps Omnia Watch surface meaningful health signals instead of disconnected alerts.",
    keyFeatures: [
      {
        title: "Creator-first planning",
        description:
          "Manage work with room for exploration, revision, and review rather than rigid task lists built for generic project management.",
      },
      {
        title: "Priority-aware execution",
        description:
          "Balance deep work, active launches, and recurring production needs with structured visibility across the ecosystem.",
      },
      {
        title: "Shared operational context",
        description:
          "Tie responsibilities, timing, blockers, and delivery readiness directly to the systems generating the work.",
      },
      {
        title: "Signal-ready checkpoints",
        description:
          "Feed Omnia Watch with meaningful milestones so monitoring stays attached to execution reality.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Keeps Studio aligned",
        description:
          "High-level creative intent stays connected to execution plans, timelines, and launch readiness.",
      },
      {
        title: "Supports asset and prompt work",
        description:
          "OmniaPixels and Prompt Vault become easier to scale when their product outputs are attached to operational structure.",
      },
      {
        title: "Improves system awareness",
        description:
          "Omnia Watch gains better context when activity, ownership, and timing are mapped clearly.",
      },
    ],
    previewCards: [
      {
        label: "Planning",
        title: "Rhythm over chaos",
        detail:
          "Map initiatives, review cadences, and daily execution into a system built for sustained creative output.",
      },
      {
        label: "Visibility",
        title: "Cross-product progress view",
        detail:
          "See what is blocked, moving, approved, or awaiting context across the connected ecosystem.",
      },
      {
        label: "Delivery",
        title: "Launch-ready checkpoints",
        detail:
          "Keep timing, approvals, dependencies, and production confidence visible without clutter.",
      },
    ],
    heroStats: [
      { label: "Role", value: "Operational backbone" },
      { label: "Focus", value: "Workflow and delivery clarity" },
      { label: "Designed for", value: "Sustained creative execution" },
    ],
    companionSlugs: ["omnia-creata-studio", "prompt-vault", "omnia-watch"],
  },
  {
    slug: "prompt-vault",
    badge: "Prompt system",
    name: "Prompt Vault",
    shortDescription:
      "A premium library for prompts, ideas, structured prompt systems, and reusable creative intelligence.",
    tagline: "A secure prompt system for reusable creative intelligence.",
    headline: "Transform prompting from scattered notes into durable creative infrastructure.",
    heroSummary:
      "Prompt Vault gives Omnia Creata a long-term memory layer. It turns prompt work into organized, reusable intellectual infrastructure that can evolve alongside the ecosystem.",
    roleTitle: "Prompt Vault is the knowledge layer.",
    roleDescription:
      "It provides Studio with cleaner prompt systems, can later support OmniaPixels editing notes, gives Organizer reusable patterns for recurring work, and helps Watch observe quality shifts rooted in prompt changes.",
    keyFeatures: [
      {
        title: "Structured prompt libraries",
        description:
          "Store prompts as reusable systems with collections, annotations, and role-based organization rather than one-off fragments.",
      },
      {
        title: "Iteration history",
        description:
          "Retain the reasoning behind changes so successful prompt approaches become part of a durable operating memory.",
      },
      {
        title: "Context-rich reuse",
        description:
          "Pair prompts with audience, creative goals, product context, and output intent to improve repeatability.",
      },
      {
        title: "Cross-product portability",
        description:
          "Carry prompt intelligence into Studio and future Omnia Creata products without losing fidelity.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Feeds Studio with reusable systems",
        description:
          "Prompt logic becomes a strategic input instead of a hidden dependency inside individual workflows.",
      },
      {
        title: "Supports future visual notes",
        description:
          "OmniaPixels may later use structured references and editing notes, after the mobile editor itself is stable.",
      },
      {
        title: "Creates observable quality baselines",
        description:
          "Omnia Watch can associate performance and output quality with actual prompt lineage over time.",
      },
    ],
    previewCards: [
      {
        label: "Library",
        title: "Prompt architecture, not fragments",
        detail:
          "Organize reusable prompt systems by goal, product, audience, or creative lane with clean retrieval.",
      },
      {
        label: "History",
        title: "Preserve why changes worked",
        detail:
          "Keep iteration notes, outcomes, and structured revisions attached to each prompt family.",
      },
      {
        label: "Reuse",
        title: "Send context where it matters",
        detail:
          "Move prompt systems into Studio and OmniaPixels with the context needed to keep output intentional.",
      },
    ],
    heroStats: [
      { label: "Role", value: "Knowledge layer" },
      { label: "Focus", value: "Prompt systems and recall" },
      { label: "Designed for", value: "Long-term reuse and quality" },
    ],
    companionSlugs: ["omnia-creata-studio", "omniapixels", "omnia-watch"],
  },
  {
    slug: "omnia-watch",
    badge: "Intelligence layer",
    name: "Omnia Watch",
    shortDescription:
      "A measured intelligence layer for ecosystem monitoring, health insight, quality signals, and operational awareness.",
    tagline: "System awareness for a premium software ecosystem.",
    headline: "Stay aware of performance, quality, and ecosystem health without noise.",
    heroSummary:
      "Omnia Watch brings operational awareness to Omnia Creata. It turns events, trends, and quality signals into calm intelligence that helps the ecosystem stay reliable as it grows.",
    roleTitle: "Omnia Watch is the monitoring layer.",
    roleDescription:
      "It watches the ecosystem as a connected platform rather than isolated products. Studio sees rollout readiness, Organizer gains execution awareness, Prompt Vault benefits from quality signals, and OmniaPixels can later surface mobile editing health.",
    keyFeatures: [
      {
        title: "System health visibility",
        description:
          "Surface meaningful ecosystem status, trend changes, and production health without dumping raw telemetry into the interface.",
      },
      {
        title: "Quality and drift awareness",
        description:
          "Observe changes in output quality, workflow stability, and recurring operational patterns before they become expensive issues.",
      },
      {
        title: "Actionable intelligence views",
        description:
          "Present signals in a way that helps teams decide what to fix, improve, or scale next.",
      },
      {
        title: "Connected ecosystem monitoring",
        description:
          "Track the relationships between prompting, creation, organization, and delivery instead of monitoring each layer in isolation.",
      },
    ],
    ecosystemPoints: [
      {
        title: "Informs Studio leadership decisions",
        description:
          "Creative owners can see whether work is healthy, ready, blocked, or drifting before release pressure rises.",
      },
      {
        title: "Supports Organizer accountability",
        description:
          "Operational teams can compare planned progress against real signals from the system.",
      },
      {
        title: "Closes the improvement loop",
        description:
          "Prompt Vault and OmniaPixels gain better feedback loops when Watch connects outcomes to the real product actions behind them.",
      },
    ],
    previewCards: [
      {
        label: "Signals",
        title: "High-context monitoring",
        detail:
          "Track health, flow, and output confidence through views designed for decision-making instead of dashboard noise.",
      },
      {
        label: "Quality",
        title: "See drift before it spreads",
        detail:
          "Watch trends in prompts, assets, and execution quality across the ecosystem as work scales.",
      },
      {
        label: "Awareness",
        title: "Link insight to action",
        detail:
          "Connect meaningful alerts to the teams and workflows best positioned to respond quickly.",
      },
    ],
    heroStats: [
      { label: "Role", value: "Monitoring layer" },
      { label: "Focus", value: "Health and quality awareness" },
      { label: "Designed for", value: "Long-term reliability" },
    ],
    companionSlugs: [
      "omnia-creata-studio",
      "omniaorganizer",
      "prompt-vault",
    ],
  },
];

export const productLinks = products.map((product) => ({
  href: `/products/${product.slug}` as const,
  label: product.name,
  description: product.shortDescription,
}));

export const workflowSteps = [
  {
    id: "01",
    name: "Prompt Vault",
    description:
      "Organize prompts, ideas, and reusable systems so the ecosystem starts with structured intelligence.",
    href: "/products/prompt-vault" as const,
  },
  {
    id: "02",
    name: "OmniaCreata Studio",
    description:
      "Direct the main creative environment where strategy, generation, review, and handoff come together.",
    href: "/products/omnia-creata-studio" as const,
  },
  {
    id: "03",
    name: "OmniaPixels",
    description:
      "Edit, upscale, and export phone photos with a local-first mobile workflow.",
    href: "/products/omniapixels" as const,
  },
  {
    id: "04",
    name: "OmniaOrganizer",
    description:
      "Keep execution paced, visible, and accountable across initiatives, launches, and production work.",
    href: "/products/omniaorganizer" as const,
  },
  {
    id: "05",
    name: "Omnia Watch",
    description:
      "Monitor ecosystem health, quality, and operational signals to support reliable long-term growth.",
    href: "/products/omnia-watch" as const,
  },
];

export const philosophyPoints = [
  {
    title: "AI-native workflows",
    description:
      "The ecosystem is designed around intelligent software from the start, not retrofitted with superficial automation.",
  },
  {
    title: "Creator-first design",
    description:
      "Interfaces prioritize thoughtfulness, review quality, and creative confidence rather than noisy feature density.",
  },
  {
    title: "Connected software tools",
    description:
      "Each flagship product is complete on its own, while becoming more powerful when paired with the rest of the ecosystem.",
  },
  {
    title: "Long-term ecosystem thinking",
    description:
      "Omnia Creata is being built as enduring infrastructure with product relationships that deepen over time.",
  },
  {
    title: "Premium software quality",
    description:
      "The standard is measured polish, strong engineering, and a brand experience people can trust with meaningful work.",
  },
];

export const trustSignals = [
  {
    title: "Serious product architecture",
    description:
      "The public website is structured as a scalable Next.js application for a long-term ecosystem, not a disposable one-page launch screen.",
  },
  {
    title: "Measured product positioning",
    description:
      "Omnia Creata is presented as a focused suite of flagship software, never a cluttered app directory or random utility collection.",
  },
  {
    title: "Deployment-ready foundation",
    description:
      "The site is organized for Vercel deployment, metadata coverage, responsive behavior, and ongoing expansion inside a larger monorepo.",
  },
  {
    title: "High-trust brand system",
    description:
      "A restrained black-and-gold visual language communicates luxury, discipline, and long-horizon product intent.",
  },
];

export const pricingTiers = [
  {
    name: "Foundation",
    price: "From $24",
    cadence: "/ seat / month",
    description:
      "For individuals and small teams beginning with a focused Omnia Creata workflow.",
    features: [
      "Access to a primary product environment",
      "Core workflow templates and premium UI surfaces",
      "Email support and launch resources",
      "Designed for early ecosystem adoption",
    ],
  },
  {
    name: "Professional",
    price: "From $79",
    cadence: "/ seat / month",
    description:
      "For teams building repeatable AI-native workflows across multiple connected products.",
    features: [
      "Multi-product workflow access",
      "Advanced review, history, and collaboration features",
      "Priority support and implementation guidance",
      "Built for active creative and operational teams",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description:
      "For organizations planning ecosystem deployment, governance, and long-term software partnership.",
    features: [
      "Tailored rollout planning for omniacreata.com",
      "Security, governance, and operational alignment",
      "Dedicated onboarding and strategic partnership",
      "Designed for complex teams and platform expansion",
    ],
  },
];

export const faqItems = [
  {
    question: "Is Omnia Creata a marketplace of small tools?",
    answer:
      "No. omniacreata.com presents a focused premium ecosystem of flagship software products. Micro apps and internal systems are intentionally excluded from the public brand website.",
  },
  {
    question: "Is OmniaCreata Studio the main product?",
    answer:
      "Yes. OmniaCreata Studio is positioned as the flagship environment and the central orchestrator for the public ecosystem.",
  },
  {
    question: "Can products be used independently?",
    answer:
      "Yes. Each product is designed to be complete on its own while offering stronger value when connected to the rest of the ecosystem.",
  },
  {
    question: "Will pricing vary by product?",
    answer:
      "Yes. Product-specific pricing will mature over time, but the current public site presents the intended commercial structure and ecosystem positioning.",
  },
];

export const navItems = [
  { href: "/products" as const, label: "Products" },
  { href: "/products/omnia-creata-studio" as const, label: "Studio" },
  { href: "/pricing" as const, label: "Pricing" },
  { href: "/about" as const, label: "About" },
  { href: "/contact" as const, label: "Contact" },
];

export const footerGroups = [
  {
    title: "Products",
    links: [
      { label: "OmniaCreata Studio", href: "/products/omnia-creata-studio" as const },
      { label: "OmniaPixels", href: "/products/omniapixels" as const },
      { label: "OmniaOrganizer", href: "/products/omniaorganizer" as const },
      { label: "Prompt Vault", href: "/products/prompt-vault" as const },
      { label: "Omnia Watch", href: "/products/omnia-watch" as const },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" as const },
      { label: "Pricing", href: "/pricing" as const },
      { label: "Contact", href: "/contact" as const },
      { label: "Products", href: "/products" as const },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" as const },
      { label: "Terms of Service", href: "/terms-of-service" as const },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "hello@omniacreata.com", href: "mailto:hello@omniacreata.com" },
      { label: "partnerships@omniacreata.com", href: "mailto:partnerships@omniacreata.com" },
      { label: "privacy@omniacreata.com", href: "mailto:privacy@omniacreata.com" },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "X", href: "/contact#social" as const },
      { label: "LinkedIn", href: "/contact#social" as const },
      { label: "GitHub", href: "/contact#social" as const },
    ],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductName(slug: ProductSlug) {
  return products.find((product) => product.slug === slug)?.name ?? "";
}
