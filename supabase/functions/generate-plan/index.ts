import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { profile } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no configurada')
    }

    const client = new Anthropic({ apiKey })

    const sports = profile.sports || []
    const hasRunning = sports.includes('running')
    const hasCycling = sports.includes('cycling')

    const trainingDays = profile.trainingDays || profile.training_days || []
    const sessionDuration = profile.sessionDuration || profile.session_duration || 60

    // Compute exact week_start dates server-side
    const now = new Date()
    const jsDay = now.getDay()
    const daysToMonday = jsDay === 0 ? -6 : 1 - jsDay
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + daysToMonday)
    thisMonday.setHours(0, 0, 0, 0)

    const toISO = (d: Date) => d.toISOString().split('T')[0]
    const weekStarts = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(thisMonday)
      d.setDate(thisMonday.getDate() + i * 7)
      return toISO(d)
    })

    const todayDow = jsDay === 0 ? 6 : jsDay - 1
    const todayStr = toISO(now)

    // HR zones from fc_max
    const hrMax = profile.hr_max || 190
    const z1 = { low: Math.round(hrMax * 0.50), high: Math.round(hrMax * 0.60) }
    const z2 = { low: Math.round(hrMax * 0.60), high: Math.round(hrMax * 0.70) }
    const z3 = { low: Math.round(hrMax * 0.70), high: Math.round(hrMax * 0.80) }
    const z4 = { low: Math.round(hrMax * 0.80), high: Math.round(hrMax * 0.90) }
    const z5 = { low: Math.round(hrMax * 0.90), high: hrMax }

    // Strava section
    const stravaStats = profile.strava_stats
    const stravaSection = stravaStats ? `
DATOS REALES DE STRAVA (últimas 8 semanas):
- Km/semana running: ${stravaStats.running_weekly_km ?? 'n/d'} km
- Ritmo fácil: ${profile.running_avg_pace || stravaStats.avg_easy_pace || 'n/d'} min/km
- Carrera más larga: ${profile.running_longest_run || stravaStats.longest_run_km || 'n/d'} km
- FC media: ${profile.running_avg_hr || stravaStats.avg_heart_rate || 'n/d'} bpm
${stravaStats.cycling_weekly_km ? `- Km/semana ciclismo: ${stravaStats.cycling_weekly_km} km` : ''}` : ''

    const prompt = `Eres un entrenador personal experto. Genera un plan de entrenamiento de 4 semanas. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

PERFIL:
- Nivel: ${profile.level || 'intermedio'}
- Edad: ${profile.age || 'n/d'} | Peso: ${profile.weight || 'n/d'} kg
- Deportes: ${sports.join(', ')}
- FC máx: ${hrMax} bpm
${hasRunning ? `- Objetivo running: ${profile.runningGoal || profile.running_goal || 'mejorar forma física'}
- Km/sem actuales: ${profile.runningWeeklyKm || profile.running_weekly_km || 0} km` : ''}
${hasCycling ? `- Objetivo ciclismo: ${profile.cyclingGoal || profile.cycling_goal || 'mejorar forma física'}` : ''}
${stravaSection}

ZONAS FC DEL ATLETA (FC máx ${hrMax} bpm):
- Z1 Recuperación: ${z1.low}–${z1.high} bpm
- Z2 Aeróbico base: ${z2.low}–${z2.high} bpm
- Z3 Umbral aeróbico: ${z3.low}–${z3.high} bpm
- Z4 Umbral anaeróbico: ${z4.low}–${z4.high} bpm
- Z5 VO2max: ${z5.low}–${z5.high} bpm

DISPONIBILIDAD:
- Días (0=lun…6=dom): [${trainingDays.join(', ')}]
- Duración máx: ${sessionDuration} min
- Hoy: ${todayStr} (day_of_week=${todayDow})
${profile.goalDate || profile.goal_date ? `- Fecha objetivo: ${profile.goalDate || profile.goal_date}` : ''}
${profile.goalEvent || profile.goal_event ? `- Evento: ${profile.goalEvent || profile.goal_event}` : ''}

REGLAS DE DEPORTES: Solo puedes usar los deportes del perfil: [${sports.join(', ')}]. PROHIBIDO mezclar otros deportes.

REGLAS DE FECHAS:
- Semana 1: week_start="${weekStarts[0]}" — solo días >= ${todayDow}
- Semana 2: week_start="${weekStarts[1]}"
- Semana 3: week_start="${weekStarts[2]}"
- Semana 4: week_start="${weekStarts[3]}"
Progresión gradual de dificultad semana a semana.

REGLAS DE FUERZA: En exactamente 1 sesión por semana (la más apropiada), añade "strength" con 3-4 ejercicios de peso corporal adaptados al deporte principal.

Responde con este JSON exacto:
{
  "plan": [
    {
      "week_start": "YYYY-MM-DD",
      "sessions": [
        {
          "day_of_week": 0,
          "sport": "running",
          "session_type": "Rodaje suave",
          "description": "Resumen breve (máx 100 chars)",
          "target_distance": 5,
          "target_duration": 30,
          "target_pace": "6:00",
          "workout": {
            "warmup": ["ejercicio duración", "ejercicio duración"],
            "blocks": [
              {"label": "Nombre bloque", "detail": "detalle corto", "zone": "Z2", "bpm": "${z2.low}–${z2.high}"}
            ],
            "strength": ["Sentadillas 3×15", "Zancadas 3×10/pierna"],
            "cooldown": ["estiramiento duración", "estiramiento duración"]
          }
        }
      ]
    }
  ]
}

REGLAS WORKOUT:
- warmup: 2-3 ejercicios de movilidad específicos para el tipo de sesión
- blocks: 2-4 bloques (calentamiento trote / trabajo principal / vuelta calma). Usa las zonas FC reales del atleta
- strength: solo en 1 sesión/semana. Peso corporal: sentadillas, zancadas, plancha, fondos, etc.
- cooldown: 2-3 estiramientos específicos post-sesión
- Textos MUY concisos (máx 35 chars por item de warmup/cooldown, máx 40 chars en detail de blocks)
- Para ciclismo: sin target_pace. Para running: target_pace en "M:SS"
- Todos los valores numéricos como números, no strings`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()

    // Extract JSON robustly
    let jsonText = text
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = text.slice(firstBrace, lastBrace + 1)
    }

    const result = JSON.parse(jsonText)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-plan error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
