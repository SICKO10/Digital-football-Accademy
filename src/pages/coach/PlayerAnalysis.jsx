import { useMemo, useState } from 'react'
import { colors, alpha } from '../../tokens'
import Card from '../../components/coachAdmin/Card'
import Pill from '../../components/coachAdmin/Pill'
import { getStatutColor, getStatutLabel, getVideoUrl, isVeo, isYoutube } from './helpers'

export default function PlayerAnalysis({ demandes, coachId, loomUrls, setLoomUrls, rapportPdfFiles, setRapportPdfFiles, sending, envoyerAnalyse, prendreEnCharge, setNotationCible }) {
  const [joueursOuverts, setJoueursOuverts] = useState({})
  const toggleJoueur = (id) => setJoueursOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  const enAttente = demandes.filter(d => d.statut === 'en_attente')

  const joueursAvecDemandes = useMemo(() => {
    const demandesParJoueur = demandes.reduce((acc, d) => {
      const id = d.profiles?.id || 'inconnu'
      if (!acc[id]) acc[id] = { profil: d.profiles, demandes: [] }
      acc[id].demandes.push(d)
      return acc
    }, {})
    return Object.values(demandesParJoueur).sort((a, b) => {
      const aEnAttente = a.demandes.filter(d => d.statut === 'en_attente').length
      const bEnAttente = b.demandes.filter(d => d.statut === 'en_attente').length
      return bEnAttente - aEnAttente
    })
  }, [demandes])

  if (demandes.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</p>
          <p style={{ color: colors.text.dim }}>Aucune demande pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      {enAttente.length > 0 && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
            {enAttente.length} demande{enAttente.length > 1 ? 's' : ''} en attente d'analyse
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {joueursAvecDemandes.map(({ profil, demandes: demandesJoueur }) => {
          const joueurId = profil?.id || 'inconnu'
          const ouvert = joueursOuverts[joueurId]
          const nbAttente = demandesJoueur.filter(d => d.statut === 'en_attente').length
          const nbAnalysees = demandesJoueur.filter(d => d.statut === 'analyse').length
          const initiales = `${(profil?.prenom || '?')[0]}${(profil?.nom || '?')[0]}`
          return (
            <div key={joueurId} style={{ background: colors.background.surface, border: `1px solid ${nbAttente > 0 ? '#f59e0b30' : '#222'}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div onClick={() => toggleJoueur(joueurId)}
                style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green, fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                  {initiales}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{profil?.prenom} {profil?.nom}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{profil?.email}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {nbAttente > 0 && <Pill variant="pending">⏳ {nbAttente} en attente</Pill>}
                  {nbAnalysees > 0 && <Pill variant="active">✅ {nbAnalysees} envoyée{nbAnalysees > 1 ? 's' : ''}</Pill>}
                  <span style={{ color: colors.text.disabled, fontSize: '18px', marginLeft: '4px' }}>{ouvert ? '▲' : '▼'}</span>
                </div>
              </div>

              {ouvert && (
                <div style={{ borderTop: '1px solid #1a1a1a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {demandesJoueur.map(demande => {
                    const videoUrl = getVideoUrl(demande)
                    const isSending = sending[demande.id]
                    return (
                      <div key={demande.id} style={{ background: colors.background.sunken, border: `1px solid ${demande.statut === 'en_attente' ? '#f59e0b20' : colors.background.raised}`, borderRadius: '10px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{demande.titre}</h3>
                          <span style={{ background: getStatutColor(demande.statut) + '20', color: getStatutColor(demande.statut), fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {getStatutLabel(demande.statut)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                          {demande.pris_en_charge_par ? (
                            <>
                              <span style={{ background: demande.pris_en_charge_par === coachId ? colors.accent.green + alpha.subtle : '#f59e0b15', border: `1px solid ${demande.pris_en_charge_par === coachId ? colors.accent.green + alpha.medium : '#f59e0b40'}`, color: demande.pris_en_charge_par === coachId ? colors.accent.green : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
                                {demande.pris_en_charge_par === coachId ? '✅ Pris en charge par toi' : `🔒 Pris en charge par ${demande.coach?.prenom || 'un autre coach'}`}
                              </span>
                              {demande.pris_en_charge_par === coachId && (
                                <button onClick={() => prendreEnCharge('demandes', demande.id, true)} style={{ background: 'none', border: '1px solid #333', color: colors.text.dim, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => prendreEnCharge('demandes', demande.id, false)} style={{ background: colors.accent.blue + alpha.subtle, border: '1px solid #60a5fa40', color: colors.accent.blue, padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Poste</p>
                            <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{demande.poste}</p>
                          </div>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Plan</p>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: colors.accent.green, textTransform: 'capitalize', margin: '4px 0 0' }}>{profil?.plan}</p>
                          </div>
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Date</p>
                            <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>

                        {demande.description && (
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>Ce que le joueur veut analyser</p>
                            <p style={{ fontSize: '13px', color: colors.text.secondary, margin: '4px 0 0' }}>{demande.description}</p>
                          </div>
                        )}

                        {videoUrl ? (
                          <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontSize: '11px', color: colors.text.faint, margin: '0 0 8px' }}>Vidéo</p>
                            {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                              <a href={videoUrl} target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                                🎬 {isVeo(videoUrl) ? 'Ouvrir sur Veo' : 'Ouvrir sur YouTube'}
                              </a>
                            ) : (
                              <video src={videoUrl.includes('cloudinary.com') ? videoUrl.replace('/upload/', '/upload/q_auto,f_mp4/') : videoUrl} controls style={{ width: '100%', maxHeight: '280px', borderRadius: '8px', background: colors.black }} />
                            )}
                          </div>
                        ) : (
                          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '13px', color: colors.text.faint, margin: 0 }}>⚠️ Aucune vidéo fournie</p>
                          </div>
                        )}

                        {demande.statut === 'en_attente' && (
                          <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '1rem' }}>
                            <p style={{ fontSize: '12px', color: colors.text.dim, margin: '0 0 10px' }}>
                              📨 Le joueur recevra une notification automatique dans son dashboard dès l'envoi
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <input
                                placeholder="Colle ton lien vidéo (YouTube, Veo...) ici..."
                                value={loomUrls[demande.id] || ''}
                                onChange={e => setLoomUrls(prev => ({ ...prev, [demande.id]: e.target.value }))}
                                style={{ flex: 1, background: colors.background.surface, border: '1px solid #333', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none' }}
                              />
                              <button
                                onClick={() => envoyerAnalyse(demande.id, demande.profiles?.id)}
                                disabled={isSending || !loomUrls[demande.id]?.trim()}
                                style={{ background: isSending ? colors.border.strong : colors.accent.green, color: isSending ? colors.text.dim : colors.background.base, border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: (!loomUrls[demande.id]?.trim() && !isSending) ? 0.5 : 1 }}>
                                {isSending ? 'Envoi...' : "🚀 Envoyer l'analyse"}
                              </button>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <label style={{ fontSize: '11px', color: colors.text.faint, fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                📄 Joindre un rapport PDF (optionnel)
                              </label>
                              <input type="file" accept=".pdf"
                                onChange={e => setRapportPdfFiles(prev => ({ ...prev, [demande.id]: e.target.files[0] || null }))}
                                style={{ fontSize: '12px', color: colors.text.muted, width: '100%' }} />
                              {rapportPdfFiles[demande.id] && (
                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.accent.green }}>✓ {rapportPdfFiles[demande.id].name}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {demande.statut === 'analyse' && demande.loom_url && (
                          <div style={{ background: '#4ade8010', border: '1px solid #4ade8033', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                            <p style={{ fontSize: '12px', color: colors.accent.green, marginBottom: '6px', fontWeight: 600, margin: '0 0 6px' }}>✅ Analyse envoyée — notification joueur envoyée</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <a href={demande.loom_url} target="_blank" rel="noreferrer"
                                style={{ fontSize: '13px', color: colors.text.secondary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isYoutube(demande.loom_url) ? '▶️' : '🎥'} <span style={{ textDecoration: 'underline' }}>{demande.loom_url}</span>
                              </a>
                              {demande.rapport_pdf_url && (
                                <a href={demande.rapport_pdf_url} target="_blank" rel="noreferrer"
                                  style={{ fontSize: '13px', color: colors.accent.green, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  📄 <span style={{ textDecoration: 'underline' }}>Rapport PDF</span>
                                </a>
                              )}
                              <button onClick={() => setNotationCible({ id: profil?.id, prenom: profil?.prenom, nom: profil?.nom, plan: profil?.plan })}
                                style={{ background: colors.accent.amber + alpha.subtle, border: '1px solid #fbbf2440', color: colors.accent.amber, padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                ⭐ Noter {profil?.prenom || 'le joueur'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
