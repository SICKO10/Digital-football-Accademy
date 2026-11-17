import { useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { police } from '../../tokens'
import { Icone } from '../identite'
import { X, Pencil, Star, Users, SquareCheck, Square } from 'lucide-react'
import { styleCarte, styleChamp, styleEtiquette, styleBoutonSecondaire, CLASSE_CLIQUABLE, CLASSE_CHAMP } from '../../lib/identite'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import ProjetKanban from './ProjetKanban'

// Couleur de repère (marqueur carré) : jamais utilisée en texte.
const couleurStatutProjet = (colors, statut) => ({ en_attente: colors.accent.amber, en_cours: colors.accent.info, termine: colors.accent.success }[statut] || colors.text.dim)
const STATUTS_PROJET_LABEL = { en_attente: 'En attente', en_cours: 'En cours', termine: 'Terminé' }

const STATUTS_ETAPE = [
  { val: 'valide', label: 'Validé' },
  { val: 'en_cours', label: 'En cours' },
  { val: 'en_retard', label: 'En retard' },
  { val: 'a_faire', label: 'À faire' },
]

// Couleurs des postes de budget : données enregistrées avec chaque poste, inchangées.
const PALETTE_BUDGET = ['#3b82f6', '#4ade80', '#f59e0b', '#ef4444', '#a78bfa', '#22d3ee']

const trier = (arr) => [...(arr || [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
const pct = (actions) => (actions.length === 0 ? 0 : Math.round((actions.filter(a => a.fait).length / actions.length) * 100))
const actionsDeMission = (m) => m.mission_actions || []
const actionsDeEtape = (e) => (e.etape_missions || []).flatMap(actionsDeMission)

// Vue détail "gestionnaire de projet" pour un projet club — hiérarchie
// Étape → Mission(s) → Action(s), rechargée entièrement via onProjetMisAJour
// après chaque mutation (même convention que l'ancien taches_projet : pas
// d'état local dupliqué, projet est la seule source de vérité). Les % de
// progression (mission ← ses actions, étape ← les actions de ses missions,
// projet ← toutes les actions) se recalculent donc automatiquement à chaque
// recharge, sans colonne dédiée en base.
export default function ProjetDetail({ projet, canEdit, onClose, onOuvrirEdition, onProjetMisAJour }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [notes, setNotes] = useState(projet.notes || '')
  const [ongletActif, setOngletActif] = useState('kanban')
  const [etapesOuvertes, setEtapesOuvertes] = useState({})
  const [missionsOuvertes, setMissionsOuvertes] = useState({})
  const [nouvelleEtape, setNouvelleEtape] = useState({ titre: '', responsable_nom: '' })
  const [nouvelleMission, setNouvelleMission] = useState({}) // { [etapeId]: titre }
  const [nouvelleAction, setNouvelleAction] = useState({}) // { [missionId]: { quoi, quand, qui, comment } }
  const [saisieParticipantMission, setSaisieParticipantMission] = useState({}) // { [missionId]: { prenom, nom } }
  const [editsMission, setEditsMission] = useState({}) // { [missionId]: { champ: valeur en cours de saisie } }
  const [nouveauPoste, setNouveauPoste] = useState({ poste: '', montant: '' })

  const etapes = trier(projet.projet_etapes)
  const budget = projet.projet_budget || []

  const nbTerminees = etapes.filter(e => e.statut === 'valide').length
  const nbEnCours = etapes.filter(e => e.statut === 'en_cours' || e.statut === 'en_retard').length
  const nbAFaire = etapes.filter(e => e.statut === 'a_faire').length
  const avancement = pct(etapes.flatMap(actionsDeEtape))
  const budgetTotal = budget.reduce((s, b) => s + Number(b.montant || 0), 0)
  const joursRestants = projet.date_fin ? Math.ceil((new Date(projet.date_fin) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const rafraichir = () => onProjetMisAJour?.()
  const echec = (error) => { if (error) { alert('Erreur : ' + error.message); return true } return false }

  // ── Étapes ──
  const ajouterEtape = async () => {
    if (!nouvelleEtape.titre.trim()) return
    const { error } = await supabase.from('projet_etapes').insert({ projet_id: projet.id, titre: nouvelleEtape.titre.trim(), responsable_nom: nouvelleEtape.responsable_nom.trim() || null, ordre: etapes.length, statut: 'a_faire' })
    if (echec(error)) return
    setNouvelleEtape({ titre: '', responsable_nom: '' })
    rafraichir()
  }
  const updateStatutEtape = async (id, statut) => {
    const { error } = await supabase.from('projet_etapes').update({ statut }).eq('id', id)
    if (echec(error)) return
    rafraichir()
  }
  const supprimerEtape = async (id) => {
    const { error } = await supabase.from('projet_etapes').delete().eq('id', id)
    if (echec(error)) return
    rafraichir()
  }
  const toggleEtapeOuverte = (id) => setEtapesOuvertes(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleMissionOuverte = (id) => setMissionsOuvertes(prev => ({ ...prev, [id]: !prev[id] }))

  // ── Missions (par étape) ──
  const ajouterMission = async (etape) => {
    const titre = (nouvelleMission[etape.id] || '').trim()
    if (!titre) return
    const { error } = await supabase.from('etape_missions').insert({ etape_id: etape.id, titre, ordre: (etape.etape_missions || []).length })
    if (echec(error)) return
    setNouvelleMission(prev => ({ ...prev, [etape.id]: '' }))
    rafraichir()
  }
  // Création rapide depuis le Kanban (colonne "+") — étape_id est NOT NULL en
  // base, donc un projet sans aucune étape se voit d'abord créer une étape
  // "Général" (même pattern que la migration legacy dans
  // supabase_projet_missions_actions.sql), sinon rattache à la 1ère étape.
  const creerMissionRapide = async ({ titre, statut }) => {
    if (!titre.trim()) return
    let etapeId = etapes[0]?.id
    if (!etapeId) {
      const { data, error } = await supabase.from('projet_etapes').insert({ projet_id: projet.id, titre: 'Général', statut: 'a_faire', ordre: 0 }).select().single()
      if (echec(error)) return
      etapeId = data.id
    }
    const etape = etapes.find(e => e.id === etapeId)
    const { error } = await supabase.from('etape_missions').insert({ etape_id: etapeId, titre: titre.trim(), statut, ordre: (etape?.etape_missions || []).length })
    if (echec(error)) return
    rafraichir()
  }

  const modifierMission = async (missionId, champs) => {
    const { error } = await supabase.from('etape_missions').update(champs).eq('id', missionId)
    if (echec(error)) return
    rafraichir()
  }
  const supprimerMission = async (id) => {
    const { error } = await supabase.from('etape_missions').delete().eq('id', id)
    if (echec(error)) return
    rafraichir()
  }
  const ajouterParticipantMission = async (mission) => {
    const s = saisieParticipantMission[mission.id] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    if ((mission.participants || []).some(p => p.nom.toLowerCase() === nom.toLowerCase())) return
    setSaisieParticipantMission(prev => ({ ...prev, [mission.id]: { prenom: '', nom: '' } }))
    await modifierMission(mission.id, { participants: [...(mission.participants || []), { id: crypto.randomUUID(), nom }] })
  }
  const retirerParticipantMission = (mission, participantId) => modifierMission(mission.id, { participants: (mission.participants || []).filter(p => p.id !== participantId) })

  // Champs texte de mission à sauvegarde différée (onBlur) — la saisie locale
  // prime sur la prop tant qu'elle n'est pas envoyée, pour rester réactive
  // pendant la frappe (le prop ne change qu'après rechargement du projet).
  const valeurMission = (mission, champ) => editsMission[mission.id]?.[champ] ?? mission[champ] ?? ''
  const changerChampMission = (missionId, champ, valeur) => setEditsMission(prev => ({ ...prev, [missionId]: { ...(prev[missionId] || {}), [champ]: valeur } }))
  const oublierChampMission = (missionId, champ) => setEditsMission(prev => {
    if (!prev[missionId]) return prev
    const reste = { ...prev[missionId] }
    delete reste[champ]
    return { ...prev, [missionId]: reste }
  })
  const sauvegarderChampMission = async (mission, champ) => {
    const valeur = valeurMission(mission, champ)
    if (valeur === (mission[champ] || '')) { oublierChampMission(mission.id, champ); return }
    await modifierMission(mission.id, { [champ]: valeur || null })
    oublierChampMission(mission.id, champ)
  }

  // ── Actions (par mission) ──
  const ajouterAction = async (mission) => {
    const a = nouvelleAction[mission.id] || {}
    if (!a.quoi?.trim()) return
    const { error } = await supabase.from('mission_actions').insert({
      mission_id: mission.id, quoi: a.quoi.trim(), quand: a.quand?.trim() || null, qui: a.qui?.trim() || null, comment: a.comment?.trim() || null,
      ordre: (mission.mission_actions || []).length,
    })
    if (echec(error)) return
    setNouvelleAction(prev => ({ ...prev, [mission.id]: { quoi: '', quand: '', qui: '', comment: '' } }))
    rafraichir()
  }
  const toggleAction = async (action) => {
    const { error } = await supabase.from('mission_actions').update({ fait: !action.fait }).eq('id', action.id)
    if (echec(error)) return
    rafraichir()
  }
  const supprimerAction = async (id) => {
    const { error } = await supabase.from('mission_actions').delete().eq('id', id)
    if (echec(error)) return
    rafraichir()
  }

  // ── Budget (inchangé) ──
  const ajouterPoste = async () => {
    const montant = parseFloat(nouveauPoste.montant)
    if (!nouveauPoste.poste.trim() || !montant) return
    const couleur = PALETTE_BUDGET[budget.length % PALETTE_BUDGET.length]
    const { error } = await supabase.from('projet_budget').insert({ projet_id: projet.id, poste: nouveauPoste.poste.trim(), montant, couleur })
    if (echec(error)) return
    setNouveauPoste({ poste: '', montant: '' })
    rafraichir()
  }
  const supprimerPoste = async (id) => {
    const { error } = await supabase.from('projet_budget').delete().eq('id', id)
    if (echec(error)) return
    rafraichir()
  }

  const sauvegarderNotes = async () => {
    if (notes === (projet.notes || '')) return
    const { error } = await supabase.from('projets_club').update({ notes }).eq('id', projet.id)
    if (!error) rafraichir()
  }

  const card = { ...styleCarte(colors), padding: '20px' }
  const kpiCard = { ...styleCarte(colors), background: colors.background.raised, padding: '16px' }
  const sectionTitle = { fontFamily: police.titre, color: colors.text.primary, margin: 0, fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }
  const input = { ...styleChamp(colors), width: 'auto' }
  const inputSm = { ...input, padding: '6px 8px', minHeight: '36px' }
  const miniLabel = { ...styleEtiquette(colors), fontSize: '11px', margin: '0 0 6px' }
  // Petit bouton carré à croix (retirer, supprimer, fermer).
  const btnCroix = { background: 'none', border: 'none', color: colors.text.dim, cursor: 'pointer', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: '6px', flexShrink: 0 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '6px', width: '100%', maxWidth: '1200px', padding: '24px', margin: '20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ ...styleEtiquette(colors), marginBottom: '6px' }}>Projet Club</div>
            <h1 style={{ fontFamily: police.titre, color: colors.text.primary, fontSize: 'clamp(24px, 5.5vw, 32px)', lineHeight: 1.05, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.01em', margin: '0 0 8px' }}>{projet.nom}</h1>
            <span style={{ ...styleEtiquette(colors), fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', background: couleurStatutProjet(colors, projet.statut), borderRadius: '2px' }} />
              {STATUTS_PROJET_LABEL[projet.statut] || projet.statut}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {(projet.responsable_nom || projet.referents?.length > 0) && (
              <div style={{ textAlign: 'right' }}>
                {projet.responsable_nom && (
                  <>
                    <div style={{ color: colors.text.dim, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Chef de projet</div>
                    <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px', margin: '4px 0 6px' }}>{projet.responsable_nom}</div>
                  </>
                )}
                {projet.referents?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {projet.referents.map(r => (
                      <span key={r.id} style={{ background: colors.background.raised, color: colors.text.primary, padding: '3px 10px', borderRadius: '4px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icone icone={Star} taille={14} />{r.nom}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {canEdit && <button onClick={() => onOuvrirEdition?.(projet)} className={CLASSE_CLIQUABLE} style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', padding: '0 14px', fontSize: '13px' }}><Icone icone={Pencil} taille={16} />Modifier</button>}
            <button onClick={onClose} className={CLASSE_CLIQUABLE} title="Fermer" aria-label="Fermer" style={{ ...btnCroix, width: '40px', height: '40px' }}><Icone icone={X} /></button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {projet.objectif && (
            <div style={kpiCard}>
              <div style={{ ...styleEtiquette(colors), fontSize: '11px', marginBottom: '6px' }}>Objectif</div>
              <div style={{ color: colors.text.secondary, fontSize: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{projet.objectif}</div>
            </div>
          )}
          <div style={{ ...kpiCard, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '48px', height: '48px', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke={colors.border.default} strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={colors.accent.brand} strokeWidth="3" strokeDasharray={`${avancement * 0.94} 94`} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.primary, fontFamily: police.titre, fontSize: '12px', fontWeight: 700 }}>{avancement}%</div>
            </div>
            <div>
              <div style={{ ...styleEtiquette(colors), fontSize: '11px' }}>Avancement</div>
              <div style={{ color: colors.text.primary, fontFamily: police.titre, fontSize: '24px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{avancement}%</div>
            </div>
          </div>
          {[
            { label: 'Étapes', value: etapes.length, couleur: colors.text.primary },
            { label: 'Terminées', value: nbTerminees, couleur: colors.text.primary },
            { label: 'En cours', value: nbEnCours, couleur: colors.text.primary },
            { label: 'À faire', value: nbAFaire, couleur: colors.text.dim },
          ].map(kpi => (
            <div key={kpi.label} style={kpiCard}>
              <div style={{ ...styleEtiquette(colors), fontSize: '11px', marginBottom: '6px' }}>{kpi.label}</div>
              <div style={{ color: kpi.couleur, fontFamily: police.titre, fontSize: '32px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
            </div>
          ))}
          <div style={kpiCard}>
            <div style={{ ...styleEtiquette(colors), fontSize: '11px', marginBottom: '6px' }}>Date cible</div>
            <div style={{ color: colors.text.primary, fontFamily: police.titre, fontSize: '20px', fontWeight: 700 }}>
              {projet.date_fin ? new Date(projet.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
            {joursRestants !== null && <div style={{ color: colors.text.dim, fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>J{joursRestants >= 0 ? '-' : '+'}{Math.abs(joursRestants)}</div>}
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: `1px solid ${colors.border.faint}` }}>
          {[
            { val: 'kanban', label: 'Kanban' },
            { val: 'etapes', label: 'Étapes' },
            { val: 'budget', label: 'Budget' },
            { val: 'notes', label: 'Notes' },
          ].map(o => (
            <button key={o.val} type="button" aria-pressed={ongletActif === o.val} onClick={() => setOngletActif(o.val)} className={CLASSE_CLIQUABLE}
              style={{
                background: 'none', border: 'none', borderBottom: ongletActif === o.val ? `3px solid ${colors.accent.brand}` : '3px solid transparent',
                color: ongletActif === o.val ? colors.text.primary : colors.text.dim, fontWeight: ongletActif === o.val ? 700 : 500,
                padding: '10px 6px', minHeight: '40px', fontSize: '14px', cursor: 'pointer', marginBottom: '-1px',
              }}>
              {o.label}
            </button>
          ))}
        </div>

        {ongletActif === 'kanban' && (
          <ProjetKanban
            projet={projet}
            canEdit={canEdit}
            onChangerStatut={(id, statut) => modifierMission(id, { statut })}
            onChangerPriorite={(id, priorite) => modifierMission(id, { priorite })}
            onCreerMission={creerMissionRapide}
          />
        )}

        {/* Étapes → Missions → Actions */}
        {ongletActif === 'etapes' && (
        <div style={{ ...card, marginBottom: '20px' }}>
          <h3 style={{ ...sectionTitle, marginBottom: '16px' }}>Étapes du projet</h3>
          {etapes.length === 0 && <p style={{ color: colors.text.dim, fontSize: '12px', fontStyle: 'italic', margin: '0 0 10px' }}>Aucune étape pour l'instant.</p>}
          {etapes.map((etape, idx) => {
            const ouvert = !!etapesOuvertes[etape.id]
            const missions = trier(etape.etape_missions)
            const etapePct = pct(actionsDeEtape(etape))
            return (
              <div key={etape.id} style={{ padding: '10px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: colors.border.strong, fontSize: '12px', fontWeight: 700, minWidth: '20px' }}>{idx + 1}</span>
                  <div onClick={() => toggleEtapeOuverte(etape.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: colors.text.dim, fontSize: '10px', transform: ouvert ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{etape.titre}</div>
                      <div style={{ color: colors.text.dim, fontSize: '11px' }}>
                        {etape.responsable_nom && `${etape.responsable_nom} · `}
                        {missions.length} mission{missions.length !== 1 ? 's' : ''}
                        {missions.length > 0 && ` · ${etapePct}%`}
                      </div>
                    </div>
                  </div>
                  {canEdit ? (
                    <select value={etape.statut} onChange={e => updateStatutEtape(etape.id, e.target.value)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>
                      {STATUTS_ETAPE.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>{STATUTS_ETAPE.find(s => s.val === etape.statut)?.label}</span>
                  )}
                  {canEdit && (
                    <button onClick={() => supprimerEtape(etape.id)} className={CLASSE_CLIQUABLE} title="Supprimer cette étape" aria-label="Supprimer cette étape" style={btnCroix}><Icone icone={X} taille={16} /></button>
                  )}
                </div>

                {ouvert && (
                  <div style={{ marginLeft: '32px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {missions.length === 0 && <p style={{ color: colors.text.dim, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune mission pour l'instant.</p>}
                    {missions.map(mission => {
                      const missionOuverte = !!missionsOuvertes[mission.id]
                      const actions = trier(mission.mission_actions)
                      const missionPct = pct(actions)
                      const participants = mission.participants || []
                      return (
                        <div key={mission.id} style={{ background: colors.background.raised, border: `1px solid ${colors.border.faint}`, borderRadius: '6px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div onClick={() => toggleMissionOuverte(mission.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: colors.text.dim, fontSize: '9px', transform: missionOuverte ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700 }}>{mission.titre}</div>
                                <div style={{ color: colors.text.dim, fontSize: '11px' }}>
                                  {mission.responsable_nom && `Responsable : ${mission.responsable_nom} · `}
                                  {participants.length > 0 && `${participants.length} participant${participants.length > 1 ? 's' : ''} · `}
                                  {actions.length} action{actions.length !== 1 ? 's' : ''}
                                  {actions.length > 0 && ` · ${missionPct}%`}
                                </div>
                              </div>
                            </div>
                            {actions.length > 0 && (
                              <span style={{ background: colors.background.raised, color: colors.text.primary, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>{missionPct}%</span>
                            )}
                            {canEdit && (
                              <button onClick={() => supprimerMission(mission.id)} className={CLASSE_CLIQUABLE} title="Supprimer cette mission" aria-label="Supprimer cette mission" style={btnCroix}><Icone icone={X} taille={16} /></button>
                            )}
                          </div>

                          {missionOuverte && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Référent + dates */}
                              <div style={{ display: 'grid', gridTemplateColumns: (!canEdit || isMobile) ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                                <div>
                                  <p style={miniLabel}>Référent</p>
                                  {canEdit ? (
                                    <input className={CLASSE_CHAMP} placeholder="Nom du référent" value={valeurMission(mission, 'responsable_nom')}
                                      onChange={e => changerChampMission(mission.id, 'responsable_nom', e.target.value)}
                                      onBlur={() => sauvegarderChampMission(mission, 'responsable_nom')} style={{ ...inputSm, width: '100%' }} />
                                  ) : <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{mission.responsable_nom || '—'}</p>}
                                </div>
                                {canEdit && (
                                  <>
                                    <div>
                                      <p style={miniLabel}>Début</p>
                                      <input className={CLASSE_CHAMP} type="date" value={mission.date_debut || ''} onChange={e => modifierMission(mission.id, { date_debut: e.target.value || null })} style={{ ...inputSm, width: '100%' }} />
                                    </div>
                                    <div>
                                      <p style={miniLabel}>Fin</p>
                                      <input className={CLASSE_CHAMP} type="date" value={mission.date_fin || ''} onChange={e => modifierMission(mission.id, { date_fin: e.target.value || null })} style={{ ...inputSm, width: '100%' }} />
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Équipe */}
                              <div>
                                <p style={{ ...miniLabel, display: 'flex', alignItems: 'center', gap: '6px' }}><Icone icone={Users} taille={14} />Équipe</p>
                                {participants.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                    {participants.map(p => (
                                      <span key={p.id} style={{ background: colors.background.raised, border: `1px solid ${colors.border.default}`, color: colors.text.primary, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {p.nom}
                                        {canEdit && <button onClick={() => retirerParticipantMission(mission, p.id)} className={CLASSE_CLIQUABLE} title="Retirer ce participant" aria-label="Retirer ce participant" style={btnCroix}><Icone icone={X} taille={16} /></button>}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {canEdit && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <input className={CLASSE_CHAMP} placeholder="Prénom" value={(saisieParticipantMission[mission.id] || {}).prenom || ''}
                                      onChange={e => setSaisieParticipantMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), prenom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterParticipantMission(mission)} style={{ ...inputSm, width: '100px' }} />
                                    <input className={CLASSE_CHAMP} placeholder="Nom" value={(saisieParticipantMission[mission.id] || {}).nom || ''}
                                      onChange={e => setSaisieParticipantMission(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), nom: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterParticipantMission(mission)} style={{ ...inputSm, width: '100px' }} />
                                    <button onClick={() => ajouterParticipantMission(mission)} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '0 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Ajouter</button>
                                  </div>
                                )}
                              </div>

                              {/* Ressources */}
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                                <div>
                                  <p style={miniLabel}>Ress. humaine</p>
                                  {canEdit ? <input className={CLASSE_CHAMP} placeholder="Ex: 2 bénévoles" value={valeurMission(mission, 'ressource_humaine')} onChange={e => changerChampMission(mission.id, 'ressource_humaine', e.target.value)} onBlur={() => sauvegarderChampMission(mission, 'ressource_humaine')} style={{ ...inputSm, width: '100%' }} /> : <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{mission.ressource_humaine || '—'}</p>}
                                </div>
                                <div>
                                  <p style={miniLabel}>Ress. matérielle</p>
                                  {canEdit ? <input className={CLASSE_CHAMP} placeholder="Ex: Camionnette" value={valeurMission(mission, 'ressource_materielle')} onChange={e => changerChampMission(mission.id, 'ressource_materielle', e.target.value)} onBlur={() => sauvegarderChampMission(mission, 'ressource_materielle')} style={{ ...inputSm, width: '100%' }} /> : <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{mission.ressource_materielle || '—'}</p>}
                                </div>
                                <div>
                                  <p style={miniLabel}>Ress. financière</p>
                                  {canEdit ? <input className={CLASSE_CHAMP} placeholder="Ex: 500€" value={valeurMission(mission, 'ressource_financiere')} onChange={e => changerChampMission(mission.id, 'ressource_financiere', e.target.value)} onBlur={() => sauvegarderChampMission(mission, 'ressource_financiere')} style={{ ...inputSm, width: '100%' }} /> : <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{mission.ressource_financiere || '—'}</p>}
                                </div>
                              </div>

                              {/* Objectif / Comment */}
                              {(canEdit || mission.objectif) && (
                                <div>
                                  <p style={miniLabel}>Objectif</p>
                                  {canEdit ? <textarea className={CLASSE_CHAMP} rows={2} placeholder="Objectif de la mission" value={valeurMission(mission, 'objectif')} onChange={e => changerChampMission(mission.id, 'objectif', e.target.value)} onBlur={() => sauvegarderChampMission(mission, 'objectif')} style={{ ...inputSm, width: '100%', resize: 'vertical' }} /> : <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{mission.objectif}</p>}
                                </div>
                              )}

                              {/* Actions */}
                              <div>
                                <p style={miniLabel}>Actions</p>
                                {actions.length === 0 && <p style={{ color: colors.text.dim, fontSize: '11px', fontStyle: 'italic', margin: '0 0 8px' }}>Aucune action pour l'instant.</p>}
                                {actions.map(a => (
                                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                                    <button type="button" role="checkbox" aria-checked={!!a.fait} aria-label={a.fait ? 'Action faite' : 'Action à faire'} disabled={!canEdit} onClick={() => canEdit && toggleAction(a)} className={CLASSE_CLIQUABLE} style={{ background: 'none', border: 'none', padding: 0, width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: canEdit ? 'pointer' : 'default', color: a.fait ? colors.text.primary : colors.text.dim }}><Icone icone={a.fait ? SquareCheck : Square} /></button>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ color: a.fait ? colors.text.dim : colors.text.secondary, fontSize: '12px', textDecoration: a.fait ? 'line-through' : 'none' }}>{a.quoi}</div>
                                      {(a.quand || a.qui) && <div style={{ color: colors.text.dim, fontSize: '10px' }}>{[a.quand, a.qui].filter(Boolean).join(' · ')}</div>}
                                      {a.comment && <div style={{ color: colors.text.dim, fontSize: '10px', fontStyle: 'italic' }}>{a.comment}</div>}
                                    </div>
                                    {canEdit && <button onClick={() => supprimerAction(a.id)} className={CLASSE_CLIQUABLE} title="Supprimer cette action" aria-label="Supprimer cette action" style={btnCroix}><Icone icone={X} taille={16} /></button>}
                                  </div>
                                ))}
                                {canEdit && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    <input className={CLASSE_CHAMP} placeholder="Quoi ?" value={(nouvelleAction[mission.id] || {}).quoi || ''}
                                      onChange={e => setNouvelleAction(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), quoi: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterAction(mission)} style={{ ...inputSm, flex: '1 1 140px' }} />
                                    <input className={CLASSE_CHAMP} placeholder="Quand ?" value={(nouvelleAction[mission.id] || {}).quand || ''}
                                      onChange={e => setNouvelleAction(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), quand: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterAction(mission)} style={{ ...inputSm, width: '110px' }} />
                                    <input className={CLASSE_CHAMP} placeholder="Qui ?" value={(nouvelleAction[mission.id] || {}).qui || ''}
                                      onChange={e => setNouvelleAction(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), qui: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterAction(mission)} style={{ ...inputSm, width: '100px' }} />
                                    <input className={CLASSE_CHAMP} placeholder="Comment ? (optionnel)" value={(nouvelleAction[mission.id] || {}).comment || ''}
                                      onChange={e => setNouvelleAction(prev => ({ ...prev, [mission.id]: { ...(prev[mission.id] || {}), comment: e.target.value } }))}
                                      onKeyDown={e => e.key === 'Enter' && ajouterAction(mission)} style={{ ...inputSm, flex: '1 1 140px' }} />
                                    <button onClick={() => ajouterAction(mission)} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '0 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ Action</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <input className={CLASSE_CHAMP} placeholder="Titre de la mission" value={nouvelleMission[etape.id] || ''}
                          onChange={e => setNouvelleMission(prev => ({ ...prev, [etape.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && ajouterMission(etape)} style={{ ...inputSm, flex: 1, minWidth: '140px' }} />
                        <button onClick={() => ajouterMission(etape)} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '0 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ Mission</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {canEdit && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              <input className={CLASSE_CHAMP} placeholder="Titre de l'étape" value={nouvelleEtape.titre} onChange={e => setNouvelleEtape(f => ({ ...f, titre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && ajouterEtape()} style={{ ...input, flex: 1, minWidth: '140px' }} />
              <input className={CLASSE_CHAMP} placeholder="Responsable (optionnel)" value={nouvelleEtape.responsable_nom} onChange={e => setNouvelleEtape(f => ({ ...f, responsable_nom: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && ajouterEtape()} style={{ ...input, width: '160px' }} />
              <button onClick={ajouterEtape} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '0 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Étape</button>
            </div>
          )}
        </div>
        )}

        {ongletActif === 'budget' && (
          <div style={card}>
            <h3 style={{ ...sectionTitle, marginBottom: '16px' }}>Budget prévisionnel</h3>
            {budget.length === 0 ? (
              <p style={{ color: colors.text.dim, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucun poste budgétaire pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
                    {budget.map((poste, i) => {
                      const p = Number(poste.montant) / budgetTotal
                      const offset = budget.slice(0, i).reduce((s, x) => s + Number(x.montant) / budgetTotal, 0)
                      const circ = 2 * Math.PI * 35
                      return (
                        <circle key={poste.id} cx="50" cy="50" r="35" fill="none" stroke={poste.couleur} strokeWidth="18"
                          strokeDasharray={`${p * circ} ${circ}`} strokeDashoffset={-offset * circ}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
                      )
                    })}
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: colors.text.primary, fontWeight: 900, fontSize: '13px' }}>{budgetTotal.toLocaleString('fr-FR')}€</div>
                    <div style={{ color: colors.text.dim, fontSize: '9px' }}>Total</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  {budget.map(poste => (
                    <div key={poste.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: poste.couleur, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ color: colors.text.secondary, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poste.poste}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ color: colors.text.primary, fontSize: '11px', fontWeight: 700 }}>{Number(poste.montant).toLocaleString('fr-FR')}€ ({Math.round(Number(poste.montant) / budgetTotal * 100)}%)</span>
                        {canEdit && <button onClick={() => supprimerPoste(poste.id)} className={CLASSE_CLIQUABLE} title="Supprimer ce poste" aria-label="Supprimer ce poste" style={btnCroix}><Icone icone={X} taille={16} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canEdit && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                <input className={CLASSE_CHAMP} placeholder="Poste (ex: Transport)" value={nouveauPoste.poste} onChange={e => setNouveauPoste(f => ({ ...f, poste: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && ajouterPoste()} style={{ ...input, flex: 1, minWidth: '120px' }} />
                <input className={CLASSE_CHAMP} placeholder="Montant €" type="number" min="0" value={nouveauPoste.montant} onChange={e => setNouveauPoste(f => ({ ...f, montant: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && ajouterPoste()} style={{ ...input, width: '110px' }} />
                <button onClick={ajouterPoste} style={{ background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '0 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Ajouter</button>
              </div>
            )}
          </div>
        )}

        {ongletActif === 'notes' && (
          <div style={card}>
            <h3 style={{ ...sectionTitle, margin: '0 0 12px' }}>Notes & Points clés</h3>
            <textarea className={CLASSE_CHAMP} value={notes} onChange={e => setNotes(e.target.value)} onBlur={sauvegarderNotes} disabled={!canEdit}
              placeholder="Ajouter des notes..." rows={4}
              style={{ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '6px', padding: '10px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Barlow, sans-serif' }} />
          </div>
        )}
      </div>
    </div>
  )
}
