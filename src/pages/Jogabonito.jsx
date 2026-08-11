import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Avatar from '../components/Avatar'
import { notifierJoueur } from '../lib/notifications'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'

const detectType = (url) => {
  if (!url) return null
  if (url.includes('cloudinary.com') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm')) return 'mp4'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
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

// ── Carte Reel plein écran ──────────────────────────────────────────────────
function ReelCard({ reel, isActive, user, onOpenProfile, onDelete, lang }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [reposted, setReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(0)
  const [favori, setFavori] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [muted, setMuted] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const type = detectType(reel.video_url)

  // Est-ce que c'est le reel du joueur connecté ?
  const isOwner = user?.id === reel.joueur_id

  useEffect(() => {
    chargerInteractions()
  }, [reel.id])

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
      setPlaying(true)
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [isActive])

  const chargerInteractions = async () => {
    const { data: lk } = await supabase.from('likes').select('id, user_id').eq('clip_id', reel.joueur_id)
    setLikeCount(lk?.length || 0)
    if (user) setLiked(lk?.some(l => l.user_id === user.id) || false)
    if (user) {
      const { data: fav } = await supabase.from('video_favoris').select('id').eq('user_id', user.id).eq('joueur_id', reel.joueur_id)
      setFavori(fav?.length > 0 || false)
    }
    const { data: rp } = await supabase.from('reposts').select('id, user_id').eq('joueur_id', reel.joueur_id)
    setRepostCount(rp?.length || 0)
    if (user) setReposted(rp?.some(r => r.user_id === user.id) || false)
    const { data: cm } = await supabase.from('comments')
      .select('*, author:profiles!comments_user_id_fkey(prenom, nom, avatar_url)')
      .eq('joueur_id', reel.joueur_id)
      .order('created_at', { ascending: false })
      .limit(20)
    setComments(cm || [])
  }

  const handleLike = async () => {
    if (!user) { setShowLoginPrompt(true); return }
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('clip_id', reel.joueur_id)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('likes').insert({ user_id: user.id, clip_id: reel.joueur_id })
      setLikeCount(c => c + 1)
      if (reel.joueur_id !== user.id) {
        const { data: auteur } = await supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle()
        await notifierJoueur({ type: 'like', userId: reel.joueur_id, titre: 'Nouveau like', contenu: { auteur: auteur?.prenom }, lien: '/dashboard' })
      }
    }
    setLiked(!liked)
  }

  const handleFavori = async () => {
    if (!user) { setShowLoginPrompt(true); return }
    if (favori) {
      await supabase.from('video_favoris').delete().eq('user_id', user.id).eq('joueur_id', reel.joueur_id)
    } else {
      await supabase.from('video_favoris').insert({ user_id: user.id, joueur_id: reel.joueur_id })
    }
    setFavori(!favori)
  }

  const handleRepost = async () => {
    if (!user) { setShowLoginPrompt(true); return }
    if (reposted) {
      await supabase.from('reposts').delete().eq('user_id', user.id).eq('joueur_id', reel.joueur_id)
      setRepostCount(c => c - 1)
    } else {
      await supabase.from('reposts').insert({ user_id: user.id, joueur_id: reel.joueur_id })
      setRepostCount(c => c + 1)
    }
    setReposted(!reposted)
  }

  const handleComment = async () => {
    if (!newComment.trim() || !user) return
    await supabase.from('comments').insert({ user_id: user.id, joueur_id: reel.joueur_id, content: newComment.trim() })
    setNewComment('')
    chargerInteractions()
    if (reel.joueur_id !== user.id) {
      const { data: auteur } = await supabase.from('profiles').select('prenom').eq('id', user.id).maybeSingle()
      await notifierJoueur({ type: 'commentaire', userId: reel.joueur_id, titre: 'Nouveau commentaire', contenu: { auteur: auteur?.prenom, texte: newComment.trim() }, lien: '/dashboard' })
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { videoRef.current.play(); setPlaying(true) }
  }

  // ── Suppression du reel (propriétaire uniquement) ──
  const handleDelete = async () => {
    setDeleting(true)
    const { error: errReel } = await supabase.from('reels').delete().eq('joueur_id', user.id)
    const { error: errProfile } = await supabase.from('profiles').update({ clip_url: null }).eq('id', user.id)
    setDeleting(false)
    setShowDeleteConfirm(false)
    if (errReel) { alert(t('feed_erreur_suppression_reel', lang) + errReel.message); return }
    if (errProfile) { alert(t('feed_erreur_suppression_profil', lang) + errProfile.message); return }
    if (onDelete) onDelete()
  }

  const joueur = reel.profiles

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: colors.black, overflow: 'hidden', flexShrink: 0 }}>

      {/* VIDÉO */}
      {type === 'mp4' && (
        <video
          ref={videoRef}
          src={reel.video_url}
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
        />
      )}
      {type === 'youtube' && (
        <iframe
          src={`https://www.youtube.com/embed/${getYoutubeId(reel.video_url)}?autoplay=${isActive ? 1 : 0}&loop=1&mute=1&controls=1&playsinline=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube reel"
        />
      )}
      {type === 'tiktok' && (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${getTikTokId(reel.video_url)}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="encrypted-media"
          allowFullScreen
          title="TikTok reel"
        />
      )}
      {(type === 'instagram' || type === 'link') && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.background.base }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{type === 'instagram' ? '📸' : '🎬'}</div>
          <a href={reel.video_url} target="_blank" rel="noreferrer"
            style={{ background: type === 'instagram' ? '#E1306C' : colors.accent.green, color: colors.text.primary, padding: '14px 28px', borderRadius: '12px', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
            {t('feed_ouvrir_sur', lang)} {type === 'instagram' ? 'Instagram' : t('jogab_le_lien', lang)} →
          </a>
        </div>
      )}

      {/* Overlay gradient bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Pause indicator */}
      {type === 'mp4' && !playing && isActive && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '64px', opacity: 0.8, pointerEvents: 'none' }}>⏸</div>
      )}

      {/* Badge "Ma vidéo" si propriétaire */}
      {isOwner && (
        <div style={{ position: 'absolute', top: '70px', left: '16px', background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.5)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: colors.accent.green, fontWeight: 700 }}>
          {t('feed_ma_video', lang)}
        </div>
      )}

      {/* INFO JOUEUR (bas gauche) */}
      <div style={{ position: 'absolute', bottom: '80px', left: '16px', right: '80px' }}>
        <div
          onClick={() => onOpenProfile(joueur)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
          <Avatar person={joueur} size={40} bg={colors.accent.green + alpha.light} border="2px solid #4ade80" />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: colors.text.primary, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {joueur?.prenom} {joueur?.nom}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.accent.green }}>{joueur?.poste} {joueur?.categorie ? `· ${joueur.categorie}` : ''}</p>
          </div>
        </div>
        {reel.titre && (
          <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: colors.text.primary, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{reel.titre}</p>
        )}
        {reel.description && (
          <p style={{ margin: 0, fontSize: '13px', color: '#ddd', textShadow: '0 1px 4px rgba(0,0,0,0.8)', lineHeight: '1.4' }}>{reel.description}</p>
        )}
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {joueur?.club && <span style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: colors.text.primary, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{joueur.club}</span>}
          {joueur?.region && <span style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: colors.text.primary, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{joueur.region}</span>}
        </div>
      </div>

      {/* ACTIONS (droite) */}
      <div style={{ position: 'absolute', bottom: '80px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

        {/* Like */}
        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '28px', filter: liked ? 'none' : 'grayscale(100%)', transition: 'filter 0.2s, transform 0.1s', transform: liked ? 'scale(1.2)' : 'scale(1)' }}>❤️</div>
          <span style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{likeCount}</span>
        </button>

        {/* Commentaires */}
        <button onClick={() => user ? setShowComments(true) : setShowLoginPrompt(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '28px' }}>💬</div>
          <span style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{comments.length}</span>
        </button>

        {/* Republier */}
        <button onClick={handleRepost} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '28px', filter: reposted ? 'none' : 'grayscale(100%)', transition: 'filter 0.2s, transform 0.15s', transform: reposted ? 'scale(1.15)' : 'scale(1)' }}>🔁</div>
          <span style={{ color: reposted ? colors.accent.green : colors.text.primary, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', transition: 'color 0.2s' }}>{repostCount > 0 ? repostCount : t('feed_partager', lang)}</span>
        </button>

        {/* Favori */}
        <button onClick={handleFavori} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '28px', filter: favori ? 'none' : 'grayscale(100%)', transition: 'filter 0.2s, transform 0.15s', transform: favori ? 'scale(1.15)' : 'scale(1)' }}>⭐</div>
          <span style={{ color: favori ? '#f59e0b' : colors.text.primary, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', transition: 'color 0.2s' }}>{t('jogab_save', lang)}</span>
        </button>

        {/* Profil raccourci */}
        <button onClick={() => onOpenProfile(joueur)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '28px' }}>👤</div>
          <span style={{ color: colors.text.primary, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{t('jogab_profil', lang)}</span>
        </button>

        {/* Son (MP4 seulement) */}
        {type === 'mp4' && (
          <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ fontSize: '24px' }}>{muted ? '🔇' : '🔊'}</div>
          </button>
        )}

        {/* ── SUPPRIMER — visible uniquement par le propriétaire ── */}
        {isOwner && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
          >
            <div style={{ fontSize: '24px' }}>🗑️</div>
            <span style={{ color: colors.accent.red, fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{t('jogab_suppr', lang)}</span>
          </button>
        )}
      </div>

      {/* Indicateur scroll */}
      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
        <div style={{ width: '2px', height: '20px', background: colors.text.primary, borderRadius: '2px', animation: 'bounce 1.5s infinite' }} />
        <span style={{ color: colors.text.primary, fontSize: '10px' }}>{t('jogab_scroll', lang)}</span>
      </div>

      {/* PROMPT CONNEXION */}
      {showLoginPrompt && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowLoginPrompt(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: colors.background.surface, border: '1px solid #4ade8030', borderRadius: '20px 20px 0 0', padding: '2rem', width: '100%', maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '4px', background: colors.border.strong, borderRadius: '2px', margin: '0 auto 1.5rem' }} />
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚽</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>{t('jogab_rejoins_communaute', lang)}</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: colors.text.muted }}>
              {t('jogab_cree_compte_liker_desc', lang)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { window.location.href = '/register' }}
                style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '13px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
              >
                {t('jogab_creer_compte_gratuit', lang)}
              </button>
              <button
                onClick={() => { window.location.href = '/login' }}
                style={{ background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '11px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer' }}
              >
                {t('jogab_jai_deja_compte', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {showDeleteConfirm && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: colors.background.surface, border: '1px solid #ef444440', borderRadius: '16px', padding: '2rem', maxWidth: '320px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: colors.text.primary }}>{t('jogab_supprimer_ce_reel', lang)}</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: colors.text.muted }}>{t('jogab_reel_retire_desc', lang)}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: colors.text.secondary, padding: '12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
              >
                {t('clubpub_annuler', lang)}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, background: colors.accent.red, color: colors.text.primary, border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? t('feed_suppression_cours', lang) : t('jogab_supprimer', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER COMMENTAIRES */}
      {showComments && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }} onClick={() => setShowComments(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: colors.background.surface, borderRadius: '20px 20px 0 0', padding: '1rem', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '40px', height: '4px', background: colors.border.strong, borderRadius: '2px', margin: '0 auto 1rem' }} />
            <p style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '16px' }}>{t('jogab_commentaires', lang)}</p>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
              {comments.length === 0 ? (
                <p style={{ color: colors.text.faint, textAlign: 'center', padding: '2rem 0', fontSize: '14px' }}>{t('feed_aucun_commentaire', lang)}</p>
              ) : comments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Avatar person={c.author} size={32} bg="#1a2e1a" />
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600 }}>{c.author?.prenom} {c.author?.nom}</p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#ddd' }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {user ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  placeholder={t('jogab_ajouter_commentaire', lang)}
                  style={{ flex: 1, background: colors.background.raised, border: '1px solid #333', borderRadius: '24px', color: colors.text.primary, padding: '10px 16px', fontSize: '14px', outline: 'none' }}
                />
                <button onClick={handleComment} disabled={!newComment.trim()}
                  style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 18px', borderRadius: '24px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', opacity: !newComment.trim() ? 0.5 : 1 }}>
                  →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ color: colors.text.dim, fontSize: '13px', margin: '0 0 10px' }}>{t('jogab_cree_compte_interagir', lang)}</p>
                <button onClick={() => { setShowComments(false); setShowLoginPrompt(true) }}
                  style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '10px 24px', borderRadius: '20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                  {t('jogab_rejoindre_gratuitement', lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal profil joueur ─────────────────────────────────────────────────────
function ProfilModal({ joueur, onClose, lang }) {
  if (!joueur) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '20px 20px 0 0', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: '40px', height: '4px', background: colors.border.strong, borderRadius: '2px', margin: '0 auto 1.5rem' }} />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Avatar person={joueur} size={60} border="2px solid #4ade80" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{joueur?.prenom} {joueur?.nom}</h2>
            <p style={{ margin: '4px 0 0', color: colors.accent.green, fontSize: '14px' }}>{joueur?.poste} {joueur?.categorie ? `· ${joueur.categorie}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
          {[[`🏆 ${t('feed_stat_club', lang)}`, joueur?.club], [`📍 ${t('profil_region', lang)}`, joueur?.region], [`🦵 ${t('feed_stat_pied', lang)}`, joueur?.pied], [`🏟️ ${t('feed_stat_niveau', lang)}`, joueur?.niveau_equipe]].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ background: colors.background.raised, borderRadius: '8px', padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: colors.text.dim }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{val}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[[t('feed_stat_buts', lang), joueur?.buts_total ?? 0], [t('comp_passes_dec', lang), joueur?.passes_decisives ?? 0], [t('feed_stat_matchs', lang), joueur?.matchs_officiel ?? 0]].map(([label, val]) => (
            <div key={label} style={{ background: colors.background.raised, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: colors.accent.green }}>{val}</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.dim }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page principale Reels ───────────────────────────────────────────────────
function Jogabonito() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [profilModal, setProfilModal] = useState(null)
  const containerRef = useRef(null)
  const observerRef = useRef(null)
  const cardRefs = useRef([])

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    await chargerReels()
    setLoading(false)
  }

  const chargerReels = async () => {
    const { data } = await supabase
      .from('reels')
      .select('*, profiles(prenom, nom, poste, categorie, club, region, pied, niveau_equipe, buts_total, passes_decisives, matchs_officiel, avatar_url)')
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) {
      const { data: joueurs } = await supabase
        .from('profiles')
        .select('*')
        .eq('plan', 'joueur_pro')
        .eq('abonnement_actif', true)
        .not('clip_url', 'is', null)
        .order('created_at', { ascending: false })

      const fakeReels = (joueurs || []).map(j => ({
        id: j.id,
        joueur_id: j.id,
        video_url: j.clip_url,
        titre: null,
        description: j.bio || null,
        profiles: j,
      }))
      setReels(fakeReels)
    } else {
      setReels(data)
    }
  }

  // Appelé après une suppression : recharge la liste
  const handleReelDeleted = async () => {
    await chargerReels()
    setActiveIndex(0)
  }

  useEffect(() => {
    if (reels.length === 0) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = cardRefs.current.indexOf(entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.7 }
    )
    cardRefs.current.forEach(ref => { if (ref) observerRef.current.observe(ref) })
    return () => observerRef.current?.disconnect()
  }, [reels])

  const setCardRef = useCallback((el, idx) => {
    cardRefs.current[idx] = el
    if (el && observerRef.current) observerRef.current.observe(el)
  }, [])

  if (loading) return (
    <div style={{ height: '100vh', background: colors.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green, fontSize: '16px' }}>{t('jexp_chargement', lang)}</p>
    </div>
  )

  return (
    <div style={{ position: 'relative', background: colors.black, height: '100vh', overflow: 'hidden' }}>

      {/* NAV overlay */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <div onClick={() => navigate('/')} style={{ fontSize: '16px', fontWeight: '700', cursor: 'pointer', color: colors.text.primary }}>
          Digital<span style={{ color: colors.accent.green }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/feed')}
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', color: colors.text.primary, padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            📋 Feed
          </button>
          {user ? (
            <button onClick={() => navigate('/dashboard')}
              style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('feed_mon_espace', lang)}
            </button>
          ) : (
            <button onClick={() => navigate('/login')}
              style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('jogab_connexion', lang)}
            </button>
          )}
        </div>
      </div>

      {/* Compteur */}
      <div style={{ position: 'fixed', top: '70px', right: '16px', zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: colors.text.secondary }}>
        {activeIndex + 1} / {reels.length}
      </div>

      {/* FEED VERTICAL */}
      {reels.length === 0 ? (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.text.faint }}>
          <p style={{ fontSize: '3rem' }}>🎬</p>
          <p style={{ fontSize: '18px' }}>{t('jogab_aucun_reel_moment', lang)}</p>
          <p style={{ fontSize: '14px', color: colors.text.disabled, marginTop: '8px' }}>{t('jogab_joueurs_publient_desc', lang)}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
          className="reels-container">
          {reels.map((reel, idx) => (
            <div
              key={reel.id}
              ref={el => setCardRef(el, idx)}
              style={{ scrollSnapAlign: 'start', height: '100vh', width: '100%' }}>
              <ReelCard
                reel={reel}
                isActive={idx === activeIndex}
                user={user}
                onOpenProfile={setProfilModal}
                onDelete={handleReelDeleted}
                lang={lang}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal profil */}
      {profilModal && <ProfilModal joueur={profilModal} onClose={() => setProfilModal(null)} lang={lang} />}

      <style>{`
        .reels-container::-webkit-scrollbar { display: none; }
        .reels-container { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default Jogabonito