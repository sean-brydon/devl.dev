# Qnot feedback from building devl's Filters category

Found while building 10 components on `@qnot/core` + `@qnot/react` 0.1.0.

## Bugs

1. **Evaluation coercion.** Ordering operators on number fields compare loosely: `"412" >= 412` is true and `"" < 5` is true, but `"1000" eq 1000` is false. `compile`/`matches` should type-check row values by field kind.
2. **`parseInput` drops typos.** For a number field, `"abc"` becomes `null`, so validation says "A value is required" instead of "Expected a number". Keeping the raw string would let the `type` issue fire.
3. **Empty NOT group matches everything.**

## Footguns

4. **Empty or all-incomplete queries match every row by default.** Dangerous for targeting and routing. `incompleteRules: false` fixes it but is easy to miss; consider making it the default for `compileCases`.
5. **`store.move(id, parent, index)` uses the pre-removal index** (drag-and-drop semantics), so "move down one" needs `index + 2`. Document it, or add `moveBy(id, delta)`.

## Types

6. **`RowOf<F>`** types every field as `T | null | undefined`, so it can't serve as an app's row type.
7. **`Query` isn't assignable to `QueryOf<Fields>` for a generic `Fields`.** Reusable components need casts on `useQueryStore` initial values, `compileCases` and `matches`.
8. **`useRule().remove`** is typed `() => undefined`.

## Gaps

9. **Drag-and-drop hooks are HTML5-drag only.** There's no touch, pointer or keyboard support, and `useDropTarget` never returns `'inside'`.
10. **The `text` codec** writes lists without grouping ("Plan is any of Pro, Team AND …") and booleans as "= true".
11. **A search-syntax codec** (`key:value key>3 -key:x a..b`) would save every search box from writing its own parser.
12. **A multi-case store**, since the routing docs recommend one store per case.

## Nice surprises

`operatorInfo().symbol` / `.inverse`, `compile`'s `invalidRules: "skip"`, and `sanitizeQuery` returning the same object when nothing changed were all genuinely useful.
