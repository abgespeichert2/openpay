export function Credits() {
  return (
    <footer className="mt-3 px-2 text-center text-[11px] leading-4 text-[var(--text-secondary)]">
      <p>Developed with ❤️ by abgespeichert</p>
      <p>
        Check the{" "}
        <a
          href="https://github.com/abgespeichert2/openpay/blob/main/README.md"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
        >
          GitHub
        </a>
        , or the{" "}
        <a
          href="https://github.com/abgespeichert2/openpay/blob/main/DOCS.md"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
        >
          Docs
        </a>
        .
      </p>
    </footer>
  );
}
