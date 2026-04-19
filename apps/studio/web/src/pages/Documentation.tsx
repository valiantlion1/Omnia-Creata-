import { useMemo, type ElementType } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  CreditCard,
  FileText,
  HelpCircle,
  Keyboard,
  Lightbulb,
  Lock,
  Mail,
  Repeat,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCog,
  Wrench,
} from 'lucide-react'

import { useStudioAuth } from '@/lib/studioAuth'
import { AppPage, LegalFooter } from '@/components/StudioPrimitives'
import { usePageMeta } from '@/lib/usePageMeta'

type HelpLink = { label: string; to: string; external?: boolean }
type HelpItem = {
  title: string
  body?: string | string[]
  list?: string[]
  example?: { prompt: string; note?: string }
  links?: HelpLink[]
}
type HelpSectionId =
  | 'getting-started'
  | 'prompt-craft'
  | 'workflows'
  | 'publishing'
  | 'shortcuts'
  | 'troubleshooting'
  | 'faq'
  | 'billing'
  | 'account'
  | 'safety'
  | 'terms'
  | 'privacy'
  | 'usage-policy'
  | 'contact'
type HelpSection = {
  id: HelpSectionId
  label: string
  title: string
  intro: string
  lastUpdated?: string
  items: HelpItem[]
}

