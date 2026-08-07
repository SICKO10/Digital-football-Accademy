import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { repartirBus } from '../lib/repartitionBus'

const NATURES = [
  { val: 'match', label: '⚽ Match', emoji: '⚽' },
  { val: 'tournoi', label: '🏆 Tournoi', emoji: '🏆' },
  { val: 'stage', label: '🏕️ Stage', emoji: '🏕️' },
  { val: 'autre', label: '📦 Autre', emoji: '📦' },
]

const formVide = () => ({
  equipe: '', educateur_responsable: '', date_depart: '', heure_depart: '',
  heure_retour_estimee: '', nb_personnes: '',
  lieu_destination: '', nature: 'match', vehicule: '', conducteur: '',
  km_avant: '', gasoil_avant: '',
})

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
}

const natureInfo = (val) => NATURES.find(n => n.val === val) || NATURES[3]

const grouperParMois = (deplacements) => {
  const groupes = {}
  ;[...deplacements].sort((a, b) => a.date_depart.localeCompare(b.date_depart)).forEach(d => {
    const cle = d.date_depart.slice(0, 7) // AAAA-MM, pour trier les mois correctement
    if (!groupes[cle]) groupes[cle] = []
    groupes[cle].push(d)
  })
  return groupes
}

const grouperParSemaine = (deplacements) => {
  const groupes = {}
  deplacements.forEach(d => {
    const date = new Date(d.date_depart + 'T12:00:00')
    const lundi = new Date(date)
    lundi.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    const dimanche = new Date(lundi)
    dimanche.setDate(lundi.getDate() + 6)
    const label = `${lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
    if (!groupes[label]) groupes[label] = []
    groupes[label].push(d)
  })
  return groupes
}

export default function Deplacements({ clubId, accentColor = '#4ade80', readOnly = false }) {
  const [deplacements, setDeplacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [equipesOptions, setEquipesOptions] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(formVide)
  const [saving, setSaving] = useState(false)
  const [deplacementEnEdition, setDeplacementEnEdition] = useState(null) // id du déplacement en cours d'édition, ou null si création
  const [retourEdits, setRetourEdits] = useState({}) // { [id]: { km_apres, gasoil_apres } }
  const [savingRetour, setSavingRetour] = useState({}) // { [id]: bool }
  const [assignationBusOuverte, setAssignationBusOuverte] = useState(null)
  const [savingAssignation, setSavingAssignation] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [semaineOuverte, setSemaineOuverte] = useState({}) // { 'AAAA-MM_semaine-label': true }
  const [alertesLocation, setAlertesLocation] = useState([])
  const [repartitionAutoEnCours, setRepartitionAutoEnCours] = useState(false)
  const [recuperationMatchsEnCours, setRecuperationMatchsEnCours] = useState(false)

  const charger = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('deplacements').select('*').eq('club_id', clubId).order('date_depart', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      setLoading(false)
      return
    }
    setTableMissing(false)
    // Filet de sécurité si jamais le même id apparaissait deux fois dans une
    // seule réponse (ne peut pas arriver avec ce select plat sans jointure,
    // donc n'a aucun effet sur deux lignes distinctes qui partagent juste la
    // même destination — voir supprimerDeplacement plus bas pour ce cas).
    const uniques = (data || []).filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i)
    setDeplacements(uniques)
    setLoading(false)
  }

  const chargerEquipes = async () => {
    const { data } = await supabase.from('club_categories').select('id, nom, equipe, educateur_id').eq('club_id', clubId).order('nom')
    setEquipesOptions(data || [])
  }

  const chargerVehicules = async () => {
    const { data } = await supabase.from('vehicules').select('*').eq('club_id', clubId)
    setVehicules(data || [])
  }

  useEffect(() => { if (clubId) { charger(); chargerEquipes(); chargerVehicules() } }, [clubId])

  // Récupère les matchs Extérieur (matchs_equipe.domicile = false) des éducateurs
  // du club qui n'ont pas encore de déplacement correspondant. Un déplacement
  // est déjà créé automatiquement à chaque nouveau match Extérieur ajouté
  // (creerDeplacementAutoMatch, DashboardEducateur.jsx) — ce bouton ne sert
  // qu'à rattraper les matchs créés AVANT que ce mécanisme existe, en créant
  // de vrais déplacements (pas des entrées virtuelles) pour rester compatible
  // avec tout le reste (suppression, retour, assignation bus...).
  const recupererMatchsExterieur = async () => {
    setRecuperationMatchsEnCours(true)
    const educateurIds = [...new Set(equipesOptions.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setRecuperationMatchsEnCours(false); return }
    const { data: matchsExt } = await supabase.from('matchs_equipe').select('*')
      .in('educateur_id', educateurIds).eq('domicile', false)
    const datesDejaCouvertes = new Set(deplacements.map(d => d.date_depart))
    const aCreer = (matchsExt || []).filter(m => m.date && !datesDejaCouvertes.has(m.date))
    if (aCreer.length === 0) { setRecuperationMatchsEnCours(false); alert('Aucun match Extérieur manquant à récupérer.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const payload = aCreer.map(m => {
      const cat = equipesOptions.find(c => c.educateur_id === m.educateur_id)
      return {
        club_id: clubId,
        equipe: cat ? `${cat.nom} ${cat.equipe || ''}`.trim() : null,
        educateur_id: m.educateur_id,
        date_depart: m.date,
        heure_depart: m.heure || null,
        lieu_destination: m.lieu || m.adversaire || 'Extérieur',
        nature: 'match',
        created_by: user?.id || null,
      }
    })
    const { error } = await supabase.from('deplacements').insert(payload)
    setRecuperationMatchsEnCours(false)
    if (error) { alert('Erreur : ' + error.message); return }
    alert(`${payload.length} déplacement${payload.length > 1 ? 's' : ''} créé${payload.length > 1 ? 's' : ''} pour des matchs Extérieur.`)
    await charger()
  }

  // Capacité totale couverte par le(s) véhicule(s) assigné(s) à un déplacement —
  // d.vehicule peut être une seule plaque ou "PLAQUE1 + PLAQUE2" (bus combinés,
  // cf. libelleCombine dans RepartitionMiniBus.jsx). null si aucun véhicule
  // assigné ou si une plaque ne correspond à aucun véhicule du parc actuel.
  const capaciteVehicule = (d) => {
    if (!d.vehicule) return null
    const plaques = d.vehicule.split('+').map(p => p.trim()).filter(Boolean)
    const capacites = plaques.map(p => vehicules.find(v => v.plaque === p)?.capacite)
    if (capacites.some(c => c == null)) return null
    return capacites.reduce((sum, c) => sum + c, 0)
  }

  // Bascule une plaque pour un déplacement (Vue mois) et persiste immédiatement
  // — pas de bouton "Enregistrer" séparé.
  const toggleVehiculeDeplacement = async (d, plaque) => {
    const actuelles = (d.vehicule || '').split('+').map(p => p.trim()).filter(Boolean)
    const nouvelles = actuelles.includes(plaque) ? actuelles.filter(p => p !== plaque) : [...actuelles, plaque]
    const vehiculeStr = nouvelles.join(' + ') || null
    setSavingAssignation(d.id)
    const { error } = await supabase.from('deplacements').update({ vehicule: vehiculeStr }).eq('id', d.id)
    setSavingAssignation(null)
    if (error) { alert('Erreur : ' + error.message); return }
    setDeplacements(prev => prev.map(x => (x.id === d.id ? { ...x, vehicule: vehiculeStr } : x)))
  }

  // Exporte tous les déplacements de la saison en PDF, groupés mois puis
  // semaine (mêmes regroupements que la Vue mois / la liste "À venir").
  const exporterPlanningPDF = async () => {
    setExportingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 14
      const largeurPage = doc.internal.pageSize.getWidth()
      const hauteurPage = doc.internal.pageSize.getHeight()
      const NOIR = [30, 30, 30]
      const GRIS = [110, 110, 110]
      const ORANGE = [217, 119, 6]
      let y = 18

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NOIR)
      doc.text('Planning annuel des déplacements', margin, y)
      y += 10

      const parMoisPdf = grouperParMois(deplacements)
      const clesMois = Object.keys(parMoisPdf)

      if (clesMois.length === 0) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...GRIS)
        doc.text('Aucun déplacement enregistré.', margin, y)
      }

      clesMois.forEach(cleMois => {
        if (y > hauteurPage - 30) { doc.addPage(); y = 18 }
        const labelMois = new Date(cleMois + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NOIR)
        doc.text(labelMois.charAt(0).toUpperCase() + labelMois.slice(1), margin, y)
        y += 6
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y, largeurPage - margin, y)
        y += 6

        const parSemaine = grouperParSemaine(parMoisPdf[cleMois])
        Object.entries(parSemaine).forEach(([semaine, items]) => {
          if (y > hauteurPage - 25) { doc.addPage(); y = 18 }
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRIS)
          doc.text(`Semaine du ${semaine}`, margin + 2, y)
          y += 6

          items.forEach(d => {
            if (y > hauteurPage - 18) { doc.addPage(); y = 18 }
            const cap = capaciteVehicule(d)
            const insuffisant = !d.vehicule || cap == null || (d.nb_personnes != null && cap < d.nb_personnes)
            const dateLabel = new Date(d.date_depart + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
            const busLabel = insuffisant ? 'A VERIFIER' : d.vehicule

            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...NOIR)
            const texte = `${dateLabel}  ·  ${d.equipe || '—'}  ·  ${d.lieu_destination || '—'}  ·  ${d.nb_personnes != null ? d.nb_personnes + ' pers.' : '—'}`
            doc.text(texte, margin + 4, y)

            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...(insuffisant ? ORANGE : NOIR))
            doc.text(busLabel, largeurPage - margin - doc.getTextWidth(busLabel), y)

            y += 5.5
          })
          y += 3
        })
        y += 4
      })

      doc.save(`planning-deplacements-${new Date().getFullYear()}.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  // Assigne automatiquement les véhicules du parc aux déplacements qui n'en
  // ont pas encore (ne touche jamais une assignation déjà faite manuellement).
  // Traite chaque date séparément avec repartirBus (le même algorithme que
  // Planning week-end / Répartition mini-bus — horaires-aware, réutilise un
  // bus qui revient à temps), et exclut du parc dispo, pour cette date, les
  // plaques déjà prises par un déplacement existant (manuel ou auto) pour
  // garantir qu'aucun bus n'est doublement réservé le même jour.
  const repartirAutomatiquement = async () => {
    setRepartitionAutoEnCours(true)
    const aTraiter = deplacements.filter(d => !d.vehicule)
    const parDate = {}
    aTraiter.forEach(d => { if (!parDate[d.date_depart]) parDate[d.date_depart] = []; parDate[d.date_depart].push(d) })

    const alertes = []
    const updates = []
    Object.entries(parDate).forEach(([date, deps]) => {
      const plaquesDejaPrises = new Set(
        deplacements.filter(d => d.date_depart === date && d.vehicule)
          .flatMap(d => d.vehicule.split('+').map(p => p.trim()))
      )
      const vehiculesDispos = vehicules.filter(v => !plaquesDejaPrises.has(v.plaque))
      const resultats = repartirBus(deps, vehiculesDispos)
      resultats.forEach(r => {
        if (r.statut === 'insuffisant') {
          // repartirBus renvoie "insuffisant" à la fois quand aucun bus n'a la
          // capacité requise ET quand heure_depart manque (impossible de
          // calculer la disponibilité). Deux causes différentes, deux messages
          // différents — sinon un déplacement juste incomplet (ex: un match
          // importé automatiquement sans heure) ressemble à tort à un vrai
          // besoin de location.
          const label = `${r.lieu_destination || '—'} (${new Date(r.date_depart + 'T12:00:00').toLocaleDateString('fr-FR')})`
          alertes.push({
            dep: r,
            msg: r.heure_depart ? `${label} — bus insuffisant, prévoir une location` : `${label} — heure de départ manquante, impossible d'assigner un bus automatiquement`,
          })
        } else if (r.vehicule) {
          updates.push({ id: r.id, vehicule: r.vehicule })
        }
      })
    })

    for (const u of updates) {
      await supabase.from('deplacements').update({ vehicule: u.vehicule }).eq('id', u.id)
    }
    setDeplacements(prev => prev.map(d => {
      const maj = updates.find(u => u.id === d.id)
      return maj ? { ...d, vehicule: maj.vehicule } : d
    }))
    setAlertesLocation(alertes)
    setRepartitionAutoEnCours(false)
  }

  // Un bus est en conflit s'il est déjà utilisé par un AUTRE déplacement à la
  // même date_depart — même règle que le cochage manuel dans "Assigner les
  // bus" (Vue mois). Le champ Véhicule de ce formulaire est du texte libre
  // (permet un bus de location hors parc), donc pas de blocage strict ici,
  // juste un avertissement avant d'enregistrer.
  const busEnConflitMemeJour = (plaque, date, excludeId) => deplacements.some(d =>
    d.id !== excludeId && d.date_depart === date &&
    (d.vehicule || '').split('+').map(p => p.trim()).includes(plaque)
  )

  // Crée un nouveau déplacement, ou met à jour deplacementEnEdition si défini
  // (formulaire partagé entre création et édition — mêmes champs des deux côtés).
  const sauvegarderDeplacement = async () => {
    if (!form.date_depart || !form.lieu_destination.trim()) return
    const plaquesSaisies = form.vehicule.trim().split('+').map(p => p.trim()).filter(Boolean)
    const conflits = plaquesSaisies.filter(p => busEnConflitMemeJour(p, form.date_depart, deplacementEnEdition))
    if (conflits.length > 0) {
      const suite = confirm(`⚠️ ${conflits.join(', ')} déjà assigné(s) à un autre déplacement le ${new Date(form.date_depart + 'T12:00:00').toLocaleDateString('fr-FR')}. Continuer quand même ?`)
      if (!suite) return
    }
    setSaving(true)
    // educateur_id résolu depuis la catégorie sélectionnée (pas seulement le nom
    // en texte libre educateur_responsable) — nécessaire pour que le widget "Mes
    // déplacements" de l'éducateur sur son Accueil puisse filtrer de façon fiable.
    const categorieMatch = equipesOptions.find(c => `${c.nom} ${c.equipe || ''}`.trim() === form.equipe)
    const champs = {
      equipe: form.equipe || null,
      educateur_id: categorieMatch?.educateur_id || null,
      educateur_responsable: form.educateur_responsable.trim() || null,
      date_depart: form.date_depart,
      heure_depart: form.heure_depart || null,
      heure_retour_estimee: form.heure_retour_estimee || null,
      nb_personnes: form.nb_personnes !== '' ? parseInt(form.nb_personnes) : null,
      lieu_destination: form.lieu_destination.trim(),
      nature: form.nature,
      vehicule: form.vehicule.trim() || null,
      conducteur: form.conducteur.trim() || null,
      km_avant: form.km_avant !== '' ? parseFloat(form.km_avant) : null,
      gasoil_avant: form.gasoil_avant.trim() || null,
    }
    let error
    if (deplacementEnEdition) {
      ;({ error } = await supabase.from('deplacements').update(champs).eq('id', deplacementEnEdition))
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      ;({ error } = await supabase.from('deplacements').insert({ ...champs, club_id: clubId, created_by: user?.id || null }))
    }
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setForm(formVide())
    setDeplacementEnEdition(null)
    setShowForm(false)
    await charger()
  }

  const ouvrirEditionDeplacement = (dep) => {
    setForm({
      equipe: dep.equipe || '', educateur_responsable: dep.educateur_responsable || '', date_depart: dep.date_depart || '',
      heure_depart: dep.heure_depart || '', heure_retour_estimee: dep.heure_retour_estimee || '', nb_personnes: dep.nb_personnes ?? '',
      lieu_destination: dep.lieu_destination || '', nature: dep.nature || 'match', vehicule: dep.vehicule || '', conducteur: dep.conducteur || '',
      km_avant: dep.km_avant ?? '', gasoil_avant: dep.gasoil_avant || '',
    })
    setDeplacementEnEdition(dep.id)
    setShowForm(true)
  }

  const supprimerDeplacement = async (dep) => {
    if (!confirm(`Supprimer le déplacement vers ${dep.lieu_destination} ?`)) return
    // .select() pour détecter un DELETE silencieusement bloqué par une policy RLS —
    // Postgres/Supabase renvoie alors error: null avec 0 ligne supprimée, pas une
    // erreur, donc juste vérifier `error` ne suffit pas (même piège déjà rencontré
    // sur la suppression de joueur : la carte disparaît de l'UI en optimiste, mais
    // réapparaît au rechargement car rien n'a vraiment été supprimé en base).
    const { data, error } = await supabase.from('deplacements').delete().eq('id', dep.id).select()
    if (error) {
      console.error('❌ Suppression déplacement échouée :', error.code, error.message, error.details)
      alert('Erreur : ' + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.warn('⚠️ Suppression déplacement : 0 ligne affectée sans erreur Postgres — bloquée par une policy RLS (voir supabase_deplacements_delete_policy.sql).')
      alert("La suppression n'a pas pu être appliquée (probablement une restriction de permissions côté base). Vérifie tes droits ou contacte le président du club.")
      return
    }
    setDeplacements(prev => prev.filter(d => d.id !== dep.id))
  }

  const setRetourField = (id, field, value) => {
    setRetourEdits(prev => ({
      ...prev,
      [id]: { km_apres: prev[id]?.km_apres ?? '', gasoil_apres: prev[id]?.gasoil_apres ?? '', [field]: value },
    }))
  }

  const enregistrerRetour = async (id) => {
    const edit = retourEdits[id]
    if (!edit) return
    setSavingRetour(prev => ({ ...prev, [id]: true }))
    const { error } = await supabase.from('deplacements').update({
      km_apres: edit.km_apres !== '' ? parseFloat(edit.km_apres) : null,
      gasoil_apres: edit.gasoil_apres?.trim() || null,
    }).eq('id', id)
    setSavingRetour(prev => ({ ...prev, [id]: false }))
    if (error) { alert('Erreur : ' + error.message); return }
    await charger()
  }

  if (tableMissing) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🚌 Déplacements</h1>
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginTop: '1rem', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>deplacements</code> n'existe pas encore en base — exécute la migration SQL pour activer cet outil.
        </div>
      </div>
    )
  }


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🚌 Déplacements</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>Organisation des transports pour matchs, tournois et stages</p>
        </div>
        {!readOnly && (
          <button onClick={() => { if (showForm) { setShowForm(false) } else { setForm(formVide()); setDeplacementEnEdition(null); setShowForm(true) } }}
            style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {showForm ? '✕ Fermer' : '+ Nouveau déplacement'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {!readOnly && (
          <button onClick={recupererMatchsExterieur} disabled={recuperationMatchsEnCours || loading}
            title="Crée un déplacement pour chaque match Extérieur qui n'en a pas encore (ex: matchs ajoutés avant que la création automatique existe)"
            style={{ background: 'transparent', border: '1px solid #333', color: '#9ca3af', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: recuperationMatchsEnCours ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {recuperationMatchsEnCours ? '⏳ Recherche...' : '🔄 Récupérer les matchs Extérieur'}
          </button>
        )}
        {!readOnly && (
          <button onClick={repartirAutomatiquement} disabled={repartitionAutoEnCours || loading || vehicules.length === 0}
            title={vehicules.length === 0 ? 'Ajoute au moins un véhicule au parc' : 'Assigne un bus aux déplacements qui n\'en ont pas encore'}
            style={{ background: accentColor, color: '#0a0a0a', border: 'none', borderRadius: '10px', padding: '9px 18px', fontWeight: 700, fontSize: '13px', cursor: repartitionAutoEnCours || vehicules.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: vehicules.length === 0 ? 0.5 : 1 }}>
            {repartitionAutoEnCours ? '⏳ Répartition...' : '⚡ Répartition automatique'}
          </button>
        )}
        <button onClick={exporterPlanningPDF} disabled={exportingPdf || loading || deplacements.length === 0}
          style={{ background: 'transparent', border: `1px solid ${accentColor}40`, color: accentColor, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: exportingPdf ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: deplacements.length === 0 ? 0.5 : 1 }}>
          {exportingPdf ? '⏳ Génération...' : '📄 Exporter planning annuel PDF'}
        </button>
      </div>

      {alertesLocation.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 700, color: '#fb923c', marginBottom: '8px', fontSize: '13px' }}>
            ⚠️ {alertesLocation.length} déplacement{alertesLocation.length > 1 ? 's' : ''} nécessite{alertesLocation.length > 1 ? 'nt' : ''} un bus de location
          </div>
          {alertesLocation.map((alerte, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
              <span>• {alerte.msg}</span>
              {!readOnly && (
                <button onClick={() => ouvrirEditionDeplacement(alerte.dep)}
                  style={{ flexShrink: 0, background: 'transparent', border: '1px solid #fb923c60', color: '#fb923c', padding: '2px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  ✏️ Compléter
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && !readOnly && (
        <div style={{ ...st.card, marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={st.label}>Équipe</label>
              {equipesOptions.length > 0 ? (
                <select style={st.input} value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))}>
                  <option value="">—</option>
                  {equipesOptions.map(c => <option key={c.id} value={`${c.nom} ${c.equipe || ''}`.trim()}>{c.nom} {c.equipe}</option>)}
                </select>
              ) : (
                <input style={st.input} value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))} placeholder="Ex: U15 A" />
              )}
            </div>
            <div>
              <label style={st.label}>Éducateur responsable</label>
              <input style={st.input} value={form.educateur_responsable} onChange={e => setForm(f => ({ ...f, educateur_responsable: e.target.value }))} placeholder="Nom" />
            </div>
            <div>
              <label style={st.label}>Date de départ</label>
              <input style={st.input} type="date" value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Heure de départ</label>
              <input style={st.input} type="time" value={form.heure_depart} onChange={e => setForm(f => ({ ...f, heure_depart: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Heure de retour estimée</label>
              <input style={st.input} type="time" value={form.heure_retour_estimee} onChange={e => setForm(f => ({ ...f, heure_retour_estimee: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Nb personnes (joueurs + staff)</label>
              <input style={st.input} type="number" min="0" value={form.nb_personnes} onChange={e => setForm(f => ({ ...f, nb_personnes: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={st.label}>Lieu / destination</label>
              <input style={st.input} value={form.lieu_destination} onChange={e => setForm(f => ({ ...f, lieu_destination: e.target.value }))} placeholder="Ex: Stade municipal, Lyon" />
            </div>
            <div>
              <label style={st.label}>Nature</label>
              <select style={st.input} value={form.nature} onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}>
                {NATURES.map(n => <option key={n.val} value={n.val}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={st.label}>Véhicule (plaque)</label>
              <input style={st.input} value={form.vehicule} onChange={e => setForm(f => ({ ...f, vehicule: e.target.value }))} placeholder="Ex: AB-123-CD" />
            </div>
            <div>
              <label style={st.label}>Conducteur</label>
              <input style={st.input} value={form.conducteur} onChange={e => setForm(f => ({ ...f, conducteur: e.target.value }))} placeholder="Nom du conducteur" />
            </div>
            <div>
              <label style={st.label}>Km avant départ</label>
              <input style={st.input} type="number" value={form.km_avant} onChange={e => setForm(f => ({ ...f, km_avant: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Gasoil avant départ</label>
              <input style={st.input} value={form.gasoil_avant} onChange={e => setForm(f => ({ ...f, gasoil_avant: e.target.value }))} placeholder="Ex: 4/4" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={sauvegarderDeplacement} disabled={saving || !form.date_depart || !form.lieu_destination.trim()}
              style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Enregistrement...' : deplacementEnEdition ? 'Enregistrer les modifications' : 'Créer le déplacement'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(formVide()); setDeplacementEnEdition(null) }}
              style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {(
        loading ? (
          <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
        ) : (() => {
          const parMois = grouperParMois(deplacements)
          const cles = Object.keys(parMois)
          if (cles.length === 0) return <p style={{ color: '#444', fontSize: '13px' }}>Aucun déplacement enregistré.</p>
          return cles.map(cle => {
            const deps = parMois[cle]
            const label = new Date(cle + '-01T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            const aVerifier = deps.filter(d => {
              const cap = capaciteVehicule(d)
              return !d.vehicule || cap == null || (d.nb_personnes != null && cap < d.nb_personnes)
            }).length
            return (
              <div key={cle} style={{ marginBottom: '2rem' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.1em',
                  padding: '6px 0 12px', borderBottom: '1px solid #1a1a1a', marginBottom: '14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                }}>
                  <span>📅 {label} · {deps.length} déplacement{deps.length > 1 ? 's' : ''}</span>
                  {aVerifier > 0 ? (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>⚠️ {aVerifier} à vérifier</span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor }}>✅ Bus OK</span>
                  )}
                </div>
                {Object.entries(grouperParSemaine(deps)).map(([semaineLabel, depsSemaine]) => {
                  const semaineKey = `${cle}_${semaineLabel}`
                  const ouvert = semaineOuverte[semaineKey]
                  return (
                    <div key={semaineLabel} style={{ marginTop: '10px' }}>
                      <button onClick={() => setSemaineOuverte(prev => ({ ...prev, [semaineKey]: !ouvert }))}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: ouvert ? '#161616' : '#0d0d0d',
                          border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ccc', cursor: 'pointer',
                          fontWeight: 600, fontSize: '13px', fontFamily: 'Inter, sans-serif',
                        }}>
                        <span>Semaine du {semaineLabel} · {depsSemaine.length} déplacement{depsSemaine.length > 1 ? 's' : ''}</span>
                        <span style={{ color: '#666' }}>{ouvert ? '▲' : '▼'}</span>
                      </button>
                      {ouvert && (
                        <div style={{ paddingTop: '10px' }}>
                          {depsSemaine.map(d => {
                  const cap = capaciteVehicule(d)
                  const insuffisant = !d.vehicule || cap == null || (d.nb_personnes != null && cap < d.nb_personnes)
                  const plaquesActuelles = (d.vehicule || '').split('+').map(p => p.trim()).filter(Boolean)
                  const editRetour = retourEdits[d.id] || { km_apres: d.km_apres ?? '', gasoil_apres: d.gasoil_apres ?? '' }
                  const retourComplet = d.km_apres != null && d.gasoil_apres
                  return (
                    <div key={d.id} style={{ ...st.card, marginBottom: '10px', border: insuffisant ? '1px solid #f59e0b40' : '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                            {natureInfo(d.nature).emoji} {d.lieu_destination}
                            {d.equipe && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666', fontWeight: 600 }}>· {d.equipe}</span>}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>
                            {new Date(d.date_depart + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {d.heure_depart ? ` · départ ${d.heure_depart.slice(0, 5)}` : ''}
                            {d.nb_personnes != null ? ` · ${d.nb_personnes} pers.` : ''}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
                          background: !d.vehicule ? '#6b728020' : insuffisant ? '#f59e0b15' : accentColor + '15',
                          color: !d.vehicule ? '#9ca3af' : insuffisant ? '#f59e0b' : accentColor,
                        }}>
                          {!d.vehicule
                            ? 'Aucun véhicule assigné'
                            : cap == null
                              ? `🚐 ${d.vehicule} (hors parc actuel)`
                              : insuffisant
                                ? `⚠️ Capacité insuffisante (${d.nb_personnes}p / ${cap} places)`
                                : `✅ ${d.vehicule} · ${d.nb_personnes ?? '?'}/${cap} places`}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
                        <div>
                          <p style={st.label}>Km avant</p>
                          <p style={{ margin: 0, fontSize: '13px', color: d.km_avant != null ? '#fff' : '#444' }}>{d.km_avant != null ? `${d.km_avant} km` : '—'}</p>
                        </div>
                        <div>
                          <p style={st.label}>Gasoil avant</p>
                          <p style={{ margin: 0, fontSize: '13px', color: d.gasoil_avant ? '#fff' : '#444' }}>{d.gasoil_avant || '—'}</p>
                        </div>
                        <div>
                          <p style={st.label}>Km après (retour)</p>
                          <input type="number" value={editRetour.km_apres} placeholder="—" disabled={readOnly}
                            onChange={e => setRetourField(d.id, 'km_apres', e.target.value)}
                            style={{ ...st.input, padding: '6px 8px', fontSize: '13px' }} />
                        </div>
                        <div>
                          <p style={st.label}>Gasoil après (retour)</p>
                          <input type="text" value={editRetour.gasoil_apres} placeholder="ex: 2/4" disabled={readOnly}
                            onChange={e => setRetourField(d.id, 'gasoil_apres', e.target.value)}
                            style={{ ...st.input, padding: '6px 8px', fontSize: '13px' }} />
                        </div>
                      </div>

                      {!readOnly && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <button onClick={() => enregistrerRetour(d.id)} disabled={savingRetour[d.id]}
                            style={{ background: retourComplet ? '#1a1a1a' : accentColor + '15', border: `1px solid ${retourComplet ? '#2a2a2a' : accentColor + '40'}`, color: retourComplet ? '#666' : accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {savingRetour[d.id] ? 'Enregistrement...' : retourComplet ? '✅ Retour enregistré — modifier' : '💾 Enregistrer le retour'}
                          </button>
                          <button onClick={() => setAssignationBusOuverte(assignationBusOuverte === d.id ? null : d.id)}
                            style={{ background: 'transparent', border: '1px solid #333', color: '#9ca3af', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            🚌 {assignationBusOuverte === d.id ? 'Fermer' : 'Assigner les bus'}
                          </button>
                          <button onClick={() => ouvrirEditionDeplacement(d)}
                            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #374151', color: '#9ca3af', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            ✏️ Modifier
                          </button>
                          <button onClick={() => supprimerDeplacement(d)}
                            style={{ background: 'transparent', border: '1px solid #ef444440', color: '#ef4444', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            🗑️ Supprimer
                          </button>
                        </div>
                      )}

                      {assignationBusOuverte === d.id && (
                        <div style={{ marginTop: '12px', padding: '14px', background: '#0f0f0f', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
                          {vehicules.length === 0 ? (
                            <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Aucun véhicule dans le parc — ajoute-en dans l'outil Répartition mini-bus.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {vehicules.map(v => {
                                const coche = plaquesActuelles.includes(v.plaque)
                                const dejaUtilise = deplacements.some(autre =>
                                  autre.id !== d.id && autre.date_depart === d.date_depart &&
                                  (autre.vehicule || '').split('+').map(p => p.trim()).includes(v.plaque)
                                )
                                return (
                                  <label key={v.plaque} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px',
                                    cursor: (dejaUtilise && !coche) || savingAssignation === d.id ? 'not-allowed' : 'pointer',
                                    background: coche ? accentColor + '15' : dejaUtilise ? '#6b728010' : '#1a1a1a',
                                    border: coche ? `1px solid ${accentColor}50` : '1px solid #2a2a2a',
                                    opacity: dejaUtilise && !coche ? 0.4 : 1,
                                  }}>
                                    <input type="checkbox" checked={coche} disabled={(dejaUtilise && !coche) || savingAssignation === d.id}
                                      onChange={() => toggleVehiculeDeplacement(d, v.plaque)}
                                      style={{ accentColor, width: '15px', height: '15px' }} />
                                    <span style={{ fontSize: '12px', color: coche ? accentColor : '#d1d5db', fontWeight: coche ? 600 : 400 }}>
                                      {v.plaque} ({v.capacite} pl.)
                                    </span>
                                    {dejaUtilise && !coche && <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: 'auto' }}>déjà assigné ce jour-là</span>}
                                  </label>
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
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        })()
      )}

    </div>
  )
}
