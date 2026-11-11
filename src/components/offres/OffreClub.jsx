import { colors } from '../../tokens'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'
import { promoActive, prixPromo, prixDepuisTexte } from '../../lib/promo'

// Parties « club » de la page Offres : présentation en grand format, semaine
// type d'un club, cartes de tarifs par nombre d'équipes. Les prix et les liens
// viennent de STRIPE_LINKS_CLUB : rien n'est saisi en dur ici. La page est
// toujours sombre, comme le reste de Offres.
// Photo de fond : remplacer cette ligne par une vraie photo du club pour changer l'ambiance.
const PHOTO_CLUB = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1800&q=75'
const police = 'Inter, sans-serif'

const CSS = `
  .oc-photo { background-size: cover; background-position: center; }
  .oc-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; color: #fff; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px); }
  .oc-semaine { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .oc-jour { position: relative; padding: 22px 18px 20px; border-radius: 16px; background: rgba(17,17,17,0.78); border: 1px solid rgba(255,255,255,0.08); transition: transform .2s, border-color .2s; }
  .oc-jour:hover { transform: translateY(-4px); border-color: var(--c); }
  .oc-palier { position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 24px 22px 22px; border-radius: 18px; background: rgba(17,17,17,0.8); border: 1px solid rgba(255,255,255,0.09); backdrop-filter: blur(8px); transition: transform .2s, border-color .2s, box-shadow .2s; }
  .oc-palier:hover { transform: translateY(-4px); border-color: #4ade80; box-shadow: 0 18px 50px rgba(74,222,128,0.12); }
  .oc-btn { font-family: ${police}; font-weight: 800; font-size: 14px; border-radius: 12px; cursor: pointer; padding: 13px 16px; min-height: 44px; }
  .oc-grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 960px) { .oc-semaine { grid-template-columns: repeat(2, minmax(0, 1fr)); } .oc-grille { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 600px) { .oc-semaine { grid-template-columns: 1fr; } .oc-grille { grid-template-columns: 1fr; } }
`

// Traits d'un terrain (cercle central, rond de touche, grande surface), en filigrane.
function TraitsTerrain({ style }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 260" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="2" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <rect x="2" y="2" width="396" height="256" rx="6" />
      <line x1="200" y1="2" x2="200" y2="258" />
      <circle cx="200" cy="130" r="42" />
      <circle cx="200" cy="130" r="3" fill="rgba(255,255,255,0.09)" />
      <rect x="2" y="70" width="64" height="120" />
      <rect x="2" y="102" width="24" height="56" />
      <rect x="334" y="70" width="64" height="120" />
      <rect x="374" y="102" width="24" height="56" />
    </svg>
  )
}

const ACTEURS = [
  ['Éducateurs', colors.accent.blue],
  ['Joueurs', colors.accent.green],
  ['Dirigeants', colors.accent.purpleLight],
  ['Parents', colors.accent.orange],
]

// Grande présentation : photo de terrain, traits de jeu, les quatre acteurs du club.
export function HeroClub({ onTarifs, onVie }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', fontFamily: police, borderTop: '1px solid #1a2a1a' }}>
      <style>{CSS}</style>
      <div className="oc-photo" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${PHOTO_CLUB}")` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.62) 45%, #0a0a0a 100%), radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.22), transparent 60%)' }} />
      <TraitsTerrain style={{ left: '50%', top: '50%', width: 'min(1100px, 130%)', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto', padding: 'clamp(72px, 12vw, 140px) 24px clamp(64px, 10vw, 110px)', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: colors.accent.green + '22', border: '1px solid #4ade8055', color: colors.accent.green, fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '5px 16px', borderRadius: 999, marginBottom: 22 }}>Offre Club</span>
        <h2 style={{ fontSize: 'clamp(34px, 6.5vw, 64px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', color: '#fff', margin: '0 0 22px' }}>
          Tout votre club,<br /><span style={{ color: colors.accent.green }}>sur un seul terrain.</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 'clamp(16px, 2.2vw, 19px)', lineHeight: 1.65, maxWidth: 620, margin: '0 auto 28px' }}>
          Éducateurs, joueurs, dirigeants et parents travaillent enfin ensemble, dans un écosystème unique, du planning de la semaine au budget de la saison.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 38 }}>
          {ACTEURS.map(([nom, couleur]) => (
            <span key={nom} className="oc-chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: couleur }} />{nom}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="oc-btn" onClick={onTarifs} style={{ border: 'none', background: colors.accent.green, color: colors.background.base, padding: '16px 36px', fontSize: 16 }}>Voir les tarifs</button>
          <button className="oc-btn" onClick={onVie} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '16px 30px', fontSize: 16 }}>Découvrir la vie du club</button>
        </div>
      </div>
    </section>
  )
}

