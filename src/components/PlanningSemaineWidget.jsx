import { useState } from 'react'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const lundiDeSemaine = (offset) => {
  const now = new Date()
  const decalage = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalage + offset * 7)
}

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Calendrier hebdomadaire lecture/navigation, généré depuis entrainements + matchs_equipe
// déjà chargés (pas de requête ici) — réutilisé par le dashboard éducateur (cliquable,
// navigue vers les sections) et le dashboard joueur (lecture seule, pas de callbacks).
export default function PlanningSemaineWidget({ entrainements = [], matchs = [], onClickEntrainement, onClickMatch }) {
  const [offset, setOffset] = useState(0)
  const lundi = lundiDeSemaine(offset)
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(lundi.getDate() + i)
    return d
  })
  const dimanche = jours[6]
  const aujourdhuiStr = dateStr(new Date())

  const labelSemaine = `${lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button onClick={() => setOffset(o => o - 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#60a5fa', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ‹
        </button>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#888' }}>{labelSemaine}</p>
        <button onClick={() => setOffset(o => o + 1)}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#60a5fa', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {jours.map((d, i) => {
          const s = dateStr(d)
          const ents = entrainements.filter(e => e.date === s)
          const mts = matchs.filter(m => m.date === s)
          const estAujourdhui = s === aujourdhuiStr
          const vide = ents.length === 0 && mts.length === 0
          return (
            <div key={s} style={{
              minHeight: '90px', background: '#0a0a0a', borderRadius: '10px', padding: '6px',
              border: `1px solid ${estAujourdhui ? '#60a5fa' : '#1a1a1a'}`,
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: estAujourdhui ? '#60a5fa' : vide ? '#333' : '#555' }}>
                {JOURS[i]} {d.getDate()}
              </p>
              {ents.map(e => (
                <div key={`e-${e.id}`} onClick={() => onClickEntrainement?.(e)}
                  style={{
                    background: '#ef444420', border: '1px solid #ef444450', color: '#ef4444',
                    borderRadius: '6px', padding: '3px 6px', fontSize: '10px', fontWeight: 600,
                    cursor: onClickEntrainement ? 'pointer' : 'default',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                  {e.heure ? `${e.heure} · ` : ''}{e.description || 'Entraînement'}
                </div>
              ))}
              {mts.map(m => (
                <div key={`m-${m.id}`} onClick={() => onClickMatch?.(m)}
                  style={{
                    background: '#262626', border: '1px solid #333', color: '#ddd',
                    borderRadius: '6px', padding: '3px 6px', fontSize: '10px', fontWeight: 600,
                    cursor: onClickMatch ? 'pointer' : 'default',
                  }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.heure ? `${m.heure} · ` : ''}{m.adversaire || 'Match'}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: '2px', fontSize: '9px', fontWeight: 700,
                    padding: '1px 6px', borderRadius: '10px',
                    background: m.domicile ? '#4ade8020' : '#f9731620',
                    color: m.domicile ? '#4ade80' : '#f97316',
                  }}>
                    {m.domicile ? 'Domicile' : 'Extérieur'}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
