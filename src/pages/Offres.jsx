import { useNavigate } from 'react-router-dom'
import { STRIPE_LINKS_CLUB } from '../lib/stripeLinks'

const st = {
  section: { padding: '4rem 1.5rem', maxWidth: '960px', margin: '0 auto' },
  eyebrow: { display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 },
  titre: { fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, marginBottom: '0.5rem' },
  sousTitre: { color: '#666', fontSize: '14px', marginBottom: '2.5rem', maxWidth: '560px' },
  card: (color, actif) => ({
    background: '#111', border: `${actif ? 2 : 1}px solid ${actif ? color : '#1f1f1f'}`,
    borderRadius: '16px', padding: '1.75rem', textAlign: 'left', display: 'flex', flexDirection: 'column',
  }),
  feature: { fontSize: '13px', color: '#aaa', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5 },
  cta: (color, dark) => ({ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: color ? 'none' : '1px solid #333', background: color || 'transparent', color: dark ? '#0a0a0a' : '#fff', fontSize: '14px', fontWeight: 700, textAlign: 'center', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 'auto' }),
}

function Feature({ children }) {
  return <div style={st.feature}><span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {children}</div>
}

// Cartes Mensuel + Annuel côte à côte, même liste de fonctionnalités pour les
// deux (éducateur, recruteur) — même layout 2 colonnes que la section Joueur.
function OffrePro({ emoji, titre, color, features, profilId }) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
      {/* Mensuel */}
      <div style={st.card(color, false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '24px' }}>{emoji}</span>
          <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>{titre}</h3>
        </div>
        <p style={{ fontSize: '11px', color: '#666', fontWeight: 700, margin: '0 0 10px' }}>MENSUEL</p>
        <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>10€<span style={{ fontSize: '14px', color: '#555', fontWeight: 400 }}>/mois</span></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
          {features.map(f => <Feature key={f}>{f}</Feature>)}
        </div>
        <button onClick={() => navigate(`/register?profil=${profilId}&cycle=mensuel`)} style={st.cta(null, false)}>Commencer — 10€/mois</button>
      </div>

      {/* Annuel */}
      <div style={st.card(color, true)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '24px' }}>{emoji}</span>
          <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>{titre}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px' }}>
          <p style={{ fontSize: '11px', color, fontWeight: 700, margin: 0 }}>ANNUEL</p>
          <span style={{ background: `${color}20`, color, fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>2 mois offerts</span>
        </div>
        <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>100€<span style={{ fontSize: '14px', color: '#555', fontWeight: 400 }}>/an</span></p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
          {features.map(f => <Feature key={f}>{f}</Feature>)}
        </div>
        <button onClick={() => navigate(`/register?profil=${profilId}&cycle=annuel`)} style={st.cta(color, true)}>Commencer — 100€/an</button>
      </div>
    </div>
  )
}

