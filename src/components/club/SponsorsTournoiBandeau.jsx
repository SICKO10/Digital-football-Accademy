import { colors } from '../../tokens'
import { loguerClicSponsorTournoi } from '../../lib/tournoi'

// Section "Merci à nos partenaires" partagée entre TournoiPublic.jsx (suivi
// en direct) et TournoiInscription.jsx (inscription des équipes) — même
// emplacement publicitaire, mêmes sponsors, sur les deux pages. Chaque page
// logue sa propre vue (cf. loguerVueTournoi dans chacune) ; le clic est
// géré ici une seule fois pour ne pas dupliquer la logique.
export default function SponsorsTournoiBandeau({ sponsors, code }) {
  if (!sponsors || sponsors.length === 0) return null
  return (
    <div style={{ marginTop: '32px', padding: '20px', borderRadius: '14px', background: colors.background.surface, border: `1px solid ${colors.border.default}` }}>
      <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint }}>Merci à nos partenaires</p>
      <p style={{ margin: '0 0 14px', fontSize: '12px', color: colors.text.dim }}>Ils soutiennent ce tournoi.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {sponsors.map(sp => {
          const contenu = (
            <>
              <div style={{ width: 52, height: 52, borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {sp.logo_url ? <img src={sp.logo_url} alt={sp.nom} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <strong style={{ color: '#070707', fontSize: '11px' }}>{sp.nom?.slice(0, 2).toUpperCase()}</strong>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.nom}</div>
                {sp.message && <div style={{ fontSize: '11px', color: colors.text.faint, marginTop: '2px' }}>{sp.message}</div>}
              </div>
            </>
          )
          const style = { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px 8px 8px', borderRadius: '10px', background: colors.background.raised, border: `1px solid ${colors.border.subtle}`, textDecoration: 'none', maxWidth: '280px' }
          return sp.lien_url && /^https?:\/\//i.test(sp.lien_url)
            ? <a key={sp.id} href={sp.lien_url} target="_blank" rel="noreferrer noopener" style={style} onClick={() => loguerClicSponsorTournoi(code, sp.id)}>{contenu}</a>
            : <div key={sp.id} style={style}>{contenu}</div>
        })}
      </div>
    </div>
  )
}
