import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'
import { saisonActuelle } from '../lib/saison'

const STATUT_META_KEYS = {
  en_cours: 'En cours',
  en_soin: 'En soin',
  retour_prog: 'Retour programmé',
  gueri: 'Guéri',
}

const GRAVITE_LABELS = { legere: 'Légère', moderee: 'Modérée', grave: 'Grave' }

const STATUT_ETAPE_KEYS = { a_faire: 'À faire', en_cours: 'En cours', validee: 'Validée' }

const ZONES_CORPS = [
  'Cheville gauche', 'Cheville droite', 'Genou gauche', 'Genou droit',
  'Cuisse gauche', 'Cuisse droite', 'Aine gauche', 'Aine droite',
  'Mollet gauche', 'Mollet droit', 'Dos', 'Épaule gauche', 'Épaule droite',
  'Côtes', 'Tête / Commotion', 'Autre',
]

const FORM_VIDE = { type_blessure: '', zone_corps: '', gravite: 'legere', date_debut: new Date().toISOString().slice(0, 10), notes: '' }

// Section Santé, Dashboard Joueur — mêmes tables que côté éducateur
// (blessures/suivi_medical/reeducation_etapes), la RLS scope automatiquement
// aux blessures du joueur connecté (via affiliations) ou de son enfant s'il
// est parent, donc la lecture ne passe explicitement aucun identifiant. Le
// joueur peut en plus déclarer lui-même une blessure (auto-déclaration) :
// elle remonte aussitôt côté éducateur (Mon équipe → Santé), qui reste seul
// responsable des dates de retour, du suivi médical et de la rééducation.
const RDV_VIDE = { date_consultation: '', heure_rdv: '', specialiste: '' }

// Schéma corps humain — sélecteur/aperçu visuel de zone_corps, un id par
// valeur de ZONES_CORPS (texte libre partagé avec le <select> ci-dessous).
// Pas de bras/pieds dessinés : aucune valeur de ZONES_CORPS n'y correspond.
const BODY_ZONES = [
  { id: 'Tête / Commotion', shape: 'circle', cx: 80, cy: 26, r: 18 },
  { id: 'Épaule gauche', shape: 'ellipse', cx: 50, cy: 58, rx: 14, ry: 10 },
  { id: 'Épaule droite', shape: 'ellipse', cx: 110, cy: 58, rx: 14, ry: 10 },
  { id: 'Côtes', shape: 'rect', x: 58, y: 50, w: 44, h: 42, rx: 6 },
  { id: 'Dos', shape: 'rect', x: 60, y: 94, w: 40, h: 34, rx: 6 },
  { id: 'Aine gauche', shape: 'rect', x: 59, y: 130, w: 20, h: 20, rx: 4 },
  { id: 'Aine droite', shape: 'rect', x: 81, y: 130, w: 20, h: 20, rx: 4 },
  { id: 'Cuisse gauche', shape: 'rect', x: 57, y: 152, w: 22, h: 58, rx: 6 },
  { id: 'Cuisse droite', shape: 'rect', x: 81, y: 152, w: 22, h: 58, rx: 6 },
  { id: 'Genou gauche', shape: 'ellipse', cx: 68, cy: 216, rx: 12, ry: 8 },
  { id: 'Genou droit', shape: 'ellipse', cx: 92, cy: 216, rx: 12, ry: 8 },
  { id: 'Mollet gauche', shape: 'rect', x: 57, y: 226, w: 22, h: 54, rx: 6 },
  { id: 'Mollet droit', shape: 'rect', x: 81, y: 226, w: 22, h: 54, rx: 6 },
  { id: 'Cheville gauche', shape: 'ellipse', cx: 68, cy: 286, rx: 11, ry: 7 },
  { id: 'Cheville droite', shape: 'ellipse', cx: 92, cy: 286, rx: 11, ry: 7 },
]

