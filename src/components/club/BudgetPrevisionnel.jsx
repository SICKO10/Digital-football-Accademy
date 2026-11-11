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

// ── Aides visuelles (aucun calcul métier ici : tout vient de lib/budgetPrevisionnel) ──
const CSS = `
  .bp-in:focus-visible, .bp-btn:focus-visible, .bp-chip:focus-visible, .bp-bar:focus-visible { outline: 2px solid var(--bp-brand); outline-offset: 2px; }
  .bp-grille { display: grid; grid-template-columns: minmax(170px, 1.7fr) 76px 104px minmax(108px, 1fr) minmax(108px, 1fr) minmax(124px, 1fr) 118px 40px; gap: 10px; align-items: center; }
  .bp-ligne { padding: 8px 10px; border-radius: 12px; transition: background .12s; }
  .bp-ligne:hover, .bp-table tbody tr:hover { background: var(--bp-hover); }
  .bp-entete { padding: 0 10px 8px; font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--bp-faint); }
  .bp-cell::before { display: none; }
  .bp-kpi { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 14px; }
  .bp-tuile { transition: transform .15s, box-shadow .15s; }
  .bp-tuile:hover { transform: translateY(-2px); }
  .bp-chip { transition: background .12s, border-color .12s; }
  @media (max-width: 1100px) {
    .bp-grille { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
    .bp-entete { display: none; }
    .bp-lib { grid-column: 1 / -1; }
    .bp-c-qty, .bp-c-prix, .bp-c-eq { grid-column: span 2; }
    .bp-c-ry, .bp-c-mois { grid-column: span 3; }
    .bp-c-tot { grid-column: span 4; text-align: left !important; }
    .bp-c-act { grid-column: span 2; justify-self: end; }
    .bp-vide { display: none; }
    .bp-cell::before { display: block; content: attr(data-e); font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--bp-faint); margin-bottom: 3px; }
    .bp-kpi { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .bp-hero { grid-column: 1 / -1; }
  }
  @media (max-width: 640px) { .bp-kpi { grid-template-columns: 1fr; } }
`

