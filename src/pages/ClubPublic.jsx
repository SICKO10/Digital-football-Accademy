import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t, localeOf } from '../lib/translations'
import { colors, alpha } from '../tokens'

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
  const { lang } = useLang()

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
      const { data: edu } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
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
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    navbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #141414', background: colors.background.base, position: 'sticky', top: 0, zIndex: 100 },
    content: { maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' },
    tab: (active) => ({ padding: '8px 18px', background: active ? colors.accent.green : 'transparent', color: active ? colors.black : colors.text.faint, border: `1px solid ${active ? colors.accent.green : colors.border.default}`, borderRadius: '20px', fontSize: '13px', fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    card: { background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem', marginBottom: '12px' },
    sectionTitle: { fontSize: '11px', fontWeight: 700, color: colors.accent.green, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px' },
  }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green }}>{t('jexp_chargement', lang)}</div>
  if (!educateur) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint }}>{t('clubpub_club_introuvable', lang)}</div>

  return (
    <div style={st.page}>
      <nav style={st.navbar}>
        <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1px' }}>⬡ DIGITAL FOOTBALL</span>
        <button onClick={() => navigate(-1)} style={{ background: colors.background.raised, border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('clubpub_retour', lang)}</button>
      </nav>

      <div style={st.content}>
        {/* ── Header club ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {educateur.avatar_url
            ? <img src={educateur.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4ade8040' }} />
            : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#0d1a0d', border: '2px solid #4ade8030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: colors.accent.green }}>
                {(educateur.club || educateur.prenom || '?')[0].toUpperCase()}
              </div>
          }
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{educateur.club || `${educateur.prenom} ${educateur.nom}`}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.faint }}>
              {[educateur.niveau_equipe, educateur.region].filter(Boolean).join(' · ')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>
              {t('clubpub_educateur_label', lang)} <span style={{ color: colors.text.secondary }}>{educateur.prenom} {educateur.nom}</span>
            </p>
          </div>
          {estValide && (
            <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
              {t('clubpub_participation_validee', lang)}
            </span>
          )}
        </div>

        {/* ── Onglets ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { id: 'infos', label: t('clubpub_tab_infos', lang) },
            { id: 'equipes', label: `${t('clubpub_tab_equipes', lang)} (${joueurs.length})` },
            { id: 'resultats', label: `${t('clubpub_tab_resultats', lang)} (${matchs.length})` },
            { id: 'classement', label: t('clubpub_tab_classement', lang) },
            { id: 'noter', label: t('clubpub_tab_noter', lang) },
          ].map(tab => (
            <button key={tab.id} onClick={() => setOnglet(tab.id)} style={st.tab(onglet === tab.id)}>{tab.label}</button>
          ))}
        </div>

        {/* ── INFOS ── */}
        {onglet === 'infos' && (
          <div>
            <div style={st.card}>
              <p style={st.sectionTitle}>{t('clubpub_a_propos', lang)}</p>
              <p style={{ margin: 0, fontSize: '14px', color: colors.text.secondary, lineHeight: 1.6 }}>
                {educateur.description || t('clubpub_aucune_description', lang)}
              </p>
            </div>
            {educateur.niveau_equipe && (
              <div style={st.card}>
                <p style={st.sectionTitle}>{t('clubpub_niveau_competition', lang)}</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{educateur.niveau_equipe}</p>
              </div>
            )}
            <div style={st.card}>
              <p style={st.sectionTitle}>{t('clubpub_statistiques', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: t('clubpub_joueurs_inscrits', lang), val: joueurs.length },
                  { label: t('clubpub_matchs_joues', lang), val: matchs.length },
                  { label: t('clubpub_categories', lang), val: categories.length },
                ].map(s => (
                  <div key={s.label} style={{ background: colors.background.sunken, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: colors.accent.green }}>{s.val}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.label}</p>
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
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: colors.border.strong }}>
                <p style={{ fontSize: '32px' }}>👥</p>
                <p style={{ color: colors.text.disabled }}>{t('clubpub_aucun_joueur', lang)}</p>
              </div>
            ) : categories.map(cat => {
              const joueursCat = joueurs.filter(j => j.categorie === cat)
              return (
                <div key={cat} style={st.card}>
                  <p style={st.sectionTitle}>{cat} · {joueursCat.length} {joueursCat.length > 1 ? t('clubpub_joueurs_plural', lang) : t('clubpub_joueur_singular', lang)}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {joueursCat.map((j, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: colors.background.sunken, borderRadius: '8px' }}>
                        <span style={{ width: '26px', height: '26px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8030', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: colors.accent.green, flexShrink: 0 }}>
                          {j.numero_maillot || '—'}
                        </span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>{j.prenom} {j.nom}</span>
                        {j.poste && <span style={{ fontSize: '11px', color: colors.text.faint, background: colors.background.raised, padding: '2px 8px', borderRadius: '10px' }}>{j.poste}</span>}
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
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: colors.border.strong }}>
                <p style={{ fontSize: '32px' }}>⚽</p>
                <p style={{ color: colors.text.disabled }}>{t('clubpub_aucun_resultat', lang)}</p>
              </div>
            ) : matchs.map(m => {
              const bp = parseInt(m.score_nous) || 0, bc = parseInt(m.score_eux) || 0
              const res = bp > bc ? 'V' : bp < bc ? 'D' : 'N'
              const resColor = res === 'V' ? colors.accent.green : res === 'D' ? colors.accent.red : '#f59e0b'
              return (
                <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ background: resColor + '15', border: `1px solid ${resColor}40`, color: resColor, fontWeight: 800, fontSize: '12px', padding: '4px 10px', borderRadius: '8px', flexShrink: 0 }}>{res}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                      {m.domicile ? `${educateur.club || t('clubpub_mon_equipe', lang)} vs ${m.adversaire}` : `${m.adversaire} vs ${educateur.club || t('clubpub_mon_equipe', lang)}`}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>
                      {m.categorie && `${m.categorie} · `}{m.date ? new Date(m.date).toLocaleDateString(localeOf(lang)) : ''}
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
                <p style={{ color: colors.text.secondary, marginBottom: '16px' }}>
                  {t('clubpub_classement_officiel_ligue', lang)}
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
                  {t('clubpub_voir_classement_officiel', lang)}
                </a>
              </div>
            ) : (
              <p style={{ color: colors.text.dim, textAlign: 'center', padding: '32px' }}>
                {t('clubpub_lien_classement_non_renseigne', lang)}
              </p>
            )}
          </div>
        )}

        {/* ── NOTER ── */}
        {onglet === 'noter' && (
          <div>
            {/* Section validation participation */}
            <div style={{ ...st.card, background: '#0d1a0d', border: '1px solid #1e3a1e' }}>
              <p style={st.sectionTitle}>{t('clubpub_ma_participation', lang)}</p>

              {estValide ? (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.accent.green, fontWeight: 600 }}>
                    {t('clubpub_tu_as', lang)} {validations.length} {validations.length > 1 ? t('clubpub_saisons_plural', lang) : t('clubpub_saison_singular', lang)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {validations.map(v => (
                      <div key={v.id} style={{ background: colors.background.surface, borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600 }}>{t('clubpub_saison_label', lang)} {v.saison}</span>
                        <span style={{ color: colors.text.faint }}>📄 {(v.feuilles_match || []).length} {t('clubpub_feuilles_suffix', lang)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowValForm(!showValForm)}
                    style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.faint, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t('clubpub_ajouter_saison', lang)}
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: colors.text.secondary, lineHeight: 1.6 }}>
                    {t('clubpub_prouve_participation', lang)} <strong style={{ color: colors.text.primary }}>{t('clubpub_5_feuilles_match', lang)}</strong> {t('clubpub_liens_gdrive_etc', lang)}
                  </p>
                  <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.dim }}>
                    {t('clubpub_badge_certifie_desc', lang)} <strong style={{ color: '#f0c030' }}>{t('clubpub_badge_certifie', lang)}</strong>.
                  </p>
                  <button onClick={() => setShowValForm(true)}
                    style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {t('clubpub_valider_participation', lang)}
                  </button>
                </div>
              )}

              {valSuccess && (
                <div style={{ marginTop: '12px', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: colors.accent.green, fontWeight: 600 }}>
                  {t('clubpub_participation_validee_success', lang)}
                </div>
              )}

              {showValForm && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #1e3a1e', paddingTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('clubpub_saison_label', lang)}</label>
                  <select value={valSaison} onChange={e => setValSaison(e.target.value)}
                    style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' }}>
                    {['2025-2026','2024-2025','2023-2024','2022-2023','2021-2022'].map(s => <option key={s}>{s}</option>)}
                  </select>

                  <label style={{ fontSize: '12px', color: colors.text.secondary, display: 'block', marginBottom: '8px' }}>{t('clubpub_liens_feuilles_label', lang)}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {valFeuilles.map((url, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: colors.text.faint, width: '18px', flexShrink: 0 }}>#{i+1}</span>
                        <input value={url} onChange={e => { const a = [...valFeuilles]; a[i] = e.target.value; setValFeuilles(a) }}
                          placeholder="https://..."
                          style={{ flex: 1, background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    {valFeuilles.filter(f => f.trim()).length < 5 && (
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#f59e0b' }}>⚠️ {5 - valFeuilles.filter(f => f.trim()).length} {t('clubpub_lien_manquant', lang)}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={soumettreValidation}
                      disabled={valSending || valFeuilles.filter(f => f.trim()).length < 5}
                      style={{ flex: 1, background: colors.accent.green, color: colors.black, border: 'none', padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (valSending || valFeuilles.filter(f => f.trim()).length < 5) ? 0.4 : 1 }}>
                      {valSending ? t('clubpub_envoi', lang) : t('clubpub_valider', lang)}
                    </button>
                    <button onClick={() => setShowValForm(false)}
                      style={{ background: colors.background.raised, color: colors.text.dim, border: '1px solid #2a2a2a', padding: '11px 16px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      {t('clubpub_annuler', lang)}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section notation */}
            {!estValide && !valSuccess ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '40px', color: colors.border.default }}>
                <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</p>
                <p style={{ color: colors.text.disabled, fontSize: '14px' }}>{t('clubpub_valide_pour_noter', lang)}</p>
              </div>
            ) : (
              <div style={st.card}>
                <p style={st.sectionTitle}>{monAvis ? t('clubpub_ma_note', lang) : t('clubpub_noter_club_educateur', lang)}</p>

                {noteDone ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ fontSize: '28px', marginBottom: '8px' }}>✓</p>
                    <p style={{ fontWeight: 700, color: colors.accent.green }}>{t('clubpub_note_envoyee', lang)}</p>
                    {monAvis && <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}><Etoiles note={noteVal} readonly /></div>}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <Etoiles note={noteVal} onChange={setNoteVal} size={32} />
                      {noteVal > 0 && <p style={{ margin: '8px 0 0', fontSize: '13px', color: colors.text.dim }}>{['', t('clubpub_note_tres_insuffisant', lang), t('clubpub_note_insuffisant', lang), t('clubpub_note_bien', lang), t('clubpub_note_tres_bien', lang), t('clubpub_note_excellent', lang)][noteVal]}</p>}
                    </div>
                    <textarea value={commentaireVal} onChange={e => setCommentaireVal(e.target.value)}
                      placeholder={t('clubpub_commentaire_placeholder', lang)}
                      style={{ width: '100%', background: colors.background.raised, border: '1px solid #2a2a2a', borderRadius: '8px', color: colors.text.primary, padding: '10px 12px', fontSize: '13px', minHeight: '80px', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: '12px' }} />
                    <button onClick={soumettreNote} disabled={!noteVal || noteSending}
                      style={{ width: '100%', background: noteVal ? colors.accent.green : colors.background.raised, color: noteVal ? colors.black : colors.text.faint, border: 'none', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: noteVal ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', opacity: (!noteVal || noteSending) ? 0.5 : 1 }}>
                      {noteSending ? t('clubpub_envoi', lang) : monAvis ? t('clubpub_mettre_a_jour_note', lang) : t('clubpub_envoyer_ma_note', lang)}
                    </button>
                    {monAvis && <p style={{ margin: '8px 0 0', fontSize: '11px', color: colors.text.faint, textAlign: 'center' }}>{t('clubpub_deja_note', lang)} {monAvis.note}/5 — {t('clubpub_tu_peux_modifier', lang)}</p>}
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
