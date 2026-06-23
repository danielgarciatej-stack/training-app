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

    const startDate = profile.startDate || profile.start_date || new Date().toISOString().split('T')[0]
    const trainingDays = profile.trainingDays || profile.training_days || []
    const sessionDuration = profile.sessionDuration || profile.session_duration || 60

    const prompt = `Eres un entrenador personal experto en running y ciclismo. Genera un plan de entrenamiento personalizado de 4 semanas para el siguiente atleta. Responde ÚNICAMENTE con JSON válido, sin texto adicional.

PERFIL DEL ATLETA:
- Nombre: ${profile.name || 'Atleta'}
- Edad: ${profile.age || 'no especificada'}
- Peso: ${profile.weight || 'no especificado'} kg
- Deportes: ${sports.join(', ')}
${hasRunning ? `
RUNNING:
- Objetivo: ${profile.runningGoal || profile.running_goal || 'mejorar forma física'}
- Ritmo habitual: ${profile.runningPace || profile.running_pace || 'no especificado'} min/km
- Km semanales actuales: ${profile.runningWeeklyKm || profile.running_weekly_km || 0} km
- Distancia más larga reciente: ${profile.runningLongestRun || profile.running_longest_run || 0} km
` : ''}
${hasCycling ? `
CICLISMO:
- Objetivo: ${profile.cyclingGoal || profile.cycling_goal || 'mejorar forma física'}
- Velocidad media: ${profile.cyclingSpeed || profile.cycling_speed || 0} km/h
- Km semanales actuales: ${profile.cyclingWeeklyKm || profile.cycling_weekly_km || 0} km
- Salida más larga: ${profile.cyclingLongestRide || profile.cycling_longest_ride || 0} km
- FTP: ${profile.cyclingFTP || profile.cycling_ftp || 'no especificado'} W
` : ''}
DISPONIBILIDAD:
- Días de entrenamiento (0=lunes, 1=martes, 2=miércoles, 3=jueves, 4=viernes, 5=sábado, 6=domingo): ${trainingDays.join(', ')}
- Duración máxima por sesión: ${sessionDuration} minutos
- Fecha de inicio del plan: ${startDate}
${profile.goalDate || profile.goal_date ? `- Fecha objetivo: ${profile.goalDate || profile.goal_date}` : ''}
${profile.goalEvent || profile.goal_event ? `- Evento objetivo: ${profile.goalEvent || profile.goal_event}` : ''}

Genera exactamente 4 semanas de plan. Para cada semana, incluye sesiones SOLO en los días disponibles del atleta. Las semanas deben progresar gradualmente en dificultad.

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
          "description": "Descripción detallada del entrenamiento",
          "target_distance": 5,
          "target_duration": 30,
          "target_pace": "6:00"
        }
      ]
    }
  ]
}

Para ciclismo: incluye target_distance (km), target_duration (min), omite target_pace.
Para running: incluye target_distance (km), target_duration (min), target_pace (min/km como "6:00").
Los valores numéricos deben ser números, no strings.
week_start debe ser el lunes de cada semana en formato YYYY-MM-DD.`

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
