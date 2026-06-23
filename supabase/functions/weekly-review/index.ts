import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { profile, prevWeekSessions, nextWeekSessions, prevWeekStart } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

    const client = new Anthropic({ apiKey })

    const sessionSummary = prevWeekSessions.map((s: any) => {
      const done = s.status === 'completed'
      const lines = [`- ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][s.day_of_week]}: ${s.session_type} (${s.sport})`]
      lines.push(`  Planificado: ${s.target_distance || '?'} km / ${s.target_duration || '?'} min${s.target_pace ? ` / ${s.target_pace}/km` : ''}`)
      if (done) {
        lines.push(`  Real: ${s.actual_distance || s.target_distance || '?'} km / ${s.actual_duration || s.target_duration || '?'} min${s.actual_pace ? ` / ${s.actual_pace}/km` : ''} ✓`)
      } else {
        lines.push(`  No completada ✗`)
      }
      return lines.join('\n')
    }).join('\n')

    const nextWeekSummary = nextWeekSessions.map((s: any) =>
      `- ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][s.day_of_week]}: ${s.session_type} | ${s.target_distance || '?'} km / ${s.target_duration || '?'} min${s.target_pace ? ` / ${s.target_pace}/km` : ''} | week_start: ${s.week_start} | id: ${s.id}`
    ).join('\n')

    const completedCount = prevWeekSessions.filter((s: any) => s.status === 'completed').length
    const totalCount = prevWeekSessions.length

    const prompt = `Eres un entrenador personal experto. Analiza la semana de entrenamiento y ajusta el plan de la próxima semana. Responde ÚNICAMENTE con JSON válido, sin texto adicional.

ATLETA: ${profile.name || 'Atleta'} | Nivel: ${profile.level || 'principiante'} | Deporte: ${(profile.sports || ['running']).join(', ')}

SEMANA COMPLETADA (${completedCount}/${totalCount} sesiones):
${sessionSummary}

PLAN PRÓXIMA SEMANA (a ajustar):
${nextWeekSummary}

Instrucciones:
1. Analiza el rendimiento real vs planificado
2. Si el atleta superó el plan → aumenta ligeramente la carga (5-10% más distancia/ritmo)
3. Si el atleta cumplió el plan → mantén progresión normal
4. Si el atleta no completó sesiones o rindió por debajo → reduce carga o mantén igual
5. Ajusta las sesiones de la próxima semana según el análisis
6. El resumen debe ser en español, cercano y motivador (2-3 frases)
7. El feedback debe ser específico y práctico (1-2 frases)

Responde con este JSON exacto:
{
  "summary": "Resumen motivador de cómo fue la semana...",
  "feedback": "Consejo específico para la próxima semana...",
  "performance": "above" | "on_track" | "below",
  "adjustedSessions": [
    {
      "id": "el mismo id del plan original",
      "session_type": "nombre",
      "description": "descripción actualizada",
      "target_distance": 5,
      "target_duration": 30,
      "target_pace": "6:00"
    }
  ]
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].text.trim()
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
    console.error('weekly-review error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
