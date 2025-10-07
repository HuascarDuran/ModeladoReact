import { Link } from "react-router-dom";

function AppCard({ to, title, desc, tag }) {
  return (
    <Link to={to} className="app-card" aria-label={title}>
      <div className="app-card__shine" />
      {tag && <span className="app-card__tag">{tag}</span>}
      <h3 className="app-card__title">{title}</h3>
      <p className="app-card__desc">{desc}</p>
    </Link>
  );
}

export default function Home() {
  const algoritmos = [
    {
      to: "/lineal",
      title: "Lineal (LCG)",
      desc: "Generador congruencial lineal: Xi = (a·Xi-1 + c) mod m.",
      tag: "Generador",
    },
    {
      to: "/multiplicativo",
      title: "Multiplicativo (MCG)",
      desc: "Variante sin término c: Xi = (a·Xi-1) mod m.",
      tag: "Generador",
    },
  ];

  const ejercicios = [
    {
      to: "/dados",
      title: "Dados",
      desc: "Juego estocástico con semillas por dado y múltiples simulaciones.",
    },
    {
      to: "/shop-arrivals",
      title: "Tienda",
      desc: "Llegadas de clientes, compras por probabilidad y estados económicos.",
    },
    {
      to: "/middle-square", // o /gallina si así está en tu router
      title: "Granja (Gallina)",
      desc: "Huevos Poisson(1), rotos, eclosión y ventas de pollos/huevos.",
    },
    {
      to: "/product",
      title: "Inventario de Azúcar",
      desc: "Revisión periódica con lead time, costos y utilidad neta.",
    },
    {
      to: "/inventory-sugar",
      title: "Depósito Plazo Fijo",
      desc: "TNA con capitalización m y aporte opcional por periodo.",
    },
    {
      to: "/deposito-variable",
      title: "Depósito Variable",
      desc: "Tasa según capital inicial y evolución anual del saldo.",
    },
  ];

  return (
    <section className="container">
      {/* Hero compacto */}
      <header className="hero alt card">
        <h1 className="title">Modelado & Simulación</h1>
        <p className="muted">
          Colección de ejercicios y generadores interactivos con una UI monocromática elegante.
        </p>
      </header>

      {/* Sección 1: Algoritmos */}
      <section className="section-block">
        <div className="section-head">
          <h2 className="section-title">Generadores</h2>
          <p className="section-sub">Herramientas para producir números pseudoaleatorios.</p>
        </div>
        <div className="card-grid">
          {algoritmos.map((c) => (
            <AppCard key={c.to} {...c} />
          ))}
        </div>
      </section>

      {/* Sección 2: Ejercicios */}
      <section className="section-block">
        <div className="section-head">
          <h2 className="section-title">Ejercicios</h2>
          <p className="section-sub">Simulaciones listas para experimentar y analizar resultados.</p>
        </div>
        <div className="card-grid">
          {ejercicios.map((c) => (
            <AppCard key={c.to} {...c} />
          ))}
        </div>
      </section>
    </section>
  );
}