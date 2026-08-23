import { useMemo, useState } from 'react'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import FilterBar from '../../components/coachAdmin/FilterBar'
import { getStatutColor, getStatutLabel } from './helpers'

export default function Badges({ certifs, certifLoading, commentaires, setCommentaires, validating, validerCertification, rejeterCertification }) {
  const { c, rgba } = useCoachTheme()
  const [filtreStatut, setFiltreStatut] = useState('toutes') // attente | traitees | toutes
  const [recherche, setRecherche] = useState('')
  const certifsEnAttente = certifs.filter(cf => cf.statut === 'en_attente')

  const certifsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return certifs.filter(cf => {
      if (filtreStatut === 'attente' && cf.statut !== 'en_attente') return false
      if (filtreStatut === 'traitees' && cf.statut === 'en_attente') return false
      if (q) {
        const nom = `${cf.profiles?.prenom || ''} ${cf.profiles?.nom || ''}`.toLowerCase()
        if (!nom.includes(q)) return false
      }
      return true
    })
  }, [certifs, filtreStatut, recherche])

  if (certifLoading) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  if (certifs.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</p>
          <p style={{ color: c.textMuted }}>Aucune demande de certification pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <FilterBar
        toggles={[
          { key: 'attente', label: 'En attente', active: filtreStatut === 'attente', onClick: () => setFiltreStatut('attente') },
          { key: 'traitees', label: 'Traitées', active: filtreStatut === 'traitees', onClick: () => setFiltreStatut('traitees') },
          { key: 'toutes', label: 'Toutes', active: filtreStatut === 'toutes', onClick: () => setFiltreStatut('toutes') },
        ]}
        search={recherche}
        onSearchChange={setRecherche}
        searchPlaceholder="Rechercher un éducateur..."
      />

      {certifsEnAttente.length > 0 && (
        <div style={{ background: rgba(c.warn, 0.08), border: `1px solid ${rgba(c.warn, 0.3)}`, borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⭐</span>
          <p style={{ margin: 0, fontSize: '14px', color: c.warn, fontWeight: 600 }}>
            {certifsEnAttente.length} certification{certifsEnAttente.length > 1 ? 's' : ''} en attente de validation
          </p>
        </div>
      )}

      {certifsFiltres.length === 0 && (
        <Card><p style={{ color: c.textMuted, textAlign: 'center', margin: 0, padding: '1rem 0' }}>Aucune certification ne correspond à ces filtres</p></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {certifsFiltres.map(certif => {
          const isProcessing = validating[certif.id]
          const isPending = certif.statut === 'en_attente'
          const statutColor = getStatutColor(c, certif.statut)
          return (
            <div key={certif.id} style={{
              background: c.surface,
              border: `1px solid ${isPending ? rgba(c.warn, 0.3) : certif.statut === 'validé' ? rgba(c.success, 0.3) : rgba(c.danger, 0.3)}`,
              borderRadius: '10px', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px', color: c.text }}>
                    {certif.profiles?.prenom} {certif.profiles?.nom}
                  </h3>
                  <p style={{ fontSize: '13px', color: c.textMuted, margin: 0 }}>{certif.profiles?.email}</p>
                </div>
                <span style={{
                  background: rgba(statutColor, 0.15),
                  color: statutColor,
                  fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap'
                }}>
                  {getStatutLabel(certif.statut)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: '0 0 4px' }}>Niveau</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: c.warn }}>{certif.niveau}</p>
                </div>
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: '0 0 4px' }}>Saison</p>
                  <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: c.text }}>{certif.saison}</p>
                </div>
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: '0 0 4px' }}>Soumis le</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: c.text }}>{new Date(certif.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '12px', color: c.textMuted, margin: '0 0 8px' }}>
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
                            background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px',
                            padding: '8px 12px', color: c.success, fontSize: '13px',
                            textDecoration: 'none', fontWeight: '500'
                          }}>
                          {isPdf ? '📄' : '🖼️'} Feuille {i + 1}
                        </a>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: c.textMuted, margin: 0 }}>⚠️ Aucun document joint</p>
                )}
              </div>

              {certif.commentaire_admin && !isPending && (
                <div style={{ background: c.surface2, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '11px', color: c.textMuted, margin: '0 0 4px' }}>Commentaire admin</p>
                  <p style={{ fontSize: '13px', color: c.text, margin: 0 }}>{certif.commentaire_admin}</p>
                </div>
              )}

              {isPending && (
                <div style={{ background: c.surface2, borderRadius: '10px', padding: '1rem' }}>
                  <p style={{ fontSize: '12px', color: c.textMuted, margin: '0 0 10px' }}>
                    💬 Commentaire (obligatoire en cas de rejet)
                  </p>
                  <textarea
                    placeholder="Ex : Documents illisibles, mauvais niveau, etc."
                    value={commentaires[certif.id] || ''}
                    onChange={e => setCommentaires(prev => ({ ...prev, [certif.id]: e.target.value }))}
                    rows={2}
                    style={{
                      width: '100%', background: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px',
                      padding: '10px 14px', color: c.text, fontSize: '13px', outline: 'none',
                      resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px', fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => validerCertification(certif)}
                      disabled={!!isProcessing}
                      style={{
                        flex: 1, background: isProcessing === 'validating' ? c.border : c.success,
                        color: isProcessing === 'validating' ? c.textMuted : '#fff',
                        border: 'none', padding: '10px 0', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}>
                      {isProcessing === 'validating' ? 'Validation...' : '✅ Valider le badge'}
                    </button>
                    <button
                      onClick={() => rejeterCertification(certif)}
                      disabled={!!isProcessing}
                      style={{
                        flex: 1, background: isProcessing === 'rejecting' ? c.border : rgba(c.danger, 0.12),
                        color: isProcessing === 'rejecting' ? c.textMuted : c.danger,
                        border: `1px solid ${rgba(c.danger, 0.4)}`, padding: '10px 0', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}>
                      {isProcessing === 'rejecting' ? 'Rejet...' : '❌ Rejeter'}
                    </button>
                  </div>
                </div>
              )}

              {certif.statut === 'validé' && certif.validated_at && (
                <div style={{ background: rgba(c.success, 0.08), border: `1px solid ${rgba(c.success, 0.3)}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '13px', color: c.success, margin: 0, fontWeight: 600 }}>
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
