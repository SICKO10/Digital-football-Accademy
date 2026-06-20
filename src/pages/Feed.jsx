import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const detectVideoType = (url) => {
  if (!url) return null
  if (url.includes('cloudinary.com') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm')) return 'mp4'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('veo.co')) return 'veo'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return 'link'
}

const getYoutubeId = (url) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]{11})/)
  return match ? match[1] : null
}

const getTikTokId = (url) => {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  return match ? match[1] : null
}

const TYPE_META = {
  mp4:       { label: 'Video HD',   color: '#4ade80', emoji: '🎬' },
  youtube:   { label: 'YouTube',    color: '#ff0000', emoji: '▶' },
  veo:       { label: 'Veo',        color: '#60a5fa', emoji: '🎥' },
  instagram: { label: 'Instagram',  color: '#E1306C', emoji: '📸' },
  tiktok:    { label: 'TikTok',     color: '#69C9D0', emoji: '♪' },
  link:      { label: 'Video',      color: '#4ade80', emoji: '▶' },
}

function VideoPlayer({ url }) {
  const type = detectVideoType(url)
  const box = { background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
  if (type === 'mp4') return (<div style={box}><video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>)
  if (type === 'youtube') {
    const id = getYoutubeId(url)
    if (!id) return <VideoFallback url={url} type="youtube" box={box} />
    return (<div style={box}><iframe src={`https://www.youtube.com/embed/${id}`} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube" /></div>)
  }
  if (type === 'tiktok') {
    const id = getTikTokId(url)
    if (!id) return <VideoFallback url={url} type="tiktok" box={box} />
    return (<div style={{ ...box, aspectRatio: '9/16', maxHeight: '480px' }}><iframe src={`https://www.tiktok.com/embed/v2/${id}`} style={{ width: '100%', height: '100%', border: 'none' }} allow="encrypted-media" allowFullScreen title="TikTok" /></div>)
  }
  return <VideoFallback url={url} type={type} box={box} />
}

function VideoFallback({ url, type, box }) {
  const { label, color, emoji } = TYPE_META[type] || TYPE_META.link
  return (
    <div style={box}>
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color }}>{emoji}</div>
        <span style={{ fontSize: '14px', color, fontWeight: 600 }}>Ouvrir sur {label} →</span>
      </a>
    </div>
  )
}

