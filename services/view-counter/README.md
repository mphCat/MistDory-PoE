# Cumulative website view counter

The website stays on GitHub Pages. This optional Cloudflare Worker + D1 service stores one cumulative total across Home, Videos and About. It is not deployed by the Pages workflow.

## Counting and privacy

- The first page load counts. Further loads from the same public IP are ignored when the gap from its preceding request is **10 seconds or less**. Each request renews this sliding cooldown; the total never resets with a day, browser, game, language or frontend deployment.
- SQL triggers update the total atomically with the IP cooldown. Concurrent requests cannot both pass the same cooldown.
- Cloudflare's trusted visitor-IP header is HMAC-SHA256 hashed with a server-side secret. Raw IPs, cookies, fingerprints and page URLs are not stored in D1. Cloudflare still processes requests according to its own policies.
- An hourly scheduled task deletes hash records older than 24 hours. It never deletes the total. Back up D1 before replacing/deleting it; a new empty database would start at zero.
- Shared public IPs (household/VPN/NAT) share the cooldown. IP changes, bots, ad blockers and disabled JavaScript affect accuracy. CORS is not authentication or complete bot prevention; this is a lightweight view counter, not proof of unique people.
- Only the real production origin/path sends counts. Local previews display a dash. Network/service failures also display a dash and leave the website usable. Merely switching language does not send a second count.

## Dashboard deployment (no credentials in chat or source)

1. In Cloudflare, create a D1 database named `mistdory-view-counter`. Run `schema.sql` in its SQL console. Running the schema again preserves the total.
2. Create a Worker named `mistdory-view-counter`. In its editor use `worker.mjs` as the module entry point and deploy it.
3. In Worker settings, add a D1 binding named **DB** pointing to that database. Add variable **SITE_ORIGIN** = `https://mphcat.github.io`.
4. Add an encrypted secret named **IP_HASH_SECRET**, containing at least 32 randomly generated characters. Generate it locally and enter it directly in Cloudflare; never commit it or paste it in chat.
5. Add hourly Cron Trigger `0 * * * *` for expired hash cleanup. Keep request observability disabled if no request logs are needed.
6. Provide the public `https://mistdory-view-counter.<your-subdomain>.workers.dev` URL. This URL is not a credential. Put it into `js/view-counter-config.js` in the active website and add that exact origin to `connect-src` in Home, Videos and About CSP. Do not allow every Workers origin.
7. Verify real Cloudflare requests: first load increases the total, concurrent/rapid reloads from the same IP do not, a load after more than 10 seconds of inactivity does, and different IPs can count independently. Verify persistence after redeploy and graceful failure before pushing the frontend activation.

A CLI alternative is to copy `wrangler.example.toml` to ignored `wrangler.toml`, fill the real D1 ID, authenticate with `wrangler login`, apply the schema to the remote database, set the secret with `wrangler secret put IP_HASH_SECRET`, and run `wrangler deploy`. Do not place API tokens or the hash secret in the public frontend.

## Verification

The active website's `tests/view-counter.test.cjs` executes the actual SQL schema against in-memory SQLite and exercises the Worker/client. Cloudflare-specific bindings, edge headers, cron execution and quotas still require live deployment verification.

Official references: [D1 batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [SQL compatibility](https://developers.cloudflare.com/d1/sql-api/sql-statements/), [visitor IP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/).