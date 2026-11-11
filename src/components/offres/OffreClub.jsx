import { colors } from '../../tokens'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'
import { promosActives, coutPremiereAnnee, prixDepuisTexte, PROMO_FIN } from '../../lib/promo'
import { PHOTOS, TRAITEMENT_PHOTO, POLICE_TITRE } from '../../lib/photosOffres'
import { IconTool, IconBall, IconChart, IconBolt, IconCheck } from '../icones'

// Parties « club » de la page Offres : présentation en grand format, semaine
// type d'un club, cartes de tarifs par nombre d'équipes. Les prix et les liens
// viennent de STRIPE_LINKS_CLUB : rien n'est saisi en dur ici. La page est
// toujours sombre, comme le reste de Offres.
// Photo de fond : public/offres/club.jpg (voir lib/photosOffres.js), même traitement que les deux autres univers.
const PHOTO_CLUB = PHOTOS.club
const police = 'Inter, sans-serif'

const CSS = `
  .oc-photo { background-size: cover; background-position: center; }
  .oc-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; color: #fff; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px); }
  .oc-semaine { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .oc-jour { position: relative; padding: 22px 18px 20px; border-radius: 16px; background: #111; border: 1px solid rgba(255,255,255,0.08); transition: transform .2s, border-color .2s; }
  .oc-jour:hover { transform: translateY(-4px); border-color: var(--c); }
  .oc-palier { position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 24px 22px 22px; border-radius: 18px; background: #111; border: 1px solid rgba(255,255,255,0.09); transition: transform .2s, border-color .2s, box-shadow .2s; }
  .oc-palier:hover { transform: translateY(-4px); border-color: #4ade80; box-shadow: 0 18px 50px rgba(74,222,128,0.12); }
  .oc-btn { font-family: ${police}; font-weight: 800; font-size: 14px; border-radius: 12px; cursor: pointer; padding: 13px 16px; min-height: 44px; }
  .oc-grille { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .oc-guide { position: relative; overflow: hidden; display: flex; align-items: center; gap: 22px; width: 100%; box-sizing: border-box; padding: 24px 26px; border-radius: 20px; text-align: left; cursor: pointer; font-family: ${police}; color: #fff; background: linear-gradient(120deg, rgba(74,222,128,0.2) 0%, rgba(74,222,128,0.05) 55%, #111 100%); border: 1px solid rgba(74,222,128,0.45); transition: transform .2s, box-shadow .2s, border-color .2s; }
  .oc-guide:hover { transform: translateY(-3px); border-color: #4ade80; box-shadow: 0 18px 50px rgba(74,222,128,0.18); }
  .oc-guide:focus-visible { outline: 2px solid #4ade80; outline-offset: 3px; }
  .oc-contact { position: relative; overflow: hidden; padding: 30px; border-radius: 20px; background: linear-gradient(135deg, rgba(167,139,250,0.16) 0%, #111 55%); border: 1px solid rgba(167,139,250,0.35); }
  .oc-rdv { display: inline-flex; align-items: center; justify-content: center; gap: 10px; text-decoration: none; }
  .oc-besoins { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; align-items: stretch; }
  .oc-panel { position: relative; overflow: hidden; padding: 28px; border-radius: 22px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 18%, #111) 0%, #111 52%); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); transition: transform .2s, border-color .2s; }
  .oc-panel:hover { transform: translateY(-4px); border-color: var(--c); }
  .oc-ligne { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-top: 1px solid rgba(255,255,255,0.07); font-size: 14px; line-height: 1.5; color: #d4d4d8; }
  @media (max-width: 760px) { .oc-besoins { grid-template-columns: 1fr; } .oc-panel { padding: 22px; } }
  @media (max-width: 700px) { .oc-guide { flex-direction: column; align-items: flex-start; gap: 16px; } .oc-contact { padding: 22px; } }
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
    <section id="offre-club" style={{ position: 'relative', overflow: 'hidden', fontFamily: police, borderTop: '1px solid #1a2a1a', scrollMarginTop: 60 }}>
      <style>{CSS}</style>
      <div className="oc-photo" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${PHOTO_CLUB}")`, backgroundPosition: 'center 30%', filter: TRAITEMENT_PHOTO }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.62) 45%, #0a0a0a 100%), radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.22), transparent 60%)' }} />
      <TraitsTerrain style={{ left: '50%', top: '50%', width: 'min(1100px, 130%)', transform: 'translate(-50%, -50%)' }} />
      <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto', padding: 'clamp(72px, 12vw, 140px) 24px clamp(64px, 10vw, 110px)', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: colors.accent.green + '22', border: '1px solid #4ade8055', color: colors.accent.green, fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '5px 16px', borderRadius: 999, marginBottom: 22 }}>Offre Club</span>
        <h2 style={{ fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 'clamp(46px, 9vw, 92px)', fontWeight: 800, lineHeight: 0.98, letterSpacing: '0.5px', color: '#fff', margin: '0 0 22px', textShadow: '0 2px 24px rgba(0,0,0,0.6)' }}>
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
  ['En semaine', 'Les entraînements', 'Planning interactif, séances préparées par chaque éducateur et partagées dans la bibliothèque du club, présences suivies, et le RPE : l\'effort ressenti et le plaisir de chaque joueur après la séance.', colors.accent.blue],
  ['Chaque semaine', 'Les terrains', 'Les créneaux de chaque terrain répartis entre les équipes, à partir de votre fichier existant grâce à l\'IA.', colors.accent.cyan],
  ['Avant le match', 'Les convocations', 'Convocations officielles et organisation de chaque rencontre, sans courir après personne.', colors.accent.purpleLight],
  ['Le week-end', 'Les matchs', 'Causerie d\'avant-match interactive, résultats, statistiques collectives et individuelles de chaque équipe, classement à jour.', colors.accent.green],
  ['Sur la route', 'Les déplacements', 'Les trajets des matchs à l\'extérieur organisés par l\'IA, sans tableau à refaire chaque week-end.', colors.accent.orange],
  ['Les recettes du club', 'Tournois & stages', 'Inscriptions en ligne pour vos stages, poules, calendrier et classement en direct pour vos tournois. Tout s\'organise au même endroit, et ces événements font rentrer des recettes au club.', colors.accent.amber],
  ['La vision', 'Le projet sportif', 'Les principes de jeu du club, définis par phase et partagés avec vos éducateurs.', '#f472b6'],
  ['En coulisses', 'Le club', 'Budget, sponsors, inventaire du matériel, événements et projets, au même endroit.', '#94a3b8'],
]

