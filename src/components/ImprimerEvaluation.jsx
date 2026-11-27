// Fiche d'évaluation imprimable (bloc 13 de PLAN-fiches-evaluation.md).
// Trois usages, un seul bouton :
//   mode « modele » : fiche vierge d'une catégorie (club ou éducateur) ;
//   mode « joueur » : fiche d'un joueur, vierge ou remplie ;
//   mode « equipe » : tableau de l'équipe (joueurs en lignes, critères en colonnes), vierge ou rempli.
// L'éducateur ou le club décoche les critères à ne pas imprimer (impression seulement, le modèle ne change pas).
// La fiche est montée dans <body> (portail #eval-print) le temps de l'impression ; index.css cache le reste.
// Papier blanc, couleurs fixes. Jamais imprimées : les notes de suivi (privées ou staff) et l'auto-évaluation du joueur.
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { texteSur } from '../lib/identite'
import { saisonActuelle } from '../lib/saison'
import { labelCategorie } from '../lib/categories'
import {
  ECHELLE, COULEUR_PILIER, LIBELLE_POSTE, fr1, grouperCriteres, chargerModelePublie, famillePoste, libellePeriode,
} from '../lib/ficheEvaluationPapier'

const AVERTISSEMENT = 'Document confidentiel. Ne pas remettre au joueur ou à sa famille sans l\'accord du club.'
const LIGNES_PAR_PAGE = 20
const COLONNES_PAR_PAGE = 14

const moyenne = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : null)
const couleurPilier = (nom) => COULEUR_PILIER[nom] || '#475569'

