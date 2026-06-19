import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function DashboardCoach() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loomUrls, setLoomUrls] = useState({})
  const [sending, setSending] = useState({})
  const [coachId, setCoachId] = useState(null)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCoachId(user.id)
    await getDemandes()
  }

  const getDemandes = async () => {
    const { data, error } = await supabase
      .from('demandes')
      .select('*, profiles(id, prenom, nom, email, plan)')
      .order('created_at', { ascending: false })
    if (!error) setDemandes(data)
    setLoading(false)
  }

  const envoyerAnalyse = async (demandeId, joueurId) => {
    const loomUrl = loomUrls[demandeId]
    if (!loomUrl) return alert('Colle le lien Loom avant de valider')

    setSending(prev => ({ ...prev, [demandeId]: true }))

    // 1. Mettre à jour la demande
    await supabase.from('demandes')
      .update({ statut: 'analyse', loom_url: loomUrl })
      .eq('id', demandeId)

    // 2. Trouver la demande pour avoir le titre
    const demande = demandes.find(d => d.id === demandeId)
    const titreDemande = demande?.titre || 'ta vidéo'
    const joueurPrenom = demande?.profiles?.prenom || 'le joueur'

    // 3. Envoyer une notification via message automatique
    if (coachId && joueurId) {
      await supabase.from('messages').insert({
        sender_id: coachId,
        receiver_id: joueurId,
        content: `🎬 Ton analyse vidéo est prête ! J'ai analysé "${titreDemande}". Regarde ici : ${loomUrl}`,
        created_at: new Date().toISOString()
      })
    }

    // 4. Mettre à jour l'UI
    setDemandes(prev => prev.map(d =>
      d.id === demandeId ? { ...d, statut: 'analyse', loom_url: loomUrl } : d
    ))

    setSending(prev => ({ ...prev, [demandeId]: false }))
    setLoomUrls(prev => ({ ...prev, [demandeId]: '' }))
    alert(`✅ Analyse envoyée à ${joueurPrenom} ! Il recevra une notification dans son dashboard.`)
  }

  const getVideoUrl = (demande) => demande.video_url || demande.lien_video || demande.clip_url || null
  const isVeo = (url) => url && url.includes('veo.co')
  const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))

  const getStatutColor = (statut) => {
    if (statut === 'en_attente') return '#f59e0b'
    if (statut === 'analyse') return '#4ade80'
    return '#666'
  }

  const getStatutLabel = (statut) => {
    if (statut === 'en_attente') return 'En attente'
    if (statut === 'analyse') return 'Analyse envoyée'
    return statut
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'sans-serif' }}>Chargement...</p>
    </div>
  )

  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const analysees = demandes.filter(d => d.statut === 'analyse')

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Total demandes</p>
            <p style={{ fontSize: '28px', fontWeight: '700' }}>{demandes.length}</p>
          </div>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>En attente</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{enAttente.length}</p>
          </div>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Analyses envoyées</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#4ade80' }}>{analysees.length}</p>
          </div>
        </div>

        {/* PRIORITÉ : demandes en attente */}
        {enAttente.length > 0 && (
          <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <p style={{ margin: 0, fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>
              {enAttente.length} demande{enAttente.length > 1 ? 's' : ''} en attente d'analyse
            </p>
          </div>
        )}

        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1.5rem' }}>Demandes d'analyse</h2>

        {demandes.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</p>
            <p style={{ color: '#666' }}>Aucune demande pour le moment</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {demandes.map(demande => {
              const videoUrl = getVideoUrl(demande)
              const isSending = sending[demande.id]
              return (
                <div key={demande.id} style={{ background: '#111', border: `1px solid ${demande.statut === 'en_attente' ? '#f59e0b30' : '#222'}`, borderRadius: '12px', padding: '1.5rem' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{demande.titre}</h3>
                      <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                        {demande.profiles?.prenom} {demande.profiles?.nom}
                        <span style={{ color: '#555', marginLeft: '6px' }}>— {demande.profiles?.email}</span>
                      </p>
                    </div>
                    <span style={{ background: getStatutColor(demande.statut) + '20', color: getStatutColor(demande.statut), fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {getStatutLabel(demande.statut)}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                      <p style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>Poste</p>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{demande.poste}</p>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                      <p style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>Plan</p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#4ade80', textTransform: 'capitalize', margin: 0 }}>{demande.profiles?.plan}</p>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
                      <p style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>Date</p>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {demande.description && (
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>Ce que le joueur veut analyser</p>
                      <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>{demande.description}</p>
                    </div>
                  )}

                  {/* VIDEO */}
                  {videoUrl ? (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>Vidéo du joueur</p>
                      {isVeo(videoUrl) || isYoutube(videoUrl) ? (
                        <a href={videoUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                          🎬 {isVeo(videoUrl) ? 'Ouvrir sur Veo' : 'Ouvrir sur YouTube'}
                        </a>
                      ) : (
                        <div>
                          <video
                            src={videoUrl.includes('cloudinary.com') ? videoUrl.replace('/upload/', '/upload/q_auto,f_mp4/') : videoUrl}
                            controls
                            style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', background: '#000', marginBottom: '8px' }}
                          />
                          <a href={videoUrl} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', color: '#4ade80', fontSize: '12px', textDecoration: 'none' }}>
                            🔗 Ouvrir dans un nouvel onglet
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>⚠️ Aucune vidéo fournie par le joueur</p>
                    </div>
                  )}

                  {/* ENVOI LOOM */}
                  {demande.statut === 'en_attente' && (
                    <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '1rem', marginTop: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                        📨 Le joueur recevra une notification automatique dans son dashboard dès l'envoi
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <input
                          placeholder="Colle ton lien Loom ici..."
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

                  {/* ANALYSE DÉJÀ ENVOYÉE */}
                  {demande.statut === 'analyse' && demande.loom_url && (
                    <div style={{ background: '#4ade8010', border: '1px solid #4ade8033', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                      <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '6px', fontWeight: 600 }}>✅ Analyse envoyée — notification joueur envoyée</p>
                      <a href={demande.loom_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: '13px', color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🎥 <span style={{ textDecoration: 'underline' }}>{demande.loom_url}</span>
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardCoach
