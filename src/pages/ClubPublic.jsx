import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t, localeOf } from '../lib/translations'
import { colors, alpha } from '../tokens'
import { BadgeNote } from '../components/Notation'
import { notifierJoueur } from '../lib/notifications'

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
  const [profilExt, setProfilExt] = useState(null) // profil_educateur (diplôme, niveau championnat)
  const [parcoursEdu, setParcoursEdu] = useState([]) // parcours_educateur
  const [tousAvis, setTousAvis] = useState([]) // avis reçus, avec le nom de l'auteur
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('infos')

  // Profil club (plan === 'club', distinct du profil éducateur ci-dessus) —
  // équipes (club_categories) + annonces de recrutement (club_recrutements) +
  // mes candidatures déjà envoyées.
  const [categoriesClub, setCategoriesClub] = useState([])
  const [recrutements, setRecrutements] = useState([])
  const [mesCandidatures, setMesCandidatures] = useState({}) // { [recrutement_id]: statut }
  const [postulantId, setPostulantId] = useState(null)

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

  // Contacter — messages est une table générique sender_id/receiver_id
  // (déjà utilisée pour joueur↔coach et dans l'Explorer éducateur), sans
  // restriction RLS par rôle : réutilisable telle quelle ici, pour n'importe
  // quel visiteur connecté, sans dépendre du dashboard (joueur/éducateur/
  // club) dans lequel il se trouve par ailleurs.
  const [chatOuvert, setChatOuvert] = useState(false)
  const [messagesChat, setMessagesChat] = useState([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [nouveauMessageChat, setNouveauMessageChat] = useState('')
  const [envoyingMessageChat, setEnvoyingMessageChat] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)

      // Profil éducateur
      const { data: edu } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      setEducateur(edu)

      // Profil club (plan === 'club') : équipes + recrutement + mes
      // candidatures déjà envoyées, en plus (pas à la place) des requêtes
      // éducateur ci-dessous, qui restent des no-op inoffensifs pour un id de club.
      if (edu?.plan === 'club') {
        const [{ data: cats }, { data: rec }, { data: cand }] = await Promise.all([
          supabase.from('club_categories').select('id, nom, equipe, educateur_id, couleur').eq('club_id', id).order('nom'),
          supabase.from('club_recrutements').select('*').eq('club_id', id).eq('actif', true),
          supabase.from('candidatures').select('recrutement_id, statut').eq('joueur_id', user.id),
        ])
        setCategoriesClub(cats || [])
        setRecrutements(rec || [])
        const mapCand = {}
        cand?.forEach(c => { mapCand[c.recrutement_id] = c.statut })
        setMesCandidatures(mapCand)
      }

      // Joueurs de l'équipe
      const { data: jData } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', id).order('categorie')
      setJoueurs(jData || [])

      // Matchs
      const { data: mData } = await supabase.from('matchs_equipe').select('*').eq('educateur_id', id).order('date', { ascending: false })
      setMatchs(mData || [])

      // Lien classement officiel + diplôme + niveau championnat (saisis par l'éducateur dans son profil)
      const { data: profilExtData } = await supabase.from('profil_educateur').select('ligue_url, diplome, diplome_verifie, niveau_championnat').eq('user_id', id).maybeSingle()
      setLigueUrl(profilExtData?.ligue_url || null)
      setProfilExt(profilExtData)

      // Parcours de l'éducateur (saisons/clubs précédents)
      const { data: parcoursData } = await supabase.from('parcours_educateur').select('*').eq('user_id', id).order('ordre')
      setParcoursEdu(parcoursData || [])

      // Mes validations pour ce club
      const { data: vData } = await supabase.from('validations_joueur_club').select('*').eq('joueur_id', user.id).eq('educateur_id', id)
      setValidations(vData || [])

      // Mon avis existant sur cet éducateur
      const { data: avisData } = await supabase.from('avis').select('*').eq('auteur_id', user.id).eq('cible_id', id).single()
      if (avisData) { setMonAvis(avisData); setNoteVal(avisData.note); setCommentaireVal(avisData.commentaire || '') }

      // Tous les avis reçus (témoignages), avec le nom de l'auteur — même
      // pattern que DashboardClub.jsx (auteur:auteur_id(prenom, nom, plan))
      const { data: avisListe } = await supabase.from('avis').select('*, auteur:auteur_id(prenom, nom, plan)').eq('cible_id', id).order('created_at', { ascending: false })
      setTousAvis(avisListe || [])

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

  const ouvrirChat = async () => {
    setChatOuvert(true)
    setLoadingChat(true)
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
    setMessagesChat(data || [])
    setLoadingChat(false)
  }

  const envoyerMessageChat = async () => {
    if (!nouveauMessageChat.trim()) return
    setEnvoyingMessageChat(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: id, content: nouveauMessageChat.trim(), created_at: new Date().toISOString() })
    await notifierJoueur({
      type: 'message',
      userId: id,
      titre: 'Nouveau message',
      contenu: { texte: nouveauMessageChat.trim() },
      lien: '/dashboard',
    })
    const contenuEnvoye = nouveauMessageChat.trim()
    setNouveauMessageChat('')
    setMessagesChat(prev => [...prev, { id: `local-${Date.now()}`, sender_id: userId, receiver_id: id, content: contenuEnvoye, created_at: new Date().toISOString() }])
    setEnvoyingMessageChat(false)
  }

  const estClub = educateur?.plan === 'club'

  const postuler = async (recrutementId) => {
    setPostulantId(recrutementId)
    const { error } = await supabase.from('candidatures').insert({ joueur_id: userId, club_id: id, recrutement_id: recrutementId })
    setPostulantId(null)
    if (error) { alert('Erreur : ' + error.message); return }
    setMesCandidatures(prev => ({ ...prev, [recrutementId]: 'en_attente' }))
  }

  const estValide = validations.length > 0
  const categories = [...new Set(joueurs.map(j => j.categorie).filter(Boolean))]

  // Victoires/Nuls/Défaites — seulement les matchs réellement joués (score
  // renseigné des deux côtés), sinon un match pas encore joué (score null)
  // se comptait à tort comme un nul 0-0 dans le total.
  const matchsJoues = matchs.filter(m => m.score_nous !== null && m.score_nous !== '' && m.score_eux !== null && m.score_eux !== '')
  const statsVND = matchsJoues.reduce((acc, m) => {
    const bp = parseInt(m.score_nous) || 0, bc = parseInt(m.score_eux) || 0
    if (bp > bc) acc.v++
    else if (bp < bc) acc.d++
    else acc.n++
    return acc
  }, { v: 0, n: 0, d: 0 })
  const totalJoues = matchsJoues.length

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    tab: (active) => ({ padding: '8px 18px', background: active ? colors.accent.green : 'transparent', color: active ? colors.black : colors.text.faint, border: `1px solid ${active ? colors.accent.green : colors.border.default}`, borderRadius: '20px', fontSize: '13px', fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    card: { background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem', marginBottom: '12px' },
    sectionTitle: { fontSize: '11px', fontWeight: 700, color: colors.accent.green, textTransform: 'uppercase', letterSpacing: '1.5px', margin: '0 0 12px' },
  }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.accent.green }}>{t('jexp_chargement', lang)}</div>
  if (!educateur) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint }}>{t('clubpub_club_introuvable', lang)}</div>

  return (
    <div style={st.page}>
      <button onClick={() => navigate(-1)}
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid #333', color: '#fff', padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        {t('clubpub_retour', lang)}
      </button>

      {/* Cover banner */}
      <div style={{ height: 180, background: 'linear-gradient(135deg, #061a0e 0%, #0d2010 40%, #030d07 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 30% 50%, #4ade8012 0%, transparent 70%)' }} />
        {educateur.avatar_url && <img src={educateur.avatar_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }} />}
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -44, marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          {/* Avatar — plus grand, chevauchant le banner */}
          <div style={{ position: 'relative' }}>
            {educateur.avatar_url
              ? <img src={educateur.avatar_url} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0a0a0a', boxShadow: '0 0 0 2px #4ade8040' }} />
              : <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#0d1a0d', border: '3px solid #0a0a0a', boxShadow: '0 0 0 2px #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: colors.accent.green }}>
                  {(educateur.club || educateur.prenom || '?')[0].toUpperCase()}
                </div>
            }
          </div>
          {userId !== id && (
            <button onClick={ouvrirChat}
              style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Contacter
            </button>
          )}
        </div>
        {/* Infos identité */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{educateur.club || `${educateur.prenom} ${educateur.nom}`}</h1>
            {educateur.verified && <span style={{ color: colors.accent.green }}>✅</span>}
            <BadgeNote cibleId={id} />
          </div>
          <p style={{ margin: '2px 0', fontSize: 13, color: colors.text.faint }}>{[educateur.niveau_equipe, educateur.region].filter(Boolean).join(' · ')}</p>
          <p style={{ margin: '2px 0', fontSize: 12, color: colors.text.faint }}>{t('clubpub_educateur_label', lang)} <span style={{ color: colors.text.secondary }}>{educateur.prenom} {educateur.nom}</span></p>
          {educateur.disponibilite && (
            <span style={{ display: 'inline-block', marginTop: 8, background: educateur.disponibilite === 'disponible' ? colors.accent.green + alpha.subtle : 'transparent', color: educateur.disponibilite === 'disponible' ? colors.accent.green : colors.text.faint, border: `1px solid ${educateur.disponibilite === 'disponible' ? '#4ade8040' : colors.border.default}`, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
              {educateur.disponibilite === 'disponible' ? '🟢 Disponible' : educateur.disponibilite === 'open_double' ? '🟡 Open à double mission' : '⚫ En poste'}
            </span>
          )}
        </div>
        {/* Barre de stats rapides */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          {(estClub ? [
            { val: categoriesClub.length, label: 'Équipes' },
            { val: recrutements.length, label: 'Recrutements' },
            { val: tousAvis.length, label: 'Avis' },
          ] : [
            { val: joueurs.length, label: 'Joueurs' },
            { val: matchs.length, label: 'Matchs' },
            { val: tousAvis.length, label: 'Avis' },
          ]).map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 20, color: colors.accent.green }}>{s.val}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.text.faint }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
        {/* ── Onglets ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {(estClub ? [
            { id: 'infos', label: t('clubpub_tab_infos', lang) },
            { id: 'equipes', label: `${t('clubpub_tab_equipes', lang)} (${categoriesClub.length})` },
            { id: 'recrutement', label: `Recrutement (${recrutements.length})` },
            { id: 'noter', label: `${t('clubpub_tab_noter', lang)} (${tousAvis.length})` },
          ] : [
            { id: 'infos', label: t('clubpub_tab_infos', lang) },
            { id: 'equipes', label: `${t('clubpub_tab_equipes', lang)} (${joueurs.length})` },
            { id: 'resultats', label: `${t('clubpub_tab_resultats', lang)} (${matchs.length})` },
            { id: 'classement', label: t('clubpub_tab_classement', lang) },
            { id: 'services', label: t('clubpub_tab_services', lang) },
            { id: 'noter', label: `${t('clubpub_tab_noter', lang)} (${tousAvis.length})` },
          ]).map(tab => (
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
            {profilExt?.diplome && (
              <div style={st.card}>
                <p style={st.sectionTitle}>{t('clubpub_diplome', lang)}</p>
                <p style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {profilExt.diplome}
                  {profilExt.diplome_verifie && (
                    <span style={{ background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>✓ {t('clubpub_diplome_verifie', lang)}</span>
                  )}
                </p>
              </div>
            )}
            {(educateur.specialites || []).length > 0 && (
              <div style={st.card}>
                <p style={st.sectionTitle}>{t('clubpub_specialites', lang)}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {educateur.specialites.map((s, i) => (
                    <span key={i} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, color: colors.text.secondary, padding: '4px 10px', borderRadius: '8px', fontSize: '12px' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {parcoursEdu.length > 0 && (
              <div style={st.card}>
                <p style={st.sectionTitle}>{t('clubpub_parcours', lang)}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {parcoursEdu.map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: i < parcoursEdu.length - 1 ? `1px solid ${colors.border.faint}` : 'none' }}>
                      <div style={{ color: colors.text.faint, fontSize: '12px', width: '90px', flexShrink: 0 }}>{[p.saison_debut, p.saison_fin].filter(Boolean).join(' – ')}</div>
                      <div style={{ fontSize: '13px', color: colors.text.secondary }}>{[p.club, p.poste, p.niveau].filter(Boolean).join(' · ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={st.card}>
              <p style={st.sectionTitle}>{t('clubpub_statistiques', lang)}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {(estClub ? [
                  { label: 'Équipes', val: categoriesClub.length },
                  { label: 'Recrutements actifs', val: recrutements.length },
                  { label: t('clubpub_categories', lang), val: [...new Set(categoriesClub.map(c => c.nom).filter(Boolean))].length },
                ] : [
                  { label: t('clubpub_joueurs_inscrits', lang), val: joueurs.length },
                  { label: t('clubpub_matchs_joues', lang), val: matchs.length },
                  { label: t('clubpub_categories', lang), val: categories.length },
                ]).map(s => (
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
        {onglet === 'equipes' && estClub && (
          <div>
            {categoriesClub.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: colors.border.strong }}>
                <p style={{ fontSize: '32px' }}>👥</p>
                <p style={{ color: colors.text.disabled }}>{t('clubpub_aucun_joueur', lang)}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoriesClub.map(cat => (
                  <div key={cat.id} style={{ ...st.card, marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {cat.couleur && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.couleur, flexShrink: 0 }} />}
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{cat.nom} {cat.equipe || ''}</span>
                    </div>
                    {cat.educateur_id && (
                      <button onClick={() => navigate(`/clubs/${cat.educateur_id}`)} style={{ background: 'none', border: 'none', color: colors.accent.green, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        Voir l'équipe →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECRUTEMENT (club) ── */}
        {onglet === 'recrutement' && estClub && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recrutements.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: colors.border.strong }}>
                <p style={{ fontSize: '32px' }}>🔍</p>
                <p style={{ color: colors.text.disabled }}>Aucun recrutement en cours.</p>
              </div>
            ) : recrutements.map(r => {
              const statutCandidature = mesCandidatures[r.id]
              return (
                <div key={r.id} style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {r.categorie && <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{r.categorie}</span>}
                        {r.poste && <span style={{ fontWeight: 600, fontSize: '15px' }}>{r.poste}</span>}
                      </div>
                      {r.niveau && <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.faint }}>Niveau : {r.niveau}</p>}
                      {r.description && <p style={{ margin: '8px 0 0', fontSize: '13px', color: colors.text.secondary }}>{r.description}</p>}
                    </div>
                    {statutCandidature ? (
                      <span style={{ flexShrink: 0, fontSize: '12px', color: colors.accent.green, fontWeight: 600 }}>✓ Candidature envoyée</span>
                    ) : (
                      <button onClick={() => postuler(r.id)} disabled={postulantId === r.id}
                        style={{ flexShrink: 0, background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', opacity: postulantId === r.id ? 0.6 : 1 }}>
                        {postulantId === r.id ? 'Envoi...' : 'Postuler'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {onglet === 'equipes' && !estClub && (
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
            {totalJoues > 0 && (
              <div style={st.card}>
                <p style={st.sectionTitle}>{t('clubpub_bilan', lang)}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: t('clubpub_victoires', lang), val: statsVND.v, color: colors.accent.green },
                    { label: t('clubpub_nuls', lang), val: statsVND.n, color: '#f59e0b' },
                    { label: t('clubpub_defaites', lang), val: statsVND.d, color: colors.accent.red },
                  ].map(s => (
                    <div key={s.label} style={{ background: colors.background.sunken, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: s.color }}>{s.val}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: s.color }}>{Math.round(s.val / totalJoues * 100)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* ── SERVICES ── */}
        {onglet === 'services' && (
          <div>
            {(educateur.services_proposes || []).length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '48px', color: colors.border.strong }}>
                <p style={{ fontSize: '32px' }}>🛠️</p>
                <p style={{ color: colors.text.disabled }}>{t('clubpub_aucun_service', lang)}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {educateur.services_proposes.map((srv, i) => (
                  <div key={i} style={{ background: '#0d1a0d', border: '1px solid #1e3a1e', borderRadius: '10px', padding: '14px 18px', color: colors.accent.green, fontSize: '14px', fontWeight: 600 }}>
                    {srv}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTER ── */}
        {onglet === 'noter' && (
          <div>
            {/* Section validation participation — n'a de sens que pour un éducateur
                (prouver qu'on a joué dans SON équipe) ; noter le club dans son
                ensemble ne demande pas cette preuve */}
            {!estClub && <div style={{ ...st.card, background: '#0d1a0d', border: '1px solid #1e3a1e' }}>
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
            </div>}

            {/* Section notation */}
            {!estClub && !estValide && !valSuccess ? (
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

            {/* Témoignages reçus */}
            <div style={st.card}>
              <p style={st.sectionTitle}>{t('clubpub_temoignages', lang)} ({tousAvis.length})</p>
              {tousAvis.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: colors.text.disabled }}>{t('clubpub_aucun_temoignage', lang)}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {tousAvis.map((av, i) => (
                    <div key={av.id} style={{ padding: '12px 0', borderBottom: i < tousAvis.length - 1 ? `1px solid ${colors.border.faint}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{av.auteur ? `${av.auteur.prenom} ${av.auteur.nom}` : 'Anonyme'}</span>
                        <span style={{ color: '#f59e0b', fontSize: '13px' }}>{'★'.repeat(av.note)}{'☆'.repeat(5 - av.note)}</span>
                      </div>
                      {av.commentaire && <p style={{ margin: '6px 0 0', color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{av.commentaire}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {chatOuvert && (
        <div onClick={() => setChatOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: '520px', maxHeight: '78vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{educateur.club || `${educateur.prenom} ${educateur.nom}`}</p>
              <button onClick={() => setChatOuvert(false)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {loadingChat ? (
                <p style={{ color: colors.text.disabled, fontSize: '12px', textAlign: 'center' }}>Chargement...</p>
              ) : messagesChat.length === 0 ? (
                <p style={{ color: colors.text.disabled, fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>Aucun message pour l'instant — dis bonjour !</p>
              ) : (
                messagesChat.map(m => (
                  <div key={m.id} style={{ alignSelf: m.sender_id === userId ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div style={{
                      background: m.sender_id === userId ? colors.accent.green : colors.background.raised,
                      color: m.sender_id === userId ? colors.black : colors.text.primary,
                      borderRadius: '12px', padding: '8px 12px', fontSize: '13px', lineHeight: 1.4,
                    }}>{m.content}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <input value={nouveauMessageChat} onChange={e => setNouveauMessageChat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && envoyerMessageChat()}
                placeholder="Écrire un message..."
                style={{ flex: 1, background: colors.background.raised, border: '1px solid #2a2a2a', borderRadius: '8px', color: colors.text.primary, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
              <button onClick={envoyerMessageChat} disabled={envoyingMessageChat || !nouveauMessageChat.trim()}
                style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: (envoyingMessageChat || !nouveauMessageChat.trim()) ? 0.5 : 1 }}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
