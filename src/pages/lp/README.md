# /lp/ — Landing Pages for Paid Advertising

This folder contains landing pages built for paid ad campaigns (Google Ads, Facebook Ads, etc.). These pages are **noindex/nofollow** and should never be indexed by search engines.

## Structure

Each campaign gets its own subfolder (e.g., `/lp/uomc/`). Inside each campaign folder:

| Path | Role | Description |
|------|------|-------------|
| `index.astro` | **Champion** (Control) | The current winning variant. All ad traffic points here by default. |
| `/b/index.astro` | **Challenger** | The variant being tested against the champion. |
| `/thank-you/index.astro` | **Shared** | Thank-you/confirmation page used by all variants. |

## A/B Testing Workflow

1. **Champion vs. Challenger** — Split traffic between `index.astro` (champion) and `/b/` (challenger) using your ad platform or split-testing tool.
2. **Evaluate** — Let the test run until you have statistical significance (typically 100+ conversions per variant).
3. **Winner becomes Champion** — If the challenger wins, copy its content into `index.astro` (replacing the old champion). Delete the old `/b/` folder.
4. **New Challenger** — Create a new `/b/` variant with one change to test against the new champion.
5. **Repeat** — Continuous improvement, one variable at a time.

## Naming Conventions

- **Form names** follow the pattern: `uomc-lp` (champion), `uomc-lp-b` (challenger). This makes it easy to track which variant generated each lead in Netlify Forms.
- **Canonical URLs** match the page path: `https://therebelape.com/lp/uomc/` for champion, `https://therebelape.com/lp/uomc/b/` for challenger.

## Current Campaigns

### UOMC (Ultimate Roofing Marketing Checklist)
- **Champion** (`/lp/uomc/`): Full landing page with social proof, testimonials, and case studies. Form: `uomc-lp`
- **Challenger B** (`/lp/uomc/b/`): Stripped-down version — no social proof bar, testimonials, or case studies. Designed for faster, more impulsive conversions. Form: `uomc-lp-b`

## Layout

All landing pages use the `LandingPage.astro` layout, which features:
- Simplified header (logo + phone number only, no navigation)
- No breadcrumbs
- No CTA footer section
- Minimal footer (gorilla icon, copyright, legal links)
- Defaults to `noindex, nofollow`
