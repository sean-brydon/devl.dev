# Adding an item to the devl registry

devl.dev is a shelf of hand-built components on [coss ui](https://coss.com/ui) (Base UI + Tailwind v4, shadcn-style).
Every item is one folder. A generator turns the folders into the site index, the Code tab and shadcn install files.

## Folder

```
src/registry/items/<slug>/
  meta.json      what the site shows
  <slug>.tsx     the component people install: one self-contained file
  demo.tsx       default export, renders the component with sample data (the live preview)
```

`src/registry/items/goo-button/` is the reference: copy its shape.

### meta.json

```json
{
  "name": "Goo Button",
  "description": "One sentence, plain words, what it does and what makes it nice.",
  "kind": "component",
  "category": "Actions",
  "isNew": true,
  "featured": false
}
```

- `kind`: `component` | `block` | `screen` | `motion` | `illustration`
- `category`: short, Title Case, reuse existing ones where they fit (AI, Agents, Inputs, Actions, Feedback, Data, Collaboration, Navigation, Marketing, Commerce, App, Effects, Text, Backgrounds).
- `featured`: only for the 1–2 strongest pieces in your batch (they get a big bento tile).

### Charts (credited to bklit)

Items in the Charts category (kind `component`, category `Charts`) showcase the bklit chart library (MIT, https://github.com/bklit/bklit-ui). Their meta.json adds `"source": "bklit"` and `"upstream": "<bklit registry name>"` (e.g. `"area-chart"`). The site then points install commands, the registry link, GitHub and docs to bklit, and no devl install file is generated. The `<slug>.tsx` is devl's composed example built on bklit's components (imported from `@/components/charts/...`), and demo.tsx renders it.

### Filters (powered by Qnot)

Items in the Filters category (kind `component`, category `Filters`) are devl components built on Qnot (`@qnot/core` + `@qnot/react`, https://coss.com/qnot, the owner's typed query library). Their meta.json adds `"poweredBy": "qnot"`. They install from devl like other items (the generator lists the Qnot packages as dependencies automatically), and the site credits Qnot on every page.

### `<slug>.tsx`

- Self-contained. Allowed imports only: `react`, `@/components/ui/*` (the coss ui kit, already installed: accordion, alert, alert-dialog, autocomplete, avatar, badge, breadcrumb, button, calendar, card, checkbox, checkbox-group, collapsible, combobox, command, composer, context-menu, dialog, drawer, empty, field, fieldset, form, frame, group, input, input-group, kbd, label, menu, meter, number-field, otp-field, pagination, popover, preview-card, progress, radio-group, scroll-area, segmented-control, select, separator, sheet, sidebar, skeleton, slider, spinner, switch, table, tabs, textarea, toast, toggle, toggle-group, toolbar, tooltip), `@/lib/utils` (`cn`), `lucide-react`, `motion/react`, `@base-ui/react/*`, `class-variance-authority`.
- No new npm dependencies. No chart libraries: draw charts with SVG.
- Never import another registry item.
- Export named components (`export function AgentInbox`). Take data through props with sensible typed defaults, so it is reusable and the demo stays short.
- `"use client"` at the top when it uses state, effects, or motion.
- Read the coss ui component source in `src/components/ui/` before using a component; APIs follow Base UI (`render` prop, not `asChild`).
- **No comments.** People install and read this code; it should explain itself through names and structure. No JSDoc, no section dividers, no "this does X" narration. The only exception is a rare one-line comment explaining *why* a genuinely non-obvious trick is there (e.g. a browser workaround). Same for demo.tsx.

### `demo.tsx`

- `export default function <Name>Demo()`. Import the component from `@/registry/items/<slug>/<slug>`.
- Sample data inline. Fictional names and companies only.

## How it should look and feel

- coss ui tokens only: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border` / `border-border`, `bg-primary text-primary-foreground`, `info` / `success` / `warning` / `destructive` (+ `-foreground`). No hex colours, no `zinc-*`/`gray-*`. Must look right in light and dark (dark = `.dark` class on an ancestor).
- **Careful with `chart-1`…`chart-5`: coss swaps their hues between themes** (light chart-1 is orange, dark chart-1 is blue). Only use them where a hue change doesn't matter (anonymous data series). For colour that carries meaning or identity (labels, statuses, avatars, app tiles, people, gradients, illustration palettes) use the semantic tokens above, or named Tailwind hues with explicit dark variants (`bg-violet-500/15 text-violet-700 dark:text-violet-300`), so a thing keeps its colour in both themes.
- Type: `text-sm` body, `text-xs` meta, `font-medium` for emphasis, `tabular-nums` for numbers, `font-mono` for code, ids and figures where it suits.
- Shapes: cards `rounded-2xl border bg-card`, inner panels `rounded-xl`, small controls and chips `rounded-full` or `rounded-lg`. `shadow-xs/5` at most.
- devl's signature is **soft, springy motion and goo**: use `motion/react` springs for layout changes, numbers that roll, items that glide into place. Where a control has a moving indicator or blobs that meet (tabs, toggles, segmented controls, badges, loaders, buttons) consider the SVG goo filter from `goo-button.tsx` (blur + alpha threshold, solid colour layer behind the text, filter id from `useId`). Don't goo text.
- Respect `useReducedMotion()`.
- Accessible: real buttons, labels, `aria-*`, keyboard where it matters.
- Self-running demos are welcome (a fake agent that streams, ticks, progresses) but must loop or settle calmly and clean up timers.

## Sizing (the preview frame)

- `component` / `motion` / `illustration`: rendered centred with padding. Keep to a natural width (≈ 280–480px), never wider than 640px.
- `block`: up to ≈ 1100px wide, full width below that.
- `screen`: fills the frame (`w-full`, about `h-[760px]`, its own internal scrolling). Must work from 375px wide up (collapse sidebars, stack columns).
- No `position: fixed` and no listeners on `window`/`document` for keys unless focus is inside the component: many demos render side by side on one page. Toasts and popovers render inside the demo's own box (or a Base UI portal that closes on outside click).

## Original work

Briefs may name things that exist elsewhere. Treat them as a description of what to build, never as code to copy.
Write every line yourself; don't fetch or paste source from other libraries or sites.
Write your own `description` for meta.json; rename items if a better name fits.

## Check your work

The dev server is already running on http://localhost:3417. Don't start another and don't run `next build`.

```bash
pnpm registry                                   # regenerate the index
pnpm exec tsc --noEmit 2>&1 | grep 'registry/items/<slug>'   # your errors only; others may be mid-edit
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3417/preview/<slug>     # must print 200
```

`/preview/<slug>?theme=dark` and `?theme=light` render just your demo. A 500 means it threw during render: read the HTML body for the error.

Touch only your own item folders. Don't edit shared files, don't add dependencies, don't commit.
