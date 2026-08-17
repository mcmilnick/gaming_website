import Image from "next/image";
import Link from "next/link";
import type { GameRecord } from "@/lib/types";
import { isCustomGameId } from "@/lib/customGames";
import { formatReleaseDate } from "@/lib/catalogSearch";
import { LibraryButton } from "./LibraryButton";

function regionBadges(game: GameRecord): string[] {
  const badges: string[] = [];
  if (game.releaseJapan) badges.push("JP");
  if (game.releaseNA) badges.push("NA");
  if (game.releasePAL) badges.push("PAL");
  return badges;
}

export function GameCard({ game }: { game: GameRecord }) {
  const isCustom = isCustomGameId(game.id);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
      <Link href={`/game/${game.id}`} className="group block flex-1">
        <div className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-zinc-800 p-4 text-center">
          {isCustom && (
            <span className="absolute left-2 top-2 rounded bg-emerald-900/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Mine
            </span>
          )}
          {game.coverUrl ? (
            <Image
              src={game.coverUrl}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          ) : (
            <>
              <span className="text-3xl">🎮</span>
              <span className="line-clamp-3 text-sm font-medium text-zinc-200 group-hover:text-white">
                {game.title}
              </span>
            </>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-1 text-sm font-medium text-zinc-100">{game.title}</p>
          <p className="text-xs text-zinc-500">{game.console}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {regionBadges(game).map((badge) => (
              <span key={badge} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-2 line-clamp-1 text-xs text-zinc-500">{game.publisher ?? "Unknown publisher"}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatReleaseDate(game.releaseYear, game.releaseMonth) ?? "Year unknown"}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <LibraryButton game={game} />
      </div>
    </div>
  );
}
