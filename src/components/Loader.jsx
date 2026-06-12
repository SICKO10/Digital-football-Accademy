function Loader() {
  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.5rem'}}>
      <div style={{animation:'spin 1s linear infinite', fontSize:'64px'}}>
        ⚽
      </div>
      <p style={{color:'#4ade80', fontFamily:'sans-serif', fontSize:'14px', letterSpacing:'3px', fontWeight:'600'}}>
        CHARGEMENT...
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Loader