import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha, fontSize, radius, spacing } from '../tokens'
import { saisonActuelle } from '../lib/saison'
import { localeOf } from '../lib/translations'
import { IconPaperclip, IconHealth } from './icones'
import Carte from './joueur/Carte'
import TitreSection from './joueur/TitreSection'
import TuileChiffre from './joueur/TuileChiffre'
import EmptyState from './EmptyState'

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

export default function SanteJoueur({ userId, estAffilie = true, isMobile = false, lang = 'fr', onNaviguer }) {
  const colors = useColors()
  const locale = localeOf(lang)
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
    pill: (color) => ({ background: color + alpha.soft, color, border: `1px solid ${color}${alpha.medium}`, borderRadius: radius.pill, padding: `3px ${spacing.lg}`, fontSize: fontSize.base, fontWeight: 700, whiteSpace: 'nowrap' }),
    btn: { background: colors.accent.orange, color: colors.black, border: 'none', borderRadius: radius.base, padding: `${spacing.base} ${spacing['3xl']}`, fontWeight: 700, cursor: 'pointer', fontSize: fontSize.lg, fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: radius.base, padding: `${spacing.md} ${spacing['2xl']}`, fontWeight: 600, cursor: 'pointer', fontSize: fontSize.lg, fontFamily: 'Inter, sans-serif' },
    label: { color: colors.text.faint, fontSize: fontSize.base, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.xs, display: 'block', fontWeight: 700 },
    input: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: radius.base, padding: `${spacing.base} ${spacing.lg}`, color: colors.text.primary, fontSize: fontSize.lg, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' },
    textarea: { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: radius.base, padding: `${spacing.base} ${spacing.lg}`, color: colors.text.primary, fontSize: fontSize.lg, fontFamily: 'Inter, sans-serif', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' },
    sousTitre: { color: colors.text.faint, fontSize: fontSize.base, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.base },
    lienDiscret: { background: 'transparent', border: 'none', fontSize: fontSize.md, cursor: 'pointer', fontFamily: 'Inter, sans-serif', padding: 0 },
  }
  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto' }
  const dateCourte = (d, opts) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, opts)

  if (loading) return <div style={{ ...cadre, color: colors.text.faint, fontSize: fontSize.lg, textAlign: 'center' }}>Chargement…</div>

  const enCours = blessures.filter(b => b.statut !== 'gueri')
  const gueries = blessures.length - enCours.length
  const peutDeclarer = estAffilie && !showFormBlessure

  return (
    <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing['2xl'], flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <h1 style={{ margin: 0, fontSize: fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>Santé</h1>
          <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.lg, color: colors.text.faint, lineHeight: 1.5 }}>
            Déclare une gêne ou une blessure : ton éducateur la voit tout de suite et suit ton retour avec toi.
          </p>
        </div>
        {peutDeclarer && blessures.length > 0 && <button style={s.btnGhost} onClick={() => setShowFormBlessure(true)}>Déclarer une blessure</button>}
      </div>

      {enCours.length > 0 && (
        <Carte isMobile={isMobile} accent={STATUT_META[enCours[0].statut]?.color}>
          <TitreSection couleur={STATUT_META[enCours[0].statut]?.color}>Ton état actuel</TitreSection>
          <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: fontSize['3xl'], marginBottom: spacing.xs }}>
            Tu es actuellement {STATUT_META[enCours[0].statut]?.label?.toLowerCase()}
          </div>
          <div style={{ color: colors.text.faint, fontSize: fontSize.lg }}>
            {enCours[0].type_blessure}{enCours[0].zone_corps && ` — ${enCours[0].zone_corps}`}
            {enCours[0].date_retour_estimee && ` · Retour estimé le ${dateCourte(enCours[0].date_retour_estimee)}`}
          </div>
        </Carte>
      )}

      {blessures.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? spacing.base : spacing.lg }}>
          <TuileChiffre isMobile={isMobile} valeur={blessures.length} libelle="Déclarées" />
          <TuileChiffre isMobile={isMobile} valeur={enCours.length} libelle="En cours" couleur={enCours.length > 0 ? colors.accent.orange : undefined} />
          <TuileChiffre isMobile={isMobile} valeur={gueries} libelle="Guéries" couleur={gueries > 0 ? colors.accent.green : undefined} />
        </div>
      )}

      {blessures.length > 0 && (
        <Carte isMobile={isMobile} style={{ display: 'flex', gap: spacing['3xl'], alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '110px', flexShrink: 0 }}>
            <CorpsHumain blessures={blessures} onZoneClick={(zoneId) => {
              const b = enCours.find(bl => bl.zone_corps === zoneId)
              if (b) ouvrirBlessure(b)
            }} />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <TitreSection style={{ marginBottom: spacing.md }}>Vue d'ensemble</TitreSection>
            {enCours.length > 0
              ? <div style={{ color: colors.text.secondary, fontSize: fontSize.lg, lineHeight: 1.5 }}>Touche une zone en orange pour voir le détail de la blessure.</div>
              : <div style={{ color: colors.accent.green, fontSize: fontSize.lg, fontWeight: 700 }}>Aucune zone touchée actuellement</div>}
          </div>
        </Carte>
      )}

      {showFormBlessure && (
        <Carte isMobile={isMobile}>
          <TitreSection couleur={colors.accent.orange}>Déclarer une blessure</TitreSection>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '110px 1fr', gap: spacing['2xl'] }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm }}>
              <CorpsHumain blessures={blessures} selectedZone={form.zone_corps} onZoneClick={zoneId => setForm(p => ({ ...p, zone_corps: zoneId }))} />
              <div style={{ color: colors.text.faint, fontSize: fontSize.sm, textAlign: 'center' }}>Touche pour choisir la zone</div>
            </div>
            <div>
              <div style={{ marginBottom: spacing.base }}>
                <label style={s.label}>Type de blessure</label>
                <input style={s.input} placeholder="ex : Entorse, Contracture, Douleur..."
                  value={form.type_blessure} onChange={e => setForm(p => ({ ...p, type_blessure: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.base, marginBottom: spacing.base }}>
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
              <div style={{ marginBottom: spacing.base }}>
                <label style={s.label}>Date d'apparition</label>
                <input type="date" style={s.input} value={form.date_debut} onChange={e => setForm(p => ({ ...p, date_debut: e.target.value }))} />
              </div>
              <div style={{ marginBottom: spacing.xl }}>
                <label style={s.label}>Description (optionnel)</label>
                <textarea style={s.textarea} placeholder="Décris comment c'est arrivé, dans quelles circonstances..."
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: spacing.md }}>
                <button style={{ ...s.btn, opacity: envoiEnCours ? 0.6 : 1 }} disabled={envoiEnCours} onClick={declarerBlessureJoueur}>Enregistrer</button>
                <button style={s.btnGhost} onClick={() => { setShowFormBlessure(false); setForm(FORM_VIDE) }}>Annuler</button>
              </div>
            </div>
          </div>
        </Carte>
      )}

      {blessures.length === 0 && !showFormBlessure && (
        <EmptyState
          icon={<IconHealth />}
          title={estAffilie ? 'Aucune blessure déclarée' : 'Ton suivi santé se débloque avec ton équipe'}
          subtitle={estAffilie
            ? "Une gêne au genou, une douleur après un match : dis-le ici. Ton éducateur est prévenu, fixe la date de reprise et peut te proposer un programme de rééducation. Tes rendez-vous médicaux se retrouvent aussi ici."
            : "Une fois dans une équipe, tu pourras déclarer une blessure ici, suivre ta rééducation et noter tes rendez-vous médicaux."}
          cta={estAffilie
            ? { label: 'Déclarer une blessure', onClick: () => setShowFormBlessure(true) }
            : (onNaviguer ? { label: 'Rejoindre mon équipe', onClick: () => onNaviguer('equipe') } : undefined)}
        />
      )}

      {blessures.map(b => {
        const meta = STATUT_META[b.statut] || STATUT_META.en_cours
        const estOuverte = ouverte === b.id
        const suivis = suivisParBlessure[b.id] || []
        const etapes = etapesParBlessure[b.id] || []
        const progression = etapes.length > 0 ? Math.round((etapes.filter(e => e.statut === 'validee').length / etapes.length) * 100) : 0
        return (
          <Carte key={b.id} isMobile={isMobile}>
            <div onClick={() => ouvrirBlessure(b)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.base }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.xl }}>{b.type_blessure}{b.zone_corps && ` — ${b.zone_corps}`}</div>
                <div style={{ color: colors.text.faint, fontSize: fontSize.md, marginTop: '2px' }}>
                  Depuis le {dateCourte(b.date_debut)} · Gravité {GRAVITE_LABELS[b.gravite] || b.gravite}
                </div>
              </div>
              <span style={s.pill(meta.color)}>{meta.label}</span>
            </div>

            {estOuverte && (
              <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: spacing.xl, paddingTop: spacing.xl }}>
                {b.notes && (
                  <p style={{ color: colors.text.secondary, fontSize: fontSize.lg, margin: `0 0 ${spacing.xl}`, lineHeight: 1.5 }}>{b.notes}</p>
                )}

                {/* Date de reprise — "Inconnue" laisse date_retour_estimee à
                    null (déjà le comportement par défaut), sinon une date
                    précise ; sauvegardée via joueur_maj_date_retour (RPC),
                    seule colonne que le joueur a le droit de modifier. */}
                <div style={{ marginBottom: spacing['2xl'] }}>
                  <label style={s.label}>Date de reprise</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.base, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, color: colors.text.secondary, fontSize: fontSize.lg, cursor: 'pointer' }}>
                      <input type="checkbox" checked={dateRetourEdit[b.id]?.inconnue ?? true}
                        onChange={e => setDateRetourEdit(prev => ({ ...prev, [b.id]: { ...prev[b.id], inconnue: e.target.checked } }))} />
                      Inconnue pour l'instant
                    </label>
                    {!dateRetourEdit[b.id]?.inconnue && (
                      <input type="date" style={{ ...s.input, width: 'auto' }} value={dateRetourEdit[b.id]?.date || ''}
                        onChange={e => setDateRetourEdit(prev => ({ ...prev, [b.id]: { ...prev[b.id], date: e.target.value } }))} />
                    )}
                    <button style={s.btnGhost} onClick={() => sauvegarderDateRetour(b.id)}>Enregistrer</button>
                  </div>
                </div>

                <div style={s.sousTitre}>Suivi médical</div>

                {suivis.filter(sv => sv.statut === 'prevu').length > 0 && (
                  <div style={{ marginBottom: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    {suivis.filter(sv => sv.statut === 'prevu').map(sv => (
                      <Carte key={sv.id} isMobile style={{ background: colors.background.raised, borderRadius: radius.xl }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }}>
                          <div>
                            <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.lg }}>
                              Rdv le {dateCourte(sv.date_consultation, { day: 'numeric', month: 'long' })}
                              {sv.heure_rdv && ` à ${sv.heure_rdv.slice(0, 5)}`}
                            </span>
                            {sv.specialiste && <span style={{ color: colors.accent.blue, fontSize: fontSize.md, marginLeft: spacing.md }}>{sv.specialiste}</span>}
                          </div>
                          <span style={s.pill(colors.accent.blue)}>Prévu</span>
                        </div>
                        {compteRenduOuvert === sv.id ? (
                          <div style={{ marginTop: spacing.base }}>
                            <textarea style={s.textarea} placeholder="Ce que le médecin/kiné a dit, exercices donnés..."
                              value={compteRenduTexte} onChange={e => setCompteRenduTexte(e.target.value)} />
                            <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
                              <button style={{ ...s.btn, opacity: envoiRdvEnCours ? 0.6 : 1 }} disabled={envoiRdvEnCours} onClick={() => soumettreCompteRendu(sv.id, b.id)}>Valider</button>
                              <button style={s.btnGhost} onClick={() => { setCompteRenduOuvert(null); setCompteRenduTexte('') }}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setCompteRenduOuvert(sv.id); setCompteRenduTexte('') }}
                            style={{ ...s.lienDiscret, color: colors.accent.green, marginTop: spacing.md }}>
                            + Ajouter le compte-rendu après le rdv
                          </button>
                        )}
                      </Carte>
                    ))}
                  </div>
                )}

                {formRdvOuvert === b.id ? (
                  <Carte isMobile style={{ border: `1px solid ${colors.border.default}`, marginBottom: spacing.lg }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: spacing.base, marginBottom: spacing.base }}>
                      <div>
                        <label style={s.label}>Date</label>
                        <input type="date" style={s.input} value={formRdv.date_consultation} onChange={e => setFormRdv(p => ({ ...p, date_consultation: e.target.value }))} />
                      </div>
                      <div>
                        <label style={s.label}>Heure (optionnel)</label>
                        <input type="time" style={s.input} value={formRdv.heure_rdv} onChange={e => setFormRdv(p => ({ ...p, heure_rdv: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: spacing.base }}>
                      <label style={s.label}>Spécialiste (optionnel)</label>
                      <input style={s.input} placeholder="ex : Kiné, Médecin du sport..." value={formRdv.specialiste} onChange={e => setFormRdv(p => ({ ...p, specialiste: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: spacing.md }}>
                      <button style={{ ...s.btn, opacity: envoiRdvEnCours ? 0.6 : 1 }} disabled={envoiRdvEnCours} onClick={() => programmerRdv(b.id)}>Programmer</button>
                      <button style={s.btnGhost} onClick={() => { setFormRdvOuvert(null); setFormRdv(RDV_VIDE) }}>Annuler</button>
                    </div>
                  </Carte>
                ) : (
                  <button onClick={() => { setFormRdvOuvert(b.id); setFormRdv(RDV_VIDE) }}
                    style={{ background: 'transparent', border: `1px dashed ${colors.border.default}`, color: colors.text.faint, borderRadius: radius.base, padding: `${spacing.md} ${spacing.xl}`, fontSize: fontSize.md, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: spacing.lg }}>
                    + Programmer un rendez-vous
                  </button>
                )}

                {suivis.filter(sv => sv.statut === 'effectue').length === 0 && suivis.filter(sv => sv.statut === 'prevu').length === 0 && (
                  <div style={{ color: colors.text.faint, fontSize: fontSize.lg }}>Aucun suivi médical enregistré</div>
                )}
                {suivis.filter(sv => sv.statut === 'effectue').map(sv => (
                  <div key={sv.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: spacing.base, marginTop: spacing.base }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm }}>
                      <div>
                        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.lg }}>
                          {dateCourte(sv.date_consultation, { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        {sv.specialiste && <span style={{ color: colors.accent.green, fontSize: fontSize.md, marginLeft: spacing.md }}>{sv.specialiste}</span>}
                      </div>
                      {sv.document_path && (
                        <button onClick={() => ouvrirDocument(sv.document_path)} style={{ ...s.lienDiscret, color: colors.accent.blue }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><IconPaperclip size={12} />{sv.document_nom || 'Document'}</span>
                        </button>
                      )}
                    </div>
                    {sv.compte_rendu && <p style={{ color: colors.text.secondary, fontSize: fontSize.lg, marginTop: spacing.sm, lineHeight: 1.5 }}>{sv.compte_rendu}</p>}
                  </div>
                ))}

                {etapes.length > 0 && (
                  <div style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: spacing['2xl'], paddingTop: spacing.xl }}>
                    <div style={s.sousTitre}>Ton programme de rééducation</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                      <span style={{ color: colors.text.secondary, fontSize: fontSize.md }}>Progression</span>
                      <span style={{ color: colors.accent.green, fontWeight: 700, fontSize: fontSize.md }}>{progression}%</span>
                    </div>
                    <div style={{ background: colors.background.raised, borderRadius: radius.md, height: '6px', marginBottom: spacing.xl }}>
                      <div style={{ background: colors.accent.green, width: `${progression}%`, height: '6px', borderRadius: radius.md }} />
                    </div>
                    {etapes.map((etape, idx) => {
                      const stMeta = STATUT_ETAPE_META[etape.statut] || STATUT_ETAPE_META.a_faire
                      return (
                        <div key={etape.id} style={{ display: 'flex', gap: spacing.base, alignItems: 'flex-start', marginBottom: spacing.base }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: radius.circle, flexShrink: 0,
                            background: etape.statut === 'validee' ? colors.accent.green : colors.background.raised,
                            color: etape.statut === 'validee' ? colors.black : colors.text.faint,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: fontSize.base,
                          }}>{idx + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
                              <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.lg }}>{etape.titre}</span>
                              <span style={{ color: stMeta.color, fontSize: fontSize.base, fontWeight: 600 }}>{stMeta.label}</span>
                            </div>
                            {etape.duree_estimee && <div style={{ color: colors.text.faint, fontSize: fontSize.base, marginTop: '2px' }}>{etape.duree_estimee}</div>}
                            {etape.description && <p style={{ color: colors.text.secondary, fontSize: fontSize.md, marginTop: spacing.xs, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{etape.description}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Carte>
        )
      })}
    </div>
  )
}
