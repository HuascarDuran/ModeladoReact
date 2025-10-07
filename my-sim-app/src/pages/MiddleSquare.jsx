import React, { useMemo, useState } from "react";

/* ===== Utils / RNG ===== */
const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ===== Parámetros del proceso (como tu Python) ===== */
const P_ROTO = 0.20;
const P_ECLO = 0.30;
const P_SOBR = 0.80;

// Poisson(λ=1) vía umbrales acumulados (de tu pizarra)
const POISSON_L1_THRESHOLDS = [
  [0.37, 0], [0.74, 1], [0.92, 2], [0.98, 3], [1.0, 4],
];
function samplePoisson1(rng) {
  const u = rng();
  for (const [t, k] of POISSON_L1_THRESHOLDS) if (u < t) return k;
  return 4;
}

/* ===== Semillas separadas por stream ===== */
const BASE_EGGS  = 0x51a2b3c4; // huevos puestos
const BASE_FATES = 0x9fedcba1; // destinos (rompe/eclosiona/sobrevive)

export default function Gallina() {
  // ⚙️ Parámetros editables
  const [dias,  setDias ] = useState("30");
  const [pvuh,  setPvuh ] = useState("1.5"); // Bs/huevo
  const [pvup,  setPvup ] = useState("5");   // Bs/pollo
  const [simsN, setSimsN] = useState("5");   // máx 30

  // Semillas (cambian con Re-simular)
  const [seedEpoch, setSeedEpoch] = useState(
    () => ((Math.floor(Math.random()*1e9) ^ Date.now()) >>> 0)
  );
  const [current, setCurrent] = useState(0);

  const ready = useMemo(() =>
    Number(dias) > 0 && Number(pvuh) >= 0 && Number(pvup) >= 0 &&
    Number(simsN) > 0 && Number(simsN) <= 30
  , [dias, pvuh, pvup, simsN]);

  /* ===== Simulaciones ===== */
  const sims = useMemo(() => {
    if (!ready) return [];

    const D   = Number(dias);
    const PVH = Number(pvuh);
    const PVP = Number(pvup);
    const S   = Number(simsN);

    const baseEggs  = (BASE_EGGS  ^ seedEpoch) | 0;
    const baseFates = (BASE_FATES + (seedEpoch << 1)) | 0;

    const out = [];

    for (let s = 0; s < S; s++) {
      const rngEggs  = mulberry32(baseEggs  + s);
      const rngFates = mulberry32(baseFates + s);

      const rows = [];
      let totRotos = 0, totHuevos = 0, totPollos = 0;
      let ingresoAcum = 0;

      for (let d = 1; d <= D; d++) {
        const puestos = samplePoisson1(rngEggs);

        let rotos = 0, huevosVendidos = 0, pollosVendidos = 0, ingresoDia = 0;

        for (let i = 0; i < puestos; i++) {
          const u1 = rngFates();
          if (u1 < P_ROTO) {
            rotos += 1;
          } else if (u1 < P_ROTO + P_ECLO) {
            if (rngFates() < P_SOBR) { // sobrevive → se vende como pollo
              pollosVendidos += 1;
              ingresoDia += PVP;
            }
          } else {
            huevosVendidos += 1;       // permanece huevo
            ingresoDia += PVH;
          }
        }

        totRotos  += rotos;
        totHuevos += huevosVendidos;
        totPollos += pollosVendidos;
        ingresoAcum += ingresoDia;

        rows.push({
          dia: d,
          puestos,
          rotos,
          huevosVendidos,
          pollosVendidos,
          ingresoDia,
          ingresoAcum,
        });
      }

      out.push({
        simIndex: s,
        resumen: {
          D, PVH, PVP,
          totalRotos:  totRotos,
          totalHuevos: totHuevos,
          totalPollos: totPollos,
          ingresoTotal: ingresoAcum,
          ingresoPromedioDiario: ingresoAcum / D,
          seeds: { eggs: baseEggs + s, fates: baseFates + s },
        },
        rows,
      });
    }

    return out;
  }, [ready, dias, pvuh, pvup, simsN, seedEpoch]);

  // Promedios generales
  const agregados = useMemo(() => {
    if (sims.length === 0) return null;
    const S = sims.length;
    let aR=0, aH=0, aP=0, aIT=0, aIPD=0;
    for (const s of sims) {
      aR += s.resumen.totalRotos;
      aH += s.resumen.totalHuevos;
      aP += s.resumen.totalPollos;
      aIT += s.resumen.ingresoTotal;
      aIPD += s.resumen.ingresoPromedioDiario;
    }
    return {
      S,
      promRotos: aR / S,
      promHuevos: aH / S,
      promPollos: aP / S,
      promIngresos: aIT / S,
      promPromDiario: aIPD / S,
    };
  }, [sims]);

  const total = sims.length;
  const sim = sims[Math.min(current, Math.max(0,total-1))] ?? null;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);
  const jump = (i) => setCurrent(i);
  const reSim = () => { setSeedEpoch(((Math.random()*1e9)^Date.now())>>>0); setCurrent(0); };

  return (
    <section className="container">
      {/* 1. Título */}
      <header className="hero alt card">
        <h1 className="title">Granja — Huevos y Pollos</h1>
        <p className="muted">
          Poisson(λ=1) huevos/día. 20% rotos, 30% eclosionan y el resto permanece huevo.
          De los pollitos, 80% sobreviven y se venden. PVUH={money(pvuh)} · PVUP={money(pvup)}.
        </p>
      </header>

      {/* 2. Consigna */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Consigna</h3>
        </div>
        <div className="panel-body">
          <ul className="bullet">
            <li>Simular <b>{dias}</b> días y registrar puestos/rotos/huevos vendidos/pollos vendidos.</li>
            <li>Ingresos diarios = huevos·PVUH + pollos·PVUP.</li>
            <li>Mostrar resultados por simulación y promedios globales.</li>
          </ul>
        </div>
      </section>

      {/* 3. Diccionario (compacto) */}
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
                <tr><td>1</td><td>Nº de días</td><td>NMD</td><td>Exógena</td><td>Días</td><td>Horizonte</td></tr>
                <tr><td>2</td><td>Contador</td><td>CD</td><td>Endógena</td><td>Días</td><td>1..NMD</td></tr>
                <tr><td>3</td><td>Huevos puestos</td><td>HPG</td><td>Estado</td><td>Huevos/día</td><td>Poisson(1)</td></tr>
                <tr><td>4</td><td>Rotos</td><td>THR</td><td>Endógena</td><td>Huevos</td><td>20%</td></tr>
                <tr><td>5</td><td>Huevos vendidos</td><td>TH</td><td>Endógena</td><td>Huevos</td><td>Permanece huevo</td></tr>
                <tr><td>6</td><td>Pollos vendidos</td><td>TPS</td><td>Endógena</td><td>Pollos</td><td>0.3×0.8</td></tr>
                <tr><td>7</td><td>Ingreso total</td><td>IGT</td><td>Endógena</td><td>Bs</td><td>Σ diarios</td></tr>
                <tr><td>8</td><td>Ingreso promedio diario</td><td>IDP</td><td>Endógena</td><td>Bs/día</td><td>IGT/NMD</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Parámetros */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Parámetros de entrada</h3>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>Días (NMD)</label>
              <input type="number" min={1} value={dias} onChange={(e)=>setDias(e.target.value)} />
            </div>
            <div className="field">
              <label>PVUH (Bs/huevo)</label>
              <input type="number" min={0} step="0.01" value={pvuh} onChange={(e)=>setPvuh(e.target.value)} />
            </div>
            <div className="field">
              <label>PVUP (Bs/pollo)</label>
              <input type="number" min={0} step="0.01" value={pvup} onChange={(e)=>setPvup(e.target.value)} />
            </div>
            <div className="field">
              <label>Simulaciones</label>
              <input type="number" min={1} max={30} value={simsN} onChange={(e)=>setSimsN(e.target.value)} />
            </div>
          </div>

          {!ready && <div className="note warn" style={{marginTop:12}}>
            Completa los campos (máx. 30 simulaciones).
          </div>}
        </div>
      </section>

      {/* 5. Resultados por simulación (carrusel) */}
      {ready && sim && (
        <section className="panel card">
          <div className="panel-header alt" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h3 className="panel-title">Resultados — simulación {current+1} / {total}</h3>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={prev}>◀</button>
              <div className="chips">
                {sims.map((_,i)=>(
                  <button key={i} className="btn btn-ghost"
                    style={{padding:"6px 10px",borderColor:i===current?"#fff":"var(--line)",background:i===current?"#34353a":"var(--ghost)"}}
                    onClick={()=>jump(i)}>{i+1}</button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={next}>▶</button>
              <button className="btn btn-danger" onClick={reSim}>Re-simulación</button>
            </div>
          </div>

          <div className="panel-body">
            <div className="chips" style={{justifyContent:"center"}}>
              <span className="pill">Días: <strong>{sim.resumen.D}</strong></span>
              <span className="pill">PVUH: <strong>{money(sim.resumen.PVH)}</strong></span>
              <span className="pill">PVUP: <strong>{money(sim.resumen.PVP)}</strong></span>
              <span className="pill">Seed huevos: <strong>{sim.resumen.seeds.eggs}</strong></span>
              <span className="pill">Seed destinos: <strong>{sim.resumen.seeds.fates}</strong></span>
            </div>

            <div className="table-wrap" style={{marginTop:14}}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Huevos puestos</th>
                    <th>Huevos rotos</th>
                    <th>Huevos vendidos</th>
                    <th>Pollos vendidos</th>
                    <th>Ingreso día (Bs)</th>
                    <th>Ingreso acum. (Bs)</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.rows.map(r=>(
                    <tr key={r.dia}>
                      <td>{r.dia}</td>
                      <td>{r.puestos}</td>
                      <td>{r.rotos}</td>
                      <td>{r.huevosVendidos}</td>
                      <td>{r.pollosVendidos}</td>
                      <td>{money(r.ingresoDia)}</td>
                      <td>{money(r.ingresoAcum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen de esta simulación */}
            <h4 style={{marginTop:16}}>
              Huevos rotos: <strong>{sim.resumen.totalRotos}</strong> — Huevos vendidos: <strong>{sim.resumen.totalHuevos}</strong> — Pollos vendidos: <strong>{sim.resumen.totalPollos}</strong>
            </h4>
            <h4 style={{marginTop:8}}>
              Ingreso total: <span className="tag success">{money(sim.resumen.ingresoTotal)}</span> — Ingreso promedio diario: <span className="tag">{money(sim.resumen.ingresoPromedioDiario)}</span>
            </h4>
          </div>
        </section>
      )}

      {/* Promedios globales */}
      {ready && agregados && (
        <section className="panel card">
          <div className="panel-header">
            <h3 className="panel-title">Resultados generales (promedios de {agregados.S} simulaciones)</h3>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table className="retro-table">
                <thead><tr><th>Métrica</th><th>Promedio</th></tr></thead>
                <tbody>
                  <tr><td>Huevos rotos</td><td>{agregados.promRotos.toFixed(2)}</td></tr>
                  <tr><td>Huevos vendidos</td><td>{agregados.promHuevos.toFixed(2)}</td></tr>
                  <tr><td>Pollos vendidos</td><td>{agregados.promPollos.toFixed(2)}</td></tr>
                  <tr><td>Ingresos</td><td>{money(agregados.promIngresos)}</td></tr>
                  <tr><td>Ingreso promedio diario</td><td>{money(agregados.promPromDiario)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}
