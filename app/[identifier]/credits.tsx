export function Credits() {
  return (
    <footer
      className="mt-3 px-2 text-center text-[11px] leading-4"
      style={{
        color: "var(--payment-text-secondary)",
      }}
    >
      <p>Developed with ❤️ by abgespeichert</p>
      <a
        href="https://github.com/abgespeichert2/openpay"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-4 transition-opacity hover:opacity-70"
        style={{
          color: "var(--payment-text-secondary)",
          textDecorationColor: "var(--payment-outline-field)",
        }}
      >
        OpenSource on GitHub
      </a>
    </footer>
  );
}
