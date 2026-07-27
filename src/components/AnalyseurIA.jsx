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

  const pageW = 210
  const margin = 18
  const contentW = pageW - margin * 2

  // Couleurs
  const NOIR   = [10, 10, 10]
  const VERT   = [74, 222, 128]
  const BLANC  = [255, 255, 255]
  const GRIS   = [120, 120, 120]
  const GRIS_F = [240, 240, 240]
  const ROUGE  = [239, 100, 100]
  const TEXTE  = [40, 40, 40]

  const mention = (n) => {
    if (!n) return '—'
    if (n >= 9) return 'EXCELLENT'
    if (n >= 7) return 'TRÈS BIEN'
    if (n >= 5) return 'SATISFAISANT'
    if (n >= 3) return 'À AMÉLIORER'
    return 'INSUFFISANT'
  }

  const MOIS = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN',
                'JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE']
  const [j, m, a] = (data.date || '').split('/')
  const dateLong = j && m && a ? `${j} ${MOIS[parseInt(m)-1]} ${a}` : data.date || ''

  const drawHeader = (rightLabel) => {
    doc.setFillColor(...NOIR)
    doc.rect(0, 0, pageW, 24, 'F')
    // Logo gauche
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...VERT)
    doc.text('DIGITAL', margin, 10)
    doc.setTextColor(...BLANC)
    doc.text('FOOTBALL', margin, 17)
    // Label droit
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(130, 130, 130)
    doc.text('RAPPORT D\'ANALYSE', pageW - margin, 10, { align: 'right' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLANC)
    doc.text(rightLabel, pageW - margin, 17, { align: 'right' })
  }

  const drawFooter = (page, total) => {
    doc.setFillColor(...NOIR)
    doc.rect(0, 284, pageW, 13, 'F')
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('DIGITAL FOOTBALL • RAPPORT D\'ANALYSE CONFIDENTIEL', margin, 292)
    doc.text(`0${page} / 0${total}`, pageW - margin, 292, { align: 'right' })
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════
  drawHeader('BILAN DE MATCH')

  let y = 34

  // ── Bande stats ──────────────────────────────────────────────
  const stats = [
    { label: 'TYPE',    val: 'BILAN DE MATCH' },
    { label: 'NOTE',    val: `${data.rapport?.note_globale ?? '—'}/10` },
    { label: 'DATE',    val: dateLong },
    { label: 'MENTION', val: mention(data.rapport?.note_globale) },
  ]
  const sw = contentW / stats.length
  stats.forEach((s, i) => {
    const x = margin + i * sw
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(s.label, x, y)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NOIR)
    doc.text(s.val, x, y + 6)
  })
  y += 18

  // Ligne
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 10

  // ── Nom du joueur ────────────────────────────────────────────
  const parts = (data.nomJoueur || 'JOUEUR').toUpperCase().split(' ')
  const prenom = parts[0] || ''
  const nomFam = parts.slice(1).join(' ')
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NOIR)
  doc.text(prenom, margin, y)
  y += 12
  if (nomFam) {
    doc.text(nomFam, margin, y)
    y += 12
  }

  // Nom du coach
  if (data.nomCoach) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(`Analysé par ${data.nomCoach}`, margin, y)
    y += 10
  } else {
    y += 4
  }

  // ── SYNTHÈSE ─────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERT)
  doc.text('SYNTHÈSE', margin, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXTE)
  const resumeL = doc.splitTextToSize(data.rapport?.resume || '', contentW)
  doc.text(resumeL, margin, y)
  y += resumeL.length * 4.8 + 8

  // Ligne
  doc.setDrawColor(210, 210, 210)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── POINTS FORTS | AXES (2 colonnes) ─────────────────────────
  const colW = (contentW - 8) / 2
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERT)
  doc.text('POINTS FORTS', margin, y)
  doc.setTextColor(...ROUGE)
  doc.text('AXES DE PROGRESSION', margin + colW + 8, y)
  y += 6

  const pts = data.rapport?.points_forts || []
  const axes = data.rapport?.axes_amelioration || []
  const maxR = Math.max(pts.length, axes.length)
  for (let i = 0; i < maxR; i++) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXTE)
    if (pts[i])  doc.text(`• ${pts[i]}`,  margin,           y)
    if (axes[i]) doc.text(`• ${axes[i]}`, margin + colW + 8, y)
    y += 6
  }

  y += 4
  doc.setDrawColor(210, 210, 210)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── CONSEIL DU COACH ─────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NOIR)
  doc.text('CONSEIL DU COACH', margin, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXTE)
  const consL = doc.splitTextToSize(data.rapport?.conseils || '', contentW)
  doc.text(consL, margin, y)

  drawFooter(1, 2)

  // ════════════════════════════════════════════════════════════
  // PAGE 2
  // ════════════════════════════════════════════════════════════
  doc.addPage()
  drawHeader('ANALYSE DU MATCH')

  y = 34

  // Titre
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NOIR)
  doc.text('ANALYSE DU MATCH', margin, y)
  y += 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.text('Lecture tactique et recommandations prioritaires', margin, y)
  y += 12

  // ── Sections tactiques ───────────────────────────────────────
  const sections = data.rapport?.sections_analyse || []
  sections.forEach((sec, i) => {
    // Cercle numéro
    doc.setFillColor(...NOIR)
    doc.circle(margin + 4.5, y, 4.5, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLANC)
    doc.text(String(i + 1).padStart(2, '0'), margin + 4.5, y + 2, { align: 'center' })

    // Titre section
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NOIR)
    doc.text(sec.titre || '', margin + 13, y + 1.5)
    y += 7

    // Description
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXTE)
    const descL = doc.splitTextToSize(sec.description || '', contentW - 13)
    doc.text(descL, margin + 13, y)
    y += descL.length * 4.8 + 3

    // Repère
    if (sec.repere) {
      doc.setFillColor(...GRIS_F)
      const repL = doc.splitTextToSize(`Repère : ${sec.repere}`, contentW - 20)
      const rh = repL.length * 4.5 + 5
      doc.rect(margin + 13, y - 1, contentW - 13, rh, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...GRIS)
      doc.text(repL, margin + 16, y + 3)
      y += rh + 6
    }

    // Séparateur entre sections
    if (i < sections.length - 1) {
      doc.setDrawColor(220, 220, 220)
      doc.line(margin + 13, y - 2, pageW - margin, y - 2)
      y += 2
    }
  })

  // ── PRIORITÉ D'ENTRAÎNEMENT ──────────────────────────────────
  if (data.rapport?.priorite) {
    y += 6
    const prioL = doc.splitTextToSize(data.rapport.priorite, contentW - 16)
    const ph = prioL.length * 5 + 14
    doc.setFillColor(...NOIR)
    doc.roundedRect(margin, y, contentW, ph, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...VERT)
    doc.text('PRIORITÉ D\'ENTRAÎNEMENT', margin + 8, y + 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLANC)
    doc.text(prioL, margin + 8, y + 14)
  }

  drawFooter(2, 2)

  // ── Téléchargement ───────────────────────────────────────────
  const nom = `rapport_${(data.nomJoueur || 'joueur').replace(/\s+/g, '_').toLowerCase()}_${(data.date || '').replace(/\//g, '-')}.pdf`
  doc.save(nom)
}

