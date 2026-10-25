import { ArrowUpRightIcon, CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cossCalendar } from "@/lib/registry";
import { withUtm } from "@/lib/utm";

export function CossCalendarStrip({ slug }: { slug: string }) {
  const href = withUtm(cossCalendar.site, { medium: "referral", campaign: "shoutout", content: slug }) ?? cossCalendar.site;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <CalendarDaysIcon className="size-4.5" />
        </span>
        <p className="min-w-0 text-pretty text-sm">
          <span className="font-medium">Want a calendar that&apos;s ready to go?</span>
          <span className="text-muted-foreground"> · check out coss calendar from the team behind coss ui.</span>
        </p>
      </div>
      <Button className="shrink-0" render={<a href={href} rel="noopener" target="_blank" />} size="sm">
        coss.com/calendar
        <ArrowUpRightIcon />
      </Button>
    </div>
  );
}
