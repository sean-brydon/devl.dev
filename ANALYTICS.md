# Analytics

devl has two kinds of analytics, both Cloudflare-native and cookieless, so there is no consent banner.

| What | Where it's counted | Where to read it |
| --- | --- | --- |
| Page views, referrers, countries, Core Web Vitals | Cloudflare Web Analytics beacon | Cloudflare dashboard → Analytics & Logs → Web Analytics |
| Installs, raw source, `llms.txt`, the skill, MCP calls | `worker.ts` → Workers Analytics Engine, dataset `devl_events` | `/admin/stats` (admin token), or the SQL API |

Neither one stores IP addresses, cookies or full user agents.

## Install and agent events

`worker.ts` writes one data point per request to the `EVENTS` binding (`wrangler.jsonc` → `analytics_engine_datasets`). The schema and helpers are in `src/server/events.ts`.

| Event | Counted request | `blob2` (subject) | `blob3` (detail) |
| --- | --- | --- | --- |
| `install` | `GET /r/<slug>.json` (the shadcn CLI). `registry` is the index | slug | |
| `raw` | `GET /raw/<slug>.tsx` | slug | |
| `llms` | `GET /llms.txt` | `llms.txt` | |
| `skill` | `GET /skill/<file>` | file name | |
| `mcp` | each JSON-RPC message in a `POST /mcp` (notifications are skipped) | tool name for `tools/call`, otherwise the method | `get_item` slug, or the client name from `initialize` |

Every data point also has these columns:

- `index1` and `blob1`: the event name.
- `blob4`: a coarse client family taken from the user agent: `shadcn`, `node`, `claude`, `cursor`, `openai`, `perplexity`, `bot`, `curl`, `python`, `browser`, `other` or `none`.
- `blob5`: the two-letter country code.
- `blob6`: the referrer's host name.
- `double1`: always 1.
- `double2`: the HTTP status.

MCP search queries and briefs are free text that agents write about the user's project, so they are not kept.

The static paths run the worker first through `assets.run_worker_first` in `wrangler.jsonc`. The worker serves them with `env.ASSETS.fetch` and returns at once. A path that doesn't match an asset (a 404) falls through to Next as before. Writes are fire-and-forget (`writeDataPoint` doesn't block the response), and errors are swallowed, so logging can't break a response. To count a new path, add it to `trackedAsset()` in `src/server/events.ts` and to `run_worker_first`.

The dataset is created by the first write after deploy. Analytics Engine keeps data for 3 months, and the free plan covers 100k writes and 10k queries a day.

## Reading the numbers

`/admin/stats` (`?days=7|30|90`) signs in with the same admin token as `/admin/sponsors`. It shows:

- totals per event, and a per-day chart
- top installs and top raw files
- MCP tools, items read over MCP, and MCP clients
- install clients, countries and referrers

It needs two Worker secrets:

1. Create an API token. In the dashboard, go to My Profile → API Tokens → Create Token → Custom token, and give it one permission: Account → **Account Analytics** → Read, scoped to the devl account.
2. Set the secrets:
   ```bash
   npx wrangler secret put CF_ACCOUNT_ID       # the account id (dashboard sidebar, or `npx wrangler whoami`)
   npx wrangler secret put CF_ANALYTICS_TOKEN  # the token from step 1
   ```

Ad hoc SQL works too (counts use `_sample_interval`, because Analytics Engine samples at high volume):

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CF_ANALYTICS_TOKEN" \
  --data "SELECT blob2 AS slug, SUM(_sample_interval) AS installs FROM devl_events
          WHERE blob1 = 'install' AND double2 < 400 AND timestamp > NOW() - INTERVAL '7' DAY
          GROUP BY slug ORDER BY installs DESC LIMIT 20"
```

## Page views (Web Analytics)

There are two ways to turn it on. Use one or the other, never both: a page can only carry one beacon.

- **Token beacon (recommended, works the same everywhere):**
  1. In the dashboard, go to Analytics & Logs → Web Analytics → Add a site → `devl.dev`, and pick the manual (JS snippet) setup.
  2. Copy the `token` from the snippet. It isn't a secret, since it ships in every page.
  3. Build with the token set:
     ```bash
     NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN=<token> pnpm cf:deploy
     ```
     Or put it in `.env.production.local`. It's inlined at build time, so a build without it ships no beacon.

  `src/app/(site)/layout.tsx` adds the beacon to site pages only. The full-screen previews (`/preview/*`, also the item page iframes) are left out so they don't double count.
- **Automatic setup:** the zone is proxied, so Web Analytics can inject the beacon at the edge. You turn it on in the same dashboard screen, with no code involved. After turning it on, view the source of a devl.dev page and check that the `cloudflareinsights` script is there. If it isn't, use the token beacon instead. Note that automatic setup also measures the preview iframes.
