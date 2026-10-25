# Auditing registry items

Every item must score **9/10 or more** to ship. Score from real renders, not from reading code, against the craft standard below.

## See it

```bash
pnpm registry
node scripts/shots.mjs <slug> [<slug> ...]   # .shots/<slug>/{light,dark}-desktop.png, dark-mobile.png; errors in .shots/report.json
```

Open the PNGs with your image viewer tool. For hover, typing or clicks, write a short throwaway Playwright script in your scratchpad
(same setup as `scripts/shots.mjs`: `playwright-core` with Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
page `http://localhost:3417/preview/<slug>?theme=dark`) and screenshot the states that matter: hover on the goo, mid-animation, open menus,
error and success states. The dev server is already running; don't start another and don't run `next build`.

## Score (10)

| Points | What earns them |
| --- | --- |
| 3 | **Craft.** Spacing on a consistent rhythm, aligned edges, clear hierarchy, nothing cramped or floating, sensible density, crisp type (`text-sm`/`text-xs`, `tabular-nums` for figures). Looks like something from a top product team. |
| 2 | **Fits coss ui and devl.** Tokens only, correct in *both* light and dark (no invisible text, no muddy borders, no white boxes in dark, no identity colours that change hue between themes because they use `chart-*`), coss radii and shadows, consistent with the kit's components. |
| 2 | **Motion and goo.** Motion has a purpose and is smooth. Goo is used *only* where it reads as liquid and improves the moment (a moving indicator, a blob that merges). Deduct for: lumpy or blobby edges at rest, square clipping or halos from the filter region, goo on text or icons, goo on alpha/transparent colours (fringing), goo on dense small controls, every button in a component being gooey, wobble that slows the user down. |
| 2 | **Worth installing.** Realistic demo content, a props API someone would want, does the job its name promises, nothing fake-looking or half-finished. |
| 1 | **Robust.** No console or page errors, no sideways overflow at 390px, works by keyboard, labelled controls, timers cleaned up. |

## Verdicts

- **9–10: pass.** Fix any small nits you notice anyway.
- **5–8: fix.** Rework until it scores 9+. An 8 is "good, ships elsewhere" — not good enough here. Typical fixes: remove goo from places it doesn't belong (a plain coss `Button` is often better), tighten spacing, fix dark mode, simplify a cluttered layout, make the demo realistic.
- **0–4: rebuild or cut.** If it can't reach 9 in reasonable effort, delete its folder and say so.

Re-shoot after fixing and score again from the new render.

If the `emil-design-engineering`, `web-animation-design` or `make-interfaces-feel-better` skills are available to you, load them before you start and apply them on top of this standard. Follow REGISTRY.md for all code rules. Only touch the item folders you were given.

## Report

One line per item: `slug: before → after — what you changed` (or `cut — why`).

## Craft standard (Emil Kowalski's design-engineering principles, applied)

A 9 means every point below holds. Check them on every item.

**Motion**
- Every animation has a reason: it explains a change of state, keeps context, or gives feedback. Decoration that runs for its own sake, or that slows the user down, goes.
- Frequency rule: things people do constantly (typing, keyboard shortcuts, switching tabs, opening a menu they use all day) get little or no animation. Rare moments (first run, success, delight) can afford more.
- UI motion is fast: ~150–250ms for most transitions, rarely over 300ms. Nothing makes the user wait for it.
- Easing: `ease-out` (or a strong custom curve like `cubic-bezier(0.23, 1, 0.32, 1)`) for things entering or responding; `ease-in-out` for things moving on screen; never `ease-in` for UI responses; `linear` only for constant motion (spinners, marquees). Use springs for drag, gestures and anything interruptible, tuned so they settle without visible wobble unless wobble is the point.
- Never animate from `scale(0)`: enter from ~0.95 with opacity. Popovers, menus and tooltips grow from their trigger (`transform-origin` at the anchor), not from the centre.
- Interruptible: re-triggering mid-animation continues smoothly from where it is (transitions / springs), never snaps back to start.
- Only animate `transform`, `opacity`, `filter`, `clip-path` where possible; no layout-thrashing width/height/top animation in loops. Use `blur` sparingly to bridge crossfades.
- Press feedback: buttons and pressable cards scale to ~0.97 on `:active`. Hover effects only under `@media (hover: hover)` so touch devices don't get sticky hovers.
- Tooltips: a delay before the first one, instant for neighbours after that, no animation once one is open.
- Stagger lists subtly (20–40ms per item, capped), never so long the last item arrives late.
- `prefers-reduced-motion`: keep opacity and colour changes, drop movement.

**Interface details**
- Concentric radii: an inner element's radius = outer radius minus the padding between them.
- Optical alignment over mathematical: icons next to text are nudged to look centred; play/arrow icons are optically centred.
- `tabular-nums` on every changing number; `text-balance` on headings, `text-pretty` on short paragraphs; no orphaned single words in titles.
- Hit areas at least 32px (40px on touch) even when the visual is smaller.
- Visible, consistent `focus-visible` rings; nothing focusable is invisible.
- Depth from layered subtle shadows or a hairline, not heavy borders plus heavy shadows. Borders and shadows consistent with coss ui.
- Copy is short, specific and human. Realistic names, numbers and dates. No lorem, no "Item 1".
- Empty, loading and error states exist where the component would need them in real life.
- Code reads clean: no comments except a rare one-line "why" for a non-obvious trick (see REGISTRY.md).
- No layout shift when state changes (reserve space, animate height with a measured spring, keep widths stable for changing labels).
