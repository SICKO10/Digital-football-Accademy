import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { alpha } from '../tokens'
import { saisonActuelle } from '../lib/saison'
import { useWindowWidth } from '../hooks/useWindowWidth'

// Bandeau "Nos partenaires" — cf. supabase_sponsors_bandeau.sql. Ne jamais
// select('*') ici : la table sponsors porte aussi des données de contrat
// (montant, paiements, documents) réservées au staff du club.
//
// Couleurs 100% tokens (colors.*, cf. src/lib/theme.js) — s'adapte tout seul
// au thème clair/sombre courant, pas de isDark en dur : un simple joueur qui
// bascule en thème clair verrait sinon un bandeau resté "câblé sombre".
// L'ambre reste volontairement fixe (colors.accent.amber) — c'est la couleur
// de marque du bandeau partenaire, pas celle du club/dashboard courant.
export default function SponsorsBar({ clubId }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 640
  const [sponsors, setSponsors] = useState([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!clubId) return
    supabase.from('sponsors')
      .select('id, entreprise, logo_url, banniere_url, lien_url, ordre_bandeau')
      .eq('club_id', clubId).eq('saison', saisonActuelle()).eq('afficher_bandeau', true)
      .order('ordre_bandeau', { ascending: true })
      .then(({ data }) => { setSponsors(data || []); setCurrent(0) })
  }, [clubId])

  // Rotation automatique si plusieurs sponsors
  useEffect(() => {
    if (sponsors.length <= 1) return
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(i => (i + 1) % sponsors.length)
        setVisible(true)
      }, 350)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [sponsors.length])

  if (!sponsors.length) return null

  const sponsor = sponsors[current] || sponsors[0]
  const amber = colors.accent.amber

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30,
      background: `linear-gradient(to right, ${colors.background.sunken}, ${colors.background.surface}, ${colors.background.sunken})`,
      boxShadow: `0 -1px 0 0 ${amber}${alpha.medium}, 0 -8px 32px rgba(0,0,0,0.45)`,
      // Sans ça, la barre s'arrête au-dessus de la zone du bandeau
      // d'accueil (home indicator) sur iPhone — le fond blanc par défaut
      // de la page apparaît sous la barre, "autour" de la bannière sponsor.
      // Le contenu (icônes, texte) garde une hauteur fixe ci-dessous ; ce
      // padding ne fait qu'étendre le fond sombre jusqu'au vrai bord.
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{
        height: isMobile ? 56 : 68,
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '0 14px' : '0 24px',
      }}>
      <style>{`
        @keyframes sb-shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
        @keyframes sb-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.5; transform: scale(0.75) } }
        @keyframes sb-glow { 0%, 100% { box-shadow: 0 0 16px 0px ${amber}${alpha.subtle} } 50% { box-shadow: 0 0 28px 4px ${amber}${alpha.light} } }
        .sb-logo-wrap:hover .sb-logo { opacity: 1 !important; transform: scale(1.05) !important; }
        .sb-cta:hover { background: ${amber}${alpha.soft} !important; border-color: ${amber}${alpha.medium} !important; }
      `}</style>

      {/* Shimmer top-border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${amber}00 10%, ${amber}${alpha.medium} 40%, ${amber}e6 50%, ${amber}${alpha.medium} 60%, ${amber}00 90%, transparent 100%)`,
        backgroundSize: '800px 1px',
        animation: 'sb-shimmer 3.5s linear infinite',
      }} />

      {/* ─── GAUCHE : badge "Partenaire officiel" ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: isMobile ? 0 : 180, flexShrink: 0 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: amber, flexShrink: 0, animation: 'sb-pulse-dot 2s ease-in-out infinite' }} />
        {!isMobile && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: amber, lineHeight: 1 }}>
              Partenaire officiel
            </div>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.04em', color: colors.text.disabled, marginTop: 3 }}>
              de votre club
            </div>
          </div>
        )}
      </div>

      {/* ─── CENTRE : sponsor (bannière plein format, logo ou nom) ─── */}
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0,
        height: '100%', overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}>
        {sponsor.lien_url ? (
          <a href={sponsor.lien_url} target="_blank" rel="noreferrer" className="sb-logo-wrap" style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', minWidth: 0 }}>
            <SponsorInner sponsor={sponsor} colors={colors} isMobile={isMobile} />
          </a>
        ) : (
          <div className="sb-logo-wrap" style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
            <SponsorInner sponsor={sponsor} colors={colors} isMobile={isMobile} />
          </div>
        )}
      </div>

      {/* ─── DROITE : CTA + pagination ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: isMobile ? 0 : 180, justifyContent: 'flex-end', flexShrink: 0 }}>
        {sponsor.lien_url && !isMobile && (
          <a href={sponsor.lien_url} target="_blank" rel="noreferrer" className="sb-cta" style={{
            textDecoration: 'none', fontSize: 10, fontWeight: 700, color: amber, padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${amber}${alpha.light}`, background: `${amber}${alpha.faint}`,
            letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            Découvrir →
          </a>
        )}

        {sponsors.length > 1 && (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {sponsors.map((_, i) => (
              <button key={i} onClick={() => { setCurrent(i); setVisible(true) }} style={{
                width: i === current ? 16 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer',
                background: i === current ? amber : colors.border.default,
                transition: 'all 0.3s ease', padding: 0,
              }} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// Sous-composant : bannière large (prend le pas si renseignée), sinon logo,
// sinon nom stylisé.
function SponsorInner({ sponsor, colors, isMobile }) {
  if (sponsor.banniere_url) {
    // objectFit 'cover' (avant) étirait/rognait la bannière pour remplir
    // toute la largeur — si l'image a un fond blanc (cas courant d'une
    // bannière publicitaire), ce fond blanc devenait la quasi-totalité de la
    // barre sur mobile, où il n'y a pas de texte/CTA sombre de part et
    // d'autre pour le "cadrer" comme sur desktop. 'contain' garde l'image
    // à ses proportions réelles ; le fond dégradé sombre de la barre
    // (hérité, pas de background ici) comble l'espace autour au lieu que
    // le blanc de l'image s'étale dessus.
    return (
      <img className="sb-logo" src={sponsor.banniere_url} alt={sponsor.entreprise} style={{
        width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center',
        display: 'block', transition: 'transform 0.3s ease',
      }} />
    )
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
      padding: isMobile ? '5px 14px' : '6px 20px', borderRadius: 12,
      background: colors.background.raised, border: `1px solid ${colors.border.subtle}`,
      animation: 'sb-glow 3s ease-in-out infinite',
    }}>
      {sponsor.logo_url ? (
        <img className="sb-logo" src={sponsor.logo_url} alt={sponsor.entreprise} style={{
          height: isMobile ? 24 : 30, maxWidth: isMobile ? 80 : 120, objectFit: 'contain',
          opacity: 0.88, transition: 'opacity 0.2s, transform 0.2s',
        }} />
      ) : (
        <span style={{
          color: colors.text.primary, fontSize: isMobile ? 12 : 15, fontWeight: 900, letterSpacing: '0.02em',
          textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sponsor.entreprise}
        </span>
      )}
    </div>
  )
}
