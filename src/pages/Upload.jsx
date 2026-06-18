import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Upload() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [mode, setMode] = useState('lien')
  const [lien, setLien] = useState('')
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

  async function handleSubmitLien() {
    if (!lien.trim() || !user) return
    setUploading(true)
    setErreur('')
    try {
      await supabase.from('profiles').update({
        clip_url: lien.trim(),
        bio: description.trim() || null
      }).eq('id', user.id)

      await supabase.from('demandes').insert({
        joueur_id: user.id,
        titre: `Analyse vidéo — ${profil.prenom} ${profil.nom}`,
        poste: profil.poste || '',
        description: description.trim() || '',
        video_url: lien.trim(),
        statut: 'en_attente',
      })

      setSuccess(true)
    } catch (e) {
      setErreur(e.message)
    }
    setUploading(false)
  }

  async function handleUploadFichier() {
    if (!file || !user) return
    setUploading(true)
    setErreur('')
    setProgress(10)

    try {
      const sigRes = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      setProgress(20)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)

      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(20 + Math.round((e.loaded / e.total) * 70))
      }
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)

          await supabase.from('profiles').update({
            clip_url: data.secure_url,
            bio: description.trim() || null
          }).eq('id', user.id)

          await supabase.from('demandes').insert({
            joueur_id: user.id,
            titre: `Analyse vidéo — ${profil.prenom} ${profil.nom}`,
            poste: profil.poste || '',
            description: description.trim() || '',
            video_url: data.secure_url,
            statut: 'en_attente',
          })

          setProgress(100)
          setSuccess(true)
        } else {
          setErreur('Erreur upload')
        }
        setUploading(false)
      }
      xhr.onerror = () => { setErreur('Erreur réseau'); setUploading(false) }
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`)
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
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    btn: (disabled) => ({ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: disabled ? '#333' : '#4ade80', color: disabled ? '#666' : '#000', fontSize: '15px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }),
    modeBtn: (active) => ({ flex: 1, padding: '12px', borderRadius: '8px', border: active ? '2px solid #4ade80' : '1px solid #333', background: active ? '#4ade8010' : 'transparent', color: active ? '#4ade80' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }),
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
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Partage ta vidéo <span style={{ color: '#4ade80' }}>🎬</span></h1>
        <p style={{ color: '#666', marginBottom: '2rem', fontSize: '14px' }}>Ton clip sera visible par les recruteurs et analysé par notre coach</p>

        {success ? (
          <div style={{ ...s.box, border: '2px solid #4ade80', textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</p>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Vidéo envoyée !</h2>
            <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '14px' }}>Ton clip est visible par les recruteurs.</p>
            <p style={{ color: '#4ade80', marginBottom: '2rem', fontSize: '14px' }}>Une demande d'analyse a été créée pour le coach.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard')} style={{ ...s.btn(false), width: 'auto', padding: '10px 24px' }}>Mon dashboard</button>
              <button onClick={() => { setSuccess(false); setFile(null); setLien(''); setProgress(0) }} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Envoyer un autre</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
              <button style={s.modeBtn(mode === 'lien')} onClick={() => setMode('lien')}>🔗 Lien vidéo (Veo, YouTube...)</button>
              <button style={s.modeBtn(mode === 'fichier')} onClick={() => setMode('fichier')}>📁 Upload fichier MP4</button>
            </div>

            {mode === 'lien' && (
              <div style={s.box}>
                <label style={{ ...s.label, fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Colle ton lien vidéo</label>
                <input style={s.input} placeholder="https://app.veo.co/matches/..." value={lien} onChange={e => setLien(e.target.value)} />

                <div style={{ background: '#0f2a1a', border: '1px solid #4ade8030', borderRadius: '10px', padding: '1rem', marginTop: '1rem' }}>
                  <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '13px', margin: '0 0 8px' }}>📱 Comment obtenir ton lien Veo :</p>
                  <ol style={{ color: '#aaa', fontSize: '13px', margin: 0, paddingLeft: '1.2rem', lineHeight: '1.8' }}>
                    <li>Ouvre ton match sur <strong style={{ color: '#fff' }}>app.veo.co</strong></li>
                    <li>Clique sur <strong style={{ color: '#fff' }}>"Partager"</strong> en haut à droite</li>
                    <li>Choisis <strong style={{ color: '#fff' }}>"Partager sur les médias sociaux"</strong></li>
                    <li>Copie le lien et colle-le ici</li>
                  </ol>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {['Veo ✓', 'YouTube ✓', 'Google Drive ✓', 'Hudl ✓'].map(p => (
                    <span key={p} style={{ background: '#1a1a1a', border: '1px solid #333', color: '#666', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {mode === 'fichier' && (
              <div style={s.box}>
                <label style={{ ...s.label, fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>Sélectionne ta vidéo</label>
                <div onClick={() => document.getElementById('video-input').click()}
                  style={{ border: '2px dashed ' + (file ? '#4ade80' : '#333'), borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: file ? '#4ade8008' : 'transparent' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{file ? '🎬' : '📁'}</p>
                  <p style={{ fontWeight: 600, marginBottom: '4px' }}>{file ? file.name : 'Cliquez pour sélectionner'}</p>
                  <p style={{ fontSize: '13px', color: '#555' }}>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV — max 500MB'}</p>
                </div>
                <input id="video-input" type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />

                {uploading && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ color: '#4ade80' }}>Upload en cours...</span>
                      <span style={{ fontWeight: 700 }}>{progress}%</span>
                    </div>
                    <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#4ade80', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '8px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={s.box}>
              <label style={s.label}>Description du clip (optionnel)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Match contre Lyon U18, je joue milieu offensif. Regardez mon appel de balle à la 3ème minute..."
                style={{ ...s.input, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {erreur && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '1rem', textAlign: 'center' }}>{erreur}</p>}

            <button
              style={s.btn(mode === 'lien' ? !lien.trim() || uploading : !file || uploading)}
              disabled={mode === 'lien' ? !lien.trim() || uploading : !file || uploading}
              onClick={mode === 'lien' ? handleSubmitLien : handleUploadFichier}
            >
              {uploading ? `En cours... ${mode === 'fichier' ? progress + '%' : ''}` : mode === 'lien' ? '🔗 Envoyer pour analyse' : '🚀 Envoyer ma vidéo'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#555', marginTop: '1rem' }}>
              Visible par les recruteurs · Analysé par notre coach expert
            </p>
          </>
        )}
      </div>
    </div>
  )
}