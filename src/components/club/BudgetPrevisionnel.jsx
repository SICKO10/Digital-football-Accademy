import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { saisonActuelle, libelleSaison } from '../../lib/saison'
import { labelCategorie } from '../../lib/categories'
import { PERIODICITES, MOIS_SAISON, totalAnnuelLigne, totalType, eurosFr, repartitionMensuelle, totauxParEquipe, depensesParCategorie, budgetVersCsv } from '../../lib/budgetPrevisionnel'

// Budget prévisionnel du club (cf. supabase_budget_previsionnel.sql).
// Étape 3 : choix de la saison, création du budget à partir des modèles
// (prix vides, « à renseigner »). Étape 4 : lignes modifiables, ajout depuis la
// bibliothèque ou ligne libre, suppression. Étape 5 : lignes par équipe ou « Club »,
// filtre par équipe, duplication vers une autre équipe, nombre de mois d'activité.
// Étape 7 : export CSV, reprise du budget de la saison précédente.
// Étape 6 : résumé, solde cumulé par mois, coût par équipe et par joueur, catégories.

const decalerSaison = (saison, delta) => {
  const [a] = saison.split('-').map(Number)
  return `${a + delta}-${a + delta + 1}`
}

export default function BudgetPrevisionnel({ clubId, categories, joueurs = [], canEdit }) {
  const colors = useColors()
  const [saison, setSaison] = useState(saisonActuelle())
  const [budget, setBudget] = useState(null)
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [creation, setCreation] = useState(false)
  const [erreur, setErreur] = useState('')
  const [suppressionArmee, setSuppressionArmee] = useState(null)
  const [ajout, setAjout] = useState(null) // null | { type, modeleId, libelle, categorie }
  const [modeles, setModeles] = useState([])
  const [filtreEquipe, setFiltreEquipe] = useState('toutes') // 'toutes' | 'club' | id d'équipe
  const [dupliquerVers, setDupliquerVers] = useState('')
  const [info, setInfo] = useState('')
  const [precedent, setPrecedent] = useState(null) // budget de la saison d'avant, s'il existe

  const saisons = [decalerSaison(saisonActuelle(), -1), saisonActuelle(), decalerSaison(saisonActuelle(), 1)]

  const charger = async () => {
    setChargement(true); setErreur('')
    const { data: b, error } = await supabase.from('budgets').select('*').eq('club_id', clubId).eq('saison', saison).maybeSingle()
    if (error) { console.error('budget prévisionnel error:', error); setErreur('Le budget prévisionnel n’est pas encore disponible. Réessaie plus tard.'); setBudget(null); setLignes([]); setChargement(false); return }
    setBudget(b)
    if (b) {
      const { data: l, error: errL } = await supabase.from('budget_lignes').select('*').eq('budget_id', b.id).order('created_at')
      if (errL) { console.error('budget lignes error:', errL); setErreur('Impossible de charger les lignes du budget.') }
      setLignes(l || [])
    } else {
      setLignes([])
      const { data: prec } = await supabase.from('budgets').select('*').eq('club_id', clubId).eq('saison', decalerSaison(saison, -1)).maybeSingle()
      setPrecedent(prec || null)
    }
    setChargement(false)
  }

  useEffect(() => {
    if (!clubId) return
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, saison])

  const creerBudget = async () => {
    setCreation(true); setErreur('')
    const { data: nouveau, error } = await supabase.from('budgets').insert({ club_id: clubId, saison }).select().single()
    if (error) { console.error('création budget error:', error); setErreur('Création impossible : ' + error.message); setCreation(false); return }
    const { data: modeles, error: errM } = await supabase.from('budget_modeles').select('*').order('ordre')
    if (errM || !modeles?.length) {
      await supabase.from('budgets').delete().eq('id', nouveau.id)
      setErreur('La bibliothèque de modèles est introuvable. Rien n’a été créé.'); setCreation(false); return
    }
    // Prix volontairement vide : jamais de prix inventé, le club saisit le sien.
    const { error: errL } = await supabase.from('budget_lignes').insert(modeles.map(m => ({
      budget_id: nouveau.id, equipe_id: null, type: m.type, categorie: m.categorie, libelle: m.libelle,
      quantite: 1, prix_unitaire: null, periodicite: m.unite, modele_id: m.id, est_personnalisee: false,
    })))
    if (errL) {
      console.error('création lignes error:', errL)
      await supabase.from('budgets').delete().eq('id', nouveau.id)
      setErreur('Création impossible : ' + errL.message); setCreation(false); return
    }
    setCreation(false)
    await charger()
  }

  const nbMois = budget?.nb_mois_activite || 10

  // Reprend le budget de la saison précédente : mêmes lignes, mêmes prix, mêmes
  // équipes. Le club ajuste ensuite ce qui change.
  const reprendrePrecedent = async () => {
    setCreation(true); setErreur('')
    const { data: anciennes, error: errA } = await supabase.from('budget_lignes').select('*').eq('budget_id', precedent.id)
    if (errA) { console.error('reprise budget error:', errA); setErreur('Impossible de lire le budget précédent.'); setCreation(false); return }
    const { data: nouveau, error } = await supabase.from('budgets').insert({
      club_id: clubId, saison, nb_mois_activite: precedent.nb_mois_activite, effectifs_prevus: precedent.effectifs_prevus || {},
    }).select().single()
    if (error) { console.error('création budget error:', error); setErreur('Création impossible : ' + error.message); setCreation(false); return }
    if (anciennes?.length) {
      const { error: errL } = await supabase.from('budget_lignes').insert(anciennes.map(l => ({
        budget_id: nouveau.id, equipe_id: l.equipe_id, type: l.type, categorie: l.categorie, libelle: l.libelle,
        quantite: l.quantite, prix_unitaire: l.prix_unitaire, periodicite: l.periodicite, mois_paiement: l.mois_paiement,
        modele_id: l.modele_id, est_personnalisee: l.est_personnalisee,
      })))
      if (errL) {
        console.error('reprise lignes error:', errL)
        await supabase.from('budgets').delete().eq('id', nouveau.id)
        setErreur('Reprise impossible : ' + errL.message); setCreation(false); return
      }
    }
    setCreation(false)
    await charger()
  }

  const exporterCsv = () => {
    const csv = budgetVersCsv(lignes, nomEquipe, nbMois)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-previsionnel-${saison}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const nomEquipe = (id) => {
    if (!id) return 'Club'
    const c = (categories || []).find(x => x.id === id)
    return c ? `${labelCategorie(c.nom)}${c.equipe ? ` ${c.equipe}` : ''}` : 'Équipe supprimée'
  }
  // Effectif : celui que le club a prévu pour la saison, sinon l'effectif réel de l'équipe.
  const effectifReel = (id) => joueurs.filter(j => j.club_categorie_id === id).length
  const effectifPrevu = (id) => budget?.effectifs_prevus?.[id]
  const effectifEquipe = (id) => (effectifPrevu(id) != null && effectifPrevu(id) !== '' ? Number(effectifPrevu(id)) : effectifReel(id))
  const changerEffectif = async (id, valeur) => {
    const effectifs = { ...(budget.effectifs_prevus || {}) }
    if (valeur === '') delete effectifs[id]; else effectifs[id] = Math.max(0, Math.round(Number(valeur)))
    setBudget(b => ({ ...b, effectifs_prevus: effectifs }))
    const { error } = await supabase.from('budgets').update({ effectifs_prevus: effectifs }).eq('id', budget.id)
    if (error) { console.error('effectif prévu error:', error); setErreur('L’effectif n’a pas pu être enregistré.'); charger() }
  }
  const lignesVisibles = lignes.filter(l => filtreEquipe === 'toutes' || (filtreEquipe === 'club' ? !l.equipe_id : l.equipe_id === filtreEquipe))

  const changerMois = async (v) => {
    const n = Math.min(12, Math.max(1, Math.round(Number(v) || 10)))
    if (n === budget.nb_mois_activite) return
    setBudget(b => ({ ...b, nb_mois_activite: n }))
    const { error } = await supabase.from('budgets').update({ nb_mois_activite: n }).eq('id', budget.id)
    if (error) { console.error('nb mois budget error:', error); setErreur('Le nombre de mois n’a pas pu être enregistré.'); charger() }
  }

  // Copie les lignes affichées (équipe ou Club choisi dans le filtre) vers une autre équipe.
  const dupliquer = async () => {
    setInfo(''); setErreur('')
    if (filtreEquipe === 'toutes' || !dupliquerVers) return
    const cible = dupliquerVers === 'club' ? null : dupliquerVers
    const source = lignesVisibles
    if (!source.length) return
    const { data, error } = await supabase.from('budget_lignes').insert(source.map(l => ({
      budget_id: budget.id, equipe_id: cible, type: l.type, categorie: l.categorie, libelle: l.libelle,
      quantite: l.quantite, prix_unitaire: l.prix_unitaire, periodicite: l.periodicite, mois_paiement: l.mois_paiement,
      modele_id: l.modele_id, est_personnalisee: l.est_personnalisee,
    }))).select()
    if (error) { console.error('duplication budget error:', error); setErreur('Duplication impossible : ' + error.message); return }
    setLignes(prev => [...prev, ...data])
    setInfo(`${data.length} ligne${data.length > 1 ? 's' : ''} copiée${data.length > 1 ? 's' : ''} vers ${nomEquipe(cible)}.`)
    setDupliquerVers('')
    setFiltreEquipe(dupliquerVers)
  }

  // Modification optimiste : l'écran réagit tout de suite, la base suit ; en cas
  // d'échec on recharge pour ne jamais afficher une valeur qui n'est pas enregistrée.
  const modifierLigne = async (id, champs) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, ...champs } : l))
    const { error } = await supabase.from('budget_lignes').update(champs).eq('id', id)
    if (error) { console.error('modif ligne budget error:', error); setErreur('La modification n’a pas pu être enregistrée.'); charger() }
  }

  const supprimerLigne = async (id) => {
    if (suppressionArmee !== id) {
      setSuppressionArmee(id)
      setTimeout(() => setSuppressionArmee(s => (s === id ? null : s)), 4000)
      return
    }
    setSuppressionArmee(null)
    const { error } = await supabase.from('budget_lignes').delete().eq('id', id)
    if (error) { console.error('suppression ligne budget error:', error); setErreur('Suppression impossible.'); return }
    setLignes(prev => prev.filter(l => l.id !== id))
  }

  const ouvrirAjout = async (type) => {
    setAjout({ type, modeleId: '', libelle: '', categorie: '', equipeId: ['toutes', 'club'].includes(filtreEquipe) ? '' : filtreEquipe })
    if (!modeles.length) {
      const { data } = await supabase.from('budget_modeles').select('*').order('ordre')
      setModeles(data || [])
    }
  }

  const validerAjout = async () => {
    const m = modeles.find(x => x.id === ajout.modeleId)
    const libelle = m ? m.libelle : ajout.libelle.trim()
    const categorie = m ? m.categorie : (ajout.categorie.trim() || 'Divers')
    if (!libelle) return
    const { data, error } = await supabase.from('budget_lignes').insert({
      budget_id: budget.id, equipe_id: ajout.equipeId || null, type: ajout.type, categorie, libelle,
      quantite: 1, prix_unitaire: null, periodicite: m ? m.unite : 'an',
      modele_id: m ? m.id : null, est_personnalisee: !m,
    }).select().single()
    if (error) { console.error('ajout ligne budget error:', error); setErreur('Ajout impossible : ' + error.message); return }
    setLignes(prev => [...prev, data])
    setAjout(null)
  }

  const champ = { background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '7px 9px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const boite = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 14, padding: 20 }
  const groupes = (type) => Object.entries(lignesVisibles.filter(l => l.type === type).reduce((acc, l) => { (acc[l.categorie] ||= []).push(l); return acc }, {}))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <span style={{ color: colors.text.faint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Saison</span>
        <select value={saison} onChange={e => setSaison(e.target.value)}
          style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          {saisons.map(s => <option key={s} value={s}>{libelleSaison(s)}</option>)}
        </select>
        {budget && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text.faint, fontSize: 12 }}>
            <input type="number" min="1" max="12" disabled={!canEdit} defaultValue={budget.nb_mois_activite} key={budget.id}
              onBlur={e => changerMois(e.target.value)} aria-label="Mois d’activité" style={{ ...champ, width: 60 }} />
            mois d’activité
          </label>
        )}
      </div>

      {budget && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {[{ id: 'toutes', nom: 'Tout le budget' }, { id: 'club', nom: 'Club (charges communes)' }, ...(categories || []).map(c => ({ id: c.id, nom: nomEquipe(c.id) }))].map(e => (
              <button key={e.id} onClick={() => { setFiltreEquipe(e.id); setDupliquerVers(''); setInfo('') }}
                style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${filtreEquipe === e.id ? colors.accent.green : colors.border.strong}`, background: filtreEquipe === e.id ? colors.accent.green + '22' : 'transparent', color: filtreEquipe === e.id ? colors.accent.green : colors.text.faint, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {e.nom}
              </button>
            ))}
          </div>
          {canEdit && filtreEquipe !== 'toutes' && lignesVisibles.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
              <span style={{ color: colors.text.faint, fontSize: 12 }}>Copier ces {lignesVisibles.length} lignes vers</span>
              <select value={dupliquerVers} onChange={e => setDupliquerVers(e.target.value)} style={champ}>
                <option value="">Choisir une équipe</option>
                {[{ id: 'club', nom: 'Club' }, ...(categories || []).map(c => ({ id: c.id, nom: nomEquipe(c.id) }))].filter(e => e.id !== filtreEquipe).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <button onClick={dupliquer} disabled={!dupliquerVers}
                style={{ background: colors.accent.green, color: colors.accent.onBrand || '#000', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: dupliquerVers ? 1 : 0.5, fontFamily: 'Inter, sans-serif' }}>Copier</button>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button onClick={exporterCsv}
              style={{ background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.faint, borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Exporter en CSV (Excel)
            </button>
          </div>
          {info && <p style={{ color: colors.accent.green, fontSize: 12, margin: '8px 0 0' }}>{info}</p>}
        </div>
      )}

      {erreur && <p style={{ color: colors.accent.red, fontSize: 13, margin: '0 0 14px' }}>{erreur}</p>}

      {chargement ? (
        <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement...</p>
      ) : !budget ? (
        !erreur && (
          <div style={{ ...boite, textAlign: 'center', padding: 36 }}>
            <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 16, margin: '0 0 6px' }}>Pas encore de budget pour la saison {libelleSaison(saison)}</p>
            <p style={{ color: colors.text.faint, fontSize: 13, lineHeight: 1.6, margin: '0 auto 18px', maxWidth: 460 }}>
              On prépare pour toi les dépenses et les recettes habituelles d’un club : encadrement, équipements, déplacements, cotisations, subventions… Aucun prix n’est rempli, tu saisis simplement les tiens.
            </p>
            {canEdit && precedent && (
              <div style={{ marginBottom: 12 }}>
                <button onClick={reprendrePrecedent} disabled={creation}
                  style={{ background: colors.accent.green, color: colors.accent.onBrand || '#000', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: creation ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
                  {creation ? 'Création...' : `Reprendre le budget ${libelleSaison(decalerSaison(saison, -1))} comme point de départ`}
                </button>
                <p style={{ color: colors.text.faint, fontSize: 12, margin: '8px 0 0' }}>Tes lignes, tes prix et tes équipes sont recopiés. Tu ajustes ensuite ce qui change.</p>
              </div>
            )}
            {canEdit ? (
              <button onClick={creerBudget} disabled={creation}
                style={{ background: colors.accent.green, color: colors.accent.onBrand || '#000', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: creation ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
                {creation ? 'Création...' : precedent ? 'Ou repartir de zéro avec les modèles' : 'Créer le budget de la saison à partir des modèles'}
              </button>
            ) : (
              <p style={{ color: colors.text.disabled, fontSize: 12, margin: 0 }}>Tu n’as pas le droit de modifier le budget.</p>
            )}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {(() => {
            const dep = totalType(lignesVisibles, 'depense', nbMois)
            const rec = totalType(lignesVisibles, 'recette', nbMois)
            const solde = rec - dep
            const mensuel = repartitionMensuelle(lignesVisibles, nbMois)
            const ecart = Math.max(1, ...mensuel.map(m => Math.abs(m.cumul)))
            const parEquipe = totauxParEquipe(lignes, nbMois)
            const parCategorie = depensesParCategorie(lignesVisibles, nbMois)
            const cartes = [
              ['Dépenses de l’année', eurosFr(dep), colors.accent.red],
              ['Recettes de l’année', eurosFr(rec), colors.accent.green],
              ['Solde prévisionnel', eurosFr(solde), solde >= 0 ? colors.accent.green : colors.accent.red],
              ['Dépenses par mois d’activité', eurosFr(dep / nbMois), colors.text.primary],
            ]
            const lignesEquipes = [{ id: 'club', nom: 'Club (charges communes)' }, ...(categories || []).map(c => ({ id: c.id, nom: nomEquipe(c.id) }))]
            const H = 120, L = 600, pas = L / 12
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  {cartes.map(([titre, valeur, couleur]) => (
                    <div key={titre} style={{ ...boite, padding: 16 }}>
                      <p style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>{titre}</p>
                      <p style={{ color: couleur, fontSize: 22, fontWeight: 800, margin: 0 }}>{valeur}</p>
                    </div>
                  ))}
                </div>

                <div style={boite}>
                  <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>Solde cumulé mois par mois</p>
                  <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 12px' }}>Vert : le club est en positif à la fin du mois. Rouge : en négatif.</p>
                  <svg viewBox={`0 0 ${L} ${H + 36}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Solde cumulé par mois">
                    <line x1="0" x2={L} y1={H / 2} y2={H / 2} stroke={colors.border.strong} strokeWidth="1" />
                    {mensuel.map((m, i) => {
                      const h = (Math.abs(m.cumul) / ecart) * (H / 2 - 4)
                      return (
                        <g key={m.num}>
                          <rect x={i * pas + 8} width={pas - 16} y={m.cumul >= 0 ? H / 2 - h : H / 2} height={Math.max(h, m.cumul === 0 ? 0 : 1)} rx="3" fill={m.cumul >= 0 ? colors.accent.green : colors.accent.red} />
                          <text x={i * pas + pas / 2} y={H + 14} textAnchor="middle" fontSize="11" fill={colors.text.faint}>{m.nom.slice(0, 4)}.</text>
                        </g>
                      )
                    })}
                  </svg>
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ color: colors.text.faint, fontSize: 12, cursor: 'pointer' }}>Voir le tableau mois par mois</summary>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
                        <thead><tr style={{ color: colors.text.faint, textAlign: 'right' }}>
                          {['Mois', 'Dépenses', 'Recettes', 'Solde du mois', 'Solde cumulé'].map((h, i) => <th key={h} style={{ padding: '6px 8px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700 }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{mensuel.map(m => (
                          <tr key={m.num} style={{ borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'right' }}>
                            <td style={{ padding: '6px 8px', textAlign: 'left', color: colors.text.primary, textTransform: 'capitalize' }}>{m.nom}</td>
                            <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{eurosFr(m.depenses)}</td>
                            <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{eurosFr(m.recettes)}</td>
                            <td style={{ padding: '6px 8px', color: m.solde >= 0 ? colors.accent.green : colors.accent.red }}>{eurosFr(m.solde)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: m.cumul >= 0 ? colors.accent.green : colors.accent.red }}>{eurosFr(m.cumul)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </details>
                </div>

                <div style={boite}>
                  <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>Coût par équipe</p>
                  <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 12px' }}>Coût net = dépenses moins recettes de l’équipe. L’effectif prévu est modifiable, sinon on prend l’effectif actuel.</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ color: colors.text.faint }}>
                        {['Équipe', 'Dépenses', 'Recettes', 'Coût net', 'Joueurs', 'Coût net par joueur'].map((h, i) => <th key={h} style={{ padding: '6px 8px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700 }}>{h}</th>)}
                      </tr></thead>
                      <tbody>{lignesEquipes.map(e => {
                        const t = parEquipe[e.id] || { depenses: 0, recettes: 0 }
                        const net = t.depenses - t.recettes
                        const eff = e.id === 'club' ? 0 : effectifEquipe(e.id)
                        return (
                          <tr key={e.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'right' }}>
                            <td style={{ padding: '6px 8px', textAlign: 'left', color: colors.text.primary }}>{e.nom}</td>
                            <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{eurosFr(t.depenses)}</td>
                            <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{eurosFr(t.recettes)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: colors.text.primary }}>{eurosFr(net)}</td>
                            <td style={{ padding: '6px 8px' }}>
                              {e.id === 'club' ? <span style={{ color: colors.text.disabled }}>-</span> : (
                                <input type="number" min="0" disabled={!canEdit} key={e.id + ':' + (effectifPrevu(e.id) ?? 'reel')} defaultValue={effectifPrevu(e.id) ?? ''} placeholder={String(effectifReel(e.id))} aria-label={`Effectif prévu ${e.nom}`}
                                  onBlur={ev => { if (ev.target.value !== String(effectifPrevu(e.id) ?? '')) changerEffectif(e.id, ev.target.value) }}
                                  style={{ ...champ, width: 64, textAlign: 'right' }} />
                              )}
                            </td>
                            <td style={{ padding: '6px 8px', color: colors.text.secondary }}>{e.id !== 'club' && eff > 0 ? eurosFr(net / eff) : <span style={{ color: colors.text.disabled }}>effectif inconnu</span>}</td>
                          </tr>
                        )
                      })}</tbody>
                    </table>
                  </div>
                </div>

                {parCategorie.length > 0 && (
                  <div style={boite}>
                    <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>Où va l’argent</p>
                    {parCategorie.map(([cat, montant]) => (
                      <div key={cat} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: colors.text.secondary }}>{cat}</span>
                          <span style={{ color: colors.text.primary, fontWeight: 700 }}>{eurosFr(montant)} · {dep > 0 ? Math.round((montant / dep) * 100) : 0} %</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: colors.background.sunken }}>
                          <div style={{ width: `${dep > 0 ? (montant / dep) * 100 : 0}%`, height: '100%', borderRadius: 3, background: colors.accent.blue }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
          {[['depense', 'Dépenses'], ['recette', 'Recettes']].map(([type, titre]) => (
            <div key={type} style={boite}>
              <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 15, margin: '0 0 12px' }}>{titre}</p>
              {groupes(type).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <p style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px' }}>{cat}</p>
                  {items.map(l => (
                    <div key={l.id} style={{ padding: '9px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ color: colors.text.primary, fontSize: 13, fontWeight: 600 }}>{l.libelle}</span>
                        <span style={{ color: l.prix_unitaire == null ? colors.text.disabled : colors.text.primary, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {l.prix_unitaire == null ? 'à renseigner' : eurosFr(totalAnnuelLigne(l, nbMois)) + ' / an'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="number" min="0" step="any" disabled={!canEdit} defaultValue={l.quantite} aria-label="Quantité" title={l.periodicite === 'match' ? 'Nombre de matchs' : 'Quantité'}
                          onBlur={e => { const v = e.target.value === '' ? 1 : Math.max(0, Number(e.target.value)); if (v !== Number(l.quantite)) modifierLigne(l.id, { quantite: v }) }}
                          style={{ ...champ, width: 72 }} />
                        <span style={{ color: colors.text.disabled, fontSize: 12 }}>×</span>
                        <input type="number" min="0" step="any" disabled={!canEdit} defaultValue={l.prix_unitaire ?? ''} placeholder="Prix €" aria-label="Prix unitaire"
                          onBlur={e => { const v = e.target.value === '' ? null : Math.max(0, Number(e.target.value)); if (v !== (l.prix_unitaire == null ? null : Number(l.prix_unitaire))) modifierLigne(l.id, { prix_unitaire: v }) }}
                          style={{ ...champ, width: 96 }} />
                        <select value={l.equipe_id || ''} disabled={!canEdit} onChange={e => modifierLigne(l.id, { equipe_id: e.target.value || null })} aria-label="Équipe" style={champ}>
                          <option value="">Club</option>
                          {(categories || []).map(c => <option key={c.id} value={c.id}>{nomEquipe(c.id)}</option>)}
                        </select>
                        <select value={l.periodicite} disabled={!canEdit} onChange={e => modifierLigne(l.id, { periodicite: e.target.value })} aria-label="Périodicité" style={champ}>
                          {PERIODICITES.map(p => <option key={p.val} value={p.val}>{p.label}</option>)}
                        </select>
                        {(l.periodicite === 'an' || l.periodicite === 'saison') && (
                          <select value={l.mois_paiement || ''} disabled={!canEdit} onChange={e => modifierLigne(l.id, { mois_paiement: e.target.value ? Number(e.target.value) : null })} aria-label="Mois de paiement" style={champ}>
                            <option value="">Mois de paiement</option>
                            {MOIS_SAISON.map(m => <option key={m.num} value={m.num}>{m.nom}</option>)}
                          </select>
                        )}
                        {canEdit && (
                          <button onClick={() => supprimerLigne(l.id)}
                            style={{ marginLeft: 'auto', background: suppressionArmee === l.id ? '#ef444420' : 'transparent', border: `1px solid ${suppressionArmee === l.id ? '#ef4444' : colors.border.default}`, color: suppressionArmee === l.id ? '#ef4444' : colors.text.faint, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            {suppressionArmee === l.id ? 'Confirmer ?' : 'Supprimer'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px solid ${colors.border.default}` }}>
                {canEdit ? (
                  <button onClick={() => ouvrirAjout(type)}
                    style={{ background: 'transparent', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Ajouter {type === 'depense' ? 'une dépense' : 'une recette'}
                  </button>
                ) : <span />}
                <span style={{ color: colors.text.primary, fontSize: 14, fontWeight: 800 }}>Total {titre.toLowerCase()}{filtreEquipe === 'toutes' ? '' : ` (${filtreEquipe === 'club' ? 'Club' : nomEquipe(filtreEquipe)})`} : {eurosFr(totalType(lignesVisibles, type, nbMois))}</span>
              </div>
              {ajout?.type === type && (
                <form onSubmit={ev => { ev.preventDefault(); validerAjout() }} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={ajout.equipeId} onChange={e => setAjout(a => ({ ...a, equipeId: e.target.value }))} style={champ} aria-label="Équipe">
                    <option value="">Club</option>
                    {(categories || []).map(c => <option key={c.id} value={c.id}>{nomEquipe(c.id)}</option>)}
                  </select>
                  <select value={ajout.modeleId} onChange={e => setAjout(a => ({ ...a, modeleId: e.target.value }))} style={{ ...champ, maxWidth: 280 }}>
                    <option value="">Ligne libre (je choisis le nom)</option>
                    {modeles.filter(m => m.type === type).map(m => <option key={m.id} value={m.id}>{m.categorie} : {m.libelle}</option>)}
                  </select>
                  {!ajout.modeleId && (
                    <>
                      <input autoFocus value={ajout.libelle} onChange={e => setAjout(a => ({ ...a, libelle: e.target.value }))} placeholder="Nom de la ligne" maxLength={80} style={{ ...champ, width: 200 }} />
                      <input value={ajout.categorie} onChange={e => setAjout(a => ({ ...a, categorie: e.target.value }))} placeholder="Catégorie (facultatif)" maxLength={40} list={'cats-' + type} style={{ ...champ, width: 170 }} />
                      <datalist id={'cats-' + type}>{[...new Set(lignes.filter(l => l.type === type).map(l => l.categorie))].map(c => <option key={c} value={c} />)}</datalist>
                    </>
                  )}
                  <button type="submit" disabled={!ajout.modeleId && !ajout.libelle.trim()}
                    style={{ background: colors.accent.green, color: colors.accent.onBrand || '#000', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: (!ajout.modeleId && !ajout.libelle.trim()) ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>Ajouter</button>
                  <button type="button" onClick={() => setAjout(null)}
                    style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.strong}`, borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
