"use client";

// The core search controls shared by Explore and the Library, so the two
// can never drift out of sync. Each caller owns where the values live
// (URL params, local state, etc.), wires up the callbacks, and supplies its
// own sort option list - the base catalog's sorts plus whatever it wants to
// add on top (e.g. the Library's "my rating" sorts).
type CatalogFilterFieldsProps<S extends string> = {
  consoles: string[];
  search: string;
  onSearchChange: (value: string) => void;
  console: string;
  onConsoleChange: (value: string) => void;
  sort: S;
  onSortChange: (value: S) => void;
  sortOptions: { value: S; label: string }[];
};

export function CatalogFilterFields<S extends string>({
  consoles,
  search,
  onSearchChange,
  console: consoleValue,
  onConsoleChange,
  sort,
  onSortChange,
  sortOptions,
}: CatalogFilterFieldsProps<S>) {
  return (
    <>
      <form
        key={search}
        className="min-w-[200px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          onSearchChange(String(formData.get("search") ?? ""));
        }}
      >
        {/* Search stays uncontrolled (it only commits on submit, not per
            keystroke - see the pagination work), but that means it needs
            the same "key forces a remount when the external value changes"
            trick NotesEditor already uses elsewhere, or navigating here
            with a different ?search= in the URL (e.g. the browser back
            button) would leave stale text sitting in the box. */}
        <input
          name="search"
          defaultValue={search}
          placeholder="Search games..."
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
        />
      </form>

      {/* Console/sort are fully controlled (value, not defaultValue) -
          unlike search, they commit on every change, so there's no reason
          not to just always reflect the current prop. defaultValue was the
          bug: it only sets the DOM element's value once at creation, so if
          the console list (fetched async) arrives after first render, or
          the page is restored via browser back navigation without a full
          remount, the dropdown silently stopped matching the actual
          applied filter. */}
      <select
        value={consoleValue}
        onChange={(e) => onConsoleChange(e.target.value)}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
      >
        <option value="">All consoles</option>
        {consoles.map((consoleName) => (
          <option key={consoleName} value={consoleName}>
            {consoleName}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as S)}
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
