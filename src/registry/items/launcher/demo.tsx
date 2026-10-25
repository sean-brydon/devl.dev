"use client";

import {
  CircleDotIcon,
  FilePlusIcon,
  InboxIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  TagIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Launcher } from "@/registry/items/launcher/launcher";

export default function LauncherDemo() {
  return (
    <div className="flex h-[440px] w-full max-w-md items-start pt-4">
      <Launcher
        actions={[
          { id: "new-issue", label: "Create issue", icon: <FilePlusIcon />, group: "Actions", shortcut: ["C"], done: "Issue NW-142 created" },
          { id: "assign", label: "Assign to…", icon: <UserPlusIcon />, group: "Actions", page: "assign" },
          { id: "label", label: "Add label", icon: <TagIcon />, group: "Actions", shortcut: ["L"] },
          { id: "status", label: "Change status", icon: <CircleDotIcon />, group: "Actions", shortcut: ["S"] },
          { id: "inbox", label: "Go to Inbox", icon: <InboxIcon />, group: "Navigation", shortcut: ["G", "I"], keywords: ["notifications"] },
          { id: "dash", label: "Go to Dashboard", icon: <LayoutDashboardIcon />, group: "Navigation", shortcut: ["G", "D"] },
          { id: "team", label: "Go to Team", icon: <UsersIcon />, group: "Navigation", shortcut: ["G", "T"] },
          { id: "theme", label: "Change theme…", icon: <PaletteIcon />, group: "Settings", page: "theme", keywords: ["dark", "light"] },
          { id: "settings", label: "Open settings", icon: <SettingsIcon />, group: "Settings", shortcut: ["⌘", ","] },
        ]}
        defaultOpen
        defaultRecent={["inbox", "new-issue"]}
        pages={{
          theme: {
            title: "Theme",
            placeholder: "Pick a theme…",
            actions: [
              { id: "theme-light", label: "Light", icon: <SunIcon />, done: "Theme set to Light" },
              { id: "theme-dark", label: "Dark", icon: <MoonIcon />, done: "Theme set to Dark" },
              { id: "theme-system", label: "System", icon: <LaptopIcon />, done: "Theme follows system" },
            ],
          },
          assign: {
            title: "Assign",
            placeholder: "Assign to…",
            actions: [
              { id: "as-mara", label: "Mara Okafor", done: "Assigned to Mara" },
              { id: "as-ines", label: "Ines Varga", done: "Assigned to Ines" },
              { id: "as-sam", label: "Sam Adeyemi", done: "Assigned to Sam" },
              { id: "as-noor", label: "Noor Haddad", done: "Assigned to Noor" },
            ],
          },
        }}
      />
    </div>
  );
}
