export const en = {
  app: {
    account: {
      description: "Keep billing, security posture, and organization readiness in one place.",
      title: "Account"
    },
    applications: {
      description: "Review installed software, update pathways, and attention states.",
      empty: "No applications matched the current filters.",
      title: "Applications"
    },
    deviceDetail: {
      cleanup: "Cleanup opportunities",
      health: "Health overview",
      recommendations: "Recommendations",
      security: "Security posture",
      startup: "Startup pressure"
    },
    devices: {
      addDevice: "Pair a Windows companion",
      description: "Manage every paired PC, last sync, and attention score from a single control surface.",
      empty: "No devices are paired yet.",
      title: "Devices"
    },
    desktop: {
      admin: "Quick actions",
      appBoard: "Applications",
      avgUptime: "Average uptime",
      commandCenter: "System care",
      cleanupHeadroom: "Cleanup headroom",
      current: "Current",
      errors: "Errors",
      fleetLoad: "Device load",
      latestSync: "Latest sync",
      logs: "Recent activity",
      memoryPressure: "Memory usage",
      metrics: "Performance",
      noAlerts: "No critical alerts are active.",
      noLogs: "No recent operational logs have been recorded yet.",
      onlineDevices: "Online devices",
      overviewSubtitle:
        "Monitor updates, cleanup, startup impact, protection status, device health, and recent actions from one desktop app.",
      pairCompanion: "Add device",
      primaryDevice: "Primary device",
      queue: "Pending actions",
      reviewAlerts: "Open alerts",
      rulesEngine: "Recommendations",
      searchAria: "Search Omnia Watch",
      searchPlaceholder: "Search devices, apps, alerts, or activity",
      services: "Protection and services",
      storagePressure: "Storage usage",
      syncBridge: "Cloud sync",
      telemetry: "Device activity",
      topAlerts: "Needs attention",
      updateExposure: "Apps needing updates",
      watchApi: "Desktop app core",
      workspace: "My devices",
      plan: "Plan"
    },
    history: {
      description: "Track scans, syncs, cleanup runs, update jobs, and warnings.",
      title: "History"
    },
    meta: {
      connectedDetail:
        "Session-aware Supabase reads are active. Pairing and scan sync move to full device persistence when the server-side pipeline credentials are present.",
      demoMode: "Demo data mode",
      liveMode: "Connected mode",
      shellTitle: "Control your devices, maintenance state, and recommendations from one premium workspace."
    },
    overview: {
      ctaPrimary: "Open devices",
      ctaSecondary: "Review recommendations",
      description: "Monitor device health, update pressure, cleanup headroom, and recent actions across Omnia Watch.",
      title: "Overview"
    },
    recommendations: {
      description: "See the actions Omnia Watch believes deserve attention now, with transparent reasoning.",
      title: "Recommendations"
    },
    settings: {
      description: "Set language, release channel, security preferences, and future billing controls.",
      title: "Settings"
    },
    status: {
      attention: "Attention",
      critical: "Critical",
      healthy: "Healthy",
      high: "High",
      low: "Low",
      manual: "Manual",
      medium: "Medium",
      offline: "Offline",
      updatable: "Updatable"
    }
  },
  common: {
    brandName: "Omnia Creata",
    demoModeDetail: "Supabase and live device persistence are not configured yet, so the dashboard renders against a realistic product data model.",
    downloadAgent: "Download Windows companion",
    learnMore: "Learn more",
    marketingDomain: "omniacreata.com",
    openApp: "Open app",
    productName: "Omnia Watch",
    viewPlans: "View plans"
  },
  forms: {
    continueWithGoogle: "Continue with Google",
    email: "Email address",
    helperAuth:
      "Live authentication activates when Supabase keys are configured. Password, Google, and magic-link flows all use the same shared Supabase project.",
    magicLinkHelper:
      "Prefer a passwordless route? Enter your email and Omnia Watch will send a magic link for this browser.",
    orContinueWith: "or continue with",
    password: "Password",
    sendMagicLink: "Email me a magic link",
    signIn: "Sign in",
    signUp: "Create account",
    working: "Working..."
  },
  languages: {
    en: "English",
    tr: "Turkish"
  },
  legal: {
    privacy: {
      body: "Privacy, data handling, and device telemetry controls are documented as part of the Omnia Creata platform. This foundation includes the public page shell, structure, and policy placeholders required for launch readiness.",
      title: "Privacy"
    },
    terms: {
      body: "Terms, billing rules, and acceptable-use policies will live here. The repository already includes a billing-ready account model and device-ownership boundaries for future enforcement.",
      title: "Terms"
    }
  },
  marketing: {
    download: {
      requirements: [
        "Windows 10 or Windows 11",
        "Winget recommended for software update intelligence",
        "Outbound HTTPS access to the Omnia Watch SaaS"
      ],
      steps: [
        "Sign in to the Omnia Watch web app and generate a pairing flow.",
        "Install the Windows companion and complete the secure pairing exchange.",
        "Run scans locally, review what is supported, and sync results back to your account."
      ],
      subtitle: "The Windows local companion handles trusted device inspection, safe automation, and structured sync back to the cloud platform.",
      title: "Windows Companion"
    },
    faq: {
      items: [
        {
          answer: "Because SaaS alone cannot honestly clean, inspect, or update a PC at the device level. Omnia Watch uses a web platform plus a Windows companion so capabilities stay truthful.",
          question: "Why does Omnia Watch use a local companion?"
        },
        {
          answer: "Phase 1 is conservative. Omnia Watch supports what can be performed safely and explains unsupported items instead of pretending everything can be automated.",
          question: "Will every application update automatically?"
        },
        {
          answer: "English is the default language, Turkish is included from the start, and the architecture is ready for more locales as the platform expands.",
          question: "Does the platform support multiple languages?"
        }
      ],
      subtitle: "Clear answers are part of the trust model.",
      title: "Frequently Asked Questions"
    },
    features: {
      pillars: [
        {
          bullets: [
            "Windows software inventory with normalized app records",
            "Winget-aware update detection where practical",
            "Manual guidance for unsupported vendor ecosystems"
          ],
          description: "Track installed applications, versions, sources, and what needs attention across every paired PC.",
          title: "Software Intelligence"
        },
        {
          bullets: [
            "Safe cleanup categories with reclaimable size estimates",
            "Startup inventory and boot-impact awareness",
            "Transparent action logs for every maintenance step"
          ],
          description: "Help users reclaim space and tame startup clutter without fake performance promises.",
          title: "Maintenance Control"
        },
        {
          bullets: [
            "Health, Defender, firewall, and sync status surfaces",
            "Recommendations engine with severity and history",
            "Billing-ready account and device architecture"
          ],
          description: "Provide a serious SaaS control layer for households, enthusiasts, and future multi-device plans.",
          title: "Platform Foundation"
        }
      ],
      subtitle: "Omnia Watch is built as a multi-part system: a public SaaS app plus a trusted Windows execution layer.",
      title: "Built for real PC care"
    },
    home: {
      benefits: [
        "See updates, cleanup opportunities, startup pressure, and security signals in one coherent view.",
        "Keep trust at the center with transparent classifications, logs, and clear capability boundaries.",
        "Scale from one personal PC to a future multi-device Omnia Creata platform."
      ],
      hero: {
        badge: "Global SaaS + Windows companion architecture",
        primaryCta: "Launch dashboard",
        secondaryCta: "Explore features",
        subtitle: "A premium PC maintenance and software intelligence platform for people who want clarity, safe automation, and trustworthy system care.",
        title: "Know what needs attention on every Windows PC you manage."
      },
      howItWorks: [
        "Create an Omnia Watch account inside the Omnia Creata ecosystem.",
        "Pair the Windows companion to the SaaS workspace with scoped device credentials.",
        "Run local scans for apps, cleanup, startup, health, and security, then sync structured results to the web app."
      ],
      stats: [
        {
          label: "Product model",
          value: "SaaS + agent"
        },
        {
          label: "Phase 1 focus",
          value: "Truthful maintenance"
        },
        {
          label: "Launch languages",
          value: "EN + TR"
        }
      ],
      trustPoints: [
        "No fake browser-side device powers",
        "No scammy booster claims or fake urgency",
        "No silent cleaning of user data"
      ]
    },
    pricing: {
      subtitle: "Pricing architecture is in place so Omnia Watch can grow into a real subscription product without bolted-on billing later.",
      title: "Billing-ready from day one"
    },
    security: {
      principles: [
        "Device pairing is designed around scoped credentials and server-side validation.",
        "Users should only see their own devices, scans, and operation history.",
        "The local companion stays honest about what it can and cannot automate."
      ],
      subtitle: "Trust is part of the product, not just a marketing page.",
      title: "Security and trust posture"
    },
    signIn: {
      subtitle: "Access your device dashboard, recommendations, and companion downloads.",
      title: "Sign in to Omnia Watch"
    },
    signUp: {
      subtitle: "Create your Omnia Creata account and start building your device workspace.",
      title: "Create your Omnia Watch account"
    }
  },
  nav: {
    app: {
      account: "Account",
      applications: "Applications",
      devices: "Devices",
      history: "History",
      overview: "Overview",
      recommendations: "Recommendations",
      settings: "Settings"
    },
    marketing: {
      download: "Download",
      faq: "FAQ",
      features: "Features",
      home: "Home",
      pricing: "Pricing",
      security: "Security",
      signIn: "Sign in",
      signUp: "Sign up"
    }
  }
};
