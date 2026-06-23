export function calculateLevel(profile) {
  const levels = []
  const sports = profile.sports || []

  const get = (snake, camel) => parseFloat(profile[snake] ?? profile[camel]) || 0

  if (sports.includes('running')) {
    const km = get('running_weekly_km', 'runningWeeklyKm')
    const paceStr = profile.running_pace || profile.runningPace || ''
    const [min, sec] = paceStr.split(':').map(Number)
    const pace = min + (sec || 0) / 60

    if (km > 50 || (pace > 0 && pace < 5.5)) levels.push('gold')
    else if (km >= 20 && (pace === 0 || pace <= 7)) levels.push('silver')
    else levels.push('bronze')
  }

  if (sports.includes('cycling')) {
    const km = get('cycling_weekly_km', 'cyclingWeeklyKm')
    const speed = get('cycling_speed', 'cyclingSpeed')

    if (km > 200 || speed > 33) levels.push('gold')
    else if (km >= 80 || speed >= 25) levels.push('silver')
    else levels.push('bronze')
  }

  if (levels.length === 0) return 'bronze'
  if (levels.includes('gold')) return 'gold'
  if (levels.includes('silver')) return 'silver'
  return 'bronze'
}

export const LEVEL_CONFIG = {
  bronze: { label: 'Bronce', emoji: '🥉', color: 'text-amber-500' },
  silver: { label: 'Plata', emoji: '🥈', color: 'text-gray-300' },
  gold: { label: 'Oro', emoji: '🥇', color: 'text-yellow-400' },
}
