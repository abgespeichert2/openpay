export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-stone-500">
          404
        </p>
        <h1 className="text-xl font-semibold text-stone-950">
          Payment not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          This payment page does not exist or has expired.
        </p>
      </section>
    </main>
  );
}