// Ce que le club fait dans la semaine, relié à ce que fait la plateforme.
const SEMAINE = [
  ['En semaine', 'Les entraînements', 'Planning interactif, séances préparées par chaque éducateur, présences suivies équipe par équipe.', colors.accent.blue],
  ['Avant le match', 'Les convocations', 'Convocations officielles et organisation de chaque rencontre, sans courir après personne.', colors.accent.purpleLight],
  ['Le week-end', 'Les matchs', 'Résultats, statistiques collectives et individuelles de chaque équipe, classement à jour.', colors.accent.green],
  ['À l\'extérieur', 'Les déplacements', 'Trajets des matchs organisés par l\'IA, joueurs répartis dans les mini-bus.', colors.accent.orange],
  ['En coulisses', 'Le club', 'Budget, sponsors, inventaire du matériel, événements et projets, au même endroit.', colors.accent.amber],
]

export function SemaineClub() {
  return (
    <section id="vie-club" style={{ position: 'relative', background: '#0a0a0a', padding: 'clamp(56px, 8vw, 96px) 24px', fontFamily: police, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <TraitsTerrain style={{ right: '-120px', top: '40px', width: 640, opacity: 0.6 }} />
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.green }}>La vie de votre club</p>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, letterSpacing: '-0.8px', color: '#fff' }}>Une semaine dans votre club</h3>
        <p style={{ margin: '0 auto 44px', textAlign: 'center', maxWidth: 560, fontSize: 15, lineHeight: 1.6, color: colors.text.dim }}>
          Chaque moment du club a son outil. Plus de messages éparpillés, de fichiers perdus ni de tableaux à ressaisir.
        </p>
        <div className="oc-semaine">
          {SEMAINE.map(([quand, titre, texte, couleur]) => (
            <div key={titre} className="oc-jour" style={{ '--c': couleur }}>
              <span style={{ display: 'block', width: 28, height: 3, borderRadius: 2, background: couleur, marginBottom: 16 }} />
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: couleur }}>{quand}</p>
              <p style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: '#fff' }}>{titre}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: colors.text.secondary }}>{texte}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Cartes de tarifs par nombre d'équipes. `naviguer(palier, cycle)` ouvre l'inscription.
// `suite` : contenu affiché sous les cartes (guide de financement, formulaire de contact).
export function TarifsClub({ naviguer, suite }) {
  const promo = promoActive()
  return (
    <section id="tarifs-club" style={{ position: 'relative', overflow: 'hidden', fontFamily: police, padding: 'clamp(56px, 8vw, 96px) 24px' }}>
      <style>{CSS}</style>
      <div className="oc-photo" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${PHOTO_CLUB}")`, backgroundPosition: 'center bottom' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a0a0a 0%, rgba(10,10,10,0.86) 30%, rgba(10,10,10,0.9) 100%)' }} />
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.green }}>Tarifs club</p>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontSize: 'clamp(26px, 4.5vw, 40px)', fontWeight: 900, letterSpacing: '-0.8px', color: '#fff' }}>Un tarif selon la taille de votre club</h3>
        <p style={{ margin: '0 auto 14px', textAlign: 'center', maxWidth: 560, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
          Choisissez le palier adapté au nombre d'équipes de votre club. Paiement sécurisé, accès immédiat.
        </p>
        <p style={{ margin: '0 0 40px', textAlign: 'center' }}>
          <span className="oc-chip">Tous les outils du club sont inclus dans chaque palier</span>
        </p>

        <div className="oc-grille" style={{ marginBottom: 28 }}>
          {Object.entries(STRIPE_LINKS_CLUB).map(([cle, p]) => {
            const mensuel = prixDepuisTexte(p.mensuelPrix)
            const annuel = prixDepuisTexte(p.annuelPrix)
            const economie = Math.round(mensuel * 12 - annuel)
            const nb = (p.label.match(/\d+/) || [])[0]
            return (
              <div key={cle} className="oc-palier">
                <TraitsTerrain style={{ right: -60, bottom: -50, width: 260 }} />
                <p style={{ position: 'relative', margin: '0 0 2px', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint }}>Jusqu'à</p>
                <p style={{ position: 'relative', margin: '0 0 18px', fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff', lineHeight: 1.1 }}>
                  {nb ? <>{nb} <span style={{ fontSize: 18, fontWeight: 700, color: colors.text.secondary }}>équipes</span></> : p.label}
                </p>
                <p style={{ position: 'relative', margin: '0 0 2px', fontSize: 34, fontWeight: 900, letterSpacing: '-1px', color: colors.accent.green, lineHeight: 1.1 }}>
                  {annuel} €<span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0, color: colors.text.faint }}> par an</span>
                </p>
                <p style={{ position: 'relative', margin: '0 0 20px', fontSize: 12, color: colors.text.faint, minHeight: 18 }}>
                  {economie > 0 ? `${economie} € de moins que 12 mensualités` : ''}
                </p>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  <button className="oc-btn" onClick={() => naviguer(cle, 'annuel')} style={{ border: 'none', background: colors.accent.green, color: colors.background.base }}>
                    Commencer à {annuel} €/an
                  </button>
                  <button className="oc-btn" onClick={() => naviguer(cle, 'mensuel')} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(10,10,10,0.85)', color: '#fff', fontWeight: 700 }}>
                    {promo
                      ? <>{prixPromo(mensuel)} € le 1er mois <span style={{ textDecoration: 'line-through', color: colors.text.faint, fontWeight: 400, marginLeft: 6 }}>{mensuel} €</span></>
                      : `ou ${mensuel} €/mois`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>{suite}</div>
      </div>
    </section>
  )
}
