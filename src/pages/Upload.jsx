import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Upload() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const [erreur, setErreur] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: profil } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profil || !profil.abonnement_actif || profil.plan === 'recruteur') { navigate('/dashboard'); return }
    setUser(user)
    setProfil(profil)
  }

  async function handleUpload() {
    if (!file || !user) return
    setUploading(true)
    setErreur('')
    setProgress(0)

    const formData = new FormData()
    formData.append('video', file)
    formData.append('userId', user.id)

    try {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)
          if (description.trim()) {
            await supabase.from('profiles').update({ bio: description }).eq('id', user.id)
          }
          setSuccess(true)
          setProgress(100)
        } else {
          setErreur('Erreur lors de l\'upload')
        }
        setUploading(false)
      }

      xhr.onerror = () => {
        setErreur('Erreur réseau')
        setUploading(false)
      }

      xhr.open('POST', '/api/upload-video')
      xhr.send(formData)
    } catch (e) {
      setErreur(e.message)
      setUploading(false)
    }
  }

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { background: '#111', borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' },
    container: { maxWidth: '700px', margin: '0 auto', padding: '3rem 2rem' },
    box: { background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' },
    label: { fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' },
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' },
    btn: (disabled) => ({ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: disabled ? '#333' : '#4ade80', color: disabled ? '#666' : '#000', fontSize: '15px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }),
  }

  if (!profil) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo} onClick={() => navigate('/')}>⚽ Digital Football</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>← Dashboard</button>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px' }}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.container}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Upload vidéo <span style={{ color: '#4ade80' }}>🎬</span></h1>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '14px' }}>
          Envoie ton clip de match — il sera visible par les recruteurs dans le Scout Center
        </p>

        {success ? (
          <div style={{ ...s.box, border: '2px solid #4ade80', textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Vidéo uploadée !</h2>
            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '14px' }}>Ton clip est maintenant visible par les recruteurs.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard')} style={{ ...s.btn(false), width: 'auto', padding: '10px 24px' }}>Voir mon dashboard</button>
              <button onClick={() => { setSuccess(false); setFile(null); setProgress(0) }} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Uploader un autre</button>
            </div>
          </div>
        ) : (
          <>
            <div style={s.box}>
              <label style={{ ...s.label, fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Sélectionne ta vidéo</label>
              <div
                onClick={() => document.getElementById('video-input').click()}
                style={{ border: '2px dashed ' + (file ? '#4ade80' : '#333'), borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: file ? '#4ade8008' : 'transparent', transition: 'all 0.2s' }}
              >
                <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{file ? '🎬' : '📁'}</p>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{file ? file.name : 'Cliquez pour sélectionner une vidéo'}</p>
                <p style={{ fontSize: '13px', color: '#555' }}>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV, AVI — max 500MB'}</p>
              </div>
              <input id="video-input" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            </div>

            <div style={s.box}>
              <label style={s.label}>Description (optionnel)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Match contre Lyon, je joue milieu offensif, regardez mon appel de balle à la 3ème minute..."
                style={{ ...s.input, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {uploading && (
              <div style={{ ...s.box, marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: '#4ade80' }}>Upload en cours...</span>
                  <span style={{ fontWeight: 700 }}>{progress}%</span>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#4ade80', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '8px' }} />
                </div>
              </div>
            )}

            {erreur && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem', textAlign: 'center' }}>{erreur}</p>}

            <button style={s.btn(!file || uploading)} disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? `Upload en cours... ${progress}%` : '🚀 Envoyer ma vidéo'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#555', marginTop: '1rem' }}>
              Seuls les recruteurs avec abonnement actif peuvent voir tes vidéos
            </p>
          </>
        )}
      </div>
    </div>
  )
}