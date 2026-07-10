function Loader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px'
    }}>
      <style>{`
        @keyframes ballBounce {
          0%   { transform: translateY(0px) rotate(0deg); animation-timing-function: cubic-bezier(0.55,0.055,0.675,0.19); }
          50%  { transform: translateY(-72px) rotate(180deg); animation-timing-function: cubic-bezier(0.215,0.61,0.355,1); }
          100% { transform: translateY(0px) rotate(360deg); }
        }
        @keyframes shadowAnim {
          0%,100% { transform: scaleX(1) scaleY(1); opacity: 0.5; }
          50%      { transform: scaleX(0.3) scaleY(0.6); opacity: 0.1; }
        }
        @keyframes dot1 { 0%,100%{opacity:.15;transform:scale(.7)} 25%{opacity:1;transform:scale(1.2)} }
        @keyframes dot2 { 0%,100%{opacity:.15;transform:scale(.7)} 45%{opacity:1;transform:scale(1.2)} }
        @keyframes dot3 { 0%,100%{opacity:.15;transform:scale(.7)} 65%{opacity:1;transform:scale(1.2)} }
        @keyframes glowPulse {
          0%,100% { filter: drop-shadow(0 0 8px #4ade8050) drop-shadow(0 2px 16px #00000080); }
          50%      { filter: drop-shadow(0 0 22px #4ade8090) drop-shadow(0 2px 16px #00000080); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

        {/* Ballon */}
        <div style={{ animation: 'glowPulse 1.8s ease-in-out infinite' }}>
          <div style={{ animation: 'ballBounce 0.85s ease-in-out infinite' }}>
            {/* Ballon SVG — pattern Telstar (Coupe du Monde) */}
            <svg width="90" height="90" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ballBase" cx="36%" cy="28%" r="72%">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="25%"  stopColor="#f8f8f8" />
                  <stop offset="65%"  stopColor="#e0e0e0" />
                  <stop offset="100%" stopColor="#a0a0a0" />
                </radialGradient>
                <radialGradient id="ballShadow" cx="60%" cy="70%" r="60%">
                  <stop offset="0%"   stopColor="#000000" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="specMain" cx="30%" cy="22%" r="32%">
                  <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="specSec" cx="72%" cy="78%" r="18%">
                  <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <clipPath id="ballMask">
                  <circle cx="100" cy="100" r="92" />
                </clipPath>
              </defs>

              {/* Sphère de base */}
              <circle cx="100" cy="100" r="92" fill="url(#ballBase)" />

              {/* Panneaux noirs — pattern Telstar (Coupe du Monde) */}
              <g clipPath="url(#ballMask)" fill="#111111">
                <polygon points="100,58 132,80 120,118 80,118 68,80" />
                <polygon points="100,10 126,26 132,58 100,58 68,58 74,26" />
                <polygon points="174,44 184,76 158,96 132,80 132,58 152,38" />
                <polygon points="168,154 140,176 116,162 120,118 158,96 178,116" />
                <polygon points="100,190 68,172 68,148 80,118 120,118 132,148 132,172" />
                <polygon points="32,154 22,116 42,96 80,118 84,162 60,176" />
                <polygon points="26,44 48,38 68,58 68,80 42,96 16,76" />
              </g>

              {/* Ombre (hémisphère bas) */}
              <circle cx="100" cy="100" r="92" fill="url(#ballShadow)" clipPath="url(#ballMask)" />

              {/* Contour du ballon */}
              <circle cx="100" cy="100" r="92" fill="none" stroke="#bbbbbb" strokeWidth="2" />

              {/* Reflets */}
              <circle cx="100" cy="100" r="92" fill="url(#specMain)" />
              <circle cx="100" cy="100" r="92" fill="url(#specSec)" />
            </svg>
          </div>
        </div>

        {/* Ombre au sol */}
        <div style={{
          width: '60px',
          height: '8px',
          background: '#4ade80',
          borderRadius: '50%',
          filter: 'blur(5px)',
          animation: 'shadowAnim 0.85s ease-in-out infinite',
        }} />
      </div>

      {/* Texte */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          color: '#4ade80',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '5px',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}>Digital Football</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot1 1.2s ease-in-out infinite' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot2 1.2s ease-in-out infinite' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot3 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default Loader
