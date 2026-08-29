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
  const [causerie, setCauserie] = useState('')

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
        setCauserie(c.causerie || '')
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
        causerie,
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

            {/* Causerie */}
            <div style={st.section}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>Plan de causerie et idées forces</p>
              <textarea rows={4} value={causerie} onChange={e => setCauserie(e.target.value)} placeholder="Système, consignes, points clés évoqués avant le match..." style={{ ...st.input, resize: 'vertical' }} />
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
export async function genererPDFMatch(rapport, clubNom) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = 20

  const addLine = (text, size = 11, bold = false, color = [0, 0, 0]) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text), 170)
    lines.forEach(line => {
      if (y > 275) { doc.addPage(); y = 20 }
      doc.text(line, 20, y)
      y += size * 0.5
    })
    y += 2
  }

  doc.setFillColor(20, 83, 45)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RAPPORT DE MATCH', 20, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Digital Football Academy', 20, 22)
  y = 40

  const c = rapport.contenu || {}
  addLine(`${clubNom || 'Nous'} ${c.score_nous ?? ''} - ${c.score_eux ?? ''} ${c.adversaire || ''}`, 14, true, [20, 83, 45])
  addLine(`${rapport.date_analyse ? new Date(rapport.date_analyse).toLocaleDateString('fr-FR') : ''} · ${c.domicile ? 'Domicile' : 'Extérieur'}`)
  y += 4

  if (c.composition?.length) {
    addLine('COMPOSITION DE DÉPART', 12, true, [20, 83, 45])
    c.composition.filter(j => j.titulaire).forEach(j => addLine(`${j.numero || '—'}  ${j.prenom} ${j.nom}`))
    y += 3
  }

  if (c.buts_marques?.length) {
    addLine('BUTS MARQUÉS', 12, true, [20, 83, 45])
    c.buts_marques.forEach(b => addLine(`[${b.minute || '?'}'] N°${b.numero || '?'} — ${b.description || ''}`))
    y += 3
  }

  if (c.buts_encaisses?.length) {
    addLine('BUTS ENCAISSÉS', 12, true, [20, 83, 45])
    c.buts_encaisses.forEach(b => addLine(`[${b.minute || '?'}'] ${b.description || ''}`))
    y += 3
  }

  if (c.cartons_jaunes?.length) {
    addLine('CARTONS JAUNES', 12, true, [20, 83, 45])
    c.cartons_jaunes.forEach(ct => addLine(`N°${ct.numero || '?'} — ${ct.minute || '?'}'`))
    y += 3
  }

  if (c.cartons_rouges?.length) {
    addLine('CARTONS ROUGES', 12, true, [20, 83, 45])
    c.cartons_rouges.forEach(ct => addLine(`N°${ct.numero || '?'} — ${ct.minute || '?'}'`))
    y += 3
  }

  if (c.remplacements?.length) {
    addLine('REMPLACEMENTS', 12, true, [20, 83, 45])
    c.remplacements.forEach(r => addLine(`N°${r.entrant || '?'} remplace N°${r.sortant || '?'} à la ${r.minute || '?'}'`))
    y += 3
  }

  if (c.analyse) {
    addLine('ANALYSE OFFENSIVE', 12, true, [20, 83, 45])
    if (c.analyse.offensif_positif) addLine(`Points positifs : ${c.analyse.offensif_positif}`)
    if (c.analyse.offensif_probleme) addLine(`Problèmes : ${c.analyse.offensif_probleme}`)
    y += 3
    addLine('ANALYSE DÉFENSIVE', 12, true, [20, 83, 45])
    if (c.analyse.defensif_positif) addLine(`Points positifs : ${c.analyse.defensif_positif}`)
    if (c.analyse.defensif_probleme) addLine(`Problèmes : ${c.analyse.defensif_probleme}`)
    y += 3
  }

  if (c.causerie) {
    addLine('CAUSERIE AVANT-MATCH', 12, true, [20, 83, 45])
    addLine(c.causerie)
  }

  doc.save(`rapport_match_${(c.adversaire || 'match').replace(/\s+/g, '_')}_${rapport.date_analyse || ''}.pdf`)
}
