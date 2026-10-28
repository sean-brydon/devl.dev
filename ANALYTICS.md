# Analytics

devl has two kinds of analytics, both Cloudflare-native and cookieless, so there is no consent banner.

| What | Where it's counted | Where to read it |
| --- | --- | --- |
| Page views, referrers, countries, Core Web Vitals | Cloudflare Web Analytics beacon | Cloudflare dashboard → Analytics & Logs → Web Analytics |
| Installs, raw source, `llms.txt`, Markdown pages, the skill, MCP calls, AI agent page views and AI referrals | `worker.ts` → Workers Analytics Engine, dataset `devl_events` | `/admin/stats` (admin token), or the SQL API |

Neither one stores IP addresses, cookies or full user agents.

## Install and agent events

`worker.ts` writes one data point per request to the `EVENTS` binding (`wrangler.jsonc` → `analytics_engine_datasets`). The schema and helpers are in `src/server/events.ts`.

| Event | Counted request | `blob2` (subject) | `blob3` (detail) |
| --- | --- | --- | --- |
| `install` | `GET /r/<slug>.json` (the shadcn CLI). `registry` is the index | slug | |
| `raw` | `GET /raw/<slug>.tsx` | slug | |
| `llms` | `GET /llms.txt` or `/llms-full.txt` | file name | |
| `markdown` | `GET /<kind>/<slug>.md`, or an item page with `Accept: text/markdown` | slug | |
| `skill` | `GET /skill/<file>` | file name | |
| `mcp` | each JSON-RPC message in a `POST /mcp` (notifications are skipped) | tool name for `tools/call`, otherwise the method | `get_item` slug, or the client name from `initialize` |
| `agent` | an HTML page fetched by an AI crawler or agent (client family below) | path | |
| `search` | `POST /api/search-miss` from the search box when a query finds nothing (once per phrase per visit, after 1.5s idle) | the phrase, lowercased, max 48 characters; emails and long numbers dropped | |
| `referral` | an HTML page opened from an AI assistant (chatgpt.com, claude.ai, perplexity.ai, gemini.google.com, copilot…) | referrer host | path |

Every data point also has these columns:

- `index1` and `blob1`: the event name.
- `blob4`: a coarse client family taken from the user agent: `shadcn`; the AI vendors' agents split by job, `gptbot` (training crawl), `oai-searchbot` (search index), `chatgpt-user` (fetch for a user), and the same for Claude (`claudebot`, `claude-searchbot`, `claude-user`) and Perplexity (`perplexitybot`, `perplexity-user`); other AI tools `claude`, `cursor`, `openai`, `perplexity`, `gemini`; then `applebot`, `googlebot`, `bingbot`, `bot`, `curl`, `python`, `node`, `browser`, `other` or `none`.
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

The Web Analytics site for `devl.dev` is `9dff315385294ed690c32485a04c87f1`. Its token, which is public, is hardcoded in `src/app/(site)/layout.tsx`. That layout adds the beacon to site pages only. The full-screen previews (`/preview/*`, also the item page iframes) are left out so they don't double count. Read the numbers in the dashboard: Analytics & Logs → Web Analytics → devl.dev.

Leave the site's automatic setup (`auto_install`) off: a page can only carry one beacon. When it was on, nothing was injected into the Worker's pages anyway.
