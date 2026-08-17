This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Instructions to run

You need Node.js (the LTS version)

Then execute:

```bash
git clone https://github.com/mcmilnick/gaming_website.git
cd gaming_website
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in a browser.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## TODO

- **Decide on adding a database** Currently fetched gamed from  IGDB via `scripts/fetch-igdb-games.js` and re-runs manually. IGDB supports incremental sync via webhooks (push updates) rather than polling. Given the current fetch per session, not needed, but in the future I could rescan on a cadence to store in a database. Would be useful in the case of more complicated search algos or cross-device sync.
- **Classify homebrew games** IGDB has no field for homebrew versus official release. ports/mods/remakes exist, but this would be about using awkward publishers or far reaching release dates after a console ended as a key.
- **Overhaul the visual design** - backgrounds and button aesthetics are meh
- **Consider live/on-blur search instead of requiring Enter.** show as ya go rather than entering a search
- **Split `public/games.json` into a file per console** currently one combined file. would only help pages that can filter by console up front, otherwise you need all of them and then algorithms to combine them.