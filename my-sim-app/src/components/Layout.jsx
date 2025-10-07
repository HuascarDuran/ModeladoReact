export default function Layout({ nav, children }){
  return (
    <>
      <header className="site-header">
        <div className="brand">Simulación — Ejercicios</div>
        <nav className="nav">{nav}</nav>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer" style={{textAlign:'center',color:'#7a7a7a',fontSize:12,padding:18,borderTop:'1px solid var(--line)',background:'#0c0c0e'}}>
        Hecho en React • UI monocromática elegante
      </footer>
    </>
  );
}
