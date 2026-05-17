# Deploy Maintenance Schedule

This is the operating rhythm for shipping updates to:

- Public website: `website/omniacreata-com`
- OmniaCreata Studio / OCS: `apps/studio`

The goal is simple: keep the live products updateable without turning every
small change into a launch panic. Maintenance mode is a safety tool, not a
default state.

## Default Weekly Rhythm

All times are Europe/Istanbul.

| Window | Use for | Default maintenance choice |
| --- | --- | --- |
| Daily light check, 10 minutes | Domain health, sign-in health, broken page checks, error spikes | No maintenance |
| Tuesday 22:30-23:30 | Small public-site copy, SEO, links, UI fixes, low-risk Studio frontend fixes | Usually no maintenance |
| Thursday 22:30-23:30 | Small backend config, auth copy, provider catalog, analytics, non-breaking checks | Studio maintenance if backend or auth is touched |
| Sunday 21:00-23:00 | Main weekly release window for batched safe updates | Decide per release class |
| First Sunday of month 20:00-23:00 | Dependency review, env review, backup check, security review | Maintenance allowed |

Avoid Friday late-night production deploys unless it is a security, auth,
domain, payment, or data-loss fix. Avoid risky deploys right before sleep or
work unless rollback is already known and fast.

## Release Classes

### P0 Emergency Hotfix

Ship as soon as safely possible.

Examples:
- Domain or SSL outage.
- Public site points to the wrong host.
- Auth bypass, admin access issue, or invite gate failure.
- Secret exposure.
- Payment, credit, or data-loss risk.
- Studio cannot start or API is down.

Maintenance:
- Public site: enable only if users would see a broken or misleading surface.
- Studio: enable maintenance before backend/auth/storage/provider changes when
  users could hit broken sessions or half-applied state.

### P1 Scheduled Maintenance

Ship in Tuesday, Thursday, or Sunday window.

Examples:
- Supabase schema or RLS policy updates.
- Studio auth, invite-only access, session, or admin changes.
- Credits, entitlement, billing-provider, or provider-routing changes.
- Image generation queue, asset storage, share routes, moderation, or rate-limit
  changes.
- Contact form security, Turnstile, webhook, or abuse-control changes.

Maintenance:
- Public site: usually no maintenance unless routing or forms are broken during
  the change.
- Studio: maintenance is recommended.

### P2 Routine Update

Ship in Tuesday or Sunday window after checks pass.

Examples:
- Public website copy, footer, SEO metadata, sitemap, social links.
- Studio UI copy, non-critical layout fixes, empty states.
- Docs, runbooks, release notes.
- Performance and accessibility polish that does not change auth, billing,
  storage, or provider behavior.

Maintenance:
- Usually no maintenance.

### P3 Backlog Polish

Batch into weekly or monthly releases.

Examples:
- Visual polish.
- Better legal/help page wording.
- Nice-to-have analytics views.
- Non-critical content structure improvements.

Maintenance:
- No maintenance by default.

## Maintenance Switches

### Public Website

Use this only when the public site may look broken or misleading during an
update.

- Switch: `SITE_MAINTENANCE_MODE=true`
- Effect: public pages route to the localized maintenance page.
- Internal assets and API routes stay available.
- Clear the switch after deploy verification.

For normal Vercel static/content deploys, do not enable maintenance. Vercel can
swap the finished build in place, so visitors should not see an in-between
state.

### OmniaCreata Studio

Use this when Studio backend, auth, storage, generation, credits, queue, or
provider behavior may be inconsistent during the change.

- Switch: `STUDIO_MAINTENANCE_ENABLED=1`
- Effect: Studio API returns a controlled maintenance response except for health
  checks.
- Operator bypass: `X-Maintenance-Override` with the configured override token.
- Clear the switch after production smoke checks pass.

Studio maintenance is not needed for a pure landing-page copy tweak, but it is
needed for backend/auth/provider changes.

## Standard Release Flow

1. Freeze scope.
   Decide the release class: P0, P1, P2, or P3.

2. Check the worktree.
   Understand what files are already dirty before touching anything. Do not mix
   unrelated Studio, OCOS, public-site, and docs changes into one release.

3. Decide maintenance.
   Public site and Studio are separate. One can be in maintenance while the
   other stays live.

4. Run source checks.
   Use the nearest product checks, then root repo checks when repo topology or
   docs changed.

5. Deploy preview or staging first when possible.
   Verify the real deployed URL, not only local.

6. Deploy production.
   Do not patch production manually without bringing the same change back to
   source.

7. Smoke test real domains.
   Verify the live domain that users will actually open.

8. Turn maintenance off.
   Only after the smoke check is clean.

9. Record proof.
   Update the relevant release ledger, maintenance map, or operations note when
   the product requires it.

## Public Website Smoke Checklist

Required after public-site deploy:

- `https://www.omniacreata.com/en` opens the canonical English site.
- `https://omniacreata.com` redirects to the canonical site.
- `http://www.omniacreata.com` redirects to HTTPS.
- `http://omniacreata.com` redirects to HTTPS and canonical host.
- Header navigation works.
- `See Studio` opens the Studio landing route, not a stale preview app.
- Footer links are readable and separated.
- Legal pages open.
- `robots.txt` and `sitemap.xml` respond.
- Contact page is either fully working or cleanly email-only.
- If contact form is active, Turnstile/server verification is active.

## Studio Smoke Checklist

Required after Studio deploy:

- `https://studio.omniacreata.com/landing` opens.
- The old Vercel app host redirects to `https://studio.omniacreata.com`.
- Public landing is visible, but protected app routes require sign-in.
- New users cannot enter the product without approval/invite.
- Owner/admin accounts can sign in.
- Google and email auth callbacks return to the Studio domain.
- Health endpoint is healthy.
- Owner-only health/detail is not exposed publicly.
- Create page does not pretend paid image generation is ready without provider
  funds and verified provider smoke.
- Chat page does not pretend premium model output is live when providers are not
  configured.
- No payment checkout is shown as live until the new provider is selected and
  verified.
- No generated secret, service key, or backend-only env value appears in the
  browser.

## Human-Owned Actions

These require the owner account or dashboard access:

- DNS edits and domain forwarding.
- Vercel production domain and environment variable changes.
- Render service environment variables and restarts.
- Supabase project settings, OAuth provider settings, and secret rotation.
- Google Cloud OAuth client settings.
- Provider accounts and funds, including Runware top-up.
- New payment-provider onboarding and approval.
- Any legal review from a licensed professional.

Everything else should stay repo-backed whenever possible: code, docs,
runbooks, scripts, tests, preflight checks, and smoke checklists.

## Decision Rule

If the update changes only public copy, metadata, docs, or a simple visual fix,
ship it in the next routine window without maintenance.

If the update touches Studio auth, data, credits, billing, storage, generation,
moderation, provider routing, or queue/runtime behavior, use a maintenance
window and verify before reopening access.

If the update fixes a live security, domain, payment, auth, or data-loss issue,
it is a hotfix. Ship it immediately with the smallest safe patch and record the
proof afterward.