function CorpsHumain({ blessures = [], onZoneClick, selectedZone }) {
  const colors = useColors()
  const zonesBlessees = new Set(blessures.filter(b => b.statut !== 'gueri').map(b => b.zone_corps))

  const zoneStyle = (id) => {
    if (selectedZone === id) return { fill: colors.accent.blue + alpha.soft, stroke: colors.accent.blue }
    if (zonesBlessees.has(id)) return { fill: colors.accent.orange + alpha.medium, stroke: colors.accent.orange }
    return { fill: colors.background.raised, stroke: colors.border.subtle }
  }

  return (
    <svg viewBox="0 0 160 300" style={{ width: '100%', maxWidth: '150px', display: 'block' }}>
      {BODY_ZONES.map(z => {
        const { fill, stroke } = zoneStyle(z.id)
        const common = { fill, stroke, strokeWidth: 1.2, cursor: onZoneClick ? 'pointer' : 'default', onClick: () => onZoneClick?.(z.id) }
        if (z.shape === 'circle') return <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r} {...common} />
        if (z.shape === 'ellipse') return <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} {...common} />
        return <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={z.rx} {...common} />
      })}
    </svg>
  )
}

export default function SanteJoueur({ userId }) {
  const colors = useColors()
  const [blessures, setBlessures] = useState([])
  const [suivisParBlessure, setSuivisParBlessure] = useState({})
  const [etapesParBlessure, setEtapesParBlessure] = useState({})
  const [ouverte, setOuverte] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFormBlessure, setShowFormBlessure] = useState(false)
  const [form, setForm] = useState(FORM_VIDE)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  // Rendez-vous médicaux (suivi_medical statut='prevu' = à venir, 'effectue'
  // = passé + compte-rendu rempli) — le joueur peut programmer un rdv et,
  // une fois passé, y ajouter le compte-rendu de son côté.
  const [formRdvOuvert, setFormRdvOuvert] = useState(null) // blessure_id du formulaire "+ Programmer un rdv" ouvert
  const [formRdv, setFormRdv] = useState(RDV_VIDE)
  const [envoiRdvEnCours, setEnvoiRdvEnCours] = useState(false)
  const [compteRenduOuvert, setCompteRenduOuvert] = useState(null) // id du suivi_medical en cours de complétion
  const [compteRenduTexte, setCompteRenduTexte] = useState('')
  const [dateRetourEdit, setDateRetourEdit] = useState({}) // { [blessure_id]: { inconnue, date } } — brouillon local avant sauvegarde

  const STATUT_META = {
    en_cours: { label: STATUT_META_KEYS.en_cours, color: colors.accent.orange },
    en_soin: { label: STATUT_META_KEYS.en_soin, color: colors.accent.amber },
    retour_prog: { label: STATUT_META_KEYS.retour_prog, color: colors.accent.blue },
    gueri: { label: STATUT_META_KEYS.gueri, color: colors.accent.green },
  }
  const STATUT_ETAPE_META = {
    a_faire: { label: STATUT_ETAPE_KEYS.a_faire, color: colors.text.disabled },
    en_cours: { label: STATUT_ETAPE_KEYS.en_cours, color: colors.accent.orange },
    validee: { label: STATUT_ETAPE_KEYS.validee, color: colors.accent.green },
  }

  const chargerBlessures = async () => {
    const { data } = await supabase.from('blessures').select('*').order('date_debut', { ascending: false })
    setBlessures(data || [])
  }

  useEffect(() => {
    (async () => {
      await chargerBlessures()
      setLoading(false)
    })()
  }, [])

  // L'affiliation acceptée du joueur porte déjà equipe_joueur_id et
  // educateur_id (cf. RLS blessures/joueur_declare_blessure) — même source
  // que toutes les autres écritures par joueur de ce projet.
  const declarerBlessureJoueur = async () => {
    if (!form.type_blessure.trim()) { alert('Merci de renseigner le type de blessure.'); return }
    if (!form.date_debut) { alert('Merci de renseigner la date d\'apparition.'); return }
    setEnvoiEnCours(true)
    const { data: affiliation } = await supabase.from('affiliations').select('equipe_joueur_id, educateur_id').eq('joueur_id', userId).eq('statut', 'accepte').maybeSingle()
    if (!affiliation) {
      setEnvoiEnCours(false)
      alert("Tu n'es affilié à aucun éducateur pour l'instant.")
      return
    }
    const { error } = await supabase.from('blessures').insert({
      equipe_joueur_id: affiliation.equipe_joueur_id,
      educateur_id: affiliation.educateur_id,
      type_blessure: form.type_blessure,
      zone_corps: form.zone_corps || null,
      gravite: form.gravite,
      date_debut: form.date_debut,
      notes: form.notes || null,
      saison: saisonActuelle(),
    })
    setEnvoiEnCours(false)
    if (error) { console.error('declarerBlessureJoueur error:', error); alert('Erreur : ' + error.message); return }
    setShowFormBlessure(false)
    setForm(FORM_VIDE)
    chargerBlessures()
  }

  const chargerSuivis = async (blessureId) => {
    const { data } = await supabase.from('suivi_medical').select('*').eq('blessure_id', blessureId).order('date_consultation', { ascending: false })
    setSuivisParBlessure(prev => ({ ...prev, [blessureId]: data || [] }))
  }

  const ouvrirBlessure = async (b) => {
    if (ouverte === b.id) { setOuverte(null); return }
    setOuverte(b.id)
    setDateRetourEdit(prev => ({ ...prev, [b.id]: prev[b.id] || { inconnue: !b.date_retour_estimee, date: b.date_retour_estimee || '' } }))
    if (!suivisParBlessure[b.id]) await chargerSuivis(b.id)
    if (!etapesParBlessure[b.id]) {
      const { data } = await supabase.from('reeducation_etapes').select('*').eq('blessure_id', b.id).order('ordre')
      setEtapesParBlessure(prev => ({ ...prev, [b.id]: data || [] }))
    }
  }

  const ouvrirDocument = async (path) => {
    const { data, error } = await supabase.storage.from('documents-medicaux').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) { alert("Impossible d'ouvrir ce document."); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const programmerRdv = async (blessureId) => {
    if (!formRdv.date_consultation) { alert('Merci de renseigner une date.'); return }
    setEnvoiRdvEnCours(true)
    const { error } = await supabase.from('suivi_medical').insert({
      blessure_id: blessureId,
      auteur_id: userId,
      date_consultation: formRdv.date_consultation,
      heure_rdv: formRdv.heure_rdv || null,
      specialiste: formRdv.specialiste || null,
      statut: 'prevu',
    })
    setEnvoiRdvEnCours(false)
    if (error) { console.error('programmerRdv error:', error); alert('Erreur : ' + error.message); return }
    setFormRdvOuvert(null)
    setFormRdv(RDV_VIDE)
    chargerSuivis(blessureId)
  }

  const soumettreCompteRendu = async (suiviId, blessureId) => {
    setEnvoiRdvEnCours(true)
    const { error } = await supabase.from('suivi_medical')
      .update({ compte_rendu: compteRenduTexte.trim() || null, statut: 'effectue' })
      .eq('id', suiviId)
    setEnvoiRdvEnCours(false)
    if (error) { console.error('soumettreCompteRendu error:', error); alert('Erreur : ' + error.message); return }
    setCompteRenduOuvert(null)
    setCompteRenduTexte('')
    chargerSuivis(blessureId)
  }

  const sauvegarderDateRetour = async (blessureId) => {
    const edit = dateRetourEdit[blessureId]
    const { error } = await supabase.rpc('joueur_maj_date_retour', {
      p_blessure_id: blessureId,
      p_date: edit.inconnue ? null : (edit.date || null),
    })
    if (error) { console.error('sauvegarderDateRetour error:', error); alert('Erreur : ' + error.message); return }
    setBlessures(prev => prev.map(b => b.id === blessureId ? { ...b, date_retour_estimee: edit.inconnue ? null : edit.date } : b))
  }

  const s = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '12px' },
    pill: (color) => ({ background: color + alpha.soft, color, border: `1px solid ${color}${alpha.medium}`, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }),
    btn: { background: colors.accent.orange, color: colors.black, border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    label: { color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block', fontWeight: 700 },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
    textarea: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' },
  }

  if (loading) return <div style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Chargement…</div>

  const enCours = blessures.filter(b => b.statut !== 'gueri')

  return (
    <div>
      {enCours.length > 0 && (
        <div style={{ ...s.card, borderLeft: `3px solid ${STATUT_META[enCours[0].statut]?.color}`, marginBottom: '20px' }}>
          <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
            Tu es actuellement {STATUT_META[enCours[0].statut]?.label?.toLowerCase()}
          </div>
          <div style={{ color: colors.text.faint, fontSize: '13px' }}>
            {enCours[0].type_blessure}{enCours[0].zone_corps && ` — ${enCours[0].zone_corps}`}
            {enCours[0].date_retour_estimee && ` · Retour estimé le ${new Date(`${enCours[0].date_retour_estimee}T12:00:00`).toLocaleDateString('fr-FR')}`}
          </div>
        </div>
      )}

      {blessures.length > 0 && (
        <div style={{ ...s.card, display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '110px', flexShrink: 0 }}>
            <CorpsHumain blessures={blessures} onZoneClick={(zoneId) => {
              const b = enCours.find(bl => bl.zone_corps === zoneId)
              if (b) ouvrirBlessure(b)
            }} />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={s.label}>Vue d'ensemble</div>
            {enCours.length > 0
              ? <div style={{ color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>Clique sur une zone en orange pour voir le détail de la blessure.</div>
              : <div style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 700 }}>Aucune zone touchée actuellement</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        {!showFormBlessure && <button style={s.btnGhost} onClick={() => setShowFormBlessure(true)}>+ Déclarer une blessure</button>}
      </div>

      {showFormBlessure && (
        <div style={{ ...s.card, border: `1px solid ${colors.border.default}` }}>
          <div style={{ color: colors.accent.orange, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>DÉCLARER UNE BLESSURE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <CorpsHumain blessures={blessures} selectedZone={form.zone_corps} onZoneClick={zoneId => setForm(p => ({ ...p, zone_corps: zoneId }))} />
              <div style={{ color: colors.text.faint, fontSize: '10px', textAlign: 'center' }}>Clique pour choisir la zone</div>
            </div>
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={s.label}>Type de blessure</label>
                <input style={s.input} placeholder="ex : Entorse, Contracture, Douleur..."
                  value={form.type_blessure} onChange={e => setForm(p => ({ ...p, type_blessure: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={s.label}>Zone du corps</label>
                  <select style={s.input} value={form.zone_corps} onChange={e => setForm(p => ({ ...p, zone_corps: e.target.value }))}>
                    <option value="">Choisir…</option>
                    {ZONES_CORPS.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Ressenti</label>
                  <select style={s.input} value={form.gravite} onChange={e => setForm(p => ({ ...p, gravite: e.target.value }))}>
                    <option value="legere">Légère gêne</option>
                    <option value="moderee">Douleur modérée</option>
                    <option value="grave">Douleur forte</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={s.label}>Date d'apparition</label>
                <input type="date" style={s.input} value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={s.label}>Description (optionnel)</label>
                <textarea style={s.textarea} placeholder="Décris comment c'est arrivé, dans quelles circonstances..."
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={declarerBlessureJoueur}>Enregistrer</button>
                <button style={s.btnGhost} onClick={() => { setShowFormBlessure(false); setForm(FORM_VIDE) }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {blessures.length === 0 ? (
        <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Aucune blessure enregistrée</div>
      ) : blessures.map(b => {
        const meta = STATUT_META[b.statut] || STATUT_META.en_cours
        const estOuverte = ouverte === b.id
        const suivis = suivisParBlessure[b.id] || []
        const etapes = etapesParBlessure[b.id] || []
        const progression = etapes.length > 0 ? Math.round((etapes.filter(e => e.statut === 'validee').length / etapes.length) * 100) : 0
        return (
          <div key={b.id} style={s.card}>
            <div onClick={() => ouvrirBlessure(b)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px' }}>{b.type_blessure}{b.zone_corps && ` — ${b.zone_corps}`}</div>
                <div style={{ color: colors.text.faint, fontSize: '12px', marginTop: '2px' }}>
                  Depuis le {new Date(`${b.date_debut}T12:00:00`).toLocaleDateString('fr-FR')} · Gravité {GRAVITE_LABELS[b.gravite] || b.gravite}
                </div>
              </div>
              <span style={s.pill(meta.color)}>{meta.label}</span>
            </div>

            {estOuverte && (
              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: '14px', paddingTop: '14px' }}>
                {b.notes && (
                  <p style={{ color: colors.text.secondary, fontSize: '13px', margin: '0 0 14px', lineHeight: 1.5 }}>{b.notes}</p>
                )}

                {/* Date de reprise — "Inconnue" laisse date_retour_estimee à
                    null (déjà le comportement par défaut), sinon une date
                    précise ; sauvegardée via joueur_maj_date_retour (RPC),
                    seule colonne que le joueur a le droit de modifier. */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={s.label}>Date de reprise</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.text.secondary, fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={dateRetourEdit[b.id]?.inconnue ?? true}
                        onChange={e => setDateRetourEdit(prev => ({ ...prev, [b.id]: { ...prev[b.id], inconnue: e.target.checked } }))} />
                      Inconnue pour l'instant
                    </label>
                    {!dateRetourEdit[b.id]?.inconnue && (
                      <input type="date" style={{ ...s.input, width: 'auto' }} value={dateRetourEdit[b.id]?.date || ''}
                        onChange={e => setDateRetourEdit(prev => ({ ...prev, [b.id]: { ...prev[b.id], date: e.target.value } }))} />
                    )}
                    <button style={{ ...s.btnGhost, padding: '7px 14px' }} onClick={() => sauvegarderDateRetour(b.id)}>Enregistrer</button>
                  </div>
                </div>

                <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Suivi médical</div>

                {suivis.filter(sv => sv.statut === 'prevu').length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {suivis.filter(sv => sv.statut === 'prevu').map(sv => (
                      <div key={sv.id} style={{ ...s.card, background: colors.background.raised, marginBottom: '8px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <div>
                            <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>
                              Rdv le {new Date(`${sv.date_consultation}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                              {sv.heure_rdv && ` à ${sv.heure_rdv.slice(0, 5)}`}
                            </span>
                            {sv.specialiste && <span style={{ color: colors.accent.blue, fontSize: '12px', marginLeft: '8px' }}>{sv.specialiste}</span>}
                          </div>
                          <span style={s.pill(colors.accent.blue)}>Prévu</span>
                        </div>
                        {compteRenduOuvert === sv.id ? (
                          <div style={{ marginTop: '10px' }}>
                            <textarea style={s.textarea} placeholder="Ce que le médecin/kiné a dit, exercices donnés..."
                              value={compteRenduTexte} onChange={e => setCompteRenduTexte(e.target.value)} />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button style={{ ...s.btn, opacity: envoiRdvEnCours ? 0.6 : 1 }} disabled={envoiRdvEnCours} onClick={() => soumettreCompteRendu(sv.id, b.id)}>Valider</button>
                              <button style={s.btnGhost} onClick={() => { setCompteRenduOuvert(null); setCompteRenduTexte('') }}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setCompteRenduOuvert(sv.id); setCompteRenduTexte('') }}
                            style={{ background: 'transparent', border: 'none', color: colors.accent.green, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0, marginTop: '8px' }}>
                            + Ajouter le compte-rendu après le rdv
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {formRdvOuvert === b.id ? (
                  <div style={{ ...s.card, border: `1px solid ${colors.border.default}`, marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={s.label}>Date</label>
                        <input type="date" style={s.input} value={formRdv.date_consultation} onChange={e => setFormRdv(p => ({ ...p, date_consultation: e.target.value }))} />
                      </div>
                      <div>
                        <label style={s.label}>Heure (optionnel)</label>
                        <input type="time" style={s.input} value={formRdv.heure_rdv} onChange={e => setFormRdv(p => ({ ...p, heure_rdv: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={s.label}>Spécialiste (optionnel)</label>
                      <input style={s.input} placeholder="ex : Kiné, Médecin du sport..." value={formRdv.specialiste} onChange={e => setFormRdv(p => ({ ...p, specialiste: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ ...s.btn, opacity: envoiRdvEnCours ? 0.6 : 1 }} disabled={envoiRdvEnCours} onClick={() => programmerRdv(b.id)}>Programmer</button>
                      <button style={s.btnGhost} onClick={() => { setFormRdvOuvert(null); setFormRdv(RDV_VIDE) }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setFormRdvOuvert(b.id); setFormRdv(RDV_VIDE) }}
                    style={{ background: 'transparent', border: `1px dashed ${colors.border.default}`, color: colors.text.faint, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}>
                    + Programmer un rendez-vous
                  </button>
                )}

                {suivis.filter(sv => sv.statut === 'effectue').length === 0 && suivis.filter(sv => sv.statut === 'prevu').length === 0 && (
                  <div style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucun suivi médical enregistré</div>
                )}
                {suivis.filter(sv => sv.statut === 'effectue').map(sv => (
                  <div key={sv.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>
                          {new Date(`${sv.date_consultation}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {sv.specialiste && <span style={{ color: colors.accent.green, fontSize: '12px', marginLeft: '8px' }}>{sv.specialiste}</span>}
                      </div>
                      {sv.document_path && (
                        <button onClick={() => ouvrirDocument(sv.document_path)} style={{ background: 'transparent', border: 'none', color: colors.accent.blue, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 }}>
                          📎 {sv.document_nom || 'Document'}
                        </button>
                      )}
                    </div>
                    {sv.compte_rendu && <p style={{ color: colors.text.secondary, fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>{sv.compte_rendu}</p>}
                  </div>
                ))}

                {etapes.length > 0 && (
                  <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: '16px', paddingTop: '14px' }}>
                    <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Ton programme de rééducation</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: colors.text.secondary, fontSize: '12px' }}>Progression</span>
                      <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: '12px' }}>{progression}%</span>
                    </div>
                    <div style={{ background: colors.background.raised, borderRadius: '4px', height: '6px', marginBottom: '14px' }}>
                      <div style={{ background: colors.accent.green, width: `${progression}%`, height: '6px', borderRadius: '4px' }} />
                    </div>
                    {etapes.map((etape, idx) => {
                      const stMeta = STATUT_ETAPE_META[etape.statut] || STATUT_ETAPE_META.a_faire
                      return (
                        <div key={etape.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                            background: etape.statut === 'validee' ? colors.accent.green : colors.background.raised,
                            color: etape.statut === 'validee' ? colors.black : colors.text.faint,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px',
                          }}>{idx + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{etape.titre}</span>
                              <span style={{ color: stMeta.color, fontSize: '11px', fontWeight: 600 }}>{stMeta.label}</span>
                            </div>
                            {etape.duree_estimee && <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '2px' }}>{etape.duree_estimee}</div>}
                            {etape.description && <p style={{ color: colors.text.secondary, fontSize: '12px', marginTop: '4px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{etape.description}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
