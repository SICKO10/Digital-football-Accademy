import { useRef, useState } from 'react'

const THEMES = {
  starter: {
    bg1: '#4a4a4a', bg2: '#9a9a9a', bg3: '#d8d8d8', bg4: '#a8a8a8', bg5: '#5a5a5a',
    accent: '#c8c8c8',
    text: '#111111',
    textMuted: '#444444',
    statVal: '#111111',
    statLbl: '#666666',
    ratingColor: '#111111',
    posColor: '#444444',
    borderColor: 'rgba(180,180,180,0.9)',
    shine: 'rgba(255,255,255,0.35)',
    label: 'STARTER',
    ribbonBg: '#888888',
    ribbonText: '#ffffff',
    nameColor: '#111111',
  },
  pro: {
    bg1: '#6a4400', bg2: '#c88a00', bg3: '#f0c030', bg4: '#c89000', bg5: '#7a5000',
    accent: '#f5d060',
    text: '#1a0800',
    textMuted: '#3a2000',
    statVal: '#1a0800',
    statLbl: '#5a3800',
    ratingColor: '#1a0800',
    posColor: '#3a2000',
    borderColor: 'rgba(210,160,10,0.9)',
    shine: 'rgba(255,245,150,0.4)',
    label: 'PRO',
    ribbonBg: '#c88a00',
    ribbonText: '#1a0800',
    nameColor: '#1a0800',
  }
}

const STAT_KEYS = ['VIT', 'TIR', 'PAS', 'DRI', 'DEF', 'PHY']

const defaultStats = () => ({ VIT: 75, TIR: 72, PAS: 74, DRI: 76, DEF: 68, PHY: 70 })

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function FifaCard({ plan = 'starter', profil = {}, cardRef, rating, stats }) {
  const theme = THEMES[plan] || THEMES.starter
  const name = (profil.full_name || profil.nom || 'JOUEUR').toUpperCase()
  const poste = (profil.poste || profil.position || 'MIL').toUpperCase().slice(0, 3)
  const avatarUrl = profil.avatar_url || null
  const clubLogoUrl = profil.club_logo_url || null
  const clubName = profil.club || ''

  return (
    <div
      ref={cardRef}
      style={{
        width: '180px',
        height: '252px',
        borderRadius: '10px',
        background: `linear-gradient(150deg, ${theme.bg1} 0%, ${theme.bg2} 30%, ${theme.bg3} 50%, ${theme.bg4} 72%, ${theme.bg5} 100%)`,
        border: `1.5px solid ${theme.borderColor}`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.3), inset 0 1px 0 ${theme.shine}`,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Arial Black', Arial, sans-serif",
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Shine overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: `linear-gradient(135deg, ${theme.shine} 0%, transparent 55%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Card label ribbon */}
      <div style={{
        position: 'absolute', top: '8px', right: '-18px',
        background: theme.ribbonBg, color: theme.ribbonText,
        fontSize: '7px', fontWeight: 900, letterSpacing: '1.5px',
        padding: '2px 22px', transform: 'rotate(35deg)',
        zIndex: 2,
      }}>{theme.label}</div>

      {/* Top section: rating + pos */}
      <div style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 2, lineHeight: 1 }}>
        <div style={{
          fontSize: '32px', fontWeight: 900, color: theme.ratingColor,
          textShadow: `0 1px 0 rgba(255,255,255,0.3)`, lineHeight: 1,
        }}>{rating}</div>
        <div style={{
          fontSize: '11px', fontWeight: 800, color: theme.posColor,
          letterSpacing: '0.5px', marginTop: '1px',
        }}>{poste}</div>
        {/* Club logo or initials */}
        <div style={{ marginTop: '4px' }}>
          {clubLogoUrl
            ? <img src={clubLogoUrl} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            : clubName
              ? <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '7px', fontWeight: 900, color: theme.text,
                }}>
                  {clubName.slice(0, 2).toUpperCase()}
                </div>
              : null
          }
        </div>
        {/* Flag placeholder */}
        <div style={{ marginTop: '3px', fontSize: '13px' }}>⚽</div>
      </div>

      {/* Photo circle */}
      <div style={{
        position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-10%)',
        width: '92px', height: '92px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.15)',
        border: `1.5px solid ${theme.borderColor}`,
        overflow: 'hidden', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '28px', fontWeight: 900, color: theme.text, opacity: 0.6 }}>
              {getInitials(profil.full_name || profil.nom || '')}
            </span>
        }
      </div>

      {/* Divider line */}
      <div style={{
        position: 'absolute', top: '114px', left: '10px', right: '10px',
        height: '1px', background: `rgba(0,0,0,0.2)`, zIndex: 2,
      }} />

      {/* Player name */}
      <div style={{
        position: 'absolute', top: '120px', left: 0, right: 0,
        textAlign: 'center', zIndex: 2,
      }}>
        <div style={{
          fontSize: name.length > 10 ? '10px' : '12px',
          fontWeight: 900, color: theme.nameColor,
          letterSpacing: '1px',
          textShadow: `0 1px 0 rgba(255,255,255,0.2)`,
          padding: '0 8px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{name}</div>
      </div>

      {/* Stats divider */}
      <div style={{
        position: 'absolute', top: '138px', left: '10px', right: '10px',
        height: '1px', background: `rgba(0,0,0,0.15)`, zIndex: 2,
      }} />

      {/* Stats 2x3 grid */}
      <div style={{
        position: 'absolute', top: '146px', left: '10px', right: '10px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        rowGap: '6px', columnGap: '0px',
        zIndex: 2,
      }}>
        {STAT_KEYS.map((k) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: theme.statVal, lineHeight: 1 }}>
              {stats[k]}
            </div>
            <div style={{ fontSize: '7px', fontWeight: 700, color: theme.statLbl, letterSpacing: '0.5px', marginTop: '1px' }}>
              {k}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom watermark */}
      <div style={{
        position: 'absolute', bottom: '6px', left: 0, right: 0,
        textAlign: 'center', zIndex: 2,
        fontSize: '7px', fontWeight: 700, letterSpacing: '2px',
        color: theme.text, opacity: 0.4,
      }}>DIGITAL FOOTBALL</div>
    </div>
  )
}

