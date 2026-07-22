import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

const playerInfoVide = () => ({
  prenom: '',
  nom: '',
  poste: '',
  numero: '',
  date: new Date().toISOString().split('T')[0],
})

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  btnSolid: (color = '#4ade80', textColor = '#000') => ({ background: color, color: textColor, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
}

// ── Génération du PDF ──────────────────────────────────────────────────────
// Prend playerInfo + rapport en paramètres (état courant ou contenu jsonb d'un
// rapport déjà sauvegardé) pour servir aussi bien à la génération initiale
// qu'au re-téléchargement d'un rapport de la liste.
async function genererPDF(playerInfo, rapport) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 20

  const addLine = (text, size = 12, bold = false, color = [0, 0, 0]) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text), 170)
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, 20, y)
      y += size * 0.52
    })
    y += 2
  }

  doc.setFillColor(20, 83, 45)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text("RAPPORT D'ANALYSE", 20, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Digital Football Academy', 20, 22)
  y = 40

  addLine('INFORMATIONS JOUEUR', 13, true, [20, 83, 45])
  addLine(`${playerInfo.prenom} ${playerInfo.nom}  |  ${playerInfo.poste}  |  N°${playerInfo.numero}`)
  addLine(`Date : ${playerInfo.date}`)
  y += 5

  if (rapport.note) {
    addLine(`NOTE GLOBALE : ${rapport.note} / 10`, 14, true, [20, 83, 45])
    y += 3
  }

  addLine('SYNTHÈSE', 13, true, [20, 83, 45])
  addLine(rapport.synthese || '')
  y += 5

  if (rapport.sequences?.length) {
    addLine('SÉQUENCES ANALYSÉES', 13, true, [20, 83, 45])
    rapport.sequences.forEach(s => addLine(`• [${s.minute}]  ${s.description}`))
    y += 5
  }

  if (rapport.pointsPositifs?.length) {
    addLine('POINTS POSITIFS', 13, true, [20, 83, 45])
    rapport.pointsPositifs.forEach(p => addLine(`✓  ${p}`))
    y += 5
  }

  if (rapport.pointsAmeliorer?.length) {
    addLine("AXES D'AMÉLIORATION", 13, true, [20, 83, 45])
    rapport.pointsAmeliorer.forEach(p => addLine(`→  ${p}`))
  }

  doc.save(`analyse_${playerInfo.nom || 'joueur'}_${playerInfo.date}.pdf`)
}

