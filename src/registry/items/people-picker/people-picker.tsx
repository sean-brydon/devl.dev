"use client";

import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, type ReactNode, useId, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPrimitive,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
  avatar?: string;
  group: string;
}

type Row = PickerOption & { create?: boolean };
type Group = { value: string; items: Row[] };

const TINTS = ["bg-sky-700", "bg-violet-700", "bg-amber-700", "bg-emerald-700", "bg-rose-700"];
const tintFor = (id: string) => TINTS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TINTS.length];
const initials = (label: string) =>
  label
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function OptionAvatar({ option, className }: { option: PickerOption; className?: string }) {
  return (
    <Avatar className={cn("size-5", className)}>
      {option.avatar && <AvatarImage alt="" src={option.avatar} />}
      <AvatarFallback className={cn("font-semibold text-[9px] text-white", tintFor(option.id))}>
        {initials(option.label)}
      </AvatarFallback>
    </Avatar>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-foreground">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

export interface PeoplePickerProps {
  options: PickerOption[];
  defaultValue?: PickerOption[];
  value?: PickerOption[];
  onValueChange?: (value: PickerOption[]) => void;
  multiple?: boolean;
  createGroup?: string | false;
  placeholder?: string;
  label?: ReactNode;
  className?: string;
}

export function PeoplePicker({
  options: initialOptions,
  defaultValue = [],
  value: valueProp,
  onValueChange,
  multiple = true,
  createGroup = "New",
  placeholder = "Search people or teams…",
  label,
  className,
}: PeoplePickerProps) {
  const [options, setOptions] = useState(initialOptions);
  const [inner, setInner] = useState<PickerOption[]>(defaultValue);
  const value = valueProp ?? inner;
  const [query, setQuery] = useState("");
  const reduce = useReducedMotion();
  const labelId = useId();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup = new Map<string, Row[]>();
    for (const option of options) {
      const hit = !q || option.label.toLowerCase().includes(q) || option.hint?.toLowerCase().includes(q);
      if (!hit) continue;
      byGroup.set(option.group, [...(byGroup.get(option.group) ?? []), option]);
    }
    const list: Group[] = [...byGroup].map(([g, items]) => ({ value: g, items }));
    const exact = options.some((o) => o.label.toLowerCase() === q);
    if (createGroup && q && !exact) {
      const label = query.trim();
      list.push({
        value: "__create",
        items: [{ id: `__create:${label}`, label, group: createGroup, create: true }],
      });
    }
    return list;
  }, [options, query, createGroup]);

  const commit = (next: PickerOption[]) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };

  const onChange = (next: Row[], details?: { reason?: string }) => {
    // Escape on a closed list would wipe every chip; only let it clear the typed text.
    if (details?.reason === "escape-key") return;
    let rows = next;
    const created = rows.find((r) => r.create);
    if (created) {
      const option: PickerOption = {
        id: `new-${created.label.toLowerCase().replace(/\s+/g, "-")}-${options.length}`,
        label: created.label,
        group: created.group,
        hint: "Invite pending",
      };
      setOptions((list) => [...list, option]);
      rows = rows.map((r) => (r.create ? option : r));
    }
    const clean = rows.map(({ create: _c, ...rest }) => rest as PickerOption);
    commit(multiple ? clean : clean.slice(-1));
    setQuery("");
  };

  const remove = (id: string) => commit(value.filter((v) => v.id !== id));

  return (
    <div className={cn("grid w-full max-w-sm gap-2", className)}>
      {label && (
        <span className="font-medium text-sm" id={labelId}>
          {label}
        </span>
      )}
      <Combobox<Row, true>
        filteredItems={groups}
        inputValue={query}
        isItemEqualToValue={(a, b) => a.id === b.id}
        itemToStringLabel={(item) => item.label}
        items={groups}
        multiple
        onInputValueChange={setQuery}
        onValueChange={onChange}
        value={value}
        autoHighlight
      >
        <ComboboxChips aria-labelledby={label ? labelId : undefined} className="min-h-10 sm:min-h-9" startAddon={<SearchIcon />}>
          <AnimatePresence initial={false} mode="popLayout">
            {value.map((option) => (
              <ComboboxPrimitive.Chip
                aria-label={option.label}
                data-slot="combobox-chip"
                className="flex items-center gap-1.5 rounded-full bg-accent ps-0.5 pe-0.5 font-medium text-accent-foreground text-xs outline-none data-highlighted:ring-2 data-highlighted:ring-ring"
                key={option.id}
                render={
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    layout={!reduce}
                    transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  />
                }
              >
                <OptionAvatar option={option} />
                <span className="max-w-28 truncate">{option.label}</span>
                <ComboboxPrimitive.ChipRemove
                  aria-label={`Remove ${option.label}`}
                  className="relative flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-1.5 hover:bg-foreground/8 hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </ComboboxPrimitive.ChipRemove>
              </ComboboxPrimitive.Chip>
            ))}
          </AnimatePresence>
          <ComboboxChipsInput aria-label={typeof label === "string" ? label : "Search"} placeholder={value.length ? "" : placeholder} />
        </ComboboxChips>
        <ComboboxPopup className="w-(--anchor-width)">
          <ComboboxEmpty>No matches.</ComboboxEmpty>
          <ComboboxList>
            {(group: Group) => (
              <Fragment key={group.value}>
                <ComboboxGroup items={group.items}>
                  {group.value !== "__create" && <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>}
                  <ComboboxCollection>
                    {(item: Row) =>
                      item.create ? (
                        <ComboboxItem key={item.id} value={item}>
                          <span className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-ring text-muted-foreground">
                              <PlusIcon className="size-3" />
                            </span>
                            <span>
                              Create <span className="font-medium">“{item.label}”</span>
                            </span>
                          </span>
                        </ComboboxItem>
                      ) : (
                        <ComboboxItem key={item.id} value={item}>
                          <span className="flex items-center gap-2">
                            <OptionAvatar option={item} />
                            <span className="truncate">
                              <Highlight query={query} text={item.label} />
                            </span>
                            {item.hint && (
                              <span className="ms-auto truncate ps-2 text-muted-foreground text-xs">
                                <Highlight query={query} text={item.hint} />
                              </span>
                            )}
                          </span>
                        </ComboboxItem>
                      )
                    }
                  </ComboboxCollection>
                </ComboboxGroup>
              </Fragment>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}
