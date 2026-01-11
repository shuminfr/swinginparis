# Calendar proxy (Cloudflare Worker)

This worker keeps your Google Calendar API key off the frontend. The site calls the worker at `/events`.

## Deploy with Wrangler
1. `cd worker`
2. `wrangler login`
3. `wrangler deploy`
4. Set secrets:
   - `wrangler secret put GCAL_API_KEY`
   - `wrangler secret put CALENDAR_IDS`
   - Optional: `wrangler secret put TIME_ZONE` (default: Europe/Paris)

### CALENDAR_IDS
Use a comma-separated list of calendar IDs.
A helper list is in `worker/calendar-ids.txt`.

Example:
```
wrangler secret put CALENDAR_IDS
```
Then paste a comma-separated list like:
```
inswingwetrust@gmail.com,fl1c5sm2ocbs07hk54sadtq7qc@group.calendar.google.com
```

## Frontend hook
Update `data-api` in `index.html` to your worker URL:
```
https://your-worker.your-subdomain.workers.dev/events
```

## Endpoint
`GET /events?start=ISO&end=ISO`

Returns:
```
{ "events": [ { "title": "...", "start": "...", "end": "...", "allDay": true, "location": "", "link": "" } ] }
```