const compact = (n) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(Math.abs(n) % 1000 === 0 ? 0 : 1).replace('.', ',')} k€` : `${Math.round(n)} €`)

// Graduations propres (1, 2, 2,5, 5 x 10^k) qui contiennent toujours le zéro.
function graduations(min, max, cible = 4) {
  const ecart = max - min || 1
  const brut = ecart / cible
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 2.5, 5, 10].map(f => f * puissance).find(x => x >= brut) || 10 * puissance
  const bas = Math.floor(min / pas) * pas
  let haut = Math.ceil(max / pas) * pas
  if (haut === bas) haut = bas + pas
  const ticks = []
  for (let v = bas; v <= haut + pas / 1000; v += pas) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

// Barre arrondie de 4 px côté valeur, carrée côté zéro.
function cheminBarre(x, yZero, yVal, w, r = 4) {
  const h = Math.abs(yVal - yZero)
  if (h < 0.5) return ''
  const rr = Math.min(r, h, w / 2)
  if (yVal < yZero) return `M${x},${yZero} L${x},${yVal + rr} Q${x},${yVal} ${x + rr},${yVal} L${x + w - rr},${yVal} Q${x + w},${yVal} ${x + w},${yVal + rr} L${x + w},${yZero} Z`
  return `M${x},${yZero} L${x},${yVal - rr} Q${x},${yVal} ${x + rr},${yVal} L${x + w - rr},${yVal} Q${x + w},${yVal} ${x + w},${yVal - rr} L${x + w},${yZero} Z`
}

const Icone = ({ d, size = 16, trait = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={trait} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const ICONES = {
  telecharger: 'M12 3v12m0 0l-4-4m4 4l4-4M4 19h16',
  plus: 'M12 5v14M5 12h14',
  corbeille: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  copier: 'M9 9h10v10H9zM5 15V5h10',
  haut: 'M12 19V5m0 0l-6 6m6-6l6 6',
  bas: 'M12 5v14m0 0l6-6m-6 6l-6-6',
  egal: 'M5 9h14M5 15h14',
}

// Solde cumulé mois par mois : une seule série, deux signes (excédent / déficit).
// Barres de 24 px au plus, arrondies côté valeur, échelle qui suit les données,
// valeurs écrites seulement pour la fin et le point le plus bas, infobulle au survol.
function GraphiqueSolde({ mensuel, colors }) {
  const [survol, setSurvol] = useState(null)
  const W = 760, H = 250, gauche = 58, droite = 14, haut = 22, bas = 34
  const cumuls = mensuel.map(m => m.cumul)
  const ticks = graduations(Math.min(0, ...cumuls), Math.max(0, ...cumuls))
  const tMin = ticks[0], tMax = ticks[ticks.length - 1]
  const y = (v) => haut + (1 - (v - tMin) / (tMax - tMin)) * (H - haut - bas)
  const pas = (W - gauche - droite) / mensuel.length
  const largeur = Math.min(24, pas * 0.56)
  const positif = colors.accent.success, negatif = colors.accent.red
  const iFin = mensuel.length - 1
  const iBas = cumuls.indexOf(Math.min(...cumuls))
  const etiquetes = [...new Set([iFin, ...(cumuls[iBas] < 0 && cumuls[iBas] < cumuls[iFin] ? [iBas] : [])])]
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
  const m = survol != null ? mensuel[survol] : null
  const xCentre = (i) => gauche + i * pas + pas / 2

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '0 0 8px' }}>
        {[[positif, 'Solde positif (excédent)'], [negatif, 'Solde négatif (déficit)']].map(([c, t]) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: colors.text.secondary }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{t}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Solde cumulé du club, mois par mois">
          {ticks.map(t => (
            <g key={t}>
              <line x1={gauche} x2={W - droite} y1={y(t)} y2={y(t)} stroke={t === 0 ? colors.border.strong : colors.border.subtle} strokeWidth="1" />
              <text x={gauche - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill={colors.text.faint}>{compact(t)}</text>
            </g>
          ))}
          {mensuel.map((mo, i) => {
            const x = xCentre(i) - largeur / 2
            const actif = survol === i
            return (
              <g key={mo.num}>
                {actif && <rect x={gauche + i * pas + 2} y={haut - 8} width={pas - 4} height={H - haut - bas + 16} rx="8" fill={colors.background.raised} opacity="0.9" />}
                <path d={cheminBarre(x, y(0), y(mo.cumul), largeur)} fill={mo.cumul >= 0 ? positif : negatif} opacity={survol == null || actif ? 1 : 0.55} />
                <text x={xCentre(i)} y={H - 12} textAnchor="middle" fontSize="11" fontWeight={actif ? 700 : 400} fill={actif ? colors.text.primary : colors.text.faint}>{mo.nom.slice(0, 4)}.</text>
              </g>
            )
          })}
          {etiquetes.map(i => cumuls[i] !== 0 && (
            <text key={'v' + i} x={xCentre(i)} y={cumuls[i] > 0 ? y(cumuls[i]) - 8 : y(cumuls[i]) + 17} textAnchor="middle" fontSize="12" fontWeight="700" fill={colors.text.primary}>{eurosFr(cumuls[i])}</text>
          ))}
          {mensuel.map((mo, i) => (
            <rect key={'z' + mo.num} className="bp-bar" x={gauche + i * pas} y={haut - 8} width={pas} height={H - haut - bas + 16} fill="transparent" tabIndex={0}
              role="img" aria-label={`${cap(mo.nom)} : solde cumulé ${eurosFr(mo.cumul)}`}
              onMouseEnter={() => setSurvol(i)} onMouseLeave={() => setSurvol(null)} onFocus={() => setSurvol(i)} onBlur={() => setSurvol(null)} />
          ))}
        </svg>
        {m && (
          <div role="status" style={{ position: 'absolute', top: 0, left: `${Math.min(86, Math.max(14, (xCentre(survol) / W) * 100))}%`, transform: 'translateX(-50%)', pointerEvents: 'none', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', minWidth: 190, zIndex: 2 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: colors.text.primary }}>{cap(m.nom)}</p>
            {[['Dépenses', m.depenses], ['Recettes', m.recettes], ['Solde du mois', m.solde]].map(([t, v]) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: colors.text.secondary, marginBottom: 2 }}><span>{t}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{eurosFr(v)}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13, fontWeight: 800, color: colors.text.primary, borderTop: `1px solid ${colors.border.subtle}`, marginTop: 6, paddingTop: 6 }}><span>Solde cumulé</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{eurosFr(m.cumul)}</span></div>
          </div>
        )}
      </div>
    </div>
  )
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

  const champ = { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '8px 10px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', width: '100%', minWidth: 0 }
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 18, padding: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.04)' }
  const surBrand = colors.accent.onBrand || '#000'
  const btn = (primaire) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 16px', minHeight: 40, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: primaire ? 'none' : `1px solid ${colors.border.strong}`, background: primaire ? colors.accent.green : colors.background.surface, color: primaire ? surBrand : colors.text.secondary })
  const titreCarte = { margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px', color: colors.text.primary }
  const sousTitre = { margin: '4px 0 0', fontSize: 13, color: colors.text.faint, lineHeight: 1.5 }
  const th = { padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }
  const groupes = (type) => Object.entries(lignesVisibles.filter(l => l.type === type).reduce((acc, l) => { (acc[l.categorie] ||= []).push(l); return acc }, {}))
  const equipesOptions = (categories || []).map(c => ({ id: c.id, nom: nomEquipe(c.id) }))
  const filtres = [{ id: 'toutes', nom: 'Tout le budget' }, { id: 'club', nom: 'Club (charges communes)' }, ...equipesOptions]

  return (
    <div style={{ '--bp-brand': colors.accent.green, '--bp-hover': colors.background.raised, '--bp-faint': colors.text.faint }}>
      <style>{CSS}</style>

      {/* ── Barre d'outils : saison, mois d'activité, équipes, export ── */}
      <div style={{ ...carte, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }}>
            Saison
            <select value={saison} onChange={e => setSaison(e.target.value)} className="bp-in" style={{ ...champ, width: 'auto', fontWeight: 700, padding: '9px 12px' }}>
              {saisons.map(sa => <option key={sa} value={sa}>{libelleSaison(sa)}</option>)}
            </select>
          </label>
          {budget && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, color: colors.text.secondary }}>
              <input type="number" min="1" max="12" disabled={!canEdit} defaultValue={budget.nb_mois_activite} key={budget.id} className="bp-in"
                onBlur={e => changerMois(e.target.value)} aria-label="Mois d’activité" style={{ ...champ, width: 66, fontWeight: 700, textAlign: 'center' }} />
              mois d’activité
            </label>
          )}
          {budget && (
            <button onClick={exporterCsv} className="bp-btn" style={{ ...btn(false), marginLeft: 'auto' }}>
              <Icone d={ICONES.telecharger} /> Exporter en CSV (Excel)
            </button>
          )}
        </div>

        {budget && (
          <>
            <div role="tablist" aria-label="Équipe" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}` }}>
              {filtres.map(e => {
                const actif = filtreEquipe === e.id
                return (
                  <button key={e.id} role="tab" aria-selected={actif} className="bp-chip"
                    onClick={() => { setFiltreEquipe(e.id); setDupliquerVers(''); setInfo('') }}
                    style={{ padding: '8px 16px', minHeight: 38, borderRadius: 999, border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, background: actif ? colors.accent.green : 'transparent', color: actif ? surBrand : colors.text.secondary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {e.nom}
                  </button>
                )
              })}
            </div>
            {canEdit && filtreEquipe !== 'toutes' && lignesVisibles.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12, padding: '10px 12px', borderRadius: 12, background: colors.background.sunken }}>
                <span style={{ color: colors.text.secondary, fontSize: 13 }}>Copier ces {lignesVisibles.length} lignes vers</span>
                <select value={dupliquerVers} onChange={e => setDupliquerVers(e.target.value)} className="bp-in" style={{ ...champ, width: 'auto', minWidth: 190 }}>
                  <option value="">Choisir une équipe</option>
                  {[{ id: 'club', nom: 'Club' }, ...equipesOptions].filter(e => e.id !== filtreEquipe).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
                <button onClick={dupliquer} disabled={!dupliquerVers} className="bp-btn" style={{ ...btn(true), opacity: dupliquerVers ? 1 : 0.5, cursor: dupliquerVers ? 'pointer' : 'not-allowed' }}>
                  <Icone d={ICONES.copier} size={15} /> Copier
                </button>
              </div>
            )}
            {info && <p role="status" style={{ color: colors.accent.success, fontSize: 13, fontWeight: 600, margin: '10px 0 0' }}>{info}</p>}
          </>
        )}
      </div>

      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 13, fontWeight: 600, margin: '0 0 14px' }}>{erreur}</p>}

      {chargement ? (
        <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement...</p>
      ) : !budget ? (
        !erreur && (
          <div style={{ ...carte, textAlign: 'center', padding: '48px 24px' }}>
            <span aria-hidden="true" style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center', background: colors.accent.green + '1f', color: colors.accent.green, marginBottom: 16 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.4M8 12h6" /></svg>
            </span>
            <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px', margin: '0 0 8px' }}>Pas encore de budget pour la saison {libelleSaison(saison)}</p>
            <p style={{ color: colors.text.faint, fontSize: 14, lineHeight: 1.65, margin: '0 auto 24px', maxWidth: 480 }}>
              On prépare pour toi les dépenses et les recettes habituelles d’un club : encadrement, équipements, déplacements, cotisations, subventions… Aucun prix n’est rempli, tu saisis simplement les tiens.
            </p>
            {canEdit && precedent && (
              <div style={{ marginBottom: 14 }}>
                <button onClick={reprendrePrecedent} disabled={creation} className="bp-btn" style={{ ...btn(true), padding: '12px 24px', opacity: creation ? 0.6 : 1 }}>
                  {creation ? 'Création...' : `Reprendre le budget ${libelleSaison(decalerSaison(saison, -1))} comme point de départ`}
                </button>
                <p style={{ color: colors.text.faint, fontSize: 12, margin: '10px 0 0' }}>Tes lignes, tes prix et tes équipes sont recopiés. Tu ajustes ensuite ce qui change.</p>
              </div>
            )}
            {canEdit ? (
              <button onClick={creerBudget} disabled={creation} className="bp-btn" style={{ ...btn(!precedent), padding: '12px 24px', opacity: creation ? 0.6 : 1 }}>
                {creation ? 'Création...' : precedent ? 'Ou repartir de zéro avec les modèles' : 'Créer le budget de la saison à partir des modèles'}
              </button>
            ) : (
              <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Tu n’as pas le droit de modifier le budget.</p>
            )}
          </div>
        )
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {(() => {
            const dep = totalType(lignesVisibles, 'depense', nbMois)
            const rec = totalType(lignesVisibles, 'recette', nbMois)
            const solde = rec - dep
            const mensuel = repartitionMensuelle(lignesVisibles, nbMois)
            const parEquipe = totauxParEquipe(lignes, nbMois)
            const parCategorie = depensesParCategorie(lignesVisibles, nbMois)
            const couverture = dep > 0 ? Math.round((rec / dep) * 100) : null
            const couleurCouverture = couverture == null ? colors.border.strong : couverture >= 100 ? colors.accent.success : couverture >= 60 ? colors.accent.amber : colors.accent.red
            const statut = solde > 0 ? { t: 'Excédent prévu', i: ICONES.haut, c: colors.accent.success } : solde < 0 ? { t: 'Déficit prévu', i: ICONES.bas, c: colors.accent.red } : { t: 'À l’équilibre', i: ICONES.egal, c: colors.text.faint }
            const lignesEquipes = [{ id: 'club', nom: 'Club (charges communes)' }, ...equipesOptions]
            const tuiles = [
              ['Dépenses de l’année', eurosFr(dep), colors.accent.red],
              ['Recettes de l’année', eurosFr(rec), colors.accent.success],
              ['Dépenses par mois d’activité', eurosFr(dep / nbMois), colors.accent.blue],
            ]
            return (
              <>
                <div className="bp-kpi">
                  <div className="bp-hero bp-tuile" style={{ ...carte, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase', color: colors.text.faint }}>Solde prévisionnel</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px 4px 8px', borderRadius: 999, background: statut.c + '1c', fontSize: 12, fontWeight: 700, color: colors.text.primary }}>
                        <span style={{ display: 'inline-flex', color: statut.c }}><Icone d={statut.i} size={14} trait={2.6} /></span>{statut.t}
                      </span>
                    </div>
                    <p style={{ margin: '10px 0 14px', fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, color: colors.text.primary }}>{eurosFr(solde)}</p>
                    {couverture != null ? (
                      <>
                        <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, couverture)} aria-label="Part des dépenses couverte par les recettes" style={{ height: 8, borderRadius: 999, background: couleurCouverture + '26', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, couverture)}%`, height: '100%', borderRadius: 999, background: couleurCouverture, transition: 'width .3s' }} />
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: colors.text.secondary }}>Les recettes couvrent <strong style={{ color: colors.text.primary }}>{couverture} %</strong> des dépenses.</p>
                      </>
                    ) : <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Renseigne tes prix pour voir l’équilibre du budget.</p>}
                  </div>
                  {tuiles.map(([titre, valeur, couleur]) => (
                    <div key={titre} className="bp-tuile" style={{ ...carte, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
                      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: colors.text.faint }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: couleur, flexShrink: 0 }} />{titre}
                      </p>
                      <p style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, letterSpacing: '-0.6px', color: colors.text.primary }}>{valeur}</p>
                    </div>
                  ))}
                </div>

                <div style={carte}>
                  <h3 style={titreCarte}>Solde cumulé mois par mois</h3>
                  <p style={{ ...sousTitre, margin: '4px 0 14px' }}>Ce que le club a en caisse à la fin de chaque mois. Survole un mois pour voir le détail.</p>
                  <GraphiqueSolde mensuel={mensuel} colors={colors} />
                  <details style={{ marginTop: 14 }}>
                    <summary style={{ color: colors.text.secondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Voir le tableau mois par mois</summary>
                    <div style={{ overflowX: 'auto', marginTop: 8 }}>
                      <table className="bp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                          {['Mois', 'Dépenses', 'Recettes', 'Solde du mois', 'Solde cumulé'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{mensuel.map(m => (
                          <tr key={m.num} style={{ borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'right' }}>
                            <td style={{ padding: '9px 12px', textAlign: 'left', color: colors.text.primary, fontWeight: 600, textTransform: 'capitalize' }}>{m.nom}</td>
                            <td style={{ padding: '9px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(m.depenses)}</td>
                            <td style={{ padding: '9px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(m.recettes)}</td>
                            <td style={{ padding: '9px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(m.solde)}</td>
                            <td style={{ padding: '9px 12px', fontWeight: 800, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(m.cumul)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </details>
                </div>

                <div style={carte}>
                  <h3 style={titreCarte}>Coût par équipe</h3>
                  <p style={{ ...sousTitre, margin: '4px 0 12px' }}>Coût net = dépenses moins recettes de l’équipe. L’effectif prévu est modifiable, sinon on prend l’effectif actuel.</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="bp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ background: colors.background.sunken }}>
                        {['Équipe', 'Dépenses', 'Recettes', 'Coût net', 'Joueurs', 'Coût net par joueur'].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right', borderRadius: i === 0 ? '10px 0 0 10px' : i === 5 ? '0 10px 10px 0' : 0 }}>{h}</th>)}
                      </tr></thead>
                      <tbody>{lignesEquipes.map(e => {
                        const t = parEquipe[e.id] || { depenses: 0, recettes: 0 }
                        const net = t.depenses - t.recettes
                        const eff = e.id === 'club' ? 0 : effectifEquipe(e.id)
                        return (
                          <tr key={e.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, textAlign: 'right' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'left', color: colors.text.primary, fontWeight: 700 }}>{e.nom}</td>
                            <td style={{ padding: '10px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(t.depenses)}</td>
                            <td style={{ padding: '10px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(t.recettes)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(net)}</td>
                            <td style={{ padding: '6px 12px' }}>
                              {e.id === 'club' ? <span style={{ color: colors.text.disabled }}>-</span> : (
                                <input type="number" min="0" disabled={!canEdit} key={e.id + ':' + (effectifPrevu(e.id) ?? 'reel')} defaultValue={effectifPrevu(e.id) ?? ''} placeholder={String(effectifReel(e.id))} aria-label={`Effectif prévu ${e.nom}`} className="bp-in"
                                  onBlur={ev => { if (ev.target.value !== String(effectifPrevu(e.id) ?? '')) changerEffectif(e.id, ev.target.value) }}
                                  style={{ ...champ, width: 72, textAlign: 'right' }} />
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: colors.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{e.id !== 'club' && eff > 0 ? <strong style={{ color: colors.text.primary }}>{eurosFr(net / eff)}</strong> : <span style={{ color: colors.text.disabled }}>effectif inconnu</span>}</td>
                          </tr>
                        )
                      })}</tbody>
                    </table>
                  </div>
                </div>

                {parCategorie.length > 0 && (
                  <div style={carte}>
                    <h3 style={{ ...titreCarte, marginBottom: 14 }}>Où va l’argent</h3>
                    <div style={{ display: 'grid', gap: 14 }}>
                      {parCategorie.map(([cat, montant]) => {
                        const part = dep > 0 ? (montant / dep) * 100 : 0
                        return (
                          <div key={cat}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, marginBottom: 6 }}>
                              <span style={{ color: colors.text.primary, fontWeight: 600 }}>{cat}</span>
                              <span style={{ color: colors.text.secondary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}><strong style={{ color: colors.text.primary }}>{eurosFr(montant)}</strong> · {Math.round(part)} %</span>
                            </div>
                            <div style={{ height: 10, borderRadius: 999, background: colors.accent.blue + '22', overflow: 'hidden' }}>
                              <div style={{ width: `${part}%`, height: '100%', borderRadius: 999, background: colors.accent.blue }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          {[['depense', 'Dépenses', colors.accent.red, 'Tout ce que le club prévoit de payer sur la saison.'], ['recette', 'Recettes', colors.accent.success, 'Tout ce que le club prévoit d’encaisser sur la saison.']].map(([type, titre, couleur, aide]) => (
            <div key={type} style={carte}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: couleur + '1c', color: couleur }}>
                    <Icone d={type === 'depense' ? ICONES.bas : ICONES.haut} size={22} trait={2.4} />
                  </span>
                  <div>
                    <h3 style={{ ...titreCarte, fontSize: 20 }}>{titre}</h3>
                    <p style={sousTitre}>{aide}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }}>Total {titre.toLowerCase()}{filtreEquipe === 'toutes' ? '' : ` · ${filtreEquipe === 'club' ? 'Club' : nomEquipe(filtreEquipe)}`}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 800, letterSpacing: '-0.6px', color: colors.text.primary }}>{eurosFr(totalType(lignesVisibles, type, nbMois))}</p>
                </div>
              </div>

              {groupes(type).length === 0 && <p style={{ color: colors.text.faint, fontSize: 13, margin: '0 0 12px' }}>Aucune ligne pour le moment.</p>}
              {groupes(type).length > 0 && (
                <div className="bp-grille bp-entete" aria-hidden="true">
                  <span>Poste</span><span>Qté</span><span>Prix unitaire</span><span>Équipe</span><span>Rythme</span><span>Mois de paiement</span><span style={{ textAlign: 'right' }}>Total annuel</span><span />
                </div>
              )}
              {groupes(type).map(([cat, items]) => {
                const sousTotal = items.reduce((tot, l) => tot + (l.prix_unitaire == null ? 0 : totalAnnuelLigne(l, nbMois)), 0)
                return (
                  <div key={cat} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px', borderRadius: 10, background: colors.background.sunken, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.secondary }}>{cat}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(sousTotal)}</span>
                    </div>
                    {items.map(l => {
                      const aRenseigner = l.prix_unitaire == null
                      const arme = suppressionArmee === l.id
                      return (
                        <div key={l.id} className="bp-grille bp-ligne">
                          <span className="bp-lib" style={{ color: colors.text.primary, fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{l.libelle}</span>
                          <div className="bp-cell bp-c-qty" data-e={l.periodicite === 'match' ? 'Nb de matchs' : 'Quantité'}>
                            <input type="number" min="0" step="any" disabled={!canEdit} defaultValue={l.quantite} aria-label="Quantité" title={l.periodicite === 'match' ? 'Nombre de matchs' : 'Quantité'} className="bp-in"
                              onBlur={e => { const v = e.target.value === '' ? 1 : Math.max(0, Number(e.target.value)); if (v !== Number(l.quantite)) modifierLigne(l.id, { quantite: v }) }}
                              style={champ} />
                          </div>
                          <div className="bp-cell bp-c-prix" data-e="Prix unitaire">
                            <input type="number" min="0" step="any" disabled={!canEdit} defaultValue={l.prix_unitaire ?? ''} placeholder="Prix €" aria-label="Prix unitaire" className="bp-in"
                              onBlur={e => { const v = e.target.value === '' ? null : Math.max(0, Number(e.target.value)); if (v !== (l.prix_unitaire == null ? null : Number(l.prix_unitaire))) modifierLigne(l.id, { prix_unitaire: v }) }}
                              style={champ} />
                          </div>
                          <div className="bp-cell bp-c-eq" data-e="Équipe">
                            <select value={l.equipe_id || ''} disabled={!canEdit} onChange={e => modifierLigne(l.id, { equipe_id: e.target.value || null })} aria-label="Équipe" className="bp-in" style={champ}>
                              <option value="">Club</option>
                              {equipesOptions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                          </div>
                          <div className="bp-cell bp-c-ry" data-e="Rythme">
                            <select value={l.periodicite} disabled={!canEdit} onChange={e => modifierLigne(l.id, { periodicite: e.target.value })} aria-label="Périodicité" className="bp-in" style={champ}>
                              {PERIODICITES.map(pe => <option key={pe.val} value={pe.val}>{pe.label}</option>)}
                            </select>
                          </div>
                          {(l.periodicite === 'an' || l.periodicite === 'saison') ? (
                            <div className="bp-cell bp-c-mois" data-e="Mois de paiement">
                              <select value={l.mois_paiement || ''} disabled={!canEdit} onChange={e => modifierLigne(l.id, { mois_paiement: e.target.value ? Number(e.target.value) : null })} aria-label="Mois de paiement" className="bp-in" style={champ}>
                                <option value="">Mois de paiement</option>
                                {MOIS_SAISON.map(mo => <option key={mo.num} value={mo.num}>{mo.nom}</option>)}
                              </select>
                            </div>
                          ) : <span className="bp-vide bp-c-mois" />}
                          <span className="bp-c-tot" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {aRenseigner
                              ? <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: colors.accent.amber + '26', color: colors.text.secondary }}>à renseigner</span>
                              : <span style={{ fontSize: 14, fontWeight: 800, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{eurosFr(totalAnnuelLigne(l, nbMois))}<span style={{ fontSize: 11, fontWeight: 600, color: colors.text.faint }}> / an</span></span>}
                          </span>
                          {canEdit ? (
                            <button onClick={() => supprimerLigne(l.id)} className="bp-btn bp-c-act" aria-label={arme ? 'Confirmer la suppression' : `Supprimer la ligne ${l.libelle}`} title={arme ? 'Cliquer pour confirmer' : 'Supprimer'}
                              style={{ height: 36, minWidth: 36, padding: arme ? '0 10px' : 0, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: arme ? colors.accent.red + '1c' : 'transparent', border: `1px solid ${arme ? colors.accent.red : colors.border.default}`, color: arme ? colors.accent.red : colors.text.faint }}>
                              {arme ? 'Confirmer ?' : <Icone d={ICONES.corbeille} size={16} />}
                            </button>
                          ) : <span className="bp-c-act" />}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 14, borderTop: `1px solid ${colors.border.subtle}` }}>
                {canEdit && (
                  <button onClick={() => ouvrirAjout(type)} className="bp-btn" style={{ ...btn(false), borderStyle: 'dashed' }}>
                    <Icone d={ICONES.plus} size={15} trait={2.6} /> Ajouter {type === 'depense' ? 'une dépense' : 'une recette'}
                  </button>
                )}
              </div>
              {ajout?.type === type && (
                <form onSubmit={ev => { ev.preventDefault(); validerAjout() }} style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 14, background: colors.background.sunken, border: `1px solid ${colors.border.subtle}` }}>
                  <select value={ajout.equipeId} onChange={e => setAjout(a => ({ ...a, equipeId: e.target.value }))} className="bp-in" style={{ ...champ, width: 'auto' }} aria-label="Équipe">
                    <option value="">Club</option>
                    {equipesOptions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  <select value={ajout.modeleId} onChange={e => setAjout(a => ({ ...a, modeleId: e.target.value }))} className="bp-in" style={{ ...champ, width: 'auto', maxWidth: 300 }}>
                    <option value="">Ligne libre (je choisis le nom)</option>
                    {modeles.filter(mo => mo.type === type).map(mo => <option key={mo.id} value={mo.id}>{mo.categorie} : {mo.libelle}</option>)}
                  </select>
                  {!ajout.modeleId && (
                    <>
                      <input autoFocus value={ajout.libelle} onChange={e => setAjout(a => ({ ...a, libelle: e.target.value }))} placeholder="Nom de la ligne" maxLength={80} className="bp-in" style={{ ...champ, width: 210 }} />
                      <input value={ajout.categorie} onChange={e => setAjout(a => ({ ...a, categorie: e.target.value }))} placeholder="Catégorie (facultatif)" maxLength={40} list={'cats-' + type} className="bp-in" style={{ ...champ, width: 190 }} />
                      <datalist id={'cats-' + type}>{[...new Set(lignes.filter(l => l.type === type).map(l => l.categorie))].map(c => <option key={c} value={c} />)}</datalist>
                    </>
                  )}
                  <button type="submit" disabled={!ajout.modeleId && !ajout.libelle.trim()} className="bp-btn" style={{ ...btn(true), opacity: (!ajout.modeleId && !ajout.libelle.trim()) ? 0.5 : 1 }}>Ajouter</button>
                  <button type="button" onClick={() => setAjout(null)} className="bp-btn" style={btn(false)}>Annuler</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
