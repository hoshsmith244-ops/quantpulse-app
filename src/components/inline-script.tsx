/**
 * An inline script that runs while the browser parses the HTML, before paint.
 *
 * The `type` switch is the documented way to keep React quiet: on the server it
 * renders as a real script so the browser executes it during parsing, and on
 * the client it renders as inert `text/plain` so React does not warn about
 * rendering a script tag. `suppressHydrationWarning` covers the resulting type
 * mismatch.
 *
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
