import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../lib/translations'
import { enqueueIARequest, libelleStatutGroq } from '../lib/groqQueue'
import { makeUseSt, useColors } from '../lib/theme'
import { useIsMobileOrTablet } from '../hooks/useIsMobileOrTablet'
import Avatar from './Avatar'
import { genererPDFMatch } from './RapportMatch'

// Icônes de la page (module, pas dans le rendu).
const IcoMicro = ({ taille = 30 }) => <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0" /><line x1="12" y1="17" x2="12" y2="22" /></svg>
const IcoStop = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
const IcoPdf = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>

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

export default function AnalyseVideo({ userId, equipeActiveId, equipeUnique = true, clubNom, lang = 'fr', joueurs = [] }) {
  const st = useSt()
  const colors = useColors()
  const isMobile = useIsMobileOrTablet()
  const [secondes, setSecondes] = useState(0) // chronomètre de l'enregistrement en cours
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

  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setSecondes(x => x + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  const chargerRapports = async () => {
    setLoadingRapports(true)
    // Filtre appliqué côté client (pas en requête) : reste robuste même si
    // club_categorie_id n'existe pas encore en base (migration pas encore
    // lancée) — .eq() sur une colonne absente ferait échouer toute la
    // requête au lieu de simplement ignorer le filtre.
    const { data, error } = await supabase.from('rapports_analyse').select('*').eq('educateur_id', userId).order('created_at', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      setLoadingRapports(false)
      return
    }
    setTableMissing(false)
    const filtres = equipeActiveId
      ? (data || []).filter(r => r.club_categorie_id === equipeActiveId || (r.club_categorie_id == null && equipeUnique))
      : (data || [])
    setRapports(filtres)
    setLoadingRapports(false)
  }

  useEffect(() => { if (userId) chargerRapports() }, [userId, equipeActiveId])

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
      setSecondes(0)
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
      // Prompt construit côté serveur (api/_promptsIA.js) : seule la donnée
      // métier part du navigateur, la clé Groq reste sur le serveur.
      const data = await enqueueIARequest('analyse_video', {
        joueur: { prenom: playerInfo.prenom, nom: playerInfo.nom, poste: playerInfo.poste, numero: playerInfo.numero, nomClub: playerInfo.nomClub, periodeMatch: playerInfo.periodeMatch, typeMatch: playerInfo.typeMatch },
        transcription: transcript,
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
      club_categorie_id: equipeActiveId || null,
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
    setSecondes(0)
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

  // ─── Rendu (V3) : studio d'analyse en 3 étapes + « Mes rapports » à côté.
  // Logique inchangée (dictée, génération IA, sauvegarde, PDF).
  const etape = step === 'rapport' ? 3 : (isRecording || transcript.trim()) ? 2 : 1
  const chrono = `${String(Math.floor(secondes / 60)).padStart(2, '0')}:${String(secondes % 60).padStart(2, '0')}`
  const nbMots = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const titreSection = (num, texte, actif) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 14px' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, background: actif ? colors.accent.green : colors.background.raised, color: actif ? colors.black : colors.text.faint, border: `1px solid ${actif ? colors.accent.green : colors.border.default}` }}>{num}</span>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: actif ? colors.text.primary : colors.text.secondary }}>{texte}</p>
    </div>
  )
  const segmente = (options, valeur, onChange) => (
    <div style={{ display: 'flex', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '3px', gap: '3px' }}>
      {options.map(([val, label]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          style={{ flex: 1, padding: '8px 6px', borderRadius: '6px', border: 'none', background: valeur === val ? colors.accent.green + '22' : 'transparent', color: valeur === val ? colors.accent.green : colors.text.faint, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
          {label}
        </button>
      ))}
    </div>
  )
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: isMobile ? '16px' : '20px' }
  const libelleEtapes = ['Joueur & match', 'Enregistrement', 'Rapport']

  const colonneStudio = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      {/* Fil des étapes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {libelleEtapes.map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: etape === i + 1 ? colors.accent.green : etape > i + 1 ? colors.text.secondary : colors.text.faint }}>{i + 1}. {l}</span>
            {i < 2 && <span style={{ width: '24px', height: '1px', background: colors.border.strong }} />}
          </div>
        ))}
      </div>

      {/* Étape 1 — joueur & match */}
      <div style={carte}>
        {titreSection(1, t('av_infos_joueur', lang), etape === 1)}
        {joueurs.length > 0 && (
          <select style={{ ...st.input, marginBottom: '10px' }} value=""
            onChange={e => { const j = joueurs.find(x => x.id === e.target.value); if (j) setPlayerInfo(p => ({ ...p, prenom: j.prenom || '', nom: j.nom || '', poste: j.poste || '', numero: j.numero_maillot != null ? String(j.numero_maillot) : '' })) }}>
            <option value="">Choisir un joueur de l'effectif…</option>
            {joueurs.map(j => <option key={j.id} value={j.id}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</option>)}
          </select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 90px', gap: '10px', marginBottom: '14px' }}>
          <input style={st.input} placeholder={t('equipe_prenom', lang)} value={playerInfo.prenom} onChange={e => setPlayerInfo(p => ({ ...p, prenom: e.target.value }))} />
          <input style={st.input} placeholder={t('equipe_nom', lang)} value={playerInfo.nom} onChange={e => setPlayerInfo(p => ({ ...p, nom: e.target.value }))} />
          <input style={st.input} placeholder={t('av_poste', lang)} value={playerInfo.poste} onChange={e => setPlayerInfo(p => ({ ...p, poste: e.target.value }))} />
          <input style={st.input} placeholder="N°" value={playerInfo.numero} onChange={e => setPlayerInfo(p => ({ ...p, numero: e.target.value }))} />
        </div>
        <p style={{ ...st.label, margin: '0 0 6px' }}>Match</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: '10px', marginBottom: '10px' }}>
          <input style={st.input} type="date" value={playerInfo.date} onChange={e => setPlayerInfo(p => ({ ...p, date: e.target.value }))} />
          <input style={st.input} placeholder={t('av_club_adverse', lang)} value={playerInfo.nomClub} onChange={e => setPlayerInfo(p => ({ ...p, nomClub: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: '10px' }}>
          {segmente([['aller', t('analyse_match_aller', lang)], ['retour', t('analyse_match_retour', lang)]], playerInfo.typeMatch, v => setPlayerInfo(p => ({ ...p, typeMatch: v })))}
          {segmente([['complet', t('analyse_match_complet', lang)], ['premiere', t('analyse_premiere_mi', lang)], ['deuxieme', t('analyse_deuxieme_mi', lang)]], playerInfo.periodeMatch, v => setPlayerInfo(p => ({ ...p, periodeMatch: v })))}
        </div>
      </div>

      {/* Étape 2 — enregistrement */}
      {(step === 'input' || step === 'transcript') && (
        <div style={carte}>
          {titreSection(2, t('analyse_enregistrer', lang), etape === 2)}
          <style>{`@keyframes av-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45) } 70% { box-shadow: 0 0 0 22px rgba(239,68,68,0) } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '6px 0 4px' }}>
            {!isRecording ? (
              <button onClick={startRecording} aria-label={t('analyse_demarrer', lang)}
                style={{ width: '104px', height: '104px', borderRadius: '50%', background: colors.accent.green, border: `6px solid ${colors.accent.green}33`, color: colors.black, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundClip: 'padding-box' }}>
                <IcoMicro />
              </button>
            ) : (
              <button onClick={stopRecording} aria-label={t('analyse_arreter', lang)}
                style={{ width: '104px', height: '104px', borderRadius: '50%', background: colors.accent.red, border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: 'av-pulse 1.6s infinite' }}>
                <IcoStop />
              </button>
            )}
            <p style={{ margin: 0, fontSize: isRecording ? '22px' : '13px', fontWeight: isRecording ? 800 : 600, color: isRecording ? colors.accent.red : colors.text.faint, fontVariantNumeric: 'tabular-nums' }}>
              {isRecording ? chrono : transcript.trim() ? `${nbMots} mots dictés — reprends l'enregistrement ou génère le rapport` : `${t('analyse_demarrer', lang)} puis décris l'action à voix haute`}
            </p>
          </div>

          {(transcript || interimText) && (
            <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 14px', marginTop: '14px', maxHeight: '220px', overflowY: 'auto' }}>
              <p style={{ ...st.label, margin: '0 0 6px' }}>Transcription</p>
              <p style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.65, margin: 0 }}>
                {transcript}<span style={{ color: colors.text.faint, fontStyle: 'italic' }}>{interimText}</span>
              </p>
            </div>
          )}

          {erreurIA && <p style={{ color: colors.accent.red, fontSize: '13px', marginTop: '12px' }}>{erreurIA}</p>}

          {transcript.trim() && !isRecording && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={reset} style={{ ...st.btn(colors.text.faint) }}>Effacer</button>
              <button onClick={handleGenerateRapport} disabled={loading}
                style={{ ...st.btnSolid(colors.accent.green, colors.black), flex: 1, opacity: loading ? 0.6 : 1 }}>
                {loading ? `${libelleStatutGroq(loadingStatus)}` : `${t('analyse_generer', lang)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Étape 3 — rapport */}
      {step === 'rapport' && rapport && (
        <div style={carte}>
          {titreSection(3, 'Rapport généré', true)}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {rapport.note != null && (() => {
              const n = Math.max(0, Math.min(10, Number(rapport.note) || 0))
              const c = n >= 7 ? colors.accent.green : n >= 5 ? colors.accent.amber : colors.accent.red
              return (
                <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: `conic-gradient(${c} ${n * 36}deg, ${colors.background.raised} 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: colors.background.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: c, lineHeight: 1 }}>{rapport.note}</span>
                    <span style={{ fontSize: '10px', color: colors.text.faint }}>/ 10</span>
                  </div>
                </div>
              )
            })()}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '16px' }}>{`${playerInfo.prenom} ${playerInfo.nom}`.trim() || 'Joueur'}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{[playerInfo.poste, playerInfo.nomClub ? `vs ${playerInfo.nomClub}` : null, playerInfo.date ? new Date(playerInfo.date + 'T12:00:00').toLocaleDateString('fr-FR') : null].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          {rapport.synthese && (
            <div style={{ marginBottom: '16px' }}>
              <p style={st.label}>Synthèse</p>
              <p style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{rapport.synthese}</p>
            </div>
          )}

          {rapport.sequences?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={st.label}>Séquences analysées</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: `2px solid ${colors.border.strong}`, paddingLeft: '12px' }}>
                {rapport.sequences.map((sq, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                    <span style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: '44px' }}>{sq.minute}</span>
                    <span style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{sq.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rapport.pointsPositifs?.length > 0 || rapport.pointsAmeliorer?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {[['Points positifs', rapport.pointsPositifs, colors.accent.green], ["Axes d'amélioration", rapport.pointsAmeliorer, colors.accent.amber]].map(([titre, liste, c]) => liste?.length > 0 && (
                <div key={titre} style={{ background: c + '10', border: `1px solid ${c}33`, borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ ...st.label, color: c, margin: '0 0 8px' }}>{titre}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {liste.map((pt, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, flexShrink: 0, transform: 'translateY(-1px)' }} />
                        <span style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => genererPDF(playerInfo, rapport, lang)} style={{ ...st.btnSolid(colors.accent.green, colors.black), flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><IcoPdf /> {t('analyse_exporter_pdf', lang)}</button>
            <button onClick={sauvegarderRapport} disabled={savingRapport || tableMissing} style={{ ...st.btn(colors.accent.blue), opacity: tableMissing ? 0.4 : 1 }}>
              {savingRapport ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={reset} style={{ ...st.btn(colors.text.faint) }}>Nouvelle analyse</button>
          </div>
        </div>
      )}
    </div>
  )

  const colonneRapports = (
    <div style={{ ...carte, position: isMobile ? 'static' : 'sticky', top: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '14px' }}>{t('analyse_mes_rapports', lang)}</p>
        {rapports.length > 0 && <span style={{ fontSize: '12px', color: colors.text.faint }}>{rapports.length}</span>}
      </div>
      {loadingRapports ? (
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>{t('btn_chargement', lang)}</p>
      ) : rapports.length === 0 ? (
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>{t('analyse_aucun_rapport', lang)}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isMobile ? 'none' : '70vh', overflowY: 'auto' }}>
          {rapports.map(r => {
            const estMatch = r.mode_analyse === 'match'
            const [prenom, ...reste] = (r.prenom_joueur || 'Sans nom').split(' ')
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
                <Avatar person={{ prenom, nom: reste.join(' ') || ' ' }} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prenom_joueur || 'Sans nom'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '5px', color: estMatch ? colors.accent.green : colors.accent.blue, background: (estMatch ? colors.accent.green : colors.accent.blue) + '1a' }}>{estMatch ? 'Match' : 'Vidéo'}</span>
                    {[r.poste, r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button title="Télécharger le PDF"
                  onClick={() => estMatch ? genererPDFMatch(r, clubNom) : genererPDF(r.contenu?.playerInfo || {}, r.contenu?.rapport || {}, lang)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, padding: '7px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                  <IcoPdf /> PDF
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>{t('analyse_titre', lang)}</h1>
      <p style={{ color: colors.text.faint, fontSize: '13px', margin: '0 0 1.25rem' }}>{t('av_sous_titre', lang)}</p>

      {tableMissing && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          La table <code>rapports_analyse</code> n'existe pas encore en base — la sauvegarde des rapports est indisponible tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.65fr) minmax(280px, 1fr)', gap: '20px', alignItems: 'start', maxWidth: '1200px' }}>
        {colonneStudio}
        {colonneRapports}
      </div>
    </div>
  )
}
