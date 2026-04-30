export function Skeleton() {
  return (
    <section className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-5">
        <div className="mx-auto mb-3 h-7 w-48 rounded-lg bg-stone-200" />
        <div className="mx-auto mb-6 h-4 w-64 rounded-lg bg-stone-200" />
        <div className="mb-4 h-5 w-36 rounded-lg bg-stone-200" />
        <div className="mb-5 h-16 rounded-lg border border-stone-200 bg-stone-100" />
        <div className="grid gap-3">
          <div className="h-5 rounded-lg bg-stone-200" />
          <div className="h-5 rounded-lg bg-stone-200" />
          <div className="h-5 rounded-lg bg-stone-200" />
        </div>
      </div>
    </section>
  );
}
