import React, { useMemo, useState } from "react";

/* ========= Utils ========= */
const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

// PRNG con semilla (mulberry32) — determinístico
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}
const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

/* Artículos por cliente según probas (fidel a tu Python):
   0 → 0.2 ; 1 → 0.3 ; 2 → 0.4 ; 3 → 0.1
*/
function articulosPorCliente(rngU) {
  const u = rngU();
  if (u <= 0.2) return 0;
  if (u <= 0.5) return 1;
  if (u <= 0.9) return 2;
  return 3;
}

/* ========= Semillas base para streams ========= */
const BASE_A = 0x1f2e3d4c; // llegadas
const BASE_B = 0xa5a5a5a5; // artículos por cliente

export default function Tienda() {
  // ⚙️ Parámetros (mismos que tu script)
  const [nmh, setNmh] = useState("10");   // número máximo de horas
  const [cua, setCua] = useState("50");   // costo unitario de adquisición
  const [pvu, setPvu] = useState("75");   // precio de venta unitario
  const [cf,  setCf ] = useState("300");  // costo fijo diario
  const [simCount, setSimCount] = useState("5"); // simulaciones (máx 30)

  // epoch de semillas (cambia con Re-simulación)
  const [seedEpoch, setSeedEpoch] = useState(
    () => ((Math.floor(Math.random() * 1e9) ^ Date.now()) >>> 0)
  );

  // carrusel
  const [current, setCurrent] = useState(0);

  const ready = useMemo(() => {
    const ok =
      Number(nmh) > 0 &&
      Number(cua) >= 0 &&
      Number(pvu) >= 0 &&
      Number(cf)  >= 0 &&
      Number(simCount) > 0 &&
      Number(simCount) <= 30;
    return ok;
  }, [nmh, cua, pvu, cf, simCount]);

  /* ========= Simulaciones =========
     - rngA: clientes por hora ~ Uniforme{0..4} (como tu Python)
     - rngB: artículos por cliente según probas anteriores
  */
  const sims = useMemo(() => {
    if (!ready) return [];

    const H  = Number(nmh);
    const CUA = Number(cua);
    const PVU = Number(pvu);
    const CF  = Number(cf);
    const S   = Number(simCount);

    const baseA = (BASE_A ^ seedEpoch) | 0;
    const baseB = (BASE_B + (seedEpoch << 1)) | 0;

    const out = [];

    for (let s = 0; s < S; s++) {
      const rngA = mulberry32(baseA + s);
      const rngB = mulberry32(baseB + s);

      const rows = [];
      let totalArt = 0;
      let totalIng = 0;
      let totalCos = 0;

      for (let h = 1; h <= H; h++) {
        const clientes = randInt(rngA, 0, 4); // clientes en la hora
        let vendidosHora = 0;

        for (let c = 0; c < clientes; c++) {
          vendidosHora += articulosPorCliente(rngB);
        }

        const ingresos = vendidosHora * PVU;
        const costoProd = vendidosHora * CUA;
        const gananciaHora = ingresos - costoProd;

        totalArt += vendidosHora;
        totalIng += ingresos;
        totalCos += costoProd;

        rows.push({
          hora: h,
          clientes,
          vendidos: vendidosHora,
          ingresos,
          costoProd,
          gananciaHora,
        });
      }

      const gananciaTotal = totalIng - totalCos;
      const gananciaNeta  = gananciaTotal - CF;

      out.push({
        simIndex: s,
        resumen: {
          NMH: H, CUA, PVU, CF,
          totalArticulos: totalArt,
          gananciaTotal,
          gananciaNeta,
          baseSeeds: { A: baseA + s, B: baseB + s },
        },
        rows,
      });
    }

    return out;
  }, [ready, nmh, cua, pvu, cf, simCount, seedEpoch]);

  // agregados (promedios)
  const agregados = useMemo(() => {
    if (sims.length === 0) return null;
    const S = sims.length;
    let sumArt = 0, sumGT = 0, sumGN = 0;

    for (const s of sims) {
      sumArt += s.resumen.totalArticulos;
      sumGT  += s.resumen.gananciaTotal;
      sumGN  += s.resumen.gananciaNeta;
    }

    return {
      promArt: sumArt / S,
      promGT : sumGT  / S,
      promGN : sumGN  / S,
      S,
    };
  }, [sims]);

  const total = sims.length;
  const currentSim = sims[current] ?? null;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);
  const jump = (i) => setCurrent(i);
  const reSimular = () => { setSeedEpoch(((Math.random() * 1e9) ^ Date.now()) >>> 0); setCurrent(0); };

  return (
    <section className="container">
      {/* 🧱 1. Título */}
      <header className="hero alt card">
        <h1 className="title">Tienda — Llegadas & Compras</h1>
        <p className="muted">
          Se simulan <strong>{nmh}</strong> horas. Por cada hora se generan clientes con distribución uniforme
          <code>{'{'}0..4{'}'}</code> y cada cliente compra artículos según una función de probabilidad
          (0: 0.2, 1: 0.3, 2: 0.4, 3: 0.1). Se calculan ingresos, costos y ganancias.
        </p>
      </header>

      {/* 📜 2. Consigna */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Consigna</h3>
        </div>
        <div className="panel-body">
          <ul className="bullet">
            <li>Simular las operaciones por hora durante <b>NMH</b> horas.</li>
            <li>Por hora: generar clientes, compras y métricas económicas.</li>
            <li>Resultados por simulación y promedios globales.</li>
          </ul>
        </div>
      </section>

      {/* 📚 3. Diccionario de datos (extraído de tus fotos + aclaraciones) */}
      <section className="panel card">
        <div className="panel-header alt">
          <h3 className="panel-title">Diccionario de variables</h3>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="retro-table">
              <thead>
                <tr>
                  <th>#</th><th>Variable</th><th>Símbolo</th><th>Clasificación</th><th>Unidades</th><th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Número máx. de horas</td><td>NMH</td><td>Exógena</td><td>horas</td><td>Duración de la simulación</td></tr>
                <tr><td>2</td><td>Contador</td><td>CR</td><td>Endógena</td><td>horas</td><td>Índice 1..NMH</td></tr>
                <tr><td>3</td><td>Llegadas de clientes</td><td>LLCLI</td><td>Estado</td><td>clientes/hora</td><td>Uniforme 0..4</td></tr>
                <tr><td>4</td><td>Aleatorio</td><td>LLCLI</td><td>Estado</td><td>0–1/hora</td><td>Base del muestreo</td></tr>
                <tr><td>5</td><td>Artículos por cliente</td><td>ARTCC</td><td>Estado</td><td>art/cliente</td><td>0,1,2,3 según probabilidades</td></tr>
                <tr><td>6</td><td>Total artículos por hora</td><td>TARTCC</td><td>Endógena</td><td>art</td><td>Suma de compras de la hora</td></tr>
                <tr><td>7</td><td>Ganancia total</td><td>GNETA</td><td>Endógena</td><td>Bs</td><td>Σ(ingresos−costos)</td></tr>
                <tr><td>8</td><td>Costo fijo diario</td><td>CF</td><td>Exógena</td><td>Bs</td><td>Costo fijo de operación</td></tr>
                <tr><td>9</td><td>Costo unitario adquisición</td><td>CUA</td><td>Exógena</td><td>Bs</td><td>Costo por artículo</td></tr>
                <tr><td>10</td><td>Precio de venta unitario</td><td>PVU</td><td>Exógena</td><td>Bs</td><td>Precio por artículo</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ⚙️ 4. Parámetros */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Parámetros de entrada</h3>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>NMH (horas)</label>
              <input type="number" min={1} value={nmh} onChange={(e)=>setNmh(e.target.value)} />
            </div>
            <div className="field">
              <label>CUA (Bs/art)</label>
              <input type="number" min={0} step="0.01" value={cua} onChange={(e)=>setCua(e.target.value)} />
            </div>
            <div className="field">
              <label>PVU (Bs/art)</label>
              <input type="number" min={0} step="0.01" value={pvu} onChange={(e)=>setPvu(e.target.value)} />
            </div>
            <div className="field">
              <label>CF (Bs)</label>
              <input type="number" min={0} step="0.01" value={cf} onChange={(e)=>setCf(e.target.value)} />
            </div>
            <div className="field">
              <label>Simulaciones</label>
              <input type="number" min={1} max={30} value={simCount} onChange={(e)=>setSimCount(e.target.value)} />
            </div>
          </div>

          {!ready && (
            <div className="note warn" style={{ marginTop: 12 }}>
              Completa los campos (máximo 30 simulaciones).
            </div>
          )}
        </div>
      </section>

      {/* 📈 5. Resultados — Carrusel de simulaciones */}
      {ready && currentSim && (
        <section className="panel card">
          <div className="panel-header alt" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h3 className="panel-title">Resultados — simulación {current + 1} / {total}</h3>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={prev}>◀</button>
              <div className="chips">
                {sims.map((_, i) => (
                  <button
                    key={i}
                    className="btn btn-ghost"
                    style={{
                      padding:"6px 10px",
                      borderColor: i===current ? "#fff":"var(--line)",
                      background: i===current ? "#34353a":"var(--ghost)"
                    }}
                    onClick={()=>jump(i)}
                  >
                    {i+1}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={next}>▶</button>
              <button className="btn btn-danger" onClick={reSimular}>Re-simulación</button>
            </div>
          </div>

          <div className="panel-body">
            {/* Chips de resumen */}
            <div className="chips" style={{justifyContent:"center"}}>
              <span className="pill">NMH: <strong>{currentSim.resumen.NMH}</strong></span>
              <span className="pill">CUA: <strong>{money(currentSim.resumen.CUA)}</strong></span>
              <span className="pill">PVU: <strong>{money(currentSim.resumen.PVU)}</strong></span>
              <span className="pill">CF: <strong>{money(currentSim.resumen.CF)}</strong></span>
              <span className="pill">Seed A: <strong>{currentSim.resumen.baseSeeds.A}</strong></span>
              <span className="pill">Seed B: <strong>{currentSim.resumen.baseSeeds.B}</strong></span>
            </div>

            <div className="table-wrap" style={{marginTop:14}}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Clientes</th>
                    <th>Artículos vendidos</th>
                    <th>Ingresos</th>
                    <th>Costo producto</th>
                    <th>Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSim.rows.map((r) => (
                    <tr key={r.hora}>
                      <td>{r.hora}</td>
                      <td>{r.clientes}</td>
                      <td>{r.vendidos}</td>
                      <td>{money(r.ingresos)}</td>
                      <td>{money(r.costoProd)}</td>
                      <td>{money(r.gananciaHora)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 💬 6. Resumen de esta simulación */}
            <h4 style={{marginTop:16}}>
              Total artículos: <strong>{currentSim.resumen.totalArticulos}</strong>{" "}
              — Ganancia total: <span className="tag">{money(currentSim.resumen.gananciaTotal)}</span>{" "}
              — Ganancia neta (−CF): <span className="tag success">{money(currentSim.resumen.gananciaNeta)}</span>
            </h4>
          </div>
        </section>
      )}

      {/* Promedios de todas las simulaciones */}
      {ready && agregados && (
        <section className="panel card">
          <div className="panel-header">
            <h3 className="panel-title">Resultados generales (promedios de {agregados.S} simulaciones)</h3>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total de artículos vendidos</td>
                    <td>{agregados.promArt.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Ganancia total</td>
                    <td>{money(agregados.promGT)}</td>
                  </tr>
                  <tr>
                    <td>Ganancia neta (después de CF)</td>
                    <td>{money(agregados.promGN)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
