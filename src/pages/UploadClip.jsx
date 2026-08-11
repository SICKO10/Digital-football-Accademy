import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'

export default function UploadClip() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [mode, setMode] = useState('lien')
  const [lien, setLien] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!p || p.plan !== 'pro' || !p.abonnement_actif) { navigate('/dashboard'); return }
    setUser(user)
    setProfil(p)
  }

  const detectPlatform = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { label: 'YouTube', color: '#ff0000' }
    if (url.includes('veo.co')) return { label: 'Veo', color: colors.accent.blue }
    if (url.includes('tiktok.com')) return { label: 'TikTok', color: '#69C9D0' }
    if (url.includes('instagram.com')) return { label: 'Instagram', color: '#E1306C' }
    if (url.includes('cloudinary.com') || url.endsWith('.mp4') || url.endsWith('.mov')) return { label: 'Vidéo directe', color: colors.accent.green }
    return null
  }

  const platform = lien ? detectPlatform(lien) : null

  async function sauvegarderVideo(videoUrl) {
    const { error: e1 } = await supabase.from('profiles').update({ clip_url: videoUrl }).eq('id', user.id)
    if (e1) throw e1

    // Supprime l'ancien reel si existant puis recrée
    await supabase.from('reels').delete().eq('joueur_id', user.id)
    const { error: e2 } = await supabase.from('reels').insert({
      joueur_id: user.id,
      video_url: videoUrl,
      titre: titre.trim() || null,
      description: description.trim() || null,
    })
    if (e2) throw e2
  }

  async function handleSubmitLien() {
    if (!lien.trim()) { setErreur(t('uploadclip_colle_lien_video', lang)); return }
    setUploading(true)
    setErreur('')
    try {
      await sauvegarderVideo(lien.trim())
      setSuccess(true)
    } catch (e) { setErreur(e.message || t('uploadclip_erreur_publication', lang)) }
    setUploading(false)
  }

  async function handleUploadFichier() {
    if (!file) { setErreur(t('uploadclip_selectionne_fichier', lang)); return }
    setUploading(true)
    setErreur('')
    setProgress(0)
    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!sigRes.ok) { const err = await sigRes.json(); throw new Error(err.error || t('upload_erreur_signature', lang)) }
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      setProgress(10)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', String(timestamp))
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)

      const videoUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(10 + Math.round((e.loaded / e.total) * 85))
        }
        xhr.onload = () => {
          const res = JSON.parse(xhr.responseText)
          if (res.secure_url) resolve(res.secure_url)
          else reject(new Error(res.error?.message || t('upload_upload_echoue', lang)))
        }
        xhr.onerror = () => reject(new Error(t('upload_erreur_reseau', lang)))
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`)
        xhr.send(formData)
      })

      await sauvegarderVideo(videoUrl)
      setProgress(100)
      setSuccess(true)
    } catch (e) { setErreur(e.message || t('invite_erreur_inconnue', lang)) }
    setUploading(false)
  }

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'sans-serif' },
    content: { maxWidth: '560px', margin: '0 auto', padding: '2rem 1rem' },
    card: { background: colors.background.surface, border: '1px solid #222', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' },
    input: { width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', color: colors.text.primary, padding: '12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    label: { fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' },
    modeBtn: (active) => ({ padding: '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? colors.accent.green : 'transparent', color: active ? colors.black : colors.text.secondary, fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '14px' }),
  }

  if (!profil) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green }}>{t('jexp_chargement', lang)}</p>
    </div>
  )

  if (success) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '4rem' }}>🎬</p>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{t('uploadclip_publie_titre', lang)}</h2>
        <p style={{ color: colors.text.dim, marginBottom: '2rem' }}>{t('uploadclip_publie_desc', lang)}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/feed')} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{t('uploadclip_voir_feed', lang)}</button>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}>Dashboard</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={st.page}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: '1px solid #333', color: colors.text.secondary, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>{t('upload_dashboard_retour', lang)}</button>
      </nav>

      <div style={st.content}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>🎬 {t('uploadclip_titre', lang)}</h1>
        <p style={{ color: colors.text.dim, fontSize: '14px', margin: '0 0 1.5rem' }}>{t('uploadclip_desc', lang)}</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <button style={st.modeBtn(mode === 'lien')} onClick={() => setMode('lien')}>{t('upload_lien_mode', lang)}</button>
          <button style={st.modeBtn(mode === 'mp4')} onClick={() => setMode('mp4')}>{t('upload_mp4_mode', lang)}</button>
        </div>

        <div style={st.card}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={st.label}>{t('upload_titre_optionnel', lang)}</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Mon but de la semaine 🔥" style={st.input} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={st.label}>{t('upload_description_optionnel', lang)}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décris ton clip..." rows={2} style={{ ...st.input, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {mode === 'lien' && (
            <div>
              <label style={st.label}>{t('uploadclip_lien_label', lang)}</label>
              <input
                value={lien}
                onChange={e => setLien(e.target.value)}
                placeholder="https://www.youtube.com/... ou https://app.veo.co/..."
                style={st.input}
              />
              {platform && <p style={{ marginTop: '8px', fontSize: '13px', color: platform.color, fontWeight: 600 }}>{platform.label} {t('upload_detecte', lang)}</p>}
              <div style={{ background: '#0f1a0f', border: '1px solid #4ade8020', borderRadius: '10px', padding: '10px 14px', marginTop: '12px' }}>
                <p style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 600, margin: '0 0 4px' }}>{t('uploadclip_plateformes_acceptees', lang)}</p>
                <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0 }}>{t('uploadclip_plateformes_liste', lang)}</p>
              </div>
            </div>
          )}

          {mode === 'mp4' && (
            <div>
              <label style={st.label}>{t('uploadclip_fichier_label', lang)}</label>
              <div
                onClick={() => document.getElementById('clip-file').click()}
                style={{ border: '2px dashed ' + (file ? colors.accent.green : colors.border.strong), borderRadius: '12px', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', background: file ? colors.accent.green + alpha.faint : 'transparent' }}>
                {file ? (
                  <><p style={{ fontSize: '2rem', margin: '0 0 8px' }}>✅</p><p style={{ fontWeight: 600, margin: 0 }}>{file.name}</p><p style={{ fontSize: '13px', color: colors.text.dim, margin: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p></>
                ) : (
                  <><p style={{ fontSize: '2rem', margin: '0 0 8px' }}>📁</p><p style={{ color: colors.text.dim, fontSize: '14px', margin: 0 }}>{t('upload_clique_selectionner', lang)}</p></>
                )}
              </div>
              <input id="clip-file" type="file" accept="video/mp4,video/mov,video/webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f && f.size > 500 * 1024 * 1024) { setErreur(t('upload_fichier_trop_volumineux_500', lang)); return } setErreur(''); setFile(f) }} />
              {uploading && progress > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ background: colors.background.raised, borderRadius: '8px', overflow: 'hidden', height: '8px' }}>
                    <div style={{ height: '100%', background: colors.accent.green, width: progress + '%', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: colors.accent.green, marginTop: '4px', textAlign: 'center' }}>{progress}%</p>
                </div>
              )}
            </div>
          )}

          {erreur && <p style={{ color: colors.accent.red, fontSize: '13px', marginTop: '12px' }}>❌ {erreur}</p>}

          <button
            onClick={mode === 'lien' ? handleSubmitLien : handleUploadFichier}
            disabled={uploading || (mode === 'lien' ? !lien.trim() : !file)}
            style={{ marginTop: '1.5rem', width: '100%', background: (uploading || (mode === 'lien' ? !lien.trim() : !file)) ? colors.border.strong : colors.accent.green, color: (uploading || (mode === 'lien' ? !lien.trim() : !file)) ? colors.text.dim : colors.black, border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '15px', cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? (progress > 0 ? `Upload ${progress}%...` : t('upload_publication_cours', lang)) : t('uploadclip_publier_btn', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
