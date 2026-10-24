import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { joursEntre, joursDuStage, formatJourCourt, euros, MODES_PAIEMENT } from '../../lib/stages'

// Onglet « Offres & tarifs » : jours du stage, offres définies par le club
// (forfait ou à la journée), formules repas (prix par jour), modes et
// instructions de paiement. Le club encaisse lui-même, hors ligne.

const OFFRE_VIDE = { nom: '', type: 'forfait', tousLesJours: true, nb_jours: 1, prix: '' }
const FORMULE_VIDE = { nom: '', prix_jour: '' }

export default function StageOffres({ st, colors, accent, stage, onMisAJour }) {
  const [offres, setOffres] = useState([])
  const [formules, setFormules] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let annule = false
    Promise.all([
      supabase.from('stages_offres').select('*').eq('stage_id', stage.id).order('ordre').order('prix'),
      supabase.from('stages_formules_repas').select('*').eq('stage_id', stage.id).order('ordre').order('prix_jour'),
    ]).then(([o, f]) => {
      if (annule) return
      if (o.error || f.error) setErreur('Chargement impossible : ' + (o.error || f.error).message)
      setOffres(o.data || [])
      setFormules(f.data || [])
      setChargement(false)
    })
    return () => { annule = true }
  }, [stage.id])

  if (chargement) return <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {erreur && <p style={st.erreur}>{erreur}</p>}
      <JoursStage st={st} colors={colors} accent={accent} stage={stage} onMisAJour={onMisAJour} />
      <Offres st={st} colors={colors} stage={stage} offres={offres} setOffres={setOffres} />
      <Formules st={st} colors={colors} stage={stage} formules={formules} setFormules={setFormules} />
      <Paiement st={st} colors={colors} accent={accent} stage={stage} onMisAJour={onMisAJour} />
    </div>
  )
}

function Section({ st, colors, titre, aide, children }) {
  return (
    <div style={st.carte}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: colors.text.primary }}>{titre}</p>
      {aide && <p style={{ margin: '4px 0 12px', fontSize: '12px', color: colors.text.faint }}>{aide}</p>}
      {children}
    </div>
  )
}

function JoursStage({ st, colors, accent, stage, onMisAJour }) {
  const tous = joursEntre(stage.date_debut, stage.date_fin)
  const [choisis, setChoisis] = useState(joursDuStage(stage))
  const [message, setMessage] = useState('')

  const basculer = (j) => setChoisis(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j].sort())
  const enregistrer = async () => {
    if (choisis.length === 0) return setMessage('Garde au moins un jour.')
    const jours = choisis.length === tous.length ? null : choisis
    const { data, error } = await supabase.from('stages').update({ jours }).eq('id', stage.id).select().single()
    if (error) return setMessage('Enregistrement impossible : ' + error.message)
    onMisAJour(data)
    setMessage('Jours enregistrés.')
  }

  return (
    <Section st={st} colors={colors} titre="Jours du stage" aide="Décoche les jours sans activité (week-end, jour férié). Les familles ne pourront choisir que les jours cochés.">
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tous.map(j => {
          const actif = choisis.includes(j)
          return (
            <button key={j} type="button" onClick={() => basculer(j)} style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
              background: actif ? accent + '20' : 'transparent', border: `1px solid ${actif ? accent : colors.border.default}`,
              color: actif ? accent : colors.text.faint, textDecoration: actif ? 'none' : 'line-through',
            }}>{formatJourCourt(j)}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
        <button onClick={enregistrer} style={st.bouton}>Enregistrer les jours</button>
        {message && <span style={{ fontSize: '12px', color: colors.text.dim }}>{message}</span>}
      </div>
    </Section>
  )
}

