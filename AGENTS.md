# Agent instructions

## PRs and documentation

Do not add "Made with Cursor", cursor.com links, or similar Cursor branding to:

- Pull request titles or descriptions
- Commit messages
- README or other user-facing docs

Keep PR bodies neutral: summary, test plan, and technical notes only.

## Project context

This repo is a **prediction market aggregator** (Next.js, Polymarket + Kalshi order book stream). Prefer matching existing patterns in `src/` before introducing new libraries.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Build: `pnpm build`
