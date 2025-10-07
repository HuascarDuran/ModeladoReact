import { useState } from "react";
import Controls from "../components/Controls";
import DataTable from "../components/DataTable";

const pow2 = (p) => 1n << BigInt(p);
const nextLCG = (x,a,c,m) => (a*x + c) % m;

function roundTo(x, d){ const f = 10**d; return (Math.round(x * f) / f).toFixed(d); }
function csvDownload(name, rows){
  const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], {type:"text/csv"});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function lcgHint(a,c,m){
  const okC = (c % 2n === 1n);
  const okA = ((a - 1n) % 4n === 0n);
  if(okC && okA) return {ok:true, msg:"Hull–Dobell OK (m=2^P): c impar y a≡1 (mod 4)."};
  const parts=[]; if(!okC) parts.push("usa c impar"); if(!okA) parts.push("a≡1 (mod 4)");
  return {ok:false, msg:"Revisa parámetros: " + parts.join(" y ") + "."};
}

export default function LCG(){
  const [x0, setX0] = useState("");
  const [k,  setK ] = useState("");
  const [c,  setC ] = useState("");
  const [p,  setP ] = useState("");
  const [d,  setD ] = useState(4);
  const [n,  setN ] = useState(10);
  const [hint, setHint] = useState({msg:"",ok:false});
  const [rows, setRows] = useState([]);
  const [csv,  setCsv ] = useState([["i","Xi-1","Operacion","Xi","ri"]]);

  const onGenerate = () => {
    const P = Number(p), K = Number(k), C = Number(c), X0 = Number(x0), N = Math.max(1, Number(n)), D = Number(d);
    if(!Number.isFinite(P) || P < 2){ setHint({msg:"P debe ser ≥ 2", ok:false}); return; }
    const a = 1n + 4n*BigInt(K);
    const m = pow2(P);
    const cB= BigInt(C);
    const xB= BigInt(X0);
    if(xB < 0n || xB >= m){ setHint({msg:"X0 debe cumplir 0 ≤ X0 < 2^P", ok:false}); return; }

    const chk = lcgHint(a,cB,m); setHint(chk);

    const newRows = [];
    const csvRows = [["i","Xi-1","Operacion","Xi","ri"]];
    let x = xB;

    for(let i=1;i<=N;i++){
      const Xi_1 = x;
      const Xi   = nextLCG(Xi_1,a,cB,m);
      const ri   = Number(Xi) / Number(m - 1n);
      const op   = `(${a.toString()} · ${Xi_1.toString()} + ${cB.toString()}) mod ${m.toString()}`;
      const riS  = roundTo(ri, D);

      newRows.push([i, Xi_1.toString(), op, Xi.toString(), riS]);
      csvRows.push ([i, Xi_1.toString(), op, Xi.toString(), riS]);
      x = Xi;
    }
    setRows(newRows); setCsv(csvRows);
  };

  const onCsv = () => csvDownload("lcg.csv", csv);

  const onClear = () => {
    setX0(""); setK(""); setC(""); setP(""); setD(4); setN(10);
    setHint({msg:"",ok:false}); setRows([]); setCsv([["i","Xi-1","Operacion","Xi","ri"]]);
  };

  return (
    <section className="card">
      <div className="title-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h2>Algoritmo Lineal (LCG)</h2>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onGenerate}>Generar</button>
          <button className="btn btn-ghost" onClick={onCsv}>Descargar CSV</button>
          <button className="btn btn-danger" onClick={onClear}>Limpiar</button>
        </div>
      </div>

      <div className="grid">
        <label><span className="cap">X<sub>0</sub></span>
          <input value={x0} onChange={e=>setX0(e.target.value)} placeholder="Semilla (0 ≤ X0 < 2^P)"/>
        </label>
        <label>K
          <input value={k} onChange={e=>setK(e.target.value)} placeholder="K"/>
        </label>
        <label>c
          <input value={c} onChange={e=>setC(e.target.value)} placeholder="c (incremento)"/>
        </label>
        <label>P
          <input value={p} onChange={e=>setP(e.target.value)} placeholder="P (m = 2^P)"/>
        </label>
        <label>D (dec.)
          <select value={d} onChange={e=>setD(e.target.value)}>
            <option>2</option><option>4</option><option>6</option><option>8</option>
          </select>
        </label>
        <label>N (cantidad)
          <input value={n} onChange={e=>setN(e.target.value)} placeholder="N" />
        </label>
      </div>

      <div className={`hint ${hint.ok ? "ok":"bad"}`}>{hint.msg}</div>
      <DataTable rows={rows}/>
    </section>
  );
}
