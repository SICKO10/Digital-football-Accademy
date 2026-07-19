import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ── Composant étoiles ─────────────────────────────────────────────────────────
function Etoiles({ note, onChange, size = 28, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer', opacity: (hover || note) >= n ? 1 : 0.15, transition: 'opacity 0.1s', lineHeight: 1 }}>⭐</span>
      ))}
    </div>
  )
}

export default function ClubPublic() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [userId, setUserId] = useState(null)
  const [educateur, setEducateur] = useState(null)
  const [joueurs, setJoueurs] = useState([])
  const [matchs, setMatchs] = useState([])
  const [ligueUrl, setLigueUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('infos')

  // Validation participation
  const [validations, setValidations] = useState([]) // mes validations pour ce club
  const [showValForm, setShowValForm] = useState(false)
  const [valSaison, setValSaison] = useState('2024-2025')
  const [valFeuilles, setValFeuilles] = useState(['', '', '', '', ''])
  const [valSending, setValSending] = useState(false)
  const [valSuccess, setValSuccess] = useState(false)

  // Notation
  const [monAvis, setMonAvis] = useState(null)
  const [noteVal, setNoteVal] = useState(0)
  const [commentaireVal, setCommentaireVal] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [noteDone, setNoteDone] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)

      // Profil éducateur
      const { data: edu } = await supabase.from('profiles').select('*').eq('id', id).single()
      setEducateur(edu)

      // Joueurs de l'équipe
      const { data: jData } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', id).order('categorie')
      setJoueurs(jData || [])

      // Matchs
      const { data: mData } = await supabase.from('matchs_equipe').select('*').eq('educateur_id', id).order('date', { ascending: false })
      setMatchs(mData || [])

      // Lien classement officiel de la ligue (saisi par l'éducateur dans son profil)
      const { data: profilExt } = await supabase.from('profil_educateur').select('ligue_url').eq('user_id', id).maybeSingle()
      setLigueUrl(profilExt?.ligue_url || null)

      // Mes validations pour ce club
      const { data: vData } = await supabase.from('validations_joueur_club').select('*').eq('joueur_id', user.id).eq('educateur_id', id)
      setValidations(vData || [])

      // Mon avis existant sur cet éducateur
      const { data: avisData } = await supabase.from('avis').select('*').eq('auteur_id', user.id).eq('cible_id', id).single()
      if (avisData) { setMonAvis(avisData); setNoteVal(avisData.note); setCommentaireVal(avisData.commentaire || '') }

      setLoading(false)
    }
    init()
  }, [id])

  const soumettreValidation = async () => {
    const remplies = valFeuilles.filter(f => f.trim())
    if (remplies.length < 5) return
    setValSending(true)
    await supabase.from('validations_joueur_club').upsert(
      { joueur_id: userId, educateur_id: id, saison: valSaison, feuilles_match: remplies },
      { onConflict: 'joueur_id,educateur_id,saison' }
    )
    const { data } = await supabase.from('validations_joueur_club').select('*').eq('joueur_id', userId).eq('educateur_id', id)
    setValidations(data || [])
    setValSending(false)
    setShowValForm(false)
    setValSuccess(true)
  }

  const soumettreNote = async () => {
    if (!noteVal) return
    setNoteSending(true)
    await supabase.from('avis').upsert(
      { auteur_id: userId, cible_id: id, note: noteVal, commentaire: commentaireVal.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: 'auteur_id,cible_id' }
    )
    setMonAvis({ note: noteVal, commentaire: commentaireVal.trim() || null })
    setNoteSending(false)
    setNoteDone(true)
  }

  const estValide = validations.length > 0
  const categories = [...new Set(joueurs.map(j => j.categorie).filter(Boolean))]

  const st = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' },
    navbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #141414', background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 100 },
    content: { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' },
    tab: (active) => ({ padding: '8px 18px', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#555', border: `1px solid ${active ? '#4ade80' : '#2a2a2a'}`, borderRadius: '20px', fontSize: '13px', fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem', marginBottom: '12px' },
    sectionTitle: { fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px' },
  }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>Chargement...</div>
  if (!educateur) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Club introuvable.</div>

  return (
    <div style={st.page}>
      <nav style={st.navbar}>
        <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>⬡ DIGITAL FOOTBALL</span>
        <button onClick={() => navigate(-1)} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>← Retour</button>
      </nav>

      <div style={st.content}>
        {/* ── Header club ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {educateur.avatar_url
            ? <img src={educateur.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
            : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#0d1a0d', border: '2px solid #4ade8030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: '#4ade80' }}>
                {(educateur.club || educateur.prenom || '?')[0].toUpperCase()}
              </div>
          }
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{educateur.club || `${educateur.prenom} ${educateur.nom}`}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
              {[educateur.niveau_equipe, educateur.region].filter(Boolean).join(' · ')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>
              Éducateur : <span style={{ color: '#aaa' }}>{educateur.prenom} {educateur.nom}</span>
            </p>
          </div>
          {estValide && (
            <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
              ✓ Participation validée
            </span>
          )}
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { id: 'infos', label: '📋 Infos' },
            { id: 'equipes', label: `👥 Équipes (${joueurs.length})` },
            { id: 'resultats', label: `⚽ Résultats (${matchs.length})` },
            { id: 'classement', label: '🏆 Classement' },
            { id: 'noter', label: '⭐ Noter' },
          ].map(t => (
            <button key={t.id} onClick={() => setOnglet(t.id)} style={st.tab(onglet === t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── INFOS ── */}
        {onglet === 'infos' && (
          <div>
            <div style={st.card}>
              <p style={st.sectionTitle}>À propos</p>
              <p style={{ margin: 0, fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>
                {educateur.description || 'Aucune description renseignée.'}
              </p>
            </div>
            {educateur.niveau_equipe && (
              <div style={st.card}>
                <p style={st.sectionTitle}>Niveau de compétition</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{educateur.niveau_equipe}</p>
              </div>
            )}
            <div style={st.card}>
              <p style={st.sectionTitle}>Statistiques</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Joueurs inscrits', val: joueurs.length },
                  { label: 'Matchs joués', val: matchs.length },
                  { label: 'Catégories', val: categories.length },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0d0d0d', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#4ade80' }}>{s.val}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#555' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ÉQUIPES ── */}
        {onglet === 'equipes' && (
          <div>
            {categories.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: '#333' }}>
                <p style={{ fontSize: '32px' }}>👥</p>
                <p style={{ color: '#444' }}>Aucun joueur inscrit pour le moment.</p>
              </div>
            ) : categories.map(cat => {
              const joueursCat = joueurs.filter(j => j.categorie === cat)
              return (
                <div key={cat} style={st.card}>
                  <p style={st.sectionTitle}>{cat} · {joueursCat.length} joueur{joueursCat.length > 1 ? 's' : ''}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {joueursCat.map((j, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#0d0d0d', borderRadius: '8px' }}>
                        <span style={{ width: '26px', height: '26px', background: '#4ade8015', border: '1px solid #4ade8030', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                          {j.numero_maillot || '—'}
                        </span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{j.prenom} {j.nom}</span>
                        {j.poste && <span style={{ fontSize: '11px', color: '#555', background: '#1a1a1a', padding: '2px 8px', borderRadius: '10px' }}>{j.poste}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── RÉSULTATS ── */}
        {onglet === 'resultats' && (
          <div>
            {matchs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: '#333' }}>
                <p style={{ fontSize: '32px' }}>⚽</p>
                <p style={{ color: '#444' }}>Aucun résultat enregistré.</p>
              </div>
            ) : matchs.map(m => {
              const bp = parseInt(m.score_nous) || 0, bc = parseInt(m.score_eux) || 0
              const res = bp > bc ? 'V' : bp < bc ? 'D' : 'N'
              const resColor = res === 'V' ? '#4ade80' : res === 'D' ? '#ef4444' : '#f59e0b'
              return (
                <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: resColor + '15', border: `1px solid ${resColor}40`, color: resColor, fontWeight: 800, fontSize: '12px', padding: '4px 10px', borderRadius: '8px', flexShrink: 0 }}>{res}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                      {m.domicile ? `${educateur.club || 'Mon équipe'} vs ${m.adversaire}` : `${m.adversaire} vs ${educateur.club || 'Mon équipe'}`}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                      {m.categorie && `${m.categorie} · `}{m.date ? new Date(m.date).toLocaleDateString('fr-FR') : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '18px' }}>
                      {m.domicile ? `${bp} - ${bc}` : `${bc} - ${bp}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── CLASSEMENT ── */}
        {onglet === 'classement' && (
          <div>
            {ligueUrl ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p style={{ color: '#aaa', marginBottom: '16px' }}>
                  Classement officiel de la ligue
                </p>
                <a
                  href={ligueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#22c55e', color: 'white',
                    padding: '12px 24px', borderRadius: '8px',
                    textDecoration: 'none', fontWeight: 'bold',
                    display: 'inline-block',
                  }}
                >
                  🏆 Voir le classement officiel →
                </a>
              </div>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: '32px' }}>
                Lien de classement non renseigné par l'éducateur.
              </p>
            )}
          </div>
        )}

        {/* ── NOTER ── */}
        {onglet === 'noter' && (
          <div>
            {/* Section validation participation */}
            <div style={{ ...st.card, background: '#0d1a0d', border: '1px solid #1e3a1e' }}>
              <p style={st.sectionTitle}>Ma participation dans ce club</p>

              {estValide ? (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
                    ✓ Tu as {validations.length} saison{validations.length > 1 ? 's' : ''} validée{validations.length > 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {validations.map(v => (
                      <div key={v.id} style={{ background: '#111', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600 }}>Saison {v.saison}</span>
                        <span style={{ color: '#555' }}>📄 {(v.feuilles_match || []).length} feuilles</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowValForm(!showValForm)}
                    style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Ajouter une autre saison
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
                    Pour noter ce club ou son éducateur, prouve ta participation en uploadant <strong style={{ color: '#fff' }}>5 feuilles de match</strong> (liens Google Drive, Dropbox, etc.) pour une saison.
                  </p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#666' }}>
                    ⭐ Cela activera également ton <strong style={{ color: '#f0c030' }}>badge Certifié</strong>.
                  </p>
                  <button onClick={() => setShowValForm(true)}
                    style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    📄 Valider ma participation
                  </button>
                </div>
              )}

              {valSuccess && (
                <div style={{ marginTop: '12px', background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
                  ✓ Participation validée ! Tu peux maintenant noter ce club.
                </div>
              )}

              {showValForm && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #1e3a1e', paddingTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Saison</label>
                  <select value={valSaison} onChange={e => setValSaison(e.target.value)}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' }}>
                    {['2025-2026','2024-2025','2023-2024','2022-2023','2021-2022'].map(s => <option key={s}>{s}</option>)}
                  </select>

                  <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>5 liens vers tes feuilles de match (Google Drive, Dropbox...)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {valFeuilles.map((url, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#555', width: '18px', flexShrink: 0 }}>#{i+1}</span>
                        <input value={url} onChange={e => { const a = [...valFeuilles]; a[i] = e.target.value; setValFeuilles(a) }}
                          placeholder="https://..."
                          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    {valFeuilles.filter(f => f.trim()).length < 5 && (
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#f59e0b' }}>⚠️ {5 - valFeuilles.filter(f => f.trim()).length} lien(s) manquant(s)</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={soumettreValidation}
                      disabled={valSending || valFeuilles.filter(f => f.trim()).length < 5}
                      style={{ flex: 1, background: '#4ade80', color: '#000', border: 'none', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (valSending || valFeuilles.filter(f => f.trim()).length < 5) ? 0.4 : 1 }}>
                      {valSending ? 'Envoi...' : '✓ Valider'}
                    </button>
                    <button onClick={() => setShowValForm(false)}
                      style={{ background: '#1a1a1a', color: '#666', border: '1px solid #2a2a2a', padding: '11px 16px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section notation */}
            {!estValide && !valSuccess ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '40px', color: '#2a2a2a' }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</p>
                <p style={{ color: '#444', fontSize: '14px' }}>Valide ta participation pour accéder à la notation.</p>
              </div>
            ) : (
              <div style={st.card}>
                <p style={st.sectionTitle}>{monAvis ? 'Ma note' : 'Noter ce club / éducateur'}</p>

                {noteDone ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ fontSize: '28px', marginBottom: '8px' }}>✓</p>
                    <p style={{ fontWeight: 700, color: '#4ade80' }}>Note envoyée !</p>
                    {monAvis && <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}><Etoiles note={noteVal} readonly /></div>}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <Etoiles note={noteVal} onChange={setNoteVal} size={32} />
                      {noteVal > 0 && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666' }}>{['','Très insuffisant','Insuffisant','Bien','Très bien','Excellent'][noteVal]}</p>}
                    </div>
                    <textarea value={commentaireVal} onChange={e => setCommentaireVal(e.target.value)}
                      placeholder="Commentaire optionnel (ambiance, coaching, organisation...)"
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '13px', minHeight: '80px', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: '12px' }} />
                    <button onClick={soumettreNote} disabled={!noteVal || noteSending}
                      style={{ width: '100%', background: noteVal ? '#4ade80' : '#1a1a1a', color: noteVal ? '#000' : '#555', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: noteVal ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', opacity: (!noteVal || noteSending) ? 0.5 : 1 }}>
                      {noteSending ? 'Envoi...' : monAvis ? 'Mettre à jour ma note' : 'Envoyer ma note ⭐'}
                    </button>
                    {monAvis && <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#555', textAlign: 'center' }}>Tu as déjà noté {monAvis.note}/5 — tu peux modifier.</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