export default function AnalyseVideo({ userId }) {
  const [playerInfo, setPlayerInfo] = useState(playerInfoVide)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('input') // 'input' | 'transcript' | 'rapport'
  const [supported, setSupported] = useState(true)
  const [erreurIA, setErreurIA] = useState(null)
  const [savingRapport, setSavingRapport] = useState(false)
  const [rapports, setRapports] = useState([])
  const [loadingRapports, setLoadingRapports] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const recognitionRef = useRef(null)

  const chargerRapports = async () => {
    setLoadingRapports(true)
    const { data, error } = await supabase.from('rapports_analyse').select('*').eq('educateur_id', userId).order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      setLoadingRapports(false)
      return
    }
    setTableMissing(false)
    setRapports(data || [])
    setLoadingRapports(false)
  }

  useEffect(() => { if (userId) chargerRapports() }, [userId])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      if (final) setTranscript(prev => prev + final)
      setInterimText(interim)
    }

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error)
      if (event.error !== 'no-speech') setIsRecording(false)
    }

    // Le navigateur coupe la reconnaissance après un silence même en mode
    // continuous — on la relance tant que l'utilisateur n'a pas cliqué "Arrêter".
    recognition.onend = () => {
      if (recognitionRef.current?._shouldContinue) {
        recognition.start()
      } else {
        setIsRecording(false)
        setInterimText('')
      }
    }

    recognitionRef.current = recognition
  }, [])

  const startRecording = () => {
    if (!recognitionRef.current) return
    recognitionRef.current._shouldContinue = true
    try {
      recognitionRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Erreur démarrage micro:', err)
    }
  }

  const stopRecording = () => {
    if (!recognitionRef.current) return
    recognitionRef.current._shouldContinue = false
    recognitionRef.current.stop()
    setIsRecording(false)
    setInterimText('')
    if (transcript.trim()) setStep('transcript')
  }

  const handleGenerateRapport = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setErreurIA(null)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GEMINI_API_KEY manquante dans .env')
      const prompt = `Tu es un analyste football expert. Voici la transcription d'une analyse vocale d'un éducateur/coach sur un joueur.

Joueur: ${playerInfo.prenom} ${playerInfo.nom}, Poste: ${playerInfo.poste}, Numéro: ${playerInfo.numero}

Transcription de l'analyse:
${transcript}

Génère un rapport d'analyse football structuré en JSON avec ce format EXACT (sans markdown, juste le JSON):
{
  "sequences": [
    { "minute": "XX:XX", "description": "description de l'action ou séquence mentionnée" }
  ],
  "pointsPositifs": ["point 1", "point 2", "point 3"],
  "pointsAmeliorer": ["point 1", "point 2", "point 3"],
  "synthese": "résumé global de la performance du joueur",
  "note": 7.5
}

Instructions:
- Si des minutes/timestamps sont mentionnés dans la transcription, utilise-les pour les séquences
- Extrais les points positifs et axes d'amélioration de ce qui est dit
- La note est sur 10
- Réponds UNIQUEMENT avec le JSON brut, sans backticks ni explication`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Réponse Gemini vide')
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      setRapport(JSON.parse(clean))
      setStep('rapport')
    } catch (err) {
      console.error('Erreur génération rapport:', err)
      setErreurIA(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sauvegarderRapport = async () => {
    setSavingRapport(true)
    const { error } = await supabase.from('rapports_analyse').insert({
      educateur_id: userId,
      prenom_joueur: `${playerInfo.prenom} ${playerInfo.nom}`.trim(),
      poste: playerInfo.poste,
      url_video: null,
      contenu: { playerInfo, transcript, rapport },
      mode_analyse: 'vocale',
      date_analyse: playerInfo.date,
    })
    setSavingRapport(false)
    if (error) {
      if (error.code === '42P01') { setTableMissing(true); return }
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    alert('Rapport sauvegardé !')
    await chargerRapports()
  }

  const reset = () => {
    setTranscript('')
    setInterimText('')
    setRapport(null)
    setStep('input')
    setIsRecording(false)
    setErreurIA(null)
  }

  if (!supported) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎬 Analyse vidéo</h1>
        <div style={{ ...st.card, maxWidth: '500px', textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#ef4444', margin: '0 0 8px' }}>⚠️ La dictée vocale n'est pas supportée sur ce navigateur.</p>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Utilise Chrome (desktop ou Android), Edge, ou Safari sur iOS.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎙️ Analyse par dictée vocale</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>
        Lance la vidéo sur ton écran, appuie sur Enregistrer et décris l'analyse à voix haute. L'IA structure ensuite ton commentaire en rapport PDF.
      </p>

      {tableMissing && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>rapports_analyse</code> n'existe pas encore en base — la sauvegarde des rapports est indisponible tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ ...st.card, maxWidth: '700px', marginBottom: '2rem' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Informations du joueur</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input style={st.input} placeholder="Prénom" value={playerInfo.prenom} onChange={e => setPlayerInfo(p => ({ ...p, prenom: e.target.value }))} />
          <input style={st.input} placeholder="Nom" value={playerInfo.nom} onChange={e => setPlayerInfo(p => ({ ...p, nom: e.target.value }))} />
          <input style={st.input} placeholder="Poste (ex: Milieu)" value={playerInfo.poste} onChange={e => setPlayerInfo(p => ({ ...p, poste: e.target.value }))} />
          <input style={st.input} placeholder="N° maillot" value={playerInfo.numero} onChange={e => setPlayerInfo(p => ({ ...p, numero: e.target.value }))} />
        </div>
        <input style={{ ...st.input, maxWidth: '200px' }} type="date" value={playerInfo.date} onChange={e => setPlayerInfo(p => ({ ...p, date: e.target.value }))} />

        {(step === 'input' || step === 'transcript') && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>Enregistrement vocal</p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {!isRecording ? (
                <button onClick={startRecording}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#22c55e', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px #22c55e40' }}>
                  <span style={{ fontSize: '30px' }}>🎙️</span>
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>Démarrer</span>
                </button>
              ) : (
                <button onClick={stopRecording}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px #ef444440' }}>
                  <span style={{ fontSize: '30px' }}>⏹️</span>
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>Arrêter</span>
                </button>
              )}
            </div>

            {isRecording && (
              <p style={{ textAlign: 'center', color: '#4ade80', fontSize: '13px', marginTop: '12px' }}>
                🔴 Enregistrement en cours… parle dans ton micro
              </p>
            )}

            {(transcript || interimText) && (
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px', marginTop: '16px' }}>
                <p style={{ fontSize: '11px', color: '#555', margin: '0 0 8px' }}>Transcription :</p>
                <p style={{ color: '#ccc', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                  {transcript}<span style={{ color: '#666', fontStyle: 'italic' }}>{interimText}</span>
                </p>
              </div>
            )}

            {erreurIA && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>❌ {erreurIA}</p>}

            {transcript.trim() && !isRecording && (
              <button onClick={handleGenerateRapport} disabled={loading}
                style={{ ...st.btnSolid('#60a5fa', '#fff'), width: '100%', marginTop: '16px', opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Génération en cours...' : "✨ Générer le rapport avec l'IA"}
              </button>
            )}
          </div>
        )}

        {step === 'rapport' && rapport && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>📋 Rapport généré</p>

            {rapport.note != null && (
              <div style={{ background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '10px', padding: '12px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#4ade80', fontSize: '24px', fontWeight: 800, margin: 0 }}>{rapport.note} / 10</p>
                <p style={{ color: '#666', fontSize: '11px', margin: '2px 0 0' }}>Note globale</p>
              </div>
            )}

            {rapport.synthese && (
              <div style={{ marginBottom: '16px' }}>
                <p style={st.label}>Synthèse</p>
                <p style={{ color: '#ccc', fontSize: '13px', margin: 0 }}>{rapport.synthese}</p>
              </div>
            )}

            {rapport.sequences?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={st.label}>Séquences analysées</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rapport.sequences.map((s, i) => (
                    <div key={i} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '8px 10px' }}>
                      <span style={{ color: '#4ade80', fontSize: '12px', fontFamily: 'monospace' }}>[{s.minute}]</span>
                      <span style={{ color: '#ccc', fontSize: '13px', marginLeft: '8px' }}>{s.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rapport.pointsPositifs?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={st.label}>Points positifs</p>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {rapport.pointsPositifs.map((p, i) => <li key={i} style={{ color: '#4ade80', fontSize: '13px' }}>{p}</li>)}
                </ul>
              </div>
            )}

            {rapport.pointsAmeliorer?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={st.label}>Axes d'amélioration</p>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {rapport.pointsAmeliorer.map((p, i) => <li key={i} style={{ color: '#f59e0b', fontSize: '13px' }}>{p}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => genererPDF(playerInfo, rapport)} style={{ ...st.btnSolid('#22c55e'), flex: 1 }}>📄 Exporter PDF</button>
              <button onClick={sauvegarderRapport} disabled={savingRapport || tableMissing} style={{ ...st.btn('#60a5fa'), opacity: tableMissing ? 0.4 : 1 }}>
                {savingRapport ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
            <button onClick={reset} style={{ ...st.btn('#666'), width: '100%', marginTop: '10px' }}>Nouvelle analyse</button>
          </div>
        )}
      </div>

      <div>
        <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>📚 Mes rapports {rapports.length > 0 ? `(${rapports.length})` : ''}</p>
        {loadingRapports ? (
          <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
        ) : rapports.length === 0 ? (
          <p style={{ color: '#444', fontSize: '13px' }}>Aucun rapport sauvegardé pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rapports.map(r => (
              <div key={r.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{r.prenom_joueur || 'Sans nom'} {r.poste ? `— ${r.poste}` : ''}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                    {r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : ''} · 🎙️ Vocale
                  </p>
                </div>
                <button onClick={() => genererPDF(r.contenu?.playerInfo || {}, r.contenu?.rapport || {})} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ⬇️ Re-télécharger PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
