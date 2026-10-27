import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStagePublic, loguerVueStage, loguerClicSponsorStage } from '../lib/stagesPublic'
import EcranEtatStage from '../components/stages/EcranEtatStage'
import { formatDate, formatJourCourt, heure, euros, detailOffre } from '../lib/stages'

// Page publique d'un stage (parents, joueurs) — accessible sans compte.
// Toutes les données passent par la fonction stage_public(lien) : uniquement
// les champs publics, uniquement pour un stage publié. Aucune lecture
// directe des tables. Mise en forme : en-tête visuel (photo du stage),
// onglets fixes, programme jour par jour, galerie plein écran.

const CSS = `
  .sp { --accent: #4ade80; background: #070707; min-height: 100vh; color: #f4f4f5; font-family: Inter, system-ui, sans-serif; }
  .sp a { color: inherit; }
  .sp-hero { position: relative; min-height: 440px; display: flex; align-items: flex-end; background-size: cover; background-position: center 30%; }
  .sp-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,7,7,.25) 0%, rgba(7,7,7,.55) 45%, #070707 100%); }
  .sp-hero-inner { position: relative; z-index: 1; width: 100%; max-width: 980px; margin: 0 auto; padding: 32px 24px 36px; box-sizing: border-box; }
  .sp-club { display: inline-flex; align-items: center; gap: 10px; padding: 6px 12px 6px 6px; border-radius: 999px; background: rgba(255,255,255,.08); backdrop-filter: blur(8px); font-size: 13px; font-weight: 700; }
  .sp-club img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; background: #fff; }
  .sp-statut { display: inline-block; margin-left: 10px; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; background: var(--accent); color: #070707; }
  .sp-titre { font-size: 52px; line-height: 1.04; font-weight: 900; letter-spacing: -.02em; margin: 18px 0 14px; max-width: 760px; }
  .sp-meta { display: flex; flex-wrap: wrap; gap: 8px; }
  .sp-chip { padding: 8px 14px; border-radius: 12px; background: rgba(255,255,255,.08); backdrop-filter: blur(8px); font-size: 13px; color: #e4e4e7; }
  .sp-chip strong { color: #fff; }
  .sp-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
  .sp-cta { display: inline-flex; align-items: center; padding: 14px 26px; border-radius: 14px; background: var(--accent); color: #070707 !important; font-weight: 800; font-size: 15px; text-decoration: none; box-shadow: 0 10px 30px -10px var(--accent); transition: transform .15s; }
  .sp-cta:hover { transform: translateY(-2px); }
  .sp-cta-2 { display: inline-flex; align-items: center; padding: 14px 22px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); font-weight: 700; font-size: 14px; background: transparent; color: #fff; cursor: pointer; font-family: inherit; }
  .sp-tabs { position: sticky; top: 0; z-index: 5; background: rgba(7,7,7,.86); backdrop-filter: blur(12px); border-bottom: 1px solid #18181b; }
  .sp-tabs-inner { max-width: 980px; margin: 0 auto; padding: 10px 24px; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
  .sp-tabs-inner::-webkit-scrollbar { display: none; }
  .sp-tab { flex-shrink: 0; padding: 9px 16px; border-radius: 999px; border: 1px solid #27272a; background: transparent; color: #a1a1aa; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .sp-tab.actif { background: #fff; color: #070707; border-color: #fff; }
  .sp-main { max-width: 980px; margin: 0 auto; padding: 28px 24px 56px; box-sizing: border-box; }
  .sp-section { margin-top: 40px; }
  .sp-section:first-child { margin-top: 8px; }
  .sp-h2 { font-size: 22px; font-weight: 900; letter-spacing: -.01em; margin: 0 0 6px; }
  .sp-sous { color: #a1a1aa; font-size: 14px; margin: 0 0 18px; }
  .sp-texte { color: #d4d4d8; font-size: 15px; line-height: 1.75; white-space: pre-line; margin: 0; }
  .sp-grille { display: grid; gap: 12px; }
  .sp-offres { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  .sp-offre { position: relative; padding: 20px; border-radius: 18px; background: linear-gradient(160deg, #141416, #0d0d0f); border: 1px solid #1f1f23; overflow: hidden; }
  .sp-offre::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--accent); opacity: .9; }
  .sp-offre-nom { font-size: 14px; font-weight: 700; color: #d4d4d8; }
  .sp-offre-prix { font-size: 32px; font-weight: 900; margin: 6px 0 2px; letter-spacing: -.02em; }
  .sp-offre-detail { font-size: 12px; color: #a1a1aa; }
  .sp-repas { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .sp-places { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .sp-place { padding: 12px 14px; border-radius: 14px; background: #0f0f11; border: 1px solid #1f1f23; }
  .sp-jauge { height: 6px; border-radius: 3px; background: #27272a; margin-top: 8px; overflow: hidden; }
  .sp-jauge span { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
  .sp-jours { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
  .sp-jours::-webkit-scrollbar { display: none; }
  .sp-jour { flex-shrink: 0; min-width: 76px; padding: 10px 12px; border-radius: 14px; border: 1px solid #27272a; background: #0f0f11; color: #a1a1aa; cursor: pointer; text-align: center; font-family: inherit; }
  .sp-jour strong { display: block; font-size: 20px; color: #fff; line-height: 1.1; }
  .sp-jour span { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .sp-jour.actif { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, #0f0f11); color: var(--accent); }
  .sp-frise { position: relative; margin-top: 18px; padding-left: 22px; }
  .sp-frise::before { content: ''; position: absolute; left: 6px; top: 6px; bottom: 6px; width: 2px; background: #1f1f23; }
  .sp-creneau { position: relative; display: grid; grid-template-columns: 96px 1fr; gap: 14px; padding: 12px 0; }
  .sp-creneau::before { content: ''; position: absolute; left: -21px; top: 18px; width: 12px; height: 12px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px #070707; }
  .sp-heure { font-size: 13px; font-weight: 800; color: #e4e4e7; padding-top: 2px; }
  .sp-activite { padding: 12px 14px; border-radius: 14px; background: #0f0f11; border: 1px solid #1f1f23; }
  .sp-activite strong { font-size: 15px; }
  .sp-activite div { font-size: 13px; color: #a1a1aa; margin-top: 2px; }
  .sp-deux { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
  .sp-carte { padding: 22px; border-radius: 18px; background: #0f0f11; border: 1px solid #1f1f23; }
  .sp-carte h3 { margin: 0 0 10px; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
  .sp-news { display: grid; gap: 18px; }
  .sp-new { border-radius: 20px; overflow: hidden; background: #0f0f11; border: 1px solid #1f1f23; }
  .sp-new img { width: 100%; max-height: 460px; object-fit: cover; display: block; cursor: zoom-in; }
  .sp-new-corps { padding: 18px 20px 20px; }
  .sp-date { font-size: 12px; color: #a1a1aa; text-transform: capitalize; }
  .sp-new h3 { margin: 6px 0 8px; font-size: 20px; font-weight: 900; letter-spacing: -.01em; }
  .sp-galerie { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
  .sp-galerie button { position: relative; padding: 0; border: 0; border-radius: 14px; overflow: hidden; cursor: zoom-in; aspect-ratio: 1; background: #111; }
  .sp-galerie img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
  .sp-galerie button:hover img { transform: scale(1.05); }
  .sp-objets { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .sp-objet { border-radius: 16px; overflow: hidden; background: #0f0f11; border: 1px solid #1f1f23; }
  .sp-objet img { width: 100%; height: 170px; object-fit: cover; display: block; }
  .sp-objet div { padding: 12px 14px; }
  .sp-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #facc15; border: 1px solid #facc1555; border-radius: 6px; padding: 2px 7px; margin-bottom: 6px; }
  .sp-partenaires { margin-top: 56px; padding: 28px 24px; border-radius: 22px; background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%), #0c0c0e; border: 1px solid #1f1f23; text-align: center; }
  .sp-logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin-top: 18px; }
  .sp-logo { width: 150px; text-decoration: none; }
  .sp-logo-img { height: 76px; border-radius: 14px; background: #fff; display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; transition: transform .15s; }
  .sp-logo:hover .sp-logo-img { transform: translateY(-3px); }
  .sp-logo-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .sp-logo-nom { margin-top: 8px; font-size: 12px; font-weight: 700; color: #d4d4d8; }
  .sp-logo-msg { font-size: 11px; color: #a1a1aa; margin-top: 2px; }
  .sp-pied { text-align: center; color: #52525b; font-size: 12px; padding: 0 0 36px; }
  .sp-lightbox { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,.92); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .sp-lightbox img { max-width: 100%; max-height: 86vh; border-radius: 12px; }
  .sp-lb-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: 0; background: rgba(255,255,255,.12); color: #fff; font-size: 22px; cursor: pointer; }
  .sp-lb-fermer { position: absolute; top: 18px; right: 18px; padding: 10px 16px; border-radius: 999px; border: 0; background: rgba(255,255,255,.12); color: #fff; font-weight: 700; cursor: pointer; font-family: inherit; }
  .sp-lb-legende { position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; color: #d4d4d8; font-size: 14px; }
  @media (max-width: 640px) {
    .sp-hero { min-height: 380px; }
    .sp-hero-inner { padding: 24px 16px 28px; }
    .sp-titre { font-size: 34px; }
    .sp-tabs-inner, .sp-main { padding-left: 16px; padding-right: 16px; }
    .sp-creneau { grid-template-columns: 74px 1fr; gap: 10px; }
    .sp-lb-btn { display: none; }
  }
`

