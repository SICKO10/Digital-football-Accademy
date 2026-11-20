// RGPD des fiches d'évaluation, côté club et éducateur (bloc 11b de PLAN-fiches-evaluation.md).
// Quatre parties : demandes de correction, conservation (préavis, prolongation), suppression des
// données d'un joueur, journal des accès. Les droits sont tenus par la base (bloc 11a) : cet écran
// ne fait que demander, et affiche clairement le refus quand la base refuse.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'

const dateFr = (d) => { try { return new Date((d || '').slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return d || '' } }
const dateHeureFr = (d) => { try { return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d || '' } }
const aujourdhui = () => new Date().toISOString().slice(0, 10)
const MOTIFS = {
  evaluations: 'a ouvert les évaluations',
  tests: 'a ouvert les tests',
  notes: 'a ouvert les notes',
  historique: 'a ouvert l\'historique',
  suppression_note: 'a supprimé une note',
  suppression_donnees: 'a supprimé les données d\'évaluation',
  suppression_auto: 'suppression automatique (fin de conservation)',
  prolongation: 'a prolongé la conservation',
}
// Message de la base, sans le préfixe technique
const messageBase = (e) => (e?.message || 'Action refusée').replace(/^.*?exception:\s*/i, '')

export default function RgpdEvaluationsStaff({ mode = 'club', clubId = null, userId = null }) {
  const colors = useColors()
  const estClub = mode === 'club' && !!clubId
  // Éducateur affilié à un club : il ne voit que les demandes qui le concernent (conservation et suppression = le club)
  const gereDonnees = estClub || (mode === 'educateur' && !clubId)
  const [demandes, setDemandes] = useState([])
  const [suivi, setSuivi] = useState([])
  const [journal, setJournal] = useState([])
  const [presents, setPresents] = useState([])
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)
  const [reponse, setReponse] = useState({}) // id -> texte
  const [occupe, setOccupe] = useState(false)
  const [parametres, setParametres] = useState(null)
  const [ouvert, setOuvert] = useState('demandes')

  const charger = useCallback(async () => {
    setMessage('')
    const proprio = estClub ? clubId : userId
    const [d, s, p] = await Promise.all([
      supabase.from('demandes_correction_evaluation').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('conservation_evaluations').select('*').order('suppression_prevue_le', { ascending: true }).limit(1000),
      proprio ? supabase.from('parametres_evaluation').select('conservation_saisons').eq('proprietaire_id', proprio).maybeSingle() : Promise.resolve({ data: null }),
    ])
    // Une demande qu'on a soi-même déposée (compte joueur) n'est pas à traiter ici : la base filtre déjà
    setDemandes((d.data || []).filter(x => x.demandeur_id !== userId))
    setSuivi(s.data || [])
    setParametres(p.data || null)
    if (estClub) {
      const j = await supabase.from('journal_acces_evaluations').select('*').eq('club_id', clubId).order('created_at', { ascending: false }).limit(150)
      const lignes = j.data || []
      const ids = [...new Set(lignes.map(x => x.lecteur_id).filter(Boolean))]
      let noms = {}
      if (ids.length) {
        const { data: pr } = await supabase.from('profiles').select('id, prenom, nom').in('id', ids)
        noms = Object.fromEntries((pr || []).map(x => [x.id, `${x.prenom || ''} ${x.nom || ''}`.trim()]))
      }
      setJournal(lignes.map(x => ({ ...x, lecteur_nom: noms[x.lecteur_id] || '' })))
    }
    // Joueurs qui ont des données (évaluations ou notes) : base de la suppression manuelle
    const filtre = estClub ? { col: 'club_id', val: clubId } : { col: 'educateur_id', val: userId }
    const [ev, no] = await Promise.all([
      supabase.from('evaluations').select('equipe_joueur_id, joueur_nom').eq(filtre.col, filtre.val).limit(2000),
      supabase.from('notes_suivi').select('equipe_joueur_id, joueur_nom').eq(filtre.col, filtre.val).limit(2000),
    ])
    const m = new Map()
    for (const r of [...(ev.data || []), ...(no.data || [])]) {
      if (!r.equipe_joueur_id) continue
      m.set(r.equipe_joueur_id, r.joueur_nom || 'Joueur')
    }
    // Effectif actuel du club (pour les joueurs qui n'ont que d'anciennes fiches)
    if (estClub) {
      const [a, b] = await Promise.all([
        supabase.from('equipe_joueurs').select('id, prenom, nom, club_categories!equipe_joueurs_club_categorie_id_fkey!inner(club_id)').eq('club_categories.club_id', clubId).limit(2000),
        supabase.from('equipe_joueurs').select('id, prenom, nom, categories!equipe_joueurs_categorie_id_fkey!inner(club_id)').eq('categories.club_id', clubId).limit(2000),
      ])
      for (const r of [...(a.data || []), ...(b.data || [])]) {
        if (!m.has(r.id)) m.set(r.id, `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Joueur')
      }
    }
    setPresents([...m.entries()].map(([id, nom]) => ({ id, nom })).sort((x, y) => x.nom.localeCompare(y.nom, 'fr')))
    setChargement(false)
  }, [estClub, clubId, userId])

  useEffect(() => { charger() }, [charger])

  const aTraiter = demandes.filter(d => d.statut === 'recue')
  const prevues = useMemo(() => {
    const m = new Map()
    for (const l of suivi) {
      const cle = l.joueur_id || l.equipe_joueur_id || l.joueur_nom
      if (!m.has(cle)) m.set(cle, { cle, nom: l.joueur_nom || 'Joueur', lignes: [], equipe_joueur_id: l.equipe_joueur_id, joueur_id: l.joueur_id })
      m.get(cle).lignes.push(l)
    }
    return [...m.values()].map(g => {
      const date = g.lignes.map(l => l.suppression_prevue_le).sort()[0]
      const preavis = g.lignes.some(l => l.annonce_le && l.annonce_le <= aujourdhui())
      return { ...g, date, preavis }
    }).sort((a, b) => a.date.localeCompare(b.date))
  }, [suivi])

  const repondre = async (d, statut) => {
    const texte = (reponse[d.id] || '').trim()
    if (statut === 'refusee' && !texte) { setMessage('Un refus doit être expliqué : écris la raison dans le champ de réponse.'); return }
    setOccupe(true); setMessage('')
    const { error } = await supabase.rpc('repondre_demande_correction', { p_id: d.id, p_statut: statut, p_reponse: texte })
    setOccupe(false)
    if (error) { setMessage(messageBase(error)); return }
    setReponse(r => ({ ...r, [d.id]: '' }))
    charger()
  }

  const prolonger = async (g) => {
    if (!window.confirm(`Prolonger d'une saison la conservation des données de ${g.nom} ?`)) return
    setOccupe(true); setMessage('')
    const { data, error } = await supabase.rpc('prolonger_conservation_evaluations', { p_ids: g.lignes.map(l => l.id) })
    setOccupe(false)
    if (error) { setMessage(messageBase(error)); return }
    if (!data) { setMessage("Rien n'a été prolongé : la prolongation est possible seulement pendant le préavis de 30 jours, et par les personnes qui gèrent les fiches."); return }
    charger()
  }

  const supprimer = async ({ nom, equipeJoueurId = null, conservationIds = null }) => {
    if (!window.confirm(`Supprimer les données d'évaluation de ${nom} ?\n\nToutes ses évaluations, tests, auto-évaluations, notes de suivi et anciennes fiches dans ce club seront supprimés définitivement. Cette action est inscrite au journal du club et ne peut pas être annulée.`)) return
    setOccupe(true); setMessage('')
    const { data, error } = await supabase.rpc('supprimer_donnees_evaluation_joueur', {
      p_club_id: estClub ? clubId : null, p_equipe_joueur_id: equipeJoueurId, p_joueur_id: null, p_conservation_ids: conservationIds,
    })
    setOccupe(false)
    if (error) { setMessage(messageBase(error)); return }
    setMessage(`Supprimé pour ${nom} : ${data?.evaluations ?? 0} évaluation(s), ${data?.notes ?? 0} note(s), ${data?.anciennes_fiches ?? 0} ancienne(s) fiche(s).`)
    charger()
  }

  const [recherche, setRecherche] = useState('')
  const trouves = recherche.trim().length < 2 ? [] : presents.filter(p => p.nom.toLowerCase().includes(recherche.trim().toLowerCase())).slice(0, 8)

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14, marginBottom: 12 }
  const bouton = (accent) => ({ padding: '8px 14px', minHeight: 40, borderRadius: 8, cursor: occupe ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif',
    background: accent ? colors.accent.blue : 'transparent', color: accent ? (colors.accent.onBrand || '#0a0a0a') : colors.text.secondary, border: `1px solid ${accent ? colors.accent.blue : colors.border.default}` })
  const titreSection = (cle, texte, nb) => (
    <button onClick={() => setOuvert(ouvert === cle ? '' : cle)} aria-expanded={ouvert === cle}
      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 40, textAlign: 'left' }}>
      <span style={{ color: colors.text.primary, fontSize: 15, fontWeight: 800 }}>{texte}{nb ? <span style={{ marginLeft: 8, background: colors.accent.amber, color: '#0a0a0a', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{nb}</span> : null}</span>
      <span style={{ color: colors.text.faint, fontSize: 18 }}>{ouvert === cle ? '−' : '+'}</span>
    </button>
  )
  const saisons = parametres?.conservation_saisons ?? 2

  return (
    <div>
      <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
        Données personnelles des fiches d'évaluation : demandes des joueurs et des parents, durée de conservation, suppression, journal des accès.
      </p>
      {message && <p role="status" style={{ color: colors.text.secondary, fontSize: 13, margin: '0 0 10px' }}>{message}</p>}
      {chargement && <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement...</p>}

      <section style={carte}>
        {titreSection('demandes', 'Demandes de correction', aTraiter.length)}
        {ouvert === 'demandes' && (
          <div style={{ marginTop: 10 }}>
            {!demandes.length && <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Aucune demande pour le moment. Un joueur ou un parent peut en envoyer une depuis une évaluation terminée et visible. Vous devez répondre dans un délai d'un mois.</p>}
            {demandes.map(d => {
              const enRetard = d.statut === 'recue' && d.echeance < aujourdhui()
              return (
                <div key={d.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 12, color: colors.text.faint }}>
                    <span><strong style={{ color: colors.text.primary }}>{d.joueur_nom || 'Joueur'}</strong> · demande {d.demandeur_type === 'parent' ? 'd\'un parent' : 'du joueur'} · {dateFr(d.created_at)}</span>
                    <span style={{ fontWeight: 700, color: d.statut === 'recue' ? (enRetard ? colors.accent.red : colors.accent.amber) : colors.accent.green }}>
                      {d.statut === 'recue' ? `À traiter avant le ${dateFr(d.echeance)}${enRetard ? ' (délai dépassé)' : ''}` : d.statut === 'traitee' ? 'Traitée' : 'Refusée'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0', color: colors.text.primary, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{d.message}</p>
                  {d.statut === 'recue' ? (
                    <div>
                      <textarea rows={2} maxLength={1000} value={reponse[d.id] || ''} onChange={e => setReponse(r => ({ ...r, [d.id]: e.target.value }))}
                        placeholder="Votre réponse (obligatoire en cas de refus)" aria-label="Réponse à la demande"
                        style={{ width: '100%', boxSizing: 'border-box', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 13, fontFamily: 'Barlow, sans-serif', resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <button disabled={occupe} onClick={() => repondre(d, 'traitee')} style={bouton(true)}>Marquer comme traitée</button>
                        <button disabled={occupe} onClick={() => repondre(d, 'refusee')} style={bouton(false)}>Refuser en expliquant</button>
                      </div>
                      <p style={{ color: colors.text.ghost, fontSize: 11, margin: '6px 0 0' }}>Corrigez d'abord l'évaluation concernée, puis marquez la demande comme traitée.</p>
                    </div>
                  ) : (
                    d.reponse && <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13 }}><strong>Réponse :</strong> {d.reponse}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {gereDonnees && (<>
      <section style={carte}>
        {titreSection('conservation', 'Joueurs partis : conservation et suppression', prevues.filter(g => g.preavis).length)}
        {ouvert === 'conservation' && (
          <div style={{ marginTop: 10 }}>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
              Quand un joueur quitte {estClub ? 'le club' : 'votre suivi'}, ses évaluations et notes sont gardées jusqu'au 1er juillet après la saison de son départ, plus {saisons} saison{saisons > 1 ? 's' : ''} (réglage de la fiche), puis supprimées automatiquement la nuit. Un préavis s'affiche 30 jours avant. Pendant ce préavis, vous pouvez prolonger d'une saison.
            </p>
            {!prevues.length && <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Aucun joueur parti avec des données conservées.</p>}
            {prevues.map(g => (
              <div key={g.cle} style={{ padding: '10px 0', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ minWidth: 180 }}>
                  <div style={{ color: colors.text.primary, fontSize: 14, fontWeight: 700 }}>{g.nom}</div>
                  <div style={{ fontSize: 12, color: g.preavis ? colors.accent.amber : colors.text.faint }}>
                    {g.preavis ? 'Préavis : suppression prévue le ' : 'Suppression prévue le '}{dateFr(g.date)} · {g.lignes.length} élément{g.lignes.length > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {g.preavis && <button disabled={occupe} onClick={() => prolonger(g)} style={bouton(true)}>Prolonger d'une saison</button>}
                  <button disabled={occupe} onClick={() => supprimer({ nom: g.nom, equipeJoueurId: null, conservationIds: g.lignes.map(l => l.id) })} style={{ ...bouton(false), color: colors.accent.red, borderColor: colors.accent.red }}>Supprimer maintenant</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={carte}>
        {titreSection('suppression', 'Supprimer les données d\'un joueur')}
        {ouvert === 'suppression' && (
          <div style={{ marginTop: 10 }}>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>
              Pour répondre à une demande d'effacement. Supprime toutes ses évaluations, tests, auto-évaluations, notes de suivi et anciennes fiches. {estClub ? 'Réservé au compte du club et au président. ' : ''}Définitif.
            </p>
            <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher un joueur (2 lettres au moins)" aria-label="Chercher un joueur"
              style={{ width: '100%', boxSizing: 'border-box', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 14, minHeight: 40 }} />
            {trouves.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                <span style={{ color: colors.text.primary, fontSize: 14 }}>{p.nom}</span>
                <button disabled={occupe} onClick={() => supprimer({ nom: p.nom, equipeJoueurId: p.id })} style={{ ...bouton(false), color: colors.accent.red, borderColor: colors.accent.red }}>Supprimer ses données</button>
              </div>
            ))}
            {recherche.trim().length >= 2 && !trouves.length && <p style={{ color: colors.text.faint, fontSize: 13, margin: '8px 0 0' }}>Aucun joueur trouvé.</p>}
          </div>
        )}
      </section>

      </>)}

      {estClub && (
        <section style={carte}>
          {titreSection('journal', 'Journal des accès')}
          {ouvert === 'journal' && (
            <div style={{ marginTop: 10 }}>
              <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>
                Chaque ouverture d'un historique transmis (évaluations, tests, notes d'un ancien éducateur) est inscrite ici : qui, quoi, quand. Ce journal protège les joueurs. Il est supprimé en même temps que l'historique concerné, et au plus tard au bout de 3 ans. Les 150 dernières lignes sont affichées.
              </p>
              {!journal.length && <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Aucune ligne pour le moment.</p>}
              {journal.map(j => (
                <div key={j.id} style={{ padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}`, fontSize: 12, color: colors.text.secondary }}>
                  <span style={{ color: colors.text.faint }}>{dateHeureFr(j.created_at)}</span> · {j.lecteur_nom || (j.objet === 'suppression_auto' ? 'Système' : 'Un membre du staff')} {MOTIFS[j.objet] || j.objet}{j.joueur_nom ? ` · ${j.joueur_nom}` : ''}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
