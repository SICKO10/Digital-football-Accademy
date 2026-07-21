import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { ModalNotation, BadgeNote } from '../components/Notation'
import { ModalGrilleSeance } from '../components/GrilleSeance'
import { notifierJoueur } from '../lib/notifications'

function DashboardCoach() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('analyses')
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loomUrls, setLoomUrls] = useState({})
  const [sending, setSending] = useState({})
  const [coachId, setCoachId] = useState(null)

  // Certifications
  const [certifs, setCertifs] = useState([])
  const [certifLoading, setCertifLoading] = useState(true)
  const [commentaires, setCommentaires] = useState({})
  const [validating, setValidating] = useState({})

  // Clubs / Agents
  const [recruteurs, setRecruteurs] = useState([])
  const [recruteurModal, setRecruteurModal] = useState(null)

  // Notation
  const [notationCible, setNotationCible] = useState(null)

  // Séances transférées par les clubs
  const [seancesTransferees, setSeancesTransferees] = useState([])
  const [seanceEvalModal, setSeanceEvalModal] = useState(null)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCoachId(user.id)
    await Promise.all([getDemandes(), getCertifications(), getRecruteurs(), chargerSeancesTransferees()])
  }

  const prendreEnCharge = async (table, id, dejaPris) => {
    if (dejaPris) {
      // Libérer la prise en charge
      await supabase.from(table).update({ pris_en_charge_par: null, pris_en_charge_at: null }).eq('id', id)
    } else {
      await supabase.from(table).update({ pris_en_charge_par: coachId, pris_en_charge_at: new Date().toISOString() }).eq('id', id)
    }
    if (table === 'demandes') await getDemandes()
    else await chargerSeancesTransferees()
  }

  const getDemandes = async () => {
    const { data, error } = await supabase
      .from('demandes')
      .select('*, profiles!demandes_joueur_id_fkey(id, prenom, nom, email, plan), coach:profiles!demandes_pris_en_charge_par_fkey(prenom, nom)')
      .order('created_at', { ascending: false })
    if (error) console.error('Erreur getDemandes:', error)
    if (!error) setDemandes(data)
    setLoading(false)
  }

  const getRecruteurs = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, region, type_recruteur, description, recherche_profil, avatar_url, plan')
      .eq('plan', 'recruteur')
      .order('created_at', { ascending: false })
    if (data) setRecruteurs(data)
  }

  const chargerSeancesTransferees = async () => {
    const { data } = await supabase
      .from('seances_uploadees')
      .select('*, educateur:educateur_id(prenom, nom), club:club_id(club, prenom, nom), evaluation:evaluations_seance(*), coach:pris_en_charge_par(prenom, nom)')
      .eq('statut', 'transfere_coach')
      .order('created_at', { ascending: false })
    setSeancesTransferees(data || [])
  }

  const soumettreGrilleCoach = async (payload) => {
    await supabase.from('evaluations_seance').upsert({
      seance_id: seanceEvalModal.id,
      evaluateur_id: coachId,
      evaluateur_type: 'coach',
      criteres: payload.criteres,
      note_preparation: payload.note_preparation,
      note_animation: payload.note_animation,
      note_pedagogie: payload.note_pedagogie,
      note_management: payload.note_management,
      note_football: payload.note_football,
      note_totale: payload.note_totale,
      points_forts: payload.points_forts,
      axes_amelioration: payload.axes_amelioration,
      actions: payload.actions,
    }, { onConflict: 'seance_id' })
    await supabase.from('seances_uploadees').update({ statut: 'analyse' }).eq('id', seanceEvalModal.id)

    // Un seul destinataire : l'éducateur pour une séance "ouverte" (sans club), le club sinon.
    // educateur_id/club_id sont tous deux des profiles.id — notifierJoueur fonctionne pour n'importe quel profil.
    try {
      const destinataireId = seanceEvalModal.origine === 'ouvert' ? seanceEvalModal.educateur_id : seanceEvalModal.club_id
      if (destinataireId) {
        await notifierJoueur({
          type: 'analyse_seance',
          userId: destinataireId,
          titre: 'Analyse de séance disponible',
          contenu: { texte: `La séance "${seanceEvalModal.theme || 'sans thème'}" a été analysée par un coach.` },
          lien: seanceEvalModal.origine === 'ouvert' ? '/educateur' : '/club',
        })
      }
    } catch (e) {
      console.error('Erreur notification analyse séance:', e)
    }

    await chargerSeancesTransferees()
    setSeanceEvalModal(null)
  }

  const getCertifications = async () => {
    const { data, error } = await supabase
      .from('certifications')
      .select('*, profiles(id, prenom, nom, email)')
      .order('created_at', { ascending: false })
    if (!error) setCertifs(data || [])
    setCertifLoading(false)
  }

  const validerCertification = async (certif) => {
    setValidating(prev => ({ ...prev, [certif.id]: 'validating' }))
    const { error } = await supabase.from('certifications')
      .update({ statut: 'validé', validated_at: new Date().toISOString(), commentaire_admin: commentaires[certif.id] || null })
      .eq('id', certif.id)
    if (!error) {
      // Notifier le joueur
      if (coachId && certif.profiles?.id) {
        await supabase.from('messages').insert({
          sender_id: coachId,
          receiver_id: certif.profiles.id,
          content: `⭐ Félicitations ! Ta certification "${certif.niveau}" pour la saison ${certif.saison} a été validée. Le badge apparaît maintenant sur ton profil.`,
          created_at: new Date().toISOString()
        })
      }
      setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: 'validé' } : c))
    }
    setValidating(prev => ({ ...prev, [certif.id]: null }))
  }

  const rejeterCertification = async (certif) => {
    const motif = commentaires[certif.id]?.trim()
    if (!motif) { alert('Indique un motif de rejet avant de rejeter.'); return }
    setValidating(prev => ({ ...prev, [certif.id]: 'rejecting' }))
    const { error } = await supabase.from('certifications')
      .update({ statut: 'rejeté', commentaire_admin: motif })
      .eq('id', certif.id)
    if (!error) {
      if (coachId && certif.profiles?.id) {
        await supabase.from('messages').insert({
          sender_id: coachId,
          receiver_id: certif.profiles.id,
          content: `❌ Ta demande de certification "${certif.niveau}" (${certif.saison}) a été rejetée. Motif : ${motif}`,
          created_at: new Date().toISOString()
        })
      }
      setCertifs(prev => prev.map(c => c.id === certif.id ? { ...c, statut: 'rejeté', commentaire_admin: motif } : c))
    }
    setValidating(prev => ({ ...prev, [certif.id]: null }))
  }

  const envoyerAnalyse = async (demandeId, joueurId) => {
    const loomUrl = loomUrls[demandeId]
    if (!loomUrl) return alert('Colle le lien vidéo avant de valider')

    setSending(prev => ({ ...prev, [demandeId]: true }))

    await supabase.from('demandes')
      .update({ statut: 'analyse', loom_url: loomUrl })
      .eq('id', demandeId)

    const demande = demandes.find(d => d.id === demandeId)
    const titreDemande = demande?.titre || 'ta vidéo'
    const joueurPrenom = demande?.profiles?.prenom || 'le joueur'

    if (coachId && joueurId) {
      await supabase.from('messages').insert({
        sender_id: coachId,
        receiver_id: joueurId,
        content: `🎬 Ton analyse vidéo est prête ! J'ai analysé "${titreDemande}". Regarde ici : ${loomUrl}`,
        created_at: new Date().toISOString()
      })
    }

    if (joueurId) {
      await notifierJoueur({
        type: 'analyse',
        userId: joueurId,
        titre: `Analyse de "${titreDemande}" prête`,
        contenu: { texte: `Regarde ici : ${loomUrl}` },
        lien: '/dashboard',
      })
    }

    setDemandes(prev => prev.map(d =>
      d.id === demandeId ? { ...d, statut: 'analyse', loom_url: loomUrl } : d
    ))

    setSending(prev => ({ ...prev, [demandeId]: false }))
    setLoomUrls(prev => ({ ...prev, [demandeId]: '' }))
    alert(`✅ Analyse envoyée à ${joueurPrenom} !`)
  }

  const getVideoUrl = (demande) => demande.video_url || demande.lien_video || demande.clip_url || null
  const isVeo = (url) => url && url.includes('veo.co')
  const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))

  const getStatutColor = (statut) => {
    if (statut === 'en_attente') return '#f59e0b'
    if (statut === 'validé') return '#4ade80'
    if (statut === 'rejeté') return '#f87171'
    if (statut === 'analyse') return '#4ade80'
    return '#666'
  }

  const getStatutLabel = (statut) => {
    if (statut === 'en_attente') return 'En attente'
    if (statut === 'analyse') return 'Analyse envoyée'
    if (statut === 'validé') return '✅ Validé'
    if (statut === 'rejeté') return '❌ Rejeté'
    return statut
  }

  const certifsEnAttente = certifs.filter(c => c.statut === 'en_attente')
  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const analysees = demandes.filter(d => d.statut === 'analyse')

  // Grouper les demandes par joueur
  const demandesParJoueur = demandes.reduce((acc, d) => {
    const id = d.profiles?.id || 'inconnu'
    if (!acc[id]) acc[id] = { profil: d.profiles, demandes: [] }
    acc[id].demandes.push(d)
    return acc
  }, {})
  const joueursAvecDemandes = Object.values(demandesParJoueur)
    .sort((a, b) => {
      const aEnAttente = a.demandes.filter(d => d.statut === 'en_attente').length
      const bEnAttente = b.demandes.filter(d => d.statut === 'en_attente').length
      return bEnAttente - aEnAttente // Priorité aux joueurs avec des demandes en attente
    })

  const [joueursOuverts, setJoueursOuverts] = useState({})
  const toggleJoueur = (id) => setJoueursOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading && certifLoading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'sans-serif' }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
          <span style={{ fontSize: '12px', color: '#4ade80', marginLeft: '8px', background: '#4ade8020', padding: '2px 8px', borderRadius: '20px' }}>Coach</span>
        </div>
        <button onClick={() => { supabase.auth.signOut(); navigate('/') }}
          style={{ background: 'transparent', color: '#666', border: '1px solid #333', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Total demandes</p>
            <p style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>{demandes.length}</p>
          </div>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>En attente</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', margin: 0 }}>{enAttente.length}</p>
          </div>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Analyses envoyées</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#4ade80', margin: 0 }}>{analysees.length}</p>
          </div>
          <div style={{ background: '#111', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer' }}
            onClick={() => setActiveSection('certifications')}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Certifs à valider</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: certifsEnAttente.length > 0 ? '#f59e0b' : '#4ade80', margin: 0 }}>{certifsEnAttente.length}</p>
          </div>
        </div>

        {/* BANNERS */}
        {enAttente.length > 0 && activeSection === 'analyses' && (
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
              {enAttente.length} demande{enAttente.length > 1 ? 's' : ''} en attente d'analyse
            </p>
          </div>
        )}
        {certifsEnAttente.length > 0 && activeSection === 'certifications' && (
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⭐</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
              {certifsEnAttente.length} certification{certifsEnAttente.length > 1 ? 's' : ''} en attente de validation
            </p>
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'analyses', label: '🎬 Demandes d\'analyse', count: enAttente.length },
            { key: 'certifications', label: '⭐ Certifications', count: certifsEnAttente.length },
            { key: 'recruteurs', label: '🏢 Clubs / Agents', count: 0 },
            { key: 'seances_club', label: '🎥 Séances club', count: seancesTransferees.length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)}
              style={{
                background: activeSection === tab.key ? '#4ade80' : '#111',
                color: activeSection === tab.key ? '#0a0a0a' : '#aaa',
                border: `1px solid ${activeSection === tab.key ? '#4ade80' : '#333'}`,
                padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: activeSection === tab.key ? '#0a0a0a30' : '#f59e0b',
                  color: activeSection === tab.key ? '#0a0a0a' : '#0a0a0a',
                  borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                  padding: '1px 7px', minWidth: '18px', textAlign: 'center'
                }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ===== SECTION ANALYSES ===== */}
        {activeSection === 'analyses' && (
          <>
            {demandes.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</p>
                <p style={{ color: '#666' }}>Aucune demande pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {joueursAvecDemandes.map(({ profil, demandes: demandesJoueur }) => {
                  const joueurId = profil?.id || 'inconnu'
                  const ouvert = joueursOuverts[joueurId]
                  const nbAttente = demandesJoueur.filter(d => d.statut === 'en_attente').length
                  const nbAnalysees = demandesJoueur.filter(d => d.statut === 'analyse').length
                  const initiales = `${(profil?.prenom || '?')[0]}${(profil?.nom || '?')[0]}`
                  return (
                    <div key={joueurId} style={{ background: '#111', border: `1px solid ${nbAttente > 0 ? '#f59e0b30' : '#222'}`, borderRadius: '14px', overflow: 'hidden' }}>
                      {/* En-tête joueur (toujours visible) */}
                      <div onClick={() => toggleJoueur(joueurId)}
                        style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                          {initiales}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{profil?.prenom} {profil?.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{profil?.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {nbAttente > 0 && <span style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>⏳ {nbAttente} en attente</span>}
                          {nbAnalysees > 0 && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>✅ {nbAnalysees} envoyée{nbAnalysees > 1 ? 's' : ''}</span>}
                          <span style={{ color: '#444', fontSize: '18px', marginLeft: '4px' }}>{ouvert ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Demandes du joueur (dépliable) */}
                      {ouvert && (
                        <div style={{ borderTop: '1px solid #1a1a1a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {demandesJoueur.map(demande => {
                            const videoUrl = getVideoUrl(demande)
                            const isSending = sending[demande.id]
                            return (
                              <div key={demande.id} style={{ background: '#0d0d0d', border: `1px solid ${demande.statut === 'en_attente' ? '#f59e0b20' : '#1a1a1a'}`, borderRadius: '10px', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>{demande.titre}</h3>
                                  <span style={{ background: getStatutColor(demande.statut) + '20', color: getStatutColor(demande.statut), fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                    {getStatutLabel(demande.statut)}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                  {demande.pris_en_charge_par ? (
                                    <>
                                      <span style={{ background: demande.pris_en_charge_par === coachId ? '#4ade8015' : '#f59e0b15', border: `1px solid ${demande.pris_en_charge_par === coachId ? '#4ade8040' : '#f59e0b40'}`, color: demande.pris_en_charge_par === coachId ? '#4ade80' : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
                                        {demande.pris_en_charge_par === coachId ? '✅ Pris en charge par toi' : `🔒 Pris en charge par ${demande.coach?.prenom || 'un autre coach'}`}
                                      </span>
                                      {demande.pris_en_charge_par === coachId && (
                                        <button onClick={() => prendreEnCharge('demandes', demande.id, true)} style={{ background: 'none', border: '1px solid #333', color: '#666', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                                      )}
                                    </>
                                  ) : (
                                    <button onClick={() => prendreEnCharge('demandes', demande.id, false)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                                    <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Poste</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{demande.poste}</p>
                                  </div>
                                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                                    <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Plan</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#4ade80', textTransform: 'capitalize', margin: '4px 0 0' }}>{profil?.plan}</p>
                                  </div>
                                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                                    <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Date</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '4px 0 0' }}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                </div>

                                {demande.description && (
                                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Ce que le joueur veut analyser</p>
                                    <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0' }}>{demande.description}</p>
                                  </div>
                                )}

                                {videoUrl ? (
                                  <div style={{ marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '11px', color: '#555', margin: '0 0 8px' }}>Vidéo</p>
                                    {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                                      <a href={videoUrl} target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                                        🎬 {isVeo(videoUrl) ? 'Ouvrir sur Veo' : 'Ouvrir sur YouTube'}
                                      </a>
                                    ) : (
                                      <video src={videoUrl.includes('cloudinary.com') ? videoUrl.replace('/upload/', '/upload/q_auto,f_mp4/') : videoUrl} controls style={{ width: '100%', maxHeight: '280px', borderRadius: '8px', background: '#000' }} />
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>⚠️ Aucune vidéo fournie</p>
                                  </div>
                                )}

                                {demande.statut === 'en_attente' && (
                                  <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px' }}>
                                      📨 Le joueur recevra une notification automatique dans son dashboard dès l'envoi
                          </p>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <input
                              placeholder="Colle ton lien YouTube ou Loom ici..."
                              value={loomUrls[demande.id] || ''}
                              onChange={e => setLoomUrls(prev => ({ ...prev, [demande.id]: e.target.value }))}
                              style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px', outline: 'none' }}
                            />
                            <button
                              onClick={() => envoyerAnalyse(demande.id, demande.profiles?.id)}
                              disabled={isSending || !loomUrls[demande.id]?.trim()}
                              style={{ background: isSending ? '#333' : '#4ade80', color: isSending ? '#666' : '#0a0a0a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isSending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: (!loomUrls[demande.id]?.trim() && !isSending) ? 0.5 : 1 }}>
                              {isSending ? 'Envoi...' : '🚀 Envoyer l\'analyse'}
                            </button>
                          </div>
                        </div>
                      )}

                      {demande.statut === 'analyse' && demande.loom_url && (
                        <div style={{ background: '#4ade8010', border: '1px solid #4ade8033', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                          <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '6px', fontWeight: 600, margin: '0 0 6px' }}>✅ Analyse envoyée — notification joueur envoyée</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <a href={demande.loom_url} target="_blank" rel="noreferrer"
                              style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isYoutube(demande.loom_url) ? '▶️' : '🎥'} <span style={{ textDecoration: 'underline' }}>{demande.loom_url}</span>
                            </a>
                            <button onClick={() => setNotationCible({ id: profil?.id, prenom: profil?.prenom, nom: profil?.nom, plan: profil?.plan })}
                              style={{ background: '#fbbf2415', border: '1px solid #fbbf2440', color: '#fbbf24', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
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
            )}
          </>
        )}

        {/* ===== SECTION CERTIFICATIONS ===== */}
        {activeSection === 'certifications' && (
          <>
            {certifLoading ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
            ) : certifs.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</p>
                <p style={{ color: '#666' }}>Aucune demande de certification pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {certifs.map(certif => {
                  const isProcessing = validating[certif.id]
                  const isPending = certif.statut === 'en_attente'
                  return (
                    <div key={certif.id} style={{
                      background: '#111',
                      border: `1px solid ${isPending ? '#f59e0b30' : certif.statut === 'validé' ? '#4ade8030' : '#f8717130'}`,
                      borderRadius: '12px', padding: '1.5rem'
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                            {certif.profiles?.prenom} {certif.profiles?.nom}
                          </h3>
                          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{certif.profiles?.email}</p>
                        </div>
                        <span style={{
                          background: getStatutColor(certif.statut) + '20',
                          color: getStatutColor(certif.statut),
                          fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap'
                        }}>
                          {getStatutLabel(certif.statut)}
                        </span>
                      </div>

                      {/* Infos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                          <p style={{ fontSize: '11px', color: '#555', margin: '0 0 4px' }}>Niveau</p>
                          <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: '#fbbf24' }}>{certif.niveau}</p>
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                          <p style={{ fontSize: '11px', color: '#555', margin: '0 0 4px' }}>Saison</p>
                          <p style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>{certif.saison}</p>
                        </div>
                        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                          <p style={{ fontSize: '11px', color: '#555', margin: '0 0 4px' }}>Soumis le</p>
                          <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{new Date(certif.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>

                      {/* Documents (feuilles de match) */}
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '12px', color: '#555', margin: '0 0 8px' }}>
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
                                    background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                                    padding: '8px 12px', color: '#4ade80', fontSize: '13px',
                                    textDecoration: 'none', fontWeight: '500'
                                  }}>
                                  {isPdf ? '📄' : '🖼️'} Feuille {i + 1}
                                </a>
                              )
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>⚠️ Aucun document joint</p>
                        )}
                      </div>

                      {/* Commentaire admin (déjà rejeté ou validé) */}
                      {certif.commentaire_admin && !isPending && (
                        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                          <p style={{ fontSize: '11px', color: '#555', margin: '0 0 4px' }}>Commentaire admin</p>
                          <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>{certif.commentaire_admin}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {isPending && (
                        <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem' }}>
                          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px' }}>
                            💬 Commentaire (obligatoire en cas de rejet)
                          </p>
                          <textarea
                            placeholder="Ex : Documents illisibles, mauvais niveau, etc."
                            value={commentaires[certif.id] || ''}
                            onChange={e => setCommentaires(prev => ({ ...prev, [certif.id]: e.target.value }))}
                            rows={2}
                            style={{
                              width: '100%', background: '#111', border: '1px solid #333', borderRadius: '8px',
                              padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none',
                              resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px', fontFamily: 'sans-serif'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              onClick={() => validerCertification(certif)}
                              disabled={!!isProcessing}
                              style={{
                                flex: 1, background: isProcessing === 'validating' ? '#333' : '#4ade80',
                                color: isProcessing === 'validating' ? '#666' : '#0a0a0a',
                                border: 'none', padding: '10px 0', borderRadius: '8px',
                                fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                              }}>
                              {isProcessing === 'validating' ? 'Validation...' : '✅ Valider le badge'}
                            </button>
                            <button
                              onClick={() => rejeterCertification(certif)}
                              disabled={!!isProcessing}
                              style={{
                                flex: 1, background: isProcessing === 'rejecting' ? '#333' : '#f8717120',
                                color: isProcessing === 'rejecting' ? '#666' : '#f87171',
                                border: '1px solid #f8717140', padding: '10px 0', borderRadius: '8px',
                                fontSize: '14px', fontWeight: '700', cursor: isProcessing ? 'not-allowed' : 'pointer'
                              }}>
                              {isProcessing === 'rejecting' ? 'Rejet...' : '❌ Rejeter'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Validé */}
                      {certif.statut === 'validé' && certif.validated_at && (
                        <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '8px', padding: '0.75rem' }}>
                          <p style={{ fontSize: '13px', color: '#4ade80', margin: 0, fontWeight: 600 }}>
                            ⭐ Badge validé le {new Date(certif.validated_at).toLocaleDateString('fr-FR')} — notification envoyée au joueur
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== SECTION CLUBS / AGENTS ===== */}
        {activeSection === 'recruteurs' && (
          <>
            {recruteurs.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏢</p>
                <p style={{ color: '#666' }}>Aucun recruteur inscrit pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recruteurs.map(r => {
                  const initiales = `${(r.prenom || '?')[0]}${(r.nom || '?')[0]}`
                  return (
                    <div key={r.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Avatar */}
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                          {initiales}
                        </div>
                      )}
                      {/* Infos */}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{r.prenom} {r.nom}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#666' }}>
                          {r.type_recruteur || 'Recruteur'}{r.club ? ` — ${r.club}` : ''}{r.region ? ` · ${r.region}` : ''}
                        </p>
                      </div>
                      {/* Bouton profil */}
                      <button onClick={() => setRecruteurModal(r)}
                        style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        👤 Voir le profil
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== SECTION SÉANCES CLUB ===== */}
        {activeSection === 'seances_club' && (
          <>
            {seancesTransferees.length === 0 ? (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎥</p>
                <p style={{ color: '#666' }}>Aucune séance transférée par un club pour l'instant</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {seancesTransferees.map(s => {
                  const eval_ = Array.isArray(s.evaluation) ? s.evaluation[0] : s.evaluation
                  return (
                    <div key={s.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{s.educateur?.prenom} {s.educateur?.nom} — {s.theme || 'Séance'}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                          Club : {s.club?.club || `${s.club?.prenom} ${s.club?.nom}`} · {s.saison}
                          {s.date_seance ? ` · ${new Date(s.date_seance).toLocaleDateString('fr-FR')}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {s.pris_en_charge_par ? (
                          <>
                            <span style={{ background: s.pris_en_charge_par === coachId ? '#4ade8015' : '#f59e0b15', border: `1px solid ${s.pris_en_charge_par === coachId ? '#4ade8040' : '#f59e0b40'}`, color: s.pris_en_charge_par === coachId ? '#4ade80' : '#f59e0b', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                              {s.pris_en_charge_par === coachId ? '✅ Toi' : `🔒 ${s.coach?.prenom || 'Autre coach'}`}
                            </span>
                            {s.pris_en_charge_par === coachId && (
                              <button onClick={() => prendreEnCharge('seances_uploadees', s.id, true)} style={{ background: 'none', border: '1px solid #333', color: '#666', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>Libérer</button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => prendreEnCharge('seances_uploadees', s.id, false)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🙋 Je m'en occupe</button>
                        )}
                        <a href={s.video_url} target="_blank" rel="noreferrer" style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>🎬 Voir</a>
                        {s.statut === 'transfere_coach' && (
                          <button onClick={() => setSeanceEvalModal(s)} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>📋 Analyser</button>
                        )}
                        {eval_ && (
                          <span style={{ background: '#4ade8015', color: '#4ade80', fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>✅ {Math.round(eval_.note_totale)}/100</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL PROFIL RECRUTEUR */}
      {recruteurModal && (
        <div onClick={() => setRecruteurModal(null)} style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
              {recruteurModal.avatar_url ? (
                <img src={recruteurModal.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1a2e3a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 800, fontSize: '20px' }}>
                  {`${(recruteurModal.prenom || '?')[0]}${(recruteurModal.nom || '?')[0]}`}
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{recruteurModal.prenom} {recruteurModal.nom}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>{recruteurModal.type_recruteur || 'Recruteur'}</p>
              </div>
            </div>

            {/* Infos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
              {recruteurModal.club && (
                <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Club / Structure</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0' }}>{recruteurModal.club}</p>
                </div>
              )}
              {recruteurModal.region && (
                <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ fontSize: '11px', color: '#555', margin: 0 }}>Région</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 0' }}>{recruteurModal.region}</p>
                </div>
              )}
            </div>

            {recruteurModal.description && (
              <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: '#555', margin: '0 0 6px' }}>À propos</p>
                <p style={{ fontSize: '14px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>{recruteurModal.description}</p>
              </div>
            )}

            {recruteurModal.recherche_profil && (
              <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa30', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '11px', color: '#60a5fa', margin: '0 0 6px', fontWeight: 600 }}>🔍 Profil recherché</p>
                <p style={{ fontSize: '14px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>{recruteurModal.recherche_profil}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>📧 {recruteurModal.email}</p>
            </div>

            <button onClick={() => setRecruteurModal(null)}
              style={{ width: '100%', marginTop: '1.5rem', background: '#1a1a1a', color: '#aaa', border: '1px solid #333', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {notationCible && (
        <ModalNotation
          auteurId={coachId}
          cible={notationCible}
          onClose={() => setNotationCible(null)}
          onDone={() => setNotationCible(null)}
        />
      )}

      {seanceEvalModal && (
        <ModalGrilleSeance
          seance={seanceEvalModal}
          onClose={() => setSeanceEvalModal(null)}
          onSubmit={soumettreGrilleCoach}
          evaluateurType="coach"
        />
      )}
    </div>
  )
}

export default DashboardCoach
