import { colors, alpha } from '../../tokens'
import Card from '../../components/coachAdmin/Card'

export default function CoachSessions({ seancesTransferees, coachId, prendreEnCharge, setSeanceEvalModal }) {
  if (seancesTransferees.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎥</p>
          <p style={{ color: colors.text.dim }}>Aucune séance transférée par un club pour l'instant</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {seancesTransferees.map(s => {
        const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
        return (
          <div key={s.id} style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || 'Séance'}</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.dim }}>
                Club : {s.club?.club || `${s.club?.prenom} ${s.club?.nom}`} · {s.saison}
                {s.date_seance ? ` · ${new Date(s.date_seance).toLocaleDateString('fr-FR')}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {s.pris_en_charge_par ? (
                <>
                  <span style={{ background: s.pris_en_charge_par === coachId ? colors.accent.green + alpha.subtle : '#f59e0b15', border: `1px solid ${s.pris_en_charge_par === coachId ? colors.accent.green + alpha.medium : '#f59e0b40'}`, color: s.pris_en_charge_par === coachId ? colors.accent.green : '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                    {s.pris_en_charge_par === coachId ? '✅ Toi' : `🔒 ${s.coach?.prenom || 'Autre coach'}`}
                  </span>
                  {s.pris_en_charge_par === coachId && (
                    <button onClick={() => prendreEnCharge('seances_uploadees', s.id, true)} style={{ background: 'none', border: '1px solid #333', color: colors.text.dim, padding: '4px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                  )}
                </>
              ) : (
                <button onClick={() => prendreEnCharge('seances_uploadees', s.id, false)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
              )}
              <a href={s.video_url} target="_blank" rel="noreferrer" style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🎬 Voir</a>
              {s.statut === 'transfere_coach' && (
                <button onClick={() => setSeanceEvalModal(s)} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>📋 Analyser</button>
              )}
              {eval_ && (
                <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
