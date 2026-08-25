import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../lib/translations'
import { enqueueGroqRequest, libelleStatutGroq } from '../lib/groqQueue'
import { makeUseSt } from '../lib/theme'

const playerInfoVide = () => ({
  prenom: '',
  nom: '',
  poste: '',
  numero: '',
  date: new Date().toISOString().split('T')[0],
  nomClub: '',
  typeMatch: 'aller',
  periodeMatch: 'complet',
})

const stSombre = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  btnSolid: (color = '#4ade80', textColor = '#000') => ({ background: color, color: textColor, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  border: '#2a2a2a', borderStrong: '#444', text: '#fff', textFaint: '#555', textDim: '#9ca3af',
  bg: '#0a0a0a', bgRaised: '#1a1a1a',
}
const stClaire = {
  input: { width: '100%', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  btnSolid: (color = '#4ade80', textColor = '#000') => ({ background: color, color: textColor, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  border: '#cbd5e1', borderStrong: '#94a3b8', text: '#0f172a', textFaint: '#64748b', textDim: '#334155',
  bg: '#f8fafc', bgRaised: '#f1f5f9',
}
const useSt = makeUseSt(stSombre, stClaire)

// ── Génération du PDF ──────────────────────────────────────────────────────
// Prend playerInfo + rapport en paramètres (état courant ou contenu jsonb d'un
// rapport déjà sauvegardé) pour servir aussi bien à la génération initiale
// qu'au re-téléchargement d'un rapport de la liste.
async function genererPDF(playerInfo, rapport, lang = 'fr') {
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
  const periodeLabel = { complet: t('analyse_match_complet', lang), premiere: t('analyse_premiere_mi', lang), deuxieme: t('analyse_deuxieme_mi', lang) }[playerInfo.periodeMatch] || ''
  const typeLabel = playerInfo.typeMatch === 'retour' ? t('analyse_match_retour', lang) : t('analyse_match_aller', lang)
  addLine(`Date : ${playerInfo.date}  |  ${typeLabel}  |  ${periodeLabel}`)
  if (playerInfo.nomClub) addLine(`${t('analyse_club_adverse', lang)} : ${playerInfo.nomClub}`)
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

export default function AnalyseVideo({ userId, lang = 'fr' }) {
  const st = useSt()
  const [playerInfo, setPlayerInfo] = useState(playerInfoVide)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [rapport, setRapport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(null)
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
      if (event.error === 'service-not-allowed' || event.error === 'not-allowed') {
        recognitionRef.current._shouldContinue = false
        setIsRecording(false)
        setErreurIA("Accès au microphone refusé. Sur Mac : Réglages Système → Confidentialité → Microphone → autorise Safari/Chrome.")
      } else if (event.error !== 'no-speech') {
        setIsRecording(false)
      }
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

  const startRecording = async () => {
    if (!recognitionRef.current) return
    setErreurIA(null)

    // Demander la permission micro explicitement (corrige "service-not-allowed" sur desktop)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop()) // Permission accordée, on libère le stream
    } catch (permErr) {
      console.error('Permission micro refusée:', permErr)
      setErreurIA("Accès au microphone refusé. Vérifie les paramètres de confidentialité de ton navigateur.")
      return
    }

    recognitionRef.current._shouldContinue = true
    try {
      recognitionRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Erreur démarrage micro:', err)
      setErreurIA("Impossible de démarrer l'enregistrement : " + err.message)
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
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')

      const periodeLabel = { complet: 'Match complet', premiere: '1ère mi-temps', deuxieme: '2ème mi-temps' }[playerInfo.periodeMatch] || 'Match complet'
      const typeLabel = playerInfo.typeMatch === 'retour' ? 'Match retour' : 'Match aller'

      const prompt = `Tu es un analyste football expert. Voici la transcription d'une analyse vocale d'un éducateur/coach sur un joueur.

Joueur: ${playerInfo.prenom} ${playerInfo.nom}, Poste: ${playerInfo.poste}, Numéro: ${playerInfo.numero}
Club adverse: ${playerInfo.nomClub || 'non précisé'}
Type: ${typeLabel} — ${periodeLabel}

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

      const data = await enqueueGroqRequest('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          reasoning_effort: 'low',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      }, setLoadingStatus)
      if (data.error) throw new Error(data.error.message)
      const text = data.choices?.[0]?.message?.content
      if (!text) throw new Error('Réponse Groq vide')
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      setRapport(JSON.parse(clean))
      setStep('rapport')
    } catch (err) {
      console.error('Erreur génération rapport:', err)
      setErreurIA(err.message)
    } finally {
      setLoading(false)
      setLoadingStatus(null)
    }
  }

  const sauvegarderRapport = async () => {
    // Pas d'alerte de succès avant confirmation : un "Rapport sauvegardé !"
    // suivi juste après d'une alerte d'erreur contradictoire serait plus
    // trompeur qu'utile pour une action ponctuelle comme celle-ci.
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
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('analyse_titre', lang)}</h1>
        <div style={{ ...st.card, maxWidth: '500px', textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#ef4444', margin: '0 0 8px' }}>La dictée vocale n'est pas supportée sur ce navigateur.</p>
          <p style={{ color: st.textFaint, fontSize: '13px', margin: 0 }}>Utilise Chrome (desktop ou Android), Edge, ou Safari sur iOS.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{t('analyse_titre', lang)}</h1>
      <p style={{ color: st.textFaint, fontSize: '13px', marginBottom: '1.5rem' }}>
        {t('av_sous_titre', lang)}
      </p>

      {tableMissing && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          La table <code>rapports_analyse</code> n'existe pas encore en base — la sauvegarde des rapports est indisponible tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ ...st.card, maxWidth: '700px', marginBottom: '2rem' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>{t('av_infos_joueur', lang)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <input style={st.input} placeholder={t('equipe_prenom', lang)} value={playerInfo.prenom} onChange={e => setPlayerInfo(p => ({ ...p, prenom: e.target.value }))} />
          <input style={st.input} placeholder={t('equipe_nom', lang)} value={playerInfo.nom} onChange={e => setPlayerInfo(p => ({ ...p, nom: e.target.value }))} />
          <input style={st.input} placeholder={t('av_poste', lang)} value={playerInfo.poste} onChange={e => setPlayerInfo(p => ({ ...p, poste: e.target.value }))} />
          <input style={st.input} placeholder={t('equipe_numero', lang)} value={playerInfo.numero} onChange={e => setPlayerInfo(p => ({ ...p, numero: e.target.value }))} />
        </div>
        <input style={{ ...st.input, maxWidth: '200px' }} type="date" value={playerInfo.date} onChange={e => setPlayerInfo(p => ({ ...p, date: e.target.value }))} />

        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input style={st.input} placeholder={t('av_club_adverse', lang)} value={playerInfo.nomClub} onChange={e => setPlayerInfo(p => ({ ...p, nomClub: e.target.value }))} />
          <select style={st.input} value={playerInfo.typeMatch} onChange={e => setPlayerInfo(p => ({ ...p, typeMatch: e.target.value }))}>
            <option value="aller">{t('analyse_match_aller', lang)}</option>
            <option value="retour">{t('analyse_match_retour', lang)}</option>
          </select>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={st.label}>{t('av_periode_label', lang)}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['complet', t('analyse_match_complet', lang)], ['premiere', t('analyse_premiere_mi', lang)], ['deuxieme', t('analyse_deuxieme_mi', lang)]].map(([val, label]) => (
              <button key={val} onClick={() => setPlayerInfo(p => ({ ...p, periodeMatch: val }))}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: `1px solid ${playerInfo.periodeMatch === val ? '#4ade80' : st.border}`, background: playerInfo.periodeMatch === val ? '#4ade8015' : st.bgRaised, color: playerInfo.periodeMatch === val ? '#4ade80' : st.textFaint, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {(step === 'input' || step === 'transcript') && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${st.bgRaised}` }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>{t('analyse_enregistrer', lang)}</p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {!isRecording ? (
                <button onClick={startRecording}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#22c55e', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px #22c55e40' }}>
                  <span style={{ fontSize: '11px' }}>{t('analyse_demarrer', lang)}</span>
                </button>
              ) : (
                <button onClick={stopRecording}
                  style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px #ef444440' }}>
                  <span style={{ fontSize: '11px' }}>{t('analyse_arreter', lang)}</span>
                </button>
              )}
            </div>

            {isRecording && (
              <p style={{ textAlign: 'center', color: '#4ade80', fontSize: '13px', marginTop: '12px' }}>
                Enregistrement en cours… parle dans ton micro
              </p>
            )}

            {(transcript || interimText) && (
              <div style={{ background: st.bg, border: `1px solid ${st.bgRaised}`, borderRadius: '10px', padding: '12px', marginTop: '16px' }}>
                <p style={{ fontSize: '11px', color: st.textFaint, margin: '0 0 8px' }}>Transcription :</p>
                <p style={{ color: st.textDim, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                  {transcript}<span style={{ color: st.textFaint, fontStyle: 'italic' }}>{interimText}</span>
                </p>
              </div>
            )}

            {erreurIA && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{erreurIA}</p>}

            {transcript.trim() && !isRecording && (
              <button onClick={handleGenerateRapport} disabled={loading}
                style={{ ...st.btnSolid('#60a5fa', '#fff'), width: '100%', marginTop: '16px', opacity: loading ? 0.6 : 1 }}>
                {loading ? `${libelleStatutGroq(loadingStatus)}` : `${t('analyse_generer', lang)}`}
              </button>
            )}
          </div>
        )}

        {step === 'rapport' && rapport && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${st.bgRaised}` }}>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>Rapport généré</p>

            {rapport.note != null && (
              <div style={{ background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '10px', padding: '12px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#4ade80', fontSize: '24px', fontWeight: 800, margin: 0 }}>{rapport.note} / 10</p>
                <p style={{ color: st.textFaint, fontSize: '11px', margin: '2px 0 0' }}>Note globale</p>
              </div>
            )}

            {rapport.synthese && (
              <div style={{ marginBottom: '16px' }}>
                <p style={st.label}>Synthèse</p>
                <p style={{ color: st.textDim, fontSize: '13px', margin: 0 }}>{rapport.synthese}</p>
              </div>
            )}

            {rapport.sequences?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={st.label}>Séquences analysées</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rapport.sequences.map((s, i) => (
                    <div key={i} style={{ background: st.bgRaised, borderRadius: '8px', padding: '8px 10px' }}>
                      <span style={{ color: '#4ade80', fontSize: '12px', fontFamily: 'monospace' }}>[{s.minute}]</span>
                      <span style={{ color: st.textDim, fontSize: '13px', marginLeft: '8px' }}>{s.description}</span>
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
              <button onClick={() => genererPDF(playerInfo, rapport, lang)} style={{ ...st.btnSolid('#22c55e'), flex: 1 }}>{t('analyse_exporter_pdf', lang)}</button>
              <button onClick={sauvegarderRapport} disabled={savingRapport || tableMissing} style={{ ...st.btn('#60a5fa'), opacity: tableMissing ? 0.4 : 1 }}>
                {savingRapport ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
            <button onClick={reset} style={{ ...st.btn(st.textFaint), width: '100%', marginTop: '10px' }}>Nouvelle analyse</button>
          </div>
        )}
      </div>

      <div>
        <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>{t('analyse_mes_rapports', lang)} {rapports.length > 0 ? `(${rapports.length})` : ''}</p>
        {loadingRapports ? (
          <p style={{ color: st.borderStrong, fontSize: '13px' }}>{t('btn_chargement', lang)}</p>
        ) : rapports.length === 0 ? (
          <p style={{ color: st.borderStrong, fontSize: '13px' }}>{t('analyse_aucun_rapport', lang)}.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rapports.map(r => (
              <div key={r.id} style={{ ...st.card, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{r.prenom_joueur || 'Sans nom'} {r.poste ? `— ${r.poste}` : ''}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: st.textFaint }}>
                    {r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : ''} · Vocale
                  </p>
                </div>
                <button onClick={() => genererPDF(r.contenu?.playerInfo || {}, r.contenu?.rapport || {}, lang)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Re-télécharger PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
