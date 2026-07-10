function Loader() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '28px'
    }}>
      <style>{`
        @keyframes ballBounce {
          0%   { transform: translateY(0px) rotate(0deg); animation-timing-function: cubic-bezier(0.215,0.61,0.355,1); }
          40%  { transform: translateY(-70px) rotate(144deg); animation-timing-function: cubic-bezier(0.55,0.055,0.675,0.19); }
          100% { transform: translateY(0px) rotate(360deg); }
        }
        @keyframes shadowAnim {
          0%, 100% { transform: scaleX(1); opacity: 0.5; }
          40%       { transform: scaleX(0.35); opacity: 0.1; }
        }
        @keyframes dot1 { 0%,100%{opacity:.2;transform:scale(.8)} 20%{opacity:1;transform:scale(1.3)} }
        @keyframes dot2 { 0%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1.3)} }
        @keyframes dot3 { 0%,100%{opacity:.2;transform:scale(.8)} 60%{opacity:1;transform:scale(1.3)} }
        @keyframes glowPulse {
          0%,100% { filter: drop-shadow(0 0 6px #4ade8040); }
          50%      { filter: drop-shadow(0 0 18px #4ade8080); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Ballon */}
        <div style={{ animation: 'glowPulse 2s ease-in-out infinite' }}>
          <div style={{ animation: 'ballBounce 0.85s ease-in-out infinite' }}>
            <svg width="76" height="76" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ballGrad" cx="36%" cy="30%" r="68%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#e8e8e8" />
                  <stop offset="100%" stopColor="#c0c0c0" />
                </radialGradient>
                <radialGradient id="shineGrad" cx="30%" cy="25%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <clipPath id="ballClip">
                  <circle cx="50" cy="50" r="46" />
                </clipPath>
              </defs>

              {/* Surface du ballon */}
              <circle cx="50" cy="50" r="46" fill="url(#ballGrad)" />

              {/* Pentagone central */}
              <polygon
                points="50,28 66,40 60,60 40,60 34,40"
                fill="#111"
                clipPath="url(#ballClip)"
              />

              {/* 5 pentagones extérieurs */}
              {/* Haut */}
              <polygon
                points="50,5 64,12 66,28 50,28 34,28 36,12"
                fill="#111"
                clipPath="url(#ballClip)"
              />
              {/* Haut-droite */}
              <polygon
                points="88,22 92,38 78,48 66,40 66,28 76,16"
                fill="#111"
                clipPath="url(#ballClip)"
              />
              {/* Bas-droite */}
              <polygon
                points="84,72 70,82 58,74 60,60 78,48 90,56"
                fill="#111"
                clipPath="url(#ballClip)"
              />
              {/* Bas-gauche */}
              <polygon
                points="16,72 10,56 22,48 40,60 42,74 30,82"
                fill="#111"
                clipPath="url(#ballClip)"
              />
              {/* Haut-gauche */}
              <polygon
                points="12,22 24,16 34,28 34,40 22,48 8,38"
                fill="#111"
                clipPath="url(#ballClip)"
              />

              {/* Contour */}
              <circle cx="50" cy="50" r="46" fill="none" stroke="#aaa" strokeWidth="1.2" />

              {/* Brillance */}
              <circle cx="50" cy="50" r="46" fill="url(#shineGrad)" />
            </svg>
          </div>
        </div>

        {/* Ombre */}
        <div style={{
          height: '7px',
          background: '#4ade80',
          borderRadius: '50%',
          filter: 'blur(5px)',
          animation: 'shadowAnim 0.85s ease-in-out infinite',
        }} />
      </div>

      {/* Texte + points */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          color: '#4ade80',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}>
          Digital Football
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '7px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot1 1.2s ease-in-out infinite' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot2 1.2s ease-in-out infinite' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'dot3 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export default Loader
