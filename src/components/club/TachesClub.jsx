import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'

const IcoPersonne = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IcoPoubelle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>

const STATUTS = [
  { val: 'a_faire', label: 'À faire', color: 'orange' },
  { val: 'en_cours', label: 'En cours', color: 'blue' },
  { val: 'terminee', label: 'Terminée', color: 'green' },
]

const emptyResponsabilite = { domaine: '', emoji: '📋', tache: '', responsable_id: '', responsable_nom_libre: '' }
const emptyTache = { titre: '', emoji: '✅', responsable_id: '', responsable_nom_libre: '', echeance: '' }

// Onglet "Tâches & Responsabilités" — responsabilites_club (qui fait quoi, en
// continu) et taches_club (tâches ponctuelles avec statut), toutes deux
// scopées par club_id (cf. supabase_taches_responsabilites_club.sql). Les
// responsables sont choisis parmi educateursAffilies (déjà chargé par
// DashboardClub, mêmes données que club_educateurs — pas de requête propre ici).
export default function TachesClub({ clubId, educateursAffilies, couleurPrincipale, readOnly }) {
  const colors = useColors()
  const accent = couleurPrincipale || colors.accent.green
  const [onglet, setOnglet] = useState('responsabilites')
  const [responsabilites, setResponsabilites] = useState([])
  const [taches, setTaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [formResp, setFormResp] = useState(emptyResponsabilite)
  const [formTache, setFormTache] = useState(emptyTache)
  const [ajoutResp, setAjoutResp] = useState(false)
  const [ajoutTache, setAjoutTache] = useState(false)
  const [respModeManuel, setRespModeManuel] = useState(false)
  const [tacheModeManuel, setTacheModeManuel] = useState(false)

  const educateursAcceptes = (educateursAffilies || []).filter(e => e.statut === 'accepte')

  useEffect(() => { charger() }, [clubId])

  const charger = async () => {
    if (!clubId) return
    setLoading(true)
    const [{ data: r }, { data: t }] = await Promise.all([
      supabase.from('responsabilites_club').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('taches_club').select('*').eq('club_id', clubId).order('echeance', { ascending: true, nullsFirst: false }),
    ])
    setResponsabilites(r || [])
    setTaches(t || [])
    setLoading(false)
  }

  const nomResponsable = (id) => {
    const e = educateursAcceptes.find(e => e.educateur_id === id)
    return e ? `${e.educateur?.prenom || ''} ${e.educateur?.nom || ''}`.trim() : ''
  }

  const ajouterResponsabilite = async () => {
    if (!formResp.tache.trim()) return
    const responsableId = respModeManuel ? null : (formResp.responsable_id || null)
    const responsableNom = respModeManuel
      ? (formResp.responsable_nom_libre.trim() || null)
      : (formResp.responsable_id ? nomResponsable(formResp.responsable_id) : null)
    const { data, error } = await supabase.from('responsabilites_club').insert({
      club_id: clubId,
      domaine: formResp.domaine.trim() || null,
      emoji: formResp.emoji || '📋',
      tache: formResp.tache.trim(),
      responsable_id: responsableId,
      responsable_nom: responsableNom,
    }).select().single()
    if (error) return
    setResponsabilites(prev => [data, ...prev])
    setFormResp(emptyResponsabilite)
    setRespModeManuel(false)
    setAjoutResp(false)
  }

  const supprimerResponsabilite = async (id) => {
    if (!confirm('Supprimer cette responsabilité ?')) return
    await supabase.from('responsabilites_club').delete().eq('id', id)
    setResponsabilites(prev => prev.filter(r => r.id !== id))
  }

  const ajouterTache = async () => {
    if (!formTache.titre.trim()) return
    const responsableId = tacheModeManuel ? null : (formTache.responsable_id || null)
    const responsableNom = tacheModeManuel
      ? (formTache.responsable_nom_libre.trim() || null)
      : (formTache.responsable_id ? nomResponsable(formTache.responsable_id) : null)
    const { data, error } = await supabase.from('taches_club').insert({
      club_id: clubId,
      titre: formTache.titre.trim(),
      emoji: formTache.emoji || '✅',
      responsable_id: responsableId,
      responsable_nom: responsableNom,
      echeance: formTache.echeance || null,
    }).select().single()
    if (error) return
    setTaches(prev => [...prev, data].sort((a, b) => (a.echeance || '9999') < (b.echeance || '9999') ? -1 : 1))
    setFormTache(emptyTache)
    setTacheModeManuel(false)
    setAjoutTache(false)
  }

  const changerStatut = async (id, statut) => {
    setTaches(prev => prev.map(t => t.id === id ? { ...t, statut } : t))
    await supabase.from('taches_club').update({ statut }).eq('id', id)
  }

  const supprimerTache = async (id) => {
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('taches_club').delete().eq('id', id)
    setTaches(prev => prev.filter(t => t.id !== id))
  }

  const statutInfo = (val) => STATUTS.find(s => s.val === val) || STATUTS[0]

  const ouvrirAjout = () => {
    if (onglet === 'responsabilites') setAjoutResp(true)
    else setAjoutTache(true)
  }

  // V2 : en-tête + onglets compacts, chiffres clés sans emoji, liste pleine
  // largeur (tâches en retard signalées), aide réduite à une ligne. Les
  // colonnes emoji restent enregistrées en base mais ne sont plus affichées.
  const items = onglet === 'responsabilites' ? responsabilites : taches
  const enCours = taches.filter(t => t.statut === 'en_cours').length
  const terminees = taches.filter(t => t.statut === 'terminee').length
  const aujourdHui = new Date().toISOString().slice(0, 10)
  const enRetard = taches.filter(t => t.echeance && t.echeance < aujourdHui && t.statut !== 'terminee').length
  const champ = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 12px', color: colors.text.primary, fontSize: '13px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', minWidth: 0 }
  const eyebrow = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px' }

  const STATS = [
    { label: 'Responsabilités', value: responsabilites.length, color: colors.accent.blue, detail: `${responsabilites.filter(r => r.responsable_nom).length} attribuée${responsabilites.filter(r => r.responsable_nom).length > 1 ? 's' : ''}` },
    { label: 'Tâches', value: taches.length, color: colors.text.primary, detail: `${taches.length - terminees} ouverte${taches.length - terminees > 1 ? 's' : ''}` },
    { label: 'En cours', value: enCours, color: colors.accent.blue, detail: enRetard ? `${enRetard} en retard` : 'aucune en retard', alerte: enRetard > 0 },
    { label: 'Terminées', value: terminees, color: colors.accent.green, detail: taches.length ? `${Math.round(terminees / taches.length * 100)}% des tâches` : '—' },
  ]

  const choixResponsable = (modeManuel, setModeManuel, form, setForm) => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '9px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
        {[{ val: false, label: 'Membre du club' }, { val: true, label: 'Autre personne' }].map(m => (
          <button key={String(m.val)} type="button" onClick={() => setModeManuel(m.val)}
            style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: modeManuel === m.val ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: modeManuel === m.val ? colors.background.raised : 'transparent',
              color: modeManuel === m.val ? colors.text.primary : colors.text.faint }}>
            {m.label}
          </button>
        ))}
      </div>
      {modeManuel ? (
        <input value={form.responsable_nom_libre} onChange={e => setForm(f => ({ ...f, responsable_nom_libre: e.target.value }))}
          placeholder="Nom et prénom (hors plateforme)" style={{ ...champ, flex: '1 1 200px' }} />
      ) : (
        <select value={form.responsable_id} onChange={e => setForm(f => ({ ...f, responsable_id: e.target.value }))} style={{ ...champ, flex: '1 1 200px' }}>
          <option value="">Responsable (optionnel)</option>
          {educateursAcceptes.map(e => <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>)}
        </select>
      )}
    </div>
  )
  const boutonsForm = (annuler, valider, invalide) => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button onClick={annuler} style={{ background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
      <button onClick={valider} disabled={invalide} style={{ background: accent, color: colors.background.base, border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', opacity: invalide ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>Ajouter</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: colors.text.primary }}>Tâches & Responsabilités</h1>
          <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Qui fait quoi dans le club : les responsabilités permanentes et les tâches à échéance.</p>
        </div>
        {!readOnly && (
          <button onClick={ouvrirAjout} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: accent, color: colors.background.base, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            + {onglet === 'responsabilites' ? 'Nouvelle responsabilité' : 'Nouvelle tâche'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        {STATS.map(x => (
          <div key={x.label} style={{ ...carte, padding: '16px 18px' }}>
            <p style={{ margin: 0, color: colors.text.faint, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{x.label}</p>
            <p style={{ margin: '8px 0 4px', fontSize: '28px', fontWeight: 800, lineHeight: 1, color: x.color, fontVariantNumeric: 'tabular-nums' }}>{x.value}</p>
            <p style={{ margin: 0, fontSize: '12px', color: x.alerte ? colors.accent.red : colors.text.faint }}>{x.detail}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '3px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}` }}>
        {[{ val: 'responsabilites', label: 'Responsabilités récurrentes', n: responsabilites.length }, { val: 'taches', label: 'Tâches ponctuelles', n: taches.length }].map(o => (
          <button key={o.val} onClick={() => setOnglet(o.val)}
            style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: onglet === o.val ? 700 : 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              background: onglet === o.val ? colors.background.raised : 'transparent',
              color: onglet === o.val ? colors.text.primary : colors.text.faint }}>
            {o.label} <span style={{ color: colors.text.faint, fontWeight: 600 }}>{o.n}</span>
          </button>
        ))}
      </div>
      <p style={{ margin: '-8px 0 0', fontSize: '12px', color: colors.text.faint }}>
        {onglet === 'responsabilites'
          ? 'Missions permanentes (licences, communication, matériel…) — à attribuer dès le début de saison pour éviter les oublis.'
          : 'Actions à date butoir (préparer un tournoi, envoyer un document…), avec un responsable et un statut.'}
      </p>

      <div style={{ ...carte, overflow: 'hidden' }}>
        {(ajoutResp && onglet === 'responsabilites') && (
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: '10px', background: accent + '08' }}>
            <p style={eyebrow}>Nouvelle responsabilité</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <input value={formResp.domaine} onChange={e => setFormResp(f => ({ ...f, domaine: e.target.value }))} placeholder="Domaine (ex : Communication, Terrains…)" style={champ} />
              <input value={formResp.tache} onChange={e => setFormResp(f => ({ ...f, tache: e.target.value }))} placeholder="Responsabilité (ex : Gérer les réservations)" style={champ} />
            </div>
            {choixResponsable(respModeManuel, setRespModeManuel, formResp, setFormResp)}
            {boutonsForm(() => { setAjoutResp(false); setFormResp(emptyResponsabilite); setRespModeManuel(false) }, ajouterResponsabilite, !formResp.tache.trim())}
          </div>
        )}

        {(ajoutTache && onglet === 'taches') && (
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: '10px', background: accent + '08' }}>
            <p style={eyebrow}>Nouvelle tâche</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 160px', gap: '10px' }}>
              <input value={formTache.titre} onChange={e => setFormTache(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la tâche" style={champ} />
              <input type="date" value={formTache.echeance} onChange={e => setFormTache(f => ({ ...f, echeance: e.target.value }))} title="Échéance" style={champ} />
            </div>
            {choixResponsable(tacheModeManuel, setTacheModeManuel, formTache, setFormTache)}
            {boutonsForm(() => { setAjoutTache(false); setFormTache(emptyTache); setTacheModeManuel(false) }, ajouterTache, !formTache.titre.trim())}
          </div>
        )}

        {loading ? (
          <p style={{ color: colors.text.faint, fontSize: '13px', padding: '20px' }}>Chargement...</p>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: colors.text.secondary, fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>
              Aucune {onglet === 'responsabilites' ? 'responsabilité' : 'tâche'} pour l'instant
            </p>
            <p style={{ color: colors.text.faint, fontSize: '12px', margin: '0 0 16px' }}>
              {onglet === 'responsabilites' ? 'Attribue les missions permanentes du club à tes membres.' : 'Ajoute une tâche avec un responsable et une échéance.'}
            </p>
            {!readOnly && !(ajoutResp || ajoutTache) && (
              <button onClick={ouvrirAjout} style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${accent}50`, background: accent + '14', color: accent, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                + Ajouter
              </button>
            )}
          </div>
        ) : onglet === 'responsabilites' ? (
          responsabilites.map(r => (
            <div key={r.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {r.domaine && <p style={{ margin: 0, color: accent, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{r.domaine}</p>}
                <p style={{ margin: '2px 0 0', color: colors.text.primary, fontWeight: 600, fontSize: '14px' }}>{r.tache}</p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', flexShrink: 0, color: r.responsable_nom ? colors.text.secondary : colors.accent.amber, background: r.responsable_nom ? colors.background.raised : colors.accent.amber + '14' }}>
                <IcoPersonne /> {r.responsable_nom || 'Non attribuée'}
              </span>
              {!readOnly && (
                <button onClick={() => supprimerResponsabilite(r.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: colors.text.faint, cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}><IcoPoubelle /></button>
              )}
            </div>
          ))
        ) : (
          taches.map(t => {
            const si = statutInfo(t.statut)
            const retard = t.echeance && t.echeance < aujourdHui && t.statut !== 'terminee'
            return (
              <div key={t.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: '14px', borderLeft: `3px solid ${colors.accent[si.color]}`, opacity: t.statut === 'terminee' ? 0.65 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: colors.text.primary, fontWeight: 600, fontSize: '14px', textDecoration: t.statut === 'terminee' ? 'line-through' : 'none' }}>{t.titre}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px', fontSize: '12px', color: colors.text.faint }}>
                    {t.responsable_nom && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IcoPersonne /> {t.responsable_nom}</span>}
                    {t.echeance && <span style={{ color: retard ? colors.accent.red : colors.text.faint, fontWeight: retard ? 700 : 400 }}>{retard ? 'En retard · ' : 'Échéance '}{new Date(t.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </div>
                </div>
                <select value={t.statut} disabled={readOnly} onChange={e => changerStatut(t.id, e.target.value)}
                  style={{ background: colors.accent[si.color] + alpha.subtle, color: colors.accent[si.color], border: `1px solid ${colors.accent[si.color]}60`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: readOnly ? 'default' : 'pointer', flexShrink: 0 }}>
                  {STATUTS.map(x => <option key={x.val} value={x.val}>{x.label}</option>)}
                </select>
                {!readOnly && (
                  <button onClick={() => supprimerTache(t.id)} title="Supprimer" style={{ background: 'transparent', border: 'none', color: colors.text.faint, cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}><IcoPoubelle /></button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
