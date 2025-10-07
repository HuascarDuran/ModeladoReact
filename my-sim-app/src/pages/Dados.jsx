import React, { useMemo, useState } from "react";

/* ========= Utils ========= */
// Moneda Bs
const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

// PRNG con semilla (mulberry32) — rápido y determinístico
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}

// Mapear U~[0,1) -> dado 1..6 (igual a round(1 + 5u))
const dadoPorU = (u) => Math.max(1, Math.min(6, Math.round(1 + 5 * u)));

/* ========= Semillas base (cada simulación las desplaza) ========= */
const SEED_D1_BASE = 1234;
const SEED_D2_BASE = 9876;

export default function Dados() {
  // ⚙️ Parámetros
  const [nmj, setNmj] = useState("100");       // número de juegos por simulación
  const [puj, setPuj] = useState("2");         // precio (ingreso si S≠7)
  const [cus7, setCus7] = useState("5");       // costo cuando S=7
  const [simCount, setSimCount] = useState("5");// número de simulaciones a generar

  // Epoch de semillas (cambia con re-simular)
  const [seedEpoch, setSeedEpoch] = useState(
    () => ((Math.floor(Math.random() * 1e9) ^ Date.now()) >>> 0)
  );

  // Carrusel
  const [current, setCurrent] = useState(0);

  // Validación mínima
  const ready = useMemo(() => {
    const a = Number(nmj) > 0;
    const b = Number(puj) >= 0;
    const c = Number(cus7) >= 0;
    const d = Number(simCount) > 0 && Number(simCount) <= 30; // tope 30
    return a && b && c && d;
  }, [nmj, puj, cus7, simCount]);

  /* ========= Generar TODAS las simulaciones =========
     Simulación s usa:
       rng1 = mulberry32(base1 + s)
       rng2 = mulberry32(base2 + s)
     con base1/base2 derivados de seedEpoch
  */
  const sims = useMemo(() => {
    if (!ready) return [];
    const N = Number(nmj);
    const precio = Number(puj);
    const costo7 = Number(cus7);
    const S = Number(simCount);

    const base1 = (SEED_D1_BASE + (seedEpoch | 0)) | 0;
    const base2 = (SEED_D2_BASE ^ ((seedEpoch << 1) | 0)) | 0;

    const out = [];

    for (let s = 0; s < S; s++) {
      const rng1 = mulberry32(base1 + s);
      const rng2 = mulberry32(base2 + s);

      let GNC = 0;      // Ganancia neta de la casa
      let NJGC = 0;     // Juegos ganados por la casa (solo si S≠7)
      const rows = [];

      for (let cj = 1; cj <= N; cj++) {
        const r1 = rng1();
        const r2 = rng2();
        const d1 = dadoPorU(r1);
        const d2 = dadoPorU(r2);
        const suma = d1 + d2;

        if (suma === 7) {
          GNC += (precio - costo7);   // paga costo al jugador
        } else {
          GNC += precio;              // cobra el juego
          NJGC += 1;                  // gana la casa
        }

        rows.push({
          cj,
          gncAcum: GNC,
          r1, r2, d1, d2, suma,
          njgc: NJGC,
        });
      }

      const PJC = (NJGC / N) * 100;

      out.push({
        simIndex: s,
        resumen: {
          GNC, NJGC, PJC, NMJ: N, PUJ: precio, CUS7: costo7,
          seedD1: base1 + s, seedD2: base2 + s,
        },
        rows,
      });
    }

    return out;
  }, [ready, nmj, puj, cus7, simCount, seedEpoch]);

  // Agregados (promedios)
  const agregados = useMemo(() => {
    if (sims.length === 0) return null;
    const S = sims.length;
    let sumGNC = 0, sumNJGC = 0, sumPJC = 0;
    for (const s of sims) {
      sumGNC += s.resumen.GNC;
      sumNJGC += s.resumen.NJGC;
      sumPJC += s.resumen.PJC;
    }
    return {
      promGNC: sumGNC / S,
      promNJGC: sumNJGC / S,
      promPJC: sumPJC / S,
      NMJ: sims[0].resumen.NMJ,
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
        <h1 className="title">Juego de Dados — Simulación</h1>
        <p className="muted">
          El apostador lanza 2 dados; si la suma es 7, la casa paga un costo <code>CUS7</code>.
          En caso contrario cobra <code>PUJ</code>. Cada simulación usa <strong>semillas distintas por dado</strong>.
        </p>
      </header>

      {/* 📜 2. Consigna */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Consigna del ejercicio</h3>
        </div>
        <div className="panel-body">
          <ol className="bullet">
            <li>Definir <b>NMJ</b>, <b>PUJ</b>, <b>CUS7</b> y <b>cantidad de simulaciones</b>.</li>
            <li>Para cada simulación, usar dos RNG semillados (uno por dado).</li>
            <li>Registrar por ronda: CJ, r₁, r₂, d₁, d₂, d₁+d₂, GNC acumulada y NJGC.</li>
            <li>Mostrar por simulación y un resumen final con promedios.</li>
          </ol>
        </div>
      </section>

      {/* 📚 3. Diccionario de variables */}
      <section className="panel card">
        <div className="panel-header alt">
          <h3 className="panel-title">Diccionario de variables</h3>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="retro-table">
              <thead>
                <tr>
                  <th>#</th><th>Nombre</th><th>Símbolo</th><th>Clasificación</th><th>Unidades</th><th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Número máximo de juegos</td><td>NMJ</td><td>Exógena</td><td>Juegos</td><td>Tiradas por simulación</td></tr>
                <tr><td>2</td><td>Contador de juego</td><td>CJ</td><td>Endógena</td><td>Juegos</td><td>Iteración 1..NMJ</td></tr>
                <tr><td>3</td><td>RNG dado 1</td><td>R₁</td><td>Estado</td><td>0–1</td><td>Uniforme(0,1) semillado</td></tr>
                <tr><td>4</td><td>RNG dado 2</td><td>R₂</td><td>Estado</td><td>0–1</td><td>Uniforme(0,1) semillado</td></tr>
                <tr><td>5</td><td>Resultado dado 1</td><td>D₁</td><td>Estado</td><td>1–6</td><td>cara de dado 1</td></tr>
                <tr><td>6</td><td>Resultado dado 2</td><td>D₂</td><td>Estado</td><td>1–6</td><td>cara de dado 2</td></tr>
                <tr><td>7</td><td>Suma de dados</td><td>S</td><td>Estado</td><td>2–12</td><td>D₁ + D₂</td></tr>
                <tr><td>8</td><td>Precio por juego</td><td>PUJ</td><td>Exógena</td><td>Bs/juego</td><td>Ingreso si S≠7</td></tr>
                <tr><td>9</td><td>Costo si suma 7</td><td>CUS7</td><td>Exógena</td><td>Bs</td><td>Pago de la casa si S=7</td></tr>
                <tr><td>10</td><td>Juegos ganados casa</td><td>NJGC</td><td>Endógena</td><td>Juegos</td><td>Se incrementa si S≠7</td></tr>
                <tr><td>11</td><td>% victorias casa</td><td>PJC</td><td>Endógena</td><td>%</td><td>100·NJGC/NMJ</td></tr>
                <tr><td>12</td><td>Ganancia neta casa</td><td>GNC</td><td>Endógena</td><td>Bs</td><td>Σ ingresos/costos</td></tr>
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
              <label>NMJ (juegos por simulación)</label>
              <input type="number" min={1} value={nmj} onChange={(e)=>setNmj(e.target.value)} />
            </div>
            <div className="field">
              <label>PUJ (Bs)</label>
              <input type="number" min={0} step="0.01" value={puj} onChange={(e)=>setPuj(e.target.value)} />
            </div>
            <div className="field">
              <label>CUS7 (Bs)</label>
              <input type="number" min={0} step="0.01" value={cus7} onChange={(e)=>setCus7(e.target.value)} />
            </div>
            <div className="field">
              <label>Cantidad de simulaciones</label>
              <input type="number" min={1} max={30} value={simCount} onChange={(e)=>setSimCount(e.target.value)} />
            </div>
          </div>

          {!ready && (
            <div className="note warn" style={{ marginTop: 12 }}>
              Completa los campos correctamente (máx. 30 simulaciones).
            </div>
          )}
        </div>
      </section>

      {/* 📈 5. Resultados — Carrusel */}
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
                      padding: "6px 10px",
                      borderColor: i === current ? "#fff" : "var(--line)",
                      background: i === current ? "#34353a" : "var(--ghost)"
                    }}
                    onClick={() => jump(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={next}>▶</button>
              <button className="btn btn-danger" onClick={reSimular}>Re-simulación</button>
            </div>
          </div>

          <div className="panel-body">
            {/* Chips resumen */}
            <div className="chips" style={{justifyContent:"center"}}>
              <span className="pill">NMJ: <strong>{currentSim.resumen.NMJ}</strong></span>
              <span className="pill">PUJ: <strong>{money(currentSim.resumen.PUJ)}</strong></span>
              <span className="pill">CUS7: <strong>{money(currentSim.resumen.CUS7)}</strong></span>
              <span className="pill">Seed D1: <strong>{currentSim.resumen.seedD1}</strong></span>
              <span className="pill">Seed D2: <strong>{currentSim.resumen.seedD2}</strong></span>
            </div>

            {/* Tabla de la simulación activa */}
            <div className="table-wrap" style={{marginTop:14}}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>CJ</th>
                    <th>GNC acumulada</th>
                    <th>r₁</th>
                    <th>r₂</th>
                    <th>d₁</th>
                    <th>d₂</th>
                    <th>d₁+d₂</th>
                    <th>NJGC</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSim.rows.map((r) => (
                    <tr key={r.cj} className={r.suma === 7 ? "sum7" : ""}>
                      <td>{r.cj}</td>
                      <td>{money(r.gncAcum)}</td>
                      <td>{r.r1.toFixed(4)}</td>
                      <td>{r.r2.toFixed(4)}</td>
                      <td>{r.d1}</td>
                      <td>{r.d2}</td>
                      <td>{r.suma}</td>
                      <td>{r.njgc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 💬 6. Resumen final de esta simulación */}
            <h4 style={{marginTop:16}}>
              GNC: <span className="tag success">{money(currentSim.resumen.GNC)}</span>{" "}
              — NJGC: <strong>{currentSim.resumen.NJGC}/{currentSim.resumen.NMJ}</strong>{" "}
              — PJC: <strong>{currentSim.resumen.PJC.toFixed(2)}%</strong>
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
                  <tr><th>Métrica</th><th>Promedio</th></tr>
                </thead>
                <tbody>
                  <tr><td>Ganancia neta de la casa (GNC)</td><td>{money(agregados.promGNC)}</td></tr>
                  <tr><td>Juegos ganados por la casa (NJGC)</td><td>{agregados.promNJGC.toFixed(2)} / {agregados.NMJ}</td></tr>
                  <tr><td>Porcentaje victorias casa (PJC)</td><td>{agregados.promPJC.toFixed(2)}%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
