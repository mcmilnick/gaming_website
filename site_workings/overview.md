# Any Stat Gaming — How It Works (10,000-Foot View)

This is a plain-language tour of how the site is put together: where data comes from, how each
page gets it, and how the pieces connect. See `architecture.puml` in this same folder for the
same picture as a diagram.

## The big idea: no backend, no login, no database

Everything the site shows or stores falls into exactly two buckets:

1. **The game catalog** — one big shared list of ~77,000 games, the same for every visitor.
   It's a static file, not a live database.
2. **Your personal data** — your Library, any games you've added yourself, and your Lists.
   This never leaves your browser. There's no account, no server it's sent to, no way for anyone
   else to see it. If you clear your browser's site data, it's gone.

There is no server-side logic running per request, no database, and no login system. The app is
just static files (HTML/JS/CSS plus one big JSON file) that your browser downloads and runs
entirely on its own.

## Where the catalog comes from

The catalog isn't fetched live from anywhere while you use the site. Instead:

1. The maintainer occasionally runs `scripts/fetch-igdb-games.js` by hand (`npm run fetch-games`).
2. That script logs into IGDB (a third-party game database) and downloads every game for a fixed
   list of retro platforms (NES, SNES, Game Boy, PlayStation, Switch, etc.).
3. It writes the results to one file: `public/games.json` — think of it as one giant spreadsheet,
   one row per game (title, console, developer, publisher, release year, cover art link).
4. That file gets committed and deployed along with the rest of the site.

Visitors never talk to IGDB directly, and the site never calls out to any live game database.
Whatever's in `public/games.json` at deploy time is what everyone sees, until the maintainer
reruns the script and redeploys.

## How the browser gets the catalog

`public/games.json` is served as a plain static file at the URL `/games.json` — the same way an
image or a stylesheet would be. A small module, `src/lib/gamesStore.ts`, fetches it **once** the
first time any page needs it, caches the result in memory for the rest of the session, and hands
it out to every component that asks via a hook called `useGames()`. If ten different components
on a page all call `useGames()`, only one network request happens.

On top of that, the browser itself caches the file for a day (with a week of "still show the old
one while quietly checking for a new one" behavior) via a `Cache-Control` header set in
`next.config.ts`. So a repeat visit — or even a new deploy of the app that doesn't touch game
data — usually doesn't re-download the ~2.5MB file at all.

This is a deliberate change: earlier, the catalog was baked directly into the site's JavaScript
code (`import` instead of `fetch`), which meant every single deploy forced every visitor to
re-download the whole catalog as part of the app's code, whether the data changed or not.
Splitting it into its own file decouples "the app changed" from "the game data changed."

## Where your personal data lives

Your Library, your custom-added games, and your Lists are stored in `localStorage` — a small
per-browser storage locker built into every web browser, scoped to this one site. Three
independent "drawers" in that locker:

- **Library** (`src/lib/library.ts`) — games you've marked as playing/backlog/completed/dropped,
  plus your notes and rating.
- **Custom Games** (`src/lib/customGames.ts`) — games you've typed in yourself that aren't in the
  IGDB catalog.
- **Lists** (`src/lib/lists.ts`) — your own ordered lists (speedrun queues, playthrough order,
  etc.), built from games already in your Library.

Each drawer has a matching hook (`useLibrary()`, `useCustomGames()`, `useLists()`) that
components use to read and react to it — if you update your library in one tab, every component
watching it re-renders automatically.

## Per-page data flow

| Page | Route | Reads from | What it does |
|---|---|---|---|
| **All Games** | `/` | Catalog (`useGames`) + your Library (to support "hide games I already own" and status filtering) + Custom Games (optional source) | Search/filter/sort the whole catalog, paginated 24 at a time |
| **My Library** | `/library` | Your Library + Catalog (for cover art / mod-hack flag lookups) | Search/filter/sort *your* collection — same filter box as All Games, reused |
| **Game Detail** | `/game/[id]` | Catalog or Custom Games (whichever has the id) + your Library + your Lists | One game's full info, library status control, notes, list memberships |
| **My Lists** | `/lists` | Your Lists | Create/delete lists, see all of them at a glance |
| **List Detail** | `/lists/[id]` | One List + your Library + Catalog/Custom Games (for cover art) | Reorder entries (drag-and-drop), add from Library, per-entry notes/value |
| **Add Game** | `/add-games` | Your Custom Games + Catalog (for the "copy from" search) | Form to add your own game, or delete ones you've added |

Every page here is a "client component" (marked `"use client"` at the top of the file) — meaning
it runs in the browser, not on a server, and does its own data fetching/reading after the page
loads. The actual route files under `src/app/` are thin wrappers that just render these
components; there's no server-side data-fetching step to speak of.

## Shared building blocks (so pages can't drift apart)

A handful of pieces are intentionally used by more than one page, so a fix or a design change in
one place automatically applies everywhere it's used, instead of needing to be repeated:

- **`catalogSearch.ts`** — the actual search/sort logic (title matching, accent-insensitive
  search, sort options). Used by both All Games and Library.
- **`FilterBar.tsx`** + **`Panel.tsx`** — the search/console/sort/source/status filter row and the
  rounded box around it. Same component, same box, on both All Games and Library.
- **`NotesEditor.tsx`** — the notes box used on Library rows and the Game Detail page, including
  the `[List Name]` / `[List Name: value]` typing shortcut that creates or updates list
  membership.
- **`localStore.ts`** — the generic "read/write/subscribe to a localStorage key" machinery that
  Library, Custom Games, and Lists are each built on top of.
- **`gamesStore.ts`** / **`useGames()`** — the one place that knows how to fetch and cache the
  catalog; every page that needs game data goes through this instead of fetching it separately.

## Maintenance workflow (the one "backend" task that exists)

The only non-visitor-facing operation in the whole system is refreshing the catalog:

1. Maintainer runs `npm run fetch-games` locally (needs IGDB credentials in `.env.local`).
2. It rewrites `public/games.json` from scratch.
3. Maintainer reviews/commits the change and deploys.

That's it — no cron jobs, no webhooks, no background workers. It's a manual, occasional,
maintainer-run step, by design.
