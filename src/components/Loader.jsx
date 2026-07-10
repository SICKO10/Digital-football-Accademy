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
                <radialGradient id="ballBase" cx="34%" cy="27%" r="72%">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="35%"  stopColor="#f6f6f6" />
                  <stop offset="72%"  stopColor="#e2e2e2" />
                  <stop offset="100%" stopColor="#b2b2b2" />
                </radialGradient>
                <radialGradient id="ballShadow" cx="60%" cy="70%" r="52%">
                  <stop offset="0%"   stopColor="#000000" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="specMain" cx="27%" cy="19%" r="30%">
                  <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <clipPath id="ballMask">
                  <circle cx="100" cy="100" r="92" />
                </clipPath>
              </defs>

              {/* Sphère de base */}
              <circle cx="100" cy="100" r="92" fill="url(#ballBase)" />

              {/* Panneaux colorés — Trionda 2026 */}
              <g clipPath="url(#ballMask)">
                {/* Panneau bleu — droite, large */}
                <path fill="#1e40c8" d="M 112,8 C 145,12 172,34 188,64 C 202,92 200,126 186,152 C 174,172 156,184 136,188 C 122,191 110,188 104,180 C 120,164 132,142 132,116 C 132,90 120,68 104,54 C 108,38 110,22 112,8 Z" />
                <path fill="#142ea0" opacity="0.55" d="M 155,14 C 178,28 196,58 200,90 C 204,122 194,154 178,170 C 176,148 180,122 176,98 C 172,72 163,44 155,14 Z" />
                {/* Panneau rouge — gauche */}
                <path fill="#c01828" d="M 56,10 C 36,22 18,44 10,70 C 2,96 4,126 16,150 C 26,170 42,183 60,188 C 74,192 88,190 96,182 C 80,166 70,144 70,118 C 70,92 82,70 98,56 C 86,40 70,22 56,10 Z" />
                <path fill="#880e18" opacity="0.45" d="M 20,38 C 8,58 4,82 6,108 C 8,132 16,156 28,172 C 16,152 12,126 12,100 C 12,74 15,54 20,38 Z" />
                {/* Panneau vert — bas */}
                <path fill="#189932" d="M 46,184 C 62,194 84,200 108,200 C 134,200 158,194 174,182 C 156,170 136,164 114,166 C 92,168 68,174 46,184 Z" />
                <path fill="#0e6820" opacity="0.5" d="M 68,194 C 84,200 108,202 130,200 C 150,198 168,192 178,184 C 160,180 140,178 120,180 C 100,182 82,186 68,194 Z" />
                {/* Canaux blancs */}
                <path fill="#f8f8f8" d="M 76,10 C 90,6 104,8 116,14 C 108,28 102,44 102,62 C 90,56 78,44 70,30 C 71,20 73,14 76,10 Z" />
                <path fill="#f8f8f8" d="M 22,156 C 30,170 42,180 56,186 C 60,174 66,162 68,148 C 56,142 44,132 34,120 C 26,132 22,144 22,156 Z" />
                <path fill="#f8f8f8" d="M 148,178 C 160,168 168,152 168,136 C 155,132 140,132 128,138 C 126,150 124,164 122,176 C 132,178 142,179 148,178 Z" />
              </g>

              {/* Ombre (hémisphère bas) */}
              <circle cx="100" cy="100" r="92" fill="url(#ballShadow)" clipPath="url(#ballMask)" />

              {/* Contour du ballon */}
              <circle cx="100" cy="100" r="92" fill="none" stroke="#c0c0c0" strokeWidth="1.5" />

              {/* Reflet principal */}
              <circle cx="100" cy="100" r="92" fill="url(#specMain)" />
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
