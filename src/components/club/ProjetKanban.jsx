import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'

const COLONNES = [
  { val: 'a_preparer', label: 'À préparer', couleur: '#f59e0b' },
  { val: 'a_faire', label: 'À faire', couleur: '#3b82f6' },
  { val: 'en_cours', label: 'En cours', couleur: '#f97316' },
  { val: 'en_attente', label: 'En attente', couleur: '#a78bfa' },
  { val: 'termine', label: 'Terminé', couleur: '#4ade80' },
]

const PRIORITES = [
  { val: 'basse', label: 'Basse', couleur: '#6b7280' },
  { val: 'moyenne', label: 'Moyenne', couleur: '#f59e0b' },
  { val: 'haute', label: 'Haute', couleur: '#ef4444' },
]

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
            return (
              <div key={colonne.val} style={{ minWidth: '240px', flex: '1 1 240px', background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colonne.couleur, flexShrink: 0 }} />
                    <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{colonne.label}</span>
                    <span style={{ color: colors.text.faint, fontSize: '11px' }}>{items.length}</span>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setAjoutOuvert(colonne.val); setTitreNouveau('') }} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>+</button>
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
                                  background: colors.background.raised, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '10px',
                                  boxShadow: snapshot.isDragging ? '0 8px 20px rgba(0,0,0,0.35)' : 'none',
                                  ...dragProvided.draggableProps.style,
                                }}>
                                <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{mission.titre}</div>
                                {mission.responsable_nom && <div style={{ color: colors.text.faint, fontSize: '11px', marginBottom: '4px' }}>Responsable : {mission.responsable_nom}</div>}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', minHeight: '20px' }}>
                                  {mission.date_fin ? (
                                    <span style={{ color: colors.text.faint, fontSize: '11px' }}>{new Date(mission.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                  ) : <span />}
                                  {canEdit ? (
                                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                      <button onClick={() => setPrioriteOuverte(prioriteOuverte === mission.id ? null : mission.id)}
                                        style={{ background: (priorite?.couleur || colors.text.faint) + alpha.subtle, color: priorite?.couleur || colors.text.faint, border: 'none', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                                        {priorite?.label || 'Priorité'}
                                      </button>
                                      {prioriteOuverte === mission.id && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: colors.background.base, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '4px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          {PRIORITES.map(p => (
                                            <button key={p.val} onClick={() => { onChangerPriorite(mission.id, p.val); setPrioriteOuverte(null) }}
                                              style={{ background: 'none', border: 'none', color: p.couleur, fontSize: '11px', fontWeight: 700, padding: '4px 8px', cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                              {p.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : priorite ? (
                                    <span style={{ background: priorite.couleur + alpha.subtle, color: priorite.couleur, borderRadius: '20px', padding: '2px 10px', fontSize: '10px', fontWeight: 700 }}>{priorite.label}</span>
                                  ) : <span />}
                                </div>
                                {actions.length > 0 && (
                                  <div style={{ background: colors.border.faint, borderRadius: '6px', height: '5px', overflow: 'hidden', marginTop: '8px' }}>
                                    <div style={{ width: `${missionPct}%`, height: '100%', background: colonne.couleur }} />
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
                      placeholder="Titre de la tâche"
                      style={{ flex: 1, background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '6px', color: colors.text.primary, padding: '6px 8px', fontSize: '12px', boxSizing: 'border-box' }} />
                    <button onClick={() => validerAjout(colonne.val)} style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, border: `1px solid ${colors.accent.green}40`, borderRadius: '6px', padding: '0 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+</button>
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
