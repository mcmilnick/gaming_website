This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## TODO

- **Decide on adding a database and rescanning games on a cadence.** Right now the catalog is a static JSON file (`src/data/games.json`) fetched from IGDB via `scripts/fetch-igdb-games.js` and re-run manually. IGDB supports incremental sync via webhooks (push updates) rather than polling, which would fit a future "pull down + store in a real database + periodic sweep" setup. No backend exists yet by design.
- **Classify/segment homebrew vs. original games.** IGDB has no field for this (`game_type`/`category` only distinguishes derivative works like ports/mods/remakes from originals, not who made something or how it was released) - a 2024 solo-developer homebrew game and a 1998 first-party cartridge both show up as "Main Game." Needs either a heuristic (e.g. release date well past a platform's commercial lifespan) or manual tagging. Also worth defining what "original" even means here - an early homebrew game made *during* a platform's commercial life reads very differently from one made decades later on emulators/flash carts, and a release-date heuristic alone won't capture that distinction.
- **Consider an "Add to List" control directly on the top-level game grid** (`GameCard`/Explore), not just the game detail page and Library rows - one less click to add a game to a list while browsing.
- **Consider letting a List's "add game" search cover the whole catalog, not just your Library.** Currently list membership deliberately requires the game to already be in your Library first (so every list entry always has a play status - see the StatusPole feature). Opening search to all games would reintroduce that gap and needs a decision: auto-add to Library too, or accept list entries with no status.
- **Consider a "date added" sort** - for the Library and/or My Lists (`addedAt` is already tracked on both `LibraryEntry` and `ListEntry`, just not exposed as a sort option yet).
- **Overhaul the visual design** - backgrounds and button aesthetics are still the plain first-pass styling from early in the build.
- **Consider live/on-blur search instead of requiring Enter.** The search box (`CatalogFilterFields`, shared by Explore and Library) is a `<form onSubmit>` today - only fires on Enter/submit. Debounced-as-you-type or search-on-blur would feel more responsive; since it's the shared component, fixing it once covers both pages.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