export function SemaineClub() {
  return (
    <section id="vie-club" style={{ position: 'relative', background: '#0a0a0a', padding: 'clamp(56px, 8vw, 96px) 24px', fontFamily: police, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <TraitsTerrain style={{ right: '-120px', top: '40px', width: 640, opacity: 0.6 }} />
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.green }}>La vie de votre club</p>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', color: '#fff' }}>Une semaine dans votre club</h3>
        <p style={{ margin: '0 auto 44px', textAlign: 'center', maxWidth: 560, fontSize: 15, lineHeight: 1.6, color: colors.text.dim }}>
          Chaque moment du club a son outil : de l'entraînement de la semaine aux tournois de la saison. Plus de messages éparpillés, de fichiers perdus ni de tableaux à ressaisir.
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
  // Promos en cours (mensuelle et/ou annuelle), déclarées dans lib/promo.js.
  const promos = promosActives()
  const pm = promos.find(p => p.mode === 'mensuel')
  const pa = promos.find(p => p.mode === 'annuel')
  const codes = [...new Set(promos.map(p => p.code).filter(Boolean))]
  return (
    <section id="tarifs-club" style={{ position: 'relative', overflow: 'hidden', fontFamily: police, padding: 'clamp(56px, 8vw, 96px) 24px' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.10), transparent 55%), #0a0a0a' }} />
      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.green }}>Tarifs club</p>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', color: '#fff' }}>Un tarif selon la taille de votre club</h3>
        <p style={{ margin: '0 auto 14px', textAlign: 'center', maxWidth: 560, fontSize: 15, lineHeight: 1.6, color: colors.text.secondary }}>
          Choisissez le palier adapté au nombre d'équipes de votre club. Paiement sécurisé, accès immédiat.
        </p>
        <p style={{ margin: '0 0 40px', textAlign: 'center' }}>
          <span className="oc-chip">Tous les outils du club sont inclus dans chaque palier</span>
        </p>
        {promos.length > 0 && (
          <p style={{ margin: '-24px 0 40px', textAlign: 'center' }}>
            <span className="oc-chip" style={{ color: 'rgba(255,255,255,0.85)', display: 'inline-block', textAlign: 'center', lineHeight: 1.6 }}>
              Offre de lancement :{' '}
              {promos.map((p, i) => (
                <span key={p.mode}>
                  {i > 0 && ' · '}
                  <span style={{ color: '#f87171', fontWeight: 800 }}>-{p.pourcent} %</span>{' '}
                  {p.mode === 'mensuel' ? `${(p.mois ?? 1) > 1 ? `sur les ${p.mois} premiers mois` : 'sur le 1er mois'} en mensuel` : 'en annuel'}
                </span>
              ))}
              {codes.length > 0 && `, code ${codes.join(' ou ')}`}{', jusqu\'au '}{PROMO_FIN.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </span>
          </p>
        )}

        <div className="oc-grille" style={{ marginBottom: 28 }}>
          {Object.entries(STRIPE_LINKS_CLUB).map(([cle, p]) => {
            const mensuel = prixDepuisTexte(p.mensuelPrix)
            const annuel = prixDepuisTexte(p.annuelPrix)
            const annuelPromo = pa ? coutPremiereAnnee({ mois: mensuel, an: annuel }, 'annuel') : annuel
            const economie = Math.round(mensuel * 12 - annuelPromo)
            const prixRemise = (prix, pourcent) => String(Math.round(prix * (100 - pourcent)) / 100).replace('.', ',')
            const nb = (p.label.match(/\d+/) || [])[0]
            return (
              <div key={cle} className="oc-palier">
                <TraitsTerrain style={{ right: -60, bottom: -50, width: 260 }} />
                <p style={{ position: 'relative', margin: '0 0 2px', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint }}>Jusqu'à</p>
                <p style={{ position: 'relative', margin: '0 0 18px', fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 40, fontWeight: 800, letterSpacing: '0.5px', color: '#fff', lineHeight: 1 }}>
                  {nb ? <>{nb} <span style={{ fontSize: 18, fontWeight: 700, color: colors.text.secondary }}>équipes</span></> : p.label}
                </p>
                <p style={{ position: 'relative', margin: '0 0 2px', fontSize: 34, fontWeight: 900, letterSpacing: '-1px', color: colors.accent.green, lineHeight: 1.1 }}>
                  {annuelPromo} €<span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0, color: colors.text.faint }}> par an</span>
                  {pa && <span style={{ fontSize: 14, fontWeight: 400, letterSpacing: 0, textDecoration: 'line-through', color: colors.text.faint, marginLeft: 8 }}>{annuel} €</span>}
                  {pa && <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0, color: '#f87171', marginLeft: 8 }}>-{pa.pourcent} %</span>}
                </p>
                <p style={{ position: 'relative', margin: '0 0 20px', fontSize: 12, color: colors.text.faint, minHeight: 18 }}>
                  {economie > 0 ? `${economie} € de moins que 12 mensualités` : ''}
                </p>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  <button className="oc-btn" onClick={() => naviguer(cle, 'annuel')} style={{ border: 'none', background: colors.accent.green, color: colors.background.base }}>
                    Commencer à {annuelPromo} €/an
                  </button>
                  <button className="oc-btn" onClick={() => naviguer(cle, 'mensuel')} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(10,10,10,0.85)', color: '#fff', fontWeight: 700 }}>
                    {pm
                      ? <>{prixRemise(mensuel, pm.pourcent)} € {(pm.mois ?? 1) > 1 ? `les ${pm.mois} premiers mois` : 'le 1er mois'} <span style={{ textDecoration: 'line-through', color: colors.text.faint, fontWeight: 400, marginLeft: 6 }}>{mensuel} €</span> <span style={{ color: '#f87171', fontWeight: 800, marginLeft: 6 }}>-{pm.pourcent} %</span></>
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

// Icône dans un rond de couleur (pièce, calendrier).
function IconeRonde({ couleur, children }) {
  return (
    <span aria-hidden="true" style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: couleur + '22', border: `1px solid ${couleur}66`, color: couleur }}>
      {children}
    </span>
  )
}

const PISTES = ['Licences', 'Sponsoring local', 'Aides publiques', 'Tournoi']

// Carte du guide de financement : la page /comment-financer détaille six pistes
// avec le calcul selon le palier du club.
export function BlocGuide({ onClick }) {
  return (
    <button type="button" className="oc-guide" onClick={onClick}>
      <IconeRonde couleur={colors.accent.green}>
        <span style={{ fontFamily: POLICE_TITRE, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>€</span>
      </IconeRonde>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 30, fontWeight: 800, lineHeight: 1.05, letterSpacing: '0.5px', marginBottom: 6 }}>Comment financer l'abonnement de votre club ?</span>
        <span style={{ display: 'block', fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.82)', marginBottom: 12 }}>
          Six pistes concrètes, avec le calcul selon votre palier.
        </span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PISTES.map(p => <span key={p} className="oc-chip" style={{ padding: '5px 12px', fontSize: 12 }}>{p}</span>)}
        </span>
      </span>
      <span className="oc-btn" style={{ flexShrink: 0, background: colors.accent.green, color: colors.background.base, padding: '14px 22px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        Voir le guide <span aria-hidden="true">→</span>
      </span>
    </button>
  )
}

// Encadré « Prendre contact » : accroche, rendez-vous Calendly, formulaire (children).
export function BlocContact({ children }) {
  return (
    <div className="oc-contact" style={{ fontFamily: police }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <IconeRonde couleur={colors.accent.purpleLight}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
        </IconeRonde>
        <div>
          <p style={{ margin: 0, fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', color: '#fff' }}>Parlons de votre club</p>
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>Une question avant de vous lancer, ou besoin d'organiser votre démarrage ? Notre équipe est là.</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// Boutons de départ du bloc contact. Avec un lien Calendly : rendez-vous en un clic
// (nouvel onglet). Sans lien : formulaire de disponibilités, pour qu'aucun bouton ne reste muet.
export function BoutonsContact({ calendlyUrl, onDemarrage, onQuestion }) {
  const principal = { border: 'none', background: colors.accent.purpleLight, color: '#0a0a0a', padding: '15px 26px', fontSize: 15 }
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {calendlyUrl ? (
          <a className="oc-btn oc-rdv" href={calendlyUrl} target="_blank" rel="noopener noreferrer" style={principal}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
            Réserver un créneau
          </a>
        ) : (
          <button type="button" className="oc-btn" onClick={onDemarrage} style={principal}>Planifier mon démarrage</button>
        )}
        <button type="button" className="oc-btn" onClick={onQuestion} style={{ border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '15px 26px', fontSize: 15 }}>Poser une question</button>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: colors.text.faint }}>Réponse sous 24 h.</p>
    </div>
  )
}

// Tout ce que le club trouve dans chaque palier, en quatre familles.
const BESOINS = [
  { Icon: IconTool, titre: 'Administration', couleur: colors.accent.purpleLight, items: ["Vue d'ensemble du club en temps réel", 'Organigramme complet (joueurs, éducateurs, parents)', 'Gestion du budget du club', 'Gestion des sponsors', 'Inventaire matériel', "Création d'événements et de projets"] },
  { Icon: IconBall, titre: 'Équipes & joueurs', couleur: colors.accent.green, items: ['Gestion multi-équipes centralisée', 'Stats individuelles de chaque joueur', 'Stats collectives de chaque équipe', 'Organisation équipement éducateurs & joueurs', 'Planning interactif (matchs, entraînements, événements)', 'Bibliothèque de séances partagée entre vos éducateurs', 'Gestion des accès staff configurable'] },
  { Icon: IconChart, titre: 'Dashboards inclus', couleur: colors.accent.blue, items: ['Dashboard éducateur complet (tous outils)', 'Dashboard joueur gratuit pour tous', 'Dashboard dirigeant en accès gratuit', 'Dashboard parents'] },
  { Icon: IconBolt, titre: 'Intelligence artificielle', couleur: colors.accent.orange, items: ['Organisation des déplacements par IA', 'Import de planning terrain par IA (à partir de votre fichier existant)'] },
]

export function BesoinsClub() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: '#0d0d0d', padding: 'clamp(56px, 8vw, 96px) 24px', fontFamily: police }}>
      <style>{CSS}</style>
      <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.accent.green }}>Tout est inclus</p>
        <h3 style={{ margin: '0 0 12px', textAlign: 'center', fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', color: '#fff' }}>Tout ce dont votre club a besoin</h3>
        <p style={{ margin: '0 auto 44px', textAlign: 'center', maxWidth: 520, fontSize: 15, lineHeight: 1.6, color: colors.text.dim }}>Quatre familles d'outils, toutes incluses dans chaque palier.</p>
        <div className="oc-besoins">
          {BESOINS.map(({ Icon, titre, couleur, items }, i) => (
            <div key={titre} className="oc-panel" style={{ '--c': couleur }}>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: -14, right: 18, fontFamily: POLICE_TITRE, fontSize: 96, fontWeight: 800, lineHeight: 1, color: couleur, opacity: 0.14, pointerEvents: 'none' }}>{`0${i + 1}`}</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <IconeRonde couleur={couleur}><Icon size={26} /></IconeRonde>
                <h4 style={{ margin: 0, fontFamily: POLICE_TITRE, textTransform: 'uppercase', fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', color: '#fff' }}>{titre}</h4>
              </div>
              <div style={{ position: 'relative' }}>
                {items.map(item => (
                  <div key={item} className="oc-ligne">
                    <span style={{ color: couleur, flexShrink: 0, display: 'inline-flex', marginTop: 3 }}><IconCheck size={15} /></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
