import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Loader from '../components/Loader'
import Avatar from '../components/Avatar'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
}

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [savingStats, setSavingStats] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)
  const [userId, setUserId] = useState(null)
  const [deletingVideo, setDeletingVideo] = useState(false)
  const [reelJogabonito, setReelJogabonito] = useState(null)
  const [deletingReel, setDeletingReel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)
  const [fanOnglet, setFanOnglet] = useState('accueil')
  const [fanFavoris, setFanFavoris] = useState([])
  const [loadingFanFavoris, setLoadingFanFavoris] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [conversations, setConversations] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState([])

  const [coaches, setCoaches] = useState([])
  const [coachSelectionne, setCoachSelectionne] = useState(null)
  const [messageCoach, setMessageCoach] = useState('')
  const [sendingCoach, setSendingCoach] = useState(false)
  const [coachSent, setCoachSent] = useState(false)
  const [convCoach, setConvCoach] = useState([])

  useEffect(() => { getProfil() }, [])

  const getProfil = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    setUserId(user.id)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: demandesData } = await supabase.from('demandes').select('*').eq('joueur_id', user.id).order('created_at', { ascending: false })
    const { data: coachData } = await supabase.from('profiles').select('*').eq('plan', 'coach')
    setProfil(data)
    setStats({
      club: data?.club || '', niveau_equipe: data?.niveau_equipe || '', categorie: data?.categorie || '',
      region: data?.region || '', pied: data?.pied || 'droit', matchs_officiel: data?.matchs_officiel || 0,
      matchs_amical: data?.matchs_amical || 0, minutes_jouees: data?.minutes_jouees || 0,
      buts_pied_droit: data?.buts_pied_droit || 0, buts_pied_gauche: data?.buts_pied_gauche || 0,
      buts_tete: data?.buts_tete || 0, buts_total: data?.buts_total || 0,
      passes_decisives: data?.passes_decisives || 0, cleansheets: data?.cleansheets || 0,
    })
    setDemandes(demandesData || [])
    setCoaches(coachData || [])
    if (coachData && coachData.length > 0) setCoachSelectionne(coachData[0])
    const { data: reelRows, error: reelErr } = await supabase.from('reels').select('id, video_url').eq('joueur_id', user.id).order('created_at', { ascending: false }).limit(1)
    console.log('[DashboardJoueur] reelRows:', reelRows, 'error:', reelErr)
    setReelJogabonito(reelRows?.[0] || null)
    await chargerConversations(user.id)
    setLoading(false)
  }

  const chargerConversations = async (uid) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    if (!data) return
    setMessages(data)
    const map = {}
    data.forEach(msg => {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
      const other = msg.sender_id === uid ? msg.receiver : msg.sender
      if (!map[otherId]) map[otherId] = { otherId, other, msgs: [] }
      map[otherId].msgs.push(msg)
    })
    const allConvs = Object.values(map)
    setConversations(allConvs.filter(c => c.other?.plan !== 'coach'))
    setConvCoach(allConvs.filter(c => c.other?.plan === 'coach'))
  }

  const envoyerMessage = async () => {
    if (!newMessage.trim() || !messageActif || !userId) return
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: messageActif.otherId, content: newMessage.trim(), created_at: new Date().toISOString() })
    setNewMessage('')
    await chargerConversations(userId)
  }

  const envoyerMessageCoach = async () => {
    if (!messageCoach.trim() || !coachSelectionne || !userId) return
    setSendingCoach(true)
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: coachSelectionne.id, content: messageCoach.trim(), created_at: new Date().toISOString() })
    setSendingCoach(false)
    setCoachSent(true)
    setMessageCoach('')
    await chargerConversations(userId)
    setTimeout(() => setCoachSent(false), 3000)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setAvatarUploading(true)
    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (uploadData.secure_url) {
        await supabase.from('profiles').update({ avatar_url: uploadData.secure_url }).eq('id', userId)
        setProfil(prev => ({ ...prev, avatar_url: uploadData.secure_url }))
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
    }
    setAvatarUploading(false)
  }

  const handleSaveStats = async () => {
    setSavingStats(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update(stats).eq('id', user.id)
    setSavingStats(false)
    setStatsSaved(true)
    setTimeout(() => setStatsSaved(false), 3000)
  }

  // ── Suppression de la vidéo (clip_url → null) ──
  const handleDeleteVideo = async () => {
    if (!window.confirm('Supprimer ta vidéo ? Elle sera retirée du feed et de Jogabonito.')) return
    setDeletingVideo(true)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    setDeletingVideo(false)
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const handleDeleteReel = async () => {
    if (!window.confirm('Supprimer ta vidéo Jogabonito ? Elle ne sera plus visible dans le feed.')) return
    setDeletingReel(true)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', userId)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', userId)
    setDeletingReel(false)
    if (errReel) { alert('Erreur suppression reel : ' + errReel.message); return }
    if (errProfile) { alert('Erreur suppression profil : ' + errProfile.message); return }
    setReelJogabonito(null)
    setProfil(prev => ({ ...prev, clip_url: null }))
  }

  const chargerFanFavoris = async () => {
    if (!userId) return
    setLoadingFanFavoris(true)
    const { data: favData } = await supabase.from('video_favoris').select('joueur_id').eq('user_id', userId)
    const joueurIds = favData?.map(f => f.joueur_id) || []
    if (joueurIds.length > 0) {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*, profiles(prenom, nom, poste, categorie, club, avatar_url)')
        .in('joueur_id', joueurIds)
        .order('created_at', { ascending: false })
      setFanFavoris(reelsData || [])
    } else {
      setFanFavoris([])
    }
    setLoadingFanFavoris(false)
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Résilier ton abonnement ? Tu garderas l\'accès jusqu\'à la fin de la période en cours, puis ton compte passera en Starter.')) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur résiliation')
      setCancelDone(true)
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
    setCancelling(false)
  }

  const inputStyle = { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }
  const msgBubble = (mine) => ({ maxWidth: '70%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#4ade80' : '#1a1a1a', color: mine ? '#000' : '#fff', fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px' })

  if (loading) return <Loader />

  if (profil?.banni) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#111', border: '1px solid #ef444440', borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1.5rem' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ef4444', marginBottom: '0.75rem' }}>Compte suspendu</h1>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '1rem' }}>
            Ton compte a été suspendu pour violation des CGU et du règlement de la plateforme.
          </p>
          {profil?.banni_motif && (
            <div style={{ background: '#1a1a1a', border: '1px solid #ef444430', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>
                <strong style={{ color: '#ef4444' }}>Motif :</strong> {profil.banni_motif}
              </p>
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '1.5rem' }}>
            Conformément aux CGU acceptées lors de ton inscription, aucun remboursement ne sera effectué.
          </p>
          <span onClick={handleLogout} style={{ color: '#666', fontSize: '13px', cursor: 'pointer' }}>Déconnexion</span>
        </div>
      </div>
    )
  }

  if (profil?.plan === 'fan') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '14px', color: '#aaa' }}>Bonjour {profil?.prenom} 👋</span>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#666', border: '1px solid #333', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Déconnexion</button>
          </div>
        </nav>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          {/* Onglets fan */}
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #222', marginBottom: '2rem', paddingBottom: '1rem' }}>
            {[['accueil', 'Accueil'], ['favoris', '⭐ Mes Favoris'], ['messages', '🔒 Messages']].map(([id, label]) => (
              <button key={id} onClick={() => { setFanOnglet(id); if (id === 'favoris') chargerFanFavoris() }}
                style={{ background: 'transparent', border: 'none', color: fanOnglet === id ? '#4ade80' : '#666', fontSize: '14px', fontWeight: fanOnglet === id ? 700 : 400, cursor: 'pointer', paddingBottom: '4px', borderBottom: fanOnglet === id ? '2px solid #4ade80' : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Accueil */}
          {fanOnglet === 'accueil' && (
            <>
              <div style={{ background: '#111', border: '1px solid #4ade8030', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚽</div>
                <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Compte Fan</h1>
                <p style={{ color: '#666', fontSize: '14px', margin: '0 0 1.5rem' }}>Like, commente et sauvegarde les meilleurs reels Jogabonito.</p>
                <button onClick={() => navigate('/jogabonito')}
                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                  Voir Jogabonito →
                </button>
              </div>
              <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '2rem' }}>
                <div style={{ display: 'inline-block', background: '#4ade8020', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', marginBottom: '1rem' }}>PASSE JOUEUR</div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Expose ton talent aux recruteurs</h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem', lineHeight: 1.6 }}>Publie tes vidéos, reçois des analyses d'expert et sois visible des clubs et agents.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                  {[{ plan: 'Starter', prix: '49,99€/mois', desc: '2 analyses / mois · Reels Jogabonito' }, { plan: 'Pro', prix: '79,99€/mois', desc: '3 analyses / mois · Feed · Visible recruteurs' }].map(p => (
                    <div key={p.plan} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><p style={{ margin: 0, fontWeight: 700 }}>{p.plan}</p><p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{p.desc}</p></div>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>{p.prix}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>Devenir joueur →</button>
              </div>
            </>
          )}

          {/* Mes Favoris */}
          {fanOnglet === 'favoris' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '1.5rem' }}>⭐ Mes reels sauvegardés</h2>
              {loadingFanFavoris ? (
                <p style={{ color: '#4ade80', textAlign: 'center' }}>Chargement...</p>
              ) : fanFavoris.length === 0 ? (
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '2.5rem', margin: '0 0 12px' }}>⭐</p>
                  <p style={{ color: '#666', fontSize: '14px' }}>Aucun reel sauvegardé.<br />Swipe sur Jogabonito et tape ⭐ Save pour les retrouver ici.</p>
                  <button onClick={() => navigate('/jogabonito')} style={{ marginTop: '1rem', background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>Aller sur Jogabonito →</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fanFavoris.map(reel => (
                    <div key={reel.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Avatar person={reel.profiles} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{reel.profiles?.prenom} {reel.profiles?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4ade80' }}>{reel.profiles?.poste}{reel.profiles?.categorie ? ` · ${reel.profiles.categorie}` : ''}</p>
                        {reel.titre && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{reel.titre}</p>}
                      </div>
                      <button onClick={() => navigate('/jogabonito')} style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Voir →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages (lock Pro) */}
          {fanOnglet === 'messages' && (
            <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Visible par les recruteurs — Plan Pro uniquement</h2>
              <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>Passe au Plan Pro pour recevoir des messages de recruteurs et clubs.</p>
              <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>Passer au Plan Pro — 79,99€/mois</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!profil?.abonnement_actif) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '440px', width: '100%', background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '1rem' }}>Abonnement non actif</h1>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '1.5rem' }}>Ton paiement n'a pas encore ete confirme.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
            <button onClick={() => window.location.href = STRIPE_LINKS.starter} style={{ background: 'transparent', color: 'white', border: '1px solid #333', padding: '12px 20px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Activer Starter — 49,99€/mois</button>
            <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '12px 20px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Activer Pro — 79,99€/mois</button>
          </div>
          <span onClick={handleLogout} style={{ color: '#666', fontSize: '13px', cursor: 'pointer' }}>Deconnexion</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '14px', color: '#aaa' }}>Bonjour {profil?.prenom} 👋</span>
          <button onClick={handleLogout} style={{ background: 'transparent', color: '#666', border: '1px solid #333', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Deconnexion</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #222', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            ['dashboard', 'Accueil'],
            ['profil', 'Mon Profil & Stats'],
            ['analyses', 'Mes Analyses'],
            ['messages', `💬 Recruteurs${conversations.length > 0 ? ` (${conversations.length})` : ''}`],
            ['coach', `🎙️ Support Coach${convCoach.length > 0 ? ` (${convCoach.length})` : ''}`],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setOnglet(id)} style={{ background: 'transparent', border: 'none', color: onglet === id ? '#4ade80' : '#666', fontSize: '14px', fontWeight: onglet === id ? '700' : '400', cursor: 'pointer', paddingBottom: '4px', borderBottom: onglet === id ? '2px solid #4ade80' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── ACCUEIL ── */}
        {onglet === 'dashboard' && (
          <div>
            {/* Stats rapides */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Plan actuel</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#4ade80', textTransform: 'capitalize' }}>{profil?.plan}</p>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Analyses restantes</p>
                <p style={{ fontSize: '22px', fontWeight: '700' }}>{profil?.analyses_restantes} <span style={{ fontSize: '14px', color: '#666' }}>ce mois</span></p>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Mon poste</p>
                <p style={{ fontSize: '22px', fontWeight: '700' }}>{profil?.poste}</p>
              </div>
            </div>

            {/* ── RACCOURCIS RAPIDES ── */}
            {profil?.plan === 'pro' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
                <button onClick={() => navigate('/jogabonito')}
                  style={{ background: '#f9731615', border: '1px solid #f9731640', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎬</div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>Jogabonito</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#f97316' }}>Feed vertical</p>
                </button>
                <button onClick={() => navigate('/feed')}
                  style={{ background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>⚽</div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>Feed</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#4ade80' }}>Talents du moment</p>
                </button>
                <button onClick={() => navigate('/upload-reel')}
                  style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🚀</div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>Publier</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#60a5fa' }}>Mon Reel</p>
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                <button onClick={() => navigate('/jogabonito')}
                  style={{ background: '#f9731615', border: '1px solid #f9731640', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎬</div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>Jogabonito</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#f97316' }}>Feed vertical</p>
                </button>
                <button onClick={() => navigate('/upload-reel')}
                  style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🚀</div>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '14px' }}>Publier un Reel</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#60a5fa' }}>TikTok · MP4</p>
                </button>
              </div>
            )}

            {/* Envoyer vidéo analyse */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '0.5rem' }}>Envoyer une video pour analyse</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>Tu as {profil?.analyses_restantes} analyse(s) disponible(s) ce mois</p>
              {profil?.analyses_restantes > 0 ? (
                <button onClick={() => navigate('/upload')} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Envoyer ma video</button>
              ) : (
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1rem' }}>
                  <p style={{ fontSize: '14px', color: '#666' }}>Tu as utilise toutes tes analyses ce mois.</p>
                </div>
              )}
            </div>

            {/* ── BLOC VIDÉO PARTAGÉE (avec bouton supprimer) ── */}
            {profil?.clip_url ? (
              <div style={{ background: '#111', border: '1px solid #4ade8033', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '0.5rem' }}>🎬 Ma vidéo partagée</h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
                  {profil?.plan === 'pro'
                    ? 'Visible par les recruteurs dans le Scout Center et dans Jogabonito'
                    : 'Visible dans Jogabonito'}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a href={profil.clip_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', background: '#4ade80', color: '#000', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
                    🎬 Voir ma vidéo
                  </a>
                  <button onClick={() => navigate('/upload-clip')}
                    style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    Changer la vidéo
                  </button>
                  {/* ── BOUTON SUPPRIMER MA VIDÉO ── */}
                  <button
                    onClick={handleDeleteVideo}
                    disabled={deletingVideo}
                    style={{ background: 'transparent', color: deletingVideo ? '#555' : '#ef4444', border: '1px solid #ef444440', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: deletingVideo ? 'wait' : 'pointer' }}
                  >
                    {deletingVideo ? '⏳ Suppression...' : '🗑️ Supprimer ma vidéo'}
                  </button>
                </div>
              </div>
            ) : reelJogabonito ? (
              // Reel Jogabonito existant (sans clip_url — typiquement plan Starter)
              <div style={{ background: '#111', border: '1px solid #f9731633', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '0.5rem' }}>🎬 Ma vidéo Jogabonito</h2>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>Visible dans Jogabonito par tous les joueurs</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a href={reelJogabonito.video_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', background: '#f97316', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>
                    🎬 Voir ma vidéo
                  </a>
                  <button onClick={() => navigate('/upload-reel')}
                    style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    Changer la vidéo
                  </button>
                  <button
                    onClick={handleDeleteReel}
                    disabled={deletingReel}
                    style={{ background: 'transparent', color: deletingReel ? '#555' : '#ef4444', border: '1px solid #ef444440', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: deletingReel ? 'wait' : 'pointer' }}
                  >
                    {deletingReel ? '⏳ Suppression...' : '🗑️ Supprimer ma vidéo Jogabonito'}
                  </button>
                </div>
              </div>
            ) : (
              // Pas encore de vidéo → inviter à en publier une
              <div style={{ background: '#111', border: '1px dashed #333', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎬</div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#aaa' }}>Aucune vidéo publiée</h2>
                <p style={{ fontSize: '14px', color: '#555', marginBottom: '1.5rem' }}>
                  {profil?.plan === 'pro'
                    ? 'Publie un clip pour apparaître dans le Feed et Jogabonito'
                    : 'Publie un reel pour apparaître dans Jogabonito'}
                </p>
                <button
                  onClick={() => navigate(profil?.plan === 'pro' ? '/upload-clip' : '/upload-reel')}
                  style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  {profil?.plan === 'pro' ? 'Publier un clip' : 'Publier un reel'}
                </button>
              </div>
            )}

            {profil?.plan === 'pro' ? (
              <div style={{ background: '#111', border: '1px solid #4ade8033', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '24px' }}>🎬</span>
                  <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Publier un clip sur le feed</h2>
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>Montre ton talent — clubs et agents regardent le feed chaque semaine !</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/upload-clip')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade80', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Publier un clip</button>
                  <button onClick={() => navigate('/feed')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>Voir le Feed →</button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '24px' }}>🔒</span>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#666' }}>Feed & visibilité recruteurs</h2>
                </div>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>Passe au plan Pro pour publier tes clips et être vu par les clubs et agents.</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Passer au plan Pro</button>
                  <button onClick={() => navigate('/jogabonito')} style={{ background: 'transparent', color: '#f97316', border: '1px solid #f9731640', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', cursor: 'pointer' }}>🎬 Voir les Jogabonito</button>
                </div>
              </div>
            )}

            {conversations.length > 0 && (
              <div style={{ background: '#111', border: '2px solid #4ade8033', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '1rem', color: '#4ade80' }}>💬 Messages de recruteurs</h2>
                {conversations.map(conv => (
                  <div key={conv.otherId} onClick={() => { setMessageActif(conv); setOnglet('messages') }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1a1a1a', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4ade80' }}>Recruteur</p>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#555', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '2px solid #f9731633', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '1rem', color: '#f97316' }}>🎙️ Réponses du coach</h2>
                {convCoach.map(conv => (
                  <div key={conv.otherId} onClick={() => setOnglet('coach')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#1a1a1a', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#f97316' }}>Coach Expert</p>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#555', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── GESTION ABONNEMENT ── */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '0.5rem', color: '#666' }}>Mon abonnement</h2>
              {cancelDone ? (
                <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#f97316', fontWeight: 600, margin: '0 0 4px' }}>Résiliation programmée</p>
                  <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>Tu gardes l'accès jusqu'à la fin de la période. Ton compte passera ensuite en Starter.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
                    Plan actif : <span style={{ color: '#4ade80', fontWeight: 700, textTransform: 'capitalize' }}>{profil?.plan}</span>
                  </p>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    style={{ background: 'transparent', border: '1px solid #ef444440', color: cancelling ? '#555' : '#ef4444', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: cancelling ? 'wait' : 'pointer', fontWeight: 600 }}
                  >
                    {cancelling ? 'En cours...' : 'Résilier mon abonnement'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFIL ── */}
        {onglet === 'profil' && (
          <div>
            {/* Photo de profil */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '1.5rem' }}>📸 Photo de profil</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Avatar person={profil} size={80} border="2px solid #4ade8060" />
                <div>
                  <label style={{ display: 'inline-block', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 18px', cursor: avatarUploading ? 'not-allowed' : 'pointer', fontSize: '14px', color: avatarUploading ? '#555' : '#aaa' }}>
                    {avatarUploading ? 'Upload en cours...' : 'Choisir une photo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
                  </label>
                  <p style={{ fontSize: '12px', color: '#555', margin: '6px 0 0' }}>JPG, PNG, WEBP · Max 5 MB</p>
                </div>
              </div>
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '1.5rem' }}>📋 Informations club</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><label style={labelStyle}>Club actuel</label><input value={stats.club} onChange={e => setStats({ ...stats, club: e.target.value })} placeholder="Ex: AS Saint-Etienne" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Niveau de l'equipe</label>
                  <select value={stats.niveau_equipe} onChange={e => setStats({ ...stats, niveau_equipe: e.target.value })} style={inputStyle}>
                    <option value="">-- Choisir --</option>
                    {['Ligue 1', 'Ligue 2', 'National', 'Regional 1', 'Regional 2', 'Regional 3', 'Departemental', 'Amateur'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categorie</label>
                  <select value={stats.categorie} onChange={e => setStats({ ...stats, categorie: e.target.value })} style={inputStyle}>
                    <option value="">-- Choisir --</option>
                    {['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Senior', 'Veteran'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Region</label><input value={stats.region} onChange={e => setStats({ ...stats, region: e.target.value })} placeholder="Ex: Ile-de-France" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Pied fort</label>
                  <select value={stats.pied} onChange={e => setStats({ ...stats, pied: e.target.value })} style={inputStyle}>
                    <option value="droit">Droit</option>
                    <option value="gauche">Gauche</option>
                    <option value="ambidextre">Ambidextre</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '1.5rem' }}>⚽ Statistiques</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {[['matchs_officiel', 'Matchs officiels'], ['matchs_amical', 'Matchs amicaux'], ['minutes_jouees', 'Minutes jouees'], ['buts_pied_droit', 'Buts pied droit'], ['buts_pied_gauche', 'Buts pied gauche'], ['buts_tete', 'Buts de la tete'], ['buts_total', 'Buts total'], ['passes_decisives', 'Passes decisives'], ['cleansheets', 'Cleansheets']].map(([key, label]) => (
                  <div key={key}><label style={labelStyle}>{label}</label><input type="number" min="0" value={stats[key]} onChange={e => setStats({ ...stats, [key]: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
                ))}
              </div>
            </div>
            <button onClick={handleSaveStats} disabled={savingStats} style={{ width: '100%', background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              {savingStats ? 'Sauvegarde...' : statsSaved ? '✅ Sauvegarde !' : 'Sauvegarder mon profil'}
            </button>
          </div>
        )}

        {/* ── ANALYSES ── */}
        {onglet === 'analyses' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '2rem' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '1.5rem' }}>Mes analyses</h2>
            {demandes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🎬</p>
                <p style={{ color: '#666', fontSize: '14px' }}>Aucune analyse pour le moment</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {demandes.map(demande => (
                  <div key={demande.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{demande.titre}</h3>
                      <span style={{ background: demande.statut === 'analyse' ? '#4ade8020' : '#f59e0b20', color: demande.statut === 'analyse' ? '#4ade80' : '#f59e0b', fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>
                        {demande.statut === 'analyse' ? 'Analyse recue' : 'En attente'}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{demande.poste} — {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    {demande.loom_url && (
                      <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#4ade80', color: '#0a0a0a', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none', marginTop: '8px' }}>
                        Voir mon analyse
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES RECRUTEURS ── */}
        {onglet === 'messages' && (profil?.plan === 'starter' || profil?.plan === 'fan') && (
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Visible par les recruteurs — Plan Pro uniquement</h2>
            <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              Passe au Plan Pro pour recevoir des messages de recruteurs et clubs, et apparaître dans le Scout Center.
            </p>
            <button
              onClick={() => window.location.href = STRIPE_LINKS.pro}
              style={{ background: '#4ade80', color: '#000', border: 'none', padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Passer au Plan Pro — 79,99€/mois
            </button>
          </div>
        )}

        {onglet === 'messages' && profil?.plan !== 'starter' && profil?.plan !== 'fan' && (
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', minHeight: '500px' }}>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#4ade80', fontSize: '14px' }}>💬 Recruteurs</p>
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                  <p>Aucun message.</p>
                  <p style={{ marginTop: '8px' }}>Les recruteurs peuvent te contacter depuis le Scout Center.</p>
                </div>
              ) : conversations.map(conv => (
                <div key={conv.otherId} onClick={() => setMessageActif(conv)}
                  style={{ padding: '12px 1rem', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: messageActif?.otherId === conv.otherId ? '#4ade8010' : 'transparent', borderLeft: messageActif?.otherId === conv.otherId ? '2px solid #4ade80' : '2px solid transparent' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{conv.other?.prenom} {conv.other?.nom}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4ade80' }}>Recruteur</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.msgs[0]?.content}</p>
                </div>
              ))}
            </div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              {messageActif ? (
                <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar person={messageActif.other} size={36} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{messageActif.other?.prenom} {messageActif.other?.nom}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>Recruteur</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                    {messages.filter(m => m.sender_id === messageActif.otherId || m.receiver_id === messageActif.otherId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                      <div key={i} style={msgBubble(m.sender_id === userId)}>
                        <p style={{ margin: 0 }}>{m.content}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.6 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '1rem', borderTop: '1px solid #222', display: 'flex', gap: '8px' }}>
                    <input style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '14px', outline: 'none' }} placeholder="Répondre..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && envoyerMessage()} />
                    <button onClick={envoyerMessage} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Envoyer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '2rem' }}>💬</p>
                  <p>Sélectionnez une conversation</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUPPORT COACH ── */}
        {onglet === 'coach' && (
          <div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>🎙️ Support Coach</h2>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Pose tes questions directement à notre coach expert.</p>
            </div>
            {convCoach.length > 0 && (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#f97316', fontSize: '14px' }}>Historique de la conversation</p>
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', maxHeight: '400px', overflowY: 'auto' }}>
                  {(() => {
                    const coachIds = coaches.map(c => c.id)
                    return messages.filter(m => coachIds.includes(m.sender_id) || coachIds.includes(m.receiver_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m, i) => (
                      <div key={i} style={msgBubble(m.sender_id === userId)}>
                        <p style={{ margin: 0 }}>{m.content}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.6 }}>{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {m.sender_id === userId ? 'Toi' : 'Coach'}</p>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            {coaches.length === 0 ? (
              <div style={{ background: '#111', border: '1px dashed #333', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>🎙️</p>
                <p>Aucun coach disponible pour le moment.</p>
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem' }}>
                {coaches.length > 1 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>Coach</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {coaches.map(c => (
                        <button key={c.id} onClick={() => setCoachSelectionne(c)}
                          style={{ background: coachSelectionne?.id === c.id ? '#f97316' : 'transparent', color: coachSelectionne?.id === c.id ? '#000' : '#aaa', border: `1px solid ${coachSelectionne?.id === c.id ? '#f97316' : '#333'}`, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: coachSelectionne?.id === c.id ? 700 : 400 }}>
                          {c.prenom} {c.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
                  {convCoach.length > 0 ? 'Envoyer un nouveau message' : `Écrire à ${coachSelectionne?.prenom || 'votre coach'}`}
                </label>
                {coachSent ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#f97316' }}>
                    <p style={{ fontSize: '2rem' }}>✓</p>
                    <p style={{ fontWeight: 600 }}>Message envoyé au coach !</p>
                  </div>
                ) : (
                  <>
                    <textarea value={messageCoach} onChange={e => setMessageCoach(e.target.value)} placeholder={`Bonjour ${coachSelectionne?.prenom || ''}, j'aurais une question sur...`}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '12px', fontSize: '14px', resize: 'vertical', minHeight: '140px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <button onClick={envoyerMessageCoach} disabled={sendingCoach || !messageCoach.trim()}
                      style={{ marginTop: '12px', width: '100%', background: '#f97316', color: '#000', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: (sendingCoach || !messageCoach.trim()) ? 0.6 : 1 }}>
                      {sendingCoach ? 'Envoi...' : `Envoyer au coach ✉️`}
                    </button>
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

export default DashboardJoueur