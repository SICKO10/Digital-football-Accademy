import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { t } from '../lib/translations'
import { enqueueIARequest, libelleStatutGroq } from '../lib/groqQueue'
import { useColors } from '../lib/theme'
import { police, forme } from '../tokens'
import { TitreEcran, Etiquette, EtiquetteStatut } from './identite'
import { styleCarte, styleEtiquette, styleChiffreHeros, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, couleurCraie, texteSur, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../lib/identite'
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
        <TitreEcran titre={t('analyse_titre', lang)} />
        <div role="alert" style={{ ...styleCarte(colors), boxShadow: `inset ${forme.lisere} 0 0 ${colors.accent.red}`, paddingLeft: '19px', maxWidth: '500px' }}>
          <p style={{ color: colors.text.primary, fontSize: '14px', fontWeight: 600, margin: '0 0 8px', fontFamily: police.texte }}>La dictée vocale n'est pas supportée sur ce navigateur.</p>
          <p style={{ color: colors.text.secondary, fontSize: '14px', margin: 0, fontFamily: police.texte }}>Utilise Chrome (desktop ou Android), Edge, ou Safari sur iOS.</p>
        </div>
      </div>
    )
  }

  // ─── Rendu : studio d'analyse en 3 étapes + « Mes rapports » à côté.
  // Logique inchangée (dictée, génération IA, sauvegarde, PDF).
  const etape = step === 'rapport' ? 3 : (isRecording || transcript.trim()) ? 2 : 1
  const chrono = `${String(Math.floor(secondes / 60)).padStart(2, '0')}:${String(secondes % 60).padStart(2, '0')}`
  const nbMots = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const styleTitreCarte = { fontFamily: police.titre, fontWeight: 700, fontSize: '20px', lineHeight: 1.1, letterSpacing: '0.01em', textTransform: 'uppercase', color: colors.text.primary }
  const titreSection = (num, texte, actif) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 14px' }}>
      <span aria-hidden="true" style={{ width: '26px', height: '26px', borderRadius: forme.rayonPastille, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: police.titre, fontSize: '16px', fontWeight: 700, background: actif ? colors.accent.brand : colors.background.raised, color: actif ? colors.accent.onBrand : colors.text.secondary, border: `1px solid ${actif ? colors.accent.brand : colors.border.strong}` }}>{num}</span>
      <h2 style={{ ...styleTitreCarte, margin: 0 }}>{texte}</h2>
    </div>
  )
  const segmente = (libelle, options, valeur, onChange) => (
    <div role="group" aria-label={libelle} style={{ display: 'flex', gap: '6px' }}>
      {options.map(([val, label]) => (
        <button key={val} type="button" aria-pressed={valeur === val} className={CLASSE_BOUTON_SECONDAIRE} onClick={() => onChange(val)}
          style={{ ...(valeur === val ? styleBoutonPrincipal(colors) : styleBoutonSecondaire(colors)), flex: 1, minHeight: '40px', padding: '0 8px', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {label}
        </button>
      ))}
    </div>
  )
  const carte = { ...styleCarte(colors), padding: isMobile ? '16px' : '20px' }
  const champ = styleChamp(colors)
  const libelleEtapes = ['Joueur & match', 'Enregistrement', 'Rapport']
  const mini = { ...styleBoutonSecondaire(colors), minHeight: '36px', padding: '0 12px', fontSize: '13px' }

  const colonneStudio = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      {/* Fil des étapes */}
      <ol style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', listStyle: 'none', margin: 0, padding: 0 }}>
        {libelleEtapes.map((l, i) => (
          <li key={l} aria-current={etape === i + 1 ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ ...styleEtiquette(colors), color: etape === i + 1 ? colors.text.primary : colors.text.dim, fontWeight: etape === i + 1 ? 700 : 600 }}>{i + 1}. {l}</span>
            {i < 2 && <span aria-hidden="true" style={{ width: '24px', height: '1px', background: couleurCraie(colors) }} />}
          </li>
        ))}
      </ol>

      {/* Étape 1 : joueur & match */}
      <div style={carte}>
        {titreSection(1, t('av_infos_joueur', lang), etape === 1)}
        {joueurs.length > 0 && (
          <select aria-label="Choisir un joueur de l'effectif" className={CLASSE_CHAMP} style={{ ...champ, marginBottom: '10px' }} value=""
            onChange={e => { const j = joueurs.find(x => x.id === e.target.value); if (j) setPlayerInfo(p => ({ ...p, prenom: j.prenom || '', nom: j.nom || '', poste: j.poste || '', numero: j.numero_maillot != null ? String(j.numero_maillot) : '' })) }}>
            <option value="">Choisir un joueur de l'effectif…</option>
            {joueurs.map(j => <option key={j.id} value={j.id}>{j.prenom} {j.nom}{j.poste ? ` — ${j.poste}` : ''}</option>)}
          </select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 90px', gap: '10px', marginBottom: '14px' }}>
          <input className={CLASSE_CHAMP} style={champ} aria-label={t('equipe_prenom', lang)} placeholder={t('equipe_prenom', lang)} value={playerInfo.prenom} onChange={e => setPlayerInfo(p => ({ ...p, prenom: e.target.value }))} />
          <input className={CLASSE_CHAMP} style={champ} aria-label={t('equipe_nom', lang)} placeholder={t('equipe_nom', lang)} value={playerInfo.nom} onChange={e => setPlayerInfo(p => ({ ...p, nom: e.target.value }))} />
          <input className={CLASSE_CHAMP} style={champ} aria-label={t('av_poste', lang)} placeholder={t('av_poste', lang)} value={playerInfo.poste} onChange={e => setPlayerInfo(p => ({ ...p, poste: e.target.value }))} />
          <input className={CLASSE_CHAMP} style={champ} aria-label="Numéro de maillot" placeholder="N°" value={playerInfo.numero} onChange={e => setPlayerInfo(p => ({ ...p, numero: e.target.value }))} />
        </div>
        <Etiquette as="p" style={{ margin: '0 0 6px' }}>Match</Etiquette>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: '10px', marginBottom: '10px' }}>
          <input className={CLASSE_CHAMP} style={champ} aria-label="Date du match" type="date" value={playerInfo.date} onChange={e => setPlayerInfo(p => ({ ...p, date: e.target.value }))} />
          <input className={CLASSE_CHAMP} style={champ} aria-label={t('av_club_adverse', lang)} placeholder={t('av_club_adverse', lang)} value={playerInfo.nomClub} onChange={e => setPlayerInfo(p => ({ ...p, nomClub: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: '10px' }}>
          {segmente('Aller ou retour', [['aller', t('analyse_match_aller', lang)], ['retour', t('analyse_match_retour', lang)]], playerInfo.typeMatch, v => setPlayerInfo(p => ({ ...p, typeMatch: v })))}
          {segmente('Période du match', [['complet', t('analyse_match_complet', lang)], ['premiere', t('analyse_premiere_mi', lang)], ['deuxieme', t('analyse_deuxieme_mi', lang)]], playerInfo.periodeMatch, v => setPlayerInfo(p => ({ ...p, periodeMatch: v })))}
        </div>
      </div>

      {/* Étape 2 : enregistrement */}
      {(step === 'input' || step === 'transcript') && (
        <div style={carte}>
          {titreSection(2, t('analyse_enregistrer', lang), etape === 2)}
          <style>{`@keyframes av-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45) } 70% { box-shadow: 0 0 0 22px rgba(239,68,68,0) } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0) } } @media (prefers-reduced-motion: reduce) { .av-enregistre { animation: none !important } }`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '6px 0 4px' }}>
            {!isRecording ? (
              <button type="button" onClick={startRecording} aria-label={t('analyse_demarrer', lang)}
                style={{ width: '104px', height: '104px', borderRadius: '50%', background: colors.accent.brand, border: `6px solid ${colors.accent.brand}33`, color: colors.accent.onBrand, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundClip: 'padding-box' }}>
                <IcoMicro />
              </button>
            ) : (
              <button type="button" className="av-enregistre" onClick={stopRecording} aria-label={t('analyse_arreter', lang)}
                style={{ width: '104px', height: '104px', borderRadius: '50%', background: colors.accent.red, border: 'none', color: texteSur(colors.accent.red), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: 'av-pulse 1.6s infinite' }}>
                <IcoStop />
              </button>
            )}
            <p role="status" style={isRecording
              ? { ...styleChiffreHeros(colors, 36), margin: 0 }
              : { margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text.secondary, textAlign: 'center', fontFamily: police.texte }}>
              {isRecording ? chrono : transcript.trim() ? `${nbMots} mots dictés. Reprends l'enregistrement ou génère le rapport.` : `${t('analyse_demarrer', lang)} puis décris l'action à voix haute`}
            </p>
          </div>

          {(transcript || interimText) && (
            <div style={{ background: colors.background.sunken, border: `1px solid ${couleurCraie(colors)}`, borderRadius: forme.rayonCarte, padding: '12px 14px', marginTop: '14px', maxHeight: '220px', overflowY: 'auto' }}>
              <Etiquette as="p" style={{ margin: '0 0 6px' }}>Transcription</Etiquette>
              <p style={{ color: colors.text.primary, fontSize: '14px', lineHeight: 1.65, margin: 0, fontFamily: police.texte }}>
                {transcript}<span style={{ color: colors.text.secondary, fontStyle: 'italic' }}>{interimText}</span>
              </p>
            </div>
          )}

          {erreurIA && <p role="alert" style={{ color: colors.text.primary, fontSize: '14px', marginTop: '12px', fontFamily: police.texte, boxShadow: `inset ${forme.lisere} 0 0 ${colors.accent.red}`, paddingLeft: '12px' }}>{erreurIA}</p>}

          {transcript.trim() && !isRecording && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button type="button" onClick={reset} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Effacer</button>
              <button type="button" onClick={handleGenerateRapport} disabled={loading} className={CLASSE_BOUTON}
                style={{ ...styleBoutonPrincipal(colors), flex: 1 }}>
                {loading ? `${libelleStatutGroq(loadingStatus)}` : `${t('analyse_generer', lang)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Étape 3 : rapport */}
      {step === 'rapport' && rapport && (
        <div style={carte}>
          {titreSection(3, 'Rapport généré', true)}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {rapport.note != null && (() => {
              const n = Math.max(0, Math.min(10, Number(rapport.note) || 0))
              const c = n >= 7 ? colors.accent.green : n >= 5 ? colors.accent.amber : colors.accent.red
              return (
                <div style={{ minWidth: '84px', padding: '8px 14px', textAlign: 'center', flexShrink: 0, background: colors.background.raised, borderRadius: forme.rayonCarte, boxShadow: `inset 0 ${forme.lisere} 0 ${c}` }}>
                  <span style={{ ...styleChiffreHeros(colors, 40) }}>{rapport.note}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: colors.text.secondary, fontFamily: police.texte }}>sur 10</span>
                </div>
              )
            })()}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ margin: 0, fontFamily: police.titre, fontWeight: 700, fontSize: '22px', textTransform: 'uppercase', color: colors.text.primary }}>{`${playerInfo.prenom} ${playerInfo.nom}`.trim() || 'Joueur'}</p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: colors.text.secondary, fontFamily: police.texte }}>{[playerInfo.poste, playerInfo.nomClub ? `vs ${playerInfo.nomClub}` : null, playerInfo.date ? new Date(playerInfo.date + 'T12:00:00').toLocaleDateString('fr-FR') : null].filter(Boolean).join(' · ')}</p>
            </div>
          </div>

          {rapport.synthese && (
            <div style={{ marginBottom: '16px' }}>
              <Etiquette as="p" style={{ margin: '0 0 6px' }}>Synthèse</Etiquette>
              <p style={{ color: colors.text.primary, fontSize: '14px', lineHeight: 1.6, margin: 0, fontFamily: police.texte }}>{rapport.synthese}</p>
            </div>
          )}

          {rapport.sequences?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Etiquette as="p" style={{ margin: '0 0 6px' }}>Séquences analysées</Etiquette>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: `1px solid ${couleurCraie(colors)}`, paddingLeft: '12px' }}>
                {rapport.sequences.map((sq, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                    <span style={{ ...styleChiffreHeros(colors, 17), minWidth: '48px' }}>{sq.minute}</span>
                    <span style={{ color: colors.text.primary, fontSize: '14px', lineHeight: 1.5, fontFamily: police.texte }}>{sq.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rapport.pointsPositifs?.length > 0 || rapport.pointsAmeliorer?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
              {[['Points positifs', rapport.pointsPositifs, colors.accent.green], ["Axes d'amélioration", rapport.pointsAmeliorer, colors.accent.amber]].map(([titre, liste, c]) => liste?.length > 0 && (
                <div key={titre} style={{ ...styleCarte(colors), background: colors.background.surfaceAlt, boxShadow: `inset ${forme.lisere} 0 0 ${c}`, padding: '12px 14px 12px 17px' }}>
                  <Etiquette as="p" style={{ margin: '0 0 8px' }}>{titre}</Etiquette>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', margin: 0, padding: 0 }}>
                    {liste.map((pt, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '1px', background: c, flexShrink: 0, transform: 'translateY(-1px)' }} />
                        <span style={{ color: colors.text.primary, fontSize: '14px', lineHeight: 1.5, fontFamily: police.texte }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => genererPDF(playerInfo, rapport, lang)} className={CLASSE_BOUTON} style={{ ...styleBoutonPrincipal(colors), flex: 1, gap: '8px' }}><IcoPdf /> {t('analyse_exporter_pdf', lang)}</button>
            <button type="button" onClick={sauvegarderRapport} disabled={savingRapport || tableMissing} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>
              {savingRapport ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button type="button" onClick={reset} className={CLASSE_BOUTON_SECONDAIRE} style={styleBoutonSecondaire(colors)}>Nouvelle analyse</button>
          </div>
        </div>
      )}
    </div>
  )

  const colonneRapports = (
    <div style={{ ...carte, position: isMobile ? 'static' : 'sticky', top: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ ...styleTitreCarte, margin: 0 }}>{t('analyse_mes_rapports', lang)}</h2>
        {rapports.length > 0 && <span style={styleChiffreHeros(colors, 18)}>{rapports.length}</span>}
      </div>
      {loadingRapports ? (
        <p role="status" style={{ color: colors.text.secondary, fontSize: '14px', margin: 0, fontFamily: police.texte }}>{t('btn_chargement', lang)}</p>
      ) : rapports.length === 0 ? (
        <p style={{ color: colors.text.secondary, fontSize: '14px', margin: 0, fontFamily: police.texte }}>{t('analyse_aucun_rapport', lang)}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: isMobile ? 'none' : '70vh', overflowY: 'auto' }}>
          {rapports.map(r => {
            const estMatch = r.mode_analyse === 'match'
            const [prenom, ...reste] = (r.prenom_joueur || 'Sans nom').split(' ')
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${couleurCraie(colors)}` }}>
                <Avatar person={{ prenom, nom: reste.join(' ') || ' ' }} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: police.texte }}>{r.prenom_joueur || 'Sans nom'}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: colors.text.secondary, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontFamily: police.texte }}>
                    <EtiquetteStatut couleur={estMatch ? colors.accent.green : colors.accent.blue}>{estMatch ? 'Match' : 'Vidéo'}</EtiquetteStatut>
                    {[r.poste, r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button type="button" className={CLASSE_BOUTON_SECONDAIRE} aria-label={`Télécharger le PDF : ${r.prenom_joueur || 'Sans nom'}`}
                  onClick={() => estMatch ? genererPDFMatch(r, clubNom) : genererPDF(r.contenu?.playerInfo || {}, r.contenu?.rapport || {}, lang)}
                  style={{ ...mini, gap: '6px', flexShrink: 0 }}>
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
      <TitreEcran titre={t('analyse_titre', lang)} sousTitre={t('av_sous_titre', lang)} />

      {tableMissing && (
        <div role="alert" style={{ ...styleCarte(colors), boxShadow: `inset ${forme.lisere} 0 0 ${colors.accent.amber}`, paddingLeft: '19px', marginBottom: '16px', color: colors.text.primary, fontSize: '14px', fontFamily: police.texte }}>
          La table <code>rapports_analyse</code> n'existe pas encore en base : la sauvegarde des rapports est indisponible tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.65fr) minmax(280px, 1fr)', gap: '20px', alignItems: 'start', maxWidth: '1200px' }}>
        {colonneStudio}
        {colonneRapports}
      </div>
    </div>
  )
}
