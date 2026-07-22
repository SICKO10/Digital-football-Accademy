import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const rapportVide = () => ({
  prenom: '',
  poste: '',
  numero_maillot: '',
  categorie: '',
  niveau_championnat: '',
  temps_jeu: '',
  coach_analyseur: '',
  url_video: '',
  sequences: [{ minute: '', description: '' }],
  points_positifs: ['', '', ''],
  points_amelioration: ['', '', ''],
  date_analyse: new Date().toISOString().split('T')[0],
})

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
  btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
  btnSolid: (color = '#4ade80', textColor = '#000') => ({ background: color, color: textColor, border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
}

// ── Génération du PDF ──────────────────────────────────────────────────────
// Prend un objet "rapport" en paramètre (état courant ou contenu jsonb d'un
// rapport déjà sauvegardé) pour servir aussi bien à la génération initiale
// qu'au re-téléchargement d'un rapport de la liste.
async function genererPDF(data) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const margin = 20
  let y = 20

  doc.setFillColor(34, 197, 94)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text("RAPPORT D'ANALYSE", margin, 20)
  doc.setFontSize(12)
  doc.text('Digital Football Academy', margin, 30)

  y = 55
  doc.setTextColor(0, 0, 0)

  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 5, 170, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('INFORMATIONS JOUEUR', margin, y)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Prénom : ${data.prenom}`, margin, y); y += 7
  doc.text(`Poste : ${data.poste}`, margin, y)
  doc.text(`N° ${data.numero_maillot}`, 120, y); y += 7
  if (data.categorie) { doc.text(`Catégorie : ${data.categorie}`, margin, y); y += 7 }
  if (data.niveau_championnat) { doc.text(`Niveau : ${data.niveau_championnat}`, margin, y); y += 7 }
  if (data.temps_jeu) { doc.text(`Temps de jeu : ${data.temps_jeu}`, margin, y); y += 7 }
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text(`Coach analyseur : ${data.coach_analyseur}`, margin, y); y += 5
  doc.text(`Date : ${new Date(data.date_analyse).toLocaleDateString('fr-FR')}`, margin, y); y += 10

  doc.setDrawColor(34, 197, 94)
  doc.line(margin, y, 190, y); y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ANALYSE DES SÉQUENCES', margin, y); y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  data.sequences.filter(s => s.description).forEach(seq => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    if (seq.minute) doc.text(`⏱ ${seq.minute}`, margin, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(seq.description, 155)
    doc.text(lines, seq.minute ? margin + 18 : margin, y)
    y += lines.length * 5 + 4
  })

  y += 5
  doc.setDrawColor(34, 197, 94)
  doc.line(margin, y, 190, y); y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(34, 197, 94)
  doc.text('✅ POINTS POSITIFS', margin, y); y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  data.points_positifs.filter(p => p).forEach(p => {
    if (y > 260) { doc.addPage(); y = 20 }
    const lines = doc.splitTextToSize(`• ${p}`, 165)
    doc.text(lines, margin, y)
    y += lines.length * 6
  })

  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(239, 68, 68)
  doc.text('📈 POINTS À AMÉLIORER', margin, y); y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  data.points_amelioration.filter(p => p).forEach(p => {
    if (y > 260) { doc.addPage(); y = 20 }
    const lines = doc.splitTextToSize(`• ${p}`, 165)
    doc.text(lines, margin, y)
    y += lines.length * 6
  })

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Digital Football Academy — Rapport confidentiel', margin, 285)
    doc.text(`Page ${i}/${totalPages}`, 180, 285)
  }

  doc.save(`analyse-${data.prenom || 'joueur'}-${data.date_analyse}.pdf`)
}

// ── Formulaire manuel (mode "manuelle" + étape éditable du mode "hybride") ──
// Composant au niveau module (pas imbriqué dans AnalyseVideo) : un composant
// défini à l'intérieur du corps d'un autre serait recréé à chaque rendu et
// perdrait le focus des champs à chaque frappe.
function FormulaireRapport({ rapport, setRapport }) {
  const champ = (key, value) => setRapport(r => ({ ...r, [key]: value }))
  const updateSequence = (i, field, value) => setRapport(r => ({ ...r, sequences: r.sequences.map((s, j) => (j === i ? { ...s, [field]: value } : s)) }))
  const ajouterSequence = () => setRapport(r => ({ ...r, sequences: [...r.sequences, { minute: '', description: '' }] }))
  const supprimerSequence = (i) => setRapport(r => ({ ...r, sequences: r.sequences.filter((_, j) => j !== i) }))
  const updatePoint = (cle, i, value) => setRapport(r => ({ ...r, [cle]: r[cle].map((p, j) => (j === i ? value : p)) }))
  const ajouterPoint = (cle) => setRapport(r => ({ ...r, [cle]: [...r[cle], ''] }))
  const supprimerPoint = (cle, i) => setRapport(r => ({ ...r, [cle]: r[cle].filter((_, j) => j !== i) }))

  return (
    <div>
      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>👤 Informations joueur</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <input style={st.input} placeholder="Prénom du joueur *" value={rapport.prenom} onChange={e => champ('prenom', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input style={st.input} placeholder="Poste *" value={rapport.poste} onChange={e => champ('poste', e.target.value)} />
          <input style={st.input} placeholder="N° maillot *" type="number" value={rapport.numero_maillot} onChange={e => champ('numero_maillot', e.target.value)} />
          <input style={st.input} placeholder="Catégorie (ex: U18)" value={rapport.categorie} onChange={e => champ('categorie', e.target.value)} />
          <input style={st.input} placeholder="Niveau championnat" value={rapport.niveau_championnat} onChange={e => champ('niveau_championnat', e.target.value)} />
          <input style={st.input} placeholder="Temps de jeu (ex: 72')" value={rapport.temps_jeu} onChange={e => champ('temps_jeu', e.target.value)} />
        </div>
      </div>

      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>🎙️ Coach analyseur</p>
      <input style={{ ...st.input, marginBottom: '20px' }} placeholder="Nom du coach analyseur *" value={rapport.coach_analyseur} onChange={e => champ('coach_analyseur', e.target.value)} />

      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>🎬 Séquences analysées</p>
      <p style={{ color: '#666', fontSize: '12px', margin: '0 0 12px' }}>Ajoute chaque séquence avec sa minute.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {rapport.sequences.map((seq, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '8px' }}>
            <input style={st.input} placeholder="min." value={seq.minute} onChange={e => updateSequence(i, 'minute', e.target.value)} />
            <textarea style={{ ...st.input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Description de la séquence..." value={seq.description} rows={2} onChange={e => updateSequence(i, 'description', e.target.value)} />
            <button onClick={() => supprimerSequence(i)} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer', width: '32px' }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={ajouterSequence} style={{ ...st.btn('#60a5fa'), marginBottom: '20px' }}>+ Ajouter une séquence</button>

      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>✅ Points positifs</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {rapport.points_positifs.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px' }}>
            <input style={st.input} placeholder={`Point positif ${i + 1}`} value={p} onChange={e => updatePoint('points_positifs', i, e.target.value)} />
            <button onClick={() => supprimerPoint('points_positifs', i)} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer', width: '32px', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={() => ajouterPoint('points_positifs')} style={{ ...st.btn('#4ade80'), marginBottom: '20px' }}>+ Ajouter</button>

      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>📈 Points à améliorer</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {rapport.points_amelioration.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px' }}>
            <input style={st.input} placeholder={`Point à améliorer ${i + 1}`} value={p} onChange={e => updatePoint('points_amelioration', i, e.target.value)} />
            <button onClick={() => supprimerPoint('points_amelioration', i)} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', cursor: 'pointer', width: '32px', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={() => ajouterPoint('points_amelioration')} style={{ ...st.btn('#ef4444'), marginBottom: '20px' }}>+ Ajouter</button>

      <div>
        <label style={st.label}>Date de l'analyse</label>
        <input style={{ ...st.input, maxWidth: '200px' }} type="date" value={rapport.date_analyse} onChange={e => champ('date_analyse', e.target.value)} />
      </div>
    </div>
  )
}

// ── Résultat IA en lecture seule (mode "ia" après analyse) ──────────────────
function ResultatLectureSeule({ rapport }) {
  return (
    <div>
      <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 8px' }}>{rapport.prenom} {rapport.poste ? `— ${rapport.poste}` : ''} {rapport.numero_maillot ? `#${rapport.numero_maillot}` : ''}</p>
      <p style={{ color: '#888', fontSize: '12px', margin: '0 0 16px' }}>
        {[rapport.categorie, rapport.niveau_championnat, rapport.temps_jeu].filter(Boolean).join(' · ') || 'Aucune info complémentaire'}
      </p>
      <p style={{ fontWeight: 700, fontSize: '13px', color: '#60a5fa', margin: '0 0 8px' }}>🎬 Séquences</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {rapport.sequences.filter(s => s.description).map((s, i) => (
          <p key={i} style={{ margin: 0, fontSize: '13px', color: '#ccc' }}><strong style={{ color: '#60a5fa' }}>{s.minute}</strong> — {s.description}</p>
        ))}
      </div>
      <p style={{ fontWeight: 700, fontSize: '13px', color: '#4ade80', margin: '0 0 8px' }}>✅ Points positifs</p>
      <ul style={{ margin: '0 0 16px', paddingLeft: '18px', color: '#ccc', fontSize: '13px' }}>
        {rapport.points_positifs.filter(Boolean).map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <p style={{ fontWeight: 700, fontSize: '13px', color: '#ef4444', margin: '0 0 8px' }}>📈 Points à améliorer</p>
      <ul style={{ margin: 0, paddingLeft: '18px', color: '#ccc', fontSize: '13px' }}>
        {rapport.points_amelioration.filter(Boolean).map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  )
}

export default function AnalyseVideo({ userId }) {
  const [rapport, setRapport] = useState(rapportVide)
  const [modeAnalyse, setModeAnalyse] = useState('manuelle')
  const [analyse, setAnalyse] = useState(false)
  const [analyseTerminee, setAnalyseTerminee] = useState(false)
  const [banniereIA, setBanniereIA] = useState(null)
  const [savingRapport, setSavingRapport] = useState(false)
  const [rapports, setRapports] = useState([])
  const [loadingRapports, setLoadingRapports] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)

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

  const changerMode = (mode) => {
    setModeAnalyse(mode)
    setAnalyseTerminee(false)
    setBanniereIA(null)
  }

  const recommencer = () => {
    setRapport(rapportVide())
    setAnalyseTerminee(false)
    setBanniereIA(null)
  }

  const analyserVideoIA = async () => {
    if (!rapport.url_video.trim() || !rapport.prenom.trim() || !rapport.coach_analyseur.trim()) return
    setAnalyse(true)
    setBanniereIA(null)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GEMINI_API_KEY manquante dans .env')
      const prompt = `Tu es un coach analyseur professionnel de football. Analyse cette vidéo et extrais les informations suivantes en JSON :

{
  "poste": "poste du joueur observé",
  "numero_maillot": "numéro si visible",
  "categorie": "catégorie si mentionnée",
  "niveau_championnat": "niveau si mentionné",
  "temps_jeu": "temps de jeu si mentionné",
  "sequences": [
    { "minute": "timestamp en minutes (ex: 2'30)", "description": "ce qui se passe et ce qui est dit sur le joueur" }
  ],
  "points_positifs": ["point 1", "point 2", "point 3"],
  "points_amelioration": ["point 1", "point 2", "point 3"]
}

Extrais TOUTES les séquences où le joueur est mentionné ou analysé avec leurs minutes exactes.
Si une info n'est pas disponible, mets null.
Retourne UNIQUEMENT le JSON, sans texte autour.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { file_data: { mime_type: 'video/mp4', file_uri: rapport.url_video.trim() } },
              ],
            }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON non trouvé dans la réponse')
      const extracted = JSON.parse(jsonMatch[0])

      setRapport(prev => ({
        ...prev,
        poste: extracted.poste || prev.poste,
        numero_maillot: extracted.numero_maillot != null ? String(extracted.numero_maillot) : prev.numero_maillot,
        categorie: extracted.categorie || prev.categorie,
        niveau_championnat: extracted.niveau_championnat || prev.niveau_championnat,
        temps_jeu: extracted.temps_jeu || prev.temps_jeu,
        sequences: extracted.sequences?.length ? extracted.sequences.map(s => ({ minute: s.minute || '', description: s.description || '' })) : prev.sequences,
        points_positifs: extracted.points_positifs?.length ? extracted.points_positifs : prev.points_positifs,
        points_amelioration: extracted.points_amelioration?.length ? extracted.points_amelioration : prev.points_amelioration,
      }))
      setAnalyseTerminee(true)
      setBanniereIA(modeAnalyse === 'hybride'
        ? "🔄 Brouillon généré par Gemini — corrige si nécessaire avant de générer le PDF"
        : '✅ Analyse terminée — vérifie et génère le PDF')
    } catch (err) {
      console.error('Erreur analyse vidéo IA:', err)
      setBanniereIA("❌ Erreur : " + err.message)
    } finally {
      setAnalyse(false)
    }
  }

  const sauvegarderRapport = async () => {
    setSavingRapport(true)
    const { error } = await supabase.from('rapports_analyse').insert({
      educateur_id: userId,
      prenom_joueur: rapport.prenom,
      poste: rapport.poste,
      url_video: rapport.url_video || null,
      contenu: rapport,
      mode_analyse: modeAnalyse,
      date_analyse: rapport.date_analyse,
    })
    setSavingRapport(false)
    if (error) {
      if (error.code === '42P01') { setTableMissing(true); return }
      alert('Erreur lors de la sauvegarde : ' + error.message)
      return
    }
    await chargerRapports()
  }

  const champsObligatoiresManquants = modeAnalyse === 'manuelle'
    ? !rapport.prenom.trim() || !rapport.poste.trim() || !rapport.numero_maillot.toString().trim() || !rapport.coach_analyseur.trim()
    : !rapport.prenom.trim() || !rapport.coach_analyseur.trim()

  const modes = [
    { key: 'manuelle', label: '✍️ Manuelle' },
    { key: 'ia', label: '🤖 IA automatique' },
    { key: 'hybride', label: '🔄 Hybride' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎬 Analyse vidéo</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>Génère un rapport d'analyse vidéo par joueur, à la main ou avec l'aide de l'IA.</p>

      {tableMissing && (
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>rapports_analyse</code> n'existe pas encore en base — la sauvegarde des rapports est indisponible tant qu'elle n'est pas créée.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {modes.map(m => (
          <button key={m.key} onClick={() => changerMode(m.key)}
            style={{ background: modeAnalyse === m.key ? '#4ade80' : '#1a1a1a', color: modeAnalyse === m.key ? '#000' : '#666', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ ...st.card, maxWidth: '700px', marginBottom: '2rem' }}>
        {modeAnalyse === 'manuelle' && (
          <>
            <FormulaireRapport rapport={rapport} setRapport={setRapport} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => genererPDF(rapport)} disabled={champsObligatoiresManquants}
                style={{ ...st.btnSolid('#22c55e'), flex: 1, opacity: champsObligatoiresManquants ? 0.4 : 1 }}>
                📄 Générer le rapport PDF
              </button>
              <button onClick={sauvegarderRapport} disabled={champsObligatoiresManquants || savingRapport || tableMissing}
                style={{ ...st.btn('#60a5fa'), opacity: (champsObligatoiresManquants || tableMissing) ? 0.4 : 1 }}>
                {savingRapport ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>
          </>
        )}

        {(modeAnalyse === 'ia' || modeAnalyse === 'hybride') && !analyseTerminee && (
          <div>
            <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 6px' }}>{modeAnalyse === 'ia' ? '🤖 Analyse IA automatique' : '🔄 Analyse hybride'}</p>
            <p style={{ color: '#aaa', fontSize: '13px', margin: '0 0 16px' }}>
              Colle l'URL YouTube — Gemini analyse la vidéo et {modeAnalyse === 'ia' ? 'génère le rapport complet.' : 'pré-remplit un brouillon que tu pourras corriger.'}
            </p>
            <input style={st.input} placeholder="https://www.youtube.com/watch?v=..." value={rapport.url_video} onChange={e => setRapport(r => ({ ...r, url_video: e.target.value }))} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
              <input style={st.input} placeholder="Prénom du joueur *" value={rapport.prenom} onChange={e => setRapport(r => ({ ...r, prenom: e.target.value }))} />
              <input style={st.input} placeholder="Coach analyseur *" value={rapport.coach_analyseur} onChange={e => setRapport(r => ({ ...r, coach_analyseur: e.target.value }))} />
            </div>

            {banniereIA && (
              <p style={{ color: banniereIA.startsWith('❌') ? '#ef4444' : '#4ade80', fontSize: '13px', marginTop: '12px' }}>{banniereIA}</p>
            )}

            <button onClick={analyserVideoIA} disabled={!rapport.url_video.trim() || !rapport.prenom.trim() || !rapport.coach_analyseur.trim() || analyse}
              style={{ ...st.btnSolid('#7c3aed', '#fff'), width: '100%', marginTop: '16px', opacity: (!rapport.url_video.trim() || !rapport.prenom.trim() || !rapport.coach_analyseur.trim()) ? 0.5 : 1 }}>
              {analyse ? '🔄 Analyse en cours...' : '🤖 Analyser avec Gemini'}
            </button>
          </div>
        )}

        {modeAnalyse === 'ia' && analyseTerminee && (
          <div>
            {banniereIA && <p style={{ color: '#4ade80', fontSize: '13px', marginBottom: '16px' }}>{banniereIA}</p>}
            <ResultatLectureSeule rapport={rapport} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => genererPDF(rapport)} style={{ ...st.btnSolid('#22c55e'), flex: 1 }}>📄 Générer le rapport PDF</button>
              <button onClick={sauvegarderRapport} disabled={savingRapport || tableMissing} style={{ ...st.btn('#60a5fa'), opacity: tableMissing ? 0.4 : 1 }}>
                {savingRapport ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
              <button onClick={recommencer} style={st.btn('#666')}>🔄 Nouvelle analyse</button>
            </div>
          </div>
        )}

        {modeAnalyse === 'hybride' && analyseTerminee && (
          <div>
            <div style={{ background: '#1e3a5f', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              🔄 Brouillon généré par Gemini — corrige si nécessaire avant de générer le PDF
            </div>
            <FormulaireRapport rapport={rapport} setRapport={setRapport} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => genererPDF(rapport)} disabled={champsObligatoiresManquants}
                style={{ ...st.btnSolid('#22c55e'), flex: 1, opacity: champsObligatoiresManquants ? 0.4 : 1 }}>
                📄 Générer le rapport PDF
              </button>
              <button onClick={sauvegarderRapport} disabled={champsObligatoiresManquants || savingRapport || tableMissing}
                style={{ ...st.btn('#60a5fa'), opacity: (champsObligatoiresManquants || tableMissing) ? 0.4 : 1 }}>
                {savingRapport ? 'Sauvegarde...' : '💾 Sauvegarder'}
              </button>
              <button onClick={recommencer} style={st.btn('#666')}>🔄 Recommencer</button>
            </div>
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
                    {r.date_analyse ? new Date(r.date_analyse).toLocaleDateString('fr-FR') : ''} · {r.mode_analyse === 'ia' ? '🤖 IA' : r.mode_analyse === 'hybride' ? '🔄 Hybride' : '✍️ Manuelle'}
                  </p>
                </div>
                <button onClick={() => genererPDF(r.contenu)} style={{ background: '#60a5fa15', border: '1px solid #60a5fa40', color: '#60a5fa', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
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