const sections: HelpSection[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'Your first hour in Studio',
    intro: 'A walkthrough of what each part of Studio does, the order we recommend learning them in, and the shortest path from sign-up to a finished image you are happy with.',
    items: [
      {
        title: 'Step 1 — Sign up and land in Create',
        body: [
          'Create an account with email or a social provider. You land in Create, which is the main tool for generating images. The left sidebar is your navigation; the center is the prompt box and the result area.',
          'If you just want to browse first, Explore is open without an account. You can look around, open any piece in the lightbox, and send a prompt or a style straight into Create when something inspires you.',
        ],
      },
      {
        title: 'Step 2 — Write your first prompt',
        body: [
          'Start simple. One or two lines describing the subject, the setting, and the mood is enough. You do not need to memorize any keywords to get a good first result.',
          'Pick an aspect ratio that matches how you plan to use the image — 1:1 for social, 16:9 for desktop, 4:5 for prints and portraits, 9:16 for vertical.',
        ],
        example: {
          prompt: 'A quiet mountain cabin at dusk, soft golden light through the windows, pine trees dusted with snow, cinematic wide shot',
          note: 'Subject, setting, mood, and a framing cue. That is enough to start.',
        },
      },
      {
        title: 'Step 3 — Wait, review, iterate',
        body: [
          'Most runs finish in under a minute. When your image lands, open it in the lightbox. If it is close but not right, do not start over — click "Reuse prompt" and edit a single piece at a time (the lighting, the camera angle, the color palette).',
          'Small, focused changes teach you what words actually move the image. Big rewrites every round make it harder to learn the system.',
        ],
      },
      {
        title: 'Step 4 — Save what is working',
        body: 'Click the heart on anything you want to find again. Favorites are accessible from the sidebar. When you have several images around the same idea, create a Project and keep them together — it is much easier than scrolling through the full library later.',
      },
      {
        title: 'Step 5 — Use Chat when you need a partner, not a button',
        body: [
          'Create is fast and deterministic: you press a button, you get an image. Chat is slower but smarter. Use it when you want to describe a concept in plain language and get help turning it into a real prompt, when you want to iterate on a specific image, or when you want critique.',
          'A typical flow: generate a first pass in Create, pick the best result, send it to Chat, ask for variations or a focused edit, bring the winner back.',
        ],
      },
      {
        title: 'Step 6 — Publish only when you are ready',
        body: 'By default every image is private to your account. Publishing is a deliberate action — you hit the publish button on the lightbox, and the image shows up on your public profile and in Explore. You can unpublish anytime.',
      },
      {
        title: 'Where everything lives',
        list: [
          'Create — the prompt box, aspect ratio picker, and run history',
          'Chat — conversational editing and idea development',
          'Library → My images — every image you have made, grouped by prompt',
          'Library → Projects — folders for related runs',
          'Library → Favorites — the quick-access shelf',
          'Library → Trash — deletions, held for 30 days',
          'Explore — the public community gallery',
          'Billing — your plan, credit balance, invoices',
          'Account — display name, bio, visibility defaults, exports, and privacy controls',
        ],
      },
    ],
  },
  {
    id: 'prompt-craft',
    label: 'Prompt craft',
    title: 'Writing prompts that actually work',
    intro: 'Prompting is a skill — a boring fact but a real one. Here is what we see in prompts that consistently produce good images, what to avoid, and a set of worked examples.',
    items: [
      {
        title: 'The five pieces of a strong prompt',
        list: [
          'Subject — what is in the frame (a woman, a car, a coastline)',
          'Action or state — what the subject is doing, or the emotional register',
          'Setting — where this takes place, the environment, the time of day',
          'Style — the visual language (photographic, illustrated, painted, 3D render, specific era)',
          'Framing — composition cues (wide shot, close-up, low angle, centered)',
        ],
        body: 'You do not need all five in every prompt, but a prompt that has all five tends to land closer to what you had in mind than a prompt that only has the subject.',
      },
      {
        title: 'Write the image, not a request',
        body: [
          'Prompts are descriptions, not questions. "A detective in a neon-lit alley, rain on the pavement, noir cinematography" works. "Could you please make me a detective?" tends to produce weaker results because the model latches onto the phrasing.',
          'Write like you are describing a still frame from a film to someone who cannot see it.',
        ],
      },
      {
        title: 'Front-load what matters',
        body: 'Words closer to the start of a prompt get more weight. If the subject is the single most important thing, put it first. If a specific lighting condition is the whole point of the image, bring it to the front.',
      },
      {
        title: 'Concrete beats abstract',
        body: [
          '"Moody" is weaker than "low-key lighting with a single warm source from the left". "Futuristic" is weaker than "brushed steel surfaces, cyan ambient light, ceiling-to-floor glass, 2040s architecture".',
          'Abstract words are not wrong — they just leave more of the decision to the model. If you have a specific look in mind, say it.',
        ],
      },
      {
        title: 'Reference the medium, not the brand',
        body: 'Style words like "cinematic", "35mm film", "studio portrait", "oil painting", "ink and watercolor", "editorial fashion photography" are reliable anchors. Brand names and living-artist names are discouraged — the result is less predictable, and for commercial work it puts you in a grey zone on rights.',
      },
      {
        title: 'Example — weak prompt',
        example: {
          prompt: 'a cool warrior',
          note: 'No subject detail, no setting, no style, no framing. The result will be generic.',
        },
      },
      {
        title: 'Example — medium prompt',
        example: {
          prompt: 'a female warrior in leather armor, standing in a forest, fantasy art',
          note: 'Better — you have subject, setting, and style — but the lighting, mood, and framing are still doing no work.',
        },
      },
      {
        title: 'Example — strong prompt',
        example: {
          prompt: 'A female warrior in worn leather armor, rain-soaked braids, hand resting on a long sword, standing ankle-deep in a moss-covered forest stream, dawn mist between the trees, backlit, cinematic three-quarter portrait, muted earthy palette, volumetric light',
          note: 'Subject, state, setting, lighting, framing, palette. Much more likely to hit the image you had in mind.',
        },
      },
      {
        title: 'Iterating without starting over',
        body: [
          'Change one thing per round. If you love the composition but the colors are off, keep the prompt and add or tweak only the color-related words. If the character is right but the environment is wrong, change only the environment.',
          'Each round becomes a diff of the previous one. You will start to feel which words do what, much faster than if you rewrite from scratch every time.',
        ],
      },
      {
        title: 'What to avoid',
        list: [
          'Long lists of adjectives without direction ("beautiful amazing stunning detailed masterpiece") — the model discounts them',
          'Contradictions in the same prompt (close-up portrait + wide establishing shot)',
          'Famous living-artist names — unreliable and legally risky',
          'Real identifiable people you do not have permission to depict',
          'Brand names and trademarks as style anchors',
        ],
      },
    ],
  },
  {
    id: 'workflows',
    label: 'Workflows',
    title: 'Recipes for getting real work done',
    intro: 'How to use Create, Chat, and the Library together, with concrete flows pulled from the things users actually do.',
    items: [
      {
        title: 'The iteration loop',
        body: [
          'Generate four variations in Create → pick the strongest → click Reuse prompt → change one element → generate four more → repeat until the image locks in.',
          'Five rounds of focused iteration almost always beat twenty rounds of rewriting from scratch. Group all of them in a Project so you can see the evolution side by side.',
        ],
      },
      {
        title: 'Using a reference image',
        body: [
          'When you have a look in mind but cannot describe it, drop a reference into Chat and ask the assistant to help you write a prompt that captures what is in the image — the composition, the palette, the lighting.',
          'Reference-guided generation uses the image as a visual anchor, not as a template to copy. Expect it to inform mood and composition more than exact detail.',
        ],
      },
      {
        title: 'Fixing one part of an image',
        body: [
          'If an image is 90% right and 10% wrong, open it in Chat and describe the change — "lower the contrast on the face", "swap the background to a rooftop at dusk", "remove the lens flare". Chat will attempt a targeted edit and return the revised image.',
          'Targeted edits are rarely perfect on the first try. You may need two or three rounds of refinement. That is normal.',
        ],
      },
      {
        title: 'Running a series for a campaign or a character',
        body: [
          'When you need consistent output across many images — a recurring character, a brand palette, a photo series — define the shared elements once, then vary only the scene-specific parts in each prompt.',
          'Keep the series in a single Project. That way every iteration inherits the Project\'s context, and you can review cohesion at a glance.',
        ],
      },
      {
        title: 'From moodboard to final',
        body: [
          'Step 1: collect references in Favorites (yours, or public work from Explore).',
          'Step 2: in Chat, paste the references one by one and ask for the common visual threads.',
          'Step 3: take the extracted thread back to Create as a prompt.',
          'Step 4: iterate until the look is locked, then run scene variations.',
        ],
      },
      {
        title: 'Preparing images for print or handoff',
        body: 'Generate at the largest aspect ratio the target medium allows, review at 100% in the lightbox, download the file, and do any last-mile work (cropping, sharpening, color match) in your editor of choice. Studio outputs are high-resolution but are still a starting point for print work.',
      },
      {
        title: 'When Create is the wrong tool',
        body: 'Precise typography, exact brand color matches, multi-element product composites, and interface screenshots are things image models still do poorly. Use Studio to generate a background, an environment, or a mood, then composite the hard parts in your editor.',
      },
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    title: 'Explore, your profile, and sharing',
    intro: 'What happens when you publish, who can see what, and how to manage your public presence on Studio.',
    items: [
      {
        title: 'Private by default',
        body: 'Everything you generate starts private. It lives in your Library and nobody else sees it. Publishing is always a deliberate action on a specific image.',
      },
      {
        title: 'What publishing does',
        body: [
          'The image appears on your public profile at /@yourhandle and becomes eligible for Explore.',
          'Other signed-in users can like it and reuse the prompt or style. The image stays yours — a like does not give them the file, and the Reuse action regenerates with their own credits.',
          'You can unpublish an image at any time. It disappears from Explore and from your profile immediately. Anything that was already downloaded or screenshotted is of course outside our control.',
        ],
      },
      {
        title: 'Your public profile',
        body: 'Your profile shows your public @username, your bio, a featured header artwork chosen from your own Studio renders when you set one, and the grid of images you have chosen to publish. Today the shell lets you edit your display name, bio, default visibility, and that featured profile artwork; username stays fixed, and standalone avatar upload is not a self-serve control in the shell yet.',
      },
      {
        title: 'Explore and discoverability',
        body: [
          'Explore mixes three things: trending work from the last few days, fresh work from the last hour, and a community showcase we curate weekly.',
          'Published images are not automatically promoted to Explore\'s top slots. Strong visuals with a clear, interesting prompt tend to surface over time; low-effort spam does not.',
        ],
      },
      {
        title: 'What gets hidden from Explore',
        body: 'Images that violate the Usage Policy are removed. Images that are fine under the policy but would not fit a general audience (graphic horror, adult-adjacent themes where allowed, etc.) may be age-gated or not promoted in Explore while still remaining on your profile.',
      },
      {
        title: 'Attribution and remix',
        body: 'When someone reuses a prompt from Explore, the action is logged but your original image is not linked from theirs. Studio is not a remix network — the prompt is the reusable artifact, not the exact file.',
      },
      {
        title: 'Removing your work from Explore',
        body: 'Unpublishing an image removes it from Explore and your profile. Deleting it removes it from Explore, your profile, and your Library. If someone else published something that obviously copies your work (identical reference or screen-captured output), report it via the post menu or safety@omniacreata.com.',
      },
    ],
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    title: 'Keyboard shortcuts',
    intro: 'The shortcuts we ship today. Most of them work on both Mac and Windows; where they differ, ⌘ is shown for Mac and Ctrl for everything else.',
    items: [
      {
        title: 'Navigation',
        list: [
          'G then C — go to Create',
          'G then H — go to Chat',
          'G then L — go to Library',
          'G then E — go to Explore',
          'G then B — go to Billing',
          '/ — focus the search input on the current page',
        ],
      },
      {
        title: 'In Create',
        list: [
          '⌘ / Ctrl + Enter — run the current prompt',
          '↑ in the prompt box — recall your last prompt',
          'R — reuse the last prompt without changes',
          '1 / 2 / 3 / 4 — pick an aspect ratio (portrait, square, landscape, wide)',
          'Esc — close the lightbox or any open modal',
        ],
      },
      {
        title: 'In the lightbox',
        list: [
          '← / → — previous / next image in the set',
          'L — like the current image',
          'C — copy the prompt to clipboard',
          'D — download the current file',
          'Esc — close',
        ],
      },
      {
        title: 'In Chat',
        list: [
          'Enter — send the message',
          'Shift + Enter — new line within a message',
          '↑ when the input is empty — edit your last message',
          '⌘ / Ctrl + K — open the conversation switcher',
        ],
      },
      {
        title: 'Selection and bulk actions (Library)',
        list: [
          'Click a card corner to select; shift-click to extend',
          'A — select all visible cards',
          'Esc — clear selection',
          'Del / Backspace — move the selection to Trash',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Tips & hints',
    title: 'Tips, hints, and common fixes',
    intro: 'A practical catch-all for the things people trip over most often, plus the quick habits that make Studio smoother to use. If none of this helps, email support@omniacreata.com with a screenshot and a description of what you expected to see.',
    items: [
      {
        title: 'My image is taking forever',
        body: [
          'Most runs finish in under a minute. Longer runs can happen when the platform is under unusual load, or when you picked a very large aspect ratio or a premium quality option.',
          'If a run has been queued for more than ten minutes and nothing is visibly happening, refresh the page. Queued runs that were actually accepted will resume on their own; runs that silently dropped will clear and you can retry.',
        ],
      },
      {
        title: 'I got an error and lost credits',
        body: 'Failed runs are refunded automatically — the credit comes back to your balance, usually within a minute. If the refund does not appear, or if a clearly blocked run counted against your balance, email billing@omniacreata.com with the approximate time and prompt and we will restore it.',
      },
      {
        title: 'Images look blurry or low-resolution',
        body: [
          'Check which quality setting you generated with. The default produces solid results for most use cases, but premium quality settings give sharper output at the same aspect ratio.',
          'If you are viewing the thumbnail and not the full image, click into the lightbox — the preview grid uses compressed thumbnails for speed.',
        ],
      },
      {
        title: 'My prompt keeps getting blocked',
        body: [
          'If the same phrase keeps tripping the safety filter, try rephrasing the risky part in more neutral terms. Common culprits are ambiguous wording around real people, violent language used as intensifier, and medical or anatomical terms in contexts the filter reads as sexual.',
          'If you believe the block is a false positive on creative work, send the full prompt to safety@omniacreata.com for a human review.',
        ],
      },
      {
        title: 'The UI looks broken',
        body: 'Hard refresh the page (⌘ Shift R on Mac, Ctrl Shift R on Windows). If it still looks wrong, try a private window to rule out an extension interfering. If neither works, email support with your browser name and version and a screenshot.',
      },
      {
        title: 'I cannot sign in',
        body: [
          'If you signed up with email, use the "Forgot password" link to reset.',
          'If you signed up with a social provider, use the same provider — trying to log in with email+password on an account originally created with Google will not work.',
          'If you are being redirected in a loop, clear your cookies for the Studio domain and try again.',
        ],
      },
      {
        title: 'Billing looks wrong',
        body: 'The live source of truth for your plan, credits, and invoices is the Billing tab. Paddle is our processor — you may see Paddle.net on your statement, which is expected. For anything that looks off (double charge, wrong plan, missing credits), email billing@omniacreata.com with the invoice ID.',
      },
      {
        title: 'An image I published is not showing up in Explore',
        body: 'Published images are eligible for Explore but not auto-surfaced. They always appear on your public profile immediately. Explore selection considers freshness, engagement, and curation signals and updates continuously — work that is a good fit usually surfaces within a day.',
      },
      {
        title: 'I lost an image I was sure I saved',
        body: 'Check Library → Trash. Items you moved to Trash stay there for 30 days before permanent removal. If something is truly gone and it is not in Trash, email support and include the approximate date and the prompt — we can usually locate it in recent logs for a limited window.',
      },
    ],
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'Quick answers',
    intro: 'Short answers to the questions we hear most often. The detailed answers live in the sections above; this is the page to skim if you just need a fact.',
    items: [
      {
        title: 'Do I need an account to look around?',
        body: 'No. Explore, pricing, and Help are open. An account is needed to generate, save, chat, or publish.',
      },
      {
        title: 'Is there a free account?',
        body: 'Yes. You can create a free account to explore the workspace, keep a profile, and buy wallet credits. Creator and Pro add the bundled monthly credit allowance and the paid features tied to those plans.',
      },
      {
        title: 'How do credits work?',
        body: 'Creator and Pro include monthly credits, and wallet credit packs can be bought separately from Billing. Studio spends your included monthly allowance first, then wallet balance. One run spends one or more credits depending on the aspect ratio and quality you pick.',
      },
      {
        title: 'Do unused credits roll over?',
        body: 'The monthly plan allowance refreshes on your renewal date and does not roll over. Credits you purchased as a top-up are on your account until you use them.',
      },
      {
        title: 'What if a run fails?',
        body: 'Credits for failed runs are refunded automatically, typically within a minute.',
      },
      {
        title: 'Can I use images commercially?',
        body: 'Yes on paid plans. You own the outputs and can use them for client work, social, products, and prints. Respecting third-party rights is on you.',
      },
      {
        title: 'Can I make my work private?',
        body: 'Everything is private by default. Publishing is an explicit action you take on a specific image, and can be undone at any time.',
      },
      {
        title: 'Can I download the original file?',
        body: 'Yes, from the lightbox or from the Library, at the resolution it was rendered at.',
      },
      {
        title: 'What file formats?',
        body: 'Images are delivered as PNG by default, with JPG available for photographic work. Alpha transparency is preserved where applicable.',
      },
      {
        title: 'What aspect ratios are supported?',
        body: '1:1 (square), 4:5 (portrait), 3:4, 2:3, 9:16 (vertical), 16:9 (landscape widescreen), and 21:9 (cinematic). Custom aspect ratios are on the roadmap.',
      },
      {
        title: 'Can I upload reference images?',
        body: 'Yes. Drop a reference into Chat to get help writing a prompt that matches its mood, or use it as a visual anchor for generation. The reference is not copied pixel-for-pixel — it informs direction.',
      },
      {
        title: 'Can I edit just part of an image?',
        body: 'Ask in Chat. Describe the specific change ("swap the background to a rainy street", "lighten the face"), and Studio will attempt a targeted edit. It is not surgical — expect a couple of refinement rounds.',
      },
      {
        title: 'Can I batch-generate many variations?',
        body: 'Each run returns multiple variations at once, which is the usual batch workflow. True headless batch jobs are not part of the consumer product.',
      },
      {
        title: 'How long does Studio keep my images?',
        body: 'As long as your account is active, or until you delete them. Items in Trash are permanently removed 30 days after they land there.',
      },
      {
        title: 'What languages work in prompts?',
        body: 'English is the most reliable. Other major languages generally work but may lean on English as the internal reference.',
      },
      {
        title: 'Is there a mobile app?',
        body: 'No native app yet. The web app is fully responsive on phones and tablets.',
      },
      {
        title: 'Is there a public API?',
        body: 'No public API today. Commercial partners can reach out to business@omniacreata.com.',
      },
      {
        title: 'What do you do with my prompts?',
        body: 'We store them so your Library works, so you can reuse them, and so support can help you if a run went wrong. We do not sell them. We do not use them to train third-party generative models.',
      },
      {
        title: 'Can someone steal my prompts?',
        body: 'Your prompts are private by default. The prompt is visible to other users only if you publish the image to Explore or your public profile — that is the point of publishing.',
      },
      {
        title: 'How do I contact support?',
        body: 'support@omniacreata.com for product questions, billing@omniacreata.com for money, safety@omniacreata.com for moderation, privacy@omniacreata.com for data requests, legal@omniacreata.com for legal.',
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    title: 'Plans, payments, and refunds',
    intro: 'Everything you need to know about paying for Studio, changing plans, and getting money back when something goes wrong.',
    items: [
      {
        title: 'How plans work',
        body: 'Studio has a free account entry point plus monthly paid plans. Creator and Pro include bundled monthly credits and their paid features, and any eligible account can buy one-time wallet credit packs from Billing. You can switch subscription plans at any time; downgrades take effect at the end of your current billing cycle.',
      },
      {
        title: 'How you are charged',
        body: 'Payments are processed by Paddle, our merchant of record. Paddle handles the charge, applicable sales tax and VAT, and issues the receipt. Your statement will show Paddle.net as the charging party.',
      },
      {
        title: 'Supported payment methods',
        body: 'Major credit and debit cards, plus the regional payment methods Paddle supports in your country — Apple Pay, Google Pay, iDEAL, SEPA, and similar where available.',
      },
      {
        title: 'Currencies',
        body: 'Plans are quoted in USD by default. Paddle handles local-currency conversion and shows the final amount in your currency at checkout, including any tax.',
      },
      {
        title: 'Canceling your subscription',
        body: 'Cancel from Billing at any time. You keep access and remaining credits for the rest of the current billing cycle — we do not cut you off the moment you cancel. After the cycle ends, the subscription stops renewing.',
      },
      {
        title: 'Changing plans',
        body: [
          'Upgrades take effect immediately and are prorated. You get the new plan\'s credit allowance right away, minus what you already consumed on the lower plan.',
          'Downgrades take effect at the end of your current billing cycle. You keep the higher plan until then.',
        ],
      },
      {
        title: 'Top-up credit packs',
        body: 'If you run through your monthly allowance before the cycle ends, you can buy a one-time credit pack from Billing. Top-up credits do not expire with the cycle — they stay on the account until used.',
      },
      {
        title: 'Refunds',
        body: [
          'If something went clearly wrong on our side — an outage that cost you a generation, a charge you did not authorize, a mistaken double-charge — email billing@omniacreata.com within 14 days and we will refund it.',
          'Outside those cases, we do not refund unused time on a running subscription. Cancel any time to stop the next renewal.',
          'This policy does not override refund rights you have under mandatory consumer law in your country.',
        ],
      },
      {
        title: 'Invoices and tax',
        body: 'Every payment generates a PDF invoice from Paddle with the appropriate tax lines for your region. Invoices are emailed automatically and available in Billing.',
      },
      {
        title: 'Failed payments',
        body: 'If a renewal charge fails, we retry over several days and notify you by email. Your account goes into grace mode - you keep access. If the payment cannot be collected, the subscription is canceled and the account reverts to the free tier.',
      },
      {
        title: 'VAT IDs and business accounts',
        body: 'If you have a valid VAT or tax ID, add it at checkout or in Billing. Paddle validates the number and applies the reverse-charge mechanism where applicable.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    title: 'Your account and data',
    intro: 'How to manage sign-in, settings, exports, and the privacy controls we ship today.',
    items: [
      {
        title: 'Signing in',
        body: 'Studio supports email/password plus Google sign-in. Email/password accounts can update the password from Settings > Privacy & Security > Credentials or use the "Forgot password?" link on the login screen. If you signed in with Google, password and recovery changes stay with Google.',
      },
      {
        title: 'Changing your email',
        body: 'The current shell shows your account email in Settings, but it does not expose a self-serve email-change form yet. If the account email needs to change, contact support from the current address so ownership can be verified first.',
      },
      {
        title: 'Display name, bio, and public profile',
        body: 'Today you can edit your display name, bio, default visibility, and featured profile artwork from your Account profile surface, and Settings now gives those same fields a direct Edit Profile dialog inside General Account. Sign-in provider and password management stay under Privacy & Security > Credentials. Your public @username stays stable, and standalone avatar upload is not available from the Studio shell yet.',
      },
      {
        title: 'Two-factor authentication',
        body: 'Two-factor authentication is not available yet. When it ships, it will be added as an optional security layer.',
      },
      {
        title: 'Active sessions',
        body: 'Settings now shows the recent Studio devices that accessed your account, including the current device and any other recent browser or installed-app session we can identify. If something looks unfamiliar, open Settings > Privacy & Security > Active Sessions, keep this device, and sign the others out. If the sign-in method is managed by Google or another provider, it is still smart to review that provider security page too.',
      },
      {
        title: 'Notification preferences',
        body: 'Transactional emails (billing, security, and safety actions) are always sent. Product-update and marketing emails are optional, but there is not a dedicated Notifications screen in the Studio shell yet; use the unsubscribe link in those emails if you want to opt out.',
      },
      {
        title: 'Exporting your work',
        body: 'Individual images are downloadable from the Library. Full project export is available from the project menu, and Settings > Privacy & Security includes an archive export for your account-level data.',
      },
      {
        title: 'Deleting your account',
        body: 'Account deletion is currently handled by support so we can confirm ownership. Email support@omniacreata.com from the address on your account and we will remove it within 7 business days.',
      },
      {
        title: 'Deleting individual work',
        body: 'Anything in your Library can be moved to Trash. Anything in Trash can be permanently deleted. Trash auto-purges after 30 days. Permanent deletion is irreversible.',
      },
    ],
  },
  {
    id: 'safety',
    label: 'Safety',
    title: 'Safety, moderation, and how blocks work',
    intro: 'How Studio decides what to generate, what it refuses, and how to reach us when the system gets it wrong.',
    items: [
      {
        title: 'What is never allowed',
        list: [
          'Sexual content involving minors, in any form, under any framing.',
          'Non-consensual intimate imagery of real people.',
          'Content that instructs or glorifies serious violence against a real person or group.',
          'Content produced to deceive — forged documents, counterfeit currency, disinformation about real public figures.',
          'Attempts to impersonate a real person for fraud, scams, or fabricated endorsements.',
        ],
      },
      {
        title: 'Real people and likeness',
        body: 'Do not use Studio to put real people in fabricated, intimate, or defamatory situations. Public figures in clearly satirical or journalistic contexts are handled case-by-case; the default posture is restrictive.',
      },
      {
        title: 'Mature and adult-adjacent themes',
        body: 'Studio is not a platform for explicit sexual content. Mature themes in a narrative or artistic sense (violence in historical work, nudity in classical art contexts) are reviewed case-by-case and are often not promoted to Explore even when allowed on your account.',
      },
      {
        title: 'When a prompt or image is blocked',
        body: 'You will see a clear message that the run was blocked, and the credit for that run is refunded. Blocked outputs are held internally for review, not shown back to you as finished images.',
      },
      {
        title: 'Why a prompt might block on borderline cases',
        body: 'Safety filters look at both the prompt text and the generated pixels. Some everyday words trip filters in specific contexts — anatomical terms, certain violent intensifiers, ambiguous references to real people. Rewording the risky part usually resolves it.',
      },
      {
        title: 'Appealing a block',
        body: 'If a block feels wrong — especially on ambiguous creative work — email safety@omniacreata.com with the exact prompt and a short explanation of intent. A human reviewer handles appeals within a few business days.',
      },
      {
        title: 'Reporting something unsafe',
        body: 'If you see published work on Explore that violates these policies, use the report button on the post, or email safety@omniacreata.com. Reported content is hidden pending review and removed when a violation is confirmed.',
      },
      {
        title: 'Repeated violations',
        body: 'Accounts that repeatedly generate or publish policy-violating content are warned, rate-limited, or suspended. Severe violations (minor safety, deepfake abuse) result in immediate termination and, where required, reports to the relevant authorities.',
      },
    ],
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    title: 'Terms of Service',
    lastUpdated: 'April 2026',
    intro: 'The authoritative Terms live on the dedicated legal route. Use this section as the quick orientation layer inside Help, then open the full legal page when you need the exact governing text.',
    items: [
      {
        title: 'What the Terms cover',
        body: 'The Terms set the contract for using Studio: who can use it, what belongs to you, what belongs to us, how billing works, what happens if an account breaks the rules, and the legal limits around liability and disputes.',
      },
      {
        title: 'What to notice first',
        list: [
          'You keep ownership of your prompts, uploads, and outputs.',
          'Paid plans renew automatically until canceled.',
          'Using Studio still requires you to respect the Usage Policy and other people\'s rights.',
        ],
      },
      {
        title: 'Read the full Terms',
        body: 'When you need the exact contractual language, go to the dedicated legal page. That route is the canonical source, not this help summary.',
        links: [
          { label: 'Open full Terms of Service', to: '/legal/terms' },
          { label: 'Open Refund Policy', to: '/legal/refunds' },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2026',
    intro: 'The dedicated Privacy page is the authoritative policy. This help section only summarizes the practical ideas users usually ask about first.',
    items: [
      {
        title: 'What we collect in practice',
        body: 'Studio keeps the account, billing, and usage data it needs to run your workspace: your sign-in identity, prompts, generated images, billing records, and the technical logs needed for reliability and abuse prevention.',
      },
      {
        title: 'What rights you have',
        list: [
          'Ask for access, correction, deletion, or a portable export of your data.',
          'Revisit cookie preferences from Settings or the footer control.',
          'Contact privacy@omniacreata.com when you need a formal privacy request handled.',
        ],
      },
      {
        title: 'Read the full Privacy Policy',
        body: 'For the exact retention, legal-basis, transfer, and regional-rights language, open the dedicated legal page. That page stays canonical as the product evolves.',
        links: [
          { label: 'Open full Privacy Policy', to: '/legal/privacy' },
          { label: 'Open Cookie Policy', to: '/legal/cookies' },
        ],
      },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Usage Policy',
    lastUpdated: 'April 2026',
    intro: 'The full Usage Policy lives on its own legal route. This help summary is here to make the moderation model understandable before you open the full policy text.',
    items: [
      {
        title: 'Never allowed',
        list: [
          'Sexual content involving minors, in any form.',
          'Non-consensual intimate imagery of real people, including clothed images explicitly framed as degrading.',
          'Content produced to promote, instruct, or glorify real-world violence against an identifiable person or group.',
          'Use of Studio to produce fraudulent documents, counterfeit currency, or forged IDs.',
          'Content designed to impersonate a real person in order to deceive others (identity theft, scams, fraudulent endorsements).',
        ],
      },
      {
        title: 'How enforcement usually works',
        body: 'Borderline or mistaken blocks can be appealed through safety@omniacreata.com, but repeated or severe violations can hide content, rate-limit the account, suspend access, or terminate it entirely.',
      },
      {
        title: 'Read the full Usage Policy',
        body: 'Use the dedicated legal page when you need the exact prohibited-content categories, enforcement language, or reporting process.',
        links: [
          { label: 'Open full Usage Policy', to: '/legal/acceptable-use' },
        ],
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    title: 'Getting in touch',
    intro: 'The right inbox for each kind of question. We aim to respond to product and billing emails within two business days, and to safety reports sooner.',
    items: [
      {
        title: 'Product help and general questions',
        body: 'support@omniacreata.com — how to use Studio, bug reports, feature questions, anything that does not fit the categories below.',
      },
      {
        title: 'Billing and refunds',
        body: 'billing@omniacreata.com — plan changes, invoice questions, disputed charges, refunds.',
      },
      {
        title: 'Safety, moderation, and appeals',
        body: 'safety@omniacreata.com — unsafe content, abuse reports, appealing a block or a removal decision.',
      },
      {
        title: 'Privacy and data requests',
        body: 'privacy@omniacreata.com — access, export, correction, or deletion of your personal data. Include the email on your account so we can verify ownership.',
      },
      {
        title: 'Legal and policy',
        body: 'legal@omniacreata.com — DMCA and copyright notices, regulatory inquiries, questions about the Terms of Service.',
      },
      {
        title: 'Business and partnerships',
        body: 'business@omniacreata.com — agency and studio collaborations, bulk licensing, integration or API discussions.',
      },
      {
        title: 'Security disclosures',
        body: 'security@omniacreata.com — responsible disclosure of vulnerabilities. Please give us reasonable time to fix an issue before publishing it.',
      },
      {
        title: 'Response time expectations',
        body: 'Product and billing: within two business days. Safety reports: same day or next business day. Privacy requests: within 30 days. Security disclosures: acknowledged within three business days.',
      },
    ],
  },
]

const sectionIcons: Record<HelpSectionId, ElementType> = {
  'getting-started': Sparkles,
  'prompt-craft': Lightbulb,
  'workflows': Repeat,
  'publishing': Send,
  'shortcuts': Keyboard,
  'troubleshooting': Wrench,
  'faq': HelpCircle,
  'billing': CreditCard,
  'account': UserCog,
  'safety': ShieldCheck,
  'terms': FileText,
  'privacy': Lock,
  'usage-policy': ShieldAlert,
  'contact': Mail,
}

const helpSectionGroups: Array<{ label: string; ids: HelpSectionId[] }> = [
  { label: 'Start here', ids: ['getting-started', 'faq'] },
  { label: 'Account & money', ids: ['billing', 'account'] },
  { label: 'Safety & legal', ids: ['safety', 'terms', 'privacy', 'usage-policy'] },
  { label: 'Reach us', ids: ['contact'] },
]

const learnSectionGroups: Array<{ label: string; ids: HelpSectionId[] }> = [
  { label: 'Learn Studio', ids: ['prompt-craft', 'workflows', 'publishing'] },
  { label: 'Tips & hints', ids: ['troubleshooting'] },
]

const helpSectionIds: HelpSectionId[] = [
  'getting-started',
  'faq',
  'billing',
  'account',
  'safety',
  'terms',
  'privacy',
  'usage-policy',
  'contact',
]

const learnSectionIds: HelpSectionId[] = [
  'prompt-craft',
  'workflows',
  'publishing',
  'troubleshooting',
]

const learnDefaultSectionId: HelpSectionId = 'prompt-craft'

function ItemBody({
  body,
  list,
  example,
  links,
}: {
  body?: string | string[]
  list?: string[]
  example?: HelpItem['example']
  links?: HelpItem['links']
}) {
  const paragraphs = body ? (Array.isArray(body) ? body : [body]) : []
  return (
    <div className="space-y-4 text-[14px] leading-[1.85] text-zinc-400">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {list ? (
        <ul className="space-y-2 pl-5">
          {list.map((li, i) => (
            <li key={i} className="list-disc pl-1 marker:text-zinc-600">
              {li}
            </li>
          ))}
        </ul>
      ) : null}
      {example ? (
        <div className="mt-1 border-l border-white/[0.1] pl-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Example prompt</div>
          <div className="text-[13px] leading-[1.8] text-zinc-300">{example.prompt}</div>
          {example.note ? (
            <div className="mt-2 text-[12px] italic text-zinc-500">{example.note}</div>
          ) : null}
        </div>
      ) : null}
      {links?.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {links.map((link) =>
            link.external ? (
              <a
                key={`${link.label}-${link.to}`}
                href={link.to}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-zinc-200 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-white/50"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={`${link.label}-${link.to}`}
                to={link.to}
                className="text-[12px] font-medium text-zinc-200 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-white/50"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function DocumentationPage() {
  const location = useLocation()
  const { sectionId } = useParams<{ sectionId?: string }>()
  usePageMeta('Help — Omnia Creata Studio', 'Getting started, prompt craft, workflows, billing, safety, and legal pages for Omnia Creata Studio.')
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const isLearnSurface =
    location.pathname.startsWith('/learn') || location.pathname.startsWith('/docs')

  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section] as const)),
    [],
  )
  const visibleHelpSections = helpSectionIds
    .map((id) => sectionById.get(id))
    .filter((section): section is HelpSection => Boolean(section))
  const visibleLearnSections = learnSectionIds
    .map((id) => sectionById.get(id))
    .filter((section): section is HelpSection => Boolean(section))
  const activeLearnSectionId =
    sectionId && learnSectionIds.includes(sectionId as HelpSectionId)
      ? (sectionId as HelpSectionId)
      : learnDefaultSectionId
  const activeLearnSection =
    sectionById.get(activeLearnSectionId) ?? visibleLearnSections[0]
  const activeLearnIndex = visibleLearnSections.findIndex(
    (section) => section.id === activeLearnSection.id,
  )
  const previousLearnSection =
    activeLearnIndex > 0 ? visibleLearnSections[activeLearnIndex - 1] : null
  const nextLearnSection =
    activeLearnIndex >= 0 && activeLearnIndex < visibleLearnSections.length - 1
      ? visibleLearnSections[activeLearnIndex + 1]
      : null

  usePageMeta(
    isLearnSurface
      ? `${activeLearnSection.title} - Studio manual`
      : 'Help - Omnia Creata Studio',
    isLearnSurface
      ? `${activeLearnSection.title}, workflows, and product guidance for Omnia Creata Studio.`
      : 'Getting started, billing, account, safety, and legal guidance for Omnia Creata Studio.',
  )

  return (
    <>
      {!canRenderWithShell && (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07111a]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-4 md:px-8">
            <Link to="/landing" className="flex items-center gap-3">
              <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
              <div>
                <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIA CREATA</div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
              </div>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-zinc-300">
              <Link to="/explore" className="transition hover:text-white">Explore</Link>
              <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
              <Link to="/help" className={!isLearnSurface ? 'text-white font-medium' : 'transition hover:text-white'}>Help</Link>
              <Link to="/learn/prompt-craft" className={isLearnSurface ? 'text-white font-medium' : 'transition hover:text-white'}>Manual</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95">Create account</Link>
            </nav>
          </div>
        </header>
      )}

      <AppPage className="max-w-[1260px] gap-8 py-8">
        <section className="border-b border-white/[0.06] pb-8">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {isLearnSurface ? 'Studio manual' : 'Help center'}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[44px] text-balance">
              {isLearnSurface
                ? activeLearnSection.title
                : 'Everything you need to use Studio confidently.'}
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.75] text-zinc-400">
              {isLearnSurface
                ? `${activeLearnSection.intro} This manual is where the deeper product guidance lives; public answers about accounts, billing, and legal policies stay in Help.`
                : 'Product basics, billing answers, account controls, safety expectations, and policy summaries. Longer workflow and craft guides now live in the dedicated Studio manual so this help center stays easier to scan.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {isLearnSurface ? (
                <>
                  <Link to="/help" className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-zinc-200">
                    Back to Help
                  </Link>
                  {visibleLearnSections.map((section) => (
                    <Link
                      key={section.id}
                      to={`/learn/${section.id}`}
                      className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ring-1 transition ${
                        section.id === activeLearnSection.id
                          ? 'bg-white text-black ring-white'
                          : 'bg-white/[0.05] text-zinc-200 ring-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      {section.label}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <a href="#getting-started" className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-zinc-200"><Sparkles className="mr-1.5 inline-block h-3 w-3" />Start here</a>
                  <Link to="/learn/prompt-craft" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Studio manual</Link>
                  <a href="#billing" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Billing</a>
                  <a href="#privacy" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Privacy</a>
                  <a href="#contact" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Contact</a>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="xl:hidden">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            {isLearnSurface ? 'Manual sections' : 'Quick jumps'}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {(isLearnSurface ? visibleLearnSections : visibleHelpSections).map((section) =>
              isLearnSurface ? (
                <Link
                  key={section.id}
                  to={`/learn/${section.id}`}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition ${
                    section.id === activeLearnSection.id
                      ? 'border-white bg-white text-black'
                      : 'border-white/[0.06] bg-[#0c0d12] text-zinc-300 hover:border-white/[0.12] hover:text-white'
                  }`}
                >
                  {section.label}
                </Link>
              ) : (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="shrink-0 rounded-full border border-white/[0.06] bg-[#0c0d12] px-3 py-1.5 text-[11.5px] font-medium text-zinc-300 transition hover:border-white/[0.12] hover:text-white"
                >
                  {section.label}
                </a>
              ),
            )}
          </div>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] w-full overflow-y-auto pr-1 lg:block">
            <div className="space-y-4">
              {(isLearnSurface ? learnSectionGroups : helpSectionGroups).map((group) => (
                <div key={group.label}>
                  <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    {group.label}
                  </div>
                  <div className="space-y-0.5 border-l border-white/[0.06] pl-3">
                    {group.ids.map((id) => {
                      const s = sectionById.get(id)
                      if (!s) return null
                      const Icon = sectionIcons[id]
                      return (
                        isLearnSurface ? (
                          <Link
                            key={id}
                            to={`/learn/${id}`}
                            className={`flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[12px] font-medium transition-colors ${
                              id === activeLearnSection.id
                                ? 'bg-white/[0.06] text-white'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            {s.label}
                          </Link>
                        ) : (
                          <a
                            key={id}
                            href={`#${id}`}
                            className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:text-white"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            {s.label}
                          </a>
                        )
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className={isLearnSurface ? 'space-y-8' : 'space-y-14'}>
            {isLearnSurface ? (
              <>
                <section className="border-b border-white/[0.06] pb-8">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.03]">
                      {(() => {
                        const Icon = sectionIcons[activeLearnSection.id]
                        return <Icon className="h-4 w-4 text-zinc-200" />
                      })()}
                    </div>
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        {activeLearnSection.label}
                      </div>
                      <h2 className="mt-1 text-[24px] font-semibold tracking-tight text-white md:text-[30px]">
                        {activeLearnSection.title}
                      </h2>
                      {activeLearnSection.lastUpdated ? (
                        <div className="mt-2 text-[11.5px] text-zinc-600">
                          Last updated: {activeLearnSection.lastUpdated}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 max-w-3xl text-[14.5px] leading-[1.8] text-zinc-400">
                    {activeLearnSection.intro}
                  </p>
                  <div className="mt-5 border-l border-white/[0.08] pl-4 text-[13px] leading-7 text-zinc-400">
                    Public FAQ, billing, account, and legal summaries stay in{' '}
                    <Link to="/help" className="text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
                      Help
                    </Link>
                    . This manual is the longer-form product guide.
                  </div>
                </section>

                {activeLearnSection.items.map((item, index) => (
                  <section
                    key={item.title}
                    className="border-b border-white/[0.05] pb-8 last:border-b-0"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      Chapter {index + 1}
                    </div>
                    <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-white md:text-[24px]">
                      {item.title}
                    </h3>
                    <div className="mt-4 max-w-4xl">
                      <ItemBody
                        body={item.body}
                        list={item.list}
                        example={item.example}
                        links={item.links}
                      />
                    </div>
                  </section>
                ))}

                <section className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                      Continue reading
                    </div>
                    <div className="mt-1 text-[13px] leading-6 text-zinc-400">
                      Move through the Studio manual one topic at a time.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {previousLearnSection ? (
                      <Link
                        to={`/learn/${previousLearnSection.id}`}
                        className="rounded-full border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-zinc-200 transition hover:border-white/[0.14] hover:text-white"
                      >
                        Previous: {previousLearnSection.label}
                      </Link>
                    ) : null}
                    {nextLearnSection ? (
                      <Link
                        to={`/learn/${nextLearnSection.id}`}
                        className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-zinc-200"
                      >
                        Next: {nextLearnSection.label}
                      </Link>
                    ) : (
                      <Link
                        to="/help"
                        className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-zinc-200"
                      >
                        Back to Help
                      </Link>
                    )}
                  </div>
                </section>
              </>
            ) : (
              visibleHelpSections.map((section) => {
                const Icon = sectionIcons[section.id]
                const isPolicySection = section.id === 'terms' || section.id === 'privacy' || section.id === 'usage-policy'

                return (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0c0d12] ring-1 ring-white/[0.06]">
                        <Icon className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          {section.label}
                        </div>
                        <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-white md:text-[26px]">
                          {section.title}
                        </h2>
                      </div>
                    </div>

                    {section.lastUpdated ? (
                      <div className="mt-3 text-[11.5px] text-zinc-600">
                        Last updated: {section.lastUpdated}
                      </div>
                    ) : null}

                    <p className="mt-3 max-w-3xl text-[14.5px] leading-[1.75] text-zinc-400">
                      {section.intro}
                    </p>

                    <div className={`mt-6 ${isPolicySection ? 'space-y-7' : 'space-y-6 border-t border-white/[0.05]'}`}>
                      {section.items.map((item) => (
                        <article
                          key={item.title}
                          className={isPolicySection ? '' : 'border-b border-white/[0.05] py-6 first:pt-0 last:border-b-0 last:pb-0'}
                        >
                          <h3 className="text-[18px] font-semibold tracking-tight text-white">
                            {item.title}
                          </h3>
                          <div className="mt-3 max-w-4xl">
                            <ItemBody body={item.body} list={item.list} example={item.example} links={item.links} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )
              })
            )}
          </div>
        </div>

        {!canRenderWithShell ? <LegalFooter /> : null}
      </AppPage>
    </>
  )
}
