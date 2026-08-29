import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

const NATURE_LABELS = {
  cpa: 'CPA',
  attaque_placee: 'Attaque placée',
  attaque_rapide: 'Attaque rapide',
  erreur_individuelle: 'Erreur individuelle',
  exploit_personnel: 'Exploit personnel',
}

// Rapport de match façon "feuille BEF" — composition/buts/cartons pré-remplis
// depuis les données déjà saisies (feuille de match stats_match, buts_detail),
// le reste (remplacements, analyse offensive/défensive, causerie) est manuel
// car rien n'existe encore ailleurs pour ça. Sauvegardé dans rapports_analyse
// (mode_analyse: 'match') — même table que les analyses vidéo joueur, pour que
// les deux types de rapport apparaissent ensemble dans "Analyse rapport"
// (cf. AnalyseVideo.jsx), distingués par un badge.
export default function RapportMatch({ match, joueurs, userId, equipeActiveId, clubNom, onClose, onSaved }) {
  const colors = useColors()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rapportId, setRapportId] = useState(null)
  const [composition, setComposition] = useState([])
  const [butsMarques, setButsMarques] = useState([])
  const [butsEncaisses, setButsEncaisses] = useState([])
  const [cartonsJaunes, setCartonsJaunes] = useState([])
  const [cartonsRouges, setCartonsRouges] = useState([])
  const [remplacements, setRemplacements] = useState([])
  const [analyse, setAnalyse] = useState({ offensif_positif: '', offensif_probleme: '', defensif_positif: '', defensif_probleme: '' })
  const [scoreMiTemps, setScoreMiTemps] = useState({ nous: '', eux: '' })
  const [causerie, setCauserie] = useState('')
  const [causerieSupports, setCauserieSupports] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('rapports_analyse').select('*').eq('educateur_id', userId).eq('mode_analyse', 'match')
      const existant = (data || []).find(r => r.contenu?.match_id === match.id)

      if (existant) {
        const c = existant.contenu || {}
        setRapportId(existant.id)
        setComposition(c.composition || [])
        setButsMarques(c.buts_marques || [])
        setButsEncaisses(c.buts_encaisses || [])
        setCartonsJaunes(c.cartons_jaunes || [])
        setCartonsRouges(c.cartons_rouges || [])
        setRemplacements(c.remplacements || [])
        setAnalyse(c.analyse || { offensif_positif: '', offensif_probleme: '', defensif_positif: '', defensif_probleme: '' })
        setScoreMiTemps(c.score_mi_temps || { nous: '', eux: '' })
        setCauserie(c.causerie || '')
        setCauserieSupports(c.causerie_supports || '')
      } else {
        // Pré-remplissage depuis la feuille de match (stats_match) et les buts
        // détaillés (buts_detail) — le reste (remplacements, analyse, causerie)
        // n'a pas d'équivalent en base, l'éducateur part d'une page blanche.
        const statsParJoueur = {}
        ;(match.stats_match || []).forEach(s => { statsParJoueur[s.joueur_id] = s })
        const compo = [...joueurs]
          .filter(j => statsParJoueur[j.id])
          .sort((a, b) => (a.numero_maillot || 99) - (b.numero_maillot || 99))
          .map(j => ({ numero: j.numero_maillot || '', nom: j.nom, prenom: j.prenom, titulaire: (statsParJoueur[j.id].minutes || 0) >= 45 }))
        setComposition(compo)

        const buts = match.buts_detail || []
        setButsMarques(buts.filter(b => b.equipe === 'nous').map(b => ({ numero: '', minute: b.minute || '', description: NATURE_LABELS[b.nature] || '' })))
        setButsEncaisses(buts.filter(b => b.equipe === 'eux').map(b => ({ minute: b.minute || '', description: NATURE_LABELS[b.nature] || '' })))

        const jaunes = []
        const rouges = []
        joueurs.forEach(j => {
          const s = statsParJoueur[j.id]
          if (!s) return
          if (s.carton_jaune) jaunes.push({ numero: j.numero_maillot || '', minute: '' })
          if (s.carton_rouge) rouges.push({ numero: j.numero_maillot || '', minute: '' })
        })
        setCartonsJaunes(jaunes)
        setCartonsRouges(rouges)
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id])

  const sauvegarder = async () => {
    setSaving(true)
    const payload = {
      educateur_id: userId,
      club_categorie_id: equipeActiveId || null,
      prenom_joueur: `${match.domicile ? 'vs' : '@'} ${match.adversaire || ''}`.trim(),
      poste: match.domicile ? 'Domicile' : 'Extérieur',
      url_video: null,
      mode_analyse: 'match',
      date_analyse: match.date,
      contenu: {
        match_id: match.id,
        adversaire: match.adversaire,
        domicile: match.domicile,
        score_nous: match.score_nous,
        score_eux: match.score_eux,
        composition,
        buts_marques: butsMarques,
        buts_encaisses: butsEncaisses,
        cartons_jaunes: cartonsJaunes,
        cartons_rouges: cartonsRouges,
        remplacements,
        analyse,
        score_mi_temps: scoreMiTemps,
        causerie,
        causerie_supports: causerieSupports,
      },
    }
    const { error } = rapportId
      ? await supabase.from('rapports_analyse').update(payload).eq('id', rapportId)
      : await supabase.from('rapports_analyse').insert(payload)
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    onSaved?.()
    onClose()
  }

  const st = {
    label: { fontSize: '11px', color: colors.text.faint, marginBottom: '6px', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
    section: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px', marginBottom: '16px' },
  }

  const ajouterLigne = (setter) => setter(prev => [...prev, {}])
  const retirerLigne = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i))
  const majLigne = (setter, i, field, value) => setter(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '17px' }}>Rapport de match</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.text.faint }}>
              {clubNom || 'Nous'} {match.score_nous} - {match.score_eux} {match.adversaire} · {new Date(match.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {loading ? (
          <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p>
        ) : (
          <>
            {/* Score mi-temps — n'existe nulle part ailleurs (matchs_equipe n'a que le score final) */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Score mi-temps</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '200px' }}>
                <input placeholder="Nous" value={scoreMiTemps.nous} onChange={e => setScoreMiTemps(s => ({ ...s, nous: e.target.value }))} style={{ ...st.input, textAlign: 'center' }} />
                <span style={{ color: colors.text.faint }}>-</span>
                <input placeholder="Eux" value={scoreMiTemps.eux} onChange={e => setScoreMiTemps(s => ({ ...s, eux: e.target.value }))} style={{ ...st.input, textAlign: 'center' }} />
              </div>
            </div>

            {/* Composition de départ */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Composition de départ</p>
              {composition.length === 0 ? (
                <p style={{ color: colors.text.disabled, fontSize: '12px', margin: 0 }}>Aucun joueur n'a de statistiques enregistrées pour ce match — remplis d'abord la feuille de match.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {composition.map((c, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!c.titulaire} onChange={e => majLigne(setComposition, i, 'titulaire', e.target.checked)} />
                      <span style={{ color: colors.text.faint, width: '28px', flexShrink: 0 }}>{c.numero || '—'}</span>
                      <span style={{ flex: 1 }}>{c.prenom} {c.nom}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Buts marqués */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Buts marqués</p>
              {butsMarques.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input placeholder="N°" value={b.numero || ''} onChange={e => majLigne(setButsMarques, i, 'numero', e.target.value)} style={{ ...st.input, width: '56px' }} />
                  <input placeholder="Min" value={b.minute || ''} onChange={e => majLigne(setButsMarques, i, 'minute', e.target.value)} style={{ ...st.input, width: '56px' }} />
                  <input placeholder="Description" value={b.description || ''} onChange={e => majLigne(setButsMarques, i, 'description', e.target.value)} style={{ ...st.input, flex: 1 }} />
                  <button onClick={() => retirerLigne(setButsMarques, i)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              ))}
              <button onClick={() => ajouterLigne(setButsMarques)} style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: '8px', padding: '6px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>+ Ajouter un but</button>
            </div>

            {/* Buts encaissés */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Buts encaissés</p>
              {butsEncaisses.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input placeholder="Min" value={b.minute || ''} onChange={e => majLigne(setButsEncaisses, i, 'minute', e.target.value)} style={{ ...st.input, width: '56px' }} />
                  <input placeholder="Description" value={b.description || ''} onChange={e => majLigne(setButsEncaisses, i, 'description', e.target.value)} style={{ ...st.input, flex: 1 }} />
                  <button onClick={() => retirerLigne(setButsEncaisses, i)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              ))}
              <button onClick={() => ajouterLigne(setButsEncaisses)} style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: '8px', padding: '6px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>+ Ajouter un but</button>
            </div>

            {/* Cartons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Cartons jaunes</p>
                {cartonsJaunes.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input placeholder="N°" value={c.numero || ''} onChange={e => majLigne(setCartonsJaunes, i, 'numero', e.target.value)} style={{ ...st.input, width: '56px' }} />
                    <input placeholder="Min" value={c.minute || ''} onChange={e => majLigne(setCartonsJaunes, i, 'minute', e.target.value)} style={{ ...st.input, flex: 1 }} />
                    <button onClick={() => retirerLigne(setCartonsJaunes, i)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => ajouterLigne(setCartonsJaunes)} style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: '8px', padding: '6px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>+ Ajouter</button>
              </div>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Cartons rouges</p>
                {cartonsRouges.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input placeholder="N°" value={c.numero || ''} onChange={e => majLigne(setCartonsRouges, i, 'numero', e.target.value)} style={{ ...st.input, width: '56px' }} />
                    <input placeholder="Min" value={c.minute || ''} onChange={e => majLigne(setCartonsRouges, i, 'minute', e.target.value)} style={{ ...st.input, flex: 1 }} />
                    <button onClick={() => retirerLigne(setCartonsRouges, i)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => ajouterLigne(setCartonsRouges)} style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: '8px', padding: '6px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>+ Ajouter</button>
              </div>
            </div>

            {/* Remplacements */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Remplacements</p>
              {remplacements.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input placeholder="N° sortant" value={r.sortant || ''} onChange={e => majLigne(setRemplacements, i, 'sortant', e.target.value)} style={{ ...st.input, width: '90px' }} />
                  <span style={{ color: colors.text.faint, fontSize: '12px' }}>→</span>
                  <input placeholder="N° entrant" value={r.entrant || ''} onChange={e => majLigne(setRemplacements, i, 'entrant', e.target.value)} style={{ ...st.input, width: '90px' }} />
                  <input placeholder="Minute" value={r.minute || ''} onChange={e => majLigne(setRemplacements, i, 'minute', e.target.value)} style={{ ...st.input, width: '80px' }} />
                  <button onClick={() => retirerLigne(setRemplacements, i)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              ))}
              <button onClick={() => ajouterLigne(setRemplacements)} style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: '8px', padding: '6px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>+ Ajouter un remplacement</button>
            </div>

            {/* Analyse offensive / défensive */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Sur le plan offensif</p>
                <label style={st.label}>Points positifs</label>
                <textarea rows={3} value={analyse.offensif_positif} onChange={e => setAnalyse(a => ({ ...a, offensif_positif: e.target.value }))} style={{ ...st.input, resize: 'vertical', marginBottom: '10px' }} />
                <label style={st.label}>Problèmes rencontrés</label>
                <textarea rows={3} value={analyse.offensif_probleme} onChange={e => setAnalyse(a => ({ ...a, offensif_probleme: e.target.value }))} style={{ ...st.input, resize: 'vertical' }} />
              </div>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Sur le plan défensif</p>
                <label style={st.label}>Points positifs</label>
                <textarea rows={3} value={analyse.defensif_positif} onChange={e => setAnalyse(a => ({ ...a, defensif_positif: e.target.value }))} style={{ ...st.input, resize: 'vertical', marginBottom: '10px' }} />
                <label style={st.label}>Problèmes rencontrés</label>
                <textarea rows={3} value={analyse.defensif_probleme} onChange={e => setAnalyse(a => ({ ...a, defensif_probleme: e.target.value }))} style={{ ...st.input, resize: 'vertical' }} />
              </div>
            </div>

            {/* Causerie avant-match */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Plan de causerie et idées forces</p>
                <textarea rows={4} value={causerie} onChange={e => setCauserie(e.target.value)} placeholder="Système, consignes, points clés évoqués avant le match..." style={{ ...st.input, resize: 'vertical' }} />
              </div>
              <div style={st.section}>
                <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Supports et méthodes</p>
                <textarea rows={4} value={causerieSupports} onChange={e => setCauserieSupports(e.target.value)} placeholder="Paper board, vidéo, plots..." style={{ ...st.input, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={sauvegarder} disabled={saving} style={{ flex: 1, background: colors.accent.green, color: colors.black, border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Enregistrement...' : rapportId ? 'Mettre à jour le rapport' : 'Enregistrer le rapport'}
              </button>
              <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.faint, padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Export PDF façon "feuille de match" — réutilisé par AnalyseVideo.jsx pour le
// bouton "Re-télécharger" des rapports mode_analyse === 'match'.
// Reproduit la mise en page du modèle "BEF - Rapport de match" (tableaux
// bordés, en-têtes de couleur) plutôt qu'un simple texte — colonnes/couleurs
// approchées à l'oeil sur le PDF fourni en exemple, pas un pixel-perfect.
const PDF_MARGE = 15
const PDF_LARGEUR_UTILE = 210 - PDF_MARGE * 2
const BLEU_BG = [222, 235, 247]
const BLEU_BORDURE = [155, 187, 224]
const BLEU_TEXTE = [31, 78, 121]
const ORANGE_BG = [252, 228, 214]
const ORANGE_BORDURE = [230, 175, 145]
const VERT_BG = [146, 208, 80]
const ROUGE_BG = [255, 99, 71]
const GRIS_BORDURE = [190, 190, 190]

export async function genererPDFMatch(rapport, clubNom) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const c = rapport.contenu || {}
  let y = 15

  // ── Table drawer générique — cellules = string ou {text,bg,border,color,bold,align} ──
  const drawTable = (x, startY, colWidths, rows, fontSize = 9) => {
    let cy = startY
    rows.forEach(row => {
      doc.setFontSize(fontSize)
      const cells = row.map(cell => (typeof cell === 'string' ? { text: cell } : cell))
      const cellLines = cells.map((cell, i) => doc.splitTextToSize(String(cell.text ?? ''), colWidths[i] - 4))
      const lineH = fontSize * 0.42 + 1.3
      const rowHeight = Math.max(6, ...cellLines.map(l => l.length * lineH + 3))
      if (cy + rowHeight > 282) { doc.addPage(); cy = 15 }
      let cx = x
      cells.forEach((cell, i) => {
        const w = colWidths[i]
        doc.setFillColor(...(cell.bg || [255, 255, 255]))
        doc.rect(cx, cy, w, rowHeight, 'F')
        doc.setDrawColor(...(cell.border || GRIS_BORDURE))
        doc.rect(cx, cy, w, rowHeight)
        doc.setFont('helvetica', cell.bold ? 'bold' : 'normal')
        doc.setTextColor(...(cell.color || [30, 30, 30]))
        const align = cell.align || 'left'
        const tx = align === 'center' ? cx + w / 2 : cx + 3
        cellLines[i].forEach((line, li) => doc.text(line, tx, cy + 5 + li * lineH, { align }))
        cx += w
      })
      cy += rowHeight
    })
    return cy
  }

  const titre = (texte) => {
    if (y + 10 > 282) { doc.addPage(); y = 15 }
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLEU_TEXTE)
    doc.text(texte, PDF_MARGE, y + 5)
    y += 9
  }

  // ── Bandeau ──
  doc.setFillColor(20, 83, 45)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('RAPPORT DE MATCH', 105, 14, { align: 'center' })
  y = 30

  // ── Équipe domicile / visiteuse, date, scores ──
  const nomNous = clubNom || 'Nous'
  const nomAdv = c.adversaire || 'Adversaire'
  const domicileNom = c.domicile ? nomNous : nomAdv
  const visiteurNom = c.domicile ? nomAdv : nomNous
  const w4 = PDF_LARGEUR_UTILE / 4
  y = drawTable(PDF_MARGE, y, [w4, w4, w4, w4], [[
    { text: 'Équipe Domicile', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
    { text: domicileNom, align: 'center' },
    { text: visiteurNom, align: 'center' },
    { text: 'Équipe visiteuse', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
  ]])
  y += 3
  y = drawTable(PDF_MARGE, y, [w4, w4 * 3], [[
    { text: 'DATE :', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
    { text: rapport.date_analyse ? new Date(rapport.date_analyse).toLocaleDateString('fr-FR') : '', align: 'center' },
  ]])
  y += 3
  y = drawTable(PDF_MARGE, y, [w4 * 1.5, w4, w4], [[
    { text: 'Score Mi-temps', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
    { text: String(c.score_mi_temps?.nous ?? ''), align: 'center' },
    { text: String(c.score_mi_temps?.eux ?? ''), align: 'center' },
  ]])
  y += 3
  y = drawTable(PDF_MARGE, y, [w4 * 1.5, w4, w4], [[
    { text: 'Score Fin de Match', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
    { text: String(c.score_nous ?? ''), align: 'center' },
    { text: String(c.score_eux ?? ''), align: 'center' },
  ]])
  y += 8

  // ── Composition de départ ──
  if (c.composition?.length) {
    titre('Composition de départ')
    const wCompo = [PDF_LARGEUR_UTILE * 0.2, PDF_LARGEUR_UTILE * 0.4, PDF_LARGEUR_UTILE * 0.4]
    const header = [{ text: 'Numéro', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true, align: 'center' }, { text: 'Nom', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true }, { text: 'Prénom', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true }]
    const rows = c.composition.map(j => [{ text: j.numero || '—', align: 'center' }, j.nom || '', j.prenom || ''])
    y = drawTable(PDF_MARGE, y, wCompo, [header, ...rows])
    y += 8
  }

  // ── Buts marqués / encaissés ──
  if (c.buts_marques?.length) {
    titre('Buts marqués')
    const w = [PDF_LARGEUR_UTILE * 0.12, PDF_LARGEUR_UTILE * 0.15, PDF_LARGEUR_UTILE * 0.73]
    const header = [{ text: 'N°', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true, align: 'center' }, { text: 'Minute', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true, align: 'center' }, { text: 'Description', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true }]
    const rows = c.buts_marques.map(b => [{ text: b.numero || '—', align: 'center' }, { text: b.minute || '—', align: 'center' }, b.description || ''])
    y = drawTable(PDF_MARGE, y, w, [header, ...rows])
    y += 8
  }

  if (c.buts_encaisses?.length) {
    titre('Buts encaissés')
    const w = [PDF_LARGEUR_UTILE * 0.15, PDF_LARGEUR_UTILE * 0.85]
    const header = [{ text: 'Min', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true, align: 'center' }, { text: 'Description', bg: ORANGE_BG, border: ORANGE_BORDURE, bold: true }]
    const rows = c.buts_encaisses.map(b => [{ text: b.minute || '—', align: 'center' }, b.description || ''])
    y = drawTable(PDF_MARGE, y, w, [header, ...rows])
    y += 8
  }

  // ── Cartons jaunes / rouges — côte à côte, même point de départ pour les
  //    deux colonnes ; la hauteur finale retenue est celle de la plus grande
  //    des deux tables (sinon la section suivante chevaucherait la plus haute).
  if (c.cartons_jaunes?.length || c.cartons_rouges?.length) {
    if (y + 10 > 282) { doc.addPage(); y = 15 }
    const wCarton = PDF_LARGEUR_UTILE / 2 - 3
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLEU_TEXTE)
    if (c.cartons_jaunes?.length) doc.text('Cartons jaunes', PDF_MARGE, y + 5)
    if (c.cartons_rouges?.length) doc.text('Cartons rouges', PDF_MARGE + wCarton + 6, y + 5)
    const yTables = y + 9
    let yFin = yTables
    if (c.cartons_jaunes?.length) {
      const yJaunes = drawTable(PDF_MARGE, yTables, [wCarton / 2, wCarton / 2], [
        [{ text: 'N°', bg: [255, 243, 176], bold: true, align: 'center' }, { text: 'Minute', bg: [255, 243, 176], bold: true, align: 'center' }],
        ...c.cartons_jaunes.map(ct => [{ text: ct.numero || '—', align: 'center' }, { text: ct.minute || '—', align: 'center' }]),
      ])
      yFin = Math.max(yFin, yJaunes)
    }
    if (c.cartons_rouges?.length) {
      const yRouges = drawTable(PDF_MARGE + wCarton + 6, yTables, [wCarton / 2, wCarton / 2], [
        [{ text: 'N°', bg: [255, 205, 205], bold: true, align: 'center' }, { text: 'Minute', bg: [255, 205, 205], bold: true, align: 'center' }],
        ...c.cartons_rouges.map(ct => [{ text: ct.numero || '—', align: 'center' }, { text: ct.minute || '—', align: 'center' }]),
      ])
      yFin = Math.max(yFin, yRouges)
    }
    y = yFin + 8
  }

  // ── Remplacements ──
  if (c.remplacements?.length) {
    titre('Remplacements')
    const w = [PDF_LARGEUR_UTILE]
    const rows = c.remplacements.map(r => [`N°${r.entrant || '__'} remplace le N°${r.sortant || '__'} à la ${r.minute || '__'}e`])
    y = drawTable(PDF_MARGE, y, w, rows)
    y += 8
  }

  // ── Analyse offensive / défensive — grille 2x2 colorée ──
  if (c.analyse && (c.analyse.offensif_positif || c.analyse.offensif_probleme || c.analyse.defensif_positif || c.analyse.defensif_probleme)) {
    titre('Analyse du match')
    const w4a = PDF_LARGEUR_UTILE / 4
    y = drawTable(PDF_MARGE, y, [w4a * 2, w4a * 2], [[
      { text: 'Sur le plan offensif', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
      { text: 'Sur le plan défensif', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
    ]])
    y = drawTable(PDF_MARGE, y, [w4a, w4a, w4a, w4a], [
      [
        { text: 'Points positifs', bg: VERT_BG, color: [255, 255, 255], bold: true, align: 'center' },
        { text: 'Problèmes rencontrés', bg: ROUGE_BG, color: [255, 255, 255], bold: true, align: 'center' },
        { text: 'Points positifs', bg: VERT_BG, color: [255, 255, 255], bold: true, align: 'center' },
        { text: 'Problèmes rencontrés', bg: ROUGE_BG, color: [255, 255, 255], bold: true, align: 'center' },
      ],
      [c.analyse.offensif_positif || '—', c.analyse.offensif_probleme || '—', c.analyse.defensif_positif || '—', c.analyse.defensif_probleme || '—'],
    ])
    y += 8
  }

  // ── Causerie avant-match ──
  if (c.causerie || c.causerie_supports) {
    titre('Causerie avant-match')
    const w2 = PDF_LARGEUR_UTILE / 2
    y = drawTable(PDF_MARGE, y, [w2, w2], [
      [
        { text: 'Plan de causerie et idées forces', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
        { text: 'Supports et méthodes', bg: BLEU_BG, border: BLEU_BORDURE, color: BLEU_TEXTE, bold: true, align: 'center' },
      ],
      [c.causerie || '—', c.causerie_supports || '—'],
    ])
  }

  doc.save(`rapport_match_${(c.adversaire || 'match').replace(/\s+/g, '_')}_${rapport.date_analyse || ''}.pdf`)
}
