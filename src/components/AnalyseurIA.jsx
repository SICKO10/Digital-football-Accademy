import { useState, useRef } from 'react'
import { supabase } from '../supabase'

// ── Encode un AudioBuffer en fichier WAV ──────────────────────────────────
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const samples = buffer.getChannelData(0).length
  const bytesPerSample = 2  // 16-bit
  const dataLength = samples * numChannels * bytesPerSample
  const ab = new ArrayBuffer(44 + dataLength)
  const view = new DataView(ab)

  const ws = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  ws(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)                          // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  ws(36, 'data')
  view.setUint32(40, dataLength, true)

  // Mélange des canaux en mono si stéréo
  const channelData = []
  for (let c = 0; c < buffer.numberOfChannels; c++) channelData.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < samples; i++) {
    // Moyenne des canaux → mono
    let s = 0
    for (let c = 0; c < channelData.length; c++) s += channelData[c][i]
    s = s / channelData.length
    const val = Math.max(-1, Math.min(1, s))
    view.setInt16(offset, val < 0 ? val * 0x8000 : val * 0x7FFF, true)
    offset += 2
  }

  return new Blob([ab], { type: 'audio/wav' })
}

// ── Extrait l'audio d'un fichier vidéo/audio et le rééchantillonne à 16kHz ─
async function extraireAudio(file, setEtape) {
  setEtape('Décodage du fichier…')
  const arrayBuffer = await file.arrayBuffer()

  // Décode l'audio (accepte mp4, mov, mp3, m4a, wav, webm…)
  const decodingCtx = new AudioContext()
  let audioBuffer
  try {
    audioBuffer = await decodingCtx.decodeAudioData(arrayBuffer)
  } catch {
    await decodingCtx.close()
    throw new Error('Format non supporté par le navigateur. Essaie un fichier .mp4 ou .m4a.')
  }
  await decodingCtx.close()

  setEtape('Extraction audio (16kHz mono)…')

  // Rééchantillonnage à 16000 Hz mono via OfflineAudioContext (rapide, pas temps réel)
  const TARGET_SR = 16000
  const duration = audioBuffer.duration
  const offlineCtx = new OfflineAudioContext(
    1,                                         // mono
    Math.ceil(duration * TARGET_SR),
    TARGET_SR
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const resampled = await offlineCtx.startRendering()

  setEtape('Encodage WAV…')
  const wavBlob = audioBufferToWav(resampled)

  const mo = (wavBlob.size / 1024 / 1024).toFixed(1)
  setEtape(`Audio extrait — ${mo} Mo · ${Math.round(duration)}s`)

  return { blob: wavBlob, duree: Math.round(duration) }
}

// Génération PDF sans dépendance externe — utilise le canvas du navigateur
async function genererPDF(data) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const VERT = [74, 222, 128]
  const NOIR = [10, 10, 10]
  const GRIS = [80, 80, 80]
  const BLANC = [255, 255, 255]
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2

  let y = 0

  // ── En-tête ────────────────────────────────────────────────────────────
  doc.setFillColor(...NOIR)
  doc.rect(0, 0, pageW, 45, 'F')

  doc.setFillColor(...VERT)
  doc.rect(0, 0, 6, 45, 'F')

  doc.setTextColor(...VERT)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Digital Football', 14, 18)

  doc.setTextColor(...BLANC)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Rapport d\'analyse', 14, 27)

  doc.setFontSize(9)
  doc.setTextColor(160, 160, 160)
  doc.text(`${data.typeAnalyse}  ·  ${data.date}`, 14, 36)

  // Note globale
  if (data.rapport.note_globale) {
    doc.setFillColor(...VERT)
    doc.roundedRect(pageW - 50, 8, 36, 28, 4, 4, 'F')
    doc.setTextColor(...NOIR)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${data.rapport.note_globale}/10`, pageW - 43, 26)
  }

  y = 55

  // ── Nom du joueur ──────────────────────────────────────────────────────
  doc.setTextColor(...NOIR)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(data.nomJoueur, margin, y)
  y += 10

  // ── Résumé ─────────────────────────────────────────────────────────────
  if (data.rapport.resume) {
    doc.setFillColor(245, 245, 245)
    const resumeLines = doc.splitTextToSize(data.rapport.resume, contentW - 10)
    const resumeH = resumeLines.length * 6 + 12
    doc.roundedRect(margin, y, contentW, resumeH, 3, 3, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('RÉSUMÉ', margin + 6, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    doc.text(resumeLines, margin + 6, y + 14)
    y += resumeH + 8
  }

  // ── Points forts ───────────────────────────────────────────────────────
  if (data.rapport.points_forts?.length) {
    doc.setFillColor(...VERT)
    doc.rect(margin, y, 4, data.rapport.points_forts.length * 8 + 16, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...VERT)
    doc.text('✓ Points forts', margin + 8, y + 8)
    y += 14
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    data.rapport.points_forts.forEach((pt) => {
      const lines = doc.splitTextToSize(`• ${pt}`, contentW - 12)
      doc.text(lines, margin + 8, y)
      y += lines.length * 6 + 2
    })
    y += 6
  }

  // ── Axes d'amélioration ────────────────────────────────────────────────
  if (data.rapport.axes_amelioration?.length) {
    doc.setFillColor(239, 68, 68)
    doc.rect(margin, y, 4, data.rapport.axes_amelioration.length * 8 + 16, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68)
    doc.text('↗ Axes d\'amélioration', margin + 8, y + 8)
    y += 14
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    data.rapport.axes_amelioration.forEach((ax) => {
      const lines = doc.splitTextToSize(`• ${ax}`, contentW - 12)
      doc.text(lines, margin + 8, y)
      y += lines.length * 6 + 2
    })
    y += 6
  }

  // ── Conseils ───────────────────────────────────────────────────────────
  if (data.rapport.conseils) {
    doc.setFillColor(245, 245, 245)
    const conseilLines = doc.splitTextToSize(data.rapport.conseils, contentW - 10)
    const conseilH = conseilLines.length * 6 + 12
    doc.roundedRect(margin, y, contentW, conseilH, 3, 3, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('CONSEILS COACH', margin + 6, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NOIR)
    doc.text(conseilLines, margin + 6, y + 14)
    y += conseilH + 8
  }

  // ── Transcription (nouvelle page si besoin) ────────────────────────────
  if (data.transcription && y > 220) doc.addPage()
  else if (data.transcription) y += 4

  if (data.transcription) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('TRANSCRIPTION COMPLÈTE', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    const transLines = doc.splitTextToSize(data.transcription, contentW)
    transLines.forEach((line) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, margin, y)
      y += 5
    })
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFillColor(245, 245, 245)
    doc.rect(0, 285, pageW, 12, 'F')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text('Digital Football — Rapport d\'analyse confidentiel', margin, 292)
    doc.text(`Page ${i}/${pages}`, pageW - margin, 292, { align: 'right' })
  }

  const nomFichier = `rapport_${data.nomJoueur.replace(/\s+/g, '_').toLowerCase()}_${data.date.replace(/\//g, '-')}.pdf`
  doc.save(nomFichier)
}

const TAILLE_MAX = 25 * 1024 * 1024 // limite Groq Whisper

// ── Composant principal ──────────────────────────────────────────────────
export default function AnalyseurIA() {
  const [fichier, setFichier] = useState(null)
  const [nomJoueur, setNomJoueur] = useState('')
  const [typeAnalyse, setTypeAnalyse] = useState('Analyse technique')
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState('')  // message d'état
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')
  const inputRef = useRef(null)

  const isMobile = window.innerWidth < 768

  const TYPES = ['Analyse technique', 'Analyse tactique', 'Analyse physique', 'Analyse globale', 'Bilan de match']

  const choisirFichier = (f) => {
    if (!f) return
    // La vidéo est réduite à ~16kHz mono avant l'envoi (voir extraireAudio) —
    // sa taille brute n'est donc pas représentative de ce qui sera transmis.
    // Seul l'audio, envoyé tel quel, doit respecter la limite Groq dès la sélection.
    const estVideo = f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)
    if (!estVideo && f.size > TAILLE_MAX) {
      setErreur(`Fichier trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} Mo — max 25 Mo). Uploade en audio (m4a/mp3) plutôt qu'en vidéo, ou coupe l'extrait.`)
      return
    }
    setErreur('')
    setFichier(f)
  }

  const analyser = async () => {
    if (!fichier) return
    setLoading(true)
    setErreur('')
    setResultat(null)

    try {
      // ── Étape 1 : extraction audio si c'est une vidéo ──────────────────
      let fichierAudio = fichier
      const estVideo = fichier.type.startsWith('video/') ||
        /\.(mp4|mov|avi|mkv|webm)$/i.test(fichier.name)

      if (estVideo) {
        const { blob } = await extraireAudio(fichier, setEtape)
        fichierAudio = new File([blob], fichier.name.replace(/\.[^.]+$/, '.wav'), { type: 'audio/wav' })
      } else {
        setEtape('Vérification du fichier audio…')
      }

      if (fichierAudio.size > TAILLE_MAX) {
        throw new Error(`Fichier trop lourd (${(fichierAudio.size / 1024 / 1024).toFixed(1)} Mo). Limite : 25 Mo.`)
      }

      // ── Étape 2 : envoi à l'Edge Function ─────────────────────────────
      const fd = new FormData()
      fd.append('fichier', fichierAudio)
      fd.append('nomJoueur', nomJoueur || 'Joueur')
      fd.append('typeAnalyse', typeAnalyse)

      setEtape('Transcription en cours… (peut prendre 20–60s)')
      const { data, error } = await supabase.functions.invoke('analyser-audio', { body: fd })

      if (error) throw new Error(error.message)
      if (data.error) throw new Error(data.error)

      setEtape('Rapport généré ✓')
      setResultat(data)
    } catch (err) {
      setErreur(err.message || 'Erreur inconnue')
    }
    setLoading(false)
  }

  const telechargerPDF = async () => {
    if (!resultat) return
    await genererPDF(resultat)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, marginBottom: 4 }}>
        🎙️ Analyseur IA
      </h2>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 28 }}>
        Uploade une vidéo ou un audio où tu analyses le joueur à voix haute. L'IA transcrit et génère un rapport PDF.
      </p>

      {/* Formulaire */}
      {!resultat && (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 16, padding: isMobile ? 16 : 24 }}>

          {/* Upload fichier */}
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${fichier ? '#4ade80' : '#2a2a2a'}`,
              borderRadius: 12,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 20,
              transition: 'border-color 0.2s',
              background: fichier ? '#4ade8008' : 'transparent',
            }}>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm,video/quicktime,.m4a,.mp3,.wav,.mp4,.mov"
              style={{ display: 'none' }}
              onChange={e => choisirFichier(e.target.files[0])}
            />
            {fichier ? (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 15, color: '#4ade80', fontWeight: 700 }}>✓ {fichier.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{(fichier.size / 1024 / 1024).toFixed(1)} Mo · Cliquer pour changer</p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 32 }}>🎬</p>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: '#ccc', fontWeight: 600 }}>Glisser un fichier ou cliquer</p>
                <p style={{ margin: 0, fontSize: 12, color: '#444' }}>
                  mp4, mov, mp3, m4a, wav · max 25 Mo (vidéo → audio extrait automatiquement)
                </p>
              </>
            )}
          </div>

          {/* Nom joueur */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Nom du joueur</label>
            <input
              value={nomJoueur}
              onChange={e => setNomJoueur(e.target.value)}
              placeholder="Ex : Rayan Attia"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Type d'analyse */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Type d'analyse</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setTypeAnalyse(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: typeAnalyse === t ? '#4ade80' : '#1a1a1a',
                    color: typeAnalyse === t ? '#000' : '#555',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton analyser */}
          <button
            onClick={analyser}
            disabled={!fichier || loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: fichier && !loading ? '#4ade80' : '#1a1a1a',
              color: fichier && !loading ? '#000' : '#555',
              fontWeight: 700, fontSize: 14, cursor: fichier && !loading ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
            }}>
            {loading ? etape || 'Analyse en cours…' : '🚀 Analyser et générer le rapport'}
          </button>

          {erreur && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
              ❌ {erreur}
            </p>
          )}
        </div>
      )}

      {/* Résultat */}
      {resultat && (
        <div>
          {/* Header résultat */}
          <div style={{ background: '#4ade8015', border: '1px solid #4ade8030', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#4ade80' }}>✓ Rapport généré</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#888' }}>{resultat.nomJoueur} · {resultat.typeAnalyse} · {resultat.date}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={telechargerPDF}
                style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                📄 Télécharger PDF
              </button>
              <button onClick={() => { setResultat(null); setFichier(null); setNomJoueur(''); setEtape('') }}
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Nouvelle analyse
              </button>
            </div>
          </div>

          {/* Note */}
          {resultat.rapport.note_globale && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#888' }}>Note globale</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{resultat.rapport.note_globale}<span style={{ fontSize: 13, color: '#555' }}>/10</span></span>
            </div>
          )}

          {/* Résumé */}
          {resultat.rapport.resume && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Résumé</p>
              <p style={{ margin: 0, fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{resultat.rapport.resume}</p>
            </div>
          )}

          {/* Points forts */}
          {resultat.rapport.points_forts?.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #4ade8030', borderLeft: '3px solid #4ade80', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>✓ Points forts</p>
              {resultat.rapport.points_forts.map((pt, i) => (
                <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#ccc' }}>• {pt}</p>
              ))}
            </div>
          )}

          {/* Axes */}
          {resultat.rapport.axes_amelioration?.length > 0 && (
            <div style={{ background: '#111', border: '1px solid #ef444430', borderLeft: '3px solid #ef4444', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>↗ Axes d'amélioration</p>
              {resultat.rapport.axes_amelioration.map((ax, i) => (
                <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: '#ccc' }}>• {ax}</p>
              ))}
            </div>
          )}

          {/* Conseils */}
          {resultat.rapport.conseils && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Conseils coach</p>
              <p style={{ margin: 0, fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>{resultat.rapport.conseils}</p>
            </div>
          )}

          {/* Transcription (dépliable) */}
          <details style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
            <summary style={{ fontSize: 12, color: '#555', cursor: 'pointer', fontWeight: 600 }}>Voir la transcription complète</summary>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{resultat.transcription}</p>
          </details>
        </div>
      )}
    </div>
  )
}
