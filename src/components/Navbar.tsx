import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-wide text-zinc-100">
          ANY STAT <span className="text-emerald-400">GAMING</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-300">
          <Link href="/" className="hover:text-zinc-100">
            All Games
          </Link>
          <Link href="/add-games" className="hover:text-zinc-100">
            Add Game
          </Link>
          <Link href="/library" className="hover:text-zinc-100">
            My Library
          </Link>
          <Link href="/lists" className="hover:text-zinc-100">
            My Lists
          </Link>
          <Link href="/suggest" className="hover:text-zinc-100">
            Suggest a Game
          </Link>
          <Link href="/backup" className="hover:text-zinc-100">
            Local Backup
          </Link>
        </nav>
      </div>
    </header>
  );
}
