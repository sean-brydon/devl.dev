import { Changelog } from "@/registry/items/changelog/changelog";

export default function ChangelogDemo() {
  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <Changelog
        description="Every release, big and small. We ship most Tuesdays."
        endNote="That's everything since Paperlane 4.0 in May."
        releases={[
          {
            version: "v4.12",
            date: "Oct 21, 2026",
            title: "Move anything from the keyboard",
            summary: "The command menu learned to move, copy and archive pages, so tidying a space no longer means dragging things around a sidebar.",
            media: "palette",
            changes: [
              { type: "new", text: "“Move to…” and “Copy to…” in the command menu, with fuzzy space search." },
              { type: "improved", text: "The command menu remembers your last five actions and shows them first." },
              { type: "fixed", text: "Archived pages no longer reappear in search for a few seconds after archiving." },
            ],
          },
          {
            version: "v4.11",
            date: "Oct 14, 2026",
            title: "Reading insights for every page",
            summary: "See who opened a page, how far they read and which sections they skipped. Totals only, never a list of names, unless the page is yours.",
            media: "chart",
            changes: [
              { type: "new", text: "Page insights panel with reads, finish rate and average time." },
              { type: "new", text: "Weekly summary email for space owners, off by default." },
              { type: "improved", text: "Exporting a space to Markdown is roughly three times faster." },
            ],
          },
          {
            version: "v4.10",
            date: "Oct 7, 2026",
            title: "Comments you can't lose",
            media: "editor",
            changes: [
              { type: "improved", text: "Comments stay pinned to their text even after heavy edits around them." },
              { type: "improved", text: "Resolved threads collapse into a single line you can expand." },
              { type: "fixed", text: "Mentions in tables now notify the person mentioned." },
              { type: "fixed", text: "Fixed a crash when pasting very long links into a heading." },
            ],
          },
          {
            version: "v4.9",
            date: "Sep 30, 2026",
            title: "Offline, properly",
            summary: "The desktop app keeps your recent pages on the device and merges edits paragraph by paragraph when you reconnect.",
            media: "offline",
            changes: [
              { type: "new", text: "Offline editing in the desktop apps for your 200 most recent pages." },
              { type: "improved", text: "Sync indicator now shows exactly which pages are waiting to upload." },
            ],
          },
          {
            version: "v4.8",
            date: "Sep 23, 2026",
            title: "Smaller things, done well",
            changes: [
              { type: "improved", text: "Tables keep their column widths when you paste rows from a spreadsheet." },
              { type: "fixed", text: "Dark mode code blocks no longer flash white while loading." },
              { type: "fixed", text: "The share dialog keeps focus in place when you remove someone." },
            ],
          },
          {
            version: "v4.7",
            date: "Sep 16, 2026",
            title: "Templates with live data",
            changes: [
              { type: "new", text: "Templates can pull a date, an owner or a linked page in when they're used." },
              { type: "improved", text: "Template gallery groups by team and shows who made each one." },
            ],
          },
        ]}
        rssHref="#rss"
        title="What's new in Paperlane"
      />
    </div>
  );
}
