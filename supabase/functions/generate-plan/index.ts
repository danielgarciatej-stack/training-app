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

    // Compute exact week_start dates server-side so Claude can't invent them
    const now = new Date()
    const jsDay = now.getDay() // 0=Sun, 1=Mon...
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

    // Today's day_of_week in 0=Mon...6=Sun format
    const todayDow = jsDay === 0 ? 6 : jsDay - 1
    const todayStr = toISO(now)

    // Build Strava data section if available
    const stravaStats = profile.strava_stats
    const stravaSection = stravaStats ? `
DATOS REALES DE STRAVA (últimas 8 semanas, muy importantes para calibrar el plan):
- Km/semana reales (running): ${stravaStats.running_weekly_km ?? 'n/d'} km
- Ritmo fácil real: ${profile.running_avg_pace || stravaStats.avg_easy_pace || 'n/d'} min/km
- Carrera más larga: ${profile.running_longest_run || stravaStats.longest_run_km || 'n/d'} km
- FC media: ${profile.running_avg_hr || stravaStats.avg_heart_rate || 'n/d'} bpm
- Total carreras (8 sem): ${stravaStats.total_runs_8w ?? 'n/d'}
- Km año (running): ${stravaStats.ytd_run_km ?? 'n/d'} km
${stravaStats.cycling_weekly_km ? `- Km/semana reales (ciclismo): ${stravaStats.cycling_weekly_km} km` : ''}
Usa estos datos para fijar ritmos, volumen y progresión realistas.` : ''

    const prompt = `Eres un entrenador personal experto en running y ciclismo. Genera un plan de entrenamiento personalizado de 4 semanas. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

PERFIL DEL ATLETA:
- Nombre: ${profile.name || 'Atleta'}
- Nivel: ${profile.level || 'intermedio'}
- Edad: ${profile.age || 'no especificada'}
- Peso: ${profile.weight || 'no especificado'} kg
- Deportes: ${sports.join(', ')}
${hasRunning ? `
RUNNING:
- Objetivo: ${profile.runningGoal || profile.running_goal || 'mejorar forma física'}
- Km semanales actuales: ${profile.runningWeeklyKm || profile.running_weekly_km || 0} km
` : ''}
${hasCycling ? `
CICLISMO:
- Objetivo: ${profile.cyclingGoal || profile.cycling_goal || 'mejorar forma física'}
- Km semanales actuales: ${profile.cyclingWeeklyKm || profile.cycling_weekly_km || 0} km
` : ''}
${stravaSection}
DISPONIBILIDAD:
- Días disponibles (0=lun, 1=mar, 2=mié, 3=jue, 4=vie, 5=sáb, 6=dom): [${trainingDays.join(', ')}]
- Duración máxima por sesión: ${sessionDuration} minutos
- Hoy es: ${todayStr} (day_of_week=${todayDow})
${profile.goalDate || profile.goal_date ? `- Fecha objetivo: ${profile.goalDate || profile.goal_date}` : ''}
${profile.goalEvent || profile.goal_event ? `- Evento objetivo: ${profile.goalEvent || profile.goal_event}` : ''}

INSTRUCCIONES CRÍTICAS DE DEPORTES — MUY IMPORTANTE:
Solo puedes generar sesiones de estos deportes: [${sports.join(', ')}].
PROHIBIDO incluir cualquier otro deporte. Si solo hay running, todas las sesiones deben ser de running. Si solo hay cycling, todas de ciclismo. No mezcles deportes no seleccionados.

INSTRUCCIONES CRÍTICAS DE FECHAS — NO LAS IGNORES:
Usa EXACTAMENTE estas fechas de inicio de semana, no inventes otras:
- Semana 1: week_start="${weekStarts[0]}"
- Semana 2: week_start="${weekStarts[1]}"
- Semana 3: week_start="${weekStarts[2]}"
- Semana 4: week_start="${weekStarts[3]}"

En la semana 1, incluye sesiones SOLO para días con day_of_week >= ${todayDow} (incluyendo hoy si está disponible).
En las semanas 2, 3 y 4, incluye sesiones en todos los días disponibles del atleta.
Las semanas deben progresar gradualmente en dificultad (semana 1 más ligera, semana 4 más exigente).

Responde con este JSON:
{
  "plan": [
    {
      "week_start": "YYYY-MM-DD",
      "sessions": [
        {
          "day_of_week": 0,
          "sport": "running",
          "session_type": "Rodaje suave",
          "description": "Descripción detallada del entrenamiento con instrucciones claras",
          "target_distance": 5,
          "target_duration": 30,
          "target_pace": "6:00"
        }
      ]
    }
  ]
}

Para ciclismo: target_distance (km), target_duration (min), sin target_pace.
Para running: target_distance (km), target_duration (min), target_pace ("M:SS" ej "6:00").
Todos los valores numéricos deben ser números, no strings.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()

    // Extract JSON (handle cases where model adds markdown code blocks)
    let jsonText = text
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonText = match[1].trim()
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
