import { useState } from 'react'
import { Trophy, Users, Swords, Plus } from 'lucide-react'

const LEVEL_STYLES = {
  bronze: { label: 'Bronce', emoji: '🥉', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  silver: { label: 'Plata', emoji: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/10 border-gray-500/20' },
  gold: { label: 'Oro', emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
}

const MOCK_RANKING = [
  { pos: 1, name: 'Carlos M.', level: 'gold', km: 89.4, pace: '5:12' },
  { pos: 2, name: 'Ana G.', level: 'gold', km: 76.2, pace: '5:28' },
  { pos: 3, name: 'Lucía R.', level: 'silver', km: 68.5, pace: '5:45' },
  { pos: 4, name: 'Tú', level: 'bronze', km: 52.3, pace: '6:07', isMe: true },
  { pos: 5, name: 'Marcos T.', level: 'bronze', km: 48.1, pace: '6:15' },
  { pos: 6, name: 'Sara L.', level: 'bronze', km: 41.0, pace: '6:32' },
]

const MOCK_CHALLENGES = [
  { from: 'Ana G.', metric: 'más km esta semana', ends: '3 días', status: 'active' },
  { from: 'Marcos T.', metric: 'mejor ritmo en 5K', ends: 'Terminado', result: 'Ganaste 🏆', status: 'won' },
]

const posIcon = (pos) => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`

export default function Rankings() {
  const [tab, setTab] = useState('global')
  const [sport, setSport] = useState('running')
  const [level, setLevel] = useState('bronze')
  const [period, setPeriod] = useState('mes')

  const me = MOCK_RANKING.find(u => u.isMe)

  return (
    <div className="flex flex-col min-h-screen bg-[#111111]">
      <div className="bg-[#111111] border-b border-[#2c2c2e] p-4 pt-6">
        <h1 className="text-2xl font-bold text-white mb-4">Rankings</h1>

        <div className="flex gap-2 mb-3">
          {[
            { value: 'running', emoji: '🏃', label: 'Running' },
            { value: 'cycling', emoji: '🚴', label: 'Ciclismo' },
          ].map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => setSport(value)}
              className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                sport === value
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-[#3c3c3e] bg-[#1c1c1e] text-[#8e8e93]'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        <div className="flex bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-1">
          {[
            { value: 'global', icon: Trophy, label: 'Global' },
            { value: 'groups', icon: Users, label: 'Grupos' },
            { value: 'challenges', icon: Swords, label: 'Retos' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === value ? 'bg-[#3c3c3e] text-white' : 'text-[#8e8e93]'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {tab === 'global' && (
          <>
            <div className="flex gap-2">
              <div className="flex bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-1 flex-1">
                {[['bronze', 'Bronce'], ['silver', 'Plata'], ['gold', 'Oro']].map(([key, lbl]) => (
                  <button
                    key={key}
                    onClick={() => setLevel(key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      level === key ? 'bg-[#3c3c3e] text-white' : 'text-[#8e8e93]'
                    }`}
                  >
                    {LEVEL_STYLES[key].emoji} {lbl}
                  </button>
                ))}
              </div>
              <div className="flex bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-1">
                {['sem', 'mes'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === p ? 'bg-[#3c3c3e] text-white' : 'text-[#8e8e93]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {me && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                <p className="text-orange-500 text-xs uppercase tracking-widest mb-2">Tu posición</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-orange-500">#{me.pos}</span>
                  <div className="flex-1">
                    <p className="font-bold text-white">{me.km} km</p>
                    <p className="text-xs text-[#8e8e93]">{me.pace} min/km promedio</p>
                  </div>
                  <p className="text-xs text-[#8e8e93] text-right">+3.2 km para<br />subir al #3</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {MOCK_RANKING.map(({ pos, name, level: lv, km, pace, isMe }) => {
                const lStyle = LEVEL_STYLES[lv]
                return (
                  <div
                    key={pos}
                    className={`flex items-center gap-3 p-4 rounded-2xl border ${
                      isMe
                        ? 'bg-orange-500/10 border-orange-500/20'
                        : 'bg-[#1c1c1e] border-[#2c2c2e]'
                    }`}
                  >
                    <span className={`w-7 text-center font-bold ${pos <= 3 ? 'text-lg' : 'text-sm text-[#8e8e93]'}`}>
                      {posIcon(pos)}
                    </span>
                    <div className="flex-1">
                      <p className={`font-semibold ${isMe ? 'text-orange-400' : 'text-white'}`}>
                        {name} {isMe && '(Tú)'}
                      </p>
                      <p className="text-xs text-[#8e8e93]">{pace} min/km</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{km} km</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${lStyle.bg} ${lStyle.color}`}>
                        {lStyle.emoji} {lStyle.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'groups' && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Users size={48} className="text-[#3c3c3e]" />
            <p className="text-[#8e8e93] text-center">Aún no perteneces a ningún grupo privado</p>
            <button className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold">
              <Plus size={18} /> Crear o unirse a un grupo
            </button>
          </div>
        )}

        {tab === 'challenges' && (
          <div className="flex flex-col gap-3">
            <button className="flex items-center justify-center gap-2 border border-dashed border-orange-500/40 text-orange-500 py-3 rounded-2xl font-semibold">
              <Plus size={18} /> Crear un reto
            </button>
            {MOCK_CHALLENGES.map((c, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border ${
                  c.status === 'won'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-[#1c1c1e] border-[#2c2c2e]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-white">Reto de {c.from}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    c.status === 'won'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {c.status === 'won' ? 'Terminado' : 'Activo'}
                  </span>
                </div>
                <p className="text-sm text-[#8e8e93] mb-2">Quién consigue {c.metric}</p>
                {c.result && <p className="text-green-400 font-bold">{c.result}</p>}
                {c.status === 'active' && (
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 border border-[#3c3c3e] py-2 rounded-xl text-sm font-semibold text-[#8e8e93]">
                      Rechazar
                    </button>
                    <button className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold">
                      Aceptar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
