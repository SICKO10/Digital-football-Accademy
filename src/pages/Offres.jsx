import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { CONTACT_EMAIL, CALENDLY_URL } from '../lib/stripeLinks'
import { colors, alpha } from '../tokens'
import BandeauPromo from '../components/BandeauPromo'
import { HeroClub, SemaineClub, BesoinsClub, TarifsClub, BlocGuide, BlocContact, BoutonsContact } from '../components/offres/OffreClub'
import { ChoixUnivers, BandeauUnivers } from '../components/offres/Univers'
import { PHOTOS, POLICE_TITRE } from '../lib/photosOffres'
import { promoActive, prixPromo } from '../lib/promo'
import { IconCheck } from '../components/icones'
import { PALIERS_EDUCATEUR, outilsDuPack } from '../lib/catalogueOutils'

const st = {
  // Fond pleine largeur (alterné par section) + wrapper interne limité en largeur —
  // avant, les deux étaient fusionnés dans un seul style avec maxWidth, ce qui
  // empêchait un fond de section de s'étendre sur toute la largeur de l'écran.
  sectionOuter: (bg) => ({ background: bg, padding: '4rem 1.5rem' }),
  sectionInner: { maxWidth: '960px', margin: '0 auto' },
  eyebrow: { display: 'inline-block', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 },
  titre: { fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, marginBottom: '0.5rem' },
  sousTitre: { color: colors.text.dim, fontSize: '14px', marginBottom: '2.5rem', maxWidth: '560px' },
  card: (color, actif) => ({
    background: colors.background.surface, border: `${actif ? 2 : 1}px solid ${actif ? color : colors.border.faint}`,
    borderRadius: '16px', padding: '1.75rem', textAlign: 'left', display: 'flex', flexDirection: 'column',
  }),
  feature: { fontSize: '13px', color: colors.text.secondary, display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 },
  cta: (color, dark) => ({ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: color ? 'none' : '1px solid #333', background: color || 'transparent', color: dark ? colors.background.base : colors.text.primary, fontSize: '14px', fontWeight: 700, textAlign: 'center', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 'auto' }),
}

// Halo + badge "Recommandé" appliqués à la card annuelle mise en avant — la
// couleur suit celle de la section (vert joueur, bleu éducateur, orange
// recruteur) plutôt que d'être toujours verte.
const recommandeStyle = (color) => ({ position: 'relative', boxShadow: `0 0 40px ${color}${alpha.soft}`, transform: 'translateY(-4px)' })

function BadgeRecommande({ color }) {
  return (
    <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: color, color: colors.black, fontSize: '11px', fontWeight: 800, padding: '4px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      Recommandé
    </div>
  )
}

// Prix mensuel : barré + prix promo (1er mois) tant que la promo court.
function PrixMensuel({ prix }) {
  if (!promoActive()) return <>{prix}€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>/mois</span></>
  return (
    <>
      {prixPromo(prix)}€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}> le 1er mois</span>
      <span style={{ fontSize: '13px', color: colors.text.faint, textDecoration: 'line-through', fontWeight: 400, marginLeft: '10px' }}>{prix}€</span>
    </>
  )
}

function Feature({ children }) {
  return <div style={st.feature}><span style={{ color: colors.accent.green, flexShrink: 0, display: 'inline-flex', verticalAlign: 'middle' }}><IconCheck size={14} /></span> {children}</div>
}

