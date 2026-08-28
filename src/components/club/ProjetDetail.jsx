import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'

const STATUTS_PROJET_COULEUR = { en_attente: '#f59e0b', en_cours: '#3b82f6', termine: '#4ade80' }
const STATUTS_PROJET_LABEL = { en_attente: 'En attente', en_cours: 'En cours', termine: 'Terminé' }

const STATUTS_ETAPE = [
  { val: 'valide', label: 'Validé', emoji: '✅' },
  { val: 'en_cours', label: 'En cours', emoji: '🔵' },
  { val: 'en_retard', label: 'En retard', emoji: '🟠' },
  { val: 'a_faire', label: 'À faire', emoji: '⭕' },
]

const PALETTE_BUDGET = ['#3b82f6', '#4ade80', '#f59e0b', '#ef4444', '#a78bfa', '#22d3ee']

// Vue détail "gestionnaire de projet" pour un projet club — s'ouvre en plus
// du Kanban existant (qui reste la vue liste), sans rien retirer : Missions
// et Référents restent affichés ici mais s'éditent toujours via le
// formulaire existant (onOuvrirEdition), pour ne pas dupliquer ~150 lignes
// d'édition déjà fonctionnelles. Étapes/Budget sont entièrement nouveaux
// (projet_etapes/projet_budget) ; Actions à venir réutilise taches_projet
// (déjà réel, déjà des données) via les handlers passés en props par le
// parent — un seul état source pour la carte Kanban et cette vue détail.
export default function ProjetDetail({ projet, canEdit, onClose, onOuvrirEdition, onProjetMisAJour, taches, nouvelleTache, setNouvelleTache, toggleTache, ajouterTache, supprimerTache }) {
  const colors = useColors()
  const [etapes, setEtapes] = useState([])
  const [budget, setBudget] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState(projet.notes || '')
  const [missionsOuvertes, setMissionsOuvertes] = useState(false)
  const [nouvelleEtape, setNouvelleEtape] = useState({ titre: '', responsable_nom: '' })
  const [nouveauPoste, setNouveauPoste] = useState({ poste: '', montant: '' })
  // Équipe (participants) et matériel par étape — repliés par défaut, une
  // étape avec juste un titre/statut n'a pas besoin d'affichage étendu.
  const [etapesOuvertes, setEtapesOuvertes] = useState({})
  const [saisieParticipantEtape, setSaisieParticipantEtape] = useState({})
  const [saisieMaterielEtape, setSaisieMaterielEtape] = useState({})

  useEffect(() => {
    let annule = false
    setLoading(true)
    Promise.all([
      supabase.from('projet_etapes').select('*').eq('projet_id', projet.id).order('ordre'),
      supabase.from('projet_budget').select('*').eq('projet_id', projet.id).order('created_at'),
    ]).then(([{ data: e }, { data: b }]) => {
      if (annule) return
      setEtapes(e || [])
      setBudget(b || [])
      setLoading(false)
    })
    return () => { annule = true }
  }, [projet.id])

  const nbTerminees = etapes.filter(e => e.statut === 'valide').length
  const nbEnCours = etapes.filter(e => e.statut === 'en_cours' || e.statut === 'en_retard').length
  const nbAFaire = etapes.filter(e => e.statut === 'a_faire').length
  const avancement = etapes.length > 0 ? Math.round((nbTerminees / etapes.length) * 100) : 0
  const budgetTotal = budget.reduce((s, b) => s + Number(b.montant || 0), 0)
  const joursRestants = projet.date_fin ? Math.ceil((new Date(projet.date_fin) - new Date()) / (1000 * 60 * 60 * 24)) : null

  const ajouterEtape = async () => {
    if (!nouvelleEtape.titre.trim()) return
    const payload = { projet_id: projet.id, titre: nouvelleEtape.titre.trim(), responsable_nom: nouvelleEtape.responsable_nom.trim() || null, ordre: etapes.length, statut: 'a_faire' }
    const { data, error } = await supabase.from('projet_etapes').insert(payload).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    setEtapes(prev => [...prev, data])
    setNouvelleEtape({ titre: '', responsable_nom: '' })
  }
  const updateStatutEtape = async (id, statut) => {
    const avant = etapes
    setEtapes(prev => prev.map(e => (e.id === id ? { ...e, statut } : e)))
    const { error } = await supabase.from('projet_etapes').update({ statut }).eq('id', id)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }
  const supprimerEtape = async (id) => {
    const avant = etapes
    setEtapes(prev => prev.filter(e => e.id !== id))
    const { error } = await supabase.from('projet_etapes').delete().eq('id', id)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }
  const toggleEtapeOuverte = (id) => setEtapesOuvertes(prev => ({ ...prev, [id]: !prev[id] }))

  // Équipe (participants) d'une étape — même principe que les participants
  // de mission (saisie libre prénom/nom, chips), stocké en jsonb sur la
  // ligne projet_etapes elle-même.
  const ajouterParticipantEtape = async (etapeId) => {
    const s = saisieParticipantEtape[etapeId] || {}
    const nom = `${s.prenom || ''} ${s.nom || ''}`.trim()
    if (!nom) return
    const etape = etapes.find(e => e.id === etapeId)
    if ((etape.participants || []).some(p => p.nom.toLowerCase() === nom.toLowerCase())) return
    const participants = [...(etape.participants || []), { id: crypto.randomUUID(), nom }]
    const avant = etapes
    setEtapes(prev => prev.map(e => (e.id === etapeId ? { ...e, participants } : e)))
    setSaisieParticipantEtape(prev => ({ ...prev, [etapeId]: { prenom: '', nom: '' } }))
    const { error } = await supabase.from('projet_etapes').update({ participants }).eq('id', etapeId)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }
  const retirerParticipantEtape = async (etapeId, participantId) => {
    const etape = etapes.find(e => e.id === etapeId)
    const participants = (etape.participants || []).filter(p => p.id !== participantId)
    const avant = etapes
    setEtapes(prev => prev.map(e => (e.id === etapeId ? { ...e, participants } : e)))
    const { error } = await supabase.from('projet_etapes').update({ participants }).eq('id', etapeId)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }

  // Matériel nécessaire à une étape — simple liste de libellés libres.
  const ajouterMaterielEtape = async (etapeId) => {
    const texte = (saisieMaterielEtape[etapeId] || '').trim()
    if (!texte) return
    const etape = etapes.find(e => e.id === etapeId)
    const materiel = [...(etape.materiel || []), { id: crypto.randomUUID(), texte }]
    const avant = etapes
    setEtapes(prev => prev.map(e => (e.id === etapeId ? { ...e, materiel } : e)))
    setSaisieMaterielEtape(prev => ({ ...prev, [etapeId]: '' }))
    const { error } = await supabase.from('projet_etapes').update({ materiel }).eq('id', etapeId)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }
  const retirerMaterielEtape = async (etapeId, materielId) => {
    const etape = etapes.find(e => e.id === etapeId)
    const materiel = (etape.materiel || []).filter(m => m.id !== materielId)
    const avant = etapes
    setEtapes(prev => prev.map(e => (e.id === etapeId ? { ...e, materiel } : e)))
    const { error } = await supabase.from('projet_etapes').update({ materiel }).eq('id', etapeId)
    if (error) { setEtapes(avant); alert('Erreur : ' + error.message) }
  }

  const ajouterPoste = async () => {
    const montant = parseFloat(nouveauPoste.montant)
    if (!nouveauPoste.poste.trim() || !montant) return
    const couleur = PALETTE_BUDGET[budget.length % PALETTE_BUDGET.length]
    const { data, error } = await supabase.from('projet_budget').insert({ projet_id: projet.id, poste: nouveauPoste.poste.trim(), montant, couleur }).select().single()
    if (error) { alert('Erreur : ' + error.message); return }
    setBudget(prev => [...prev, data])
    setNouveauPoste({ poste: '', montant: '' })
  }
  const supprimerPoste = async (id) => {
    const avant = budget
    setBudget(prev => prev.filter(b => b.id !== id))
    const { error } = await supabase.from('projet_budget').delete().eq('id', id)
    if (error) { setBudget(avant); alert('Erreur : ' + error.message) }
  }

  const sauvegarderNotes = async () => {
    if (notes === (projet.notes || '')) return
    const { error } = await supabase.from('projets_club').update({ notes }).eq('id', projet.id)
    if (!error) onProjetMisAJour?.()
  }

  const card = { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '20px' }
  const kpiCard = { background: colors.background.raised, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '16px' }
  const sectionTitle = { color: colors.text.primary, margin: 0, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }
  const input = { background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', color: colors.text.primary, padding: '8px 10px', fontSize: '13px', boxSizing: 'border-box' }

  const projetTaches = taches || []
  const tachesFaites = projetTaches.filter(t => t.fait).length

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: colors.background.base, border: `1px solid ${colors.border.subtle}`, borderRadius: '20px', width: '100%', maxWidth: '1200px', padding: '24px', margin: '20px 0' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Projet Club</div>
            <h1 style={{ color: colors.text.primary, fontSize: '26px', fontWeight: 900, margin: '0 0 6px' }}>{projet.nom}</h1>
            <span style={{ background: (STATUTS_PROJET_COULEUR[projet.statut] || colors.text.faint) + alpha.subtle, color: STATUTS_PROJET_COULEUR[projet.statut] || colors.text.faint, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
              {STATUTS_PROJET_LABEL[projet.statut] || projet.statut}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {projet.responsable_nom && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Chef de projet</div>
                <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>{projet.responsable_nom}</div>
              </div>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ ...kpiCard, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '48px', height: '48px', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke={colors.border.default} strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={colors.accent.green} strokeWidth="3" strokeDasharray={`${avancement * 0.94} 94`} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.primary, fontSize: '10px', fontWeight: 800 }}>{avancement}%</div>
            </div>
            <div>
              <div style={{ color: colors.text.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Avancement</div>
              <div style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 900 }}>{avancement}%</div>
            </div>
          </div>
          {[
            { label: 'Étapes', value: etapes.length, couleur: colors.text.primary },
            { label: 'Terminées', value: nbTerminees, couleur: colors.accent.green },
            { label: 'En cours', value: nbEnCours, couleur: colors.accent.blue },
            { label: 'À faire', value: nbAFaire, couleur: colors.text.faint },
          ].map(kpi => (
            <div key={kpi.label} style={kpiCard}>
              <div style={{ color: colors.text.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{kpi.label}</div>
              <div style={{ color: kpi.couleur, fontSize: '24px', fontWeight: 900 }}>{kpi.value}</div>
            </div>
          ))}
          <div style={kpiCard}>
            <div style={{ color: colors.text.faint, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Date cible</div>
            <div style={{ color: joursRestants !== null && joursRestants < 30 ? colors.accent.red : colors.accent.amber, fontSize: '14px', fontWeight: 900 }}>
              {projet.date_fin ? new Date(projet.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </div>
            {joursRestants !== null && <div style={{ color: joursRestants < 30 ? colors.accent.red : colors.accent.amber, fontSize: '11px', fontWeight: 700 }}>J{joursRestants >= 0 ? '-' : '+'}{Math.abs(joursRestants)}</div>}
          </div>
        </div>

        {/* Corps — 2 colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* Étapes du projet */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={sectionTitle}>Étapes du projet</h3>
            </div>
            {loading ? <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p> : (
              <>
                {etapes.length === 0 && <p style={{ color: colors.text.faint, fontSize: '12px', fontStyle: 'italic', margin: '0 0 10px' }}>Aucune étape pour l'instant.</p>}
                {etapes.map((etape, idx) => {
                  const ouvert = !!etapesOuvertes[etape.id]
                  const participants = etape.participants || []
                  const materiel = etape.materiel || []
                  return (
                    <div key={etape.id} style={{ padding: '10px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: colors.border.strong, fontSize: '12px', fontWeight: 700, minWidth: '20px' }}>{idx + 1}</span>
                        <div onClick={() => toggleEtapeOuverte(etape.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: colors.text.faint, fontSize: '10px', transform: ouvert ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{etape.titre}</div>
                            {(etape.responsable_nom || participants.length > 0 || materiel.length > 0) && (
                              <div style={{ color: colors.text.faint, fontSize: '11px' }}>
                                {etape.responsable_nom}
                                {etape.responsable_nom && (participants.length > 0 || materiel.length > 0) && ' · '}
                                {participants.length > 0 && `👥 ${participants.length}`}
                                {participants.length > 0 && materiel.length > 0 && ' · '}
                                {materiel.length > 0 && `🧰 ${materiel.length}`}
                              </div>
                            )}
                          </div>
                        </div>
                        {canEdit ? (
                          <select value={etape.statut} onChange={e => updateStatutEtape(etape.id, e.target.value)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '11px', color: STATUTS_ETAPE.find(s => s.val === etape.statut)?.emoji ? undefined : colors.text.faint }}>
                            {STATUTS_ETAPE.map(s => <option key={s.val} value={s.val}>{s.emoji} {s.label}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>{STATUTS_ETAPE.find(s => s.val === etape.statut)?.emoji} {STATUTS_ETAPE.find(s => s.val === etape.statut)?.label}</span>
                        )}
                        {canEdit && (
                          <button onClick={() => supprimerEtape(etape.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '13px' }}>✕</button>
                        )}
                      </div>

                      {ouvert && (
                        <div style={{ marginLeft: '32px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Équipe de l'étape */}
                          <div>
                            <p style={{ fontSize: '10px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>👥 Équipe</p>
                            {participants.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                {participants.map(p => (
                                  <span key={p.id} style={{ background: colors.accent.blue + alpha.subtle, border: `1px solid ${colors.accent.blue}40`, color: colors.accent.blue, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {p.nom}
                                    {canEdit && <button onClick={() => retirerParticipantEtape(etape.id, p.id)} style={{ background: 'none', border: 'none', color: colors.accent.blue, opacity: 0.6, fontSize: '12px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {canEdit && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <input placeholder="Prénom" value={(saisieParticipantEtape[etape.id] || {}).prenom || ''}
                                  onChange={e => setSaisieParticipantEtape(prev => ({ ...prev, [etape.id]: { ...(prev[etape.id] || {}), prenom: e.target.value } }))}
                                  onKeyDown={e => e.key === 'Enter' && ajouterParticipantEtape(etape.id)} style={{ ...input, width: '110px' }} />
                                <input placeholder="Nom" value={(saisieParticipantEtape[etape.id] || {}).nom || ''}
                                  onChange={e => setSaisieParticipantEtape(prev => ({ ...prev, [etape.id]: { ...(prev[etape.id] || {}), nom: e.target.value } }))}
                                  onKeyDown={e => e.key === 'Enter' && ajouterParticipantEtape(etape.id)} style={{ ...input, width: '110px' }} />
                                <button onClick={() => ajouterParticipantEtape(etape.id)} style={{ background: colors.accent.blue + alpha.subtle, color: colors.accent.blue, border: `1px solid ${colors.accent.blue}40`, borderRadius: '8px', padding: '0 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Ajouter</button>
                              </div>
                            )}
                          </div>

                          {/* Matériel nécessaire */}
                          <div>
                            <p style={{ fontSize: '10px', color: colors.text.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>🧰 Matériel nécessaire</p>
                            {materiel.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                {materiel.map(m => (
                                  <span key={m.id} style={{ background: colors.accent.amber + alpha.subtle, border: `1px solid ${colors.accent.amber}40`, color: colors.accent.amber, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {m.texte}
                                    {canEdit && <button onClick={() => retirerMaterielEtape(etape.id, m.id)} style={{ background: 'none', border: 'none', color: colors.accent.amber, opacity: 0.6, fontSize: '12px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {canEdit && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <input placeholder="Ex: Ballons, chasubles..." value={saisieMaterielEtape[etape.id] || ''}
                                  onChange={e => setSaisieMaterielEtape(prev => ({ ...prev, [etape.id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && ajouterMaterielEtape(etape.id)} style={{ ...input, flex: 1, minWidth: '140px' }} />
                                <button onClick={() => ajouterMaterielEtape(etape.id)} style={{ background: colors.accent.amber + alpha.subtle, color: colors.accent.amber, border: `1px solid ${colors.accent.amber}40`, borderRadius: '8px', padding: '0 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Ajouter</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <input placeholder="Titre de l'étape" value={nouvelleEtape.titre} onChange={e => setNouvelleEtape(f => ({ ...f, titre: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && ajouterEtape()} style={{ ...input, flex: 1, minWidth: '140px' }} />
                    <input placeholder="Responsable (optionnel)" value={nouvelleEtape.responsable_nom} onChange={e => setNouvelleEtape(f => ({ ...f, responsable_nom: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && ajouterEtape()} style={{ ...input, width: '160px' }} />
                    <button onClick={ajouterEtape} style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, border: `1px solid ${colors.accent.green}40`, borderRadius: '8px', padding: '0 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Ajouter</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Budget + Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <h3 style={{ ...sectionTitle, marginBottom: '16px' }}>Budget prévisionnel</h3>
              {budget.length === 0 ? (
                <p style={{ color: colors.text.faint, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucun poste budgétaire pour l'instant.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px' }}>
                      {budget.map((poste, i) => {
                        const pct = Number(poste.montant) / budgetTotal
                        const offset = budget.slice(0, i).reduce((s, p) => s + Number(p.montant) / budgetTotal, 0)
                        const circ = 2 * Math.PI * 35
                        return (
                          <circle key={poste.id} cx="50" cy="50" r="35" fill="none" stroke={poste.couleur} strokeWidth="18"
                            strokeDasharray={`${pct * circ} ${circ}`} strokeDashoffset={-offset * circ}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }} />
                        )
                      })}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ color: colors.text.primary, fontWeight: 900, fontSize: '13px' }}>{budgetTotal.toLocaleString('fr-FR')}€</div>
                      <div style={{ color: colors.text.faint, fontSize: '9px' }}>Total</div>
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
                          {canEdit && <button onClick={() => supprimerPoste(poste.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '11px' }}>✕</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {canEdit && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                  <input placeholder="Poste (ex: Transport)" value={nouveauPoste.poste} onChange={e => setNouveauPoste(f => ({ ...f, poste: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && ajouterPoste()} style={{ ...input, flex: 1, minWidth: '120px' }} />
                  <input placeholder="Montant €" type="number" min="0" value={nouveauPoste.montant} onChange={e => setNouveauPoste(f => ({ ...f, montant: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && ajouterPoste()} style={{ ...input, width: '110px' }} />
                  <button onClick={ajouterPoste} style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, border: `1px solid ${colors.accent.green}40`, borderRadius: '8px', padding: '0 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>+ Ajouter</button>
                </div>
              )}
            </div>

            <div style={{ ...card, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={sectionTitle}>Actions à venir</h3>
                {projetTaches.length > 0 && <span style={{ fontSize: '10px', color: colors.text.faint }}>{tachesFaites}/{projetTaches.length} terminées</span>}
              </div>
              {projetTaches.filter(a => !a.fait).length === 0 && projetTaches.length === 0 && (
                <p style={{ color: colors.text.faint, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune action pour l'instant.</p>
              )}
              {projetTaches.map(action => (
                <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <span onClick={() => canEdit && toggleTache(action)} style={{ cursor: canEdit ? 'pointer' : 'default', fontSize: '15px', color: action.fait ? colors.accent.green : colors.text.faint }}>{action.fait ? '☑' : '☐'}</span>
                  <span style={{ flex: 1, color: action.fait ? colors.text.faint : colors.text.secondary, fontSize: '13px', textDecoration: action.fait ? 'line-through' : 'none' }}>{action.titre}</span>
                  {canEdit && <button onClick={() => supprimerTache(action.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '11px' }}>✕</button>}
                </div>
              ))}
              {canEdit && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <input value={nouvelleTache?.[projet.id] || ''} onChange={e => setNouvelleTache(prev => ({ ...prev, [projet.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && ajouterTache(projet.id)} placeholder="+ Action..." style={{ ...input, flex: 1 }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Missions & Référents (édition existante) */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: missionsOuvertes ? '14px' : 0, flexWrap: 'wrap', gap: '10px' }}>
            <button onClick={() => setMissionsOuvertes(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: colors.text.faint, fontSize: '11px', transform: missionsOuvertes ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
              <h3 style={{ ...sectionTitle, margin: 0 }}>Missions {projet.missions?.length > 0 ? `(${projet.missions.length})` : ''} & Référents {projet.referents?.length > 0 ? `(${projet.referents.length})` : ''}</h3>
            </button>
            {canEdit && <button onClick={() => onOuvrirEdition?.(projet)} style={{ background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px' }}>✎ Modifier</button>}
          </div>
          {missionsOuvertes && (
            <>
              {projet.referents?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {projet.referents.map(r => (
                    <span key={r.id} style={{ background: colors.accent.amber + alpha.subtle, border: `1px solid ${colors.accent.amber}40`, color: colors.accent.amber, padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>⭐ {r.nom}</span>
                  ))}
                </div>
              )}
              {(!projet.missions || projet.missions.length === 0) ? (
                <p style={{ color: colors.text.faint, fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Aucune mission créée.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {projet.missions.map(m => (
                    <div key={m.id} style={{ background: colors.background.raised, border: `1px solid ${colors.border.faint}`, borderRadius: '10px', padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{m.titre || 'Sans titre'}</p>
                      {m.responsable_nom && <p style={{ margin: '0 0 4px', fontSize: '11px', color: colors.text.dim }}>⭐ {m.responsable_nom}</p>}
                      {m.objectif && <p style={{ margin: 0, fontSize: '12px', color: colors.text.secondary }}>{m.objectif}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Objectif & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={card}>
            <h3 style={{ color: colors.accent.green, margin: '0 0 12px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Objectif du projet</h3>
            <p style={{ color: colors.text.secondary, fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{projet.objectif || '—'}</p>
          </div>
          <div style={card}>
            <h3 style={{ ...sectionTitle, margin: '0 0 12px' }}>Notes & Points clés</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={sauvegarderNotes} disabled={!canEdit}
              placeholder="Ajouter des notes..." rows={4}
              style={{ width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.strong}`, color: colors.text.secondary, borderRadius: '8px', padding: '10px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
