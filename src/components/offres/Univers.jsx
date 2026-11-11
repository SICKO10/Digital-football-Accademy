import { colors } from '../../tokens'
import { PALIERS_EDUCATEUR } from '../../lib/catalogueOutils'
import { STRIPE_LINKS_CLUB } from '../../lib/stripeLinks'
import { PHOTOS, TRAITEMENT_PHOTO, POLICE_TITRE } from '../../lib/photosOffres'

// Les trois univers de la page Offres (joueur, éducateur, club) : photos seulement en
// fond des introductions, jamais derrière les cartes de tarifs.
const police = 'Inter, sans-serif'
const aller = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

const CSS = `
  .ou-choix { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; max-width: 960px; margin: 0 auto; }
  .ou-tuile { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; min-height: 235px; padding: 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: left; cursor: pointer; font-family: ${police}; color: #fff; background: #111; transition: transform .2s, border-color .2s; }
  .ou-tuile:hover { transform: translateY(-4px); border-color: var(--c); }
  .ou-tuile:focus-visible { outline: 2px solid var(--c); outline-offset: 2px; }
  @media (max-width: 760px) { .ou-choix { grid-template-columns: 1fr; } .ou-tuile { min-height: 200px; } }
`

// Choix rapide en haut de page : trois tuiles photo, chacune mène à son offre.
export function ChoixUnivers() {
  const tuiles = [
    { id: 'joueurs', photo: PHOTOS.joueur, pos: 'center 40%', couleur: colors.accent.green, role: 'Joueur', titre: 'Je progresse', texte: 'Analyse-toi, dépasse-toi, performe.', prix: 'Gratuit pour commencer' },
    { id: 'educateurs', photo: PHOTOS.educateur, pos: '45% 30%', couleur: colors.accent.blue, role: 'Éducateur', titre: 'J\'entraîne', texte: 'Prépare tes séances, suis tes joueurs, gère ton équipe.', prix: `À partir de ${PALIERS_EDUCATEUR[0].prixMensuel} €/mois` },
    { id: 'offre-club', photo: PHOTOS.club, pos: 'center 35%', couleur: colors.accent.purpleLight, role: 'Club', titre: 'Je dirige un club', texte: 'Réunis éducateurs, joueurs, dirigeants et parents.', prix: `À partir de ${STRIPE_LINKS_CLUB.c0.annuelPrix.replace('€', ' €')}` },
  ]
  return (
    <div className="ou-choix">
      <style>{CSS}</style>
      {tuiles.map(t => (
        <button key={t.id} type="button" className="ou-tuile" style={{ '--c': t.couleur }} onClick={() => aller(t.id)}>
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${t.photo}")`, backgroundSize: 'cover', backgroundPosition: t.pos, filter: TRAITEMENT_PHOTO }} />
          <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,8,0.35) 0%, rgba(8,8,8,0.62) 38%, rgba(8,8,8,0.96) 100%)' }} />
          <span style={{ position: 'relative', alignSelf: 'flex-start', marginBottom: 'auto', background: t.couleur, color: '#0a0a0a', fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 999 }}>{t.role}</span>
          <span style={{ position: 'relative', fontFamily: POLICE_TITRE, fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '0.5px', textTransform: 'uppercase', textShadow: '0 2px 14px rgba(0,0,0,0.7)', margin: '14px 0 8px' }}>{t.titre}</span>
          <span style={{ position: 'relative', fontSize: 14, lineHeight: 1.5, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.8)', marginBottom: 14, minHeight: 42 }}>{t.texte}</span>
          <span style={{ position: 'relative', alignSelf: 'flex-start', fontSize: 13, fontWeight: 800, color: t.couleur, background: 'rgba(0,0,0,0.6)', border: `1px solid ${t.couleur}66`, padding: '7px 14px', borderRadius: 999 }}>{t.prix}  →</span>
        </button>
      ))}
    </div>
  )
}

// Introduction photo d'une offre : titre fort, courte description, fondu vers
// le fond de la section qui suit (`fondSuite`) pour une transition naturelle.
export function BandeauUnivers({ id, photo, position = 'center', couleur, eyebrow, titre, texte, fondSuite = '#0a0a0a', cote = 'gauche' }) {
  const droite = cote === 'droite'
  return (
    <section id={id} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', minHeight: 'clamp(300px, 36vw, 400px)', fontFamily: police, scrollMarginTop: 60 }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${photo}")`, backgroundSize: 'cover', backgroundPosition: position, filter: TRAITEMENT_PHOTO }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: `linear-gradient(${droite ? 270 : 90}deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.55) 55%, rgba(10,10,10,0.2) 100%), linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0) 45%, ${fondSuite} 100%)` }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', padding: '64px 24px 44px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: droite ? 'flex-end' : 'flex-start', textAlign: droite ? 'right' : 'left' }}>
        <span style={{ display: 'inline-block', background: couleur, color: '#0a0a0a', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 999, marginBottom: 14 }}>{eyebrow}</span>
        <h2 style={{ margin: '0 0 14px', maxWidth: droite ? 540 : 900, whiteSpace: 'pre-line', fontFamily: POLICE_TITRE, fontSize: 'clamp(40px, 7vw, 70px)', fontWeight: 800, lineHeight: 0.98, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>{titre}</h2>
        <p style={{ margin: 0, maxWidth: 540, fontSize: 'clamp(15px, 2vw, 17px)', lineHeight: 1.6, color: '#fff', textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>{texte}</p>
      </div>
    </section>
  )
}
