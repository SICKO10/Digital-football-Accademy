import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CONTACT_EMAIL } from '../lib/stripeLinks'

const PALIERS = [
  { label: 'Jusqu\'à 2 équipes',  equipes: 2,  mois: 50,  an: 500  },
  { label: 'Jusqu\'à 4 équipes',  equipes: 4,  mois: 100, an: 1000 },
  { label: 'Jusqu\'à 7 équipes',  equipes: 7,  mois: 130, an: 1300 },
  { label: 'Jusqu\'à 11 équipes', equipes: 11, mois: 160, an: 1600 },
  { label: 'Jusqu\'à 15 équipes', equipes: 15, mois: 190, an: 1900 },
  { label: 'Jusqu\'à 22 équipes', equipes: 22, mois: 250, an: 2500 },
]

const STRATEGIES = [
  {
    id: 'licence', icon: '🪪', titre: 'Augmentation de la licence', color: '#4ade80',
    desc: 'La solution la plus simple. Augmenter légèrement la cotisation annuelle de chaque licencié pour couvrir l\'outil collectivement.',
    detail: (palier, joueurs) => {
      const total = palier.equipes * (joueurs + 1)
      const hausse = Math.ceil(palier.an / total)
      return `Pour ${palier.equipes} équipes (${total} personnes) : seulement +${hausse}€/an par licencié. À comparer aux 300–500€ de cotisation déjà payée.`
    },
    tag: 'Le plus courant', tagColor: '#4ade80',
  },
  {
    id: 'educateurs', icon: '🎓', titre: 'Contribution des éducateurs', color: '#60a5fa',
    desc: 'Les éducateurs sont les premiers bénéficiaires. Une contribution mensuelle volontaire de 5€/mois couvre une part significative.',
    detail: (palier) => {
      const coachs = palier.equipes
      const couvert = Math.round((coachs * 5 * 12 / palier.an) * 100)
      return `${coachs} coachs × 5€/mois = ${coachs * 60}€/an — couvre ${Math.min(couvert, 100)}% de l'abonnement.`
    },
    tag: 'Très populaire', tagColor: '#60a5fa',
  },
  {
    id: 'sponsor', icon: '🏆', titre: 'Sponsoring local', color: '#f59e0b',
    desc: 'Un partenaire local finance tout ou partie. En échange, son logo apparaît sur tous les dashboards joueurs et éducateurs — visibilité ciblée, hyper-locale.',
    detail: (palier) => {
      const vues = palier.equipes * 21 * 30
      return `~${vues.toLocaleString('fr-FR')} vues/mois sur les dashboards. Pharmacie, kiné, magasin de sport, auto-école... 1 sponsor suffit souvent à tout couvrir.`
    },
    tag: 'La plus créative', tagColor: '#f59e0b',
  },
  {
    id: 'subventions', icon: '🏛', titre: 'Aides & subventions publiques', color: '#a78bfa',
    desc: 'La digitalisation des clubs sportifs est éligible à de nombreux dispositifs d\'aide. Beaucoup de clubs ne le savent pas.',
    detail: () => 'CNDS, collectivités territoriales (mairie, département, région), DRAJES. Couverture possible : 30 à 50% du coût annuel selon le dossier.',
    tag: 'Souvent ignoré', tagColor: '#a78bfa',
  },
  {
    id: 'equipementier', icon: '👕', titre: 'Partenariat équipementier', color: '#f87171',
    desc: 'Votre fournisseur maillots ou matériel intègre Digital Football dans son offre. Logo + lien boutique sur la page Équipement du dashboard.',
    detail: () => 'Négociable directement avec votre revendeur local. Un deal "kit + outil digital" est de plus en plus courant dans les clubs pro-actifs.',
    tag: 'Innovant', tagColor: '#f87171',
  },
  {
    id: 'tournoi', icon: '⚽', titre: 'Tournoi de financement', color: '#34d399',
    desc: 'Un tournoi de pré-saison avec droit d\'entrée dédié à la digitalisation. 1 journée suffit à couvrir l\'abonnement annuel complet.',
    detail: (palier) => {
      const equipes = Math.ceil(palier.an / 15)
      return `15€/équipe × ${equipes} équipes = ${palier.an}€. Pour ${palier.equipes} équipes, un tournoi de ${Math.ceil(equipes / 2)} matchs suffit.`
    },
    tag: 'Mobilisateur', tagColor: '#34d399',
  },
]

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)].join(',')
}

