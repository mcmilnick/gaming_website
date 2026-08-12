"use client";

export function RatingStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
          className={`text-base leading-none ${value && star <= value ? "text-amber-400" : "text-zinc-600"} hover:text-amber-300`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
