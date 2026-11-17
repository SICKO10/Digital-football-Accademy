import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useColors } from '../../lib/theme'
import { Plus } from 'lucide-react'
import { police } from '../../tokens'
import { Icone } from '../identite'
import { styleCarte, styleChamp, styleEtiquette, CLASSE_CHAMP, CLASSE_CLIQUABLE } from '../../lib/identite'

// Couleurs de repère (liseré, marqueur carré) : jamais utilisées en texte.
const COLONNES = [
  { val: 'a_preparer', label: 'À préparer', couleur: c => c.accent.amber },
  { val: 'a_faire', label: 'À faire', couleur: c => c.accent.info },
  { val: 'en_cours', label: 'En cours', couleur: c => c.accent.brand },
  { val: 'en_attente', label: 'En attente', couleur: c => c.text.dim },
  { val: 'termine', label: 'Terminé', couleur: c => c.accent.success },
]

const PRIORITES = [
  { val: 'basse', label: 'Basse', couleur: c => c.text.dim },
  { val: 'moyenne', label: 'Moyenne', couleur: c => c.accent.amber },
  { val: 'haute', label: 'Haute', couleur: c => c.accent.red },
]

const Marqueur = ({ couleur }) => <span aria-hidden="true" style={{ width: '8px', height: '8px', background: couleur, borderRadius: '2px', flexShrink: 0 }} />

const pct = (actions) => (actions.length === 0 ? 0 : Math.round((actions.filter(a => a.fait).length / actions.length) * 100))

// Kanban par tâche (mission) d'un projet — les cartes viennent de toutes les
// étapes du projet aplaties, groupées par mission.statut. La hiérarchie
// Étape/Mission/Action détaillée reste dans l'onglet "Étapes" ; ce Kanban
// n'en est qu'une vue alternative, il ne duplique pas la logique de mutation
// (tout passe par les callbacks reçus, gérés par ProjetDetail.jsx).
export default function ProjetKanban({ projet, canEdit, onChangerStatut, onChangerPriorite, onCreerMission }) {
  const colors = useColors()
  const [ajoutOuvert, setAjoutOuvert] = useState(null) // val de la colonne en cours d'ajout
  const [titreNouveau, setTitreNouveau] = useState('')
  const [prioriteOuverte, setPrioriteOuverte] = useState(null) // id de la mission dont le menu priorité est ouvert

  const missions = (projet.projet_etapes || []).flatMap(e => e.etape_missions || [])

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.droppableId === result.source.droppableId) return
    onChangerStatut(result.draggableId, result.destination.droppableId)
  }

  const validerAjout = (colonneVal) => {
    if (!titreNouveau.trim()) return
    onCreerMission({ titre: titreNouveau, statut: colonneVal })
    setTitreNouveau('')
    setAjoutOuvert(null)
  }

  return (
    <div onClick={() => prioriteOuverte && setPrioriteOuverte(null)} style={{ marginBottom: '20px' }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          {COLONNES.map(colonne => {
            const items = missions.filter(m => (m.statut || 'a_faire') === colonne.val)
            const couleurColonne = colonne.couleur(colors)
            return (
              <div key={colonne.val} style={{ ...styleCarte(colors), minWidth: '240px', flex: '1 1 240px', padding: '12px', boxShadow: `inset 0 3px 0 ${couleurColonne}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ ...styleEtiquette(colors), color: colors.text.primary }}>{colonne.label}</span>
                    <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '16px', fontVariantNumeric: 'tabular-nums', color: colors.text.dim }}>{items.length}</span>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setAjoutOuvert(colonne.val); setTitreNouveau('') }} className={CLASSE_CLIQUABLE} title={`Ajouter une tâche dans ${colonne.label}`} aria-label={`Ajouter une tâche dans ${colonne.label}`}
                      style={{ background: 'none', border: `1px solid ${colors.border.strong}`, borderRadius: '6px', color: colors.text.primary, cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icone icone={Plus} /></button>
                  )}
                </div>

                <Droppable droppableId={colonne.val}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '20px' }}>
                      {items.map((mission, index) => {
                        const actions = mission.mission_actions || []
                        const missionPct = pct(actions)
                        const priorite = PRIORITES.find(p => p.val === mission.priorite)
                        return (
                          <Draggable key={mission.id} draggableId={mission.id} index={index} isDragDisabled={!canEdit}>
                            {(dragProvided, snapshot) => (
                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}
                                style={{
                                  background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '6px', padding: '10px',
                                  boxShadow: snapshot.isDragging ? '0 8px 20px rgba(0,0,0,0.35)' : 'none',
                                  ...dragProvided.draggableProps.style,
                                }}>
                                <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{mission.titre}</div>
                                {mission.responsable_nom && <div style={{ color: colors.text.dim, fontSize: '12px', marginBottom: '4px' }}>Responsable : {mission.responsable_nom}</div>}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', minHeight: '20px' }}>
                                  {mission.date_fin ? (
                                    <span style={{ color: colors.text.dim, fontSize: '12px' }}>{new Date(mission.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                  ) : <span />}
                                  {canEdit ? (
                                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                      <button onClick={() => setPrioriteOuverte(prioriteOuverte === mission.id ? null : mission.id)}
                                        className={CLASSE_CLIQUABLE} aria-haspopup="menu" aria-expanded={prioriteOuverte === mission.id}
                                        style={{ ...styleEtiquette(colors), fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: `1px solid ${colors.border.strong}`, borderRadius: '4px', padding: '4px 8px', minHeight: '28px', cursor: 'pointer' }}>
                                        {priorite && <Marqueur couleur={priorite.couleur(colors)} />}{priorite?.label || 'Priorité'}
                                      </button>
                                      {prioriteOuverte === mission.id && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: colors.background.base, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', padding: '4px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          {PRIORITES.map(p => (
                                            <button key={p.val} onClick={() => { onChangerPriorite(mission.id, p.val); setPrioriteOuverte(null) }}
                                              className={CLASSE_CLIQUABLE} role="menuitem" style={{ ...styleEtiquette(colors), color: colors.text.primary, display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '6px 8px', minHeight: '32px', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                              <Marqueur couleur={p.couleur(colors)} />{p.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : priorite ? (
                                    <span style={{ ...styleEtiquette(colors), fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Marqueur couleur={priorite.couleur(colors)} />{priorite.label}</span>
                                  ) : <span />}
                                </div>
                                {actions.length > 0 && (
                                  <div style={{ background: colors.border.default, borderRadius: '2px', height: '5px', overflow: 'hidden', marginTop: '8px' }}>
                                    <div style={{ width: `${missionPct}%`, height: '100%', background: couleurColonne }} />
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {canEdit && ajoutOuvert === colonne.val && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                    <input autoFocus value={titreNouveau} onChange={e => setTitreNouveau(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') validerAjout(colonne.val); if (e.key === 'Escape') setAjoutOuvert(null) }}
                      placeholder="Titre de la tâche" aria-label="Titre de la tâche" className={CLASSE_CHAMP}
                      style={{ ...styleChamp(colors), flex: 1, width: 'auto', minWidth: 0 }} />
                    <button onClick={() => validerAjout(colonne.val)} title="Ajouter la tâche" aria-label="Ajouter la tâche" className="df-bouton"
                      style={{ background: colors.accent.brand, color: colors.accent.onBrand, border: '1px solid transparent', borderRadius: '6px', width: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Icone icone={Plus} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
