import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { bornesDatesSaison, saisonActuelle } from '../../lib/saison'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { Trash2 } from 'lucide-react'
import { TitreEcran, Etiquette, Icone } from '../identite'
import { styleCarte, styleChiffreHeros, styleEtiquette, styleBoutonPrincipal, styleBoutonSecondaire, styleChamp, couleurCraie, couleurClub, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP, CLASSE_CLIQUABLE } from '../../lib/identite'
import { police, forme } from '../../tokens'

// Planifie des séances au calendrier (table entrainements) pour une équipe du
// club, à la place de — ou en avance sur — l'éducateur qui la gère : mêmes
// deux mécaniques que côté DashboardEducateur.jsx (ajouterEntrainement/
// genererSaison), juste réécrites pour cibler l'équipe choisie ici plutôt que
// equipeActive. Les séances créées apparaissent ensuite dans le planning de
// l'éducateur exactement comme s'il les avait créées lui-même (RLS dédiée,
// cf. supabase_club_planifie_entrainements.sql).
const JOURS = [
  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' }, { num: 3, label: 'Mer' },
  { num: 4, label: 'Jeu' }, { num: 5, label: 'Ven' }, { num: 6, label: 'Sam' }, { num: 0, label: 'Dim' },
]

export default function PlanificationSeances({ categories, readOnly }) {
  const colors = useColors()
  const equipesAvecEducateur = categories.filter(c => c.educateur_id)
  const [equipeId, setEquipeId] = useState(equipesAvecEducateur[0]?.id || '')
  const equipe = equipesAvecEducateur.find(e => e.id === equipeId) || null

  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(false)
  const [vue, setVue] = useState('saison')
  const [afficherPassees, setAfficherPassees] = useState(false)
  const [afficherAnciennes, setAfficherAnciennes] = useState(false)

  const [form, setForm] = useState({ date: '', heure: '', lieu: '', description: '' })
  const [saving, setSaving] = useState(false)

  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  const charger = async (id) => {
    if (!id) { setSeances([]); return }
    setLoading(true)
    const { data } = await supabase.from('entrainements').select('*').eq('club_categorie_id', id).order('date')
    setSeances(data || [])
    setLoading(false)
  }

  useEffect(() => { charger(equipeId) }, [equipeId])

  const ajouterSeance = async () => {
    if (!form.date || !equipe) return
    setSaving(true)
    const { error } = await supabase.from('entrainements').insert({ ...form, educateur_id: equipe.educateur_id, club_categorie_id: equipe.id })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setForm({ date: '', heure: '', lieu: '', description: '' })
    await charger(equipeId)
  }

  const supprimerSeance = async (id) => {
    if (!confirm('Supprimer cette séance et toutes ses présences ?')) return
    await supabase.from('presences_entrainement').delete().eq('entrainement_id', id)
    const { error } = await supabase.from('entrainements').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setSeances(prev => prev.filter(s => s.id !== id))
  }

  const toggleJour = (jour) => {
    setPlanSaison(prev => {
      const actif = prev.joursActifs.includes(jour)
      const heuresParJour = { ...prev.heuresParJour }
      if (actif) delete heuresParJour[jour]
      return { ...prev, joursActifs: actif ? prev.joursActifs.filter(j => j !== jour) : [...prev.joursActifs, jour], heuresParJour }
    })
  }

  const genererSaison = async () => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length || !equipe) return
    setGeneratingPlan(true)
    const dates = []
    const cur = new Date(planSaison.dateDebut)
    const end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay())) {
        dates.push({ date: cur.toISOString().split('T')[0], heure: planSaison.heuresParJour[cur.getDay()] || null })
      }
      cur.setDate(cur.getDate() + 1)
    }
    const existingDates = new Set(seances.map(s => s.date?.substring(0, 10)))
    const newDates = dates.filter(d => !existingDates.has(d.date))
    setPlanProgress({ done: 0, total: newDates.length })
    for (let i = 0; i < newDates.length; i++) {
      await supabase.from('entrainements').insert({
        date: newDates[i].date, heure: newDates[i].heure, description: planSaison.theme || '',
        educateur_id: equipe.educateur_id, club_categorie_id: equipe.id,
      })
      setPlanProgress({ done: i + 1, total: newDates.length })
    }
    setGeneratingPlan(false)
    setPlanSaison({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
    await charger(equipeId)
  }

  // Bloc 9 du chantier design : kit d'identité, aucun changement de comportement.
  const carte = { ...styleCarte(colors), padding: '18px 20px' }
  const craie = `1px solid ${couleurCraie(colors)}`
  const labelStyle = { ...styleEtiquette(colors), display: 'block', marginBottom: '6px' }
  const boutonChoix = actif => ({
    minHeight: '36px', padding: '0 14px', borderRadius: forme.rayonCarte, cursor: 'pointer',
    fontFamily: police.texte, fontSize: '13px', fontWeight: 600,
    background: actif ? colors.accent.brand : 'transparent',
    color: actif ? colors.accent.onBrand : colors.text.primary,
    border: `1px solid ${actif ? 'transparent' : colors.border.strong}`,
  })
  const petitBouton = { ...styleBoutonSecondaire(colors), minHeight: '34px', fontSize: '13px', padding: '0 12px' }

  if (equipesAvecEducateur.length === 0) {
    return (
      <div style={{ ...carte, textAlign: 'center', padding: '32px 20px' }}>
        <p style={{ margin: 0, fontFamily: police.texte, color: colors.text.primary, fontWeight: 600 }}>Aucune équipe avec un éducateur affecté</p>
        <p style={{ margin: '6px 0 0', fontFamily: police.texte, color: colors.text.dim, fontSize: '13px' }}>Affecte d'abord un éducateur à une équipe dans Catégories & Équipes.</p>
      </div>
    )
  }

  // Aperçu : nombre de séances que la génération créerait (dates déjà
  // planifiées exclues, même règle que genererSaison).
  const apercuSaison = (() => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) return null
    const existantes = new Set(seances.map(x => x.date?.substring(0, 10)))
    let n = 0
    const cur = new Date(planSaison.dateDebut), end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay()) && !existantes.has(cur.toISOString().split('T')[0])) n++
      cur.setDate(cur.getDate() + 1)
    }
    return n
  })()
  const aujourdHui = new Date().toISOString().split('T')[0]
  // « Repartir à zéro » : les séances des saisons passées sont masquées, jamais supprimées.
  const saisonEnCours = saisonActuelle()
  const debutSaison = bornesDatesSaison(saisonEnCours).debut
  const nbAnciennes = seances.filter(x => x.date.slice(0, 10) < debutSaison).length
  const seancesSaison = afficherAnciennes ? seances : seances.filter(x => x.date.slice(0, 10) >= debutSaison)
  const aVenir = seancesSaison.filter(x => x.date >= aujourdHui)
  const passees = seancesSaison.filter(x => x.date < aujourdHui)
  const visibles = afficherPassees ? seancesSaison : aVenir
  const parMois = visibles.reduce((acc, x) => { const k = x.date.slice(0, 7); (acc[k] = acc[k] || []).push(x); return acc }, {})
  const saisonInvalide = generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <TitreEcran titre="Planifier séance" sousTitre="Les séances créées ici apparaissent dans le planning de l'éducateur de l'équipe." style={{ marginBottom: 0 }} />

      {/* Choix de l'équipe */}
      <div role="group" aria-label="Choisir une équipe" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        {equipesAvecEducateur.map(c => {
          const actif = c.id === equipeId
          return (
            <button type="button" key={c.id} className={CLASSE_CLIQUABLE} aria-pressed={actif} onClick={() => setEquipeId(c.id)}
              style={{ ...styleCarte(colors), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '10px 14px', paddingLeft: actif ? '17px' : '14px', boxShadow: actif ? `inset 3px 0 0 ${couleurClub(colors)}` : 'none', borderColor: actif ? colors.border.strong : undefined, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '19px', textTransform: 'uppercase', color: colors.text.primary }}>{labelCategorie(c.nom)} {c.equipe}</span>
              <span style={{ fontFamily: police.texte, fontSize: '12px', color: colors.text.dim, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.educateur ? `${c.educateur.prenom || ''} ${c.educateur.nom || ''}`.trim() : ''}</span>
            </button>
          )
        })}
      </div>

      {!readOnly && (
        <div style={carte}>
          <div role="group" aria-label="Type de planification" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {[{ key: 'saison', label: 'Générer une saison' }, { key: 'ponctuelle', label: 'Séance ponctuelle' }].map(o => (
              <button type="button" key={o.key} className={CLASSE_CLIQUABLE} aria-pressed={vue === o.key} onClick={() => setVue(o.key)} style={boutonChoix(vue === o.key)}>
                {o.label}
              </button>
            ))}
          </div>

          {vue === 'ponctuelle' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label htmlFor="ps-date" style={labelStyle}>Date *</label>
                  <input id="ps-date" type="date" className={CLASSE_CHAMP} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={styleChamp(colors)} />
                </div>
                <div>
                  <label htmlFor="ps-heure" style={labelStyle}>Heure</label>
                  <input id="ps-heure" type="time" className={CLASSE_CHAMP} value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={styleChamp(colors)} />
                </div>
                <div>
                  <label htmlFor="ps-lieu" style={labelStyle}>Lieu</label>
                  <input id="ps-lieu" className={CLASSE_CHAMP} value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Stade municipal" style={styleChamp(colors)} />
                </div>
                <div>
                  <label htmlFor="ps-desc" style={labelStyle}>Thème / description</label>
                  <input id="ps-desc" className={CLASSE_CHAMP} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Conservation du ballon" style={styleChamp(colors)} />
                </div>
              </div>
              <button type="button" className={CLASSE_BOUTON} onClick={ajouterSeance} disabled={saving || !form.date} style={styleBoutonPrincipal(colors)}>
                {saving ? 'Ajout...' : 'Ajouter la séance'}
              </button>
            </>
          )}

          {vue === 'saison' && (
            <>
              <Etiquette as="p" style={{ margin: '0 0 10px' }}>Jours et heures d'entraînement</Etiquette>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {JOURS.map(j => {
                  const actif = planSaison.joursActifs.includes(j.num)
                  return (
                    <div key={j.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <button type="button" className={CLASSE_CLIQUABLE} aria-pressed={actif} onClick={() => toggleJour(j.num)} style={{ ...boutonChoix(actif), width: '60px', padding: 0, justifyContent: 'center' }}>
                        {j.label}
                      </button>
                      {actif && (
                        <input type="time" className={CLASSE_CHAMP} aria-label={`Heure du ${j.label}`} value={planSaison.heuresParJour[j.num] || ''}
                          onChange={e => setPlanSaison(p => ({ ...p, heuresParJour: { ...p.heuresParJour, [j.num]: e.target.value } }))}
                          style={{ ...styleChamp(colors), width: '96px', padding: '5px 6px', textAlign: 'center' }} />
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label htmlFor="ps-du" style={labelStyle}>Du</label>
                  <input id="ps-du" type="date" className={CLASSE_CHAMP} value={planSaison.dateDebut} onChange={e => setPlanSaison(p => ({ ...p, dateDebut: e.target.value }))} style={styleChamp(colors)} />
                </div>
                <div>
                  <label htmlFor="ps-au" style={labelStyle}>Au</label>
                  <input id="ps-au" type="date" className={CLASSE_CHAMP} value={planSaison.dateFin} onChange={e => setPlanSaison(p => ({ ...p, dateFin: e.target.value }))} style={styleChamp(colors)} />
                </div>
                <div>
                  <label htmlFor="ps-theme" style={labelStyle}>Thème / description</label>
                  <input id="ps-theme" className={CLASSE_CHAMP} value={planSaison.theme} onChange={e => setPlanSaison(p => ({ ...p, theme: e.target.value }))} placeholder="Entraînement hebdomadaire" style={styleChamp(colors)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button type="button" className={CLASSE_BOUTON} onClick={genererSaison} disabled={saisonInvalide} style={styleBoutonPrincipal(colors)}>
                  {generatingPlan ? `Génération... ${planProgress.done}/${planProgress.total}` : 'Générer les séances'}
                </button>
                <span role="status" style={{ fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary }}>
                  {apercuSaison == null ? 'Choisis au moins un jour et une période.' : apercuSaison === 0 ? 'Aucune nouvelle séance : ces dates sont déjà planifiées.' : <><strong style={{ fontFamily: police.titre, fontSize: '18px', color: colors.text.primary }}>{apercuSaison}</strong> séance{apercuSaison > 1 ? 's' : ''} seront créée{apercuSaison > 1 ? 's' : ''}</>}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <Etiquette as="h2" style={{ margin: 0 }}>Séances planifiées · {aVenir.length} à venir</Etiquette>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {nbAnciennes > 0 && (
              <button type="button" className={CLASSE_BOUTON_SECONDAIRE} onClick={() => setAfficherAnciennes(v => !v)} aria-pressed={afficherAnciennes} style={petitBouton}>
                {afficherAnciennes ? `Repartir à zéro (masquer les ${nbAnciennes} des saisons passées)` : `Voir les ${nbAnciennes} séances des saisons passées`}
              </button>
            )}
            {passees.length > 0 && (
              <button type="button" className={CLASSE_BOUTON_SECONDAIRE} onClick={() => setAfficherPassees(v => !v)} aria-pressed={afficherPassees} style={petitBouton}>
                {afficherPassees ? 'Masquer les passées' : `Afficher les ${passees.length} passées`}
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p role="status" style={{ margin: 0, fontFamily: police.texte, color: colors.text.secondary, fontSize: '14px' }}>Chargement...</p>
        ) : visibles.length === 0 ? (
          <div style={{ ...carte, textAlign: 'center', padding: '24px' }}>
            <p style={{ margin: 0, fontFamily: police.texte, color: colors.text.secondary, fontSize: '14px' }}>Aucune séance à venir pour cette équipe.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {Object.keys(parMois).sort().map(k => (
              <div key={k}>
                <p style={{ margin: '0 0 8px', fontFamily: police.titre, fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', color: colors.text.primary, letterSpacing: '0.01em' }}>
                  {new Date(`${k}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} <span style={{ fontFamily: police.texte, fontWeight: 400, fontSize: '13px', letterSpacing: 0, textTransform: 'none', color: colors.text.dim }}>· {parMois[k].length} séance{parMois[k].length > 1 ? 's' : ''}</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                  {parMois[k].map(x => {
                    const d = new Date(x.date + 'T12:00:00')
                    const passee = x.date < aujourdHui
                    return (
                      <div key={x.id} style={{ ...styleCarte(colors), display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', opacity: passee ? 0.7 : 1 }}>
                        <div style={{ width: '48px', textAlign: 'center', border: craie, borderRadius: forme.rayonPastille, overflow: 'hidden', flexShrink: 0 }}>
                          <p style={{ ...styleEtiquette(colors), fontSize: '10px', margin: 0, padding: '2px 0', background: colors.background.raised }}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</p>
                          <p style={{ ...styleChiffreHeros(colors, 22), margin: 0, padding: '4px 0' }}>{d.getDate()}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontFamily: police.texte, fontSize: '14px', fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.description || 'Entraînement'}</p>
                          <p style={{ margin: '2px 0 0', fontFamily: police.texte, fontSize: '12px', color: colors.text.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[x.heure?.slice(0, 5), x.lieu].filter(Boolean).join(' · ') || 'Horaire à définir'}</p>
                        </div>
                        {!readOnly && (
                          <button type="button" className={CLASSE_CLIQUABLE} onClick={() => supprimerSeance(x.id)} title="Supprimer" aria-label={`Supprimer la séance du ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`} style={{ background: 'none', border: 'none', color: colors.text.secondary, cursor: 'pointer', padding: '8px', display: 'flex' }}>
                            <Icone icone={Trash2} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