function Offres({ st, colors, stage, offres, setOffres }) {
  const [edition, setEdition] = useState(null)
  const [erreur, setErreur] = useState('')
  const nbJoursStage = joursDuStage(stage).length

  const enregistrer = async () => {
    const e = edition
    const prix = Number(String(e.prix).replace(',', '.'))
    if (!e.nom.trim()) return setErreur('Donne un nom à l\'offre (ex. « Semaine complète », « 3 jours »).')
    if (!(prix >= 0) || String(e.prix).trim() === '') return setErreur('Indique un prix (0 si gratuit).')
    const nb = parseInt(e.nb_jours, 10)
    if (e.type === 'forfait' && !e.tousLesJours && !(nb > 0)) return setErreur('Indique le nombre de jours du forfait.')
    if (e.type === 'forfait' && !e.tousLesJours && nb > nbJoursStage) return setErreur(`Le stage ne compte que ${nbJoursStage} jour(s).`)
    setErreur('')
    const valeurs = { nom: e.nom.trim(), type: e.type, prix, nb_jours: e.type === 'forfait' && !e.tousLesJours ? nb : null }
    const { data, error } = e.id
      ? await supabase.from('stages_offres').update(valeurs).eq('id', e.id).select().single()
      : await supabase.from('stages_offres').insert({ ...valeurs, stage_id: stage.id, ordre: offres.length }).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setOffres(prev => e.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data])
    setEdition(null)
  }

  const basculerActif = async (o) => {
    const { data, error } = await supabase.from('stages_offres').update({ actif: !o.actif }).eq('id', o.id).select().single()
    if (error) return setErreur(error.message)
    setOffres(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (o) => {
    if (!window.confirm(`Supprimer l'offre « ${o.nom} » ?`)) return
    const { error } = await supabase.from('stages_offres').delete().eq('id', o.id)
    if (error) return setErreur('Cette offre est déjà utilisée par des inscriptions : désactive-la plutôt.')
    setOffres(prev => prev.filter(x => x.id !== o.id))
  }

  return (
    <Section st={st} colors={colors} titre="Offres et tarifs" aide="Exemples : « Semaine complète » (forfait, tous les jours), « 3 jours » (forfait de 3 jours au choix), « À la journée » (prix par jour, jours libres).">
      {offres.length === 0 && !edition && <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#facc15' }}>Aucune offre : les familles ne peuvent pas encore s'inscrire.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {offres.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', opacity: o.actif ? 1 : 0.5, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{o.nom}{!o.actif && <span style={{ fontWeight: 400, color: colors.text.faint }}> · désactivée</span>}</div>
              <div style={{ fontSize: '12px', color: colors.text.dim }}>{o.type === 'journee' ? `${euros(o.prix)} par jour` : `${euros(o.prix)} · ${o.nb_jours ? `${o.nb_jours} jour(s) au choix` : 'tout le stage'}`}</div>
            </div>
            <button onClick={() => { setErreur(''); setEdition({ ...OFFRE_VIDE, ...o, tousLesJours: !o.nb_jours, nb_jours: o.nb_jours || 1, prix: String(o.prix) }) }} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Modifier</button>
            <button onClick={() => basculerActif(o)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>{o.actif ? 'Désactiver' : 'Réactiver'}</button>
            <button onClick={() => supprimer(o)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Supprimer</button>
          </div>
        ))}
      </div>

      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Nom de l'offre</label><input value={edition.nom} onChange={e => setEdition(p => ({ ...p, nom: e.target.value }))} style={st.input} placeholder="Semaine complète" /></div>
          <div>
            <label style={st.label}>Type</label>
            <select value={edition.type} onChange={e => setEdition(p => ({ ...p, type: e.target.value }))} style={st.input}>
              <option value="forfait">Forfait (prix total)</option>
              <option value="journee">À la journée (prix par jour)</option>
            </select>
          </div>
          {edition.type === 'forfait' && (
            <div>
              <label style={st.label}>Jours inclus</label>
              <select value={edition.tousLesJours ? 'tous' : 'choix'} onChange={e => setEdition(p => ({ ...p, tousLesJours: e.target.value === 'tous' }))} style={st.input}>
                <option value="tous">Tout le stage ({nbJoursStage} j)</option>
                <option value="choix">Nombre de jours au choix</option>
              </select>
            </div>
          )}
          {edition.type === 'forfait' && !edition.tousLesJours && (
            <div><label style={st.label}>Nombre de jours</label><input type="number" min="1" max={nbJoursStage} value={edition.nb_jours} onChange={e => setEdition(p => ({ ...p, nb_jours: e.target.value }))} style={st.input} /></div>
          )}
          <div><label style={st.label}>{edition.type === 'journee' ? 'Prix par jour (€)' : 'Prix total (€)'}</label><input type="number" min="0" step="0.01" value={edition.prix} onChange={e => setEdition(p => ({ ...p, prix: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer l'offre</button>
            <button onClick={() => { setEdition(null); setErreur('') }} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setErreur(''); setEdition({ ...OFFRE_VIDE }) }} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter une offre</button>
      )}
      {erreur && <p style={st.erreur}>{erreur}</p>}
    </Section>
  )
}

function Formules({ st, colors, stage, formules, setFormules }) {
  const [edition, setEdition] = useState(null)
  const [erreur, setErreur] = useState('')

  const enregistrer = async () => {
    const prix = Number(String(edition.prix_jour).replace(',', '.'))
    if (!edition.nom.trim()) return setErreur('Donne un nom à la formule (ex. « Réfectoire », « Pique-nique »).')
    if (!(prix >= 0) || String(edition.prix_jour).trim() === '') return setErreur('Indique un prix par jour (0 si apporté par la famille).')
    setErreur('')
    const valeurs = { nom: edition.nom.trim(), prix_jour: prix }
    const { data, error } = edition.id
      ? await supabase.from('stages_formules_repas').update(valeurs).eq('id', edition.id).select().single()
      : await supabase.from('stages_formules_repas').insert({ ...valeurs, stage_id: stage.id, ordre: formules.length }).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setFormules(prev => edition.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data])
    setEdition(null)
  }
  const basculerActif = async (f) => {
    const { data, error } = await supabase.from('stages_formules_repas').update({ actif: !f.actif }).eq('id', f.id).select().single()
    if (error) return setErreur(error.message)
    setFormules(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (f) => {
    if (!window.confirm(`Supprimer la formule « ${f.nom} » ?`)) return
    const { error } = await supabase.from('stages_formules_repas').delete().eq('id', f.id)
    if (error) return setErreur('Cette formule est déjà utilisée par des inscriptions : désactive-la plutôt.')
    setFormules(prev => prev.filter(x => x.id !== f.id))
  }

  return (
    <Section st={st} colors={colors} titre="Formules repas" aide="Prix par jour, ajouté automatiquement pour chaque jour choisi. Sans formule, aucun choix de repas n'est demandé aux familles.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {formules.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.raised, borderRadius: '10px', padding: '10px 12px', opacity: f.actif ? 1 : 0.5, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{f.nom}{!f.actif && <span style={{ fontWeight: 400, color: colors.text.faint }}> · désactivée</span>}</div>
              <div style={{ fontSize: '12px', color: colors.text.dim }}>{Number(f.prix_jour) > 0 ? `${euros(f.prix_jour)} par jour` : 'Sans supplément'}</div>
            </div>
            <button onClick={() => { setErreur(''); setEdition({ ...f, prix_jour: String(f.prix_jour) }) }} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>Modifier</button>
            <button onClick={() => basculerActif(f)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px' }}>{f.actif ? 'Désactiver' : 'Réactiver'}</button>
            <button onClick={() => supprimer(f)} style={{ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', color: '#f87171' }}>Supprimer</button>
          </div>
        ))}
      </div>
      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div><label style={st.label}>Nom</label><input value={edition.nom} onChange={e => setEdition(p => ({ ...p, nom: e.target.value }))} style={st.input} placeholder="Réfectoire" /></div>
          <div><label style={st.label}>Prix par jour (€)</label><input type="number" min="0" step="0.01" value={edition.prix_jour} onChange={e => setEdition(p => ({ ...p, prix_jour: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer la formule</button>
            <button onClick={() => { setEdition(null); setErreur('') }} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setErreur(''); setEdition({ ...FORMULE_VIDE }) }} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter une formule</button>
      )}
      {erreur && <p style={st.erreur}>{erreur}</p>}
    </Section>
  )
}

function Paiement({ st, colors, accent, stage, onMisAJour }) {
  const [modes, setModes] = useState(stage.modes_paiement || ['virement', 'cheque', 'especes'])
  const [instructions, setInstructions] = useState(stage.instructions_paiement || '')
  const [message, setMessage] = useState('')

  const enregistrer = async () => {
    if (modes.length === 0) return setMessage('Garde au moins un mode de paiement.')
    const { data, error } = await supabase.from('stages').update({ modes_paiement: modes, instructions_paiement: instructions.trim() || null }).eq('id', stage.id).select().single()
    if (error) return setMessage('Enregistrement impossible : ' + error.message)
    onMisAJour(data)
    setMessage('Paiement enregistré.')
  }

  return (
    <Section st={st} colors={colors} titre="Paiement" aide="Le club encaisse lui-même. Ces informations sont affichées aux familles après leur inscription.">
      <label style={st.label}>Modes acceptés</label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {Object.entries(MODES_PAIEMENT).map(([id, label]) => {
          const actif = modes.includes(id)
          return (
            <button key={id} type="button" onClick={() => setModes(prev => actif ? prev.filter(x => x !== id) : [...prev, id])} style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: actif ? accent + '20' : 'transparent', border: `1px solid ${actif ? accent : colors.border.default}`, color: actif ? accent : colors.text.faint,
            }}>{label}</button>
          )
        })}
      </div>
      <label style={st.label}>Instructions pour les familles</label>
      <textarea rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} style={{ ...st.input, resize: 'vertical' }}
        placeholder={'Virement : IBAN FR76 …, en indiquant la référence d\'inscription\nChèque à l\'ordre de : …\nEspèces : à l\'accueil le premier jour'} />
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
        <button onClick={enregistrer} style={st.bouton}>Enregistrer</button>
        {message && <span style={{ fontSize: '12px', color: colors.text.dim }}>{message}</span>}
      </div>
    </Section>
  )
}
