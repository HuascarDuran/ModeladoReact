import { useState } from "react";
import DataTable from "../components/DataTable";

const pow2 = (p) => 1n << BigInt(p);
const nextMCG = (x,a,m) => (a*x) % m;
const roundTo = (x,d)=> (Math.round(x*(10**d))/(10**d)).toFixed(d);

function csvDownload(name, rows){
  const blob = new Blob([rows.map(r=>r.join(",")).join("\n")], {type:"text/csv"});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}
function mcgHint(a,m,x0){
  const okA = ((a - 3n) % 8n === 0n);
  const okS = (x0 % 2n === 1n);
  if(okA && okS) return {ok:true,msg:"MCG OK: a=8K+3 y semilla impar (c=0 por definición)."};
  const parts=[]; if(!okA) parts.push("a=8K+3"); if(!okS) parts.push("semilla impar");
  return {ok:false,msg:"Revisa parámetros: "+parts.join(" y ")+"."};
}

export default function MCG(){
  const [x0,setX0] = useState("");
  const [k,setK]   = useState("");
  const [p,setP]   = useState("");
  const [d,setD]   = useState(4);
  const [n,setN]   = useState(10);
  const [hint,setHint] = useState({msg:"",ok:false});
  const [rows,setRows] = useState([]);
  const [csv,setCsv]   = useState([["i","Xi-1","Operacion","Xi","ri"]]);

  const onGenerate = ()=>{
    const P = Number(p), K = Number(k), X0 = Number(x0), N = Math.max(1, Number(n)), D = Number(d);
    if(!Number.isFinite(P) || P<2){ setHint({msg:"P debe ser ≥ 2", ok:false}); return; }
    const a = 8n*BigInt(K) + 3n;
    const m = pow2(P);
    const xB= BigInt(X0);
    if(xB < 0n || xB >= m){ setHint({msg:"X0 debe cumplir 0 ≤ X0 < 2^P", ok:false}); return; }
    const chk = mcgHint(a,m,xB); setHint(chk);

    const newRows = []; const csvRows = [["i","Xi-1","Operacion","Xi","ri"]];
    let x = xB;
    for(let i=1;i<=N;i++){
      const Xi_1 = x;
      const Xi   = nextMCG(Xi_1,a,m);
      const ri   = Number(Xi) / Number(m - 1n);
      const op   = `(${a.toString()} · ${Xi_1.toString()}) mod ${m.toString()}`;
      const riS  = roundTo(ri, D);
      newRows.push([i, Xi_1.toString(), op, Xi.toString(), riS]);
      csvRows.push ([i, Xi_1.toString(), op, Xi.toString(), riS]);
      x = Xi;
    }
    setRows(newRows); setCsv(csvRows);
  };

  const onCsv  = ()=> csvDownload("mcg.csv", csv);
  const onClear= ()=>{
    setX0(""); setK(""); setP(""); setD(4); setN(10);
    setHint({msg:"",ok:false}); setRows([]); setCsv([["i","Xi-1","Operacion","Xi","ri"]]);
  };

  return (
    <section className="card">
      <div className="title-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h2>Algoritmo Multiplicativo (MCG)</h2>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onGenerate}>Generar</button>
          <button className="btn btn-ghost" onClick={onCsv}>Descargar CSV</button>
          <button className="btn btn-danger" onClick={onClear}>Limpiar</button>
        </div>
      </div>

      <div className="grid">
        <label><span className="cap">X<sub>0</sub></span>
          <input value={x0} onChange={e=>setX0(e.target.value)} placeholder="Semilla impar (0 ≤ X0 < 2^P)"/>
        </label>
        <label>K
          <input value={k} onChange={e=>setK(e.target.value)} placeholder="K"/>
        </label>
        <label>c
          <input value="0" disabled />
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
          <input value={n} onChange={e=>setN(e.target.value)} placeholder="N"/>
        </label>
      </div>

      <div className={`hint ${hint.ok ? "ok":"bad"}`}>{hint.msg}</div>
      <DataTable rows={rows}/>
    </section>
  );
}