const dateHeure = (iso) => new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export default function StagePublic() {
  const { lien } = useParams()
  const { stage, etat } = useStagePublic(lien)
  const [onglet, setOnglet] = useState('programme')
  const [jourActif, setJourActif] = useState(null)
  const [photoOuverte, setPhotoOuverte] = useState(null)

  // Une vue par chargement de page réussi (pas à chaque re-render) — compte
  // l'audience exposée à la section sponsors ci-dessous, cf. stats_sponsors_phase1.
  useEffect(() => {
    if (etat === 'ok') loguerVueStage(lien)
  }, [etat, lien])

  const posts = stage?.posts || []
  const photos = posts.filter(p => p.image_url && (p.type === 'photo' || p.type === 'actualite'))

  useEffect(() => {
    if (photoOuverte === null) return
    const touche = (e) => {
      if (e.key === 'Escape') setPhotoOuverte(null)
      if (e.key === 'ArrowRight') setPhotoOuverte(i => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setPhotoOuverte(i => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [photoOuverte, photos.length])

  if (etat !== 'ok') return <EcranEtatStage etat={etat} />

  const accent = stage.club_couleur || '#4ade80'
  const jours = stage.jours || []
  const offres = stage.offres || []
  const formules = stage.formules_repas || []
  const actualites = posts.filter(p => p.type === 'actualite')
  const objets = posts.filter(p => p.type === 'objet_perdu')
  const sponsors = stage.sponsors || []
  const planningParJour = (stage.planning || []).reduce((acc, c) => { (acc[c.date] = acc[c.date] || []).push(c); return acc }, {})
  const joursProgramme = Object.keys(planningParJour).sort()
  const jourAffiche = jourActif && planningParJour[jourActif] ? jourActif : joursProgramme[0]
  const couverture = stage.image_url || photos[0]?.image_url
  const inscriptionPossible = stage.statut === 'ouvert' && offres.length > 0 && jours.some(j => j.places_restantes > 0)
  const statutLibelle = { ouvert: 'Inscriptions ouvertes', complet: 'Complet', termine: 'Terminé' }[stage.statut]
  const prixMin = offres.length ? Math.min(...offres.map(o => Number(o.prix))) : null
  const periode = stage.date_debut === stage.date_fin
    ? formatDate(stage.date_debut, { weekday: 'long', day: 'numeric', month: 'long' })
    : `${formatDate(stage.date_debut, { day: 'numeric', month: 'long' })} → ${formatDate(stage.date_fin, { day: 'numeric', month: 'long' })}`
  const ONGLETS = [
    ['programme', 'Le stage'],
    ...(actualites.length ? [['actualites', 'Actualités']] : []),
    ...(photos.length ? [['photos', `Photos · ${photos.length}`]] : []),
    ...(objets.length ? [['objets', `Objets oubliés · ${objets.length}`]] : []),
  ]
  const allerA = (id) => { setOnglet(id); window.scrollTo({ top: document.querySelector('.sp-tabs')?.offsetTop || 0, behavior: 'smooth' }) }
  const ouvrirPhoto = (url) => { const i = photos.findIndex(p => p.image_url === url); if (i >= 0) setPhotoOuverte(i) }

  return (
    <div className="sp" style={{ '--accent': accent }}>
      <style>{CSS}</style>

      <header className="sp-hero" style={{ backgroundImage: couverture ? `url(${couverture})` : `radial-gradient(120% 120% at 20% 0%, ${accent}55, #070707 70%)` }}>
        <div className="sp-hero-inner">
          <div>
            <span className="sp-club">{stage.club_avatar && <img src={stage.club_avatar} alt="" />}{stage.club_nom || 'Club'}</span>
            {statutLibelle && <span className="sp-statut">{statutLibelle}</span>}
          </div>
          <h1 className="sp-titre">{stage.nom}</h1>
          <div className="sp-meta">
            <span className="sp-chip" style={{ textTransform: 'capitalize' }}><strong>{periode}</strong></span>
            {stage.lieu && <span className="sp-chip">{stage.lieu}</span>}
            {prixMin !== null && <span className="sp-chip">À partir de <strong>{euros(prixMin)}</strong></span>}
          </div>
          <div className="sp-actions">
            {inscriptionPossible && <Link to={`/stage/${lien}/inscription`} className="sp-cta">Inscrire mon enfant</Link>}
            {joursProgramme.length > 0 && <button className="sp-cta-2" onClick={() => allerA('programme')}>Voir le programme</button>}
          </div>
        </div>
      </header>

      {ONGLETS.length > 1 && (
        <nav className="sp-tabs">
          <div className="sp-tabs-inner">
            {ONGLETS.map(([id, label]) => <button key={id} className={`sp-tab${onglet === id ? ' actif' : ''}`} onClick={() => allerA(id)}>{label}</button>)}
          </div>
        </nav>
      )}

      <main className="sp-main">
        {onglet === 'programme' && (
          <>
            {stage.description && (
              <section className="sp-section">
                <p className="sp-texte" style={{ fontSize: 17 }}>{stage.description}</p>
              </section>
            )}

            {offres.length > 0 && (
              <section className="sp-section">
                <h2 className="sp-h2">Tarifs</h2>
                <p className="sp-sous">Choisis la formule qui convient, les jours se sélectionnent à l'inscription.</p>
                <div className="sp-grille sp-offres">
                  {offres.map(o => (
                    <div key={o.id} className="sp-offre">
                      <div className="sp-offre-nom">{o.nom}</div>
                      <div className="sp-offre-prix">{euros(o.prix)}{o.type === 'journee' && <span style={{ fontSize: 14, fontWeight: 700, color: '#a1a1aa' }}> / jour</span>}</div>
                      <div className="sp-offre-detail">{detailOffre(o, jours.length).split(' · ').slice(1).join(' · ') || detailOffre(o, jours.length)}</div>
                    </div>
                  ))}
                </div>
                {formules.length > 0 && (
                  <div className="sp-repas">
                    {formules.map(f => <span key={f.id} className="sp-chip" style={{ background: '#0f0f11', border: '1px solid #1f1f23' }}>Repas · <strong>{f.nom}</strong> {Number(f.prix_jour) > 0 ? `· ${euros(f.prix_jour)} / jour` : '· sans supplément'}</span>)}
                  </div>
                )}
              </section>
            )}

            {stage.statut === 'ouvert' && jours.length > 0 && (
              <section className="sp-section">
                <h2 className="sp-h2">Places disponibles</h2>
                <p className="sp-sous">Les places se comptent jour par jour.</p>
                <div className="sp-grille sp-places">
                  {jours.map(j => {
                    const pris = Math.max(stage.places_max - j.places_restantes, 0)
                    return (
                      <div key={j.date} className="sp-place">
                        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{formatJourCourt(j.date)}</div>
                        <div style={{ fontSize: 12, color: j.places_restantes > 0 ? '#a1a1aa' : '#f87171', marginTop: 2 }}>{j.places_restantes > 0 ? `${j.places_restantes} place${j.places_restantes > 1 ? 's' : ''} restante${j.places_restantes > 1 ? 's' : ''}` : 'Complet'}</div>
                        <div className="sp-jauge"><span style={{ width: `${Math.min(100, (pris / stage.places_max) * 100)}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {joursProgramme.length > 0 && (
              <section className="sp-section">
                <h2 className="sp-h2">Programme</h2>
                <p className="sp-sous">Sélectionne une journée.</p>
                <div className="sp-jours">
                  {joursProgramme.map(j => {
                    const d = formatDate(j, { weekday: 'short' }).replace('.', '')
                    const n = formatDate(j, { day: 'numeric' })
                    const m = formatDate(j, { month: 'short' }).replace('.', '')
                    return <button key={j} className={`sp-jour${jourAffiche === j ? ' actif' : ''}`} onClick={() => setJourActif(j)}><span>{d}</span><strong>{n}</strong><span>{m}</span></button>
                  })}
                </div>
                <div className="sp-frise">
                  {(planningParJour[jourAffiche] || []).map((c, i) => (
                    <div key={i} className="sp-creneau" style={{ '--c': c.couleur || accent }}>
                      <div className="sp-heure">{heure(c.heure_debut)}<div style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>{heure(c.heure_fin)}</div></div>
                      <div className="sp-activite" style={{ borderLeft: `3px solid ${c.couleur || accent}` }}>
                        <strong>{c.activite}</strong>
                        {(c.groupe || c.lieu || c.responsable) && <div>{[c.groupe, c.lieu, c.responsable && `avec ${c.responsable}`].filter(Boolean).join(' · ')}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(stage.liste_materiel || stage.reglement) && (
              <section className="sp-section">
                <div className="sp-grille sp-deux">
                  {stage.liste_materiel && <div className="sp-carte"><h3>À prévoir dans le sac</h3><p className="sp-texte">{stage.liste_materiel}</p></div>}
                  {stage.reglement && <div className="sp-carte"><h3>Règlement</h3><p className="sp-texte" style={{ fontSize: 14 }}>{stage.reglement}</p></div>}
                </div>
              </section>
            )}
          </>
        )}

        {onglet === 'actualites' && (
          <section className="sp-section sp-news">
            {actualites.map((p, i) => (
              <article key={i} className="sp-new">
                {p.image_url && <img src={p.image_url} alt="" loading="lazy" onClick={() => ouvrirPhoto(p.image_url)} />}
                <div className="sp-new-corps">
                  <div className="sp-date">{dateHeure(p.created_at)}</div>
                  {p.titre && <h3>{p.titre}</h3>}
                  {p.contenu && <p className="sp-texte">{p.contenu}</p>}
                </div>
              </article>
            ))}
          </section>
        )}

        {onglet === 'photos' && (
          <section className="sp-section">
            <div className="sp-galerie">
              {photos.map((p, i) => (
                <button key={i} onClick={() => setPhotoOuverte(i)} aria-label={p.titre || 'Agrandir la photo'}>
                  <img src={p.image_url} alt={p.titre || ''} loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {onglet === 'objets' && (
          <section className="sp-section">
            <h2 className="sp-h2">Objets oubliés</h2>
            <p className="sp-sous">Retrouvés sur le stage : adresse-toi à l'équipe d'encadrement pour les récupérer.</p>
            <div className="sp-grille sp-objets">
              {objets.map((p, i) => (
                <div key={i} className="sp-objet">
                  {p.image_url && <img src={p.image_url} alt="" loading="lazy" />}
                  <div>
                    <span className="sp-badge">À récupérer</span>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{p.titre}</div>
                    {p.contenu && <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 2 }}>{p.contenu}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {sponsors.length > 0 && (
          <section className="sp-partenaires">
            <h2 className="sp-h2">Merci à nos partenaires</h2>
            <p className="sp-sous" style={{ margin: 0 }}>Ils soutiennent ce stage et les jeunes du club.</p>
            <div className="sp-logos">
              {sponsors.map((sp, i) => {
                const contenu = (
                  <>
                    <div className="sp-logo-img">{sp.logo_url ? <img src={sp.logo_url} alt={sp.nom} loading="lazy" /> : <strong style={{ color: '#070707' }}>{sp.nom}</strong>}</div>
                    <div className="sp-logo-nom">{sp.nom}</div>
                    {sp.message && <div className="sp-logo-msg">{sp.message}</div>}
                  </>
                )
                return sp.lien_url && /^https?:\/\//i.test(sp.lien_url)
                  ? <a key={i} className="sp-logo" href={sp.lien_url} target="_blank" rel="noreferrer noopener" onClick={() => sp.id && loguerClicSponsorStage(lien, sp.id)}>{contenu}</a>
                  : <div key={i} className="sp-logo">{contenu}</div>
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="sp-pied">Organisé avec Digital<span style={{ color: '#4ade80' }}>Football</span></footer>

      {photoOuverte !== null && photos[photoOuverte] && (
        <div className="sp-lightbox" onClick={() => setPhotoOuverte(null)}>
          <button className="sp-lb-fermer" onClick={() => setPhotoOuverte(null)}>Fermer</button>
          {photos.length > 1 && <button className="sp-lb-btn" style={{ left: 18 }} onClick={(e) => { e.stopPropagation(); setPhotoOuverte(i => (i - 1 + photos.length) % photos.length) }} aria-label="Photo précédente">‹</button>}
          <img src={photos[photoOuverte].image_url} alt={photos[photoOuverte].titre || ''} onClick={e => e.stopPropagation()} />
          {photos.length > 1 && <button className="sp-lb-btn" style={{ right: 18 }} onClick={(e) => { e.stopPropagation(); setPhotoOuverte(i => (i + 1) % photos.length) }} aria-label="Photo suivante">›</button>}
          {photos[photoOuverte].titre && <div className="sp-lb-legende">{photos[photoOuverte].titre}</div>}
        </div>
      )}
    </div>
  )
}
