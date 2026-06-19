import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function UploadReel() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('lien')
  const [lien, setLien] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const detectPlatform = (url) => {
    if (url.includes('tiktok.com')) return { label: 'TikTok', color: '#69C9D0' }
    if (url.includes('instagram.com')) return { label: 'Instagram', color: '#E1306C' }
    if (url.includes('youtube.com') || url.includes('youtu.be')) return { label: 'YouTube', color: '#ff0000' }
    if (url.includes('veo.co')) return { label: 'Veo', color: '#60a5fa' }
    return null
  }

  const platform = lien ? detectPlatform(lien) : null

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 200 * 1024 * 1024) { setError('Fichier trop volumineux (max 200MB)'); return }
    setError('')
    setFile(f)
  }

  const handleSubmitLien = async () => {
    if (!lien.trim()) { setError('Colle un lien'); return }
    setUploading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Non connecté'); setUploading(false); return }
      const { error: err } = await supabase.from('reels').insert({
        joueur_id: user.id,
        video_url: lien.trim(),
        titre: titre.trim() || null,
        description: description.trim() || null,
      })
      if (err) throw err
      setSuccess(true)
    } catch (e) { setError('Erreur : ' + e.message) }
    setUploading(false)
  }

  const handleSubmitMp4 = async () => {
    if (!file) { setError('Sélectionne un fichier MP4'); return }
    setUploading(true)
    setError('')
    setUploadProgress(0)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Non connecté'); setUploading(false); return }

      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      if (!sigRes.ok) throw new Error('Erreur signature')
      const { signature, timestamp, api_key, cloud_name, folder, public_id } = await sigRes.json()
      if (!cloud_name) throw new Error('Configuration Cloudinary manquante')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('api_key', api_key)
      formData.append('folder', folder)
      formData.append('public_id', public_id)

      const videoUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          const res = JSON.parse(xhr.responseText)
          if (res.secure_url) resolve(res.secure_url)
          else reject(new Error(res.error?.message || 'Upload échoué'))
        }
        xhr.onerror = () => reject(new Error('Erreur réseau'))
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + cloud_name + '/video/upload')
        xhr.send(formData)
      })

      const { error: err } = await supabase.from('reels').insert({
        joueur_id: user.id,
        video_url: videoUrl,
        titre: titre.trim() || null,
        description: description.trim() || null,
      })
      if (err) throw err
      setSuccess(true)
    } catch (e) { setError('Erreur : ' + e.message) }
    setUploading(false)
  }

  const st = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' },
    content: { maxWidth: '520px', margin: '0 auto', padding: '2rem 1rem' },
    card: { background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' },
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    label: { fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' },
    btn: (active) => ({ padding: '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '14px' }),
  }

  if (success) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '4rem' }}>🎬</p>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Reel publié !</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Ton clip est visible dans le feed Reels.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/reels')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Voir les Reels 🎬</button>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}>Dashboard</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={st.page}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>← Dashboard</button>
      </nav>
      <div style={st.content}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>🎬 Publier un Reel</h1>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 1.5rem' }}>Clips courts · Max 4 min · Visible par tous</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <button style={st.btn(mode === 'lien')} onClick={() => setMode('lien')}>🔗 Lien</button>
          <button style={st.btn(mode === 'mp4')} onClick={() => setMode('mp4')}>📁 MP4</button>
        </div>

        <div style={st.card}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={st.label}>Titre (optionnel)</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Hat-trick contre Lyon U17 🔥" style={st.input} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={st.label}>Description (optionnel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Match de championnat..." style={{ ...st.input, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }} />
          </div>

          {mode === 'lien' && (
            <div>
              <label style={st.label}>Lien TikTok / Instagram / YouTube / Veo</label>
              <input value={lien} onChange={e => setLien(e.target.value)} placeholder="https://www.tiktok.com/@..." style={st.input} />
              {platform && <p style={{ marginTop: '8px', fontSize: '13px', color: platform.color, fontWeight: 600 }}>{platform.label} détecté ✓</p>}
            </div>
          )}

          {mode === 'mp4' && (
            <div>
              <label style={st.label}>Fichier MP4 (max 200MB ≈ 4 min)</label>
              <div onClick={() => document.getElementById('reel-file').click()}
                style={{ border: '2px dashed ' + (file ? '#4ade80' : '#333'), borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: file ? '#4ade8008' : 'transparent' }}>
                {file ? (
                  <><p style={{ fontSize: '2rem', margin: '0 0 8px' }}>✅</p><p style={{ fontWeight: 600, margin: 0 }}>{file.name}</p><p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p></>
                ) : (
                  <><p style={{ fontSize: '2rem', margin: '0 0 8px' }}>📁</p><p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Clique pour sélectionner</p></>
                )}
              </div>
              <input id="reel-file" type="file" accept="video/mp4,video/mov,video/webm" style={{ display: 'none' }} onChange={handleFileChange} />
              {uploading && uploadProgress > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', height: '8px' }}>
                    <div style={{ height: '100%', background: '#4ade80', width: uploadProgress + '%', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#4ade80', marginTop: '4px', textAlign: 'center' }}>{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}

          {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>❌ {error}</p>}

          <button onClick={mode === 'lien' ? handleSubmitLien : handleSubmitMp4} disabled={uploading}
            style={{ marginTop: '1.5rem', width: '100%', background: uploading ? '#333' : '#4ade80', color: uploading ? '#666' : '#000', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '15px', cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? (uploadProgress > 0 ? 'Upload ' + uploadProgress + '%...' : 'Publication...') : '🚀 Publier mon Reel'}
          </button>
        </div>
      </div>
    </div>
  )
}
