export default function DataTable({ rows }){
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>i</th>
            <th>X<sub>i-1</sub></th>
            <th>Operación</th>
            <th>X<sub>i</sub></th>
            <th>r<sub>i</sub></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,idx)=>(
            <tr key={idx}>
              <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