// Offres éducateur : trois paliers (3 outils, 6 outils, tous les outils), prix et
// outils lus dans le catalogue. Une seule périodicité à la fois, pilotée par le
// toggle global de la page. Les boutons mènent à l'inscription par paliers.
function OffresEducateur({ color, cycle }) {
  const navigate = useNavigate()
  const isAnnuel = cycle === 'annuel'
  const nbOutils = outilsDuPack().length
  const detail = (p) => (p.max >= nbOutils ? `Les ${nbOutils} outils éducateur` : `Jusqu'à ${p.max} outils au choix parmi les ${nbOutils}`)
  const titre = (p) => (p.max >= nbOutils ? 'Tous les outils' : `${p.max} outils`)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', alignItems: 'stretch', maxWidth: '960px', margin: '0 auto' }}>
      {PALIERS_EDUCATEUR.map((p, i) => {
        const recommande = i === PALIERS_EDUCATEUR.length - 1
        const prix = isAnnuel ? p.prixAnnuel : p.prixMensuel
        const economie = p.prixMensuel * 12 - p.prixAnnuel
        return (
          <div key={p.id} style={{ ...st.card(color, recommande), ...(recommande ? recommandeStyle(color) : {}) }}>
            {recommande && <BadgeRecommande color={color} />}
            <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>{titre(p)}</h3>
            <p style={{ fontSize: '11px', color: isAnnuel ? color : colors.text.dim, fontWeight: 700, margin: '0 0 10px' }}>{isAnnuel ? 'ANNUEL' : 'MENSUEL'}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 0.25rem' }}>
              {prix}€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>{isAnnuel ? '/an' : '/mois'}</span>
            </p>
            <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 1.5rem', minHeight: '18px' }}>
              {isAnnuel ? `${economie} € de moins que 12 mensualités` : `${p.prixAnnuel} € par an en annuel`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
              <Feature>{detail(p)}</Feature>
              <Feature>Le socle gratuit reste inclus</Feature>
              <Feature>Sans engagement</Feature>
            </div>
            <button onClick={() => navigate('/register?composer=1')} style={st.cta(recommande ? color : null, recommande)}>
              Commencer à {prix}€{isAnnuel ? '/an' : '/mois'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Toggle global Mensuel/Annuel — pilote l'affichage de toutes les sections Pro
// (Joueur/Éducateur/Recruteur) en même temps.
function CycleToggle({ cycle, setCycle, libelle, badge = true, marge = '2.5rem' }) {
  const btnStyle = (actif) => ({
    background: actif ? colors.accent.green : 'transparent',
    color: actif ? colors.black : '#e4e4e7',
    border: 'none', borderRadius: '999px', padding: '12px 30px', minHeight: '46px', fontSize: '15px', fontWeight: 800,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '8px',
    boxShadow: actif ? '0 0 0 3px rgba(74,222,128,0.22)' : 'none', transition: 'background .15s, box-shadow .15s',
  })
  return (
    <div style={{ marginBottom: marge }}>
      {libelle && <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: colors.text.secondary }}>{libelle}</p>}
      <div role="radiogroup" aria-label="Rythme de paiement" style={{ display: 'inline-flex', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '999px', padding: '5px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)' }}>
        <button type="button" role="radio" aria-checked={cycle === 'mensuel'} onClick={() => setCycle('mensuel')} style={btnStyle(cycle === 'mensuel')}>Mensuel</button>
        <button type="button" role="radio" aria-checked={cycle === 'annuel'} onClick={() => setCycle('annuel')} style={btnStyle(cycle === 'annuel')}>
          Annuel
          {badge && cycle !== 'annuel' && (
            <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px' }}>
              2 mois offerts
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: '10px', color: colors.text.primary, padding: '11px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }

// Le choix du palier et le paiement sont désormais en libre-service
// (tableau de paliers plus haut, chaque prix renvoie directement vers
// /register?profil=club&palier=...&cycle=... — même route déjà utilisée par
// EmailBlockClub côté admin, cf. coach/ClubRequests.jsx). Ce formulaire ne
// sert donc plus qu'à deux choses qui nécessitent un humain : une question,
// ou planifier le rendez-vous de démarrage (jusqu'ici demandé par email —
// "répondez avec vos disponibilités" — remplacé par une saisie structurée).
function FormulaireClub() {
  const [ouvert, setOuvert] = useState(null) // null | 'question' | 'demarrage'
  const [envoye, setEnvoye] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', nomClub: '', message: '' })
  const [dispos, setDispos] = useState(['', '', ''])

  const champ = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const envoyer = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim() || !form.nomClub.trim()) {
      setErreur('Prénom, nom, email et nom du club sont obligatoires.')
      return
    }
    const dispoRemplies = dispos.map(d => d.trim()).filter(Boolean)
    if (ouvert === 'demarrage' && dispoRemplies.length === 0) {
      setErreur('Indiquez au moins une disponibilité.')
      return
    }
    setEnvoi(true)
    setErreur('')
    const message = ouvert === 'demarrage'
      ? `Disponibilités pour le démarrage :\n${dispoRemplies.map((d, i) => `${i + 1}. ${d}`).join('\n')}${form.message.trim() ? `\n\n${form.message.trim()}` : ''}`
      : (form.message.trim() || 'Question via messagerie')
    const { error } = await supabase.from('demandes_club').insert({
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim().toLowerCase(),
      nom_club: form.nomClub.trim(),
      type: ouvert,
      statut: 'nouveau',
      message,
    })
    setEnvoi(false)
    if (error) { setErreur(`Une erreur est survenue, réessaie ou écris-nous directement à ${CONTACT_EMAIL}.`); return }
    setEnvoye(true)
  }

  if (envoye) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Demande envoyée</p>
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Notre équipe vous répondra sous 24h.</p>
      </div>
    )
  }

  if (!ouvert) {
    return (
      <BoutonsContact calendlyUrl={CALENDLY_URL} onDemarrage={() => setOuvert('demarrage')} onQuestion={() => setOuvert('question')} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ouvert === 'demarrage' && (
        <>
          <p style={{ fontSize: '13px', color: colors.text.dim, margin: '0 0 4px' }}>
            Indiquez-nous 3 créneaux dans la semaine où votre équipe est disponible, on vous recontacte pour caler le rendez-vous de démarrage.
          </p>
          {[0, 1, 2].map(i => (
            <input key={i} placeholder={`Disponibilité ${i + 1}, ex. Lundi 14h-16h`} value={dispos[i]}
              onChange={e => setDispos(prev => prev.map((d, idx) => idx === i ? e.target.value : d))} style={inputStyle} />
          ))}
        </>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input placeholder="Prénom *" value={form.prenom} onChange={champ('prenom')} style={inputStyle} />
        <input placeholder="Nom *" value={form.nom} onChange={champ('nom')} style={inputStyle} />
      </div>
      <input type="email" placeholder="Email de contact *" value={form.email} onChange={champ('email')} style={inputStyle} />
      <input placeholder="Nom du club *" value={form.nomClub} onChange={champ('nomClub')} style={inputStyle} />
      {ouvert === 'question' && (
        <textarea placeholder="Votre question" value={form.message} onChange={champ('message')} rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
      )}
      {erreur && <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>{erreur}</p>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setOuvert(null)} disabled={envoi}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '13px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Annuler
        </button>
        <button onClick={envoyer} disabled={envoi}
          style={{ flex: 1, ...st.cta(colors.accent.purpleLight, true), marginTop: 0, opacity: envoi ? 0.6 : 1, cursor: envoi ? 'not-allowed' : 'pointer' }}>
          {envoi ? 'Envoi...' : ouvert === 'demarrage' ? 'Envoyer mes disponibilités' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

export default function Offres() {
  const navigate = useNavigate()
  const [cycle, setCycle] = useState('annuel')
  const isAnnuel = cycle === 'annuel'

  return (
    <div style={{ background: colors.background.base, minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div onClick={() => navigate('/')} style={{ fontSize: '17px', fontWeight: 800, cursor: 'pointer' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <button onClick={() => navigate('/register')} style={{ background: colors.accent.green, color: colors.background.base, border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Créer un compte</button>
      </nav>

      <BandeauPromo />

      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 1rem' }}>
        <div style={st.eyebrow}>TARIFS</div>
        <h1 style={{ fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 'clamp(44px, 8vw, 76px)', fontWeight: 800, lineHeight: 1, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Une offre pour chaque profil</h1>
        <p style={{ color: colors.text.dim, fontSize: '15px', maxWidth: '480px', margin: '0 auto 2rem' }}>Joueur, éducateur ou club, choisis la formule qui te correspond.</p>
        <ChoixUnivers />
        <div style={{ marginTop: '2.5rem' }}>
          <CycleToggle cycle={cycle} setCycle={setCycle} libelle="Choisis ton rythme de paiement" />
        </div>
      </div>

      {/* ── JOUEURS ── */}
      <BandeauUnivers id="joueurs" photo={PHOTOS.joueur} position="center 42%" couleur={colors.accent.green} eyebrow="Joueurs"
        titre={"Je m'analyse. Je me dépasse.\nJe progresse. Je performe."} texte="Du compte gratuit à l'accompagnement complet : analyses vidéo, retours d'un expert et statistiques pour voir où tu en es et ce qui te fait avancer." fondSuite={colors.background.base} />
      <section style={{ ...st.sectionOuter(colors.background.base), paddingTop: '1rem' }}>
        <div style={st.sectionInner}>

          <div style={{ textAlign: 'center' }}><CycleToggle cycle={cycle} setCycle={setCycle} marge="1.75rem" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', maxWidth: '700px', margin: '0 auto' }}>
            {/* Starter — toujours visible, hors du toggle mensuel/annuel */}
            <div style={st.card(colors.text.muted, false)}>
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>Starter</h3>
              <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>Gratuit</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
                <Feature>Réseau social Jogabonito (interactions, feed)</Feature>
                <Feature>Affilié à un club → stats automatisées</Feature>
                <Feature>Profil joueur de base</Feature>
              </div>
              <button onClick={() => navigate('/register?profil=joueur_starter')} style={st.cta(null, false)}>Commencer gratuitement</button>
            </div>

            {/* Pro — mensuel ou annuel selon le toggle global */}
            <div style={{ ...st.card(colors.accent.green, true), ...(isAnnuel ? recommandeStyle(colors.accent.green) : {}) }}>
              {isAnnuel && <BadgeRecommande color={colors.accent.green} />}
              {isAnnuel ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Annuel</h3>
                    <span style={{ background: colors.accent.red + alpha.soft, color: colors.accent.red, fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>-17%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>100€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>/an</span></p>
                    <span style={{ fontSize: '13px', color: colors.text.faint, textDecoration: 'line-through' }}>120€</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
                    <Feature><strong>2 analyses vidéo / an</strong> (au lieu de 1)</Feature>
                    <Feature>Analyse supplémentaire : 60€ à l'unité</Feature>
                    <Feature>Retour vocal expert</Feature>
                    <Feature>Affilié à un club → stats automatisées</Feature>
                    <Feature>Réseau social Jogabonito</Feature>
                    <Feature>Profil visible recruteurs</Feature>
                    <Feature>Réseau clubs et agents</Feature>
                    <Feature>Feed & visibilité</Feature>
                  </div>
                  <button onClick={() => navigate('/register?profil=joueur_pro&cycle=annuel')} style={st.cta(colors.accent.green, true)}>Commencer à 100€/an</button>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>Mensuel</h3>
                  <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}><PrixMensuel prix={10} /></p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
                    <Feature>1 analyse vidéo / an</Feature>
                    <Feature>Analyse supplémentaire : 60€ à l'unité</Feature>
                    <Feature>Retour vocal expert</Feature>
                    <Feature>Affilié à un club → stats automatisées</Feature>
                    <Feature>Réseau social Jogabonito</Feature>
                    <Feature>Profil visible recruteurs</Feature>
                    <Feature>Réseau clubs et agents</Feature>
                    <Feature>Feed & visibilité</Feature>
                  </div>
                  <button onClick={() => navigate('/register?profil=joueur_pro&cycle=mensuel')} style={st.cta(null, false)}>{promoActive() ? `Commencer à ${prixPromo(10)}€ le 1er mois` : 'Commencer à 10€/mois'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ÉDUCATEURS ── */}
      <BandeauUnivers id="educateurs" photo={PHOTOS.educateur} position="center 6%" cote="droite" couleur={colors.accent.blue} eyebrow="Éducateurs"
        titre="Gère ton équipe comme un pro" texte="Garde le socle gratuit et ajoute seulement les outils dont tu as besoin : séances, tactique, suivi des joueurs, analyse vidéo." fondSuite="#0d0d0d" />
      <section style={{ ...st.sectionOuter('#0d0d0d'), paddingTop: '1rem' }}>
        <div style={st.sectionInner}>
          <div style={{ textAlign: 'center' }}><CycleToggle cycle={cycle} setCycle={setCycle} badge={false} marge="1.75rem" /></div>
          <OffresEducateur color={colors.accent.blue} cycle={cycle} />
        </div>
      </section>

      {/* ── RECRUTEURS : section retirée de la page pour le moment (même choix que
          Home.jsx). Le profil recruteur reste fonctionnel (route /recruteur,
          inscription /register?profil=scout). Pour la remettre, réinsérer ici :
          <section> « Trouve tes prochains talents » avec une offre recruteur
          (voir l'historique git de ce fichier avant ce retrait). ── */}

      {/* ── CLUBS : présentation, semaine type, fonctionnalités, tarifs ── */}
      <HeroClub
        onTarifs={() => document.getElementById('tarifs-club').scrollIntoView({ behavior: 'smooth' })}
        onVie={() => document.getElementById('vie-club').scrollIntoView({ behavior: 'smooth' })}
      />
      <SemaineClub />

      {/* ── CLUBS — fonctionnalités ── */}
      <BesoinsClub />

      {/* ── CLUBS — tarifs ── */}
      <TarifsClub
        naviguer={(palier, cycleChoisi) => navigate(`/register?profil=club&palier=${palier}&cycle=${cycleChoisi}`)}
        suite={(
          <>
          <BlocGuide onClick={() => navigate('/comment-financer')} />
          <div style={{ height: 22 }} />
          <BlocContact>
            <FormulaireClub />
          </BlocContact>
          </>
        )}
      />

      <div style={{ textAlign: 'center', padding: '2rem 1.5rem 4rem' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: colors.text.dim, border: '1px solid #2a2a2a', padding: '12px 28px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Déjà un compte ? Se connecter</button>
      </div>
    </div>
  )
}
