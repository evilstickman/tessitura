import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom'
import PracticeRow  from "../practice_row";

export default function PracticeGrid() {
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState("Loading");
  const [path, setPath] = useState("");
  let params=useParams();
  let gridId = params.gridId;
  
  useEffect(() => {
    if(gridId && !loaded) {
      fetch("/perform/practice_grid/"+gridId+"/practice_rows")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setData(data);
        setLoaded(true);
      });
    }
  });
  //-- fetch practice grids for user here and list 'em! -->
  return (
    <div id='practice-grid-detail'>
      <h1>Practice grid detail</h1>
      <table>
        <tr><th>
          <td>Target Tempo</td>
          <td>Start measure</td>
          <td>End Measure</td>
        </th></tr>
        { data.map ( (row) => <PracticeRow rowData={row} /> )}
      </table>
    </div>
  );
  
}