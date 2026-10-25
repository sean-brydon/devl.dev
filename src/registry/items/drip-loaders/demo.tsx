import { DripLoader, type DripLoaderVariant } from "@/registry/items/drip-loaders/drip-loaders";

const tiles: { variant: DripLoaderVariant; title: string; note: string; tone: string }[] = [
  { variant: "spin", title: "Spin", note: "Drops fan out, run back", tone: "text-foreground" },
  { variant: "drip", title: "Drip", note: "Swell, let go, land", tone: "text-teal-600 dark:text-teal-400" },
  { variant: "split", title: "Split", note: "One dot, two ways apart", tone: "text-info" },
];

export default function DripLoadersDemo() {
  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          className="flex items-center gap-4 rounded-2xl border bg-card p-4 sm:flex-col sm:px-3 sm:pt-6 sm:pb-4"
          key={t.variant}
        >
          <DripLoader className={t.tone} label={`${t.title} loader`} size={56} variant={t.variant} />
          <div className="flex flex-col gap-0.5 sm:items-center sm:text-center">
            <span className="font-medium text-sm">{t.title}</span>
            <span className="text-muted-foreground text-xs">{t.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