function ApercuSponsor({ sponsor }) {
  return (
    <div style={{ background: '#0d0d0d', borderRadius: 14, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
      <div style={{ background: '#111', borderBottom: '1px solid #1a1a1a', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sponsor officiel</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{sponsor}</span>
        </div>
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {['Prochaine séance', 'Mon équipe', 'Mes stats'].map(l => (
            <div key={l} style={{ background: '#111', borderRadius: 8, padding: 10, border: '1px solid #1a1a1a' }}>
              <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, marginBottom: 6 }} />
              <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, width: '60%' }} />
              <div style={{ color: '#2a2a2a', fontSize: 9, marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Partenaire du club</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{sponsor}</div>
          </div>
          <div style={{ background: '#f59e0b', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#0a0a0a' }}>Découvrir →</div>
        </div>
        <div style={{ background: '#111', borderRadius: 8, padding: 10, border: '1px solid #1a1a1a' }}>
          <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, marginBottom: 4 }} />
          <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, width: '75%' }} />
        </div>
      </div>
    </div>
  )
}

export default function CommentFinancer() {
  const navigate = useNavigate()
  const [palierIdx, setPalierIdx] = useState(2)
  const [joueurs, setJoueurs]     = useState(20)
  const [activeStrat, setActiveStrat] = useState(null)
  const [sponsorNom, setSponsorNom]   = useState('Pharmacie du Stade')

  const palier = PALIERS[palierIdx]
  const total  = palier.equipes * (joueurs + 1)
  const parLicencie     = (palier.an / total).toFixed(2)
  const parLicencieMois = (palier.an / total / 12).toFixed(2)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '72px 24px 48px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
          Guide financement
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, margin: '0 0 16px' }}>
          Comment financer<br /><span style={{ color: '#4ade80' }}>Digital Football ?</span>
        </h1>
        <p style={{ color: '#555', fontSize: 17, lineHeight: 1.7, margin: 0 }}>
          Moins d'1€ par mois par joueur. Plusieurs stratégies permettent à votre club de couvrir l'abonnement sans impact sur les familles.
        </p>
      </div>

      {/* CALCULATEUR */}
      <div style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: '#111', borderRadius: 20, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#333', textTransform: 'uppercase', marginBottom: 6 }}>Calculateur</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Combien ça coûte vraiment par joueur ?</div>
          </div>
          <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#333', textTransform: 'uppercase', marginBottom: 12 }}>Votre palier</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {PALIERS.map((p, i) => (
                    <button key={i} onClick={() => setPalierIdx(i)} style={{
                      padding: '9px 14px', borderRadius: 9, textAlign: 'left', cursor: 'pointer',
                      border: `1px solid ${palierIdx === i ? '#4ade80' : '#1a1a1a'}`,
                      background: palierIdx === i ? 'rgba(74,222,128,0.08)' : 'transparent',
                      color: palierIdx === i ? '#4ade80' : '#555',
                      fontSize: 12, fontWeight: palierIdx === i ? 700 : 400,
                      display: 'flex', justifyContent: 'space-between',
                    }}>
                      <span>{p.label}</span>
                      <span style={{ color: palierIdx === i ? '#4ade80' : '#2a2a2a' }}>{p.an}€/an</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#333', textTransform: 'uppercase' }}>Joueurs par équipe</div>
                  <span style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>{joueurs}</span>
                </div>
                <input type="range" min={10} max={30} value={joueurs} onChange={e => setJoueurs(+e.target.value)} style={{ width: '100%', accentColor: '#4ade80' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#2a2a2a', fontSize: 10 }}>10</span>
                  <span style={{ color: '#2a2a2a', fontSize: 10 }}>30</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#0a0a0a', borderRadius: 14, padding: 22, border: '1px solid #1a1a1a', textAlign: 'center' }}>
                <div style={{ color: '#333', fontSize: 11, marginBottom: 8 }}>Coût par licencié</div>
                <div style={{ fontSize: 56, fontWeight: 900, color: '#4ade80', lineHeight: 1, textShadow: '0 0 40px rgba(74,222,128,0.35)' }}>{parLicencieMois}€</div>
                <div style={{ color: '#444', fontSize: 13, marginTop: 4 }}>par mois</div>
                <div style={{ color: '#2a2a2a', fontSize: 11, marginTop: 6 }}>soit {parLicencie}€/an/licencié</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: total, label: 'Personnes couvertes', color: '#fff' },
                  { val: palier.equipes, label: 'Équipes', color: '#fff' },
                  { val: `${palier.an}€`, label: 'Coût annuel', color: '#f59e0b' },
                  { val: `${palier.mois}€/mois`, label: 'Soit par mois', color: '#60a5fa' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0a0a0a', borderRadius: 10, padding: '12px 14px', border: '1px solid #1a1a1a' }}>
                    <div style={{ color: s.color, fontSize: 18, fontWeight: 900 }}>{s.val}</div>
                    <div style={{ color: '#333', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>📊 Mise en perspective</div>
                <div style={{ color: '#666', fontSize: 12, lineHeight: 1.6 }}>
                  La licence FFF coûte <strong style={{ color: '#888' }}>~40€/an</strong> par joueur. Digital Football représente <strong style={{ color: '#4ade80' }}>+{parLicencie}€/an</strong> soit <strong style={{ color: '#4ade80' }}>+{Math.round((+parLicencie / 40) * 100)}%</strong> de la licence — souvent imperceptible.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STRATÉGIES */}
      <div style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 10px' }}>6 façons de financer l'abonnement</h2>
          <p style={{ color: '#444', fontSize: 15, margin: 0 }}>Cliquez sur une stratégie pour voir les chiffres calculés selon votre palier</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STRATEGIES.map(s => {
            const isOpen = activeStrat === s.id
            return (
              <div key={s.id} onClick={() => setActiveStrat(isOpen ? null : s.id)} style={{
                background: '#111', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s',
                border: `1px solid ${isOpen ? s.color : '#1a1a1a'}`,
                ...(isOpen ? { gridColumn: '1/-1', borderLeft: `3px solid ${s.color}` } : {}),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{s.titre}</div>
                      <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 10, background: `rgba(${hexToRgb(s.tagColor)},0.12)`, color: s.tagColor, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.tag}</span>
                    </div>
                  </div>
                  <span style={{ color: '#333', fontSize: 18, marginTop: 4 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <p style={{ color: '#888', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                    <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '14px 16px', border: `1px solid rgba(${hexToRgb(s.color)},0.20)` }}>
                      <div style={{ color: s.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Calcul pour votre club</div>
                      <div style={{ color: '#bbb', fontSize: 13, lineHeight: 1.7 }}>{s.detail(palier, joueurs)}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION SPONSOR */}
      <div style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: '#111', borderRadius: 20, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Sponsoring local</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>Votre sponsor visible sur chaque dashboard</h3>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
              Un partenaire local finance l'outil. En échange, son nom et logo apparaissent sur tous les dashboards joueurs et éducateurs — visibilité ciblée, hyper-locale, auprès des familles du club.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <input value={sponsorNom} onChange={e => setSponsorNom(e.target.value)} placeholder="Nom du sponsor..." style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #222', background: '#0a0a0a', color: '#fff', fontSize: 13, outline: 'none', width: 260 }} />
              <span style={{ color: '#333', fontSize: 12 }}>← Personnalisez l'aperçu</span>
            </div>
          </div>
          <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <ApercuSponsor sponsor={sponsorNom || 'Votre Sponsor'} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '👁', val: `~${(palier.equipes * 21 * 30).toLocaleString('fr-FR')}`, label: 'vues/mois estimées', color: '#f59e0b' },
                { icon: '🎯', val: '100%', label: 'audience locale et qualifiée', color: '#4ade80' },
                { icon: '📱', val: 'Dashboard', label: 'visible à chaque connexion', color: '#60a5fa' },
                { icon: '🔗', val: 'Lien direct', label: 'vers le site ou la boutique', color: '#a78bfa' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#0a0a0a', borderRadius: 10, padding: '12px 14px', border: '1px solid #1a1a1a', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <span style={{ color: s.color, fontWeight: 900, fontSize: 16 }}>{s.val} </span>
                    <span style={{ color: '#555', fontSize: 12 }}>{s.label}</span>
                  </div>
                </div>
              ))}
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.20)', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
                <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Argument commercial</div>
                <div style={{ color: '#666', fontSize: 12, lineHeight: 1.7 }}>Pour un sponsor à <strong style={{ color: '#fff' }}>150€/mois</strong>, le palier {palier.equipes} équipes est entièrement couvert. Une micro-campagne locale avec un ROI mesurable.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMBINAISON GAGNANTE */}
      <div style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: 'rgba(74,222,128,0.04)', borderRadius: 20, border: '1px solid rgba(74,222,128,0.12)', padding: 28 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 20px' }}>🏆 La combinaison idéale pour la plupart des clubs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { part: '40%', label: '+3€/licencié/an', color: '#4ade80', desc: 'Légère hausse de cotisation' },
              { part: '30%', label: '1 sponsor local',  color: '#f59e0b', desc: 'Partenaire de visibilité' },
              { part: '30%', label: 'Coachs 5€/mois',   color: '#60a5fa', desc: 'Contribution éducateurs' },
            ].map((c, i) => (
              <div key={i} style={{ background: '#111', borderRadius: 12, padding: 16, border: '1px solid #1a1a1a', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.part}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginTop: 6 }}>{c.label}</div>
                <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>{c.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#555', fontSize: 13, lineHeight: 1.7, margin: '18px 0 0' }}>
            En combinant ces trois leviers, aucune famille ne ressent d'impact notable, les éducateurs s'investissent dans l'outil qu'ils utilisent, et le club construit une relation durable avec un acteur local.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 680, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: '#111', borderRadius: 20, border: '1px solid #1a1a1a', padding: '40px 32px' }}>
          <h3 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 12px' }}>Vous avez une question sur le financement ?</h3>
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px' }}>
            Notre équipe vous accompagne pour définir la stratégie adaptée à votre club — gratuitement et sans engagement.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ padding: '13px 28px', borderRadius: 12, border: 'none', background: '#4ade80', color: '#0a0a0a', fontWeight: 800, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}>
              Être accompagné →
            </a>
            <button onClick={() => navigate('/offres')} style={{ padding: '13px 28px', borderRadius: 12, border: '1px solid #222', background: 'transparent', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Voir les tarifs
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
