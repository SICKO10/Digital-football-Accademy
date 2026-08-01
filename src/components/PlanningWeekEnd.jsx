import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { repartirBus } from '../lib/repartitionBus'

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
  th: { padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  td: { padding: '6px 10px' },
}

const ligneVide = () => ({
  _id: crypto.randomUUID(),
  club_categorie_id: '', jour: 'samedi',
  heure_depart: '', heure_retour_estimee: '', lieu_destination: '', nb_personnes: '',
})

// Prochain samedi (ou aujourd'hui si on est déjà samedi), au format AAAA-MM-JJ.
const prochainSamedi = () => {
  const d = new Date()
  const diff = (6 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const ajouterJours = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function PlanningWeekEnd({ clubId, accentColor = '#4ade80' }) {
  const [weekendDate, setWeekendDate] = useState(prochainSamedi)
  const [categories, setCategories] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [loadingRef, setLoadingRef] = useState(true)

  const [lignes, setLignes] = useState([ligneVide()])
  const [suggestions, setSuggestions] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)

  const charger = async () => {
    setLoadingRef(true)
    const [{ data: cats }, { data: vh }] = await Promise.all([
      supabase.from('club_categories').select('id, nom, equipe, educateur_id').eq('club_id', clubId).order('nom'),
      supabase.from('vehicules').select('*').eq('club_id', clubId).order('plaque'),
    ])
    setCategories(cats || [])
    setVehicules(vh || [])
    setLoadingRef(false)
  }

  useEffect(() => { if (clubId) charger() }, [clubId])

  const modifierLigne = (id, champ, valeur) => {
    setLignes(prev => prev.map(l => (l._id === id ? { ...l, [champ]: valeur } : l)))
  }

  const ajouterLigne = () => setLignes(prev => [...prev, ligneVide()])
  const supprimerLigne = (id) => setLignes(prev => prev.filter(l => l._id !== id))

  const categorieLabel = (catId) => {
    const c = categories.find(x => x.id === catId)
    return c ? `${c.nom}${c.equipe ? ` ${c.equipe}` : ''}` : ''
  }

  // ── Répartition — un calcul indépendant par jour, un bus qui termine sa
  // journée du samedi ne doit pas être considéré "occupé" le dimanche matin.
  const repartir = () => {
    const valides = lignes.filter(l => l.club_categorie_id && l.heure_depart)
    const samedi = repartirBus(valides.filter(l => l.jour === 'samedi'), vehicules)
    const dimanche = repartirBus(valides.filter(l => l.jour === 'dimanche'), vehicules)
    setSuggestions([...samedi, ...dimanche].map(s => ({
      ...s,
      equipe: categorieLabel(s.club_categorie_id),
      date_depart: ajourJoursSelonJour(s.jour),
    })))
  }

  const ajourJoursSelonJour = (jour) => (jour === 'dimanche' ? ajouterJours(weekendDate, 1) : weekendDate)

  const modifierSuggestion = (id, champ, valeur) => {
    setSuggestions(prev => prev.map(s => (s._id === id ? { ...s, [champ]: valeur } : s)))
  }

  const nbInsuffisants = (suggestions || []).filter(s => s.statut === 'insuffisant' && !s.vehicule).length
  const nbCombines = (suggestions || []).filter(s => s.statut === 'combine').length

  // ── Publication ──────────────────────────────────────────────────────────────
  const publier = async () => {
    if (!suggestions || suggestions.length === 0) return
    setPublishing(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = suggestions.map(s => {
      const cat = categories.find(c => c.id === s.club_categorie_id)
      return {
        club_id: clubId,
        equipe: s.equipe || null,
        educateur_id: cat?.educateur_id || null,
        educateur_responsable: null, // résolu ci-dessous une fois les noms chargés
        date_depart: s.date_depart,
        heure_depart: s.heure_depart || null,
        heure_retour_estimee: s.heure_retour_estimee || null,
        lieu_destination: s.lieu_destination || null,
        nature: 'match',
        vehicule: s.vehicule || null,
        conducteur: s.conducteur || null,
        nb_personnes: s.nb_personnes !== '' ? parseInt(s.nb_personnes) : null,
        created_by: user?.id || null,
      }
    })

    // Résout les noms des éducateurs concernés pour educateur_responsable + les notifications.
    const educateurIds = [...new Set(payload.map(p => p.educateur_id).filter(Boolean))]
    let profils = []
    if (educateurIds.length > 0) {
      const { data } = await supabase.from('profiles').select('id, prenom, nom').in('id', educateurIds)
      profils = data || []
    }
    const nomEducateur = (id) => {
      const p = profils.find(x => x.id === id)
      return p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : null
    }
    const payloadFinal = payload.map(p => ({ ...p, educateur_responsable: p.educateur_id ? nomEducateur(p.educateur_id) : null }))

    const { error } = await supabase.from('deplacements').insert(payloadFinal)
    if (error) { setPublishing(false); alert('Erreur lors de la publication : ' + error.message); return }

    // Notifie chaque éducateur concerné (une notification par équipe/déplacement).
    if (educateurIds.length > 0) {
      const notifs = payloadFinal.filter(p => p.educateur_id).map(p => ({
        user_id: p.educateur_id,
        type: 'deplacement',
        titre: `🚌 Déplacement assigné — ${p.equipe || 'ton équipe'}`,
        contenu: `${p.lieu_destination || ''} le ${p.date_depart}${p.heure_depart ? ` à ${p.heure_depart.slice(0, 5)}` : ''}${p.vehicule ? ` · ${p.vehicule}` : ''}`,
        lien: '/educateur',
      }))
      await supabase.from('notifications').insert(notifs)
    }

    setPublishing(false)
    setPublishSuccess(true)
    setLignes([ligneVide()])
    setSuggestions(null)
  }

  const recommencer = () => {
    setLignes([ligneVide()])
    setSuggestions(null)
    setPublishSuccess(false)
  }

  return (
    <div>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>
        Planifie les déplacements du week-end et laisse l'algorithme proposer une répartition des bus.
      </p>

      {publishSuccess && (
        <div style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, borderRadius: '10px', padding: '14px 16px', marginBottom: '1.5rem', color: accentColor, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>✅ Planning publié — visible dans la liste des déplacements, et les éducateurs concernés ont été notifiés.</span>
          <button onClick={recommencer} style={{ background: 'transparent', border: `1px solid ${accentColor}40`, color: accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Nouveau week-end
          </button>
        </div>
      )}

      <div style={{ ...st.card, marginBottom: '1.5rem' }}>
        <label style={st.label}>Week-end du (samedi)</label>
        <input style={{ ...st.input, maxWidth: '200px' }} type="date" value={weekendDate} onChange={e => setWeekendDate(e.target.value)} />
        <p style={{ fontSize: '11px', color: '#555', margin: '8px 0 0' }}>Dimanche : {new Date(ajouterJours(weekendDate, 1) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
      </div>

      <div style={{ ...st.card, marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Déplacements du week-end</p>
        <p style={{ fontSize: '12px', color: '#555', margin: '0 0 14px' }}>
          {loadingRef ? 'Chargement...' : `${vehicules.length} véhicule${vehicules.length > 1 ? 's' : ''} disponible${vehicules.length > 1 ? 's' : ''} dans le parc.`}
        </p>

        {categories.length === 0 && !loadingRef ? (
          <p style={{ color: '#444', fontSize: '12px' }}>Aucune catégorie/équipe configurée — ajoute-en dans l'onglet Catégories & Équipes.</p>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <th style={st.th}>Équipe</th>
                  <th style={st.th}>Jour</th>
                  <th style={st.th}>Départ</th>
                  <th style={st.th}>Retour est.</th>
                  <th style={st.th}>Lieu</th>
                  <th style={st.th}>Nb pers.</th>
                  <th style={st.th}></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l._id} style={{ borderBottom: '1px solid #141414' }}>
                    <td style={st.td}>
                      <select style={{ ...st.input, minWidth: '140px' }} value={l.club_categorie_id} onChange={e => modifierLigne(l._id, 'club_categorie_id', e.target.value)}>
                        <option value="">—</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.nom} {c.equipe}</option>)}
                      </select>
                    </td>
                    <td style={st.td}>
                      <select style={st.input} value={l.jour} onChange={e => modifierLigne(l._id, 'jour', e.target.value)}>
                        <option value="samedi">Samedi</option>
                        <option value="dimanche">Dimanche</option>
                      </select>
                    </td>
                    <td style={st.td}><input style={st.input} type="time" value={l.heure_depart} onChange={e => modifierLigne(l._id, 'heure_depart', e.target.value)} /></td>
                    <td style={st.td}><input style={st.input} type="time" value={l.heure_retour_estimee} onChange={e => modifierLigne(l._id, 'heure_retour_estimee', e.target.value)} /></td>
                    <td style={st.td}><input style={{ ...st.input, minWidth: '120px' }} value={l.lieu_destination} onChange={e => modifierLigne(l._id, 'lieu_destination', e.target.value)} /></td>
                    <td style={st.td}><input style={{ ...st.input, maxWidth: '70px' }} type="number" min="0" value={l.nb_personnes} onChange={e => modifierLigne(l._id, 'nb_personnes', e.target.value)} /></td>
                    <td style={st.td}>{lignes.length > 1 && <button onClick={() => supprimerLigne(l._id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={ajouterLigne}
          style={{ marginTop: '12px', background: 'transparent', border: '1px solid #333', color: '#888', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          + Ajouter un déplacement
        </button>
      </div>

      <div style={st.card}>
        <button onClick={repartir} disabled={vehicules.length === 0}
          style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: vehicules.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: vehicules.length === 0 ? 0.5 : 1 }}>
          🧮 Répartir les bus
        </button>

        {suggestions && (
          <div style={{ marginTop: '18px' }}>
            {suggestions.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Ajoute au moins un déplacement avec une équipe et une heure de départ.</p>
            ) : (
              <>
                {nbCombines > 0 && (
                  <p style={{ color: accentColor, fontSize: '13px', marginBottom: '8px' }}>
                    🔀 {nbCombines} déplacement{nbCombines > 1 ? 's' : ''} nécessite{nbCombines > 1 ? 'nt' : ''} deux bus combinés.
                  </p>
                )}
                {nbInsuffisants > 0 && (
                  <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
                    ⚠️ Bus insuffisants pour {nbInsuffisants} déplacement{nbInsuffisants > 1 ? 's' : ''} — assigne un véhicule manuellement.
                  </p>
                )}
                <div style={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '780px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <th style={st.th}>Équipe</th>
                        <th style={st.th}>Jour</th>
                        <th style={st.th}>Départ</th>
                        <th style={st.th}>Retour</th>
                        <th style={st.th}>Lieu</th>
                        <th style={st.th}>Bus assigné</th>
                        <th style={st.th}>Conducteur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map(s => (
                        <tr key={s._id} style={{ borderBottom: '1px solid #141414', background: s.statut === 'insuffisant' ? '#ef444408' : s.statut === 'combine' ? accentColor + '08' : 'transparent' }}>
                          <td style={st.td}>{s.equipe || '—'}</td>
                          <td style={st.td}>{s.jour === 'dimanche' ? 'Dim.' : 'Sam.'}</td>
                          <td style={st.td}>{s.heure_depart || '—'}</td>
                          <td style={st.td}>{s.heure_retour_estimee || '—'}</td>
                          <td style={st.td}>{s.lieu_destination || '—'}</td>
                          <td style={st.td}>
                            {s.statut === 'combine' && <p style={{ margin: '0 0 4px', fontSize: '11px', color: accentColor, fontWeight: 600 }}>🔀 {s.vehicule}</p>}
                            <select style={{ ...st.input, borderColor: !s.vehicule ? '#ef444460' : '#2a2a2a' }} value={s.statut === 'combine' ? '' : s.vehicule} onChange={e => modifierSuggestion(s._id, 'vehicule', e.target.value)}>
                              <option value="">{s.statut === 'combine' ? '— remplacer par un seul bus —' : '— aucun —'}</option>
                              {vehicules.map(v => <option key={v.id} value={v.plaque}>{v.plaque} ({v.capacite} pl.)</option>)}
                            </select>
                          </td>
                          <td style={st.td}><input style={st.input} placeholder="Nom du conducteur" value={s.conducteur} onChange={e => modifierSuggestion(s._id, 'conducteur', e.target.value)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button onClick={publier} disabled={publishing}
                  style={{ marginTop: '18px', background: accentColor, color: '#000', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: publishing ? 0.6 : 1 }}>
                  {publishing ? 'Publication...' : '📤 Publier'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
