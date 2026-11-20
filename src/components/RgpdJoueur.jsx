// RGPD côté joueur et parent (bloc 11b de PLAN-fiches-evaluation.md) : texte d'information,
// demande de correction, export des données visibles. Textes : docs/rgpd/information-joueur-parent.md
// (projet, à faire relire par le juriste avant mise en ligne).
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

const dateFr = (d) => { try { return new Date((d || '').slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return d || '' } }
const cleMineur = (id) => `df_info_eval_mineur_${id}`
const lire = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const ecrire = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sans stockage : le texte s'affiche à chaque fois */ } }

// Texte d'information, repliable. Version courte pour un joueur de moins de 15 ans au premier affichage.
export function InfoRgpdJoueur({ role = 'joueur' }) {
  const colors = useColors()
  const [ouvert, setOuvert] = useState(false)
  const [mineur, setMineur] = useState(false)
  const [uid, setUid] = useState(null)
  const [vu, setVu] = useState(true)

  useEffect(() => {
    if (role !== 'joueur') return
    let actif = true
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      const id = u?.user?.id
      if (!id || !actif) return
      setUid(id)
      const { data: p } = await supabase.from('profiles').select('date_naissance').eq('id', id).maybeSingle()
      if (!actif || !p?.date_naissance) return
      const naiss = new Date(p.date_naissance)
      const age = (Date.now() - naiss.getTime()) / (365.25 * 24 * 3600 * 1000)
      if (age < 15) { setMineur(true); setVu(lire(cleMineur(id)) === '1') }
    })()
    return () => { actif = false }
  }, [role])

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 12, marginBottom: 12 }
  const txt = { color: colors.text.secondary, fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }

  if (mineur && !vu) {
    return (
      <div style={{ ...carte, borderColor: colors.accent.blue }}>
        <h4 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: 14, fontWeight: 800 }}>Tes fiches d'évaluation</h4>
        <p style={txt}>Ton éducateur note tes progrès pour t'aider à t'améliorer. Tu vois tes fiches quand il les a terminées. Tes parents invités les voient aussi. Personne en dehors de ton club ne peut les lire. Si quelque chose est faux, appuie sur « Demander une correction ».</p>
        <button onClick={() => { ecrire(cleMineur(uid), '1'); setVu(true) }}
          style={{ padding: '10px 18px', minHeight: 44, borderRadius: 8, border: 'none', background: colors.accent.blue, color: colors.accent.onBrand || '#0a0a0a', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}>J'ai compris</button>
      </div>
    )
  }

  const estParent = role === 'parent'
  return (
    <div style={carte}>
      <button onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 36, textAlign: 'left' }}>
        <span style={{ color: colors.text.primary, fontSize: 14, fontWeight: 800 }}>{estParent ? 'Les évaluations de votre enfant' : 'Tes évaluations, qui les voit ?'}</span>
        <span style={{ color: colors.text.faint, fontSize: 18 }}>{ouvert ? '−' : '+'}</span>
      </button>
      {ouvert && (estParent ? (
        <div style={{ marginTop: 8 }}>
          <p style={txt}>Les éducateurs du club suivent la progression de votre enfant avec des critères notés de 1 à 3, des tests de performance sportive et des objectifs. Vous voyez ce que votre enfant voit : les évaluations terminées et rendues visibles par l'éducateur, en lecture seule.</p>
          <p style={txt}>Le club est responsable de ces fiches. Elles ne contiennent aucune donnée de santé et ne sont transmises à aucun autre club, recruteur ou sponsor. Elles sont conservées pendant la présence de votre enfant au club, puis pendant un nombre de saisons fixé par le club, puis supprimées.</p>
          <p style={{ ...txt, margin: 0 }}>En tant que représentant légal, vous pouvez demander au club l'accès complet à ces données, leur correction ou leur effacement. Pour une erreur précise, utilisez « Demander une correction » sur l'évaluation. <a href="/confidentialite" style={{ color: colors.accent.blue }}>En savoir plus</a></p>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <p style={txt}>Ton éducateur suit ta progression avec des fiches : des critères notés de 1 à 3 (Non acquis, En cours, Acquis), des tests chiffrés et des objectifs.</p>
          <ul style={{ ...txt, paddingLeft: 18 }}>
            <li>Tu vois une évaluation quand ton éducateur l'a terminée et rendue visible.</li>
            <li>Les parents que tu as invités voient la même chose que toi.</li>
            <li>Dans ton club, seuls ton éducateur et le staff sportif autorisé y ont accès. Un autre club, un recruteur ou un sponsor n'y a jamais accès.</li>
            <li>Tes fiches sont gardées pendant que tu es au club, puis pendant un nombre de saisons fixé par ton club après ton départ, puis supprimées.</li>
          </ul>
          <p style={{ ...txt, margin: 0 }}>Une erreur ? Appuie sur « Demander une correction ». Pour toute autre question sur tes données, parles-en à ton club. <a href="/confidentialite" style={{ color: colors.accent.blue }}>En savoir plus</a></p>
        </div>
      ))}
    </div>
  )
}

