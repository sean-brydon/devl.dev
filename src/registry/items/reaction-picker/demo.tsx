import { ReactionPicker } from "@/registry/items/reaction-picker/reaction-picker";

export default function ReactionPickerDemo() {
  return (
    <div className="w-full max-w-[400px] rounded-2xl border bg-card p-4 pt-5 shadow-xs/5">
      <div className="flex gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 font-medium text-rose-700 text-xs dark:bg-rose-950 dark:text-rose-300">
          AR
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-sm">Ana Ruiz</span>
            <span className="text-muted-foreground text-xs">4:52 PM</span>
          </div>
          <p className="mt-0.5 text-pretty text-sm leading-relaxed">
            The new onboarding flow is live for everyone. Sign-ups to first project went from 4 minutes to under 90 seconds.
          </p>
          <ReactionPicker
            className="mt-2.5"
            reactions={[
              { emoji: "🎉", count: 6, mine: false },
              { emoji: "❤️", count: 3, mine: true },
              { emoji: "🙏", count: 1 },
            ]}
          />
        </div>
      </div>
      <p className="mt-3 border-t pt-3 text-muted-foreground text-xs">Tap the face to open, or hold it and slide to an emoji.</p>
    </div>
  );
}