function VideoBadge({ url }) {
  const type = detectVideoType(url)
  const { label, color } = TYPE_META[type] || TYPE_META.link
  return (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${color}15`, border: `1px solid ${color}40`, color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>🎬 {label}</span>)
}

function VideoCard({ j, user, profil, interactions, onRefresh, onOpenProfile, st, onDeleteVideo }) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const shareRef = useRef(null)

  const liked = interactions.likes.includes(j.id)
  const favori = interactions.favoris.includes(j.id)
  const reposted = interactions.reposts.includes(j.id)
  const likeCount = interactions.likeCounts[j.id] || 0
  const commentCount = interactions.commentCounts[j.id] || 0
  const repostCount = interactions.repostCounts[j.id] || 0
  const comments = interactions.comments[j.id] || []

  // Est-ce que c'est la carte du joueur connecté ?
  const isOwner = user?.id === j.id

  useEffect(() => {
    const handler = (e) => { if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLike = async () => {
    if (!user) return
    if (liked) { await supabase.from('likes').delete().eq('user_id', user.id).eq('joueur_id', j.id) }
    else { await supabase.from('likes').insert({ user_id: user.id, joueur_id: j.id }) }
    onRefresh()
  }

  const handleFavori = async () => {
    if (!user) return
    if (favori) { await supabase.from('video_favoris').delete().eq('user_id', user.id).eq('joueur_id', j.id) }
    else { await supabase.from('video_favoris').insert({ user_id: user.id, joueur_id: j.id }) }
    onRefresh()
  }

  const handleRepost = async () => {
    if (!user) return
    if (reposted) { await supabase.from('reposts').delete().eq('user_id', user.id).eq('joueur_id', j.id) }
    else { await supabase.from('reposts').insert({ user_id: user.id, joueur_id: j.id }) }
    onRefresh()
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user) return
    setSendingComment(true)
    await supabase.from('comments').insert({ user_id: user.id, joueur_id: j.id, content: newComment.trim() })
    setNewComment('')
    setSendingComment(false)
    onRefresh()
  }

  const handleShare = (platform) => {
    const url = encodeURIComponent(`https://digital-football-accademy.vercel.app/feed`)
    const text = encodeURIComponent(`Regarde la video de ${j.prenom} ${j.nom} sur Digital Football !`)
    const links = { whatsapp: `https://wa.me/?text=${text}%20${url}`, telegram: `https://t.me/share/url?url=${url}&text=${text}`, twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`, facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}` }
    window.open(links[platform], '_blank')
    setShareOpen(false)
  }

  const handleCopyLink = () => { navigator.clipboard.writeText(`https://digital-football-accademy.vercel.app/feed`); setShareOpen(false) }

  // ── Suppression de la vidéo du feed (joueur propriétaire uniquement) ──
  const handleDeleteVideo = async () => {
    if (!window.confirm('Supprimer ta vidéo du feed ? Elle ne sera plus visible par les recruteurs.')) return
    setDeleting(true)
    await supabase.from('profiles').update({ clip_url: null }).eq('id', user.id)
    setDeleting(false)
    if (onDeleteVideo) onDeleteVideo()
    else onRefresh()
  }

  const actionBtn = (active, color) => ({ background: 'transparent', border: 'none', cursor: user ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: active ? color : '#666', fontWeight: active ? 700 : 400, padding: '6px 8px', borderRadius: '8px' })

  return (
    <div style={{ background: '#111', border: isOwner ? '1px solid #4ade8040' : '1px solid #222', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div onClick={() => onOpenProfile(j)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#4ade80', flexShrink: 0, cursor: 'pointer' }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
        <div style={{ flex: 1 }}>
          <p onClick={() => onOpenProfile(j)} style={{ margin: 0, fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>{j.prenom} {j.nom}</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4ade80' }}>{j.poste}{j.categorie ? ` · ${j.categorie}` : ''}{j.club ? ` · ${j.club}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <VideoBadge url={j.clip_url} />
          {/* Badge "Ma vidéo" si propriétaire */}
          {isOwner && (
            <span style={{ background: '#4ade8020', border: '1px solid #4ade8060', color: '#4ade80', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
              Ma vidéo
            </span>
          )}
          <button onClick={() => onOpenProfile(j)} style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Profil →</button>
        </div>
      </div>
      <VideoPlayer url={j.clip_url} />
      <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
        <span style={st.stat}>⚽ <span style={st.statVal}>{j.buts_total ?? 0}</span> buts</span>
        <span style={st.stat}>🎯 <span style={st.statVal}>{j.passes_decisives ?? 0}</span> passes</span>
        <span style={st.stat}>📋 <span style={st.statVal}>{j.matchs_officiel ?? 0}</span> matchs</span>
        {j.region && <span style={st.stat}>{j.region}</span>}
      </div>
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
        <button style={actionBtn(liked, '#ef4444')} onClick={handleLike}><span style={{ fontSize: '16px' }}>{liked ? '❤️' : '🤍'}</span><span>{likeCount}</span></button>
        <button style={actionBtn(showComments, '#60a5fa')} onClick={() => setShowComments(!showComments)}><span style={{ fontSize: '16px' }}>💬</span><span>{commentCount}</span></button>
        <button style={actionBtn(reposted, '#4ade80')} onClick={handleRepost}><span style={{ fontSize: '16px' }}>{reposted ? '🔁' : '↩️'}</span><span>{repostCount > 0 ? repostCount : ''}</span></button>
        <button style={actionBtn(favori, '#f59e0b')} onClick={handleFavori}><span style={{ fontSize: '16px' }}>{favori ? '⭐' : '☆'}</span></button>

        {/* ── BOUTON SUPPRIMER — visible uniquement par le propriétaire ── */}
        {isOwner && (
          <button
            onClick={handleDeleteVideo}
            disabled={deleting}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: deleting ? '#555' : '#ef4444', padding: '6px 8px', borderRadius: '8px', fontWeight: 600 }}
          >
            <span style={{ fontSize: '16px' }}>🗑️</span>
            <span>{deleting ? 'Suppression...' : 'Supprimer ma vidéo'}</span>
          </button>
        )}

        <div style={{ marginLeft: 'auto', position: 'relative' }} ref={shareRef}>
          <button style={actionBtn(false, '#aaa')} onClick={() => setShareOpen(!shareOpen)}><span style={{ fontSize: '16px' }}>📤</span><span style={{ fontSize: '12px' }}>Partager</span></button>
          {shareOpen && (
            <div style={{ position: 'absolute', bottom: '40px', right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', padding: '8px', zIndex: 100, minWidth: '180px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {[{ id: 'whatsapp', label: 'WhatsApp', color: '#25D366', emoji: '💬' }, { id: 'telegram', label: 'Telegram', color: '#0088cc', emoji: '✈️' }, { id: 'twitter', label: 'X / Twitter', color: '#1DA1F2', emoji: '🐦' }, { id: 'facebook', label: 'Facebook', color: '#1877F2', emoji: '📘' }].map(({ id, label, color, emoji }) => (
                <button key={id} onClick={() => handleShare(id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'transparent', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span>{emoji}</span><span style={{ color }}>{label}</span>
                </button>
              ))}
              <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />
              <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', background: 'transparent', border: 'none', color: '#aaa', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span>🔗</span> Copier le lien
              </button>
            </div>
          )}
        </div>
      </div>
      {showComments && (
        <div style={{ padding: '12px 16px' }}>
          {comments.length === 0 ? (<p style={{ fontSize: '13px', color: '#555', margin: '0 0 12px' }}>Aucun commentaire. Soyez le premier !</p>) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {comments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{c.author?.prenom?.[0]}{c.author?.nom?.[0]}</div>
                  <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '8px 12px', flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 600, color: '#4ade80' }}>{c.author?.prenom} {c.author?.nom}<span style={{ color: '#555', fontWeight: 400, marginLeft: '6px' }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ddd' }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()} placeholder="Ecrire un commentaire..." style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
              <button onClick={handleComment} disabled={sendingComment || !newComment.trim()} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: (!newComment.trim() || sendingComment) ? 0.5 : 1 }}>{sendingComment ? '...' : 'Envoyer'}</button>
            </div>
          ) : (<p style={{ fontSize: '12px', color: '#555', textAlign: 'center' }}>Connectez-vous pour commenter</p>)}
        </div>
      )}
    </div>
  )
}

function Feed() {
  const navigate = useNavigate()
  const [joueursPro, setJoueursPro] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [acces, setAcces] = useState(null)
  const [vue, setVue] = useState('videos')
  const [joueurModal, setJoueurModal] = useState(null)
  const [filtrePoste, setFiltrePoste] = useState('Tous')
  const [filtreCategorie, setFiltreCategorie] = useState('Toutes')
  const [likedIds, setLikedIds] = useState([])
  const [favoriIds, setFavoriIds] = useState([])
  const [repostIds, setRepostIds] = useState([])
  const [likeCounts, setLikeCounts] = useState({})
  const [commentCounts, setCommentCounts] = useState({})
  const [repostCounts, setRepostCounts] = useState({})
  const [allComments, setAllComments] = useState({})

  const POSTES = ['Tous', 'Gardien', 'Defenseur', 'Milieu', 'Attaquant']
  const CATEGORIES = ['Toutes', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Senior']

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (!user) { navigate('/login'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfil(p)

    if (p?.plan === 'starter') { setAcces(false); setLoading(false); return }

    setAcces(true)

    const { data } = await supabase.from('profiles').select('*').eq('plan', 'pro').eq('abonnement_actif', true).order('created_at', { ascending: false })
    setJoueursPro(data || [])
    await chargerInteractions(user, data || [])
    setLoading(false)
  }

  const chargerInteractions = async (u, joueurs) => {
    const ids = joueurs.map(j => j.id)
    if (ids.length === 0) return
    const { data: likesData } = await supabase.from('likes').select('joueur_id').in('joueur_id', ids)
    const lc = {}
    likesData?.forEach(l => { lc[l.joueur_id] = (lc[l.joueur_id] || 0) + 1 })
    setLikeCounts(lc)
    const { data: commentsData } = await supabase.from('comments').select('*, author:profiles!comments_user_id_fkey(prenom, nom, plan)').in('joueur_id', ids).order('created_at', { ascending: true })
    const cc = {}; const ac = {}
    commentsData?.forEach(c => { cc[c.joueur_id] = (cc[c.joueur_id] || 0) + 1; if (!ac[c.joueur_id]) ac[c.joueur_id] = []; ac[c.joueur_id].push(c) })
    setCommentCounts(cc); setAllComments(ac)
    const { data: repostsData } = await supabase.from('reposts').select('joueur_id').in('joueur_id', ids)
    const rc = {}
    repostsData?.forEach(r => { rc[r.joueur_id] = (rc[r.joueur_id] || 0) + 1 })
    setRepostCounts(rc)
    if (u) {
      const { data: myLikes } = await supabase.from('likes').select('joueur_id').eq('user_id', u.id).in('joueur_id', ids)
      setLikedIds(myLikes?.map(l => l.joueur_id) || [])
      const { data: myFavoris } = await supabase.from('video_favoris').select('joueur_id').eq('user_id', u.id).in('joueur_id', ids)
      setFavoriIds(myFavoris?.map(f => f.joueur_id) || [])
      const { data: myReposts } = await supabase.from('reposts').select('joueur_id').eq('user_id', u.id).in('joueur_id', ids)
      setRepostIds(myReposts?.map(r => r.joueur_id) || [])
    }
  }

  const refresh = async () => {
    // Recharge aussi la liste des joueurs pour refléter la suppression de clip_url
    const { data } = await supabase.from('profiles').select('*').eq('plan', 'pro').eq('abonnement_actif', true).order('created_at', { ascending: false })
    setJoueursPro(data || [])
    await chargerInteractions(user, data || [])
  }

  const interactions = { likes: likedIds, favoris: favoriIds, reposts: repostIds, likeCounts, commentCounts, repostCounts, comments: allComments }
  const joueursAvecClip = joueursPro.filter(j => j.clip_url)
  const joueursFiltres = joueursPro.filter(j => {
    if (filtrePoste !== 'Tous' && j.poste !== filtrePoste) return false
    if (filtreCategorie !== 'Toutes' && j.categorie !== filtreCategorie) return false
    return true
  })
  const joueursAvecClipFiltres = joueursAvecClip.filter(j => {
    if (filtrePoste !== 'Tous' && j.poste !== filtrePoste) return false
    if (filtreCategorie !== 'Toutes' && j.categorie !== filtreCategorie) return false
    return true
  })
  const feedVideos = user ? [...joueursAvecClipFiltres.filter(j => repostIds.includes(j.id)), ...joueursAvecClipFiltres.filter(j => !repostIds.includes(j.id))] : joueursAvecClipFiltres
  const isRecruteur = profil?.plan === 'recruteur'

  const st = {
    stat: { background: '#1a1a1a', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#ccc', display: 'inline-block', margin: '2px' },
    statVal: { color: '#4ade80', fontWeight: 700 },
  }

  if (loading) return (<div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>)

  if (acces === false) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: '#111', border: '1px solid #222', borderRadius: '20px', padding: '3rem', textAlign: 'center', margin: '1rem' }}>
        <div style={{ fontSize: '60px', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Feed reservé Plan Pro</h1>
        <p style={{ fontSize: '15px', color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
          Le Scout Center est accessible uniquement aux joueurs Pro, recruteurs et coachs. Passe au plan Pro pour acceder aux profils et videos des talents.
        </p>
        <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#4ade80', fontSize: '15px' }}>Plan Pro — 79,99EUR/mois</p>
          {['Profil visible par les recruteurs', 'Acces au Feed Scout Center', 'Acces Jogabonito', '3 analyses video / mois', 'Compile personnalisee'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#aaa', marginBottom: '6px' }}>
              <span style={{ color: '#4ade80' }}>✓</span> {f}
            </div>
          ))}
        </div>
        <button onClick={() => window.location.href = 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01'}
          style={{ width: '100%', background: '#4ade80', color: '#000', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}>
          Passer au plan Pro →
        </button>
        <button onClick={() => navigate('/dashboard')}
          style={{ width: '100%', background: 'transparent', color: '#666', border: '1px solid #333', padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}>
          Retour au dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222', position: 'sticky', top: 0, background: '#0a0a0aee', zIndex: 100 }}>
        <div onClick={() => navigate('/')} style={{ fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {favoriIds.length > 0 && vue === 'videos' && (
            <button onClick={() => setVue('favoris')} style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#f59e0b', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>⭐ Favoris ({favoriIds.length})</button>
          )}
          <button onClick={() => navigate(isRecruteur ? '/club' : '/dashboard')} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
            {isRecruteur ? 'Scout Center' : 'Mon espace'}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '2px', marginBottom: '4px' }}>SCOUT CENTER</p>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px' }}>Les talents du moment ⚽</h1>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>{joueursAvecClip.length} video{joueursAvecClip.length > 1 ? 's' : ''} disponible{joueursAvecClip.length > 1 ? 's' : ''}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', justifyContent: 'center' }}>
          {[{ id: 'videos', label: `🎬 Videos (${joueursAvecClip.length})` }, { id: 'profils', label: `👤 Profils (${joueursPro.length})` }, ...(favoriIds.length > 0 ? [{ id: 'favoris', label: `⭐ Favoris (${favoriIds.length})` }] : [])].map(t => (
            <button key={t.id} onClick={() => setVue(t.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: vue === t.id ? '#4ade80' : '#1a1a1a', color: vue === t.id ? '#000' : '#aaa' }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select value={filtrePoste} onChange={e => setFiltrePoste(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '13px' }}>{POSTES.map(p => <option key={p}>{p}</option>)}</select>
          <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '13px' }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        </div>

        {vue === 'videos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {feedVideos.length === 0 ? (<div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}><p style={{ fontSize: '3rem' }}>🎬</p><p>Aucune video pour le moment</p></div>)
              : feedVideos.map(j => (
                <VideoCard
                  key={j.id}
                  j={j}
                  user={user}
                  profil={profil}
                  interactions={interactions}
                  onRefresh={refresh}
                  onOpenProfile={setJoueurModal}
                  onDeleteVideo={refresh}
                  st={st}
                />
              ))}
          </div>
        )}

        {vue === 'favoris' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {joueursAvecClip.filter(j => favoriIds.includes(j.id)).length === 0 ? (<div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}><p style={{ fontSize: '3rem' }}>⭐</p><p>Aucun favori</p></div>)
              : joueursAvecClip.filter(j => favoriIds.includes(j.id)).map(j => (
                <VideoCard
                  key={j.id}
                  j={j}
                  user={user}
                  profil={profil}
                  interactions={interactions}
                  onRefresh={refresh}
                  onOpenProfile={setJoueurModal}
                  onDeleteVideo={refresh}
                  st={st}
                />
              ))}
          </div>
        )}

        {vue === 'profils' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {joueursFiltres.length === 0 ? (<div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#555' }}><p style={{ fontSize: '2rem' }}>🔍</p><p>Aucun joueur trouve</p></div>)
              : joueursFiltres.map(j => (
                <div key={j.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer' }} onClick={() => setJoueurModal(j)}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                    <div><p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>{j.prenom} {j.nom}</p><p style={{ color: '#4ade80', fontSize: '12px', margin: '2px 0 0' }}>{j.poste}</p></div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                    {j.categorie && <span style={st.stat}>{j.categorie}</span>}
                    {j.club && <span style={st.stat}>{j.club}</span>}
                    {j.region && <span style={st.stat}>{j.region}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={st.stat}>⚽ <span style={st.statVal}>{j.buts_total ?? 0}</span></span>
                    <span style={st.stat}>🎯 <span style={st.statVal}>{j.passes_decisives ?? 0}</span></span>
                    <span style={st.stat}>📋 <span style={st.statVal}>{j.matchs_officiel ?? 0}</span></span>
                  </div>
                  {j.clip_url && <div style={{ marginTop: '10px' }}><VideoBadge url={j.clip_url} /></div>}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#555' }}>
                    {(likeCounts[j.id] || 0) > 0 && <span>❤️ {likeCounts[j.id]}</span>}
                    {(commentCounts[j.id] || 0) > 0 && <span>💬 {commentCounts[j.id]}</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {joueurModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setJoueurModal(null)}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#4ade80' }}>{joueurModal.prenom?.[0]}{joueurModal.nom?.[0]}</div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{joueurModal.prenom} {joueurModal.nom}</h2><p style={{ margin: '4px 0 0', color: '#4ade80', fontSize: '14px' }}>{joueurModal.poste} {joueurModal.categorie ? `· ${joueurModal.categorie}` : ''}</p></div>
              </div>
              <button onClick={() => setJoueurModal(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {[['📍', 'Region', joueurModal.region], ['🦵', 'Pied', joueurModal.pied], ['🏟️', 'Niveau', joueurModal.niveau_equipe], ['🏆', 'Club', joueurModal.club]].filter(([,,v]) => v).map(([ico, label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}><p style={{ margin: 0, fontSize: '11px', color: '#666' }}>{ico} {label}</p><p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{val}</p></div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statistiques</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
              {[['Matchs', joueurModal.matchs_officiel ?? 0], ['Minutes', joueurModal.minutes_jouees ?? 0], ['Buts', joueurModal.buts_total ?? 0], ['Passes dec.', joueurModal.passes_decisives ?? 0], ['Amicaux', joueurModal.matchs_amical ?? 0], ['Clean sheets', joueurModal.cleansheets ?? 0]].map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{val}</p><p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{label}</p></div>
              ))}
            </div>
            {joueurModal.clip_url && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Video</p>
                <div style={{ borderRadius: '8px', overflow: 'hidden' }}><VideoPlayer url={joueurModal.clip_url} /></div>
              </div>
            )}
            {user && (
              <div style={{ display: 'flex', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #222', flexWrap: 'wrap' }}>
                <button onClick={async () => { await (likedIds.includes(joueurModal.id) ? supabase.from('likes').delete().eq('user_id', user.id).eq('joueur_id', joueurModal.id) : supabase.from('likes').insert({ user_id: user.id, joueur_id: joueurModal.id })); refresh() }} style={{ background: likedIds.includes(joueurModal.id) ? '#ef444420' : '#1a1a1a', border: `1px solid ${likedIds.includes(joueurModal.id) ? '#ef4444' : '#333'}`, color: likedIds.includes(joueurModal.id) ? '#ef4444' : '#aaa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>{likedIds.includes(joueurModal.id) ? '❤️ Like' : '🤍 Liker'}</button>
                <button onClick={async () => { await (favoriIds.includes(joueurModal.id) ? supabase.from('video_favoris').delete().eq('user_id', user.id).eq('joueur_id', joueurModal.id) : supabase.from('video_favoris').insert({ user_id: user.id, joueur_id: joueurModal.id })); refresh() }} style={{ background: favoriIds.includes(joueurModal.id) ? '#f59e0b20' : '#1a1a1a', border: `1px solid ${favoriIds.includes(joueurModal.id) ? '#f59e0b' : '#333'}`, color: favoriIds.includes(joueurModal.id) ? '#f59e0b' : '#aaa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>{favoriIds.includes(joueurModal.id) ? '⭐ Favori' : '☆ Favoris'}</button>
                {isRecruteur && (<button onClick={() => navigate('/club')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Scout Center →</button>)}
              </div>
            )}
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center', marginTop: '3rem' }}>
        <p style={{ color: '#444', fontSize: '13px' }}>2025 Digital Football</p>
      </footer>
    </div>
  )
}

export default Feed