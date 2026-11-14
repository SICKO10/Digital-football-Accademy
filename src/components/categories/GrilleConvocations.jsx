import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { useIsMobileOrTablet } from '../../hooks/useIsMobileOrTablet'
import { labelCategorie } from '../../lib/categories'
import { calculerExpirationConvocation } from '../../lib/convocations'
import { regrouperEffectifCommun } from '../../lib/categoriesEffectif'
import {
  colonnesGrille, cochesInitiales, colonneModifiee, filtrerJoueurs, paginer, peutEtreConvoque, heureCourte,
  conflitsJoueur, texteConflit, indexerSondage, fusionnerSondageDate, statutSondage, absentDuMatch,
} from '../../lib/categoriesGrille'
import Avatar from '../Avatar'

const aujourdhui = () => new Date().toISOString().slice(0, 10)

// Grille de convocation d'une catégorie en effectif commun (bloc 4 du chantier
// catégories) : toute la catégorie en lignes, un match par colonne pour la
// date choisie. L'envoi passe par la fonction de la base
// categories_publier_convocation (éducateur : son équipe ; club : toutes).
export default function GrilleConvocations({ categorie, userId, estClub, accentColor, filAriane, onRetour }) {
  const colors = useColors()
  const isMobile = useIsMobileOrTablet()
  const [date, setDate] = useState(null)
  const [joueurs, setJoueurs] = useState(null)
  const [colonnes, setColonnes] = useState([])
  const [coches, setCoches] = useState({})
  const [initial, setInitial] = useState({})
  const [sondage, setSondage] = useState({})
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(1)
  const [colMobile, setColMobile] = useState(0)
  const [envoiEnCours, setEnvoiEnCours] = useState(null)
  const [message, setMessage] = useState(null) // { texte, erreur }
  const [chargement, setChargement] = useState(true)

  const libelleCategorie = labelCategorie(categorie.nom)
  const accent = accentColor || colors.accent.green

  // Effectif commun (une ligne par compte) : fiches lisibles par la règle du
  // bloc 3. Date de départ : le prochain match de la catégorie.
  useEffect(() => {
    let annule = false
    ;(async () => {
      const [{ data: fiches, error }, { data: prochaine }] = await Promise.all([
        supabase.from('equipe_joueurs').select('id, prenom, nom, poste, joueur_id, club_categorie_id, created_at').eq('categorie_id', categorie.id).order('nom'),
        supabase.rpc('categories_grille_prochaine_date', { p_categorie_id: categorie.id }),
      ])
      if (annule) return
      if (error) setMessage({ texte: `Effectif non chargé : ${error.message}`, erreur: true })
      const { joueurs: liste } = regrouperEffectifCommun(fiches || [], null)
      const ids = [...new Set(liste.map(j => j.joueur_id).filter(Boolean))]
      let avatars = {}
      if (ids.length > 0) {
        const { data: profils } = await supabase.from('profiles_public').select('id, avatar_url').in('id', ids)
        avatars = Object.fromEntries((profils || []).map(p => [p.id, p.avatar_url]))
      }
      if (annule) return
      setJoueurs(liste.map(j => ({ ...j, avatar_url: j.joueur_id ? avatars[j.joueur_id] || null : null })))
      setDate(prochaine || aujourdhui())
    })()
    return () => { annule = true }
  }, [categorie.id])

  // Matchs de la date et déjà convoqués.
  useEffect(() => {
    if (!date) return undefined
    let annule = false
    ;(async () => {
      const [{ data: matchs, error }, { data: convoques }] = await Promise.all([
        supabase.rpc('categories_grille_matchs', { p_categorie_id: categorie.id, p_date: date }),
        supabase.rpc('categories_grille_convoques', { p_categorie_id: categorie.id, p_date: date }),
      ])
      if (annule) return
      if (error) setMessage({ texte: `Matchs non chargés : ${error.message}`, erreur: true })
      const cols = colonnesGrille(matchs || [], { userId, estClub })
      const depart = cochesInitiales(cols, convoques || [])
      // Réponses au sondage de chaque match (lisibles par la règle du bloc 3).
      const matchIds = cols.map(c => c.match_id)
      let reponses = []
      if (matchIds.length > 0) {
        const { data } = await supabase.from('disponibilites').select('joueur_id, match_id, statut').in('match_id', matchIds)
        reponses = data || []
      }
      // Réponse à la date, donnée par le joueur depuis son espace (bloc 6).
      const { data: reponsesDate } = await supabase.from('disponibilites_categorie').select('joueur_id, statut').eq('categorie_id', categorie.id).eq('date', date)
      if (annule) return
      setSondage(fusionnerSondageDate(indexerSondage(reponses), cols, reponsesDate))
      setColonnes(cols)
      setInitial(depart)
      setCoches(Object.fromEntries(Object.entries(depart).map(([k, v]) => [k, new Set(v)])))
      setColMobile(0)
      setChargement(false)
    })()
    return () => { annule = true }
  }, [date, categorie.id, userId, estClub])

  const filtres = useMemo(() => filtrerJoueurs(joueurs, recherche), [joueurs, recherche])
  const pagination = paginer(filtres, page)
  const colonnesAffichees = isMobile ? colonnes.slice(colMobile, colMobile + 1) : colonnes

  const basculer = (matchId, compte) => {
    setMessage(null)
    const dejaCoche = coches[matchId]?.has(compte)
    if (!dejaCoche) {
      const col = colonnes.find(c => c.match_id === matchId)
      const conflit = conflitsJoueur(compte, matchId, colonnes, coches)
      const prevenir = [
        conflit.length > 0 && `${texteConflit(conflit)}.`,
        absentDuMatch(compte, matchId, sondage) && 'Il a répondu absent à ce match.',
      ].filter(Boolean)
      if (prevenir.length > 0 && !window.confirm(`${prevenir.join(' ')}\n\nLe convoquer quand même en ${col?.libelle || 'cette équipe'} ?`)) return
    }
    setCoches(prev => {
      const suivant = new Set(prev[matchId] || [])
      if (suivant.has(compte)) suivant.delete(compte); else suivant.add(compte)
      return { ...prev, [matchId]: suivant }
    })
  }

  const envoyer = async (col) => {
    const selection = coches[col.match_id] || new Set()
    setEnvoiEnCours(col.match_id); setMessage(null)
    const { error } = await supabase.rpc('categories_publier_convocation', {
      p_match_id: col.match_id,
      p_joueur_ids: [...selection],
      p_expire_at: calculerExpirationConvocation(date),
    })
    setEnvoiEnCours(null)
    if (error) { setMessage({ texte: `Convocation non envoyée : ${error.message}`, erreur: true }); return }
    setInitial(prev => ({ ...prev, [col.match_id]: new Set(selection) }))
    setColonnes(prev => prev.map(c => c.match_id === col.match_id ? { ...c, convocation_publiee: true } : c))
    setMessage({ texte: `Convocation ${col.libelle} publiée : ${selection.size} joueur${selection.size > 1 ? 's' : ''}.`, erreur: false })
  }

  const btnLien = { background: 'none', border: 'none', padding: 0, color: accent, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const input = { padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, color: colors.text.primary, fontSize: '14px', fontFamily: 'Inter, sans-serif', minWidth: 0 }
  const cellule = { padding: '8px 10px', borderBottom: `1px solid ${colors.border.subtle}`, verticalAlign: 'middle' }
  const largeurColonne = isMobile ? '110px' : '150px'

  const jourLisible = date ? new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, maxWidth: '100%' }}>
      <nav style={{ fontSize: '13px', color: colors.text.faint }}>
        {(filAriane || []).map((e, i) => (
          <span key={i}><button style={btnLien} onClick={e.onClick}>{e.label}</button> / </span>
        ))}
        Convocations {libelleCategorie}
      </nav>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Convocations {libelleCategorie}</h1>
          <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>
            {joueurs ? `Effectif commun · ${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''}` : 'Chargement'}
          </p>
        </div>
        {onRetour && <button style={{ ...btnLien, fontSize: '13px' }} onClick={onRetour}>Retour</button>}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: colors.text.secondary, fontWeight: 600 }}>
          Date
          <input type="date" value={date || ''} onChange={e => { if (e.target.value) { setChargement(true); setDate(e.target.value); setMessage(null) } }} style={input} />
        </label>
        <input type="search" placeholder="Rechercher" value={recherche} onChange={e => { setRecherche(e.target.value); setPage(1) }}
          style={{ ...input, flex: 1, minWidth: '160px' }} />
      </div>
      {date && <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, textTransform: 'capitalize' }}>{jourLisible}</p>}

      {message && (
        <p role="status" style={{ margin: 0, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
          background: (message.erreur ? colors.accent.red : colors.accent.success) + alpha.subtle,
          border: `1px solid ${(message.erreur ? colors.accent.red : colors.accent.success)}${alpha.light}`,
          color: message.erreur ? colors.accent.red : colors.text.primary }}>
          {message.texte}
        </p>
      )}

      {!chargement && colonnes.length === 0 && joueurs && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '2rem 1.5rem', textAlign: 'center', color: colors.text.secondary }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Aucun match de {libelleCategorie} ce jour-là.</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.text.faint }}>Choisis une autre date, ou crée le match dans le calendrier de l'équipe.</p>
        </div>
      )}

      {isMobile && colonnes.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {colonnes.map((c, i) => (
            <button key={c.match_id} onClick={() => setColMobile(i)}
              style={{ padding: '8px 14px', borderRadius: '999px', border: `1px solid ${i === colMobile ? accent : colors.border.default}`, background: i === colMobile ? accent + alpha.subtle : 'transparent', color: colors.text.primary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {c.libelle}
            </button>
          ))}
        </div>
      )}

      {colonnes.length > 0 && joueurs && (
        <div style={{ overflowX: 'auto', border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', background: colors.background.surface }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'fixed', minWidth: isMobile ? 0 : `${220 + colonnesAffichees.length * 150}px` }}>
            <colgroup>
              <col />
              {colonnesAffichees.map(c => <col key={c.match_id} style={{ width: largeurColonne }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...cellule, position: 'sticky', left: 0, zIndex: 1, background: colors.background.surface, textAlign: 'left', fontSize: '12px', color: colors.text.faint, fontWeight: 700, minWidth: 0 }}>
                  Joueur
                </th>
                {colonnesAffichees.map(c => {
                  const selection = coches[c.match_id] || new Set()
                  const modifiee = colonneModifiee(selection, initial[c.match_id])
                  const bloque = envoiEnCours === c.match_id || (c.convocation_publiee ? !modifiee : selection.size === 0)
                  return (
                    <th key={c.match_id} style={{ ...cellule, textAlign: 'left', verticalAlign: 'top', width: largeurColonne, minWidth: largeurColonne, background: colors.background.surface }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: colors.text.primary }}>{c.libelle}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: colors.text.faint }}>
                        {[heureCourte(c.heure), c.adversaire && `${c.domicile ? 'vs' : '@'} ${c.adversaire}`].filter(Boolean).join(' · ')}
                      </p>
                      <p style={{ margin: '6px 0 8px', fontSize: '12px', fontWeight: 700, color: colors.text.secondary }}>
                        {selection.size} convoqué{selection.size > 1 ? 's' : ''}
                        {c.convocation_publiee && !modifiee ? ' · publiée' : ''}
                        {modifiee ? ' · à envoyer' : ''}
                      </p>
                      {c.peutEnvoyer ? (
                        <button onClick={() => envoyer(c)} disabled={bloque}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: 'none', background: bloque ? colors.background.raised : accent, color: bloque ? colors.text.faint : colors.accent.onBrand, fontWeight: 700, fontSize: '12px', cursor: bloque ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                          {envoiEnCours === c.match_id ? 'Envoi...' : `${c.convocation_publiee ? 'Mettre à jour' : 'Envoyer'} · ${c.libelle}`}
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: colors.text.faint }}>Lecture seule</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pagination.items.map(j => {
                const convocable = peutEtreConvoque(j)
                const sond = statutSondage(j.joueur_id, colonnes, sondage)
                // Coché dans au moins deux colonnes : on signale toutes les colonnes concernées.
                const cochees = colonnes.filter(c => j.joueur_id && coches[c.match_id]?.has(j.joueur_id))
                const conflitsDuJoueur = cochees.length > 1 ? cochees : []
                return (
                  <tr key={j.id}>
                    <td style={{ ...cellule, position: 'sticky', left: 0, zIndex: 1, background: colors.background.surface }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar person={j} size={30} bg={colors.background.raised} border="none" textColor={colors.text.secondary} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>{convocable ? (j.poste || '') : 'Sans compte : ne peut pas être convoqué'}</p>
                          {sond.texte && (
                            <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 700, color: sond.ton === 'alerte' ? colors.accent.red : colors.text.faint }}>{sond.texte}</p>
                          )}
                          {texteConflit(conflitsDuJoueur) && (
                            <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 700, color: colors.accent.orange || colors.accent.red }}>{texteConflit(conflitsDuJoueur)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {colonnesAffichees.map(c => {
                      const coche = !!j.joueur_id && (coches[c.match_id]?.has(j.joueur_id) || false)
                      const actif = convocable && c.peutEnvoyer
                      return (
                        <td key={c.match_id} style={{ ...cellule, textAlign: 'center' }}>
                          <input type="checkbox" checked={coche} disabled={!actif}
                            aria-label={`${j.prenom} ${j.nom}, ${c.libelle}`}
                            onChange={() => basculer(c.match_id, j.joueur_id)}
                            style={{ width: '18px', height: '18px', accentColor: accent, cursor: actif ? 'pointer' : 'default' }} />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {pagination.items.length === 0 && (
                <tr><td colSpan={colonnesAffichees.length + 1} style={{ ...cellule, textAlign: 'center', color: colors.text.faint, fontSize: '13px' }}>Aucun joueur ne correspond.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {colonnes.length > 0 && joueurs && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: colors.text.secondary }}>
          <span>{pagination.debut}–{pagination.fin} sur {pagination.total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPage(pagination.page - 1)} disabled={pagination.page <= 1}
              style={{ padding: '8px 14px', borderRadius: '9px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.primary, fontWeight: 600, fontSize: '13px', cursor: pagination.page <= 1 ? 'default' : 'pointer', opacity: pagination.page <= 1 ? 0.4 : 1, fontFamily: 'Inter, sans-serif' }}>
              Précédent
            </button>
            <button onClick={() => setPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
              style={{ padding: '8px 14px', borderRadius: '9px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.primary, fontWeight: 600, fontSize: '13px', cursor: pagination.page >= pagination.pages ? 'default' : 'pointer', opacity: pagination.page >= pagination.pages ? 0.4 : 1, fontFamily: 'Inter, sans-serif' }}>
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