// ── Fiche d'un joueur (portrait) ────────────────────────────────────────────
function EnTete({ club, kicker, titre, sous }) {
  const c1 = club?.couleur_principale || '#1a3a6e'
  const c2 = club?.couleur_secondaire || '#4ade80'
  return (
    <div className="ev-entete" style={{ background: c1, color: texteSur(c1) }}>
      {club?.avatar_url && <img src={club.avatar_url} alt="" crossOrigin="anonymous" className="ev-logo" />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ev-kicker" style={{ color: c2 === c1 ? 'inherit' : c2 }}>{kicker}{club?.club ? ` · ${club.club}` : ''}</div>
        <div className="ev-titre">{titre}</div>
        {sous && <div className="ev-sous">{sous}</div>}
      </div>
    </div>
  )
}

function Case({ plein, children }) {
  return <span className={'ev-case' + (plein ? ' ev-case-pleine' : '')}>{children}</span>
}

function ControleCritere({ c, r, rempli }) {
  if (c.type === 'note') {
    const val = rempli ? r?.note : null
    return (
      <span className="ev-controle">
        {ECHELLE.map(e => <Case key={e.v} plein={val === e.v}>{e.v}</Case>)}
      </span>
    )
  }
  if (c.type === 'oui_non') {
    const val = rempli ? r?.oui_non : null
    return (
      <span className="ev-controle">
        <span className="ev-oui-non"><Case plein={val === true} />Oui</span>
        <span className="ev-oui-non"><Case plein={val === false} />Non</span>
      </span>
    )
  }
  if (c.type === 'test') {
    const val = rempli ? r?.valeur : null
    return (
      <span className="ev-controle ev-test">
        {val != null ? <strong>{fr1(Number(val))}</strong> : <span className="ev-trait" />}
        <span>{c.unite}</span>
        {c.objectif != null && <span className="ev-objectif">objectif {fr1(Number(c.objectif))}</span>}
      </span>
    )
  }
  return null
}

export function FicheJoueurPapier({ club, entete, groupes, resultats, rempli, evaluation }) {
  return (
    <div className="ev-doc ev-portrait">
      <EnTete club={club} kicker="Fiche d'évaluation" titre={entete.titre} sous={entete.sous} />
      <div className="ev-identite">
        <div><span>Joueur</span><b>{rempli ? entete.joueurNom : ''}</b></div>
        <div><span>Poste</span><b>{entete.poste || ''}</b></div>
        <div><span>N°</span><b>{entete.numero || ''}</b></div>
        <div><span>Date</span><b>{rempli && evaluation?.date_evaluation ? new Date(evaluation.date_evaluation + 'T12:00:00').toLocaleDateString('fr-FR') : ''}</b></div>
        <div><span>Période</span><b>{rempli ? entete.periode : ''}</b></div>
        <div><span>Évaluateur</span><b />
        </div>
      </div>
      <p className="ev-legende">
        Notes : {ECHELLE.map(e => `${e.v} = ${e.label}`).join('   ·   ')}
        {rempli && evaluation?.statut !== 'terminee' ? '   ·   Brouillon, évaluation non terminée' : ''}
      </p>
      {groupes.map(g => {
        const notes = g.criteres.filter(c => c.type === 'note' && rempli && resultats[c.id]?.note != null).map(c => resultats[c.id].note)
        const moy = moyenne(notes)
        return (
          <section key={g.nom} className="ev-pilier" style={{ borderColor: couleurPilier(g.nom) }}>
            <h4 style={{ color: couleurPilier(g.nom) }}>
              {g.nom}
              {moy != null && <span className="ev-moyenne">moyenne {fr1(moy)} / 3</span>}
            </h4>
            {g.criteres.map(c => (
              <div key={c.id} className={'ev-ligne' + (c.type === 'commentaire' ? ' ev-ligne-texte' : '')}>
                <div className="ev-ligne-haut">
                  <span className="ev-libelle">
                    {c.libelle}
                    {c.poste && <i>{LIBELLE_POSTE[c.poste]}</i>}
                    {c.acquis_quand && c.type === 'note' && <small>Acquis quand : {c.acquis_quand}</small>}
                  </span>
                  <ControleCritere c={c} r={resultats[c.id]} rempli={rempli} />
                </div>
                {c.type === 'commentaire' && (
                  rempli && resultats[c.id]?.texte
                    ? <p className="ev-texte">{resultats[c.id].texte}</p>
                    : <div className="ev-lignes"><span /><span /></div>
                )}
              </div>
            ))}
          </section>
        )
      })}
      <section className="ev-bas">
        <div>
          <span>Objectif personnel</span>
          {rempli && evaluation?.objectif_personnel ? <p className="ev-texte">{evaluation.objectif_personnel}</p> : <div className="ev-lignes"><span /><span /></div>}
        </div>
        <div>
          <span>Objectif collectif</span>
          {rempli && evaluation?.objectif_collectif ? <p className="ev-texte">{evaluation.objectif_collectif}</p> : <div className="ev-lignes"><span /><span /></div>}
        </div>
        <div>
          <span>Commentaire général</span>
          {rempli && evaluation?.commentaire ? <p className="ev-texte">{evaluation.commentaire}</p> : <div className="ev-lignes"><span /><span /><span /></div>}
        </div>
      </section>
      <div className="ev-pied">
        <span>{rempli ? AVERTISSEMENT : ''}</span>
        <span>Digital Football</span>
      </div>
    </div>
  )
}

// ── Tableau d'équipe (paysage) ──────────────────────────────────────────────
export function TableauEquipePapier({ club, entete, criteres, lignes, rempli }) {
  const pagesJoueurs = []
  for (let i = 0; i < Math.max(lignes.length, 1); i += LIGNES_PAR_PAGE) pagesJoueurs.push(lignes.slice(i, i + LIGNES_PAR_PAGE))
  const pagesCriteres = []
  for (let i = 0; i < criteres.length; i += COLONNES_PAR_PAGE) pagesCriteres.push(criteres.slice(i, i + COLONNES_PAR_PAGE))
  const pages = []
  pagesCriteres.forEach((cols, ic) => pagesJoueurs.forEach((joueurs, ij) => pages.push({ cols, joueurs, cle: `${ic}-${ij}` })))
  return (
    <div className="ev-doc ev-paysage">
      {pages.map((p, i) => (
        <div key={p.cle} className="ev-page-tableau">
          <EnTete club={club} kicker="Tableau d'équipe" titre={entete.titre} sous={entete.sous + (pages.length > 1 ? ` · page ${i + 1}/${pages.length}` : '')} />
          <table className="ev-tableau">
            <thead>
              <tr>
                <th className="ev-th-joueur">Joueur</th>
                {p.cols.map(c => (
                  <th key={c.id} className="ev-th-critere" style={{ borderTopColor: couleurPilier(c.pilier) }}>
                    <span>{c.libelle}{c.unite ? ` (${c.unite})` : ''}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.joueurs.map(l => (
                <tr key={l.id}>
                  <td className="ev-td-joueur">{l.numero ? <em>{l.numero}</em> : null}{l.nom}</td>
                  {p.cols.map(c => {
                    const horsPoste = c.poste && l.poste && c.poste !== l.poste
                    const v = rempli && !horsPoste ? l.valeurs?.[c.id] : null
                    let txt = ''
                    if (v) {
                      if (c.type === 'note') txt = v.note ?? ''
                      else if (c.type === 'test') txt = v.valeur != null ? fr1(Number(v.valeur)) : ''
                      else if (c.type === 'oui_non') txt = v.oui_non == null ? '' : (v.oui_non ? 'Oui' : 'Non')
                      else txt = v.texte ? '…' : ''
                    }
                    return <td key={c.id} className={horsPoste ? 'ev-td-na' : ''}>{txt}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ev-pied">
            <span>{rempli ? AVERTISSEMENT : `Notes : ${ECHELLE.map(e => `${e.v} = ${e.label}`).join(' · ')}`}</span>
            <span>Digital Football</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Bouton + fenêtre d'options ──────────────────────────────────────────────
export default function BoutonImprimerEvaluation({
  mode, educateurId, cadre = null, equipeJoueurId = null, joueurNom = '', poste = null, numero = null,
  joueurs = [], equipeNom = '', libelle = 'Imprimer la fiche', style = {},
}) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [ouvert, setOuvert] = useState(false)
  const [base, setBase] = useState(cadre) // { modele, version, criteres, categorieCle, params }
  const [club, setClub] = useState(null)
  const [evals, setEvals] = useState(null)
  const [type, setType] = useState('vierge')
  const [choixEval, setChoixEval] = useState('') // joueur : id d'évaluation ; équipe : 'derniere' ou numéro
  const [masques, setMasques] = useState(() => new Set())
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [impression, setImpression] = useState(null)
  const nb = base?.params?.nb_evaluations_saison || null

  // Chargement à l'ouverture seulement : modèle (équipe), identité du club, évaluations (version remplie)
  useEffect(() => {
    if (!ouvert) return
    let annule = false
    ;(async () => {
      try {
        let b = cadre
        if (!b && mode === 'equipe') {
          if (!joueurs.length) { setErreur("Ajoute d'abord des joueurs à l'équipe."); return }
          const { data: cle } = await supabase.rpc('secu_categorie_effectif', { p_equipe_joueur_id: joueurs[0].id })
          if (!cle) { setErreur("La catégorie de l'équipe n'est pas reconnue."); return }
          const m = await chargerModelePublie(cle, educateurId)
          if (!m) { setErreur("Aucune fiche publiée pour cette catégorie. Publie d'abord une fiche dans « Ma fiche d'évaluation »."); return }
          const proprios = [m.modele.club_id, m.modele.educateur_id, educateurId].filter(Boolean)
          const { data: lignes } = await supabase.from('parametres_evaluation').select('*').in('proprietaire_id', proprios)
          const params = (lignes || []).find(l => l.proprietaire_id === m.modele.club_id) || (lignes || []).find(l => l.proprietaire_id === educateurId) || null
          b = { ...m, params }
        }
        if (annule) return
        setBase(b)
        const idClub = b?.modele?.club_id || educateurId
        const [{ data: profil }, rEvals] = await Promise.all([
          idClub ? supabase.from('profiles').select('club, avatar_url, couleur_principale, couleur_secondaire').eq('id', idClub).maybeSingle() : { data: null },
          mode === 'modele' ? { data: [] }
            : supabase.from('evaluations')
              .select('id, equipe_joueur_id, numero, saison, statut, date_evaluation, version_id, objectif_personnel, objectif_collectif, commentaire, created_at, evaluation_resultats(critere_id, source, note, valeur, oui_non, texte)')
              .in('equipe_joueur_id', mode === 'joueur' ? [equipeJoueurId] : joueurs.map(j => j.id)).eq('nature', 'evaluation').order('created_at', { ascending: false }),
        ])
        if (annule) return
        setClub(profil || null)
        const liste = (rEvals.data || []).map(({ evaluation_resultats: rs, ...e }) => ({ ...e, resultats: (rs || []).filter(r => r.source === 'educateur') }))
        setEvals(liste)
        if (mode === 'joueur') setChoixEval(liste[0]?.id || '')
        else setChoixEval('derniere')
      } catch (e) {
        console.error('[ImprimerEvaluation]', e)
        if (!annule) setErreur("Impossible de préparer l'impression. Vérifie ta connexion et réessaie.")
      }
    })()
    return () => { annule = true }
  }, [ouvert]) // eslint-disable-line react-hooks/exhaustive-deps

  // Évaluation choisie (mode joueur) et critères de sa version (peut différer de la version publiée)
  const evalJoueur = mode === 'joueur' && type === 'remplie' ? (evals || []).find(e => e.id === choixEval) || null : null
  const [criteresAutreVersion, setCriteresAutreVersion] = useState(null) // { versionId, criteres }
  useEffect(() => {
    if (!evalJoueur || !base || evalJoueur.version_id === base.version.id) return
    if (criteresAutreVersion?.versionId === evalJoueur.version_id) return
    let annule = false
    supabase.from('criteres_evaluation').select('*').eq('version_id', evalJoueur.version_id).order('ordre', { ascending: true })
      .then(({ data }) => { if (!annule) setCriteresAutreVersion({ versionId: evalJoueur.version_id, criteres: data || [] }) })
    return () => { annule = true }
  }, [evalJoueur?.id, base?.version?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const criteresListe = useMemo(() => {
    if (!base) return []
    if (evalJoueur && evalJoueur.version_id !== base.version.id) return criteresAutreVersion?.versionId === evalJoueur.version_id ? criteresAutreVersion.criteres : []
    return base.criteres
  }, [base, evalJoueur, criteresAutreVersion])
  const groupesChoix = useMemo(() => grouperCriteres(criteresListe, mode === 'joueur' ? poste : null), [criteresListe, mode, poste])

  const periodes = useMemo(() => {
    if (mode !== 'equipe' || !evals) return []
    const n = new Set(evals.filter(e => e.saison === saison && e.numero).map(e => e.numero))
    return [...n].sort()
  }, [mode, evals, saison])

  const basculer = (id) => setMasques(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  const basculerPilier = (g) => setMasques(prev => {
    const s = new Set(prev)
    const tousMasques = g.criteres.every(c => s.has(c.id))
    g.criteres.forEach(c => { if (tousMasques) s.delete(c.id); else s.add(c.id) })
    return s
  })
  const nbImprimes = groupesChoix.reduce((t, g) => t + g.criteres.filter(c => !masques.has(c.id)).length, 0)

  const preparer = async () => {
    setErreur('')
    if (nbImprimes === 0) { setErreur('Coche au moins un critère à imprimer.'); return }
    setOccupe(true)
    try {
      const rempli = type === 'remplie'
      const c = { club, rempli }
      const sousBase = [base.categorieCle ? labelCategorie(base.categorieCle) : null, `Saison ${saison}`, `${base.modele.nom} (version ${base.version.numero})`]
      if (mode === 'modele') {
        c.type = 'fiche'
        c.entete = { titre: base.modele.nom, sous: sousBase.join(' · '), joueurNom: '', poste: '', numero: '', periode: '' }
        c.groupes = grouperCriteres(base.criteres, null, masques)
        c.resultats = {}
        c.evaluation = null
      } else if (mode === 'joueur') {
        const ev = rempli ? evalJoueur : null
        if (rempli && !ev) throw new Error('aucune évaluation')
        const versionFiche = ev && ev.version_id !== base.version.id ? null : base.version
        c.type = 'fiche'
        c.entete = {
          titre: rempli ? joueurNom : "Fiche d'évaluation",
          sous: [base.categorieCle ? labelCategorie(base.categorieCle) : null, ev ? `Saison ${ev.saison}` : `Saison ${saison}`, versionFiche ? `${base.modele.nom} (version ${versionFiche.numero})` : base.modele.nom].filter(Boolean).join(' · '),
          joueurNom, poste: rempli && poste ? LIBELLE_POSTE[poste] : '', numero: rempli ? (numero || '') : '',
          periode: ev ? libellePeriode(ev.numero, nb) : '',
        }
        c.groupes = grouperCriteres(criteresListe, poste, masques)
        c.resultats = {}
        ;(ev?.resultats || []).forEach(r => { c.resultats[r.critere_id] = r })
        c.evaluation = ev
        if (rempli) supabase.rpc('noter_acces_evaluations', { p_equipe_joueur_id: equipeJoueurId, p_objet: 'evaluations' }).then(({ error }) => { if (error) console.warn('[journal]', error.message) })
      } else {
        const colonnes = grouperCriteres(base.criteres, null, masques).flatMap(g => g.criteres).filter(x => x.type !== 'commentaire')
        if (!colonnes.length) throw new Error('Il reste seulement des commentaires')
        const parJoueur = {}
        if (rempli) {
          joueurs.forEach(j => {
            const dej = (evals || []).filter(e => e.equipe_joueur_id === j.id && e.version_id === base.version.id)
            const ev = choixEval === 'derniere' ? dej[0] : dej.find(e => e.saison === saison && e.numero === Number(choixEval))
            if (ev) { const v = {}; ev.resultats.forEach(r => { v[r.critere_id] = r }); parJoueur[j.id] = v }
          })
        }
        c.type = 'equipe'
        c.entete = {
          titre: equipeNom || 'Équipe',
          sous: [base.categorieCle ? labelCategorie(base.categorieCle) : null, `Saison ${saison}`, rempli ? (choixEval === 'derniere' ? 'Dernière évaluation de chaque joueur' : libellePeriode(Number(choixEval), nb)) : base.modele.nom].filter(Boolean).join(' · '),
        }
        c.criteres = colonnes
        c.lignes = joueurs.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(j => ({
          id: j.id, nom: `${j.nom || ''} ${j.prenom || ''}`.trim(), numero: j.numero_maillot, poste: famillePoste(j.poste), valeurs: parJoueur[j.id] || null,
        }))
        if (rempli) Object.keys(parJoueur).forEach(id => supabase.rpc('noter_acces_evaluations', { p_equipe_joueur_id: id, p_objet: 'evaluations' }).then(({ error }) => { if (error) console.warn('[journal]', error.message) }))
      }
      setImpression(c)
    } catch (e) {
      console.error('[ImprimerEvaluation]', e)
      setErreur("L'impression n'a pas pu être préparée.")
      setOccupe(false)
    }
  }

  // Une fois la fiche montée : attendre le logo, imprimer, puis démonter.
  useEffect(() => {
    if (!impression) return
    let fini = false
    const nettoyer = () => { if (!fini) { fini = true; setImpression(null); setOccupe(false) } }
    window.addEventListener('afterprint', nettoyer, { once: true })
    const lancer = async () => {
      const imgs = [...document.querySelectorAll('#eval-print img')]
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = r; i.onerror = r; setTimeout(r, 3000) })))
      try { window.print() } catch { setErreur("L'impression n'a pas pu s'ouvrir.") }
      setTimeout(nettoyer, 1500)
    }
    const t = setTimeout(lancer, 50)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', nettoyer) }
  }, [impression])

  const fermer = () => { setOuvert(false); setErreur('') }
  const pret = !!base && evals !== null
  const aucuneEval = pret && mode !== 'modele' && (evals || []).length === 0
  const rempliPossible = mode !== 'modele'

  const bouton = (actif) => ({
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Barlow, sans-serif', minHeight: 40,
    border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, background: actif ? colors.accent.green + '1a' : 'transparent',
    color: actif ? colors.accent.green : colors.text.secondary,
  })
  const titreSection = { margin: '16px 0 8px', fontSize: 11, fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const champ = { minHeight: 40, padding: '8px 10px', borderRadius: 8, border: `1px solid ${colors.border.default}`, background: colors.background.base, color: colors.text.primary, fontSize: 13, fontFamily: 'Barlow, sans-serif', width: '100%' }

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOuvert(true) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.default}`, fontSize: 13, fontWeight: 700, fontFamily: 'Barlow, sans-serif', ...style,
        }}>
        <Printer size={14} aria-hidden="true" />
        {libelle}
      </button>
      {ouvert && createPortal(
        <div onClick={(e) => { e.stopPropagation(); fermer() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div role="dialog" aria-modal="true" aria-label="Imprimer la fiche" onClick={(e) => e.stopPropagation()}
            style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 20, maxWidth: 560, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.text.primary }}>
                  {mode === 'equipe' ? "Imprimer le tableau de l'équipe" : mode === 'joueur' ? 'Imprimer la fiche du joueur' : 'Imprimer la fiche vierge'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.faint }}>
                  {[mode === 'joueur' ? joueurNom : mode === 'equipe' ? equipeNom : base?.modele?.nom, base?.categorieCle ? labelCategorie(base.categorieCle) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" onClick={fermer} aria-label="Fermer" style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: 20, cursor: 'pointer', minWidth: 36, minHeight: 36 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginTop: 4 }}>
              {!pret && !erreur && <p style={{ fontSize: 13, color: colors.text.faint, marginTop: 16 }} role="status">Préparation…</p>}
              {pret && (
                <>
                  <p style={titreSection}>Version à imprimer</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" style={bouton(type === 'vierge')} onClick={() => setType('vierge')}>Vierge</button>
                    {rempliPossible && <button type="button" style={bouton(type === 'remplie')} onClick={() => setType('remplie')} disabled={aucuneEval}>Remplie</button>}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.text.muted, lineHeight: 1.5 }}>
                    {type === 'vierge'
                      ? (mode === 'equipe' ? "Les noms des joueurs sont imprimés, les cases restent vides pour écrire au stylo." : 'Aucune donnée de joueur : à remplir au stylo.')
                      : 'Notes et commentaires de l\'éducateur. Les notes de suivi privées et l\'auto-évaluation du joueur ne sont jamais imprimées. Document confidentiel, à ne pas remettre sans accord du club.'}
                  </p>
                  {aucuneEval && <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.text.faint }}>Aucune évaluation enregistrée pour le moment : seule la version vierge est disponible.</p>}

                  {type === 'remplie' && mode === 'joueur' && (
                    <>
                      <p style={titreSection}>Évaluation</p>
                      <select value={choixEval} onChange={e => setChoixEval(e.target.value)} style={champ} aria-label="Évaluation à imprimer">
                        {(evals || []).map(e => (
                          <option key={e.id} value={e.id}>
                            {e.saison} · {libellePeriode(e.numero, e.saison === saison ? nb : null)}{e.date_evaluation ? ` · ${new Date(e.date_evaluation + 'T12:00:00').toLocaleDateString('fr-FR')}` : ''}{e.statut === 'terminee' ? '' : ' (brouillon)'}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {type === 'remplie' && mode === 'equipe' && (
                    <>
                      <p style={titreSection}>Évaluation</p>
                      <select value={choixEval} onChange={e => setChoixEval(e.target.value)} style={champ} aria-label="Période à imprimer">
                        <option value="derniere">Dernière évaluation de chaque joueur</option>
                        {periodes.map(n => <option key={n} value={n}>{libellePeriode(n, nb)}</option>)}
                      </select>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.text.faint }}>Les joueurs évalués avec une ancienne version de la fiche, ou sans évaluation, ont une ligne vide.</p>
                    </>
                  )}

                  <p style={titreSection}>Critères à imprimer ({nbImprimes})</p>
                  {groupesChoix.length === 0 && <p style={{ fontSize: 12, color: colors.text.faint }}>Chargement des critères…</p>}
                  {groupesChoix.map(g => (
                    <fieldset key={g.nom} style={{ border: `1px solid ${colors.border.subtle}`, borderRadius: 10, margin: '0 0 8px', padding: '8px 12px' }}>
                      <legend style={{ fontSize: 12, fontWeight: 800, color: couleurPilier(g.nom), padding: '0 6px' }}>{g.nom}</legend>
                      <button type="button" onClick={() => basculerPilier(g)} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: '2px 0 6px' }}>
                        {g.criteres.every(c => masques.has(c.id)) ? 'Tout cocher' : 'Tout décocher'}
                      </button>
                      {g.criteres.map(c => (
                        <label key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 32, padding: '3px 0', fontSize: 13, color: colors.text.secondary, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!masques.has(c.id)} onChange={() => basculer(c.id)} style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }} />
                          <span>{c.libelle}{mode === 'equipe' && c.type === 'commentaire' ? ' (commentaire, absent du tableau)' : ''}</span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </>
              )}
              {erreur && <p role="alert" style={{ margin: '12px 0 0', fontSize: 13, color: colors.accent.red }}>{erreur}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" onClick={fermer} style={bouton(false)}>Fermer</button>
              <button type="button" onClick={preparer} disabled={!pret || occupe || (type === 'remplie' && mode === 'joueur' && !evalJoueur)}
                style={{ ...bouton(true), opacity: (!pret || occupe) ? 0.6 : 1, cursor: occupe ? 'wait' : 'pointer' }}>
                <Printer size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {occupe ? 'Préparation…' : 'Imprimer / enregistrer en PDF'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {impression && createPortal(
        <div id="eval-print">
          {impression.type === 'equipe'
            ? <TableauEquipePapier club={impression.club} entete={impression.entete} criteres={impression.criteres} lignes={impression.lignes} rempli={impression.rempli} />
            : <FicheJoueurPapier club={impression.club} entete={impression.entete} groupes={impression.groupes} resultats={impression.resultats} rempli={impression.rempli} evaluation={impression.evaluation} />}
        </div>,
        document.body
      )}
    </>
  )
}
