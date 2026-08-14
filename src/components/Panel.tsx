export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-800 bg-zinc-900 p-4 ${className}`}>{children}</div>;
}
