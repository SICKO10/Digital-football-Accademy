import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { CSS_STAGE_PUBLIC, useStagePublic } from '../lib/stagesPublic'
import EcranEtatStage from '../components/stages/EcranEtatStage'
import { formatDate, formatJourCourt, euros, detailOffre, montantEstime, MODES_PAIEMENT } from '../lib/stages'
import { telechargerAutorisationParentale } from '../lib/stagesPdf'

// Inscription publique à un stage (sans compte), en 3 étapes + confirmation.
// L'enregistrement passe par inscrire_stage() (supabase_stages_etape2.sql),
// qui revérifie tout côté serveur (stage ouvert, offre, jours, places) et
// calcule le montant dû : le montant affiché ici n'est qu'indicatif.

const ETAPES = ['Formule', 'Le joueur', 'Contact et santé']
const CONTACT_VIDE = { email_parent: '', tel_parent: '' }
const JOUEUR_VIDE = { prenom: '', nom: '', date_naissance: '', club_appartenance: '', allergies: '', medicaments: '', notes_medicales: '' }

export default function StageInscription() {
  const { lien } = useParams()
  const { stage, etat } = useStagePublic(lien)
  const [etape, setEtape] = useState(0)
  const [offreId, setOffreId] = useState('')
  const [jours, setJours] = useState([])
  const [formuleId, setFormuleId] = useState('')
  const [joueur, setJoueur] = useState(JOUEUR_VIDE)
  const [contact, setContact] = useState(CONTACT_VIDE)
  const [reglementAccepte, setReglementAccepte] = useState(false)
  const [consentementSante, setConsentementSante] = useState(false)
  const [voirReglement, setVoirReglement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  if (etat !== 'ok') return <EcranEtatStage etat={etat} />

  const accent = stage.club_couleur || '#4ade80'
  const joursStage = stage.jours || []
  const offres = stage.offres || []
  const formules = stage.formules_repas || []
  const offre = offres.find(o => o.id === offreId)
  const formule = formules.find(f => f.id === formuleId)
  const tousLesJours = offre?.type === 'forfait' && !offre.nb_jours
  const joursEffectifs = tousLesJours ? joursStage.map(j => j.date) : jours
  const montant = montantEstime(offre, formule, joursEffectifs.length)

  const st = {
    carte: { background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: '20px 22px', marginTop: 16 },
    label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#aaa', margin: '0 0 6px' },
    input: { width: '100%', background: '#0a0a0a', border: '1px solid #262626', borderRadius: 10, color: '#fff', padding: '11px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    choix: (actif) => ({ display: 'block', width: '100%', textAlign: 'left', background: actif ? accent + '18' : '#0a0a0a', border: `1px solid ${actif ? accent : '#262626'}`, borderRadius: 12, padding: '12px 14px', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: 8 }),
    boutonPlein: { padding: '13px 26px', borderRadius: 12, border: 'none', background: accent, color: '#0a0a0a', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
    boutonDiscret: { padding: '13px 20px', borderRadius: 12, border: '1px solid #262626', background: 'transparent', color: '#aaa', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  }

  if (stage.statut !== 'ouvert' && !confirmation) {
    return (
      <Cadre accent={accent} stage={stage}>
        <div style={st.carte}>
          <p style={{ margin: 0, color: '#bbb' }}>{stage.statut === 'complet' ? 'Ce stage est complet.' : 'Les inscriptions ne sont pas ouvertes pour ce stage.'}</p>
          <Link to={`/stage/${lien}`} style={{ display: 'inline-block', marginTop: 12, color: accent }}>Retour à la page du stage</Link>
        </div>
      </Cadre>
    )
  }

  const choisirOffre = (o) => { setOffreId(o.id); setJours([]); setErreur('') }
  const basculerJour = (date) => {
    setErreur('')
    if (jours.includes(date)) return setJours(jours.filter(j => j !== date))
    if (offre?.type === 'forfait' && offre.nb_jours && jours.length >= offre.nb_jours) {
      return setErreur(`Cette offre comprend ${offre.nb_jours} jour(s) : retire un jour avant d'en choisir un autre.`)
    }
    setJours([...jours, date].sort())
  }

  const validerEtape = () => {
    if (etape === 0) {
      if (!offre) return 'Choisis une offre.'
      if (!tousLesJours && jours.length === 0) return 'Choisis au moins un jour.'
      if (offre.type === 'forfait' && offre.nb_jours && jours.length !== offre.nb_jours) return `Choisis exactement ${offre.nb_jours} jour(s).`
      if (joursStage.some(j => joursEffectifs.includes(j.date) && j.places_restantes <= 0)) return 'Un des jours choisis est complet.'
      if (formules.length > 0 && !formule) return 'Choisis une formule repas.'
    }
    if (etape === 1) {
      if (!joueur.prenom.trim() || !joueur.nom.trim()) return 'Indique le prénom et le nom du joueur.'
    }
    if (etape === 2) {
      if (!contact.email_parent.trim() || !contact.tel_parent.trim()) return 'Indique un e-mail et un téléphone pour te joindre.'
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email_parent.trim())) return 'Adresse e-mail invalide.'
      if (!reglementAccepte || !consentementSante) return 'Merci de cocher les deux cases pour valider l\'inscription.'
    }
    return null
  }

  const suivant = async () => {
    const message = validerEtape()
    if (message) return setErreur(message)
    setErreur('')
    if (etape < 2) return setEtape(etape + 1)
    setEnvoi(true)
    const { data, error } = await supabase.rpc('inscrire_stage', {
      p_lien: lien,
      p: {
        ...joueur, ...contact, offre_id: offreId, formule_repas_id: formuleId || null,
        jours: tousLesJours ? [] : jours, reglement_accepte: reglementAccepte, consentement_sante: consentementSante,
      },
    })
    setEnvoi(false)
    if (error) return setErreur(error.message || 'L\'inscription n\'a pas pu être enregistrée. Réessaie.')
    setConfirmation({ ...data, prenom: joueur.prenom.trim(), joueur: { ...joueur }, contact: { ...contact }, email: 'envoi' })
    // E-mail de confirmation : envoyé côté serveur à l'adresse enregistrée
    // (api/stage-confirmation.js). Un échec n'annule pas l'inscription.
    fetch('/api/stage-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lien, reference: data.reference }) })
      .then(r => r.ok ? r.json() : { envoye: false })
      .catch(() => ({ envoye: false }))
      .then(r => setConfirmation(c => c && c.reference === data.reference ? { ...c, email: r.envoye ? 'ok' : 'echec' } : c))
  }

  const inscrireUnAutre = () => {
    setJoueur(JOUEUR_VIDE)
    setOffreId(''); setJours([]); setFormuleId('')
    setReglementAccepte(false); setConsentementSante(false)
    setConfirmation(null); setEtape(0); setErreur('')
  }

  if (confirmation) {
    return (
      <Cadre accent={accent} stage={stage}>
        <div style={{ ...st.carte, borderColor: accent + '55' }}>
          <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 900 }}>Inscription enregistrée</p>
          <p style={{ margin: 0, color: '#bbb', fontSize: 14 }}>{confirmation.prenom} est inscrit(e). L'inscription sera définitive à réception du paiement par le club.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 16 }}>
            <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#777' }}>Référence</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>{confirmation.reference}</div>
            </div>
            <div style={{ background: '#0a0a0a', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#777' }}>Montant à régler</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{euros(confirmation.montant_du)}</div>
            </div>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: '#aaa', textTransform: 'capitalize' }}>{(confirmation.jours || []).map(j => formatJourCourt(j)).join(' · ')}</p>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: confirmation.email === 'echec' ? '#facc15' : '#888' }}>
            {confirmation.email === 'ok' ? `Un e-mail de confirmation a été envoyé à ${confirmation.contact.email_parent}.`
              : confirmation.email === 'echec' ? 'L\'e-mail de confirmation n\'a pas pu être envoyé : note bien ta référence.'
              : 'Envoi de l\'e-mail de confirmation…'}
          </p>
        </div>
        <div style={st.carte}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>Autorisation parentale</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#bbb' }}>Document pré-rempli à imprimer, signer et remettre au club le premier jour.</p>
          <button onClick={() => telechargerAutorisationParentale({
            stage: { nom: stage.nom, lieu: stage.lieu, date_debut: stage.date_debut, date_fin: stage.date_fin, club_nom: stage.club_nom },
            enfant: confirmation.joueur, jours: confirmation.jours, contact: confirmation.contact,
            sante: confirmation.joueur, reference: confirmation.reference,
          })} style={st.boutonDiscret}>Télécharger l'autorisation (PDF)</button>
        </div>
        {Number(confirmation.montant_du) > 0 && (
          <div style={st.carte}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>Comment payer</p>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#ddd' }}>Paiement accepté par le club : {(stage.modes_paiement || []).map(m => MODES_PAIEMENT[m]).join(', ')}.</p>
            {stage.instructions_paiement && <p style={{ margin: 0, fontSize: 14, color: '#bbb', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{stage.instructions_paiement}</p>}
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#888' }}>Indique la référence <strong style={{ color: '#fff' }}>{confirmation.reference}</strong> avec ton paiement.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
          <button onClick={inscrireUnAutre} style={st.boutonDiscret}>Inscrire un autre enfant</button>
          <Link to={`/stage/${lien}`} style={{ ...st.boutonDiscret, textDecoration: 'none' }}>Retour à la page du stage</Link>
        </div>
      </Cadre>
    )
  }

  return (
    <Cadre accent={accent} stage={stage}>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {ETAPES.map((e, i) => (
          <div key={e} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 2, background: i <= etape ? accent : '#262626' }} />
            <div style={{ fontSize: 11, marginTop: 6, color: i === etape ? '#fff' : '#666', fontWeight: i === etape ? 700 : 400 }}>{e}</div>
          </div>
        ))}
      </div>

      {etape === 0 && (
        <>
          <div style={st.carte}>
            <span style={st.label}>Offre</span>
            {offres.map(o => (
              <button key={o.id} type="button" onClick={() => choisirOffre(o)} style={st.choix(offreId === o.id)}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.nom}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{detailOffre(o, joursStage.length)}</div>
              </button>
            ))}
          </div>

          {offre && (
            <div style={st.carte}>
              <span style={st.label}>
                {tousLesJours ? 'Jours inclus' : offre.type === 'forfait' ? `Choisis ${offre.nb_jours} jour(s) — ${jours.length}/${offre.nb_jours}` : 'Choisis les jours de présence'}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {joursStage.map(j => {
                  const complet = j.places_restantes <= 0
                  const actif = joursEffectifs.includes(j.date)
                  return (
                    <button key={j.date} type="button" disabled={tousLesJours || complet} onClick={() => basculerJour(j.date)} style={{
                      padding: '9px 12px', borderRadius: 10, fontSize: 13, fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
                      cursor: tousLesJours || complet ? 'default' : 'pointer',
                      background: actif ? accent + '22' : '#0a0a0a', border: `1px solid ${complet ? '#3a1f1f' : actif ? accent : '#262626'}`,
                      color: complet ? '#664' : actif ? accent : '#ccc',
                    }}>{formatJourCourt(j.date)}{complet ? ' · complet' : ''}</button>
                  )
                })}
              </div>
            </div>
          )}

          {formules.length > 0 && (
            <div style={st.carte}>
              <span style={st.label}>Repas du midi</span>
              {formules.map(f => (
                <button key={f.id} type="button" onClick={() => { setFormuleId(f.id); setErreur('') }} style={st.choix(formuleId === f.id)}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{f.nom}</div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{Number(f.prix_jour) > 0 ? `${euros(f.prix_jour)} par jour` : 'Sans supplément'}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {etape === 1 && (
        <div style={st.carte}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div><label style={st.label}>Prénom du joueur *</label><input value={joueur.prenom} onChange={e => setJoueur(p => ({ ...p, prenom: e.target.value }))} style={st.input} autoComplete="off" /></div>
            <div><label style={st.label}>Nom *</label><input value={joueur.nom} onChange={e => setJoueur(p => ({ ...p, nom: e.target.value }))} style={st.input} autoComplete="off" /></div>
            <div><label style={st.label}>Date de naissance</label><input type="date" value={joueur.date_naissance} onChange={e => setJoueur(p => ({ ...p, date_naissance: e.target.value }))} style={st.input} /></div>
            <div><label style={st.label}>Club actuel (si autre club)</label><input value={joueur.club_appartenance} onChange={e => setJoueur(p => ({ ...p, club_appartenance: e.target.value }))} style={st.input} /></div>
          </div>
        </div>
      )}

      {etape === 2 && (
        <>
          <div style={st.carte}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div><label style={st.label}>E-mail du parent *</label><input type="email" value={contact.email_parent} onChange={e => setContact(p => ({ ...p, email_parent: e.target.value }))} style={st.input} autoComplete="email" /></div>
              <div><label style={st.label}>Téléphone (urgence) *</label><input type="tel" value={contact.tel_parent} onChange={e => setContact(p => ({ ...p, tel_parent: e.target.value }))} style={st.input} autoComplete="tel" /></div>
            </div>
          </div>
          <div style={st.carte}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>Ces informations sont transmises uniquement à l'équipe d'encadrement du stage.</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={st.label}>Allergies</label><input value={joueur.allergies} onChange={e => setJoueur(p => ({ ...p, allergies: e.target.value }))} style={st.input} placeholder="Aucune" /></div>
              <div><label style={st.label}>Médicaments</label><input value={joueur.medicaments} onChange={e => setJoueur(p => ({ ...p, medicaments: e.target.value }))} style={st.input} placeholder="Aucun" /></div>
              <div><label style={st.label}>Autres informations médicales (PAI, asthme…)</label><textarea rows={3} value={joueur.notes_medicales} onChange={e => setJoueur(p => ({ ...p, notes_medicales: e.target.value }))} style={{ ...st.input, resize: 'vertical' }} /></div>
            </div>
          </div>
          <div style={st.carte}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#ddd', cursor: 'pointer' }}>
              <input type="checkbox" checked={reglementAccepte} onChange={e => setReglementAccepte(e.target.checked)} style={{ marginTop: 3 }} />
              <span>J'ai lu et j'accepte le règlement du stage.{stage.reglement && <> <button type="button" onClick={() => setVoirReglement(v => !v)} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>{voirReglement ? 'Masquer' : 'Lire le règlement'}</button></>}</span>
            </label>
            {voirReglement && stage.reglement && <p style={{ margin: '10px 0 0 26px', fontSize: 13, color: '#aaa', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{stage.reglement}</p>}
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#ddd', cursor: 'pointer', marginTop: 12 }}>
              <input type="checkbox" checked={consentementSante} onChange={e => setConsentementSante(e.target.checked)} style={{ marginTop: 3 }} />
              <span>J'accepte que les informations de santé saisies soient conservées par le club et consultées par l'équipe d'encadrement, uniquement pour la sécurité de mon enfant pendant le stage.</span>
            </label>
          </div>
        </>
      )}

      {offre && (
        <div style={{ ...st.carte, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#aaa' }}>{offre.nom}{formule ? ` · ${formule.nom}` : ''} · {joursEffectifs.length} jour(s)</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{euros(montant)}</span>
        </div>
      )}

      {erreur && <p style={{ color: '#f87171', fontSize: 14, margin: '14px 0 0' }}>{erreur}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {etape > 0 && <button onClick={() => { setEtape(etape - 1); setErreur('') }} style={st.boutonDiscret}>Retour</button>}
        <button onClick={suivant} disabled={envoi} style={{ ...st.boutonPlein, opacity: envoi ? 0.6 : 1 }}>
          {etape < 2 ? 'Continuer' : envoi ? 'Envoi…' : 'Valider l\'inscription'}
        </button>
      </div>
    </Cadre>
  )
}

function Cadre({ accent, stage, children }) {
  const { lien } = useParams()
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{CSS_STAGE_PUBLIC}</style>
      <div className="sp-page">
        <Link to={`/stage/${lien}`} style={{ color: '#888', fontSize: 13, textDecoration: 'none' }}>← {stage.nom}</Link>
        <h1 className="sp-titre" style={{ fontWeight: 900, lineHeight: 1.15, margin: '10px 0 4px' }}>Inscription</h1>
        <p style={{ margin: 0, color: '#999', fontSize: 14 }}>{stage.club_nom}{stage.date_debut ? ` · ${formatDate(stage.date_debut, { day: 'numeric', month: 'long' })} au ${formatDate(stage.date_fin, { day: 'numeric', month: 'long' })}` : ''}</p>
        <div style={{ height: 3, width: 48, background: accent, borderRadius: 2, marginTop: 14 }} />
        {children}
      </div>
    </div>
  )
}
