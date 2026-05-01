export function Skeleton() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mx-auto mb-3 h-7 w-48 rounded-lg bg-[var(--skeleton)]" />
        <div className="mx-auto mb-6 h-4 w-64 rounded-lg bg-[var(--skeleton)]" />
        <div className="mb-4 h-5 w-36 rounded-lg bg-[var(--skeleton)]" />
        <div className="mb-5 h-16 rounded-lg border border-[var(--border-soft)] bg-[var(--skeleton-field)]" />
        <div className="grid gap-3">
          <div className="h-5 rounded-lg bg-[var(--skeleton)]" />
          <div className="h-5 rounded-lg bg-[var(--skeleton)]" />
          <div className="h-5 rounded-lg bg-[var(--skeleton)]" />
        </div>
      </div>
    </section>
  );
}
