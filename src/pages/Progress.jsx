import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const KM_DATA = [
  { week: 'S1', km: 12 }, { week: 'S2', km: 15 }, { week: 'S3', km: 18 },
  { week: 'S4', km: 14 }, { week: 'S5', km: 22 }, { week: 'S6', km: 25 },
  { week: 'S7', km: 28 }, { week: 'S8', km: 26 },
]

const PACE_DATA = [
  { week: 'S1', pace: 6.5 }, { week: 'S2', pace: 6.3 }, { week: 'S3', pace: 6.2 },
  { week: 'S4', pace: 6.4 }, { week: 'S5', pace: 6.1 }, { week: 'S6', pace: 5.9 },
  { week: 'S7', pace: 5.8 }, { week: 'S8', pace: 5.7 },
]

const MILESTONES = [
  { emoji: '🎯', label: 'Primer 5K completado', date: 'Semana 2', done: true },
  { emoji: '⏱️', label: 'Primera hora corriendo', date: 'Semana 4', done: true },
  { emoji: '🏅', label: '4 semanas seguidas', date: 'Semana 4', done: true },
  { emoji: '🎯', label: 'Primer 10K', date: 'Pendiente', done: false },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#2c2c2e] border border-[#3c3c3e] rounded-lg px-3 py-2">
        <p className="text-[#8e8e93] text-xs">{label}</p>
        <p className="text-white font-bold text-sm">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export default function Progress() {
  const [period, setPeriod] = useState('mes')
  const [sport, setSport] = useState('running')

  return (
    <div className="p-5 pt-6 flex flex-col gap-5 pb-6 bg-[#111111] min-h-screen">
      <h1 className="text-2xl font-bold text-white">Mi progreso</h1>

      <div className="flex gap-2">
        <div className="flex bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-1 flex-1">
          {['semana', 'mes', 'todo'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                period === p ? 'bg-[#3c3c3e] text-white' : 'text-[#8e8e93]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-1">
          {[{ v: 'running', e: '🏃' }, { v: 'cycling', e: '🚴' }].map(({ v, e }) => (
            <button
              key={v}
              onClick={() => setSport(v)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                sport === v ? 'bg-[#3c3c3e] text-white' : 'text-[#8e8e93]'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'KM TOTALES', value: '179 km', color: 'text-orange-500' },
          { label: 'TIEMPO TOTAL', value: '18h 40m', color: 'text-blue-400' },
          { label: 'ENTRENAMIENTOS', value: '28 / 32', color: 'text-green-400' },
          { label: 'DESNIVEL', value: '1.240 m', color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4">
            <p className="text-[#8e8e93] text-[10px] tracking-widest mb-2">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4">
        <p className="text-[#8e8e93] text-xs uppercase tracking-widest mb-4">Km por semana</p>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={KM_DATA}>
            <defs>
              <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="km" stroke="#f97316" fill="url(#kmGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4">
        <p className="text-[#8e8e93] text-xs uppercase tracking-widest mb-4">Ritmo (min/km)</p>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={PACE_DATA}>
            <defs>
              <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
            <YAxis reversed tick={{ fontSize: 10, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="pace" stroke="#60a5fa" fill="url(#paceGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-4">
        <p className="text-[#8e8e93] text-xs uppercase tracking-widest mb-3">Hitos</p>
        <div className="flex flex-col gap-2">
          {MILESTONES.map(({ emoji, label, date, done }) => (
            <div
              key={label}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                done ? 'bg-green-500/10 border border-green-500/20' : 'bg-[#111111] border border-[#2c2c2e]'
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${done ? 'text-white' : 'text-[#8e8e93]'}`}>{label}</p>
                <p className="text-xs text-[#8e8e93]">{date}</p>
              </div>
              {done && <span className="text-green-400 text-sm font-bold">✓</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
        <p className="text-orange-500 text-xs uppercase tracking-widest mb-2">Análisis del entrenador</p>
        <p className="text-orange-200/80 text-sm leading-relaxed">
          Llevas 8 semanas de progreso constante. Tu ritmo ha mejorado 0.8 min/km desde el inicio.
          La próxima semana subiremos el volumen un 10% — estás listo para ello.
        </p>
      </div>
    </div>
  )
}
