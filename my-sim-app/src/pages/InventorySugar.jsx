import React, { useMemo, useState } from "react";

/* ========= Utils ========= */
const money = (v) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(v ?? 0);

const num = (v, d = 2) => Number(v).toFixed(d);

/* ========= Página: Depósito Fijo ========= */
export default function DepositoFijo() {
  // ⚙ Parámetros
  const [k0, setK0] = useState("15000");        // capital inicial (Bs)
  const [tna, setTna] = useState("8");          // tasa nominal anual %
  const [m, setM] = useState("12");             // capitalizaciones por año
  const [anios, setAnios] = useState("3");      // plazo en años
  const [aporte, setAporte] = useState("0");    // aporte por periodo (opcional)

  // Validación
  const ready = useMemo(() => {
    const a = Number(k0) >= 0;
    const b = Number(tna) >= 0;
    const c = Number(m) > 0 && Number.isInteger(Number(m));
    const d = Number(anios) > 0;
    const e = Number(aporte) >= 0;
    return a && b && c && d && e;
  }, [k0, tna, m, anios, aporte]);

  // Cálculo principal
  const { rows, resumen } = useMemo(() => {
    if (!ready) return { rows: [], resumen: null };

    const K0 = Number(k0);
    const M = Number(m);
    const Y = Number(anios);
    const A = Number(aporte);
    const n = Math.round(M * Y);           // número de periodos
    const r = (Number(tna) / 100) / M;     // tasa periódica (nominal/M)

    const out = [];
    let K = K0;
    let sumInt = 0;

    for (let t = 1; t <= n; t++) {
      const interes = K * r;
      const K1 = K + interes + A;          // aporte al final del periodo
      sumInt += interes;

      out.push({
        t,
        k_t: K,
        i_t: interes,
        aporte: A,
        k_t1: K1,
      });

      K = K1;
    }

    const totalAportes = A * n;
    const tea = Math.pow(1 + r, M) - 1;    // tasa efectiva anual
    const res = {
      n, r, tea,
      capitalFinal: K,
      intereses: sumInt,
      totalAportes,
      capitalInicial: K0,
    };

    return { rows: out, resumen: res };
  }, [ready, k0, tna, m, anios, aporte]);

  return (
    <section className="container">
      {/* 🧱 1. Título */}
      <header className="hero alt card">
        <h1 className="title">Depósito Fijo (tasa nominal anual)</h1>
        <p className="muted">
          Se capitaliza <b>m</b> veces por año a una tasa nominal anual fija. Opcionalmente se
          puede depositar un <b>aporte</b> al final de cada periodo.
        </p>
      </header>

      {/* 📜 2. Consigna */}
      <section className="panel card">
        <div className="panel-header">
          <h3 className="panel-title">Consigna</h3>
        </div>
        <div className="panel-body">
          <ul className="bullet">
            <li>Modelar un depósito a plazo con tasa <b>nominal anual</b> constante.</li>
            <li>Capitalización <em>m</em> veces al año; aporte opcional al final de cada periodo.</li>
            <li>Mostrar evolución periodo a periodo y el resumen final del depósito.</li>
          </ul>
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
                  <th>#</th><th>Variable</th><th>Símbolo</th><th>Clasificación</th><th>Unidades</th><th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>1</td><td>Capital inicial</td><td>K₀</td><td>Exógena</td><td>Bs</td><td>Monto de inicio.</td></tr>
                <tr><td>2</td><td>Tasa nominal anual</td><td>i<sub>NA</sub></td><td>Exógena</td><td>%/año</td><td>Tasa fija anual.</td></tr>
                <tr><td>3</td><td>Capitalizaciones por año</td><td>m</td><td>Exógena</td><td>veces/año</td><td>Mensual=12, trimestral=4, etc.</td></tr>
                <tr><td>4</td><td>Plazo</td><td>Y</td><td>Exógena</td><td>años</td><td>Duración total.</td></tr>
                <tr><td>5</td><td>Aporte por periodo</td><td>A</td><td>Exógena</td><td>Bs/periodo</td><td>Depósito adicional al final de cada periodo.</td></tr>
                <tr><td>6</td><td>Tasa periódica</td><td>r</td><td>Endógena</td><td>%/periodo</td><td>r = i<sub>NA</sub>/m.</td></tr>
                <tr><td>7</td><td>Tasa efectiva anual</td><td>TEA</td><td>Endógena</td><td>%/año</td><td>(1+r)<sup>m</sup>−1.</td></tr>
                <tr><td>8</td><td>Saldo</td><td>Kₜ</td><td>Estado</td><td>Bs</td><td>Saldo al inicio del periodo t.</td></tr>
                <tr><td>9</td><td>Interés</td><td>Iₜ</td><td>Estado</td><td>Bs</td><td>Interés generado en t.</td></tr>
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
              <label>Capital inicial (K₀)</label>
              <input type="number" min={0} step="0.01" value={k0} onChange={e=>setK0(e.target.value)} />
            </div>
            <div className="field">
              <label>Tasa nominal anual (%)</label>
              <input type="number" min={0} step="0.01" value={tna} onChange={e=>setTna(e.target.value)} />
            </div>
            <div className="field">
              <label>Capitalizaciones por año (m)</label>
              <select value={m} onChange={e=>setM(e.target.value)}>
                <option value="1">1 (anual)</option>
                <option value="2">2 (semestral)</option>
                <option value="4">4 (trimestral)</option>
                <option value="12">12 (mensual)</option>
              </select>
            </div>
            <div className="field">
              <label>Plazo (años)</label>
              <input type="number" min={0.1} step="0.1" value={anios} onChange={e=>setAnios(e.target.value)} />
            </div>
            <div className="field">
              <label>Aporte por periodo (opcional)</label>
              <input type="number" min={0} step="0.01" value={aporte} onChange={e=>setAporte(e.target.value)} />
            </div>
          </div>

          {!ready && (
            <div className="note warn" style={{ marginTop: 12 }}>
              Completa los campos correctamente para generar la simulación.
            </div>
          )}
        </div>
      </section>

      {/* 📈 5. Resultados */}
      {ready && resumen && (
        <section className="panel card">
          <div className="panel-header alt">
            <h3 className="panel-title">Resultados</h3>
          </div>
          <div className="panel-body">
            {/* chips */}
            <div className="chips" style={{ justifyContent: "center" }}>
              <span className="pill">Periodos: <strong>{resumen.n}</strong></span>
              <span className="pill">r (periodo): <strong>{(resumen.r * 100).toFixed(4)}%</strong></span>
              <span className="pill">TEA: <strong>{(resumen.tea * 100).toFixed(2)}%</strong></span>
            </div>

            {/* tabla */}
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>t</th>
                    <th>Saldo inicial Kₜ</th>
                    <th>Interés Iₜ</th>
                    <th>Aporte</th>
                    <th>Saldo final Kₜ₊₁</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.t}>
                      <td>{r.t}</td>
                      <td>{money(r.k_t)}</td>
                      <td>{money(r.i_t)}</td>
                      <td>{money(r.aporte)}</td>
                      <td>{money(r.k_t1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* resumen numérico */}
            <h4 style={{ marginTop: 16 }}>
              Capital inicial: <strong>{money(resumen.capitalInicial)}</strong>{" "}
              — Total aportes: <strong>{money(resumen.totalAportes)}</strong>{" "}
              — Intereses ganados: <span className="tag">{money(resumen.intereses)}</span>{" "}
              — Capital final: <span className="tag success">{money(resumen.capitalFinal)}</span>
            </h4>
          </div>
        </section>
      )}
    </section>
  );
}