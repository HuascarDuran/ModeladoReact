import React, { useMemo, useState } from "react";

/* ========= Utils ========= */
const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}
const randIntInclusive = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const expSample = (rng, mean) => -mean * Math.log(1 - rng()); // inversa

/* ========= Semillas por stream ========= */
const BASE_DEM = 0x1234abcd; // demanda (exponencial)
const BASE_LT  = 0x9badf00d; // lead time uniform {1,2,3}

/* ========= Página ========= */
export default function Azucar() {
  // Parámetros por defecto (del enunciado)
  const [mediaDemanda, setMediaDemanda] = useState("100");  // Kg/día
  const [capBod, setCapBod]               = useState("700"); // Kg
  const [cOrden, setCOrden]               = useState("100"); // Bs/orden
  const [cInv, setCInv]                   = useState("0.1"); // Bs/Kg/día
  const [cAdq, setCAdq]                   = useState("3.5"); // Bs/Kg
  const [pVenta, setPVenta]               = useState("5.0"); // Bs/Kg
  const [revCada, setRevCada]             = useState("7");   // días
  const [horiz, setHoriz]                 = useState("27");  // días
  const [simCount, setSimCount]           = useState("5");   // máx 30

  // semillas (cambian con Re-simular)
  const [seedEpoch, setSeedEpoch] = useState(
    () => ((Math.floor(Math.random()*1e9) ^ Date.now()) >>> 0)
  );
  const [current, setCurrent] = useState(0);

  const ready = useMemo(() => {
    const ok =
      Number(mediaDemanda) > 0 &&
      Number(capBod) >= 0 &&
      Number(cOrden) >= 0 &&
      Number(cInv) >= 0 &&
      Number(cAdq) >= 0 &&
      Number(pVenta) >= 0 &&
      Number(revCada) > 0 &&
      Number(horiz) > 0 &&
      Number(simCount) > 0 && Number(simCount) <= 30;
    return ok;
  }, [mediaDemanda, capBod, cOrden, cInv, cAdq, pVenta, revCada, horiz, simCount]);

  /* ========= Simulaciones ========= */
  const sims = useMemo(() => {
    if (!ready) return [];

    const MEAN  = Number(mediaDemanda);
    const CAP   = Number(capBod);
    const CORD  = Number(cOrden);
    const CINV  = Number(cInv);
    const CADQ  = Number(cAdq);
    const PV    = Number(pVenta);
    const R7    = Number(revCada);
    const T     = Number(horiz);
    const S     = Number(simCount);

    const baseD = (BASE_DEM ^ seedEpoch) | 0;
    const baseL = (BASE_LT  + (seedEpoch << 1)) | 0;

    const out = [];

    for (let s = 0; s < S; s++) {
      const rngD = mulberry32(baseD + s);
      const rngL = mulberry32(baseL + s);

      // Estado inicial
      let inventario = CAP;               // arranca lleno
      let pedidoPend = false;
      let cantPedido = 0;
      let ltRest     = 0;

      // Métricas
      let demandaTotal = 0;
      let demNoServida = 0;
      let ingresoBruto = 0;
      let costoTotal   = CAP * CADQ;      // costo del stock inicial
      let numOrdenes   = 0;

      const rows = [];

      for (let dia = 1; dia <= T; dia++) {
        const invIni = inventario;

        // 1) Demanda del día
        const demandaDia = expSample(rngD, MEAN);
        demandaTotal += demandaDia;

        // Ventas y pérdida
        const ventas = Math.min(demandaDia, inventario);
        const perdida = Math.max(0, demandaDia - inventario);
        inventario -= ventas;
        demNoServida += perdida;

        // 2) Recepción de pedido (si había)
        let llegada = 0;
        if (pedidoPend) {
          ltRest -= 1;
          if (ltRest <= 0) {
            llegada = cantPedido;
            inventario += llegada;
            pedidoPend = false;

            // costo adquisición del pedido recibido
            costoTotal += cantPedido * CADQ;

            // si sobrepasa capacidad, truncamos (como tu Python)
            if (inventario > CAP) inventario = CAP;
          }
        }

        // 3) Revisión y emisión de pedido
        let pedidoHoy = 0;
        let costoOrdenHoy = 0;
        if (dia % R7 === 0 && !pedidoPend) {
          const cantidadPedir = Math.max(0, CAP - inventario);
          if (cantidadPedir > 0) {
            pedidoPend = true;
            cantPedido = cantidadPedir;
            ltRest     = randIntInclusive(rngL, 1, 3); // U{1,2,3}
            numOrdenes += 1;
            pedidoHoy   = cantidadPedir;

            // costo de ordenar
            costoOrdenHoy = CORD;
            costoTotal += CORD;
          }
        }

        // 4) Costos de inventario e ingresos
        const invFin = inventario;
        const costoInvDia = ((invIni + invFin) / 2) * CINV; // kg-promedio * costo
        costoTotal += costoInvDia;

        const ingresoDia = ventas * PV;
        ingresoBruto += ingresoDia;

        rows.push({
          dia,
          invIni,
          demanda: demandaDia,
          ventas,
          noServida: perdida,
          invFin,
          pedido: pedidoHoy,
          llegada,
          ltRest: pedidoPend ? ltRest : 0, // LT restante al finalizar el día
          costoInvDia,
          costoOrdenHoy,
          costoAdqHoy: llegada > 0 ? llegada * CADQ : 0,
          ingresoDia,
          costoAcum: costoTotal,
          ingresoAcum: ingresoBruto,
          gananciaAcum: ingresoBruto - costoTotal,
        });
      }

      const gananciaNeta = ingresoBruto - costoTotal;

      out.push({
        simIndex: s,
        resumen: {
          MEAN, CAP, CORD, CINV, CADQ, PV, R7, T,
          ingresoBruto, demandaNoServida: demNoServida,
          costoTotal, gananciaNeta, numOrdenes,
          seeds: { dem: baseD + s, lt: baseL + s },
        },
        rows,
      });
    }

    return out;
  }, [ready, mediaDemanda, capBod, cOrden, cInv, cAdq, pVenta, revCada, horiz, simCount, seedEpoch]);

  // Promedios generales
  const agregados = useMemo(() => {
    if (sims.length === 0) return null;
    const S = sims.length;
    let aIB = 0, aDNS = 0, aCT = 0, aGN = 0, aNO = 0;
    for (const s of sims) {
      aIB += s.resumen.ingresoBruto;
      aDNS += s.resumen.demandaNoServida;
      aCT += s.resumen.costoTotal;
      aGN += s.resumen.gananciaNeta;
      aNO += s.resumen.numOrdenes;
    }
    return {
      S,
      promIngresoBruto: aIB / S,
      promDemNoServida: aDNS / S,
      promCostoTotal:   aCT / S,
      promGanancia:     aGN / S,
      promOrdenes:      aNO / S,
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
      {/* 🧱 1. Título */}
      <header className="hero alt card">
        <h1 className="title">Inventario de Azúcar — Revisión periódica</h1>
        <p className="muted">
          Demanda diaria ~ Exponencial(<b>media {mediaDemanda} kg</b>). Revisión cada <b>{revCada}</b> días,
          pedido para llenar a capacidad (<b>{capBod} kg</b>), tiempo de entrega U&#123;1,2,3&#125; días,
          ventas perdidas si no hay stock. Costos: ordenar, inventario y adquisición.
        </p>
      </header>

      {/* 📜 2. Consigna */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Consigna</h3>
        </div>
        <div className="panel-body">
          <ul className="bullet">
            <li>Simular el sistema por <b>{horiz}</b> días con política de revisión periódica.</li>
            <li>Generar demanda exponencial, registrar ventas perdidas y reposición con lead time uniforme.</li>
            <li>Calcular <b>Ingreso bruto</b>, <b>Demanda insatisfecha</b>, <b>Costo total</b> y <b>Ganancia neta</b>.</li>
          </ul>
        </div>
      </section>

      {/* 📚 3. Diccionario de variables (compacto) */}
      <section className="panel card">
        <div className="panel-header alt">
          <h3 className="panel-title">Diccionario de variables</h3>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="retro-table">
              <thead>
                <tr>
                  <th>#</th><th>Variable</th><th>Símbolo</th><th>Tipo</th><th>Unidades</th><th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Media demanda</td><td>λ⁻¹</td><td>Exógena</td><td>kg/día</td><td>Parámetro exponencial</td></tr>
                <tr><td>2</td><td>Inventario</td><td>IAZU</td><td>Endógena</td><td>kg</td><td>Nivel de stock</td></tr>
                <tr><td>3</td><td>Cap. bodega</td><td>CBOD</td><td>Exógena</td><td>kg</td><td>Límite de almacenamiento</td></tr>
                <tr><td>4</td><td>Pedido azúcar</td><td>PAZU</td><td>Endógena</td><td>kg</td><td>Cantidad pedida al revisar</td></tr>
                <tr><td>5</td><td>Lead time</td><td>TL</td><td>Estado</td><td>días</td><td>Uniforme 1–3</td></tr>
                <tr><td>6</td><td>Costo ordenar</td><td>CORD</td><td>Exógena</td><td>Bs/orden</td><td>Fijo por pedido</td></tr>
                <tr><td>7</td><td>Costo inventario</td><td>CINV</td><td>Exógena</td><td>Bs/kg/día</td><td>Tenencia</td></tr>
                <tr><td>8</td><td>Costo adquisición</td><td>CADQ</td><td>Exógena</td><td>Bs/kg</td><td>Compra de azúcar</td></tr>
                <tr><td>9</td><td>Precio venta</td><td>PV</td><td>Exógena</td><td>Bs/kg</td><td>Ingreso por venta</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ⚙ 4. Parámetros */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Parámetros de entrada</h3>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>Media demanda (kg/día)</label>
              <input type="number" min={0.01} step="0.1" value={mediaDemanda} onChange={(e)=>setMediaDemanda(e.target.value)} />
            </div>
            <div className="field">
              <label>Capacidad bodega (kg)</label>
              <input type="number" min={0} step="1" value={capBod} onChange={(e)=>setCapBod(e.target.value)} />
            </div>
            <div className="field">
              <label>Costo de ordenar (Bs/orden)</label>
              <input type="number" min={0} step="1" value={cOrden} onChange={(e)=>setCOrden(e.target.value)} />
            </div>
            <div className="field">
              <label>Costo inventario (Bs/kg/día)</label>
              <input type="number" min={0} step="0.01" value={cInv} onChange={(e)=>setCInv(e.target.value)} />
            </div>
            <div className="field">
              <label>Costo adquisición (Bs/kg)</label>
              <input type="number" min={0} step="0.01" value={cAdq} onChange={(e)=>setCAdq(e.target.value)} />
            </div>
            <div className="field">
              <label>Precio venta (Bs/kg)</label>
              <input type="number" min={0} step="0.01" value={pVenta} onChange={(e)=>setPVenta(e.target.value)} />
            </div>
            <div className="field">
              <label>Revisión cada (días)</label>
              <input type="number" min={1} step="1" value={revCada} onChange={(e)=>setRevCada(e.target.value)} />
            </div>
            <div className="field">
              <label>Horizonte (días)</label>
              <input type="number" min={1} step="1" value={horiz} onChange={(e)=>setHoriz(e.target.value)} />
            </div>
            <div className="field">
              <label>Simulaciones</label>
              <input type="number" min={1} max={30} value={simCount} onChange={(e)=>setSimCount(e.target.value)} />
            </div>
          </div>

          {!ready && (
            <div className="note warn" style={{marginTop:12}}>
              Completa los campos correctamente (máx. 30 simulaciones).
            </div>
          )}
        </div>
      </section>

      {/* 📈 5. Resultados — Carrusel */}
      {ready && sim && (
        <section className="panel card">
          <div className="panel-header alt" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
            {/* Chips de parámetros y semillas */}
            <div className="chips" style={{justifyContent:"center"}}>
              <span className="pill">CBOD: <strong>{sim.resumen.CAP ?? sim.resumen.CAP}</strong> kg</span>
              <span className="pill">Revisión: <strong>{sim.resumen.R7 ?? sim.resumen.R7}</strong> días</span>
              <span className="pill">Seed Dem: <strong>{sim.resumen.seeds.dem}</strong></span>
              <span className="pill">Seed LT: <strong>{sim.resumen.seeds.lt}</strong></span>
              <span className="pill">Órdenes emitidas: <strong>{sim.resumen.numOrdenes}</strong></span>
            </div>

            {/* Tabla diaria */}
            <div className="table-wrap" style={{marginTop:14}}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Inv. inicial</th>
                    <th>Demanda</th>
                    <th>Ventas</th>
                    <th>No servida</th>
                    <th>Inv. final</th>
                    <th>Pedido (kg)</th>
                    <th>Entrega (kg)</th>
                    <th>LT rest.</th>
                    <th>Cost. Inv. día</th>
                    <th>Cost. ordenar</th>
                    <th>Cost. adquisición</th>
                    <th>Ingreso día</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.rows.map(r=>(
                    <tr key={r.dia}>
                      <td>{r.dia}</td>
                      <td>{r.invIni.toFixed(1)}</td>
                      <td>{r.demanda.toFixed(1)}</td>
                      <td>{r.ventas.toFixed(1)}</td>
                      <td>{r.noServida.toFixed(1)}</td>
                      <td>{r.invFin.toFixed(1)}</td>
                      <td>{r.pedido.toFixed(1)}</td>
                      <td>{r.llegada.toFixed(1)}</td>
                      <td>{r.ltRest}</td>
                      <td>{money(r.costoInvDia)}</td>
                      <td>{r.costoOrdenHoy ? money(r.costoOrdenHoy) : "—"}</td>
                      <td>{r.costoAdqHoy ? money(r.costoAdqHoy) : "—"}</td>
                      <td>{money(r.ingresoDia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen de esta simulación */}
            <h4 style={{marginTop:16}}>
              Ingreso bruto total: <span className="tag">{money(sim.resumen.ingresoBruto)}</span>{" "}
              — Demanda insatisfecha: <strong>{sim.resumen.demandaNoServida.toFixed(1)} kg</strong>{" "}
              — Costo total: <span className="tag">{money(sim.resumen.costoTotal)}</span>{" "}
              — Ganancia neta: <span className="tag success">{money(sim.resumen.gananciaNeta)}</span>
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
                    <th>Métrica</th><th>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Ingreso bruto total</td><td>{money(agregados.promIngresoBruto)}</td></tr>
                  <tr><td>Demanda insatisfecha (kg)</td><td>{agregados.promDemNoServida.toFixed(1)}</td></tr>
                  <tr><td>Costo total</td><td>{money(agregados.promCostoTotal)}</td></tr>
                  <tr><td>Ganancia neta</td><td>{money(agregados.promGanancia)}</td></tr>
                  <tr><td>Órdenes emitidas</td><td>{agregados.promOrdenes.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}