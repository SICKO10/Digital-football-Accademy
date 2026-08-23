import { colors } from '../../tokens'
import Card from '../../components/coachAdmin/Card'

export default function ClubsAgents({ recruteurs, setRecruteurModal }) {
  if (recruteurs.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏢</p>
          <p style={{ color: colors.text.dim }}>Aucun recruteur inscrit pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {recruteurs.map(r => {
        const initiales = `${(r.prenom || '?')[0]}${(r.nom || '?')[0]}`
        return (
          <div key={r.id} style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.blue, fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                {initiales}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{r.prenom} {r.nom}</p>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text.dim }}>
                {r.type_recruteur || 'Recruteur'}{r.club ? ` — ${r.club}` : ''}{r.region ? ` · ${r.region}` : ''}
              </p>
            </div>
            <button onClick={() => setRecruteurModal(r)}
              style={{ background: colors.accent.blue + '15', border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              👤 Voir le profil
            </button>
          </div>
        )
      })}
    </div>
  )
}
