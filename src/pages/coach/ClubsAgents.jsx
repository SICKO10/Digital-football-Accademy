import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import { IcoBriefcase, IcoUser } from './NavIcons'

export default function ClubsAgents({ recruteurs, setRecruteurModal }) {
  const { c, rgba } = useCoachTheme()

  if (recruteurs.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoBriefcase size={40} /></div>
          <p style={{ color: c.textMuted }}>Aucun recruteur inscrit pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {recruteurs.map(r => {
        const initiales = `${(r.prenom || '?')[0]}${(r.nom || '?')[0]}`
        return (
          <div key={r.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: rgba(c.accent, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.accent, fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                {initiales}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: c.text }}>{r.prenom} {r.nom}</p>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.textMuted }}>
                {r.type_recruteur || 'Recruteur'}{r.club ? ` — ${r.club}` : ''}{r.region ? ` · ${r.region}` : ''}
              </p>
            </div>
            <button onClick={() => setRecruteurModal(r)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: rgba(c.accent, 0.12), border: `1px solid ${rgba(c.accent, 0.4)}`, color: c.accent, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <IcoUser size={14} /> Voir le profil
            </button>
          </div>
        )
      })}
    </div>
  )
}
