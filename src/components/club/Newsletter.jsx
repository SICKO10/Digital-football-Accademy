import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { police } from '../../tokens'
import { fetchToutesLignes } from '../../lib/supabasePagination'
import { styleCarte, styleCarteLiseree, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, styleEtiquette, styleChiffreHeros, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP } from '../../lib/identite'
import { TitreEcran, Etiquette, Jauge, Icone, EtiquetteStatut } from '../identite'
import { Trash2 } from 'lucide-react'

const CIBLES = [
  { val: 'tous', label: 'Tout le monde' },
  { val: 'educateurs', label: 'Éducateurs' },
  { val: 'joueurs', label: 'Joueurs' },
]

// Newsletter du club (annonces_club) — un clic sur "Envoyer" publie la
// communication en interne ET déclenche l'email groupé (edge function
// send-newsletter) au groupe ciblé, systématiquement. Destinataires calculés
// depuis club_educateurs (éducateurs affiliés) et affiliations (joueurs
// affiliés à ces éducateurs) — il n'existe pas de colonne profiles.role, le
// rattachement au club passe toujours par ces deux tables (cf.
// DashboardClub.jsx pour le même schéma).
export default function Newsletter({ clubId, auteurNom, auteurId, readOnly }) {
  const colors = useColors()
  const [annonces, setAnnonces] = useState([])
  const [lusParAnnonce, setLusParAnnonce] = useState({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ titre: '', contenu: '', cible: 'tous' })
  const [envoi, setEnvoi] = useState(false)
  const [compteurs, setCompteurs] = useState({ tous: 0, educateurs: 0, joueurs: 0 })

  useEffect(() => { chargerAnnonces() }, [clubId])
  useEffect(() => { chargerCompteurs() }, [clubId])

  // Comptage seul (pas d'email) — mêmes tables que recupererDestinataires,
  // sans le fetch profiles (inutile juste pour afficher un nombre).
  const chargerCompteurs = async () => {
    if (!clubId) return
    const { data: educRows } = await supabase.from('club_educateurs').select('educateur_id').eq('club_id', clubId).eq('statut', 'accepte')
    const educateurIds = [...new Set((educRows || []).map(r => r.educateur_id).filter(Boolean))]
    let joueurIds = []
    if (educateurIds.length > 0) {
      const { data: affRows } = await fetchToutesLignes(() => supabase.from('affiliations').select('id, joueur_id').in('educateur_id', educateurIds).eq('statut', 'accepte').order('id'))
      joueurIds = [...new Set((affRows || []).map(r => r.joueur_id).filter(Boolean))]
    }
    setCompteurs({ tous: educateurIds.length + joueurIds.length, educateurs: educateurIds.length, joueurs: joueurIds.length })
  }

  const chargerAnnonces = async () => {
    if (!clubId) return
    setLoading(true)
    const { data } = await supabase.from('annonces_club').select('*').eq('club_id', clubId).order('created_at', { ascending: false })
    setAnnonces(data || [])
    const ids = (data || []).map(a => a.id)
    if (ids.length > 0) {
      const { data: lues } = await supabase.from('annonces_lues').select('annonce_id').in('annonce_id', ids)
      const compte = {}
      ;(lues || []).forEach(l => { compte[l.annonce_id] = (compte[l.annonce_id] || 0) + 1 })
      setLusParAnnonce(compte)
    } else {
      setLusParAnnonce({})
    }
    setLoading(false)
  }

  const envoyer = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) return
    setEnvoi(true)
    try {
      const { data: annonce, error } = await supabase.from('annonces_club').insert({
        club_id: clubId,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        auteur_nom: auteurNom,
        auteur_id: auteurId,
        cible: form.cible,
      }).select().single()
      if (error) throw error

      // Destinataires calculés par la fonction à partir du groupe ciblé
      // (le navigateur ne peut plus lire l'email des autres comptes).
      await supabase.functions.invoke('send-newsletter', {
        body: { annonce_id: annonce.id, club_id: clubId, titre: annonce.titre, contenu: annonce.contenu, cible: form.cible },
      })

      setForm({ titre: '', contenu: '', cible: 'tous' })
      await chargerAnnonces()
    } catch (e) {
      console.error('Erreur envoi newsletter:', e)
      alert("L'envoi a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette communication ?')) return
    await supabase.from('annonces_club').delete().eq('id', id)
    setAnnonces(prev => prev.filter(a => a.id !== id))
  }

  const cibleLabel = (val) => CIBLES.find(c => c.val === val)?.label || val

  // Mise en forme : kit d'identité (bloc 11), aucun changement de comportement.
  const carte = { ...styleCarte(colors), padding: '18px 20px' }
  const champ = styleChamp(colors)
  const nbPersonnes = compteurs[form.cible]
  const peutEnvoyer = form.titre.trim() && form.contenu.trim() && !envoi
  const totalLus = Object.values(lusParAnnonce).reduce((s, v) => s + v, 0)
  const stat = (valeur, libelle) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={styleChiffreHeros(colors, 32)}>{valeur}</div>
      <Etiquette as="div" style={{ marginTop: '6px', fontSize: '11px' }}>{libelle}</Etiquette>
    </div>
  )

  return (
    <div>
      <TitreEcran titre="Newsletter" sousTitre="Communications envoyées aux membres affiliés du club, dans l'app et par email." />

      {!readOnly && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={{ ...carte, flex: '1.4 1 360px' }}>
            <Etiquette as="p" style={{ margin: '0 0 16px' }}>Nouvelle communication</Etiquette>

            <div role="group" aria-label="Envoyer à" style={{ marginBottom: '16px' }}>
              <Etiquette as="div" style={{ marginBottom: '8px' }}>Envoyer à</Etiquette>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CIBLES.map(c => {
                  const actif = form.cible === c.val
                  return (
                    <button key={c.val} type="button" aria-pressed={actif} onClick={() => setForm(f => ({ ...f, cible: c.val }))} className={CLASSE_BOUTON_SECONDAIRE}
                      style={actif
                        ? { ...styleBoutonPrincipal(colors), minHeight: '36px', padding: '0 14px', fontSize: '13px', borderRadius: '6px' }
                        : { ...styleBoutonSecondaire(colors), minHeight: '36px', padding: '0 14px', fontSize: '13px', borderRadius: '6px' }}>
                      {c.label}
                      <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}>{compteurs[c.val]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <label htmlFor="newsletter-titre" style={{ ...styleEtiquette(colors), display: 'block', marginBottom: '6px' }}>Objet / Titre</label>
            <input id="newsletter-titre" className={CLASSE_CHAMP} value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Objet / Titre" style={{ ...champ, marginBottom: '12px' }} />

            <label htmlFor="newsletter-contenu" style={{ ...styleEtiquette(colors), display: 'block', marginBottom: '6px' }}>Message</label>
            <textarea id="newsletter-contenu" className={CLASSE_CHAMP} value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
              placeholder="Contenu du message..." rows={6}
              style={{ ...champ, resize: 'vertical', marginBottom: '16px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary }}>Sera envoyée à <strong style={{ color: colors.text.primary }}>{nbPersonnes}</strong> personne{nbPersonnes > 1 ? 's' : ''}, aussi par email.</span>
              <button type="button" onClick={envoyer} disabled={!peutEnvoyer} className={CLASSE_BOUTON}
                style={{ ...styleBoutonPrincipal(colors), cursor: envoi ? 'default' : 'pointer' }}>
                {envoi ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>

          <div style={{ flex: '0.8 1 240px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', minWidth: 0 }}>
            <div style={carte}>
              <Etiquette as="p" style={{ margin: '0 0 14px' }}>Statistiques</Etiquette>
              <div style={{ display: 'flex', gap: '12px' }}>
                {stat(annonces.length, 'Envois')}
                {stat(totalLus, 'Lus')}
                {stat(compteurs.tous, 'Membres')}
              </div>
            </div>

            {annonces.length > 0 && (() => {
              // Taux de lecture moyen : lectures / destinataires estimés (compteur
              // actuel de la cible, faute d'historique du nombre de destinataires).
              const taux = Math.round(annonces.reduce((acc, a) => acc + Math.min(1, (lusParAnnonce[a.id] || 0) / Math.max(1, compteurs[a.cible] || 1)), 0) / annonces.length * 100)
              return (
                <div style={carte}>
                  <Jauge libelle="Taux de lecture moyen" pourcentages
                    segments={[{ libelle: 'Lus', valeur: taux }, { libelle: 'Non lus', valeur: 100 - taux }]} />
                </div>
              )
            })()}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
          <Etiquette as="h2">Historique des envois</Etiquette>
          <span style={{ fontFamily: police.texte, color: colors.text.dim, fontSize: '13px' }}>{annonces.length} message{annonces.length > 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <p style={{ color: colors.text.dim, fontSize: '14px' }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {annonces.map(a => {
              const nbLus = lusParAnnonce[a.id] || 0
              return (
                <div key={a.id} style={{ ...styleCarteLiseree(colors), padding: '14px 18px 14px 21px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontFamily: police.texte, color: colors.text.primary, fontWeight: 600, fontSize: '16px' }}>{a.titre}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                      <EtiquetteStatut couleur={colors.text.dim}>{cibleLabel(a.cible)}</EtiquetteStatut>
                      {a.envoye_email && <EtiquetteStatut couleur={colors.accent.info}>Email envoyé</EtiquetteStatut>}
                      <EtiquetteStatut couleur={nbLus > 0 ? colors.accent.success : colors.text.dim}>{nbLus} lu{nbLus > 1 ? 's' : ''}</EtiquetteStatut>
                      <span style={{ fontFamily: police.texte, color: colors.text.dim, fontSize: '13px' }}>
                        {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {!readOnly && (
                        <button type="button" onClick={() => supprimer(a.id)} className={CLASSE_BOUTON_SECONDAIRE}
                          style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', minWidth: '36px', padding: 0, border: '1px solid transparent', color: colors.text.dim }}>
                          <Icone icone={Trash2} seule libelle={`Supprimer la communication « ${a.titre} »`} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontFamily: police.texte, color: colors.text.secondary, fontSize: '14px', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{a.contenu}</p>
                </div>
              )
            })}
            {annonces.length === 0 && (
              <div style={{ ...styleCarte(colors), borderStyle: 'dashed', color: colors.text.dim, fontSize: '14px', textAlign: 'center', padding: '32px' }}>Aucune communication envoyée pour l'instant.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