const TAILLE_MAX = 25 * 1024 * 1024 // limite Groq Whisper

// ── Composant principal ──────────────────────────────────────────────────
export default function AnalyseurIA() {
  const [fichier, setFichier] = useState(null)
  const [nomJoueur, setNomJoueur] = useState('')
  const [nomCoach, setNomCoach] = useState('')
  const [source, setSource] = useState('upload') // 'upload' | 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [etape, setEtape] = useState('')  // message d'état
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')
  const inputRef = useRef(null)

  const isMobile = window.innerWidth < 768

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
    if (source === 'upload' && !fichier) return
    if (source === 'youtube' && !youtubeUrl.trim()) return
    setLoading(true)
    setErreur('')
    setResultat(null)

    try {
      const fd = new FormData()
      fd.append('nomJoueur', nomJoueur || 'Joueur')

      if (source === 'youtube') {
        fd.append('youtubeUrl', youtubeUrl.trim())
        setEtape('Récupération de la transcription YouTube…')
      } else {
        // ── Extraction audio si c'est une vidéo ────────────────────────
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

        fd.append('fichier', fichierAudio)
        setEtape('Transcription en cours… (peut prendre 20–60s)')
      }

      const { data, error } = await supabase.functions.invoke('analyser-audio', { body: fd })

      if (error) throw new Error(error.message)
      if (data.error) throw new Error(data.error)

      setEtape('Rapport généré ✓')
      setResultat({ ...data, nomCoach: nomCoach || '' })
    } catch (err) {
      setErreur(err.message || 'Erreur inconnue')
    }
    setLoading(false)
  }

  const telechargerPDF = async () => {
    if (!resultat) return
    await genererPDF(resultat)
  }

  const peutAnalyser = source === 'upload' ? !!fichier : !!youtubeUrl.trim()

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

          {/* Toggle Upload / YouTube */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'upload', label: '📁 Upload fichier' },
              { id: 'youtube', label: '▶️ Lien YouTube' },
            ].map(s => (
              <button key={s.id} onClick={() => setSource(s.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: source === s.id ? '#4ade80' : '#1a1a1a',
                  color: source === s.id ? '#000' : '#555',
                  transition: 'all 0.15s',
                }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Zone conditionnelle */}
          {source === 'upload' ? (
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
          ) : (
            <div style={{ marginBottom: 20 }}>
              <input
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%', background: '#0a0a0a', border: `1px solid ${youtubeUrl ? '#4ade8060' : '#2a2a2a'}`,
                  borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13,
                  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
                }} />
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#444' }}>
                ⚠️ La vidéo doit avoir des sous-titres automatiques activés sur YouTube.
                Si elle vient d'être uploadée, attendre quelques minutes.
              </p>
            </div>
          )}

          {/* Nom joueur */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Nom du joueur</label>
            <input
              value={nomJoueur}
              onChange={e => setNomJoueur(e.target.value)}
              placeholder="Ex : Rayan Attia"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Nom coach */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Nom du coach
            </label>
            <input
              value={nomCoach}
              onChange={e => setNomCoach(e.target.value)}
              placeholder="Ex : Kevin Amorim"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Bouton analyser */}
          <button
            onClick={analyser}
            disabled={loading || !peutAnalyser}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: peutAnalyser && !loading ? '#4ade80' : '#1a1a1a',
              color: peutAnalyser && !loading ? '#000' : '#555',
              fontWeight: 700, fontSize: 14, cursor: peutAnalyser && !loading ? 'pointer' : 'default',
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
              <button onClick={() => { setResultat(null); setFichier(null); setYoutubeUrl(''); setNomJoueur(''); setNomCoach(''); setEtape('') }}
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
