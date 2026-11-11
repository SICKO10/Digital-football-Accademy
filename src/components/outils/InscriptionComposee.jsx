import { useState } from 'react'
import { supabase } from '../../supabase'
import { colors, alpha } from '../../tokens'
import { emailDejaUtilise } from '../../lib/inscription'
import { appelerOutils, payerOutils } from '../../lib/outilsApi'
import ComposerOffre from './ComposerOffre'

// Inscription éducateur ou club avec composition de l'offre (bloc 11), derrière
// l'adresse cachée `/register?composer=1` jusqu'à la bascule. Deux étapes :
// 1. ComposerOffre : trois questions, outils, total ;
// 2. le compte : création, passage au nouveau modèle (action serveur `composer`),
//    puis paiement chez Stripe ou dashboard gratuit.
// Les profils joueur et recruteur gardent l'inscription habituelle.
const police = 'Inter, sans-serif'
const parPeriode = (periodicite) => (periodicite === 'annuel' ? 'par an' : 'par mois')

export default function InscriptionComposee({ navigate, redirectApres, refParrainId }) {
  const [composition, setComposition] = useState(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [nomClub, setNomClub] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dispos, setDispos] = useState('')
  const [rgpd, setRgpd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  // Compte déjà créé : « Réessayer » reprend après la création, sans recréer le compte.
  const [compteCree, setCompteCree] = useState(false)
  const [echecPaiement, setEchecPaiement] = useState(false)

  const champ = { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 10, color: colors.text.primary, padding: '0 14px', height: 48, fontSize: 14, fontFamily: police, outline: 'none', boxSizing: 'border-box' }
  const etiquette = { display: 'block', fontSize: 12, color: colors.text.faint, marginBottom: 6, fontWeight: 600 }
  const lien = { color: colors.accent.green, textDecoration: 'underline' }

  const coque = (contenu) => (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: police, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <p style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.5px', margin: '0 0 24px', textAlign: 'center' }}>
          <span style={{ color: colors.accent.green }}>Digital</span>Football
        </p>
        <div style={{ background: colors.background.surface, borderRadius: 16, padding: '28px 20px', boxSizing: 'border-box' }}>{contenu}</div>
        <p style={{ textAlign: 'center', fontSize: 13, color: colors.text.disabled, margin: '20px 0 0', lineHeight: 1.8 }}>
          Tu es joueur ou recruteur ?{' '}
          <button type="button" onClick={() => navigate('/register')} style={{ ...lien, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: police, fontSize: 13, padding: 0 }}>Inscription habituelle</button>
          <br />
          Déjà un compte ?{' '}
          <button type="button" onClick={() => navigate('/login')} style={{ ...lien, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: police, fontSize: 13, padding: 0 }}>Se connecter</button>
        </p>
      </div>
    </div>
  )

  if (!composition) return coque(<ComposerOffre onContinuer={setComposition} />)

  const { role, gratuit, periodicite, total } = composition
  const club = role === 'club'

  const creer = async () => {
    if (!rgpd) return
    if (!prenom.trim() || !email.trim() || !password.trim() || (club && (!nom.trim() || !nomClub.trim()))) {
      setErreur(club ? 'Tous les champs sont obligatoires.' : 'Le prénom, l\'email et le mot de passe sont obligatoires.')
      return
    }
    if (password.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }
    setLoading(true)
    setErreur('')
    setEchecPaiement(false)
    try {
      if (!compteCree) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { prenom: prenom.trim(), nom: nom.trim(), plan: role } } })
        if (emailDejaUtilise(error, data)) {
          setErreur('Un compte existe déjà avec cette adresse email. Connecte-toi pour y accéder.')
          setLoading(false)
          return
        }
        if (error) { setErreur(error.message); setLoading(false); return }
        const userId = data.user?.id
        if (userId) {
          const { error: profilErr } = await supabase.from('profiles').upsert({
            id: userId, prenom: prenom.trim(), nom: nom.trim(), email: email.trim().toLowerCase(), plan: role,
            abonnement_actif: false,
            ...(club ? { club: nomClub.trim() } : {}),
            ...(refParrainId ? { parrain_id: refParrainId } : {}),
          })
          if (profilErr) console.error('Erreur création profil (le trigger auto devrait prendre le relais):', profilErr)
        }
        setCompteCree(true)
        // Demande de rendez-vous de démarrage du club : facultative, ne bloque jamais l'inscription.
        if (club && dispos.trim()) {
          const { error: demandeErr } = await supabase.from('demandes_club').insert({
            prenom: prenom.trim(), nom: nom.trim(), email: email.trim().toLowerCase(), nom_club: nomClub.trim(),
            type: 'demarrage', statut: 'nouveau', message: `Disponibilités pour le démarrage :\n${dispos.trim()}`,
          })
          if (demandeErr) console.error('Erreur enregistrement disponibilités démarrage:', demandeErr)
        }
      }

      // signUp() ne garantit pas de session active : connexion explicite, nécessaire aux appels serveur.
      const { error: sessionErr } = await supabase.auth.signInWithPassword({ email, password })
      if (sessionErr) {
        setErreur('Ton compte est créé, mais il faut d\'abord confirmer ton adresse email (regarde ta boîte de réception). Connecte-toi ensuite : si tes outils ne sont pas là, écris-nous.')
        setLoading(false)
        return
      }
      await appelerOutils('composer', { outils: club ? composition.outils : [] })
    } catch (e) {
      setErreur(e.message || 'Erreur, réessaie dans un instant')
      setLoading(false)
      return
    }

    if (!club && gratuit) {
      navigate(redirectApres || '/dashboard')
      return
    }
    try {
      await payerOutils(club ? { palier: composition.palier, periodicite } : { outils: composition.outils, periodicite })
    } catch (e) {
      // Le compte et ses réglages sont prêts : il reste à payer depuis le dashboard.
      setErreur(`${e.message}. Ton compte est créé : tu pourras payer depuis ton dashboard.`)
      setEchecPaiement(true)
      setLoading(false)
    }
  }

  const libelleBouton = loading ? 'Création du compte...'
    : echecPaiement ? 'Réessayer le paiement'
      : compteCree ? 'Réessayer'
        : !club && gratuit ? 'Créer mon compte gratuit'
          : `Créer mon compte et payer ${total} € ${parPeriode(periodicite)}`

  const resume = club ? `Club, jusqu'à ${composition.nbEquipes} ${composition.nbEquipes > 1 ? 'équipes' : 'équipe'}`
    : gratuit ? 'Éducateur, socle gratuit'
      : `Éducateur, ${composition.outils.length} ${composition.outils.length > 1 ? 'outils' : 'outil'}`

  return coque(
    <>
      <button type="button" onClick={() => setComposition(null)} disabled={compteCree} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: colors.text.faint, cursor: compteCree ? 'default' : 'pointer', fontSize: 12, fontFamily: police, fontWeight: 600, padding: 0, marginBottom: 18, opacity: compteCree ? 0.4 : 1 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Modifier mon offre
      </button>

      <div style={{ background: colors.accent.green + alpha.subtle, border: `1px solid ${colors.accent.green}30`, borderRadius: 12, padding: '12px 14px', marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: colors.accent.green }}>{resume}</p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: colors.text.secondary }}>
          {!club && gratuit ? '0 €, sans engagement' : `${total} € ${parPeriode(periodicite)}`}
        </p>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800 }}>Crée ton compte</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label htmlFor="ic-prenom" style={etiquette}>Prénom *</label>
            <input id="ic-prenom" autoComplete="given-name" value={prenom} onChange={e => setPrenom(e.target.value)} disabled={compteCree} style={champ} />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label htmlFor="ic-nom" style={etiquette}>{club ? 'Nom *' : 'Nom'}</label>
            <input id="ic-nom" autoComplete="family-name" value={nom} onChange={e => setNom(e.target.value)} disabled={compteCree} style={champ} />
          </div>
        </div>
        {club && (
          <div>
            <label htmlFor="ic-club" style={etiquette}>Nom du club *</label>
            <input id="ic-club" value={nomClub} onChange={e => setNomClub(e.target.value)} disabled={compteCree} style={champ} />
          </div>
        )}
        <div>
          <label htmlFor="ic-email" style={etiquette}>Email *</label>
          <input id="ic-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={compteCree} style={champ} />
        </div>
        <div>
          <label htmlFor="ic-mdp" style={etiquette}>Mot de passe * (6 caractères minimum)</label>
          <input id="ic-mdp" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={compteCree} style={champ} />
        </div>
        {club && (
          <div>
            <label htmlFor="ic-dispos" style={etiquette}>Tes disponibilités pour le rendez-vous de démarrage (facultatif)</label>
            <input id="ic-dispos" placeholder="Ex. lundi 14h à 16h" value={dispos} onChange={e => setDispos(e.target.value)} disabled={compteCree} style={champ} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18 }}>
        <input type="checkbox" id="ic-rgpd" checked={rgpd} onChange={e => setRgpd(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: colors.accent.green, cursor: 'pointer', flexShrink: 0 }} />
        <label htmlFor="ic-rgpd" style={{ fontSize: 12, color: colors.text.faint, lineHeight: 1.6, cursor: 'pointer' }}>
          J'accepte les <a href="/cgu" target="_blank" rel="noreferrer" style={lien}>Conditions Générales d'Utilisation</a>
          {(club || !gratuit) && <>, les <a href="/cgv" target="_blank" rel="noreferrer" style={lien}>Conditions Générales de Vente</a></>}
          {' '}et la <a href="/confidentialite" target="_blank" rel="noreferrer" style={lien}>Politique de Confidentialité</a>. Mes données sont traitées conformément au RGPD.
        </label>
      </div>

      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 13, lineHeight: 1.5, margin: '14px 0 0', textAlign: 'center' }}>{erreur}</p>}

      <button type="button" onClick={creer} disabled={loading || !rgpd} style={{
        width: '100%', minHeight: 52, marginTop: 18, border: 'none', borderRadius: 12, fontFamily: police, fontSize: 15, fontWeight: 800,
        background: colors.accent.green, color: colors.black, cursor: loading || !rgpd ? 'not-allowed' : 'pointer', opacity: loading || !rgpd ? 0.5 : 1,
      }}>{libelleBouton}</button>

      {(echecPaiement || (compteCree && erreur)) && (
        <button type="button" onClick={() => navigate(redirectApres || '/dashboard')} style={{ width: '100%', minHeight: 44, marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: police, fontSize: 13, fontWeight: 700, color: colors.text.secondary, textDecoration: 'underline' }}>
          Aller à mon dashboard
        </button>
      )}
    </>,
  )
}
