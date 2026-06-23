import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function mpsToMinKm(mps: number): string {
  if (!mps || mps <= 0) return ''
  const secPerKm = 1000 / mps
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
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
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }),
    })
    if (!tokenRes.ok) throw new Error(`Strava token exchange failed: ${await tokenRes.text()}`)
    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_at, athlete } = tokenData

    // Fetch athlete stats
    const statsRes = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const stats = statsRes.ok ? await statsRes.json() : null

    // Fetch last 8 weeks of activities
    const eightWeeksAgo = Math.floor((Date.now() - 56 * 24 * 60 * 60 * 1000) / 1000)
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${eightWeeksAgo}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    const activities = activitiesRes.ok ? await activitiesRes.json() : []

    // Calculate rich metrics from activities
    const runs = Array.isArray(activities) ? activities.filter((a: any) => a.type === 'Run' || a.type === 'TrailRun') : []
    const rides = Array.isArray(activities) ? activities.filter((a: any) => a.type === 'Ride' || a.type === 'VirtualRide') : []

    // Weekly km (last 4 weeks) — prefer own calculation, fall back to Strava stats
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000
    const recentRuns = runs.filter((a: any) => new Date(a.start_date).getTime() > fourWeeksAgo)
    const recentRunKm = recentRuns.length > 0
      ? Math.round(recentRuns.reduce((s: number, a: any) => s + a.distance, 0) / 1000 / 4)
      : (stats?.recent_run_totals?.distance ? Math.round(stats.recent_run_totals.distance / 1000 / 4) : null)

    const recentRides = rides.filter((a: any) => new Date(a.start_date).getTime() > fourWeeksAgo)
    const recentRideKm = recentRides.length > 0
      ? Math.round(recentRides.reduce((s: number, a: any) => s + a.distance, 0) / 1000 / 4)
      : null

    // Average easy pace (all runs with speed data)
    const runsWithSpeed = runs.filter((a: any) => a.average_speed && a.average_speed > 0 && a.distance > 3000)
    const easyRuns = runsWithSpeed.filter((a: any) => a.average_speed < 3.5) // slower than ~4:45/km
    const paceRuns = easyRuns.length > 0 ? easyRuns : runsWithSpeed
    const avgPace = paceRuns.length > 0
      ? mpsToMinKm(paceRuns.reduce((s: number, a: any) => s + a.average_speed, 0) / paceRuns.length)
      : null

    // Longest run (km)
    const longestRun = runs.length > 0
      ? Math.round(Math.max(...runs.map((a: any) => a.distance || 0)) / 100) / 10
      : (stats?.biggest_ride_distance ? null : null) // runs only

    // Average heart rate
    const runsWithHr = runs.filter((a: any) => a.average_heartrate && a.average_heartrate > 0)
    const avgHr = runsWithHr.length > 0
      ? Math.round(runsWithHr.reduce((s: number, a: any) => s + a.average_heartrate, 0) / runsWithHr.length)
      : null

    // Preferred training days (0=Mon...6=Sun)
    const allActivities = [...runs, ...rides]
    const dayCount: Record<number, number> = {}
    allActivities.forEach((a: any) => {
      const d = new Date(a.start_date_local || a.start_date)
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
      dayCount[dow] = (dayCount[dow] || 0) + 1
    })
    const preferredDays = Object.entries(dayCount)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(e => parseInt(e[0]))
      .sort()

    // Age from birthday
    let age: number | null = null
    if (athlete.birthday) {
      const birth = new Date(athlete.birthday)
      age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    const ytdRunKm = stats?.ytd_run_totals?.distance ? Math.round(stats.ytd_run_totals.distance / 1000) : null
    const ytdRideKm = stats?.ytd_ride_totals?.distance ? Math.round(stats.ytd_ride_totals.distance / 1000) : null

    const stravaStats = {
      athlete_name: `${athlete.firstname} ${athlete.lastname}`,
      city: athlete.city || null,
      country: athlete.country || null,
      weight: athlete.weight || null,
      age,
      running_weekly_km: recentRunKm,
      cycling_weekly_km: recentRideKm,
      avg_easy_pace: avgPace,
      longest_run_km: longestRun,
      avg_heart_rate: avgHr,
      preferred_training_days: preferredDays.length > 0 ? preferredDays : null,
      total_runs_8w: runs.length,
      total_rides_8w: rides.length,
      ytd_run_km: ytdRunKm,
      ytd_ride_km: ytdRideKm,
    }

    // Save to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const updateData: any = {
      strava_connected: true,
      strava_athlete_id: athlete.id,
      strava_access_token: access_token,
      strava_refresh_token: refresh_token,
      strava_expires_at: expires_at,
      strava_stats: stravaStats,
    }
    if (recentRunKm) updateData.running_weekly_km = recentRunKm
    if (avgPace) updateData.running_avg_pace = avgPace
    if (longestRun) updateData.running_longest_run = longestRun
    if (avgHr) updateData.running_avg_hr = avgHr
    if (athlete.weight) updateData.weight = athlete.weight
    if (age) updateData.age = age
    if (preferredDays.length > 0) updateData.preferred_training_days = preferredDays

    const { error } = await supabase.from('profiles').update(updateData).eq('id', userId)
    if (error) throw error

    return new Response(JSON.stringify({ ok: true, athlete: { id: athlete.id, name: stravaStats.athlete_name }, stravaStats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
