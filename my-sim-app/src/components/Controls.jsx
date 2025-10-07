export default function Controls({ children, onGenerate, onCsv, onClear }){
  return (
    <>
      <div className="btn-row" style={{justifyContent:'flex-end', marginBottom:8}}>
        <button className="btn btn-primary" onClick={onGenerate}>Generar</button>
        <button className="btn btn-ghost"   onClick={onCsv}>Descargar CSV</button>
        <button className="btn btn-danger"  onClick={onClear}>Limpiar</button>
      </div>
      <div className="grid">{children}</div>
    </>
  );
}
