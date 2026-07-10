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
            {/* Ballon SVG — inspiré Adidas Trionda (Coupe du Monde 2026) */}
            <svg width="90" height="90" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ballBase" cx="35%" cy="28%" r="70%">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="30%"  stopColor="#f5f5f5" />
                  <stop offset="70%"  stopColor="#dedede" />
                  <stop offset="100%" stopColor="#adadad" />
                </radialGradient>
                <radialGradient id="ballShadow" cx="58%" cy="68%" r="55%">
                  <stop offset="0%"   stopColor="#000000" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="specMain" cx="28%" cy="20%" r="28%">
                  <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <clipPath id="ballMask">
                  <circle cx="100" cy="100" r="91" />
                </clipPath>
              </defs>

              {/* Sphère de base */}
              <circle cx="100" cy="100" r="91" fill="url(#ballBase)" />

              {/* Panneaux colorés — inspiré Adidas Trionda (Coupe du Monde 2026) */}
              <g clipPath="url(#ballMask)">
                {/* Panneau rouge */}
                <path fill="#be1e2d" d="M 52,14 C 26,32 8,62 8,98 C 8,132 24,164 50,180 C 64,188 80,192 94,186 C 82,170 72,148 72,122 C 72,94 86,72 106,56 C 92,44 70,24 52,14 Z" />
                {/* Panneau bleu marine */}
                <path fill="#12256e" d="M 122,8 C 152,14 178,38 190,70 C 200,96 196,128 180,150 C 162,136 146,114 140,90 C 132,62 130,32 122,8 Z" />
                {/* Panneau vert */}
                <path fill="#196b35" d="M 62,174 C 78,188 100,196 124,194 C 152,190 174,174 184,150 C 166,140 148,138 128,142 C 106,146 86,160 62,174 Z" />
                {/* Coutures */}
                <path stroke="#00000018" strokeWidth="2" fill="none" d="M 105,8 C 118,42 116,80 100,100 C 84,120 68,155 78,192" />
                <path stroke="#00000018" strokeWidth="1.5" fill="none" d="M 12,82 C 48,78 86,68 108,52" />
                <path stroke="#00000018" strokeWidth="1.5" fill="none" d="M 14,118 C 50,128 82,148 94,168" />
              </g>

              {/* Ombre (hémisphère bas) */}
              <circle cx="100" cy="100" r="91" fill="url(#ballShadow)" clipPath="url(#ballMask)" />

              {/* Contour du ballon */}
              <circle cx="100" cy="100" r="91" fill="none" stroke="#c5c5c5" strokeWidth="1.5" />

              {/* Reflet principal */}
              <circle cx="100" cy="100" r="91" fill="url(#specMain)" />
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
