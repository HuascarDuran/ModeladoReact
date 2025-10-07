import React, { useMemo, useState } from "react";

const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

export default function DepositoVariable() {
  const [capital0, setCapital0] = useState("");
  const [anios, setAnios] = useState("");

  const ready = useMemo(() =>
    capital0 !== "" && anios !== "" && Number(capital0) > 0 && Number(anios) > 0,
  [capital0, anios]);

  // Tasa automática según el capital inicial
  const tasa = useMemo(() => {
    const K = Number(capital0);
    if (K > 0 && K <= 10000)   return 0.035;
    if (K > 10000 && K <= 100000) return 0.037;
    if (K > 100000)            return 0.04;
    return null;
  }, [capital0]);

  // Simulación
  const { rows, kFinal } = useMemo(() => {
    if (!ready || !tasa) return { rows: [], kFinal: null };
    let K = Number(capital0);
    const n = Number(anios);
    const out = [];
    for (let t = 1; t <= n; t++) {
      const interes = K * tasa;
      const kNext = K + interes;
      out.push({ anio: t, kap_t: K, interes, kap_t1: kNext });
      K = kNext;
    }
    return { rows: out, kFinal: K };
  }, [ready, capital0, tasa, anios]);

  return (
    <section className="container">
      {/* Hero */}
      <section className="card hero">
        <h1 className="title">Simulación de Depósito a Plazo Variable</h1>
        <p className="muted">
          Calcula la evolución de un capital donde la tasa de interés se ajusta automáticamente
          según el monto depositado.
        </p>
      </section>

      {/* Enunciado */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Instrucciones</h3>
        </div>
        <div className="panel-body">
          <p>
            Construir un modelo de simulación de depósito a plazo variable. La tasa aplicada
            depende del capital inicial:
          </p>
          <ul className="bullet">
            <li>Si el capital ≤ 10.000 Bs → 3,5%</li>
            <li>Si el capital ≤ 100.000 Bs → 3,7%</li>
            <li>Si el capital &gt; 100.000 Bs → 4,0%</li>
          </ul>
          <p>
            Interés anual: <code>K(t+1) = K(t) + K(t) × i</code>.
          </p>
        </div>
      </section>

      {/* Diccionario */}
      <section className="panel card">
        <div className="panel-header alt">
          <h3 className="panel-title">Diccionario de variables</h3>
        </div>
        <div className="panel-body">
          <div className="table-wrap">
            <table className="retro-table">
              <thead>
                <tr>
                  <th>#</th><th>Variable</th><th>Símbolo</th>
                  <th>Tipo</th><th>Unidades</th><th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Tiempo</td><td>T</td><td>Exógena</td><td>Años</td><td>Duración total del depósito.</td></tr>
                <tr><td>2</td><td>Contador</td><td>C</td><td>Endógena</td><td>Años</td><td>Periodo simulado (año).</td></tr>
                <tr><td>3</td><td>Tasa de interés</td><td>i</td><td>Endógena</td><td>%</td><td>Calculada según capital inicial.</td></tr>
                <tr><td>4</td><td>Capital</td><td>K</td><td>Endógena</td><td>Bs</td><td>Monto acumulado en el depósito.</td></tr>
                <tr><td>5</td><td>Interés</td><td>I</td><td>Estado</td><td>Bs/año</td><td>Interés generado por periodo.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Inputs */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Parámetros de entrada</h3>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>Capital inicial (Bs)</label>
              <input type="number" value={capital0}
                     onChange={(e)=>setCapital0(e.target.value)} placeholder="Ej: 15000" />
            </div>
            <div className="field">
              <label>Tiempo (años)</label>
              <input type="number" value={anios}
                     onChange={(e)=>setAnios(e.target.value)} placeholder="Ej: 10" />
            </div>
          </div>
          {!ready && <div className="note warn" style={{marginTop:12}}>Completa los campos para generar la simulación.</div>}
        </div>
      </section>

      {/* Resultados */}
      {ready && (
        <section className="panel card">
          <div className="panel-header alt">
            <h3 className="panel-title">Resultados</h3>
          </div>
          <div className="panel-body">
            <div className="chips">
              <span className="pill">Capital inicial: <strong>{money(Number(capital0))}</strong></span>
              <span className="pill">Tasa aplicada: <strong>{(tasa*100).toFixed(1)}%</strong></span>
              <span className="pill">Años: <strong>{anios}</strong></span>
            </div>

            <div className="table-wrap" style={{marginTop:16}}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>Año (C)</th>
                    <th>Capital inicial Kₜ</th>
                    <th>Interés Iₜ</th>
                    <th>Capital final Kₜ₊₁</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r=>(
                    <tr key={r.anio}>
                      <td>{r.anio}</td>
                      <td>{money(r.kap_t)}</td>
                      <td>{money(r.interes)}</td>
                      <td>{money(r.kap_t1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 style={{marginTop:16}}>
              Capital final después de {anios} años:{" "}
              <span className="tag success">{money(kFinal)}</span>
            </h4>
          </div>
        </section>
      )}
    </section>
  );
}
