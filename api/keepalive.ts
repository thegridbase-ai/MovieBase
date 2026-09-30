// Daily keep-alive for the Supabase free tier.
//
// Supabase pauses free projects after 7 days without activity, which silently
// broke login once already. A Vercel cron (see vercel.json) hits this function
// every day; it runs one tiny PostgREST query so the database sees traffic.
// Only a status flag is returned — no row data leaves the function.

export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return Response.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/favorites?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return Response.json(
      { ok: res.ok, status: res.status, at: new Date().toISOString() },
      { status: res.ok ? 200 : 502, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ ok: false, error: 'Supabase unreachable' }, { status: 502 });
  }
}
