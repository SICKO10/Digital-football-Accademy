import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { STRIPE_LINKS_CLUB } from '../lib/stripeLinks'
import { colors, alpha } from '../tokens'

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

function Feature({ children }) {
  return <div style={st.feature}><span style={{ color: colors.accent.green, flexShrink: 0 }}>✓</span> {children}</div>
}

// Une seule card à la fois (mensuelle ou annuelle selon `cycle`, piloté par le
// toggle global de la page) — avant, les deux étaient affichées côte à côte
// en permanence.
function OffrePro({ titre, color, features, profilId, cycle }) {
  const navigate = useNavigate()
  const isAnnuel = cycle === 'annuel'
  return (
    <div style={{ maxWidth: '340px', margin: '0 auto' }}>
      <div style={{ ...st.card(color, true), ...(isAnnuel ? recommandeStyle(color) : {}) }}>
        {isAnnuel && <BadgeRecommande color={color} />}
        <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>{titre}</h3>
        {isAnnuel ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px' }}>
              <p style={{ fontSize: '11px', color, fontWeight: 700, margin: 0 }}>ANNUEL</p>
              <span style={{ background: `${color}20`, color, fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>2 mois offerts</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>100€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>/an</span></p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, margin: '0 0 10px' }}>MENSUEL</p>
            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>10€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>/mois</span></p>
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
          {features.map(f => <Feature key={f}>{f}</Feature>)}
        </div>
        <button onClick={() => navigate(`/register?profil=${profilId}&cycle=${cycle}`)} style={st.cta(isAnnuel ? color : null, isAnnuel)}>
          {isAnnuel ? 'Commencer — 100€/an' : 'Commencer — 10€/mois'}
        </button>
      </div>
    </div>
  )
}

// Toggle global Mensuel/Annuel — pilote l'affichage de toutes les sections Pro
// (Joueur/Éducateur/Recruteur) en même temps.
function CycleToggle({ cycle, setCycle }) {
  const btnStyle = (actif) => ({
    background: actif ? colors.accent.green : 'transparent',
    color: actif ? colors.black : colors.text.dim,
    border: 'none', borderRadius: '26px', padding: '9px 20px', fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px',
  })
  return (
    <div style={{ display: 'inline-flex', background: '#111', borderRadius: '30px', padding: '4px', marginBottom: '2.5rem' }}>
      <button onClick={() => setCycle('mensuel')} style={btnStyle(cycle === 'mensuel')}>Mensuel</button>
      <button onClick={() => setCycle('annuel')} style={btnStyle(cycle === 'annuel')}>
        Annuel
        {cycle !== 'annuel' && (
          <span style={{ background: colors.accent.green + alpha.subtle, color: colors.accent.green, fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>
            2 mois offerts
          </span>
        )}
      </button>
    </div>
  )
}

const inputStyle = { width: '100%', background: colors.background.base, border: '1px solid #2a2a2a', borderRadius: '10px', color: colors.text.primary, padding: '11px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }

// Formulaire de contact club — pas de paiement en libre-service, une vente
// humaine convient mieux pour des contrats B2B à 50-250€/mois. Les paliers
// viennent de STRIPE_LINKS_CLUB (lib/stripeLinks.js), pas d'une liste dupliquée
// ici, pour ne jamais afficher un prix différent de celui réellement facturé.
function FormulaireClub() {
  const [ouvert, setOuvert] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [typeEnvoye, setTypeEnvoye] = useState(null)
  const [nbLicencies, setNbLicencies] = useState('')
  const [cycle, setCycle] = useState('mensuel')
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', nomClub: '', ville: '', ligue: '', nbMembres: '', message: '' })

  const champ = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const envoyerDemande = async (type) => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim() || !form.nomClub.trim()) {
      setErreur('Prénom, nom, email et nom du club sont obligatoires.')
      return
    }
    if (type === 'abonnement' && !nbLicencies) {
      setErreur('Sélectionnez le nombre de licenciés.')
      return
    }
    setEnvoi(true)
    setErreur('')
    const palier = STRIPE_LINKS_CLUB[nbLicencies]
    const prixDemande = cycle === 'annuel' ? palier?.annuelPrix : palier?.mensuelPrix
    const { error } = await supabase.from('demandes_club').insert({
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim().toLowerCase(),
      nom_club: form.nomClub.trim(),
      ville: form.ville.trim() || null,
      ligue: form.ligue.trim() || null,
      nb_membres: form.nbMembres ? parseInt(form.nbMembres, 10) : null,
      nb_licencies: type === 'abonnement' ? nbLicencies : null,
      cycle: type === 'abonnement' ? cycle : null,
      type,
      statut: 'nouveau',
      message: form.message.trim() || (type === 'abonnement' ? `Demande abonnement — ${palier?.label} (${cycle}) — ${prixDemande}` : 'Question via messagerie'),
    })
    setEnvoi(false)
    if (error) { setErreur("Une erreur est survenue, réessaie ou écris-nous directement à contact@digital-football.fr."); return }
    setTypeEnvoye(type)
    setEnvoye(true)
  }

  if (envoye) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Demande envoyée</p>
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
          {typeEnvoye === 'question' ? 'Notre équipe vous répondra sous 24h.' : 'Vous recevrez votre lien de paiement par email sous 24-48h.'}
        </p>
      </div>
    )
  }

  if (!ouvert) {
    return <button onClick={() => setOuvert(true)} style={st.cta(colors.accent.purpleLight, true)}>Nous contacter</button>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['mensuel', 'annuel'].map(c => (
          <button key={c} type="button" onClick={() => setCycle(c)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${cycle === c ? colors.accent.green : '#2a2a2a'}`, background: cycle === c ? colors.accent.green + alpha.subtle : colors.background.base, color: cycle === c ? colors.accent.green : colors.text.faint, fontWeight: cycle === c ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
            {c === 'mensuel' ? 'Mensuel' : 'Annuel — 2 mois offerts 🎁'}
          </button>
        ))}
      </div>
      <label style={{ fontSize: '11px', color: colors.text.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre de licenciés</label>
      <select value={nbLicencies} onChange={e => setNbLicencies(e.target.value)} style={{ ...inputStyle, color: nbLicencies ? colors.text.primary : colors.text.faint, cursor: 'pointer' }}>
        <option value="">Sélectionnez votre tranche</option>
        {Object.entries(STRIPE_LINKS_CLUB).map(([key, p]) => (
          <option key={key} value={key}>{p.label} — {cycle === 'annuel' ? p.annuelPrix : p.mensuelPrix}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input placeholder="Prénom *" value={form.prenom} onChange={champ('prenom')} style={inputStyle} />
        <input placeholder="Nom *" value={form.nom} onChange={champ('nom')} style={inputStyle} />
      </div>
      <input type="email" placeholder="Email de contact *" value={form.email} onChange={champ('email')} style={inputStyle} />
      <input placeholder="Nom du club *" value={form.nomClub} onChange={champ('nomClub')} style={inputStyle} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <input placeholder="Ville (optionnel)" value={form.ville} onChange={champ('ville')} style={inputStyle} />
        <input placeholder="Ligue / championnat (optionnel)" value={form.ligue} onChange={champ('ligue')} style={inputStyle} />
      </div>
      <input type="number" min="0" placeholder="Nombre de membres (optionnel)" value={form.nbMembres} onChange={champ('nbMembres')} style={inputStyle} />
      <textarea placeholder="Message (optionnel)" value={form.message} onChange={champ('message')} rows={3}
        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
      {erreur && <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>{erreur}</p>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => envoyerDemande('question')} disabled={envoi}
          style={{ flex: 1, background: 'transparent', border: '1px solid #2a2a2a', color: colors.text.secondary, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: envoi ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: envoi ? 0.7 : 1 }}>
          💬 Poser une question
        </button>
        <button onClick={() => envoyerDemande('abonnement')} disabled={envoi || !nbLicencies}
          style={{ flex: 1.5, ...st.cta(colors.accent.purpleLight, true), marginTop: 0, opacity: (envoi || !nbLicencies) ? 0.6 : 1, cursor: (envoi || !nbLicencies) ? 'not-allowed' : 'pointer' }}>
          {envoi ? 'Envoi...' : '→ Demander un abonnement'}
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div onClick={() => navigate('/')} style={{ fontSize: '17px', fontWeight: 800, cursor: 'pointer' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <button onClick={() => navigate('/register')} style={{ background: colors.accent.green, color: colors.background.base, border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Créer un compte</button>
      </nav>

      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 1rem' }}>
        <div style={st.eyebrow}>TARIFS</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Une offre pour chaque profil</h1>
        <p style={{ color: colors.text.dim, fontSize: '15px', maxWidth: '480px', margin: '0 auto 2rem' }}>Joueur, éducateur, recruteur ou club — choisis la formule qui te correspond.</p>
        <CycleToggle cycle={cycle} setCycle={setCycle} />
      </div>

      {/* ── JOUEURS ── */}
      <section style={st.sectionOuter(colors.background.base)}>
        <div style={st.sectionInner}>
          <div style={st.eyebrow}>JOUEURS</div>
          <h2 style={st.titre}>Progresse et fais-toi remarquer</h2>
          <p style={st.sousTitre}>Du compte gratuit à l'accompagnement complet avec analyses vidéo d'experts.</p>

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
                  <button onClick={() => navigate('/register?profil=joueur_pro&cycle=annuel')} style={st.cta(colors.accent.green, true)}>Commencer — 100€/an</button>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>Mensuel</h3>
                  <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>10€<span style={{ fontSize: '14px', color: colors.text.faint, fontWeight: 400 }}>/mois</span></p>
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
                  <button onClick={() => navigate('/register?profil=joueur_pro&cycle=mensuel')} style={st.cta(null, false)}>Commencer — 10€/mois</button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ÉDUCATEURS ── */}
      <section style={st.sectionOuter('#0d0d0d')}>
        <div style={st.sectionInner}>
          <div style={st.eyebrow}>ÉDUCATEURS</div>
          <h2 style={st.titre}>Gère ton équipe comme un pro</h2>
          <p style={st.sousTitre}>Effectif, présences, analyses, séances et statistiques — tout au même endroit.</p>
          <OffrePro titre="Éducateur" color={colors.accent.blue} profilId="educateur" cycle={cycle} features={[
            'Gestion de l\'effectif',
            'Suivi des présences',
            'Analyse joueurs',
            'Préparation de séance',
            'Tacticboard',
            'Bibliothèque de séances',
            'Stats équipe automatisées',
            'Scout Center',
            'Création d\'espace dirigeant (inviter un dirigeant, directeur sportif, secrétaire…)',
          ]} />
        </div>
      </section>

      {/* ── RECRUTEURS ── */}
      <section style={st.sectionOuter(colors.background.base)}>
        <div style={st.sectionInner}>
          <div style={st.eyebrow}>SCOUTS / RECRUTEURS</div>
          <h2 style={st.titre}>Trouve tes prochains talents</h2>
          <p style={st.sousTitre}>Recherche par profil, messagerie directe avec les joueurs et statistiques automatisées.</p>
          <OffrePro titre="Scout / Recruteur" color={colors.accent.orange} profilId="scout" cycle={cycle} features={[
            'Accès à la base de joueurs',
            'Trouver des joueurs par profil (poste, niveau, région…)',
            'Messagerie directe avec les joueurs',
            'Scout Center',
            'Stats automatisées des joueurs affiliés',
          ]} />
        </div>
      </section>

      {/* ── CLUBS ── */}
      <section style={st.sectionOuter('#0d0d0d')}>
        <div style={st.sectionInner}>
          <div style={st.eyebrow}>CLUBS</div>
          <h2 style={st.titre}>Un tarif adapté à la taille de ton club</h2>
          <p style={st.sousTitre}>Le palier dépend du nombre de joueurs inscrits. Notre équipe vérifie ton effectif avant d'activer l'accès.</p>

          <div style={{ overflowX: 'auto', marginBottom: '2rem', border: '1px solid #1f1f1f', borderRadius: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: colors.background.surface }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: colors.text.dim, fontWeight: 700 }}>Palier</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: colors.text.dim, fontWeight: 700 }}>Mensuel</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', color: colors.text.dim, fontWeight: 700 }}>Annuel</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(STRIPE_LINKS_CLUB).map((p, i) => (
                  <tr key={p.label} style={{ borderTop: '1px solid #1f1f1f', background: i % 2 ? colors.background.sunken : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.label}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.accent.green, fontWeight: 700 }}>{p.mensuelPrix}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.accent.green, fontWeight: 700 }}>{p.annuelPrix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={st.card(colors.accent.purpleLight, true)}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: colors.accent.purpleLight, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Fonctionnalités incluses — tous paliers</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '9px', marginBottom: '1.75rem' }}>
              <Feature>Gestion multi-équipes</Feature>
              <Feature>Tous les outils éducateur</Feature>
              <Feature>Scout Center recruteurs</Feature>
              <Feature>Stats équipe automatisées</Feature>
              <Feature>Analyses joueurs</Feature>
              <Feature>Gestion budgétaire du club</Feature>
              <Feature>Gestion des sponsors</Feature>
              <Feature>Création de rôles (Dirigeant, Directeur sportif, Secrétaire…)</Feature>
              <Feature>Espace dirigeant dédié</Feature>
              <Feature>Réseau social Jogabonito</Feature>
            </div>
            <blockquote style={{ margin: '0 0 1.75rem', padding: '1rem 1.25rem', background: '#a78bfa10', border: '1px solid #a78bfa30', borderRadius: '10px', fontSize: '13px', color: '#c4b5fd', fontStyle: 'italic', lineHeight: 1.6 }}>
              « Invitez vos dirigeants, directeurs sportifs et secrétaires — chacun accède à son espace dédié. »
            </blockquote>
            <FormulaireClub />
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', padding: '2rem 1.5rem 4rem' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: colors.text.dim, border: '1px solid #2a2a2a', padding: '12px 28px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Déjà un compte ? Se connecter</button>
      </div>
    </div>
  )
}
