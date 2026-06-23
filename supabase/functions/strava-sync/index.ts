import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function refreshStravaToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Strava token')
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('Missing userId')

    const clientId = Deno.env.get('STRAVA_CLIENT_ID')!
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')!

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user profile with Strava tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('strava_access_token, strava_refresh_token, strava_expires_at, strava_athlete_id, sports')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.strava_access_token) throw new Error('Strava not connected')

    // Refresh token if expired
    let accessToken = profile.strava_access_token
    const nowSecs = Math.floor(Date.now() / 1000)
    if (profile.strava_expires_at && profile.strava_expires_at < nowSecs + 300) {
      const refreshed = await refreshStravaToken(profile.strava_refresh_token, clientId, clientSecret)
      accessToken = refreshed.access_token
      await supabase.from('profiles').update({
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_expires_at: refreshed.expires_at,
      }).eq('id', userId)
    }

    // Fetch activities from last 12 weeks
    const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 84
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${since}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!activitiesRes.ok) throw new Error('Failed to fetch Strava activities')
    const activities = await activitiesRes.json()

    // Get user's plan sessions
    const { data: sessions } = await supabase
      .from('plan_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (!sessions?.length) {
      return new Response(JSON.stringify({ ok: true, synced: 0, activities: activities.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Match activities to plan sessions by date and sport type
    const SPORT_MAP: Record<string, string[]> = {
      running: ['Run', 'TrailRun', 'VirtualRun'],
      cycling: ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide'],
    }

    let synced = 0
    for (const activity of activities) {
      const activityDate = activity.start_date_local.split('T')[0]
      const activityDow = new Date(activityDate).getDay()
      const dow = activityDow === 0 ? 6 : activityDow - 1

      // Find a matching pending session (same week + same day of week + same sport)
      const activityWeekStart = getWeekStart(activityDate)
      const userSport = profile.sports?.[0] || 'running'
      const matchingTypes = SPORT_MAP[userSport] || SPORT_MAP.running

      if (!matchingTypes.includes(activity.type)) continue

      const match = sessions.find(s =>
        s.week_start === activityWeekStart && s.day_of_week === dow && s.status === 'pending'
      )

      if (match) {
        const distanceKm = Math.round((activity.distance / 1000) * 10) / 10
        const durationMin = Math.round(activity.moving_time / 60)
        const paceSecPerKm = activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : 0
        const paceMin = Math.floor(paceSecPerKm / 60)
        const paceSec = Math.round(paceSecPerKm % 60)
        const paceStr = activity.distance > 0 ? `${paceMin}:${String(paceSec).padStart(2, '0')}/km` : null

        await supabase.from('plan_sessions').update({
          status: 'completed',
          actual_distance: distanceKm,
          actual_duration: durationMin,
          actual_pace: paceStr,
          strava_activity_id: activity.id,
          completed_at: activity.start_date,
        }).eq('id', match.id)

        synced++
      }
    }

    return new Response(JSON.stringify({ ok: true, synced, activities: activities.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