export default function Offres() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div onClick={() => navigate('/')} style={{ fontSize: '17px', fontWeight: 800, cursor: 'pointer' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Créer un compte</button>
      </nav>

      <div style={{ textAlign: 'center', padding: '3rem 1.5rem 1rem' }}>
        <div style={st.eyebrow}>TARIFS</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>Une offre pour chaque profil</h1>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '480px', margin: '0 auto' }}>Joueur, éducateur, recruteur ou club — choisis la formule qui te correspond.</p>
      </div>

      {/* ── JOUEURS ── */}
      <section style={st.section}>
        <div style={st.eyebrow}>JOUEURS</div>
        <h2 style={st.titre}>Progresse et fais-toi remarquer</h2>
        <p style={st.sousTitre}>Du compte gratuit à l'accompagnement complet avec analyses vidéo d'experts.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* Starter */}
          <div style={st.card('#888', false)}>
            <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>Starter</h3>
            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>Gratuit</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '1.75rem' }}>
              <Feature>Réseau social Jogabonito (interactions, feed)</Feature>
              <Feature>Affilié à un club → stats automatisées</Feature>
              <Feature>Profil joueur de base</Feature>
            </div>
            <button onClick={() => navigate('/register?profil=joueur_starter')} style={st.cta(null, false)}>Commencer gratuitement</button>
          </div>

          {/* Mensuel */}
          <div style={st.card('#4ade80', false)}>
            <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>Mensuel</h3>
            <p style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 1.5rem' }}>10€<span style={{ fontSize: '14px', color: '#555', fontWeight: 400 }}>/mois</span></p>
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
          </div>

          {/* Annuel */}
          <div style={st.card('#4ade80', true)}>
            <div style={{ position: 'absolute', marginTop: '-2.75rem', marginLeft: '0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Annuel</h3>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>-17%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>100€<span style={{ fontSize: '14px', color: '#555', fontWeight: 400 }}>/an</span></p>
              <span style={{ fontSize: '13px', color: '#555', textDecoration: 'line-through' }}>120€</span>
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
            <button onClick={() => navigate('/register?profil=joueur_pro&cycle=annuel')} style={st.cta('#4ade80', true)}>Commencer — 100€/an</button>
          </div>
        </div>
      </section>

      {/* ── ÉDUCATEURS ── */}
      <section style={st.section}>
        <div style={st.eyebrow}>ÉDUCATEURS</div>
        <h2 style={st.titre}>Gère ton équipe comme un pro</h2>
        <p style={st.sousTitre}>Effectif, présences, analyses, séances et statistiques — tout au même endroit.</p>
        <div style={{ maxWidth: '680px' }}>
          <OffrePro emoji="🎓" titre="Éducateur" color="#60a5fa" profilId="educateur" features={[
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
      <section style={st.section}>
        <div style={st.eyebrow}>SCOUTS / RECRUTEURS</div>
        <h2 style={st.titre}>Trouve tes prochains talents</h2>
        <p style={st.sousTitre}>Recherche par profil, messagerie directe avec les joueurs et statistiques automatisées.</p>
        <div style={{ maxWidth: '680px' }}>
          <OffrePro emoji="🔍" titre="Scout / Recruteur" color="#f97316" profilId="scout" features={[
            'Accès à la base de joueurs',
            'Trouver des joueurs par profil (poste, niveau, région…)',
            'Messagerie directe avec les joueurs',
            'Scout Center',
            'Stats automatisées des joueurs affiliés',
          ]} />
        </div>
      </section>

      {/* ── CLUBS ── */}
      <section style={st.section}>
        <div style={st.eyebrow}>CLUBS</div>
        <h2 style={st.titre}>Un tarif adapté à la taille de ton club</h2>
        <p style={st.sousTitre}>Le palier dépend du nombre de joueurs inscrits. Notre équipe vérifie ton effectif avant d'activer l'accès.</p>

        <div style={{ overflowX: 'auto', marginBottom: '2rem', border: '1px solid #1f1f1f', borderRadius: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontWeight: 700 }}>Palier</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontWeight: 700 }}>Mensuel</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#666', fontWeight: 700 }}>Annuel</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(STRIPE_LINKS_CLUB).map((p, i) => (
                <tr key={p.label} style={{ borderTop: '1px solid #1f1f1f', background: i % 2 ? '#0d0d0d' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.label}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontWeight: 700 }}>{p.mensuelPrix}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4ade80', fontWeight: 700 }}>{p.annuelPrix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={st.card('#a78bfa', true)}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Fonctionnalités incluses — tous paliers</p>
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
          <button onClick={() => navigate('/register?profil=club')} style={st.cta('#a78bfa', true)}>Nous contacter</button>
        </div>
      </section>

      <div style={{ textAlign: 'center', padding: '2rem 1.5rem 4rem' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#666', border: '1px solid #2a2a2a', padding: '12px 28px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Déjà un compte ? Se connecter</button>
      </div>
    </div>
  )
}
