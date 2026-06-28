const mono = { fontFamily: "'JetBrains Mono', monospace" }

const ZONE_COLORS = {
  'Z1': '#4a9eff',
  'Z1-Z2': '#4a9eff',
  'Z2': '#22d3c8',
  'Z2-Z3': '#22d3c8',
  'Z3': '#f59e0b',
  'Z3-Z4': '#f59e0b',
  'Z4': '#c8ff3c',
  'Z4-Z5': '#ff8c42',
  'Z5': '#ff4444',
}

function zoneColor(zone) {
  return ZONE_COLORS[zone] || '#6b7075'
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.12em', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}

export default function WorkoutDetail({ workout, description }) {
  if (!workout) {
    if (!description) return null
    return (
      <div style={{ background: '#131417', border: '1px solid #1c1f23', borderRadius: '14px', padding: '14px 16px', marginBottom: '14px' }}>
        <div style={{ ...mono, fontSize: '9px', color: '#6b7075', letterSpacing: '0.12em', marginBottom: '8px' }}>DESCRIPCIÓN</div>
        <div style={{ fontSize: '13px', color: '#9a9ea2', lineHeight: 1.6 }}>{description}</div>
      </div>
    )
  }

  const { warmup, blocks, strength, cooldown } = workout

  return (
    <div style={{ marginBottom: '14px' }}>

      {/* Warmup */}
      {warmup?.length > 0 && (
        <Section label="CALENTAMIENTO">
          <div style={{ background: '#131417', border: '1px solid #1c1f23', borderRadius: '12px', padding: '12px 14px' }}>
            {warmup.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: i < warmup.length - 1 ? '8px' : 0, marginBottom: i < warmup.length - 1 ? '8px' : 0, borderBottom: i < warmup.length - 1 ? '1px solid #1c1f23' : 'none' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4a9eff', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#9a9ea2' }}>{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Blocks */}
      {blocks?.length > 0 && (
        <Section label="ESTRUCTURA">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {blocks.map((block, i) => {
              const color = zoneColor(block.zone)
              return (
                <div key={i} style={{ background: '#131417', border: '1px solid #232629', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '3px', height: '38px', background: color, borderRadius: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f2f3f0', marginBottom: '2px' }}>{block.label}</div>
                    {block.detail && <div style={{ fontSize: '11px', color: '#6b7075' }}>{block.detail}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color }}>{block.zone}</div>
                    {block.bpm && <div style={{ ...mono, fontSize: '10px', color: '#5a5f64', marginTop: '2px' }}>{block.bpm} bpm</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Strength */}
      {strength?.length > 0 && (
        <Section label="FUERZA · PESO CORPORAL">
          <div style={{ background: '#131417', border: '1px solid #1c1f23', borderRadius: '12px', padding: '12px 14px' }}>
            {strength.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: i < strength.length - 1 ? '8px' : 0, marginBottom: i < strength.length - 1 ? '8px' : 0, borderBottom: i < strength.length - 1 ? '1px solid #1c1f23' : 'none' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff8c42', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#9a9ea2' }}>{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Cooldown */}
      {cooldown?.length > 0 && (
        <Section label="ESTIRAMIENTOS">
          <div style={{ background: '#131417', border: '1px solid #1c1f23', borderRadius: '12px', padding: '12px 14px' }}>
            {cooldown.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: i < cooldown.length - 1 ? '8px' : 0, marginBottom: i < cooldown.length - 1 ? '8px' : 0, borderBottom: i < cooldown.length - 1 ? '1px solid #1c1f23' : 'none' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22d3c8', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#9a9ea2' }}>{item}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
