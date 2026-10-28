"use client";

import { CornerDownLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { type RegistryItem, itemHref, itemsOfKind, kinds } from "@/lib/registry";

interface MenuGroup {
  value: string;
  items: RegistryItem[];
}

const groups: MenuGroup[] = kinds.map((kind) => ({
  value: kind.label,
  items: itemsOfKind(kind.value),
}));

const reported = new Set<string>();

function SearchMiss({ query }: { query: string }) {
  const latest = useRef(query);
  latest.current = query;
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2 || reported.has(value.toLowerCase())) return;
    const timer = setTimeout(() => {
      if (latest.current.trim() !== value) return;
      reported.add(value.toLowerCase());
      navigator.sendBeacon?.("/api/search-miss", value);
    }, 1500);
    return () => clearTimeout(timer);
  }, [query]);
  return null;
}

export function CommandMenu({ shortcut = true, compact = false }: { shortcut?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!shortcut) return;
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [shortcut]);

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      {compact ? (
        <CommandDialogTrigger
          aria-label="Search devl"
          className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground outline-none transition-[background-color,color,scale] hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
        >
          <SearchIcon className="size-4" />
        </CommandDialogTrigger>
      ) : (
        <CommandDialogTrigger className="flex h-9 w-full items-center gap-2 rounded-full bg-muted px-3.5 text-muted-foreground text-sm outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <SearchIcon className="size-4 opacity-80" />
          <span className="flex-1 text-left">Search devl</span>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </CommandDialogTrigger>
      )}
      <CommandDialogPopup>
        <Command items={groups} onValueChange={(value) => setQuery(String(value ?? ""))} itemToStringValue={(item) => {
          const { name, category, keywords = [] } = item as RegistryItem;
          return [name, category, ...keywords].join(" ");
        }}>
          <CommandInput placeholder="Search components, blocks, screens…" />
          <CommandPanel>
            <CommandEmpty>
              Nothing matches that.
              <SearchMiss query={query} />
            </CommandEmpty>
            <CommandList>
              {(group: MenuGroup) => (
                <CommandGroup items={group.items} key={group.value}>
                  <CommandGroupLabel>{group.value}</CommandGroupLabel>
                  <CommandCollection>
                    {(item: RegistryItem) => (
                      <CommandItem
                        className="flex w-full items-center gap-2"
                        key={item.slug}
                        render={<Link href={itemHref(item)} onNavigate={() => setOpen(false)} />}
                        value={item}
                      >
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-muted-foreground text-xs">{item.category}</span>
                      </CommandItem>
                    )}
                  </CommandCollection>
                </CommandGroup>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex items-center gap-2">
              <span>Open</span>
              <Kbd>
                <CornerDownLeftIcon />
              </Kbd>
            </div>
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
