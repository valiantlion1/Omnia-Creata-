import { useState, type ElementType } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
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

type HelpItem = { title: string; body?: string | string[]; list?: string[]; example?: { prompt: string; note?: string } }
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
          'Account — profile, email, password, data exports',
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
        body: 'Your profile page shows your handle, avatar, bio, and the grid of images you have chosen to publish. Edit it from Account → Profile. The handle is the part after @ in your public URL and cannot clash with someone else\'s.',
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
    label: 'Troubleshooting',
    title: 'When something is not behaving',
    intro: 'The most common issues, what causes them, and the quickest fix. If none of this helps, email support@omniacreata.com with a screenshot and a description of what you expected to see.',
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
        title: 'Is there a free tier?',
        body: 'There is a starter allowance so you can try Studio before paying. It is limited — enough to see whether the product fits. Paid plans unlock the full monthly credit allowance and the features that depend on it.',
      },
      {
        title: 'How do credits work?',
        body: 'Each plan includes a monthly credit allowance. One image run spends one or more credits depending on the aspect ratio and quality you pick. Balance is visible in Billing.',
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
        body: 'Studio plans are monthly subscriptions. Each plan has a monthly credit allowance, a set of features, and a price. You can switch plans at any time; downgrades take effect at the end of your current billing cycle.',
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
        body: 'If a renewal charge fails, we retry over several days and notify you by email. Your account goes into grace mode — you keep access. If the payment cannot be collected, the subscription is canceled and the account reverts to the free tier.',
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
        body: 'Studio supports email and password sign-in, plus social sign-in where you have connected one. Change your password from Account → Security.',
      },
      {
        title: 'Changing your email',
        body: 'Email changes are handled from Account → Profile. You will need to confirm the new address before the change takes effect.',
      },
      {
        title: 'Display name, handle, and avatar',
        body: 'Your display name is what appears next to your work. Your handle is the part after @ in your public URL and must be unique. Both can be edited from Account → Profile. Avatars are uploaded from the same screen.',
      },
      {
        title: 'Two-factor authentication',
        body: 'Not available at launch. It is on the roadmap and will ship as an optional layer before becoming a recommended default.',
      },
      {
        title: 'Active sessions',
        body: 'View which devices are currently signed in from Account → Security, and sign out of any session you do not recognize.',
      },
      {
        title: 'Notification preferences',
        body: 'Transactional emails (billing, security, safety actions) are always sent. Product updates and newsletter-style emails are opt-in and can be turned off from Account → Notifications.',
      },
      {
        title: 'Exporting your work',
        body: 'Individual images are downloadable from the Library. Bulk export of a full project is available from the project menu. For a complete account-level export (images, metadata, prompts), email support@omniacreata.com and we will prepare one.',
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
    intro: 'The agreement between you and Omnia Creata for using Studio. Plain language where possible, precise where it needs to be.',
    items: [
      {
        title: '1. Who this agreement is with',
        body: 'By creating an account or using Studio you agree to these terms with Omnia Creata ("we", "us"). If you are using Studio on behalf of a company, you confirm that you are authorized to bind that company to these terms.',
      },
      {
        title: '2. Who can use Studio',
        body: [
          'Studio is intended for users aged 16 and above. Paid plans require you to be of legal age to enter into a contract in your country of residence (18 in most jurisdictions).',
          'You are responsible for providing accurate account information and for any activity that happens through your account.',
        ],
      },
      {
        title: '3. Your content and the license you give us',
        body: [
          'You retain ownership of the prompts you write, the references you upload, and the images you generate.',
          'To operate the service, you grant us a worldwide, non-exclusive, royalty-free license to host, store, transmit, display, and back up your content, solely for the purpose of running Studio for you. If you publish a piece to Explore or your public profile, that license extends to displaying it publicly while it remains published.',
          'We do not use your prompts, uploads, or generated images to train third-party generative models. If that ever changes, it will be opt-in and clearly disclosed.',
        ],
      },
      {
        title: '4. Our content and platform',
        body: 'The Studio application, the brand, the underlying software, and all materials we create for Studio remain our property. These terms do not grant you any license to the platform itself beyond using it as a customer.',
      },
      {
        title: '5. Acceptable use',
        body: 'You agree to follow the Usage Policy below. Violations can result in content removal, account suspension, or termination.',
      },
      {
        title: '6. Subscriptions, payments, and refunds',
        body: [
          'Paid plans renew automatically each billing cycle until canceled. Prices, tax, and credit allowances are shown at checkout and in Billing.',
          'Payments are processed by Paddle, acting as merchant of record. Billing disputes are handled by us directly at billing@omniacreata.com, and by Paddle where required by law.',
          'Our standard refund policy is described in the Billing section above. These terms do not override refund rights you have under mandatory consumer law in your country.',
        ],
      },
      {
        title: '7. Generated output disclaimer',
        body: [
          'Images produced by Studio are generated using machine learning. They may sometimes resemble existing works, contain factual inaccuracies, or reproduce stylistic elements from training data. You are responsible for reviewing each output before you publish or commercially use it.',
          'Studio does not provide legal, medical, financial, or professional advice, and images should not be relied on as such.',
        ],
      },
      {
        title: '8. Availability and service changes',
        body: 'We aim to keep Studio available and stable, but we do not guarantee uninterrupted service. Features, models, plan structure, and pricing can change. When changes materially affect what you are paying for, we will give reasonable notice before they take effect.',
      },
      {
        title: '9. Termination',
        body: [
          'You can close your account at any time by contacting support or using the in-product flow when available.',
          'We can suspend or terminate accounts that violate these terms, the Usage Policy, or applicable law, or that create outsized risk to other users, our partners, or the platform itself. For serious violations we may act without prior notice.',
        ],
      },
      {
        title: '10. Disclaimers',
        body: 'Studio is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, we disclaim all warranties, including merchantability, fitness for a particular purpose, and non-infringement. This does not limit warranties that cannot be excluded under mandatory consumer law.',
      },
      {
        title: '11. Limitation of liability',
        body: 'To the maximum extent permitted by law, our aggregate liability for any claim arising out of or related to these terms or Studio is limited to the amount you paid to us in the twelve months preceding the event giving rise to the claim. We are not liable for indirect, incidental, special, or consequential damages.',
      },
      {
        title: '12. Indemnity',
        body: 'You agree to indemnify us against third-party claims that arise from your content, your use of Studio in violation of these terms, or your violation of someone else\'s rights.',
      },
      {
        title: '13. Changes to these terms',
        body: 'We may update these terms from time to time. Material changes will be announced by email or in-product notice at least 14 days before they take effect. Continued use of Studio after the effective date means you accept the updated terms.',
      },
      {
        title: '14. Governing law and disputes',
        body: 'These terms are governed by the laws of the country of our registered operating entity, without regard to its conflict of laws rules. Disputes will be handled by the competent courts of that jurisdiction, except where mandatory consumer law in your country of residence gives you the right to bring a claim locally.',
      },
      {
        title: '15. Contact',
        body: 'Legal questions about these terms: legal@omniacreata.com. Billing or account issues: support@omniacreata.com.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    lastUpdated: 'April 2026',
    intro: 'What we collect, why we collect it, how long we keep it, and the rights you have over it. If anything here is unclear, write to privacy@omniacreata.com.',
    items: [
      {
        title: '1. Who is responsible for your data',
        body: 'Omnia Creata is the data controller for your account and the content you create with Studio. To reach the person responsible for data questions, write to privacy@omniacreata.com.',
      },
      {
        title: '2. What we collect',
        list: [
          'Account data — email, display name, handle, avatar, and authentication identifiers from social providers you use.',
          'Content you create — prompts, references you upload, generated images, Chat conversations, and the metadata you attach (tags, projects, likes).',
          'Billing data — plan, billing cycle, invoice history. Full card data is handled by Paddle; we do not store your card number.',
          'Technical data — IP address, browser, device type, and basic logs needed to run the service and detect abuse.',
          'Usage data — which surfaces you use, which features you open, aggregate performance and reliability signals.',
        ],
      },
      {
        title: '3. Why we use it',
        list: [
          'To run the product — authenticating you, running generations, storing your Library, answering support requests.',
          'To bill you — processing subscriptions, sending invoices, handling refunds.',
          'To keep the service safe — detecting abuse, enforcing the Usage Policy, protecting other users.',
          'To improve Studio — understanding which features work, debugging issues, measuring reliability.',
          'To communicate with you — transactional emails (billing, account, safety), plus optional product updates if you opt in.',
        ],
      },
      {
        title: '4. Legal bases (for EU/UK residents)',
        list: [
          'Contract — the data needed to run Studio for you and to bill you.',
          'Legitimate interest — keeping the service secure, preventing fraud, improving reliability, and analyzing aggregate usage.',
          'Consent — where we ask specifically (optional emails, non-essential cookies).',
          'Legal obligation — retaining billing records and responding to lawful requests.',
        ],
      },
      {
        title: '5. Who we share data with',
        list: [
          'Hosting and infrastructure providers that run our database, storage, and servers.',
          'Paddle, our payment processor and merchant of record, for charges and tax.',
          'Email provider for transactional messages.',
          'Analytics and error monitoring tools used to keep Studio running reliably.',
          'Authorities, when we have a valid legal request and cannot lawfully refuse it.',
        ],
        body: 'We do not sell your personal data. We do not use your content to train third-party generative models.',
      },
      {
        title: '6. How long we keep it',
        list: [
          'Account data — for as long as your account is active, and a reasonable period after closure for disputes, tax obligations, and repeat-abuse detection.',
          'Content — until you delete it or close your account. Deleted items are purged within 30 days of leaving Trash.',
          'Billing records — at least as long as applicable tax law requires (typically 5–10 years).',
          'Logs and security data — short-term retention measured in weeks to a few months unless tied to an ongoing investigation.',
        ],
      },
      {
        title: '7. Your rights',
        body: [
          'You can access your data, request a correction, request deletion, request a portable export, or object to specific processing. Write to privacy@omniacreata.com and we will respond within 30 days.',
          'If you are in the EU or UK, you can also lodge a complaint with your local data protection authority.',
        ],
      },
      {
        title: '8. Cookies and similar technologies',
        body: 'Studio uses a small set of cookies: the ones strictly necessary to keep you signed in, and anonymized analytics to understand aggregate usage. Non-essential cookies respect the choice you make in the consent banner.',
      },
      {
        title: '9. International transfers',
        body: 'Your data may be processed in countries other than your own, including by our hosting providers. Where required, we rely on standard contractual clauses or equivalent safeguards to protect it.',
      },
      {
        title: '10. Children',
        body: 'Studio is not intended for children under 16. If we learn we have collected personal data from a child under 16 without appropriate consent, we will delete it.',
      },
      {
        title: '11. Security',
        body: 'We use industry-standard measures to protect data in transit and at rest. No service is completely risk-free — if you become aware of a vulnerability, email security@omniacreata.com.',
      },
      {
        title: '12. Changes to this policy',
        body: 'We will update this policy as the product evolves. Material changes are announced by email or in-product notice at least 14 days before they take effect.',
      },
    ],
  },
  {
    id: 'usage-policy',
    label: 'Usage Policy',
    title: 'Usage Policy',
    lastUpdated: 'April 2026',
    intro: 'The rules for what you can generate and publish with Studio. If you are unsure whether something is allowed, ask before you publish.',
    items: [
      {
        title: '1. Absolutely prohibited',
        list: [
          'Sexual content involving minors, in any form.',
          'Non-consensual intimate imagery of real people, including clothed images explicitly framed as degrading.',
          'Content produced to promote, instruct, or glorify real-world violence against an identifiable person or group.',
          'Use of Studio to produce fraudulent documents, counterfeit currency, or forged IDs.',
          'Content designed to impersonate a real person in order to deceive others (identity theft, scams, fraudulent endorsements).',
        ],
      },
      {
        title: '2. Not permitted',
        list: [
          'Hate speech and content targeting people on the basis of race, ethnicity, religion, nationality, gender, sexual orientation, disability, or similar.',
          'Harassment of specific individuals.',
          'Misinformation designed to deceive, including fabricated statements attributed to real public figures.',
          'Encouraging, promoting, or instructing self-harm, suicide, or eating disorders.',
          'Deepfakes of real people placed in intimate, criminal, or compromising scenes without their clear consent.',
        ],
      },
      {
        title: '3. Respect other people\'s rights',
        body: [
          'Do not use Studio to systematically reproduce protected works, brand assets, trademarked characters, or a living artist\'s signature style to pass off as their work.',
          'A single stylistic reference for personal work is different from commercial impersonation. We judge intent and scale.',
        ],
      },
      {
        title: '4. Platform integrity',
        list: [
          'No automated or scripted abuse of the generation endpoints.',
          'No attempts to bypass safety filters, rate limits, or billing controls.',
          'No reselling access to Studio as if it were your own service.',
        ],
      },
      {
        title: '5. Enforcement ladder',
        list: [
          'Minor violations (first-time edge cases, unclear intent) — content hidden, account warned.',
          'Clear violations — content removed, account rate-limited or temporarily suspended, incident logged.',
          'Severe violations (minor safety, deepfake abuse, coordinated fraud) — account permanently terminated, reported to authorities where required.',
        ],
      },
      {
        title: '6. Appeals',
        body: 'If you believe an enforcement action was wrong, email safety@omniacreata.com with the account email and a description of what happened. A human reviewer handles appeals.',
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

const sectionGroups: Array<{ label: string; ids: HelpSectionId[] }> = [
  { label: 'Learn Studio', ids: ['getting-started', 'prompt-craft', 'workflows', 'publishing'] },
  { label: 'Use the app', ids: ['shortcuts', 'troubleshooting', 'faq'] },
  { label: 'Account & money', ids: ['billing', 'account'] },
  { label: 'Policies', ids: ['safety', 'terms', 'privacy', 'usage-policy'] },
  { label: 'Reach us', ids: ['contact'] },
]

function ItemBody({ body, list, example }: { body?: string | string[]; list?: string[]; example?: HelpItem['example'] }) {
  const paragraphs = body ? (Array.isArray(body) ? body : [body]) : []
  return (
    <div className="space-y-3 text-[13.5px] leading-[1.75] text-zinc-400">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {list ? (
        <ul className="space-y-1.5 pl-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[9px] inline-block h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              <span>{li}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {example ? (
        <div className="mt-1 rounded-[10px] border border-white/[0.06] bg-black/30 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Example prompt</div>
          <div className="text-[13px] leading-[1.7] text-zinc-300">{example.prompt}</div>
          {example.note ? (
            <div className="mt-2 text-[11.5px] italic text-zinc-500">{example.note}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function AccordionItem({ item, defaultOpen = false }: { item: HelpItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="text-[14px] font-medium text-zinc-200 transition group-hover:text-white">{item.title}</div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition duration-300 ${open ? 'rotate-180 text-white' : ''}`} />
      </button>
      {open ? (
        <div className="pb-5 pr-4">
          <ItemBody body={item.body} list={item.list} example={item.example} />
        </div>
      ) : null}
    </div>
  )
}

export default function DocumentationPage() {
  usePageMeta('Help — Omnia Creata Studio', 'Getting started, prompt craft, workflows, billing, safety, and legal pages for Omnia Creata Studio.')
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const sectionById = new Map(sections.map((s) => [s.id, s] as const))

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
              <Link to="/help" className="text-white font-medium">Help</Link>
              <Link to="/login" className="transition hover:text-white">Log in</Link>
              <Link to="/signup" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 active:scale-95">Create account</Link>
            </nav>
          </div>
        </header>
      )}

      <AppPage className="max-w-[1200px] gap-10 py-10">
        <section className="relative overflow-hidden rounded-[24px] border border-white/[0.05] bg-[#0e1014] p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.035),transparent_55%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Help center
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-[44px] text-balance">
              Everything you need to use Studio confidently.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-[1.75] text-zinc-400">
              Product basics, prompt craft, real workflows, billing answers, account controls, and the policies we operate under. Every section points to the right inbox if you cannot find what you need.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href="#getting-started" className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-zinc-200"><Sparkles className="mr-1.5 inline-block h-3 w-3" />Start here</a>
              <a href="#prompt-craft" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Prompt craft</a>
              <a href="#billing" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Billing</a>
              <a href="#terms" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Terms</a>
              <a href="#contact" className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08]">Contact</a>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-12 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden xl:block sticky top-24 w-full">
            <div className="space-y-4">
              {sectionGroups.map((group) => (
                <div key={group.label}>
                  <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    {group.label}
                  </div>
                  <div className="space-y-0.5 rounded-[12px] border border-white/[0.04] bg-[#0c0d12] p-1">
                    {group.ids.map((id) => {
                      const s = sectionById.get(id)
                      if (!s) return null
                      const Icon = sectionIcons[id]
                      return (
                        <a
                          key={id}
                          href={`#${id}`}
                          className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {s.label}
                        </a>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="space-y-14">
            {sections.map((section) => {
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

                  <div className="mt-6">
                    {isPolicySection ? (
                      <div className="rounded-[14px] border border-white/[0.05] bg-[#0c0d12] px-5">
                        {section.items.map((item, index) => (
                          <AccordionItem key={item.title} item={item} defaultOpen={index === 0} />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {section.items.map((item) => (
                          <div key={item.title} className="rounded-[14px] border border-white/[0.04] bg-[#0c0d12] p-5 transition-colors hover:border-white/[0.08]">
                            <div className="flex items-start gap-2 text-[14px] font-semibold text-white">
                              <BookOpen className="mt-[3px] h-3.5 w-3.5 shrink-0 text-zinc-500" />
                              <span>{item.title}</span>
                            </div>
                            <div className="mt-2">
                              <ItemBody body={item.body} list={item.list} example={item.example} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        {!canRenderWithShell ? <LegalFooter /> : null}
      </AppPage>
    </>
  )
}