// Bouton « Demander une correction » + fenêtre + suivi des demandes déjà envoyées.
// cible : { evaluation_id } ou { ancienne_fiche_id }
export function DemandeCorrection({ cible, role = 'joueur', libelle = '' }) {
  const colors = useColors()
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [etat, setEtat] = useState('') // '' | envoi | ok
  const [erreur, setErreur] = useState('')
  const [demandes, setDemandes] = useState([])
  const cle = cible.evaluation_id ? ['evaluation_id', cible.evaluation_id] : ['ancienne_fiche_id', cible.ancienne_fiche_id]
  const parent = role === 'parent'

  const charger = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser()
    const { data } = await supabase.from('demandes_correction_evaluation').select('id, message, statut, reponse, echeance, created_at')
      .eq(cle[0], cle[1]).eq('demandeur_id', u?.user?.id || '').order('created_at', { ascending: false })
    setDemandes(data || [])
  }, [cle[0], cle[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { charger() }, [charger])

  const envoyer = async () => {
    setEtat('envoi'); setErreur('')
    const { error } = await supabase.from('demandes_correction_evaluation').insert({ [cle[0]]: cle[1], message: texte.trim() })
    if (error) {
      setEtat('')
      const m = error.message || ''
      setErreur(m.includes('trois demandes') ? 'Trois demandes sont déjà en attente pour cette évaluation. Attends la réponse du club.' : m.includes('non visible') ? "Cette évaluation n'est pas encore visible : tu ne peux pas demander de correction." : "La demande n'a pas été envoyée. Réessaie, ou parles-en à ton club.")
      return
    }
    setEtat('ok'); setTexte(''); charger()
  }

  const fermer = () => { setOuvert(false); setEtat(''); setErreur('') }
  const pending = demandes.filter(d => d.statut === 'recue').length

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOuvert(true)}
        style={{ padding: '8px 14px', minHeight: 40, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Barlow, sans-serif', background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}` }}>
        Demander une correction{pending ? ` (${pending} en attente)` : ''}
      </button>
      {demandes.map(d => (
        <div key={d.id} style={{ marginTop: 8, fontSize: 12, color: colors.text.faint, lineHeight: 1.5 }}>
          Demande du {dateFr(d.created_at)} : <strong style={{ color: d.statut === 'recue' ? colors.accent.amber : colors.accent.green }}>{d.statut === 'recue' ? `en attente, réponse avant le ${dateFr(d.echeance)}` : d.statut === 'traitee' ? 'traitée' : 'refusée'}</strong>
          {d.reponse && <span> · Réponse du club : {d.reponse}</span>}
        </div>
      ))}
      {ouvert && (
        <div onClick={fermer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Demander une correction"
            style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
            <h3 style={{ margin: '0 0 6px', color: colors.text.primary, fontSize: 16, fontWeight: 800 }}>Demander une correction</h3>
            {etat === 'ok' ? (
              <>
                <p style={{ color: colors.text.secondary, fontSize: 13, lineHeight: 1.5 }}>{parent ? 'Demande envoyée. Le club doit vous répondre dans un délai d\'un mois.' : 'Demande envoyée. Ton club doit te répondre dans un délai d\'un mois.'}</p>
                <button onClick={fermer} style={{ padding: '10px 18px', minHeight: 44, borderRadius: 8, border: 'none', background: colors.accent.blue, color: colors.accent.onBrand || '#0a0a0a', fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}>Fermer</button>
              </>
            ) : (
              <>
                <p style={{ color: colors.text.secondary, fontSize: 13, lineHeight: 1.5, margin: '0 0 10px' }}>
                  {parent ? 'Expliquez ce qui vous semble faux sur cette évaluation de votre enfant.' : 'Explique ce qui te semble faux sur cette évaluation.'} {parent ? 'L\'éducateur et le club recevront' : 'Ton éducateur et ton club recevront'} {parent ? 'votre' : 'ta'} demande.{libelle ? ` (${libelle})` : ''}
                </p>
                <label style={{ display: 'block', color: colors.text.faint, fontSize: 12, marginBottom: 4 }}>Ce qui est faux, et ce qui serait juste (500 caractères au plus)</label>
                <textarea rows={5} maxLength={500} value={texte} onChange={e => setTexte(e.target.value)} aria-label="Ce qui est faux"
                  style={{ width: '100%', boxSizing: 'border-box', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 10, color: colors.text.primary, fontSize: 14, fontFamily: 'Barlow, sans-serif', resize: 'vertical' }} />
                <div style={{ color: colors.text.ghost, fontSize: 11, textAlign: 'right' }}>{texte.length}/500</div>
                {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 13, margin: '6px 0' }}>{erreur}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={envoyer} disabled={!texte.trim() || etat === 'envoi'}
                    style={{ padding: '10px 18px', minHeight: 44, borderRadius: 8, border: 'none', fontWeight: 800, fontFamily: 'Barlow, sans-serif', cursor: texte.trim() ? 'pointer' : 'not-allowed', background: texte.trim() ? colors.accent.blue : colors.background.raised, color: texte.trim() ? (colors.accent.onBrand || '#0a0a0a') : colors.text.faint }}>
                    Envoyer la demande
                  </button>
                  <button onClick={fermer} style={{ padding: '10px 18px', minHeight: 44, borderRadius: 8, background: 'transparent', color: colors.text.secondary, border: `1px solid ${colors.border.default}`, cursor: 'pointer', fontFamily: 'Barlow, sans-serif' }}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Télécharge un fichier JSON : ce que la personne voit déjà à l'écran (évaluations terminées et visibles).
export function telechargerEvaluations({ evals, criteres, res }) {
  const visibles = evals.filter(e => e.visible_joueur && e.statut === 'terminee')
  const sortie = {
    export_le: new Date().toISOString(),
    note: "Évaluations, tests et auto-évaluations visibles. Les notes de travail de l'éducateur ne figurent pas ici : pour les recevoir, fais la demande d'accès à ton club.",
    evaluations: visibles.map(e => {
      const crits = criteres.filter(c => c.version_id === e.version_id)
      return {
        date: e.date_evaluation, type: e.nature, numero: e.numero ?? null, commentaire: e.commentaire || '',
        objectif_personnel: e.objectif_personnel || '', objectif_collectif: e.objectif_collectif || '',
        criteres: crits.map(c => {
          const r = res[e.id] || {}
          const edu = r[`educateur:${c.id}`], moi = r[`joueur:${c.id}`]
          return { pilier: c.pilier || null, critere: c.libelle, type: c.type, unite: c.unite || null,
            educateur: edu ? { note: edu.note ?? null, valeur: edu.valeur ?? null, oui_non: edu.oui_non ?? null } : null,
            auto_evaluation: moi ? { note: moi.note ?? null, valeur: moi.valeur ?? null } : null }
        }).filter(c => c.educateur || c.auto_evaluation),
      }
    }),
  }
  const blob = new Blob([JSON.stringify(sortie, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mes-evaluations-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return visibles.length
}
