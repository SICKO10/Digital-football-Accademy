import { colors, alpha } from '../../tokens'
import Card from '../../components/coachAdmin/Card'
import { getStatutColor, getStatutLabel } from './helpers'

export default function Badges({ certifs, certifLoading, commentaires, setCommentaires, validating, validerCertification, rejeterCertification }) {
  const certifsEnAttente = certifs.filter(c => c.statut === 'en_attente')

  if (certifLoading) return <p style={{ color: colors.text.dim, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  if (certifs.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</p>
          <p style={{ color: colors.text.dim }}>Aucune demande de certification pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      {certifsEnAttente.length > 0 && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⭐</span>
          <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
            {certifsEnAttente.length} certification{certifsEnAttente.length > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {certifs.map(certif => {
          const isProcessing = validating[certif.id]
          const isPending = certif.statut === 'en_attente'
          return (
            <div key={certif.id} style={{
              background: colors.background.surface,
              border: `1px solid ${isPending ? '#f59e0b30' : certif.statut === 'validé' ? colors.accent.green + alpha.light : '#f8717130'}`,
              borderRadius: '12px', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                    {certif.profiles?.prenom} {certif.profiles?.nom}
                  </h3>
                  <p style={{ fontSize: '13px', color: colors.text.dim, margin: 0 }}>{certif.profiles?.email}</p>
                </div>
                <span style={{
                  background: getStatutColor(certif.statut) + '20',
                  color: getStatutColor(certif.statut),
                  fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap'
                }}>
                  {getStatutLabel(certif.statut)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Niveau</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: colors.accent.amber }}>{certif.niveau}</p>
                </div>
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Saison</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>{certif.saison}</p>
                </div>
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Soumis le</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{new Date(certif.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 8px' }}>
                  📄 Feuilles de match ({certif.documents?.length || 0} document{certif.documents?.length > 1 ? 's' : ''})
                </p>
                {certif.documents?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {certif.documents.map((url, i) => {
                      const isPdf = url.includes('.pdf') || url.includes('/raw/') || url.includes('application')
                      return (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: colors.background.raised, border: '1px solid #333', borderRadius: '8px',
                            padding: '8px 12px', color: colors.accent.green, fontSize: '13px',
                            textDecoration: 'none', fontWeight: '500'
                          }}>
                          {isPdf ? '📄' : '🖼️'} Feuille {i + 1}
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: colors.text.faint, margin: 0 }}>⚠️ Aucun document joint</p>
                )}
              </div>

              {certif.commentaire_admin && !isPending && (
                <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 4px' }}>Commentaire admin</p>
                  <p style={{ fontSize: '13px', color: colors.text.secondary, margin: 0 }}>{certif.commentaire_admin}</p>
                </div>
              )}

              {isPending && (
                <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '1rem' }}>
                  <p style={{ fontSize: '12px', color: colors.text.dim, margin: '0 0 10px' }}>
                    💬 Commentaire (obligatoire en cas de rejet)
                  </p>
                  <textarea
                    placeholder="Ex : Documents illisibles, mauvais niveau, etc."
                    value={commentaires[certif.id] || ''}
                    onChange={e => setCommentaires(prev => ({ ...prev, [certif.id]: e.target.value }))}
                    rows={2}
                    style={{
                      width: '100%', background: colors.background.surface, border: '1px solid #333', borderRadius: '8px',
                      padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none',
                      resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px', fontFamily: 'sans-serif'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => validerCertification(certif)}
                      disabled={!!isProcessing}
                      style={{
                        flex: 1, background: isProcessing === 'validating' ? colors.border.strong : colors.accent.green,
                        color: isProcessing === 'validating' ? colors.text.dim : colors.background.base,
                        border: 'none', padding: '10px 0', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}>
                      {isProcessing === 'validating' ? 'Validation...' : '✅ Valider le badge'}
                    </button>
                    <button
                      onClick={() => rejeterCertification(certif)}
                      disabled={!!isProcessing}
                      style={{
                        flex: 1, background: isProcessing === 'rejecting' ? colors.border.strong : '#f8717120',
                        color: isProcessing === 'rejecting' ? colors.text.dim : '#f87171',
                        border: '1px solid #f8717140', padding: '10px 0', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}>
                      {isProcessing === 'rejecting' ? 'Rejet...' : '❌ Rejeter'}
                    </button>
                  </div>
                </div>
              )}

              {certif.statut === 'validé' && certif.validated_at && (
                <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '13px', color: colors.accent.green, margin: 0, fontWeight: 600 }}>
                    ⭐ Badge validé le {new Date(certif.validated_at).toLocaleDateString('fr-FR')} — notification envoyée au joueur
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
