const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300"
    }
  });
}

function parseCalendarIds(value) {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchCalendarEvents(calendarId, apiKey, timeMin, timeMax, timeZone) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "2500");
  url.searchParams.set("timeZone", timeZone);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Fetch failed for ${calendarId}`);
  }

  const data = await response.json();
  return data.items || [];
}

function mapEvent(event) {
  const startValue = event.start?.dateTime || event.start?.date;
  const endValue = event.end?.dateTime || event.end?.date;
  if (!startValue || !endValue) return null;

  const allDay = Boolean(event.start?.date);
  const start = event.start?.dateTime || `${event.start.date}T00:00:00`;
  const end = event.end?.dateTime || `${event.end.date}T00:00:00`;

  return {
    title: event.summary || "",
    start,
    end,
    allDay,
    location: event.location || "",
    link: event.htmlLink || ""
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (url.pathname !== "/events") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const timeMin = url.searchParams.get("start");
    const timeMax = url.searchParams.get("end");

    if (!timeMin || !timeMax) {
      return jsonResponse({ error: "Missing start or end" }, 400);
    }

    const apiKey = env.GCAL_API_KEY || "";
    const calendarIds = parseCalendarIds(env.CALENDAR_IDS || "");
    const timeZone = env.TIME_ZONE || "Europe/Paris";

    if (!apiKey) {
      return jsonResponse({ error: "Missing API key" }, 500);
    }

    if (!calendarIds.length) {
      return jsonResponse({ error: "Missing calendar ids" }, 500);
    }

    try {
      const results = await Promise.all(
        calendarIds.map((id) => fetchCalendarEvents(id, apiKey, timeMin, timeMax, timeZone).catch(() => []))
      );

      const events = results.flat().map(mapEvent).filter(Boolean);
      events.sort((a, b) => a.start.localeCompare(b.start));

      return jsonResponse({ events });
    } catch (error) {
      return jsonResponse({ error: "Failed to load events" }, 500);
    }
  }
};
