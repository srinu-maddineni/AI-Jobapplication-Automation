const Loader = ({ message = 'Loading…' }) => {
  return (
    <div className="loader-container">
      {/* Triple-ring spinner */}
      <div style={{ position:'relative', width:56, height:56 }}>
        <div style={{
          position:'absolute', inset:0,
          border:'2px solid rgba(99,102,241,0.1)',
          borderTopColor:'#6366f1',
          borderRadius:'50%',
          animation:'spin 0.8s linear infinite',
        }}/>
        <div style={{
          position:'absolute', inset:6,
          border:'2px solid rgba(139,92,246,0.1)',
          borderTopColor:'#8b5cf6',
          borderRadius:'50%',
          animation:'spin 1.2s linear infinite reverse',
        }}/>
        <div style={{
          position:'absolute', inset:14,
          border:'2px solid rgba(6,182,212,0.1)',
          borderTopColor:'#06b6d4',
          borderRadius:'50%',
          animation:'spin 0.6s linear infinite',
        }}/>
      </div>
      <div className="loader-text" style={{
        background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
        WebkitBackgroundClip:'text',
        WebkitTextFillColor:'transparent',
        backgroundClip:'text',
        fontWeight:600,
      }}>{message}</div>
    </div>
  );
};

export default Loader;
