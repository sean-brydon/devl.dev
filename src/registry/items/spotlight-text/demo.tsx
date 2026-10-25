import { SpotlightText } from "@/registry/items/spotlight-text/spotlight-text";

export default function SpotlightTextDemo() {
  return (
    <SpotlightText
      className="w-full max-w-[460px] rounded-2xl border bg-card px-6 py-7 shadow-xs/5 sm:px-8 sm:py-9"
      secret={
        <p className="mt-5 font-mono text-amber-700 text-xs dark:text-amber-300">
          You found it. Night owls get three months free with LATESHIFT.
        </p>
      }
    >
      <p className="font-mono text-muted-foreground text-xs tracking-wide">LANTERN 4.2 · RELEASE NOTES</p>
      <h2 className="mt-3 text-balance font-semibold text-3xl tracking-tight">Built for the hours nobody is watching.</h2>
      <p className="mt-4 text-pretty text-muted-foreground text-sm leading-relaxed">
        Nightly backups, quiet retries and the 3 a.m. alert that never has to fire. Lantern keeps the boring parts of your
        stack boring, so Monday starts with coffee instead of a postmortem.
      </p>
    </SpotlightText>
  );
}
