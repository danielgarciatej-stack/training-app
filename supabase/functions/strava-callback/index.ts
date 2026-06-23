import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { code, userId } = await req.json()
    if (!code || !userId) throw new Error('Missing code or userId')

    const clientId = Deno.env.get('STRAVA_CLIENT_ID')
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

    // Exchange code for tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Strava token exchange failed: ${err}`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_at, athlete } = tokenData

    // Fetch athlete stats for plan context
    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const stats = statsRes.ok ? await statsRes.json() : null

    // Save to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const recentRunKm = stats?.recent_run_totals?.distance
      ? Math.round(stats.recent_run_totals.distance / 1000 / 4)
      : null

    const { error } = await supabase.from('profiles').update({
      strava_connected: true,
      strava_athlete_id: athlete.id,
      strava_access_token: access_token,
      strava_refresh_token: refresh_token,
      strava_expires_at: expires_at,
      // Update fitness data from Strava
      ...(recentRunKm ? { running_weekly_km: recentRunKm } : {}),
    }).eq('id', userId)

    if (error) throw error

    return new Response(JSON.stringify({
      ok: true,
      athlete: {
        id: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
        profile: athlete.profile_medium,
        city: athlete.city,
        country: athlete.country,
      },
      weeklyKm: recentRunKm,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