export function FifaCardGenerator({ plan = 'starter', profil = {}, onSave }) {
  const [rating, setRating] = useState(75)
  const [stats, setStats] = useState(defaultStats())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const cardRef = useRef(null)

  const handleStatChange = (key, val) => {
    setStats(prev => ({ ...prev, [key]: Math.min(99, Math.max(1, parseInt(val) || 1)) }))
  }

  const exportAndSave = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      // Charger html2canvas depuis CDN
      const h2c = await new Promise((resolve, reject) => {
        if (window.html2canvas) { resolve(window.html2canvas); return }
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        s.onload = () => resolve(window.html2canvas)
        s.onerror = reject
        document.head.appendChild(s)
      })
      const canvas = await h2c(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null })
      canvas.toBlob(async (blob) => {
        if (onSave) await onSave(blob)
        // Téléchargement local
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'carte-fifa.png'
        a.click()
        URL.revokeObjectURL(url)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        setSaving(false)
      }, 'image/png')
    } catch (err) {
      console.error('Export error:', err)
      setSaving(false)
    }
  }

  const theme = THEMES[plan] || THEMES.starter

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Aperçu carte */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FifaCard plan={plan} profil={profil} cardRef={cardRef} rating={rating} stats={stats} />
      </div>

      {/* Contrôles */}
      <div style={{ background: '#111', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Note globale */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', letterSpacing: '1px', textTransform: 'uppercase' }}>Note globale</span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{rating}</span>
          </div>
          <input
            type="range" min="60" max="99" value={rating}
            onChange={e => setRating(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: plan === 'pro' ? '#f0c030' : '#c8c8c8' }}
          />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {STAT_KEYS.map(k => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#888', letterSpacing: '0.5px' }}>{k}</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>{stats[k]}</span>
              </div>
              <input
                type="range" min="1" max="99" value={stats[k]}
                onChange={e => handleStatChange(k, e.target.value)}
                style={{ width: '100%', accentColor: plan === 'pro' ? '#f0c030' : '#c8c8c8' }}
              />
            </div>
          ))}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={exportAndSave}
            disabled={saving}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: saving ? 'wait' : 'pointer',
              background: plan === 'pro' ? '#f0c030' : '#c8c8c8',
              color: plan === 'pro' ? '#1a0800' : '#111',
              fontWeight: 800, fontSize: '12px', letterSpacing: '1px',
            }}
          >
            {saving ? '⏳ Export...' : saved ? '✓ Téléchargé !' : '⬇ Télécharger PNG'}
          </button>
          {onSave && (
            <button
              onClick={exportAndSave}
              disabled={saving}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px',
                border: `1.5px solid ${plan === 'pro' ? '#f0c030' : '#c8c8c8'}`,
                cursor: saving ? 'wait' : 'pointer',
                background: 'transparent',
                color: plan === 'pro' ? '#f0c030' : '#c8c8c8',
                fontWeight: 800, fontSize: '12px', letterSpacing: '1px',
              }}
            >
              {saving ? '⏳...' : '☁ Sauvegarder'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FifaCard
