import { colors } from '../../tokens'
import { loguerClicSponsorTournoi } from '../../lib/tournoi'

// Section "Merci à nos partenaires" partagée entre TournoiPublic.jsx (suivi
// en direct) et TournoiInscription.jsx (inscription des équipes) — même
// emplacement publicitaire, mêmes sponsors, sur les deux pages. Chaque page
// logue sa propre vue (cf. loguerVueTournoi dans chacune) ; le clic est
// géré ici une seule fois pour ne pas dupliquer la logique.
// Mise en page : titre centré en grand, puis une vignette par sponsor
// (logo en grand sur fond blanc, nom, message), centrées et de même taille.
export default function SponsorsTournoiBandeau({ sponsors, code }) {
  if (!sponsors || sponsors.length === 0) return null
  const accent = colors.accent.green
  return (
    <section aria-label="Nos partenaires" style={{ marginTop: '48px', padding: 'clamp(28px, 5vw, 48px) clamp(16px, 4vw, 40px)', borderRadius: '20px', background: `radial-gradient(circle at 50% 0%, ${accent}1f, transparent 60%), ${colors.background.surface}`, border: `1px solid ${colors.border.default}`, textAlign: 'center' }}>
      <style>{`
        .df-sponsor-tuile { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        a.df-sponsor-tuile:hover { transform: translateY(-4px); border-color: ${accent}66; box-shadow: 0 12px 28px rgba(0,0,0,.35); }
        a.df-sponsor-tuile:focus-visible { outline: 2px solid ${accent}; outline-offset: 3px; }
      `}</style>

      <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: accent }}>Partenaires du tournoi</p>
      <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.5px', color: colors.text.primary }}>
        Merci à nos partenaires
      </h2>
      <p style={{ margin: '12px auto 0', maxWidth: '460px', fontSize: '15px', lineHeight: 1.5, color: colors.text.secondary }}>
        Grâce à leur soutien, ce tournoi peut avoir lieu.
      </p>
      <div aria-hidden="true" style={{ width: '56px', height: '3px', borderRadius: '3px', background: accent, margin: '20px auto 28px' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
        {sponsors.map(sp => {
          const avecLien = sp.lien_url && /^https?:\/\//i.test(sp.lien_url)
          const contenu = (
            <>
              <div style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '140px', margin: '0 auto', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '12px', boxSizing: 'border-box' }}>
                {sp.logo_url
                  ? <img src={sp.logo_url} alt={sp.nom} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <strong style={{ color: '#070707', fontSize: '28px', fontWeight: 900 }}>{sp.nom?.slice(0, 2).toUpperCase()}</strong>}
              </div>
              <div style={{ marginTop: '14px', fontWeight: 800, fontSize: '16px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.nom}</div>
              {sp.message && <div style={{ fontSize: '13px', lineHeight: 1.4, color: colors.text.faint, marginTop: '4px' }}>{sp.message}</div>}
              {avecLien && <div style={{ fontSize: '12px', fontWeight: 700, color: accent, marginTop: '8px' }}>Découvrir</div>}
            </>
          )
          const style = { display: 'block', width: 'clamp(140px, 40vw, 190px)', padding: '16px', borderRadius: '16px', background: colors.background.raised, border: `1px solid ${colors.border.subtle}`, textDecoration: 'none', boxSizing: 'border-box' }
          return avecLien
            ? <a key={sp.id} className="df-sponsor-tuile" href={sp.lien_url} target="_blank" rel="noreferrer noopener" style={style} onClick={() => loguerClicSponsorTournoi(code, sp.id)}>{contenu}</a>
            : <div key={sp.id} className="df-sponsor-tuile" style={style}>{contenu}</div>
        })}
      </div>
    </section>
  )
}
